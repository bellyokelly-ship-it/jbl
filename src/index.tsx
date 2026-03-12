import { definePlugin } from "@decky/api";
import { useState, VFC } from "react";
import { Tabs } from "@decky/ui";
import { PowerShiftPanel } from "./panels/PowerShiftPanel";
import { LSFGPanel } from "./panels/LSFGPanel";
import { ProtonPanel } from "./panels/ProtonPanel";
import { ProfilesPanel } from "./panels/ProfilesPanel";
import { HealthPanel } from "./panels/HealthPanel";
import { ProtonAdvisorPanel } from "./panels/ProtonAdvisorPanel";

const JBLContent: VFC = () => {
  const [activeTab, setActiveTab] = useState("powershift");

  return (
    <div style={{
      marginTop: "40px",
      position: "absolute",
      top: "0",
      left: "0",
      right: "0",
      bottom: "0",
      display: "flex",
      flexDirection: "column",
    }}>
      <style>{`
        .jbl-root [class*="GamepadTabbedPage"] {
          flex: 1 !important;
          min-height: 0 !important;
        }
        .jbl-root [class*="TabContentsScroll"],
        .jbl-root [class*="TabContents"] {
          height: 100% !important;
          max-height: none !important;
          flex: 1 !important;
        }
        .jbl-root [class*="Tabs"] {
          display: flex !important;
          flex-direction: column !important;
          height: 100% !important;
        }
        .jbl-root [class*="TabCount"] {
          font-size: 12px !important;
        }
      `}</style>
      <div className="jbl-root" style={{
        display: "flex",
        flexDirection: "column",
        height: "100%",
        flex: 1,
      }}>
        <Tabs
          activeTab={activeTab}
          onShowTab={(id: string) => setActiveTab(id)}
          tabs={[
            {
              id: "powershift",
              title: "⚡ Power",
              content: <PowerShiftPanel />,
            },
            {
              id: "lsfg",
              title: "🎞️ LSFG",
              content: <LSFGPanel />,
            },
            {
              id: "proton",
              title: "🧪 Proton",
              content: <ProtonPanel />,
            },
            {
              id: "advisor",
              title: "🎯 Advisor",
              content: <ProtonAdvisorPanel />,
            },
            {
              id: "profiles",
              title: "💾 Profiles",
              content: <ProfilesPanel />,
            },
            {
              id: "health",
              title: "🩺 Health",
              content: <HealthPanel />,
            },
          ]}
        />
      </div>
    </div>
  );
};

export default definePlugin(() => ({
  name: "Jimmys Big Load",
  title: <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
    <span style={{ fontSize: "16px" }}>⚡</span>
    <span>Jimmys Big Load</span>
  </div>,
  content: <JBLContent />,
  icon: <span style={{ fontSize: "20px" }}>⚡</span>,
}));
