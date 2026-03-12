import {
  PanelSection,
  PanelSectionRow,
  Field,
  ButtonItem,
  ToggleField,
  ProgressBarItem,
} from "@decky/ui";
import { callable } from "@decky/api";
import { useState, useEffect, useRef } from "react";

interface HealthData {
  cpu_temp_c: number;
  gpu_temp_c: number;
  fan_rpm: number;
  battery: {
    capacity_percent: number;
    status: string;
    power_draw_w: number;
  };
  timestamp: number;
}

const getHealth = callable<[], HealthData>("get_health");

export const HealthPanel = () => {
  const [health, setHealth] = useState<HealthData | null>(null);
  const [autoRefresh, setAutoRefresh] = useState(true);
  const [error, setError] = useState("");
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const refresh = async () => {
    try {
      const data = await getHealth();
      if (data && typeof data === "object") {
        setHealth(data);
        setError("");
      } else {
        setError("No data returned");
      }
    } catch (e: any) {
      setError("Failed: " + (e?.message || String(e)));
    }
  };

  useEffect(() => {
    refresh();
    if (autoRefresh) {
      intervalRef.current = setInterval(refresh, 3000);
    }
    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    };
  }, [autoRefresh]);

  if (error) {
    return (
      <PanelSection title="Health Monitor">
        <PanelSectionRow>
          <Field label="Error" focusable={true}>{error}</Field>
        </PanelSectionRow>
        <PanelSectionRow>
          <ButtonItem layout="below" onClick={refresh}>Retry</ButtonItem>
        </PanelSectionRow>
      </PanelSection>
    );
  }

  if (!health) {
    return (
      <PanelSection title="Health Monitor">
        <PanelSectionRow>
          <Field label="Status" focusable={true}>Loading...</Field>
        </PanelSectionRow>
      </PanelSection>
    );
  }

  const cpuPct = Math.min(1, Math.max(0, health.cpu_temp_c / 100));
  const gpuPct = Math.min(1, Math.max(0, health.gpu_temp_c / 100));
  const batPct = Math.min(1, Math.max(0, (health.battery?.capacity_percent || 0) / 100));

  return (
    <div>
      <PanelSection title="Thermals">
        <PanelSectionRow>
          <ProgressBarItem
            label={"CPU: " + health.cpu_temp_c.toFixed(1) + "°C"}
            nProgress={cpuPct}
            focusable={true}
          />
        </PanelSectionRow>
        <PanelSectionRow>
          <ProgressBarItem
            label={"GPU: " + health.gpu_temp_c.toFixed(1) + "°C"}
            nProgress={gpuPct}
            focusable={true}
          />
        </PanelSectionRow>
        <PanelSectionRow>
          <Field label="Fan Speed" focusable={true}>
            {health.fan_rpm} RPM
          </Field>
        </PanelSectionRow>
      </PanelSection>

      <PanelSection title="Battery">
        <PanelSectionRow>
          <ProgressBarItem
            label={"Charge: " + (health.battery?.capacity_percent?.toFixed(0) || "?") + "%"}
            nProgress={batPct}
            focusable={true}
          />
        </PanelSectionRow>
        <PanelSectionRow>
          <Field label="Status" focusable={true}>
            {health.battery?.status || "Unknown"}
          </Field>
        </PanelSectionRow>
        <PanelSectionRow>
          <Field label="Power Draw" focusable={true}>
            {health.battery?.power_draw_w?.toFixed(1) || "?"} W
          </Field>
        </PanelSectionRow>
      </PanelSection>

      <PanelSection title="Settings">
        <PanelSectionRow>
          <ToggleField
            label="Auto Refresh (3s)"
            checked={autoRefresh}
            onChange={(val) => setAutoRefresh(val)}
          />
        </PanelSectionRow>
        <PanelSectionRow>
          <ButtonItem layout="below" onClick={refresh}>
            Refresh Now
          </ButtonItem>
        </PanelSectionRow>
      </PanelSection>
    </div>
  );
};
