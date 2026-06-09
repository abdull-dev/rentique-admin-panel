import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import AuthGuard from "@/components/auth-guard";
import Sidebar from "@/components/sidebar";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Rentique Admin",
  description: "Admin dashboard for the Rentique rental marketplace",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full">
        <AuthGuard>
          <div className="flex min-h-screen">
            <Sidebar />
            <main className="ml-64 flex-1 bg-gray-50 p-8">
              <div className="mx-auto max-w-7xl">{children}</div>
            </main>
          </div>
        </AuthGuard>
      </body>
    </html>
  );
}
