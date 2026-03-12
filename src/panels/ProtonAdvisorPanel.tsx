import {
  PanelSection,
  PanelSectionRow,
  ButtonItem,
  TextField,
  Focusable,
} from "@decky/ui";
import { callable } from "@decky/api";
import { useState } from "react";
import { JBL, jblCard, jblCardGlow, jblHeader, jblHeaderTitle, jblHeaderSub, jblStatusBadge } from "../styles";

interface ProtonDBReport {
  tier: string;
  confidence: string;
  score: number;
  trending: string;
  best_reported_tier: string;
  best_reported_version: string;
  best_reported_version: string;
  protondb_url: string;
}

interface ProtonDB {
  tier: string;
  confidence: string;
  score: number;
  trending: string;
  best_reported_version: string;
  total_reports: number;
}

const lookupProtonDB = callable<[string], ProtonDBReport>("lookup_protondb");
const getRunningGame = callable<[], string>("get_running_game");

const tierColors: Record<string, string> = {
  platinum: "#b4c7dc",
  gold: "#cfb53b",
  silver: "#a0a0a0",
  bronze: "#cd7f32",
  borked: JBL.red,
  pending: JBL.textMuted,
  native: JBL.green,
};

const tierEmoji: Record<string, string> = {
  platinum: "💎",
  gold: "🥇",
  silver: "🥈",
  bronze: "🥉",
  borked: "💀",
  pending: "⏳",
  native: "🐧",
};

export const ProtonAdvisorPanel = () => {
  const [appId, setAppId] = useState("");
  const [report, setReport] = useState<ProtonDBReport | null>(null);
  const [status, setStatus] = useState("");
  const [statusColor, setStatusColor] = useState(JBL.cyan);
  const [loading, setLoading] = useState(false);

  const detectGame = async () => {
    setStatus("🔍 Detecting running game...");
    setStatusColor(JBL.cyan);
    try {
      const raw = await getRunningGame();
      const parsed = typeof raw === "string" ? JSON.parse(raw) : raw;
      if (parsed && parsed.appid) {
        setAppId(String(parsed.appid));
        setStatus("✅ Detected App ID: " + parsed.appid);
        setStatusColor(JBL.green);
      } else {
        setStatus("⚠️ No game running — enter App ID manually");
        setStatusColor(JBL.amber);
      }
    } catch {
      setStatus("❌ Detection failed");
      setStatusColor(JBL.red);
    }
  };

  const lookup = async () => {
    const id = appId.trim();
    if (!id) {
      setStatus("⚠️ Enter a Steam App ID");
      setStatusColor(JBL.amber);
      return;
    }
    setLoading(true);
    setReport(null);
    setStatus("🔍 Looking up " + id + "...");
    setStatusColor(JBL.cyan);
    try {
      const res = await lookupProtonDB(id);
      if (res && res.tier) {
        setReport(res);
        setStatus("✅ Found — rated " + res.tier);
        setStatusColor(JBL.green);
      } else {
        setStatus("⚠️ No data found for " + id);
        setStatusColor(JBL.amber);
      }
    } catch {
      setStatus("❌ Lookup failed");
      setStatusColor(JBL.red);
    }
    setLoading(false);
  };

  const tier = report?.tier?.toLowerCase() || "";
  const tColor = tierColors[tier] || JBL.textMuted;
  const tEmoji = tierEmoji[tier] || "❓";

  return (
    <div>
      {/* Header */}
      <div style={jblCard}>
        <div style={jblHeader}>
          <span style={jblHeaderTitle}>🧪 Proton Advisor</span>
        </div>
        <span style={jblHeaderSub}>ProtonDB compatibility lookup</span>
      </div>

      {/* Detection + Input */}
      <div style={jblCard}>
        <div style={{ ...jblHeader, marginBottom: "8px" }}>
          <span style={jblHeaderTitle}>Game Detection</span>
        </div>
        <PanelSection>
          <PanelSectionRow>
            <ButtonItem layout="below" onClick={detectGame}>
              🎮 Detect Running Game
            </ButtonItem>
          </PanelSectionRow>
          <PanelSectionRow>
            <TextField
              label="Steam App ID"
              value={appId}
              onChange={(e) => setAppId(e.target.value)}
            />
          </PanelSectionRow>
          <PanelSectionRow>
            <ButtonItem layout="below" onClick={lookup} disabled={loading}>
              {loading ? "Looking up..." : "🔍 Lookup on ProtonDB"}
            </ButtonItem>
          </PanelSectionRow>
        </PanelSection>
      </div>

      {/* Report */}
      {report && (
        <div style={{ ...jblCard, ...jblCardGlow, borderColor: tColor + "44" }}>
          <div style={{ ...jblHeader, marginBottom: "10px" }}>
            <span style={jblHeaderTitle}>{tEmoji} ProtonDB Report</span>
            <span style={{
              ...jblStatusBadge,
              background: tColor + "22",
              color: tColor,
              textTransform: "capitalize" as const,
            }}>
              {report.tier}
            </span>
          </div>

          <Focusable style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "8px" }}>
            {[
              { label: "Confidence", value: report.confidence },
              { label: "Score", value: String(report.score) },
              { label: "Trending", value: report.trending },
              { label: "Reports", value: String(report.total_reports) },
            ].map(item => (
              <div key={item.label} style={{
                background: JBL.surfaceDark,
                borderRadius: "6px",
                padding: "8px",
                textAlign: "center" as const,
              }}>
                <div style={{ fontSize: "9px", color: JBL.textMuted, marginBottom: "2px" }}>{item.label}</div>
                <div style={{ fontSize: "13px", fontWeight: 700, color: JBL.textPrimary }}>{item.value}</div>
              </div>
            ))}
          </Focusable>

          {report.best_reported_version && (
            <div style={{
              marginTop: "10px",
              padding: "8px",
              background: JBL.surfaceDark,
              borderRadius: "6px",
              textAlign: "center" as const,
            }}>
              <div style={{ fontSize: "9px", color: JBL.textMuted }}>Best Proton</div>
              <div style={{ fontSize: "13px", fontWeight: 700, color: JBL.cyan }}>{report.best_reported_version}</div>
            </div>
          )}
        </div>
      )}

      {/* Status */}
      {status && (
        <div style={{
          ...jblCard,
          borderColor: statusColor + "44",
        }}>
          <span style={{ fontSize: "12px", color: statusColor }}>{status}</span>
        </div>
      )}
    </div>
  );
};
