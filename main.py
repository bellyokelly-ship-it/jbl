import os
import json
import subprocess
import logging
import glob

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("JBL")

SETTINGS_PATH = os.path.join(os.path.dirname(__file__), "settings.json")
PROFILES_PATH = os.path.join(os.path.dirname(__file__), "profiles.json")
PROTON_GE_DIR = os.path.expanduser("~/.steam/root/compatibilitytools.d")
LSFG_CONF = os.path.expanduser("~/.config/lsfg-vk/lsfg_vk.conf")
STEAMAPPS_PATHS = [
    os.path.expanduser("~/.local/share/Steam/steamapps"),
    os.path.expanduser("~/.steam/steam/steamapps"),
    os.path.expanduser("~/.steam/root/steamapps"),
]

def _ok(value=None):
    return json.dumps({"ok": True, "value": value})

def _err(msg):
    return json.dumps({"ok": False, "error": str(msg)})

def _run(cmd):
    try:
        r = subprocess.run(cmd, shell=True, capture_output=True, text=True, timeout=10)
        return r.stdout.strip()
    except Exception as e:
        logger.error(f"Command failed: {cmd} -> {e}")
        return ""

def _read(path):
    try:
        with open(path, "r") as f:
            return f.read().strip()
    except:
        return ""

def _load_json(path, default):
    try:
        with open(path, "r") as f:
            return json.load(f)
    except:
        return default

def _save_json(path, data):
    with open(path, "w") as f:
        json.dump(data, f, indent=2)

def _get_settings():
    return _load_json(SETTINGS_PATH, {
        "default_tdp": 15, "default_gpu_clock": 1600,
        "lsfg_enabled": False, "lsfg_multiplier": 2, "lsfg_flow_rate": 50,
        "notifications_enabled": True, "auto_optimise": False
    })

def _save_settings(s):
    _save_json(SETTINGS_PATH, s)

def _get_profiles():
    return _load_json(PROFILES_PATH, {})

def _save_profiles(p):
    _save_json(PROFILES_PATH, p)

def _read_lsfg_conf():
    """Read the LSFG-VK config file"""
    conf = {"enabled": False, "multiplier": 2, "flow_rate": 50}
    try:
        if os.path.exists(LSFG_CONF):
            for line in _read(LSFG_CONF).split("\n"):
                line = line.strip()
                if "=" not in line or line.startswith("#"):
                    continue
                k, v = line.split("=", 1)
                k, v = k.strip(), v.strip()
                if k == "enabled":
                    conf["enabled"] = v == "1" or v.lower() == "true"
                elif k == "multiplier":
                    conf["multiplier"] = int(v)
                elif k == "flow_scale":
                    conf["flow_rate"] = int(float(v) * 100)
                elif k == "flow_rate":
                    pass  # we use flow_scale as the real value
    except Exception as e:
        logger.error(f"Error reading LSFG conf: {e}")
    return conf

def _write_lsfg_conf(enabled, multiplier, flow_rate):
    """Write the LSFG-VK config file"""
    try:
        os.makedirs(os.path.dirname(LSFG_CONF), exist_ok=True)
        flow_scale = round(flow_rate / 100.0, 2)
        with open(LSFG_CONF, "w") as f:
            f.write(f"multiplier={multiplier}\n")
            f.write(f"flow_scale={flow_scale:.2f}\n")
            f.write(f"enabled={'1' if enabled else '0'}\n")
            f.write(f"frame_multiplier={'True' if enabled else 'False'}\n")
            f.write(f"flow_rate={multiplier}\n")
        logger.info(f"LSFG conf written: enabled={enabled}, mul={multiplier}, flow={flow_rate}%")
        return True
    except Exception as e:
        logger.error(f"Error writing LSFG conf: {e}")
        return False

def _read_tdp():
    """Read back actual TDP from sysfs"""
    try:
        raw = _run("cat /sys/class/hwmon/hwmon*/power1_cap 2>/dev/null | head -1")
        if raw and raw.isdigit():
            return int(int(raw) / 1000000)
    except:
        pass
    return -1

