#!/usr/bin/env python3
"""
Proton Advisor — Helper for JBL Decky Plugin
Handles Proton-GE version management with proper deck user ownership.
"""
import os
import json
import subprocess
import urllib.request
from pathlib import Path

COMPAT_DIR = Path("/home/deck/.steam/root/compatibilitytools.d")
CACHE_FILE = Path("/home/deck/.config/jbl/proton_cache.json")


def ensure_deck_ownership(path):
    """Ensure path is owned by deck:deck."""
    try:
        subprocess.run(["chown", "-R", "deck:deck", str(path)], capture_output=True)
    except Exception:
        pass


def get_installed_versions():
    """List installed Proton versions."""
    versions = []
    if COMPAT_DIR.exists():
        for d in sorted(COMPAT_DIR.iterdir(), reverse=True):
            if d.is_dir():
                versions.append(d.name)
    return versions


def get_recommended_proton(appid):
    """Get recommended Proton version for a game from ProtonDB."""
    try:
        url = f"https://www.protondb.com/api/v1/reports/summaries/{appid}.json"
        req = urllib.request.Request(url, headers={"User-Agent": "JBL-Decky/0.5"})
        with urllib.request.urlopen(req, timeout=10) as resp:
            data = json.loads(resp.read().decode())

        tier = data.get("tier", "unknown")
        best = data.get("bestReportedTier", tier)

        if tier in ("platinum", "native"):
            proton_rec = "latest stable"
        else:
            proton_rec = "latest GE"

        return {
            "appid": appid,
            "protondb_tier": tier,
            "best_reported_tier": best,
            "proton_version": proton_rec,
        }
    except Exception as e:
        return {
            "appid": appid,
            "protondb_tier": "unknown",
            "best_reported_tier": "unknown",
            "proton_version": "latest GE",
            "error": str(e),
        }


def install_proton_ge(tag):
    """Download and install a Proton-GE release."""
    try:
        url = f"https://api.github.com/repos/GloriousEggroll/proton-ge-custom/releases/tags/{tag}"
        req = urllib.request.Request(url, headers={"User-Agent": "JBL-Decky/0.5"})
        with urllib.request.urlopen(req, timeout=10) as resp:
            data = json.loads(resp.read().decode())

        tar_url = None
        for asset in data.get("assets", []):
            if asset["name"].endswith(".tar.gz"):
                tar_url = asset["browser_download_url"]
                break

        if not tar_url:
            return {"success": False, "error": "No tar.gz found in release"}

        COMPAT_DIR.mkdir(parents=True, exist_ok=True)
        tmp_path = f"/tmp/proton-ge-{tag}.tar.gz"

        subprocess.run(
            ["sudo", "-u", "deck", "wget", "-q", "-O", tmp_path, tar_url],
            check=True, capture_output=True, timeout=300
        )
        subprocess.run(
            ["sudo", "-u", "deck", "tar", "-xzf", tmp_path, "-C", str(COMPAT_DIR)],
            check=True, capture_output=True, timeout=120
        )
        os.remove(tmp_path)
        ensure_deck_ownership(COMPAT_DIR)
        return {"success": True, "installed": tag}
    except Exception as e:
        return {"success": False, "error": str(e)}


def remove_proton_version(name):
    """Remove a Proton version directory."""
    target = COMPAT_DIR / name
    if target.exists() and target.is_dir():
        subprocess.run(["rm", "-rf", str(target)], check=True, capture_output=True)
        return {"success": True, "removed": name}
    return {"success": False, "error": "Not found"}
