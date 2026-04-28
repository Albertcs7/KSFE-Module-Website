import { IncomingMessage, ServerResponse } from "http";
import { getAllPoliciesService } from "./insurance.service";

export const getAllPolicies = async (
  req: IncomingMessage,
  res: ServerResponse
) => {
  try {
    const data = await getAllPoliciesService();

    res.writeHead(200);
    res.end(JSON.stringify(data));
  } catch (error) {+
    console.error(error);

    res.writeHead(500);
    res.end(JSON.stringify({ message: "Internal Server Error" }));
  }
};