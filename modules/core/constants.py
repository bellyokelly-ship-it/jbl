# ============================================================
# JBL Constants
# ============================================================

PLUGIN_VERSION = "0.3.0"
PLUGIN_NAME = "jimmys-big-load"

# TDP Limits (Watts)
TDP_MIN = 3
TDP_MAX = 15
TDP_DEFAULT = 8

# GPU Clock Limits (MHz)
GPU_MIN = 200
GPU_MAX = 1600
GPU_DEFAULT = 800

# LSFG Defaults (James's personal sweet spot)
LSFG_DEFAULT_MULTIPLIER = 2
LSFG_DEFAULT_FLOW_RATE = 50
LSFG_MULTIPLIERS = [2, 3, 4]
LSFG_FLOW_RATES = [25, 50, 75, 100]

# Thermal Thresholds (°C)
THERMAL_NORMAL = 75
THERMAL_WARN = 80
THERMAL_DANGER = 87
THERMAL_CRITICAL = 90

# Battery Thresholds
BATTERY_LOW = 20
BATTERY_CRITICAL = 10
BATTERY_CHARGE_LIMIT = 80

# PowerShift Modes
POWERSHIFT_MODES = ["performance", "balanced", "battery"]

# Proton
PROTON_RELEASES_URL = "https://api.github.com/repos/GloriousEggroll/proton-ge-custom/releases"
PROTON_INSTALL_PATH = "/home/deck/.steam/root/compatibilitytools.d"

# Community Sync
COMMUNITY_API_URL = "https://jbl-api.bellyokelly-ship-it.workers.dev"
COMMUNITY_SYNC_INTERVAL = 3600

# XR Devices
KNOWN_XR_DEVICES = {
    "Viture One":         {"vid": "0x35CA", "pid": "0xFF02"},
    "Viture Pro":         {"vid": "0x35CA", "pid": "0xFF03"},
    "Viture Luma":        {"vid": "0x35CA", "pid": "0xFF04"},
    "Viture Luma Ultra":  {"vid": "0x35CA", "pid": "0xFF05"},
    "XREAL Air":          {"vid": "0x3318", "pid": "0x0424"},
    "XREAL Air 2":        {"vid": "0x3318", "pid": "0x0428"},
    "Rokid Max":          {"vid": "0x04B4", "pid": "0x5010"},
}

# Paths
SETTINGS_PATH = "/home/deck/homebrew/settings/jimmys-big-load.json"
LSFG_CONFIG_PATH = "/home/deck/.config/lsfg-vk/lsfg_vk.conf"
SHADER_CACHE_PATH = "/home/deck/.steam/steam/shadercache"
LOG_PATH = "/tmp/jbl.log"
