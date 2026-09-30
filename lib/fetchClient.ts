let isRefreshing = false;
let refreshPromise: Promise<string | null> | null = null;
let pendingRequestsQueue: Array<{
  resolve: (token: string | null) => void;
  reject: (err: any) => void;
}> = [];

export function getStoredAccessToken(): string | null {
  if (typeof window === "undefined") return null;
  try {
    return localStorage.getItem("access_token") || null;
  } catch {
    return null;
  }
}

export function setStoredAccessToken(token: string) {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem("access_token", token);
  } catch {
    return;
  }
}

export function getStoredRefreshToken(): string | null {
  if (typeof window === "undefined") return null;
  try {
    return localStorage.getItem("refresh_token") || null;
  } catch {
    return null;
  }
}

export function setStoredRefreshToken(token: string) {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem("refresh_token", token);
  } catch {
    return;
  }
}

export function clearAuthSession() {
  if (typeof window !== "undefined") {
    try {
      localStorage.removeItem("access_token");
      localStorage.removeItem("refresh_token");
      localStorage.removeItem("user");
      sessionStorage.removeItem("access_token");
      sessionStorage.removeItem("refresh_token");
      sessionStorage.removeItem("user");
      document.cookie = "access_token=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT; max-age=-1";
      document.cookie = "refresh_token=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT; max-age=-1";
    } catch {
      return;
    }
  }
}

async function performTokenRefresh(): Promise<string | null> {
  if (isRefreshing && refreshPromise) {
    return refreshPromise;
  }

  isRefreshing = true;

  refreshPromise = (async () => {
    try {
      const storedRefreshToken = getStoredRefreshToken();
      const res = await fetch("/api/auth/refresh", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        credentials: "include",
        body: storedRefreshToken
          ? JSON.stringify({ refresh_token: storedRefreshToken })
          : undefined,
      });

      if (!res.ok) {
        throw new Error("Sesión expirada");
      }

      const data = await res.json().catch(() => null);
      const newAccessToken = data?.access_token || null;
      const newRefreshToken = data?.refresh_token || null;

      if (newAccessToken) {
        setStoredAccessToken(newAccessToken);
      }
      if (newRefreshToken) {
        setStoredRefreshToken(newRefreshToken);
      }

      const queue = [...pendingRequestsQueue];
      pendingRequestsQueue = [];
      queue.forEach(({ resolve }) => resolve(newAccessToken));

      return newAccessToken;
    } catch (error) {
      const queue = [...pendingRequestsQueue];
      pendingRequestsQueue = [];
      queue.forEach(({ reject }) => reject(error));

      clearAuthSession();
      if (typeof window !== "undefined") {
        window.location.href = "/login";
      }
      throw error;
    } finally {
      isRefreshing = false;
      refreshPromise = null;
    }
  })();

  return refreshPromise;
}

export async function fetchClient(
  input: string | URL | Request,
  init?: RequestInit,
  isRetry = false
): Promise<Response> {
  const urlStr =
    typeof input === "string"
      ? input
      : input instanceof URL
      ? input.toString()
      : input.url;

  const headers = new Headers(
    input instanceof Request ? input.headers : init?.headers
  );

  const token = getStoredAccessToken();
  if (token && !headers.has("Authorization")) {
    headers.set("Authorization", `Bearer ${token}`);
  }

  const config: RequestInit = {
    ...init,
    headers,
    credentials: init?.credentials || "include",
  };

  const response = await fetch(input, config);

  if (response.status === 401) {
    if (
      urlStr.includes("/api/auth/refresh") ||
      urlStr.includes("/api/auth/login")
    ) {
      clearAuthSession();
      if (
        typeof window !== "undefined" &&
        window.location.pathname !== "/login"
      ) {
        window.location.href = "/login";
      }
      const clone = response.clone();
      const errData = await clone.json().catch(() => null);
      const errorMessage =
        errData?.message || errData?.error || "Credenciales o sesión inválida.";
      const err = new Error(errorMessage) as any;
      err.status = 401;
      err.data = errData;
      throw err;
    }

    if (isRetry) {
      clearAuthSession();
      if (typeof window !== "undefined") {
        window.location.href = "/login";
      }
      const err = new Error("Sesión expirada") as any;
      err.status = 401;
      throw err;
    }

    if (isRefreshing) {
      await new Promise<string | null>((resolve, reject) => {
        pendingRequestsQueue.push({ resolve, reject });
      });
      return fetchClient(input, init, true);
    }

    await performTokenRefresh();
    return fetchClient(input, init, true);
  }

  const clone = response.clone();
  let parsedJson: any = null;
  const contentType = response.headers.get("content-type") || "";
  if (contentType.includes("application/json")) {
    try {
      parsedJson = await clone.json();
    } catch {
      parsedJson = null;
    }
  }

  if (!response.ok) {
    const errorMessage =
      (parsedJson && (parsedJson.message || parsedJson.error)) ||
      `Error ${response.status}: ${response.statusText || "Error en la petición"}`;
    const error = new Error(errorMessage) as any;
    error.status = response.status;
    error.data = parsedJson;
    error.response = response;
    throw error;
  }

  if (parsedJson !== null) {
    (response as any).data = parsedJson;
    response.json = async () => parsedJson;
  }

  return response;
}

export const api = {
  get: async <T = any>(url: string, init?: RequestInit): Promise<T> => {
    const res = await fetchClient(url, { ...init, method: "GET" });
    return res.json();
  },
  post: async <T = any>(
    url: string,
    body?: any,
    init?: RequestInit
  ): Promise<T> => {
    const isFormData =
      typeof FormData !== "undefined" && body instanceof FormData;
    const headers = new Headers(init?.headers);
    if (!isFormData && !headers.has("Content-Type") && body !== undefined) {
      headers.set("Content-Type", "application/json");
    }
    const res = await fetchClient(url, {
      ...init,
      method: "POST",
      headers,
      body: isFormData
        ? body
        : body !== undefined
        ? JSON.stringify(body)
        : undefined,
    });
    return res.json();
  },
  put: async <T = any>(
    url: string,
    body?: any,
    init?: RequestInit
  ): Promise<T> => {
    const isFormData =
      typeof FormData !== "undefined" && body instanceof FormData;
    const headers = new Headers(init?.headers);
    if (!isFormData && !headers.has("Content-Type") && body !== undefined) {
      headers.set("Content-Type", "application/json");
    }
    const res = await fetchClient(url, {
      ...init,
      method: "PUT",
      headers,
      body: isFormData
        ? body
        : body !== undefined
        ? JSON.stringify(body)
        : undefined,
    });
    return res.json();
  },
  patch: async <T = any>(
    url: string,
    body?: any,
    init?: RequestInit
  ): Promise<T> => {
    const isFormData =
      typeof FormData !== "undefined" && body instanceof FormData;
    const headers = new Headers(init?.headers);
    if (!isFormData && !headers.has("Content-Type") && body !== undefined) {
      headers.set("Content-Type", "application/json");
    }
    const res = await fetchClient(url, {
      ...init,
      method: "PATCH",
      headers,
      body: isFormData
        ? body
        : body !== undefined
        ? JSON.stringify(body)
        : undefined,
    });
    return res.json();
  },
  delete: async <T = any>(url: string, init?: RequestInit): Promise<T> => {
    const res = await fetchClient(url, { ...init, method: "DELETE" });
    return res.json();
  },
};

export default fetchClient;
