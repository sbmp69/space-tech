import React, { useEffect, useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import {
  Activity,
  AlertTriangle,
  ArrowRight,
  Bell,
  BookOpen,
  ChevronDown,
  CircleHelp,
  ClipboardList,
  Clock3,
  Command,
  Crosshair,
  FileText,
  Gauge,
  History,
  Radio,
  Satellite,
  ShieldCheck,
  Signal,
  Thermometer,
  Waves,
} from "lucide-react";
import {
  CartesianGrid,
  Line,
  LineChart,
  ReferenceArea,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { Button } from "@/components/ui/button";
import { missionSnapshot as originalSnapshot } from "@/lib/mission-data";
let missionSnapshot = JSON.parse(JSON.stringify(originalSnapshot));
let isFetchingSitrep = false;
let hasAnomaly = false;

import { MissionHero } from "@/components/mission-hero";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Mission Overview | NEXUS Operations" },
      {
        name: "description",
        content: "Live operational intelligence and evidence-grounded anomaly monitoring for mission ORBIT-42.",
      },
      { property: "og:title", content: "Mission Overview | NEXUS Operations" },
      {
        property: "og:description",
        content: "Operational intelligence and thermal telemetry for mission ORBIT-42.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: MissionOverview,
});

const navigation = [
  { label: "Mission Overview", icon: Satellite, active: true },
  { label: "Active Anomalies", icon: AlertTriangle, count: "01", to: "/anomalies" as const },
  { label: "Telemetry", icon: Activity, to: "/telemetry" as const },
  { label: "Mission Logs", icon: ClipboardList, to: "/logs" as const },
  { label: "Procedures", icon: BookOpen, to: "/procedures" as const },
  { label: "Incident History", icon: History, to: "/incidents" as const },
];

function MissionOverview() {
  const [tick, setTick] = useState(0);

  useEffect(() => {
    const ws = new WebSocket(`${import.meta.env.VITE_WS_URL || 'ws://localhost:8000'}/ws/telemetry`);
    ws.onmessage = (event) => {
      const msg = JSON.parse(event.data);
      if (msg.type !== 'telemetry') return;
      
      const tdata = msg.data;
      const newTemp = tdata.core_temp || 80;
      const newVoltage = tdata.voltage || 12;
      const newRpm = (tdata.life_support || 50) * 40;
      
      missionSnapshot.telemetry = [...missionSnapshot.telemetry.slice(-49), {
        time: msg.timestamp.slice(0, 5),
        temperature: newTemp,
        fanRpm: newRpm,
        voltage: newVoltage
      }];
      
      missionSnapshot.anomaly.temperatureC = newTemp;
      
      const wasPower = missionSnapshot.anomaly.type === "POWER SYSTEM";
      const wasThermal = missionSnapshot.anomaly.type === "THERMAL SYSTEM";
      const wasRpm = missionSnapshot.anomaly.type === "LIFE SUPPORT";

      const isPower = wasPower ? newVoltage < 21.0 : newVoltage < 20.0;
      const isThermal = wasThermal ? newTemp > 83.0 : newTemp > 85.0;
      const isRpm = wasRpm ? newRpm < 3200 : newRpm < 3000;

      const anomalyDetected = isPower || isThermal || isRpm;

      if (isPower) {
          missionSnapshot.anomaly.type = "POWER SYSTEM";
          missionSnapshot.anomaly.value = newVoltage.toFixed(1) + " V";
          missionSnapshot.anomaly.subtext = "NORMAL 24-32V • DETECTED " + currentTime;
      } else if (isThermal) {
          missionSnapshot.anomaly.type = "THERMAL SYSTEM";
          missionSnapshot.anomaly.value = newTemp.toFixed(1) + " °C";
          missionSnapshot.anomaly.subtext = "NORMAL 60-80°C • DETECTED " + currentTime;
      } else if (isRpm) {
          missionSnapshot.anomaly.type = "LIFE SUPPORT";
          missionSnapshot.anomaly.value = newRpm.toFixed(0) + " RPM";
          missionSnapshot.anomaly.subtext = "NORMAL 3500-4500 • DETECTED " + currentTime;
      } else {
          missionSnapshot.anomaly.type = "NONE";
      }

      // Dynamic Systems Update
      missionSnapshot.systems = [
        { name: "THERMAL", status: isThermal ? "WARNING" : "NOMINAL", state: isThermal ? "warning" : "healthy" },
        { name: "POWER", status: isPower ? "CRITICAL" : "NOMINAL", state: isPower ? "critical" : "healthy" },
        { name: "COMMUNICATIONS", status: "NOMINAL", state: "healthy" },
        { name: "PROPULSION", status: "NOMINAL", state: "healthy" },
        { name: "NAVIGATION", status: "NOMINAL", state: "healthy" },
        { name: "LIFE SUPPORT", status: isRpm ? "WARNING" : "NOMINAL", state: isRpm ? "warning" : "healthy" },
      ];

      // Dynamic Events Update
      const currentTime = msg.timestamp || new Date().toISOString().substring(11, 19);
      if (anomalyDetected && !hasAnomaly) {
         missionSnapshot.events = [{
           time: currentTime,
           level: "CRITICAL",
           code: "ANOMALY_DETECTED",
           title: "System Anomaly Detected",
           detail: `Voltage: ${newVoltage.toFixed(1)}V, Temp: ${newTemp.toFixed(1)}C, RPM: ${newRpm}`,
           state: "critical"
         }, ...missionSnapshot.events].slice(0, 5);
      } else if (!anomalyDetected && hasAnomaly) {
         missionSnapshot.events = [{
           time: currentTime,
           level: "INFO",
           code: "SYSTEM_RECOVERY",
           title: "Systems Recovered to Nominal",
           detail: `Voltage restored. Current: ${newVoltage.toFixed(1)}V`,
           state: "healthy"
         }, ...missionSnapshot.events].slice(0, 5);
      }

      if (anomalyDetected && !isFetchingSitrep && !hasAnomaly) {
        isFetchingSitrep = true;
        hasAnomaly = true;
        missionSnapshot.anomaly.description = "AI SITREP: Analyzing telemetry via OpenAI gpt-4o-mini...";
        
        fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:8000'}/api/sitrep`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ temperature: newTemp, voltage: newVoltage, life_support: tdata.life_support || 100 })
        })
        .then(r => r.json())
        .then(d => {
          missionSnapshot.anomaly.description = "AI SITREP: " + d.sitrep;
        })
        .catch(e => {
          missionSnapshot.anomaly.description = "AI SITREP: Analysis failed.";
        })
        .finally(() => {
          isFetchingSitrep = false;
        });
      } else if (!anomalyDetected && hasAnomaly) {
         hasAnomaly = false;
         missionSnapshot.anomaly.description = "System Nominal. Awaiting telemetry anomalies...";
      }
      
      setTick(Date.now());
    };
    return () => ws.close();
  }, []);

  const [clock, setClock] = useState("--:--:-- UTC");
  const [selectedEvent, setSelectedEvent] = useState<number | null>(null);

  useEffect(() => {
    const updateClock = () => {
      setClock(
        new Intl.DateTimeFormat("en-GB", {
          timeZone: "UTC",
          hour: "2-digit",
          minute: "2-digit",
          second: "2-digit",
          hour12: false,
        }).format(new Date()) + " UTC",
      );
    };
    updateClock();
    const timer = window.setInterval(updateClock, 1000);
    return () => window.clearInterval(timer);
  }, []);

  return (
    <div className="space-field min-h-screen text-foreground">
      <div className="min-h-screen">
        <header className="sticky top-0 z-20 border-b border-border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/90">
          <div className="flex min-h-[62px] items-center justify-between gap-4 px-4 sm:px-7">
            <div className="flex min-w-0 items-center gap-3">
              <div className="flex size-8 shrink-0 items-center justify-center border border-border bg-panel text-signal-cyan lg:hidden">
                <Command className="size-4" />
              </div>
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <span className="font-mono text-[11px] font-semibold tracking-[0.1em]">MISSION ORBIT-42</span>
                  <span className="hidden border border-healthy/25 bg-healthy/10 px-1.5 py-0.5 font-mono text-[8px] text-healthy sm:inline-flex">OPERATIONAL</span>
                </div>
                <div className="mt-1 flex items-center gap-1.5 text-[9px] text-muted-foreground">
                  <span className="size-1.5 rounded-full bg-healthy" /> CONNECTION: <span className="font-mono text-healthy">CONNECTED</span>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-2 sm:gap-4">
              <div className="hidden min-w-[145px] border-l border-border pl-4 md:block">
                <div className="font-mono text-[8px] tracking-[0.12em] text-quiet">DEMO SCENARIO</div>
                <div className="mt-1 flex items-center gap-1.5 text-[10px] text-foreground">Thermal Anomaly <ChevronDown className="size-3 text-muted-foreground" /></div>
              </div>
              <div className="hidden items-center gap-2 border-l border-border pl-4 font-mono text-[10px] tabular-nums text-muted-foreground sm:flex">
                <Clock3 className="size-3.5" /> {clock}
              </div>
              <Button variant="ghost" size="icon" className="relative size-8 rounded-none text-muted-foreground hover:text-foreground" aria-label="Notifications" title="Notifications">
                <Bell className="size-4" />
                <span className="absolute right-1.5 top-1.5 size-1.5 rounded-full bg-warning" />
              </Button>
              <div className="flex size-8 items-center justify-center border border-border bg-panel font-mono text-[9px] text-signal-cyan" aria-label="Operator DEMO-01">D1</div>
            </div>
          </div>
        </header>

        <main className="relative mx-auto max-w-[1600px] px-4 pb-10 pt-6 sm:px-7 sm:pt-8 xl:px-10">
          <MissionHero clock={clock} anomaly={missionSnapshot.anomaly} />

          <section aria-labelledby="anomaly-heading" className="relative mb-5 overflow-hidden border border-warning/35 bg-panel">
            <div className="absolute inset-y-0 left-0 w-[3px] bg-warning" />
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border bg-panel-raised px-5 py-3 sm:px-6">
              <div className="flex items-center gap-2.5">
                <span className="flex size-6 items-center justify-center border border-warning/30 bg-warning/10 text-warning"><AlertTriangle className="size-3.5" /></span>
                <span className="font-mono text-[10px] font-semibold tracking-[0.14em] text-warning">ACTIVE ANOMALY</span>
                <span className="hidden text-[9px] text-quiet sm:inline">/</span>
                <span className="hidden font-mono text-[9px] tracking-[0.1em] text-muted-foreground sm:inline">INCIDENT ID: THM-042-031</span>
              </div>
              <div className="flex items-center gap-2 border border-warning/30 bg-warning/10 px-2.5 py-1 font-mono text-[9px] font-semibold tracking-[0.08em] text-warning">
                <span className="size-1.5 animate-pulse rounded-full bg-warning" /> HIGH SEVERITY
              </div>
            </div>
            <div className="grid lg:grid-cols-[minmax(0,1fr)_330px]">
              <div className="p-5 sm:p-7">
                <div className="mb-5 flex flex-wrap items-start justify-between gap-5">
                  <div>
                    <p className="mb-2 font-mono text-[9px] tracking-[0.17em] text-muted-foreground">FLIGHT SYSTEM / COMPONENT 04</p>
                    <h2 id="anomaly-heading" className="font-mono text-[17px] font-semibold tracking-[0.08em] sm:text-[20px]">THERMAL SYSTEM</h2>
                    <p className="mt-1 text-[11px] text-muted-foreground">Cooling loop B · Sensor THM-04A</p>
                  </div>
                  <div className="flex items-center gap-2 border border-border bg-background/40 px-2.5 py-1.5">
                    <Radio className="size-3.5 text-signal-cyan" />
                    <span className="font-mono text-[9px] text-muted-foreground">SENSOR LINK</span>
                    <span className="font-mono text-[9px] text-healthy">ACTIVE</span>
                  </div>
                </div>
                <div className="flex flex-wrap items-end gap-x-8 gap-y-4">
                  <div>
                    <div className="flex items-start gap-1 font-mono text-[52px] font-medium leading-none tabular-nums tracking-[-0.02em] text-warning sm:text-[62px]">
                      {missionSnapshot.anomaly.temperatureC.toFixed(1)}<span className="mt-2 text-[23px]">°C</span>
                    </div>
                    <div className="mt-2 font-mono text-[9px] tracking-[0.13em] text-muted-foreground">CURRENT TEMPERATURE</div>
                  </div>
                  <div className="mb-1 flex gap-8 border-l border-border pl-5 sm:pl-7">
                    <div>
                      <div className="font-mono text-[10px] text-foreground">60–80°C</div>
                      <div className="mt-1.5 text-[9px] text-muted-foreground">NORMAL RANGE</div>
                    </div>
                    <div>
                      <div className="font-mono text-[10px] text-foreground">14:32:04</div>
                      <div className="mt-1.5 text-[9px] text-muted-foreground">FIRST DETECTED</div>
                    </div>
                  </div>
                </div>
                <p className="mt-5 max-w-[680px] border-l-2 border-warning/35 pl-3 text-[11px] leading-[1.7] text-muted-foreground sm:text-[12px]">
                  {missionSnapshot.anomaly.description}
                </p>
                <div className="mt-6 flex flex-wrap items-center gap-4">
                  <Button asChild className="h-10 rounded-none bg-warning px-4 font-mono text-[10px] font-semibold tracking-[0.08em] text-primary-foreground shadow-none hover:bg-warning/90">
                    <Link to="/investigation">
                      INVESTIGATE ANOMALY <ArrowRight className="size-3.5" />
                    </Link>
                  </Button>
                  <span className="inline-flex items-center gap-1.5 text-[9px] text-muted-foreground"><Crosshair className="size-3 text-signal-cyan" /> 3 corroborating telemetry signals</span>
                </div>
              </div>
              <div className="flex flex-col justify-between border-t border-border bg-background/20 p-5 lg:border-l lg:border-t-0 lg:p-6">
                <div>
                  <div className="mb-4 flex items-center justify-between">
                    <span className="font-mono text-[9px] tracking-[0.14em] text-muted-foreground">OBSERVED FACTS</span>
                    <span className="border border-signal-cyan/25 bg-signal-cyan/10 px-1.5 py-0.5 font-mono text-[8px] text-signal-cyan">TELEMETRY</span>
                  </div>
                  <div className="space-y-3">
                    <Fact label="Temperature" value="89.2°C" detail="+9.2°C above upper limit" />
                    <Fact label="Cooling fan" value="1,800 RPM" detail="Down from 4,200 RPM" />
                    <Fact label="Bus voltage" value="11.8 V" detail="Within operating margin" />
                  </div>
                </div>
                <div className="mt-5 border-t border-border pt-3 text-[9px] leading-relaxed text-muted-foreground">
                  <span className="mr-1.5 inline-block size-1.5 rounded-full bg-warning align-middle" /> All values sourced from live mission telemetry. Recommendations require operator verification.
                </div>
              </div>
            </div>
          </section>

          <TelemetryPanel />

          <div className="mt-5 grid gap-5 xl:grid-cols-[minmax(0,0.92fr)_minmax(0,1.4fr)]">
            <section aria-labelledby="health-heading" className="border border-border bg-panel">
              <SectionHeader icon={ShieldCheck} eyebrow="FLIGHT SYSTEMS" title="SYSTEM HEALTH" trailing="06 SYSTEMS" />
              <div className="grid grid-cols-1 gap-x-5 px-5 sm:grid-cols-2 xl:grid-cols-1 2xl:grid-cols-2">
                {missionSnapshot.systems.map((system, index) => (
                  <div key={system.name} className={`flex min-h-[43px] items-center gap-2.5 border-b border-border/70 ${index === 5 ? "sm:border-b-0 xl:border-b 2xl:border-b-0" : ""}`}>
                    <span className={`size-1.5 rounded-full ${system.state === "warning" ? "bg-warning" : "bg-healthy"}`} />
                    <span className="flex-1 font-mono text-[9px] tracking-[0.08em] text-muted-foreground">{system.name}</span>
                    <span className={`font-mono text-[9px] font-medium ${system.state === "warning" ? "text-warning" : "text-healthy"}`}>{system.status}</span>
                    <span className="font-mono text-[8px] text-quiet">{system.state === "warning" ? "01" : "00"}</span>
                  </div>
                ))}
              </div>
              <Link to="/anomalies" className="mx-5 mt-3 mb-4 flex items-center gap-2 border border-warning/20 bg-warning/5 px-3 py-2 text-[9px] text-muted-foreground transition-colors hover:bg-warning/15 hover:border-warning/40 cursor-pointer">
                <AlertTriangle className="size-3.5 shrink-0 text-warning" />
                <span>{missionSnapshot.systems.filter(s => s.state !== "healthy").length} system(s) require operator attention</span>
                <ArrowRight className="ml-auto size-3 text-warning" />
              </Link>
            </section>

            <section aria-labelledby="events-heading" className="border border-border bg-panel">
              <SectionHeader icon={Activity} eyebrow="MISSION TIMELINE" title="RECENT EVENTS" trailing="LIVE FEED" />
              <div className="divide-y divide-border/70">
                {missionSnapshot.events.map((event, index) => {
                  const expanded = selectedEvent === index;
                  const levelStyle = event.state === "healthy" ? "text-healthy border-healthy/25 bg-healthy/5" : event.state === "warning" ? "text-warning border-warning/25 bg-warning/5" : "text-critical border-critical/25 bg-critical/5";
                  return (
                    <button key={event.code} type="button" onClick={() => setSelectedEvent(expanded ? null : index)} aria-expanded={expanded} className="group grid w-full grid-cols-[60px_minmax(0,1fr)_auto] items-start gap-3 px-4 py-3 text-left transition-colors hover:bg-panel-raised sm:grid-cols-[68px_minmax(0,1fr)_auto] sm:px-5">
                      <span className="pt-0.5 font-mono text-[9px] tabular-nums text-muted-foreground">{event.time}</span>
                      <span className="min-w-0">
                        <span className="flex flex-wrap items-center gap-2">
                          <span className="text-[10px] font-medium text-foreground">{event.title}</span>
                          <span className={`border px-1 py-0.5 font-mono text-[7px] font-medium tracking-[0.08em] ${levelStyle}`}>{event.level}</span>
                        </span>
                        <span className="mt-1 block font-mono text-[8px] tracking-[0.06em] text-quiet">{event.code}</span>
                        <span className="mt-1 block text-[9px] text-muted-foreground">{event.detail}</span>
                        {expanded && <span className="mt-2 block border-l border-signal-cyan/50 pl-2 text-[9px] leading-relaxed text-signal-cyan">Observed event · Recorded by mission telemetry stream · Source: THM-04A</span>}
                      </span>
                      <ArrowRight className={`mt-1 size-3 text-quiet transition-transform group-hover:text-foreground ${expanded ? "rotate-90" : ""}`} />
                    </button>
                  );
                })}
              </div>
              <div className="flex items-center justify-between border-t border-border px-5 py-3">
                <span className="font-mono text-[8px] tracking-[0.1em] text-quiet">SHOWING {missionSnapshot.events.length} LATEST EVENTS</span>
                <Link to="/logs" className="font-mono text-[8px] tracking-[0.1em] text-signal-cyan transition-colors hover:text-foreground">MISSION LOG <ArrowRight className="ml-1 inline size-3" /></Link>
              </div>
            </section>
          </div>

          <footer className="mt-6 flex flex-wrap items-center justify-between gap-2 border-t border-border pt-3 font-mono text-[8px] tracking-[0.06em] text-quiet">
            <span>NEXUS MISSION OPERATIONS COPILOT <span className="mx-1.5">/</span> BUILD 0.1.0</span>
            <span className="inline-flex items-center gap-1.5"><Signal className="size-3 text-healthy" /> TELEMETRY LINK NOMINAL <span className="mx-1">·</span> {clock}</span>
          </footer>
        </main>
      </div>
    </div>
  );
}

