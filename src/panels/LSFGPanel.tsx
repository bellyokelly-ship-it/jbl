import React, { useState, useEffect } from "react";
import {
  PanelSection,
  PanelSectionRow,
  SliderField,
  ToggleField,
} from "@decky/ui";
import { getLsfg, setLsfg } from "../backend";
import { success, fail, info } from "../toast";

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
      if (r.ok) {
        const d = r.value;
        const conf = d.confirmed ? "✓ confirmed" : "⚠ check config";
        success(`LSFG ${en ? "ON" : "OFF"} — ${mul}x @ ${flow}% ${conf}`);
      } else {
        fail(`LSFG: ${r.error}`);
      }
    } catch (e) { fail(`LSFG error: ${e}`); }
  };

  return (
    <PanelSection title="🎞 LSFG Frame Gen">
      <PanelSectionRow>
        <ToggleField
          label="Enable LSFG-VK"
          checked={enabled}
          onChange={(v) => { setEnabled(v); apply(v, multiplier, flowRate); }}
        />
      </PanelSectionRow>
      <PanelSectionRow>
        <SliderField
          label={`Multiplier: ${multiplier}x`}
          value={multiplier}
          min={1}
          max={4}
          step={1}
          onChange={(v) => { setMultiplier(v); if (enabled) apply(enabled, v, flowRate); }}
        />
      </PanelSectionRow>
      <PanelSectionRow>
        <SliderField
          label={`Flow Rate: ${flowRate}%`}
          value={flowRate}
          min={10}
          max={100}
          step={10}
          onChange={(v) => { setFlowRate(v); if (enabled) apply(enabled, multiplier, v); }}
        />
      </PanelSectionRow>
      <PanelSectionRow>
        <div style={{ fontSize: 11, color: "#888", padding: "4px 0" }}>
          Writes to ~/.config/lsfg-vk/lsfg_vk.conf — changes apply on next game launch
        </div>
      </PanelSectionRow>
    </PanelSection>
  );
};

export default LSFGPanel;
