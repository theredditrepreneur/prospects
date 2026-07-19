import { can, type Permission, type Role } from "@/lib/auth/permissions";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";

export async function getWorkspace() {
  const supabase = await createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");
  const { data: membership } = await supabase.from("organisation_memberships").select("organisation_id, role").eq("user_id", user.id).eq("status", "active").limit(1).single();
  if (!membership) redirect("/unauthorised");
  return { supabase, user, organisationId: membership.organisation_id as string, role: membership.role as Role };
}

export function requirePermission(role: Role, permission: Permission) {
  if (!can(role, permission)) throw new Error("You do not have permission to perform this action.");
}
