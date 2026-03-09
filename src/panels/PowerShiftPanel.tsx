// ============================================================
// JBL — PowerShift Panel
// ============================================================
import { VFC, useState } from "react";
import { PanelSection, PanelSectionRow, ButtonItem } from "decky-frontend-lib";

const MODES = [
  { id: "performance", label: "🔥 Performance", desc: "Max TDP, Max FPS" },
  { id: "balanced",    label: "⚖️ Balanced",    desc: "Smart TDP, 60fps target" },
  { id: "battery",     label: "🔋 Battery",     desc: "Min TDP, Max runtime" },
];

const CONTEXTS = [
  { id: "undocked", label: "📱 Handheld" },
  { id: "docked",   label: "🖥️ Docked" },
  { id: "xr",       label: "🥽 XR" },
];

export const PowerShiftPanel: VFC<{ jbl: any }> = ({ jbl }) => {
  const { state, call, refresh } = jbl;
  const [busy, setBusy] = useState(false);

  const setMode = async (mode: string) => {
    setBusy(true);
    await call("set_powershift_mode", { mode });
    await refresh();
    setBusy(false);
  };

  const setContext = async (context: string) => {
    setBusy(true);
    await call("set_powershift_context", { context });
    await refresh();
    setBusy(false);
  };

  const current = state.powershift;

  return (
    <>
      <PanelSection title="PowerShift Mode">
        {MODES.map(m => (
          <PanelSectionRow key={m.id}>
            <ButtonItem
              layout="below"
              disabled={busy}
              onClick={() => setMode(m.id)}
              style={{
                background: current?.mode === m.id ? "#f5a623" : "#2a2a2a",
                color: current?.mode === m.id ? "#000" : "#fff",
                borderRadius: "6px",
                marginBottom: "4px"
              }}
            >
              <div style={{ fontWeight: "bold" }}>{m.label}</div>
              <div style={{ fontSize: "11px", opacity: 0.7 }}>{m.desc}</div>
            </ButtonItem>
          </PanelSectionRow>
        ))}
      </PanelSection>

      <PanelSection title="Display Context">
        <PanelSectionRow>
          <div style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}>
            {CONTEXTS.map(c => (
              <button
                key={c.id}
                disabled={busy}
                onClick={() => setContext(c.id)}
                style={{
                  padding: "6px 12px",
                  borderRadius: "4px",
                  border: "none",
                  cursor: "pointer",
                  background: current?.context === c.id ? "#00bcd4" : "#2a2a2a",
                  color: current?.context === c.id ? "#000" : "#fff",
                  fontWeight: current?.context === c.id ? "bold" : "normal",
                  fontSize: "12px"
                }}
              >
                {c.label}
              </button>
            ))}
          </div>
        </PanelSectionRow>
      </PanelSection>

      {current?.profile && (
        <PanelSection title="Active Profile">
          <PanelSectionRow>
            <div style={{ width: "100%", fontSize: "12px" }}>
              {Object.entries(current.profile).map(([k, v]) => (
                <div key={k} style={{ display: "flex", justifyContent: "space-between", padding: "2px 0" }}>
                  <span style={{ color: "#aaa" }}>{k}</span>
                  <span style={{ color: "#fff" }}>{String(v)}</span>
                </div>
              ))}
            </div>
          </PanelSectionRow>
        </PanelSection>
      )}
    </>
  );
};
