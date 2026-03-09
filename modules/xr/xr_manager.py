# ============================================================
# JBL XR Manager — Viture Luma Ultra + Multi-Device Support
# ============================================================
import os
import subprocess
import asyncio
import logging
from modules.core.constants import KNOWN_XR_DEVICES

logger = logging.getLogger("JBL.XR")

XR_PROFILES = {
    "cinema": {
        "refresh": 60,
        "resolution": "1920x1080",
        "tdp": 6,
        "lsfg_multiplier": 2,
        "lsfg_flow": 50,
        "fps_cap": 60,
        "description": "Cinema — max battery, stable 60fps"
    },
    "gaming": {
        "refresh": 60,
        "resolution": "1920x1080",
        "tdp": 8,
        "lsfg_multiplier": 2,
        "lsfg_flow": 50,
        "fps_cap": 0,
        "description": "Gaming — balanced performance"
    },
    "performance": {
        "refresh": 60,
        "resolution": "1920x1080",
        "tdp": 12,
        "lsfg_multiplier": 2,
        "lsfg_flow": 50,
        "fps_cap": 0,
        "description": "Performance — max TDP, plugged in"
    }
}

class XRManager:
    def __init__(self, settings, tdp_manager, lsfg_manager):
        self.settings = settings
        self.tdp = tdp_manager
        self.lsfg = lsfg_manager
        self._connected_device = None
        self._mode = settings.get("xr_mode", "gaming")
        self._monitoring = False

    def detect_device(self) -> dict:
        """Detect connected XR device via USB"""
        try:
            result = subprocess.run(
                ["lsusb"], capture_output=True, text=True
            )
            output = result.stdout

            for name, ids in KNOWN_XR_DEVICES.items():
                vid = ids["vid"].replace("0x", "").lower()
                pid = ids["pid"].replace("0x", "").lower()
                if vid in output.lower() and pid in output.lower():
                    logger.info(f"XR device detected: {name}")
                    self._connected_device = name
                    return {"detected": True, "device": name, "ids": ids}

            # Fallback: check for any display on USB-C
            if "35ca" in output.lower():
                logger.info("Viture device detected (generic)")
                self._connected_device = "Viture (Generic)"
                return {"detected": True, "device": "Viture (Generic)", "ids": {}}

        except Exception as e:
            logger.error(f"XR detection failed: {e}")

        self._connected_device = None
        return {"detected": False, "device": None}

    def apply_xr_profile(self, mode: str = None) -> bool:
        if mode:
            self._mode = mode
            self.settings.set("xr_mode", mode)

        profile = XR_PROFILES.get(self._mode, XR_PROFILES["gaming"])

        try:
            # Set resolution
            subprocess.run(
                ["xrandr", "--output", "HDMI-A-1",
                 "--mode", profile["resolution"],
                 "--rate", str(profile["refresh"])],
                capture_output=True
            )
        except Exception as e:
            logger.warning(f"xrandr failed: {e}")

        # Apply TDP
        self.tdp.set_tdp(profile["tdp"])

        # Apply LSFG (James's personal 2x 50% default)
        self.lsfg.set_multiplier(profile["lsfg_multiplier"])
        self.lsfg.set_flow_rate(profile["lsfg_flow"])

        logger.info(f"XR profile applied: {self._mode} → {profile}")
        return True

    def is_viture_luma_ultra(self) -> bool:
        return self._connected_device == "Viture Luma Ultra"

    async def monitor_loop(self):
        self._monitoring = True
        was_connected = False
        while self._monitoring:
            detection = self.detect_device()
            is_connected = detection["detected"]

            if is_connected and not was_connected:
                logger.info(f"XR connected: {detection['device']}")
                self.apply_xr_profile()
                was_connected = True

            elif not is_connected and was_connected:
                logger.info("XR disconnected — restoring normal profile")
                was_connected = False

            await asyncio.sleep(5)

    def stop(self):
        self._monitoring = False

    def get_status(self):
        return {
            "connected": self._connected_device is not None,
            "device": self._connected_device,
            "mode": self._mode,
            "profile": XR_PROFILES.get(self._mode, {}),
            "is_viture_luma_ultra": self.is_viture_luma_ultra(),
            "available_modes": list(XR_PROFILES.keys())
        }
