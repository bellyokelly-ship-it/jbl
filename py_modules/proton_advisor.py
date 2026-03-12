import os
import re
import json
import time
import asyncio
import logging
import aiohttp
from pathlib import Path
from collections import Counter
from datetime import datetime, timedelta

logger = logging.getLogger("jbl")

STEAM_DIR = Path.home() / ".steam" / "steam"
STEAMAPPS = STEAM_DIR / "steamapps"
COMPAT_DIR = STEAMAPPS / "compatdata"
CONFIG_VDF = STEAM_DIR / "config" / "config.vdf"
PROTON_DIR = STEAMAPPS / "common"
GE_DIR = STEAMAPPS / "compatibilitytools.d"

PROTONDB_SUMMARY = "https://www.protondb.com/api/v1/reports/summaries/{}.json"

_cache = {}
_cache_ttl = 3600


class GameInfo:
    def __init__(self, appid: str, name: str, install_dir: str):
        self.appid = appid
        self.name = name
        self.install_dir = install_dir
        self.is_native = False
        self.current_proton = None
        self.recommended_proton = None
        self.protondb_tier = None


def parse_acf(filepath: Path) -> dict:
    result = {}
    try:
        text = filepath.read_text(encoding="utf-8", errors="replace")
        for match in re.finditer(r'"(\w+)"\s+"([^"]*)"', text):
            result[match.group(1)] = match.group(2)
    except Exception as e:
        logger.error(f"Failed to parse {filepath}: {e}")
    return result


def scan_installed_games() -> list:
    games = []
    if not STEAMAPPS.exists():
        logger.warning(f"steamapps not found at {STEAMAPPS}")
        return games

    for acf in STEAMAPPS.glob("appmanifest_*.acf"):
        data = parse_acf(acf)
        appid = data.get("appid", "")
        name = data.get("name", "Unknown")
        installdir = data.get("installdir", "")

        if not appid or not name:
            continue

        skip_names = ["proton", "steam linux runtime", "steamworks"]
        if any(s in name.lower() for s in skip_names):
            continue

        game = GameInfo(appid, name, installdir)

        game_path = STEAMAPPS / "common" / installdir
        if game_path.exists():
            has_linux_bin = False
            try:
                for f in game_path.iterdir():
                    if f.is_file() and f.suffix in ("", ".x86_64", ".x86", ".sh"):
                        if os.access(str(f), os.X_OK):
                            has_linux_bin = True
                            break
            except Exception:
                pass
            if has_linux_bin:
                game.is_native = True

        games.append(game)

    games.sort(key=lambda g: g.name.lower())
    return games


def get_current_proton_overrides() -> dict:
    overrides = {}
    try:
        if not CONFIG_VDF.exists():
            return overrides
        text = CONFIG_VDF.read_text(encoding="utf-8", errors="replace")

        compat_match = re.search(
            r'"CompatToolMapping"\s*\{([^}]*(?:\{[^}]*\}[^}]*)*)\}',
            text, re.DOTALL
        )
        if not compat_match:
            return overrides

        block = compat_match.group(1)
        for app_match in re.finditer(
            r'"(\d+)"\s*\{[^}]*"name"\s+"([^"]*)"',
            block, re.DOTALL
        ):
            overrides[app_match.group(1)] = app_match.group(2)
    except Exception as e:
        logger.error(f"Failed reading config.vdf: {e}")
    return overrides


async def fetch_protondb_summary(appid: str) -> dict:
    cache_key = f"summary_{appid}"
    if cache_key in _cache:
        cached_time, cached_data = _cache[cache_key]
        if time.time() - cached_time < _cache_ttl:
            return cached_data

    url = PROTONDB_SUMMARY.format(appid)
    try:
        async with aiohttp.ClientSession() as session:
            headers = {"User-Agent": "JBL-DeckyPlugin/1.0"}
            async with session.get(url, timeout=aiohttp.ClientTimeout(total=10), headers=headers) as resp:
                if resp.status == 200:
                    data = await resp.json()
                    _cache[cache_key] = (time.time(), data)
                    return data
                elif resp.status == 404:
                    return {"tier": "unknown", "total": 0}
    except Exception as e:
        logger.error(f"ProtonDB fetch failed for {appid}: {e}")
    return {"tier": "unknown", "total": 0}


