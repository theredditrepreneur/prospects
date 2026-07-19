import { createOutreachDraft } from "@/lib/ai/research";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { inngest } from "../client";

export const generateOutreach = inngest.createFunction({ id: "generate-outreach", retries: 2, triggers: { event: "prospects/outreach.requested" } }, async ({ event, step }) => {
  const { messageId, companyId, organisationId, userId } = event.data as { messageId: string; companyId: string; organisationId: string; userId: string };
  const admin = createSupabaseAdminClient();
  try {
    const context = await step.run("load-approved-intelligence", async () => {
      const [{ data: company }, { data: intelligence }, { data: sender }] = await Promise.all([
        admin.from("companies").select("id,name,website_url,industry").eq("id", companyId).eq("organisation_id", organisationId).single(),
        admin.from("company_intelligence").select("*").eq("company_id", companyId).eq("organisation_id", organisationId).not("approved_at", "is", null).single(),
        admin.from("profiles").select("name,email").eq("id", userId).maybeSingle(),
      ]);
      if (!company || !intelligence) throw new Error("Approved company intelligence was not found.");
      return { company, intelligence, sender: { name: sender?.name || null, role: "Founder", company: "The Redditrepreneur" } };
    });
    const draft = await step.run("write-founder-outreach", () => createOutreachDraft({ company: context.company, approved_intelligence: context.intelligence, sender: context.sender, recipient: { first_name: null, instruction: "Use Hi there, because no verified contact has been selected." } }));
    const angle = await step.run("save-outreach-angle", async () => {
      const { data, error } = await admin.from("outreach_angles").insert({ organisation_id: organisationId, company_id: companyId, title: draft.title, genuine_observation: draft.genuine_observation, evidence: draft.evidence, source_urls: context.intelligence.source_urls || [], problem_hypothesis: draft.problem_hypothesis, value_hypothesis: draft.value_hypothesis, recommended_service: context.intelligence.recommended_service, suggested_offer: draft.suggested_offer, suggested_call_to_action: draft.suggested_call_to_action, confidence_level: draft.confidence_level, status: "draft", created_by: userId }).select("id").single();
      if (error) throw error; return data;
    });
    const { error } = await admin.from("outreach_messages").update({ outreach_angle_id: angle.id, subject: draft.subject_lines[0].subject, subject_options: draft.subject_lines, body: draft.body, generation_rationale: draft.response_rationale, status: "draft", updated_at: new Date().toISOString() }).eq("id", messageId).eq("organisation_id", organisationId);
    if (error) throw error;
    await Promise.all([
      admin.from("pipeline_opportunities").update({ stage: "draft_created", next_action: "Review outreach draft", updated_at: new Date().toISOString() }).eq("company_id", companyId),
      admin.from("activities").insert({ organisation_id: organisationId, company_id: companyId, user_id: userId, activity_type: "outreach_draft_created", summary: "Outreach draft created — not sent" }),
    ]);
    return { messageId };
  } catch (error) {
    const message = error instanceof Error ? error.message : "Draft generation failed.";
    await admin.from("outreach_messages").update({ status: "failed", subject: "Draft generation failed", body: message, updated_at: new Date().toISOString() }).eq("id", messageId);
    throw error;
  }
});
