"use client";

import { useState } from "react";
import { unwatchWallet, watchWallet } from "@/lib/api";

export function WalletWatchToggle({
  apiKey,
  address,
  watching,
  onChange,
}: {
  apiKey: string;
  address: string;
  watching: boolean;
  onChange: (watching: boolean) => void;
}) {
  const [pending, setPending] = useState(false);

  async function toggle() {
    if (pending) return;
    const next = !watching;
    setPending(true);
    onChange(next); // optimistic
    try {
      if (next) await watchWallet(apiKey, address);
      else await unwatchWallet(apiKey, address);
    } catch {
      onChange(!next); // rollback
    } finally {
      setPending(false);
    }
  }

  return (
    <button
      onClick={toggle}
      disabled={pending}
      className={`shrink-0 rounded-md border px-2.5 py-1 text-[11px] uppercase tracking-wide transition-colors disabled:opacity-50 ${
        watching
          ? "border-amber bg-amber-dim text-amber"
          : "border-line text-signal-dim hover:border-line-strong hover:text-signal"
      }`}
    >
      {watching ? "Watching ●" : "Watch wallet"}
    </button>
  );
}
