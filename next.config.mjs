/** @type {import('next').NextConfig} */
const nextConfig = {
  // Works come from the vault boundary (proxied or public) as plain <img> —
  // the rendition ladder is TYDAL's job (`download?rendition=`), not the
  // Next image optimizer's.
  reactStrictMode: true,
  // Self-contained server bundle for the Docker image (E5.1).
  output: 'standalone',
  // better-sqlite3 is a native addon — keep it external so its .node binary
  // is required from node_modules (which standalone copies) rather than
  // bundled and broken.
  serverExternalPackages: ['better-sqlite3'],
};

export default nextConfig;
