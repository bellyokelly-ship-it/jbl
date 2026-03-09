# ============================================================
# JBL Battery Arc Planner
# ============================================================
import os
import time
import logging
from modules.core.constants import BATTERY_LOW, BATTERY_CRITICAL

logger = logging.getLogger("JBL.BatteryArc")

class BatteryArcPlanner:
    def __init__(self, settings, tdp_manager):
        self.settings = settings
        self.tdp = tdp_manager
        self._session_start = time.time()
        self._target_hours = settings.get("battery_session_hours", 3)
        self._enabled = settings.get("battery_arc_enabled", True)
        self._history = []

    def read_battery(self) -> dict:
        base = "/sys/class/power_supply/BAT0"
        try:
            def _read(f):
                path = os.path.join(base, f)
                if os.path.exists(path):
                    with open(path) as fh:
                        return fh.read().strip()
                return None

            cap = _read("capacity")
            status = _read("status")
            energy_now = _read("energy_now")
            energy_full = _read("energy_full")
            power_now = _read("power_now")

            percent = int(cap) if cap else 0
            watts_draw = int(power_now) / 1_000_000 if power_now else 0
            energy = int(energy_now) / 1_000_000 if energy_now else 0

            return {
                "percent": percent,
                "status": status or "Unknown",
                "watts_draw": watts_draw,
                "energy_wh": energy,
                "charging": status == "Charging"
            }
        except Exception as e:
            logger.error(f"Battery read failed: {e}")
            return {"percent": 100, "status": "Unknown", "watts_draw": 0, "energy_wh": 0, "charging": False}

    def get_estimated_runtime(self) -> float:
        """Returns estimated hours remaining"""
        batt = self.read_battery()
        if batt["charging"] or batt["watts_draw"] == 0:
            return 99.0
        return batt["energy_wh"] / batt["watts_draw"]

    def get_arc_recommendation(self) -> dict:
        """Returns TDP recommendation to meet session target"""
        if not self._enabled:
            return {"action": "none", "reason": "arc_disabled"}

        batt = self.read_battery()
        if batt["charging"]:
            return {"action": "none", "reason": "charging"}

        elapsed = (time.time() - self._session_start) / 3600
        remaining_target = max(0.1, self._target_hours - elapsed)
        estimated = self.get_estimated_runtime()

        if batt["percent"] <= BATTERY_CRITICAL:
            return {
                "action": "emergency",
                "reason": "critical_battery",
                "tdp": 4,
                "message": "⚠️ Critical battery — emergency TDP"
            }
        elif batt["percent"] <= BATTERY_LOW:
            return {
                "action": "reduce",
                "reason": "low_battery",
                "tdp": max(5, self.tdp.get_current_tdp() - 2),
                "message": "🔋 Low battery — reducing TDP"
            }
        elif estimated < remaining_target * 0.8:
            return {
                "action": "reduce",
                "reason": "behind_arc",
                "tdp": max(5, self.tdp.get_current_tdp() - 1),
                "message": f"📉 Behind arc — need {remaining_target:.1f}h, have {estimated:.1f}h"
            }
        elif estimated > remaining_target * 1.2 and batt["percent"] > 50:
            return {
                "action": "increase",
                "reason": "ahead_of_arc",
                "tdp": min(12, self.tdp.get_current_tdp() + 1),
                "message": f"📈 Ahead of arc — boosting performance"
            }

        return {"action": "hold", "reason": "on_track", "message": "✅ On track"}

    def get_status(self):
        batt = self.read_battery()
        return {
            **batt,
            "estimated_runtime_h": self.get_estimated_runtime(),
            "target_hours": self._target_hours,
            "session_elapsed_h": (time.time() - self._session_start) / 3600,
            "arc_recommendation": self.get_arc_recommendation()
        }
