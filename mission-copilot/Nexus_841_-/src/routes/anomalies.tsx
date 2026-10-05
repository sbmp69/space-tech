import { useState, useEffect } from "react";
import { Area, AreaChart, ResponsiveContainer, YAxis, CartesianGrid, XAxis, Tooltip } from "recharts";
import { Link, createFileRoute } from "@tanstack/react-router";
import { ArrowLeft, Command, Radio, Clock3, AlertTriangle, ShieldCheck, Cpu, Activity } from "lucide-react";
import { missionSnapshot } from "@/lib/mission-data";

let isFetchingSitrep = false;
let hasAnomaly = false;

export const Route = createFileRoute("/anomalies")({
  component: AnomaliesPage,
});

function AnomaliesPage() {
  const [tick, setTick] = useState(0);
  const [clock, setClock] = useState("");
  const [telemetry, setTelemetry] = useState<any[]>([]);
  const [currentVal, setCurrentVal] = useState({ temp: 80, voltage: 24, rpm: 4000 });
  const [anomaly, setAnomaly] = useState({ type: "NONE", value: "", subtext: "" });
  
  useEffect(() => {
    const updateClock = () => {
      setClock(
        new Intl.DateTimeFormat("en-GB", { timeZone: "UTC", hour: "2-digit", minute: "2-digit", second: "2-digit", hour12: false }).format(new Date()) + " UTC",
      );
    };
    updateClock();
    const timer = window.setInterval(updateClock, 1000);
    return () => window.clearInterval(timer);
  }, []);

  useEffect(() => {
    // Initial sync
    setTelemetry([...missionSnapshot.telemetry]);
    setAnomaly({ ...missionSnapshot.anomaly });

    const ws = new WebSocket(`${import.meta.env.VITE_WS_URL || 'ws://localhost:8000'}/ws/telemetry`);
    ws.onmessage = (event) => {
      const msg = JSON.parse(event.data);
      if (msg.type !== 'telemetry') return;
      
      const tdata = msg.data;
      const newTemp = tdata.core_temp || 80;
      const newVoltage = tdata.voltage || 24;
      const newRpm = (tdata.life_support || 100) * 40;
      
      setCurrentVal({ temp: newTemp, voltage: newVoltage, rpm: newRpm });
      setTelemetry(prev => [...prev.slice(-49), {
        time: msg.timestamp.slice(0, 5),
        temperature: newTemp,
        fanRpm: newRpm,
        voltage: newVoltage
      }]);
      
      const wasPower = missionSnapshot.anomaly.type === "POWER SYSTEM";
      const wasThermal = missionSnapshot.anomaly.type === "THERMAL SYSTEM";
      const wasRpm = missionSnapshot.anomaly.type === "LIFE SUPPORT";

      const currentTime = msg.timestamp || new Date().toISOString().substring(11, 19);
      const isPower = wasPower ? newVoltage < 21.0 : newVoltage < 20.0;
      const isThermal = wasThermal ? newTemp > 83.0 : newTemp > 85.0;
      const isRpm = wasRpm ? newRpm < 3200 : newRpm < 3000;
      const anomalyDetected = isPower || isThermal || isRpm;

      if (isPower) {
          missionSnapshot.anomaly.type = "POWER SYSTEM";
          missionSnapshot.anomaly.value = newVoltage.toFixed(1) + " V";
          missionSnapshot.anomaly.subtext = "NORMAL 24-32V • DETECTED JUST NOW";
      } else if (isThermal) {
          missionSnapshot.anomaly.type = "THERMAL SYSTEM";
          missionSnapshot.anomaly.value = newTemp.toFixed(1) + " °C";
          missionSnapshot.anomaly.subtext = "NORMAL 60-80°C • DETECTED JUST NOW";
      } else if (isRpm) {
          missionSnapshot.anomaly.type = "LIFE SUPPORT";
          missionSnapshot.anomaly.value = newRpm.toFixed(0) + " RPM";
          missionSnapshot.anomaly.subtext = "NORMAL 3500-4500 • DETECTED JUST NOW";
      } else {
          missionSnapshot.anomaly.type = "NONE";
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
         missionSnapshot.anomaly.description = "System Nominal.";
      }

      // Update anomaly state
      setAnomaly({ ...missionSnapshot.anomaly, description: missionSnapshot.anomaly.description });
      setTick(Date.now());
    };
    return () => ws.close();
  }, []);

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
          <div className="flex items-center gap-2 font-mono text-[10px] text-muted-foreground"><Clock3 className="size-3.5" /> {clock}</div>
        </div>
      </header>

      <main className="mx-auto max-w-[1600px] px-4 pb-16 pt-5 sm:px-7 xl:px-10">
        <Link to="/" className="mb-5 inline-flex items-center gap-1.5 font-mono text-[10px] tracking-[0.12em] text-muted-foreground transition-colors hover:text-foreground">
          <ArrowLeft className="size-3.5" /> BACK TO MISSION OVERVIEW
        </Link>

        <section className="mb-5">
          <div className="mb-2 flex items-center gap-2 font-mono text-[9px] tracking-[0.13em] text-warning">
            <span className="size-1.5 rounded-full bg-warning" /> LIVE ANOMALY MONITOR <span className="text-quiet">•</span> FLIGHT DAY 184
          </div>
          <h1 className="font-mono text-[23px] font-semibold tracking-[0.035em] sm:text-[27px]">ACTIVE ANOMALIES</h1>
          <p className="mt-1 text-[12px] text-muted-foreground">Live triage and AI root-cause analysis based on telemetry.</p>
        </section>

        {anomaly.type !== "NONE" ? (
          <div className="space-y-5">
            <section aria-label="Selected anomaly" className="mb-5 grid border border-warning/40 bg-panel lg:grid-cols-[minmax(0,1.2fr)_minmax(0,1fr)_300px]">
              <div className="border-b border-border p-5 lg:border-b-0 lg:border-r">
                <div className="flex items-center gap-2 font-mono text-[9px] tracking-[0.12em]">
                  <span className="border border-warning bg-warning/10 px-1.5 py-0.5 text-warning">CRITICAL</span>
                  <span className="text-signal-cyan">ANM-LIVE-01</span>
                  <span className="text-quiet">•</span>
                  <span className="text-warning">ACTIVE</span>
                </div>
                <h2 className="mt-4 text-[22px] font-semibold leading-tight text-warning">{anomaly.type} CRITICAL FAILURE</h2>
                <div className="mt-2 font-mono text-[10px] text-muted-foreground">SYSTEM • OPENED JUST NOW • OWNER AI TRIAGE</div>
                <p className="mt-5 border-l-2 border-warning/50 pl-3 text-[12px] leading-relaxed text-muted-foreground">
                  <span className="font-mono text-[10px] tracking-[0.12em] text-warning block mb-1">AI SITREP ANALYSIS</span>
                  {(anomaly.subtext || "").includes("AI SITREP:") ? (anomaly.subtext || "").split("AI SITREP:")[1] : "Requesting AI Analysis..."}
                </p>
              </div>

              <div className="grid grid-cols-1 border-b border-border lg:border-b-0 lg:border-r">
                  <div className="p-6 border-b border-border flex flex-col justify-center">
                    <div className="font-mono text-[10px] tracking-[0.14em] text-quiet">CURRENT {anomaly.type} READING</div>
                    <div className="mt-2 font-mono text-[36px] font-semibold tabular-nums leading-none text-critical">{anomaly.value}</div>
                    <div className="mt-2 font-mono text-[10px] text-muted-foreground">{(anomaly.subtext || "").split("•")[0]}</div>
                  </div>
                  <div className="p-6 flex flex-col justify-center bg-black/20">
                    <div className="font-mono text-[10px] tracking-[0.14em] text-quiet">AFFECTED METRICS</div>
                    <div className="mt-3 grid grid-cols-2 gap-4">
                        <div>
                           <div className="text-[9px] text-quiet font-mono mb-1">VOLTAGE</div>
                           <div className={`text-lg font-mono ${anomaly.type === 'POWER SYSTEM' ? 'text-critical' : 'text-foreground'}`}>{currentVal.voltage.toFixed(1)}V</div>
                        </div>
                        <div>
                           <div className="text-[9px] text-quiet font-mono mb-1">CORE TEMP</div>
                           <div className={`text-lg font-mono ${anomaly.type === 'THERMAL SYSTEM' ? 'text-critical' : 'text-foreground'}`}>{currentVal.temp.toFixed(1)}°C</div>
                        </div>
                    </div>
                  </div>
              </div>

              <div className="flex flex-col p-5 bg-warning/5">
                <div className="flex items-center justify-between font-mono text-[9px] tracking-[0.14em] text-warning mb-2">
                   <span>LIVE TELEMETRY</span>
                   <Activity className="size-4 animate-pulse" />
                </div>
                <div className="flex-1 min-h-[120px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={telemetry} margin={{ top: 10, right: 0, left: 0, bottom: 0 }}>
                      <YAxis hide domain={['auto', 'auto']} />
                      <Area type="step" dataKey={anomaly.type === 'POWER SYSTEM' ? 'voltage' : anomaly.type === 'THERMAL SYSTEM' ? 'temperature' : 'fanRpm'} stroke="var(--color-warning)" fill="var(--color-warning)" fillOpacity={0.15} strokeWidth={2} isAnimationActive={false} />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              </div>
            </section>
          </div>
        ) : (
          <section className="mb-5 flex flex-col items-center justify-center border border-healthy/40 bg-panel py-20 text-center">
            <div className="mb-4 flex size-16 items-center justify-center rounded-full bg-healthy/10">
              <ShieldCheck className="size-8 text-healthy" />
            </div>
            <h2 className="font-mono text-[20px] font-semibold tracking-[0.05em] text-healthy">ALL SYSTEMS NOMINAL</h2>
            <p className="mt-2 text-[12px] text-muted-foreground max-w-md">There are currently no active anomalies. Live telemetry streams indicate that all systems are operating within expected parameters.</p>
          </section>
        )}
      </main>
    </div>
  );
}
