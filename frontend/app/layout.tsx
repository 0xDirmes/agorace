import type { Metadata } from "next";
import localFont from "next/font/local";
import "./globals.css";
import { WagmiProvider } from "@/components/providers/WagmiProvider";

const geistSans = localFont({
  src: "./fonts/GeistVF.woff",
  variable: "--font-geist-sans",
  weight: "100 900",
});
const geistMono = localFont({
  src: "./fonts/GeistMonoVF.woff",
  variable: "--font-geist-mono",
  weight: "100 900",
});

const siteUrl = "https://agora-type.vercel.app";

export const metadata: Metadata = {
  title: "AgoRace - Type Fast. Cash Out.",
  description:
    "Weekly typing competition with on-chain prize pool. Pay 1 AUSD per attempt — the fastest typist takes the entire pot.",
  metadataBase: new URL(siteUrl),
  openGraph: {
    title: "AgoRace - Type Fast. Cash Out.",
    description:
      "Weekly typing competition with on-chain prize pool. Pay 1 AUSD per attempt — the fastest typist takes the entire pot.",
    url: siteUrl,
    siteName: "AgoRace",
    type: "website",
  },
  twitter: {
    card: "summary",
    title: "AgoRace - Type Fast. Cash Out.",
    description:
      "Weekly typing competition with on-chain prize pool. Pay 1 AUSD per attempt — the fastest typist takes the entire pot.",
    creator: "@Dirmes1",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="dark">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased min-h-screen bg-background`}
      >
        <WagmiProvider>{children}</WagmiProvider>
      </body>
    </html>
  );
}
