import { call } from "@decky/api";

// Power
export const getTdp = (): Promise<string> => call<[], string>("get_tdp");
export const setTdp = (watts: number): Promise<string> => call<[number], string>("set_tdp", watts);
export const getGpuClock = (): Promise<string> => call<[], string>("get_gpu_clock");
export const setGpuClock = (mhz: number): Promise<string> => call<[number], string>("set_gpu_clock", mhz);
export const getPowerLimits = (): Promise<string> => call<[], string>("get_power_limits");
export const applyPowerPreset = (preset: string): Promise<string> => call<[string], string>("apply_power_preset", preset);

// LSFG
export const getLsfg = (): Promise<string> => call<[], string>("get_lsfg");
export const setLsfg = (enabled: boolean, multiplier: number, flowRate: number): Promise<string> =>
  call<[boolean, number, number], string>("set_lsfg", enabled, multiplier, flowRate);

// Health
export const getHealth = (): Promise<string> => call<[], string>("get_health");

// Proton
export const getProtonVersions = (): Promise<string> => call<[], string>("get_proton_versions");
export const fetchProtonReleases = (count: number): Promise<string> => call<[number], string>("fetch_proton_releases", count);
export const installProton = (url: string, tag: string): Promise<string> => call<[string, string], string>("install_proton", url, tag);
export const removeProton = (name: string): Promise<string> => call<[string], string>("remove_proton", name);

// Profiles
export const listGameProfiles = (): Promise<string> => call<[], string>("list_game_profiles");
export const saveGameProfile = (name: string, settings: string): Promise<string> => call<[string, string], string>("save_game_profile", name, settings);
export const deleteGameProfile = (name: string): Promise<string> => call<[string], string>("delete_game_profile", name);

// Auto / Advisor
export const scanProtonAdvisor = (): Promise<string> => call<[], string>("scan_proton_advisor");

// Settings
export const getSettings = (): Promise<string> => call<[], string>("get_settings");
export const saveSettings = (settings: string): Promise<string> => call<[string], string>("save_settings", settings);
