import os
import json
import logging

logger = logging.getLogger("jbl")

PROFILES_PATH = "/home/deck/homebrew/settings/jbl/user_profiles.json"

VALID_KEYS = {
    "tdp", "gpu_clock", "refresh_rate", "frame_limit",
    "fsr", "fsr_sharpness", "lsfg_enabled", "lsfg_multiplier",
    "lsfg_flow", "fan_profile", "force_resolution",
}

VALID_MODES = {"handheld", "xr", "docked"}


def _ensure_dir():
    os.makedirs(os.path.dirname(PROFILES_PATH), exist_ok=True)


def _load() -> dict:
    _ensure_dir()
    if not os.path.exists(PROFILES_PATH):
        return {"global": {}, "handheld": {}, "xr": {}, "docked": {}}
    try:
        with open(PROFILES_PATH, "r") as f:
            data = json.load(f)
        # Ensure all keys exist
        for key in ["global", "handheld", "xr", "docked"]:
            if key not in data:
                data[key] = {}
        return data
    except Exception as e:
        logger.error(f"Failed to load user profiles: {e}")
        return {"global": {}, "handheld": {}, "xr": {}, "docked": {}}


def _save(data: dict):
    _ensure_dir()
    try:
        with open(PROFILES_PATH, "w") as f:
            json.dump(data, f, indent=2)
        logger.info(f"User profiles saved: {PROFILES_PATH}")
    except Exception as e:
        logger.error(f"Failed to save user profiles: {e}")


def get_override(mode: str, key: str):
    """Get a single override value. Returns None if not set."""
    data = _load()
    # Per-mode wins over global
    if mode in VALID_MODES and key in data.get(mode, {}):
        return data[mode][key]
    if key in data.get("global", {}):
        return data["global"][key]
    return None


def get_merged_profile(mode: str, base_profile: dict) -> dict:
    """Merge base profile with global then per-mode overrides."""
    data = _load()
    merged = {**base_profile}
    # Layer global
    for k, v in data.get("global", {}).items():
        if k in VALID_KEYS:
            merged[k] = v
    # Layer per-mode
    if mode in VALID_MODES:
        for k, v in data.get(mode, {}).items():
            if k in VALID_KEYS:
                merged[k] = v
    return merged


def set_override(mode: str, key: str, value):
    """Save a per-mode override."""
    if key not in VALID_KEYS:
        logger.warning(f"Ignoring invalid override key: {key}")
        return
    if mode not in VALID_MODES:
        logger.warning(f"Ignoring invalid mode: {mode}")
        return
    data = _load()
    data[mode][key] = value
    _save(data)
    logger.info(f"Override saved: {mode}.{key} = {value}")


def set_global_override(key: str, value):
    """Save a global override (applies to all modes)."""
    if key not in VALID_KEYS:
        logger.warning(f"Ignoring invalid override key: {key}")
        return
    data = _load()
    data["global"][key] = value
    _save(data)
    logger.info(f"Global override saved: {key} = {value}")


def reset_mode(mode: str):
    """Clear all overrides for a mode."""
    if mode not in VALID_MODES:
        return
    data = _load()
    data[mode] = {}
    _save(data)
    logger.info(f"Overrides reset for mode: {mode}")


def reset_all():
    """Clear all overrides."""
    data = {"global": {}, "handheld": {}, "xr": {}, "docked": {}}
    _save(data)
    logger.info("All user overrides reset")


def get_all_overrides() -> dict:
    """Return the full override structure."""
    return _load()
