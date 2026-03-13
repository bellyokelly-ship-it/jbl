import React, { useState, useEffect, FC } from "react";
import {
  PanelSection,
  PanelSectionRow,
  ButtonItem,
  SliderField,
  ToggleField,
} from "@decky/ui";
import {
  playmodeDetect,
  playmodeApply,
  profileGetOverrides,
  profileSet,
  profileSetGlobal,
  profileReset,
  profileResetAll,
} from "../backend";
import { success, info } from "../toast";

interface PlayModeProfile {
  tdp: number;
  gpu_clock: number;
  refresh_rate: number;
  frame_limit: number;
  fsr: boolean;
  lsfg_enabled: boolean;
  lsfg_multiplier: number;
  lsfg_flow: number;
  fan_profile: string;
  force_resolution: string | null;
}

const MODE_ICONS: Record<string, string> = {
  handheld: "🖐",
  xr: "🕶",
  docked: "🖥",
};

const MODE_LABELS: Record<string, string> = {
  handheld: "Handheld",
  xr: "XR Glasses",
  docked: "Docked",
};

const FAN_OPTIONS = ["quiet", "balanced", "performance"];

const parse = (v: any) => (typeof v === "string" ? JSON.parse(v) : v);

// ── Compact stat row ──
const Stat: FC<{ label: string; value: string; color?: string }> = ({ label, value, color }) => (
  <div style={{ display: "flex", justifyContent: "space-between", padding: "2px 0" }}>
    <span style={{ color: "#8899aa", fontSize: "11px" }}>{label}</span>
    <span style={{ color: color || "#00c8c8", fontSize: "11px", fontWeight: "bold" }}>{value}</span>
  </div>
);

// ── Override editor for a single mode ──
const OverrideEditor: FC<{
  mode: string;
  overrides: Record<string, any>;
  onSet: (key: string, value: any) => void;
  onReset: () => void;
}> = ({ mode, overrides, onSet, onReset }) => {
  const hasOverrides = Object.keys(overrides).length > 0;

  return (
    <div style={{
      padding: "8px",
      background: "rgba(0,0,0,0.2)",
      borderRadius: "6px",
      marginBottom: "4px",
    }}>
      <div style={{
        fontSize: "12px",
        fontWeight: "bold",
        color: "#00c8c8",
        marginBottom: "6px",
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center",
      }}>
        <span>{MODE_ICONS[mode]} {MODE_LABELS[mode]} Overrides</span>
        {hasOverrides && (
          <span
            onClick={onReset}
            style={{ fontSize: "10px", color: "#f66", cursor: "pointer" }}
          >
            ✕ Reset
          </span>
        )}
      </div>

      <SliderField
        label="TDP (W)"
        value={overrides.tdp ?? -1}
        min={-1}
        max={30}
        step={1}
        notchCount={8}
        notchLabels={[
          { notchIndex: 0, label: "Base", value: -1 },
          { notchIndex: 2, label: "8" },
          { notchIndex: 4, label: "15" },
          { notchIndex: 7, label: "30" },
        ]}
        description={overrides.tdp != null ? `Override: ${overrides.tdp}W` : "Using base profile"}
        onChange={(v: number) => v === -1 ? onSet("tdp", null) : onSet("tdp", v)}
      />

      <SliderField
        label="GPU Clock (MHz)"
        value={overrides.gpu_clock ?? 0}
        min={0}
        max={1600}
        step={100}
        notchCount={5}
        notchLabels={[
          { notchIndex: 0, label: "Base", value: 0 },
          { notchIndex: 1, label: "800" },
          { notchIndex: 2, label: "1100" },
          { notchIndex: 3, label: "1400" },
          { notchIndex: 4, label: "1600" },
        ]}
        description={overrides.gpu_clock != null ? `Override: ${overrides.gpu_clock}MHz` : "Using base profile"}
        onChange={(v: number) => v === 0 ? onSet("gpu_clock", null) : onSet("gpu_clock", v)}
      />

      <ToggleField
        label="LSFG Enabled"
        checked={overrides.lsfg_enabled ?? false}
        onChange={(v: boolean) => onSet("lsfg_enabled", v)}
        description={overrides.lsfg_enabled != null ? "Overridden" : "Using base"}
      />

      {!hasOverrides && (
        <div style={{ fontSize: "10px", color: "#666", textAlign: "center", padding: "4px" }}>
          No overrides — using base profile values
        </div>
      )}
    </div>
  );
};

