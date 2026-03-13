import React, { useState } from "react";
import {
  PanelSection,
  PanelSectionRow,
  ButtonItem,
  ToggleField,
  Focusable,
} from "@decky/ui";
import { protonScan, protonApply, protonApplyAll } from "../backend";
import { success, fail, info } from "../toast";

interface GameResult {
  appid: string;
  name: string;
  tier: string;
  confidence: string;
  score: number;
  current_proton: string;
  recommended_proton: string;
  action: string;
  is_native: boolean;
}

interface ScanStats {
  total: number;
  native: number;
  recommend: number;
  suggest: number;
  ok: number;
  ge_installed: string[];
  official: string[];
  scan_time: string;
}

interface ScanResult {
  games: GameResult[];
  stats: ScanStats;
}

const tierColor = (tier: string): string => {
  switch (tier) {
    case "platinum": return "#66ffcc";
    case "gold":     return "#ffd700";
    case "silver":   return "#c0c0c0";
    case "bronze":   return "#cd7f32";
    case "borked":   return "#ff4444";
    default:         return "#888";
  }
};

const actionBadge = (action: string): { label: string; color: string } => {
  switch (action) {
    case "recommend": return { label: "REC", color: "#ff4444" };
    case "suggest":   return { label: "SUG", color: "#ffaa00" };
    default:          return { label: "OK",  color: "#66ff66" };
  }
};

const confidenceBar = (conf: string | number): string => {
  // Backend sends confidence as string label ("none","low","good","strong")
  // and score as a float 0-1. Handle both gracefully.
  if (typeof conf === "string") {
    const map: Record<string, string> = {
      "strong": "████████░░ strong",
      "good":   "██████░░░░ good",
      "low":    "████░░░░░░ low",
      "none":   "██░░░░░░░░ none",
    };
    return map[conf.toLowerCase()] || `██░░░░░░░░ ${conf}`;
  }
  const pct = Math.round((conf || 0) * 100);
  if (pct >= 85) return `🟢 ${pct}%`;
  if (pct >= 70) return `🟡 ${pct}%`;
  return `🔴 ${pct}%`;
};

