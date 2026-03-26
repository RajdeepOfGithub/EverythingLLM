"""
Local model discovery module.
Scans common directories for GGUF model files on the user's machine.
"""

SEARCH_DIRS = [
    "~/models",
    "~/.cache/lm-studio/models",
    "~/.ollama/models",
    "./models",
]


def find_local_models() -> list[dict]:
    # TODO: scan SEARCH_DIRS for .gguf files, return list of {name, path, size_gb}
    pass
