# ============================================================
# JBL Health Monitor + Diagnostics
# ============================================================
import os
import subprocess
import asyncio
import logging

logger = logging.getLogger("JBL.Health")

class HealthMonitor:
    def __init__(self, settings, thermal_manager, battery_arc):
        self.settings = settings
        self.thermal = thermal_manager
        self.battery = battery_arc
        self._interval = settings.get("health_check_interval", 300)
        self._monitoring = False
        self._issues = []

    def _check_lsfg(self) -> dict:
        from modules.core.constants import LSFG_CONFIG_PATH
        return {
            "name": "LSFG-VK",
            "ok": os.path.exists(LSFG_CONFIG_PATH),
            "detail": "Config found" if os.path.exists(LSFG_CONFIG_PATH) else "Config missing"
        }

    def _check_ryzenadj(self) -> dict:
        try:
            result = subprocess.run(["which", "ryzenadj"], capture_output=True)
            ok = result.returncode == 0
            return {"name": "ryzenadj", "ok": ok, "detail": "Found" if ok else "Not installed"}
        except Exception:
            return {"name": "ryzenadj", "ok": False, "detail": "Check failed"}

    def _check_disk_space(self) -> dict:
        try:
            stat = os.statvfs("/home/deck")
            free_gb = (stat.f_bavail * stat.f_frsize) / 1_073_741_824
            ok = free_gb > 2.0
            return {"name": "Disk Space", "ok": ok, "detail": f"{free_gb:.1f}GB free"}
        except Exception:
            return {"name": "Disk Space", "ok": False, "detail": "Check failed"}

    def _check_proton_path(self) -> dict:
        from modules.core.constants import PROTON_INSTALL_PATH
        ok = os.path.exists(PROTON_INSTALL_PATH)
        return {
            "name": "Proton Path",
            "ok": ok,
            "detail": "Found" if ok else f"Missing: {PROTON_INSTALL_PATH}"
        }

    def _check_thermal(self) -> dict:
        status = self.thermal.get_status()
        state = status["state"]
        ok = state in ["normal", "warning"]
        return {
            "name": "Thermal",
            "ok": ok,
            "detail": f"{status['cpu_temp']:.1f}°C ({state})"
        }

    def run_diagnostics(self) -> dict:
        checks = [
            self._check_lsfg(),
            self._check_ryzenadj(),
            self._check_disk_space(),
            self._check_proton_path(),
            self._check_thermal(),
        ]
        issues = [c for c in checks if not c["ok"]]
        self._issues = issues
        return {
            "checks": checks,
            "issues": issues,
            "healthy": len(issues) == 0,
            "score": round((len(checks) - len(issues)) / len(checks) * 100)
        }

    async def monitor_loop(self):
        self._monitoring = True
        while self._monitoring:
            self.run_diagnostics()
            await asyncio.sleep(self._interval)

    def stop(self):
        self._monitoring = False

    def get_current_issues(self):
        return self._issues
