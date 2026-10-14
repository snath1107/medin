/** @type {import('next').NextConfig} */

// Where the FastAPI backend runs. The browser never calls it directly.
const API_URL = process.env.API_URL || "http://localhost:8000";

const nextConfig = {
  async rewrites() {
    // A request to /api/posts is forwarded to http://localhost:8000/posts.
    // To the browser, the API lives on the same site as the pages.
    return [{ source: "/api/:path*", destination: `${API_URL}/:path*` }];
  },
};

module.exports = nextConfig;
