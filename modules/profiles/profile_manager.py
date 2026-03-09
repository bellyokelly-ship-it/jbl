# ============================================================
# JBL Profile Manager + AI Learning Engine
# ============================================================
import time
import logging
from modules.core.settings import SettingsManager

logger = logging.getLogger("JBL.Profiles")

DEFAULT_GAME_PROFILE = {
    "tdp": 8,
    "gpu_clock": 800,
    "lsfg_enabled": True,
    "lsfg_multiplier": 2,
    "lsfg_flow_rate": 50,
    "fps_cap": 60,
    "powershift_mode": "balanced",
    "session_count": 0,
    "avg_fps": 0,
    "avg_temp": 0,
    "source": "default"
}

class ProfileManager:
    def __init__(self, settings: SettingsManager):
        self.settings = settings
        self._session_data = {}

    def get_profile(self, app_id: str) -> dict:
        saved = self.settings.get_game_profile(app_id)
        if saved:
            return {**DEFAULT_GAME_PROFILE, **saved}
        return DEFAULT_GAME_PROFILE.copy()

    def save_profile(self, app_id: str, profile: dict):
        self.settings.set_game_profile(app_id, profile)
        logger.info(f"Profile saved for app {app_id}")

    def start_session(self, app_id: str):
        self._session_data[app_id] = {
            "start": time.time(),
            "fps_samples": [],
            "temp_samples": []
        }

    def record_sample(self, app_id: str, fps: float, temp: float):
        if app_id in self._session_data:
            self._session_data[app_id]["fps_samples"].append(fps)
            self._session_data[app_id]["temp_samples"].append(temp)

    def end_session(self, app_id: str) -> dict:
        if app_id not in self._session_data:
            return {}
        session = self._session_data.pop(app_id)
        fps_samples = session["fps_samples"]
        temp_samples = session["temp_samples"]

        if not fps_samples:
            return {}

        avg_fps = sum(fps_samples) / len(fps_samples)
        avg_temp = sum(temp_samples) / len(temp_samples) if temp_samples else 0
        duration = (time.time() - session["start"]) / 60

        profile = self.get_profile(app_id)
        profile["session_count"] = profile.get("session_count", 0) + 1
        profile["avg_fps"] = round(
            (profile.get("avg_fps", 0) * (profile["session_count"] - 1) + avg_fps) / profile["session_count"], 1
        )
        profile["avg_temp"] = round(avg_temp, 1)

        # AI Learning: auto-adjust if performance is poor
        if avg_fps < 40 and profile["lsfg_multiplier"] < 3:
            profile["lsfg_multiplier"] = 3
            profile["source"] = "ai_learned"
            logger.info(f"AI learned: boosting LSFG multiplier for app {app_id}")
        elif avg_temp > 85 and profile["tdp"] > 6:
            profile["tdp"] = max(6, profile["tdp"] - 1)
            profile["source"] = "ai_learned"
            logger.info(f"AI learned: reducing TDP for app {app_id} due to heat")

        self.save_profile(app_id, profile)
        return {
            "app_id": app_id,
            "duration_min": round(duration, 1),
            "avg_fps": round(avg_fps, 1),
            "avg_temp": round(avg_temp, 1),
            "profile_updated": True
        }

    def apply_community_profile(self, app_id: str, community_profile: dict):
        profile = self.get_profile(app_id)
        merged = {**profile, **community_profile, "source": "community"}
        self.save_profile(app_id, merged)
        logger.info(f"Community profile applied for app {app_id}")

    def get_all_profiles(self):
        return self.settings.get("game_profiles", {})
