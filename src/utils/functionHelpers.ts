import { taruviAppProvider } from "../providers/refineProviders";
import type { FunctionMeta } from "../providers/refineProviders";

/**
 * Execute a serverless function via appDataProvider.custom()
 *
 * @example
 * const result = await executeFunction("calculate-total", { items: [1, 2, 3] });
 *
 * @example
 * const taskInfo = await executeFunction("process-data", { dataset: "large_file.csv" }, { kind: "function", async: true });
 */
export const executeFunction = async <T = unknown>(
  functionSlug: string,
  params: Record<string, unknown> = {},
  options?: FunctionMeta
): Promise<T> => {
  const meta: FunctionMeta = {
    kind: "function",
    async: options?.async ?? false,
  };

  const response = await taruviAppProvider.custom!({
    url: functionSlug,
    method: "post",
    payload: params,
    meta,
  });

  return response.data as T;
};

/**
 * Execute a serverless function without waiting for the result (fire and forget)
 *
 * @example
 * executeFunctionAsync("send-notification", { message: "Done", userId: 123 }).catch(console.warn);
 */
export const executeFunctionAsync = async (
  functionSlug: string,
  params: Record<string, unknown> = {}
): Promise<void> => {
  await executeFunction(functionSlug, params, { kind: "function", async: true });
};
