"""
Local model discovery module.
Scans common directories for GGUF model files on the user's machine.
"""

import os
import glob
from pathlib import Path


def scan_for_gguf_models() -> list[dict]:
    """
    Scans common directories for .gguf files.
    Returns a list of {name, path, size_gb}.
    Never crashes if a directory doesn't exist.
    """
    search_dirs = [
        os.path.expanduser("~/models"),
        os.path.expanduser("~/.cache/huggingface/hub"),
        "/models",
    ]

    models_dir_env = os.getenv("MODELS_DIR", "")
    if models_dir_env:
        search_dirs.append(os.path.expanduser(models_dir_env))

    found: list[dict] = []
    seen_paths: set[str] = set()

    for directory in search_dirs:
        if not os.path.isdir(directory):
            continue
        try:
            for path in Path(directory).rglob("*.gguf"):
                abs_path = str(path.resolve())
                if abs_path in seen_paths:
                    continue
                seen_paths.add(abs_path)
                try:
                    size_bytes = path.stat().st_size
                    size_gb = round(size_bytes / (1024 ** 3), 2)
                    found.append({
                        "name": path.stem,
                        "path": abs_path,
                        "size_gb": size_gb,
                    })
                except Exception:
                    continue
        except Exception:
            continue

    return found
