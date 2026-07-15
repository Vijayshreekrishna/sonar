"use client";

type Tab = "markets" | "wallets";

export function Header({
  tab,
  onTabChange,
  onSignOut,
}: {
  tab: Tab;
  onTabChange: (t: Tab) => void;
  onSignOut: () => void;
}) {
  return (
    <header className="flex items-center justify-between border-b border-line px-6 py-4 shrink-0">
      <div className="flex items-baseline gap-3">
        <span className="font-display text-2xl tracking-tight text-signal">Sonar</span>
        <span className="hidden sm:inline text-xs text-signal-dim">find markets and wallets on PMAxis</span>
      </div>
      <div className="flex items-center gap-4">
        <div className="flex rounded-md border border-line overflow-hidden">
          {(["markets", "wallets"] as Tab[]).map((t) => (
            <button
              key={t}
              onClick={() => onTabChange(t)}
              className={`px-3.5 py-1.5 text-xs uppercase tracking-wide transition-colors ${
                tab === t ? "bg-amber text-graphite" : "bg-panel text-signal-dim hover:text-signal"
              }`}
            >
              {t}
            </button>
          ))}
        </div>
        <button onClick={onSignOut} className="text-xs text-signal-dim hover:text-signal transition-colors">
          sign out
        </button>
      </div>
    </header>
  );
}
