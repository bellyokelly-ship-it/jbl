// ============================================================
// JBL — Health Panel
// ============================================================
import { VFC, useState } from "react";
import { PanelSection, PanelSectionRow, ButtonItem } from "decky-frontend-lib";

export const HealthPanel: VFC<{ jbl: any }> = ({ jbl }) => {
  const { call } = jbl;
  const [diag, setDiag] = useState<any>(null);
  const [running, setRunning] = useState(false);

  const run = async () => {
    setRunning(true);
    const result = await call("run_diagnostics");
    setDiag(result);
    setRunning(false);
  };

  const statusIcon = (ok: boolean) => ok ? "✅" : "❌";

  return (
    <>
      <PanelSection title="Diagnostics">
        <PanelSectionRow>
          <ButtonItem layout="below" onClick={run} disabled={running}>
            {running ? "🩺 Running diagnostics..." : "🩺 Run Diagnostics"}
          </ButtonItem>
        </PanelSectionRow>
      </PanelSection>

      {diag && (
        <PanelSection title="Results">
          <PanelSectionRow>
            <div style={{ width: "100%", fontSize: "12px" }}>
              {Object.entries(diag).map(([key, val]: [string, any]) => (
                <div key={key} style={{
                  display: "flex",
                  justifyContent: "space-between",
                  padding: "4px 0",
                  borderBottom: "1px solid #333"
                }}>
                  <span style={{ color: "#aaa" }}>{key}</span>
                  <span style={{ color: val?.ok ? "#4caf50" : "#f44336" }}>
                    {statusIcon(val?.ok)} {val?.message || String(val)}
                  </span>
                </div>
              ))}
            </div>
          </PanelSectionRow>
        </PanelSection>
      )}
    </>
  );
};
