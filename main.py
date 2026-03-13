import os
import json
import subprocess
import logging
import glob
import re
import urllib.request

import sys
sys.path.insert(0, os.path.join(os.path.dirname(os.path.realpath(__file__)), "py_modules"))
from proton_advisor import scan_and_advise, apply_proton_override, get_current_proton_overrides

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("JBL")

HOME = "/home/deck"
PLUGIN_DIR = os.path.dirname(os.path.realpath(__file__))
SETTINGS_PATH = os.path.join(PLUGIN_DIR, "settings.json")
PROFILES_PATH = os.path.join(PLUGIN_DIR, "profiles.json")
PROTON_GE_DIR = os.path.join(HOME, ".steam/root/compatibilitytools.d")
LSFG_CONF = os.path.join(HOME, ".config/lsfg-vk/lsfg_vk.conf")
STEAMAPPS_PATHS = [
    os.path.join(HOME, ".local/share/Steam/steamapps"),
    os.path.join(HOME, ".steam/steam/steamapps"),
]
def _find_hwmon(name_match: str, file: str) -> str:
    """Dynamically find hwmon path by device name — hwmon numbers shuffle on reboot."""
    import glob as _g
    for hwmon in sorted(_g.glob("/sys/class/hwmon/hwmon*")):
        try:
            with open(os.path.join(hwmon, "name"), "r") as f:
                if f.read().strip() == name_match:
                    path = os.path.join(hwmon, file)
                    if os.path.exists(path):
                        return path
        except:
            pass
    return ""

TDP_PATH = _find_hwmon("amdgpu", "power1_cap")
GPU_OD_PATH = "/sys/class/drm/card0/device/pp_od_clk_voltage"
GPU_DPM_PATH = "/sys/class/drm/card0/device/pp_dpm_sclk"
GPU_LEVEL_PATH = "/sys/class/drm/card0/device/power_dpm_force_performance_level"


def _ok(value=None):
    return json.dumps({"ok": True, "value": value})

def _err(msg):
    return json.dumps({"ok": False, "error": str(msg)})

def _run(cmd):
    try:
        r = subprocess.run(cmd, shell=True, capture_output=True, text=True, timeout=30)
        return r.stdout.strip()
    except Exception as e:
        logger.error(f"Cmd fail: {cmd} -> {e}")
        return ""

def _read(path):
    try:
        with open(path, "r") as f:
            return f.read().strip()
    except:
        return ""

def _write(path, data):
    try:
        with open(path, "w") as f:
            f.write(str(data))
        return True
    except Exception as e:
        logger.error(f"Write fail {path}: {e}")
        return False

def _load_json(path, default):
    try:
        with open(path, "r") as f:
            return json.load(f)
    except:
        return default

def _save_json(path, data):
    try:
        with open(path, "w") as f:
            json.dump(data, f, indent=2)
        return True
    except:
        return False

def _get_settings():
    return _load_json(SETTINGS_PATH, {
        "default_tdp": 15, "default_gpu_clock": 1600,
        "lsfg_enabled": False, "lsfg_multiplier": 2, "lsfg_flow_rate": 50
    })


# ─── GAME SCANNING ───────────────────────────────────────────────

def _scan_all_games():
    games = []
    seen = set()
    for sp in STEAMAPPS_PATHS:
        if not os.path.isdir(sp):
            logger.info(f"Steamapps not found: {sp}")
            continue
        for acf in glob.glob(os.path.join(sp, "appmanifest_*.acf")):
            try:
                with open(acf, "r") as f:
                    content = f.read()
                appid_m = re.search(r'"appid"\s+"(\d+)"', content)
                name_m = re.search(r'"name"\s+"([^"]+)"', content)
                if appid_m and name_m:
                    appid = appid_m.group(1)
                    name = name_m.group(1)
                    if appid not in seen:
                        seen.add(appid)
                        games.append({"appid": appid, "name": name})
            except Exception as e:
                logger.error(f"ACF parse fail {acf}: {e}")
    games.sort(key=lambda g: g["name"].lower())
    logger.info(f"Scanned {len(games)} games from {len(STEAMAPPS_PATHS)} paths")
    return games


