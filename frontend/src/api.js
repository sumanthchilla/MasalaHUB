const getLocalApiFallbackBase = () => {
  if (typeof window === "undefined") return "";

  const isLocalHost =
    window.location.hostname === "127.0.0.1" ||
    window.location.hostname === "localhost";

  if (!isLocalHost || window.location.port === "5000") {
    return "";
  }

  return "http://127.0.0.1:5000";
};

const getApiBases = () => {
  const configuredBase = String(import.meta.env.VITE_API_BASE_URL || "").trim();
  const localFallbackBase = getLocalApiFallbackBase();

  return ["", ...new Set([configuredBase, localFallbackBase].filter(Boolean))];
};

const readJson = async (response) => response.json().catch(() => null);

const getAuthHeaders = () => {
  if (typeof window === "undefined") {
    return {};
  }

  const token = localStorage.getItem("masala-hub-auth-token");

  return token ? { Authorization: `Bearer ${token}` } : {};
};

export async function apiRequest(path, options = {}) {
  const apiBases = getApiBases();
  let lastError = null;
  const requestOptions = {
    ...options,
    headers: {
      ...getAuthHeaders(),
      ...(options.headers || {}),
    },
  };

  for (let index = 0; index < apiBases.length; index += 1) {
    const apiBase = apiBases[index];
    const hasAnotherApiBase = index < apiBases.length - 1;
    let response;

    try {
      response = await fetch(`${apiBase}${path}`, requestOptions);
    } catch (error) {
      lastError = error;

      if (hasAnotherApiBase) {
        continue;
      }

      throw error;
    }

    const data = await readJson(response);
    const contentType = response.headers.get("content-type") || "";

    if (response.ok) {
      return data || {};
    }

    if (!data && contentType.includes("text/html")) {
      lastError = new Error(
        "API is not responding correctly. Stop old servers and run npm run dev:full again."
      );
    } else {
      lastError = new Error(data?.message || "Unable to complete the request.");
    }

    if (!apiBase && hasAnotherApiBase && response.status === 404) {
      continue;
    }

    throw lastError;
  }

  throw lastError || new Error("Unable to complete the request.");
}
