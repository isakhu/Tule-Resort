import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL || 'https://tuleresort.com'),
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
    icon: [
      { url: "/tule-resort-logo.png", sizes: "any" },
      { url: "/favicon.ico", sizes: "any" },
    ],
    apple: "/tule-resort-logo.png",
  },
  openGraph: {
    title: "Tule Resort | Hawassa Lakeside Luxury",
    description: "Where the lake, nature and luxury meet.",
    type: "website",
    images: [
      {
        url: "/tule-resort-logo.png",
        width: 1024,
        height: 1024,
        alt: "Tule Resort Emblem",
      },
    ],
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
