import { useCallback, useMemo } from 'react';

export function useApi() {
  const apiBaseUrl = useMemo(
    () =>
      process.env.NEXT_PUBLIC_API_URL?.replace(/\/$/, "") ||
      "https://tres-finos-api.chameleon-finance.workers.dev",
    []
  );

  const apiGet = useCallback(
    async <T,>(path: string): Promise<T> => {
      const response = await fetch(`${apiBaseUrl}${path}`);
      if (!response.ok) {
        const detail = await response.text();
        throw new Error(detail || `Request failed with ${response.status}`);
      }
      return (await response.json()) as T;
    },
    [apiBaseUrl]
  );

  const apiPost = useCallback(
    async <T,>(path: string, body: Record<string, unknown>): Promise<T> => {
      const response = await fetch(`${apiBaseUrl}${path}`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(body)
      });
      if (!response.ok) {
        const detail = await response.text();
        throw new Error(detail || `Request failed with ${response.status}`);
      }
      return (await response.json()) as T;
    },
    [apiBaseUrl]
  );

  const apiPatch = useCallback(
    async <T,>(path: string, body: Record<string, unknown>): Promise<T> => {
      const response = await fetch(`${apiBaseUrl}${path}`, {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(body)
      });
      if (!response.ok) {
        const detail = await response.text();
        throw new Error(detail || `Request failed with ${response.status}`);
      }
      return (await response.json()) as T;
    },
    [apiBaseUrl]
  );

  return { apiGet, apiPost, apiPatch, apiBaseUrl };
}
