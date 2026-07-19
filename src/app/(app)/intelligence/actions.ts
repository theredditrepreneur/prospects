"use server";

import { inngest } from "@/inngest/client";
import { getWorkspace, requirePermission } from "@/lib/workspace";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

export async function startResearch(companyId: string) {
  const { supabase, user, organisationId, role } = await getWorkspace();
  requirePermission(role, "runResearch");
  const { data: company } = await supabase.from("companies").select("id,status").eq("id", companyId).eq("organisation_id", organisationId).maybeSingle();
  if (!company || company.status !== "approved") throw new Error("Approve this prospect before starting research.");
  const { data: active } = await supabase.from("research_runs").select("id").eq("company_id", companyId).in("status", ["queued", "running"]).maybeSingle();
  if (active) redirect(`/intelligence?company=${companyId}`);
  const { data: run, error } = await supabase.from("research_runs").insert({ organisation_id: organisationId, company_id: companyId, status: "queued", progress: 0, created_by: user.id, idempotency_key: `${companyId}:${Date.now()}` }).select("id").single();
  if (error) throw new Error(error.message);
  await supabase.from("pipeline_opportunities").update({ stage: "researching", next_action: "Research in progress", updated_at: new Date().toISOString() }).eq("company_id", companyId);
  try { await inngest.send({ name: "prospects/research.requested", data: { runId: run.id, companyId, organisationId } }); }
  catch (error) { await supabase.from("research_runs").update({ status: "failed", error_message: "Could not queue research." }).eq("id", run.id); throw error; }
  revalidatePath("/intelligence"); revalidatePath("/pipeline"); redirect(`/intelligence?company=${companyId}`);
}

export async function retryResearch(runId: string, companyId: string) {
  const { supabase, organisationId, role } = await getWorkspace();
  requirePermission(role, "runResearch");
  const { data: run } = await supabase.from("research_runs").select("id,status").eq("id", runId).eq("company_id", companyId).eq("organisation_id", organisationId).maybeSingle();
  if (!run || !["queued", "failed"].includes(run.status)) throw new Error("This research job cannot be retried because it is already running or complete.");
  await supabase.from("research_runs").update({ status: "queued", progress: 0, error_message: null, started_at: null, completed_at: null }).eq("id", runId);
  await inngest.send({ name: "prospects/research.requested", data: { runId, companyId, organisationId } });
  revalidatePath("/intelligence");
  redirect(`/intelligence?company=${companyId}&retried=1`);
}

export async function approveIntelligence(intelligenceId: string, companyId: string) {
  const { supabase, user, organisationId, role } = await getWorkspace();
  requirePermission(role, "approveResearch");
  const { error } = await supabase.from("company_intelligence").update({ approved_at: new Date().toISOString(), approved_by: user.id, updated_at: new Date().toISOString() }).eq("id", intelligenceId).eq("organisation_id", organisationId).eq("company_id", companyId);
  if (error) throw new Error(error.message);
  await supabase.from("pipeline_opportunities").update({ stage: "outreach_ready", next_action: "Generate and review outreach draft", updated_at: new Date().toISOString() }).eq("company_id", companyId);
  await supabase.from("activities").insert({ organisation_id: organisationId, company_id: companyId, user_id: user.id, activity_type: "intelligence_approved", summary: "Company intelligence approved" });
  revalidatePath("/intelligence"); revalidatePath("/outreach"); revalidatePath("/pipeline");
}

export async function generateOutreach(companyId: string) {
  const { supabase, user, organisationId, role } = await getWorkspace();
  requirePermission(role, "generateOutreach");
  const { data: intelligence } = await supabase.from("company_intelligence").select("id").eq("company_id", companyId).eq("organisation_id", organisationId).not("approved_at", "is", null).maybeSingle();
  if (!intelligence) throw new Error("Approve the company intelligence before generating outreach.");
  const { data: message, error } = await supabase.from("outreach_messages").insert({ organisation_id: organisationId, company_id: companyId, channel: "email", message_type: "initial", subject: "Generating your draft…", body: "", status: "generating", generated_by: user.id }).select("id").single();
  if (error) throw new Error(error.message);
  try { await inngest.send({ name: "prospects/outreach.requested", data: { messageId: message.id, companyId, organisationId, userId: user.id } }); }
  catch (queueError) { await supabase.from("outreach_messages").update({ status: "failed", subject: "Draft generation failed", body: "Could not queue outreach generation." }).eq("id", message.id); throw queueError; }
  revalidatePath("/outreach"); revalidatePath("/pipeline"); redirect(`/outreach/${message.id}`);
}
