import Link from "next/link";
import { PageHeader } from "@/components/page-header";
import { SubmitButton } from "@/components/submit-button";
import { getWorkspace } from "@/lib/workspace";
import { addCompany } from "../workspace-actions";
import { startDiscovery, updateDiscoveryThreshold } from "./discovery-actions";

export default async function CompanyDiscovery({searchParams}:{searchParams:Promise<{threshold_saved?:string;threshold_error?:string}>}) {
  const query=await searchParams;
  const { supabase, organisationId } = await getWorkspace();
  const [{ data: icps }, { data: runs }, { data: organisation }] = await Promise.all([
    supabase.from("icps").select("id,name").eq("organisation_id", organisationId).eq("is_active", true).order("name"),
    supabase.from("discovery_runs").select("id,status,companies_found,companies_imported,minimum_match_score,created_at,icps(name)").eq("organisation_id", organisationId).order("created_at", { ascending: false }).limit(8),
    supabase.from("organisations").select("discovery_match_threshold").eq("id", organisationId).single(),
  ]);
  return <>
    <PageHeader eyebrow="Buyer Discovery" title="Find Companies Worth Talking To" description="Refresh your Opportunity Feed with companies showing credible Community Intelligence buying signals." />
    {query.threshold_saved&&<div className="mb-5 rounded-xl border border-green-200 bg-green-50 p-4 text-sm font-bold text-green-900">Opportunity threshold saved at {query.threshold_saved}.</div>}
    {query.threshold_error&&<div className="mb-5 rounded-xl border border-red-200 bg-red-50 p-4 text-sm font-bold text-red-900">Threshold was not saved: {query.threshold_error}.</div>}
    <div className="grid gap-6 lg:grid-cols-2">
      <section className="card p-6">
        <h2 className="text-xl font-extrabold">Discover potential buyers</h2>
        {icps?.length ? <form action={startDiscovery}>
          <label className="mt-5 block text-sm font-bold">Discovery profile<select name="icp_id" className="mt-2" required>{icps.map(icp => <option value={icp.id} key={icp.id}>{icp.name}</option>)}</select></label>
          <label className="mt-4 block text-sm font-bold">Maximum qualified companies<select name="limit" className="mt-2" defaultValue="20"><option value="10">10</option><option value="20">20 (recommended)</option><option value="50">50</option></select></label>
          <div className="mt-5 [&>button]:w-full"><SubmitButton idle="Discover companies" pending="Starting discovery…" /></div>
        </form> : <div className="mt-5 rounded-xl border border-orange-200 bg-orange-50 p-4"><h3 className="font-extrabold">Create an ICP first</h3><p className="mt-1 text-sm text-[#667085]">Define the companies and signals you want to target.</p><Link href="/icps/new" className="button mt-4">Create ICP</Link></div>}
        <p className="mt-3 text-xs text-[#667085]">Discovery ranks how worthwhile each company is to contact about Community Intelligence. Only evidenced buyer opportunities above your threshold become Potential Prospects.</p>
      </section>
      <section className="space-y-6">
        <div className="card p-6"><h2 className="text-xl font-extrabold">Opportunity threshold</h2><p className="mt-2 text-sm text-[#667085]">Only companies at or above this buyer likelihood score are shown. Scores above 80 require explicit evidence of a real Community Intelligence problem.</p><form action={updateDiscoveryThreshold} className="mt-4 flex gap-3"><input name="threshold" type="number" min="0" max="100" step="1" defaultValue={organisation?.discovery_match_threshold ?? 70} /><button className="button secondary">Save threshold</button></form></div>
        <div className="card p-6"><h2 className="text-xl font-extrabold">Add a company manually</h2><form action={addCompany}><label className="mt-5 block text-sm font-bold">Company name<input name="name" className="mt-2" placeholder="Company name" required /></label><label className="mt-4 block text-sm font-bold">Website URL<input name="website_url" className="mt-2" type="url" placeholder="https://example.com" required /></label><button className="button secondary mt-5 w-full">Add to approval queue</button></form></div>
      </section>
    </div>
    <section className="card mt-6 overflow-hidden"><div className="p-6"><h2 className="text-xl font-extrabold">Recent Company Discovery runs</h2></div>{runs?.length ? <table><thead><tr><th>ICP</th><th>Status</th><th>Candidate domains</th><th>Potential Prospects</th><th>Threshold</th><th>Started</th></tr></thead><tbody>{runs.map(run => { const icp = Array.isArray(run.icps) ? run.icps[0] : run.icps; return <tr key={run.id}><td><Link className="font-bold" href={`/discover/${run.id}`}>{icp?.name || "ICP"}</Link></td><td><span className="badge">{run.status}</span></td><td>{run.companies_found || 0}</td><td>{run.companies_imported || 0}</td><td>{run.minimum_match_score || 70}+</td><td>{new Date(run.created_at).toLocaleString("en-GB")}</td></tr>; })}</tbody></table> : <div className="p-12 text-center text-sm text-[#667085]">No Company Discovery runs yet.</div>}</section>
  </>;
}
