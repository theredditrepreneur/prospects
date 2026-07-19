import { createClient, type User } from "@supabase/supabase-js";

export function createSupabaseAdminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error("Supabase owner bootstrap is not configured.");
  return createClient(url, key, { auth: { autoRefreshToken: false, persistSession: false } });
}

const services = [
  ["Community Intelligence Audit", "£349", "A one-off intelligence report analysing community conversations, sentiment, competitor positioning, customer language and strategic opportunities."],
  ["Community Intelligence Retainer", "From £995 per month", "Ongoing Community Intelligence monitoring, reporting, trend analysis, competitor tracking and strategic guidance."],
  ["Community Intelligence Workshop", "£1,495", "A half-day workshop helping teams understand and apply Community Intelligence."],
  ["AI Authority Audit", "£1,495", "An audit of the evidence, community conversations and authority signals shaping how AI systems understand and recommend a brand."],
  ["Reddit Authenticity and Risk Audit", "Configurable", "An assessment of Reddit reputation, authenticity risks, community perceptions and potential areas of exposure."],
  ["Fractional Chief Community Intelligence Officer", "£5,000 per month", "Executive Community Intelligence leadership covering research, AI Authority, narrative monitoring, scorecards and strategic advisory."],
] as const;

export async function bootstrapInitialOwner(user: User) {
  const expectedEmail = process.env.INITIAL_OWNER_EMAIL?.trim().toLowerCase();
  const email = user.email?.trim().toLowerCase();
  if (!expectedEmail || !email || email !== expectedEmail) return;
  const admin = createSupabaseAdminClient();
  const name = String(user.user_metadata?.full_name || user.user_metadata?.name || email.split("@")[0]);
  const { error: profileError } = await admin.from("profiles").upsert({ id: user.id, auth_provider_id: user.id, name, email, avatar_url: user.user_metadata?.avatar_url ?? null, last_active_at: new Date().toISOString() });
  if (profileError) throw profileError;
  const { data: existingOrganisation, error: organisationError } = await admin.from("organisations").select("id").eq("slug", "the-reddit-repreneur").maybeSingle();
  if (organisationError) throw organisationError;
  let organisation = existingOrganisation;
  if (!organisation) {
    const result = await admin.from("organisations").insert({ name: "The Redditrepreneur", slug: "the-reddit-repreneur" }).select("id").single();
    if (result.error) throw result.error;
    organisation = result.data;
  }
  const { error: membershipError } = await admin.from("organisation_memberships").upsert({ organisation_id: organisation.id, user_id: user.id, invited_email: email, role: "owner", status: "active" }, { onConflict: "organisation_id,user_id" });
  if (membershipError) throw membershipError;
  const { count } = await admin.from("services").select("id", { count: "exact", head: true }).eq("organisation_id", organisation.id);
  if (!count) {
    const { error: servicesError } = await admin.from("services").insert(services.map(([serviceName, priceLabel, description]) => ({ organisation_id: organisation.id, name: serviceName, price_label: priceLabel, description })));
    if (servicesError) throw servicesError;
  }
  await admin.from("audit_logs").insert({ organisation_id: organisation.id, user_id: user.id, action: "initial_owner_bootstrapped", entity_type: "organisation_membership", entity_id: user.id, metadata: { email } });
}
