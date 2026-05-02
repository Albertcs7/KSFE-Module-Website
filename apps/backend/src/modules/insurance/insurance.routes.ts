import { IncomingMessage,ServerResponse } from "http";
import { getAllPolicies, createPolicy, searchPolicies, createRemittance} from "./insurance.controller";

export const insuranceRoutes = async (
  req: IncomingMessage,
  res: ServerResponse
): Promise<boolean> => {

  // GET SEARCH POLICIES (EFFICIENT INDEXED SEARCH)
  if (req.method === "GET" && req.url?.startsWith("/insurance/policies/search")) {
    await searchPolicies(req, res);
    return true;
  }

  // GET VIEW EMPLOYEE POLICIES
  if (req.method === "GET" && req.url?.startsWith("/insurance/policies") && !req.url?.startsWith("/insurance/policies/search")) {
    await getAllPolicies(req, res);
    return true;
  }

  // POST ADDING EMPLOYEE POLICIES ✅
  if (req.method === "POST" && req.url === "/insurance/policies") {
    await createPolicy(req, res);
    return true;
  }
  
  // POST ADD REMITTANCE 
  if (req.method === "POST" && req.url === "/insurance/remittance") {
    await createRemittance(req, res);
    return true;
  }

  return false;
};

