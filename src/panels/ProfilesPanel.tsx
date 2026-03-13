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

const parse = (v: any) => typeof v === "string" ? JSON.parse(v) : v;

const ProfilesPanel: React.FC = () => {
  const [games, setGames] = useState<Game[]>([]);
  const [profiles, setProfiles] = useState<string[]>([]);
  const [sel, setSel] = useState<string>("");
  const [ready, setReady] = useState(false);

  const load = async () => {
    try {
      const gr = parse(await scanGames());
      if (gr.ok) setGames(gr.value);
      const pr = parse(await listGameProfiles());
      if (pr.ok) setProfiles(pr.value);
    } catch {}
    setReady(true);
  };

  useEffect(() => { load(); }, []);

  const save = async () => {
    if (!sel) { fail("Select a game"); return; }
    try {
      const t = parse(await getTdp());
      const g = parse(await getGpuClock());
      const l = parse(await getLsfg());
      const r = parse(await saveGameProfile(sel, JSON.stringify({
        tdp: t.ok ? t.value : 12,
        gpu_clock: g.ok ? g.value : 1100,
        lsfg_enabled: l.ok ? l.value.enabled : false,
        lsfg_multiplier: l.ok ? l.value.multiplier : 2,
        lsfg_flow: l.ok ? l.value.flow : 50,
      })));
      if (r.ok) { success("Saved"); load(); } else fail(r.error);
    } catch (e: any) { fail(e.message); }
  };

  const del = async (n: string) => {
    try { const r = parse(await deleteGameProfile(n)); if (r.ok) { success("Deleted"); load(); } } catch {}
  };

  if (!ready) return (
    <PanelSection title="💾 Profiles">
      <PanelSectionRow>
        <div style={{ color: "#0af", fontSize: 12 }}>Loading...</div>
      </PanelSectionRow>
    </PanelSection>
  );

  return (
    <PanelSection title="💾 Profiles">
      {games.length > 0 ? (
        <>
          <PanelSectionRow>
            <DropdownItem
              label="Game"
              rgOptions={games.map(g => ({ data: g.appid, label: g.name }))}
              selectedOption={sel}
              onChange={(o) => setSel(o.data)}
            />
          </PanelSectionRow>
          <PanelSectionRow>
            <ButtonItem layout="below" onClick={save}>💾 Save Current</ButtonItem>
          </PanelSectionRow>
        </>
      ) : (
        <PanelSectionRow>
          <div style={{ color: "#f88", fontSize: 12 }}>No games found</div>
        </PanelSectionRow>
      )}
      {profiles.map((n) => (
        <PanelSectionRow key={n}>
          <ButtonItem
            layout="below"
            onClick={() => {
              getGameProfile(n).then(r => {
                const p = parse(r);
                if (p.ok) info(`${n}\nTDP:${p.value.tdp}W GPU:${p.value.gpu_clock}MHz`);
              });
            }}
          >
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <span style={{ fontSize: 12 }}>{n}</span>
              <span
                style={{ color: "#f66", fontSize: 10 }}
                onClick={(e) => { e.stopPropagation(); del(n); }}
              >✕</span>
            </div>
          </ButtonItem>
        </PanelSectionRow>
      ))}
      <PanelSectionRow>
        <ButtonItem layout="below" onClick={load}>🔄 Refresh</ButtonItem>
      </PanelSectionRow>
    </PanelSection>
  );
};

export default ProfilesPanel;
