import { call } from "@decky/api";

export const getTdp = () => call<[], string>("get_tdp");
export const setTdp = (watts: number) => call<[number], string>("set_tdp", watts);
export const getGpuClock = () => call<[], string>("get_gpu_clock");
export const setGpuClock = (mhz: number) => call<[number], string>("set_gpu_clock", mhz);
export const getPowerLimits = () => call<[], string>("get_power_limits");
export const applyPowerPreset = (preset: string) => call<[string], string>("apply_power_preset", preset);

export const getLsfg = () => call<[], string>("get_lsfg");
export const setLsfg = (enabled: boolean, multiplier: number, flowRate: number) =>
  call<[boolean, number, number], string>("set_lsfg", enabled, multiplier, flowRate);

export const getHealth = () => call<[], string>("get_health");

export const getProtonVersions = () => call<[], string>("get_proton_versions");
export const fetchProtonReleases = (count: number) => call<[number], string>("fetch_proton_releases", count);
export const installProton = (url: string, tag: string) => call<[string, string], string>("install_proton", url, tag);
export const removeProton = (name: string) => call<[string], string>("remove_proton", name);

export const scanGames = () => call<[], string>("scan_games");
export const listGameProfiles = () => call<[], string>("list_game_profiles");
export const getGameProfile = (name: string) => call<[string], string>("get_game_profile", name);
export const saveGameProfile = (name: string, settings: string) =>
  call<[string, string], string>("save_game_profile", name, settings);
export const deleteGameProfile = (name: string) => call<[string], string>("delete_game_profile", name);

export const scanProtonAdvisor = () => call<[], string>("scan_proton_advisor");

export const getSettings = () => call<[], string>("get_settings");
export const saveSettings = (settings: string) => call<[string], string>("save_settings", settings);

// Auto-Optimise (Proton Advisor v2)
export const protonScan = () => call<[], string>("jbl_proton_scan");
export const protonApply = (appid: string, version: string, dryRun: boolean) =>
  call<[string, string, boolean], string>("jbl_proton_apply", appid, version, dryRun);
export const protonApplyAll = (recommendations: string, dryRun: boolean) =>
  call<[string, boolean], string>("jbl_proton_apply_all", recommendations, dryRun);
export const protonCurrentOverrides = () => call<[], string>("jbl_proton_overrides");

// PlayMode & Profile Overrides
export const playmodeDetect = () => call<[], string>("jbl_playmode_detect");
export const playmodeApply = (mode: string) => call<[string], string>("jbl_playmode_apply", mode);
export const playmodeGetProfiles = () => call<[], string>("jbl_playmode_get_profiles");
export const profileGet = (mode: string) => call<[string], string>("jbl_profile_get", mode);
export const profileSet = (mode: string, key: string, value: any) =>
  call<[string, string, any], string>("jbl_profile_set", mode, key, value);
export const profileSetGlobal = (key: string, value: any) =>
  call<[string, any], string>("jbl_profile_set_global", key, value);
export const profileReset = (mode: string) => call<[string], string>("jbl_profile_reset", mode);
export const profileResetAll = () => call<[], string>("jbl_profile_reset_all");
export const profileGetOverrides = () => call<[], string>("jbl_profile_get_overrides");
