import { Link, useRouterState } from "@tanstack/react-router";
import { ArrowLeft, Clock3, Command, Radio, Search, X } from "lucide-react";
import type { ReactNode } from "react";

export function NexusShell({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-screen bg-background text-foreground">
      <header className="sticky top-0 z-20 border-b border-border bg-background/95 backdrop-blur">
        <div className="flex min-h-[56px] items-center justify-between gap-4 px-4 sm:px-7">
          <div className="flex items-center gap-3">
            <div className="flex size-8 items-center justify-center border border-primary/35 bg-primary/10 text-primary">
              <Command className="size-4" strokeWidth={1.8} />
            </div>
            <div className="font-mono text-[14px] font-bold tracking-[0.12em]">NEXUS</div>
            <span className="mx-1 hidden h-7 w-px bg-border sm:block" />
            <div className="hidden sm:block">
              <div className="font-mono text-[9px] tracking-[0.12em] text-muted-foreground">MISSION ORBIT-42</div>
              <div className="mt-0.5 flex items-center gap-1.5 text-[9px] text-healthy"><Radio className="size-3" /> CONNECTED</div>
            </div>
          </div>
          <div className="flex items-center gap-2 font-mono text-[10px] text-muted-foreground"><Clock3 className="size-3.5" /> 14:35:10 UTC</div>
        </div>
      </header>
      <main className="mx-auto max-w-[1600px] px-4 pb-16 pt-5 sm:px-7 xl:px-10">
        <Link to="/" className="mb-5 inline-flex items-center gap-1.5 font-mono text-[10px] tracking-[0.12em] text-muted-foreground hover:text-foreground">
          <ArrowLeft className="size-3.5" /> BACK TO MISSION OVERVIEW
        </Link>
        {children}
      </main>
    </div>
  );
}

export function SearchBox({ value, onChange, placeholder }: { value: string; onChange: (v: string) => void; placeholder: string }) {
  return (
    <label className="flex h-8 min-w-[240px] flex-1 items-center gap-2 border border-border bg-background px-2.5 focus-within:border-primary/50">
      <Search className="size-3.5 text-quiet" />
      <input value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder}
        className="w-full bg-transparent font-mono text-[11px] text-foreground outline-none placeholder:text-quiet" />
      {value && <button type="button" onClick={() => onChange("")} aria-label="Clear search" className="text-quiet hover:text-foreground"><X className="size-3.5" /></button>}
    </label>
  );
}

export function Select({ label, value, options, onChange }: { label: string; value: string; options: string[]; onChange: (v: string) => void }) {
  return (
    <label className="flex h-8 items-center gap-1.5 border border-border bg-background px-2 font-mono text-[9px] tracking-[0.1em] text-quiet">
      {label}
      <select value={value} onChange={(e) => onChange(e.target.value)} className="bg-background text-[10px] text-foreground outline-none">
        {options.map((o) => <option key={o} value={o}>{o}</option>)}
      </select>
    </label>
  );
}

export function Label({ children, tone = "text-quiet" }: { children: ReactNode; tone?: string }) {
  return <div className={`font-mono text-[8px] tracking-[0.16em] ${tone}`}>{children}</div>;
}

export function Stat({ k, v, c }: { k: string; v: number; c: string }) {
  return (
    <div className="border-r border-border px-4 py-2 last:border-r-0">
      <Label>{k}</Label>
      <div className={`mt-0.5 font-mono text-[16px] tabular-nums ${c}`}>{String(v).padStart(2, "0")}</div>
    </div>
  );
}

const missionNav = [
  { to: "/" as const, label: "Mission Overview", glyph: "◈" },
  { to: "/anomalies" as const, label: "Active Anomalies", glyph: "△", count: "01" },
  { to: "/telemetry" as const, label: "Telemetry", glyph: "〽" },
  { to: "/logs" as const, label: "Mission Logs", glyph: "▣" },
  { to: "/procedures" as const, label: "Procedures", glyph: "▱" },
  { to: "/incidents" as const, label: "Incident History", glyph: "◷" },
];

function isActive(path: string, to: string) {
  if (to === "/") return path === "/";
  if (to === "/anomalies") return path.startsWith("/anomalies") || path.startsWith("/investigation");
  return path.startsWith(to);
}

