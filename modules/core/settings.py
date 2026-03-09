# ============================================================
# JBL Settings Manager
# ============================================================
import json
import os
import logging
from modules.core.constants import SETTINGS_PATH

logger = logging.getLogger("JBL.Settings")

DEFAULT_SETTINGS = {
    "lsfg_enabled": True,
    "lsfg_multiplier": 2,
    "lsfg_flow_rate": 50,
    "powershift_mode": "balanced",
    "tdp_limit": 8,
    "gpu_clock": 800,
    "thermal_warn": 80,
    "thermal_danger": 87,
    "thermal_critical": 90,
    "battery_arc_enabled": True,
    "battery_target_percent": 80,
    "battery_session_hours": 3,
    "proton_auto_update": True,
    "proton_preferred": "GE-Proton",
    "community_sync_enabled": True,
    "community_sync_interval": 3600,
    "xr_enabled": False,
    "xr_device": None,
    "xr_mode": "gaming",
    "xr_refresh": 60,
    "analytics_enabled": True,
    "health_check_interval": 300,
    "shader_cache_enabled": True,
    "predictive_preload": True,
    "first_run": True,
    "game_profiles": {}
}

class SettingsManager:
    def __init__(self):
        self._settings = {}
        self.load()

    def load(self):
        try:
            if os.path.exists(SETTINGS_PATH):
                with open(SETTINGS_PATH, "r") as f:
                    saved = json.load(f)
                self._settings = {**DEFAULT_SETTINGS, **saved}
            else:
                self._settings = DEFAULT_SETTINGS.copy()
                self.save()
            logger.info("Settings loaded ✅")
        except Exception as e:
            logger.error(f"Failed to load settings: {e}")
            self._settings = DEFAULT_SETTINGS.copy()

    def save(self):
        try:
            os.makedirs(os.path.dirname(SETTINGS_PATH), exist_ok=True)
            with open(SETTINGS_PATH, "w") as f:
                json.dump(self._settings, f, indent=2)
        except Exception as e:
            logger.error(f"Failed to save settings: {e}")

    def get(self, key, default=None):
        return self._settings.get(key, default)

    def set(self, key, value):
        self._settings[key] = value
        self.save()

    def get_all(self):
        return self._settings.copy()

    def set_game_profile(self, app_id: str, profile: dict):
        profiles = self._settings.get("game_profiles", {})
        profiles[str(app_id)] = profile
        self._settings["game_profiles"] = profiles
        self.save()

    def get_game_profile(self, app_id: str):
        return self._settings.get("game_profiles", {}).get(str(app_id))
