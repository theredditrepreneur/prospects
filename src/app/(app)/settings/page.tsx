import Link from "next/link";
import { PageHeader } from "@/components/page-header";

const items = [
  ["Profile", "Your name and founder outreach identity"],
  ["Organisation", "Identity, usage controls and retention"],
  ["Integrations", "OpenAI, Firecrawl, Tavily, Inngest and Gmail"],
  ["Scoring", "Opportunity Score weights and labels"],
  ["Services", "Redditrepreneur offers and pricing"],
  ["Security", "Permissions and Gmail draft controls"],
  ["Audit logs", "Sensitive action history"],
];

export default function Page() {
  return <><PageHeader eyebrow="Configuration" title="Settings" description="Manage the private operating system without exposing credentials to browser code."/><div className="grid gap-4 md:grid-cols-2">{items.map(([name, description]) => <Link href={`/settings/${name.toLowerCase().replace(" ", "-")}`} key={name} className="card p-5 hover:border-[#f36c21]"><h2 className="font-extrabold">{name}</h2><p className="mt-1 text-sm text-[#667085]">{description}</p></Link>)}</div></>;
}