const AutoOptimisePanel: React.FC = () => {
  const [scanResult, setScanResult] = useState<ScanResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [applying, setApplying] = useState(false);
  const [dryRun, setDryRun] = useState(true);
  const [filter, setFilter] = useState<"all" | "recommend" | "suggest" | "ok">("all");
  const [appliedIds, setAppliedIds] = useState<Set<string>>(new Set());

  const doScan = async () => {
    setLoading(true);
    setScanResult(null);
    setAppliedIds(new Set());
    try {
      const raw = await protonScan();
      const r = typeof raw === "string" ? JSON.parse(raw) : raw;
      if (r.ok) {
        setScanResult(r.value as ScanResult);
        const s = r.value.stats;
        success(`Scanned ${s.total} games — ${s.recommend} rec, ${s.suggest} sug, ${s.ok} ok`);
      } else {
        fail(r.error || "Scan failed");
      }
    } catch (e) {
      fail(`Scan error: ${e}`);
    }
    setLoading(false);
  };

  const doApplySingle = async (g: GameResult) => {
    try {
      const raw = await protonApply(g.appid, g.recommended_proton, dryRun);
      const r = typeof raw === "string" ? JSON.parse(raw) : raw;
      if (r.ok) {
        if (dryRun) {
          info(`[DRY RUN] ${g.name} → ${g.recommended_proton}`);
        } else {
          success(`${g.name} → ${g.recommended_proton}`);
          setAppliedIds((prev) => new Set(prev).add(g.appid));
        }
      } else {
        fail(r.error || "Apply failed");
      }
    } catch (e) {
      fail(`Apply error: ${e}`);
    }
  };

  const doApplyAll = async (actionType: "recommend" | "both") => {
    if (!scanResult) return;
    setApplying(true);
    const targets = scanResult.games.filter((g) =>
      actionType === "recommend"
        ? g.action === "recommend"
        : g.action === "recommend" || g.action === "suggest"
    );
    const payload = targets.map((g) => ({
      appid: g.appid,
      version: g.recommended_proton,
    }));
    try {
      const raw = await protonApplyAll(JSON.stringify(payload), dryRun);
      const r = typeof raw === "string" ? JSON.parse(raw) : raw;
      if (r.ok) {
        const res = r.value;
        if (dryRun) {
          info(`[DRY RUN] ${res.applied ?? payload.length} changes previewed`);
        } else {
          success(`Applied ${res.applied} / ${res.total} changes`);
          const newSet = new Set(appliedIds);
          targets.forEach((g) => newSet.add(g.appid));
          setAppliedIds(newSet);
        }
      } else {
        fail(r.error || "Batch apply failed");
      }
    } catch (e) {
      fail(`Batch error: ${e}`);
    }
    setApplying(false);
  };

  const filteredGames = scanResult
    ? scanResult.games.filter((g) => {
        if (g.is_native) return false;
        if (filter === "all") return true;
        if (filter === "ok") return g.action === "none";
        return g.action === filter;
      })
    : [];

  const stats = scanResult?.stats;

  return (
    <>
      <PanelSection title="🤖 Auto-Optimise">
        <PanelSectionRow>
          <ToggleField
            label="Dry Run Mode"
            description={dryRun ? "Preview only — nothing changed" : "⚠ LIVE — writes to Steam config"}
            checked={dryRun}
            onChange={setDryRun}
          />
        </PanelSectionRow>
        <PanelSectionRow>
          <ButtonItem layout="below" onClick={doScan} disabled={loading}>
            {loading ? "⏳ Scanning..." : "🔍 Scan All Games"}
          </ButtonItem>
        </PanelSectionRow>
      </PanelSection>

      {stats && (
        <PanelSection title="📊 Scan Results">
          <PanelSectionRow>
            <div style={{ fontSize: 11, lineHeight: "1.6", color: "#ccc" }}>
              <div>🎮 <strong>{stats.total}</strong> games scanned</div>
              <div>🟢 <strong>{stats.ok}</strong> already optimal</div>
              <div style={{ color: "#ff4444" }}>🔴 <strong>{stats.recommend}</strong> recommended changes</div>
              <div style={{ color: "#ffaa00" }}>🟡 <strong>{stats.suggest}</strong> suggestions</div>
              <div>🐧 <strong>{stats.native}</strong> native Linux</div>
              <div style={{ color: "#888", marginTop: 4 }}>
                GE: {((stats.ge_installed || []) || []).join(", ") || "none"}
              </div>
            </div>
          </PanelSectionRow>
          {stats.recommend > 0 && (
            <PanelSectionRow>
              <ButtonItem layout="below" onClick={() => doApplyAll("recommend")} disabled={applying}>
                {applying ? "⏳ Applying..." : `🔴 Apply ${stats.recommend} Recommended`}
              </ButtonItem>
            </PanelSectionRow>
          )}
          {(stats.recommend + stats.suggest) > 0 && (
            <PanelSectionRow>
              <ButtonItem layout="below" onClick={() => doApplyAll("both")} disabled={applying}>
                {applying ? "⏳ Applying..." : `⚡ Apply All ${stats.recommend + stats.suggest} Changes`}
              </ButtonItem>
            </PanelSectionRow>
          )}
        </PanelSection>
      )}

      {scanResult && (
        <PanelSection title="🎮 Games">
          <PanelSectionRow>
            <Focusable style={{ display: "flex", gap: "6px", flexWrap: "wrap" }}>
              {(["all", "recommend", "suggest", "ok"] as const).map((f) => (
                <Focusable
                  key={f}
                  onActivate={() => setFilter(f)}
                  onClick={() => setFilter(f)}
                  style={{
                    background: filter === f ? "#0af" : "#333",
                    color: filter === f ? "#000" : "#aaa",
                    borderRadius: "4px",
                    padding: "4px 10px",
                    fontSize: 11,
                    fontWeight: filter === f ? 700 : 400,
                    cursor: "pointer",
                    textAlign: "center" as const,
                  }}
                >
                  {f === "all" ? `All (${scanResult.games.filter((g) => !g.is_native).length})`
                    : f === "recommend" ? `Rec (${stats?.recommend ?? 0})`
                    : f === "suggest" ? `Sug (${stats?.suggest ?? 0})`
                    : `OK (${stats?.ok ?? 0})`}
                </Focusable>
              ))}
            </Focusable>
          </PanelSectionRow>

          <div style={{ maxHeight: 350, overflow: "auto" }}>
            {filteredGames.map((g) => {
              const badge = actionBadge(g.action);
              const applied = appliedIds.has(g.appid);
              return (
                <PanelSectionRow key={g.appid}>
                  <Focusable
                    style={{
                      display: "flex",
                      flexDirection: "column",
                      gap: "2px",
                      padding: "6px 0",
                      borderBottom: "1px solid #222",
                      opacity: applied ? 0.5 : 1,
                      width: "100%",
                    }}
                  >
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                      <span style={{ color: "#eee", fontSize: 12, fontWeight: 600, flex: 1 }}>
                        {g.name}
                      </span>
                      <span style={{
                        color: tierColor(g.tier),
                        fontSize: 10,
                        fontWeight: 700,
                        textTransform: "uppercase",
                        marginLeft: 8,
                      }}>
                        {g.tier}
                      </span>
                    </div>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", fontSize: 10 }}>
                      <span style={{ color: "#888" }}>
                        {g.current_proton} → <span style={{ color: "#0af" }}>{g.recommended_proton}</span>
                      </span>
                      <span style={{ color: "#888" }}>{confidenceBar(g.confidence)}</span>
                    </div>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: 2 }}>
                      <span style={{
                        background: badge.color,
                        color: "#000",
                        fontSize: 9,
                        fontWeight: 700,
                        padding: "1px 6px",
                        borderRadius: "3px",
                        display: "inline-block",
                      }}>
                        {applied ? "✅ APPLIED" : badge.label}
                      </span>
                      {g.action !== "none" && !applied && (
                        <Focusable
                          onActivate={(e: any) => { e?.stopPropagation?.(); doApplySingle(g); }}
                          onOKButton={(e: any) => { e?.stopPropagation?.(); doApplySingle(g); }}
                          onGamepadFocus={() => {}}
                          style={{
                            background: g.action === "recommend" ? "#ff4444" : "#ffaa00",
                            color: "#000",
                            borderRadius: "4px",
                            padding: "3px 10px",
                            fontSize: 10,
                            fontWeight: 700,
                            cursor: "pointer",
                            textAlign: "center" as const,
                          }}
                        >
                          {dryRun ? "Preview" : "Apply"}
                        </Focusable>
                      )}
                    </div>
                  </Focusable>
                </PanelSectionRow>
              );
            })}
          </div>
        </PanelSection>
      )}
    </>
  );
};

export default AutoOptimisePanel;
