// ============================================================
// JBL — Analytics Panel
// ============================================================
import { VFC } from "react";
import { PanelSection, PanelSectionRow } from "decky-frontend-lib";

export const AnalyticsPanel: VFC<{ jbl: any }> = ({ jbl }) => {
  const { state } = jbl;
  const a = state.analytics;

  if (!a) return <div style={{ color: "#aaa", padding: "16px" }}>No analytics data yet.</div>;

  return (
    <PanelSection title="7-Day Summary">
      <PanelSectionRow>
        <div style={{ width: "100%" }}>
          {[
            ["Total Sessions", a.sessions],
            ["Total Hours", `${a.total_hours}h`],
            ["Avg FPS", `${a.avg_fps} fps`],
            ["Most Played", a.most_played || "—"],
          ].map(([label, value]) => (
            <div key={label as string} style={{
              display: "flex",
              justifyContent: "space-between",
              padding: "6px 0",
              borderBottom: "1px solid #333"
            }}>
              <span style={{ color: "#aaa", fontSize: "12px" }}>{label}</span>
              <span style={{ color: "#f5a623", fontSize: "12px", fontWeight: "bold" }}>{value}</span>
            </div>
          ))}
        </div>
      </PanelSectionRow>
    </PanelSection>
  );
};
