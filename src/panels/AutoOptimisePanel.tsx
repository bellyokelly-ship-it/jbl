import React, { useState, useEffect } from "react";
import {
  PanelSection,
  PanelSectionRow,
  ButtonItem,
  ToggleField,
} from "@decky/ui";
import { scanGames } from "../backend";
import { success, fail, info } from "../toast";

interface Game { appid: string; name: string; }

const AutoOptimisePanel: React.FC = () => {
  const [games, setGames] = useState<Game[]>([]);
  const [autoEnabled, setAutoEnabled] = useState(false);
  const [loading, setLoading] = useState(false);

  const scan = async () => {
    setLoading(true);
    try {
      const r = JSON.parse(await scanGames());
      if (r.ok) {
        setGames(r.value);
        info(`Found ${r.value.length} installed games`);
      } else { fail(r.error); }
    } catch (e) { fail(`Scan error: ${e}`); }
    setLoading(false);
  };

  useEffect(() => { scan(); }, []);

  return (
    <>
      <PanelSection title="🤖 Auto-Optimise">
        <PanelSectionRow>
          <ToggleField
            label="Auto-apply profiles on game launch"
            description="Automatically applies saved power/LSFG profiles when a game starts"
            checked={autoEnabled}
            onChange={(v) => {
              setAutoEnabled(v);
              v ? success("Auto-optimise enabled") : info("Auto-optimise disabled");
            }}
          />
        </PanelSectionRow>
      </PanelSection>

      <PanelSection title={`🎮 Installed Games (${games.length})`}>
        {loading && (
          <PanelSectionRow>
            <div style={{ color: "#0af", fontSize: 12 }}>Scanning...</div>
          </PanelSectionRow>
        )}
        {!loading && games.length === 0 && (
          <PanelSectionRow>
            <div style={{ color: "#f88", fontSize: 12 }}>No games found</div>
          </PanelSectionRow>
        )}
        <div style={{ maxHeight: 300, overflow: "auto" }}>
          {games.map((g) => (
            <PanelSectionRow key={g.appid}>
              <div style={{
                display: "flex", justifyContent: "space-between",
                padding: "4px 0", fontSize: 12
              }}>
                <span style={{ color: "#ccc" }}>{g.name}</span>
                <span style={{ color: "#888" }}>{g.appid}</span>
              </div>
            </PanelSectionRow>
          ))}
        </div>
      </PanelSection>

      <PanelSection>
        <PanelSectionRow>
          <ButtonItem layout="below" onClick={scan}>
            🔄 Rescan Games
          </ButtonItem>
        </PanelSectionRow>
      </PanelSection>
    </>
  );
};

export default AutoOptimisePanel;
