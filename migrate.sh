#!/bin/bash
set -e
PLUGIN_DIR="/home/deck/homebrew/plugins/jbl"

echo "=== [1/8] Fixing rollup.config.js ==="
cat > "$PLUGIN_DIR/rollup.config.js" << 'EOF'
import deckyPlugin from "@decky/rollup";

export default deckyPlugin();
EOF

echo "=== [2/8] Fixing tsconfig.json ==="
cat > "$PLUGIN_DIR/tsconfig.json" << 'EOF'
{
  "compilerOptions": {
    "outDir": "./dist",
    "module": "ESNext",
    "target": "ES2020",
    "moduleResolution": "node",
    "jsx": "react",
    "jsxFactory": "React.createElement",
    "declaration": false,
    "sourceMap": true,
    "strict": false,
    "esModuleInterop": true,
    "allowSyntheticDefaultImports": true,
    "resolveJsonModule": true,
    "isolatedModules": true,
    "skipLibCheck": true,
    "lib": ["ES2020", "DOM"]
  },
  "include": ["src/**/*"],
  "exclude": ["node_modules", "dist"]
}
EOF

echo "=== [3/8] Creating shared backend utility ==="
cat > "$PLUGIN_DIR/src/backend.ts" << 'EOF'
import { callable } from "@decky/api";

export const callBackend = async (method: string, args?: Record<string, any>): Promise<any> => {
  try {
    const fn = callable<[Record<string, any>], any>(method);
    const result = await fn(args || {});
    return result;
  } catch (e) {
    console.error(`[JBL] Backend call '${method}' failed:`, e);
    return null;
  }
};
EOF

echo "=== [4/8] Migrating index.tsx ==="
cat > "$PLUGIN_DIR/src/index.tsx" << 'EOF'
import {
  definePlugin,
  PanelSection,
  PanelSectionRow,
  ButtonItem,
  staticClasses,
} from "@decky/ui";
import { useState } from "react";
import { FaRocket } from "react-icons/fa";

import { PowerShiftPanel } from "./panels/PowerShiftPanel";
import { LSFGPanel } from "./panels/LSFGPanel";
import { ProtonPanel } from "./panels/ProtonPanel";
import { HealthPanel } from "./panels/HealthPanel";
import { ProfilesPanel } from "./panels/ProfilesPanel";
import { AutoOptimisePanel } from "./panels/AutoOptimisePanel";

const TAB_ITEMS = [
  { id: "power", label: "⚡ Power", component: PowerShiftPanel },
  { id: "lsfg", label: "🎮 LSFG", component: LSFGPanel },
  { id: "proton", label: "🔧 Proton", component: ProtonPanel },
  { id: "health", label: "❤ Health", component: HealthPanel },
  { id: "profiles", label: "💾 Profiles", component: ProfilesPanel },
  { id: "auto", label: "🤖 Auto", component: AutoOptimisePanel },
] as const;

const JBLContent = () => {
  const [activeTab, setActiveTab] = useState<string>("power");

  const ActiveComponent = TAB_ITEMS.find((t) => t.id === activeTab)?.component || PowerShiftPanel;

  return (
    <>
      <PanelSection title="Jimmy's Big Load">
        <PanelSectionRow>
          <div
            style={{
              display: "flex",
              flexWrap: "wrap",
              gap: "6px",
              width: "100%",
              marginBottom: "8px",
            }}
          >
            {TAB_ITEMS.map((tab) => (
              <ButtonItem
                key={tab.id}
                layout="below"
                bottomSeparator="none"
                onClick={() => setActiveTab(tab.id)}
                style={{
                  flex: "1 1 auto",
                  minWidth: "80px",
                  padding: "6px 8px",
                  fontSize: "12px",
                  background: activeTab === tab.id ? "#1a9fff" : "#23262e",
                  color: activeTab === tab.id ? "#fff" : "#b8bcbf",
                  borderRadius: "4px",
                  textAlign: "center",
                }}
              >
                {tab.label}
              </ButtonItem>
            ))}
          </div>
        </PanelSectionRow>
      </PanelSection>
      <ActiveComponent />
    </>
  );
};

