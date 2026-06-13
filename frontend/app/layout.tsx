import type { Metadata } from "next";
import { AppLayout } from "@/components/layout/AppLayout";
import "./globals.css";

export const metadata: Metadata = {
  title: "QuickMate ERP",
  description: "Manufacturing ERP Platform",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="antialiased min-h-screen">
        {/*
          AppLayout handles two cases internally:
          1. Auth pages (/login, /signup) → renders children directly, no sidebar
          2. Protected pages → renders with sidebar + header + auth guard
        */}
        <AppLayout>{children}</AppLayout>
      </body>
    </html>
  );
}
