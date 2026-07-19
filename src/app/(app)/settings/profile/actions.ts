"use server";
import { getWorkspace } from "@/lib/workspace";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";

export async function updateProfile(form: FormData) {
  const { supabase, user, organisationId } = await getWorkspace();
  const name = z.string().trim().min(2).max(100).parse(form.get("name"));
  const { error } = await supabase.from("profiles").update({ name, updated_at: new Date().toISOString() }).eq("id", user.id);
  if (error) throw new Error(error.message);
  await supabase.auth.updateUser({ data: { full_name: name, name } });
  await supabase.from("audit_logs").insert({ organisation_id: organisationId, user_id: user.id, action: "profile_updated", entity_type: "profile", entity_id: user.id, metadata: { name } });
  revalidatePath("/", "layout");
  redirect("/settings/profile?saved=1");
}
