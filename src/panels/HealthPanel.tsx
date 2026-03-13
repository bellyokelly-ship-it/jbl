import React from "react";
import { useState, useEffect, FC } from "react";
import {
  PanelSection,
  PanelSectionRow,
  ButtonItem,
} from "@decky/ui";
import { getHealth } from "../backend";

const Bar: FC<{ label: string; value: number; max: number; unit: string; color: string }> = ({ label, value, max, unit, color }) => (
  <div style={{ marginBottom: "8px" }}>
    <div style={{ display: "flex", justifyContent: "space-between", fontSize: "13px", marginBottom: "2px" }}>
      <span>{label}</span>
      <span style={{ color }}>{value}{unit}</span>
    </div>
    <div style={{ background: "#333", borderRadius: "4px", height: "8px", overflow: "hidden" }}>
      <div style={{
        width: `${Math.min((value / max) * 100, 100)}%`,
        height: "100%",
        background: color,
        borderRadius: "4px",
        transition: "width 0.3s ease"
      }} />
    </div>
  </div>
);

export const HealthPanel: FC = () => {
  const [data, setData] = useState<any>(null);
  const [auto, setAuto] = useState(true);

  const refresh = async () => {
    try {
      const raw = await getHealth();
      setData(JSON.parse(raw));
    } catch {}
  };

  useEffect(() => {
    refresh();
    if (auto) {
      const iv = setInterval(refresh, 3000);
      return () => clearInterval(iv);
    }
  }, [auto]);

  if (!data) return <PanelSection title="❤️ Health"><PanelSectionRow><div>Loading...</div></PanelSectionRow></PanelSection>;

  const batColor = data.battery > 50 ? "#00e676" : data.battery > 20 ? "#ffab00" : "#ff4444";
  const cpuColor = data.cpu_temp < 70 ? "#00e676" : data.cpu_temp < 85 ? "#ffab00" : "#ff4444";
  const gpuColor = data.gpu_temp < 70 ? "#00e676" : data.gpu_temp < 85 ? "#ffab00" : "#ff4444";

  return (
    <PanelSection title="❤️ System Health">
      <PanelSectionRow>
        <div style={{ width: "100%" }}>
          <Bar label={`🔋 Battery (${data.battery_status})`} value={data.battery} max={100} unit="%" color={batColor} />
          {data.est_minutes >= 0 && (
            <div style={{ fontSize: "11px", color: "#aaa", textAlign: "right", marginTop: "-4px", marginBottom: "6px" }}>
              ~{Math.floor(data.est_minutes / 60)}h {data.est_minutes % 60}m remaining
            </div>
          )}
          <Bar label="🌡️ CPU Temp" value={data.cpu_temp} max={105} unit="°C" color={cpuColor} />
          <Bar label="🎮 GPU Temp" value={data.gpu_temp} max={105} unit="°C" color={gpuColor} />
          <Bar label="🌀 Fan" value={data.fan_rpm} max={5000} unit=" RPM" color="#1a9fff" />
        </div>
      </PanelSectionRow>
      <PanelSectionRow>
        <ButtonItem layout="below" onClick={refresh}>
          🔄 Refresh Now
        </ButtonItem>
      </PanelSectionRow>
    </PanelSection>
  );
};
