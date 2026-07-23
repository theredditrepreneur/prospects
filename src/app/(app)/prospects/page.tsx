import Link from "next/link";
import { PageHeader } from "@/components/page-header";
import { ProspectCard, type FeedCompany } from "@/components/prospect-card";
import { getWorkspace } from "@/lib/workspace";

const columns="id,name,domain,website_url,industry,country,headquarters,employee_range,funding_stage,description,match_explanation,verification_evidence,initial_icp_match_score,created_at,saved_at,status";
const statuses=["all","approved","pending_approval","rejected"] as const;

export default async function Page({searchParams}:{searchParams:Promise<{status?:string;period?:string;score?:string;saved?:string}>}){
  const filters=await searchParams;
  const{supabase,organisationId}=await getWorkspace();
  const status=statuses.includes(filters.status as typeof statuses[number])?filters.status:"all";
  let request=supabase.from("companies").select(columns).eq("organisation_id",organisationId);
  if(status!=="all")request=request.eq("status",status);
  if(filters.period==="today"){const day=new Date();day.setHours(0,0,0,0);request=request.gte("created_at",day.toISOString())}
  if(filters.period==="week")request=request.gte("created_at",new Date(Date.now()-7*86400000).toISOString());
  if(filters.score==="high")request=request.gte("initial_icp_match_score",80);
  if(filters.saved==="1")request=request.not("saved_at","is",null);
  const{data,error}=await request.order("created_at",{ascending:false});
  if(error)throw new Error(error.message);
  const companies=(data||[]) as FeedCompany[];
  const context=filters.period==="today"?"New Today":filters.period==="week"?"New This Week":filters.score==="high"?"High Discovery Scores":filters.saved==="1"?"Recently Saved":null;
  return <><PageHeader eyebrow="Prospect Explorer" title="My Prospect List" description={context?`Showing ${context.toLowerCase()}.`:"View every discovered and manually added company, including its current review status."} action={<Link href="/dashboard" className="button secondary">Back to Opportunity Feed</Link>}/>
    <nav className="mb-6 flex flex-wrap gap-2">{statuses.map(item=>{const selected=status===item&&!context;return <Link aria-current={selected?"page":undefined} className={`rounded-xl border px-5 py-3 text-sm font-extrabold transition ${selected?"border-[#091f3c] bg-[#091f3c] text-white shadow-sm":"border-[#dfe3ea] bg-white text-[#091f3c] hover:border-orange-300 hover:bg-orange-50"}`} href={item==="all"?"/prospects":`/prospects?status=${item}`} key={item}>{item==="all"?"ALL":item.replaceAll("_"," ").toUpperCase()}</Link>})}</nav>
    {context&&<div className="mb-5 flex items-center gap-3 rounded-xl bg-orange-50 p-4"><span className="font-bold">{context}</span><Link href="/prospects" className="text-sm font-bold text-[#c74c0b]">Clear filter</Link></div>}
    {companies.length?<div className="grid gap-5 xl:grid-cols-2">{companies.map(company=><ProspectCard company={company} key={company.id}/>)}</div>:<section className="card p-16 text-center"><h2 className="text-xl font-extrabold">No prospects in this view</h2><p className="mt-2 text-sm text-[#667085]">Try another status or return to the Opportunity Feed.</p><Link href="/dashboard" className="button mt-5">Explore Prospects</Link></section>}
  </>
}
