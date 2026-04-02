/** @type {import('next').NextConfig} */
const isProd = process.env.NODE_ENV === "production";
const repoName = "Operation-burrito";

const nextConfig = {
  output: "export",
  // GitHub Pages serves from /<repo-name>/ in production
  basePath: isProd ? `/${repoName}` : "",
  assetPrefix: isProd ? `/${repoName}/` : "",
  images: {
    unoptimized: true,
  },
};

module.exports = nextConfig;