export default definePlugin(() => ({
  name: "Jimmy's Big Load",
  title: <div className={staticClasses.Title}>Jimmy's Big Load</div>,
  content: <JBLContent />,
  icon: <FaRocket />,
}));
EOF

echo "=== [5/8] Migrating PowerShiftPanel.tsx ==="
cat > "$PLUGIN_DIR/src/panels/PowerShiftPanel.tsx" << 'EOF'
import {
  PanelSection,
  PanelSectionRow,
  SliderField,
  ButtonItem,
  Field,
  Focusable,
} from "@decky/ui";
import { useState, useEffect } from "react";
import { callBackend } from "../backend";

export const PowerShiftPanel = () => {
  const [tdp, setTdp] = useState(15);
  const [gpuClock, setGpuClock] = useState(1600);
  const [limits, setLimits] = useState({
    tdp_min: 3,
    tdp_max: 30,
    gpu_clock_min: 200,
    gpu_clock_max: 1600,
  });
  const [status, setStatus] = useState("");

  useEffect(() => {
    (async () => {
      const l = await callBackend("get_power_limits");
      if (l) setLimits(l);
      const t = await callBackend("get_tdp");
      if (t?.success) setTdp(Math.round(t.tdp_w));
    })();
  }, []);

  const applyTdp = async (val: number) => {
    setTdp(val);
    const r = await callBackend("set_tdp", { watts: val });
    setStatus(r?.success ? `TDP → ${val}W ✅` : `TDP failed: ${r?.error}`);
  };

  const applyGpu = async (val: number) => {
    setGpuClock(val);
    const r = await callBackend("set_gpu_clock", { mhz: val });
    setStatus(r?.success ? `GPU → ${val}MHz ✅` : `GPU failed: ${r?.error}`);
  };

  const applyPreset = async (preset: string) => {
    const r = await callBackend("apply_power_preset", { preset });
    if (r?.success) {
      setStatus(`Preset: ${preset} ✅`);
      const t = await callBackend("get_tdp");
      if (t?.success) setTdp(Math.round(t.tdp_w));
    } else {
      setStatus(`Preset failed: ${r?.error}`);
    }
  };

  const resetGpu = async () => {
    const r = await callBackend("reset_gpu_clock");
    setStatus(r?.success ? "GPU reset to auto ✅" : `Reset failed: ${r?.error}`);
    setGpuClock(1600);
  };

  return (
    <Focusable>
      <PanelSection title="⚡ PowerShift">
        <PanelSectionRow>
          <SliderField
            label={`TDP: ${tdp}W`}
            value={tdp}
            min={limits.tdp_min}
            max={limits.tdp_max}
            step={1}
            onChange={applyTdp}
            notchCount={7}
            notchLabels={[
              { notchIndex: 0, label: `${limits.tdp_min}W` },
              { notchIndex: 3, label: "15W" },
              { notchIndex: 6, label: `${limits.tdp_max}W` },
            ]}
          />
        </PanelSectionRow>
        <PanelSectionRow>
          <SliderField
            label={`GPU Clock: ${gpuClock}MHz`}
            value={gpuClock}
            min={limits.gpu_clock_min}
            max={limits.gpu_clock_max}
            step={50}
            onChange={applyGpu}
            notchCount={5}
            notchLabels={[
              { notchIndex: 0, label: "200" },
              { notchIndex: 2, label: "900" },
              { notchIndex: 4, label: "1600" },
            ]}
          />
        </PanelSectionRow>
      </PanelSection>

      <PanelSection title="Quick Presets">
        <PanelSectionRow>
          <ButtonItem layout="below" onClick={() => applyPreset("battery_saver")}>
            🔋 Battery Saver (8W)
          </ButtonItem>
        </PanelSectionRow>
        <PanelSectionRow>
          <ButtonItem layout="below" onClick={() => applyPreset("balanced")}>
            ⚖ Balanced (15W)
          </ButtonItem>
        </PanelSectionRow>
        <PanelSectionRow>
          <ButtonItem layout="below" onClick={() => applyPreset("performance")}>
            🚀 Performance (22W)
          </ButtonItem>
        </PanelSectionRow>
        <PanelSectionRow>
          <ButtonItem layout="below" onClick={() => applyPreset("max_power")}>
            ⚡ Max Power (30W)
          </ButtonItem>
        </PanelSectionRow>
        <PanelSectionRow>
          <ButtonItem layout="below" onClick={() => resetGpu()}>
            🔄 Reset GPU (Auto)
          </ButtonItem>
        </PanelSectionRow>
      </PanelSection>

      {status && (
        <PanelSection>
          <PanelSectionRow>
            <Field label="Status" description={status} />
          </PanelSectionRow>
        </PanelSection>
      )}
    </Focusable>
  );
};
EOF

