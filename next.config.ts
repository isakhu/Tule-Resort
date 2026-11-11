import type { NextConfig } from "next";
import { getConfiguredSupabaseHostname } from "./lib/imageSrc";

const remotePatterns: NonNullable<NextConfig["images"]>["remotePatterns"] = [
  {
    protocol: "https",
    hostname: "images.unsplash.com",
    port: "",
    pathname: "/**",
  },
  {
    protocol: "https",
    hostname: "**.supabase.co",
    port: "",
    pathname: "/storage/v1/object/**",
  },
];

const supabaseHost = getConfiguredSupabaseHostname();
if (supabaseHost && !supabaseHost.endsWith(".supabase.co")) {
  remotePatterns.push({
    protocol: "https",
    hostname: supabaseHost,
    port: "",
    pathname: "/storage/v1/object/**",
  });
}

const nextConfig: NextConfig = {
  images: {
    remotePatterns,
  },
};

export default nextConfig;
