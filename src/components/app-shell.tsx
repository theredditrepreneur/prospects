import { signOut } from "@/app/(auth)/login/actions";
import { navigation } from "@/lib/navigation";
import { LogOut, UserRound } from "lucide-react";
import Link from "next/link";
import { Brand } from "./brand";

export function AppShell({ children, userName }: { children: React.ReactNode; userName: string }) {
  return <div className="min-h-screen lg:grid lg:grid-cols-[260px_1fr]">
    <aside className="hidden border-r border-[#e7eaf0] bg-white p-5 lg:block"><Brand/><nav className="mt-9 space-y-1">{navigation.map(([name, href, Icon]) => <Link key={href} href={href} className="flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-semibold hover:bg-[#fff1e9] hover:text-[#c74c0b]"><Icon size={18}/>{name}</Link>)}</nav><div className="absolute bottom-6 rounded-xl bg-[#091f3c] p-4 text-white"><div className="text-xs text-white/60">Secure workspace</div><div className="mt-1 text-sm font-bold">The Redditrepreneur</div></div></aside>
    <main><header className="flex h-20 items-center justify-between border-b border-[#e7eaf0] bg-white px-5 md:px-8"><div><div className="label">Prospect Discovery Engine</div><div className="font-bold">Find companies worth talking to</div></div><div className="flex gap-2"><Link href="/settings/profile" className="button secondary gap-2" aria-label="Open profile settings"><UserRound size={17}/><span className="hidden md:inline">{userName}</span></Link><form action={signOut}><button className="button secondary gap-2" type="submit" aria-label="Sign out"><LogOut size={17}/><span className="hidden md:inline">Sign out</span></button></form></div></header><div className="p-5 md:p-8">{children}</div></main>
  </div>;
}
