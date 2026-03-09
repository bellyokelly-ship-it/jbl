// ============================================================
// JBL — Community Panel
// ============================================================
import { VFC, useState } from "react";
import { PanelSection, PanelSectionRow, ButtonItem, TextField } from "decky-frontend-lib";

export const CommunityPanel: VFC<{ jbl: any }> = ({ jbl }) => {
  const { call } = jbl;
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<any[]>([]);
  const [searching, setSearching] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [status, setStatus] = useState("");

  const search = async () => {
    if (!query.trim()) return;
    setSearching(true);
    const res = await call("search_community_profiles", { query });
    setResults(res || []);
    setSearching(false);
  };

  const syncAll = async () => {
    setSyncing(true);
    setStatus("Syncing community profiles...");
    await call("sync_community_profiles");
    setStatus("✅ Sync complete!");
    setSyncing(false);
  };

  return (
    <>
      <PanelSection title="Community Sync">
        <PanelSectionRow>
          <ButtonItem layout="below" onClick={syncAll} disabled={syncing}>
            {syncing ? "🔄 Syncing..." : "🌐 Sync All Profiles"}
          </ButtonItem>
        </PanelSectionRow>
        {status && (
          <PanelSectionRow>
            <div style={{ fontSize: "12px", color: "#4caf50" }}>{status}</div>
          </PanelSectionRow>
        )}
      </PanelSection>

      <PanelSection title="Search Profiles">
        <PanelSectionRow>
          <TextField
            label="Game name or App ID"
            value={query}
            onChange={e => setQuery(e.target.value)}
          />
        </PanelSectionRow>
        <PanelSectionRow>
          <ButtonItem layout="below" onClick={search} disabled={searching}>
            {searching ? "🔍 Searching..." : "🔍 Search"}
          </ButtonItem>
        </PanelSectionRow>
        {results.length > 0 && results.map((r, i) => (
          <PanelSectionRow key={i}>
            <div style={{
              background: "#1a1a1a",
              borderRadius: "6px",
              padding: "8px",
              fontSize: "12px"
            }}>
              <div style={{ fontWeight: "bold" }}>{r.app_name || `App ${r.app_id}`}</div>
              <div style={{ color: "#aaa", fontSize: "11px" }}>
                TDP: {r.profile?.tdp}W | LSFG: {r.profile?.lsfg_multiplier}x |
                Rating: {"⭐".repeat(r.rating || 0)}
              </div>
            </div>
          </PanelSectionRow>
        ))}
      </PanelSection>
    </>
  );
};
