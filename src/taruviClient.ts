import { Client } from "@taruvi/sdk";

// Validate required environment variables
const requiredEnvVars = {
  VITE_TARUVI_BASE_URL: import.meta.env.VITE_TARUVI_BASE_URL,
  VITE_TARUVI_API_KEY: import.meta.env.VITE_TARUVI_API_KEY,
  VITE_TARUVI_APP_SLUG: import.meta.env.VITE_TARUVI_APP_SLUG,
};

Object.entries(requiredEnvVars).forEach(([key, value]) => {
  if (!value) {
    throw new Error(
      `Missing required environment variable: ${key}. ` +
        `Please check your .env.local file. See .env.example for required variables.`
    );
  }
});

/**
 * Taruvi Client instance configured with environment variables.
 * Used for Navkit, DataProviders, and direct SDK operations.
 *
 * @example
 * // Use with Refine providers (recommended)
 * import { taruviDataProvider, taruviAuthProvider } from "./providers/refineProviders";
 *
 * @example
 * // Direct SDK usage (advanced)
 * import { taruviClient } from "./taruviClient";
 * const response = await taruviClient.httpClient.get("api/...");
 *
 * @see {@link https://docs.taruvi.com|Taruvi Documentation}
 */
export const taruviClient = (() => {
  try {
    return new Client({
      apiKey: import.meta.env.VITE_TARUVI_API_KEY,
      appSlug: import.meta.env.VITE_TARUVI_APP_SLUG,
      apiUrl: import.meta.env.VITE_TARUVI_BASE_URL,
    });
  } catch (error) {
    console.error("Failed to initialize Taruvi Client:", error);
    throw new Error(
      "Taruvi configuration error. Please check your .env.local file. " +
        "See .env.example for required variables."
    );
  }
})();