def determine_recommended_proton(summary: dict, installed_protons: list) -> str:
    tier = summary.get("tier", "unknown")

    ge_versions = sorted([p for p in installed_protons if "GE-Proton" in p], reverse=True)
    official = sorted([p for p in installed_protons if p.startswith("Proton") and "GE" not in p], reverse=True)

    if tier in ("platinum", "gold"):
        if official:
            return official[0]
        elif ge_versions:
            return ge_versions[0]
        return "Proton Experimental"
    elif tier in ("silver", "bronze"):
        if ge_versions:
            return ge_versions[0]
        return "GE-Proton (latest)"
    elif tier == "borked":
        if ge_versions:
            return ge_versions[0]
        return "GE-Proton (latest) - game may not work"
    else:
        if ge_versions:
            return ge_versions[0]
        return "GE-Proton (latest)"


def set_proton_override(appid: str, proton_name: str) -> dict:
    try:
        if not CONFIG_VDF.exists():
            return {"success": False, "error": "config.vdf not found"}

        text = CONFIG_VDF.read_text(encoding="utf-8", errors="replace")

        if '"CompatToolMapping"' not in text:
            return {"success": False, "error": "CompatToolMapping section not found"}

        app_pattern = re.compile(
            rf'("{appid}"\s*\{{[^}}]*"name"\s+")[^"]*(")',
            re.DOTALL
        )

        if app_pattern.search(text):
            text = app_pattern.sub(rf'\g<1>{proton_name}\2', text)
        else:
            entry = f'\n\t\t\t\t"{appid}"\n\t\t\t\t{{\n\t\t\t\t\t"name"\t\t"{proton_name}"\n\t\t\t\t\t"config"\t\t""\n\t\t\t\t\t"priority"\t\t"250"\n\t\t\t\t}}'
            text = text.replace(
                '"CompatToolMapping"\n\t\t\t{',
                f'"CompatToolMapping"\n\t\t\t{{{entry}',
                1
            )

        CONFIG_VDF.write_text(text, encoding="utf-8")
        return {"success": True}
    except Exception as e:
        logger.error(f"Failed to set Proton override: {e}")
        return {"success": False, "error": str(e)}


async def scan_and_advise() -> list:
    games = scan_installed_games()
    overrides = get_current_proton_overrides()

    installed_protons = []
    if GE_DIR.exists():
        installed_protons.extend([d.name for d in GE_DIR.iterdir() if d.is_dir()])
    proton_common = STEAMAPPS / "common"
    if proton_common.exists():
        installed_protons.extend([
            d.name for d in proton_common.iterdir()
            if d.is_dir() and d.name.startswith("Proton")
        ])

    results = []
    for game in games:
        game.current_proton = overrides.get(game.appid, "Steam Default")

        if game.is_native:
            results.append({
                "appid": game.appid,
                "name": game.name,
                "is_native": True,
                "current_proton": "Native Linux",
                "recommended_proton": "N/A",
                "tier": "native",
                "action": "none",
            })
            continue

        summary = await fetch_protondb_summary(game.appid)
        tier = summary.get("tier", "unknown")
        recommended = determine_recommended_proton(summary, installed_protons)

        action = "none"
        if game.current_proton == "Steam Default" and tier in ("silver", "bronze", "borked"):
            action = "recommend"
        elif game.current_proton != recommended and tier not in ("platinum",):
            action = "suggest"

        results.append({
            "appid": game.appid,
            "name": game.name,
            "is_native": False,
            "current_proton": game.current_proton,
            "recommended_proton": recommended,
            "tier": tier,
            "action": action,
        })

        await asyncio.sleep(0.3)

    priority = {"recommend": 0, "suggest": 1, "none": 2}
    results.sort(key=lambda r: (priority.get(r["action"], 3), r["name"].lower()))

    return results
