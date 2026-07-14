/**
 * FRSEMS — Axios API client.
 */

import axios from "axios";

const api = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000/api",
  timeout: 30000,
  headers: {
    "Content-Type": "application/json",
  },
});

// Response interceptor — unwrap data
api.interceptors.response.use(
  (response) => response,
  (error) => {
    const message =
      error.response?.data?.detail ||
      error.message ||
      "An unexpected error occurred";
    console.error("[API Error]", message);
    return Promise.reject(error);
  }
);

export default api;
