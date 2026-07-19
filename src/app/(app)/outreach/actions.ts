"use server";
import { getWorkspace, requirePermission } from "@/lib/workspace";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";

export async function saveOutreachDraft(messageId: string, form: FormData) {
  const { supabase, organisationId, role } = await getWorkspace(); requirePermission(role, "generateOutreach");
  const body = z.string().trim().min(20).max(5000).parse(form.get("body"));
  const { error } = await supabase.from("outreach_messages").update({ body, status: "draft", updated_at: new Date().toISOString() }).eq("id", messageId).eq("organisation_id", organisationId);
  if (error) throw new Error(error.message); revalidatePath(`/outreach/${messageId}`); revalidatePath("/outreach"); redirect(`/outreach/${messageId}?saved=1`);
}

export async function approveOutreachSubject(messageId: string, form: FormData) {
  const { supabase, user, organisationId, role } = await getWorkspace(); requirePermission(role, "generateOutreach");
  const subject = z.string().trim().min(2).max(200).parse(form.get("subject"));
  const { data: message } = await supabase.from("outreach_messages").select("subject_options").eq("id", messageId).eq("organisation_id", organisationId).maybeSingle();
  const allowed = (Array.isArray(message?.subject_options) ? message.subject_options : []).some(option => typeof option === "object" && option !== null && "subject" in option && option.subject === subject);
  if (!allowed) throw new Error("Choose one of the generated subject lines.");
  const { error } = await supabase.from("outreach_messages").update({ subject, subject_approved_at: new Date().toISOString(), subject_approved_by: user.id, updated_at: new Date().toISOString() }).eq("id", messageId).eq("organisation_id", organisationId);
  if (error) throw new Error(error.message); revalidatePath(`/outreach/${messageId}`); revalidatePath("/outreach"); redirect(`/outreach/${messageId}?subject=approved`);
}

export async function approveOutreachDraft(messageId: string) {
  const { supabase, user, organisationId, role } = await getWorkspace(); requirePermission(role, "generateOutreach");
  const { data: ready } = await supabase.from("outreach_messages").select("subject_approved_at").eq("id", messageId).eq("organisation_id", organisationId).maybeSingle();
  if (!ready?.subject_approved_at) throw new Error("Approve a subject line before approving the email.");
  const { data: message, error } = await supabase.from("outreach_messages").update({ status: "approved", approved_by: user.id, approved_at: new Date().toISOString(), updated_at: new Date().toISOString() }).eq("id", messageId).eq("organisation_id", organisationId).eq("status", "draft").select("company_id").single();
  if (error) throw new Error(error.message);
  await supabase.from("pipeline_opportunities").update({ next_action: "Choose a recipient and create a sending draft", updated_at: new Date().toISOString() }).eq("company_id", message.company_id);
  await supabase.from("activities").insert({ organisation_id: organisationId, company_id: message.company_id, user_id: user.id, activity_type: "outreach_approved", summary: "Outreach copy approved — not sent" });
  revalidatePath(`/outreach/${messageId}`); revalidatePath("/outreach"); revalidatePath("/pipeline");
}
