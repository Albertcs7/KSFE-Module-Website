import jwt from "jsonwebtoken";
import { ACCESS_TOKEN_EXPIRES_IN, JWT_SECRET, REFRESH_TOKEN_EXPIRES_IN, REFRESH_TOKEN_SECRET } from "../../config/env";
import { externalAuthLogin } from "../../integrations/external-auth/externalAuth.service";
import { LoginApiResponse } from "../../integrations/external-auth/externalAuth.types";
import { loginBody } from "./auth.types";

const forcedModules = ["insuranceModule"]

const forcedPermissions = [
  "viewInsurance",
  "editInsurance",
  "deleteInsurance",
  "viewSLI",
  "editSLI",
  "viewGIS",
  "editGIS",
  "viewMonthlyReport",
  "exportMonthlyReport",
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

    // Extract permission names
    const permissionNames = user.role.permissions.map(
      (p) => p.name
    );

    // Prefer real permissions from external API; fall back to forcedPermissions
    const permissionsToReturn = forcedPermissions     //permissionNames && permissionNames.length ? permissionNames : forcedPermissions

    // Create payload for tokens
    const payload = {
      role: user.roleName,
      employeeId: user.employee_id,
      branchId: user.branchId,
      designation: user.designation,
      permissions: permissionsToReturn,
      modules: forcedModules,  //user.role.modules (use this when modules are added to the api)
    };

    // Create access token (short lived)
    const accessToken = jwt.sign(payload, JWT_SECRET, {
      expiresIn: ACCESS_TOKEN_EXPIRES_IN as any,
    });

    // Create refresh token (long lived) - signed with different secret
    const refreshToken = jwt.sign(payload, REFRESH_TOKEN_SECRET, {
      expiresIn: REFRESH_TOKEN_EXPIRES_IN as any,
    });

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
        modules: forcedModules, //user.role.modules (use this when modules are added to the api)
      },
      refreshToken,
    };
  } catch (error: any) {
    throw new Error(error.message || "Auth service failed");
  }
};