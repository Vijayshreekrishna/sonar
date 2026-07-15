"use client";

import { useEffect, useState } from "react";
import { ApiKeyGate, loadStoredKey } from "@/components/ApiKeyGate";
import { Header } from "@/components/Header";
import { MarketExplorer } from "@/components/MarketExplorer";
import { WalletExplorer } from "@/components/WalletExplorer";
import { MarketDetail } from "@/components/MarketDetail";

type Tab = "markets" | "wallets";

export default function Home() {
  const [apiKey, setApiKey] = useState<string | null>(null);
  const [hydrated, setHydrated] = useState(false);
  const [tab, setTab] = useState<Tab>("markets");
  const [selectedMarketId, setSelectedMarketId] = useState<string | null>(null);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setApiKey(loadStoredKey());
    setHydrated(true);
  }, []);

  if (!hydrated) return null;

  if (!apiKey) {
    return <ApiKeyGate onSubmit={setApiKey} />;
  }

  return (
    <div className="flex flex-col h-screen">
      <Header
        tab={tab}
        onTabChange={setTab}
        onSignOut={() => {
          window.localStorage.removeItem("sonar:api_key");
          setApiKey(null);
        }}
      />
      <main className="flex-1 min-h-0 overflow-y-auto p-4 sm:p-6">
        <div className="max-w-5xl mx-auto">
          {tab === "markets" ? (
            <MarketExplorer apiKey={apiKey} onSelectMarket={setSelectedMarketId} />
          ) : (
            <WalletExplorer apiKey={apiKey} onSelectMarket={setSelectedMarketId} />
          )}
        </div>
      </main>
      <MarketDetail apiKey={apiKey} marketId={selectedMarketId} onClose={() => setSelectedMarketId(null)} />
    </div>
  );
}
