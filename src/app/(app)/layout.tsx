import { AppShell } from "@/components/app-shell";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";

export default async function PrivateLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");
  const [{ data: membership }, { data: profile }] = await Promise.all([
    supabase.from("organisation_memberships").select("id").eq("user_id", user.id).eq("status", "active").limit(1).maybeSingle(),
    supabase.from("profiles").select("name").eq("id", user.id).maybeSingle(),
  ]);
  if (!membership) redirect("/unauthorised");
  return <AppShell userName={profile?.name || "Profile"}>{children}</AppShell>;
}