echo "=== [6/8] Migrating LSFGPanel.tsx ==="
cat > "$PLUGIN_DIR/src/panels/LSFGPanel.tsx" << 'EOF'
import {
  PanelSection,
  PanelSectionRow,
  SliderField,
  ToggleField,
  Field,
  Focusable,
} from "@decky/ui";
import { useState, useEffect } from "react";
import { callBackend } from "../backend";

export const LSFGPanel = () => {
  const [enabled, setEnabled] = useState(true);
  const [multiplier, setMultiplier] = useState(2);
  const [flowRate, setFlowRate] = useState(50);
  const [configExists, setConfigExists] = useState(false);
  const [status, setStatus] = useState("");

  useEffect(() => {
    (async () => {
      const config = await callBackend("get_lsfg_config");
      if (config) {
        setEnabled(config.enabled ?? true);
        setMultiplier(config.multiplier ?? 2);
        setFlowRate(config.flow_rate ?? 50);
        setConfigExists(config.config_exists ?? false);
      }
    })();
  }, []);

  const updateConfig = async (updates: Record<string, any>) => {
    const r = await callBackend("set_lsfg_config", updates);
    if (r?.success) {
      setStatus("Config saved ✅");
      if (r.config) {
        setEnabled(r.config.enabled ?? enabled);
        setMultiplier(r.config.multiplier ?? multiplier);
        setFlowRate(r.config.flow_rate ?? flowRate);
      }
    } else {
      setStatus(`Save failed: ${r?.error}`);
    }
  };

  return (
    <Focusable>
      <PanelSection title="🎮 LSFG Frame Generation">
        <PanelSectionRow>
          <Field
            label="Config"
            description={configExists ? "~/.config/lsfg-vk/lsfg_vk.conf" : "⚠ Config not found"}
          />
        </PanelSectionRow>

        <PanelSectionRow>
          <ToggleField
            label="LSFG Enabled"
            checked={enabled}
            onChange={(val) => {
              setEnabled(val);
              updateConfig({ enabled: val });
            }}
          />
        </PanelSectionRow>

        <PanelSectionRow>
          <SliderField
            label={`Multiplier: ${multiplier}x`}
            value={multiplier}
            min={1}
            max={4}
            step={1}
            onChange={(val) => {
              setMultiplier(val);
              updateConfig({ multiplier: val });
            }}
            notchCount={4}
            notchLabels={[
              { notchIndex: 0, label: "1x" },
              { notchIndex: 1, label: "2x" },
              { notchIndex: 2, label: "3x" },
              { notchIndex: 3, label: "4x" },
            ]}
          />
        </PanelSectionRow>

        <PanelSectionRow>
          <SliderField
            label={`Flow Rate: ${flowRate}%`}
            value={flowRate}
            min={0}
            max={100}
            step={5}
            onChange={(val) => {
              setFlowRate(val);
              updateConfig({ flow_rate: val });
            }}
            notchCount={5}
            notchLabels={[
              { notchIndex: 0, label: "0%" },
              { notchIndex: 2, label: "50%" },
              { notchIndex: 4, label: "100%" },
            ]}
          />
        </PanelSectionRow>
      </PanelSection>

      {status && (
        <PanelSection>
          <PanelSectionRow>
            <Field label="Status" description={status} />
          </PanelSectionRow>
        </PanelSection>
      )}
    </Focusable>
  );
};
EOF

