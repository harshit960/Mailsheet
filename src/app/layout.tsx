import type { Metadata, Viewport } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Mailsheet — personalised recruiter outreach, in your browser",
  description:
    "A spreadsheet for recruiter outreach. Write one template, let a model adapt it per recipient, then push each row to a Gmail draft. No accounts, no database, nothing leaves your browser.",
  robots: { index: true, follow: true },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  colorScheme: "light dark",
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body className="antialiased">{children}</body>
    </html>
  );
}