def _read_gpu_clock():
    """Read back actual GPU clock from sysfs"""
    try:
        for card in ["card0", "card1"]:
            raw = _run(f"cat /sys/class/drm/{card}/device/pp_dpm_sclk 2>/dev/null")
            if raw:
                for line in raw.split("\n"):
                    if "*" in line:
                        parts = line.split()
                        if len(parts) >= 2:
                            mhz = parts[1].replace("Mhz", "").replace("MHz", "")
                            if mhz.isdigit():
                                return int(mhz)
    except:
        pass
    return -1

def _scan_all_games():
    """Scan all steamapps paths for installed games"""
    games = []
    seen = set()
    for base in STEAMAPPS_PATHS:
        if not os.path.isdir(base):
            continue
        for acf in glob.glob(os.path.join(base, "appmanifest_*.acf")):
            try:
                content = _read(acf)
                appid = name = ""
                for line in content.split("\n"):
                    stripped = line.strip()
                    if '"appid"' in stripped:
                        appid = stripped.split('"')[-2]
                    elif '"name"' in stripped:
                        name = stripped.split('"')[-2]
                if appid and name and appid not in seen:
                    seen.add(appid)
                    games.append({"appid": appid, "name": name})
            except:
                continue
    games.sort(key=lambda g: g["name"].lower())
    return games


