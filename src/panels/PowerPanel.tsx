import React, { useState, useEffect } from "react";
import {
  PanelSection,
  PanelSectionRow,
  SliderField,
  ButtonItem,
  Focusable,
} from "@decky/ui";
import { getTdp, setTdp, getGpuClock, setGpuClock, applyPowerPreset } from "../backend";
import { success, fail, info } from "../toast";

const PRESETS = [
  { key: "silent",      label: "🔇 Silent",      tdp: 5,  gpu: 400  },
  { key: "balanced",    label: "⚖️ Balanced",    tdp: 12, gpu: 1100 },
  { key: "performance", label: "🚀 Performance", tdp: 20, gpu: 1400 },
  { key: "max",         label: "💥 Max",          tdp: 30, gpu: 1600 },
];

const PowerPanel: React.FC = () => {
  const [tdp, setTdpVal] = useState(15);
  const [gpu, setGpuVal] = useState(1600);
  const [activePreset, setActivePreset] = useState("");

  const load = async () => {
    try {
      const tr = JSON.parse(await getTdp());
      if (tr.ok) setTdpVal(tr.value);
      const gr = JSON.parse(await getGpuClock());
      if (gr.ok) setGpuVal(gr.value);
    } catch {}
  };

  useEffect(() => { load(); }, []);

  const handleTdp = async (v: number) => {
    setTdpVal(v);
    setActivePreset("");
    try {
      const r = JSON.parse(await setTdp(v));
      if (r.ok) {
        const d = r.value;
        if (d.verified) {
          success(`TDP → ${d.actual}W ✓`);
        } else {
          info(`TDP requested ${d.requested}W, actual ${d.actual}W`);
        }
      } else { fail(`TDP: ${r.error}`); }
    } catch (e) { fail(`TDP error: ${e}`); }
  };

  const handleGpu = async (v: number) => {
    setGpuVal(v);
    setActivePreset("");
    try {
      const r = JSON.parse(await setGpuClock(v));
      if (r.ok) {
        success(`GPU → ${r.value.requested}MHz (active: ${r.value.actual}MHz)`);
      } else { fail(`GPU: ${r.error}`); }
    } catch (e) { fail(`GPU error: ${e}`); }
  };

  const handlePreset = async (key: string) => {
    setActivePreset(key);
    try {
      const r = JSON.parse(await applyPowerPreset(key));
      if (r.ok) {
        const d = r.value;
        setTdpVal(d.tdp);
        setGpuVal(d.gpu);
        const verify = d.tdp_verified ? "✓ verified" : `(actual: ${d.tdp_actual}W)`;
        success(`${key.toUpperCase()}: ${d.tdp}W / ${d.gpu}MHz ${verify}`);
      } else { fail(`Preset: ${r.error}`); }
    } catch (e) { fail(`Preset error: ${e}`); }
  };

  return (
    <>
      <PanelSection title="⚡ PowerShift">
        <PanelSectionRow>
          <SliderField
            label={`TDP: ${tdp}W`}
            value={tdp}
            min={3}
            max={30}
            step={1}
            onChange={handleTdp}
            notchCount={10}
            notchLabels={[
              { notchIndex: 0, label: "3W" },
              { notchIndex: 9, label: "30W" },
            ]}
          />
        </PanelSectionRow>
        <PanelSectionRow>
          <SliderField
            label={`GPU: ${gpu}MHz`}
            value={gpu}
            min={200}
            max={1600}
            step={100}
            onChange={handleGpu}
            notchCount={8}
            notchLabels={[
              { notchIndex: 0, label: "200" },
              { notchIndex: 7, label: "1600" },
            ]}
          />
        </PanelSectionRow>
      </PanelSection>

      <PanelSection title="Quick Presets">
        <Focusable style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
          {PRESETS.map((p) => (
            <Focusable
              key={p.key}
              focusWithin={false}
              onActivate={() => handlePreset(p.key)}
              style={{
                flex: "1 1 45%",
                padding: "10px 6px",
                textAlign: "center",
                borderRadius: 6,
                fontSize: 12,
                fontWeight: activePreset === p.key ? "bold" : "normal",
                background: activePreset === p.key
                  ? "linear-gradient(135deg, #00d4aa, #0088ff)"
                  : "#1a1a2e",
                color: activePreset === p.key ? "#000" : "#ccc",
                border: activePreset === p.key ? "2px solid #00d4aa" : "1px solid #333",
                cursor: "pointer",
              }}
            >
              {p.label}
            </Focusable>
          ))}
        </Focusable>
      </PanelSection>
    </>
  );
};

export default PowerPanel;
