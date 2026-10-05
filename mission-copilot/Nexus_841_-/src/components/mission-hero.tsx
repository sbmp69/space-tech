import { Link } from "@tanstack/react-router";
import { ArrowRight } from "lucide-react";
import { missionSnapshot } from "@/lib/mission-data";

const ORBIT = "M 60 250 A 300 92 -12 1 1 660 120 A 300 92 -12 1 1 60 250";

export function MissionHero({ clock, anomaly }: { clock: string, anomaly?: any }) {
    return (
    <section aria-label="Mission command view" className="hero-console relative mb-5 overflow-hidden border border-border">
      <div className="grid lg:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)]">
        {/* Command readout */}
        <div className="relative z-10 flex flex-col justify-between gap-8 p-6 sm:p-8">
          <div>
            <div className="flex items-center gap-3 font-mono text-[10px] tracking-[0.28em] text-muted-foreground">
              <span className="text-foreground">NEXUS</span>
              <span className="h-px w-6 bg-border" />
              <span>MISSION OPERATIONS COPILOT</span>
            </div>
            <h1 className="mt-6 font-mono text-[44px] font-semibold leading-none tracking-[0.06em] text-foreground sm:text-[64px]">
              ORBIT<span className="text-signal-cyan">-</span>42
            </h1>
            <div className="mt-4 flex flex-wrap items-center gap-3 font-mono text-[10px] tracking-[0.2em]">
              <span className="flex items-center gap-2 border border-critical/40 px-2 py-1 text-critical">
                <span className="size-1.5 animate-pulse rounded-full bg-critical" /> LIVE
              </span>
              <span className="text-muted-foreground">LIVE SPACECRAFT OPERATIONS</span>
            </div>
          </div>

          <dl className="grid grid-cols-2 gap-px border border-border bg-border font-mono">
            <div className="bg-background/80 p-4">
              <dt className="text-[8px] tracking-[0.18em] text-quiet">MISSION STATUS</dt>
              <dd className="mt-2 flex items-center gap-2 text-[14px] tracking-[0.08em] text-healthy">
                <span className="size-1.5 rounded-full bg-healthy" /> OPERATIONAL
              </dd>
            </div>
            <div className="bg-background/80 p-4">
              <dt className="text-[8px] tracking-[0.18em] text-quiet">FLIGHT DAY</dt>
              <dd className="mt-2 text-[14px] tabular-nums text-foreground">184 <span className="text-quiet">/ 210</span></dd>
              <div className="mt-2 h-px bg-border"><div className="h-px w-[87.6%] bg-signal-cyan" /></div>
            </div>
                        {anomaly?.type && anomaly.type !== "NONE" ? (
              <Link to="/anomalies" className="group col-span-2 flex items-center justify-between gap-4 border-l-2 border-warning bg-background/90 p-4 transition-colors hover:bg-warning/10 cursor-pointer">
                <div>
                  <dt className="flex items-center gap-2 text-[8px] tracking-[0.18em] text-warning">
                    <span className="size-1.5 animate-pulse rounded-full bg-warning" /> ACTIVE ANOMALY • {anomaly.type}
                  </dt>
                  <dd className="mt-1.5 text-[34px] leading-none tabular-nums text-warning">{anomaly.value}</dd>
                  <div className="mt-1.5 text-[9px] tracking-[0.1em] text-muted-foreground">{anomaly.subtext}</div>
                </div>
                <ArrowRight className="size-4 text-warning transition-transform group-hover:translate-x-1" />
              </Link>
            ) : (
              <div className="group col-span-2 flex items-center justify-between gap-4 border-l-2 border-healthy bg-background/90 p-4 transition-colors">
                <div>
                  <dt className="flex items-center gap-2 text-[8px] tracking-[0.18em] text-healthy">
                    <span className="size-1.5 rounded-full bg-healthy" /> SYSTEM STATUS NOMINAL
                  </dt>
                  <dd className="mt-1.5 text-[24px] leading-none tabular-nums text-healthy">OPERATIONAL</dd>
                  <div className="mt-1.5 text-[9px] tracking-[0.1em] text-muted-foreground">NO ACTIVE ANOMALIES DETECTED</div>
                </div>
              </div>
            )}
          </dl>
        </div>

        {/* Orbital visualization */}
        <div className="relative min-h-[320px] border-t border-border lg:border-l lg:border-t-0">
          <svg viewBox="0 0 720 420" className="absolute inset-0 size-full" preserveAspectRatio="xMidYMid slice" aria-label="ORBIT-42 trajectory with spacecraft position">
            <defs>
              <radialGradient id="earth" cx="50%" cy="0%" r="70%">
                <stop offset="0%" stopColor="var(--color-signal-cyan)" stopOpacity="0.16" />
                <stop offset="100%" stopColor="var(--color-signal-cyan)" stopOpacity="0" />
              </radialGradient>
            </defs>
            {/* reticle grid */}
            {[...Array(9)].map((_, i) => (
              <line key={`v${i}`} x1={i * 90} y1="0" x2={i * 90} y2="420" stroke="var(--color-gridline)" strokeOpacity="0.25" strokeDasharray="1 6" />
            ))}
            {[...Array(5)].map((_, i) => (
              <line key={`h${i}`} x1="0" y1={i * 105} x2="720" y2={i * 105} stroke="var(--color-gridline)" strokeOpacity="0.25" strokeDasharray="1 6" />
            ))}
            {/* earth horizon */}
            <ellipse cx="360" cy="900" rx="760" ry="560" fill="url(#earth)" />
            <ellipse cx="360" cy="900" rx="760" ry="560" fill="none" stroke="var(--color-signal-cyan)" strokeOpacity="0.45" strokeWidth="1" />
            <ellipse cx="360" cy="912" rx="760" ry="560" fill="none" stroke="var(--color-signal-cyan)" strokeOpacity="0.12" strokeWidth="6" />
            {/* secondary orbits */}
            <ellipse cx="360" cy="185" rx="330" ry="70" transform="rotate(-12 360 185)" fill="none" stroke="var(--color-foreground)" strokeOpacity="0.07" />
            <ellipse cx="360" cy="185" rx="250" ry="120" transform="rotate(18 360 185)" fill="none" stroke="var(--color-foreground)" strokeOpacity="0.05" strokeDasharray="2 5" />
            {/* primary trajectory */}
            <path d={ORBIT} fill="none" stroke="var(--color-signal-cyan)" strokeOpacity="0.55" strokeWidth="1" strokeDasharray="3 4" />
            {/* telemetry markers */}
            {[
              [118, 300, "AOS 14:12"],
              [608, 92, "LOS 14:58"],
              [330, 108, "TDRS-W"],
            ].map(([x, y, t]) => (
              <g key={t as string} transform={`translate(${x} ${y})`}>
                <rect x="-3" y="-3" width="6" height="6" fill="none" stroke="var(--color-signal-cyan)" strokeOpacity="0.8" />
                <text x="9" y="3" fill="var(--color-muted-foreground)" fontSize="9" fontFamily="var(--font-mono)" letterSpacing="1.5">{t}</text>
              </g>
            ))}
            {/* spacecraft */}
            <g>
              <circle r="14" fill="none" stroke="var(--color-warning)" strokeOpacity="0.5">
                <animate attributeName="r" values="6;18;6" dur="3s" repeatCount="indefinite" />
                <animate attributeName="stroke-opacity" values="0.6;0;0.6" dur="3s" repeatCount="indefinite" />
              </circle>
              <circle r="4" fill="var(--color-warning)" />
              <animateMotion dur="90s" repeatCount="indefinite" path={ORBIT} begin="-38s" />
            </g>
          </svg>

          <div className="pointer-events-none absolute left-4 top-4 font-mono text-[9px] tracking-[0.18em] text-muted-foreground">
            <div className="text-signal-cyan">ORBITAL TRACK · LEO</div>
            <div className="mt-1">ALT 412.6 KM · VEL 7.66 KM/S</div>
          </div>
          <div className="pointer-events-none absolute right-4 top-4 flex items-center gap-2 border border-border bg-background/70 px-2 py-1 font-mono text-[9px] tracking-[0.16em] text-muted-foreground">
            <span className="size-1.5 animate-pulse rounded-full bg-critical" /> LIVE · {clock}
          </div>
          <div className="pointer-events-none absolute bottom-4 left-4 right-4 flex flex-wrap justify-between gap-2 font-mono text-[8px] tracking-[0.16em] text-quiet">
            <span><span className="text-warning">●</span> SPACECRAFT · THERMAL WARN</span>
            <span><span className="text-healthy">●</span> DOWNLINK NOMINAL</span>
            <span>INCL 51.64° · PERIOD 92.7 MIN</span>
          </div>
          <Link to="/telemetry" className="absolute bottom-10 right-4 font-mono text-[9px] tracking-[0.16em] text-signal-cyan hover:text-foreground">
            OPEN TELEMETRY →
          </Link>
        </div>
      </div>
    </section>
  );
}
