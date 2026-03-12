import {
  PanelSection,
  PanelSectionRow,
  SliderField,
  ButtonItem,
  Focusable,
} from "@decky/ui";
import { callable } from "@decky/api";
import { useState, useEffect } from "react";
import { JBL, jblCard, jblHeader, jblHeaderTitle, jblHeaderSub, jblStatusBadge } from "../styles";

const setTdp = callable<[number], { success: boolean }>("set_tdp");
const setGpuClock = callable<[number], { success: boolean }>("set_gpu_clock");
const getTdp = callable<[], { success: boolean; tdp?: number }>("get_tdp");
const getGpuClock = callable<[], { success: boolean; gpu_clock?: number }>("get_gpu_clock");
const getGlobalSettings = callable<[], Record<string, any>>("get_global_settings");

interface PowerMode {
  label: string;
  emoji: string;
  tdp: number;
  gpu: number;
  color: string;
}

const MODES: PowerMode[] = [
  { label: "Battery", emoji: "🔋", tdp: 5, gpu: 600, color: JBL.green },
  { label: "Balanced", emoji: "⚖️", tdp: 10, gpu: 1100, color: JBL.cyan },
  { label: "Performance", emoji: "🚀", tdp: 15, gpu: 1400, color: JBL.amber },
  { label: "Turbo", emoji: "🔥", tdp: 25, gpu: 1600, color: JBL.red },
];

export const PowerShiftPanel = () => {
  const [tdp, setTdpVal] = useState(12);
  const [gpu, setGpuVal] = useState(1200);
  const [activeMode, setActiveMode] = useState<string | null>(null);
  const [status, setStatus] = useState("");
  const [statusColor, setStatusColor] = useState(JBL.cyan);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        const saved = await getGlobalSettings();
        if (saved) {
          if (saved.tdp !== undefined) setTdpVal(saved.tdp);
          if (saved.gpu_clock !== undefined) setGpuVal(saved.gpu_clock);
          const matched = MODES.find(m => m.tdp === saved.tdp && m.gpu === saved.gpu_clock);
          if (matched) setActiveMode(matched.label);
        }
      } catch {}
      setLoaded(true);
    })();
  }, []);

  const applyMode = async (mode: PowerMode) => {
    setActiveMode(mode.label);
    setTdpVal(mode.tdp);
    setGpuVal(mode.gpu);
    setStatus(`Applying ${mode.label}...`);
    setStatusColor(mode.color);
    try {
      await setTdp(mode.tdp);
      await setGpuClock(mode.gpu);
      setStatus(`✅ ${mode.label} active`);
    } catch {
      setStatus("❌ Failed to apply");
      setStatusColor(JBL.red);
    }
  };

  const applyManual = async () => {
    setActiveMode(null);
    setStatus("Applying custom...");
    setStatusColor(JBL.cyan);
    try {
      await setTdp(tdp);
      await setGpuClock(gpu);
      setStatus(`✅ TDP ${tdp}W / GPU ${gpu}MHz`);
      setStatusColor(JBL.green);
    } catch {
      setStatus("❌ Failed");
      setStatusColor(JBL.red);
    }
  };

  if (!loaded) return null;

  return (
    <Focusable>
      <PanelSection>
        <div style={jblCard}>
          <div style={jblHeader}>
            <div style={jblHeaderTitle}>⚡ PowerShift</div>
            <div style={jblHeaderSub}>Dynamic TDP & GPU control</div>
          </div>
          {status && (
            <div style={{ marginTop: "6px" }}>
              <span style={jblStatusBadge(statusColor)}>{status}</span>
            </div>
          )}
        </div>

        <div style={jblCard}>
          <div style={{ fontSize: "12px", fontWeight: 600, color: JBL.textPrimary, marginBottom: "8px" }}>Quick Presets</div>
          <Focusable style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "6px" }}>
            {MODES.map((mode) => (
              <Focusable
                key={mode.label}
                focusWithinClassName="gpfocuswithin"
                onActivate={() => applyMode(mode)}
                onClick={() => applyMode(mode)}
                style={{
                  padding: "10px 6px",
                  borderRadius: "8px",
                  textAlign: "center" as const,
                  cursor: "pointer",
                  background: activeMode === mode.label ? `${mode.color}25` : JBL.surfaceDark,
                  border: `1px solid ${activeMode === mode.label ? mode.color : JBL.cardBorder}`,
                  transition: "all 0.2s ease",
                }}
              >
                <div style={{ fontSize: "18px" }}>{mode.emoji}</div>
                <div style={{
                  fontSize: "11px",
                  fontWeight: 600,
                  color: activeMode === mode.label ? mode.color : JBL.textSecondary,
                  marginTop: "2px",
                }}>{mode.label}</div>
                <div style={{
                  fontSize: "9px",
                  color: JBL.textMuted,
                  marginTop: "1px",
                }}>{mode.tdp}W / {mode.gpu}MHz</div>
              </Focusable>
            ))}
          </Focusable>
        </div>

        <div style={{ ...jblCard, overflow: "hidden" }}>
          <div style={{ fontSize: "12px", fontWeight: 600, color: JBL.textPrimary, marginBottom: "8px" }}>Manual Control</div>
          <PanelSectionRow>
            <SliderField
              label="TDP (Watts)"
              value={tdp}
              min={3}
              max={30}
              step={1}
              onChange={setTdpVal}
              showValue
            />
          </PanelSectionRow>
          <PanelSectionRow>
            <SliderField
              label="GPU Clock (MHz)"
              value={gpu}
              min={200}
              max={1600}
              step={50}
              onChange={setGpuVal}
              showValue
            />
          </PanelSectionRow>
        </div>

        <PanelSectionRow>
          <ButtonItem layout="below" onClick={applyManual}>
            ✅ Apply Manual Settings
          </ButtonItem>
        </PanelSectionRow>
      </PanelSection>
    </Focusable>
  );
};
