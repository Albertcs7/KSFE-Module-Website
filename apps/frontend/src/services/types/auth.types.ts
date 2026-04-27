export interface Permission {
  name: string;
  isDeleted: boolean;
  id: string;
}

export interface Role {
  name: string;
  permissions: Permission[];
  isDeleted: boolean;
  modules: string[];
  id: string;
}

export interface AuthUserData {
  role: Role;
  roleName: string;
  employee_id: string;
  first_name: string;
  designation: string;
  mobile: string;
  branchId: number | null;
  regionalBranches: any[]; // ⚠️ kept EXACTLY as backend (no assumptions)
  branch_name: string;
  userId: string;
  token: string;
}

export interface LoginApiResponse {
  status: boolean;
  message: string;
  data: AuthUserData;
}