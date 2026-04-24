import { IncomingMessage, ServerResponse } from "http";
import { loginService } from "./auth.service";
import { loginBody } from "./auth.types";

/**
 * Reads and parses a JSON request body from an incoming HTTP request.
 *
 * @typeParam T - Expected shape of the parsed body.
 * @param req - Node.js incoming request stream.
 * @returns Promise resolving to the parsed body object.
 * @throws Error when the body is invalid JSON or stream reading fails.
 */
const parseBody = async <T>(req: IncomingMessage): Promise<T> => {
  return new Promise((resolve, reject) => {
    let body = "";

    req.on("data", (chunk) => {
      body += chunk;
        });

    req.on("end", () => {
      try {
                const parsed = JSON.parse(body || "{}");
                resolve(parsed as T);
      } catch {
                reject(new Error("Invalid JSON"));
            }
        });

        req.on("error", () => {
      reject(new Error("Error reading request body"));
        });
    });
};

/**
 * Handles login requests.
 *
 * Expects a JSON body with:
 * - UID: string
 * - password: string
 *
 * Response behavior:
 * - 200: Authentication processed successfully.
 * - 400: Missing required fields or invalid request payload.
 */
export const loginController = async (
  req: IncomingMessage,
  res: ServerResponse
) => {
  try {
    // ✅ Strongly typed request body
    const body = await parseBody<loginBody>(req);

    // (Optional) Basic validation
    if (!body.UID || !body.password) {
      res.writeHead(400);
      return res.end(
        JSON.stringify({
          status: false,
          message: "UID and password are required",
        })
      );
    }

    // Call service
    const result = await loginService(body);

    res.writeHead(200);
    return res.end(JSON.stringify(result));
  } catch (error: any) {
    res.writeHead(400);
    return res.end(
      JSON.stringify({
        status: false,
        message: error.message || "Login failed",
      })
    );
  }
};