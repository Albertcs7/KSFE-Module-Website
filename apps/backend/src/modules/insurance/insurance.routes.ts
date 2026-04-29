import { IncomingMessage,ServerResponse } from "http";
import { getAllPolicies } from "./insurance.controller";
import { createPolicy } from "./insurance.controller";

export const insuranceRoutes = async (
  req: IncomingMessage,
  res: ServerResponse
): Promise<boolean> => {

  // GET VIEW EMPLOYEE POLICIES

  if (req.method === "GET" && req.url === "/insurance/policies") {
    await getAllPolicies(req, res);
    return true;
  }

  // POST ADDING EPOYEE POLICIES ✅
  if (req.method === "POST" && req.url === "/insurance/policies") {
    await createPolicy(req, res);
    return true;
  }

  return false;
};