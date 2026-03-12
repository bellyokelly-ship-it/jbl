import {
  PanelSection,
  PanelSectionRow,
  SliderField,
  ToggleField,
  ButtonItem,
  Field,
} from "@decky/ui";
import { callable } from "@decky/api";
import { useState, useEffect } from "react";

const getLsfg = callable<[], { enabled: boolean; multiplier: number; flow_rate: number }>("get_lsfg");
const setLsfg = callable<[boolean, number, number], { success: boolean }>("set_lsfg");

export const LSFGPanel = () => {
  const [enabled, setEnabled] = useState(false);
  const [multiplier, setMultiplier] = useState(2);
  const [flowRate, setFlowRate] = useState(50);
  const [status, setStatus] = useState("");

  useEffect(() => {
    (async () => {
      const data = await getLsfg();
      if (data) {
        setEnabled(data.enabled);
        setMultiplier(data.multiplier);
        setFlowRate(data.flow_rate);
      }
    })();
  }, []);

  const apply = async () => {
    const res = await setLsfg(enabled, multiplier, flowRate);
    setStatus(res.success
      ? (enabled ? "LSFG " + multiplier + "x @ " + flowRate + "% applied" : "LSFG disabled")
      : "Failed to apply"
    );
  };

  return (
    <div>
      <PanelSection title="LSFG-VK Frame Generation">
        <PanelSectionRow>
          <ToggleField
            label="Enable LSFG"
            checked={enabled}
            onChange={(val) => setEnabled(val)}
          />
        </PanelSectionRow>
        <PanelSectionRow>
          <SliderField
            label="Frame Multiplier"
            value={multiplier}
            min={1}
            max={4}
            step={1}
            showValue={true}
            valueSuffix="x"
            notchCount={4}
            notchLabels={[
              { notchIndex: 0, label: "1x", value: 1 },
              { notchIndex: 1, label: "2x", value: 2 },
              { notchIndex: 2, label: "3x", value: 3 },
              { notchIndex: 3, label: "4x", value: 4 },
            ]}
            notchTicksVisible={true}
            disabled={!enabled}
            onChange={(val: number) => setMultiplier(val)}
          />
        </PanelSectionRow>
        <PanelSectionRow>
          <SliderField
            label="Flow Rate"
            value={flowRate}
            min={0}
            max={100}
            step={5}
            showValue={true}
            valueSuffix="%"
            disabled={!enabled}
            onChange={(val: number) => setFlowRate(val)}
          />
        </PanelSectionRow>
        <PanelSectionRow>
          <ButtonItem layout="below" onClick={apply}>
            Apply LSFG Settings
          </ButtonItem>
        </PanelSectionRow>
      </PanelSection>

      {status && (
        <PanelSection>
          <PanelSectionRow>
            <Field label="Status" focusable={true}>
              {status}
            </Field>
          </PanelSectionRow>
        </PanelSection>
      )}
    </div>
  );
};
