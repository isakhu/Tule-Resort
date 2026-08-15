import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Tule Resort | Hawassa Lakeside Luxury",
  description: "Tule Resort, Hawassa, Sidama, Ethiopia — lakeside stays, dining, experiences and warm Ethiopian hospitality.",
  applicationName: "Tule Resort",
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
