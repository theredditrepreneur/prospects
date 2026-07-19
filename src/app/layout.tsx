import type { Metadata } from "next";import "./globals.css";
export const metadata:Metadata={title:{default:"Prospect Intelligence OS",template:"%s | Prospect Intelligence OS"},description:"The Redditrepreneur private prospect intelligence and revenue operating system.",robots:{index:false,follow:false,nocache:true,googleBot:{index:false,follow:false,noimageindex:true}}};
export default function RootLayout({children}:{children:React.ReactNode}){return <html lang="en"><body>{children}</body></html>}