/** The single global navigation, mounted once in the root layout. */
export function MissionSidebar() {
  const path = useRouterState({ select: (s) => s.location.pathname });
  return (
    <>
      <aside className="console-rail fixed inset-y-0 left-0 z-40 hidden w-[248px] flex-col border-r border-sidebar-border lg:flex">
        <div className="flex h-[82px] items-center gap-3 border-b border-sidebar-border px-6">
          <div className="relative flex size-9 items-center justify-center border border-signal-cyan/40 text-signal-cyan">
            <svg viewBox="0 0 24 24" className="size-5" fill="none" stroke="currentColor" strokeWidth="1.2"><ellipse cx="12" cy="12" rx="10" ry="4" transform="rotate(-25 12 12)" /><circle cx="12" cy="12" r="2.4" fill="currentColor" /></svg>
          </div>
          <div>
            <div className="font-mono text-[17px] font-bold tracking-[0.22em] text-foreground">NEXUS</div>
            <div className="mt-0.5 font-mono text-[8px] tracking-[0.16em] text-muted-foreground">MISSION OPS COPILOT</div>
          </div>
        </div>
        <div className="flex items-center justify-between px-5 pb-2 pt-7 font-mono text-[9px] tracking-[0.18em] text-quiet">
          <span>FLIGHT OPERATIONS</span><span className="text-signal-cyan/70">FD-184</span>
        </div>
        <nav aria-label="Mission navigation" className="space-y-px px-3">
          {missionNav.map((n) => {
            const active = isActive(path, n.to);
            return (
              <Link key={n.to} to={n.to} aria-current={active ? "page" : undefined}
                className={`group flex h-10 items-center gap-3 border-l-2 px-3 font-mono text-[11px] tracking-[0.04em] transition-colors ${active ? "border-signal-cyan bg-signal-cyan/[0.07] text-foreground" : "border-transparent text-muted-foreground hover:bg-sidebar-accent/60 hover:text-foreground"}`}>
                <span className={`w-4 text-center text-[13px] ${active ? "text-signal-cyan" : "text-quiet group-hover:text-foreground"}`}>{n.glyph}</span>
                <span className="flex-1">{n.label}</span>
                {n.count && <span className="border border-warning/40 px-1 text-[9px] text-warning">{n.count}</span>}
              </Link>
            );
          })}
        </nav>
        <div className="mx-5 mt-8 space-y-1.5 border-t border-sidebar-border pt-4 font-mono text-[8px] tracking-[0.14em] text-quiet">
          <div className="flex justify-between"><span>DOWNLINK</span><span className="text-healthy">S-BAND 2.2 GHZ</span></div>
          <div className="flex justify-between"><span>ALT</span><span className="text-signal-cyan">412.6 KM</span></div>
          <div className="flex justify-between"><span>INCL</span><span className="text-signal-cyan">51.64°</span></div>
        </div>
        <div className="mt-auto border-t border-sidebar-border p-4">
          <div className="mb-4 flex items-center gap-2 px-1">
            <span className="relative flex size-2"><span className="absolute inline-flex size-full animate-ping rounded-full bg-healthy opacity-25" /><span className="relative inline-flex size-2 rounded-full bg-healthy" /></span>
            <span className="font-mono text-[9px] tracking-[0.12em] text-muted-foreground">SYSTEM STATUS</span>
            <span className="ml-auto font-mono text-[9px] font-semibold text-healthy">ONLINE</span>
          </div>
          <div className="flex items-center gap-3 border-t border-sidebar-border pt-4">
            <div className="flex size-8 items-center justify-center border border-border bg-panel font-mono text-[10px] text-signal-cyan">D1</div>
            <div><div className="font-mono text-[10px] text-foreground">DEMO-01</div><div className="mt-0.5 text-[9px] text-muted-foreground">Flight operator</div></div>
          </div>
        </div>
      </aside>
      <nav aria-label="Mission navigation" className="console-rail sticky top-0 z-40 flex gap-1.5 overflow-x-auto border-b border-sidebar-border px-3 py-2 lg:hidden">
        {missionNav.map((n) => {
          const active = isActive(path, n.to);
          return (
            <Link key={n.to} to={n.to} className={`flex shrink-0 items-center gap-1.5 border px-2.5 py-1.5 font-mono text-[9px] ${active ? "border-signal-cyan/40 text-signal-cyan" : "border-border text-muted-foreground"}`}>
              <span>{n.glyph}</span>{n.label}
            </Link>
          );
        })}
      </nav>
    </>
  );
}
