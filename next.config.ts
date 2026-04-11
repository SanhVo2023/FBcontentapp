import type { NextConfig } from "next";
const nextConfig: NextConfig = {
  serverExternalPackages: ["sharp"],
  images: {
    remotePatterns: [
      { protocol: "https", hostname: "pub-ebe397ad6fc946888f5c9aacc3cc48bb.r2.dev", pathname: "/**" },
      { protocol: "https", hostname: "zxmdegfnjbvytjnwfhfq.supabase.co", pathname: "/**" },
    ],
  },
};
export default nextConfig;
