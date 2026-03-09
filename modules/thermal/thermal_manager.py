# ============================================================
# JBL Thermal Manager
# ============================================================
import os
import asyncio
import logging
from modules.core.constants import THERMAL_WARN, THERMAL_DANGER, THERMAL_CRITICAL

logger = logging.getLogger("JBL.Thermal")

class ThermalManager:
    def __init__(self, settings, tdp_manager):
        self.settings = settings
        self.tdp = tdp_manager
        self._warn_temp = settings.get("thermal_warn", THERMAL_WARN)
        self._danger_temp = settings.get("thermal_danger", THERMAL_DANGER)
        self._critical_temp = settings.get("thermal_critical", THERMAL_CRITICAL)
        self._callbacks = []
        self._monitoring = False

    def read_cpu_temp(self) -> float:
        paths = [
            "/sys/class/hwmon/hwmon0/temp1_input",
            "/sys/class/hwmon/hwmon1/temp1_input",
            "/sys/class/thermal/thermal_zone0/temp",
        ]
        for path in paths:
            try:
                if os.path.exists(path):
                    with open(path) as f:
                        val = int(f.read().strip())
                    return val / 1000.0
            except Exception:
                continue
        return 0.0

    def read_gpu_temp(self) -> float:
        try:
            path = "/sys/class/drm/card0/device/hwmon/hwmon0/temp1_input"
            if os.path.exists(path):
                with open(path) as f:
                    return int(f.read().strip()) / 1000.0
        except Exception:
            pass
        return self.read_cpu_temp()

    def get_thermal_state(self) -> str:
        temp = self.read_cpu_temp()
        if temp >= self._critical_temp:
            return "critical"
        elif temp >= self._danger_temp:
            return "danger"
        elif temp >= self._warn_temp:
            return "warning"
        return "normal"

    def on_thermal_event(self, callback):
        self._callbacks.append(callback)

    async def monitor_loop(self):
        self._monitoring = True
        last_state = "normal"
        while self._monitoring:
            state = self.get_thermal_state()
            temp = self.read_cpu_temp()
            if state != last_state:
                logger.warning(f"Thermal state changed: {last_state} → {state} ({temp}°C)")
                if state == "critical":
                    emergency_tdp = max(3, self.tdp.get_current_tdp() - 4)
                    self.tdp.set_tdp(emergency_tdp)
                    logger.critical(f"THERMAL EMERGENCY: TDP reduced to {emergency_tdp}W")
                elif state == "danger":
                    reduced_tdp = max(5, self.tdp.get_current_tdp() - 2)
                    self.tdp.set_tdp(reduced_tdp)
                for cb in self._callbacks:
                    try:
                        cb(state, temp)
                    except Exception as e:
                        logger.error(f"Thermal callback error: {e}")
                last_state = state
            await asyncio.sleep(5)

    def stop(self):
        self._monitoring = False

    def get_status(self):
        cpu = self.read_cpu_temp()
        gpu = self.read_gpu_temp()
        return {
            "cpu_temp": cpu,
            "gpu_temp": gpu,
            "state": self.get_thermal_state(),
            "thresholds": {
                "warn": self._warn_temp,
                "danger": self._danger_temp,
                "critical": self._critical_temp
            }
        }
