import { buildDiscoveryQueries,normaliseResults } from "@/lib/discovery";
import { TavilySearchProvider } from "@/lib/providers/search";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { inngest } from "../client";

export const discoverProspects=inngest.createFunction({id:"discover-prospects",retries:3,triggers:{event:"prospects/discovery.requested"}},async({event,step})=>{
  const{runId,icpId,organisationId,limit}=event.data as {runId:string;icpId:string;organisationId:string;limit:number};
  const admin=createSupabaseAdminClient();
  await step.run("mark-running",()=>admin.from("discovery_runs").update({status:"running",started_at:new Date().toISOString()}).eq("id",runId));
  try{
    const icp=await step.run("load-icp",async()=>{const{data,error}=await admin.from("icps").select("name,industries,countries,keywords,required_signals").eq("id",icpId).eq("organisation_id",organisationId).single();if(error||!data)throw new Error("ICP not found");return data;});
    const queries=buildDiscoveryQueries(icp);const apiKey=process.env.TAVILY_API_KEY;if(!apiKey)throw new Error("TAVILY_API_KEY is not configured");const provider=new TavilySearchProvider(apiKey);
    const results=await step.run("search-public-web",async()=>{const perQuery=Math.max(5,Math.ceil(limit/queries.length));const groups=await Promise.all(queries.map(async query=>(await provider.search(query,perQuery)).map(result=>({...result,query}))));return groups.flat()});
    const candidates=normaliseResults(results).slice(0,limit);const domains=candidates.map(x=>x.domain);const{data:existing}=domains.length?await admin.from("companies").select("domain").eq("organisation_id",organisationId).in("domain",domains):{data:[]};const existingDomains=new Set(existing?.map(x=>x.domain));const fresh=candidates.filter(x=>!existingDomains.has(x.domain));let imported=0;
    if(fresh.length){const{data,error:insertError}=await admin.from("companies").insert(fresh.map(x=>({organisation_id:organisationId,name:x.name,domain:x.domain,website_url:x.websiteUrl,source:"tavily",source_urls:[x.sourceUrl],discovery_run_id:runId,status:"pending_approval",match_explanation:`Matched public search: ${x.matchedQuery}`,discovery_evidence:x.evidence,discovery_confidence:"unverified"}))).select("id");if(insertError)throw insertError;imported=data?.length||0;}
    await admin.from("discovery_runs").update({status:"completed",search_query:queries.join(" | "),companies_found:candidates.length,companies_imported:imported,completed_at:new Date().toISOString()}).eq("id",runId);return{found:candidates.length,imported};
  }catch(error){await admin.from("discovery_runs").update({status:"failed",error_message:error instanceof Error?error.message:"Discovery failed",completed_at:new Date().toISOString()}).eq("id",runId);throw error;}
});
