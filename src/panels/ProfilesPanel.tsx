import React, { useState, useEffect } from "react";
import {
  PanelSection,
  PanelSectionRow,
  ButtonItem,
  DropdownItem,
} from "@decky/ui";
import {
  scanGames, listGameProfiles, getGameProfile,
  saveGameProfile, deleteGameProfile, getTdp, getGpuClock, getLsfg
} from "../backend";
import { success, fail, info } from "../toast";

interface Game { appid: string; name: string; }

const ProfilesPanel: React.FC = () => {
  const [games, setGames] = useState<Game[]>([]);
  const [profiles, setProfiles] = useState<string[]>([]);
  const [selectedGame, setSelectedGame] = useState<string>("");
  const [loading, setLoading] = useState(false);

  const load = async () => {
    setLoading(true);
    try {
      const gr = ((v) => typeof v === "string" ? JSON.parse(v) : v)(await scanGames());
      if (gr.ok) setGames(gr.value);

      const pr = ((v) => typeof v === "string" ? JSON.parse(v) : v)(await listGameProfiles());
      if (pr.ok) setProfiles(pr.value);
    } catch {}
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const saveCurrentAsProfile = async () => {
    if (!selectedGame) { fail("Select a game first"); return; }
    try {
      const tdpR = ((v) => typeof v === "string" ? JSON.parse(v) : v)(await getTdp());
      const gpuR = ((v) => typeof v === "string" ? JSON.parse(v) : v)(await getGpuClock());
      const lsfgR = ((v) => typeof v === "string" ? JSON.parse(v) : v)(await getLsfg());

      const settings = {
        tdp: tdpR.ok ? tdpR.value : 15,
        gpu: gpuR.ok ? gpuR.value : 1600,
        lsfg: lsfgR.ok ? lsfgR.value : { enabled: false, multiplier: 2, flow_rate: 50 },
        saved_at: new Date().toISOString(),
      };

      const r = ((v) => typeof v === "string" ? JSON.parse(v) : v)(await saveGameProfile(selectedGame, JSON.stringify(settings)));
      if (r.ok) {
        success(`Profile saved for ${selectedGame}`);
        await load();
      } else { fail(r.error); }
    } catch (e) { fail(`Save error: ${e}`); }
  };

  const handleDelete = async (name: string) => {
    try {
      const r = ((v) => typeof v === "string" ? JSON.parse(v) : v)(await deleteGameProfile(name));
      r.ok ? success(`Deleted: ${name}`) : fail(r.error);
      await load();
    } catch (e) { fail(`Delete error: ${e}`); }
  };

  const gameOptions = games.map((g) => ({
    label: `${g.name} (${g.appid})`,
    data: `${g.name} (${g.appid})`,
  }));

  return (
    <>
      <PanelSection title={`💾 Game Profiles (${games.length} games found)`}>
        {loading ? (
          <PanelSectionRow>
            <div style={{ color: "#0af", fontSize: 12 }}>Scanning games...</div>
          </PanelSectionRow>
        ) : games.length === 0 ? (
          <PanelSectionRow>
            <div style={{ color: "#f88", fontSize: 12 }}>No games found — check steamapps path</div>
          </PanelSectionRow>
        ) : (
          <>
            <PanelSectionRow>
              <DropdownItem
                label="Select Game"
                rgOptions={gameOptions}
                selectedOption={selectedGame}
                onChange={(opt) => setSelectedGame(opt.data)}
              />
            </PanelSectionRow>
            <PanelSectionRow>
              <ButtonItem layout="below" onClick={saveCurrentAsProfile}>
                💾 Save Current Settings to Profile
              </ButtonItem>
            </PanelSectionRow>
          </>
        )}
      </PanelSection>

      <PanelSection title={`📋 Saved Profiles (${profiles.length})`}>
        {profiles.length === 0 && (
          <PanelSectionRow>
            <div style={{ color: "#888", fontSize: 12 }}>No profiles saved yet</div>
          </PanelSectionRow>
        )}
        {profiles.map((name) => (
          <PanelSectionRow key={name}>
            <ButtonItem
              layout="below"
              onClick={() => handleDelete(name)}
              description="Tap to delete"
            >
              📄 {name}
            </ButtonItem>
          </PanelSectionRow>
        ))}
      </PanelSection>

      <PanelSection>
        <PanelSectionRow>
          <ButtonItem layout="below" onClick={load}>
            🔄 Rescan Games
          </ButtonItem>
        </PanelSectionRow>
      </PanelSection>
    </>
  );
};

export default ProfilesPanel;
