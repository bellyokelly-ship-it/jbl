import {
  PanelSection,
  PanelSectionRow,
  ButtonItem,
  TextField,
  Field,
} from "@decky/ui";
import { callable } from "@decky/api";
import { useState, useEffect } from "react";

const saveProfile = callable<[string, object], { success: boolean }>("save_game_profile");
const applyProfile = callable<[string], { success: boolean; results?: object }>("apply_game_profile");
const deleteProfile = callable<[string], { success: boolean }>("delete_game_profile");
const listProfiles = callable<[], Record<string, object>>("list_game_profiles");
const getTdp = callable<[], { success: boolean; tdp?: number }>("get_tdp");
const getGpuClock = callable<[], { success: boolean; gpu_clock?: number }>("get_gpu_clock");
const getLsfg = callable<[], { enabled: boolean; multiplier: number; flow_rate: number }>("get_lsfg");

export const ProfilesPanel = () => {
  const [profiles, setProfiles] = useState<Record<string, any>>({});
  const [newName, setNewName] = useState("");
  const [status, setStatus] = useState("");

  const refresh = async () => {
    const p = await listProfiles();
    setProfiles(p || {});
  };

  useEffect(() => { refresh(); }, []);

  const handleSave = async () => {
    if (!newName.trim()) {
      setStatus("Enter a profile name first");
      return;
    }
    const tdpRes = await getTdp();
    const gpuRes = await getGpuClock();
    const lsfgRes = await getLsfg();
    const profile = {
      tdp: tdpRes.tdp || 12,
      gpu_clock: gpuRes.gpu_clock || 1200,
      lsfg_enabled: lsfgRes.enabled,
      lsfg_multiplier: lsfgRes.multiplier,
      lsfg_flow_rate: lsfgRes.flow_rate,
      saved_at: Date.now(),
    };
    await saveProfile(newName.trim(), profile);
    setNewName("");
    setStatus("Saved: " + newName.trim());
    await refresh();
  };

  const handleApply = async (id: string) => {
    const res = await applyProfile(id);
    setStatus(res.success ? "Applied: " + id : "Failed to apply");
  };

  const handleDelete = async (id: string) => {
    await deleteProfile(id);
    setStatus("Deleted: " + id);
    await refresh();
  };

  const keys = Object.keys(profiles);

  return (
    <div>
      <PanelSection title="Save Current Settings">
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

      <PanelSection title={"Saved Profiles (" + keys.length + ")"}>
        {keys.length === 0 ? (
          <PanelSectionRow>
            <Field label="Info" focusable={true}>
              No profiles yet
            </Field>
          </PanelSectionRow>
        ) : (
          keys.map((id) => {
            const p = profiles[id];
            const desc = (p.tdp || "?") + "W / " + (p.gpu_clock || "?") + "MHz" +
              (p.lsfg_enabled ? " / LSFG " + p.lsfg_multiplier + "x" : "");
            return (
              <div key={id}>
                <PanelSectionRow>
                  <Field label={id} description={desc} focusable={true}>
                    {new Date(p.saved_at).toLocaleDateString()}
                  </Field>
                </PanelSectionRow>
                <PanelSectionRow>
                  <ButtonItem layout="below" onClick={() => handleApply(id)}>
                    ▶️ Apply
                  </ButtonItem>
                </PanelSectionRow>
                <PanelSectionRow>
                  <ButtonItem layout="below" onClick={() => handleDelete(id)}>
                    🗑️ Delete
                  </ButtonItem>
                </PanelSectionRow>
              </div>
            );
          })
        )}
      </PanelSection>

      {status && (
        <PanelSection>
          <PanelSectionRow>
            <Field label="Status" focusable={true}>
              {status}
            </Field>
          </PanelSectionRow>
        </PanelSection>
      )}
    </div>
  );
};
