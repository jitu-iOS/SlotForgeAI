import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Hide the Next.js "N" development badge from the bottom-left corner.
  devIndicators: false,

  // Infrastructure-level redirect: no component renders, no performance mark created.
  // This eliminates the Turbopack "'​Home' cannot have a negative time stamp" error
  // that occurred when the Home component called redirect() during measurement.
  async redirects() {
    return [
      {
        source: "/",
        destination: "/project",
        permanent: false,
      },
    ];
  },
};

export default nextConfig;
