import React from "react";
import { useState, useEffect, FC } from "react";
import {
  PanelSection,
  PanelSectionRow,
  ButtonItem,
  TextField,
} from "@decky/ui";
import {
  listGameProfiles,
  saveGameProfile,
  applyGameProfile,
  deleteGameProfile,
  exportProfiles,
  importProfiles,
  getTdp,
  getGpuClock,
  getLsfg,
} from "../backend";

export const ProfilesPanel: FC = () => {
  const [profiles, setProfiles] = useState<Record<string, any>>({});
  const [newName, setNewName] = useState("");
  const [status, setStatus] = useState("");

  const refresh = async () => {
    try {
      const raw = await listGameProfiles();
      setProfiles(JSON.parse(raw));
    } catch {
      setStatus("Failed to load profiles");
    }
  };

  useEffect(() => { refresh(); }, []);

  const handleSave = async () => {
    if (!newName.trim()) {
      setStatus("Enter a profile name");
      return;
    }
    try {
      const tdp = await getTdp();
      const gpu = await getGpuClock();
      const lsfgRaw = await getLsfg();
      const lsfg = JSON.parse(lsfgRaw);

      const settings = JSON.stringify({
        tdp,
        gpu_clock: gpu,
        lsfg_enabled: lsfg.enabled,
        lsfg_multiplier: lsfg.multiplier,
        lsfg_flow_rate: lsfg.flow_rate,
      });

      await saveGameProfile(newName.trim(), settings);
      setNewName("");
      setStatus(`Saved: ${newName.trim()}`);
      await refresh();
    } catch {
      setStatus("Save failed");
    }
  };

  const handleApply = async (name: string) => {
    try {
      const raw = await applyGameProfile(name);
      const r = JSON.parse(raw);
      setStatus(r.message || `Applied: ${name}`);
    } catch {
      setStatus("Apply failed");
    }
  };

  const handleDelete = async (name: string) => {
    await deleteGameProfile(name);
    setStatus(`Deleted: ${name}`);
    await refresh();
  };

  const handleExport = async () => {
    try {
      const raw = await exportProfiles();
      const r = JSON.parse(raw);
      setStatus(r.success ? `Exported ${r.count} profiles to ${r.path}` : "Export failed");
    } catch {
      setStatus("Export failed");
    }
  };

  const handleImport = async () => {
    try {
      const raw = await importProfiles();
      const r = JSON.parse(raw);
      setStatus(r.success ? `Imported ${r.count} profiles` : r.message);
      await refresh();
    } catch {
      setStatus("Import failed");
    }
  };

  const names = Object.keys(profiles);

  return (
    <>
      <PanelSection title="💾 Save Current Settings">
        <PanelSectionRow>
          <TextField
            label="Profile Name"
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
          />
        </PanelSectionRow>
        <PanelSectionRow>
          <ButtonItem layout="below" onClick={handleSave}>
            💾 Save Profile
          </ButtonItem>
        </PanelSectionRow>
      </PanelSection>

      <PanelSection title="📋 Saved Profiles">
        {names.length === 0 && (
          <PanelSectionRow>
            <div style={{ color: "#888", fontSize: "12px", textAlign: "center" }}>
              No profiles saved yet
            </div>
          </PanelSectionRow>
        )}
        {names.map((name) => (
          <PanelSectionRow key={name}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", width: "100%" }}>
              <span style={{ fontSize: "13px", flex: 1 }}>{name}</span>
              <span
                onClick={() => handleApply(name)}
                style={{ cursor: "pointer", color: "#1a9fff", marginRight: "12px", fontSize: "13px" }}
              >▶ Apply</span>
              <span
                onClick={() => handleDelete(name)}
                style={{ cursor: "pointer", color: "#ff4444", fontSize: "13px" }}
              >🗑️</span>
            </div>
          </PanelSectionRow>
        ))}
      </PanelSection>

      <PanelSection title="📦 Import / Export">
        <PanelSectionRow>
          <ButtonItem layout="below" onClick={handleExport}>
            📤 Export to ~/jbl_profiles_export.json
          </ButtonItem>
        </PanelSectionRow>
        <PanelSectionRow>
          <ButtonItem layout="below" onClick={handleImport}>
            📥 Import from ~/jbl_profiles_export.json
          </ButtonItem>
        </PanelSectionRow>
      </PanelSection>

      {status && (
        <PanelSection>
          <PanelSectionRow>
            <div style={{ textAlign: "center", color: "#1a9fff", fontSize: "12px" }}>
              {status}
            </div>
          </PanelSectionRow>
        </PanelSection>
      )}
    </>
  );
};
