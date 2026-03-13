import React, { useState, useEffect } from "react";
import {
  PanelSection,
  PanelSectionRow,
  ButtonItem,
  TextField,
} from "@decky/ui";
import { listGameProfiles, saveGameProfile, deleteGameProfile } from "../backend";
import { success, fail } from "../toast";

interface Profile { name: string; }

const ProfilesPanel: React.FC = () => {
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [newName, setNewName] = useState("");

  const load = async () => {
    try {
      const r = JSON.parse(await listGameProfiles());
      if (r.ok) setProfiles((r.value || []).map((n: string) => ({ name: n })));
    } catch {}
  };

  useEffect(() => { load(); }, []);

  const doSave = async () => {
    if (!newName.trim()) { fail("Enter a profile name"); return; }
    try {
      const r = JSON.parse(await saveGameProfile(newName.trim(), "{}"));
      r.ok ? success(`Saved: ${newName.trim()}`) : fail(r.error);
      setNewName("");
      load();
    } catch (e) { fail(`Save error: ${e}`); }
  };

  const doDelete = async (name: string) => {
    try {
      const r = JSON.parse(await deleteGameProfile(name));
      r.ok ? success(`Deleted: ${name}`) : fail(r.error);
      load();
    } catch (e) { fail(`Delete error: ${e}`); }
  };

  return (
    <>
      <PanelSection title="💾 Game Profiles">
        <PanelSectionRow>
          <TextField label="New Profile" value={newName} onChange={(e) => setNewName(e.target.value)} />
        </PanelSectionRow>
        <PanelSectionRow>
          <ButtonItem layout="below" onClick={doSave}>Save Current Settings</ButtonItem>
        </PanelSectionRow>
      </PanelSection>
      <PanelSection title="Saved Profiles">
        {profiles.length === 0 ? (
          <PanelSectionRow>
            <div style={{ color: "#888" }}>No profiles saved yet</div>
          </PanelSectionRow>
        ) : (
          profiles.map((p) => (
            <PanelSectionRow key={p.name}>
              <ButtonItem layout="below" onClick={() => doDelete(p.name)}>
                🗑️ {p.name}
              </ButtonItem>
            </PanelSectionRow>
          ))
        )}
      </PanelSection>
    </>
  );
};

export default ProfilesPanel;
