import { PanelSection, PanelSectionRow, SliderField, ButtonItem, ToggleField, Focusable } from "@decky/ui";
import { callable } from "@decky/api";
import { useState, useEffect } from "react";
import { JBL, jblCard, jblCardGlow, jblHeader, jblHeaderTitle, jblHeaderSub, jblStatusBadge } from "../styles";

const setLsfg = callable<[boolean, number, number], { success: boolean }>("set_lsfg");
const getLsfg = callable<[], { enabled: boolean; multiplier: number; flow_rate: number }>("get_lsfg");
const getGlobalSettings = callable<[], Record<string, any>>("get_global_settings");

interface LSFGPreset { label: string; emoji: string; multiplier: number; flow: number; color: string; }

const PRESETS: LSFGPreset[] = [
  { label: "Gentle", emoji: "W", multiplier: 2, flow: 30, color: JBL.green },
  { label: "Balanced", emoji: "B", multiplier: 2, flow: 50, color: JBL.cyan },
  { label: "Smooth", emoji: "S", multiplier: 3, flow: 50, color: JBL.amber },
  { label: "Ultra", emoji: "U", multiplier: 4, flow: 70, color: JBL.red },
];

export const LSFGPanel = () => {
  const [enabled, setEnabled] = useState(false);
  const [multiplier, setMultiplier] = useState(2);
  const [flowRate, setFlowRate] = useState(50);
  const [activePreset, setActivePreset] = useState<string | null>(null);
  const [status, setStatus] = useState("");
  const [statusColor, setStatusColor] = useState(JBL.cyan);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        const s = await getGlobalSettings();
        if (s) {
          if (s.lsfg_enabled !== undefined) setEnabled(s.lsfg_enabled);
          if (s.lsfg_multiplier !== undefined) setMultiplier(s.lsfg_multiplier);
          if (s.lsfg_flow_rate !== undefined) setFlowRate(s.lsfg_flow_rate);
        }
        const cur = await getLsfg();
        if (cur) {
          setEnabled(cur.enabled);
          setMultiplier(cur.multiplier);
          setFlowRate(cur.flow_rate);
          const matched = PRESETS.find(p => p.multiplier === cur.multiplier && p.flow === cur.flow_rate);
          if (matched) setActivePreset(matched.label);
        }
        setStatus("Ready");
        setStatusColor(JBL.green);
      } catch {
        setStatus("Load failed");
        setStatusColor(JBL.red);
      }
      setLoaded(true);
    })();
  }, []);

  const applyPreset = async (p: LSFGPreset) => {
    setActivePreset(p.label);
    setMultiplier(p.multiplier);
    setFlowRate(p.flow);
    setEnabled(true);
    setStatus("Applying " + p.label + "...");
    setStatusColor(JBL.cyan);
    try {
      await setLsfg(true, p.multiplier, p.flow);
      setStatus(p.emoji + " " + p.label + " active");
      setStatusColor(p.color);
    } catch {
      setStatus("Failed");
      setStatusColor(JBL.red);
    }
  };

  const applyManual = async () => {
    setActivePreset(null);
    setStatus("Applying...");
    setStatusColor(JBL.cyan);
    try {
      await setLsfg(enabled, multiplier, flowRate);
      setStatus("LSFG " + (enabled ? "ON" : "OFF") + " " + multiplier + "x @ " + flowRate + "%");
      setStatusColor(JBL.green);
    } catch {
      setStatus("Failed");
      setStatusColor(JBL.red);
    }
  };


  return (
    <div>
      <div style={jblCard}>
        <div style={jblHeader}>
          <span style={jblHeaderTitle}>LSFG Frame Gen</span>
          <span style={{...jblStatusBadge(JBL.cyan), background: enabled ? JBL.green + "22" : JBL.textMuted + "22", color: enabled ? JBL.green : JBL.textMuted}}>
            {enabled ? "ACTIVE" : "OFF"}
          </span>
        </div>
        <span style={jblHeaderSub}>Lossless Scaling frame generation</span>
      </div>
      <div style={jblCard}>
        <div style={{...jblHeader, marginBottom: "8px"}}><span style={jblHeaderTitle}>Quick Presets</span></div>
        <Focusable style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "8px" }}>
          {PRESETS.map(p => (
            <Focusable key={p.label} focusWithinClassName="gpfocus" onActivate={() => applyPreset(p)}
              style={{ background: activePreset === p.label ? p.color + "33" : JBL.surfaceDark, border: activePreset === p.label ? "1px solid " + p.color : "1px solid " + JBL.border, borderRadius: "8px", padding: "10px", textAlign: "center" as const, cursor: "pointer" }}>
              <div style={{ fontSize: "20px", marginBottom: "2px" }}>{p.emoji}</div>
              <div style={{ color: activePreset === p.label ? p.color : JBL.text, fontSize: "12px", fontWeight: 600 }}>{p.label}</div>
              <div style={{ color: JBL.textMuted, fontSize: "10px" }}>{p.multiplier}x / {p.flow}%</div>
            </Focusable>
          ))}
        </Focusable>
      </div>
      <PanelSection title="Manual Controls">
        <PanelSectionRow><ToggleField label="Enable LSFG" checked={enabled} onChange={v => setEnabled(v)} /></PanelSectionRow>
        <PanelSectionRow><SliderField label="Multiplier" value={multiplier} min={1} max={5} step={1} showValue notchCount={5} onChange={v => setMultiplier(v)} /></PanelSectionRow>
        <PanelSectionRow><SliderField label="Flow Rate %" value={flowRate} min={10} max={100} step={5} showValue onChange={v => setFlowRate(v)} /></PanelSectionRow>
        <PanelSectionRow><ButtonItem layout="below" onClick={applyManual}>Apply Manual Settings</ButtonItem></PanelSectionRow>
      </PanelSection>
      {status && <div style={{...jblCard, ...jblCardGlow, textAlign: "center" as const}}><span style={{...jblStatusBadge(JBL.cyan), background: statusColor + "22", color: statusColor}}>{status}</span></div>}
    </div>
  );
};
