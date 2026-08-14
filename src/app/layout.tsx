import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Tule Resort Hawassa | Relax. Enjoy. Remember.",
  description: "Tule Resort Hawassa — dining, accommodation, wellness, leisure and guest services in one luxury experience.",
  applicationName: "Tule Resort",
  openGraph: {
    title: "Tule Resort Hawassa",
    description: "Relax. Enjoy. Remember.",
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