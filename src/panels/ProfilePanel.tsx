// ============================================================
// JBL — Profile Panel
// ============================================================
import { VFC, useState, useEffect } from "react";
import { PanelSection, PanelSectionRow, ButtonItem } from "decky-frontend-lib";

export const ProfilePanel: VFC<{ jbl: any }> = ({ jbl }) => {
  const { call } = jbl;
  const [profiles, setProfiles] = useState<any>({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    call("get_all_profiles").then((p: any) => {
      setProfiles(p || {});
      setLoading(false);
    });
  }, []);

  const keys = Object.keys(profiles);

  return (
    <PanelSection title="Game Profiles">
      <PanelSectionRow>
        {loading ? (
          <div style={{ color: "#aaa" }}>Loading profiles...</div>
        ) : keys.length === 0 ? (
          <div style={{ color: "#aaa", fontSize: "12px" }}>
            No profiles saved yet.<br/>Launch games to auto-generate profiles!
          </div>
        ) : (
          <div style={{ width: "100%" }}>
            {keys.map(appId => {
              const p = profiles[appId];
              return (
                <div key={appId} style={{
                  background: "#1a1a1a",
                  borderRadius: "6px",
                  padding: "8px",
                  marginBottom: "6px"
                }}>
                  <div style={{ fontWeight: "bold", marginBottom: "4px", fontSize: "12px" }}>
                    App {appId}
                    <span style={{
                      marginLeft: "8px",
                      fontSize: "10px",
                      color: p.source === "community" ? "#00bcd4" :
                             p.source === "ai_learned" ? "#f5a623" : "#aaa"
                    }}>
                      [{p.source || "default"}]
                    </span>
                  </div>
                  <div style={{ fontSize: "11px", color: "#aaa" }}>
                    TDP: {p.tdp}W | GPU: {p.gpu_clock}MHz |
                    LSFG: {p.lsfg_multiplier}x @ {p.lsfg_flow_rate}% |
                    Sessions: {p.session_count || 0}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </PanelSectionRow>
    </PanelSection>
  );
};
