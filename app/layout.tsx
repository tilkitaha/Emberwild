import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Emberwild — A Living World",
  description: "Enter a woodland settlement where six autonomous inhabitants explore, form friendships, and remember their encounters.",
  other: {
    "codex-preview": "development",
  },
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
    <html lang="en">
      <body className="antialiased">{children}</body>
    </html>
  );
}
