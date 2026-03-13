import React from "react";
import { useState, useEffect, FC } from "react";
import {
  PanelSection,
  PanelSectionRow,
  SliderField,
  ButtonItem,
} from "@decky/ui";
import { getTdp, setTdp, getGpuClock, setGpuClock, applyPowerPreset } from "../backend";

export const PowerShiftPanel: FC = () => {
  const [tdp, setTdpVal] = useState(15);
  const [gpu, setGpuVal] = useState(1600);
  const [status, setStatus] = useState("");

  const refresh = async () => {
    try {
      const t = await getTdp();
      setTdpVal(t);
      const g = await getGpuClock();
      setGpuVal(g);
    } catch (e) {
      setStatus("Failed to read power values");
    }
  };

  useEffect(() => { refresh(); }, []);

  const handleTdp = async (val: number) => {
    setTdpVal(val);
    await setTdp(val);
    setStatus(`TDP: ${val}W`);
  };

  const handleGpu = async (val: number) => {
    setGpuVal(val);
    await setGpuClock(val);
    setStatus(`GPU: ${val}MHz`);
  };

  const handlePreset = async (preset: string) => {
    try {
      const raw = await applyPowerPreset(preset);
      const p = ((v) => typeof v === "string" ? JSON.parse(v) : v)(raw);
      setTdpVal(p.tdp);
      setGpuVal(p.gpu);
      setStatus(`Preset: ${preset}`);
    } catch {
      setStatus(`Applied ${preset}`);
    }
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
          />
        </PanelSectionRow>
        <PanelSectionRow>
          <SliderField
            label={`GPU: ${gpu}MHz`}
            value={gpu}
            min={200}
            max={1600}
            step={50}
            onChange={handleGpu}
          />
        </PanelSectionRow>
      </PanelSection>
      <PanelSection title="Quick Presets">
        <PanelSectionRow>
          <ButtonItem layout="below" onClick={() => handlePreset("silent")}>
            🔇 Silent (5W)
          </ButtonItem>
        </PanelSectionRow>
        <PanelSectionRow>
          <ButtonItem layout="below" onClick={() => handlePreset("balanced")}>
            ⚖️ Balanced (12W)
          </ButtonItem>
        </PanelSectionRow>
        <PanelSectionRow>
          <ButtonItem layout="below" onClick={() => handlePreset("performance")}>
            🚀 Performance (20W)
          </ButtonItem>
        </PanelSectionRow>
        <PanelSectionRow>
          <ButtonItem layout="below" onClick={() => handlePreset("max")}>
            🔥 Max (30W)
          </ButtonItem>
        </PanelSectionRow>
        {status && (
          <PanelSectionRow>
            <div style={{ textAlign: "center", color: "#1a9fff", fontSize: "12px" }}>
              {status}
            </div>
          </PanelSectionRow>
        )}
      </PanelSection>
    </>
  );
};
