import os
import glob
import sys
import json
import asyncio
import subprocess
import logging
import time
import urllib.request
import shutil
from pathlib import Path

sys_path_addon = str(Path(os.path.expanduser('~')) / 'homebrew' / 'plugins' / 'jbl' / 'py_modules')
if sys_path_addon not in sys.path:
    sys.path.insert(0, sys_path_addon)

LOG_DIR = Path('/tmp/jbl')
LOG_DIR.mkdir(parents=True, exist_ok=True)

logging.basicConfig(
    filename=str(LOG_DIR / 'jbl.log'),
    level=logging.INFO,
    format='%(asctime)s [%(levelname)s] %(message)s'
)
logger = logging.getLogger('JBL')

HOME = Path(os.path.expanduser('~'))
DECKY_PLUGIN_DIR = HOME / 'homebrew' / 'plugins' / 'jbl'
SETTINGS_PATH = DECKY_PLUGIN_DIR / 'settings.json'
PROTON_GE_DIR = HOME / '.steam' / 'root' / 'compatibilitytools.d'
PROTON_GE_API = 'https://api.github.com/repos/GloriousEggroll/proton-ge-custom/releases'

TDP_MIN = 3
TDP_MAX = 15
TDP_DEFAULT = 12
GPU_CLOCK_MIN = 200
GPU_CLOCK_MAX = 1600
GPU_CLOCK_DEFAULT = 1200
LSFG_DEFAULT_MULTIPLIER = 2
LSFG_DEFAULT_FLOW_RATE = 50

THERMAL_PATHS = {
    'cpu_temp': '/sys/class/thermal/thermal_zone0/temp',
    'gpu_temp': '/sys/class/hwmon/hwmon6/temp1_input',
    'fan_speed': '/sys/class/hwmon/hwmon5/fan1_input',
    'battery_capacity': '/sys/class/power_supply/BAT1/capacity',
    'battery_status': '/sys/class/power_supply/BAT1/status',
    'battery_power_now': '/sys/class/power_supply/BAT1/power_now',
}


class SettingsManager:
    DEFAULT_SETTINGS = {
        'version': '1.0.0',
        'global': {
            'tdp': TDP_DEFAULT,
            'gpu_clock': GPU_CLOCK_DEFAULT,
            'lsfg_enabled': True,
            'lsfg_multiplier': LSFG_DEFAULT_MULTIPLIER,
            'lsfg_flow_rate': LSFG_DEFAULT_FLOW_RATE,
            'proton_ge_default': None,
            'auto_update_proton': True,
            'auto_fetch_settings': True,
        },
        'profiles': {},
        'automation': {
            'auto_switch_profiles': True,
            'auto_proton_updates': True,
            'settings_fetch_interval_hours': 24,
            'last_settings_fetch': 0,
        }
    }

    def __init__(self):
        self.settings = self._load()

    def _load(self):
        try:
            if SETTINGS_PATH.exists():
                with open(SETTINGS_PATH, 'r') as f:
                    data = json.load(f)
                logger.info('Settings loaded successfully.')
                return self._deep_merge(self.DEFAULT_SETTINGS.copy(), data)
            else:
                logger.info('No settings found, using defaults.')
                return self.DEFAULT_SETTINGS.copy()
        except Exception as e:
            logger.error(f'Failed to load settings: {e}')
            return self.DEFAULT_SETTINGS.copy()

    def _deep_merge(self, base, override):
        for key, value in base.items():
            if key in override:
                if isinstance(value, dict) and isinstance(override[key], dict):
                    base[key] = self._deep_merge(value, override[key])
                else:
                    base[key] = override[key]
        for key in override:
            if key not in base:
                base[key] = override[key]
        return base

    def save(self):
        try:
            DECKY_PLUGIN_DIR.mkdir(parents=True, exist_ok=True)
            with open(SETTINGS_PATH, 'w') as f:
                json.dump(self.settings, f, indent=2)
            logger.info('Settings saved.')
        except Exception as e:
            logger.error(f'Failed to save settings: {e}')

    def get_global(self, key, default=None):
        return self.settings.get('global', {}).get(key, default)

    def set_global(self, key, value):
        self.settings.setdefault('global', {})[key] = value
        self.save()

    def get_profile(self, game_id):
        return self.settings.get('profiles', {}).get(game_id, {})

    def set_profile(self, game_id, profile):
        self.settings.setdefault('profiles', {})[game_id] = profile
        self.save()

    def delete_profile(self, game_id):
        if game_id in self.settings.get('profiles', {}):
            del self.settings['profiles'][game_id]
            self.save()

    def list_profiles(self):
        return self.settings.get('profiles', {})

    def get_automation(self, key, default=None):
        return self.settings.get('automation', {}).get(key, default)

    def set_automation(self, key, value):
        self.settings.setdefault('automation', {})[key] = value
        self.save()


