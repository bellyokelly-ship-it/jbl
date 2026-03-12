import { VFC, useState } from "react";
import {
  PanelSection,
  PanelSectionRow,
  Field,
  ButtonItem,
  ProgressBar,
} from "@decky/ui";
import { call } from "@decky/api";

interface GameAdvice {
  appid: string;
  name: string;
  status: string;
  current_proton: string;
  recommended: string;
  protondb_tier: string | null;
  protondb_confidence: string | null;
  reason: string;
}

const tierEmoji: Record<string, string> = {
  platinum: "🏆",
  gold: "🥇",
  silver: "🥈",
  bronze: "🥉",
  borked: "❌",
  pending: "⏳",
};

const tierColor: Record<string, string> = {
  platinum: "#b4c7dc",
  gold: "#cfb53b",
  silver: "#c0c0c0",
  bronze: "#cd7f32",
  borked: "#ff4444",
  pending: "#888888",
};

export const ProtonAdvisorPanel: VFC = () => {
  const [games, setGames] = useState<GameAdvice[]>([]);
  const [scanning, setScanning] = useState(false);
  const [scanDone, setScanDone] = useState(false);
  const [applying, setApplying] = useState<string | null>(null);
  const [filter, setFilter] = useState<string>("upgrade");
  const [error, setError] = useState<string | null>(null);

  const doScan = async () => {
    setScanning(true);
    setError(null);
    setScanDone(false);
    setGames([]);
    try {
      const raw = await call<[], string>("scan_proton_advisor");
      const parsed = JSON.parse(raw);
      if (parsed.error) {
        setError(parsed.error);
      } else {
        setGames(parsed);
        setScanDone(true);
      }
    } catch (e: any) {
      setError(e.message || "Scan failed");
    }
    setScanning(false);
  };

  const doApply = async (appid: string, protonName: string) => {
    setApplying(appid);
    try {
      const raw = await call<[string, string], string>(
        "apply_proton_override",
        appid,
        protonName
      );
      const result = JSON.parse(raw);
      if (result.success) {
        setGames((prev) =>
          prev.map((g) =>
            g.appid === appid
              ? { ...g, status: "ok", current_proton: protonName }
              : g
          )
        );
      }
    } catch (e) {
      // silent
    }
    setApplying(null);
  };

  const upgrades = games.filter((g) => g.status === "upgrade_available");
  const autoOk = games.filter((g) => g.status === "auto_ok");
  const optimal = games.filter((g) => g.status === "ok");

  const displayList =
    filter === "upgrade"
      ? upgrades
      : filter === "auto"
      ? autoOk
      : filter === "optimal"
      ? optimal
      : games;

  return (
    <div>
      <PanelSection title="Proton Advisor">
        <PanelSectionRow>
          <ButtonItem layout="below" onClick={doScan} disabled={scanning}>
            {scanning ? "Scanning..." : "Scan Installed Games"}
          </ButtonItem>
        </PanelSectionRow>

        {scanning && (
          <PanelSectionRow>
            <Field label="Querying ProtonDB..." focusable={false}>
              <ProgressBar nProgress={0.5} />
            </Field>
          </PanelSectionRow>
        )}

        {error && (
          <PanelSectionRow>
            <Field label="Error" focusable={false}>
              <span style={{ color: "#ff4444" }}>{error}</span>
            </Field>
          </PanelSectionRow>
        )}

        {scanDone && (
          <PanelSectionRow>
            <Field label="Results" focusable={false}>
              <span style={{ color: "#66c0f4", fontSize: "12px" }}>
                {games.length} games | {upgrades.length} upgrades |{" "}
                {autoOk.length} auto-ok | {optimal.length} optimal
              </span>
            </Field>
          </PanelSectionRow>
        )}
      </PanelSection>

      {scanDone && (
        <PanelSection title="Filter">
          <PanelSectionRow>
            <ButtonItem
              layout="below"
              onClick={() => setFilter("upgrade")}
              disabled={filter === "upgrade"}
            >
              Upgrades ({upgrades.length})
            </ButtonItem>
          </PanelSectionRow>
          <PanelSectionRow>
            <ButtonItem
              layout="below"
              onClick={() => setFilter("auto")}
              disabled={filter === "auto"}
            >
              Auto-OK ({autoOk.length})
            </ButtonItem>
          </PanelSectionRow>
          <PanelSectionRow>
            <ButtonItem
              layout="below"
              onClick={() => setFilter("optimal")}
              disabled={filter === "optimal"}
            >
              Optimal ({optimal.length})
            </ButtonItem>
          </PanelSectionRow>
          <PanelSectionRow>
            <ButtonItem
              layout="below"
              onClick={() => setFilter("all")}
              disabled={filter === "all"}
            >
              All ({games.length})
            </ButtonItem>
          </PanelSectionRow>
        </PanelSection>
      )}

      {scanDone && displayList.length > 0 && (
        <PanelSection title={"Games (" + displayList.length + ")"}>
          {displayList.map((g) => {
            const tier = g.protondb_tier || "pending";
            const emoji = tierEmoji[tier] || "";
            const color = tierColor[tier] || "#888";
            return (
              <div key={g.appid}>
                <PanelSectionRow>
                  <Field
                    label={g.name}
                    description={emoji + " " + tier.toUpperCase() + " | " + g.current_proton}
                    focusable={false}
                  >
                    <span style={{ color, fontSize: "11px" }}>
                      {g.reason}
                    </span>
                  </Field>
                </PanelSectionRow>

                {g.status === "upgrade_available" && (
                  <PanelSectionRow>
                    <ButtonItem
                      layout="below"
                      onClick={() => doApply(g.appid, g.recommended)}
                      disabled={applying === g.appid}
                    >
                      {applying === g.appid
                        ? "Applying..."
                        : "Apply " + g.recommended}
                    </ButtonItem>
                  </PanelSectionRow>
                )}

                {(g.status === "auto_ok" || g.status === "ok") && (
                  <PanelSectionRow>
                    <Field label="" focusable={false}>
                      <span style={{ color: "#66c0f4" }}>
                        {g.status === "ok" ? "Optimal" : "Rec: " + g.recommended}
                      </span>
                    </Field>
                  </PanelSectionRow>
                )}
              </div>
            );
          })}
        </PanelSection>
      )}

      {scanDone && displayList.length === 0 && (
        <PanelSection>
          <PanelSectionRow>
            <Field label="" focusable={false}>
              {filter === "upgrade"
                : "No games in this category"}
            </Field>
          </PanelSectionRow>
        </PanelSection>
      )}
    </div>
  );
};
