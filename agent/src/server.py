"""
llama.cpp server lifecycle management.
Handles launching, health-checking, and stopping llama-server processes.
Phase 1: scaffold only — real implementation in Phase 4.
"""

import subprocess
from typing import Optional


class LlamaCppServer:
    def __init__(self):
        self.process: Optional[subprocess.Popen] = None
        self.session_id: Optional[str] = None

    def start(self, config: dict) -> str:
        """Launch llama-server subprocess. NOT YET IMPLEMENTED — Phase 4."""
        raise NotImplementedError("llama.cpp integration coming in Phase 4")

    def stop(self, session_id: str) -> bool:
        """Stop a running session. NOT YET IMPLEMENTED — Phase 4."""
        raise NotImplementedError("llama.cpp integration coming in Phase 4")

    def get_status(self, session_id: str) -> str:
        """Get current session status. NOT YET IMPLEMENTED — Phase 4."""
        raise NotImplementedError("llama.cpp integration coming in Phase 4")


server_manager = LlamaCppServer()
