import React, { useState, useEffect } from "react";
import {
  PanelSection,
  PanelSectionRow,
  ButtonItem,
  DropdownItem,
} from "@decky/ui";
import { getProtonVersions, fetchProtonReleases, installProton, removeProton } from "../backend";
import { success, fail, info } from "../toast";

interface ProtonVer { name: string; }
interface Release { tag: string; url: string; }

const ProtonPanel: React.FC = () => {
  const [installed, setInstalled] = useState<ProtonVer[]>([]);
  const [releases, setReleases] = useState<Release[]>([]);
  const [selRelease, setSelRelease] = useState<Release | null>(null);
  const [loading, setLoading] = useState(false);

  const loadInstalled = async () => {
    try {
      const r = JSON.parse(await getProtonVersions());
      if (r.ok) setInstalled(r.value || []);
    } catch {}
  };

  useEffect(() => { loadInstalled(); }, []);

  const doFetch = async () => {
    setLoading(true);
    info("Fetching Proton-GE releases...");
    try {
      const r = JSON.parse(await fetchProtonReleases(5));
      if (r.ok) { setReleases(r.value || []); success(`Found ${r.value.length} releases`); }
      else fail(r.error);
    } catch (e) { fail(`Fetch error: ${e}`); }
    setLoading(false);
  };

  const doInstall = async () => {
    if (!selRelease) return;
    setLoading(true);
    info(`Installing ${selRelease.tag}...`);
    try {
      const r = JSON.parse(await installProton(selRelease.url, selRelease.tag));
      r.ok ? success(`Installed ${selRelease.tag}`) : fail(r.error);
      loadInstalled();
    } catch (e) { fail(`Install error: ${e}`); }
    setLoading(false);
  };

  const doRemove = async (name: string) => {
    try {
      const r = JSON.parse(await removeProton(name));
      r.ok ? success(`Removed ${name}`) : fail(r.error);
      loadInstalled();
    } catch (e) { fail(`Remove error: ${e}`); }
  };

  return (
    <>
      <PanelSection title="🧪 Proton-GE Manager">
        <PanelSectionRow>
          <ButtonItem layout="below" onClick={doFetch} disabled={loading}>
            {loading ? "Checking..." : "Check for Updates"}
          </ButtonItem>
        </PanelSectionRow>
        {releases.length > 0 && (
          <>
            <PanelSectionRow>
              <DropdownItem
                label="Available"
                rgOptions={releases.map((r) => ({ label: r.tag, data: r }))}
                selectedOption={selRelease}
                onChange={(v) => setSelRelease(v.data)}
              />
            </PanelSectionRow>
            <PanelSectionRow>
              <ButtonItem layout="below" onClick={doInstall} disabled={loading || !selRelease}>
                Install Selected
              </ButtonItem>
            </PanelSectionRow>
          </>
        )}
      </PanelSection>
      <PanelSection title="Installed">
        {installed.length === 0 ? (
          <PanelSectionRow>
            <div style={{ color: "#888" }}>No Proton-GE versions found</div>
          </PanelSectionRow>
        ) : (
          installed.map((v) => (
            <PanelSectionRow key={v.name}>
              <ButtonItem layout="below" onClick={() => doRemove(v.name)}>
                🗑️ {v.name}
              </ButtonItem>
            </PanelSectionRow>
          ))
        )}
      </PanelSection>
    </>
  );
};

export default ProtonPanel;
