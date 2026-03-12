import { Focusable, ButtonItem, ToggleField, DropdownItem } from "@decky/ui";
import { callable } from "@decky/api";
import { useState, useEffect } from "react";
import { JBL, jblCard, jblCardGlow, jblHeader, jblHeaderTitle, jblHeaderSub, jblStatusBadge } from "../styles";

const scanProtonAdvisor = callable<[], any>("scan_proton_advisor");
const getGameRecommendation = callable<[string, string], any>("get_game_recommendation");
const applyGameOptimisation = callable<[string, string, number, number], any>("apply_game_optimisation");
const getAutoOptimiseStatus = callable<[], any>("get_auto_optimise_status");
const setAutoOptimise = callable<[string, boolean], any>("set_auto_optimise");

interface GameResult {
  appid: string;
  name: string;
  protondb_tier: string;
  current_proton: string;
  recommended: string;
  status: string;
  reason: string;
}

interface FullRec {
  proton_version: string;
  proton_reason: string;
  tdp: number;
  gpu_clock: number;
  lsfg_enabled: boolean;
  lsfg_multiplier: number;
  lsfg_flow: number;
  power_reason: string;
  current_proton: string;
  protondb_tier: string;
  mode: string;
}

const tierColor = (tier: string): string => {
  switch (tier) {
    case "platinum": return "#b4c7dc";
    case "gold": return JBL.amber;
    case "silver": return "#a0a0a0";
    case "bronze": return "#cd7f32";
    case "borked": return JBL.red;
    case "native": return JBL.green;
    default: return JBL.textDim;
  }
};

const tierEmoji = (tier: string): string => {
  switch (tier) {
    case "platinum": return "💎";
    case "gold": return "🥇";
    case "silver": return "🥈";
    case "bronze": return "🥉";
    case "borked": return "💀";
    case "native": return "🐧";
    default: return "❓";
  }
};

