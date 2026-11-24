export function isTechnicalError(msg?: string | null): boolean {
  if (!msg || typeof msg !== "string") return false;
  const lower = msg.toLowerCase();
  return (
    lower.includes("sql") ||
    lower.includes("pq:") ||
    lower.includes("mssql:") ||
    lower.includes("postgres") ||
    lower.includes("panic:") ||
    lower.includes("runtime error") ||
    lower.includes("dial tcp") ||
    lower.includes("connection refused") ||
    lower.includes("syntax error") ||
    lower.includes("null pointer") ||
    lower.includes("segmentation fault") ||
    lower.includes("goroutine") ||
    lower.includes("stack trace") ||
    lower.includes("internal server error") ||
    lower.includes("database")
  );
}

export function sanitizeErrorMessage(
  err: unknown,
  fallback = "Ocurrió un error al procesar la solicitud."
): string {
  if (!err) return fallback;
  if (typeof err === "string") {
    return isTechnicalError(err) ? fallback : err;
  }
  if (typeof err === "object") {
    const anyErr = err as any;
    if (anyErr.status && anyErr.status >= 500) {
      return "Ocurrió un error en el servidor. Por favor, intente nuevamente.";
    }
    const msg = anyErr.message || anyErr.error || anyErr.detail;
    if (typeof msg === "string" && msg.trim()) {
      return isTechnicalError(msg) ? fallback : msg;
    }
  }
  return fallback;
}

let isRefreshing = false;
let refreshPromise: Promise<string | null> | null = null;
let pendingRequestsQueue: Array<{
  resolve: (token: string | null) => void;
  reject: (err: any) => void;
}> = [];

export function getStoredAccessToken(): string | null {
  if (typeof window === "undefined") return null;
  try {
    const token = localStorage.getItem("access_token");
    if (token) return token;
    const sessionToken = sessionStorage.getItem("access_token");
    if (sessionToken) return sessionToken;
    const match = document.cookie.match(/(?:^|;\s*)(?:access_token|token)=([^;]+)/);
    if (match) return decodeURIComponent(match[1]);
    return null;
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
    const token = localStorage.getItem("refresh_token");
    if (token) return token;
    const sessionToken = sessionStorage.getItem("refresh_token");
    if (sessionToken) return sessionToken;
    const match = document.cookie.match(/(?:^|;\s*)refresh_token=([^;]+)/);
    if (match) return decodeURIComponent(match[1]);
    return null;
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
      const raw = errData?.message || errData?.error;
      const errorMessage =
        raw && typeof raw === "string" && !isTechnicalError(raw)
          ? raw
          : "Credenciales o sesión inválida.";
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
    let errorMessage = "";
    if (response.status >= 500) {
      errorMessage = "Ocurrió un error en el servidor. Por favor, intente más tarde.";
    } else {
      const raw = parsedJson && (parsedJson.message || parsedJson.error);
      if (raw && typeof raw === "string" && !isTechnicalError(raw)) {
        errorMessage = raw;
      } else {
        errorMessage = `Error ${response.status}: No se pudo completar la operación`;
      }
    }
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
