import {
  PanelSection,
  PanelSectionRow,
  SliderField,
  ButtonItem,
  Field,
} from "@decky/ui";
import { callable } from "@decky/api";
import { useState, useEffect } from "react";

const setTdp = callable<[number], { success: boolean }>("set_tdp");
const setGpuClock = callable<[number], { success: boolean }>("set_gpu_clock");
const getTdp = callable<[], { success: boolean; tdp?: number }>("get_tdp");
const getGpuClock = callable<[], { success: boolean; gpu_clock?: number }>("get_gpu_clock");

interface PowerMode {
  label: string;
  emoji: string;
  tdp: number;
  gpu: number;
}

const MODES: PowerMode[] = [
  { label: "Battery", emoji: "\ud83d\udd0b", tdp: 5, gpu: 600 },
  { label: "Balanced", emoji: "\u2696\ufe0f", tdp: 10, gpu: 1100 },
  { label: "Performance", emoji: "\ud83d\ude80", tdp: 15, gpu: 1400 },
  { label: "Turbo", emoji: "\ud83d\udd25", tdp: 25, gpu: 1600 },
];

export const PowerShiftPanel = () => {
  const [tdp, setTdpVal] = useState(12);
  const [gpu, setGpuVal] = useState(1200);
  const [activeMode, setActiveMode] = useState<string | null>(null);
  const [status, setStatus] = useState("");

  useEffect(() => {
    (async () => {
      const t = await getTdp();
      const g = await getGpuClock();
      if (t.tdp) setTdpVal(t.tdp);
      if (g.gpu_clock) setGpuVal(g.gpu_clock);
    })();
  }, []);

  const applyMode = async (mode: PowerMode) => {
    setTdpVal(mode.tdp);
    setGpuVal(mode.gpu);
    setActiveMode(mode.label);
    const tRes = await setTdp(mode.tdp);
    const gRes = await setGpuClock(mode.gpu);
    setStatus(tRes.success && gRes.success ? mode.label + " applied" : "Failed");
  };

  const applyManual = async () => {
    setActiveMode(null);
    const tRes = await setTdp(tdp);
    const gRes = await setGpuClock(gpu);
    setStatus(tRes.success && gRes.success ? "TDP " + tdp + "W / GPU " + gpu + "MHz" : "Failed");
  };

  return (
    <PanelSection>
      <PanelSectionRow>
        <Field
          label="Quick Presets"
          description={activeMode ? "Active: " + activeMode : "Select a power profile"}
          bottomSeparator="standard"
          focusable={false}
        />
      </PanelSectionRow>

      {MODES.map((mode) => (
        <PanelSectionRow key={mode.label}>
          <ButtonItem
            layout="below"
            onClick={() => applyMode(mode)}
            description={mode.tdp + "W TDP / " + mode.gpu + "MHz GPU"}
          >
            {activeMode === mode.label ? "> " : ""}{mode.emoji} {mode.label}
          </ButtonItem>
        </PanelSectionRow>
      ))}

      <PanelSectionRow>
        <SliderField
          label="TDP (Watts)"
          value={tdp}
          min={3}
          max={30}
          step={1}
          onChange={(val) => setTdpVal(val)}
          notchCount={10}
          notchLabels={[
            { notchIndex: 0, label: "3W" },
            { notchIndex: 9, label: "30W" },
          ]}
          showValue
        />
      </PanelSectionRow>

      <PanelSectionRow>
        <SliderField
          label="GPU Clock (MHz)"
          value={gpu}
          min={200}
          max={1600}
          step={100}
          onChange={(val) => setGpuVal(val)}
          notchCount={8}
          notchLabels={[
            { notchIndex: 0, label: "200" },
            { notchIndex: 7, label: "1600" },
          ]}
          showValue
        />
      </PanelSectionRow>

      <PanelSectionRow>
        <ButtonItem layout="below" onClick={applyManual}>
          Apply Manual Settings
        </ButtonItem>
      </PanelSectionRow>

      {status && (
        <PanelSectionRow>
          <Field label="Status" focusable={false}>
            <span style={{ color: "#1a9fff", fontSize: "12px" }}>{status}</span>
          </Field>
        </PanelSectionRow>
      )}
    </PanelSection>
  );
};
