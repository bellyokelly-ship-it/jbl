import {
  PanelSection,
  PanelSectionRow,
  ButtonItem,
  TextField,
} from "@decky/ui";
import { callable } from "@decky/api";
import { useState, useEffect } from "react";
import { JBL, jblCard, jblCardGlow, jblHeader, jblHeaderTitle, jblHeaderSub, jblStatusBadge } from "../styles";

interface Profile {
  name: string;
  tdp: number;
  gpu_clock: number;
  lsfg_enabled: boolean;
  lsfg_multiplier: number;
  lsfg_flow_rate: number;
}

const listProfiles = callable<[], Profile[]>("list_profiles");
const saveProfile = callable<[string], { success: boolean; error?: string }>("save_profile");
const loadProfile = callable<[string], { success: boolean; error?: string }>("load_profile");
const deleteProfile = callable<[string], { success: boolean; error?: string }>("delete_profile");

export const ProfilesPanel = () => {
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [newName, setNewName] = useState("");
  const [status, setStatus] = useState("");
  const [statusColor, setStatusColor] = useState(JBL.cyan);
  const [loadingAction, setLoadingAction] = useState<string | null>(null);

  const refresh = async () => {
    try {
      const list = await listProfiles();
      if (Array.isArray(list)) setProfiles(list);
    } catch {
      setStatus("❌ Failed to load profiles");
      setStatusColor(JBL.red);
    }
  };

  useEffect(() => { refresh(); }, []);

  const doSave = async () => {
    const name = newName.trim();
    if (!name) {
      setStatus("⚠️ Enter a profile name");
      setStatusColor(JBL.amber);
      return;
    }
    setLoadingAction(`save-${name}`);
    setStatus(`💾 Saving "${name}"...`);
    setStatusColor(JBL.cyan);
    try {
      const res = await saveProfile(name);
      if (res.success) {
        setStatus(`✅ Saved "${name}"`);
        setStatusColor(JBL.green);
        setNewName("");
        await refresh();
      } else {
        setStatus(`❌ ${res.error || "Save failed"}`);
        setStatusColor(JBL.red);
      }
    } catch {
      setStatus("❌ Save failed");
      setStatusColor(JBL.red);
    }
    setLoadingAction(null);
  };

  const doLoad = async (name: string) => {
    setLoadingAction(`load-${name}`);
    setStatus(`📂 Loading "${name}"...`);
    setStatusColor(JBL.cyan);
    try {
      const res = await loadProfile(name);
      if (res.success) {
        setStatus(`✅ Loaded "${name}"`);
        setStatusColor(JBL.green);
      } else {
        setStatus(`❌ ${res.error || "Load failed"}`);
        setStatusColor(JBL.red);
      }
    } catch {
      setStatus("❌ Load failed");
      setStatusColor(JBL.red);
    }
    setLoadingAction(null);
  };

  const doDelete = async (name: string) => {
    setLoadingAction(`del-${name}`);
    setStatus(`🗑️ Deleting "${name}"...`);
    setStatusColor(JBL.amber);
    try {
      const res = await deleteProfile(name);
      if (res.success) {
        setStatus(`✅ Deleted "${name}"`);
        setStatusColor(JBL.green);
        await refresh();
      } else {
        setStatus(`❌ ${res.error || "Delete failed"}`);
        setStatusColor(JBL.red);
      }
    } catch {
      setStatus("❌ Delete failed");
      setStatusColor(JBL.red);
    }
    setLoadingAction(null);
  };

  const profileIcon = (p: Profile): string => {
    if (p.tdp >= 20) return "🔥";
    if (p.tdp >= 14) return "🚀";
    if (p.tdp >= 8) return "⚖️";
    return "🔋";
  };

  const profileColor = (p: Profile): string => {
    if (p.tdp >= 20) return JBL.red;
    if (p.tdp >= 14) return JBL.amber;
    if (p.tdp >= 8) return JBL.cyan;
    return JBL.green;
  };

  return (
    <div className="jbl-scroll-panel">
      {/* Header */}
      <div style={jblHeader}>
        <div>
          <div style={jblHeaderTitle}>📋 Profiles</div>
          <div style={jblHeaderSub}>Save & load power configurations</div>
        </div>
        <div style={{
          marginLeft: "auto",
          fontSize: "11px",
          color: JBL.textMuted,
        }}>
          {profiles.length} saved
        </div>
      </div>

      {status && <div style={jblStatusBadge(statusColor)}>{status}</div>}

      {/* Save new */}
      <div style={jblCardGlow(JBL.cyan)}>
        <div style={{ fontSize: "12px", color: JBL.textSecondary, marginBottom: "8px", fontWeight: 600 }}>
          ➕ SAVE CURRENT SETTINGS
        </div>
        <PanelSection>
          <PanelSectionRow>
            <TextField
              label="Profile Name"
              value={newName}
              onChange={(e) => setNewName(e?.target?.value ?? "")}
            />
          </PanelSectionRow>
          <PanelSectionRow>
            <ButtonItem
              layout="below"
              onClick={doSave}
              disabled={loadingAction?.startsWith("save") || false}
            >
              {loadingAction?.startsWith("save") ? "💾 Saving..." : "💾 Save Profile"}
            </ButtonItem>
          </PanelSectionRow>
        </PanelSection>
      </div>

      {/* Profiles list */}
      <div style={jblCard}>
        <div style={{ fontSize: "12px", color: JBL.textSecondary, marginBottom: "8px", fontWeight: 600 }}>
          📦 SAVED PROFILES ({profiles.length})
        </div>
        {profiles.length === 0 ? (
          <div style={{ fontSize: "11px", color: JBL.textMuted, textAlign: "center" as const, padding: "16px" }}>
            No profiles saved yet — save your first config above
          </div>
        ) : (
          profiles.map((p) => (
            <div key={p.name} style={{
              padding: "10px 12px",
              marginBottom: "6px",
              borderRadius: "8px",
              background: JBL.surfaceDark,
              border: `1px solid ${profileColor(p)}33`,
            }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "6px" }}>
                <div style={{ fontSize: "13px", fontWeight: 700, color: profileColor(p) }}>
                  {profileIcon(p)} {p.name}
                </div>
              </div>
              {/* Stats row */}
              <div style={{ display: "flex", gap: "12px", marginBottom: "8px", flexWrap: "wrap" as const }}>
                <div style={{ fontSize: "10px", color: JBL.textMuted }}>
                  TDP: <span style={{ color: JBL.textPrimary, fontWeight: 600 }}>{p.tdp}W</span>
                </div>
                <div style={{ fontSize: "10px", color: JBL.textMuted }}>
                  GPU: <span style={{ color: JBL.textPrimary, fontWeight: 600 }}>{p.gpu_clock}MHz</span>
                </div>
                <div style={{ fontSize: "10px", color: JBL.textMuted }}>
                  LSFG: <span style={{ color: p.lsfg_enabled ? JBL.green : JBL.textMuted, fontWeight: 600 }}>
                    {p.lsfg_enabled ? `${p.lsfg_multiplier}x @ ${p.lsfg_flow_rate}%` : "OFF"}
                  </span>
                </div>
              </div>
              {/* Actions */}
              <div style={{ display: "flex", gap: "6px" }}>
                <PanelSection>
                  <ButtonItem
                    layout="below"
                    onClick={() => doLoad(p.name)}
                    disabled={loadingAction === `load-${p.name}`}
                  >
                    {loadingAction === `load-${p.name}` ? "Loading..." : "📂 Load"}
                  </ButtonItem>
                </PanelSection>
                <PanelSection>
                  <ButtonItem
                    layout="below"
                    onClick={() => doDelete(p.name)}
                    disabled={loadingAction === `del-${p.name}`}
                  >
                    {loadingAction === `del-${p.name}` ? "..." : "🗑️"}
                  </ButtonItem>
                </PanelSection>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Refresh */}
      <div style={jblCard}>
        <PanelSection>
          <PanelSectionRow>
            <ButtonItem layout="below" onClick={refresh}>
              🔄 Refresh Profiles
            </ButtonItem>
          </PanelSectionRow>
        </PanelSection>
      </div>
    </div>
  );
};
