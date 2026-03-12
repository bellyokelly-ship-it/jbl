import { definePlugin } from "@decky/api";
import { useState, useRef, useEffect, VFC } from "react";
import { Focusable, PanelSection, PanelSectionRow, staticClasses } from "@decky/ui";

import { PowerShiftPanel } from "./panels/PowerShiftPanel";
import { LSFGPanel } from "./panels/LSFGPanel";
import { ProtonPanel } from "./panels/ProtonPanel";
import { HealthPanel } from "./panels/HealthPanel";
import { ProfilesPanel } from "./panels/ProfilesPanel";
import { ProtonAdvisorPanel } from "./panels/ProtonAdvisorPanel";
import { AutoOptimisePanel } from "./panels/AutoOptimisePanel";
import { JBL } from "./styles";

const tabs = [
  { label: "⚡", name: "Power", component: PowerShiftPanel },
  { label: "🎞️", name: "LSFG", component: LSFGPanel },
  { label: "🧬", name: "Proton", component: ProtonPanel },
  { label: "🧪", name: "Advisor", component: ProtonAdvisorPanel },
  { label: "🔧", name: "Auto", component: AutoOptimisePanel },
  { label: "💾", name: "Profiles", component: ProfilesPanel },
  { label: "🩺", name: "Health", component: HealthPanel },
];

const TabBar: VFC<{ active: number; onSelect: (i: number) => void }> = ({ active, onSelect }) => (
  <Focusable
    style={{
      display: "grid",
      gridTemplateColumns: "repeat(7, 1fr)",
      gap: "4px",
      padding: "6px 4px",
      background: `linear-gradient(180deg, ${JBL.surfaceDark} 0%, ${JBL.panelBg} 100%)`,
      borderBottom: `1px solid ${JBL.cardBorder}`,
      position: "sticky",
      top: 0,
      zIndex: 10,
    }}
  >
    {tabs.map((t, i) => (
      <Focusable
        key={i}
        onActivate={() => onSelect(i)}
        onClick={() => onSelect(i)}
        focusWithinClassName="gpfocuswithin"
        style={{
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          padding: "6px 2px",
          borderRadius: "6px",
          background: active === i
            ? `linear-gradient(135deg, ${JBL.cyan}33, ${JBL.cyan}11)`
            : "transparent",
          border: active === i ? `1px solid ${JBL.cyan}66` : "1px solid transparent",
          cursor: "pointer",
          transition: "all 0.2s ease",
        }}
      >
        <span style={{ fontSize: "16px" }}>{t.label}</span>
        <span style={{
          fontSize: "9px",
          color: active === i ? JBL.cyan : JBL.textDim,
          fontWeight: active === i ? "bold" : "normal",
          marginTop: "2px",
        }}>
          {t.name}
        </span>
      </Focusable>
    ))}
  </Focusable>
);

const Content: VFC = () => {
  const [activeTab, setActiveTab] = useState(0);
  const ActivePanel = tabs[activeTab].component;

  return (
    <PanelSection>
      <TabBar active={activeTab} onSelect={setActiveTab} />
      <Focusable
        focusWithinClassName="gpfocuswithin"
        style={{
          marginTop: "4px",
        }}
      >
        <ActivePanel />
      </Focusable>
    </PanelSection>
  );
};

export default definePlugin(() => ({
  name: "Jimmy's Big Load",
  title: <span style={{ color: JBL.cyan, fontWeight: "bold" }}>JBL</span>,
  content: <Content />,
  icon: <span style={{ fontSize: "20px" }}>⚡</span>,
}));
