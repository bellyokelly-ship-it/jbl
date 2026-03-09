// ============================================================
// JBL — Status Panel
// ============================================================
import { VFC } from "react";
import { PanelSection, PanelSectionRow } from "decky-frontend-lib";

const Stat: VFC<{ label: string; value: string; color?: string }> = ({ label, value, color }) => (
  <div style={{ display: "flex", justifyContent: "space-between", padding: "4px 0", borderBottom: "1px solid #333" }}>
    <span style={{ color: "#aaa", fontSize: "12px" }}>{label}</span>
    <span style={{ color: color || "#fff", fontSize: "12px", fontWeight: "bold" }}>{value}</span>
  </div>
);

const stateColor = (s: string) => ({
  normal: "#4caf50", warning: "#ff9800", danger: "#f44336", critical: "#9c27b0"
}[s] || "#fff");

export const StatusPanel: VFC<{ jbl: any }> = ({ jbl }) => {
  const { state } = jbl;
  if (state.loading) return <div style={{ color: "#aaa", padding: "16px", textAlign: "center" }}>Loading...</div>;

  return (
    <PanelSection title="System Status">
      <PanelSectionRow>
        <div style={{ width: "100%" }}>
          {state.thermal && <>
            <Stat label="CPU Temp" value={`${state.thermal.cpu_temp?.toFixed(1)}°C`}
              color={stateColor(state.thermal.state)} />
            <Stat label="GPU Temp" value={`${state.thermal.gpu_temp?.toFixed(1)}°C`}
              color={stateColor(state.thermal.state)} />
            <Stat label="Thermal State" value={state.thermal.state?.toUpperCase()}
              color={stateColor(state.thermal.state)} />
          </>}
          {state.battery && <>
            <Stat label="Battery" value={`${state.battery.percent}%`}
              color={state.battery.percent < 20 ? "#f44336" : "#4caf50"} />
            <Stat label="Power Draw" value={`${state.battery.watts_draw?.toFixed(1)}W`} />
            <Stat label="Est. Runtime" value={`${state.battery.estimated_runtime_h?.toFixed(1)}h`} />
            <Stat label="Arc Status" value={state.battery.arc_recommendation?.message || "—"} />
          </>}
          {state.powershift && <>
            <Stat label="PowerShift Mode" value={state.powershift.mode?.toUpperCase()}
              color="#f5a623" />
            <Stat label="Context" value={state.powershift.context?.toUpperCase()} />
            <Stat label="TDP" value={`${state.powershift.profile?.tdp || "—"}W`} />
          </>}
          {state.lsfg && <>
            <Stat label="LSFG" value={state.lsfg.enabled ? "ENABLED" : "DISABLED"}
              color={state.lsfg.enabled ? "#4caf50" : "#f44336"} />
            <Stat label="Multiplier" value={`${state.lsfg.multiplier}x`} color="#00bcd4" />
            <Stat label="Flow Rate" value={`${state.lsfg.flow_rate}%`} color="#00bcd4" />
          </>}
        </div>
      </PanelSectionRow>
    </PanelSection>
  );
};
