import type { NextConfig } from 'next';
import path from 'node:path';
const config: NextConfig = {
  output: 'standalone',
  poweredByHeader: false,
  webpack(config) {
    config.resolve.extensionAlias = { '.js': ['.ts', '.tsx', '.js'], '.mjs': ['.mts', '.mjs'] };
    config.resolve.alias = {
      ...(config.resolve.alias ?? {}),
      '@designcodeio/threeui$': path.resolve(process.cwd(), 'src/vendor/designcodeio-threeui/index.tsx'),
      '@designcodeio/threeui/style.css$': path.resolve(process.cwd(), 'src/shaders/threeui.css'),
    };
    config.module.rules.push({ resourceQuery: /raw/, type: 'asset/source' });
    return config;
  },
  turbopack: { resolveAlias: {} },
  async headers() {
    return [{ source: '/:path*', headers: [
      { key: 'X-Content-Type-Options', value: 'nosniff' },
      { key: 'X-Frame-Options', value: 'DENY' },
      { key: 'Referrer-Policy', value: 'no-referrer' },
      { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=()' },
    ] }];
  },
};
export default config;
