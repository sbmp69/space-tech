import { useEffect, useMemo, useState } from "react";
import { Link, createFileRoute } from "@tanstack/react-router";
import { ArrowLeft, ArrowRight, Clock3, Command, Crosshair, Radio, Search, SearchX, X, ClipboardList, FileSearch, ShieldAlert } from "lucide-react";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { missionLogs, type LogEntry } from "@/lib/mission-logs";
import {
  CartesianGrid,
  Line,
  LineChart,
  ReferenceArea,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { Button } from "@/components/ui/button";
import { missionSnapshot } from "@/lib/mission-liveData";

export const Route = createFileRoute("/telemetry")({
  head: () => ({
    meta: [
      { title: "Telemetry | NEXUS Mission Operations" },
      { name: "description", content: "Channel-level telemetry for ORBIT-42 with limit checks, event markers and cross-channel correlation." },
      { property: "og:title", content: "Telemetry | NEXUS Mission Operations" },
      { property: "og:description", content: "Inspect ORBIT-42 sensor channels against flight limits and trace the cooling fan failure." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: TelemetryPage,
});

type State = "healthy" | "warning" | "critical";
type Key = "temperature" | "fanRpm" | "voltage";
type Channel = {
  id: string;
  key: Key;
  name: string;
  system: string;
  sensor: string;
  unit: string;
  limits: { low: number; high: number };
  domain: [number, number];
  color: string;
  role: string;
  fmt: (v: number) => string;
};

const channels: Channel[] = [
  {
    id: "THM-04A", key: "temperature", name: "Thermal plate temperature", system: "THERMAL", sensor: "RTD probe · avionics bay",
    unit: "°C", limits: { low: 60, high: 80 }, domain: [65, 95], color: "var(--color-warning)",
    role: "Primary symptom. Exceeded the 80°C limit at 14:32:04 and settled at 89.2°C.", fmt: (v) => v.toFixed(1),
  },
  {
    id: "THM-07F", key: "fanRpm", name: "Cooling fan speed", system: "THERMAL", sensor: "Hall tachometer · fan 2",
    unit: "RPM", limits: { low: 2500, high: 5000 }, domain: [0, 5000], color: "var(--color-signal-cyan)",
    role: "Leading indicator. Fell below the 2,500 RPM threshold (4,200 → 1,800 RPM) at 14:31:12, 52 s before the thermal breach.", fmt: (v) => v.toLocaleString(),
  },
  {
    id: "PWR-BUS-B", key: "voltage", name: "Cooling loop B supply voltage", system: "POWER", sensor: "Bus monitor · fan assembly B",
    unit: "V", limits: { low: 11.9, high: 12.3 }, domain: [11.4, 12.4], color: "var(--color-healthy)",
    role: "Contributing channel. Sagged 12.1 → 11.8 V, below the 11.9–12.3 V nominal band but within operating margin — consistent with the reduced fan speed.", fmt: (v) => v.toFixed(2),
  },
];


const events = missionSnapshot.events.filter((e) => e.level !== "INFO");
const causalEvents = missionSnapshot.events.filter((e) =>
  ["FAN_SPEED_LOW", "TEMP_THRESHOLD_EXCEEDED", "THERMAL_WARNING"].includes(e.code),
);
// Correlated anomaly records reused from Mission Logs (thermal + power evidence inside the window)
const records = missionLogs.filter((l) => l.anomaly && (l.system === "THERMAL" || l.system === "POWER") && l.evidence && ["telemetry", "power", "log"].includes(l.evidence.key));
const sampleIndex = (time: string) => Math.max(0, liveData.findIndex((d) => d.time === time.slice(0, 5)));
const recBox: Record<string, string> = {
  HIGH: "border-critical/35 bg-critical/10 text-critical",
  WARNING: "border-warning/35 bg-warning/10 text-warning",
  INFO: "border-signal-cyan/30 bg-signal-cyan/10 text-signal-cyan",
};
const statusTone: Record<string, string> = { ACTIVE: "text-critical", OPEN: "text-warning", ACKNOWLEDGED: "text-signal-cyan", RESOLVED: "text-healthy", NORMAL: "text-healthy" };
type Filter = "ALL" | State;

function stateOf(c: Channel, v: number): State {
  if (v > c.limits.high || v < c.limits.low) return c.key === "temperature" ? "critical" : "warning";
  const span = c.limits.high - c.limits.low;
  if (v > c.limits.high - span * 0.1 || v < c.limits.low + span * 0.1) return "warning";
  return "healthy";
}
const stateText: Record<State, string> = { healthy: "text-healthy", warning: "text-warning", critical: "text-critical" };
const stateLabel: Record<State, string> = { healthy: "NOMINAL", warning: "CAUTION", critical: "OUT OF LIMIT" };

function TelemetryPage() {
  const [liveData, setLiveData] = useState(missionSnapshot.telemetry);

  useEffect(() => {
    const ws = new WebSocket(`${import.meta.env.VITE_WS_URL || 'ws://localhost:8000'}/ws/telemetry`);
    ws.onmessage = (event) => {
      const msg = JSON.parse(event.data);
      setLiveData(prev => {
        const newData = [...prev, {
          time: `14:32:${String(msg.tick).padStart(2, '0')}`,
          temperature: msg.core_temp,
          fanRpm: msg.life_support * 40,
          voltage: msg.voltage
        }];
        // Keep last 30 points
        if (newData.length > 30) return newData.slice(newData.length - 30);
        return newData;
      });
      // Move cursor to end
      setCursor(prev => liveData.length - 1);
    };
    return () => ws.close();
  }, [liveData.length]);

  const [clock, setClock] = useState("--:--:-- UTC");
  const [selectedId, setSelectedId] = useState("THM-04A");
  const [compare, setCompare] = useState<Record<string, boolean>>({ "THM-07F": true });
  const [cursor, setCursor] = useState(liveData.length - 1);
  const [q, setQ] = useState("");
  const [sort, setSort] = useState<"severity" | "id">("severity");
  const [filter, setFilter] = useState<Filter>("ALL");
  const [record, setRecord] = useState<LogEntry | null>(null);

  const sample = liveData[cursor] ?? liveData[liveData.length - 1]!;
  const baseline = liveData[0]!;
  const selected = channels.find((c) => c.id === selectedId) ?? channels[0]!;

  useEffect(() => {
    const updateClock = () => {
      setClock(`${new Intl.DateTimeFormat("en-GB", {
        timeZone: "UTC",
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit",
        hour12: false,
      }).format(new Date())} UTC`);
    };
    updateClock();
    const timer = window.setInterval(updateClock, 1000);
    return () => window.clearInterval(timer);
  }, []);

  const rows = useMemo(() => {
    const rank: Record<State, number> = { critical: 0, warning: 1, healthy: 2 };
    const n = q.trim().toLowerCase();
    return channels
      .filter((c) => filter === "ALL" || stateOf(c, sample[c.key]) === filter)
      .filter((c) => !n || [c.id, c.name, c.system, c.sensor].join(" ").toLowerCase().includes(n))
      .sort((a, b) =>
        sort === "id" ? a.id.localeCompare(b.id) : rank[stateOf(a, sample[a.key])] - rank[stateOf(b, sample[b.key])],
      );
  }, [q, sort, sample, filter]);
  const countOf = (f: Filter) => channels.filter((c) => f === "ALL" || stateOf(c, sample[c.key]) === f).length;

  const overlays = channels.filter((c) => c.id !== selectedId && compare[c.id]);
  const firstBreach = liveData.find((d) => stateOf(selected, d[selected.key]) !== "healthy");

  return (
    <div className="min-h-screen bg-background text-foreground">
      <header className="sticky top-0 z-30 border-b border-border bg-background/95 backdrop-blur">
        <div className="flex min-h-[60px] items-center justify-between gap-4 px-4 sm:px-7 xl:px-10">
          <div className="flex items-center gap-3">
            <div className="flex size-9 items-center justify-center border border-primary/35 bg-primary/10 text-primary">
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
          <div className="flex items-center gap-2 font-mono text-[10px] tabular-nums text-muted-foreground"><Clock3 className="size-3.5" /> {clock}</div>
        </div>
      </header>

      <main className="mx-auto max-w-[1600px] px-4 pb-16 pt-5 sm:px-7 xl:px-10">
        <Link to="/" className="mb-5 inline-flex items-center gap-1.5 font-mono text-[10px] tracking-[0.12em] text-muted-foreground hover:text-foreground">
          <ArrowLeft className="size-3.5" /> BACK TO MISSION OVERVIEW
        </Link>

        <section className="mb-5 flex flex-col justify-between gap-4 lg:flex-row lg:items-end">
          <div>
            <div className="mb-2 flex items-center gap-2 font-mono text-[9px] tracking-[0.13em] text-signal-cyan">
              <span className="size-1.5 rounded-full bg-signal-cyan" /> SENSOR CHANNELS <span className="text-quiet">•</span> 60 SEC SAMPLE
            </div>
            <h1 className="font-mono text-[23px] font-semibold tracking-[0.035em] sm:text-[27px]">TELEMETRY</h1>
            <p className="mt-1 max-w-2xl text-[12px] text-muted-foreground">
              Raw evidence behind the thermal anomaly. Scrub the timeline to see which channel left its limits first.
            </p>
          </div>
          <div className="border border-warning/35 bg-panel px-4 py-2.5 font-mono text-[10px]">
            <div className="text-[8px] tracking-[0.14em] text-quiet">CAUSAL ORDER DETECTED</div>
            <ol className="mt-1 flex flex-wrap items-center gap-1.5" aria-label="Anomaly event order">
              {causalEvents.map((event, index) => (
                <li key={event.code} className="flex items-center gap-1.5">
                  <button
                    type="button"
                    onClick={() => setCursor(sampleIndex(event.time))}
                    aria-label={`Jump to ${event.title} at ${event.time} UTC`}
                    className={`min-h-7 text-left transition-colors hover:underline focus-visible:outline focus-visible:outline-2 focus-visible:outline-ring ${index === 0 ? "text-signal-cyan" : "text-critical"}`}
                  >
                    {event.code} <span className="tabular-nums">{event.time}</span>
                  </button>
                  {index < causalEvents.length - 1 && <ArrowRight aria-hidden="true" className="size-3 text-quiet" />}
                </li>
              ))}
            </ol>
          </div>
        </section>

        {/* Current mission state */}
        <section aria-label="Current thermal state" className="mb-5 grid grid-cols-2 border border-border bg-panel font-mono md:grid-cols-5">
          <div className="col-span-2 flex items-center gap-3 border-b border-l-2 border-border border-l-critical px-4 py-3 md:col-span-1 md:border-b-0 md:border-r">
            <ShieldAlert className="size-4 text-critical" />
            <div><div className="text-[8px] tracking-[0.14em] text-quiet">ANOMALY THM-042-031</div><div className="mt-0.5 text-[12px] text-critical">HIGH · ACTIVE</div></div>
          </div>
          {[
            ["TEMPERATURE", `${sample.temperature.toFixed(1)} °C`, `LIMIT ${channels[0]?.limits.low}–${channels[0]?.limits.high} °C`, "text-critical"],
            ["COOLING FAN", `${sample.fanRpm.toLocaleString()} RPM`, `WAS ${baseline.fanRpm.toLocaleString()} RPM`, "text-warning"],
            ["BUS VOLTAGE", `${sample.voltage.toFixed(1)} V`, `WAS ${baseline.voltage.toFixed(1)} V`, "text-warning"],
            ["ONSET LAG", "+52 s", "FAN → TEMP BREACH", "text-signal-cyan"],
          ].map(([k, v, n, c]) => (
            <div key={k} className="border-r border-border px-4 py-3 last:border-r-0 [&:nth-child(3)]:border-r-0 md:[&:nth-child(3)]:border-r">
              <div className="text-[8px] tracking-[0.14em] text-quiet">{k}</div>
              <div className={`mt-0.5 text-[15px] tabular-nums ${c}`}>{v}</div>
              <div className="text-[8px] tracking-[0.1em] text-muted-foreground">{n}</div>
            </div>
          ))}
        </section>

        {/* Channel table */}
        <section className="border border-border bg-panel">
          <div className="flex flex-wrap items-center gap-2 border-b border-border p-3">
            <label className="flex h-8 min-w-[220px] flex-1 items-center gap-2 border border-border bg-background px-2.5 focus-within:border-primary/50">
              <Search className="size-3.5 text-quiet" />
              <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search channel ID, system or sensor…" className="w-full bg-transparent font-mono text-[11px] outline-none placeholder:text-quiet" />
              {q && <button type="button" onClick={() => setQ("")} aria-label="Clear channel search" title="Clear search" className="rounded-sm p-1 text-quiet hover:text-foreground focus-visible:outline focus-visible:outline-2 focus-visible:outline-ring"><X className="size-3.5" /></button>}
            </label>
            <div className="flex border border-border font-mono text-[9px] tracking-[0.12em]">
              {(["severity", "id"] as const).map((s) => (
                <button key={s} type="button" aria-pressed={sort === s} onClick={() => setSort(s)} className={`px-3 py-2 ${sort === s ? "bg-primary/10 text-primary" : "text-muted-foreground hover:text-foreground"}`}>
                  SORT: {s === "severity" ? "LIMIT STATUS" : "CHANNEL ID"}
                </button>
              ))}
            </div>
            <div className="flex border border-border font-mono text-[9px] tracking-[0.12em]">
              {(["ALL", "critical", "warning", "healthy"] as const).map((f) => (
                <button key={f} type="button" aria-pressed={filter === f} onClick={() => setFilter(f)} className={`px-2.5 py-2 ${filter === f ? "bg-primary/10 text-primary" : f === "ALL" ? "text-muted-foreground hover:text-foreground" : `${stateText[f]} opacity-70 hover:opacity-100`}`}>
                  {f === "ALL" ? "ALL" : stateLabel[f]} {countOf(f)}
                </button>
              ))}
            </div>
            <div className="font-mono text-[9px] tracking-[0.12em] text-muted-foreground">VALUES AT <span className="text-foreground">{sample.time}</span> UTC</div>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[820px] font-mono text-[11px]">
              <thead>
                <tr className="border-b border-border text-left text-[8px] tracking-[0.14em] text-quiet">
                  <th className="px-4 py-2 font-normal">CHANNEL</th>
                  <th className="px-4 py-2 font-normal">DESCRIPTION</th>
                  <th className="px-4 py-2 font-normal">LIMITS</th>
                  <th className="px-4 py-2 text-right font-normal">BASELINE 14:25</th>
                  <th className="px-4 py-2 text-right font-normal">VALUE</th>
                  <th className="px-4 py-2 text-right font-normal">Δ</th>
                  <th className="px-4 py-2 font-normal">STATUS</th>
                  <th className="px-4 py-2 font-normal">OVERLAY</th>
                </tr>
              </thead>
              <tbody>
                {rows.length === 0 && (
                  <tr><td colSpan={8} className="px-4 py-10 text-center">
                    <SearchX className="mx-auto mb-2 size-5 text-quiet" />
                    <div className="font-mono text-[11px] tracking-[0.14em]">NO CHANNELS MATCH</div>
                    <div className="mt-1 text-[11px] text-muted-foreground">{filter !== "ALL" ? `No ${stateLabel[filter].toLowerCase()} channels at ${sample.time} UTC.` : "Try a channel ID such as THM-04A or a system name."}</div>
                    <button type="button" onClick={() => { setQ(""); setFilter("ALL"); }} className="mt-3 font-mono text-[9px] tracking-[0.12em] text-primary hover:underline">RESET FILTERS</button>
                  </td></tr>
                )}
                {rows.map((c) => {
                  const v = sample[c.key];
                  const st = stateOf(c, v);
                  const delta = v - baseline[c.key];
                  const active = c.id === selectedId;
                  return (
                    <tr key={c.id} onClick={() => setSelectedId(c.id)} className={`cursor-pointer border-b border-border last:border-b-0 transition-colors ${active ? "bg-primary/10" : "hover:bg-panel-raised"}`}>
                      <td className="px-4 py-2.5"><span className={`mr-2 inline-block h-3 w-0.5 align-middle ${active ? "bg-primary" : "bg-transparent"}`} /><button type="button" aria-pressed={active} onClick={(e) => { e.stopPropagation(); setSelectedId(c.id); }} className="rounded-sm text-left hover:text-primary focus-visible:outline focus-visible:outline-2 focus-visible:outline-ring">{c.id}</button></td>
                      <td className="px-4 py-2.5 font-sans"><div>{c.name}</div><div className="text-[10px] text-quiet">{c.system} · {c.sensor}</div></td>
                      <td className="px-4 py-2.5 text-muted-foreground">{c.fmt(c.limits.low)}–{c.fmt(c.limits.high)} {c.unit}</td>
                      <td className="px-4 py-2.5 text-right tabular-nums text-muted-foreground">{c.fmt(baseline[c.key])}</td>
                      <td className={`px-4 py-2.5 text-right tabular-nums ${stateText[st]}`}>{c.fmt(v)} <span className="text-[9px]">{c.unit}</span></td>
                      <td className="px-4 py-2.5 text-right tabular-nums text-muted-foreground">{delta > 0 ? "+" : ""}{c.fmt(delta)}</td>
                      <td className={`px-4 py-2.5 text-[9px] tracking-[0.12em] ${stateText[st]}`}>● {stateLabel[st]}</td>
                      <td className="px-4 py-2.5">
                        <input
                          type="checkbox"
                          aria-label={`Overlay ${c.id}`}
                          disabled={active}
                          checked={active || !!compare[c.id]}
                          onClick={(e) => e.stopPropagation()}
                          onChange={(e) => setCompare((p) => ({ ...p, [c.id]: e.target.checked }))}
                          className="accent-primary"
                        />
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </section>

        <div className="mt-5 grid gap-5 xl:grid-cols-[1fr_360px]">
          {/* Chart */}
          <section className="border border-border bg-panel">
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border px-4 py-3">
              <div>
                <div className="font-mono text-[8px] tracking-[0.12em] text-quiet">{selected.id} / {selected.sensor.toUpperCase()}</div>
                <h2 className="mt-0.5 font-mono text-[11px] font-medium tracking-[0.1em]">{selected.name.toUpperCase()} <span className="text-quiet">vs LIMITS</span></h2>
              </div>
              <div className="flex flex-wrap gap-3 font-mono text-[8px] tracking-[0.1em] text-muted-foreground">
                {[selected, ...overlays].map((c) => (
                  <span key={c.id} className="flex items-center gap-1.5"><span className="h-0.5 w-3" style={{ background: c.color }} />{c.id}</span>
                ))}
                <span className="flex items-center gap-1.5"><span className="h-0 w-3 border-t border-dashed border-critical" />LIMIT</span>
              </div>
            </div>
            <div className="h-[320px] px-2 pt-3">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart
                  data={[...liveData]}
                  margin={{ top: 10, right: 14, bottom: 2, left: 2 }}
                  onClick={(s) => { if (typeof s?.activeTooltipIndex === "number") setCursor(s.activeTooltipIndex); }}
                >
                  <CartesianGrid stroke="var(--color-gridline)" strokeDasharray="2 5" vertical={false} />
                  <XAxis dataKey="time" tick={{ fill: "var(--color-muted-foreground)", fontSize: 9, fontFamily: "var(--font-mono)" }} tickLine={false} axisLine={{ stroke: "var(--color-gridline)" }} dy={6} />
                  <YAxis yAxisId="main" domain={selected.domain} width={54} tick={{ fill: selected.color, fontSize: 8, fontFamily: "var(--font-mono)" }} tickLine={false} axisLine={false} />
                  {overlays.map((c) => <YAxis key={c.id} yAxisId={c.id} domain={c.domain} hide />)}
                  <ReferenceArea yAxisId="main" x1="14:31" x2="14:34" fill="var(--color-warning)" fillOpacity={0.06} />
                  <ReferenceLine yAxisId="main" y={selected.limits.high} stroke="var(--color-critical)" strokeDasharray="4 4" strokeOpacity={0.7} />
                  <ReferenceLine yAxisId="main" y={selected.limits.low} stroke="var(--color-critical)" strokeDasharray="4 4" strokeOpacity={0.7} />
                  <ReferenceLine yAxisId="main" x={sample.time} stroke="var(--color-primary)" strokeWidth={1} />
                  <Tooltip content={<Tip />} cursor={{ stroke: "var(--color-muted-foreground)", strokeDasharray: "3 4" }} />
                  <Line yAxisId="main" dataKey={selected.key} name={selected.id} stroke={selected.color} strokeWidth={2.2} dot={false} isAnimationActive={false} />
                  {overlays.map((c) => (
                    <Line key={c.id} yAxisId={c.id} dataKey={c.key} name={c.id} stroke={c.color} strokeWidth={1.4} strokeDasharray="4 3" dot={false} isAnimationActive={false} />
                  ))}
                </LineChart>
              </ResponsiveContainer>
            </div>
            <div className="border-t border-border px-4 py-3">
              <div className="mb-2 flex items-center justify-between font-mono text-[8px] tracking-[0.12em] text-quiet">
                <span className="flex items-center gap-1.5"><Crosshair className="size-3" /> SAMPLE CURSOR — click chart or drag</span>
                <span className="text-foreground">{sample.time} UTC</span>
              </div>
              <input type="range" min={0} max={liveData.length - 1} value={cursor} onChange={(e) => setCursor(Number(e.target.value))} aria-label="Sample cursor" aria-valuetext={`${sample.time} UTC`} className="telemetry-range w-full" />
              <div className="mt-2 flex flex-wrap gap-1.5">
                {events.map((e) => (
                    <button key={e.code} type="button" onClick={() => setCursor(sampleIndex(e.time))} aria-label={`Jump to ${e.title} at ${e.time} UTC`} className={`min-h-7 rounded-sm border px-2 py-1 font-mono text-[9px] tracking-[0.08em] transition-colors hover:bg-panel-raised focus-visible:outline focus-visible:outline-2 focus-visible:outline-ring ${e.state === "warning" ? "border-warning/35 text-warning" : "border-critical/35 text-critical"}`}>
                    {e.time} · {e.code}
                  </button>
                ))}
              </div>
            </div>
            <div className="border-t border-border">
              <div className="flex items-center justify-between px-4 py-2 font-mono text-[8px] tracking-[0.14em] text-quiet">
                <span>CORRELATED EVENT RECORDS · {records.length}</span><span>SOURCE: MISSION LOGS</span>
              </div>
              <ul>
                {records.map((l) => {
                  const atCursor = liveData[cursor]!.time === l.time.slice(0, 5);
                  return (
                    <li key={l.id}>
                      <button type="button" onClick={() => { setRecord(l); setCursor(sampleIndex(l.time)); }} className={`grid w-full grid-cols-[64px_78px_1fr_auto] items-center gap-3 border-t border-border px-4 py-2 text-left font-mono text-[10px] transition-colors hover:bg-panel-raised ${atCursor ? "bg-primary/5" : ""}`}>
                        <span className="tabular-nums text-muted-foreground">{l.time}</span>
                        <span className={`border px-1.5 py-0.5 text-center text-[8px] tracking-[0.1em] ${recBox[l.severity]}`}>{l.severity}</span>
                        <span className="truncate"><span className="text-foreground">{l.event}</span> <span className="text-quiet">· {l.source}</span></span>
                        <span className={`text-[8px] tracking-[0.12em] ${statusTone[l.status]}`}>{l.status} <ArrowRight className="ml-1 inline size-3 text-quiet" /></span>
                      </button>
                    </li>
                  );
                })}
              </ul>
            </div>
          </section>

          {/* Channel detail */}
          <aside className="border border-border bg-panel">
            <div className="border-b border-border px-4 py-3">
              <div className="font-mono text-[8px] tracking-[0.12em] text-quiet">CHANNEL ASSESSMENT</div>
              <div className="mt-1 font-mono text-[13px] font-semibold">{selected.id}</div>
              <div className="text-[11px] text-muted-foreground">{selected.name}</div>
            </div>
            <dl className="grid grid-cols-2 border-b border-border font-mono">
              <Stat k="AT CURSOR" v={`${selected.fmt(sample[selected.key])} ${selected.unit}`} cls={stateText[stateOf(selected, sample[selected.key])]} />
              <Stat k="BASELINE" v={`${selected.fmt(baseline[selected.key])} ${selected.unit}`} />
              <Stat k="PEAK DEVIATION" v={peak(selected)} />
              <Stat k="FIRST CAUTION" v={firstBreach ? `${firstBreach.time} UTC` : "NONE"} cls={firstBreach ? "text-warning" : "text-healthy"} />
            </dl>
            <div className="border-b border-border px-4 py-3">
              <div className="mb-1 font-mono text-[8px] tracking-[0.12em] text-quiet">ROLE IN ANOMALY</div>
              <p className="text-[12px] leading-relaxed">{selected.role}</p>
            </div>
            <div className="border-b border-border px-4 py-3">
              <div className="mb-2 font-mono text-[8px] tracking-[0.12em] text-quiet">HISTORICAL MATCH</div>
              <div className="flex items-center justify-between font-mono text-[11px]">
                <span>INC-182 · Thermal anomaly</span><span className="text-signal-cyan">91%</span>
              </div>
              <div className="mt-1 text-[10px] text-muted-foreground">Same fan-first signature. Resolved via CP-04 Cooling System Troubleshooting.</div>
            </div>
            <div className="flex flex-col gap-2 p-4">
              <Button asChild className="rounded-sm font-mono text-[10px] tracking-[0.12em]">
                <Link to="/investigation">INVESTIGATE ANOMALY <ArrowRight className="size-3.5" /></Link>
              </Button>
              <Button asChild variant="outline" className="rounded-sm font-mono text-[10px] tracking-[0.12em]">
                <Link to="/investigation" search={{ source: selected.key === "voltage" ? "power" : "telemetry" }}><FileSearch className="size-3.5" /> VIEW EVIDENCE SOURCE</Link>
              </Button>
              <Button asChild variant="outline" className="rounded-sm font-mono text-[10px] tracking-[0.12em]">
                <Link to="/logs"><ClipboardList className="size-3.5" /> VIEW CORRELATED LOGS</Link>
              </Button>
            </div>
          </aside>
        </div>
      </main>

      <Sheet open={!!record} onOpenChange={(o) => !o && setRecord(null)}>
        <SheetContent side="right" className="w-full overflow-y-auto rounded-none border-l border-border bg-panel p-0 sm:max-w-[460px]">
          {record && <RecordDetail r={record} />}
        </SheetContent>
      </Sheet>
    </div>
  );
}

function RecordDetail({ r }: { r: LogEntry }) {
  const d = liveData[sampleIndex(r.time)]!;
  return (
    <>
      <SheetHeader className={`border-b border-l-2 border-border p-5 text-left ${r.severity === "HIGH" ? "border-l-critical" : "border-l-warning"}`}>
        <div className="flex items-center gap-2 font-mono text-[9px] tracking-[0.12em]">
          <span className={`border px-1.5 py-0.5 ${recBox[r.severity]}`}>{r.severity}</span>
          <span className={statusTone[r.status]}>● {r.status}</span>
        </div>
        <SheetTitle className="font-mono text-[15px] tracking-[0.06em] text-foreground">{r.event}</SheetTitle>
        <SheetDescription className="text-[12px] text-muted-foreground">{r.message}</SheetDescription>
      </SheetHeader>
      <dl className="grid grid-cols-2 border-b border-border font-mono">
        <Stat k="RECORD ID" v={r.id} />
        <Stat k="TIMESTAMP" v={`${r.time} UTC`} />
        <Stat k="SOURCE" v={r.source} />
        <Stat k="SYSTEM" v={r.system} />
      </dl>
      <div className="border-b border-border px-5 py-4">
        <div className="mb-1 font-mono text-[8px] tracking-[0.12em] text-quiet">DESCRIPTION</div>
        <p className="text-[12px] leading-relaxed">{r.detail}</p>
      </div>
      <div className="border-b border-border px-5 py-4">
        <div className="mb-2 font-mono text-[8px] tracking-[0.12em] text-quiet">CHANNELS AT {d.time} UTC</div>
        <div className="grid grid-cols-3 border border-border font-mono">
          {channels.map((c) => (
            <div key={c.id} className="border-r border-border px-3 py-2 last:border-r-0">
              <div className="text-[8px] tracking-[0.1em] text-quiet">{c.id}</div>
              <div className={`mt-0.5 text-[12px] tabular-nums ${stateText[stateOf(c, d[c.key])]}`}>{c.fmt(d[c.key])} <span className="text-[8px]">{c.unit}</span></div>
            </div>
          ))}
        </div>
      </div>
      <div className="border-b border-border px-5 py-4">
        <div className="mb-1 font-mono text-[8px] tracking-[0.12em] text-quiet">MISSION CONTEXT</div>
        <p className="text-[12px] leading-relaxed text-muted-foreground">{r.anomaly}</p>
        <pre className="mt-3 overflow-x-auto border border-border bg-background p-3 font-mono text-[10px] leading-relaxed text-signal-cyan">{r.raw.join("\n")}</pre>
      </div>
      <div className="flex flex-col gap-2 p-5">
        {r.evidence && (
          <Button asChild className="rounded-sm font-mono text-[10px] tracking-[0.12em]">
            <Link to="/investigation" search={{ source: r.evidence.key }}><FileSearch className="size-3.5" /> VIEW EVIDENCE</Link>
          </Button>
        )}
        <Button asChild variant="outline" className="rounded-sm font-mono text-[10px] tracking-[0.12em]">
          <Link to="/investigation">INVESTIGATE ANOMALY <ArrowRight className="size-3.5" /></Link>
        </Button>
        <Button asChild variant="outline" className="rounded-sm font-mono text-[10px] tracking-[0.12em]">
          <Link to="/logs"><ClipboardList className="size-3.5" /> OPEN IN MISSION LOGS</Link>
        </Button>
      </div>
    </>
  );
}

function peak(c: Channel) {
  const b: number = liveData[0]![c.key];
  const worst = liveData.reduce<number>((m, d) => (Math.abs(d[c.key] - b) > Math.abs(m - b) ? d[c.key] : m), b);
  const d = worst - b;
  return `${d > 0 ? "+" : ""}${c.fmt(d)} ${c.unit}`;
}

function Stat({ k, v, cls = "text-foreground" }: { k: string; v: string; cls?: string }) {
  return (
    <div className="border-b border-r border-border px-4 py-2.5 [&:nth-child(2n)]:border-r-0 [&:nth-last-child(-n+2)]:border-b-0">
      <dt className="text-[8px] tracking-[0.12em] text-quiet">{k}</dt>
      <dd className={`mt-1 text-[12px] tabular-nums ${cls}`}>{v}</dd>
    </div>
  );
}

function Tip({ active, payload, label }: { active?: boolean; payload?: Array<{ name?: string; value?: number; color?: string }>; label?: string }) {
  if (!active || !payload?.length) return null;
  return (
    <div className="border border-border bg-popover px-3 py-2 font-mono text-[10px]">
      <div className="mb-1 text-[9px] text-muted-foreground">{label} UTC</div>
      {payload.map((p) => (
        <div key={p.name} className="flex justify-between gap-4"><span style={{ color: p.color }}>{p.name}</span><span className="tabular-nums">{p.value}</span></div>
      ))}
    </div>
  );
}
