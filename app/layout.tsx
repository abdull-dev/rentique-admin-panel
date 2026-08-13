import type { Metadata } from "next";
import { Fraunces, Plus_Jakarta_Sans, IBM_Plex_Mono } from "next/font/google";
import "./globals.css";
import AuthGuard from "@/components/auth-guard";
import Sidebar from "@/components/sidebar";

const fraunces = Fraunces({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-headline",
  display: "swap",
});

const plusJakartaSans = Plus_Jakarta_Sans({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700", "800"],
  variable: "--font-body",
  display: "swap",
});

const ibmPlexMono = IBM_Plex_Mono({
  subsets: ["latin"],
  weight: ["400", "500", "600"],
  variable: "--font-mono",
  display: "swap",
});

export const metadata: Metadata = {
  title: "Dresso.io Admin",
  description: "Admin dashboard for the Dresso.io rental marketplace",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${fraunces.variable} ${plusJakartaSans.variable} ${ibmPlexMono.variable} h-full antialiased`}
    >
      <body className="font-[family-name:var(--font-body)] bg-[#FFFCF6] text-[#1C1424] antialiased min-h-full">
        <AuthGuard>
          <div className="flex min-h-screen">
            <Sidebar />
            <main className="ml-64 flex-1 bg-[#FFFCF6] p-8">
              <div className="mx-auto max-w-7xl">{children}</div>
            </main>
          </div>
        </AuthGuard>
      </body>
    </html>
  );
}
