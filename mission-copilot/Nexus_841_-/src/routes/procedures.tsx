import { useMemo, useState } from "react";
import { Link, createFileRoute, useNavigate } from "@tanstack/react-router";
import { ArrowLeft, ArrowRight, BookOpen, History, SearchX, ShieldCheck, Sparkles, UserCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Label, NexusShell, SearchBox, Select, Stat } from "@/components/nexus-ui";
import { incidents, procedures, type Procedure } from "@/lib/knowledge";

export const Route = createFileRoute("/procedures")({
  validateSearch: (s: Record<string, unknown>): { id?: string; step?: number } => ({
    ...(typeof s["id"] === "string" ? { id: s["id"] } : {}),
    ...(s["step"] !== undefined && !Number.isNaN(Number(s["step"])) ? { step: Number(s["step"]) } : {}),
  }),
  head: () => ({
    meta: [
      { title: "Procedures | NEXUS Mission Operations" },
      { name: "description", content: "Official ORBIT-42 mission operations procedure library with step-level guidance and anomaly relevance." },
      { property: "og:title", content: "Procedures | NEXUS Mission Operations" },
      { property: "og:description", content: "Browse official flight procedures like CP-04 Cooling System Troubleshooting, separated from AI recommendations." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: ProceduresPage,
});

const ALL = "ALL";
const statusCls: Record<Procedure["status"], string> = {
  "OFFICIAL / ACTIVE": "border-healthy/35 bg-healthy/10 text-healthy",
  "UNDER REVIEW": "border-warning/35 bg-warning/10 text-warning",
  SUPERSEDED: "border-border text-quiet",
};
const uniq = (k: keyof Procedure) => [ALL, ...Array.from(new Set(procedures.map((p) => String(p[k]))))];

function ProceduresPage() {
  const { id, step } = Route.useSearch();
  const navigate = useNavigate({ from: "/procedures" });
  const [q, setQ] = useState("");
  const [sys, setSys] = useState(ALL);
  const [cat, setCat] = useState(ALL);
  const [st, setSt] = useState(ALL);
  const selected = procedures.find((p) => p.id === id) ?? null;

  const rows = useMemo(() => {
    const t = q.toLowerCase();
    return procedures.filter((p) =>
      (!t || [p.id, p.title, p.system, p.summary].join(" ").toLowerCase().includes(t)) &&
      (sys === ALL || p.system === sys) && (cat === ALL || p.category === cat) && (st === ALL || p.status === st));
  }, [q, sys, cat, st]);
  const dirty = q || sys !== ALL || cat !== ALL || st !== ALL;
  const reset = () => { setQ(""); setSys(ALL); setCat(ALL); setSt(ALL); };

  if (selected) return <NexusShell><ProcedureDetail p={selected} step={step ?? 1} /></NexusShell>;

  return (
    <NexusShell>
      <section className="mb-5 flex flex-col justify-between gap-4 lg:flex-row lg:items-end">
        <div>
          <div className="mb-2 flex items-center gap-2 font-mono text-[9px] tracking-[0.13em] text-healthy">
            <ShieldCheck className="size-3" /> ORBIT-42 / FLIGHT PROCEDURE LIBRARY
          </div>
          <h1 className="font-mono text-[23px] font-semibold tracking-[0.035em] sm:text-[27px]">PROCEDURES</h1>
          <p className="mt-1 text-[12px] text-muted-foreground">Approved mission operations procedures. Official guidance only — AI recommendations are labelled separately.</p>
        </div>
        <div className="grid grid-cols-3 border border-border bg-panel">
          <Stat k="PROCEDURES" v={procedures.length} c="text-foreground" />
          <Stat k="OFFICIAL" v={procedures.filter((p) => p.status === "OFFICIAL / ACTIVE").length} c="text-healthy" />
          <Stat k="UNDER REVIEW" v={procedures.filter((p) => p.status === "UNDER REVIEW").length} c="text-warning" />
        </div>
      </section>

      <Link to="/procedures" search={{ id: "CP-04", step: 2 }}
        className="mb-5 flex flex-wrap items-center justify-between gap-3 border border-warning/30 border-l-2 border-l-warning bg-warning/5 px-4 py-3 transition-colors hover:bg-warning/10">
        <div><Label tone="text-warning">RELEVANT TO CURRENT ANOMALY · THERMAL 89.2°C</Label>
          <div className="mt-1 font-mono text-[13px]"><span className="text-healthy">CP-04</span> COOLING SYSTEM TROUBLESHOOTING <span className="text-quiet">· STEP 02 FLAGGED</span></div></div>
        <span className="flex items-center gap-1 font-mono text-[10px] tracking-[0.12em] text-warning">OPEN PROCEDURE <ArrowRight className="size-3.5" /></span>
      </Link>

      <section className="border border-border bg-panel">
        <div className="flex flex-wrap items-center gap-2 border-b border-border p-3">
          <SearchBox value={q} onChange={setQ} placeholder="Search procedure ID, title, system…" />
          <Select label="SYS" value={sys} options={uniq("system")} onChange={setSys} />
          <Select label="CATEGORY" value={cat} options={uniq("category")} onChange={setCat} />
          <Select label="STATUS" value={st} options={uniq("status")} onChange={setSt} />
        </div>
        <div className="px-3 py-2 font-mono text-[9px] tracking-[0.12em] text-muted-foreground">
          SHOWING <span className="text-foreground">{rows.length}</span> OF {procedures.length} PROCEDURES
          {dirty && <button type="button" onClick={reset} className="ml-3 text-primary hover:underline">RESET FILTERS</button>}
        </div>
      </section>

      {rows.length === 0 ? (
        <section className="flex flex-col items-center border border-t-0 border-border bg-panel px-6 py-14 text-center">
          <SearchX className="mb-3 size-5 text-quiet" />
          <div className="font-mono text-[13px] font-semibold tracking-[0.14em]">NO MATCHING PROCEDURES</div>
          <Button variant="outline" onClick={reset} className="mt-4 rounded-none font-mono text-[10px] tracking-[0.12em]">RESET ALL FILTERS</Button>
        </section>
      ) : (
        <section className="overflow-x-auto border border-t-0 border-border bg-panel">
          <table className="w-full min-w-[920px] border-collapse font-mono text-[11px]">
            <thead>
              <tr className="border-b border-border text-left text-[8px] tracking-[0.16em] text-quiet">
                {["PROCEDURE ID", "TITLE", "SYSTEM", "VERSION", "STATUS", "LAST UPDATED", "CATEGORY"].map((h) => <th key={h} className="px-3 py-2 font-medium">{h}</th>)}
              </tr>
            </thead>
            <tbody>
              {rows.map((p) => (
                <tr key={p.id} tabIndex={0} onClick={() => navigate({ search: { id: p.id } })}
                  onKeyDown={(e) => e.key === "Enter" && navigate({ search: { id: p.id } })}
                  className={`cursor-pointer border-b border-l-2 border-border/60 transition-colors last:border-b-0 hover:bg-panel-raised focus:bg-panel-raised focus:outline-none ${p.id === "CP-04" ? "border-l-healthy bg-healthy/[0.04]" : "border-l-transparent"}`}>
                  <td className="px-3 py-2.5 font-semibold">{p.id}</td>
                  <td className="px-3 py-2.5">{p.title}</td>
                  <td className="px-3 py-2.5 text-[10px] text-muted-foreground">{p.system}</td>
                  <td className="px-3 py-2.5 tabular-nums text-muted-foreground">v{p.version}</td>
                  <td className="px-3 py-2.5"><span className={`border px-1.5 py-0.5 text-[9px] ${statusCls[p.status]}`}>{p.status}</span></td>
                  <td className="px-3 py-2.5 tabular-nums text-muted-foreground">{p.updated}</td>
                  <td className="px-3 py-2.5 text-[10px] text-signal-cyan">{p.category}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>
      )}
    </NexusShell>
  );
}

function ProcedureDetail({ p, step }: { p: Procedure; step: number }) {
  const navigate = useNavigate({ from: "/procedures" });
  const s = p.steps.find((x) => x.n === step) ?? p.steps[0]!;
  const inc = incidents.find((i) => i.id === p.incident);
  const pad = (n: number) => String(n).padStart(2, "0");
  const isCP04 = p.id === "CP-04";

  return (
    <>
      <Link to="/procedures" className="mb-4 inline-flex items-center gap-1.5 font-mono text-[10px] tracking-[0.12em] text-muted-foreground hover:text-foreground">
        <ArrowLeft className="size-3.5" /> PROCEDURE LIBRARY
      </Link>
      <section className="mb-5 flex flex-col justify-between gap-4 border border-border bg-panel p-5 lg:flex-row lg:items-end">
        <div>
          <div className="mb-2 flex items-center gap-2"><span className={`border px-1.5 py-0.5 font-mono text-[9px] tracking-[0.12em] ${statusCls[p.status]}`}><ShieldCheck className="mr-1 inline size-3" />OFFICIAL PROCEDURE</span><span className="font-mono text-[9px] text-quiet">v{p.version} · UPDATED {p.updated}</span></div>
          <h1 className="font-mono text-[24px] font-semibold tracking-[0.04em]"><span className="text-healthy">{p.id}</span> {p.title}</h1>
          <p className="mt-1 text-[12px] text-muted-foreground">{p.summary}</p>
        </div>
        <div className="grid grid-cols-3 border border-border font-mono text-[10px]">
          {[["SYSTEM", p.system], ["CATEGORY", p.category], ["STATUS", p.status]].map(([k, v]) => <div key={k} className="border-r border-border px-3 py-2 last:border-r-0"><Label>{k}</Label><div className="mt-0.5">{v}</div></div>)}
        </div>
      </section>

      <div className="grid gap-5 xl:grid-cols-[340px_1fr]">
        <aside className="border border-border bg-panel">
          <div className="border-b border-border px-4 py-2.5"><Label>PROCEDURE STEPS</Label></div>
          <ol>
            {p.steps.map((x) => (
              <li key={x.n}>
                <button type="button" onClick={() => navigate({ search: { id: p.id, step: x.n }, replace: true })} aria-pressed={x.n === s.n}
                  className={`flex w-full items-start gap-3 border-b border-l-2 border-border px-4 py-3 text-left transition-colors last:border-b-0 hover:bg-panel-raised ${x.n === s.n ? "border-l-healthy bg-panel-raised" : "border-l-transparent"}`}>
                  <span className="font-mono text-[10px] text-healthy">STEP {pad(x.n)}</span>
                  <span className="flex-1 text-[12px]">{x.title}{x.relevant && <span className="mt-1 block font-mono text-[8px] tracking-[0.14em] text-warning">● RELEVANT TO CURRENT ANOMALY</span>}</span>
                </button>
              </li>
            ))}
          </ol>
          {inc && (
            <div className="border-t border-border p-4">
              <Label>RELATED HISTORICAL INCIDENT</Label>
              <Link to="/incidents" search={{ id: inc.id }} className="mt-2 flex items-center justify-between border border-signal-cyan/30 px-3 py-2 transition-colors hover:bg-signal-cyan/5">
                <div><div className="flex items-center gap-1.5 font-mono text-[12px] font-semibold text-signal-cyan"><History className="size-3.5" />{inc.id}</div><div className="text-[11px] text-muted-foreground">{inc.type} · {inc.date}</div></div>
                <ArrowRight className="size-3.5 text-signal-cyan" />
              </Link>
            </div>
          )}
        </aside>

        <div className="space-y-5">
          <section className="border border-border bg-panel">
            <div className="flex items-center justify-between border-b border-border px-5 py-3">
              <div><Label tone="text-healthy">{p.id} · STEP {pad(s.n)}</Label><h2 className="mt-1 font-mono text-[17px] font-semibold">{s.title}</h2></div>
              {s.relevant && <span className="border border-warning/35 bg-warning/10 px-2 py-0.5 font-mono text-[9px] tracking-[0.12em] text-warning">RELEVANT TO CURRENT ANOMALY</span>}
            </div>
            <dl className="grid md:grid-cols-2">
              {[["INSTRUCTION", s.instruction], ["PURPOSE", s.purpose], ["RELATED SYSTEM", s.system], ["RELATED EVIDENCE", s.evidence]].map(([k, v]) => (
                <div key={k} className="border-b border-border p-5 md:odd:border-r">
                  <dt><Label>{k}</Label></dt>
                  <dd className={`mt-1.5 text-[12px] leading-relaxed ${k === "RELATED EVIDENCE" ? "font-mono text-signal-cyan" : ""}`}>{v}</dd>
                </div>
              ))}
            </dl>
            {s.relevant && (
              <div className="p-5">
                <Label tone="text-signal-cyan">REFERENCE · OBSERVED FACT</Label>
                <p className="mt-1 font-mono text-[12px]">{s.relevant}</p>
                <p className="mt-2 text-[11px] italic text-quiet">This reference supports performing the step. It does not establish root cause.</p>
              </div>
            )}
          </section>

          {isCP04 && (
            <section className="grid gap-0 border border-border md:grid-cols-2">
              <div className="border-b border-border bg-healthy/5 p-5 md:border-b-0 md:border-r">
                <div className="mb-3 flex items-center gap-2"><BookOpen className="size-4 text-healthy" /><Label tone="text-healthy">OFFICIAL PROCEDURE · APPROVED</Label></div>
                <div className="font-mono text-[18px] font-semibold text-healthy">CP-04 • STEP 02</div>
                <div className="mt-1 text-[12px]">Verify fan power supply</div>
                <p className="mt-3 text-[11px] text-muted-foreground">Source: Flight procedure library, v4.2. Authoritative.</p>
                {s.n !== 2 && <button type="button" onClick={() => navigate({ search: { id: "CP-04", step: 2 }, replace: true })} className="mt-3 font-mono text-[9px] tracking-[0.12em] text-healthy hover:underline">VIEW STEP 02 →</button>}
              </div>
              <div className="border-2 border-dashed border-primary/45 bg-primary/5 p-5">
                <div className="mb-3 flex items-center gap-2"><Sparkles className="size-4 text-primary" /><Label tone="text-primary">AI RECOMMENDATION · GENERATED · NOT OFFICIAL</Label></div>
                <div className="font-mono text-[14px] font-semibold text-primary">Verify cooling fan power supply</div>
                <div className="mt-3"><Label>WHY RECOMMENDED</Label><p className="mt-1 text-[12px]">Fan RPM decreased (4200 → 1800, 14:31:12) before the temperature increase (14:32:04).</p></div>
                <div className="mt-4 flex items-center gap-2 border border-warning/40 bg-warning/10 px-3 py-2 font-mono text-[10px] tracking-[0.12em] text-warning"><UserCheck className="size-3.5" /> OPERATOR VERIFICATION REQUIRED</div>
              </div>
            </section>
          )}

          <div className="flex flex-wrap gap-2">
            <Button asChild className="rounded-none font-mono text-[10px] tracking-[0.12em]"><Link to="/investigation">RETURN TO INVESTIGATION <ArrowRight className="size-3.5" /></Link></Button>
            {isCP04 && <Button asChild variant="outline" className="rounded-none font-mono text-[10px] tracking-[0.12em]"><Link to="/investigation" search={{ source: "procedure" }}>VIEW IN AUDITABLE TIMELINE</Link></Button>}
          </div>
        </div>
      </div>
    </>
  );
}
