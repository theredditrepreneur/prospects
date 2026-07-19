import Link from "next/link";
import { notFound } from "next/navigation";
import { AutoRefresh } from "@/components/auto-refresh";
import { PageHeader } from "@/components/page-header";
import { SubmitButton } from "@/components/submit-button";
import { getWorkspace } from "@/lib/workspace";
import { approveOutreachDraft, saveOutreachDraft } from "../actions";

export default async function Page({ params, searchParams }: { params: Promise<{ messageId: string }>; searchParams: Promise<{ saved?: string }> }) {
  const { messageId } = await params; const query = await searchParams;
  const { supabase, organisationId } = await getWorkspace();
  const { data: message } = await supabase.from("outreach_messages").select("id,company_id,subject,body,status,approved_at,companies(name,domain),outreach_angles(title,genuine_observation,evidence,source_urls,confidence_level)").eq("id", messageId).eq("organisation_id", organisationId).maybeSingle();
  if (!message) notFound();
  const company = Array.isArray(message.companies) ? message.companies[0] : message.companies;
  const angle = Array.isArray(message.outreach_angles) ? message.outreach_angles[0] : message.outreach_angles;
  const generating = message.status === "generating";
  return <><AutoRefresh active={generating}/><PageHeader eyebrow="Human review required" title={`Outreach for ${company?.name || "company"}`} description="Review and edit this draft. Approval does not send it."/>
    {query.saved && <div className="mb-5 rounded-lg bg-green-50 p-3 text-sm font-bold text-green-900">Draft saved.</div>}
    {generating ? <section className="card p-10 text-center" role="status" aria-live="polite"><div className="mx-auto h-3 max-w-xl overflow-hidden rounded-full bg-[#e7eaf0]"><div className="h-full w-2/3 animate-pulse rounded-full bg-[#f36c21]"/></div><h2 className="mt-6 text-xl font-extrabold">Writing your founder-style draft…</h2><p className="mt-2 text-sm text-[#667085]">The research is being turned into one focused observation. This page updates automatically.</p></section> : message.status === "failed" ? <section className="card p-8"><div className="rounded-lg bg-red-50 p-4 text-sm font-bold text-red-900">{message.body || "Draft generation failed."}</div><p className="mt-4 text-sm text-[#667085]">Return to Intelligence and generate the draft again.</p><Link href="/intelligence" className="button mt-4">Back to Intelligence</Link></section> : <div className="grid gap-6 xl:grid-cols-[1fr_.7fr]">
      <section className="card p-6"><div className="badge">{message.status} - not sent</div><form action={saveOutreachDraft.bind(null, message.id)} className="mt-5 space-y-4"><label className="block text-sm font-bold">Subject<input className="mt-2" name="subject" defaultValue={message.subject || ""} required/></label><label className="block text-sm font-bold">Message<textarea className="mt-2" name="body" rows={12} defaultValue={message.body} required/></label><div className="flex flex-wrap justify-end gap-3"><SubmitButton idle="Save edits" pending="Saving…"/></div></form>{message.status === "draft" ? <form action={approveOutreachDraft.bind(null, message.id)} className="mt-3 flex justify-end"><SubmitButton idle="Approve copy" pending="Approving…"/></form> : <div className="mt-4 rounded-lg bg-green-50 p-3 text-sm font-bold text-green-900">Copy approved. It has not been sent or added to Gmail.</div>}</section>
      <aside className="card p-6"><h2 className="text-xl font-extrabold">Evidence behind this draft</h2><h3 className="mt-5 font-extrabold">{angle?.title}</h3><p className="mt-2 text-sm">{angle?.genuine_observation}</p><p className="mt-4 text-sm text-[#667085]">{angle?.evidence}</p><p className="mt-4 text-xs font-bold">Confidence: {angle?.confidence_level || "unknown"}</p><div className="mt-5 space-y-2">{(Array.isArray(angle?.source_urls) ? angle.source_urls : []).map(url => <a className="block break-all text-xs text-[#c74c0b]" href={String(url)} target="_blank" rel="noreferrer" key={String(url)}>{String(url)}</a>)}</div></aside>
    </div>}
  </>;
}
