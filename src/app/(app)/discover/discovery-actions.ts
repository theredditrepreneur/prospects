"use server";
import { inngest } from "@/inngest/client";
import { getWorkspace,requirePermission } from "@/lib/workspace";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";

export async function startDiscovery(form:FormData){const{supabase,user,organisationId,role}=await getWorkspace();requirePermission(role,"runDiscovery");const icpId=z.string().uuid().parse(form.get("icp_id"));const limit=z.coerce.number().int().min(5).max(50).parse(form.get("limit"));const{data:icp}=await supabase.from("icps").select("id").eq("id",icpId).eq("organisation_id",organisationId).eq("is_active",true).maybeSingle();if(!icp)throw new Error("Select an active ICP.");const{data:run,error}=await supabase.from("discovery_runs").insert({organisation_id:organisationId,icp_id:icpId,status:"queued",search_provider:"tavily",created_by:user.id}).select("id").single();if(error)throw new Error(error.message);try{await inngest.send({name:"prospects/discovery.requested",data:{runId:run.id,icpId,organisationId,limit}});}catch(error){await supabase.from("discovery_runs").update({status:"failed",error_message:"Could not queue the discovery job."}).eq("id",run.id);throw error;}await supabase.from("audit_logs").insert({organisation_id:organisationId,user_id:user.id,action:"discovery_started",entity_type:"discovery_run",entity_id:run.id,metadata:{icp_id:icpId,limit}});revalidatePath("/discover");redirect(`/discover/${run.id}`);}
