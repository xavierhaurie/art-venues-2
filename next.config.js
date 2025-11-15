// javascript
import path from "node:path";

/** @type {import('next').NextConfig} */
const nextConfig = {
    webpack: (config) => {
        // Map `@` to `src` so `@/components/...` works in all environments
        config.resolve.alias = {
            // ...(config.resolve.alias || {}),
            // "@": path.resolve(process.cwd(), ""),
            // "@/": "/",
        };
        return config;
    },
    reactStrictMode: true,
};

export default nextConfig;