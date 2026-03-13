import React from "react";
import { useState, useEffect, FC } from "react";
import {
  PanelSection,
  PanelSectionRow,
  ButtonItem,
} from "@decky/ui";
import {
  getProtonVersions,
  fetchProtonReleases,
  installProton,
  removeProton,
  scanProtonAdvisor,
  applyProtonOverride,
} from "../backend";

const TIER_COLORS: Record<string, string> = {
  platinum: "#b4c7dc",
  gold: "#cfb53b",
  silver: "#c0c0c0",
  bronze: "#cd7f32",
  borked: "#ff4444",
  unknown: "#888888",
};

export const ProtonPanel: FC = () => {
  const [tab, setTab] = useState<"installed" | "available" | "advisor">("installed");
  const [installed, setInstalled] = useState<string[]>([]);
  const [releases, setReleases] = useState<any[]>([]);
  const [games, setGames] = useState<any[]>([]);
  const [status, setStatus] = useState("");
  const [loading, setLoading] = useState(false);

  const refreshInstalled = async () => {
    try {
      const raw = await getProtonVersions();
      setInstalled(JSON.parse(raw));
    } catch {
      setStatus("Failed to read Proton versions");
    }
  };

  const refreshReleases = async () => {
    setLoading(true);
    try {
      const raw = await fetchProtonReleases(5);
      setReleases(JSON.parse(raw));
    } catch {
      setStatus("Failed to fetch releases");
    }
    setLoading(false);
  };

  const refreshAdvisor = async () => {
    setLoading(true);
    setStatus("Scanning games...");
    try {
      const raw = await scanProtonAdvisor();
      setGames(JSON.parse(raw));
      setStatus(`Found ${JSON.parse(raw).length} games`);
    } catch {
      setStatus("Scan failed");
    }
    setLoading(false);
  };

  useEffect(() => { refreshInstalled(); }, []);

  const handleInstall = async (url: string, tag: string) => {
    setLoading(true);
    setStatus(`Installing ${tag}...`);
    try {
      const raw = await installProton(url, tag);
      const r = JSON.parse(raw);
      setStatus(r.message);
      await refreshInstalled();
      await refreshReleases();
    } catch {
      setStatus(`Install failed`);
    }
    setLoading(false);
  };

  const handleRemove = async (name: string) => {
    setStatus(`Removing ${name}...`);
    try {
      const raw = await removeProton(name);
      const r = JSON.parse(raw);
      setStatus(r.message);
      await refreshInstalled();
    } catch {
      setStatus("Remove failed");
    }
  };

  return (
    <>
      <PanelSection title="🍷 Proton Manager">
        <PanelSectionRow>
          <div style={{ display: "flex", gap: "8px", justifyContent: "center" }}>
            <span
              onClick={() => { setTab("installed"); refreshInstalled(); }}
              style={{
                cursor: "pointer", padding: "4px 12px", borderRadius: "4px",
                background: tab === "installed" ? "#1a9fff" : "#333", color: "#fff", fontSize: "13px"
              }}
            >Installed</span>
            <span
              onClick={() => { setTab("available"); refreshReleases(); }}
              style={{
                cursor: "pointer", padding: "4px 12px", borderRadius: "4px",
                background: tab === "available" ? "#1a9fff" : "#333", color: "#fff", fontSize: "13px"
              }}
            >Available</span>
            <span
              onClick={() => { setTab("advisor"); refreshAdvisor(); }}
              style={{
                cursor: "pointer", padding: "4px 12px", borderRadius: "4px",
                background: tab === "advisor" ? "#1a9fff" : "#333", color: "#fff", fontSize: "13px"
              }}
            >Advisor</span>
          </div>
        </PanelSectionRow>

        {status && (
          <PanelSectionRow>
            <div style={{ textAlign: "center", color: "#1a9fff", fontSize: "12px" }}>
              {loading ? "⏳ " : ""}{status}
            </div>
          </PanelSectionRow>
        )}

        {tab === "installed" && installed.map((v) => (
          <PanelSectionRow key={v}>
            <ButtonItem layout="below" onClick={() => handleRemove(v)}>
              🗑️ {v}
            </ButtonItem>
          </PanelSectionRow>
        ))}

        {tab === "installed" && installed.length === 0 && (
          <PanelSectionRow>
            <div style={{ textAlign: "center", color: "#888", fontSize: "12px" }}>
              No Proton-GE versions installed
            </div>
          </PanelSectionRow>
        )}

        {tab === "available" && releases.map((r: any) => (
          <PanelSectionRow key={r.tag}>
            <ButtonItem
              layout="below"
              disabled={r.installed || loading}
              onClick={() => handleInstall(r.url, r.tag)}
            >
              {r.installed ? "✅" : "⬇️"} {r.tag}
            </ButtonItem>
          </PanelSectionRow>
        ))}

        {tab === "advisor" && games.map((g: any) => (
          <PanelSectionRow key={g.appid}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", width: "100%", padding: "4px 0" }}>
              <span style={{ fontSize: "13px", flex: 1 }}>{g.name}</span>
              <span style={{
                color: TIER_COLORS[g.tier] || "#888",
                fontWeight: "bold", fontSize: "12px", marginLeft: "8px"
              }}>
                {g.tier.toUpperCase()}
              </span>
            </div>
          </PanelSectionRow>
        ))}
      </PanelSection>
    </>
  );
};