class PowerShift:
    _tdp_hwmon = None
    _dpm_path = '/sys/class/drm/card0/device/power_dpm_force_performance_level'
    _od_path = '/sys/class/drm/card0/device/pp_od_clk_voltage'
    _sclk_path = '/sys/class/drm/card0/device/pp_dpm_sclk'

    @staticmethod
    def _find_tdp_hwmon():
        if PowerShift._tdp_hwmon:
            return PowerShift._tdp_hwmon
        for h in sorted(glob.glob('/sys/class/hwmon/hwmon*')):
            name_path = os.path.join(h, 'name')
            if os.path.exists(name_path):
                with open(name_path) as f:
                    if f.read().strip() == 'amdgpu':
                        if os.path.exists(os.path.join(h, 'power1_cap')):
                            PowerShift._tdp_hwmon = h
                            logger.info(f'Auto-detected TDP hwmon: {h}')
                            return h
        for p in sorted(glob.glob('/sys/class/hwmon/hwmon*/power1_cap')):
            PowerShift._tdp_hwmon = os.path.dirname(p)
            logger.info(f'Fallback TDP hwmon: {PowerShift._tdp_hwmon}')
            return PowerShift._tdp_hwmon
        return None

    @staticmethod
    def set_tdp(watts):
        watts = max(TDP_MIN, min(TDP_MAX, watts))
        try:
            hwmon = PowerShift._find_tdp_hwmon()
            if not hwmon:
                return {'success': False, 'error': 'No TDP hwmon found'}
            power_uw = watts * 1000000
            for cap in ['power1_cap', 'power2_cap']:
                p = os.path.join(hwmon, cap)
                if os.path.exists(p):
                    with open(p, 'w') as f:
                        f.write(str(power_uw))
            logger.info(f'TDP set to {watts}W via {hwmon}')
            return {'success': True, 'tdp': watts}
        except PermissionError:
            logger.error('TDP set failed: Permission denied.')
            return {'success': False, 'error': 'Permission denied - root required'}
        except Exception as e:
            logger.error(f'TDP set failed: {e}')
            return {'success': False, 'error': str(e)}

    @staticmethod
    def get_tdp():
        try:
            hwmon = PowerShift._find_tdp_hwmon()
            if not hwmon:
                return {'success': False, 'error': 'No TDP hwmon found'}
            p = os.path.join(hwmon, 'power1_cap')
            if os.path.exists(p):
                with open(p, 'r') as f:
                    power_uw = int(f.read().strip())
                return {'success': True, 'tdp': power_uw // 1000000}
            return {'success': False, 'error': 'power1_cap not found'}
        except Exception as e:
            return {'success': False, 'error': str(e)}

    @staticmethod
    def _set_dpm_manual():
        try:
            with open(PowerShift._dpm_path, 'w') as f:
                f.write('manual')
            return True
        except Exception as e:
            logger.error(f'Failed to set DPM manual: {e}')
            return False

    @staticmethod
    def _set_dpm_auto():
        try:
            with open(PowerShift._dpm_path, 'w') as f:
                f.write('auto')
        except Exception as e:
            logger.error(f'Failed to reset DPM auto: {e}')

    @staticmethod
    def set_gpu_clock(mhz):
        mhz = max(GPU_CLOCK_MIN, min(GPU_CLOCK_MAX, mhz))
        try:
            if not PowerShift._set_dpm_manual():
                return {'success': False, 'error': 'Cannot set DPM to manual'}
            pp = PowerShift._od_path
            if os.path.exists(pp):
                with open(pp, 'w') as f:
                    f.write(f's 1 {mhz}\n')
                with open(pp, 'w') as f:
                    f.write('c\n')
                logger.info(f'GPU max clock set to {mhz}MHz (DPM manual, OD s 1)')
                return {'success': True, 'gpu_clock': mhz}
            else:
                PowerShift._set_dpm_auto()
                return {'success': False, 'error': 'pp_od_clk_voltage not found'}
        except PermissionError:
            logger.error('GPU clock set failed: Permission denied.')
            PowerShift._set_dpm_auto()
            return {'success': False, 'error': 'Permission denied - root required'}
        except Exception as e:
            logger.error(f'GPU clock set failed: {e}')
            PowerShift._set_dpm_auto()
            return {'success': False, 'error': str(e)}

    @staticmethod
    def reset_gpu_clock():
        try:
            PowerShift._set_dpm_auto()
            logger.info('GPU clock reset to auto (DPM auto)')
            return {'success': True, 'gpu_clock': 'auto'}
        except Exception as e:
            return {'success': False, 'error': str(e)}

    @staticmethod
    def get_gpu_clock():
        try:
            path = PowerShift._sclk_path
            if os.path.exists(path):
                with open(path, 'r') as f:
                    lines = f.readlines()
                for line in lines:
                    if '*' in line:
                        mhz = int(line.split(':')[1].strip().replace('Mhz', '').replace('*', '').strip())
                        return {'success': True, 'gpu_clock': mhz}
            return {'success': False, 'error': 'Could not read GPU clock'}
        except Exception as e:
            return {'success': False, 'error': str(e)}

    @staticmethod
    def apply_profile(profile):
        results = {}
        if 'tdp' in profile:
            results['tdp'] = PowerShift.set_tdp(profile['tdp'])
        if 'gpu_clock' in profile:
            results['gpu_clock'] = PowerShift.set_gpu_clock(profile['gpu_clock'])
        return results


class LSFGManager:
    @staticmethod
    def get_launch_options(multiplier=LSFG_DEFAULT_MULTIPLIER, flow_rate=LSFG_DEFAULT_FLOW_RATE, enabled=True):
        if not enabled:
            return ''
        return f'ENABLE_LSFG=1 LSFG_MULTIPLIER={multiplier} LSFG_FLOW_RATE={flow_rate} %command%'

    @staticmethod
    def get_env_dict(multiplier=LSFG_DEFAULT_MULTIPLIER, flow_rate=LSFG_DEFAULT_FLOW_RATE, enabled=True):
        if not enabled:
            return {}
        return {
            'ENABLE_LSFG': '1',
            'LSFG_MULTIPLIER': str(multiplier),
            'LSFG_FLOW_RATE': str(flow_rate),
        }

    @staticmethod
    def validate_settings(multiplier, flow_rate):
        errors = []
        if multiplier < 1 or multiplier > 4:
            errors.append(f'Multiplier {multiplier} out of range (1-4)')
        if flow_rate < 10 or flow_rate > 100:
            errors.append(f'Flow rate {flow_rate} out of range (10-100)')
        return {'valid': len(errors) == 0, 'errors': errors}


class ProtonGEManager:
    @staticmethod
    def get_installed_versions():
        try:
            PROTON_GE_DIR.mkdir(parents=True, exist_ok=True)
            versions = []
            for d in PROTON_GE_DIR.iterdir():
                if d.is_dir() and 'proton' in d.name.lower():
                    versions.append({
                        'name': d.name,
                        'path': str(d),
                        'size_mb': sum(f.stat().st_size for f in d.rglob('*') if f.is_file()) // (1024 * 1024)
                    })
            versions.sort(key=lambda v: v['name'], reverse=True)
            logger.info(f'Found {len(versions)} Proton-GE installations')
            return versions
        except Exception as e:
            logger.error(f'Failed to list Proton-GE versions: {e}')
            return []

    @staticmethod
    async def fetch_latest_releases(count=5):
        try:
            req = urllib.request.Request(
                f'{PROTON_GE_API}?per_page={count}',
                headers={'User-Agent': 'JBL-Decky-Plugin/1.0'}
            )
            loop = asyncio.get_event_loop()
            response = await loop.run_in_executor(None, lambda: urllib.request.urlopen(req, timeout=15))
            data = json.loads(response.read().decode())
            releases = []
            for r in data:
                tar_asset = None
                for asset in r.get('assets', []):
                    if asset['name'].endswith('.tar.gz'):
                        tar_asset = asset
                        break
                releases.append({
                    'tag': r['tag_name'],
                    'name': r['name'],
                    'published': r['published_at'],
                    'download_url': tar_asset['browser_download_url'] if tar_asset else None,
                    'size_mb': (tar_asset['size'] // (1024 * 1024)) if tar_asset else 0,
                })
            logger.info(f'Fetched {len(releases)} Proton-GE releases')
            return releases
        except Exception as e:
            logger.error(f'Failed to fetch Proton-GE releases: {e}')
            return []

    @staticmethod
    async def download_and_install(download_url, tag):
        try:
            PROTON_GE_DIR.mkdir(parents=True, exist_ok=True)
            tar_path = PROTON_GE_DIR / f'{tag}.tar.gz'
            logger.info(f'Downloading Proton-GE {tag}...')
            req = urllib.request.Request(download_url, headers={'User-Agent': 'JBL-Decky-Plugin/1.0'})
            loop = asyncio.get_event_loop()
            response = await loop.run_in_executor(None, lambda: urllib.request.urlopen(req, timeout=300))
            with open(tar_path, 'wb') as f:
                shutil.copyfileobj(response, f)
            logger.info('Download complete. Extracting...')
            proc = await asyncio.create_subprocess_exec(
                'tar', '-xzf', str(tar_path), '-C', str(PROTON_GE_DIR),
                stdout=asyncio.subprocess.PIPE, stderr=asyncio.subprocess.PIPE
            )
            stdout, stderr = await proc.communicate()
            tar_path.unlink(missing_ok=True)
            if proc.returncode == 0:
                logger.info(f'Proton-GE {tag} installed successfully')
                return {'success': True, 'tag': tag, 'message': f'Installed {tag}'}
            else:
                logger.error(f'Extraction failed: {stderr.decode()}')
                return {'success': False, 'error': stderr.decode()}
        except Exception as e:
            logger.error(f'Proton-GE download/install failed: {e}')
            return {'success': False, 'error': str(e)}

    @staticmethod
    def remove_version(version_name):
        try:
            target = PROTON_GE_DIR / version_name
            if target.exists() and target.is_dir():
                shutil.rmtree(target)
                logger.info(f'Removed Proton-GE: {version_name}')
                return {'success': True, 'removed': version_name}
            return {'success': False, 'error': 'Version not found'}
        except Exception as e:
            logger.error(f'Failed to remove Proton-GE {version_name}: {e}')
            return {'success': False, 'error': str(e)}


class HealthMonitor:
    @staticmethod
    def _read_sysfs(path, fallback=None):
        try:
            if os.path.exists(path):
                with open(path, 'r') as f:
                    return f.read().strip()
            return fallback
        except Exception:
            return fallback

    @staticmethod
    def get_cpu_temp():
        raw = HealthMonitor._read_sysfs(THERMAL_PATHS['cpu_temp'])
        if raw:
            return int(raw) / 1000.0
        return -1.0

    @staticmethod
    def get_gpu_temp():
        raw = HealthMonitor._read_sysfs(THERMAL_PATHS['gpu_temp'])
        if raw:
            return int(raw) / 1000.0
        return -1.0

    @staticmethod
    def get_fan_speed():
        raw = HealthMonitor._read_sysfs(THERMAL_PATHS['fan_speed'])
        if raw:
            return int(raw)
        return -1

    @staticmethod
    def get_battery_info():
        capacity = HealthMonitor._read_sysfs(THERMAL_PATHS['battery_capacity'])
        status = HealthMonitor._read_sysfs(THERMAL_PATHS['battery_status'])
        power = HealthMonitor._read_sysfs(THERMAL_PATHS['battery_power_now'])
        return {
            'capacity_percent': int(capacity) if capacity else -1,
            'status': status or 'Unknown',
            'power_draw_w': (int(power) / 1000000) if power else -1.0,
        }

    @staticmethod
    def get_full_health():
        return {
            'cpu_temp_c': HealthMonitor.get_cpu_temp(),
            'gpu_temp_c': HealthMonitor.get_gpu_temp(),
            'fan_rpm': HealthMonitor.get_fan_speed(),
            'battery': HealthMonitor.get_battery_info(),
            'timestamp': time.time(),
        }


class Plugin:
    settings = None
    health_task = None

    async def scan_proton_advisor(self):
        """Scan all installed games and return Proton recommendations."""
        try:
            sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
            from proton_advisor import scan_and_advise
            results = await scan_and_advise()
            logger.info(f"Proton Advisor: scanned {len(results)} games")
            return json.dumps(results)
        except Exception as e:
            logger.error(f"Proton Advisor scan failed: {e}")
            return json.dumps({"error": str(e)})

    async def apply_proton_override(self, appid, proton_name):
        """Apply a specific Proton version to a game."""
        try:
            sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
            from proton_advisor import set_proton_override
            result = set_proton_override(appid, proton_name)
            logger.info(f"Proton override: {appid} -> {proton_name}: {result}")
            return json.dumps(result)
        except Exception as e:
            logger.error(f"Apply Proton override failed: {e}")
            return json.dumps({"success": False, "error": str(e)})

    async def get_installed_protons(self):
        """Get all installed Proton versions (official + GE)."""
        try:
            protons = []
            ge_dir = HOME / '.steam' / 'steam' / 'steamapps' / 'compatibilitytools.d'
            if ge_dir.exists():
                protons.extend([d.name for d in ge_dir.iterdir() if d.is_dir()])
            common = HOME / '.steam' / 'steam' / 'steamapps' / 'common'
            if common.exists():
                protons.extend([d.name for d in common.iterdir() if d.is_dir() and d.name.startswith("Proton")])
            protons.sort(reverse=True)
            return json.dumps(protons)
        except Exception as e:
            logger.error(f"Get installed protons failed: {e}")
            return json.dumps([])

    async def _main(self):
        # Apply balanced defaults on startup
        logger.info('Applying balanced startup profile')
        PowerShift.set_tdp(15)
        logger.info('Startup: TDP set to 15W balanced')
        logger.info('=' * 50)
        logger.info('JBL (Jimmys Big Load) - Starting up!')
        logger.info('=' * 50)
        self.settings = SettingsManager()
        self.health_task = asyncio.create_task(self._health_loop())
        logger.info('JBL backend initialized successfully.')

    async def _unload(self):
        logger.info('JBL shutting down...')
        if self.health_task:
            self.health_task.cancel()
        logger.info('JBL shutdown complete.')

    async def _health_loop(self):
        while True:
            try:
                health = HealthMonitor.get_full_health()
                logger.debug(f'Health: {json.dumps(health)}')
                await asyncio.sleep(10)
            except asyncio.CancelledError:
                break
            except Exception as e:
                logger.error(f'Health loop error: {e}')
                await asyncio.sleep(30)

    async def set_tdp(self, watts):
        result = PowerShift.set_tdp(watts)
        if result['success']:
            self.settings.set_global('tdp', watts)
        return result

    async def get_tdp(self):
        return PowerShift.get_tdp()

    async def set_gpu_clock(self, mhz):
        result = PowerShift.set_gpu_clock(mhz)
        if result['success']:
            self.settings.set_global('gpu_clock', mhz)
        return result

    async def get_gpu_clock(self):
        return PowerShift.get_gpu_clock()

    async def set_lsfg(self, enabled, multiplier=2, flow_rate=50):
        validation = LSFGManager.validate_settings(multiplier, flow_rate)
        if not validation['valid']:
            return {'success': False, 'errors': validation['errors']}
        self.settings.set_global('lsfg_enabled', enabled)
        self.settings.set_global('lsfg_multiplier', multiplier)
        self.settings.set_global('lsfg_flow_rate', flow_rate)
        return {
            'success': True,
            'launch_options': LSFGManager.get_launch_options(multiplier, flow_rate, enabled)
        }

    async def get_lsfg(self):
        return {
            'enabled': self.settings.get_global('lsfg_enabled', True),
            'multiplier': self.settings.get_global('lsfg_multiplier', LSFG_DEFAULT_MULTIPLIER),
            'flow_rate': self.settings.get_global('lsfg_flow_rate', LSFG_DEFAULT_FLOW_RATE),
        }

    async def get_proton_versions(self):
        return ProtonGEManager.get_installed_versions()

    async def fetch_proton_releases(self, count=5):
        return await ProtonGEManager.fetch_latest_releases(count)

    async def install_proton(self, download_url, tag):
        result = await ProtonGEManager.download_and_install(download_url, tag)
        if result['success']:
            self.settings.set_global('proton_ge_default', tag)
        return result

    async def remove_proton(self, version_name):
        return ProtonGEManager.remove_version(version_name)

    async def get_health(self):
        return HealthMonitor.get_full_health()

    async def get_cpu_temp(self):
        return HealthMonitor.get_cpu_temp()

    async def get_battery(self):
        return HealthMonitor.get_battery_info()

    async def save_game_profile(self, game_id, profile):
        self.settings.set_profile(game_id, profile)
        return {'success': True, 'game_id': game_id}

    async def load_game_profile(self, game_id):
        profile = self.settings.get_profile(game_id)
        if profile:
            return {'success': True, 'profile': profile}
        return {'success': False, 'error': 'No profile found'}

    async def apply_game_profile(self, game_id):
        profile = self.settings.get_profile(game_id)
        if not profile:
            return {'success': False, 'error': 'No profile found'}
        results = {}
        if 'tdp' in profile:
            results['tdp'] = PowerShift.set_tdp(profile['tdp'])
        if 'gpu_clock' in profile:
            results['gpu_clock'] = PowerShift.set_gpu_clock(profile['gpu_clock'])
        if 'lsfg_multiplier' in profile:
            self.settings.set_global('lsfg_multiplier', profile['lsfg_multiplier'])
        if 'lsfg_flow_rate' in profile:
            self.settings.set_global('lsfg_flow_rate', profile['lsfg_flow_rate'])
        logger.info(f'Applied profile for game {game_id}: {profile}')
        return {'success': True, 'results': results, 'profile': profile}

    async def delete_game_profile(self, game_id):
        self.settings.delete_profile(game_id)
        return {'success': True, 'game_id': game_id}

    async def list_game_profiles(self):
        return self.settings.list_profiles()

    async def get_settings(self):
        return self.settings.settings

    async def set_setting(self, section, key, value):
        if section == 'global':
            self.settings.set_global(key, value)
        elif section == 'automation':
            self.settings.set_automation(key, value)
        else:
            return {'success': False, 'error': f'Unknown section: {section}'}
        return {'success': True}