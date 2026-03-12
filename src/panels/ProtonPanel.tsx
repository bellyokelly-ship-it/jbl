import {
  PanelSection,
  PanelSectionRow,
  ButtonItem,
  Field,
} from "@decky/ui";
import { callable } from "@decky/api";
import { useState, useEffect } from "react";

interface InstalledVersion {
  name: string;
  path: string;
  size_mb: number;
}

interface Release {
  tag: string;
  name: string;
  published: string;
  download_url: string | null;
  size_mb: number;
}

const getProtonVersions = callable<[], InstalledVersion[]>("get_proton_versions");
const fetchProtonReleases = callable<[number], Release[]>("fetch_proton_releases");
const installProton = callable<[string, string], { success: boolean; error?: string }>("install_proton");
const removeProton = callable<[string], { success: boolean; error?: string }>("remove_proton");

export const ProtonPanel = () => {
  const [installed, setInstalled] = useState<InstalledVersion[]>([]);
  const [releases, setReleases] = useState<Release[]>([]);
  const [loading, setLoading] = useState(false);
  const [installing, setInstalling] = useState<string | null>(null);
  const [removing, setRemoving] = useState<string | null>(null);
  const [status, setStatus] = useState("");
  const [error, setError] = useState("");

  const refresh = async () => {
    setLoading(true);
    setError("");
    setStatus("Checking...");
    try {
      const raw = await getProtonVersions();
      if (Array.isArray(raw)) {
        const parsed: InstalledVersion[] = raw.map((v: any) => {
          if (typeof v === "string") return { name: v, path: "", size_mb: 0 };
          return { name: v.name || "Unknown", path: v.path || "", size_mb: v.size_mb || 0 };
        });
        setInstalled(parsed);
      } else {
        setInstalled([]);
      }
    } catch (e: any) {
      setInstalled([]);
      setError("Failed to read installed versions");
    }
    try {
      const rels = await fetchProtonReleases(5);
      setReleases(Array.isArray(rels) ? rels : []);
    } catch (e: any) {
      setReleases([]);
    }
    setLoading(false);
    setStatus("");
  };

  useEffect(() => { refresh(); }, []);

  const installedNames = installed.map((v) => v.name);
  const latestTag = releases.length > 0 ? releases[0].tag : null;
  const hasLatest = latestTag != null && installedNames.some((n) => n.includes(latestTag) || (latestTag && latestTag.includes(n)));

  const doInstall = async (r: Release) => {
    setInstalling(r.tag);
    setStatus("Downloading " + r.tag + " (~" + r.size_mb + " MB)...");
    setError("");
    try {
      const res = await installProton(r.download_url, r.tag);
      if (res.success) { setStatus(r.tag + " installed"); await refresh(); }
      else { setError("Install failed: " + (res.error || "Unknown")); setStatus(""); }
    } catch (e: any) { setError("Install error: " + (e?.message || e)); setStatus(""); }
    setInstalling(null);
  };

  const doRemove = async (name: string) => {
    setRemoving(name);
    setStatus("Removing " + name + "...");
    setError("");
    try {
      const res = await removeProton(name);
      if (res.success) { setStatus(name + " removed"); await refresh(); }
      else { setError("Remove failed: " + (res.error || "Unknown")); setStatus(""); }
    } catch (e: any) { setError("Remove error: " + (e?.message || e)); setStatus(""); }
    setRemoving(null);
  };

  return (
    <div>
      <PanelSection title="Proton-GE Manager">
        {latestTag && (
          <PanelSectionRow>
            <Field label="Latest Available" focusable={false}>
              {latestTag} {hasLatest ? " Installed" : " Not installed"}
            </Field>
          </PanelSectionRow>
        )}
        {status !== "" && (
          <PanelSectionRow>
            <Field label="Status" focusable={false}>{status}</Field>
          </PanelSectionRow>
        )}
        {error !== "" && (
          <PanelSectionRow>
            <Field label="Error" focusable={false}>{error}</Field>
          </PanelSectionRow>
        )}
        <PanelSectionRow>
          <ButtonItem layout="below" onClick={refresh} disabled={loading}>
            {loading ? "Checking..." : "Refresh"}
          </ButtonItem>
        </PanelSectionRow>
      </PanelSection>

      <PanelSection title={"Installed (" + installed.length + ")"}>
        {installed.length === 0 ? (
          <PanelSectionRow>
            <Field label="" focusable={false}>No Proton-GE versions found</Field>
          </PanelSectionRow>
        ) : (
          installed.map((v) => (
          <PanelSectionRow key={v.name}>
            <Field label={v.name} description={v.size_mb > 0 ? v.size_mb + " MB" : ""} focusable={false}>
              {" "}
            </Field>
            <ButtonItem layout="below" onClick={() => doRemove(v.name)} disabled={removing === v.name}>
              {removing === v.name ? "Removing..." : "Remove " + v.name}
            </ButtonItem>
          </PanelSectionRow>
          ))
        )}
      </PanelSection>

      <PanelSection title={"Available (" + releases.length + ")"}>
        {releases.length === 0 ? (
          <PanelSectionRow>
            <Field label="" focusable={false}>No releases fetched - hit Refresh</Field>
          </PanelSectionRow>
        ) : (
          releases.map((r) => {
            const already = installedNames.some((n) => n.includes(r.tag) || r.tag.includes(n));
            return (
              <PanelSectionRow key={r.tag}>
                <Field label={r.tag} description={r.size_mb + " MB - " + new Date(r.published).toLocaleDateString()} focusable={false}>
                  {already ? "\u2705 Installed" : ""}
                </Field>
                {!already && (
                  <ButtonItem layout="below" onClick={() => doInstall(r)} disabled={installing !== null}>
                    {installing === r.tag ? "Installing..." : "Install " + r.tag}
                  </ButtonItem>
                )}
              </PanelSectionRow>
            );
          })
        )}
      </PanelSection>
    </div>
  );
};