function Metric({ label, value, icon: Icon, tone, note }: { label: string; value: string; icon: typeof ShieldCheck; tone: "healthy" | "warning" | "cyan"; note: string }) {
  const color = tone === "healthy" ? "text-healthy" : tone === "warning" ? "text-warning" : "text-signal-cyan";
  return (
    <div className="relative min-h-[100px] border-b border-r border-border px-4 py-3 last:border-r-0 even:border-r-0 sm:border-b-0 sm:border-r sm:px-5 sm:py-4 sm:last:border-r-0 sm:even:border-r">
      <div className="flex items-center justify-between gap-2">
        <span className="font-mono text-[8px] font-medium tracking-[0.12em] text-muted-foreground sm:text-[9px]">{label}</span>
        <Icon className={`size-3.5 ${color}`} strokeWidth={1.7} />
      </div>
      <div className={`mt-2 font-mono text-[19px] font-medium leading-none tabular-nums sm:text-[22px] ${tone === "warning" ? "text-warning" : "text-foreground"}`}>{value}</div>
      <div className={`mt-2 font-mono text-[7px] tracking-[0.08em] sm:text-[8px] ${color}`}>{note}</div>
      {tone === "warning" && <span className="absolute bottom-0 left-0 h-px w-full bg-warning/50 sm:bottom-auto sm:left-auto sm:right-0 sm:top-0 sm:h-full sm:w-px" />}
    </div>
  );
}

