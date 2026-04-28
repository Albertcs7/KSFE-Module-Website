import { IncomingMessage,ServerResponse } from "http";
import { getAllPolicies } from "./insurance.controller";

export const insuranceRoutes = async (
  req: IncomingMessage,
  res: ServerResponse
): Promise<boolean> => {

  if (req.method === "GET" && req.url === "/insurance/policies") {
    await getAllPolicies(req, res);
    return true;
  }

  return false;
};