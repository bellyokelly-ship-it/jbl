import React from "react";
import { definePlugin, staticClasses } from "@decky/ui";
import { routerHook } from "@decky/api";
import { useState, FC } from "react";
import { FaRocket } from "react-icons/fa";

import { PowerShiftPanel } from "./panels/PowerShiftPanel";
import { LSFGPanel } from "./panels/LSFGPanel";
import { ProtonPanel } from "./panels/ProtonPanel";
import { HealthPanel } from "./panels/HealthPanel";
import { ProfilesPanel } from "./panels/ProfilesPanel";
import { AutoOptimisePanel } from "./panels/AutoOptimisePanel";

type Tab = "power" | "lsfg" | "proton" | "health" | "profiles" | "auto";

const TABS: { id: Tab; label: string }[] = [
  { id: "power", label: "⚡ Power" },
  { id: "lsfg", label: "🎞️ LSFG" },
  { id: "proton", label: "🍷 Proton" },
  { id: "health", label: "❤️ Health" },
  { id: "profiles", label: "💾 Profiles" },
  { id: "auto", label: "🤖 Auto" },
];

const JBLContent: FC = () => {
  const [tab, setTab] = useState<Tab>("power");

  return (
    <div>
      <div style={{
        display: "flex", flexWrap: "wrap", gap: "6px",
        justifyContent: "center", padding: "8px 4px", marginBottom: "4px"
      }}>
        {TABS.map((t) => (
          <span
            key={t.id}
            onClick={() => setTab(t.id)}
            style={{
              cursor: "pointer",
              padding: "6px 10px",
              borderRadius: "6px",
              background: tab === t.id ? "#1a9fff" : "#2a2a3e",
              color: tab === t.id ? "#fff" : "#aaa",
              fontSize: "12px",
              fontWeight: tab === t.id ? "bold" : "normal",
              transition: "all 0.2s ease",
            }}
          >
            {t.label}
          </span>
        ))}
      </div>
      {tab === "power" && <PowerShiftPanel />}
      {tab === "lsfg" && <LSFGPanel />}
      {tab === "proton" && <ProtonPanel />}
      {tab === "health" && <HealthPanel />}
      {tab === "profiles" && <ProfilesPanel />}
      {tab === "auto" && <AutoOptimisePanel />}
    </div>
  );
};

export default definePlugin(() => {
  return {
    name: "Jimmy's Big Load",
    title: <div className={staticClasses.Title}>Jimmy's Big Load</div>,
    content: <JBLContent />,
    icon: <FaRocket />,
    onDismount() {
      routerHook.removeRoute("/jbl");
    },
  };
});
