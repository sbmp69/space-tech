import { useMemo, useState } from "react";
import { Link, createFileRoute } from "@tanstack/react-router";
import {
  ArrowLeft,
  ArrowRight,
  Clock3,
  Command,
  Link2,
  ListTree,
  Radio,
  Rows3,
  Search,
  SearchX,
  ShieldAlert,
  X,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { missionLogs, type LogEntry, type Severity } from "@/lib/mission-logs";

export const Route = createFileRoute("/logs")({
  head: () => ({
    meta: [
      { title: "Mission Logs | NEXUS Mission Operations" },
      {
        name: "description",
        content: "Operational event log for mission ORBIT-42 with filtering, anomaly correlation and evidence links.",
      },
      { property: "og:title", content: "Mission Logs | NEXUS Mission Operations" },
      {
        property: "og:description",
        content: "Filter, correlate and inspect ORBIT-42 operational events across every spacecraft system.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: MissionLogsPage,
});

const sevText: Record<Severity, string> = {
  INFO: "text-signal-cyan",
  WARNING: "text-warning",
  HIGH: "text-critical",
};
const sevBox: Record<Severity, string> = {
  INFO: "border-signal-cyan/30 bg-signal-cyan/10 text-signal-cyan",
  WARNING: "border-warning/30 bg-warning/10 text-warning",
  HIGH: "border-critical/35 bg-critical/10 text-critical",
};
const sevDot: Record<Severity, string> = { INFO: "bg-signal-cyan", WARNING: "bg-warning", HIGH: "bg-critical" };
const statusText: Record<string, string> = {
  NORMAL: "text-healthy",
  OPEN: "text-warning",
  ACTIVE: "text-critical",
  ACKNOWLEDGED: "text-signal-cyan",
  RESOLVED: "text-muted-foreground",
};

const ALL = "ALL";
const severities = [ALL, "INFO", "WARNING", "HIGH"];
const systems = [ALL, ...Array.from(new Set(missionLogs.map((l) => l.system)))];
const statuses = [ALL, ...Array.from(new Set(missionLogs.map((l) => l.status)))];
const ranges = [
  { id: ALL, label: "FULL WINDOW", from: "00:00:00", to: "23:59:59" },
  { id: "PRE", label: "14:00 – 14:30", from: "14:00:00", to: "14:30:59" },
  { id: "ANOM", label: "14:30 – 14:36 · ANOMALY", from: "14:30:00", to: "14:36:59" },
  { id: "POST", label: "AFTER 14:33", from: "14:33:00", to: "23:59:59" },
];

function FilterSelect({ label, value, options, onChange, render }: {
  label: string;
  value: string;
  options: string[];
  onChange: (v: string) => void;
  render?: (v: string) => string;
}) {
  return (
    <label className="flex h-8 items-center gap-2 border border-border bg-background px-2">
      <span className="font-mono text-[8px] tracking-[0.14em] text-quiet">{label}</span>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="bg-transparent font-mono text-[10px] text-foreground outline-none [&>option]:bg-panel"
      >
        {options.map((o) => (
          <option key={o} value={o}>{render ? render(o) : o}</option>
        ))}
      </select>
    </label>
  );
}

function MissionLogsPage() {
  const [q, setQ] = useState("");
  const [sev, setSev] = useState(ALL);
  const [sys, setSys] = useState(ALL);
  const [status, setStatus] = useState(ALL);
  const [range, setRange] = useState(ALL);
  const [view, setView] = useState<"table" | "timeline">("table");
  const [correlatedOnly, setCorrelatedOnly] = useState(false);
  const [selected, setSelected] = useState<LogEntry | null>(null);

  const filtered = useMemo(() => {
    const r = ranges.find((x) => x.id === range) ?? ranges[0]!;
    const needle = q.trim().toLowerCase();
    return missionLogs.filter((l) => {
      if (sev !== ALL && l.severity !== sev) return false;
      if (sys !== ALL && l.system !== sys) return false;
      if (status !== ALL && l.status !== status) return false;
      if (correlatedOnly && !l.anomaly) return false;
      if (l.time < r.from || l.time > r.to) return false;
      if (!needle) return true;
      return [l.event, l.source, l.id, l.message, l.system, l.detail].join(" ").toLowerCase().includes(needle);
    });
  }, [q, sev, sys, status, range, correlatedOnly]);

  const activeFilters = q || sev !== ALL || sys !== ALL || status !== ALL || range !== ALL || correlatedOnly;
  const reset = () => {
    setQ(""); setSev(ALL); setSys(ALL); setStatus(ALL); setRange(ALL); setCorrelatedOnly(false);
  };
  const counts = {
    HIGH: filtered.filter((l) => l.severity === "HIGH").length,
    WARNING: filtered.filter((l) => l.severity === "WARNING").length,
    INFO: filtered.filter((l) => l.severity === "INFO").length,
    correlated: filtered.filter((l) => l.anomaly).length,
  };

  return (
    <div className="min-h-screen bg-background text-foreground">
      <header className="sticky top-0 z-30 border-b border-border bg-background/95 backdrop-blur">
        <div className="flex min-h-[60px] items-center justify-between gap-4 px-4 sm:px-7 xl:px-10">
          <div className="flex min-w-0 items-center gap-3">
            <div className="flex size-9 shrink-0 items-center justify-center border border-primary/35 bg-primary/10 text-primary">
              <Command className="size-[18px]" strokeWidth={1.8} />
            </div>
            <div>
              <div className="font-mono text-[15px] font-bold tracking-[0.12em]">NEXUS</div>
              <div className="hidden text-[9px] text-muted-foreground sm:block">Mission Operations Copilot</div>
            </div>
            <span className="mx-1 hidden h-8 w-px bg-border sm:block" />
            <div className="hidden sm:block">
              <div className="font-mono text-[9px] tracking-[0.12em] text-muted-foreground">MISSION ORBIT-42</div>
              <div className="mt-1 flex items-center gap-1.5 text-[9px] text-healthy">
                <Radio className="size-3" /> CONNECTED
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2 font-mono text-[10px] text-muted-foreground">
            <Clock3 className="size-3.5" /> 14:35:10 UTC
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-[1600px] px-4 pb-16 pt-5 sm:px-7 xl:px-10">
        <Link
          to="/"
          className="mb-5 inline-flex items-center gap-1.5 font-mono text-[10px] tracking-[0.12em] text-muted-foreground transition-colors hover:text-foreground"
        >
          <ArrowLeft className="size-3.5" /> BACK TO MISSION OVERVIEW
        </Link>

        <section className="mb-5 flex flex-col justify-between gap-4 lg:flex-row lg:items-end">
          <div>
            <div className="mb-2 flex items-center gap-2 font-mono text-[9px] tracking-[0.13em] text-signal-cyan">
              <span className="size-1.5 rounded-full bg-signal-cyan" /> OPERATIONAL EVENT STREAM
              <span className="text-quiet">•</span> FLIGHT DAY 184
            </div>
            <h1 className="font-mono text-[23px] font-semibold tracking-[0.035em] sm:text-[27px]">MISSION LOGS</h1>
            <p className="mt-1 text-[12px] text-muted-foreground">
              Onboard events from every subsystem, correlated against the active thermal anomaly.
            </p>
          </div>
          <div className="grid grid-cols-4 border border-border bg-panel font-mono">
            {[
              ["HIGH", counts.HIGH, "text-critical"],
              ["WARNING", counts.WARNING, "text-warning"],
              ["INFO", counts.INFO, "text-signal-cyan"],
              ["CORRELATED", counts.correlated, "text-primary"],
            ].map(([k, v, c]) => (
              <div key={k as string} className="border-r border-border px-4 py-2 last:border-r-0">
                <div className="text-[8px] tracking-[0.14em] text-quiet">{k}</div>
                <div className={`mt-0.5 text-[16px] tabular-nums ${c}`}>{String(v).padStart(2, "0")}</div>
              </div>
            ))}
          </div>
        </section>

        {/* Controls */}
        <section className="border border-border bg-panel">
          <div className="flex flex-wrap items-center gap-2 border-b border-border p-3">
            <label className="flex h-8 min-w-[240px] flex-1 items-center gap-2 border border-border bg-background px-2.5 focus-within:border-primary/50">
              <Search className="size-3.5 text-quiet" />
              <input
                value={q}
                onChange={(e) => setQ(e.target.value)}
                placeholder="Search event, source ID or message…"
                className="w-full bg-transparent font-mono text-[11px] text-foreground outline-none placeholder:text-quiet"
              />
              {q && (
                <button type="button" onClick={() => setQ("")} aria-label="Clear search" className="text-quiet hover:text-foreground">
                  <X className="size-3.5" />
                </button>
              )}
            </label>
            <FilterSelect label="SEV" value={sev} options={severities} onChange={setSev} />
            <FilterSelect label="SYS" value={sys} options={systems} onChange={setSys} />
            <FilterSelect label="STATUS" value={status} options={statuses} onChange={setStatus} />
            <FilterSelect
              label="TIME"
              value={range}
              options={ranges.map((r) => r.id)}
              onChange={setRange}
              render={(id) => ranges.find((r) => r.id === id)?.label ?? id}
            />
            <button
              type="button"
              onClick={() => setCorrelatedOnly((v) => !v)}
              aria-pressed={correlatedOnly}
              className={`flex h-8 items-center gap-1.5 border px-2.5 font-mono text-[9px] tracking-[0.1em] transition-colors ${
                correlatedOnly ? "border-primary/40 bg-primary/10 text-primary" : "border-border text-muted-foreground hover:text-foreground"
              }`}
            >
              <Link2 className="size-3.5" /> ANOMALY-CORRELATED
            </button>
          </div>
          <div className="flex flex-wrap items-center justify-between gap-3 px-3 py-2">
            <div className="font-mono text-[9px] tracking-[0.12em] text-muted-foreground">
              SHOWING <span className="text-foreground">{filtered.length}</span> OF {missionLogs.length} EVENTS
              {activeFilters && (
                <button type="button" onClick={reset} className="ml-3 text-primary hover:underline">
                  RESET FILTERS
                </button>
              )}
            </div>
            <div className="flex border border-border font-mono text-[9px] tracking-[0.12em]">
              {([["table", "TABLE VIEW", Rows3], ["timeline", "TIMELINE VIEW", ListTree]] as const).map(([id, label, Icon]) => (
                <button
                  key={id}
                  type="button"
                  onClick={() => setView(id)}
                  aria-pressed={view === id}
                  className={`flex items-center gap-1.5 px-3 py-1.5 transition-colors ${
                    view === id ? "bg-primary/10 text-primary" : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  <Icon className="size-3" /> {label}
                </button>
              ))}
            </div>
          </div>
        </section>

        {filtered.length === 0 ? (
          <section className="flex flex-col items-center justify-center border border-t-0 border-border bg-panel px-6 py-16 text-center">
            <div className="mb-4 flex size-11 items-center justify-center border border-border bg-background text-quiet">
              <SearchX className="size-5" />
            </div>
            <div className="font-mono text-[13px] font-semibold tracking-[0.14em]">NO MATCHING MISSION EVENTS</div>
            <p className="mt-2 max-w-[420px] text-[12px] text-muted-foreground">
              No ORBIT-42 events match the current severity, system, status and time window. Widen the filters to resume the event stream.
            </p>
            <Button variant="outline" onClick={reset} className="mt-5 rounded-none font-mono text-[10px] tracking-[0.12em]">
              RESET ALL FILTERS
            </Button>
          </section>
        ) : view === "table" ? (
          <section className="overflow-x-auto border border-t-0 border-border bg-panel">
            <table className="w-full min-w-[920px] border-collapse font-mono text-[11px]">
              <thead>
                <tr className="border-b border-border text-left text-[8px] tracking-[0.16em] text-quiet">
                  {["TIME", "SEVERITY", "SYSTEM", "EVENT", "SOURCE", "STATUS", ""].map((h, i) => (
                    <th key={i} className="px-3 py-2 font-medium">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filtered.map((l) => (
                  <tr
                    key={l.id}
                    onClick={() => setSelected(l)}
                    onKeyDown={(e) => (e.key === "Enter" || e.key === " ") && (e.preventDefault(), setSelected(l))}
                    tabIndex={0}
                    className={`cursor-pointer border-b border-border/60 border-l-2 transition-colors last:border-b-0 hover:bg-panel-raised focus:bg-panel-raised focus:outline-none ${
                      l.anomaly ? "border-l-primary/70 bg-primary/[0.03]" : "border-l-transparent"
                    } ${selected?.id === l.id ? "bg-panel-raised" : ""}`}
                  >
                    <td className="whitespace-nowrap px-3 py-2 tabular-nums text-muted-foreground">{l.time}</td>
                    <td className="px-3 py-2">
                      <span className={`inline-flex items-center gap-1.5 border px-1.5 py-0.5 text-[9px] ${sevBox[l.severity]}`}>
                        <span className={`size-1.5 rounded-full ${sevDot[l.severity]}`} />
                        {l.severity}
                      </span>
                    </td>
                    <td className="px-3 py-2 text-[10px] tracking-[0.06em] text-muted-foreground">{l.system}</td>
                    <td className="px-3 py-2">
                      <div className="text-foreground">{l.event}</div>
                      <div className="mt-0.5 font-sans text-[11px] text-muted-foreground">{l.message}</div>
                    </td>
                    <td className="whitespace-nowrap px-3 py-2 text-signal-cyan">{l.source}</td>
                    <td className={`px-3 py-2 text-[10px] tracking-[0.08em] ${statusText[l.status]}`}>{l.status}</td>
                    <td className="px-3 py-2 text-right">
                      {l.anomaly && (
                        <span className="inline-flex items-center gap-1 border border-primary/30 bg-primary/10 px-1.5 py-0.5 text-[8px] tracking-[0.12em] text-primary">
                          <Link2 className="size-2.5" /> ANOMALY
                        </span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </section>
        ) : (
          <section className="border border-t-0 border-border bg-panel p-4 sm:p-6">
            <ol className="relative ml-[86px] border-l border-gridline">
              {filtered.map((l) => (
                <li key={l.id} className="relative pb-5 pl-6 last:pb-0">
                  <span className="absolute -left-[92px] top-0.5 w-[78px] text-right font-mono text-[10px] tabular-nums text-muted-foreground">
                    {l.time}
                  </span>
                  <span
                    className={`absolute -left-[5px] top-1.5 size-[9px] rounded-full ring-4 ring-panel ${sevDot[l.severity]}`}
                  />
                  <button
                    type="button"
                    onClick={() => setSelected(l)}
                    className={`w-full border-l-2 px-3 py-2 text-left transition-colors hover:bg-panel-raised ${
                      l.anomaly ? "border-l-primary/70 bg-primary/[0.04]" : "border-l-transparent"
                    }`}
                  >
                    <div className="flex flex-wrap items-center gap-2 font-mono text-[10px]">
                      <span className={sevText[l.severity]}>{l.severity}</span>
                      <span className="text-quiet">/</span>
                      <span className="text-muted-foreground">{l.system}</span>
                      <span className="text-quiet">/</span>
                      <span className="text-foreground">{l.event}</span>
                      <span className="text-signal-cyan">{l.source}</span>
                      {l.anomaly && (
                        <span className="border border-primary/30 bg-primary/10 px-1.5 text-[8px] tracking-[0.12em] text-primary">
                          ANOMALY LINK
                        </span>
                      )}
                    </div>
                    <div className="mt-1 text-[12px] text-muted-foreground">{l.message}</div>
                  </button>
                </li>
              ))}
            </ol>
          </section>
        )}
      </main>

      <Sheet open={!!selected} onOpenChange={(o) => !o && setSelected(null)}>
        <SheetContent side="right" className="w-full overflow-y-auto rounded-none border-l border-border bg-panel p-0 sm:max-w-[480px]">
          {selected && (
            <>
              <SheetHeader className={`border-b border-l-2 border-border p-5 text-left ${selected.anomaly ? "border-l-primary" : "border-l-signal-cyan"}`}>
                <div className="font-mono text-[9px] tracking-[0.14em] text-muted-foreground">MISSION LOG · {selected.id}</div>
                <SheetTitle className="font-mono text-[18px]">{selected.event}</SheetTitle>
                <SheetDescription className="font-mono text-[10px]">{selected.time} UTC · ORBIT-42</SheetDescription>
              </SheetHeader>
              <div className="space-y-5 p-5">
                {selected.anomaly && (
                  <div className="border border-primary/30 bg-primary/5 p-4">
                    <div className="mb-2 inline-flex items-center gap-1.5 font-mono text-[9px] tracking-[0.14em] text-primary">
                      <ShieldAlert className="size-3" /> RELATED TO ACTIVE ANOMALY
                    </div>
                    <div className="font-mono text-[13px] text-foreground">THERMAL SYSTEM ANOMALY</div>
                    <p className="mt-1 text-[12px] leading-relaxed text-muted-foreground">{selected.anomaly}</p>
                  </div>
                )}
                <dl className="grid grid-cols-2 gap-px border border-border bg-border">
                  {[
                    ["EVENT ID", selected.id],
                    ["TIMESTAMP", `${selected.time} UTC`],
                    ["SEVERITY", selected.severity],
                    ["SYSTEM", selected.system],
                    ["EVENT", selected.event],
                    ["SOURCE", selected.source],
                    ["STATUS", selected.status],
                  ].map(([k, v]) => (
                    <div key={k} className={`bg-background p-3 ${k === "STATUS" ? "col-span-2" : ""}`}>
                      <dt className="font-mono text-[9px] tracking-[0.12em] text-quiet">{k}</dt>
                      <dd
                        className={`mt-0.5 break-all font-mono text-[11px] ${
                          k === "SEVERITY" ? sevText[selected.severity] : k === "STATUS" ? statusText[selected.status] : ""
                        }`}
                      >
                        {v}
                      </dd>
                    </div>
                  ))}
                </dl>
                <div>
                  <div className="mb-2 font-mono text-[9px] tracking-[0.14em] text-muted-foreground">EVENT DETAILS</div>
                  <p className="mb-3 text-[13px] leading-relaxed">{selected.detail}</p>
                  <pre className="overflow-x-auto border border-border bg-background p-3 font-mono text-[10px] leading-relaxed text-signal-cyan">
                    {selected.raw.join("\n")}
                  </pre>
                </div>
                <div>
                  <div className="mb-2 font-mono text-[9px] tracking-[0.14em] text-muted-foreground">RELATED EVIDENCE</div>
                  {selected.evidence ? (
                    <div className="border border-border bg-background p-3">
                      <div className="font-mono text-[10px] text-muted-foreground">
                        {selected.evidence.label}
                      </div>
                      <Button asChild className="mt-3 w-full rounded-none font-mono text-[10px] tracking-[0.1em]">
                        <Link to="/investigation" search={{ source: selected.evidence.key }}>
                          VIEW RELATED EVIDENCE <ArrowRight className="size-3" />
                        </Link>
                      </Button>
                    </div>
                  ) : (
                    <div className="border border-dashed border-border bg-background p-3 font-mono text-[10px] text-quiet">
                      ROUTINE EVENT · NOT PART OF AN ACTIVE EVIDENCE CHAIN
                    </div>
                  )}
                </div>
                <Button variant="outline" className="w-full rounded-none font-mono text-[10px] tracking-[0.1em]" onClick={() => setSelected(null)}>
                  CLOSE
                </Button>
              </div>
            </>
          )}
        </SheetContent>
      </Sheet>
    </div>
  );
}
