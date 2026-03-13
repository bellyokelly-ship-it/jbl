import { call } from "@decky/api";

// All backend methods return JSON strings from Python, so we type them as string.

// ─── Power ──────────────────────────────────────────────────
export const getTdp = (): Promise<string> => call<[], string>("get_tdp");
export const setTdp = (watts: number): Promise<string> => call<[number], string>("set_tdp", watts);
export const getGpuClock = (): Promise<string> => call<[], string>("get_gpu_clock");
export const setGpuClock = (mhz: number): Promise<string> => call<[number], string>("set_gpu_clock", mhz);
export const getPowerLimits = (): Promise<string> => call<[], string>("get_power_limits");
export const applyPowerPreset = (preset: string): Promise<string> => call<[string], string>("apply_power_preset", preset);

// ─── LSFG ───────────────────────────────────────────────────
export const getLsfg = (): Promise<string> => call<[], string>("get_lsfg");
export const setLsfg = (enabled: boolean, multiplier: number, flowRate: number): Promise<string> =>
  call<[boolean, number, number], string>("set_lsfg", enabled, multiplier, flowRate);

// ─── Health ─────────────────────────────────────────────────
export const getHealth = (): Promise<string> => call<[], string>("get_health");

// ─── Proton ─────────────────────────────────────────────────
export const getProtonVersions = (): Promise<string> => call<[], string>("get_proton_versions");
export const fetchProtonReleases = (count: number): Promise<string> => call<[number], string>("fetch_proton_releases", count);
export const installProton = (url: string, tag: string): Promise<string> => call<[string, string], string>("install_proton", url, tag);
export const removeProton = (name: string): Promise<string> => call<[string], string>("remove_proton", name);
export const scanProtonAdvisor = (): Promise<string> => call<[], string>("scan_proton_advisor");
export const applyProtonOverride = (appid: string, version: string): Promise<string> => call<[string, string], string>("apply_proton_override", appid, version);

// ─── Profiles ───────────────────────────────────────────────
export const listGameProfiles = (): Promise<string> => call<[], string>("list_game_profiles");
export const saveGameProfile = (name: string, settings: string): Promise<string> => call<[string, string], string>("save_game_profile", name, settings);
export const applyGameProfile = (name: string): Promise<string> => call<[string], string>("apply_game_profile", name);
export const deleteGameProfile = (name: string): Promise<string> => call<[string], string>("delete_game_profile", name);
export const exportProfiles = (): Promise<string> => call<[], string>("export_profiles");
export const importProfiles = (): Promise<string> => call<[], string>("import_profiles");

// ─── Auto-Optimise ─────────────────────────────────────────
export const getRecommendation = (appid: string): Promise<string> => call<[string], string>("get_recommendation", appid);
export const applyRecommendation = (appid: string): Promise<string> => call<[string], string>("apply_recommendation", appid);

// ─── Settings ───────────────────────────────────────────────
export const getSettings = (): Promise<string> => call<[], string>("get_settings");
export const saveSettings = (settings: string): Promise<string> => call<[string], string>("save_settings", settings);

// ─── Diagnostics ────────────────────────────────────────────
export const getDiagnostics = (): Promise<string> => call<[], string>("get_diagnostics");
export const rerunDiagnostics = (): Promise<string> => call<[], string>("rerun_diagnostics");
