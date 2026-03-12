// JBL Global Theme System
export const JBL = {
  cyan: "#00d4ff",
  cyanDim: "#00a3cc",
  cyanGlow: "0 0 12px rgba(0,212,255,0.4)",
  cyanGlowStrong: "0 0 20px rgba(0,212,255,0.6)",
  purple: "#b44dff",
  purpleGlow: "0 0 12px rgba(180,77,255,0.4)",
  green: "#00ff88",
  greenDim: "#00cc6a",
  amber: "#ffaa00",
  red: "#ff4455",
  redGlow: "0 0 12px rgba(255,68,85,0.4)",
  panelBg: "#1a1a2e",
  panelBgLight: "#222240",
  cardBg: "#16213e",
  cardBorder: "#2a2a4a",
  surfaceDark: "#0f0f23",
  textPrimary: "#e8e8f0",
  textSecondary: "#8888aa",
  textMuted: "#555577",
};

export const jblPanelWrap: React.CSSProperties = {
  padding: "8px 0px 80px 0px",
  display: "flex",
  flexDirection: "column",
  gap: "8px",
};

export const jblCard: React.CSSProperties = {
  background: `linear-gradient(135deg, ${JBL.cardBg} 0%, ${JBL.panelBg} 100%)`,
  border: `1px solid ${JBL.cardBorder}`,
  borderRadius: "10px",
  padding: "12px 14px",
  marginBottom: "6px",
};

export const jblCardGlow = (color: string): React.CSSProperties => ({
  ...jblCard,
  borderColor: color,
  boxShadow: `0 0 12px ${color}33, inset 0 1px 0 ${color}22`,
});

export const jblHeader: React.CSSProperties = {
  display: "flex",
  alignItems: "center",
  gap: "10px",
  padding: "10px 14px",
  background: `linear-gradient(135deg, ${JBL.panelBg} 0%, ${JBL.surfaceDark} 100%)`,
  borderRadius: "10px",
  borderLeft: `3px solid ${JBL.cyan}`,
  marginBottom: "8px",
  boxShadow: JBL.cyanGlow,
};

export const jblHeaderTitle: React.CSSProperties = {
  fontSize: "15px",
  fontWeight: 700,
  color: JBL.cyan,
  letterSpacing: "0.5px",
};

export const jblHeaderSub: React.CSSProperties = {
  fontSize: "11px",
  color: JBL.textSecondary,
  marginTop: "2px",
};

export const jblBadge = (bg: string, text: string = "#fff"): React.CSSProperties => ({
  display: "inline-block",
  padding: "2px 8px",
  borderRadius: "12px",
  fontSize: "11px",
  fontWeight: 600,
  background: bg,
  color: text,
  letterSpacing: "0.3px",
});

export const jblStatusBar = (color: string): React.CSSProperties => ({
  padding: "8px 12px",
  borderRadius: "8px",
  background: `${color}15`,
  border: `1px solid ${color}40`,
  color: color,
  fontSize: "12px",
  fontWeight: 500,
  textAlign: "center" as const,
  transition: "all 0.3s ease",
});

export const jblProgressBar = (_pct: number, _color: string): React.CSSProperties => ({
  height: "8px",
  borderRadius: "4px",
  background: JBL.surfaceDark,
  position: "relative" as const,
  overflow: "hidden" as const,
});

export const jblProgressFill = (pct: number, color: string): React.CSSProperties => ({
  width: `${Math.min(100, Math.max(0, pct))}%`,
  height: "100%",
  borderRadius: "4px",
  background: `linear-gradient(90deg, ${color}cc, ${color})`,
  boxShadow: `0 0 8px ${color}66`,
  transition: "width 0.5s ease",
});

export const jblButton = (color: string = JBL.cyan): React.CSSProperties => ({
  background: `linear-gradient(135deg, ${color}22, ${color}11)`,
  border: `1px solid ${color}66`,
  borderRadius: "8px",
  color: color,
  cursor: "pointer",
  transition: "all 0.2s ease",
});

export const jblModeCard = (active: boolean, color: string): React.CSSProperties => ({
  ...jblCard,
  borderColor: active ? color : JBL.cardBorder,
  boxShadow: active ? `0 0 16px ${color}44, inset 0 1px 0 ${color}33` : "none",
  cursor: "pointer",
  transition: "all 0.3s ease",
  textAlign: "center" as const,
});

export const jblLabel: React.CSSProperties = {
  fontSize: "12px",
  color: JBL.textSecondary,
  fontWeight: 500,
  marginBottom: "2px",
};

export const jblValue: React.CSSProperties = {
  fontSize: "14px",
  color: JBL.textPrimary,
  fontWeight: 600,
};

export const jblValueLarge: React.CSSProperties = {
  fontSize: "22px",
  color: JBL.cyan,
  fontWeight: 700,
  letterSpacing: "-0.5px",
};

export const jblDivider: React.CSSProperties = {
  height: "1px",
  background: `linear-gradient(90deg, transparent, ${JBL.cardBorder}, transparent)`,
  margin: "6px 0",
};

export const jblRow: React.CSSProperties = {
  display: "flex",
  justifyContent: "space-between",
  alignItems: "center",
  padding: "4px 0",
};

export const jblGrid2: React.CSSProperties = {
  display: "grid",
  gridTemplateColumns: "1fr 1fr",
  gap: "8px",
};

export const jblGrid4: React.CSSProperties = {
  display: "grid",
  gridTemplateColumns: "1fr 1fr 1fr 1fr",
  gap: "6px",
};

export const tierColor = (tier: string): string => {
  switch (tier?.toLowerCase()) {
    case "platinum": return "#b4c7dc";
    case "gold": return "#cfb53b";
    case "silver": return "#a0a0a0";
    case "bronze": return "#cd7f32";
    case "borked": return JBL.red;
    case "native": return JBL.green;
    default: return JBL.textSecondary;
  }
};

export const tempColor = (temp: number): string => {
  if (temp < 55) return JBL.green;
  if (temp < 70) return JBL.cyan;
  if (temp < 80) return JBL.amber;
  return JBL.red;
};

export const battColor = (pct: number): string => {
  if (pct > 60) return JBL.green;
  if (pct > 30) return JBL.amber;
  return JBL.red;
};

export const jblStatusBadge = (color: string): React.CSSProperties => ({
  display: "inline-block",
  padding: "3px 10px",
  borderRadius: "12px",
  fontSize: "11px",
  fontWeight: 600,
  background: `${color}20`,
  border: `1px solid ${color}40`,
  color: color,
});
