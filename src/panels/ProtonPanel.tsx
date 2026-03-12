import {
  PanelSection,
  PanelSectionRow,
  ButtonItem,
} from "@decky/ui";
import { callable } from "@decky/api";
import { useState, useEffect } from "react";
import { JBL, jblCard, jblCardGlow, jblHeader, jblHeaderTitle, jblHeaderSub, jblStatusBadge } from "../styles";

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
  const [statusColor, setStatusColor] = useState(JBL.cyan);
  const [error, setError] = useState("");

  const refresh = async () => {
    setLoading(true);
    setError("");
    setStatus("Checking...");
    setStatusColor(JBL.cyan);
    try {
      const raw = await getProtonVersions();
      if (Array.isArray(raw)) {
        const parsed: InstalledVersion[] = raw.map((v: any) => {
          if (typeof v === "string") return { name: v, path: "", size_mb: 0 };
          return { name: v.name || "Unknown", path: v.path || "", size_mb: v.size_mb || 0 };
        });
        setInstalled(parsed);
      }
      const rel = await fetchProtonReleases(5);
      if (Array.isArray(rel)) setReleases(rel);
      setStatus(`✅ Found ${Array.isArray(raw) ? raw.length : 0} installed`);
      setStatusColor(JBL.green);
    } catch (e: any) {
      setError(e?.message || "Failed to fetch");
      setStatus("❌ Error fetching versions");
      setStatusColor(JBL.red);
    }
    setLoading(false);
  };

  useEffect(() => { refresh(); }, []);

  const doInstall = async (tag: string, url: string) => {
    setInstalling(tag);
    setStatus(`⬇️ Installing ${tag}...`);
    setStatusColor(JBL.amber);
    try {
      const res = await installProton(tag, url);
      if (res.success) {
        setStatus(`✅ Installed ${tag}`);
        setStatusColor(JBL.green);
        await refresh();
      } else {
        setStatus(`❌ ${res.error || "Install failed"}`);
        setStatusColor(JBL.red);
      }
    } catch {
      setStatus("❌ Install failed");
      setStatusColor(JBL.red);
    }
    setInstalling(null);
  };

  const doRemove = async (name: string) => {
    setRemoving(name);
    setStatus(`🗑️ Removing ${name}...`);
    setStatusColor(JBL.amber);
    try {
      const res = await removeProton(name);
      if (res.success) {
        setStatus(`✅ Removed ${name}`);
        setStatusColor(JBL.green);
        await refresh();
      } else {
        setStatus(`❌ ${res.error || "Remove failed"}`);
        setStatusColor(JBL.red);
      }
    } catch {
      setStatus("❌ Remove failed");
      setStatusColor(JBL.red);
    }
    setRemoving(null);
  };

  const isInstalled = (tag: string) => installed.some((v) => v.name.includes(tag) || tag.includes(v.name));

  return (
    <div className="jbl-scroll-panel">
      {/* Header */}
      <div style={jblHeader}>
        <div>
          <div style={jblHeaderTitle}>🍷 Proton-GE Manager</div>
          <div style={jblHeaderSub}>Install, update & manage Proton versions</div>
        </div>
      </div>

      {status && <div style={jblStatusBadge(statusColor)}>{status}</div>}
      {error && <div style={jblStatusBadge(JBL.red)}>⚠️ {error}</div>}

      {/* Installed */}
      <div style={jblCard}>
        <div style={{ fontSize: "12px", color: JBL.textSecondary, marginBottom: "8px", fontWeight: 600 }}>
          📦 INSTALLED ({installed.length})
        </div>
        {installed.length === 0 ? (
          <div style={{ fontSize: "11px", color: JBL.textMuted, textAlign: "center" as const, padding: "12px" }}>
            No Proton-GE versions found
          </div>
        ) : (
          installed.map((v) => (
            <div key={v.name} style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              padding: "8px 10px",
              marginBottom: "4px",
              borderRadius: "8px",
              background: JBL.surfaceDark,
              border: `1px solid ${JBL.green}33`,
            }}>
              <div>
                <div style={{ fontSize: "12px", fontWeight: 700, color: JBL.green }}>
                  ✅ {v.name}
                </div>
                {v.size_mb > 0 && (
                  <div style={{ fontSize: "9px", color: JBL.textMuted }}>{v.size_mb} MB</div>
                )}
              </div>
              <PanelSection>
                <ButtonItem
                  layout="below"
                  onClick={() => doRemove(v.name)}
                  disabled={removing === v.name}
                >
                  {removing === v.name ? "Removing..." : "🗑️"}
                </ButtonItem>
              </PanelSection>
            </div>
          ))
        )}
      </div>

      {/* Available releases */}
      <div style={jblCard}>
        <div style={{ fontSize: "12px", color: JBL.textSecondary, marginBottom: "8px", fontWeight: 600 }}>
          🌐 LATEST RELEASES
        </div>
        {releases.length === 0 ? (
          <div style={{ fontSize: "11px", color: JBL.textMuted, textAlign: "center" as const, padding: "12px" }}>
            {loading ? "Fetching releases..." : "No releases found"}
          </div>
        ) : (
          releases.map((r) => {
            const alreadyInstalled = isInstalled(r.tag);
            return (
              <div key={r.tag} style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                padding: "8px 10px",
                marginBottom: "4px",
                borderRadius: "8px",
                background: JBL.surfaceDark,
                border: `1px solid ${alreadyInstalled ? JBL.green : JBL.cyan}33`,
              }}>
                <div>
                  <div style={{
                    fontSize: "12px",
                    fontWeight: 700,
                    color: alreadyInstalled ? JBL.green : JBL.cyan,
                  }}>
                    {alreadyInstalled ? "✅" : "⬇️"} {r.tag}
                  </div>
                  <div style={{ fontSize: "9px", color: JBL.textMuted }}>
                    {r.published} · {r.size_mb > 0 ? `${r.size_mb} MB` : ""}
                  </div>
                </div>
                {!alreadyInstalled && r.download_url && (
                  <PanelSection>
                    <ButtonItem
                      layout="below"
                      onClick={() => doInstall(r.tag, r.download_url!)}
                      disabled={installing === r.tag}
                    >
                      {installing === r.tag ? "Installing..." : "Install"}
                    </ButtonItem>
                  </PanelSection>
                )}
              </div>
            );
          })
        )}
      </div>

      {/* Refresh */}
      <div style={jblCard}>
        <PanelSection>
          <PanelSectionRow>
            <ButtonItem layout="below" onClick={refresh}>
              {loading ? "⏳ Checking..." : "🔄 Refresh Versions"}
            </ButtonItem>
          </PanelSectionRow>
        </PanelSection>
      </div>
    </div>
  );
};
