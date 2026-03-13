import React, { useState, useEffect, useRef, useCallback } from "react";
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
  const applyTimer = useRef<any>(null);

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

  const applyDebounced = useCallback((en: boolean, mul: number, flow: number) => {
    if (applyTimer.current) clearTimeout(applyTimer.current);
    applyTimer.current = setTimeout(async () => {
      try {
        const r = JSON.parse(await setLsfg(en, mul, flow));
        if (r.ok) {
          success(`LSFG ${en ? "ON" : "OFF"} — ${mul}x @ ${flow}% ${r.value.confirmed ? "✓" : ""}`);
        } else { fail(`LSFG: ${r.error}`); }
      } catch (e) { fail(`LSFG error: ${e}`); }
    }, 500);
  }, []);

  return (
    <PanelSection title="🎞 LSFG Frame Gen">
      <PanelSectionRow>
        <ToggleField
          label="Enable LSFG-VK"
          description={enabled ? "Active — changes apply on next game launch" : "Disabled"}
          checked={enabled}
          onChange={(v) => {
            setEnabled(v);
            applyDebounced(v, multiplier, flowRate);
          }}
        />
      </PanelSectionRow>
      <PanelSectionRow>
        <SliderField
          label={`Multiplier: ${multiplier}x`}
          value={multiplier}
          min={1}
          max={4}
          step={1}
          onChange={(v) => {
            setMultiplier(v);
            if (enabled) applyDebounced(enabled, v, flowRate);
          }}
        />
      </PanelSectionRow>
      <PanelSectionRow>
        <SliderField
          label={`Flow Rate: ${flowRate}%`}
          value={flowRate}
          min={10}
          max={100}
          step={5}
          onChange={(v) => {
            setFlowRate(v);
            if (enabled) applyDebounced(enabled, multiplier, v);
          }}
        />
      </PanelSectionRow>
      <PanelSectionRow>
        <div style={{ fontSize: 11, color: "#888", padding: "4px 0" }}>
          Reads/writes ~/.config/lsfg-vk/lsfg_vk.conf directly
        </div>
      </PanelSectionRow>
    </PanelSection>
  );
};

export default LSFGPanel;
