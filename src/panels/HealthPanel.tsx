import React, { useState, useEffect, useRef } from "react";
import {
  PanelSection,
  PanelSectionRow,
  ButtonItem,
} from "@decky/ui";
import { getHealth } from "../backend";

interface HealthData {
  cpu_temp: number;
  gpu_temp: number;
  fan_rpm: number;
  battery_pct: number;
  battery_health: string;
  battery_time: string;
}

const HealthPanel: React.FC = () => {
  const [data, setData] = useState<HealthData | null>(null);
  const timer = useRef<ReturnType<typeof setInterval> | null>(null);

  const poll = async () => {
    try {
      const r = JSON.parse(await getHealth());
      if (r.ok) setData(r.value);
    } catch {}
  };

  useEffect(() => {
    poll();
    timer.current = setInterval(poll, 3000);
    return () => { if (timer.current) clearInterval(timer.current); };
  }, []);

  const bar = (label: string, val: number, max: number, unit: string, warn: number) => {
    const pct = Math.min((val / max) * 100, 100);
    const color = val >= warn ? "#ff4444" : val >= warn * 0.8 ? "#ffaa00" : "#00d4aa";
    return (
      <PanelSectionRow>
        <div style={{ width: "100%" }}>
          <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}>
            <span>{label}</span>
            <span style={{ color }}>{val}{unit}</span>
          </div>
          <div style={{ background: "#1a1a2e", borderRadius: 4, height: 8, overflow: "hidden" }}>
            <div style={{ width: `${pct}%`, height: "100%", background: color, borderRadius: 4, transition: "width 0.5s" }} />
          </div>
        </div>
      </PanelSectionRow>
    );
  };

  return (
    <>
      <PanelSection title="🌡 System Health">
        {data ? (
          <>
            {bar("CPU Temp", data.cpu_temp, 105, "°C", 85)}
            {bar("GPU Temp", data.gpu_temp, 105, "°C", 80)}
            {bar("Fan", data.fan_rpm, 5000, " RPM", 4000)}
          </>
        ) : (
          <PanelSectionRow>
            <div style={{ color: "#888" }}>Loading...</div>
          </PanelSectionRow>
        )}
      </PanelSection>
      <PanelSection title="🔋 Battery">
        {data ? (
          <>
            {bar("Charge", data.battery_pct, 100, "%", 101)}
            <PanelSectionRow>
              <div style={{ display: "flex", justifyContent: "space-between", width: "100%" }}>
                <span>Health</span><span style={{ color: "#00d4aa" }}>{data.battery_health}</span>
              </div>
            </PanelSectionRow>
            <PanelSectionRow>
              <div style={{ display: "flex", justifyContent: "space-between", width: "100%" }}>
                <span>Remaining</span><span>{data.battery_time}</span>
              </div>
            </PanelSectionRow>
          </>
        ) : null}
      </PanelSection>
      <PanelSection>
        <PanelSectionRow>
          <ButtonItem layout="below" onClick={poll}>🔄 Refresh Now</ButtonItem>
        </PanelSectionRow>
      </PanelSection>
    </>
  );
};

export default HealthPanel;
