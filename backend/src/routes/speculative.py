from fastapi import APIRouter
from pydantic import BaseModel

router = APIRouter(prefix="/speculative", tags=["speculative"])

# ---------------------------------------------------------------------------
# Draft model registry — known good pairings from literature
# ---------------------------------------------------------------------------

ALL_DRAFT_CANDIDATES = [
    {
        "hf_model_id": "meta-llama/Llama-3.2-1B-Instruct-GGUF",
        "name": "Llama 3.2 1B Instruct",
        "estimated_speedup": 1.9,
        "community_acceptance_rate": 0.78,
        "vram_required_gb": 1.2,
        "families": ["llama", "meta"],
        "tier": 1,  # 1=best match, 2=good, 3=fallback
    },
    {
        "hf_model_id": "meta-llama/Llama-3.2-3B-Instruct-GGUF",
        "name": "Llama 3.2 3B Instruct",
        "estimated_speedup": 2.1,
        "community_acceptance_rate": 0.82,
        "vram_required_gb": 2.4,
        "families": ["llama", "meta"],
        "tier": 1,
    },
    {
        "hf_model_id": "microsoft/phi-2-GGUF",
        "name": "Phi-2 (2.7B)",
        "estimated_speedup": 1.7,
        "community_acceptance_rate": 0.71,
        "vram_required_gb": 2.1,
        "families": ["phi", "microsoft"],
        "tier": 1,
    },
    {
        "hf_model_id": "TinyLlama/TinyLlama-1.1B-Chat-v1.0-GGUF",
        "name": "TinyLlama 1.1B Chat",
        "estimated_speedup": 1.6,
        "community_acceptance_rate": 0.65,
        "vram_required_gb": 0.9,
        "families": ["llama", "tinyllama"],
        "tier": 2,
    },
    {
        "hf_model_id": "mistralai/Mistral-7B-Instruct-v0.3-GGUF",
        "name": "Mistral 7B Instruct",
        "estimated_speedup": 1.5,
        "community_acceptance_rate": 0.68,
        "vram_required_gb": 5.2,
        "families": ["mistral"],
        "tier": 1,
    },
    {
        "hf_model_id": "Qwen/Qwen2.5-0.5B-Instruct-GGUF",
        "name": "Qwen 2.5 0.5B Instruct",
        "estimated_speedup": 1.5,
        "community_acceptance_rate": 0.62,
        "vram_required_gb": 0.6,
        "families": ["qwen"],
        "tier": 2,
    },
    {
        "hf_model_id": "Qwen/Qwen2.5-1.5B-Instruct-GGUF",
        "name": "Qwen 2.5 1.5B Instruct",
        "estimated_speedup": 1.8,
        "community_acceptance_rate": 0.74,
        "vram_required_gb": 1.4,
        "families": ["qwen"],
        "tier": 1,
    },
]


def _detect_family(target_model: str) -> list[str]:
    """Detect model family from model name/path string."""
    lower = target_model.lower()
    families = []
    if "llama" in lower:
        families.append("llama")
    if "meta" in lower:
        families.append("meta")
    if "mistral" in lower:
        families.append("mistral")
    if "phi" in lower:
        families.append("phi")
    if "qwen" in lower:
        families.append("qwen")
    if "gemma" in lower:
        families.append("gemma")
    if "tiny" in lower:
        families.append("tinyllama")
    return families


@router.get("/recommendations")
def get_recommendations(target_model: str = "", vram_gb: float = 0):
    """
    Returns draft model candidates for the given target model and available VRAM.
    Filters by VRAM fit, prioritizes family matches, returns top 4.
    """
    if not target_model:
        return []

    target_families = _detect_family(target_model)

    # Reserve 60% of VRAM for target — draft gets up to 40%
    draft_vram_budget = vram_gb * 0.4 if vram_gb > 0 else 999.0

    scored = []
    for candidate in ALL_DRAFT_CANDIDATES:
        # Skip if draft alone won't fit in the budget (when VRAM provided)
        if vram_gb > 0 and candidate["vram_required_gb"] > draft_vram_budget:
            continue

        # Score: family match boosts tier
        family_match = bool(set(candidate["families"]) & set(target_families))
        score = candidate["estimated_speedup"] * (1.2 if family_match else 1.0)
        score -= (candidate["tier"] - 1) * 0.3  # tier 2 penalty

        scored.append((score, candidate))

    # Sort by score descending, return top 4
    scored.sort(key=lambda x: x[0], reverse=True)
    results = []
    for _, c in scored[:4]:
        results.append({
            "hf_model_id": c["hf_model_id"],
            "name": c["name"],
            "estimated_speedup": c["estimated_speedup"],
            "community_acceptance_rate": c["community_acceptance_rate"],
            "vram_required_gb": c["vram_required_gb"],
        })

    return results
