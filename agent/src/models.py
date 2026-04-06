"""
Local model discovery module.
Scans common directories for GGUF model files and Ollama-managed models.
"""

import os
from pathlib import Path


# ---------------------------------------------------------------------------
# Internal helpers
# ---------------------------------------------------------------------------

def _gguf_scan_dirs() -> list[Path]:
    """Return the list of directories to scan for .gguf files."""
    dirs: list[Path] = [
        Path("~/models").expanduser(),
        Path("~/.cache/huggingface/hub").expanduser(),
        Path("/models"),
        # LM Studio — macOS
        Path("~/Library/Application Support/LM Studio/Models").expanduser(),
        # LM Studio — Windows
        Path("~/AppData/Roaming/LM Studio/Models").expanduser(),
        # LM Studio — Linux (best-guess cache location)
        Path("~/.cache/lm-studio/models").expanduser(),
    ]

    models_dir_env = os.getenv("MODELS_DIR", "").strip()
    if models_dir_env:
        dirs.append(Path(models_dir_env).expanduser())

    return dirs


def _scan_gguf_files(search_dirs: list[Path]) -> list[dict]:
    """
    Recursively scan *search_dirs* for *.gguf files.
    Returns a list of {name, path, size_gb}.
    Silently skips paths that do not exist or are unreadable.
    """
    found: list[dict] = []
    seen_paths: set[str] = set()

    for directory in search_dirs:
        if not directory.is_dir():
            continue
        try:
            for path in directory.rglob("*.gguf"):
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


def _scan_ollama_models() -> list[str]:
    """
    Discover model names from Ollama's local manifest store.

    Ollama stores manifests at:
        ~/.ollama/models/manifests/registry.ollama.ai/library/{model_name}/{tag}

    Each leaf file (a tag like "latest", "8b", etc.) represents an installed
    model variant.  We reconstruct the human-readable name as "{model}:{tag}".

    Returns a list of strings like ["llama3:8b", "mistral:latest"].
    Silently returns [] when Ollama is not installed or the path is absent.

    NOTE: Ollama blob files (~/.ollama/models/blobs/) are NOT GGUFs — they use
    Ollama's internal format.  We never include them in the GGUF scan results.
    """
    manifests_root = Path("~/.ollama/models/manifests").expanduser()
    if not manifests_root.is_dir():
        return []

    ollama_models: list[str] = []

    # Expected structure: manifests/<registry>/<namespace>/<model>/<tag>
    # The standard public path is: manifests/registry.ollama.ai/library/<model>/<tag>
    # We walk all registries/namespaces generically so private registries also work.
    try:
        for registry_dir in manifests_root.iterdir():
            if not registry_dir.is_dir():
                continue
            for namespace_dir in registry_dir.iterdir():
                if not namespace_dir.is_dir():
                    continue
                for model_dir in namespace_dir.iterdir():
                    if not model_dir.is_dir():
                        continue
                    model_name = model_dir.name
                    for tag_file in model_dir.iterdir():
                        # Each file is a tag (e.g. "latest", "8b", "7b-instruct-q4_K_M")
                        if tag_file.is_file():
                            ollama_models.append(f"{model_name}:{tag_file.name}")
    except Exception:
        pass

    return sorted(ollama_models)


# ---------------------------------------------------------------------------
# Public API
# ---------------------------------------------------------------------------

def scan_models() -> dict:
    """
    Full model discovery scan.

    Returns:
        {
            "gguf_models": [{"name": str, "path": str, "size_gb": float}, ...],
            "ollama_models": ["llama3:8b", "mistral:latest", ...]
        }

    - gguf_models: all .gguf files found across standard directories +
      LM Studio directories + $MODELS_DIR override.
    - ollama_models: models installed via Ollama (names only — blobs are NOT
      GGUFs and are excluded from gguf_models).
    """
    return {
        "gguf_models": _scan_gguf_files(_gguf_scan_dirs()),
        "ollama_models": _scan_ollama_models(),
    }


def scan_for_gguf_models() -> list[dict]:
    """
    Backward-compatible wrapper — returns only the GGUF model list.
    Used by the /api/v1/models REST endpoint (frontend expects a plain array).
    """
    return scan_models()["gguf_models"]
