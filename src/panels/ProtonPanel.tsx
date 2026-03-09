// ============================================================
// JBL — Proton Panel
// ============================================================
import { VFC, useState, useEffect } from "react";
import { PanelSection, PanelSectionRow, ButtonItem, ToggleField } from "decky-frontend-lib";

export const ProtonPanel: VFC<{ jbl: any }> = ({ jbl }) => {
  const { state, call, refresh } = jbl;
  const [releases, setReleases] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [installing, setInstalling] = useState<string | null>(null);
  const proton = state.proton;

  const fetchReleases = async () => {
    setLoading(true);
    const r = await call("get_proton_releases");
    setReleases(r || []);
    setLoading(false);
  };

  const install = async (release: any) => {
    setInstalling(release.name);
    await call("install_proton", { release });
    await refresh();
    setInstalling(null);
  };

  return (
    <>
      <PanelSection title="Installed Proton">
        <PanelSectionRow>
          {proton?.installed?.length > 0 ? (
            proton.installed.map((v: string) => (
              <div key={v} style={{
                padding: "4px 8px",
                background: "#1a2a1a",
                borderRadius: "4px",
                fontSize: "12px",
                color: "#4caf50",
                marginBottom: "4px"
              }}>
                ✅ {v}
              </div>
            ))
          ) : (
            <div style={{ color: "#aaa", fontSize: "12px" }}>No custom Proton installed</div>
          )}
        </PanelSectionRow>
      </PanelSection>

      <PanelSection title="Available Releases">
        <PanelSectionRow>
          <ButtonItem layout="below" onClick={fetchReleases} disabled={loading}>
            {loading ? "🔄 Fetching..." : "🔄 Check Latest Releases"}
          </ButtonItem>
        </PanelSectionRow>
        {releases.map(r => (
          <PanelSectionRow key={r.tag}>
            <div style={{
              background: "#1a1a1a",
              borderRadius: "6px",
              padding: "8px",
              marginBottom: "4px",
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center"
            }}>
              <div>
                <div style={{ fontWeight: "bold", fontSize: "12px" }}>{r.name}</div>
                <div style={{ color: "#aaa", fontSize: "11px" }}>{r.size_mb}MB</div>
              </div>
              <button
                onClick={() => install(r)}
                disabled={!!installing}
                style={{
                  padding: "4px 10px",
                  borderRadius: "4px",
                  border: "none",
                  cursor: "pointer",
                  background: installing === r.name ? "#555" : "#4caf50",
                  color: "#fff",
                  fontSize: "11px"
                }}
              >
                {installing === r.name ? "📦 Installing..." : "📦 Install"}
              </button>
            </div>
          </PanelSectionRow>
        ))}
      </PanelSection>
    </>
  );
};
