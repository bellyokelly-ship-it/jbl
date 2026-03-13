import React, { useState, useEffect, useRef, useCallback } from "react";
import {
  PanelSection,
  PanelSectionRow,
  SliderField,
  ButtonItem,
} from "@decky/ui";
import { getTdp, setTdp, getGpuClock, setGpuClock, applyPowerPreset } from "../backend";
import { success, fail } from "../toast";

const PRESETS = [
  { key: "silent",      label: "🔇 Silent (5W/400MHz)" },
  { key: "balanced",    label: "⚖️ Balanced (12W/1100MHz)" },
  { key: "performance", label: "🚀 Performance (20W/1400MHz)" },
  { key: "max",         label: "💥 Max (30W/1600MHz)" },
];

const PowerPanel: React.FC = () => {
  const [tdp, setTdpVal] = useState(15);
  const [gpu, setGpuVal] = useState(1600);
  const [activePreset, setActivePreset] = useState("");
  const tdpTimer = useRef<any>(null);
  const gpuTimer = useRef<any>(null);

  const load = async () => {
    try {
      const tr = ((v) => typeof v === "string" ? JSON.parse(v) : v)(await getTdp());
      if (tr.ok) setTdpVal(tr.value);
      const gr = ((v) => typeof v === "string" ? JSON.parse(v) : v)(await getGpuClock());
      if (gr.ok) setGpuVal(gr.value);
    } catch {}
  };

  useEffect(() => { load(); }, []);

  // Debounced TDP - only apply after 500ms of no changes
  const handleTdp = useCallback((v: number) => {
    setTdpVal(v);
    setActivePreset("");
    if (tdpTimer.current) clearTimeout(tdpTimer.current);
    tdpTimer.current = setTimeout(async () => {
      try {
        const r = ((v) => typeof v === "string" ? JSON.parse(v) : v)(await setTdp(v));
        if (r.ok) {
          success(`TDP → ${r.value.actual}W ${r.value.verified ? "✓" : ""}`);
        } else { fail(`TDP: ${r.error}`); }
      } catch (e) { fail(`TDP error: ${e}`); }
    }, 500);
  }, []);

  // Debounced GPU - only apply after 500ms of no changes
  const handleGpu = useCallback((v: number) => {
    setGpuVal(v);
    setActivePreset("");
    if (gpuTimer.current) clearTimeout(gpuTimer.current);
    gpuTimer.current = setTimeout(async () => {
      try {
        const r = ((v) => typeof v === "string" ? JSON.parse(v) : v)(await setGpuClock(v));
        if (r.ok) {
          success(`GPU → ${r.value.actual}MHz`);
        } else { fail(`GPU: ${r.error}`); }
      } catch (e) { fail(`GPU error: ${e}`); }
    }, 500);
  }, []);

  const handlePreset = async (key: string) => {
    setActivePreset(key);
    try {
      const r = ((v) => typeof v === "string" ? JSON.parse(v) : v)(await applyPowerPreset(key));
      if (r.ok) {
        const d = r.value;
        setTdpVal(d.tdp);
        setGpuVal(d.gpu);
        success(`${key.toUpperCase()}: ${d.tdp_actual}W / ${d.gpu_actual}MHz ${d.tdp_verified ? "✓" : ""}`);
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
        {PRESETS.map((p) => (
          <PanelSectionRow key={p.key}>
            <ButtonItem
              layout="below"
              onClick={() => handlePreset(p.key)}
              description={activePreset === p.key ? "✓ Active" : ""}
              style={activePreset === p.key ? {
                background: "linear-gradient(135deg, #00d4aa22, #0088ff22)",
                borderLeft: "3px solid #00d4aa"
              } : {}}
            >
              {p.label}
            </ButtonItem>
          </PanelSectionRow>
        ))}
      </PanelSection>
    </>
  );
};

export default PowerPanel;
