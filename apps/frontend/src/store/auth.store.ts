import { loginApi, type LoginPayload } from "@/services/api/auth.api";
import type {
  AuthUserData,
  BackendLoginData,
} from "@/services/types/auth.types";
import { defineStore } from "pinia";

interface AuthState {
  user: AuthUserData | null;
  token: string | null;
  loading: boolean;
}

const getStoredUser = (): AuthUserData | null => {
  const raw = localStorage.getItem("auth_user");
  if (!raw) return null;

  try {
    return JSON.parse(raw) as AuthUserData;
  } catch {
    return null;
  }
};

const normalizeBackendUser = (data: BackendLoginData): AuthUserData => ({
  role: {
    name: data.role,
    permissions: data.permissions.map((name, index) => ({
      name,
      isDeleted: false,
      id: `perm-${index}`,
    })),
    isDeleted: false,
    modules: data.modules,
    id: "role-0",
  },
  roleName: data.role,
  employee_id: data.employeeId,
  first_name: data.user.name,
  designation: data.designation,
  mobile: "",
  branchId: data.branchId,
  regionalBranches: [],
  branch_name: "",
  userId: data.user.id,
  token: data.token,
});

export const useAuthStore = defineStore("auth", {
  state: (): AuthState => ({
    user: getStoredUser(),
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

        const normalizedUser = normalizeBackendUser(res.data);

        // store user
        this.user = normalizedUser;

        // store token
        this.token = res.data.token;

        // persist token
        localStorage.setItem("token", res.data.token);
        localStorage.setItem("auth_user", JSON.stringify(normalizedUser));

      } finally {
        this.loading = false;
      }
    },

    logout() {
      this.user = null;
      this.token = null;

      localStorage.removeItem("token");
      localStorage.removeItem("auth_user");
      localStorage.removeItem("isAuthenticated");
    }
  }
});
