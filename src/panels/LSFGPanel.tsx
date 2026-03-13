import React from "react";
import { useState, useEffect, FC } from "react";
import {
  PanelSection,
  PanelSectionRow,
  SliderField,
  ToggleField,
} from "@decky/ui";
import { getLsfg, setLsfg } from "../backend";

export const LSFGPanel: FC = () => {
  const [enabled, setEnabled] = useState(false);
  const [multiplier, setMultiplier] = useState(2);
  const [flowRate, setFlowRate] = useState(50);
  const [status, setStatus] = useState("");

  const refresh = async () => {
    try {
      const raw = await getLsfg();
      const d = JSON.parse(raw);
      setEnabled(d.enabled);
      setMultiplier(d.multiplier);
      setFlowRate(d.flow_rate);
    } catch (e) {
      setStatus("Failed to read LSFG config");
    }
  };

  useEffect(() => { refresh(); }, []);

  const apply = async (en: boolean, mult: number, flow: number) => {
    await setLsfg(en, mult, flow);
    setStatus(en ? `LSFG: ${mult}x @ ${flow}%` : "LSFG: Off");
  };

  return (
    <PanelSection title="🎞️ LSFG Frame Gen">
      <PanelSectionRow>
        <ToggleField
          label="Enable LSFG"
          checked={enabled}
          onChange={(val) => {
            setEnabled(val);
            apply(val, multiplier, flowRate);
          }}
        />
      </PanelSectionRow>
      <PanelSectionRow>
        <SliderField
          label={`Multiplier: ${multiplier}x`}
          value={multiplier}
          min={2}
          max={4}
          step={1}
          onChange={(val) => {
            setMultiplier(val);
            if (enabled) apply(enabled, val, flowRate);
          }}
        />
      </PanelSectionRow>
      <PanelSectionRow>
        <SliderField
          label={`Flow Rate: ${flowRate}%`}
          value={flowRate}
          min={0}
          max={100}
          step={5}
          onChange={(val) => {
            setFlowRate(val);
            if (enabled) apply(enabled, multiplier, val);
          }}
        />
      </PanelSectionRow>
      {status && (
        <PanelSectionRow>
          <div style={{ textAlign: "center", color: "#1a9fff", fontSize: "12px" }}>
            {status}
          </div>
        </PanelSectionRow>
      )}
    </PanelSection>
  );
};
