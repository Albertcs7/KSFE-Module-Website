import { IncomingMessage, ServerResponse } from "http";
import { parseBody } from "../../utils/parseBody";
import { createPolicyService, getAllPoliciesService ,searchPoliciesService} from "./insurance.service";

export const getAllPolicies = async (
  req: IncomingMessage,
  res: ServerResponse
) => {
  try {
    const data = await getAllPoliciesService();

    res.writeHead(200);
    res.end(JSON.stringify(data));
  } catch (error) {
    console.error(error);

    res.writeHead(500);
    res.end(JSON.stringify({ message: "Internal Server Error" }));
  }
};

/*SEARCH BY EMPLOYEE CODE*/

export const searchPolicies = async (
  req: IncomingMessage,
  res: ServerResponse
) => {
  try {
    // Extract query parameters: ?empCode=3571&empName=john&limit=50&offset=0
    const url = new URL(req.url || "", `http://${req.headers.host}`);
    const empCode = url.searchParams.get("empCode") || undefined;
    const empName = url.searchParams.get("empName") || undefined;
    const policyNo = url.searchParams.get("policyNo") || undefined;
    const limit = url.searchParams.get("limit") ? parseInt(url.searchParams.get("limit")!) : 100;
    const offset = url.searchParams.get("offset") ? parseInt(url.searchParams.get("offset")!) : 0;

    const result = await searchPoliciesService({
      empCode,
      empName,
      policyNo,
      limit,
      offset,
    });

    res.writeHead(200);
    res.end(JSON.stringify(result));
  } catch (error: any) {
    res.writeHead(400);
    res.end(JSON.stringify({ message: error.message }));
  }
};

/* ADDING THE EMPLOYEE POLICIES */

export const createPolicy = async (
  req: IncomingMessage,
  res: ServerResponse
) => {
  try {
    const body = await parseBody(req);

    const result = await createPolicyService(body);

    res.writeHead(201);
    res.end(JSON.stringify({
      message: "Policy created successfully",
      data: result
    }));

  } catch (error: any) {
    res.writeHead(400);
    res.end(JSON.stringify({ message: error.message }));
  }
};