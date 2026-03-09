# ============================================================
# JBL Shader Cache Manager
# ============================================================
import os
import shutil
import logging
from modules.core.constants import SHADER_CACHE_PATH

logger = logging.getLogger("JBL.Shaders")

class ShaderCacheManager:
    def __init__(self, settings):
        self.settings = settings
        self._cache_path = SHADER_CACHE_PATH

    def get_cache_size(self) -> dict:
        try:
            total = 0
            game_sizes = {}
            if os.path.exists(self._cache_path):
                for game_id in os.listdir(self._cache_path):
                    game_path = os.path.join(self._cache_path, game_id)
                    if os.path.isdir(game_path):
                        size = sum(
                            os.path.getsize(os.path.join(dp, f))
                            for dp, _, files in os.walk(game_path)
                            for f in files
                        )
                        game_sizes[game_id] = round(size / 1_048_576, 1)
                        total += size
            return {
                "total_mb": round(total / 1_048_576, 1),
                "total_gb": round(total / 1_073_741_824, 2),
                "games": game_sizes
            }
        except Exception as e:
            logger.error(f"Cache size check failed: {e}")
            return {"total_mb": 0, "total_gb": 0, "games": {}}

    def clear_game_cache(self, app_id: str) -> bool:
        try:
            path = os.path.join(self._cache_path, str(app_id))
            if os.path.exists(path):
                shutil.rmtree(path)
                logger.info(f"Shader cache cleared for {app_id}")
                return True
        except Exception as e:
            logger.error(f"Cache clear failed for {app_id}: {e}")
        return False

    def clear_all_cache(self) -> bool:
        try:
            if os.path.exists(self._cache_path):
                for game_id in os.listdir(self._cache_path):
                    game_path = os.path.join(self._cache_path, game_id)
                    if os.path.isdir(game_path):
                        shutil.rmtree(game_path)
                logger.info("All shader caches cleared")
                return True
        except Exception as e:
            logger.error(f"Full cache clear failed: {e}")
        return False

    def get_status(self):
        return {
            "enabled": self.settings.get("shader_cache_enabled", True),
            "cache_path": self._cache_path,
            **self.get_cache_size()
        }