echo "=== [7/8] Migrating ProtonPanel.tsx + HealthPanel.tsx + ProfilesPanel.tsx + AutoOptimisePanel.tsx ==="

cat > "$PLUGIN_DIR/src/panels/ProtonPanel.tsx" << 'EOF'
import {
  PanelSection,
  PanelSectionRow,
  ButtonItem,
  Field,
  Focusable,
} from "@decky/ui";
import { useState, useEffect } from "react";
import { callBackend } from "../backend";

export const ProtonPanel = () => {
  const [installed, setInstalled] = useState<string[]>([]);
  const [latestGe, setLatestGe] = useState<{ tag: string; name: string } | null>(null);
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState("");

  const refresh = async () => {
    const data = await callBackend("get_proton_versions");
    if (data) {
      setInstalled(data.installed || []);
      setLatestGe(data.latest_ge || null);
    }
  };

  useEffect(() => {
    refresh();
  }, []);

  const installLatest = async () => {
    if (!latestGe?.tag) return;
    setLoading(true);
    setStatus(`Installing ${latestGe.tag}...`);
    const r = await callBackend("install_proton", { tag: latestGe.tag });
    if (r?.success) {
      setStatus(`Installed ${latestGe.tag} ✅`);
      await refresh();
    } else {
      setStatus(`Install failed: ${r?.error}`);
    }
    setLoading(false);
  };

  const removeVersion = async (version: string) => {
    setLoading(true);
    setStatus(`Removing ${version}...`);
    const r = await callBackend("remove_proton", { version });
    if (r?.success) {
      setStatus(`Removed ${version} ✅`);
      await refresh();
    } else {
      setStatus(`Remove failed: ${r?.error}`);
    }
    setLoading(false);
  };

  return (
    <Focusable>
      <PanelSection title="🔧 Proton-GE Manager">
        {latestGe && (
          <PanelSectionRow>
            <ButtonItem
              layout="below"
              disabled={loading}
              onClick={installLatest}
            >
              📥 Install Latest: {latestGe.tag}
            </ButtonItem>
          </PanelSectionRow>
        )}

        <PanelSectionRow>
          <ButtonItem layout="below" disabled={loading} onClick={refresh}>
            🔄 Refresh
          </ButtonItem>
        </PanelSectionRow>
      </PanelSection>

      <PanelSection title="Installed Versions">
        {installed.length === 0 ? (
          <PanelSectionRow>
            <Field label="No versions" description="No Proton-GE versions found" />
          </PanelSectionRow>
        ) : (
          installed.map((v) => (
            <PanelSectionRow key={v}>
              <ButtonItem
                layout="below"
                disabled={loading}
                onClick={() => removeVersion(v)}
              >
                🗑 {v}
              </ButtonItem>
            </PanelSectionRow>
          ))
        )}
      </PanelSection>

      {status && (
        <PanelSection>
          <PanelSectionRow>
            <Field label="Status" description={status} />
          </PanelSectionRow>
        </PanelSection>
      )}
    </Focusable>
  );
};
EOF

cat > "$PLUGIN_DIR/src/panels/HealthPanel.tsx" << 'EOF'
import {
  PanelSection,
  PanelSectionRow,
  ButtonItem,
  Field,
  Focusable,
} from "@decky/ui";
import { useState, useEffect } from "react";
import { callBackend } from "../backend";

