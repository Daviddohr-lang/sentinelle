/** @type {import('next').NextConfig} */
const nextConfig = {
  typedRoutes: false,
  output: "standalone",
  experimental: {
    useWasmBinary: true
  },
  poweredByHeader: false,
  reactStrictMode: true,
  images: {
    remotePatterns: []
  },
  headers: async () => [
    {
      source: "/(.*)",
      headers: [
        { key: "X-Frame-Options", value: "DENY" },
        { key: "X-Content-Type-Options", value: "nosniff" },
        { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
        { key: "Permissions-Policy", value: "camera=(self), microphone=(self), geolocation=(self)" }
      ]
    }
  ]
};

export default nextConfig;
