import { defineConfig, loadEnv } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), "");
  const basePath = normalizeBasePath(env.VITE_PRODUCT_BASE_PATH || process.env.VITE_PRODUCT_BASE_PATH);

  return {
    base: basePath,
    plugins: [react()],
    server: {
      host: "127.0.0.1",
      port: 4174,
    },
  };
});

function normalizeBasePath(value: string | undefined): string {
  const trimmed = value?.trim();

  if (!trimmed) {
    return "/";
  }

  const withLeadingSlash = trimmed.startsWith("/") ? trimmed : `/${trimmed}`;

  return withLeadingSlash.endsWith("/")
    ? withLeadingSlash
    : `${withLeadingSlash}/`;
}
