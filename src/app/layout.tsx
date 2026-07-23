import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: { default: "The Redditrepreneur Prospect Discovery Engine", template: "%s | The Redditrepreneur" },
  description: "The Redditrepreneur private prospect intelligence and revenue operating system.",
  icons: { icon: "/icon.png", apple: "/apple-icon.png" },
  robots: { index: false, follow: false, nocache: true, googleBot: { index: false, follow: false, noimageindex: true } },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return <html lang="en"><body>{children}</body></html>;
}
