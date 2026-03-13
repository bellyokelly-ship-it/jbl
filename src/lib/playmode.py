"""
JBL PlayMode Auto-Detection
Detects: Handheld / XR (Viture) / Docked
Forces 1080p60 on any external output, FSR handles upscaling.
"""

import subprocess
import os
import glob
import json
import re
import logging

logger = logging.getLogger("jbl")

# Known XR device identifiers (EDID manufacturer codes)
XR_DEVICES = {
    "VIT": "Viture",
    "NRL": "Nreal",
    "XRL": "XREAL",
    "RKD": "Rokid",
}

class PlayMode:
    HANDHELD = "handheld"
    XR = "xr"
    DOCKED = "docked"

class PlayModeDetector:
    """Detects current play mode from DRM connector state + EDID."""

    DRM_PATH = "/sys/class/drm"
    INTERNAL_CONNECTORS = {"eDP-1", "eDP-2"}  # Steam Deck internal panel

    def __init__(self):
        self._last_mode = None
        self._last_device = None

    def get_connectors(self) -> list[dict]:
        """Scan all DRM connectors and their status."""
        connectors = []
        for card_path in sorted(glob.glob(f"{self.DRM_PATH}/card*-*")):
            name = os.path.basename(card_path)
            status_file = os.path.join(card_path, "status")
            enabled_file = os.path.join(card_path, "enabled")
            edid_file = os.path.join(card_path, "edid")

            if not os.path.exists(status_file):
                continue

            with open(status_file) as f:
                status = f.read().strip()

            enabled = "unknown"
            if os.path.exists(enabled_file):
                with open(enabled_file) as f:
                    enabled = f.read().strip()

            has_edid = os.path.exists(edid_file) and os.path.getsize(edid_file) > 0

            connectors.append({
                "name": name,
                "path": card_path,
                "status": status,
                "enabled": enabled,
                "has_edid": has_edid,
                "is_internal": any(ic in name for ic in self.INTERNAL_CONNECTORS),
            })
        return connectors

    def read_edid_manufacturer(self, connector_path: str) -> str | None:
        """Extract 3-letter manufacturer code from raw EDID binary."""
        edid_path = os.path.join(connector_path, "edid")
        try:
            with open(edid_path, "rb") as f:
                edid = f.read()
            if len(edid) < 10:
                return None
            # Manufacturer ID is bytes 8-9, encoded as 3x 5-bit chars
            b1, b2 = edid[8], edid[9]
            c1 = chr(((b1 >> 2) & 0x1F) + 64)
            c2 = chr(((b1 & 0x03) << 3 | (b2 >> 5) & 0x07) + 64)
            c3 = chr((b2 & 0x1F) + 64)
            return f"{c1}{c2}{c3}"
        except Exception as e:
            logger.warning(f"EDID read failed for {connector_path}: {e}")
            return None

    def detect(self) -> dict:
        """
        Returns: {
            "mode": "handheld" | "xr" | "docked",
            "external_connector": str | None,
            "external_device": str | None,
            "xr_model": str | None,
        }
        """
        connectors = self.get_connectors()
        external_connected = [
            c for c in connectors
            if not c["is_internal"] and c["status"] == "connected"
        ]

        if not external_connected:
            result = {
                "mode": PlayMode.HANDHELD,
                "external_connector": None,
                "external_device": None,
                "xr_model": None,
            }
        else:
            ext = external_connected[0]
            mfr = self.read_edid_manufacturer(ext["path"])
            xr_model = XR_DEVICES.get(mfr) if mfr else None

            if xr_model:
                mode = PlayMode.XR
            else:
                mode = PlayMode.DOCKED

            result = {
                "mode": mode,
                "external_connector": ext["name"],
                "external_device": mfr,
                "xr_model": xr_model,
            }

        self._last_mode = result["mode"]
        self._last_device = result.get("xr_model") or result.get("external_device")
        logger.info(f"PlayMode detected: {result['mode']} (device: {self._last_device})")
        return result

    @property
    def last_mode(self):
        return self._last_mode


def force_1080p60(connector_name: str) -> bool:
    """Force 1920x1080@60Hz on an external connector via xrandr."""
    try:
        # Strip card prefix for xrandr (e.g., "card1-DP-1" -> "DP-1")
        output_name = re.sub(r"^card\d+-", "", connector_name)

        # First set the mode
        cmd = [
            "xrandr",
            "--output", output_name,
            "--mode", "1920x1080",
            "--rate", "60",
        ]
        result = subprocess.run(cmd, capture_output=True, text=True, timeout=5)

        if result.returncode != 0:
            # Try with DISPLAY set for gamescope
            env = os.environ.copy()
            env["DISPLAY"] = ":0"
            result = subprocess.run(cmd, capture_output=True, text=True, timeout=5, env=env)

        if result.returncode == 0:
            logger.info(f"Forced 1080p60 on {output_name}")
            return True
        else:
            logger.error(f"xrandr failed: {result.stderr}")
            return False
    except Exception as e:
        logger.error(f"force_1080p60 error: {e}")
        return False


# Profiles applied per mode
MODE_PROFILES = {
    PlayMode.HANDHELD: {
        "tdp": 12,
        "gpu_clock": 1100,
        "refresh_rate": 90,
        "frame_limit": 60,
        "fsr": False,
        "fsr_sharpness": 3,
        "lsfg_enabled": True,
        "lsfg_multiplier": 2,
        "lsfg_flow": 50,
        "fan_profile": "quiet",
        "force_resolution": None,
    },
    PlayMode.XR: {
        "tdp": 15,
        "gpu_clock": 1400,
        "refresh_rate": 60,
        "frame_limit": 60,
        "fsr": True,
        "fsr_sharpness": 3,
        "lsfg_enabled": True,
        "lsfg_multiplier": 2,
        "lsfg_flow": 50,
        "fan_profile": "balanced",
        "force_resolution": "1920x1080",
    },
    PlayMode.DOCKED: {
        "tdp": 0,
        "gpu_clock": 1600,
        "refresh_rate": 60,
        "frame_limit": 0,
        "fsr": True,
        "fsr_sharpness": 2,
        "lsfg_enabled": True,
        "lsfg_multiplier": 2,
        "lsfg_flow": 50,
        "fan_profile": "performance",
        "force_resolution": "1920x1080",
    },
}
