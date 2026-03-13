import React, { useState, useEffect } from "react";
import {
  PanelSection,
  PanelSectionRow,
  ButtonItem,
} from "@decky/ui";
import { getHealth } from "../backend";
import { fail } from "../toast";

const HealthPanel: React.FC = () => {
  const [data, setData] = useState<any>(null);

  const refresh = async () => {
    try {
      const r = ((v: any) => typeof v === "string" ? JSON.parse(v) : v)(await getHealth());
      if (r.ok) setData(r.value);
      else fail(r.error);
    } catch (e) { fail(`Health error: ${e}`); }
  };

  useEffect(() => { refresh(); const t = setInterval(refresh, 5000); return () => clearInterval(t); }, []);

  const row = (icon: string, label: string, value: string) => (
    <PanelSectionRow key={label}>
      <div style={{ display: "flex", justifyContent: "space-between", padding: "4px 0", fontSize: 13 }}>
        <span style={{ color: "#aaa" }}>{icon} {label}</span>
        <span style={{ color: "#0af", fontWeight: "bold" }}>{value}</span>
      </div>
    </PanelSectionRow>
  );

  if (!data) return <PanelSection title="🌡 Health"><PanelSectionRow><div style={{ color: "#888" }}>Loading...</div></PanelSectionRow></PanelSection>;

  return (
    <>
      <PanelSection title="🌡 Thermals">
        {row("🔥", "CPU Temp", `${data.cpu_temp}°C`)}
        {row("🎮", "GPU Temp", `${data.gpu_temp}°C`)}
        {row("💨", "Fan", `${data.fan_rpm} RPM`)}
      </PanelSection>

      <PanelSection title="🔋 Battery">
        {row("⚡", "Charge", `${data.battery_pct}%`)}
        {row("❤️", "Health", data.battery_health)}
        {row("⏱", "Remaining", data.battery_time)}
      </PanelSection>

      <PanelSection title="📊 Active Power">
        {row("🔌", "TDP", `${data.current_tdp}W`)}
        {row("🎮", "GPU Clock", `${data.current_gpu}MHz`)}
        <PanelSectionRow>
          <ButtonItem layout="below" onClick={refresh}>
            🔄 Refresh
          </ButtonItem>
        </PanelSectionRow>
      </PanelSection>
    </>
  );
};

export default HealthPanel;
