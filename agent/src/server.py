"""
llama.cpp server lifecycle management.
Handles launching, health-checking, and stopping llama-server processes.
"""


def start_server(model_path: str, port: int = 8080, **kwargs) -> dict:
    # TODO: launch llama-server subprocess with given config
    pass


def stop_server(port: int) -> None:
    # TODO: terminate the llama-server process on given port
    pass


def check_health(port: int) -> bool:
    # TODO: poll /health endpoint, return True if ready
    pass
