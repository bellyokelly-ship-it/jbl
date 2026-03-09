// ============================================================
// JBL — XR Panel (Viture Luma Ultra + Others)
// ============================================================
import { VFC, useState } from "react";
import { PanelSection, PanelSectionRow, ButtonItem, ToggleField } from "decky-frontend-lib";

const XR_MODES = [
  { id: "cinema",      label: "🎬 Cinema",      desc: "60Hz, stable, battery saver" },
  { id: "gaming",      label: "🎮 Gaming",       desc: "120Hz, LSFG 2x@50%" },
  { id: "performance", label: "🔥 Performance",  desc: "Max TDP, max FPS" },
];

export const XRPanel: VFC<{ jbl: any }> = ({ jbl }) => {
  const { state, call, refresh } = jbl;
  const [busy, setBusy] = useState(false);
  const [detecting, setDetecting] = useState(false);
  const xr = state.xr;

  const detect = async () => {
    setDetecting(true);
    await call("detect_xr_device");
    await refresh();
    setDetecting(false);
  };

  const setMode = async (mode: string) => {
    setBusy(true);
    await call("set_xr_mode", { mode });
    await refresh();
    setBusy(false);
  };

  return (
    <>
      <PanelSection title="XR Glasses">
        <PanelSectionRow>
          <div style={{
            padding: "12px",
            background: "#1a1a1a",
            borderRadius: "8px",
            marginBottom: "8px"
          }}>
            <div style={{ fontWeight: "bold", marginBottom: "4px" }}>
              {xr?.detected ? `🥽 ${xr.device_name}` : "🥽 No XR device detected"}
            </div>
            {xr?.detected && (
              <div style={{ fontSize: "11px", color: "#aaa" }}>
                VID: {xr.vid} | PID: {xr.pid}<br/>
                Refresh: {xr.refresh_rate}Hz | Mode: {xr.mode?.toUpperCase()}
              </div>
            )}
          </div>
        </PanelSectionRow>
        <PanelSectionRow>
          <ButtonItem
            layout="below"
            onClick={detect}
            disabled={detecting}
          >
            {detecting ? "🔍 Detecting..." : "🔍 Detect XR Device"}
          </ButtonItem>
        </PanelSectionRow>
      </PanelSection>

      {xr?.detected && (
        <PanelSection title="XR Mode">
          {XR_MODES.map(m => (
            <PanelSectionRow key={m.id}>
              <ButtonItem
                layout="below"
                disabled={busy}
                onClick={() => setMode(m.id)}
                style={{
                  background: xr?.mode === m.id ? "#9c27b0" : "#2a2a2a",
                  color: "#fff",
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
      )}

      <PanelSection title="Viture Luma Ultra Tips">
        <PanelSectionRow>
          <div style={{ fontSize: "11px", color: "#aaa", lineHeight: "1.6" }}>
            🔌 Connect via USB-C before launching game<br/>
            🎯 Gaming mode auto-sets LSFG 2x @ 50%<br/>
            📺 Cinema locks to 1920×1080 @ 60Hz<br/>
            ⚡ 120Hz mode needs plugged-in power<br/>
            🔄 Auto-switches profile on connect/disconnect
          </div>
        </PanelSectionRow>
      </PanelSection>
    </>
  );
};
