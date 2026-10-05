import { useMemo, useState } from "react";
import { Area, AreaChart, ResponsiveContainer, YAxis } from "recharts";
import { Link, createFileRoute } from "@tanstack/react-router";
import { ArrowLeft, ArrowRight, BookOpen, Check, Clock3, Command, FileSearch, History, ListTree, Radio, Search, SearchX, UserRound } from "lucide-react";
import { Button } from "@/components/ui/button";
import { missionSnapshot } from "@/lib/mission-data";
import { missionLogs } from "@/lib/mission-logs";

export const Route = createFileRoute("/anomalies")({
  head: () => ({
    meta: [
      { title: "Active Anomalies | NEXUS Mission Operations" },
      { name: "description", content: "Anomaly register and triage board for mission ORBIT-42: severity, ownership, workflow stage and linked evidence." },
      { property: "og:title", content: "Active Anomalies | NEXUS Mission Operations" },
      { property: "og:description", content: "Triage the ORBIT-42 thermal anomaly and track every open, watched and closed spacecraft anomaly." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: AnomaliesPage,
});

type Sev = "HIGH" | "MEDIUM" | "LOW";
type State = "ACTIVE" | "ACKNOWLEDGED" | "MONITORING" | "CLOSED";
type Anomaly = {
  id: string; title: string; system: string; severity: Sev; state: State; opened: string;
  owner: string | null; stage: number; trigger: string; summary: string; logIds: string[]; investigable?: boolean;
  metrics: Array<{ label: string; value: string; from?: string; tone: "warning" | "cyan" | "healthy" | "critical" }>;
  impact: string;
};

const STAGES = ["ANOMALY", "INVESTIGATION", "EVIDENCE", "CONTEXT", "PROCEDURE", "RECOMMENDATION", "DECISION"];

const initial: Anomaly[] = [
  {
    id: "THM-042-031", title: "Cooling loop B over-temperature", system: "THERMAL", severity: "HIGH", state: "ACTIVE",
    opened: missionSnapshot.anomaly.detectedAt, owner: null, stage: 2, investigable: true,
    trigger: "TEMP_THRESHOLD_EXCEEDED · 80.0°C limit",
    summary: missionSnapshot.anomaly.description,
    logIds: ["LOG-4820", "LOG-4821", "EVT-20880", "LOG-4822", "EVT-20884", "EVT-20886", "LOG-4823"],
    impact: "Sustained over-temperature risks avionics derating. Flight rule FR-THM-3 requires mitigation before next eclipse entry.",
    metrics: [
      { label: "TEMPERATURE", value: "89.2°C", from: "72.1°C", tone: "critical" },
      { label: "COOLING FAN B", value: "1,800 RPM", from: "4,200 RPM", tone: "warning" },
      { label: "BUS VOLTAGE", value: "11.8 V", from: "12.1 V", tone: "healthy" },
      { label: "ABOVE LIMIT", value: "+9.2°C", from: "80.0°C limit", tone: "warning" },
    ],
  },
  {
    id: "PWR-042-017", title: "Solar array 2 off-point 1.8°", system: "POWER", severity: "LOW", state: "MONITORING",
    opened: "14:26:44", owner: "DEMO-01", stage: 6, trigger: "SOLAR_ARRAY_OFFPOINT · 1.5° limit",
    summary: "Array drive compensating; generation reduced 0.6%. Held under watch until next sunlit pass.",
    logIds: ["EVT-20871"],
    impact: "Power generation margin reduced by 0.6%; no effect on thermal or payload operations.",
    metrics: [
      { label: "OFF-POINT", value: "1.8°", from: "0.0°", tone: "warning" },
      { label: "GENERATION LOSS", value: "0.6%", tone: "cyan" },
      { label: "BATTERY SOC", value: "94%", tone: "healthy" },
      { label: "BUS POWER", value: "NOMINAL", tone: "healthy" },
    ],
  },
  {
    id: "COM-042-009", title: "Telemetry packet retransmission burst", system: "COMMUNICATIONS", severity: "LOW", state: "CLOSED",
    opened: "14:14:27", owner: "AUTO", stage: 6, trigger: "PACKET_RETRANSMIT · 12 packets / 4 s",
    summary: "Atmospheric fade at SVB-03; link recovered automatically. No operator action required.",
    logIds: ["EVT-20857"],
    impact: "No data loss; all retransmitted packets were recovered within 4 s.",
    metrics: [
      { label: "RETRANSMITS", value: "12", tone: "cyan" },
      { label: "WINDOW", value: "4 s", tone: "cyan" },
      { label: "LINK MARGIN", value: "6.4 dB", tone: "healthy" },
      { label: "DATA LOSS", value: "0", tone: "healthy" },
    ],
  },
];

const sevBox: Record<Sev, string> = {
  HIGH: "border-critical/35 bg-critical/10 text-critical",
  MEDIUM: "border-warning/30 bg-warning/10 text-warning",
  LOW: "border-signal-cyan/30 bg-signal-cyan/10 text-signal-cyan",
};
const stateText: Record<State, string> = {
  ACTIVE: "text-critical", ACKNOWLEDGED: "text-warning", MONITORING: "text-signal-cyan", CLOSED: "text-healthy",
};
const FILTERS = ["OPEN", "ALL", "CLOSED"] as const;
const toneText = { warning: "text-warning", cyan: "text-signal-cyan", healthy: "text-healthy", critical: "text-critical" } as const;
const OWNERS = ["DEMO-01", "THERMAL-LEAD", "FLIGHT-DIR"];

function AnomaliesPage() {
  const [items, setItems] = useState(initial);
  const [filter, setFilter] = useState<(typeof FILTERS)[number]>("OPEN");
  const [q, setQ] = useState("");
  const [selId, setSelId] = useState(initial[0]!.id);
  const [audit, setAudit] = useState<Array<{ t: string; text: string }>>([
    { t: "14:32:04", text: "THM-042-031 opened automatically by NEXUS" },
  ]);

  const visible = useMemo(
    () => items.filter((a) => {
      if (filter !== "ALL" && (filter === "CLOSED" ? a.state !== "CLOSED" : a.state === "CLOSED")) return false;
      const n = q.trim().toLowerCase();
      return !n || [a.id, a.title, a.system, a.owner ?? ""].join(" ").toLowerCase().includes(n);
    }),
    [items, filter, q],
  );
  const sel = items.find((a) => a.id === selId) ?? items[0]!;
  const logs = missionLogs.filter((l) => sel.logIds.includes(l.id));

  const update = (patch: Partial<Anomaly>, text: string) => {
    setItems((prev) => prev.map((a) => (a.id === sel.id ? { ...a, ...patch } : a)));
    const t = new Intl.DateTimeFormat("en-GB", { timeZone: "UTC", hour: "2-digit", minute: "2-digit", second: "2-digit", hour12: false }).format(new Date());
    setAudit((p) => [{ t, text: `${sel.id} · ${text}` }, ...p]);
  };

  const count = (s: State) => items.filter((a) => a.state === s).length;

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
              <div className="mt-1 flex items-center gap-1.5 text-[9px] text-healthy"><Radio className="size-3" /> CONNECTED</div>
            </div>
          </div>
          <div className="flex items-center gap-2 font-mono text-[10px] text-muted-foreground"><Clock3 className="size-3.5" /> 14:35:10 UTC</div>
        </div>
      </header>

      <main className="mx-auto max-w-[1600px] px-4 pb-16 pt-5 sm:px-7 xl:px-10">
        <Link to="/" className="mb-5 inline-flex items-center gap-1.5 font-mono text-[10px] tracking-[0.12em] text-muted-foreground transition-colors hover:text-foreground">
          <ArrowLeft className="size-3.5" /> BACK TO MISSION OVERVIEW
        </Link>

        <section className="mb-5 flex flex-col justify-between gap-4 lg:flex-row lg:items-end">
          <div>
            <div className="mb-2 flex items-center gap-2 font-mono text-[9px] tracking-[0.13em] text-warning">
              <span className="size-1.5 rounded-full bg-warning" /> ANOMALY REGISTER <span className="text-quiet">•</span> FLIGHT DAY 184
            </div>
            <h1 className="font-mono text-[23px] font-semibold tracking-[0.035em] sm:text-[27px]">ACTIVE ANOMALIES</h1>
            <p className="mt-1 text-[12px] text-muted-foreground">Triage, ownership and workflow status for every spacecraft anomaly this pass.</p>
          </div>
          <div className="grid grid-cols-4 border border-border bg-panel font-mono">
            {([["ACTIVE", "text-critical"], ["ACKNOWLEDGED", "text-warning"], ["MONITORING", "text-signal-cyan"], ["CLOSED", "text-healthy"]] as const).map(([k, c]) => (
              <div key={k} className="border-r border-border px-4 py-2 last:border-r-0">
                <div className="text-[8px] tracking-[0.14em] text-quiet">{k}</div>
                <div className={`mt-0.5 text-[16px] tabular-nums ${c}`}>{String(count(k)).padStart(2, "0")}</div>
              </div>
            ))}
          </div>
        </section>

        <FocusStrip a={sel} />

        <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_400px] xl:items-start">
          <div className="space-y-5">
          {/* Register */}
          <section className="border border-border bg-panel">
            <div className="flex items-center justify-between border-b border-border px-4 py-3">
              <h2 className="font-mono text-[11px] tracking-[0.13em]">REGISTER <span className="text-quiet">· {visible.length}/{items.length}</span></h2>
              <div className="flex items-center gap-2">
              <label className="flex h-7 w-48 items-center gap-2 border border-border bg-background px-2 focus-within:border-primary/50">
                <Search className="size-3 text-quiet" />
                <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Filter ID, system, owner…" className="w-full bg-transparent font-mono text-[10px] outline-none placeholder:text-quiet" />
              </label>
              <div className="flex border border-border">
                {FILTERS.map((f) => (
                  <button key={f} type="button" onClick={() => setFilter(f)}
                    className={`px-3 py-1.5 font-mono text-[9px] tracking-[0.12em] transition-colors ${filter === f ? "bg-primary/10 text-primary" : "text-muted-foreground hover:text-foreground"}`}>
                    {f}
                  </button>
                ))}
              </div>
              </div>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full min-w-[720px] text-left">
                <thead className="border-b border-border font-mono text-[8px] tracking-[0.14em] text-quiet">
                  <tr>{["ID", "ANOMALY", "SYSTEM", "SEV", "OPENED", "OWNER", "STAGE", "STATE"].map((h) => <th key={h} className="px-4 py-2 font-medium">{h}</th>)}</tr>
                </thead>
                <tbody>
                  {visible.map((a) => (
                    <tr key={a.id} onClick={() => setSelId(a.id)}
                      className={`cursor-pointer border-b border-border text-[11px] transition-colors last:border-b-0 hover:bg-background/60 ${a.id === sel.id ? "bg-primary/5 shadow-[inset_2px_0_0_var(--color-primary)]" : ""}`}>
                      <td className="px-4 py-3 font-mono text-[10px] text-signal-cyan">{a.id}</td>
                      <td className="px-4 py-3">{a.title}</td>
                      <td className="px-4 py-3 font-mono text-[10px] text-muted-foreground">{a.system}</td>
                      <td className="px-4 py-3"><span className={`border px-1.5 py-0.5 font-mono text-[8px] ${sevBox[a.severity]}`}>{a.severity}</span></td>
                      <td className="px-4 py-3 font-mono text-[10px] tabular-nums text-muted-foreground">{a.opened}</td>
                      <td className="px-4 py-3 font-mono text-[10px]">{a.owner ?? <span className="text-warning">UNASSIGNED</span>}</td>
                      <td className="px-4 py-3">
                        <div className="flex gap-0.5">{STAGES.map((s, i) => <span key={s} className={`h-1.5 w-3 ${i <= a.stage ? "bg-primary" : "bg-border"}`} />)}</div>
                      </td>
                      <td className={`px-4 py-3 font-mono text-[9px] tracking-[0.1em] ${stateText[a.state]}`}>{a.state}</td>
                    </tr>
                  ))}
                  {visible.length === 0 && (
                    <tr><td colSpan={8} className="px-4 py-12 text-center">
                      <SearchX className="mx-auto mb-2 size-5 text-quiet" />
                      <div className="font-mono text-[10px] tracking-[0.12em] text-muted-foreground">NO ANOMALIES MATCH THIS VIEW</div>
                      <button type="button" onClick={() => { setQ(""); setFilter("ALL"); }} className="mt-2 font-mono text-[9px] text-signal-cyan hover:underline">SHOW ALL ANOMALIES</button>
                    </td></tr>
                  )}
                </tbody>
              </table>
            </div>
          </section>

          <section className="border border-border bg-panel">
            <div className="px-4 py-3">
              <div className="mb-2 font-mono text-[8px] tracking-[0.14em] text-quiet">TRIAGE AUDIT TRAIL</div>
              <ul className="max-h-64 space-y-1 overflow-y-auto">
                {audit.map((e, i) => (
                  <li key={i} className="grid grid-cols-[58px_1fr] gap-2 text-[10px]">
                    <span className="font-mono tabular-nums text-quiet">{e.t}</span>
                    <span className="text-muted-foreground">{e.text}</span>
                  </li>
                ))}
              </ul>
            </div>
          </section>
          </div>

          {/* Triage panel */}
          <aside className="border border-border bg-panel">
            <div className="border-b border-border px-4 py-3">
              <div className="flex items-center justify-between">
                <span className="font-mono text-[10px] text-signal-cyan">{sel.id}</span>
                <span className={`font-mono text-[9px] tracking-[0.1em] ${stateText[sel.state]}`}>{sel.state}</span>
              </div>
              <h2 className="mt-1 text-[15px] font-semibold">{sel.title}</h2>
              <p className="mt-1 text-[11px] leading-relaxed text-muted-foreground">{sel.summary}</p>
              <div className="mt-2 font-mono text-[9px] text-quiet">TRIGGER · {sel.trigger}</div>
            </div>

            <div className="border-b border-border px-4 py-3">
              <div className="mb-2 font-mono text-[8px] tracking-[0.14em] text-quiet">WORKFLOW STAGE</div>
              <ol className="space-y-1">
                {STAGES.map((s, i) => (
                  <li key={s} className="flex items-center gap-2 font-mono text-[9px] tracking-[0.1em]">
                    <span className={`flex size-3.5 items-center justify-center border ${i < sel.stage ? "border-healthy/40 text-healthy" : i === sel.stage ? "border-primary text-primary" : "border-border text-quiet"}`}>
                      {i < sel.stage && <Check className="size-2.5" />}
                    </span>
                    <span className={i <= sel.stage ? "text-foreground" : "text-quiet"}>{s}</span>
                    {i === sel.stage && sel.state !== "CLOSED" && <span className="text-primary">← CURRENT</span>}
                  </li>
                ))}
              </ol>
            </div>

            <div className="grid grid-cols-2 gap-px border-b border-border bg-border">
              <label className="flex flex-col gap-1 bg-panel px-4 py-2.5">
                <span className="font-mono text-[8px] tracking-[0.14em] text-quiet">OWNER</span>
                <span className="flex items-center gap-1.5">
                  <UserRound className="size-3 text-quiet" />
                  <select value={sel.owner ?? ""} disabled={sel.state === "CLOSED"}
                    onChange={(e) => update({ owner: e.target.value }, `assigned to ${e.target.value}`)}
                    className="bg-transparent font-mono text-[10px] outline-none [&>option]:bg-panel">
                    <option value="" disabled>UNASSIGNED</option>
                    {(sel.owner && !OWNERS.includes(sel.owner) ? [sel.owner, ...OWNERS] : OWNERS).map((o) => <option key={o}>{o}</option>)}
                  </select>
                </span>
              </label>
              <label className="flex flex-col gap-1 bg-panel px-4 py-2.5">
                <span className="font-mono text-[8px] tracking-[0.14em] text-quiet">SEVERITY</span>
                <select value={sel.severity} disabled={sel.state === "CLOSED"}
                  onChange={(e) => update({ severity: e.target.value as Sev }, `severity set to ${e.target.value}`)}
                  className="bg-transparent font-mono text-[10px] outline-none [&>option]:bg-panel">
                  {(["HIGH", "MEDIUM", "LOW"] as Sev[]).map((s) => <option key={s}>{s}</option>)}
                </select>
              </label>
            </div>

            <div className="flex flex-wrap gap-2 border-b border-border px-4 py-3">
              {sel.state === "ACTIVE" && (
                <Button size="sm" variant="outline" className="rounded-none font-mono text-[9px] tracking-[0.1em]"
                  onClick={() => update({ state: "ACKNOWLEDGED", owner: sel.owner ?? "DEMO-01" }, "acknowledged by DEMO-01")}>
                  ACKNOWLEDGE
                </Button>
              )}
              {sel.state === "ACKNOWLEDGED" && (
                <Button size="sm" variant="outline" className="rounded-none font-mono text-[9px] tracking-[0.1em]"
                  onClick={() => update({ state: "MONITORING" }, "moved to monitoring")}>SET MONITORING</Button>
              )}
              {sel.state === "MONITORING" && (
                <Button size="sm" variant="outline" className="rounded-none font-mono text-[9px] tracking-[0.1em]"
                  onClick={() => update({ state: "CLOSED" }, "closed")}>CLOSE ANOMALY</Button>
              )}
              {sel.state === "CLOSED" && (
                <Button size="sm" variant="outline" className="rounded-none font-mono text-[9px] tracking-[0.1em]"
                  onClick={() => update({ state: "ACKNOWLEDGED" }, "reopened")}>REOPEN</Button>
              )}
              {sel.investigable && (
                <Button asChild size="sm" className="rounded-none font-mono text-[9px] tracking-[0.1em]">
                  <Link to="/investigation">OPEN INVESTIGATION <ArrowRight className="size-3" /></Link>
                </Button>
              )}
            </div>

            <div className="border-b border-border px-4 py-3">
              <div className="mb-2 flex items-center justify-between">
                <span className="font-mono text-[8px] tracking-[0.14em] text-quiet">LINKED EVENTS · {logs.length}</span>
                <Link to="/logs" className="inline-flex items-center gap-1 font-mono text-[9px] text-signal-cyan hover:underline">
                  <ListTree className="size-3" /> MISSION LOGS
                </Link>
              </div>
              <ul className="space-y-1.5">
                {logs.map((l) => (
                  <li key={l.id}>
                    <Link to={l.evidence ? "/investigation" : "/logs"} search={(l.evidence ? { source: l.evidence.key } : {}) as never}
                      title={l.evidence ? `Open evidence: ${l.evidence.label}` : "Open in Mission Logs"}
                      className="group grid grid-cols-[58px_1fr_auto] items-center gap-2 px-1 py-1 text-[10px] transition-colors hover:bg-background/60">
                      <span className="font-mono tabular-nums text-muted-foreground">{l.time}</span>
                      <span className="truncate"><span className={`font-mono ${l.severity === "HIGH" ? "text-critical" : l.severity === "WARNING" ? "text-warning" : "text-signal-cyan"}`}>{l.event}</span> <span className="text-muted-foreground">· {l.source}</span></span>
                      <ArrowRight className="size-3 text-quiet opacity-0 transition-opacity group-hover:opacity-100" />
                    </Link>
                  </li>
                ))}
              </ul>
            </div>

            {sel.investigable && (
              <div className="grid grid-cols-2 gap-px border-b border-border bg-border">
                <Link to="/investigation" search={{ source: "incident" }} className="group bg-panel px-4 py-2.5 transition-colors hover:bg-background/60">
                  <div className="flex items-center gap-1.5 font-mono text-[8px] tracking-[0.14em] text-quiet"><History className="size-3" /> SIMILAR INCIDENT</div>
                  <div className="mt-1 font-mono text-[11px] text-signal-cyan">INC-182 · 91%</div>
                  <div className="text-[9px] text-muted-foreground">12 AUG 2026 · RESOLVED</div>
                </Link>
                <Link to="/investigation" search={{ source: "procedure" }} className="group bg-panel px-4 py-2.5 transition-colors hover:bg-background/60">
                  <div className="flex items-center gap-1.5 font-mono text-[8px] tracking-[0.14em] text-quiet"><BookOpen className="size-3" /> PROCEDURE</div>
                  <div className="mt-1 font-mono text-[11px] text-signal-cyan">CP-04</div>
                  <div className="text-[9px] text-muted-foreground">Cooling System Troubleshooting</div>
                </Link>
              </div>
            )}

          </aside>
        </div>
      </main>
    </div>
  );
}

function FocusStrip({ a }: { a: Anomaly }) {
  const border = a.state === "CLOSED" ? "border-border" : a.severity === "HIGH" ? "border-warning/40" : "border-border";
  return (
    <section aria-label="Selected anomaly" className={`mb-5 grid border bg-panel lg:grid-cols-[minmax(0,1.1fr)_minmax(0,1.4fr)_260px] ${border}`}>
      <div className="border-b border-border p-4 lg:border-b-0 lg:border-r">
        <div className="flex items-center gap-2 font-mono text-[9px] tracking-[0.12em]">
          <span className={`border px-1.5 py-0.5 ${sevBox[a.severity]}`}>{a.severity}</span>
          <span className="text-signal-cyan">{a.id}</span>
          <span className="text-quiet">·</span>
          <span className={stateText[a.state]}>{a.state}</span>
        </div>
        <h2 className="mt-2 text-[19px] font-semibold leading-tight">{a.title}</h2>
        <div className="mt-1 font-mono text-[10px] text-muted-foreground">{a.system} SYSTEM · OPENED {a.opened} UTC · OWNER {a.owner ?? "UNASSIGNED"}</div>
        <p className="mt-3 border-l-2 border-warning/50 pl-2.5 text-[11px] leading-relaxed text-muted-foreground"><span className="font-mono text-[9px] tracking-[0.12em] text-warning">MISSION IMPACT · </span>{a.impact}</p>
      </div>
      <div className="grid grid-cols-2 border-b border-border lg:border-b-0 lg:border-r">
        {a.metrics.map((m, i) => (
          <div key={m.label} className={`p-4 ${i % 2 === 0 ? "border-r border-border" : ""} ${i < 2 ? "border-b border-border" : ""}`}>
            <div className="font-mono text-[8px] tracking-[0.14em] text-quiet">{m.label}</div>
            <div className={`mt-1 font-mono text-[22px] font-semibold tabular-nums leading-none ${toneText[m.tone]}`}>{m.value}</div>
            {m.from && <div className="mt-1 font-mono text-[9px] text-muted-foreground">FROM {m.from}</div>}
          </div>
        ))}
      </div>
      <div className="flex flex-col p-4">
        {a.investigable ? (
          <>
            <div className="flex items-center justify-between font-mono text-[8px] tracking-[0.14em] text-quiet"><span>TEMP °C · 14:25–14:35</span><span className="text-critical">LIMIT 80</span></div>
            <div className="mt-2 h-[86px] flex-1">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={[...missionSnapshot.telemetry]} margin={{ top: 4, right: 0, left: 0, bottom: 0 }}>
                  <YAxis hide domain={[65, 95]} />
                  <Area type="monotone" dataKey="temperature" stroke="var(--color-warning)" fill="var(--color-warning)" fillOpacity={0.12} strokeWidth={1.5} isAnimationActive={false} />
                </AreaChart>
              </ResponsiveContainer>
            </div>
            <Button asChild size="sm" className="mt-3 rounded-none font-mono text-[9px] tracking-[0.1em]">
              <Link to="/investigation"><FileSearch className="size-3" /> INVESTIGATE ROOT CAUSE</Link>
            </Button>
          </>
        ) : (
          <>
            <div className="font-mono text-[8px] tracking-[0.14em] text-quiet">NEXT ACTION</div>
            <p className="mt-2 flex-1 text-[11px] leading-relaxed text-muted-foreground">
              {a.state === "CLOSED" ? "Closed. Review the source event in Mission Logs if needed." : "Under watch. Review the source event and close once stable."}
            </p>
            <Button asChild size="sm" variant="outline" className="mt-3 rounded-none font-mono text-[9px] tracking-[0.1em]">
              <Link to="/logs"><ListTree className="size-3" /> VIEW SOURCE EVENT</Link>
            </Button>
          </>
        )}
      </div>
    </section>
  );
}
