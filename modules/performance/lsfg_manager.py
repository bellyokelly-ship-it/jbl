# ============================================================
# JBL LSFG Manager — Frame Generation Control
# ============================================================
import os
import subprocess
import logging
from modules.core.constants import LSFG_CONFIG_PATH, LSFG_DEFAULT_MULTIPLIER, LSFG_DEFAULT_FLOW_RATE

logger = logging.getLogger("JBL.LSFG")

class LSFGManager:
    def __init__(self, settings):
        self.settings = settings
        self._enabled = settings.get("lsfg_enabled", True)
        self._multiplier = settings.get("lsfg_multiplier", LSFG_DEFAULT_MULTIPLIER)
        self._flow_rate = settings.get("lsfg_flow_rate", LSFG_DEFAULT_FLOW_RATE)
        self._ensure_config_dir()

    def _ensure_config_dir(self):
        os.makedirs(os.path.dirname(LSFG_CONFIG_PATH), exist_ok=True)

    def _write_config(self):
        try:
            with open(LSFG_CONFIG_PATH, "w") as f:
                f.write(f"multiplier={self._multiplier}\n")
                f.write(f"flow_scale={self._flow_rate / 100.0:.2f}\n")
                f.write(f"enabled={'1' if self._enabled else '0'}\n")
            logger.info(f"LSFG config written: {self._multiplier}x @ {self._flow_rate}%")
            return True
        except Exception as e:
            logger.error(f"Failed to write LSFG config: {e}")
            return False

    def enable(self):
        self._enabled = True
        self.settings.set("lsfg_enabled", True)
        return self._write_config()

    def disable(self):
        self._enabled = False
        self.settings.set("lsfg_enabled", False)
        return self._write_config()

    def set_multiplier(self, multiplier: int):
        if multiplier not in [2, 3, 4]:
            logger.warning(f"Invalid multiplier: {multiplier}")
            return False
        self._multiplier = multiplier
        self.settings.set("lsfg_multiplier", multiplier)
        return self._write_config()

    def set_flow_rate(self, rate: int):
        rate = max(10, min(100, rate))
        self._flow_rate = rate
        self.settings.set("lsfg_flow_rate", rate)
        return self._write_config()

    def auto_tune(self, fps: float, temp: float, battery_percent: int):
        """Automatically tune LSFG based on current system state"""
        original_mult = self._multiplier
        original_flow = self._flow_rate

        # Thermal throttle — reduce flow rate if hot
        if temp >= 87:
            new_flow = max(25, self._flow_rate - 10)
            if new_flow != self._flow_rate:
                logger.info(f"LSFG auto-tune: thermal throttle → flow {new_flow}%")
                self.set_flow_rate(new_flow)

        # Battery saver — reduce multiplier on low battery
        elif battery_percent <= 20 and self._multiplier > 2:
            logger.info("LSFG auto-tune: battery saver → multiplier 2x")
            self.set_multiplier(2)

        # Performance boost — increase if cool and fps stable
        elif temp < 75 and fps > 50 and battery_percent > 50:
            if self._flow_rate < 75:
                logger.info(f"LSFG auto-tune: perf boost → flow {self._flow_rate + 10}%")
                self.set_flow_rate(self._flow_rate + 10)

        return {
            "changed": self._multiplier != original_mult or self._flow_rate != original_flow,
            "multiplier": self._multiplier,
            "flow_rate": self._flow_rate
        }

    def get_state(self):
        return {
            "enabled": self._enabled,
            "multiplier": self._multiplier,
            "flow_rate": self._flow_rate,
            "config_path": LSFG_CONFIG_PATH
        }
