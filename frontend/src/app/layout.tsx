import type { Metadata } from "next";
import "./globals.css";
import Sidebar from "@/components/layout/sidebar";
import PageTransition from "@/components/layout/page-transition";

export const metadata: Metadata = {
  title: "FRSEMS — Faculty Resume Screening",
  description:
    "Faculty Resume Screening & Eligibility Management System for Woxsen University",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <head>
        <link
          href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap"
          rel="stylesheet"
        />
      </head>
      <body className="min-h-screen bg-background antialiased">
        <Sidebar />
        <main className="ml-[260px] min-h-screen p-8">
          <PageTransition>{children}</PageTransition>
        </main>
      </body>
    </html>
  );
}
