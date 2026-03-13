import React, { useState } from "react";
import {
  PanelSection,
  PanelSectionRow,
  ButtonItem,
  ToggleField,
} from "@decky/ui";
import { scanProtonAdvisor, getSettings, saveSettings } from "../backend";
import { success, fail, info } from "../toast";

const AutoOptimisePanel: React.FC = () => {
  const [scanning, setScanning] = useState(false);
  const [results, setResults] = useState<string[]>([]);
  const [autoApply, setAutoApply] = useState(false);

  const doScan = async () => {
    setScanning(true);
    info("Scanning game library...");
    try {
      const r = JSON.parse(await scanProtonAdvisor());
      if (r.ok) {
        setResults(r.value || []);
        success(`Scan complete: ${(r.value || []).length} suggestions`);
      } else fail(r.error);
    } catch (e) { fail(`Scan error: ${e}`); }
    setScanning(false);
  };

  const toggleAuto = async (v: boolean) => {
    setAutoApply(v);
    try {
      const curr = JSON.parse(await getSettings());
      const s = curr.ok ? curr.value : {};
      s.auto_optimise = v;
      const r = JSON.parse(await saveSettings(JSON.stringify(s)));
      r.ok ? success(`Auto-optimise ${v ? "ON" : "OFF"}`) : fail(r.error);
    } catch (e) { fail(`Settings error: ${e}`); }
  };

  return (
    <>
      <PanelSection title="🤖 Auto-Optimise">
        <PanelSectionRow>
          <ToggleField
            label="Auto-apply on game launch"
            checked={autoApply}
            onChange={toggleAuto}
          />
        </PanelSectionRow>
        <PanelSectionRow>
          <ButtonItem layout="below" onClick={doScan} disabled={scanning}>
            {scanning ? "Scanning..." : "Scan Library"}
          </ButtonItem>
        </PanelSectionRow>
      </PanelSection>
      {results.length > 0 && (
        <PanelSection title="Suggestions">
          {results.map((r, i) => (
            <PanelSectionRow key={i}>
              <div style={{ color: "#ccc", fontSize: 12 }}>💡 {r}</div>
            </PanelSectionRow>
          ))}
        </PanelSection>
      )}
    </>
  );
};

export default AutoOptimisePanel;
