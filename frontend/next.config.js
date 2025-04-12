/** @type {import('next').NextConfig} */
const nextConfig = {
  async rewrites() {
    return [
      {
        source: "/api/:path*",
        destination: process.env.NODE_ENV === "production"
          ? `${process.env.BACKEND_URL || "http://localhost:5000"}/api/:path*`
          : "http://localhost:5000/api/:path*",
      },
    ];
  },
  reactStrictMode: true,
};

module.exports = nextConfig;