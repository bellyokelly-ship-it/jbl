import React, { useState, useEffect } from "react";
import {
  PanelSection,
  PanelSectionRow,
  SliderField,
  ButtonItem,
  DropdownItem,
} from "@decky/ui";
import { getTdp, setTdp, getGpuClock, setGpuClock, applyPowerPreset } from "../backend";
import { success, fail } from "../toast";

const PRESETS = [
  { label: "Silent (8W)", data: "silent" },
  { label: "Balanced (12W)", data: "balanced" },
  { label: "Performance (15W)", data: "performance" },
  { label: "Max (25W)", data: "max" },
];

const PowerPanel: React.FC = () => {
  const [tdp, setTdpVal] = useState(15);
  const [gpu, setGpuVal] = useState(1600);

  const load = async () => {
    try {
      const t = JSON.parse(await getTdp());
      if (t.ok) setTdpVal(t.value);
    } catch {}
    try {
      const g = JSON.parse(await getGpuClock());
      if (g.ok) setGpuVal(g.value);
    } catch {}
  };

  useEffect(() => { load(); }, []);

  const doSetTdp = async (v: number) => {
    setTdpVal(v);
    try {
      const r = JSON.parse(await setTdp(v));
      r.ok ? success(`TDP set to ${v}W`) : fail(`TDP failed: ${r.error}`);
    } catch (e) { fail(`TDP error: ${e}`); }
  };

  const doSetGpu = async (v: number) => {
    setGpuVal(v);
    try {
      const r = JSON.parse(await setGpuClock(v));
      r.ok ? success(`GPU clock set to ${v}MHz`) : fail(`GPU failed: ${r.error}`);
    } catch (e) { fail(`GPU error: ${e}`); }
  };

  const doPreset = async (preset: string) => {
    try {
      const r = JSON.parse(await applyPowerPreset(preset));
      if (r.ok) { success(`Preset: ${preset}`); load(); }
      else fail(`Preset failed: ${r.error}`);
    } catch (e) { fail(`Preset error: ${e}`); }
  };

  return (
    <>
      <PanelSection title="⚡ PowerShift">
        <PanelSectionRow>
          <SliderField
            label="TDP (Watts)"
            value={tdp}
            min={3}
            max={30}
            step={1}
            onChange={doSetTdp}
            showValue
          />
        </PanelSectionRow>
        <PanelSectionRow>
          <SliderField
            label="GPU Clock (MHz)"
            value={gpu}
            min={200}
            max={2500}
            step={50}
            onChange={doSetGpu}
            showValue
          />
        </PanelSectionRow>
      </PanelSection>
      <PanelSection title="Quick Presets">
        <PanelSectionRow>
          <DropdownItem
            label="Apply Preset"
            rgOptions={PRESETS}
            selectedOption={null}
            onChange={(v) => doPreset(v.data)}
          />
        </PanelSectionRow>
      </PanelSection>
    </>
  );
};

export default PowerPanel;
