"use server";
import { bootstrapInitialOwner } from "@/lib/supabase/admin";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { z } from "zod";

const credentialsSchema = z.object({ email: z.string().trim().email(), password: z.string().min(8).max(200) });
function loginError(message: string): never { redirect(`/login?error=${encodeURIComponent(message)}`); }

export async function signIn(formData: FormData) {
  const parsed = credentialsSchema.safeParse({ email: formData.get("email"), password: formData.get("password") });
  if (!parsed.success) loginError("Enter a valid email address and password.");
  let supabase;
  try { supabase = await createSupabaseServerClient(); }
  catch { loginError("Authentication is not configured. Contact the administrator."); }
  const { data, error } = await supabase.auth.signInWithPassword(parsed.data);
  if (error || !data.user) loginError("The email or password is incorrect.");
  try { await bootstrapInitialOwner(data.user); }
  catch { await supabase.auth.signOut(); loginError("Your account could not be initialised. Contact the administrator."); }
  const { data: membership } = await supabase.from("organisation_memberships").select("id").eq("user_id", data.user.id).eq("status", "active").limit(1).maybeSingle();
  if (!membership) { await supabase.auth.signOut(); loginError("This account has not been authorised for the workspace."); }
  redirect("/dashboard");
}

export async function signOut() {
  const supabase = await createSupabaseServerClient();
  await supabase.auth.signOut();
  redirect("/login");
}
