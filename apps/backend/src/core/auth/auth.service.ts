import { externalAuthLogin } from "../../integrations/external-auth/externalAuth.service";
import { LoginApiResponse } from "../../integrations/external-auth/externalAuth.types";
import { createAccessToken, createRefreshSession } from "./auth.session";
import { loginBody } from "./auth.types";

const forcedModules = ["insuranceModule"]

const forcedPermissions = [
  "viewInsurance",
  "editInsurance",
  "deleteInsurance",
  "deactivateInsurance",
  "viewMonthlyReport",
  "exportMonthlyReport",
  "exportPolicyReport",
]

export const loginService = async (
  data: loginBody
): Promise<any> => {
  try {
    const response: LoginApiResponse = await externalAuthLogin(data);

    if (!response.status) {
      throw new Error(response.message);
    }

    const user = response.data;

    // Temporary hardcoded access control.
    // When the external auth API starts returning real permissions/modules,
    // replace this with:
    // const permissionsToReturn = Array.isArray(user.role?.permissions)
    //   ? user.role.permissions.map((p) => p.name).filter(Boolean)
    //   : [];
    // const modulesToReturn = Array.isArray(user.role?.modules)
    //   ? user.role.modules.filter(Boolean)
    //   : [];
    const permissionsToReturn = forcedPermissions;
    const modulesToReturn = forcedModules;

    // Create payload for tokens
    const payload = {
      role: user.roleName,
      employeeId: user.employee_id,
      branchId: user.branchId,
      designation: user.designation,
      permissions: permissionsToReturn,
      modules: modulesToReturn,
    };

    const accessToken = createAccessToken(payload).token;
    const refreshSession = createRefreshSession(payload);

    //  Send everything frontend needs. Return refreshToken separately
    return {
      status: true,
      message: response.message,
      data: {
        token: accessToken,

        user: {
          id: user.userId,
          name: user.first_name,
        },

        role: user.roleName,
        designation: user.designation,
        branchId: user.branchId,
        employeeId: user.employee_id,

        permissions: permissionsToReturn,
        modules: modulesToReturn,
      },
      refreshToken: refreshSession.refreshToken,
      csrfToken: refreshSession.csrfToken,
    };
  } catch (error: any) {
    throw new Error(error.message || "Auth service failed");
  }
};