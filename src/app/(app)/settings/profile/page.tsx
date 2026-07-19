import { PageHeader } from "@/components/page-header";
import { SubmitButton } from "@/components/submit-button";
import { getWorkspace } from "@/lib/workspace";
import { updateProfile } from "./actions";

export default async function ProfilePage({ searchParams }: { searchParams: Promise<{ saved?: string }> }) {
  const query = await searchParams;
  const { supabase, user } = await getWorkspace();
  const { data: profile } = await supabase.from("profiles").select("name,email").eq("id", user.id).single();
  return <><PageHeader eyebrow="Personal settings" title="Your profile" description="This name appears in the application and is used to sign founder outreach drafts."/>{query.saved && <div className="mb-5 rounded-lg bg-green-50 p-3 text-sm font-bold text-green-900">Profile updated successfully.</div>}<section className="card max-w-2xl p-6"><form action={updateProfile} className="space-y-5"><label className="block text-sm font-bold">Your name<input className="mt-2" name="name" defaultValue={profile?.name || "Tonte Douglas"} autoComplete="name" required/></label><label className="block text-sm font-bold">Email<input className="mt-2 bg-[#f6f8fb]" value={profile?.email || user.email || ""} readOnly aria-readonly="true"/></label><p className="text-xs text-[#667085]">Your email is controlled by your sign-in account. Updating your name will not change your login.</p><SubmitButton idle="Save profile" pending="Saving profile…"/></form></section></>;
}
