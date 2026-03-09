// ============================================================
// JBL — Jimmy's Big Load
// Main Entry Point
// ============================================================
import {
  definePlugin,
  PanelSection,
  PanelSectionRow,
  ServerAPI,
  staticClasses,
  Router,
} from "decky-frontend-lib";
import { VFC, useState, useEffect } from "react";
import { FaBolt } from "react-icons/fa";
import { StatusPanel } from "./panels/StatusPanel";
import { PowerShiftPanel } from "./panels/PowerShiftPanel";
import { LSFGPanel } from "./panels/LSFGPanel";
import { ProfilePanel } from "./panels/ProfilePanel";
import { CommunityPanel } from "./panels/CommunityPanel";
import { AnalyticsPanel } from "./panels/AnalyticsPanel";
import { HealthPanel } from "./panels/HealthPanel";
import { XRPanel } from "./panels/XRPanel";
import { ProtonPanel } from "./panels/ProtonPanel";
import { useJBL } from "./hooks/useJBL";

const JBLPlugin: VFC<{ serverAPI: ServerAPI }> = ({ serverAPI }) => {
  const jbl = useJBL(serverAPI);
  const [activeTab, setActiveTab] = useState<string>("status");

  const tabs = [
    { id: "status",     label: "⚡ Status" },
    { id: "powershift", label: "🔥 PowerShift" },
    { id: "lsfg",       label: "🎮 LSFG" },
    { id: "profiles",   label: "📋 Profiles" },
    { id: "community",  label: "🌐 Community" },
    { id: "proton",     label: "🧪 Proton" },
    { id: "xr",         label: "🥽 XR" },
    { id: "analytics",  label: "📊 Analytics" },
    { id: "health",     label: "🩺 Health" },
  ];

  return (
    <div style={{ padding: "8px" }}>
      {/* Header */}
      <PanelSection>
        <PanelSectionRow>
          <div style={{
            display: "flex",
            alignItems: "center",
            gap: "8px",
            fontSize: "18px",
            fontWeight: "bold",
            color: "#f5a623"
          }}>
            <FaBolt />
            Jimmy's Big Load v0.3.0
          </div>
        </PanelSectionRow>
      </PanelSection>

      {/* Tab Bar */}
      <div style={{
        display: "flex",
        flexWrap: "wrap",
        gap: "4px",
        marginBottom: "8px"
      }}>
        {tabs.map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            style={{
              padding: "4px 8px",
              fontSize: "11px",
              borderRadius: "4px",
              border: "none",
              cursor: "pointer",
              background: activeTab === tab.id ? "#f5a623" : "#2a2a2a",
              color: activeTab === tab.id ? "#000" : "#fff",
              fontWeight: activeTab === tab.id ? "bold" : "normal"
            }}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Tab Content */}
      {activeTab === "status"     && <StatusPanel jbl={jbl} />}
      {activeTab === "powershift" && <PowerShiftPanel jbl={jbl} />}
      {activeTab === "lsfg"       && <LSFGPanel jbl={jbl} />}
      {activeTab === "profiles"   && <ProfilePanel jbl={jbl} />}
      {activeTab === "community"  && <CommunityPanel jbl={jbl} />}
      {activeTab === "proton"     && <ProtonPanel jbl={jbl} />}
      {activeTab === "xr"         && <XRPanel jbl={jbl} />}
      {activeTab === "analytics"  && <AnalyticsPanel jbl={jbl} />}
      {activeTab === "health"     && <HealthPanel jbl={jbl} />}
    </div>
  );
};

export default definePlugin((serverApi: ServerAPI) => {
  return {
    title: <div className={staticClasses.Title}>Jimmy's Big Load</div>,
    content: <JBLPlugin serverAPI={serverApi} />,
    icon: <FaBolt />,
    onDismount() {},
  };
});
