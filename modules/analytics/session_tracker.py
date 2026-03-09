# ============================================================
# JBL Analytics + Session Tracker
# ============================================================
import time
import json
import os
import logging

logger = logging.getLogger("JBL.Analytics")

ANALYTICS_PATH = "/home/deck/homebrew/settings/jbl_analytics.json"

class SessionTracker:
    def __init__(self, settings):
        self.settings = settings
        self._enabled = settings.get("analytics_enabled", True)
        self._sessions = []
        self._current = None
        self._load()

    def _load(self):
        try:
            if os.path.exists(ANALYTICS_PATH):
                with open(ANALYTICS_PATH) as f:
                    self._sessions = json.load(f)
        except Exception:
            self._sessions = []

    def _save(self):
        try:
            os.makedirs(os.path.dirname(ANALYTICS_PATH), exist_ok=True)
            with open(ANALYTICS_PATH, "w") as f:
                json.dump(self._sessions[-500:], f)
        except Exception as e:
            logger.error(f"Analytics save failed: {e}")

    def start_session(self, app_id: str, app_name: str, profile: dict):
        if not self._enabled:
            return
        self._current = {
            "app_id": app_id,
            "app_name": app_name,
            "start": time.time(),
            "profile": profile,
            "fps_samples": [],
            "temp_samples": [],
            "powershift_changes": [],
            "thermal_events": []
        }

    def record_fps(self, fps: float):
        if self._current:
            self._current["fps_samples"].append(round(fps, 1))

    def record_temp(self, temp: float):
        if self._current:
            self._current["temp_samples"].append(round(temp, 1))

    def record_powershift(self, mode: str):
        if self._current:
            self._current["powershift_changes"].append({
                "time": time.time(),
                "mode": mode
            })

    def record_thermal_event(self, state: str, temp: float):
        if self._current:
            self._current["thermal_events"].append({
                "time": time.time(),
                "state": state,
                "temp": temp
            })

    def end_session(self) -> dict:
        if not self._current:
            return {}
        session = self._current
        self._current = None
        fps = session["fps_samples"]
        temps = session["temp_samples"]
        session["duration_min"] = round((time.time() - session["start"]) / 60, 1)
        session["avg_fps"] = round(sum(fps) / len(fps), 1) if fps else 0
        session["min_fps"] = min(fps) if fps else 0
        session["max_fps"] = max(fps) if fps else 0
        session["avg_temp"] = round(sum(temps) / len(temps), 1) if temps else 0
        session["end"] = time.time()
        self._sessions.append(session)
        self._save()
        return session

    def get_summary(self, days: int = 7) -> dict:
        cutoff = time.time() - (days * 86400)
        recent = [s for s in self._sessions if s.get("start", 0) > cutoff]
        if not recent:
            return {"sessions": 0}
        total_time = sum(s.get("duration_min", 0) for s in recent)
        all_fps = [s.get("avg_fps", 0) for s in recent if s.get("avg_fps")]
        return {
            "sessions": len(recent),
            "total_hours": round(total_time / 60, 1),
            "avg_fps": round(sum(all_fps) / len(all_fps), 1) if all_fps else 0,
            "most_played": max(set(s["app_name"] for s in recent),
                               key=lambda x: sum(s.get("duration_min", 0)
                               for s in recent if s["app_name"] == x))
        }
