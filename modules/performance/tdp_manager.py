# ============================================================
# JBL TDP Manager
# ============================================================
import subprocess
import logging
from modules.core.constants import TDP_MIN, TDP_MAX, GPU_MIN, GPU_MAX

logger = logging.getLogger("JBL.TDP")

class TDPManager:
    def __init__(self, settings):
        self.settings = settings
        self._current_tdp = settings.get("tdp_limit", 8)
        self._current_gpu = settings.get("gpu_clock", 800)

    def set_tdp(self, watts: int) -> bool:
        watts = max(TDP_MIN, min(TDP_MAX, watts))
        try:
            subprocess.run(
                ["ryzenadj", f"--stapm-limit={watts * 1000}",
                 f"--fast-limit={watts * 1000}",
                 f"--slow-limit={watts * 1000}"],
                check=True, capture_output=True
            )
            self._current_tdp = watts
            self.settings.set("tdp_limit", watts)
            logger.info(f"TDP set to {watts}W ✅")
            return True
        except subprocess.CalledProcessError as e:
            logger.error(f"ryzenadj failed: {e}")
            return False
        except FileNotFoundError:
            logger.warning("ryzenadj not found — using sysfs fallback")
            return self._set_tdp_sysfs(watts)

    def _set_tdp_sysfs(self, watts: int) -> bool:
        try:
            path = "/sys/class/hwmon/hwmon0/power1_cap"
            if os.path.exists(path):
                with open(path, "w") as f:
                    f.write(str(watts * 1_000_000))
                return True
        except Exception as e:
            logger.error(f"sysfs TDP failed: {e}")
        return False

    def set_gpu_clock(self, mhz: int) -> bool:
        mhz = max(GPU_MIN, min(GPU_MAX, mhz))
        try:
            path = "/sys/class/drm/card0/device/pp_od_clk_voltage"
            with open(path, "w") as f:
                f.write(f"s 1 {mhz}\n")
            with open(path, "w") as f:
                f.write("c\n")
            self._current_gpu = mhz
            self.settings.set("gpu_clock", mhz)
            logger.info(f"GPU clock set to {mhz}MHz ✅")
            return True
        except Exception as e:
            logger.error(f"GPU clock failed: {e}")
            return False

    def get_current_tdp(self) -> int:
        return self._current_tdp

    def get_current_gpu(self) -> int:
        return self._current_gpu

    def apply_profile(self, profile: dict):
        if "tdp" in profile:
            self.set_tdp(profile["tdp"])
        if "gpu_clock" in profile:
            self.set_gpu_clock(profile["gpu_clock"])
