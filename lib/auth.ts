import crypto from "crypto";

function secret() {
  return process.env.ADMIN_PASSWORD || "change-me";
}

export function signToken(): string {
  return crypto.createHmac("sha256", secret()).update("admin-session").digest("hex");
}

export function verifyToken(token: string | undefined | null): boolean {
  if (!token) return false;
  const expected = signToken();
  if (token.length !== expected.length) return false;
  return crypto.timingSafeEqual(Buffer.from(token), Buffer.from(expected));
}
