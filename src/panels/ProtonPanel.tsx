import React, { useState, useEffect } from "react";
import {
  PanelSection,
  PanelSectionRow,
  ButtonItem,
  Focusable,
} from "@decky/ui";
import { getProtonVersions, fetchProtonReleases, installProton, removeProton } from "../backend";
import { success, fail, info } from "../toast";

interface InstalledVersion { name: string; }
interface RemoteRelease { tag: string; url: string; size_mb: number; date: string; notes: string; }

const ProtonPanel: React.FC = () => {
  const [installed, setInstalled] = useState<InstalledVersion[]>([]);
  const [releases, setReleases] = useState<RemoteRelease[]>([]);
  const [loading, setLoading] = useState(false);
  const [installing, setInstalling] = useState("");

  const loadInstalled = async () => {
    try {
      const r = ((v) => typeof v === "string" ? JSON.parse(v) : v)(await getProtonVersions());
      if (r.ok) setInstalled(r.value);
    } catch {}
  };

  const loadReleases = async () => {
    setLoading(true);
    try {
      const r = ((v) => typeof v === "string" ? JSON.parse(v) : v)(await fetchProtonReleases(20));
      if (r.ok) setReleases(r.value);
    } catch {}
    setLoading(false);
  };

  useEffect(() => { loadInstalled(); loadReleases(); }, []);

  const isInstalled = (tag: string) => installed.some((v) => v.name === tag);

  const handleInstall = async (rel: RemoteRelease) => {
    setInstalling(rel.tag);
    info(`Installing ${rel.tag} (${rel.size_mb}MB)...`);
    try {
      const r = ((v) => typeof v === "string" ? JSON.parse(v) : v)(await installProton(rel.url, rel.tag));
      r.ok ? success(r.value) : fail(r.error);
      await loadInstalled();
    } catch (e) { fail(`Install error: ${e}`); }
    setInstalling("");
  };

  const handleRemove = async (name: string) => {
    try {
      const r = ((v) => typeof v === "string" ? JSON.parse(v) : v)(await removeProton(name));
      r.ok ? success(r.value) : fail(r.error);
      await loadInstalled();
    } catch (e) { fail(`Remove error: ${e}`); }
  };

  return (
    <>
      <PanelSection title={`🧪 Installed (${installed.length})`}>
        {installed.length === 0 && (
          <PanelSectionRow>
            <div style={{ color: "#888", fontSize: 12 }}>No Proton-GE versions installed</div>
          </PanelSectionRow>
        )}
        {installed.map((v) => (
          <PanelSectionRow key={v.name}>
            <ButtonItem
              layout="below"
              onClick={() => handleRemove(v.name)}
              description="Tap to remove"
            >
              ✅ {v.name}
            </ButtonItem>
          </PanelSectionRow>
        ))}
      </PanelSection>

      <PanelSection title={`📦 Available (${releases.length})`}>
        {loading && (
          <PanelSectionRow>
            <div style={{ color: "#0af", fontSize: 12 }}>Loading releases...</div>
          </PanelSectionRow>
        )}
        {releases.map((rel) => (
          <PanelSectionRow key={rel.tag}>
            <ButtonItem
              layout="below"
              disabled={isInstalled(rel.tag) || installing === rel.tag}
              onClick={() => handleInstall(rel)}
              description={
                isInstalled(rel.tag)
                  ? "Already installed"
                  : installing === rel.tag
                  ? "Installing..."
                  : `${rel.date} · ${rel.size_mb}MB`
              }
            >
              {isInstalled(rel.tag) ? "✅" : installing === rel.tag ? "⏳" : "📥"} {rel.tag}
            </ButtonItem>
          </PanelSectionRow>
        ))}
      </PanelSection>
    </>
  );
};

export default ProtonPanel;
