import { createSlice } from "@reduxjs/toolkit";

export const AUTH_STORAGE_KEY = "masala-hub-auth-token";

const readStoredToken = () => {
  if (typeof window === "undefined") {
    return "";
  }

  return localStorage.getItem(AUTH_STORAGE_KEY) || "";
};

const initialState = {
  user: null,
  token: readStoredToken(),
  status: "idle",
};

const authSlice = createSlice({
  name: "auth",
  initialState,
  reducers: {
    setCredentials: (state, action) => {
      state.user = action.payload.user;
      state.token = action.payload.token;
      state.status = "authenticated";

      if (typeof window !== "undefined") {
        localStorage.setItem(AUTH_STORAGE_KEY, action.payload.token);
      }
    },
    setUser: (state, action) => {
      state.user = action.payload;
      state.status = state.token ? "authenticated" : "idle";
    },
    setAuthStatus: (state, action) => {
      state.status = action.payload;
    },
    logout: (state) => {
      state.user = null;
      state.token = "";
      state.status = "idle";

      if (typeof window !== "undefined") {
        localStorage.removeItem(AUTH_STORAGE_KEY);
      }
    },
  },
});

export const { setCredentials, setUser, setAuthStatus, logout } = authSlice.actions;
export default authSlice.reducer;
