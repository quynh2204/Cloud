import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Allow dev-origin requests (e.g. accessing the app via local network IP)
  // Add any network host you use for development (IP or origin).
  // This prevents the dev client from blocking HMR/websocket requests.
  allowedDevOrigins: [
    "http://localhost:3000",
    "http://localhost:3001",
    "http://192.168.1.23:3000",
    "http://192.168.1.23:3001",
  ],
};

export default nextConfig;