const TempBar = ({ label, value, max, unit }: { label: string; value: number; max: number; unit: string }) => {
  const pct = Math.min(100, (value / max) * 100);
  const color = pct > 85 ? "#ff4444" : pct > 65 ? "#ffaa00" : "#00d4aa";
  return (
    <Field label={label} description={`${value}${unit}`}>
      <div
        style={{
          width: "100%",
          height: "8px",
          background: "#23262e",
          borderRadius: "4px",
          overflow: "hidden",
          marginTop: "4px",
        }}
      >
        <div
          style={{
            width: `${pct}%`,
            height: "100%",
            background: color,
            borderRadius: "4px",
            transition: "width 0.3s ease",
          }}
        />
      </div>
    </Field>
  );
};

export const HealthPanel = () => {
  const [health, setHealth] = useState<any>(null);
  const [diag, setDiag] = useState<any[]>([]);
  const [autoRefresh, setAutoRefresh] = useState(true);

  const refresh = async () => {
    const h = await callBackend("get_health");
    if (h) setHealth(h);
  };

  const loadDiag = async () => {
    const d = await callBackend("get_diagnostics");
    if (d?.results) setDiag(d.results);
  };

  const rerunDiag = async () => {
    const d = await callBackend("rerun_diagnostics");
    if (d?.results) setDiag(d.results);
  };

  useEffect(() => {
    refresh();
    loadDiag();
  }, []);

  useEffect(() => {
    if (!autoRefresh) return;
    const interval = setInterval(refresh, 3000);
    return () => clearInterval(interval);
  }, [autoRefresh]);

  return (
    <Focusable>
      <PanelSection title="❤ System Health">
        {health ? (
          <>
            <PanelSectionRow>
              <TempBar label="🌡 CPU" value={health.cpu_temp ?? 0} max={105} unit="°C" />
            </PanelSectionRow>
            <PanelSectionRow>
              <TempBar label="🎮 GPU" value={health.gpu_temp ?? 0} max={105} unit="°C" />
            </PanelSectionRow>
            <PanelSectionRow>
              <TempBar label="🌀 Fan" value={health.fan_rpm ?? 0} max={6000} unit=" RPM" />
            </PanelSectionRow>
            <PanelSectionRow>
              <TempBar label="🔋 Battery" value={health.battery_percent ?? 0} max={100} unit="%" />
            </PanelSectionRow>
            <PanelSectionRow>
              <Field
                label="💾 Memory"
                description={`${health.memory_used_gb ?? "?"}GB / ${health.memory_total_gb ?? "?"}GB`}
              />
            </PanelSectionRow>
            <PanelSectionRow>
              <Field label="⚡ TDP" description={`${health.current_tdp_w ?? "?"}W`} />
            </PanelSectionRow>
          </>
        ) : (
          <PanelSectionRow>
            <Field label="Loading..." description="Fetching health data..." />
          </PanelSectionRow>
        )}

        <PanelSectionRow>
          <ButtonItem layout="below" onClick={refresh}>
            🔄 Refresh Now
          </ButtonItem>
        </PanelSectionRow>
      </PanelSection>

      <PanelSection title="🩺 Startup Diagnostics">
        {diag.length > 0 ? (
          diag.map((d, i) => (
            <PanelSectionRow key={i}>
              <Field
                label={`${d.pass ? "✅" : "❌"} ${d.test}`}
                description={d.detail}
              />
            </PanelSectionRow>
          ))
        ) : (
          <PanelSectionRow>
            <Field label="No diagnostics" description="Run diagnostics to check system" />
          </PanelSectionRow>
        )}
        <PanelSectionRow>
          <ButtonItem layout="below" onClick={rerunDiag}>
            🩺 Re-run Diagnostics
          </ButtonItem>
        </PanelSectionRow>
      </PanelSection>
    </Focusable>
  );
};
EOF

