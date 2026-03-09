// ============================================================
// JBL — LSFG Panel
// ============================================================
import { VFC, useState } from "react";
import { PanelSection, PanelSectionRow, ButtonItem, ToggleField, SliderField } from "decky-frontend-lib";

export const LSFGPanel: VFC<{ jbl: any }> = ({ jbl }) => {
  const { state, call, refresh } = jbl;
  const [busy, setBusy] = useState(false);
  const lsfg = state.lsfg;

  const wrap = async (fn: () => Promise<any>) => {
    setBusy(true);
    await fn();
    await refresh();
    setBusy(false);
  };

  if (!lsfg) return <div style={{ color: "#aaa", padding: "16px" }}>Loading LSFG state...</div>;

  return (
    <>
      <PanelSection title="LSFG — Frame Generation">
        <PanelSectionRow>
          <ToggleField
            label="Enable LSFG"
            description="Lossless Scaling Frame Generation"
            checked={lsfg.enabled}
            onChange={v => wrap(() => call("set_lsfg_enabled", { enabled: v }))}
            disabled={busy}
          />
        </PanelSectionRow>
      </PanelSection>

      {lsfg.enabled && (
        <>
          <PanelSection title="Multiplier">
            <PanelSectionRow>
              <div style={{ display: "flex", gap: "8px" }}>
                {[2, 3, 4].map(m => (
                  <button
                    key={m}
                    disabled={busy}
                    onClick={() => wrap(() => call("set_lsfg_multiplier", { multiplier: m }))}
                    style={{
                      flex: 1,
                      padding: "10px",
                      borderRadius: "6px",
                      border: "none",
                      cursor: "pointer",
                      background: lsfg.multiplier === m ? "#f5a623" : "#2a2a2a",
                      color: lsfg.multiplier === m ? "#000" : "#fff",
                      fontWeight: "bold",
                      fontSize: "16px"
                    }}
                  >
                    {m}x
                  </button>
                ))}
              </div>
            </PanelSectionRow>
          </PanelSection>

          <PanelSection title={`Flow Rate: ${lsfg.flow_rate}%`}>
            <PanelSectionRow>
              <SliderField
                label=""
                value={lsfg.flow_rate}
                min={10}
                max={100}
                step={5}
                onChange={v => wrap(() => call("set_lsfg_flow_rate", { rate: v }))}
                disabled={busy}
              />
            </PanelSectionRow>
            <PanelSectionRow>
              <div style={{ fontSize: "11px", color: "#aaa", textAlign: "center" }}>
                James's sweet spot: 2x @ 50% 🎯
              </div>
            </PanelSectionRow>
          </PanelSection>

          <PanelSection title="Quick Presets">
            <PanelSectionRow>
              <div style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}>
                {[
                  { label: "🎯 James's Default", mult: 2, flow: 50 },
                  { label: "⚡ High Performance", mult: 3, flow: 75 },
                  { label: "🔋 Battery Saver", mult: 2, flow: 25 },
                  { label: "🌊 Ultra Smooth", mult: 4, flow: 100 },
                ].map(p => (
                  <button
                    key={p.label}
                    disabled={busy}
                    onClick={() => wrap(async () => {
                      await call("set_lsfg_multiplier", { multiplier: p.mult });
                      await call("set_lsfg_flow_rate", { rate: p.flow });
                    })}
                    style={{
                      padding: "6px 10px",
                      borderRadius: "4px",
                      border: "none",
                      cursor: "pointer",
                      background: "#2a2a2a",
                      color: "#fff",
                      fontSize: "11px"
                    }}
                  >
                    {p.label}
                  </button>
                ))}
              </div>
            </PanelSectionRow>
          </PanelSection>
        </>
      )}
    </>
  );
};
