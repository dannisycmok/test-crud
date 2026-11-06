const API_BASE = import.meta.env.VITE_API_URL ?? "";

/**
 * Call the backend and return the data payload.
 * @param {string} path
 * @param {RequestInit} [options]
 */
export async function request(path, options = {}) {
  let response;
  try {
    response = await fetch(`${API_BASE}${path}`, {
      ...options,
      headers: {
        Accept: "application/json",
        ...(options.body ? { "Content-Type": "application/json" } : {}),
        ...options.headers,
      },
    });
  } catch {
    throw new Error("Cannot reach the API. Start the backend on port 3001.");
  }

  let payload = null;
  try {
    payload = await response.json();
  } catch {
    payload = null;
  }

  if (!response.ok || payload?.success === false) {
    throw new Error(payload?.error || `Request failed (${response.status})`);
  }

  return payload?.data;
}

export function getProducts() {
  return request("/api/get_products");
}

export function getProduct(productId) {
  return request(`/api/get_product/${productId}`);
}

export function addProduct(product) {
  return request("/api/add_product", {
    method: "POST",
    body: JSON.stringify(product),
  });
}

export function updateProduct(productId, product) {
  return request(`/api/update_product/${productId}`, {
    method: "PUT",
    body: JSON.stringify(product),
  });
}

export function deleteProduct(productId) {
  return request(`/api/delete_product/${productId}`, { method: "DELETE" });
}

export function getUsers() {
  return request("/api/get_users");
}

export function getUser(userId) {
  return request(`/api/get_user/${userId}`);
}

export function addUser(user) {
  return request("/api/add_user", {
    method: "POST",
    body: JSON.stringify(user),
  });
}

export function updateUser(userId, user) {
  return request(`/api/update_user/${userId}`, {
    method: "PUT",
    body: JSON.stringify(user),
  });
}

export function deleteUser(userId) {
  return request(`/api/delete_user/${userId}`, { method: "DELETE" });
}

export function getOrders() {
  return request("/api/get_orders");
}

export function getOrder(orderId) {
  return request(`/api/get_order/${orderId}`);
}

export function getOrdersByUser(userId) {
  return request(`/api/get_orders/uid/${userId}`);
}

export function getOrdersByProduct(productId) {
  return request(`/api/get_orders/pid/${productId}`);
}

export function addOrder(order) {
  return request("/api/add_order", {
    method: "POST",
    body: JSON.stringify(order),
  });
}

export function updateOrder(orderId, order) {
  return request(`/api/update_order/${orderId}`, {
    method: "PUT",
    body: JSON.stringify(order),
  });
}

export function deleteOrder(orderId) {
  return request(`/api/delete_order/${orderId}`, { method: "DELETE" });
}
