import crypto from "crypto";
import jwt, { JwtPayload } from "jsonwebtoken";
import { ACCESS_TOKEN_EXPIRES_IN, JWT_AUDIENCE, JWT_ISSUER, JWT_SECRET, REFRESH_TOKEN_EXPIRES_IN, REFRESH_TOKEN_SECRET } from "../../config/env";

export type AuthTokenClaims = {
  role: string;
  employeeId: string;
  branchId: number | null;
  designation: string;
  permissions: string[];
  modules: string[];
};

type RefreshSession = {
  jti: string;
  csrfToken: string;
  expiresAt: number;
  payload: AuthTokenClaims;
};

type AccessTokenResponse = {
  token: string;
  expiresIn: string;
};

const refreshSessions = new Map<string, RefreshSession>();

const parseExpiryToMs = (value: string): number => {
  const match = /^([0-9]+)([smhd])$/.exec(value.trim());

  if (!match) {
    return 7 * 24 * 60 * 60 * 1000;
  }

  const amount = Number(match[1]);
  const unit = match[2];

  const multipliers: Record<string, number> = {
    s: 1000,
    m: 60 * 1000,
    h: 60 * 60 * 1000,
    d: 24 * 60 * 60 * 1000,
  };

  return amount * multipliers[unit];
};

const cleanupExpiredSessions = () => {
  const now = Date.now();

  for (const [jti, session] of refreshSessions.entries()) {
    if (session.expiresAt <= now) {
      refreshSessions.delete(jti);
    }
  }
};

const buildAccessToken = (payload: AuthTokenClaims): AccessTokenResponse => {
  const token = jwt.sign(payload, JWT_SECRET, {
    algorithm: "HS256",
    expiresIn: ACCESS_TOKEN_EXPIRES_IN as any,
    issuer: JWT_ISSUER,
    audience: JWT_AUDIENCE,
  });

  return { token, expiresIn: ACCESS_TOKEN_EXPIRES_IN };
};

export const createRefreshSession = (payload: AuthTokenClaims) => {
  cleanupExpiredSessions();

  const jti = crypto.randomBytes(16).toString("hex");
  const csrfToken = crypto.randomBytes(32).toString("hex");
  const expiresAt = Date.now() + parseExpiryToMs(REFRESH_TOKEN_EXPIRES_IN);

  const refreshToken = jwt.sign(payload, REFRESH_TOKEN_SECRET, {
    algorithm: "HS256",
    expiresIn: REFRESH_TOKEN_EXPIRES_IN as any,
    issuer: JWT_ISSUER,
    audience: JWT_AUDIENCE,
    jwtid: jti,
  });

  refreshSessions.set(jti, {
    jti,
    csrfToken,
    expiresAt,
    payload,
  });

  return {
    refreshToken,
    csrfToken,
    jti,
    expiresAt,
  };
};

export const createAccessToken = (payload: AuthTokenClaims) => buildAccessToken(payload);

export const verifyRefreshSession = (refreshToken: string, csrfToken?: string) => {
  cleanupExpiredSessions();

  const decoded = jwt.verify(refreshToken, REFRESH_TOKEN_SECRET, {
    algorithms: ["HS256"],
    issuer: JWT_ISSUER,
    audience: JWT_AUDIENCE,
  }) as JwtPayload & AuthTokenClaims;

  const jti = decoded.jti;

  if (!jti) {
    throw new Error("Refresh token missing session id");
  }

  const session = refreshSessions.get(jti);

  if (!session) {
    throw new Error("Refresh session not found or revoked");
  }

  if (!csrfToken || csrfToken !== session.csrfToken) {
    throw new Error("Invalid CSRF token");
  }

  return {
    decoded,
    session,
  };
};

export const rotateRefreshSession = (refreshToken: string, csrfToken?: string) => {
  const { decoded, session } = verifyRefreshSession(refreshToken, csrfToken);
  refreshSessions.delete(session.jti);

  const rotated = createRefreshSession({
    role: decoded.role,
    employeeId: decoded.employeeId,
    branchId: decoded.branchId,
    designation: decoded.designation,
    permissions: decoded.permissions,
    modules: decoded.modules,
  });

  return {
    ...rotated,
    payload: session.payload,
  };
};

export const revokeRefreshSession = (refreshToken: string) => {
  const decoded = jwt.verify(refreshToken, REFRESH_TOKEN_SECRET, {
    algorithms: ["HS256"],
    issuer: JWT_ISSUER,
    audience: JWT_AUDIENCE,
  }) as JwtPayload;

  if (decoded.jti) {
    refreshSessions.delete(decoded.jti);
  }
};
