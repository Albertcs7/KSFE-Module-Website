import { defineStore } from "pinia";
import type { AuthUserData } from "@/services/types/auth.types";
import { loginApi, type LoginPayload } from "@/services/api/auth.api";

interface AuthState {
  user: AuthUserData | null;
  token: string | null;
  loading: boolean;
}

export const useAuthStore = defineStore("auth", {
  state: (): AuthState => ({
    user: null,
    token: localStorage.getItem("token"),
    loading: false
  }),

  getters: {
    isLoggedIn: (state) => !!state.token && !!state.user,

    permissions: (state) =>
      state.user?.role.permissions ?? [],

    modules: (state) =>
      state.user?.role.modules ?? [],

    roleName: (state) =>
      state.user?.roleName ?? ""
  },

  actions: {
    async login(payload: LoginPayload) {
      this.loading = true;

      try {
        const res = await loginApi(payload);

        if (!res.status) {
          throw new Error(res.message);
        }

        // store user
        this.user = res.data;

        // store token
        this.token = res.data.token;

        // persist token
        localStorage.setItem("token", res.data.token);

      } finally {
        this.loading = false;
      }
    },

    logout() {
      this.user = null;
      this.token = null;

      localStorage.removeItem("token");
    }
  }
});