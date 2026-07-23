import Image from "next/image";

export function Brand() {
  return <div className="w-full max-w-[220px]">
    <Image
      src="/brand/reddit-repreneur-wordmark.png"
      alt="The Redditrepreneur"
      width={1800}
      height={603}
      priority
      className="h-auto w-full"
    />
    <div className="mt-1 text-center text-xs font-bold text-[#667085]">Prospect Discovery Engine</div>
  </div>;
}
