// javascript
import path from "node:path";
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

/** @type {import('next').NextConfig} */
const nextConfig = {
    webpack: (config) => {
        config.resolve.alias = {
            ...(config.resolve.alias || {}),
            "@": path.resolve(__dirname),
            "@/components": path.resolve(__dirname, "components"),
            "@/lib": path.resolve(__dirname, "lib"),
            "@/app": path.resolve(__dirname, "app"),
            "@/types": path.resolve(__dirname, "types"),
        };
        return config;
    },
    reactStrictMode: true,
};

export default nextConfig;