import { createHmac, timingSafeEqual } from "node:crypto";

const getAuthSecret = () => {
  const authSecret = String(process.env.AUTH_SECRET || "").trim();

  if (!authSecret) {
    throw new Error("AUTH_SECRET is required. Add it to your .env file.");
  }

  return authSecret;
};

const TOKEN_TTL_MS = 7 * 24 * 60 * 60 * 1000;

const encodeSegment = (value) => Buffer.from(JSON.stringify(value)).toString("base64url");

const decodeSegment = (segment) => {
  const decoded = Buffer.from(segment, "base64url").toString("utf8");
  return JSON.parse(decoded);
};

const sign = (headerSegment, bodySegment) =>
  createHmac("sha256", getAuthSecret())
    .update(`${headerSegment}.${bodySegment}`)
    .digest("base64url");

export function createAuthToken(user) {
  const headerSegment = encodeSegment({ alg: "HS256", typ: "JWT" });
  const bodySegment = encodeSegment({
    sub: user.id,
    email: user.email,
    name: user.name,
    exp: Date.now() + TOKEN_TTL_MS,
  });
  const signature = sign(headerSegment, bodySegment);

  return `${headerSegment}.${bodySegment}.${signature}`;
}

export function verifyAuthToken(token) {
  const parts = String(token || "").split(".");

  if (parts.length !== 3) {
    throw new Error("Invalid authentication token.");
  }

  const [headerSegment, bodySegment, signature] = parts;
  const expectedSignature = sign(headerSegment, bodySegment);
  const providedSignature = Buffer.from(signature, "base64url");
  const expectedBuffer = Buffer.from(expectedSignature, "base64url");

  if (
    providedSignature.length !== expectedBuffer.length ||
    !timingSafeEqual(providedSignature, expectedBuffer)
  ) {
    throw new Error("Invalid authentication token.");
  }

  const payload = decodeSegment(bodySegment);

  if (!payload?.sub || !payload?.exp || Date.now() > Number(payload.exp)) {
    throw new Error("Authentication token has expired.");
  }

  return payload;
}
