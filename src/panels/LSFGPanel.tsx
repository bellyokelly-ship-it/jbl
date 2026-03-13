import React, { useState, useEffect } from "react";
import {
  PanelSection,
  PanelSectionRow,
  SliderField,
  ToggleField,
} from "@decky/ui";
import { getLsfg, setLsfg } from "../backend";
import { success, fail } from "../toast";

const LSFGPanel: React.FC = () => {
  const [enabled, setEnabled] = useState(false);
  const [multiplier, setMultiplier] = useState(2);
  const [flowRate, setFlowRate] = useState(50);

  useEffect(() => {
    (async () => {
      try {
        const r = JSON.parse(await getLsfg());
        if (r.ok) {
          setEnabled(r.value.enabled);
          setMultiplier(r.value.multiplier);
          setFlowRate(r.value.flow_rate);
        }
      } catch {}
    })();
  }, []);

  const apply = async (en: boolean, mul: number, flow: number) => {
    try {
      const r = JSON.parse(await setLsfg(en, mul, flow));
      r.ok ? success(`LSFG ${en ? "ON" : "OFF"} — ${mul}x @ ${flow}%`) : fail(`LSFG: ${r.error}`);
    } catch (e) { fail(`LSFG error: ${e}`); }
  };

  return (
    <PanelSection title="🎞️ LSFG Frame Gen">
      <PanelSectionRow>
        <ToggleField
          label="Enable LSFG"
          checked={enabled}
          onChange={(v) => { setEnabled(v); apply(v, multiplier, flowRate); }}
        />
      </PanelSectionRow>
      <PanelSectionRow>
        <SliderField
          label="Multiplier"
          value={multiplier}
          min={1}
          max={4}
          step={1}
          onChange={(v) => { setMultiplier(v); if (enabled) apply(enabled, v, flowRate); }}
          showValue
        />
      </PanelSectionRow>
      <PanelSectionRow>
        <SliderField
          label="Flow Rate (%)"
          value={flowRate}
          min={10}
          max={100}
          step={5}
          onChange={(v) => { setFlowRate(v); if (enabled) apply(enabled, multiplier, v); }}
          showValue
        />
      </PanelSectionRow>
    </PanelSection>
  );
};

export default LSFGPanel;