function Fact({ label, value, detail }: { label: string; value: string; detail: string }) {
  return (
    <div className="grid grid-cols-[minmax(0,1fr)_auto] items-baseline gap-x-3 border-b border-border/70 pb-2.5 last:border-0 last:pb-0">
      <span className="text-[10px] text-muted-foreground">{label}</span>
      <span className="font-mono text-[10px] font-medium tabular-nums text-foreground">{value}</span>
      <span className="col-span-2 mt-0.5 text-[8px] text-quiet">{detail}</span>
    </div>
  );
}

function SectionHeader({ icon: Icon, eyebrow, title, trailing }: { icon: typeof ShieldCheck; eyebrow: string; title: string; trailing: string }) {
  return (
    <div className="flex min-h-[59px] items-center justify-between border-b border-border px-5">
      <div className="flex items-center gap-2.5">
        <Icon className="size-4 text-signal-cyan" strokeWidth={1.7} />
        <div>
          <div className="font-mono text-[7px] tracking-[0.12em] text-quiet">{eyebrow}</div>
          <h2 className="mt-0.5 font-mono text-[10px] font-medium tracking-[0.1em] text-foreground">{title}</h2>
        </div>
      </div>
      <span className="font-mono text-[8px] tracking-[0.08em] text-muted-foreground">{trailing}</span>
    </div>
  );
}

