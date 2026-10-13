import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Tule Resort | Hawassa Lakeside Luxury",
  description: "Tule Resort, Hawassa, Sidama, Ethiopia — lakeside stays, dining, experiences and warm Ethiopian hospitality.",
  applicationName: "Tule Resort",
  manifest: "/manifest.webmanifest",
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "Tule Resort",
  },
  icons: {
    icon: "/tule-resort-mark.svg",
    apple: "/tule-resort-mark.svg",
  },
  openGraph: {
    title: "Tule Resort | Hawassa Lakeside Luxury",
    description: "Where the lake, nature and luxury meet.",
    type: "website",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