cat > "$PLUGIN_DIR/src/panels/ProfilesPanel.tsx" << 'EOF'
import {
  PanelSection,
  PanelSectionRow,
  ButtonItem,
  TextField,
  Field,
  Focusable,
} from "@decky/ui";
import { useState, useEffect } from "react";
import { callBackend } from "../backend";

export const ProfilesPanel = () => {
  const [profiles, setProfiles] = useState<Record<string, any>>({});
  const [newName, setNewName] = useState("");
  const [status, setStatus] = useState("");

  const refresh = async () => {
    const data = await callBackend("get_profiles");
    if (data?.profiles) setProfiles(data.profiles);
  };

  useEffect(() => {
    refresh();
  }, []);

  const saveCurrentAsProfile = async () => {
    if (!newName.trim()) {
      setStatus("Enter a profile name");
      return;
    }
    const tdpData = await callBackend("get_tdp");
    const lsfgData = await callBackend("get_lsfg_config");
    const r = await callBackend("save_profile", {
      name: newName.trim(),
      tdp: tdpData?.success ? Math.round(tdpData.tdp_w) : 15,
      gpu_clock: 1600,
      lsfg_multiplier: lsfgData?.multiplier ?? 2,
      lsfg_flow_rate: lsfgData?.flow_rate ?? 50,
    });
    if (r?.success) {
      setStatus(`Saved "${newName}" ✅`);
      setNewName("");
      await refresh();
    } else {
      setStatus(`Save failed: ${r?.error}`);
    }
  };

  const loadProfile = async (name: string) => {
    const r = await callBackend("load_profile", { name });
    setStatus(r?.success ? `Loaded "${name}" ✅` : `Load failed: ${r?.error}`);
  };

  const deleteProfile = async (name: string) => {
    const r = await callBackend("delete_profile", { name });
    if (r?.success) {
      setStatus(`Deleted "${name}" ✅`);
      await refresh();
    } else {
      setStatus(`Delete failed: ${r?.error}`);
    }
  };

  const profileNames = Object.keys(profiles);

  return (
    <Focusable>
      <PanelSection title="💾 Save Current Settings">
        <PanelSectionRow>
          <TextField
            label="Profile Name"
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
          />
        </PanelSectionRow>
        <PanelSectionRow>
          <ButtonItem layout="below" onClick={saveCurrentAsProfile}>
            💾 Save Profile
          </ButtonItem>
        </PanelSectionRow>
      </PanelSection>

      <PanelSection title="📋 Saved Profiles">
        {profileNames.length === 0 ? (
          <PanelSectionRow>
            <Field label="No profiles" description="Save your first profile above" />
          </PanelSectionRow>
        ) : (
          profileNames.map((name) => {
            const p = profiles[name];
            return (
              <Focusable key={name}>
                <PanelSectionRow>
                  <Field
                    label={`📎 ${name}`}
                    description={`TDP: ${p.tdp}W | GPU: ${p.gpu_clock}MHz | LSFG: ${p.lsfg_multiplier}x @ ${p.lsfg_flow_rate}%`}
                  />
                </PanelSectionRow>
                <PanelSectionRow>
                  <div style={{ display: "flex", gap: "8px", width: "100%" }}>
                    <ButtonItem
                      layout="below"
                      bottomSeparator="none"
                      onClick={() => loadProfile(name)}
                      style={{ flex: 1 }}
                    >
                      ▶ Load
                    </ButtonItem>
                    <ButtonItem
                      layout="below"
                      bottomSeparator="none"
                      onClick={() => deleteProfile(name)}
                      style={{ flex: 1 }}
                    >
                      🗑 Delete
                    </ButtonItem>
                  </div>
                </PanelSectionRow>
              </Focusable>
            );
          })
        )}
      </PanelSection>

      {status && (
        <PanelSection>
          <PanelSectionRow>
            <Field label="Status" description={status} />
          </PanelSectionRow>
        </PanelSection>
      )}
    </Focusable>
  );
};
EOF

