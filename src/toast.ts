import { toaster } from "@decky/api";

// ─── Toast Cooldown System ─────────────────────────────────
// Only one toast per category every 30 seconds.
// Prevents spam when user is adjusting multiple settings.

const COOLDOWN_MS = 30_000;
const _lastFired: Record<string, number> = {};

function _throttled(category: string): boolean {
  const now = Date.now();
  const last = _lastFired[category] || 0;
  if (now - last < COOLDOWN_MS) return true;
  _lastFired[category] = now;
  return false;
}

export function resetCooldown(category?: string) {
  if (category) {
    delete _lastFired[category];
  } else {
    Object.keys(_lastFired).forEach((k) => delete _lastFired[k]);
  }
}

export function success(msg: string, category: string = "general") {
  if (_throttled(category)) return;
  toaster.toast({ title: "JBL ✅", body: msg, duration: 2000 });
}

export function info(msg: string, category: string = "general") {
  if (_throttled(category)) return;
  toaster.toast({ title: "JBL ℹ", body: msg, duration: 2000 });
}

export function warn(msg: string, category: string = "general") {
  if (_throttled(category)) return;
  toaster.toast({ title: "JBL ⚠️", body: msg, duration: 3000 });
}

export function fail(msg: string) {
  // Errors always fire — no cooldown
  toaster.toast({ title: "JBL ❌", body: msg, duration: 3000 });
}
