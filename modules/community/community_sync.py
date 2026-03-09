# ============================================================
# JBL Community Sync
# ============================================================
import asyncio
import aiohttp
import logging
from modules.core.constants import COMMUNITY_API_URL

logger = logging.getLogger("JBL.Community")

class CommunitySyncManager:
    def __init__(self, settings, profile_manager):
        self.settings = settings
        self.profiles = profile_manager
        self._api = COMMUNITY_API_URL
        self._syncing = False

    async def fetch_profile(self, app_id: str) -> dict:
        try:
            async with aiohttp.ClientSession() as session:
                url = f"{self._api}/profiles/{app_id}"
                async with session.get(url, timeout=aiohttp.ClientTimeout(total=5)) as r:
                    if r.status == 200:
                        data = await r.json()
                        logger.info(f"Community profile fetched for {app_id}")
                        return data
        except Exception as e:
            logger.error(f"Community fetch failed for {app_id}: {e}")
        return {}

    async def submit_profile(self, app_id: str, profile: dict, rating: int = 5) -> bool:
        try:
            payload = {
                "app_id": app_id,
                "profile": profile,
                "rating": rating,
                "plugin_version": "0.3.0"
            }
            async with aiohttp.ClientSession() as session:
                url = f"{self._api}/profiles"
                async with session.post(url, json=payload, timeout=aiohttp.ClientTimeout(total=5)) as r:
                    if r.status in [200, 201]:
                        logger.info(f"Profile submitted for {app_id} ✅")
                        return True
        except Exception as e:
            logger.error(f"Profile submit failed: {e}")
        return False

    async def search_profiles(self, query: str) -> list:
        try:
            async with aiohttp.ClientSession() as session:
                url = f"{self._api}/profiles/search?q={query}"
                async with session.get(url, timeout=aiohttp.ClientTimeout(total=5)) as r:
                    if r.status == 200:
                        return await r.json()
        except Exception as e:
            logger.error(f"Profile search failed: {e}")
        return []

    async def sync_all(self):
        if not self.settings.get("community_sync_enabled", True):
            return
        all_profiles = self.profiles.get_all_profiles()
        for app_id in all_profiles:
            community = await self.fetch_profile(app_id)
            if community:
                self.profiles.apply_community_profile(app_id, community)
        logger.info(f"Community sync complete for {len(all_profiles)} games")

    async def sync_loop(self):
        self._syncing = True
        interval = self.settings.get("community_sync_interval", 3600)
        while self._syncing:
            await self.sync_all()
            await asyncio.sleep(interval)

    def stop(self):
        self._syncing = False
