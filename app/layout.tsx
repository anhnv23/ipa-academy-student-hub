import type { Metadata } from "next";
import "./globals.css";
import "./language.css";
import "./classes-view.css";
import "./schedule-enhancements.css";
import "./account-management.css";
import "./role-features.css";
import "./admin-v14.css";
import "./portal-live.css";

export const metadata: Metadata = {
  title: "IPA Academy Student HUB",
  description: "Cổng quản lý học viên, bài tập và tiến độ học tập của IPA English Academy.",
  icons: {
    icon: "/favicon.svg",
    shortcut: "/favicon.svg",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="vi">
      <body className="antialiased">{children}</body>
    </html>
  );
}