function TelemetryPanel() {
  const [series, setSeries] = useState({ temperature: true, fanRpm: true, voltage: true });
  const toggleSeries = (name: keyof typeof series) => setSeries((current) => ({ ...current, [name]: !current[name] }));

  return (
    <section aria-labelledby="telemetry-heading" className="border border-border bg-panel">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border px-4 py-3 sm:px-5">
        <div className="flex items-center gap-2.5">
          <Activity className="size-4 text-signal-cyan" strokeWidth={1.8} />
          <div>
            <div className="font-mono text-[7px] tracking-[0.12em] text-quiet">SENSOR ARRAY / THM-04A</div>
            <h2 id="telemetry-heading" className="mt-0.5 font-mono text-[10px] font-medium tracking-[0.1em]">TELEMETRY <span className="text-quiet">•</span> THERMAL SYSTEM</h2>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-1.5">
          <span className="mr-1 font-mono text-[8px] text-quiet">SIGNALS</span>
          <SeriesToggle active={series.temperature} color="warning" label="TEMP °C" onClick={() => toggleSeries("temperature")} />
          <SeriesToggle active={series.fanRpm} color="cyan" label="FAN RPM" onClick={() => toggleSeries("fanRpm")} />
          <SeriesToggle active={series.voltage} color="healthy" label="VOLTAGE" onClick={() => toggleSeries("voltage")} />
        </div>
      </div>
      <div className="grid grid-cols-3 border-b border-border bg-background/20">
        <div className="border-r border-border px-4 py-2.5 sm:px-5">
          <div className="font-mono text-[7px] tracking-[0.1em] text-quiet">TEMPERATURE</div>
          <div className="mt-1 font-mono text-[13px] tabular-nums text-warning">89.2 <span className="text-[9px]">°C</span></div>
        </div>
        <div className="border-r border-border px-4 py-2.5 sm:px-5">
          <div className="font-mono text-[7px] tracking-[0.1em] text-quiet">FAN SPEED</div>
          <div className="mt-1 font-mono text-[13px] tabular-nums text-signal-cyan">1,800 <span className="text-[9px]">RPM</span></div>
        </div>
        <div className="px-4 py-2.5 sm:px-5">
          <div className="font-mono text-[7px] tracking-[0.1em] text-quiet">BUS VOLTAGE</div>
          <div className="mt-1 font-mono text-[13px] tabular-nums text-healthy">11.8 <span className="text-[9px]">V</span></div>
        </div>
      </div>
      <div className="h-[265px] px-1 pb-2 pt-3 sm:h-[300px] sm:px-3">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={[...missionSnapshot.telemetry]} margin={{ top: 9, right: 13, bottom: 1, left: 2 }}>
            <CartesianGrid stroke="var(--color-gridline)" strokeDasharray="2 5" vertical={false} />
            <XAxis dataKey="time" tick={{ fill: "var(--color-muted-foreground)", fontSize: 9, fontFamily: "var(--font-mono)" }} tickLine={false} axisLine={{ stroke: "var(--color-gridline)" }} interval={1} dy={7} />
            <YAxis yAxisId="temperature" domain={[65, 95]} width={34} tick={{ fill: "var(--color-warning)", fontSize: 8, fontFamily: "var(--font-mono)" }} tickLine={false} axisLine={false} tickCount={4} />
            <YAxis yAxisId="fan" orientation="right" domain={[0, 5000]} width={37} tick={{ fill: "var(--color-signal-cyan)", fontSize: 8, fontFamily: "var(--font-mono)" }} tickLine={false} axisLine={false} tickCount={4} />
            <YAxis yAxisId="voltage" orientation="right" domain={[11.5, 12.4]} hide />
            <ReferenceArea x1="14:31" x2="14:34" yAxisId="temperature" fill="var(--color-warning)" fillOpacity={0.07} stroke="var(--color-warning)" strokeOpacity={0.12} />
            <Tooltip content={<TelemetryTooltip />} cursor={{ stroke: "var(--color-muted-foreground)", strokeDasharray: "3 4" }} />
            {series.temperature && <Line yAxisId="temperature" type="monotone" dataKey="temperature" name="Temperature" stroke="var(--color-warning)" strokeWidth={2.2} dot={false} activeDot={{ r: 4, strokeWidth: 1, fill: "var(--color-warning)" }} isAnimationActive={false} />}
            {series.fanRpm && <Line yAxisId="fan" type="monotone" dataKey="fanRpm" name="Fan RPM" stroke="var(--color-signal-cyan)" strokeWidth={1.8} dot={false} activeDot={{ r: 3.5, strokeWidth: 1, fill: "var(--color-signal-cyan)" }} isAnimationActive={false} />}
            {series.voltage && <Line yAxisId="voltage" type="monotone" dataKey="voltage" name="Voltage" stroke="var(--color-healthy)" strokeWidth={1.6} strokeDasharray="4 3" dot={false} activeDot={{ r: 3, strokeWidth: 1, fill: "var(--color-healthy)" }} isAnimationActive={false} />}
          </LineChart>
        </ResponsiveContainer>
      </div>
      <div className="flex flex-wrap items-center justify-between gap-2 border-t border-border px-4 py-2.5 sm:px-5">
        <div className="flex items-center gap-2 text-[8px] text-muted-foreground"><span className="inline-flex size-2 items-center justify-center"><span className="size-1.5 rounded-full bg-warning" /></span> ANOMALY WINDOW <span className="font-mono text-foreground">14:31—14:34</span></div>
        <div className="font-mono text-[8px] tracking-[0.05em] text-quiet">OBSERVED TELEMETRY <span className="mx-1">·</span> 60 SEC SAMPLE</div>
      </div>
    </section>
  );
}

