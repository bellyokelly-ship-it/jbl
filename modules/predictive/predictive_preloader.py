# ============================================================
# JBL Predictive Pre-Loader
# ============================================================
import time
import logging

logger = logging.getLogger("JBL.Predictive")

class PredictivePreloader:
    def __init__(self, settings, profile_manager):
        self.settings = settings
        self.profiles = profile_manager
        self._launch_history = {}
        self._predictions = []

    def record_launch(self, app_id: str, hour_of_day: int = None):
        if hour_of_day is None:
            hour_of_day = int(time.strftime("%H"))
        if app_id not in self._launch_history:
            self._launch_history[app_id] = []
        self._launch_history[app_id].append({
            "hour": hour_of_day,
            "time": time.time()
        })
        self._update_predictions()

    def _update_predictions(self):
        current_hour = int(time.strftime("%H"))
        scores = {}
        for app_id, launches in self._launch_history.items():
            recent = [l for l in launches if time.time() - l["time"] < 7 * 86400]
            hour_matches = sum(1 for l in recent if abs(l["hour"] - current_hour) <= 1)
            scores[app_id] = hour_matches + len(recent) * 0.1
        self._predictions = sorted(scores.keys(), key=lambda x: scores[x], reverse=True)[:3]

    def get_predicted_next(self) -> list:
        return self._predictions

    def preload_profile(self, app_id: str) -> dict:
        profile = self.profiles.get_profile(app_id)
        logger.info(f"Predictive preload for {app_id}: {profile}")
        return profile

    def get_status(self):
        return {
            "enabled": self.settings.get("predictive_preload", True),
            "tracked_games": len(self._launch_history),
            "predicted_next": self._predictions
        }
