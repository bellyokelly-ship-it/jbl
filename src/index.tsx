import React, { useState } from "react";
import {
  staticClasses,
  PanelSection,
  PanelSectionRow,
  Focusable,
  ButtonItem,
} from "@decky/ui";
import { definePlugin } from "@decky/ui";
import { FaRocket } from "react-icons/fa";
import PowerPanel from "./panels/PowerPanel";
import LSFGPanel from "./panels/LSFGPanel";
import ProtonPanel from "./panels/ProtonPanel";
import HealthPanel from "./panels/HealthPanel";
import ProfilesPanel from "./panels/ProfilesPanel";
import AutoOptimisePanel from "./panels/AutoOptimisePanel";
import { PlayModePanel } from "./panels/PlayModePanel";

const TABS = [
  { id: "power",    label: "⚡ Power" },
  { id: "lsfg",     label: "🎞 LSFG" },
  { id: "proton",   label: "🧪 Proton" },
  { id: "health",   label: "🌡 Health" },
  { id: "profiles", label: "💾 Profiles" },
  { id: "auto",     label: "🤖 Auto" },
  { id: "playmode", label: "🔌 Mode" },
];

const Content: React.FC = () => {
  const [tab, setTab] = useState("power");

  const renderPanel = () => {
    switch (tab) {
      case "power":    return <PowerPanel />;
      case "lsfg":     return <LSFGPanel />;
      case "proton":   return <ProtonPanel />;
      case "health":   return <HealthPanel />;
      case "profiles": return <ProfilesPanel />;
      case "auto":     return <AutoOptimisePanel />;
      case "playmode": return <PlayModePanel />;
      default:         return <PowerPanel />;
    }
  };

  return (
    <>
      <PanelSection>
        <Focusable
          flow-children="horizontal"
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(4, 1fr)",
            gap: "6px",
            padding: "4px 0",
          }}
        >
          {TABS.map((t) => (
            <ButtonItem
              key={t.id}
              layout="below"
              onClick={() => setTab(t.id)}
              style={{
                minWidth: 0,
                height: "36px",
                maxHeight: "36px",
                padding: "0 4px",
                fontSize: "11px",
                lineHeight: "36px",
                overflow: "hidden",
                textAlign: "center",
                background: tab === t.id
                  ? "linear-gradient(135deg, #00d4aa, #0088ff)"
                  : "#23262e",
                color: tab === t.id ? "#000" : "#b8bcbf",
                borderRadius: "6px",
                fontWeight: tab === t.id ? "bold" : "normal",
              }}
            >
              {t.label}
            </ButtonItem>
          ))}
        </Focusable>
      </PanelSection>
      {renderPanel()}
      <PanelSection>
        <PanelSectionRow>
          <div style={{ textAlign: "center", color: "#444", fontSize: 10, marginTop: 8 }}>
            JBL v0.6.0 — Jimmy's Big Load
          </div>
        </PanelSectionRow>
      </PanelSection>
    </>
  );
};

export default definePlugin(() => ({
  name: "JBL",
  title: <div className={staticClasses.Title}>Jimmy's Big Load</div>,
  content: <Content />,
  icon: <FaRocket />,
}));
