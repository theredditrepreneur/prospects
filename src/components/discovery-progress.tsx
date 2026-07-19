"use client";

import { useRouter } from "next/navigation";
import { useEffect } from "react";

export function DiscoveryProgress({ active, progress, step }: { active: boolean; progress: number; step: string }) {
  const router = useRouter();
  const safeProgress = Math.max(0, Math.min(progress, 100));

  useEffect(() => {
    if (!active) return;
    const timer = window.setInterval(() => router.refresh(), 4000);
    return () => window.clearInterval(timer);
  }, [active, router]);

  return <div className="card mb-5 p-6" role="status" aria-live="polite">
    <div className="flex items-center justify-between gap-4">
      <div>
        <h2 className="font-extrabold">{active ? "Company Discovery in progress" : "Company Discovery finished"}</h2>
        <p className="mt-1 text-sm text-[#667085]">{step || "Preparing company verification…"}</p>
      </div>
      <strong>{safeProgress}%</strong>
    </div>
    <div className="mt-4 h-3 overflow-hidden rounded-full bg-[#e7eaf0]">
      <div className="h-full rounded-full bg-[#f36c21] transition-all duration-700" style={{ width: `${active ? Math.max(3, safeProgress) : safeProgress}%` }} />
    </div>
    {active && <p className="mt-3 text-xs text-[#667085]">This page updates automatically. You can leave and return without stopping the background job.</p>}
  </div>;
}