class Plugin:

    # ─── Power ──────────────────────────────────────────────────
    async def get_tdp(self):
        try:
            watts = _read_tdp()
            if watts < 0:
                return _err("Cannot read TDP")
            return _ok(watts)
        except Exception as e:
            return _err(e)

    async def set_tdp(self, watts: int):
        try:
            microwatts = int(watts) * 1000000
            _run(f"echo {microwatts} | tee /sys/class/hwmon/hwmon*/power1_cap 2>/dev/null")
            # Read back to validate
            actual = _read_tdp()
            if actual == int(watts):
                logger.info(f"TDP set to {watts}W ✓ (verified)")
                return _ok({"requested": int(watts), "actual": actual, "verified": True})
            else:
                logger.warning(f"TDP set requested {watts}W but read back {actual}W")
                return _ok({"requested": int(watts), "actual": actual, "verified": False})
        except Exception as e:
            return _err(e)

    async def get_gpu_clock(self):
        try:
            mhz = _read_gpu_clock()
            if mhz < 0:
                return _ok(1600)
            return _ok(mhz)
        except Exception as e:
            return _err(e)

    async def set_gpu_clock(self, mhz: int):
        try:
            for card in ["card0", "card1"]:
                path = f"/sys/class/drm/{card}/device/pp_od_clk_voltage"
                if os.path.exists(path):
                    _run(f"echo 's 1 {mhz}' | tee {path} 2>/dev/null")
                    _run(f"echo 'c' | tee {path} 2>/dev/null")
            actual = _read_gpu_clock()
            logger.info(f"GPU clock set to {mhz}MHz, current active: {actual}MHz")
            return _ok({"requested": int(mhz), "actual": actual})
        except Exception as e:
            return _err(e)

    async def get_power_limits(self):
        return _ok({"tdp_min": 3, "tdp_max": 30, "gpu_min": 200, "gpu_max": 1600})

    async def apply_power_preset(self, preset: str):
        try:
            presets = {
                "silent":      {"tdp": 5,  "gpu": 400},
                "balanced":    {"tdp": 12, "gpu": 1100},
                "performance": {"tdp": 20, "gpu": 1400},
                "max":         {"tdp": 30, "gpu": 1600},
            }
            p = presets.get(preset.lower(), presets["balanced"])
            tdp_result = await self.set_tdp(p["tdp"])
            gpu_result = await self.set_gpu_clock(p["gpu"])
            tdp_data = json.loads(tdp_result)
            gpu_data = json.loads(gpu_result)
            return _ok({
                "preset": preset,
                "tdp": p["tdp"],
                "gpu": p["gpu"],
                "tdp_verified": tdp_data.get("value", {}).get("verified", False) if tdp_data.get("ok") else False,
                "tdp_actual": tdp_data.get("value", {}).get("actual", p["tdp"]) if tdp_data.get("ok") else p["tdp"],
                "gpu_actual": gpu_data.get("value", {}).get("actual", p["gpu"]) if gpu_data.get("ok") else p["gpu"],
            })
        except Exception as e:
            return _err(e)

    # ─── LSFG ───────────────────────────────────────────────────
    async def get_lsfg(self):
        try:
            conf = _read_lsfg_conf()
            return _ok(conf)
        except Exception as e:
            return _err(e)

    async def set_lsfg(self, enabled: bool, multiplier: int = 2, flow_rate: int = 50):
        try:
            s = _get_settings()
            s["lsfg_enabled"] = enabled
            s["lsfg_multiplier"] = multiplier
            s["lsfg_flow_rate"] = flow_rate
            _save_settings(s)
            success = _write_lsfg_conf(enabled, multiplier, flow_rate)
            if success:
                # Read back to confirm
                readback = _read_lsfg_conf()
                return _ok({
                    "enabled": enabled,
                    "multiplier": multiplier,
                    "flow_rate": flow_rate,
                    "confirmed": readback["enabled"] == enabled and readback["multiplier"] == multiplier
                })
            return _err("Failed to write LSFG config")
        except Exception as e:
            return _err(e)

    # ─── Health ─────────────────────────────────────────────────
    async def get_health(self):
        try:
            bat_cap = _read("/sys/class/power_supply/BAT1/capacity") or _read("/sys/class/power_supply/BAT0/capacity") or "0"
            bat_stat = _read("/sys/class/power_supply/BAT1/status") or _read("/sys/class/power_supply/BAT0/status") or "Unknown"

            cpu_temp = 0
            for p in glob.glob("/sys/class/hwmon/hwmon*/temp1_input"):
                raw = _read(p)
                if raw and raw.isdigit():
                    cpu_temp = int(int(raw) / 1000)
                    break

            gpu_temp = 0
            for p in glob.glob("/sys/class/hwmon/hwmon*/temp2_input"):
                raw = _read(p)
                if raw and raw.isdigit():
                    gpu_temp = int(int(raw) / 1000)
                    break
            if gpu_temp == 0:
                gpu_temp = cpu_temp

            fan = 0
            for p in glob.glob("/sys/class/hwmon/hwmon*/fan1_input"):
                raw = _read(p)
                if raw and raw.isdigit():
                    fan = int(raw)
                    break

            power_now = 0
            for p in glob.glob("/sys/class/power_supply/BAT*/power_now"):
                raw = _read(p)
                if raw and raw.isdigit() and int(raw) > 0:
                    power_now = int(raw)
                    break

            energy_now = 0
            for p in glob.glob("/sys/class/power_supply/BAT*/energy_now"):
                raw = _read(p)
                if raw and raw.isdigit() and int(raw) > 0:
                    energy_now = int(raw)
                    break

            bat_time = "N/A"
            if power_now > 0 and bat_stat.lower() == "discharging":
                mins = int((energy_now / power_now) * 60)
                bat_time = f"{mins // 60}h {mins % 60}m"

            bat_health = "Good"
            energy_full = 0
            energy_full_design = 0
            for p in glob.glob("/sys/class/power_supply/BAT*/energy_full"):
                raw = _read(p)
                if raw and raw.isdigit():
                    energy_full = int(raw)
                    break
            for p in glob.glob("/sys/class/power_supply/BAT*/energy_full_design"):
                raw = _read(p)
                if raw and raw.isdigit():
                    energy_full_design = int(raw)
                    break
            if energy_full_design > 0:
                health_pct = int((energy_full / energy_full_design) * 100)
                bat_health = f"{health_pct}%"

            # Also include current TDP for cross-reference
            current_tdp = _read_tdp()
            current_gpu = _read_gpu_clock()

            return _ok({
                "cpu_temp": cpu_temp,
                "gpu_temp": gpu_temp,
                "fan_rpm": fan,
                "battery_pct": int(bat_cap) if bat_cap.isdigit() else 0,
                "battery_health": bat_health,
                "battery_time": bat_time,
                "current_tdp": current_tdp,
                "current_gpu": current_gpu
            })
        except Exception as e:
            return _err(e)

    # ─── Proton-GE ──────────────────────────────────────────────
    async def get_proton_versions(self):
        try:
            versions = []
            if os.path.isdir(PROTON_GE_DIR):
                for d in sorted(os.listdir(PROTON_GE_DIR), reverse=True):
                    if os.path.isdir(os.path.join(PROTON_GE_DIR, d)):
                        versions.append({"name": d})
            return _ok(versions)
        except Exception as e:
            return _err(e)

    async def fetch_proton_releases(self, count: int = 20):
        try:
            raw = _run(f'curl -s "https://api.github.com/repos/GloriousEggroll/proton-ge-custom/releases?per_page={count}"')
            releases = json.loads(raw)
            results = []
            for r in releases:
                tag = r.get("tag_name", "")
                url = ""
                size = 0
                for a in r.get("assets", []):
                    if a.get("name", "").endswith(".tar.gz"):
                        url = a.get("browser_download_url", "")
                        size = a.get("size", 0)
                        break
                if tag and url:
                    results.append({
                        "tag": tag,
                        "url": url,
                        "size_mb": round(size / 1048576) if size else 0,
                        "date": r.get("published_at", "")[:10],
                        "notes": r.get("body", "")[:200]
                    })
            return _ok(results)
        except Exception as e:
            return _err(e)

    async def install_proton(self, url: str, tag: str):
        try:
            os.makedirs(PROTON_GE_DIR, exist_ok=True)
            dest = os.path.join(PROTON_GE_DIR, tag)
            if os.path.isdir(dest):
                return _ok(f"{tag} already installed")
            tmp = f"/tmp/{tag}.tar.gz"
            _run(f'curl -L -o {tmp} "{url}"')
            if os.path.exists(tmp):
                _run(f'tar -xzf {tmp} -C {PROTON_GE_DIR}')
                _run(f'rm -f {tmp}')
                if os.path.isdir(dest):
                    return _ok(f"{tag} installed")
            return _err(f"Failed to install {tag}")
        except Exception as e:
            return _err(e)

    async def remove_proton(self, name: str):
        try:
            target = os.path.join(PROTON_GE_DIR, name)
            if os.path.isdir(target):
                _run(f'rm -rf "{target}"')
                return _ok(f"{name} removed")
            return _err(f"{name} not found")
        except Exception as e:
            return _err(e)

    # ─── Game Scan (for Profiles + Auto) ────────────────────────
    async def scan_games(self):
        try:
            games = _scan_all_games()
            logger.info(f"Scanned {len(games)} installed games")
            return _ok(games)
        except Exception as e:
            return _err(e)

    # ─── Profiles ───────────────────────────────────────────────
    async def list_game_profiles(self):
        try:
            profiles = _get_profiles()
            return _ok(list(profiles.keys()))
        except Exception as e:
            return _err(e)

    async def get_game_profile(self, name: str):
        try:
            profiles = _get_profiles()
            if name in profiles:
                return _ok(profiles[name])
            return _err(f"Profile '{name}' not found")
        except Exception as e:
            return _err(e)

    async def save_game_profile(self, name: str, settings: str):
        try:
            profiles = _get_profiles()
            profiles[name] = json.loads(settings) if isinstance(settings, str) else settings
            _save_profiles(profiles)
            logger.info(f"Profile saved: {name}")
            return _ok(name)
        except Exception as e:
            return _err(e)

    async def delete_game_profile(self, name: str):
        try:
            profiles = _get_profiles()
            if name in profiles:
                del profiles[name]
                _save_profiles(profiles)
                return _ok(name)
            return _err(f"{name} not found")
        except Exception as e:
            return _err(e)

    # Keep legacy method for backward compat
    async def scan_proton_advisor(self):
        return await self.scan_games()

    # ─── Settings ───────────────────────────────────────────────
    async def get_settings(self):
        try:
            return _ok(_get_settings())
        except Exception as e:
            return _err(e)

    async def save_settings(self, settings: str):
        try:
            s = json.loads(settings) if isinstance(settings, str) else settings
            _save_settings(s)
            return _ok(True)
        except Exception as e:
            return _err(e)

    # ─── Lifecycle ──────────────────────────────────────────────
    async def _main(self):
        logger.info("JBL Plugin loaded")

    async def _unload(self):
        logger.info("JBL unloading")
