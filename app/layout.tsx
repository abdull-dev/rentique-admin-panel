import type { Metadata } from "next";
import { Fraunces, Plus_Jakarta_Sans, IBM_Plex_Mono } from "next/font/google";
import "./globals.css";
import AuthGuard from "@/components/auth-guard";
import Sidebar from "@/components/sidebar";

const fraunces = Fraunces({ subsets: ["latin"], weight: ["400","500","600","700"], variable: "--font-headline", display: "swap" });
const plusJakartaSans = Plus_Jakarta_Sans({ subsets: ["latin"], weight: ["400","500","600","700","800"], variable: "--font-body", display: "swap" });
const ibmPlexMono = IBM_Plex_Mono({ subsets: ["latin"], weight: ["400","500","600"], variable: "--font-mono", display: "swap" });

export const metadata: Metadata = {
  title: "Dresso.io Admin",
  description: "Admin dashboard for the Dresso.io rental marketplace",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" className={`${fraunces.variable} ${plusJakartaSans.variable} ${ibmPlexMono.variable} h-full`}>
      <body className="min-h-full antialiased" style={{ fontFamily: "var(--font-body)", background: "#FFFCF6", color: "#1C1424" }}>
        <AuthGuard>
          <div className="flex min-h-screen">
            <Sidebar />
            <main className="ml-60 flex-1 p-8" style={{ background: "#FFFCF6" }}>
              <div className="mx-auto max-w-6xl">{children}</div>
            </main>
          </div>
        </AuthGuard>
      </body>
    </html>
  );
}
