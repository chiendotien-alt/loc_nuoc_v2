const encoder = new TextEncoder();

function secret() {
  return process.env.ADMIN_PASSWORD || "change-me";
}

function bufferToHex(buf: ArrayBuffer): string {
  return Array.from(new Uint8Array(buf))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

async function getKey(s: string) {
  return crypto.subtle.importKey("raw", encoder.encode(s), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
}

export async function signToken(): Promise<string> {
  const key = await getKey(secret());
  const sig = await crypto.subtle.sign("HMAC", key, encoder.encode("admin-session"));
  return bufferToHex(sig);
}

export async function verifyToken(token: string | undefined | null): Promise<boolean> {
  if (!token) return false;
  const expected = await signToken();
  if (token.length !== expected.length) return false;
  let diff = 0;
  for (let i = 0; i < expected.length; i++) {
    diff |= token.charCodeAt(i) ^ expected.charCodeAt(i);
  }
  return diff === 0;
}
