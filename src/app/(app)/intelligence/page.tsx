import { AutoRefresh } from "@/components/auto-refresh";
import { PageHeader } from "@/components/page-header";
import { SubmitButton } from "@/components/submit-button";
import { getWorkspace } from "@/lib/workspace";
import { approveIntelligence, generateOutreach, startResearch } from "./actions";

const list = (value: unknown) => Array.isArray(value) ? value.map(String) : [];
export default async function Page() {
  const { supabase, organisationId } = await getWorkspace();
  const [{ data: companies }, { data: runs }, { data: records }] = await Promise.all([
    supabase.from("companies").select("id,name,domain,industry,status,last_researched_at,pipeline_opportunities(stage)").eq("organisation_id", organisationId).eq("status", "approved").order("updated_at", { ascending: false }),
    supabase.from("research_runs").select("id,company_id,status,progress,error_message,created_at").eq("organisation_id", organisationId).order("created_at", { ascending: false }),
    supabase.from("company_intelligence").select("*").eq("organisation_id", organisationId).order("generated_at", { ascending: false }),
  ]);
  const active = runs?.some(run => ["queued", "running"].includes(run.status)) || false;
  return <><AutoRefresh active={active}/><PageHeader eyebrow="Intelligence workspace" title="Company intelligence" description="Research approved prospects, review sourced findings and approve them before outreach."/>
    <div className="space-y-6">{companies?.map(company => { const run = runs?.find(item => item.company_id === company.id); const intelligence = records?.find(item => item.company_id === company.id); return <section className="card p-6" key={company.id}>
      <div className="flex flex-wrap items-start justify-between gap-4"><div><h2 className="text-xl font-extrabold">{company.name}</h2><p className="text-sm text-[#667085]">{company.domain} · {company.industry || "Industry unknown"}</p></div>{!intelligence && !["queued", "running"].includes(run?.status || "") && <form action={startResearch.bind(null, company.id)}><SubmitButton idle={run?.status === "failed" ? "Retry research" : "Run research"} pending="Starting research…"/></form>}</div>
      {run && ["queued", "running"].includes(run.status) && <div className="mt-5"><div className="flex justify-between text-sm font-bold"><span>Researching verified sources…</span><span>{run.progress}%</span></div><div className="mt-2 h-3 overflow-hidden rounded-full bg-[#e7eaf0]"><div className="h-full rounded-full bg-[#f36c21]" style={{width:`${Math.max(3,run.progress)}%`}}/></div><p className="mt-2 text-xs text-[#667085]">Updates automatically. You can leave this page safely.</p></div>}
      {run?.status === "failed" && !intelligence && <div className="mt-4 rounded-lg bg-red-50 p-3 text-sm font-bold text-red-900">{run.error_message || "Research failed."}</div>}
      {intelligence && <div className="mt-6 space-y-5"><div><h3 className="font-extrabold">Executive summary</h3><p className="mt-2 text-sm">{intelligence.executive_summary}</p></div><div className="grid gap-5 md:grid-cols-2"><Insight title="Products and services" items={list(intelligence.products_and_services)}/><Insight title="Recent priorities" items={list(intelligence.recent_priorities)}/><Insight title="Potential pain points" items={list(intelligence.potential_pain_points)}/><Insight title="Community Intelligence opportunities" items={list(intelligence.community_intelligence_opportunities)}/><Insight title="Known unknowns" items={list(intelligence.known_unknowns)}/><div className="rounded-xl bg-[#f6f8fb] p-4"><h3 className="font-extrabold">Recommended next step</h3><p className="mt-2 text-sm">{intelligence.recommended_next_action}</p><p className="mt-2 text-xs font-bold text-[#667085]">Confidence: {intelligence.confidence_level}</p></div></div><details><summary className="cursor-pointer font-bold">View {list(intelligence.source_urls).length} sources</summary><ul className="mt-2 space-y-1 text-xs">{list(intelligence.source_urls).map(url => <li key={url}><a className="text-[#c74c0b]" href={url} target="_blank" rel="noreferrer">{url}</a></li>)}</ul></details>
        <div className="flex flex-wrap gap-3">{!intelligence.approved_at ? <form action={approveIntelligence.bind(null, intelligence.id, company.id)}><SubmitButton idle="Approve intelligence" pending="Approving…"/></form> : <><span className="badge">Intelligence approved</span><form action={generateOutreach.bind(null, company.id)}><SubmitButton idle="Generate outreach draft" pending="Generating draft…"/></form></>}</div>
      </div>}
    </section>; })}{!companies?.length && <section className="card p-14 text-center"><h2 className="text-xl font-extrabold">No approved prospects yet</h2><p className="mt-2 text-sm text-[#667085]">Approve a prospect first, then return here to run research.</p></section>}</div>
  </>;
}
function Insight({ title, items }: { title: string; items: string[] }) { return <div className="rounded-xl bg-[#f6f8fb] p-4"><h3 className="font-extrabold">{title}</h3>{items.length ? <ul className="mt-2 list-disc space-y-1 pl-5 text-sm">{items.map((item, index) => <li key={`${item}-${index}`}>{item}</li>)}</ul> : <p className="mt-2 text-sm text-[#667085]">Unknown</p>}</div>; }
