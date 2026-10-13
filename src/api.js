const API_URL = (
  import.meta.env.VITE_API_URL || "http://localhost:8080/api"
).replace(/\/$/, "");

async function getCsrfToken() {
  const response = await fetch(`${API_URL}/csrf`, {
    method: "GET",
    credentials: "include",
  });

  if (!response.ok) {
    throw new Error("Unable to obtain CSRF token.");
  }

  // Ensure the CSRF cookie has been received.
  const data = await response.json();
  const cookieToken = document.cookie
    .split("; ")
    .find((cookie) => cookie.startsWith("XSRF-TOKEN="))
    ?.substring("XSRF-TOKEN=".length);

  return {
    headerName: data.headerName || "X-XSRF-TOKEN",
    token: cookieToken
      ? decodeURIComponent(cookieToken)
      : data.token,
  };
}

export async function apiRequest(path, options = {}) {
  const method = (options.method || "GET").toUpperCase();

  const headers = {
    ...(options.body ? { "Content-Type": "application/json" } : {}),
    ...options.headers,
  };

  if (["POST", "PUT", "PATCH", "DELETE"].includes(method)) {
    const csrf = await getCsrfToken();
    headers[csrf.headerName] = csrf.token;
  }

  const response = await fetch(`${API_URL}${path}`, {
    ...options,
    method,
    headers,
    credentials: "include",
  });

  const data = await response.json().catch(() => ({}));

  if (!response.ok) {
    throw new Error(
      data.error ||
        (response.status === 401
          ? "Please log in with valid credentials."
          : response.status === 403
            ? "Access denied. Check your account permissions or CSRF token."
            : `Request failed with status ${response.status}.`)
    );
  }

  return data;
}