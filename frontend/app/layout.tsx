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

export const metadata: Metadata = {
  title: "AgoRace - Type Fast. Cash Out.",
  description:
    "Weekly typing competition with on-chain prize pool. Pay once to enter, practice unlimited times. The fastest typist takes the entire prize pool.",
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
