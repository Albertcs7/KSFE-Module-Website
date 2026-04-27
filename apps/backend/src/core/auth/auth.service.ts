import jwt from "jsonwebtoken";
import { loginBody } from "./auth.types";
import { externalAuthLogin } from "../../integrations/external-auth/externalAuth.service";
import { LoginApiResponse } from "../../integrations/external-auth/externalAuth.types";

const JWT_SECRET = "your_secret_key"; // move to .env later

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

    // Create JWT
    const token = jwt.sign(
      {
        role: user.roleName,
        employeeId: user.employee_id,
        branchId: user.branchId,
        designation: user.designation,
        permissions: permissionNames,
        modules: user.role.modules, 
      },
      JWT_SECRET,
      { expiresIn: "1h" }
    );

    //  Send everything frontend needs
    return {
      status: true,
      message: response.message,
      data: {
        token,

        user: {
          id: user.userId,
          name: user.first_name,
        },

        role: user.roleName,
        designation: user.designation,
        branchId: user.branchId,
        employeeId: user.employee_id,

        permissions: permissionNames,
        modules: user.role.modules,
      },
    };
  } catch (error: any) {
    throw new Error(error.message || "Auth service failed");
  }
};