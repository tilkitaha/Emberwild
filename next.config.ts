import type { NextConfig } from "next";

const isGitHubPages = process.env.GITHUB_ACTIONS === "true";
const repoBasePath = "/Emberwild";

const nextConfig: NextConfig = {
  output: "export",
  trailingSlash: true,
  images: {
    unoptimized: true,
  },
  basePath: isGitHubPages ? repoBasePath : "",
  assetPrefix: isGitHubPages ? repoBasePath : "",
};

export default nextConfig;
