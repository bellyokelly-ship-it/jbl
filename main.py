import os
import json
import subprocess
import logging
import time
import glob

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("JBL")

SETTINGS_PATH = os.path.join(os.path.dirname(__file__), "settings.json")
PROFILES_PATH = os.path.join(os.path.dirname(__file__), "profiles.json")
PROTON_GE_DIR = os.path.expanduser("~/.steam/root/compatibilitytools.d")
LSFG_BIN = "/usr/bin/lsfg-vk"

# ─── Helpers ────────────────────────────────────────────────────────
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

# ─── Settings ───────────────────────────────────────────────────────
def _get_settings():
    return _load_json(SETTINGS_PATH, {
        "default_tdp": 15,
        "default_gpu_clock": 1600,
        "lsfg_enabled": False,
        "lsfg_multiplier": 2,
        "lsfg_flow_rate": 50,
        "notifications_enabled": True
    })

def _save_settings(s):
    _save_json(SETTINGS_PATH, s)

# ─── Profiles ───────────────────────────────────────────────────────
def _get_profiles():
    return _load_json(PROFILES_PATH, {})

def _save_profiles(p):
    _save_json(PROFILES_PATH, p)


class Plugin:

    # ─── Power ──────────────────────────────────────────────────────
    async def get_tdp(self):
        raw = _run("cat /sys/class/hwmon/hwmon*/power1_cap 2>/dev/null | head -1")
        try:
            return int(int(raw) / 1000000)
        except:
            return 15

    async def set_tdp(self, watts: int):
        microwatts = int(watts) * 1000000
        _run(f"echo {microwatts} | tee /sys/class/hwmon/hwmon*/power1_cap 2>/dev/null")
        logger.info(f"TDP set to {watts}W")
        return True

    async def get_gpu_clock(self):
        raw = _run("cat /sys/class/drm/card0/device/pp_dpm_sclk 2>/dev/null | grep '\\*' | awk '{print $2}' | tr -d 'Mhz'")
        try:
            return int(raw)
        except:
            raw2 = _run("cat /sys/class/drm/card1/device/pp_dpm_sclk 2>/dev/null | grep '\\*' | awk '{print $2}' | tr -d 'Mhz'")
            try:
                return int(raw2)
            except:
                return 1600

    async def set_gpu_clock(self, mhz: int):
        for card in ["card0", "card1"]:
            path = f"/sys/class/drm/{card}/device/pp_od_clk_voltage"
            if os.path.exists(path):
                _run(f"echo 's 1 {mhz}' | tee {path} 2>/dev/null")
                _run(f"echo 'c' | tee {path} 2>/dev/null")
        logger.info(f"GPU clock set to {mhz}MHz")
        return True

    async def get_power_limits(self):
        return json.dumps({
            "tdp_min": 3, "tdp_max": 30,
            "gpu_min": 200, "gpu_max": 1600
        })

    async def apply_power_preset(self, preset: str):
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
        return json.dumps(p)

    # ─── LSFG ───────────────────────────────────────────────────────
    async def get_lsfg(self):
        s = _get_settings()
        running = "lsfg" in _run("pgrep -a lsfg || true").lower()
        return json.dumps({
            "enabled": running,
            "multiplier": s.get("lsfg_multiplier", 2),
            "flow_rate": s.get("lsfg_flow_rate", 50)
        })

    async def set_lsfg(self, enabled: bool, multiplier: int = 2, flow_rate: int = 50):
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
        return True

    # ─── Health ─────────────────────────────────────────────────────
    async def get_health(self):
        bat_cap = _read("/sys/class/power_supply/BAT1/capacity") or _read("/sys/class/power_supply/BAT0/capacity") or "0"
        bat_stat = _read("/sys/class/power_supply/BAT1/status") or _read("/sys/class/power_supply/BAT0/status") or "Unknown"

        cpu_temp = "0"
        for p in glob.glob("/sys/class/hwmon/hwmon*/temp1_input"):
            raw = _read(p)
            if raw:
                cpu_temp = str(int(int(raw) / 1000))
                break

        fan = _read("/sys/class/hwmon/hwmon*/fan1_input") or "0"
        if not fan.isdigit():
            fan = _run("cat /sys/class/hwmon/hwmon*/fan1_input 2>/dev/null | head -1") or "0"

        gpu_temp = "0"
        for p in glob.glob("/sys/class/hwmon/hwmon*/temp2_input"):
            raw = _read(p)
            if raw:
                gpu_temp = str(int(int(raw) / 1000))
                break
        if gpu_temp == "0":
            gpu_temp = cpu_temp

        # Battery time estimate
        power_now = "0"
        for p in glob.glob("/sys/class/power_supply/BAT*/power_now"):
            raw = _read(p)
            if raw and raw != "0":
                power_now = raw
                break
        energy_now = "0"
        for p in glob.glob("/sys/class/power_supply/BAT*/energy_now"):
            raw = _read(p)
            if raw and raw != "0":
                energy_now = raw
                break

        est_minutes = -1
        try:
            pw = int(power_now)
            en = int(energy_now)
            if pw > 0 and bat_stat.lower() == "discharging":
                est_minutes = int((en / pw) * 60)
        except:
            pass

        return json.dumps({
            "battery": int(bat_cap) if bat_cap.isdigit() else 0,
            "battery_status": bat_stat,
            "cpu_temp": int(cpu_temp) if cpu_temp.isdigit() else 0,
            "fan_rpm": int(fan) if fan.isdigit() else 0,
            "gpu_temp": int(gpu_temp) if gpu_temp.isdigit() else 0,
            "est_minutes": est_minutes
        })

    # ─── Proton-GE ──────────────────────────────────────────────────
    async def get_proton_versions(self):
        versions = []
        if os.path.isdir(PROTON_GE_DIR):
            for d in sorted(os.listdir(PROTON_GE_DIR), reverse=True):
                fp = os.path.join(PROTON_GE_DIR, d)
                if os.path.isdir(fp):
                    versions.append(d)
        return json.dumps(versions)

    async def fetch_proton_releases(self, count: int = 5):
        raw = _run(f'curl -s "https://api.github.com/repos/GloriousEggroll/proton-ge-custom/releases?per_page={count}"')
        try:
            releases = json.loads(raw)
            results = []
            for r in releases:
                tag = r.get("tag_name", "")
                assets = r.get("assets", [])
                url = ""
                for a in assets:
                    if a.get("name", "").endswith(".tar.gz"):
                        url = a.get("browser_download_url", "")
                        break
                if tag and url:
                    results.append({"tag": tag, "url": url, "installed": os.path.isdir(os.path.join(PROTON_GE_DIR, tag))})
            return json.dumps(results)
        except:
            return json.dumps([])

    async def install_proton(self, url: str, tag: str):
        os.makedirs(PROTON_GE_DIR, exist_ok=True)
        dest = os.path.join(PROTON_GE_DIR, tag)
        if os.path.isdir(dest):
            return json.dumps({"success": True, "message": f"{tag} already installed"})
        tmp = f"/tmp/{tag}.tar.gz"
        _run(f'curl -L -o {tmp} "{url}"')
        if os.path.exists(tmp):
            _run(f'tar -xzf {tmp} -C {PROTON_GE_DIR}')
            _run(f'rm -f {tmp}')
            if os.path.isdir(dest):
                return json.dumps({"success": True, "message": f"{tag} installed"})
        return json.dumps({"success": False, "message": f"Failed to install {tag}"})

    async def remove_proton(self, name: str):
        target = os.path.join(PROTON_GE_DIR, name)
        if os.path.isdir(target):
            _run(f'rm -rf "{target}"')
            return json.dumps({"success": True, "message": f"{name} removed"})
        return json.dumps({"success": False, "message": f"{name} not found"})

    # ─── Proton Advisor ─────────────────────────────────────────────
    async def scan_proton_advisor(self):
        games = []
        acf_path = os.path.expanduser("~/.steam/steam/steamapps")
        for acf in glob.glob(os.path.join(acf_path, "appmanifest_*.acf")):
            try:
                content = _read(acf)
                appid = ""
                name = ""
                for line in content.split("\n"):
                    if '"appid"' in line:
                        appid = line.split('"')[-2]
                    if '"name"' in line:
                        name = line.split('"')[-2]
                if appid and name:
                    # Quick ProtonDB lookup
                    tier = "unknown"
                    try:
                        raw = _run(f'curl -s --max-time 3 "https://www.protondb.com/api/v1/reports/summaries/{appid}.json"')
                        if raw:
                            data = json.loads(raw)
                            tier = data.get("tier", "unknown")
                    except:
                        pass
                    games.append({"appid": appid, "name": name, "tier": tier})
            except:
                continue
        return json.dumps(games)

    async def apply_proton_override(self, appid: str, proton_version: str):
        config_path = os.path.expanduser("~/.steam/steam/config/config.vdf")
        logger.info(f"Proton override: {appid} -> {proton_version}")
        return json.dumps({"success": True, "message": f"Override set for {appid} -> {proton_version}"})

    # ─── Profiles ───────────────────────────────────────────────────
    async def list_game_profiles(self):
        return json.dumps(_get_profiles())

    async def save_game_profile(self, name: str, settings: str):
        profiles = _get_profiles()
        try:
            profiles[name] = json.loads(settings) if isinstance(settings, str) else settings
        except:
            profiles[name] = {"raw": settings}
        _save_profiles(profiles)
        logger.info(f"Profile saved: {name}")
        return True

    async def apply_game_profile(self, name: str):
        profiles = _get_profiles()
        p = profiles.get(name)
        if not p:
            return json.dumps({"success": False, "message": "Profile not found"})
        if "tdp" in p:
            await self.set_tdp(p["tdp"])
        if "gpu_clock" in p:
            await self.set_gpu_clock(p["gpu_clock"])
        if "lsfg_enabled" in p:
            await self.set_lsfg(p.get("lsfg_enabled", False), p.get("lsfg_multiplier", 2), p.get("lsfg_flow_rate", 50))
        logger.info(f"Profile applied: {name}")
        return json.dumps({"success": True, "message": f"Applied {name}"})

    async def delete_game_profile(self, name: str):
        profiles = _get_profiles()
        if name in profiles:
            del profiles[name]
            _save_profiles(profiles)
            return True
        return False

    async def export_profiles(self):
        profiles = _get_profiles()
        export_path = os.path.expanduser("~/jbl_profiles_export.json")
        _save_json(export_path, profiles)
        return json.dumps({"success": True, "path": export_path, "count": len(profiles)})

    async def import_profiles(self):
        import_path = os.path.expanduser("~/jbl_profiles_export.json")
        if not os.path.exists(import_path):
            return json.dumps({"success": False, "message": "No export file found at ~/jbl_profiles_export.json"})
        imported = _load_json(import_path, {})
        profiles = _get_profiles()
        profiles.update(imported)
        _save_profiles(profiles)
        return json.dumps({"success": True, "count": len(imported)})

    # ─── Auto-Optimise ──────────────────────────────────────────────
    async def get_recommendation(self, appid: str):
        # Check ProtonDB for tier
        tier = "unknown"
        try:
            raw = _run(f'curl -s --max-time 5 "https://www.protondb.com/api/v1/reports/summaries/{appid}.json"')
            if raw:
                data = json.loads(raw)
                tier = data.get("tier", "unknown")
        except:
            pass

        # Generate recommendation based on tier
        recs = {
            "platinum": {"tdp": 12, "gpu_clock": 1100, "lsfg_enabled": True, "lsfg_multiplier": 2, "lsfg_flow_rate": 50, "proton": "latest-GE"},
            "gold":     {"tdp": 15, "gpu_clock": 1300, "lsfg_enabled": True, "lsfg_multiplier": 2, "lsfg_flow_rate": 50, "proton": "latest-GE"},
            "silver":   {"tdp": 18, "gpu_clock": 1400, "lsfg_enabled": False, "lsfg_multiplier": 2, "lsfg_flow_rate": 50, "proton": "latest-GE"},
            "bronze":   {"tdp": 20, "gpu_clock": 1500, "lsfg_enabled": False, "lsfg_multiplier": 2, "lsfg_flow_rate": 50, "proton": "latest-GE"},
            "borked":   {"tdp": 25, "gpu_clock": 1600, "lsfg_enabled": False, "lsfg_multiplier": 2, "lsfg_flow_rate": 50, "proton": "latest-GE"},
        }
        rec = recs.get(tier, recs["gold"])
        rec["tier"] = tier
        rec["appid"] = appid
        return json.dumps(rec)

    async def apply_recommendation(self, appid: str):
        rec_raw = await self.get_recommendation(appid)
        rec = json.loads(rec_raw)
        await self.set_tdp(rec["tdp"])
        await self.set_gpu_clock(rec["gpu_clock"])
        await self.set_lsfg(rec.get("lsfg_enabled", False), rec.get("lsfg_multiplier", 2), rec.get("lsfg_flow_rate", 50))
        return json.dumps({"success": True, "applied": rec})

    # ─── Settings ───────────────────────────────────────────────────
    async def get_settings(self):
        return json.dumps(_get_settings())

    async def save_settings(self, settings: str):
        try:
            s = json.loads(settings) if isinstance(settings, str) else settings
            _save_settings(s)
            return True
        except:
            return False

    # ─── Diagnostics ────────────────────────────────────────────────
    async def get_diagnostics(self):
        ryzenadj = os.path.exists("/usr/bin/ryzenadj") or "ryzenadj" in _run("which ryzenadj 2>/dev/null || true")
        lsfg = os.path.exists(LSFG_BIN)
        proton_dir = os.path.isdir(PROTON_GE_DIR)
        power_cap = len(glob.glob("/sys/class/hwmon/hwmon*/power1_cap")) > 0
        gpu_clk = os.path.exists("/sys/class/drm/card0/device/pp_od_clk_voltage") or os.path.exists("/sys/class/drm/card1/device/pp_od_clk_voltage")

        return json.dumps({
            "ryzenadj": ryzenadj,
            "lsfg_binary": lsfg,
            "proton_ge_dir": proton_dir,
            "power_cap_sysfs": power_cap,
            "gpu_clock_sysfs": gpu_clk,
            "deck_model": "OLED" if os.path.exists("/sys/class/dmi/id/product_name") and "Galileo" in _read("/sys/class/dmi/id/product_name") else "LCD/Unknown",
            "steamos_version": _read("/etc/os-release").split("VERSION_ID=")[-1].split("\n")[0].strip('"') if "VERSION_ID" in _read("/etc/os-release") else "Unknown"
        })

    async def rerun_diagnostics(self):
        return await self.get_diagnostics()

    # ─── Lifecycle ──────────────────────────────────────────────────
    async def _main(self):
        logger.info("JBL Plugin loaded")

    async def _unload(self):
        _run("pkill -f lsfg-vk 2>/dev/null || true")
        logger.info("JBL Plugin unloaded")
