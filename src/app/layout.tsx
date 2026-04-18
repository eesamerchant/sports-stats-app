import type { Metadata, Viewport } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: {
    default: "Sports Stats",
    template: "%s · Sports Stats",
  },
  description:
    "Track softball stats across leagues. One player profile, every league you play in.",
  manifest: "/manifest.webmanifest",
};

export const viewport: Viewport = {
  themeColor: "#141419",
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className="min-h-dvh antialiased">{children}</body>
    </html>
  );
}
