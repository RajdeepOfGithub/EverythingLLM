"""
Hardware detection module.
Detects GPU (model, VRAM), system RAM, and CPU info from the local machine.
"""


def get_gpu_info() -> dict:
    # TODO: detect via nvidia-smi (NVIDIA) and/or rocm-smi (AMD)
    pass


def get_ram_info() -> dict:
    # TODO: read from /proc/meminfo (Linux) or sysctl (macOS)
    pass


def get_cpu_info() -> dict:
    # TODO: read via psutil or lscpu
    pass


def get_full_hardware_profile() -> dict:
    # TODO: combine gpu, ram, cpu into one profile dict
    pass