cat > "$PLUGIN_DIR/src/panels/AutoOptimisePanel.tsx" << 'EOF'
import {
  PanelSection,
  PanelSectionRow,
  ButtonItem,
  TextField,
  Field,
  Focusable,
} from "@decky/ui";
import { useState } from "react";
import { callBackend } from "../backend";

export const AutoOptimisePanel = () => {
  const [appId, setAppId] = useState("");
  const [recommendation, setRecommendation] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState("");

  const lookup = async () => {
    if (!appId.trim()) {
      setStatus("Enter a Steam App ID");
      return;
    }
    setLoading(true);
    setStatus("Fetching recommendation...");
    const r = await callBackend("get_recommendation", { appid: parseInt(appId.trim()) });
    if (r) {
      setRecommendation(r);
      setStatus(r.error ? `⚠ ${r.error}` : "Recommendation loaded ✅");
    } else {
      setStatus("Failed to get recommendation");
    }
    setLoading(false);
  };

  const apply = async () => {
    if (!appId.trim()) return;
    setLoading(true);
    setStatus("Applying recommendation...");
    const r = await callBackend("apply_recommendation", { appid: parseInt(appId.trim()) });
    if (r?.success) {
      setStatus("Settings applied ✅");
    } else {
      setStatus(`Apply failed: ${r?.error ?? "Unknown error"}`);
    }
    setLoading(false);
  };

  return (
    <Focusable>
      <PanelSection title="🤖 Auto Optimise">
        <PanelSectionRow>
          <Field
            label="How it works"
            description="Enter a Steam App ID to get optimised settings from ProtonDB community data."
          />
        </PanelSectionRow>

        <PanelSectionRow>
          <TextField
            label="Steam App ID"
            value={appId}
            onChange={(e) => setAppId(e.target.value)}
          />
        </PanelSectionRow>

        <PanelSectionRow>
          <ButtonItem layout="below" disabled={loading} onClick={lookup}>
            🔍 Get Recommendation
          </ButtonItem>
        </PanelSectionRow>
      </PanelSection>

      {recommendation && (
        <PanelSection title="📊 Recommendation">
          <PanelSectionRow>
            <Field label="ProtonDB Tier" description={recommendation.protondb_tier ?? "Unknown"} />
          </PanelSectionRow>
          <PanelSectionRow>
            <Field label="Suggested TDP" description={`${recommendation.recommended_tdp ?? "?"}W`} />
          </PanelSectionRow>
          <PanelSectionRow>
            <Field label="Suggested GPU" description={`${recommendation.recommended_gpu_clock ?? "?"}MHz`} />
          </PanelSectionRow>
          <PanelSectionRow>
            <Field
              label="Suggested LSFG"
              description={`${recommendation.recommended_lsfg_multiplier ?? "?"}x @ ${recommendation.recommended_lsfg_flow_rate ?? "?"}%`}
            />
          </PanelSectionRow>
          <PanelSectionRow>
            <Field label="Proton" description={recommendation.recommended_proton ?? "Unknown"} />
          </PanelSectionRow>

          <PanelSectionRow>
            <ButtonItem layout="below" disabled={loading} onClick={apply}>
              ⚡ Apply These Settings
            </ButtonItem>
          </PanelSectionRow>
        </PanelSection>
      )}

      {status && (
        <PanelSection>
          <PanelSectionRow>
            <Field label="Status" description={status} />
          </PanelSectionRow>
        </PanelSection>
      )}
    </Focusable>
  );
};
EOF

echo "=== [8/8] Verifying no decky-frontend-lib references remain ==="
if grep -rn "decky-frontend-lib" "$PLUGIN_DIR/src/"; then
  echo "❌ STILL FOUND decky-frontend-lib references!"
else
  echo "✅ All files migrated to @decky/ui + @decky/api"
fi

echo ""
echo "=== MIGRATION COMPLETE ==="
echo "Run: cd $PLUGIN_DIR && pnpm run build"
