# ============================================================
# JBL PowerShift — Intent-Driven Performance Control
# ============================================================
import logging
from modules.core.constants import POWERSHIFT_MODES

logger = logging.getLogger("JBL.PowerShift")

POWERSHIFT_PROFILES = {
    "performance": {
        "docked":    {"tdp": 15, "gpu_clock": 1600, "fps_cap": 0,  "lsfg_multiplier": 2, "lsfg_flow": 50},
        "undocked":  {"tdp": 12, "gpu_clock": 1200, "fps_cap": 0,  "lsfg_multiplier": 2, "lsfg_flow": 50},
        "xr":        {"tdp": 12, "gpu_clock": 1200, "fps_cap": 0,  "lsfg_multiplier": 2, "lsfg_flow": 50},
    },
    "balanced": {
        "docked":    {"tdp": 10, "gpu_clock": 1000, "fps_cap": 60, "lsfg_multiplier": 2, "lsfg_flow": 50},
        "undocked":  {"tdp": 8,  "gpu_clock": 800,  "fps_cap": 60, "lsfg_multiplier": 2, "lsfg_flow": 50},
        "xr":        {"tdp": 8,  "gpu_clock": 900,  "fps_cap": 60, "lsfg_multiplier": 2, "lsfg_flow": 50},
    },
    "battery": {
        "docked":    {"tdp": 6,  "gpu_clock": 600,  "fps_cap": 30, "lsfg_multiplier": 2, "lsfg_flow": 50},
        "undocked":  {"tdp": 5,  "gpu_clock": 500,  "fps_cap": 30, "lsfg_multiplier": 2, "lsfg_flow": 50},
        "xr":        {"tdp": 5,  "gpu_clock": 600,  "fps_cap": 30, "lsfg_multiplier": 2, "lsfg_flow": 50},
    },
}

class PowerShiftManager:
    def __init__(self, settings, tdp_manager, lsfg_manager):
        self.settings = settings
        self.tdp = tdp_manager
        self.lsfg = lsfg_manager
        self._mode = settings.get("powershift_mode", "balanced")
        self._context = "undocked"
        logger.info(f"PowerShift initialized: mode={self._mode} context={self._context}")

    def set_context(self, context: str):
        """Set context: docked | undocked | xr"""
        self._context = context
        self._apply()

    def cycle_mode(self):
        """Cycle through modes — called by hotkey"""
        idx = POWERSHIFT_MODES.index(self._mode)
        self._mode = POWERSHIFT_MODES[(idx + 1) % len(POWERSHIFT_MODES)]
        self.settings.set("powershift_mode", self._mode)
        self._apply()
        logger.info(f"PowerShift cycled to: {self._mode}")
        return self._mode

    def set_mode(self, mode: str):
        if mode not in POWERSHIFT_MODES:
            logger.warning(f"Unknown mode: {mode}")
            return False
        self._mode = mode
        self.settings.set("powershift_mode", mode)
        self._apply()
        return True

    def _apply(self):
        profile = POWERSHIFT_PROFILES.get(self._mode, {}).get(self._context, {})
        if not profile:
            logger.warning(f"No profile for {self._mode}/{self._context}")
            return
        self.tdp.apply_profile(profile)
        if self.lsfg:
            self.lsfg.set_multiplier(profile.get("lsfg_multiplier", 2))
            self.lsfg.set_flow_rate(profile.get("lsfg_flow", 50))
        logger.info(f"PowerShift applied: {self._mode}/{self._context} → {profile}")

    def get_state(self):
        return {
            "mode": self._mode,
            "context": self._context,
            "profile": POWERSHIFT_PROFILES.get(self._mode, {}).get(self._context, {})
        }