export const AutoOptimisePanel = () => {
  const [games, setGames] = useState<GameResult[]>([]);
  const [scanning, setScanning] = useState(false);
  const [selectedAppId, setSelectedAppId] = useState<string | null>(null);
  const [recommendation, setRecommendation] = useState<FullRec | null>(null);
  const [loadingRec, setLoadingRec] = useState(false);
  const [applying, setApplying] = useState(false);
  const [applyResult, setApplyResult] = useState("");
  const [mode, setMode] = useState<"handheld" | "docked">("handheld");
  const [autoProton, setAutoProton] = useState(false);
  const [autoProfiles, setAutoProfiles] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        const raw = await getAutoOptimiseStatus();
        const s = typeof raw === "string" ? JSON.parse(raw) : raw;
        setAutoProton(s.auto_proton || false);
        setAutoProfiles(s.auto_apply_profiles || false);
      } catch {}
    })();
  }, []);

  const doScan = async () => {
    setScanning(true);
    setGames([]);
    setSelectedAppId(null);
    setRecommendation(null);
    setApplyResult("");
    try {
      const raw = await scanProtonAdvisor();
      const data = typeof raw === "string" ? JSON.parse(raw) : raw;
      setGames(data || []);
    } catch (e: any) {
      setApplyResult("Scan failed: " + e.message);
    }
    setScanning(false);
  };

  const selectGame = async (appid: string) => {
    setSelectedAppId(appid);
    setRecommendation(null);
    setApplyResult("");
    setLoadingRec(true);
    try {
      const raw = await getGameRecommendation(appid, mode);
      const data = typeof raw === "string" ? JSON.parse(raw) : raw;
      if (data.success) {
        setRecommendation(data);
      } else {
        setApplyResult("Failed to get recommendation: " + (data.error || "unknown"));
      }
    } catch (e: any) {
      setApplyResult("Error: " + e.message);
    }
    setLoadingRec(false);
  };

  const applyChanges = async () => {
    if (!recommendation || !selectedAppId) return;
    setApplying(true);
    setApplyResult("");
    try {
      const raw = await applyGameOptimisation(
        selectedAppId,
        recommendation.proton_version,
        recommendation.tdp,
        recommendation.gpu_clock
      );
      const data = typeof raw === "string" ? JSON.parse(raw) : raw;
      if (data.success) {
        setApplyResult("✅ Applied successfully!");
      } else {
        setApplyResult("❌ " + (data.error || "Apply failed"));
      }
    } catch (e: any) {
      setApplyResult("❌ " + e.message);
    }
    setApplying(false);
  };

  const selectedGame = games.find((g) => g.appid === selectedAppId);

  return (
    <Focusable style={{ display: "flex", flexDirection: "column", gap: "8px", padding: "8px 0" }}>
      {/* Header */}
      <div style={jblCard}>
        <div style={jblHeader}>
          <span style={jblHeaderTitle}>🔧 Auto Optimise</span>
          <span style={jblHeaderSub}>Per-game Proton + Power + LSFG</span>
        </div>
      </div>

      {/* Mode Toggle */}
      <Focusable style={{ ...jblCard, display: "flex", gap: "8px", justifyContent: "center" }}>
        <Focusable
          onActivate={() => setMode("handheld")}
          onClick={() => setMode("handheld")}
          style={{
            padding: "6px 16px",
            borderRadius: "6px",
            background: mode === "handheld" ? JBL.cyan : JBL.surfaceDark,
            color: mode === "handheld" ? "#000" : JBL.textDim,
            fontWeight: "bold",
            fontSize: "12px",
            cursor: "pointer",
          }}
        >
          🎮 Handheld
        </Focusable>
        <Focusable
          onActivate={() => setMode("docked")}
          onClick={() => setMode("docked")}
          style={{
            padding: "6px 16px",
            borderRadius: "6px",
            background: mode === "docked" ? JBL.amber : JBL.surfaceDark,
            color: mode === "docked" ? "#000" : JBL.textDim,
            fontWeight: "bold",
            fontSize: "12px",
            cursor: "pointer",
          }}
        >
          🖥️ Docked
        </Focusable>
      </Focusable>

      {/* Scan Button */}
      <Focusable style={jblCard}>
        <ButtonItem layout="below" onClick={doScan} disabled={scanning}>
          {scanning ? "🔍 Scanning games..." : "🔍 Scan Installed Games"}
        </ButtonItem>
      </Focusable>

      {/* Game List */}
      {games.length > 0 && !selectedAppId && (
        <div style={jblCard}>
          <div style={jblHeader}>
            <span style={jblHeaderTitle}>📋 {games.length} Games Found</span>
            <span style={jblHeaderSub}>Select a game to preview optimisation</span>
          </div>
          <Focusable style={{ display: "flex", flexDirection: "column", gap: "4px", maxHeight: "300px", overflowY: "auto" }}>
            {games.map((g) => (
              <Focusable
                key={g.appid}
                onActivate={() => selectGame(g.appid)}
                onClick={() => selectGame(g.appid)}
                focusWithinClassName="gpfocuswithin"
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  padding: "8px 10px",
                  borderRadius: "6px",
                  background: JBL.surfaceDark,
                  cursor: "pointer",
                  border: `1px solid ${JBL.cardBorder}`,
                }}
              >
                <span style={{ color: JBL.text, fontSize: "12px", flex: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                  {g.name}
                </span>
                <span style={{
                  ...jblStatusBadge(tierColor(g.protondb_tier)),
                  fontSize: "10px",
                  marginLeft: "6px",
                  flexShrink: 0,
                }}>
                  {tierEmoji(g.protondb_tier)} {g.protondb_tier.toUpperCase()}
                </span>
              </Focusable>
            ))}
          </Focusable>
        </div>
      )}

      {/* Loading Recommendation */}
      {loadingRec && (
        <div style={{ ...jblCard, textAlign: "center" as any }}>
          <span style={{ color: JBL.cyan }}>⏳ Fetching recommendation for {mode} mode...</span>
        </div>
      )}

      {/* Preview Recommendation */}
      {recommendation && selectedGame && (
        <div style={jblCardGlow}>
          <div style={jblHeader}>
            <span style={jblHeaderTitle}>📊 {selectedGame.name}</span>
            <span style={jblHeaderSub}>
              {tierEmoji(recommendation.protondb_tier)} {recommendation.protondb_tier.toUpperCase()} — {recommendation.mode} mode
            </span>
          </div>

          {/* Current vs Recommended Table */}
          <div style={{ display: "flex", flexDirection: "column", gap: "6px", marginTop: "8px" }}>
            {[
              { label: "Proton", current: recommendation.current_proton, rec: recommendation.proton_version },
              { label: "TDP", current: "Current", rec: `${recommendation.tdp}W` },
              { label: "GPU Clock", current: "Current", rec: `${recommendation.gpu_clock} MHz` },
              { label: "LSFG", current: "—", rec: recommendation.lsfg_enabled ? `${recommendation.lsfg_multiplier}x @ ${recommendation.lsfg_flow}%` : "Off" },
            ].map((row, i) => (
              <div key={i} style={{
                display: "grid",
                gridTemplateColumns: "70px 1fr 1fr",
                gap: "4px",
                padding: "4px 8px",
                borderRadius: "4px",
                background: i % 2 === 0 ? JBL.surfaceDark : "transparent",
                fontSize: "11px",
              }}>
                <span style={{ color: JBL.textDim, fontWeight: "bold" }}>{row.label}</span>
                <span style={{ color: JBL.textDim }}>{row.current}</span>
                <span style={{ color: JBL.cyan, fontWeight: "bold" }}>{row.rec}</span>
              </div>
            ))}
          </div>

          {/* Reasons */}
          <div style={{ marginTop: "8px", padding: "6px 8px", borderRadius: "4px", background: JBL.surfaceDark, fontSize: "10px" }}>
            <div style={{ color: JBL.textDim }}>🧬 {recommendation.proton_reason}</div>
            <div style={{ color: JBL.textDim, marginTop: "2px" }}>⚡ {recommendation.power_reason}</div>
          </div>

          {/* Action Buttons */}
          <Focusable style={{ display: "flex", gap: "8px", marginTop: "10px" }}>
            <Focusable
              onActivate={applyChanges}
              onClick={applyChanges}
              style={{
                flex: 1,
                padding: "8px",
                borderRadius: "6px",
                background: applying ? JBL.surfaceDark : JBL.green,
                color: "#000",
                fontWeight: "bold",
                fontSize: "12px",
                textAlign: "center" as any,
                cursor: "pointer",
                opacity: applying ? 0.6 : 1,
              }}
            >
              {applying ? "Applying..." : "✅ Apply Changes"}
            </Focusable>
            <Focusable
              onActivate={() => { setSelectedAppId(null); setRecommendation(null); setApplyResult(""); }}
              onClick={() => { setSelectedAppId(null); setRecommendation(null); setApplyResult(""); }}
              style={{
                flex: 1,
                padding: "8px",
                borderRadius: "6px",
                background: JBL.surfaceDark,
                color: JBL.textDim,
                fontWeight: "bold",
                fontSize: "12px",
                textAlign: "center" as any,
                cursor: "pointer",
                border: `1px solid ${JBL.cardBorder}`,
              }}
            >
              ↩️ Back to List
            </Focusable>
          </Focusable>

          {/* Apply Result */}
          {applyResult && (
            <div style={{
              marginTop: "6px",
              padding: "6px 8px",
              borderRadius: "4px",
              background: applyResult.includes("✅") ? "rgba(0,255,100,0.1)" : "rgba(255,0,0,0.1)",
              color: applyResult.includes("✅") ? JBL.green : JBL.red,
              fontSize: "11px",
              textAlign: "center" as any,
            }}>
              {applyResult}
            </div>
          )}
        </div>
      )}

      {/* Auto Settings */}
      <div style={jblCard}>
        <div style={jblHeader}>
          <span style={jblHeaderTitle}>⚙️ Automation</span>
        </div>
        <ToggleField
          label="Auto-apply profiles on game launch"
          checked={autoProfiles}
          onChange={(v: boolean) => { setAutoProfiles(v); setAutoOptimise("auto_apply_profiles", v); }}
        />
        <ToggleField
          label="Auto Proton upgrades"
          checked={autoProton}
          onChange={(v: boolean) => { setAutoProton(v); setAutoOptimise("auto_proton", v); }}
        />
      </div>

      {/* Status */}
      {applyResult && !recommendation && (
        <div style={{ ...jblCard, textAlign: "center" as any }}>
          <span style={{ color: applyResult.includes("fail") ? JBL.red : JBL.cyan, fontSize: "11px" }}>
            {applyResult}
          </span>
        </div>
      )}
    </Focusable>
  );
};
