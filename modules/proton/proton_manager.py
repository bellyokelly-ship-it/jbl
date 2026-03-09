# ============================================================
# JBL Proton Manager
# ============================================================
import os
import json
import tarfile
import asyncio
import aiohttp
import logging
from modules.core.constants import PROTON_RELEASES_URL, PROTON_INSTALL_PATH

logger = logging.getLogger("JBL.Proton")

class ProtonManager:
    def __init__(self, settings):
        self.settings = settings
        self._install_path = PROTON_INSTALL_PATH
        os.makedirs(self._install_path, exist_ok=True)

    def get_installed_versions(self) -> list:
        try:
            return [d for d in os.listdir(self._install_path)
                    if os.path.isdir(os.path.join(self._install_path, d))
                    and "proton" in d.lower()]
        except Exception as e:
            logger.error(f"Failed to list Proton versions: {e}")
            return []

    async def get_latest_releases(self, count: int = 5) -> list:
        try:
            async with aiohttp.ClientSession() as session:
                async with session.get(PROTON_RELEASES_URL, timeout=aiohttp.ClientTimeout(total=10)) as r:
                    if r.status == 200:
                        releases = await r.json()
                        return [
                            {
                                "name": rel["name"],
                                "tag": rel["tag_name"],
                                "url": next(
                                    (a["browser_download_url"] for a in rel.get("assets", [])
                                     if a["name"].endswith(".tar.gz")), None
                                ),
                                "size_mb": next(
                                    (round(a["size"] / 1_048_576, 1) for a in rel.get("assets", [])
                                     if a["name"].endswith(".tar.gz")), 0
                                )
                            }
                            for rel in releases[:count]
                        ]
        except Exception as e:
            logger.error(f"Failed to fetch Proton releases: {e}")
        return []

    async def download_and_install(self, release: dict, progress_cb=None) -> bool:
        url = release.get("url")
        name = release.get("name", "Unknown")
        if not url:
            logger.error("No download URL in release")
            return False
        tmp_path = f"/tmp/jbl_proton_{name}.tar.gz"
        try:
            async with aiohttp.ClientSession() as session:
                async with session.get(url) as r:
                    total = int(r.headers.get("Content-Length", 0))
                    downloaded = 0
                    with open(tmp_path, "wb") as f:
                        async for chunk in r.content.iter_chunked(1024 * 1024):
                            f.write(chunk)
                            downloaded += len(chunk)
                            if progress_cb and total:
                                progress_cb(int(downloaded / total * 100))

            logger.info(f"Extracting {name}...")
            with tarfile.open(tmp_path, "r:gz") as tar:
                tar.extractall(self._install_path)
            os.remove(tmp_path)
            logger.info(f"Proton {name} installed ✅")
            return True
        except Exception as e:
            logger.error(f"Proton install failed: {e}")
            if os.path.exists(tmp_path):
                os.remove(tmp_path)
            return False

    async def auto_update(self):
        if not self.settings.get("proton_auto_update", True):
            return
        releases = await self.get_latest_releases(1)
        if not releases:
            return
        latest = releases[0]
        installed = self.get_installed_versions()
        if latest["name"] not in installed:
            logger.info(f"New Proton version available: {latest['name']} — installing...")
            await self.download_and_install(latest)

    def get_status(self):
        return {
            "installed": self.get_installed_versions(),
            "install_path": self._install_path,
            "auto_update": self.settings.get("proton_auto_update", True),
            "preferred": self.settings.get("proton_preferred", "GE-Proton")
        }
