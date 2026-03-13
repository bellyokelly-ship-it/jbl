import React from "react";
import { useState, FC } from "react";
import {
  PanelSection,
  PanelSectionRow,
  ButtonItem,
  TextField,
} from "@decky/ui";
import { getRecommendation, applyRecommendation } from "../backend";

const TIER_COLORS: Record<string, string> = {
  platinum: "#b4c7dc",
  gold: "#cfb53b",
  silver: "#c0c0c0",
  bronze: "#cd7f32",
  borked: "#ff4444",
  unknown: "#888888",
};

export const AutoOptimisePanel: FC = () => {
  const [appid, setAppid] = useState("");
  const [rec, setRec] = useState<any>(null);
  const [status, setStatus] = useState("");
  const [loading, setLoading] = useState(false);

  const handleScan = async () => {
    if (!appid.trim()) {
      setStatus("Enter a Steam AppID");
      return;
    }
    setLoading(true);
    setStatus("Fetching recommendation...");
    try {
      const raw = await getRecommendation(appid.trim());
      const d = JSON.parse(raw);
      setRec(d);
      setStatus(`Tier: ${d.tier.toUpperCase()}`);
    } catch {
      setStatus("Failed to get recommendation");
    }
    setLoading(false);
  };

  const handleApply = async () => {
    if (!appid.trim()) return;
    setLoading(true);
    setStatus("Applying...");
    try {
      const raw = await applyRecommendation(appid.trim());
      const d = JSON.parse(raw);
      setStatus(d.success ? "Settings applied! ✅" : "Apply failed");
    } catch {
      setStatus("Apply failed");
    }
    setLoading(false);
  };

  return (
    <>
      <PanelSection title="🤖 Auto-Optimise">
        <PanelSectionRow>
          <TextField
            label="Steam AppID"
            value={appid}
            onChange={(e) => setAppid(e.target.value)}
          />
        </PanelSectionRow>
        <PanelSectionRow>
          <ButtonItem layout="below" disabled={loading} onClick={handleScan}>
            🔍 Get Recommendation
          </ButtonItem>
        </PanelSectionRow>

        {rec && (
          <>
            <PanelSectionRow>
              <div style={{ width: "100%", padding: "8px", background: "#1a1a2e", borderRadius: "8px" }}>
                <div style={{ textAlign: "center", marginBottom: "8px" }}>
                  <span style={{
                    color: TIER_COLORS[rec.tier] || "#888",
                    fontWeight: "bold", fontSize: "18px"
                  }}>
                    {rec.tier.toUpperCase()}
                  </span>
                </div>
                <div style={{ fontSize: "12px", color: "#ccc", lineHeight: "1.6" }}>
                  <div>⚡ TDP: {rec.tdp}W</div>
                  <div>🎮 GPU: {rec.gpu_clock}MHz</div>
                  <div>🎞️ LSFG: {rec.lsfg_enabled ? `${rec.lsfg_multiplier}x @ ${rec.lsfg_flow_rate}%` : "Off"}</div>
                  <div>🍷 Proton: {rec.proton}</div>
                </div>
              </div>
            </PanelSectionRow>
            <PanelSectionRow>
              <ButtonItem layout="below" disabled={loading} onClick={handleApply}>
                ✅ Apply These Settings
              </ButtonItem>
            </PanelSectionRow>
          </>
        )}

        {status && (
          <PanelSectionRow>
            <div style={{ textAlign: "center", color: "#1a9fff", fontSize: "12px" }}>
              {loading ? "⏳ " : ""}{status}
            </div>
          </PanelSectionRow>
        )}
      </PanelSection>
    </>
  );
};
