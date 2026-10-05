import { useMemo, useState } from "react";
import { Link, createFileRoute, useNavigate } from "@tanstack/react-router";
import { ArrowRight, BookOpen, FileSearch, History, Info, SearchX, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Label, NexusShell, SearchBox, Select, Stat } from "@/components/nexus-ui";
import { incidents, procedures, type Incident, type Sev } from "@/lib/knowledge";

export const Route = createFileRoute("/incidents")({
  validateSearch: (s: Record<string, unknown>): { id?: string } => (typeof s["id"] === "string" ? { id: s["id"] } : {}),
  head: () => ({
    meta: [
      { title: "Incident History | NEXUS Mission Operations" },
      { name: "description", content: "Historical ORBIT-42 incident repository with similarity context, resolutions and linked procedures." },
      { property: "og:title", content: "Incident History | NEXUS Mission Operations" },
      { property: "og:description", content: "Search and compare past ORBIT-42 incidents as historical context for active anomalies." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: IncidentsPage,
});

const ALL = "ALL";
const sevRank: Record<Sev, number> = { CRITICAL: 4, HIGH: 3, MEDIUM: 2, LOW: 1 };
const sevBox: Record<Sev, string> = {
  CRITICAL: "border-critical/40 bg-critical/10 text-critical",
  HIGH: "border-warning/40 bg-warning/10 text-warning",
  MEDIUM: "border-signal-cyan/30 bg-signal-cyan/10 text-signal-cyan",
  LOW: "border-border text-muted-foreground",
};
const statusText = { RESOLVED: "text-healthy", ACTIVE: "text-warning", MONITORING: "text-signal-cyan" } as const;
const uniq = (k: keyof Incident) => [ALL, ...Array.from(new Set(incidents.map((i) => String(i[k]))))];

function simColor(n: number) {
  return n >= 80 ? "bg-signal-cyan" : n >= 50 ? "bg-signal-cyan/60" : "bg-quiet";
}

function IncidentsPage() {
  const { id } = Route.useSearch();
  const navigate = useNavigate({ from: "/incidents" });
  const [q, setQ] = useState("");
  const [sys, setSys] = useState(ALL);
  const [sev, setSev] = useState(ALL);
  const [st, setSt] = useState(ALL);
  const [type, setType] = useState(ALL);
  const [sort, setSort] = useState("SIMILARITY");
  const selected = incidents.find((i) => i.id === id) ?? null;
  const setSelected = (i: Incident | null) => navigate({ search: i ? { id: i.id } : {}, replace: true });

  const rows = useMemo(() => {
    const t = q.toLowerCase();
    const r = incidents.filter((i) =>
      (!t || [i.id, i.type, i.system, i.summary].join(" ").toLowerCase().includes(t)) &&
      (sys === ALL || i.system === sys) && (sev === ALL || i.severity === sev) &&
      (st === ALL || i.status === st) && (type === ALL || i.type === type));
    return [...r].sort((a, b) =>
      sort === "DATE" ? b.iso.localeCompare(a.iso) : sort === "SEVERITY" ? sevRank[b.severity] - sevRank[a.severity] : b.similarity - a.similarity);
  }, [q, sys, sev, st, type, sort]);

  const dirty = q || sys !== ALL || sev !== ALL || st !== ALL || type !== ALL;
  const reset = () => { setQ(""); setSys(ALL); setSev(ALL); setSt(ALL); setType(ALL); };

  return (
    <NexusShell>
      <section className="mb-5 flex flex-col justify-between gap-4 lg:flex-row lg:items-end">
        <div>
          <div className="mb-2 flex items-center gap-2 font-mono text-[9px] tracking-[0.13em] text-signal-cyan">
            <History className="size-3" /> ORBIT-42 / MISSION KNOWLEDGE
          </div>
          <h1 className="font-mono text-[23px] font-semibold tracking-[0.035em] sm:text-[27px]">INCIDENT HISTORY</h1>
          <p className="mt-1 text-[12px] text-muted-foreground">Historical incidents ranked by similarity to the active thermal anomaly. Context only — not root-cause evidence.</p>
        </div>
        <div className="grid grid-cols-4 border border-border bg-panel">
          <Stat k="TOTAL INCIDENTS" v={incidents.length} c="text-foreground" />
          <Stat k="RESOLVED" v={incidents.filter((i) => i.status === "RESOLVED").length} c="text-healthy" />
          <Stat k="ACTIVE" v={incidents.filter((i) => i.status === "ACTIVE").length} c="text-warning" />
          <Stat k="THERMAL-RELATED" v={incidents.filter((i) => i.thermal).length} c="text-signal-cyan" />
        </div>
      </section>

      <section className="mb-5 grid border border-border bg-panel md:grid-cols-4">
        {[
          ["CURRENT ANOMALY", "THERMAL 89.2°C", "text-warning", "/investigation"],
          ["HISTORICAL CONTEXT", "INC-182 • 91%", "text-signal-cyan", null],
          ["OFFICIAL PROCEDURE", "CP-04 • STEP 02", "text-healthy", "/procedures"],
          ["AI RECOMMENDATION", "VERIFY FAN POWER", "text-primary", "/investigation"],
        ].map(([k, v, c, to], i) => {
          const inner = (<><Label>{`0${i + 1} · ${k}`}</Label><div className={`mt-1 flex items-center justify-between font-mono text-[12px] ${c}`}>{v}<ArrowRight className="size-3 text-quiet" /></div></>);
          const cls = "block border-b border-border px-4 py-3 text-left transition-colors hover:bg-panel-raised md:border-b-0 md:border-r last:border-r-0";
          if (!to) return <button key={k} type="button" onClick={() => setSelected(incidents.find((x) => x.id === "INC-182")!)} className={cls}>{inner}</button>;
          if (to === "/procedures") return <Link key={k} to="/procedures" search={{ id: "CP-04", step: 2 }} className={cls}>{inner}</Link>;
          return <Link key={k} to="/investigation" className={cls}>{inner}</Link>;
        })}
      </section>

      <section className="border border-border bg-panel">
        <div className="flex flex-wrap items-center gap-2 border-b border-border p-3">
          <SearchBox value={q} onChange={setQ} placeholder="Search incident ID, type, system…" />
          <Select label="SYS" value={sys} options={uniq("system")} onChange={setSys} />
          <Select label="SEV" value={sev} options={[ALL, "CRITICAL", "HIGH", "MEDIUM", "LOW"]} onChange={setSev} />
          <Select label="STATUS" value={st} options={uniq("status")} onChange={setSt} />
          <Select label="TYPE" value={type} options={uniq("type")} onChange={setType} />
          <Select label="SORT" value={sort} options={["SIMILARITY", "DATE", "SEVERITY"]} onChange={setSort} />
        </div>
        <div className="px-3 py-2 font-mono text-[9px] tracking-[0.12em] text-muted-foreground">
          SHOWING <span className="text-foreground">{rows.length}</span> OF {incidents.length} RECORDS
          {dirty && <button type="button" onClick={reset} className="ml-3 text-primary hover:underline">RESET FILTERS</button>}
        </div>
      </section>

      {rows.length === 0 ? (
        <section className="flex flex-col items-center border border-t-0 border-border bg-panel px-6 py-14 text-center">
          <SearchX className="mb-3 size-5 text-quiet" />
          <div className="font-mono text-[13px] font-semibold tracking-[0.14em]">NO MATCHING INCIDENTS</div>
          <Button variant="outline" onClick={reset} className="mt-4 rounded-none font-mono text-[10px] tracking-[0.12em]">RESET ALL FILTERS</Button>
        </section>
      ) : (
        <section className="overflow-x-auto border border-t-0 border-border bg-panel">
          <table className="w-full min-w-[920px] border-collapse font-mono text-[11px]">
            <thead>
              <tr className="border-b border-border text-left text-[8px] tracking-[0.16em] text-quiet">
                {["INCIDENT ID", "DATE", "SYSTEM", "INCIDENT TYPE", "SEVERITY", "STATUS", "SIMILARITY"].map((h) => <th key={h} className="px-3 py-2 font-medium">{h}</th>)}
              </tr>
            </thead>
            <tbody>
              {rows.map((i) => (
                <tr key={i.id} tabIndex={0} onClick={() => setSelected(i)}
                  onKeyDown={(e) => (e.key === "Enter" || e.key === " ") && (e.preventDefault(), setSelected(i))}
                  className={`cursor-pointer border-b border-l-2 border-border/60 transition-colors last:border-b-0 hover:bg-panel-raised focus:bg-panel-raised focus:outline-none ${
                    i.id === "INC-182" ? "border-l-signal-cyan bg-signal-cyan/[0.04]" : i.status === "ACTIVE" ? "border-l-warning" : "border-l-transparent"} ${selected?.id === i.id ? "bg-panel-raised" : ""}`}>
                  <td className="px-3 py-2.5 font-semibold text-foreground">{i.id}</td>
                  <td className="px-3 py-2.5 tabular-nums text-muted-foreground">{i.date}</td>
                  <td className="px-3 py-2.5 text-[10px] tracking-[0.06em] text-muted-foreground">{i.system}</td>
                  <td className="px-3 py-2.5 font-sans text-[12px]">{i.type}</td>
                  <td className="px-3 py-2.5"><span className={`border px-1.5 py-0.5 text-[9px] ${sevBox[i.severity]}`}>{i.severity}</span></td>
                  <td className={`px-3 py-2.5 text-[10px] tracking-[0.08em] ${statusText[i.status]}`}>{i.status}</td>
                  <td className="px-3 py-2.5">
                    {i.status === "ACTIVE" ? <span className="text-[9px] tracking-[0.1em] text-warning">CURRENT</span> : (
                      <div className="flex items-center gap-2">
                        <div className="h-1 w-20 bg-border"><div className={`h-full ${simColor(i.similarity)}`} style={{ width: `${i.similarity}%` }} /></div>
                        <span className="tabular-nums text-signal-cyan">{i.similarity}%</span>
                      </div>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>
      )}

      <Sheet open={!!selected} onOpenChange={(o) => !o && setSelected(null)}>
        <SheetContent className="w-full overflow-y-auto rounded-none border-l border-border bg-panel p-0 sm:max-w-[520px]">
          {selected && <Detail i={selected} />}
        </SheetContent>
      </Sheet>
    </NexusShell>
  );
}

function Detail({ i }: { i: Incident }) {
  const proc = procedures.find((p) => p.id === i.procedure);
  const isActive = i.status === "ACTIVE";
  return (
    <div>
      <SheetHeader className="border-b border-border p-5 text-left">
        <Label tone="text-signal-cyan">{isActive ? "ACTIVE ANOMALY RECORD" : "HISTORICAL INCIDENT RECORD"}</Label>
        <SheetTitle className="font-mono text-[22px] tracking-[0.04em]">{i.id}</SheetTitle>
        <SheetDescription className="text-[12px]">{i.type}</SheetDescription>
      </SheetHeader>
      <div className="grid grid-cols-3 border-b border-border font-mono text-[11px]">
        {[["DATE", i.date], ["SYSTEM", i.system], ["TYPE", i.type], ["SEVERITY", i.severity], ["STATUS", i.status], ["SIMILARITY", isActive ? "—" : `${i.similarity}%`]].map(([k, v]) => (
          <div key={k} className="border-b border-r border-border px-4 py-2.5 [&:nth-child(3n)]:border-r-0 [&:nth-last-child(-n+3)]:border-b-0">
            <Label>{k}</Label><div className="mt-0.5 truncate">{v}</div>
          </div>
        ))}
      </div>

      <div className="space-y-5 p-5">
        {!isActive && i.similarity >= 50 && (
          <div className="border border-signal-cyan/30 border-l-2 border-l-signal-cyan bg-signal-cyan/5 p-3">
            <div className="flex items-center gap-2"><Info className="size-3.5 text-signal-cyan" /><Label tone="text-signal-cyan">HISTORICAL CONTEXT · {i.similarity}% SIMILARITY</Label></div>
            <p className="mt-1.5 text-[12px] text-foreground">Historical similarity provides contextual reference only and does not establish root cause.</p>
          </div>
        )}

        {i.id === "INC-182" && (
          <div className="border border-border">
            <div className="border-b border-border px-3 py-2"><Label tone="text-warning">RELATION TO CURRENT THERMAL ANOMALY</Label></div>
            <div className="grid grid-cols-2 font-mono text-[10px]">
              <div className="border-r border-border p-3"><Label>OBSERVED FACTS · NOW</Label>
                <ul className="mt-1.5 space-y-1 text-muted-foreground"><li>Fan 4200 → 1800 RPM <span className="text-signal-cyan">14:31:12</span></li><li>Temp 72.1 → 89.2°C <span className="text-signal-cyan">14:32:04</span></li><li>Voltage 12.1 → 11.8V</li></ul></div>
              <div className="p-3"><Label>HISTORICAL CONTEXT · INC-182</Label>
                <ul className="mt-1.5 space-y-1 text-muted-foreground"><li>Fan RPM drop preceded temp rise</li><li>Temp exceeded 80°C limit</li><li>Minor PWR-BUS-B sag</li></ul></div>
            </div>
          </div>
        )}

        <Block title="INCIDENT SUMMARY"><p className="text-[12px] leading-relaxed">{i.summary}</p></Block>
        <Block title="OBSERVED SIGNALS">
          <ul className="space-y-1">{i.signals.map((s) => <li key={s} className="flex gap-2 font-mono text-[11px]"><span className="text-signal-cyan">▸</span>{s}</li>)}</ul>
        </Block>
        <Block title="RESOLUTION"><p className={`text-[12px] ${isActive ? "text-warning" : "text-healthy"}`}>{i.resolution}</p></Block>
        <Block title="RELATED EVIDENCE">
          <div className="flex flex-wrap gap-1.5">{i.evidence.map((e) => <span key={e} className="border border-signal-cyan/30 px-1.5 py-0.5 font-mono text-[10px] text-signal-cyan">{e}</span>)}</div>
        </Block>
        {proc && (
          <Block title="RELATED PROCEDURE">
            <Link to="/procedures" search={{ id: proc.id }} className="flex items-center justify-between border border-healthy/30 border-l-2 border-l-healthy bg-healthy/5 px-3 py-2.5 transition-colors hover:bg-healthy/10">
              <div><div className="flex items-center gap-2 font-mono text-[13px] font-semibold text-healthy"><BookOpen className="size-3.5" />{proc.id}</div>
                <div className="text-[11px]">{proc.title.replace(/\b\w+/g, (w) => w[0] + w.slice(1).toLowerCase())}</div></div>
              <ArrowRight className="size-4 text-healthy" />
            </Link>
          </Block>
        )}

        {i.thermal && (
          <div className="border border-dashed border-primary/40 p-3">
            <div className="flex items-center gap-2"><Sparkles className="size-3.5 text-primary" /><Label tone="text-primary">AI RECOMMENDATION · NOT OFFICIAL</Label></div>
            <p className="mt-1 text-[12px]">See the current investigation for the AI recommendation and operator verification step.</p>
          </div>
        )}

        <div className="flex flex-wrap gap-2 border-t border-border pt-4">
          <Button asChild className="rounded-none font-mono text-[10px] tracking-[0.12em]">
            <Link to="/investigation">{isActive ? "VIEW CURRENT INVESTIGATION" : "USE AS HISTORICAL CONTEXT"} <ArrowRight className="size-3.5" /></Link>
          </Button>
          {!isActive && i.thermal && (
            <Button asChild variant="outline" className="rounded-none font-mono text-[10px] tracking-[0.12em]">
              <Link to="/investigation" search={{ source: "incident" }}><FileSearch className="size-3.5" /> VIEW IN EVIDENCE</Link>
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}

function Block({ title, children }: { title: string; children: React.ReactNode }) {
  return <div><div className="mb-1.5"><Label>{title}</Label></div>{children}</div>;
}
