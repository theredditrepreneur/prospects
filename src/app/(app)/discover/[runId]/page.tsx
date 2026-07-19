import Link from "next/link";
import { notFound } from "next/navigation";
import { DiscoveryProgress } from "@/components/discovery-progress";
import { PageHeader } from "@/components/page-header";
import { getWorkspace } from "@/lib/workspace";
import { setProspectStatus } from "../../workspace-actions";

export const dynamic = "force-dynamic";

export default async function Page({ params }: { params: Promise<{ runId: string }> }) {
  const { runId } = await params;
  const { supabase, organisationId } = await getWorkspace();
  const [{ data: run }, { data: companies }, { data: candidates }] = await Promise.all([
    supabase.from("discovery_runs").select("id,status,progress,current_step,candidates_verified,candidates_rejected,companies_found,companies_imported,minimum_match_score,error_message,created_at,completed_at,icps(name)").eq("id", runId).eq("organisation_id", organisationId).maybeSingle(),
    supabase.from("companies").select("id,name,domain,website_url,industry,country,employee_range,status,match_explanation,verification_evidence,discovery_confidence,initial_icp_match_score,source_urls").eq("discovery_run_id", runId).eq("organisation_id", organisationId).eq("verified_company", true).order("initial_icp_match_score", { ascending: false }),
    supabase.from("discovery_candidates").select("id,domain,website_url,company_name,status,match_score,rejection_reason").eq("discovery_run_id", runId).eq("organisation_id", organisationId).in("status", ["rejected", "error"]).order("match_score", { ascending: false, nullsFirst: false }).limit(50),
  ]);
  if (!run) notFound();
  const icp = Array.isArray(run.icps) ? run.icps[0] : run.icps;
  const active = ["queued", "running"].includes(run.status);

  return <>
    <PageHeader eyebrow="Company Discovery" title={icp?.name || "Potential Prospects"} description="Every prospect is a verified operating company that passed the initial ICP quality gate." />
    <DiscoveryProgress active={active} progress={run.progress ?? (run.status === "completed" ? 100 : 0)} step={run.current_step || (active ? "Preparing company verification…" : "Discovery finished.")} />
    <div className="mb-5 flex flex-wrap gap-3"><span className="badge">{run.status}</span><span className="badge">{run.companies_found || 0} candidate domains</span><span className="badge">{run.candidates_verified || 0} websites checked</span><span className="badge">{run.companies_imported || 0} Potential Prospects</span><span className="badge">Threshold {run.minimum_match_score || 70}+</span></div>
    {run.status === "failed" && <div role="alert" className="mb-5 rounded-xl border border-red-200 bg-red-50 p-4 text-sm font-bold text-red-900">{run.error_message || "Company Discovery failed."}</div>}
    <section className="card overflow-hidden">
      <div className="p-6"><h2 className="text-xl font-extrabold">Potential Prospects</h2></div>
      {companies?.length ? <div className="overflow-x-auto"><table><thead><tr><th>Company</th><th>Website</th><th>Industry</th><th>Country</th><th>Employees</th><th>ICP Match</th><th>Reason it matches</th><th>Evidence</th><th>Confidence</th><th>Status</th><th>Decision</th></tr></thead><tbody>{companies.map(c => <tr key={c.id}><td><Link href={`/prospects/${c.id}`} className="font-extrabold">{c.name}</Link></td><td><a className="font-bold text-[#c74c0b]" href={c.website_url} target="_blank" rel="noreferrer">{c.domain}</a></td><td>{c.industry || "Unknown"}</td><td>{c.country || "Unknown"}</td><td>{c.employee_range || "Unknown"}</td><td><span className="badge">{c.initial_icp_match_score}/100</span></td><td className="min-w-72">{c.match_explanation}</td><td className="min-w-64 text-xs text-[#667085]">{Array.isArray(c.verification_evidence) ? c.verification_evidence.join(" · ") : "Verified from company website"}</td><td><span className="badge">{c.discovery_confidence}</span></td><td>{c.status.replaceAll("_", " ")}</td><td><div className="flex gap-2"><form action={setProspectStatus.bind(null, c.id, "approved")}><button className="button py-2">Approve</button></form><form action={setProspectStatus.bind(null, c.id, "rejected")}><button className="button secondary py-2">Reject</button></form></div></td></tr>)}</tbody></table></div> : <div className="p-14 text-center text-sm text-[#667085]">{active ? "Potential Prospects will appear automatically after verification." : "No candidate met every company and ICP quality requirement. See the quality gate report below for the reasons."}</div>}
    </section>
    {!active && candidates?.length ? <section className="card mt-6 overflow-hidden"><div className="p-6"><h2 className="text-xl font-extrabold">Quality gate report</h2><p className="mt-2 text-sm text-[#667085]">These domains were checked but were not added as prospects.</p></div><div className="overflow-x-auto"><table><thead><tr><th>Candidate</th><th>Status</th><th>ICP Match</th><th>Why it was not added</th></tr></thead><tbody>{candidates.map(candidate => <tr key={candidate.id}><td><a className="font-bold text-[#c74c0b]" href={candidate.website_url} target="_blank" rel="noreferrer">{candidate.company_name || candidate.domain}</a><div className="text-xs text-[#667085]">{candidate.domain}</div></td><td><span className="badge">{candidate.status === "error" ? "Could not verify" : "Did not qualify"}</span></td><td>{candidate.match_score == null ? "—" : `${candidate.match_score}/100`}</td><td className="min-w-80">{candidate.rejection_reason || "The candidate did not pass every quality requirement."}</td></tr>)}</tbody></table></div></section> : null}
  </>;
}
