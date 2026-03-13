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
LSFG_BIN = "/usr/bin/lsfg-vk"

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


class Plugin:

    # ─── Power ──────────────────────────────────────────────────
    async def get_tdp(self):
        try:
            raw = _run("cat /sys/class/hwmon/hwmon*/power1_cap 2>/dev/null | head -1")
            watts = int(int(raw) / 1000000) if raw else 15
            return _ok(watts)
        except Exception as e:
            return _err(e)

    async def set_tdp(self, watts: int):
        try:
            microwatts = int(watts) * 1000000
            _run(f"echo {microwatts} | tee /sys/class/hwmon/hwmon*/power1_cap 2>/dev/null")
            logger.info(f"TDP set to {watts}W")
            return _ok(watts)
        except Exception as e:
            return _err(e)

    async def get_gpu_clock(self):
        try:
            for card in ["card0", "card1"]:
                raw = _run(f"cat /sys/class/drm/{card}/device/pp_dpm_sclk 2>/dev/null | grep '\\*' | awk '{{print $2}}' | tr -d 'Mhz'")
                if raw and raw.isdigit():
                    return _ok(int(raw))
            return _ok(1600)
        except Exception as e:
            return _err(e)

    async def set_gpu_clock(self, mhz: int):
        try:
            for card in ["card0", "card1"]:
                path = f"/sys/class/drm/{card}/device/pp_od_clk_voltage"
                if os.path.exists(path):
                    _run(f"echo 's 1 {mhz}' | tee {path} 2>/dev/null")
                    _run(f"echo 'c' | tee {path} 2>/dev/null")
            logger.info(f"GPU clock set to {mhz}MHz")
            return _ok(mhz)
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
            await self.set_tdp(p["tdp"])
            await self.set_gpu_clock(p["gpu"])
            logger.info(f"Applied preset: {preset}")
            return _ok(p)
        except Exception as e:
            return _err(e)

    # ─── LSFG ───────────────────────────────────────────────────
    async def get_lsfg(self):
        try:
            s = _get_settings()
            running = "lsfg" in _run("pgrep -a lsfg || true").lower()
            return _ok({
                "enabled": running,
                "multiplier": s.get("lsfg_multiplier", 2),
                "flow_rate": s.get("lsfg_flow_rate", 50)
            })
        except Exception as e:
            return _err(e)

    async def set_lsfg(self, enabled: bool, multiplier: int = 2, flow_rate: int = 50):
        try:
            s = _get_settings()
            s["lsfg_enabled"] = enabled
            s["lsfg_multiplier"] = multiplier
            s["lsfg_flow_rate"] = flow_rate
            _save_settings(s)
            _run("pkill -f lsfg-vk 2>/dev/null || true")
            if enabled and os.path.exists(LSFG_BIN):
                _run(f"nohup {LSFG_BIN} --multiplier {multiplier} --flow-rate {flow_rate} &>/dev/null &")
                logger.info(f"LSFG started: {multiplier}x @ {flow_rate}%")
            else:
                logger.info("LSFG stopped")
            return _ok({"enabled": enabled, "multiplier": multiplier, "flow_rate": flow_rate})
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
                if raw:
                    cpu_temp = int(int(raw) / 1000)
                    break

            gpu_temp = 0
            for p in glob.glob("/sys/class/hwmon/hwmon*/temp2_input"):
                raw = _read(p)
                if raw:
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

            return _ok({
                "cpu_temp": cpu_temp,
                "gpu_temp": gpu_temp,
                "fan_rpm": fan,
                "battery_pct": int(bat_cap) if bat_cap.isdigit() else 0,
                "battery_health": bat_health,
                "battery_time": bat_time
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

    async def fetch_proton_releases(self, count: int = 5):
        try:
            raw = _run(f'curl -s "https://api.github.com/repos/GloriousEggroll/proton-ge-custom/releases?per_page={count}"')
            releases = json.loads(raw)
            results = []
            for r in releases:
                tag = r.get("tag_name", "")
                url = ""
                for a in r.get("assets", []):
                    if a.get("name", "").endswith(".tar.gz"):
                        url = a.get("browser_download_url", "")
                        break
                if tag and url:
                    results.append({"tag": tag, "url": url})
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

    # ─── Profiles ───────────────────────────────────────────────
    async def list_game_profiles(self):
        try:
            profiles = _get_profiles()
            return _ok(list(profiles.keys()))
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

    # ─── Proton Advisor / Auto ──────────────────────────────────
    async def scan_proton_advisor(self):
        try:
            games = []
            acf_path = os.path.expanduser("~/.steam/steam/steamapps")
            for acf in glob.glob(os.path.join(acf_path, "appmanifest_*.acf")):
                content = _read(acf)
                appid = name = ""
                for line in content.split("\n"):
                    if '"appid"' in line:
                        appid = line.split('"')[-2]
                    if '"name"' in line:
                        name = line.split('"')[-2]
                if appid and name:
                    games.append(f"{name} ({appid})")
            return _ok(games)
        except Exception as e:
            return _err(e)

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
        _run("pkill -f lsfg-vk 2>/dev/null || true")
        logger.info("JBL unloading — resetting GPU to auto")
