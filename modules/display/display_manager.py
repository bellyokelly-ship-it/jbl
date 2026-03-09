# ============================================================
# JBL Display Manager
# ============================================================
import subprocess
import logging

logger = logging.getLogger("JBL.Display")

class DisplayManager:
    def __init__(self, settings):
        self.settings = settings

    def is_docked(self) -> bool:
        try:
            result = subprocess.run(
                ["cat", "/sys/class/power_supply/AC/online"],
                capture_output=True, text=True
            )
            # Also check for external display
            displays = self._get_connected_displays()
            has_external = any(d != "eDP-1" for d in displays)
            return has_external
        except Exception:
            return False

    def _get_connected_displays(self) -> list:
        try:
            result = subprocess.run(
                ["xrandr", "--query"], capture_output=True, text=True
            )
            displays = []
            for line in result.stdout.split("\n"):
                if " connected" in line:
                    displays.append(line.split()[0])
            return displays
        except Exception:
            return ["eDP-1"]

    def get_current_context(self) -> str:
        """Returns: docked | undocked | xr"""
        from modules.core.constants import KNOWN_XR_DEVICES
        try:
            result = subprocess.run(["lsusb"], capture_output=True, text=True)
            for name, ids in KNOWN_XR_DEVICES.items():
                vid = ids["vid"].replace("0x", "").lower()
                if vid in result.stdout.lower():
                    return "xr"
        except Exception:
            pass
        return "docked" if self.is_docked() else "undocked"

    def get_status(self):
        return {
            "docked": self.is_docked(),
            "context": self.get_current_context(),
            "displays": self._get_connected_displays()
        }
