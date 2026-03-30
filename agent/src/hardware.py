"""
Hardware detection module.
Detects GPU (model, VRAM), system RAM, and OS info from the local machine.
"""

import subprocess
import platform
import psutil


def get_gpu_info() -> dict:
    """
    Detect GPU. Tries nvidia-smi first, then checks for Apple Silicon.
    Never crashes — returns detected=False with null fields if no GPU found.
    """
    # Try NVIDIA via nvidia-smi
    try:
        result = subprocess.run(
            ["nvidia-smi", "--query-gpu=name,memory.total,memory.free", "--format=csv,noheader,nounits"],
            capture_output=True, text=True, timeout=5
        )
        if result.returncode == 0:
            line = result.stdout.strip().split("\n")[0]
            parts = [p.strip() for p in line.split(",")]
            name = parts[0]
            vram_total = round(int(parts[1]) / 1024, 2)   # MiB → GiB
            vram_free = round(int(parts[2]) / 1024, 2)
            return {
                "detected": True,
                "name": name,
                "backend": "cuda",
                "vram_total_gb": vram_total,
                "vram_available_gb": vram_free,
            }
    except Exception:
        pass

    # Check for Apple Silicon
    try:
        if platform.system() == "Darwin":
            cpu = subprocess.run(["sysctl", "-n", "machdep.cpu.brand_string"],
                                 capture_output=True, text=True, timeout=3)
            chip = cpu.stdout.strip()
            if "Apple" in chip:
                # Unified memory — report system RAM as VRAM approximation
                mem = psutil.virtual_memory()
                total_gb = round(mem.total / (1024 ** 3), 2)
                avail_gb = round(mem.available / (1024 ** 3), 2)
                return {
                    "detected": True,
                    "name": chip,
                    "backend": "metal",
                    "vram_total_gb": total_gb,
                    "vram_available_gb": avail_gb,
                }
    except Exception:
        pass

    return {
        "detected": False,
        "name": None,
        "backend": "cpu",
        "vram_total_gb": None,
        "vram_available_gb": None,
    }


def get_system_info() -> dict:
    """
    Returns OS and RAM info using psutil (works on Linux, macOS, Windows).
    """
    mem = psutil.virtual_memory()
    os_name = platform.system().lower()
    if os_name not in ("darwin", "windows", "linux"):
        os_name = "linux"
    return {
        "os": os_name,
        "ram_total_gb": round(mem.total / (1024 ** 3), 2),
        "ram_available_gb": round(mem.available / (1024 ** 3), 2),
    }


def get_full_hardware_profile() -> dict:
    """
    Returns the full HardwareResponse shape as defined in local_agent_api.ts.
    """
    return {
        "system": get_system_info(),
        "gpu": get_gpu_info(),
    }
