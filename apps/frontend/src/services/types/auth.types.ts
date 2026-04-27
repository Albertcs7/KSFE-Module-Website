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

export interface BackendLoginData {
  token: string;
  user: {
    id: string;
    name: string;
  };
  role: string;
  designation: string;
  branchId: number | null;
  employeeId: string;
  permissions: string[];
  modules: string[];
}

export interface BackendLoginResponse {
  status: boolean;
  message: string;
  data: BackendLoginData;
}
