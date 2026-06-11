let commitSha = "dev";
try {
  commitSha = require("child_process")
    .execSync("git rev-parse --short HEAD")
    .toString()
    .trim();
} catch {
  /* not a git checkout */
}

/** @type {import('next').NextConfig} */
const nextConfig = {
  output: "export",
  trailingSlash: true,
  images: {
    unoptimized: true,
  },
  env: {
    NEXT_PUBLIC_BUILD_TIME: new Date().toISOString(),
    NEXT_PUBLIC_COMMIT_SHA: commitSha,
  },
};

module.exports = nextConfig;
