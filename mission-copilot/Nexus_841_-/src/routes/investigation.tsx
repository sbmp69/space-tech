import { useState } from "react";
import { Link, createFileRoute } from "@tanstack/react-router";
import {
  Activity,
  ArrowDown,
  ArrowLeft,
  ArrowRight,
  BookOpen,
  ChevronRight,
  Clock3,
  Command,
  Database,
  FileText,
  History,
  Radio,
  ShieldAlert,
  ShieldCheck,
  Thermometer,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";

export const Route = createFileRoute("/investigation")({
  head: () => ({
    meta: [
      { title: "AI Investigation | NEXUS Mission Operations" },
      {
        name: "description",
        content:
          "Evidence-grounded investigation of the ORBIT-42 thermal system anomaly with observed facts, sources, procedures and an auditable timeline.",
      },
      { property: "og:title", content: "AI Investigation | NEXUS Mission Operations" },
      {
        property: "og:description",
        content: "Trace the ORBIT-42 thermal anomaly back to telemetry, logs, incident history and procedure CP-04.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  validateSearch: (search: Record<string, unknown>): { source?: string } =>
    typeof search["source"] === "string" ? { source: search["source"] } : {},
  component: InvestigationPage,
});

type SourceKey = "telemetry" | "power" | "log" | "incident" | "procedure" | "operator";
type Tone = "cyan" | "amber" | "green" | "quiet";

type SourceRecord = {
  kind: string;
  id: string;
  title: string;
  time: string;
  tone: Tone;
  excerpt: Array<[string, string]>;
  body?: string[];
  why: string;
  doc?: boolean;
};

const sources: Record<SourceKey, SourceRecord> = {
  telemetry: {
    kind: "TELEMETRY",
    id: "THM-04A",
    title: "Temperature and fan RPM correlation",
    time: "14:30:00 – 14:35:00 UTC",
    tone: "cyan",
    excerpt: [
      ["Temperature", "72.1°C → 89.2°C"],
      ["Fan RPM", "4,200 → 1,800 RPM"],
      ["RPM drop onset", "14:31:12"],
      ["Temp rise onset", "14:32:04 (+52 s)"],
      ["Sample rate", "1 Hz"],
    ],
    why: "Shows the fan slowed down before the temperature started rising, establishing the order of events directly from sensor data.",
  },
  power: {
    kind: "POWER TELEMETRY",
    id: "PWR-BUS-B",
    title: "Cooling loop B supply voltage",
    time: "14:30:00 – 14:35:00 UTC",
    tone: "cyan",
    excerpt: [
      ["Bus voltage", "12.1 V → 11.8 V"],
      ["Nominal band", "11.9 – 12.3 V"],
      ["Consumer", "Cooling fan assembly B"],
    ],
    why: "A slight supply drop on the fan bus is consistent with reduced fan speed and points the operator toward verifying fan power.",
  },
  log: {
    kind: "MISSION LOG",
    id: "LOG-4821",
    title: "FAN_SPEED_LOW event",
    time: "14:31:12 UTC",
    tone: "cyan",
    excerpt: [
      ["Event code", "FAN_SPEED_LOW"],
      ["Assembly", "Cooling loop B fan"],
      ["Threshold", "< 2,500 RPM"],
      ["Reported", "1,800 RPM"],
      ["Severity", "WARNING"],
    ],
    body: ["[14:31:12.044] THM/FAN-B  WARN  FAN_SPEED_LOW rpm=1800 thr=2500", "[14:31:12.051] ALERT-SVC  RAISE alert_id=A-7731 code=FAN_SPEED_LOW"],
    why: "Independent onboard record confirming the fan speed drop, timestamped before the thermal anomaly was detected.",
  },
  incident: {
    kind: "INCIDENT HISTORY",
    id: "INC-182",
    title: "Similar thermal anomaly",
    time: "12 AUG 2026",
    tone: "amber",
    excerpt: [
      ["Similarity", "91%"],
      ["Symptoms", "Fan RPM degradation, rising thermal readings, thermal warning"],
      ["Peak temp", "87.6°C"],
      ["Resolution", "Cooling subsystem inspection and fan power verification"],
      ["Outcome", "Nominal after fan supply reset"],
    ],
    why: "A comparable past pattern and how it was resolved. Similarity indicates a comparable historical pattern; it is not a confirmed root cause.",
  },
  procedure: {
    kind: "OFFICIAL PROCEDURE",
    id: "CP-04",
    title: "Cooling System Troubleshooting",
    time: "Version 4.2 · Approved",
    tone: "green",
    doc: true,
    excerpt: [
      ["Step 1", "Verify cooling system telemetry."],
      ["Step 2", "Verify fan power supply."],
      ["Step 3", "Inspect fan RPM stability."],
      ["Step 4", "Check backup cooling availability if temperature continues rising."],
    ],
    why: "The approved procedure for this subsystem. Every recommendation on this page references a step in CP-04.",
  },
  operator: {
    kind: "OPERATOR ACTION",
    id: "OPS-AUDIT-031",
    title: "Investigation initiated",
    time: "14:34:02 UTC",
    tone: "quiet",
    excerpt: [
      ["Operator", "FLIGHT-OPS 2"],
      ["Action", "INVESTIGATE ANOMALY"],
      ["Incident", "THM-042-031"],
    ],
    why: "Audit record of who opened the investigation and when, keeping the response traceable.",
  },
};

const toneText: Record<Tone, string> = {
  cyan: "text-signal-cyan",
  amber: "text-warning",
  green: "text-healthy",
  quiet: "text-muted-foreground",
};
const toneBorder: Record<Tone, string> = {
  cyan: "border-l-signal-cyan",
  amber: "border-l-warning",
  green: "border-l-healthy",
  quiet: "border-l-quiet",
};

const facts: Array<{ n: string; title: string; value: string; source: string; key: SourceKey; time: string }> = [
  { n: "01", title: "TEMPERATURE", value: "89.2°C", source: "THM-04A", time: "14:33:18", key: "telemetry" },
  { n: "02", title: "FAN RPM", value: "1800", source: "THM-04A", time: "14:31:12", key: "telemetry" },
  { n: "03", title: "ALERT", value: "FAN_SPEED_LOW", source: "LOG-4821", time: "14:31:12", key: "log" },
  { n: "04", title: "BUS VOLTAGE", value: "11.8 V", source: "PWR-BUS-B", time: "14:35:00", key: "power" },
  { n: "05", title: "ONSET LAG", value: "+52 s", source: "THM-04A", time: "14:32:04", key: "telemetry" },
];

const evidence: Array<{ key: SourceKey; label: string; icon: typeof Activity; meta: string[]; quote: string; cta: string }> = [
  { key: "telemetry", label: "TELEMETRY", icon: Activity, meta: ["14:30–14:35", "Sensor THM-04A"], quote: "Temperature and fan RPM correlation", cta: "VIEW SOURCE" },
  { key: "log", label: "MISSION LOG", icon: FileText, meta: ["LOG-4821", "14:31:12"], quote: "FAN_SPEED_LOW", cta: "VIEW LOG" },
  { key: "incident", label: "INCIDENT HISTORY", icon: History, meta: ["INC-182", "12 AUG 2026"], quote: "Similar thermal anomaly · Similarity 91%", cta: "VIEW INCIDENT" },
  { key: "procedure", label: "OFFICIAL PROCEDURE", icon: BookOpen, meta: ["CP-04", "v4.2"], quote: "Cooling System Troubleshooting — Verify fan power and RPM", cta: "VIEW PROCEDURE" },
];

const recs = [
  { n: "01", title: "VERIFY COOLING FAN POWER SUPPLY", label: "Reference", text: "CP-04 Step 2", key: "procedure" as SourceKey },
  { n: "02", title: "INSPECT FAN RPM STABILITY", label: "Reason", text: "RPM decreased before the temperature increase.", key: "telemetry" as SourceKey },
  { n: "03", title: "CHECK BACKUP COOLING AVAILABILITY", label: "Trigger", text: "If temperature approaches 90°C.", key: "procedure" as SourceKey },
];

const timeline: Array<{ t: string; title: string; detail: string; key: SourceKey; tone: Tone }> = [
  { t: "14:30:00", title: "SYSTEM NOMINAL", detail: "72.1°C", key: "telemetry", tone: "green" },
  { t: "14:31:12", title: "FAN SPEED LOW", detail: "4200 → 1800 RPM", key: "log", tone: "amber" },
  { t: "14:31:12", title: "ALERT TRIGGERED", detail: "FAN_SPEED_LOW", key: "log", tone: "amber" },
  { t: "14:32:04", title: "THERMAL ANOMALY DETECTED", detail: "Exceeded 80°C limit", key: "telemetry", tone: "amber" },
  { t: "14:33:18", title: "TEMPERATURE", detail: "89.2°C", key: "telemetry", tone: "amber" },
  { t: "14:34:02", title: "OPERATOR INVESTIGATION STARTED", detail: "FLIGHT-OPS 2", key: "operator", tone: "quiet" },
  { t: "14:35:10", title: "RECOMMENDATIONS GENERATED", detail: "CP-04 referenced", key: "procedure", tone: "cyan" },
];

// Simulated 1 Hz series sampled every 20s from 14:30:00 to 14:35:00
const tempSeries = [72.1, 72.2, 72.1, 72.3, 72.4, 73.2, 75.0, 77.6, 80.4, 83.1, 85.6, 87.4, 88.5, 89.0, 89.2, 89.2];
const rpmSeries = [4200, 4210, 4190, 4200, 1900, 1820, 1800, 1810, 1800, 1790, 1800, 1800, 1810, 1800, 1800, 1800];

function SectionHead({ index, title, sub, tone = "quiet" }: { index: string; title: string; sub?: string; tone?: Tone }) {
  return (
    <div className="mb-3 flex flex-wrap items-baseline gap-x-3 gap-y-1">
      <span className="font-mono text-[10px] text-quiet">{index}</span>
      <h2 className={`font-mono text-[12px] font-semibold tracking-[0.16em] ${toneText[tone]}`}>{title}</h2>
      {sub && <span className="text-[11px] text-muted-foreground">{sub}</span>}
    </div>
  );
}

function SourceLink({ label, onClick, tone = "cyan" }: { label: string; onClick: () => void; tone?: Tone }) {
  return (
    <button
      onClick={onClick}
      className={`group inline-flex items-center gap-1 font-mono text-[10px] tracking-[0.08em] ${toneText[tone]} underline decoration-dotted underline-offset-4 transition-opacity hover:opacity-80`}
    >
      {label}
      <ArrowRight className="size-3 transition-transform group-hover:translate-x-0.5" />
    </button>
  );
}

function Spark({ data, tone, min, max }: { data: number[]; tone: Tone; min: number; max: number }) {
  const w = 300;
  const h = 56;
  const pts = data.map((v, i) => `${(i / (data.length - 1)) * w},${h - ((v - min) / (max - min)) * h}`).join(" ");
  return (
    <svg viewBox={`0 0 ${w} ${h}`} className={`h-14 w-full ${toneText[tone]}`} preserveAspectRatio="none">
      <line x1={(4 / 15) * w} x2={(4 / 15) * w} y1={0} y2={h} className="stroke-quiet" strokeDasharray="2 3" strokeWidth={1} />
      <polyline points={pts} fill="none" stroke="currentColor" strokeWidth={1.6} vectorEffect="non-scaling-stroke" />
    </svg>
  );
}

function InvestigationPage() {
  const { source } = Route.useSearch();
  const [active, setActive] = useState<SourceKey | null>(
    source && source in sources ? (source as SourceKey) : null,
  );
  const open = (k: SourceKey) => setActive(k);
  const sel = active ? sources[active] : null;

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

      <main className="mx-auto max-w-[1480px] px-4 pb-16 pt-5 sm:px-7 xl:px-10">
        {/* 1. HEADER */}
        <Link
          to="/"
          className="mb-5 inline-flex items-center gap-1.5 font-mono text-[10px] tracking-[0.12em] text-muted-foreground transition-colors hover:text-foreground"
        >
          <ArrowLeft className="size-3.5" /> BACK TO MISSION OVERVIEW
        </Link>

        <section className="mb-8 grid gap-5 border border-border bg-panel lg:grid-cols-[1fr_300px]">
          <div className="border-l-2 border-l-warning p-5 sm:p-6">
            <div className="mb-3 flex flex-wrap items-center gap-2 font-mono text-[10px] tracking-[0.12em]">
              <span className="border border-signal-cyan/30 bg-signal-cyan/10 px-2 py-0.5 text-signal-cyan">AI INVESTIGATION</span>
              <span className="text-quiet">/</span>
              <span className="text-warning">THERMAL SYSTEM ANOMALY</span>
            </div>
            <h1 className="max-w-[900px] font-mono text-[22px] font-semibold leading-tight sm:text-[28px]">
              WHY DID THE THERMAL SYSTEM TEMPERATURE INCREASE?
            </h1>
            <p className="mt-3 max-w-[760px] text-[13px] leading-relaxed text-muted-foreground">
              Evidence-grounded analysis using telemetry, mission logs, historical incidents and approved procedures.
            </p>
            <div className="mt-5 flex flex-wrap gap-x-6 gap-y-2 font-mono text-[10px] tracking-[0.1em] text-muted-foreground">
              <span className="inline-flex items-center gap-1.5 border border-warning/30 bg-warning/10 px-2 py-0.5 text-warning">
                <span className="size-1.5 rounded-full bg-warning" /> HIGH SEVERITY
              </span>
              <span className="py-0.5">MISSION <span className="text-foreground">ORBIT-42</span></span>
              <span className="py-0.5">DETECTED <span className="text-foreground">14:32:04 UTC</span></span>
              <span className="py-0.5">INCIDENT <span className="text-foreground">THM-042-031</span></span>
            </div>
          </div>
          <div className="grid grid-cols-3 border-t border-border lg:grid-cols-1 lg:border-l lg:border-t-0">
            {[
              { l: "TEMPERATURE", v: "89.2°C", s: "limit 90.0°C · THM-04A", c: "text-warning", icon: true },
              { l: "FAN RPM", v: "1800", s: "nominal 4200 · THM-04A", c: "text-signal-cyan" },
              { l: "ALERT STATE", v: "ACTIVE", s: "FAN_SPEED_LOW · A-7731", c: "text-warning" },
            ].map((m) => (
              <div key={m.l} className="border-r border-border p-4 last:border-r-0 lg:border-b lg:border-r-0 lg:last:border-b-0">
                <div className="flex items-center gap-1.5 font-mono text-[9px] tracking-[0.14em] text-muted-foreground">
                  {m.icon && <Thermometer className="size-3 text-warning" />}{m.l}
                </div>
                <div className={`mt-1 font-mono text-[22px] font-semibold tabular-nums leading-none sm:text-[26px] ${m.c}`}>{m.v}</div>
                <div className="mt-1 font-mono text-[9px] text-quiet">{m.s}</div>
              </div>
            ))}
          </div>
        </section>

        <div className="grid gap-8 xl:grid-cols-[1fr_360px]">
          <div className="min-w-0 space-y-9">
            {/* 2. OBSERVED FACTS */}
            <section>
              <SectionHead index="01" title="OBSERVED FACTS" sub="Things the system actually observed" tone="cyan" />
              <div className="border border-signal-cyan/30 bg-signal-cyan/[0.04]">
                <div className="flex items-center gap-2 border-b border-signal-cyan/20 px-4 py-2 font-mono text-[9px] tracking-[0.14em] text-signal-cyan">
                  <Database className="size-3" /> OBSERVED / EVIDENCE-BACKED · NOT INFERRED
                </div>
                <div className="grid sm:grid-cols-2 lg:grid-cols-5">
                  {facts.map((f) => (
                    <button
                      key={f.n}
                      onClick={() => open(f.key)}
                      className="group flex flex-col gap-1.5 border-b border-signal-cyan/15 p-4 text-left transition-colors hover:bg-signal-cyan/[0.07] lg:border-b-0 lg:border-r lg:last:border-r-0"
                    >
                      <div className="flex items-center justify-between font-mono text-[9px] tracking-[0.12em]">
                        <span className="text-muted-foreground">{f.title}</span>
                        <span className="text-quiet">{f.n}</span>
                      </div>
                      <div className="font-mono text-[18px] font-semibold tabular-nums">{f.value}</div>
                      <div className="mt-auto border-t border-signal-cyan/15 pt-2 font-mono text-[9px] tracking-[0.08em]">
                        <span className="text-quiet">SOURCE: </span>
                        <span className="text-signal-cyan">{f.source} • {f.time}</span>
                      </div>
                      <span className="inline-flex items-center gap-1 font-mono text-[9px] tracking-[0.1em] text-signal-cyan opacity-70 transition-opacity group-hover:opacity-100">
                        VIEW EVIDENCE <ArrowRight className="size-3 transition-transform group-hover:translate-x-0.5" />
                      </span>
                    </button>
                  ))}
                </div>
                <div className="grid gap-px border-t border-signal-cyan/20 bg-signal-cyan/10 sm:grid-cols-2">
                  <div className="bg-panel p-4">
                    <div className="mb-1 flex justify-between font-mono text-[9px] tracking-[0.1em] text-muted-foreground">
                      <span>TEMPERATURE °C</span><span className="text-warning">89.2</span>
                    </div>
                    <Spark data={tempSeries} tone="amber" min={70} max={92} />
                  </div>
                  <div className="bg-panel p-4">
                    <div className="mb-1 flex justify-between font-mono text-[9px] tracking-[0.1em] text-muted-foreground">
                      <span>FAN RPM</span><span className="text-signal-cyan">1800</span>
                    </div>
                    <Spark data={rpmSeries} tone="cyan" min={1500} max={4500} />
                  </div>
                  <div className="col-span-full bg-panel px-4 pb-3 font-mono text-[9px] text-quiet">
                    14:30:00 ——— dashed line: RPM drop at 14:31:12 ——— 14:35:00
                  </div>
                </div>
              </div>
            </section>

            {/* 3. SUPPORTING EVIDENCE */}
            <section>
              <SectionHead index="02" title="SUPPORTING EVIDENCE" sub="Trace every conclusion back to a source." />
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                {evidence.map((e, i) => {
                  const s = sources[e.key];
                  const Icon = e.icon;
                  return (
                    <button
                      key={e.key}
                      onClick={() => open(e.key)}
                      className={`group flex flex-col gap-3 border border-border border-l-2 ${toneBorder[s.tone]} bg-panel p-4 text-left transition-colors hover:bg-panel-raised`}
                    >
                      <div className="flex items-center justify-between">
                        <span className={`inline-flex items-center gap-1.5 font-mono text-[10px] tracking-[0.12em] ${toneText[s.tone]}`}>
                          <Icon className="size-3.5" /> {e.label}
                        </span>
                        <span className="font-mono text-[9px] text-quiet">EVIDENCE #0{i + 1}</span>
                      </div>
                      <div className="font-mono text-[10px] text-muted-foreground">{e.meta.join(" · ")}</div>
                      <div className="text-[13px] leading-snug">"{e.quote}"</div>
                      <span className={`mt-auto inline-flex items-center gap-1 font-mono text-[10px] tracking-[0.08em] ${toneText[s.tone]}`}>
                        {e.cta} <ArrowRight className="size-3 transition-transform group-hover:translate-x-0.5" />
                      </span>
                    </button>
                  );
                })}
              </div>
            </section>

            {/* 5+6. HISTORY + PROCEDURE */}
            <div className="grid gap-5 lg:grid-cols-2">
              <section>
                <SectionHead index="03" title="HISTORICAL INCIDENT MATCH" tone="amber" />
                <div className="border border-border bg-panel p-5">
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <div className="font-mono text-[18px] font-semibold">INC-182</div>
                      <div className="font-mono text-[10px] tracking-[0.1em] text-muted-foreground">THERMAL ANOMALY · 12 AUG 2026</div>
                    </div>
                    <div className="text-right">
                      <div className="font-mono text-[9px] tracking-[0.12em] text-muted-foreground">SIMILARITY</div>
                      <div className="font-mono text-[30px] font-semibold leading-none text-warning">91%</div>
                    </div>
                  </div>
                  <div className="mt-3 h-1 bg-muted"><div className="h-full w-[91%] bg-warning" /></div>
                  <div className="mt-4 font-mono text-[9px] tracking-[0.12em] text-muted-foreground">PREVIOUS SYMPTOMS</div>
                  <ul className="mt-1.5 space-y-1 text-[12px]">
                    {["Fan RPM degradation", "Rising thermal readings", "Thermal warning"].map((x) => (
                      <li key={x} className="flex items-center gap-2"><span className="size-1 bg-warning" />{x}</li>
                    ))}
                  </ul>
                  <div className="mt-4 font-mono text-[9px] tracking-[0.12em] text-muted-foreground">HISTORICAL RESOLUTION</div>
                  <p className="mt-1 text-[12px]">Cooling subsystem inspection and fan power verification.</p>
                  <div className="mt-4 flex items-center justify-between gap-3 border-t border-border pt-3">
                    <p className="text-[10px] italic text-quiet">Similarity indicates a comparable historical pattern; it is not a confirmed root cause.</p>
                    <div className="flex shrink-0 items-center gap-3"><Link to="/incidents" search={{ id: "INC-182" }} className="font-mono text-[9px] tracking-[0.12em] text-warning hover:underline">INCIDENT HISTORY →</Link><SourceLink label="VIEW INCIDENT" tone="amber" onClick={() => open("incident")} /></div>
                  </div>
                </div>
              </section>

              <section>
                <SectionHead index="04" title="RELEVANT PROCEDURE" tone="green" />
                <div className="border border-border bg-panel p-5">
                  <div className="flex items-start justify-between">
                    <div>
                      <div className="font-mono text-[18px] font-semibold">CP-04</div>
                      <div className="font-mono text-[10px] tracking-[0.1em] text-muted-foreground">COOLING SYSTEM TROUBLESHOOTING</div>
                    </div>
                    <span className="border border-healthy/30 px-2 py-0.5 font-mono text-[9px] text-healthy">VERSION 4.2</span>
                  </div>
                  <ol className="mt-4 divide-y divide-border border-y border-border">
                    {sources.procedure.excerpt.map(([step, text], i) => (
                      <li key={step} className={`flex gap-4 py-2.5 ${i === 1 ? "bg-healthy/5" : ""}`}>
                        <span className="w-12 shrink-0 font-mono text-[10px] text-healthy">{step.toUpperCase()}</span>
                        <span className="text-[12px]">{text}</span>
                      </li>
                    ))}
                  </ol>
                  <div className="mt-3 flex items-center justify-end gap-4">
                    <Link to="/procedures" search={{ id: "CP-04", step: 2 }} className="font-mono text-[9px] tracking-[0.12em] text-healthy hover:underline">OPEN IN PROCEDURE LIBRARY →</Link>
                    <SourceLink label="VIEW PROCEDURE" tone="green" onClick={() => open("procedure")} />
                  </div>
                </div>
              </section>
            </div>

            {/* 7. EVIDENCE CHAIN */}
            <section>
              <SectionHead index="05" title="EVIDENCE CHAIN" sub="Relationship between observed signals" />
              <div className="grid gap-5 border border-border bg-panel p-5 lg:grid-cols-[1fr_260px]">
                <div className="flex flex-col items-stretch gap-2 md:flex-row md:items-center">
                  {[
                    { l: "FAN RPM ↓", s: "4200 → 1800", tone: "cyan" as Tone },
                    { l: "COOLING PERFORMANCE AFFECTED", s: "Reduced airflow", tone: "quiet" as Tone },
                    { l: "TEMPERATURE ↑", s: "72.1 → 89.2°C", tone: "amber" as Tone },
                    { l: "THERMAL WARNING", s: "14:32:04", tone: "amber" as Tone },
                  ].map((n, i, arr) => (
                    <div key={n.l} className="flex flex-1 flex-col items-center gap-2 md:flex-row">
                      <div className={`w-full flex-1 border border-border border-l-2 ${toneBorder[n.tone]} bg-background px-3 py-2.5`}>
                        <div className={`font-mono text-[10px] font-semibold tracking-[0.08em] ${toneText[n.tone]}`}>{n.l}</div>
                        <div className="font-mono text-[10px] text-muted-foreground">{n.s}</div>
                      </div>
                      {i < arr.length - 1 && (
                        <>
                          <ArrowDown className="size-4 text-quiet md:hidden" />
                          <ArrowRight className="hidden size-4 shrink-0 text-quiet md:block" />
                        </>
                      )}
                    </div>
                  ))}
                </div>
                <div className="border-t border-border pt-4 lg:border-l lg:border-t-0 lg:pl-5 lg:pt-0">
                  <div className="mb-2 font-mono text-[9px] tracking-[0.14em] text-muted-foreground">EVIDENCE COVERAGE</div>
                  {[
                    ["3", "TELEMETRY SIGNALS"],
                    ["2", "MISSION LOGS"],
                    ["1", "HISTORICAL INCIDENT"],
                    ["1", "OFFICIAL PROCEDURE"],
                  ].map(([n, l]) => (
                    <div key={l} className="flex items-baseline gap-3 py-0.5 font-mono">
                      <span className="w-4 text-[14px] font-semibold text-signal-cyan">{n}</span>
                      <span className="text-[10px] tracking-[0.08em]">{l}</span>
                    </div>
                  ))}
                </div>
              </div>
            </section>

            {/* 4. AI RECOMMENDATIONS */}
            <section>
              <SectionHead index="06" title="AI RECOMMENDATIONS" sub="Suggested actions" tone="amber" />
              <div className="border border-dashed border-warning/40 bg-warning/[0.03]">
                <div className="flex flex-wrap items-center justify-between gap-2 border-b border-dashed border-warning/30 px-4 py-2 font-mono text-[9px] tracking-[0.14em]">
                  <span className="inline-flex items-center gap-1.5 text-warning"><ShieldAlert className="size-3" /> OPERATOR VERIFICATION REQUIRED</span>
                  <span className="text-quiet">GENERATED 14:35:10 · CP-04 REFERENCED</span>
                </div>
                <div className="divide-y divide-dashed divide-warning/20">
                  {recs.map((r) => (
                    <div key={r.n} className="grid items-center gap-3 px-4 py-4 sm:grid-cols-[40px_1fr_auto]">
                      <span className="font-mono text-[14px] text-warning">{r.n}</span>
                      <div>
                        <div className="mb-1 flex items-center gap-2">
                          <span className="border border-warning/30 px-1.5 py-px font-mono text-[8px] tracking-[0.14em] text-warning">RECOMMENDATION</span>
                        </div>
                        <div className="font-mono text-[13px] font-semibold">{r.title}</div>
                        <div className="mt-0.5 text-[12px] text-muted-foreground">
                          <span className="font-mono text-[10px] text-quiet">{r.label.toUpperCase()}: </span>{r.text}
                        </div>
                      </div>
                      <SourceLink label="VIEW EVIDENCE" tone="amber" onClick={() => open(r.key)} />
                    </div>
                  ))}
                </div>
                <p className="border-t border-dashed border-warning/30 px-4 py-2.5 text-[11px] italic text-muted-foreground">
                  Recommendations are generated from available evidence and should be verified by the operator.
                </p>
              </div>
            </section>
          </div>

          {/* 8. TIMELINE */}
          <aside className="xl:sticky xl:top-[76px] xl:self-start">
            <SectionHead index="07" title="AUDITABLE TIMELINE" />
            <ol className="relative border border-border bg-panel p-4">
              <span className="absolute bottom-6 left-[27px] top-6 w-px bg-border" />
              {timeline.map((e, i) => (
                <li key={i} className="relative flex gap-3 pb-4 last:pb-0">
                  <span className={`relative z-10 mt-1 size-[9px] shrink-0 rounded-full border-2 border-panel ${e.tone === "green" ? "bg-healthy" : e.tone === "amber" ? "bg-warning" : e.tone === "cyan" ? "bg-signal-cyan" : "bg-quiet"} ml-[3px]`} />
                  <div className="min-w-0 flex-1">
                    <div className="font-mono text-[10px] tabular-nums text-quiet">{e.t}</div>
                    <div className={`font-mono text-[11px] font-semibold tracking-[0.06em] ${toneText[e.tone]}`}>{e.title}</div>
                    <div className="text-[11px] text-muted-foreground">{e.detail}</div>
                    <div className="mt-1"><SourceLink label="VIEW EVIDENCE" onClick={() => open(e.key)} /></div>
                  </div>
                </li>
              ))}
            </ol>
          </aside>
        </div>
      </main>

      <Sheet open={!!sel} onOpenChange={(o) => !o && setActive(null)}>
        <SheetContent side="right" className="w-full overflow-y-auto rounded-none border-l border-border bg-panel p-0 sm:max-w-[480px]">
          {sel && (
            <>
              <SheetHeader className={`border-b border-border border-l-2 ${toneBorder[sel.tone]} p-5 text-left`}>
                <div className={`font-mono text-[10px] tracking-[0.14em] ${toneText[sel.tone]}`}>{sel.kind}</div>
                <SheetTitle className="font-mono text-[18px]">{sel.title}</SheetTitle>
                <SheetDescription className="font-mono text-[10px]">
                  {sel.id} · {sel.time}
                </SheetDescription>
              </SheetHeader>
              <div className="space-y-5 p-5">
                <dl className="grid grid-cols-2 gap-px border border-border bg-border">
                  {[["SOURCE TYPE", sel.kind], ["SOURCE ID", sel.id], ["TIMESTAMP", sel.time], ["TITLE", sel.title]].map(([k, v]) => (
                    <div key={k} className="bg-background p-3">
                      <dt className="font-mono text-[9px] tracking-[0.12em] text-quiet">{k}</dt>
                      <dd className="mt-0.5 font-mono text-[11px]">{v}</dd>
                    </div>
                  ))}
                </dl>
                <div>
                  <div className="mb-2 font-mono text-[9px] tracking-[0.14em] text-muted-foreground">
                    {sel.doc ? "DOCUMENT · RELEVANT STEPS" : "RELEVANT DATA / EXCERPT"}
                  </div>
                  {sel.doc ? (
                    <div className="border border-border bg-background p-5">
                      <div className="mb-3 border-b border-border pb-3 font-mono text-[10px] text-muted-foreground">
                        CP-04 · COOLING SYSTEM TROUBLESHOOTING · REV 4.2 · APPROVED
                      </div>
                      <ol className="space-y-3">
                        {sel.excerpt.map(([k, v]) => (
                          <li key={k} className="flex gap-3 text-[13px] leading-relaxed">
                            <span className="w-14 shrink-0 font-mono text-[10px] text-healthy">{k.toUpperCase()}</span>
                            {v}
                          </li>
                        ))}
                      </ol>
                    </div>
                  ) : (
                    <div className="divide-y divide-border border border-border bg-background">
                      {sel.excerpt.map(([k, v]) => (
                        <div key={k} className="flex justify-between gap-4 px-3 py-2">
                          <span className="font-mono text-[10px] text-muted-foreground">{k}</span>
                          <span className="text-right font-mono text-[11px] tabular-nums">{v}</span>
                        </div>
                      ))}
                    </div>
                  )}
                  {sel.body && (
                    <pre className="mt-3 overflow-x-auto border border-border bg-background p-3 font-mono text-[10px] leading-relaxed text-signal-cyan">
                      {sel.body.join("\n")}
                    </pre>
                  )}
                </div>
                <div className="border-l-2 border-l-signal-cyan bg-signal-cyan/5 p-4">
                  <div className="mb-1 inline-flex items-center gap-1.5 font-mono text-[9px] tracking-[0.14em] text-signal-cyan">
                    <ShieldCheck className="size-3" /> WHY THIS SOURCE MATTERS
                  </div>
                  <p className="text-[12px] leading-relaxed">{sel.why}</p>
                </div>
                <Button variant="outline" className="w-full rounded-none font-mono text-[10px] tracking-[0.1em]" onClick={() => setActive(null)}>
                  CLOSE <ChevronRight className="size-3" />
                </Button>
              </div>
            </>
          )}
        </SheetContent>
      </Sheet>
    </div>
  );
}