// ── Main Panel ──
export const PlayModePanel: FC = () => {
  const [mode, setMode] = useState<string>("handheld");
  const [device, setDevice] = useState<string | null>(null);
  const [profile, setProfile] = useState<PlayModeProfile | null>(null);
  const [autoSwitch, setAutoSwitch] = useState<boolean>(true);
  const [applying, setApplying] = useState<boolean>(false);
  const [lastApplied, setLastApplied] = useState<string>("");
  const [overrides, setOverrides] = useState<Record<string, Record<string, any>>>({
    global: {},
    handheld: {},
    xr: {},
    docked: {},
  });
  const [editMode, setEditMode] = useState<string | null>(null);

  const detect = async () => {
    try {
      const res = parse(await playmodeDetect());
      if (res.ok) {
        setMode(res.value.mode);
        setDevice(res.value.device);
        setProfile(res.value.profile);
        if (autoSwitch && res.value.mode !== lastApplied) {
          const am = res.value.mode;
          const aIcon = am === "xr" ? "🕶" : am === "docked" ? "🖥" : "🖐";
          const aLabel = am === "xr" ? "XR Glasses" : am === "docked" ? "Docked" : "Handheld";
          info(`${aIcon} Auto-switching to ${aLabel}...`);
          applyMode(res.value.mode);
        }
      }
    } catch (e) {
      console.error("PlayMode detect error:", e);
    }
  };

  const applyMode = async (targetMode?: string) => {
    setApplying(true);
    try {
      const res = parse(await playmodeApply(targetMode || ""));
      if (res.ok) {
        const m = res.value.mode;
        const a = res.value.applied;
        setLastApplied(m);
        // Map applied format back to profile state
        setProfile({
          tdp: parseInt(String(a.tdp)) || 0,
          gpu_clock: parseInt(String(a.gpu_clock)) || 0,
          refresh_rate: parseInt(String(a.refresh_rate)) || 60,
          frame_limit: a.frame_limit || 0,
          fsr: a.fsr || false,
          lsfg_enabled: a.lsfg?.enabled || false,
          lsfg_multiplier: a.lsfg?.multiplier || 2,
          lsfg_flow: a.lsfg?.flow || 50,
          fan_profile: a.fan_profile || "quiet",
          force_resolution: a.output_res || a.force_resolution || null,
        });
        const icon = m === "xr" ? "🕶" : m === "docked" ? "🖥" : "🖐";
        const label = m === "xr" ? "XR Glasses" : m === "docked" ? "Docked" : "Handheld";
        const lsfgStr = a.lsfg?.enabled ? "LSFG " + a.lsfg.multiplier + "x/" + a.lsfg.flow + "%" : "LSFG Off";
        success(
          `${icon} ${label} Mode Active\n` +
          `TDP: ${a.tdp} | GPU: ${a.gpu_clock}\n` +
          `${lsfgStr} | ${a.refresh_rate}\n` +
          `Fan: ${a.fan_profile}${a.output_res ? " | Out: " + a.output_res : ""}`
        );
      }
    } catch (e) {
      console.error("PlayMode apply error:", e);
    }
    setApplying(false);
  };

  const loadOverrides = async () => {
    try {
      const res = parse(await profileGetOverrides());
      if (res.ok) {
        setOverrides({
          global: res.value.global || {},
          handheld: res.value.handheld || {},
          xr: res.value.xr || {},
          docked: res.value.docked || {},
        });
      }
    } catch (e) {
      console.error("Load overrides error:", e);
    }
  };

  const handleSetOverride = async (targetMode: string, key: string, value: any) => {
    try {
      if (value === null) {
        // Remove the key — set to special sentinel
        const updated = { ...overrides[targetMode] };
        delete updated[key];
        setOverrides((prev) => ({ ...prev, [targetMode]: updated }));
        // Backend: set to "__delete__" or handle null
        await profileSet(targetMode, key, "__delete__");
      } else {
        setOverrides((prev) => ({
          ...prev,
          [targetMode]: { ...prev[targetMode], [key]: value },
        }));
        await profileSet(targetMode, key, value);
      }
    } catch (e) {
      console.error("Set override error:", e);
    }
  };

  const handleSetGlobal = async (key: string, value: any) => {
    try {
      if (value === null) {
        const updated = { ...overrides.global };
        delete updated[key];
        setOverrides((prev) => ({ ...prev, global: updated }));
        await profileSetGlobal(key, "__delete__");
      } else {
        setOverrides((prev) => ({
          ...prev,
          global: { ...prev.global, [key]: value },
        }));
        await profileSetGlobal(key, value);
      }
    } catch (e) {
      console.error("Set global error:", e);
    }
  };

  const handleReset = async (targetMode: string) => {
    try {
      await profileReset(targetMode);
      setOverrides((prev) => ({ ...prev, [targetMode]: {} }));
    } catch (e) {
      console.error("Reset error:", e);
    }
  };

  const handleResetAll = async () => {
    try {
      await profileResetAll();
      setOverrides({ global: {}, handheld: {}, xr: {}, docked: {} });
    } catch (e) {
      console.error("Reset all error:", e);
    }
  };

  useEffect(() => {
    detect();
    loadOverrides();
    const interval = setInterval(detect, 5000);
    return () => clearInterval(interval);
  }, [autoSwitch]);

  return (
    <>
      {/* ── Current Mode ── */}
      <PanelSection title="Current Mode">
        <PanelSectionRow>
          <div style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            gap: "10px",
            padding: "8px",
            background: "linear-gradient(135deg, rgba(0,200,200,0.12), rgba(0,100,200,0.08))",
            borderRadius: "8px",
            border: "1px solid rgba(0,200,200,0.25)",
          }}>
            <span style={{ fontSize: "24px" }}>{MODE_ICONS[mode] || "❓"}</span>
            <div>
              <div style={{ fontSize: "14px", fontWeight: "bold", color: "#00c8c8" }}>
                {MODE_LABELS[mode] || mode}
              </div>
              {device && <div style={{ fontSize: "10px", color: "#667" }}>{device}</div>}
            </div>
            {applying && <span style={{ fontSize: "10px", color: "#ff0" }}>⏳</span>}
          </div>
        </PanelSectionRow>
      </PanelSection>

      {/* ── Active Profile (merged) ── */}
      {profile && (
        <PanelSection title="Active Profile (merged)">
          <PanelSectionRow>
            <div style={{
              padding: "6px 8px",
              background: "rgba(0,0,0,0.2)",
              borderRadius: "6px",
              fontFamily: "monospace",
            }}>
              <Stat label="TDP" value={`${profile.tdp}W`} />
              <Stat label="GPU" value={`${profile.gpu_clock}MHz`} />
              <Stat label="Refresh" value={`${profile.refresh_rate}Hz`} />
              <Stat label="Frame Limit" value={profile.frame_limit > 0 ? `${profile.frame_limit}fps` : "Off"} />
              <Stat label="FSR" value={profile.fsr ? "On" : "Off"} color={profile.fsr ? "#00c8c8" : "#666"} />
              <Stat
                label="LSFG"
                value={profile.lsfg_enabled ? `${profile.lsfg_multiplier}x / ${profile.lsfg_flow}%` : "Off"}
                color={profile.lsfg_enabled ? "#00c8c8" : "#666"}
              />
              <Stat label="Fan" value={profile.fan_profile} />
              {profile.force_resolution && <Stat label="Output" value={profile.force_resolution} />}
            </div>
          </PanelSectionRow>
        </PanelSection>
      )}

      {/* ── Quick Switch ── */}
      <PanelSection title="Switch Mode">
        <PanelSectionRow>
          <div style={{ display: "flex", gap: "6px" }}>
            {Object.keys(MODE_LABELS).map((m) => (
              <ButtonItem
                key={m}
                layout="below"
                onClick={() => applyMode(m)}
                disabled={applying}
                style={{
                  flex: 1,
                  minWidth: 0,
                  padding: "6px 2px",
                  fontSize: "11px",
                  textAlign: "center",
                  background: mode === m
                    ? "linear-gradient(135deg, rgba(0,200,200,0.3), rgba(0,100,200,0.2))"
                    : "rgba(255,255,255,0.05)",
                  border: mode === m ? "1px solid rgba(0,200,200,0.5)" : "1px solid rgba(255,255,255,0.08)",
                  borderRadius: "6px",
                  color: mode === m ? "#00c8c8" : "#8899aa",
                }}
              >
                {MODE_ICONS[m]} {MODE_LABELS[m]}
              </ButtonItem>
            ))}
          </div>
        </PanelSectionRow>
        <PanelSectionRow>
          <ToggleField
            label="Auto-Switch"
            description="Auto-detect display changes"
            checked={autoSwitch}
            onChange={setAutoSwitch}
          />
        </PanelSectionRow>
      </PanelSection>

      {/* ── Per-Mode Overrides ── */}
      <PanelSection title="Mode Overrides">
        {Object.keys(MODE_LABELS).map((m) => (
          <PanelSectionRow key={m}>
            {editMode === m ? (
              <div style={{ width: "100%" }}>
                <OverrideEditor
                  mode={m}
                  overrides={overrides[m] || {}}
                  onSet={(key, value) => handleSetOverride(m, key, value)}
                  onReset={() => { handleReset(m); setEditMode(null); }}
                />
                <ButtonItem layout="below" onClick={() => { applyMode(mode); setEditMode(null); }}>
                  ✅ Apply & Close
                </ButtonItem>
              </div>
            ) : (
              <ButtonItem
                layout="below"
                onClick={() => setEditMode(m)}
                description={
                  Object.keys(overrides[m] || {}).length > 0
                    ? `${Object.keys(overrides[m]).length} override(s)`
                    : "Base profile"
                }
                style={{
                  borderLeft: Object.keys(overrides[m] || {}).length > 0
                    ? "3px solid #00c8c8"
                    : "3px solid transparent",
                }}
              >
                {MODE_ICONS[m]} {MODE_LABELS[m]} Overrides
              </ButtonItem>
            )}
          </PanelSectionRow>
        ))}
      </PanelSection>

      {/* ── Global Overrides ── */}
      <PanelSection title="🌐 Global Overrides">
        <PanelSectionRow>
          <div style={{
            padding: "8px",
            background: "rgba(0,0,0,0.2)",
            borderRadius: "6px",
          }}>
            <div style={{ fontSize: "10px", color: "#667", marginBottom: "6px" }}>
              Applied to ALL modes before per-mode overrides
            </div>
            <SliderField
              label="Global TDP (W)"
              value={overrides.global?.tdp ?? -1}
              min={-1}
              max={30}
              step={1}
              description={overrides.global?.tdp != null ? `Override: ${overrides.global.tdp}W` : "Not set"}
              onChange={(v: number) => v === -1 ? handleSetGlobal("tdp", null) : handleSetGlobal("tdp", v)}
            />
            <ToggleField
              label="Global LSFG"
              checked={overrides.global?.lsfg_enabled ?? false}
              onChange={(v: boolean) => handleSetGlobal("lsfg_enabled", v)}
              description={overrides.global?.lsfg_enabled != null ? "Overridden globally" : "Not set"}
            />
            {Object.keys(overrides.global || {}).length > 0 && (
              <ButtonItem layout="below" onClick={() => handleReset("global")}>
                ✕ Clear Global Overrides
              </ButtonItem>
            )}
          </div>
        </PanelSectionRow>
      </PanelSection>

      {/* ── Reset All ── */}
      <PanelSection>
        <PanelSectionRow>
          <ButtonItem
            layout="below"
            onClick={handleResetAll}
            style={{ color: "#f66", fontSize: "11px" }}
          >
            🗑 Reset All Overrides
          </ButtonItem>
        </PanelSectionRow>
      </PanelSection>
    </>
  );
};

export default PlayModePanel;
