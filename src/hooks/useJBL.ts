// ============================================================
// JBL — useJBL Hook
// Central state + server communication
// ============================================================
import { useState, useEffect, useCallback } from "react";
import { ServerAPI } from "decky-frontend-lib";

export interface JBLState {
  powershift: any;
  lsfg: any;
  thermal: any;
  battery: any;
  proton: any;
  xr: any;
  display: any;
  health: any;
  analytics: any;
  loading: boolean;
  error: string | null;
}

export const useJBL = (serverAPI: ServerAPI) => {
  const [state, setState] = useState<JBLState>({
    powershift: null,
    lsfg: null,
    thermal: null,
    battery: null,
    proton: null,
    xr: null,
    display: null,
    health: null,
    analytics: null,
    loading: true,
    error: null
  });

  const call = useCallback(async (method: string, params: any = {}) => {
    try {
      const res = await serverAPI.callPluginMethod(method, params);
      if (res.success) return res.result;
      throw new Error(res.result as string);
    } catch (e: any) {
      console.error(`JBL API error [${method}]:`, e);
      return null;
    }
  }, [serverAPI]);

  const refresh = useCallback(async () => {
    setState(s => ({ ...s, loading: true }));
    const [powershift, lsfg, thermal, battery, proton, xr, display, health, analytics] =
      await Promise.all([
        call("get_powershift_state"),
        call("get_lsfg_state"),
        call("get_thermal_status"),
        call("get_battery_status"),
        call("get_proton_status"),
        call("get_xr_status"),
        call("get_display_status"),
        call("run_diagnostics"),
        call("get_analytics_summary", { days: 7 })
      ]);
    setState({
      powershift, lsfg, thermal, battery,
      proton, xr, display, health, analytics,
      loading: false, error: null
    });
  }, [call]);

  useEffect(() => {
    refresh();
    const interval = setInterval(refresh, 10000);
    return () => clearInterval(interval);
  }, [refresh]);

  return { state, call, refresh };
};