function SeriesToggle({ active, color, label, onClick }: { active: boolean; color: "warning" | "cyan" | "healthy"; label: string; onClick: () => void }) {
  const dot = color === "warning" ? "bg-warning" : color === "cyan" ? "bg-signal-cyan" : "bg-healthy";
  return (
    <button type="button" aria-pressed={active} onClick={onClick} className={`flex items-center gap-1.5 border px-2 py-1 font-mono text-[7px] tracking-[0.05em] transition-colors ${active ? "border-border bg-background/50 text-foreground" : "border-transparent text-quiet hover:text-muted-foreground"}`}>
      <span className={`size-1.5 rounded-full ${active ? dot : "bg-quiet"}`} />{label}
    </button>
  );
}

function TelemetryTooltip({ active, payload, label }: { active?: boolean; payload?: Array<{ name?: string; value?: number; color?: string }>; label?: string }) {
  if (!active || !payload?.length) return null;
  return (
    <div className="border border-border bg-popover px-3 py-2 shadow-lg">
      <div className="mb-1.5 font-mono text-[9px] text-muted-foreground">{label} UTC</div>
      {payload.map((entry) => (
        <div key={entry.name} className="flex min-w-[130px] items-center justify-between gap-4 py-0.5 font-mono text-[9px]">
          <span style={{ color: entry.color }}>{entry.name}</span>
          <span className="tabular-nums text-foreground">{entry.value}{entry.name === "Fan RPM" ? " RPM" : entry.name === "Voltage" ? " V" : "°C"}</span>
        </div>
      ))}
    </div>
  );
}