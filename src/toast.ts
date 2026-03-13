import { toaster } from "@decky/api";

export function success(msg: string) {
  toaster.toast({ title: "JBL ✅", body: msg, icon: undefined, duration: 2000 });
}

export function fail(msg: string) {
  toaster.toast({ title: "JBL ⚠️", body: msg, icon: undefined, duration: 3000 });
}

export function info(msg: string) {
  toaster.toast({ title: "JBL", body: msg, icon: undefined, duration: 1500 });
}
