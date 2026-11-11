import type { Metadata } from "next";
import { Bricolage_Grotesque, Cormorant_Garamond } from "next/font/google";
import "./globals.css";
import SplashScreen from "@/components/SplashScreen";

const bricolage = Bricolage_Grotesque({
  subsets: ["latin"],
  variable: "--font-bricolage",
  display: "swap",
});

const cormorant = Cormorant_Garamond({
  subsets: ["latin"],
  weight: ["300", "400", "500", "600", "700"],
  style: ["normal", "italic"],
  variable: "--font-cormorant",
  display: "swap",
});

export const metadata: Metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL || 'https://tuleresort.com'),
  title: {
    default: "Tule Resort | Hawassa Lakeside Luxury",
    template: "%s | Tule Resort Hawassa",
  },
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
  twitter: {
    card: "summary_large_image",
    title: "Tule Resort | Hawassa Lakeside Luxury",
    description: "Where the lake, nature and luxury meet.",
    images: ["/tule-resort-hawassa-hero.jpg"],
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={`${bricolage.variable} ${cormorant.variable}`}>
      <body>
        <SplashScreen />
        {children}
      </body>
    </html>
  );
}