# ─── LSFG CONFIG ─────────────────────────────────────────────────

def _read_lsfg_conf():
    """Read LSFG-VK config from the real config file"""
    defaults = {"enabled": False, "multiplier": 2, "flow_rate": 50}
    try:
        if not os.path.exists(LSFG_CONF):
            return defaults
        with open(LSFG_CONF, "r") as f:
            for line in f:
                line = line.strip()
                if "=" not in line or line.startswith("#"):
                    continue
                k, v = line.split("=", 1)
                k = k.strip().lower()
                v = v.strip()
                if k == "enabled":
                    defaults["enabled"] = v in ("1", "true", "True")
                elif k == "multiplier":
                    defaults["multiplier"] = int(v)
                elif k == "flow_scale":
                    defaults["flow_rate"] = int(float(v) * 100)
                elif k == "flow_rate":
                    # Some configs use integer flow_rate
                    defaults["flow_rate"] = int(v)
        return defaults
    except Exception as e:
        logger.error(f"LSFG conf read fail: {e}")
        return defaults

def _write_lsfg_conf(enabled, multiplier, flow_rate):
    """Write LSFG-VK config back to the real config file"""
    try:
        os.makedirs(os.path.dirname(LSFG_CONF), exist_ok=True)
        flow_scale = round(flow_rate / 100.0, 2)
        with open(LSFG_CONF, "w") as f:
            f.write(f"multiplier={multiplier}\n")
            f.write(f"flow_scale={flow_scale:.2f}\n")
            f.write(f"enabled={'1' if enabled else '0'}\n")
            f.write(f"frame_multiplier={'True' if enabled else 'False'}\n")
            f.write(f"flow_rate={multiplier}\n")
        # Verify write
        verify = _read_lsfg_conf()
        return verify
    except Exception as e:
        logger.error(f"LSFG conf write fail: {e}")
        return None


# ─── PROTON-GE ───────────────────────────────────────────────────

def _get_installed_proton():
    if not os.path.isdir(PROTON_GE_DIR):
        return []
    versions = []
    for d in sorted(os.listdir(PROTON_GE_DIR), reverse=True):
        fp = os.path.join(PROTON_GE_DIR, d)
        if os.path.isdir(fp):
            versions.append({"name": d})
    return versions

def _fetch_github_releases(count=20):
    """Fetch Proton-GE releases from GitHub API"""
    try:
        url = f"https://api.github.com/repos/GloriousEggroll/proton-ge-custom/releases?per_page={count}"
        req = urllib.request.Request(url, headers={"User-Agent": "JBL-Decky/1.3"})
        with urllib.request.urlopen(req, timeout=15) as resp:
            data = json.loads(resp.read().decode())
        releases = []
        for rel in data:
            tag = rel.get("tag_name", "")
            date = rel.get("published_at", "")[:10]
            notes = rel.get("body", "")[:200]
            tar_url = ""
            size_mb = 0
            for asset in rel.get("assets", []):
                if asset["name"].endswith(".tar.gz"):
                    tar_url = asset["browser_download_url"]
                    size_mb = round(asset.get("size", 0) / 1048576, 1)
                    break
            if tar_url:
                releases.append({
                    "tag": tag, "url": tar_url,
                    "size_mb": size_mb, "date": date, "notes": notes
                })
        return releases
    except Exception as e:
        logger.error(f"GitHub fetch fail: {e}")
        return []


# ═══════════════════════════════════════════════════════════════════

# PlayMode detection
import sys as _sys
_sys.path.insert(0, os.path.join(os.path.dirname(os.path.realpath(__file__)), "src", "lib"))
from playmode import PlayModeDetector, MODE_PROFILES as PlayModeProfiles, PlayMode
from user_profiles import get_merged_profile as merge_profile, set_override, set_global_override, get_all_overrides, reset_mode as reset_mode_overrides, reset_all as reset_all_overrides
_playmode = PlayModeDetector()

