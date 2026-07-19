"use server";
import { getWorkspace, requirePermission } from "@/lib/workspace";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";

export async function saveOutreachDraft(messageId: string, form: FormData) {
  const { supabase, organisationId, role } = await getWorkspace(); requirePermission(role, "generateOutreach");
  const subject = z.string().trim().min(2).max(200).parse(form.get("subject"));
  const body = z.string().trim().min(20).max(5000).parse(form.get("body"));
  const { error } = await supabase.from("outreach_messages").update({ subject, body, status: "draft", updated_at: new Date().toISOString() }).eq("id", messageId).eq("organisation_id", organisationId);
  if (error) throw new Error(error.message); revalidatePath(`/outreach/${messageId}`); revalidatePath("/outreach"); redirect(`/outreach/${messageId}?saved=1`);
}

export async function approveOutreachDraft(messageId: string) {
  const { supabase, user, organisationId, role } = await getWorkspace(); requirePermission(role, "generateOutreach");
  const { data: message, error } = await supabase.from("outreach_messages").update({ status: "approved", approved_by: user.id, approved_at: new Date().toISOString(), updated_at: new Date().toISOString() }).eq("id", messageId).eq("organisation_id", organisationId).eq("status", "draft").select("company_id").single();
  if (error) throw new Error(error.message);
  await supabase.from("pipeline_opportunities").update({ next_action: "Choose a recipient and create a sending draft", updated_at: new Date().toISOString() }).eq("company_id", message.company_id);
  await supabase.from("activities").insert({ organisation_id: organisationId, company_id: message.company_id, user_id: user.id, activity_type: "outreach_approved", summary: "Outreach copy approved — not sent" });
  revalidatePath(`/outreach/${messageId}`); revalidatePath("/outreach"); revalidatePath("/pipeline");
}

