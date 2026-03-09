# ============================================================
# JBL (Jimmy's Big Load) — Main Backend
# Decky Loader Plugin
# ============================================================
import asyncio
import logging
import os

import decky_plugin

from modules.core.settings import SettingsManager
from modules.performance.tdp_manager import TDPManager
from modules.performance.lsfg_manager import LSFGManager
from modules.performance.powershift import PowerShiftManager
from modules.thermal.thermal_manager import ThermalManager
from modules.battery.battery_arc import BatteryArcPlanner
from modules.proton.proton_manager import ProtonManager
from modules.profiles.profile_manager import ProfileManager
from modules.community.community_sync import CommunitySyncManager
from modules.analytics.session_tracker import SessionTracker
from modules.health.health_monitor import HealthMonitor
from modules.xr.xr_manager import XRManager
from modules.display.display_manager import DisplayManager
from modules.shaders.shader_manager import ShaderCacheManager
from modules.predictive.predictive_preloader import PredictivePreloader

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(name)s] %(levelname)s: %(message)s",
    handlers=[
        logging.FileHandler("/tmp/jbl.log"),
        logging.StreamHandler()
    ]
)
logger = logging.getLogger("JBL")

class Plugin:
    async def _main(self):
        logger.info("🚀 JBL (Jimmy's Big Load) starting up...")

        # Core
        self.settings = SettingsManager()

        # Performance
        self.tdp = TDPManager(self.settings)
        self.lsfg = LSFGManager(self.settings)
        self.powershift = PowerShiftManager(self.settings, self.tdp, self.lsfg)

        # System
        self.thermal = ThermalManager(self.settings, self.tdp)
        self.battery = BatteryArcPlanner(self.settings, self.tdp)
        self.display = DisplayManager(self.settings)

        # Game Management
        self.proton = ProtonManager(self.settings)
        self.profiles = ProfileManager(self.settings)
        self.shaders = ShaderCacheManager(self.settings)
        self.predictive = PredictivePreloader(self.settings, self.profiles)

        # Community + Analytics
        self.community = CommunitySyncManager(self.settings, self.profiles)
        self.analytics = SessionTracker(self.settings)
        self.health = HealthMonitor(self.settings, self.thermal, self.battery)

        # XR
        self.xr = XRManager(self.settings, self.tdp, self.lsfg)

        # Detect context and apply initial profile
        context = self.display.get_current_context()
        self.powershift.set_context(context)
        logger.info(f"Initial context: {context}")

        # Start background tasks
        asyncio.create_task(self.thermal.monitor_loop())
        asyncio.create_task(self.health.monitor_loop())
        asyncio.create_task(self.xr.monitor_loop())
        asyncio.create_task(self.community.sync_loop())
        asyncio.create_task(self._context_monitor_loop())
        asyncio.create_task(self._battery_arc_loop())
        asyncio.create_task(self._auto_update_loop())

        logger.info("✅ JBL fully loaded!")

    async def _context_monitor_loop(self):
        last_context = None
        while True:
            context = self.display.get_current_context()
            if context != last_context:
                logger.info(f"Context changed: {last_context} → {context}")
                self.powershift.set_context(context)
                last_context = context
            await asyncio.sleep(3)

    async def _battery_arc_loop(self):
        while True:
            rec = self.battery.get_arc_recommendation()
            if rec["action"] in ["reduce", "emergency"]:
                self.tdp.set_tdp(rec.get("tdp", 6))
            elif rec["action"] == "increase":
                self.tdp.set_tdp(rec.get("tdp", 8))
            await asyncio.sleep(30)

    async def _auto_update_loop(self):
        while True:
            await asyncio.sleep(3600)
            await self.proton.auto_update()

    # ── SETTINGS API ────────────────────────────────────────
    async def get_settings(self) -> dict:
        return self.settings.get_all()

    async def set_setting(self, key: str, value) -> bool:
        self.settings.set(key, value)
        return True

    # ── POWERSHIFT API ───────────────────────────────────────
    async def cycle_powershift(self) -> str:
        return self.powershift.cycle_mode()

    async def set_powershift_mode(self, mode: str) -> bool:
        return self.powershift.set_mode(mode)

    async def get_powershift_state(self) -> dict:
        return self.powershift.get_state()

    # ── TDP API ──────────────────────────────────────────────
    async def set_tdp(self, watts: int) -> bool:
        return self.tdp.set_tdp(watts)

    async def set_gpu_clock(self, mhz: int) -> bool:
        return self.tdp.set_gpu_clock(mhz)

    # ── LSFG API ─────────────────────────────────────────────
    async def set_lsfg_enabled(self, enabled: bool) -> bool:
        return self.lsfg.enable() if enabled else self.lsfg.disable()

    async def set_lsfg_multiplier(self, multiplier: int) -> bool:
        return self.lsfg.set_multiplier(multiplier)

    async def set_lsfg_flow_rate(self, rate: int) -> bool:
        return self.lsfg.set_flow_rate(rate)

    async def get_lsfg_state(self) -> dict:
        return self.lsfg.get_state()

    # ── THERMAL API ──────────────────────────────────────────
    async def get_thermal_status(self) -> dict:
        return self.thermal.get_status()

    # ── BATTERY API ──────────────────────────────────────────
    async def get_battery_status(self) -> dict:
        return self.battery.get_status()

    async def set_battery_session_hours(self, hours: float) -> bool:
        self.battery._target_hours = hours
        self.settings.set("battery_session_hours", hours)
        return True

    # ── PROTON API ───────────────────────────────────────────
    async def get_proton_status(self) -> dict:
        return self.proton.get_status()

    async def get_proton_releases(self) -> list:
        return await self.proton.get_latest_releases()

    async def install_proton(self, release: dict) -> bool:
        return await self.proton.download_and_install(release)

    # ── PROFILES API ─────────────────────────────────────────
    async def get_game_profile(self, app_id: str) -> dict:
        return self.profiles.get_profile(app_id)

    async def save_game_profile(self, app_id: str, profile: dict) -> bool:
        self.profiles.save_profile(app_id, profile)
        return True

    async def get_all_profiles(self) -> dict:
        return self.profiles.get_all_profiles()

    # ── COMMUNITY API ────────────────────────────────────────
    async def fetch_community_profile(self, app_id: str) -> dict:
        return await self.community.fetch_profile(app_id)

    async def submit_community_profile(self, app_id: str, rating: int = 5) -> bool:
        profile = self.profiles.get_profile(app_id)
        return await self.community.submit_profile(app_id, profile, rating)

    async def search_community_profiles(self, query: str) -> list:
        return await self.community.search_profiles(query)

    # ── ANALYTICS API ────────────────────────────────────────
    async def get_analytics_summary(self, days: int = 7) -> dict:
        return self.analytics.get_summary(days)

    # ── HEALTH API ───────────────────────────────────────────
    async def run_diagnostics(self) -> dict:
        return self.health.run_diagnostics()

    # ── XR API ───────────────────────────────────────────────
    async def get_xr_status(self) -> dict:
        return self.xr.get_status()

    async def detect_xr_device(self) -> dict:
        return self.xr.detect_device()

    async def set_xr_mode(self, mode: str) -> bool:
        return self.xr.apply_xr_profile(mode)

    # ── DISPLAY API ──────────────────────────────────────────
    async def get_display_status(self) -> dict:
        return self.display.get_status()

    # ── SHADER API ───────────────────────────────────────────
    async def get_shader_cache_status(self) -> dict:
        return self.shaders.get_status()

    async def clear_shader_cache(self, app_id: str = None) -> bool:
        if app_id:
            return self.shaders.clear_game_cache(app_id)
        return self.shaders.clear_all_cache()

    # ── PREDICTIVE API ───────────────────────────────────────
    async def get_predictions(self) -> list:
        return self.predictive.get_predicted_next()

    # ── GAME LIFECYCLE ───────────────────────────────────────
    async def on_game_launch(self, app_id: str, app_name: str):
        profile = self.profiles.get_profile(app_id)
        self.tdp.apply_profile(profile)
        self.lsfg.set_multiplier(profile.get("lsfg_multiplier", 2))
        self.lsfg.set_flow_rate(profile.get("lsfg_flow_rate", 50))
        self.analytics.start_session(app_id, app_name, profile)
        self.profiles.start_session(app_id)
        self.predictive.record_launch(app_id)
        community = await self.community.fetch_profile(app_id)
        if community:
            self.profiles.apply_community_profile(app_id, community)
        logger.info(f"Game launched: {app_name} ({app_id})")

    async def on_game_exit(self, app_id: str):
        session = self.analytics.end_session()
        self.profiles.end_session(app_id)
        logger.info(f"Game exited: {app_id} — session: {session}")

    async def _unload(self):
        self.thermal.stop()
        self.health.stop()
        self.xr.stop()
        self.community.stop()
        logger.info("JBL unloaded cleanly.")