# PLUGIN CLASS
# ═══════════════════════════════════════════════════════════════════

class Plugin:

    # ─── POWER ────────────────────────────────────────────────────

    async def get_tdp(self):
        try:
            raw = _read(TDP_PATH)
            if raw:
                watts = int(raw) // 1000000
                return _ok(watts)
            return _err("Cannot read TDP")
        except Exception as e:
            return _err(str(e))

    async def set_tdp(self, watts: int):
        # Auto-save override for current mode
        if hasattr(self, "_current_mode") and self._current_mode:
            set_override(self._current_mode, "tdp", watts)
            logger.info(f"Override saved: {self._current_mode}.tdp = {watts}")
        try:
            micro = watts * 1000000
            _write(TDP_PATH, micro)
            # Read back to verify
            actual_raw = _read(TDP_PATH)
            actual = int(actual_raw) // 1000000 if actual_raw else 0
            verified = abs(actual - watts) <= 1
            return _ok({
                "requested": watts, "actual": actual,
                "verified": verified
            })
        except Exception as e:
            return _err(str(e))

    async def get_gpu_clock(self):
        try:
            dpm = _read(GPU_DPM_PATH)
            if dpm:
                # Find active frequency (marked with *)
                for line in dpm.split("\n"):
                    if "*" in line:
                        m = re.search(r"(\d+)Mhz", line)
                        if m:
                            return _ok(int(m.group(1)))
            return _ok(1600)
        except Exception as e:
            return _err(str(e))

    async def set_gpu_clock(self, mhz: int):
        # Auto-save override for current mode
        if hasattr(self, "_current_mode") and self._current_mode:
            set_override(self._current_mode, "gpu_clock", mhz)
            logger.info(f"Override saved: {self._current_mode}.gpu_clock = {mhz}")
        try:
            # Set manual performance level
            _write(GPU_LEVEL_PATH, "manual")
            # Write OD sclk
            _write(GPU_OD_PATH, f"s 0 {mhz}")
            _write(GPU_OD_PATH, f"s 1 {mhz}")
            _write(GPU_OD_PATH, "c")
            # Read back DPM to see active
            dpm = _read(GPU_DPM_PATH)
            actual = mhz
            if dpm:
                for line in dpm.split("\n"):
                    if "*" in line:
                        m = re.search(r"(\d+)Mhz", line)
                        if m:
                            actual = int(m.group(1))
            return _ok({"requested": mhz, "actual": actual})
        except Exception as e:
            return _err(str(e))

    async def get_power_limits(self):
        try:
            tdp_raw = _read(TDP_PATH)
            tdp = int(tdp_raw) // 1000000 if tdp_raw else 15
            dpm = _read(GPU_DPM_PATH)
            gpu = 1600
            if dpm:
                for line in dpm.split("\n"):
                    if "*" in line:
                        m = re.search(r"(\d+)Mhz", line)
                        if m:
                            gpu = int(m.group(1))
            return _ok({"tdp": tdp, "gpu": gpu})
        except Exception as e:
            return _err(str(e))

    async def apply_power_preset(self, preset: str):
        presets = {
            "silent":      {"tdp": 5,  "gpu": 400},
            "balanced":    {"tdp": 12, "gpu": 1100},
            "performance": {"tdp": 20, "gpu": 1400},
            "max":         {"tdp": 30, "gpu": 1600},
        }
        if preset not in presets:
            return _err(f"Unknown preset: {preset}")
        p = presets[preset]
        # Apply TDP
        tdp_r = json.loads(await self.set_tdp(p["tdp"]))
        # Apply GPU
        gpu_r = json.loads(await self.set_gpu_clock(p["gpu"]))
        tdp_actual = tdp_r["value"]["actual"] if tdp_r.get("ok") else p["tdp"]
        tdp_verified = tdp_r["value"]["verified"] if tdp_r.get("ok") else False
        gpu_actual = gpu_r["value"]["actual"] if gpu_r.get("ok") else p["gpu"]
        return _ok({
            "preset": preset, "tdp": p["tdp"], "gpu": p["gpu"],
            "tdp_actual": tdp_actual, "tdp_verified": tdp_verified,
            "gpu_actual": gpu_actual
        })

    # ─── LSFG ─────────────────────────────────────────────────────

    async def get_lsfg(self):
        try:
            conf = _read_lsfg_conf()
            return _ok(conf)
        except Exception as e:
            return _err(str(e))

    async def set_lsfg(self, enabled: bool, multiplier: int, flow_rate: int):
        # Auto-save override for current mode
        if hasattr(self, "_current_mode") and self._current_mode:
            set_override(self._current_mode, "lsfg_enabled", enabled)
            set_override(self._current_mode, "lsfg_multiplier", multiplier)
            set_override(self._current_mode, "lsfg_flow", flow_rate)
            logger.info(f"Override saved: {self._current_mode}.lsfg = {enabled}/{multiplier}/{flow_rate}")
        try:
            result = _write_lsfg_conf(enabled, multiplier, flow_rate)
            if result:
                return _ok({"enabled": enabled, "multiplier": multiplier,
                            "flow_rate": flow_rate, "confirmed": True})
            return _err("Failed to write LSFG config")
        except Exception as e:
            return _err(str(e))

    # ─── HEALTH ───────────────────────────────────────────────────

    async def get_health(self):
        try:
            bat_cap = _read("/sys/class/power_supply/BAT1/capacity")
            bat_status = _read("/sys/class/power_supply/BAT1/status")
            bat_health = ""
            energy_full = _read("/sys/class/power_supply/BAT1/energy_full")
            energy_design = _read("/sys/class/power_supply/BAT1/energy_full_design")
            if energy_full and energy_design:
                pct = round(int(energy_full) / int(energy_design) * 100, 1)
                bat_health = f"{pct}%"

            # CPU temp
            cpu_temp = ""
            for hwmon in glob.glob("/sys/class/hwmon/hwmon*/temp1_input"):
                raw = _read(hwmon)
                if raw:
                    t = int(raw) // 1000
                    if 20 < t < 110:
                        cpu_temp = f"{t}°C"
                        break

            # Fan
            fan = ""
            for hwmon in glob.glob("/sys/class/hwmon/hwmon*/fan1_input"):
                raw = _read(hwmon)
                if raw:
                    fan = f"{raw} RPM"
                    break

            # Estimate battery time
            power_now = _read("/sys/class/power_supply/BAT1/power_now")
            energy_now = _read("/sys/class/power_supply/BAT1/energy_now")
            est_time = ""
            if power_now and energy_now and int(power_now) > 0 and bat_status == "Discharging":
                hours = int(energy_now) / int(power_now)
                mins = int(hours * 60)
                est_time = f"{mins // 60}h {mins % 60}m"

            return _ok({
                "battery_pct": bat_cap + "%" if bat_cap else "N/A",
                "battery_status": bat_status or "Unknown",
                "battery_health": bat_health or "N/A",
                "battery_time": est_time or "N/A",
                "cpu_temp": cpu_temp or "N/A",
                "fan_rpm": fan or "N/A"
            })
        except Exception as e:
            return _err(str(e))

    # ─── PROTON ───────────────────────────────────────────────────

    async def get_proton_versions(self):
        try:
            return _ok(_get_installed_proton())
        except Exception as e:
            return _err(str(e))

    async def fetch_proton_releases(self, count: int = 20):
        try:
            releases = _fetch_github_releases(count)
            return _ok(releases)
        except Exception as e:
            return _err(str(e))

    async def install_proton(self, url: str, tag: str):
        try:
            os.makedirs(PROTON_GE_DIR, exist_ok=True)
            tar_path = f"/tmp/{tag}.tar.gz"
            logger.info(f"Downloading {url}")
            urllib.request.urlretrieve(url, tar_path)
            logger.info(f"Extracting to {PROTON_GE_DIR}")
            _run(f"tar -xzf {tar_path} -C {PROTON_GE_DIR}")
            os.remove(tar_path)
            return _ok(f"Installed {tag}")
        except Exception as e:
            return _err(str(e))

    async def remove_proton(self, name: str):
        try:
            target = os.path.join(PROTON_GE_DIR, name)
            if os.path.isdir(target):
                import shutil
                shutil.rmtree(target)
                return _ok(f"Removed {name}")
            return _err(f"Not found: {name}")
        except Exception as e:
            return _err(str(e))

    # ─── GAMES / PROFILES ────────────────────────────────────────

    async def scan_games(self):
        try:
            games = _scan_all_games()
            return _ok(games)
        except Exception as e:
            return _err(str(e))

    async def scan_proton_advisor(self):
        return await self.scan_games()

    async def list_game_profiles(self):
        try:
            profiles = _load_json(PROFILES_PATH, {})
            return _ok(list(profiles.keys()))
        except Exception as e:
            return _err(str(e))

    async def get_game_profile(self, name: str):
        try:
            profiles = _load_json(PROFILES_PATH, {})
            if name in profiles:
                return _ok(profiles[name])
            return _err(f"Profile not found: {name}")
        except Exception as e:
            return _err(str(e))

    async def save_game_profile(self, name: str, settings: str):
        try:
            profiles = _load_json(PROFILES_PATH, {})
            profiles[name] = json.loads(settings) if isinstance(settings, str) else settings
            _save_json(PROFILES_PATH, profiles)
            return _ok(f"Saved profile: {name}")
        except Exception as e:
            return _err(str(e))

    async def delete_game_profile(self, name: str):
        try:
            profiles = _load_json(PROFILES_PATH, {})
            if name in profiles:
                del profiles[name]
                _save_json(PROFILES_PATH, profiles)
                return _ok(f"Deleted: {name}")
            return _err(f"Not found: {name}")
        except Exception as e:
            return _err(str(e))

    # ─── SETTINGS ─────────────────────────────────────────────────

    async def get_settings(self):
        try:
            return _ok(_get_settings())
        except Exception as e:
            return _err(str(e))

    async def save_settings(self, settings: str):
        try:
            data = json.loads(settings) if isinstance(settings, str) else settings
            _save_json(SETTINGS_PATH, data)
            return _ok("Settings saved")
        except Exception as e:
            return _err(str(e))


    # ─── AUTO-OPTIMISE (Proton Advisor) ──────────────────────────

    async def jbl_proton_scan(self):
        """Full scan: detect games, fetch ProtonDB, generate recommendations."""
        try:
            result = await scan_and_advise()
            return _ok(result)
        except Exception as e:
            logger.error(f"Proton scan failed: {e}")
            return _err(str(e))

    async def jbl_proton_apply(self, appid: str, version: str, dry_run: bool = False):
        """Apply a single Proton override for a game."""
        logger.info(f"APPLY CALLED: appid={appid} version={version} dry_run={dry_run}")
        try:
            if dry_run:
                return _ok({
                    "dry_run": True,
                    "appid": appid,
                    "version": version,
                    "message": f"Would set {appid} to {version}"
                })
            result = apply_proton_override(appid, version)
            logger.info(f"APPLY RESULT: appid={appid} result={result}")
            if result:
                return _ok({
                    "applied": True,
                    "appid": appid,
                    "version": version
                })
            return _err(f"Failed to apply override for {appid}")
        except Exception as e:
            logger.error(f"Proton apply failed: {e}")
            return _err(str(e))

    async def jbl_proton_apply_all(self, changes: str, dry_run: bool = False):
        """Apply multiple Proton overrides at once.
        logger.info(f"APPLY_ALL CALLED: dry_run={dry_run} changes={changes[:200]}")
        changes: JSON string of [{"appid": "123", "version": "GE-Proton10-32"}, ...]
        """
        try:
            items = json.loads(changes) if isinstance(changes, str) else changes
            results = []
            for item in items:
                appid = item["appid"]
                version = item["version"]
                if dry_run:
                    results.append({
                        "appid": appid, "version": version,
                        "dry_run": True, "applied": False
                    })
                else:
                    ok = apply_proton_override(appid, version)
                    results.append({
                        "appid": appid, "version": version,
                        "applied": ok
                    })
            applied = sum(1 for r in results if r.get("applied"))
            return _ok({
                "dry_run": dry_run,
                "total": len(results),
                "applied": applied,
                "results": results
            })
        except Exception as e:
            logger.error(f"Proton apply_all failed: {e}")
            return _err(str(e))

    async def jbl_proton_overrides(self):
        """Get current Proton overrides from config.vdf."""
        try:
            overrides = get_current_proton_overrides()
            return _ok(overrides)
        except Exception as e:
            return _err(str(e))

    # ─── LIFECYCLE ────────────────────────────────────────────────


    # ─── PLAYMODE ─────────────────────────────────────────────────

    async def jbl_playmode_detect(self):
        """Auto-detect current play mode from connected displays."""
        try:
            _det = _playmode.detect()
            mode = _det["mode"]
            device = _det.get("xr_model") or _det.get("external_device")
            profile = PlayModeProfiles.get(mode)
            return json.dumps({"ok": True, "value": {
                "mode": mode,
                "device": device,
                "profile": profile,
            }})
        except Exception as e:
            logger.error(f"PlayMode detect error: {e}")
            return json.dumps({"ok": False, "error": str(e)})

    async def jbl_playmode_apply(self, mode: str = ""):
        """Apply a PlayMode profile. Empty mode = auto-detect."""
        try:
            if not mode:
                _det = _playmode.detect()
                mode = _det["mode"]
            base_profile = PlayModeProfiles.get(mode)
            if not base_profile:
                return json.dumps({"ok": False, "error": f"Unknown mode: {mode}"})
            profile = merge_profile(mode, base_profile)
            self._current_mode = mode
            logger.info(f"PlayMode merge: base={base_profile} -> merged={profile}")

            results = {}

            # ── TDP ──
            if "tdp" in profile and profile["tdp"] > 0:
                tdp_uw = profile["tdp"] * 1000000
                _write(TDP_PATH, str(tdp_uw))
                results["tdp"] = f"{profile['tdp']}W"
            elif "tdp" in profile and profile["tdp"] == 0:
                # Uncapped — write max TDP (30W for Deck OLED)
                _write(TDP_PATH, str(30 * 1000000))
                results["tdp"] = "uncapped (30W)"

            # ── GPU Clock ──
            if "gpu_clock" in profile:
                try:
                    _write(GPU_LEVEL_PATH, "manual")
                    _write(GPU_OD_PATH, f"s 0 {profile['gpu_clock']}")
                    _write(GPU_OD_PATH, f"s 1 {profile['gpu_clock']}")
                    _write(GPU_OD_PATH, "c")
                    results["gpu_clock"] = f"{profile['gpu_clock']}MHz"
                except Exception as e:
                    results["gpu_clock"] = f"error: {e}"

            # ── Refresh Rate ──
            if "refresh_rate" in profile:
                try:
                    import subprocess
                    subprocess.run(
                        ["xrandr", "--output", "eDP", "--rate", str(profile["refresh_rate"])],
                        capture_output=True, timeout=5
                    )
                    results["refresh_rate"] = f"{profile['refresh_rate']}Hz"
                except Exception as e:
                    results["refresh_rate"] = f"error: {e}"

            # ── Frame Limit (store in settings for MangoHud) ──
            if "frame_limit" in profile:
                settings = _get_settings()
                settings["fps_limit"] = profile["frame_limit"]
                _save_json(SETTINGS_PATH, settings)
                results["frame_limit"] = profile["frame_limit"]

            # ── FSR ──
            if "fsr" in profile:
                settings = _get_settings()
                settings["fsr_enabled"] = profile["fsr"]
                if "fsr_sharpness" in profile:
                    settings["fsr_sharpness"] = profile["fsr_sharpness"]
                _save_json(SETTINGS_PATH, settings)
                results["fsr"] = profile["fsr"]

            # ── LSFG ──
            if "lsfg_enabled" in profile:
                try:
                    lsfg_result = _write_lsfg_conf(
                        profile["lsfg_enabled"],
                        profile.get("lsfg_multiplier", 2),
                        profile.get("lsfg_flow", 50)
                    )
                    results["lsfg"] = {
                        "enabled": profile["lsfg_enabled"],
                        "multiplier": profile.get("lsfg_multiplier", 2),
                        "flow": profile.get("lsfg_flow", 50),
                    }
                except Exception as e:
                    results["lsfg"] = f"error: {e}"

            # ── Fan Profile ──
            if "fan_profile" in profile:
                settings = _get_settings()
                settings["fan_profile"] = profile["fan_profile"]
                _save_json(SETTINGS_PATH, settings)
                results["fan_profile"] = profile["fan_profile"]

            # ── External Resolution (XR / Docked only) ──
            if "force_resolution" in profile and profile["force_resolution"] and mode != PlayMode.HANDHELD:
                try:
                    import subprocess
                    connectors = _playmode.get_connectors()
                    for c in connectors:
                        if c["status"] == "connected" and c["name"] not in _playmode.INTERNAL_CONNECTORS:
                            res = profile["force_resolution"]
                            hz = profile.get("refresh_rate", 60)
                            subprocess.run(
                                ["xrandr", "--output", c["name"], "--mode", res, "--rate", str(hz)],
                                capture_output=True, timeout=5
                            )
                            results["output_res"] = f"{res}@{hz}Hz on {c['name']}"
                            break
                except Exception as e:
                    results["output_res"] = f"error: {e}"

            logger.info(f"PlayMode applied: {mode} -> {results}")
            return json.dumps({"ok": True, "value": {"mode": mode, "applied": results}})

        except Exception as e:
            logger.error(f"PlayMode apply error: {e}")
            return json.dumps({"ok": False, "error": str(e)})

    async def jbl_playmode_get_profiles(self):
        """Return all PlayMode profiles."""
        try:
            return json.dumps({"ok": True, "value": PlayModeProfiles})
        except Exception as e:
            return json.dumps({"ok": False, "error": str(e)})


    async def jbl_profile_get(self, mode: str):
        """Get merged profile for a mode (base + overrides)."""
        from src.lib.playmode import PlayMode, MODE_PROFILES
        mode_map = {"handheld": PlayMode.HANDHELD, "xr": PlayMode.XR, "docked": PlayMode.DOCKED}
        play_mode = mode_map.get(mode)
        if not play_mode:
            return {"status": "error", "error": f"Unknown mode: {mode}"}
        base = MODE_PROFILES.get(play_mode, {})
        merged = get_merged_profile(mode, base)
        return {"status": "ok", "mode": mode, "profile": merged}

    async def jbl_profile_set(self, mode: str, key: str, value):
        """Set a per-mode override."""
        set_override(mode, key, value)
        return {"status": "ok", "mode": mode, "key": key, "value": value}

    async def jbl_profile_set_global(self, key: str, value):
        """Set a global override."""
        set_global_override(key, value)
        return {"status": "ok", "key": key, "value": value}

    async def jbl_profile_reset(self, mode: str):
        """Reset all overrides for a mode."""
        reset_mode(mode)
        return {"status": "ok", "mode": mode}

    async def jbl_profile_reset_all(self):
        """Reset all user overrides."""
        reset_all()
        return {"status": "ok"}

    async def jbl_profile_get_overrides(self):
        """Get all user overrides."""
        return {"status": "ok", "overrides": get_all_overrides()}

    async def _main(self):
        self._current_mode = None
        """Runs on plugin load — fix ownership Decky forces to root."""
        import subprocess
        plugin_dir = os.path.dirname(os.path.realpath(__file__))
        subprocess.run(["chown", "-R", "deck:deck", plugin_dir], capture_output=True)
        logger.info("JBL: ownership fixed to deck:deck")


    async def _unload(self):
        logger.info("JBL unloaded")

