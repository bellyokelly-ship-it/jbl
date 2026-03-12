import {
  PanelSection,
  PanelSectionRow,
  ButtonItem,
} from "@decky/ui";
import { callable } from "@decky/api";
import { useState, useEffect, useRef } from "react";
import { JBL, jblCard, jblCardGlow, jblHeader, jblHeaderTitle, jblHeaderSub, jblStatusBadge } from "../styles";

const getHealth = callable<[], {
  cpu_temp_c: number;
  gpu_temp_c: number;
  fan_rpm: number;
  battery: {
    capacity_percent: number;
    status: string;
    power_draw_w: number;
  };
  timestamp: number;
}>("get_health");

const tempColor = (t: number): string => {
  if (t < 55) return JBL.green;
  if (t < 70) return JBL.cyan;
  if (t < 80) return JBL.amber;
  return JBL.red;
};

const battColor = (b: number): string => {
  if (b > 60) return JBL.green;
  if (b > 30) return JBL.amber;
  return JBL.red;
};

const ProgressBar = ({ value, max, color, label }: { value: number; max: number; color: string; label: string }) => {
  const pct = Math.min(100, Math.max(0, (value / max) * 100));
  return (
    <div style={{ marginBottom: "10px" }}>
      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "4px" }}>
        <span style={{ fontSize: "11px", color: JBL.textSecondary }}>{label}</span>
        <span style={{ fontSize: "12px", fontWeight: 700, color }}>{value}{max === 100 ? "%" : max > 200 ? " RPM" : "°C"}</span>
      </div>
      <div style={{
        height: "6px",
        borderRadius: "3px",
        background: JBL.surfaceDark,
        overflow: "hidden",
      }}>
        <div style={{
          width: `${pct}%`,
          height: "100%",
          borderRadius: "3px",
          background: `linear-gradient(90deg, ${color}88, ${color})`,
          boxShadow: `0 0 8px ${color}44`,
          transition: "width 0.5s ease",
        }} />
      </div>
    </div>
  );
};

export const HealthPanel = () => {
  const [health, setHealth] = useState<any>(null);
  const [error, setError] = useState("");
  const [autoRefresh, setAutoRefresh] = useState(true);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const refresh = async () => {
    try {
      const res = await getHealth();
      setHealth(res);
      setError("");
    } catch (e: any) {
      setError(e.message || "Failed to read health");
    }
  };

  useEffect(() => {
    refresh();
  }, []);

  useEffect(() => {
    if (autoRefresh) {
      intervalRef.current = setInterval(refresh, 3000);
    }
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [autoRefresh]);

  const cpuTemp = health?.cpu_temp_c ?? -1;
  const gpuTemp = health?.gpu_temp_c ?? -1;
  const fanRpm = health?.fan_rpm ?? -1;
  const battPct = health?.battery?.capacity_percent ?? -1;
  const battStatus = health?.battery?.status ?? "Unknown";
  const powerDraw = health?.battery?.power_draw_w ?? -1;

  return (
    <PanelSection>
      <div style={jblCard}>
        <div style={jblHeader}>
          <div style={jblHeaderTitle}>🩺 System Health</div>
          <div style={jblHeaderSub}>Live hardware monitoring</div>
        </div>
      </div>

      {error ? (
        <div style={{ ...jblCard, borderColor: JBL.red + "40" }}>
          <span style={{ color: JBL.red, fontSize: "12px" }}>❌ {error}</span>
        </div>
      ) : !health ? (
        <div style={jblCard}>
          <span style={{ color: JBL.textMuted, fontSize: "12px" }}>Loading...</span>
        </div>
      ) : (
        <>
          <div style={jblCardGlow(tempColor(Math.max(cpuTemp, gpuTemp)))}>
            <div style={{ fontSize: "12px", fontWeight: 600, color: JBL.textPrimary, marginBottom: "8px" }}>🌡️ Thermals</div>
            <ProgressBar value={cpuTemp} max={105} color={tempColor(cpuTemp)} label="CPU Temperature" />
            <ProgressBar value={gpuTemp} max={105} color={tempColor(gpuTemp)} label="GPU Temperature" />
          </div>

          <div style={jblCard}>
            <div style={{ fontSize: "12px", fontWeight: 600, color: JBL.textPrimary, marginBottom: "8px" }}>🌀 Fan</div>
            <ProgressBar value={fanRpm} max={5000} color={JBL.cyan} label="Fan Speed" />
          </div>

          <div style={jblCardGlow(battColor(battPct))}>
            <div style={{ fontSize: "12px", fontWeight: 600, color: JBL.textPrimary, marginBottom: "8px" }}>🔋 Battery</div>
            <ProgressBar value={battPct} max={100} color={battColor(battPct)} label="Charge Level" />
            <div style={{ display: "flex", justifyContent: "space-between", marginTop: "6px" }}>
              <span style={jblStatusBadge(battStatus === "Charging" ? JBL.green : JBL.cyan)}>
                {battStatus === "Charging" ? "⚡" : "🔌"} {battStatus}
              </span>
              {powerDraw >= 0 && (
                <span style={{ fontSize: "11px", color: JBL.textSecondary }}>
                  {powerDraw.toFixed(1)}W draw
                </span>
              )}
            </div>
          </div>
        </>
      )}

      <PanelSectionRow>
        <ButtonItem layout="below" onClick={() => setAutoRefresh(!autoRefresh)}>
          {autoRefresh ? "⏸ Pause Auto-Refresh" : "▶️ Resume Auto-Refresh"}
        </ButtonItem>
      </PanelSectionRow>
      <PanelSectionRow>
        <ButtonItem layout="below" onClick={refresh}>
          🔄 Refresh Now
        </ButtonItem>
      </PanelSectionRow>
    </PanelSection>
  );
};
