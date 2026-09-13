import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  async headers() {
    return [
      {
        // Belt-and-suspenders alongside updateViaCache: "none" in
        // sw-register.tsx — an intermediary (CDN/proxy) cache honors HTTP
        // headers even when the browser's own SW update check doesn't hit one.
        source: "/sw.js",
        headers: [{ key: "Cache-Control", value: "no-cache" }],
      },
    ];
  },
};

export default nextConfig;
