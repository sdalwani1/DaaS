import { SignJWT, jwtVerify } from "jose";

const secret = new TextEncoder().encode(process.env.JWT_SECRET);

export type Role = "viewer" | "warehouse" | "admin";

export type AuthUser = {
  userId: string;
  role: Role;
};

export async function signToken(user: AuthUser): Promise<string> {
  return new SignJWT({ role: user.role })
    .setProtectedHeader({ alg: "HS256" })
    .setSubject(user.userId)
    .setIssuedAt()
    .setExpirationTime("8h")
    .sign(secret);
}

export async function verifyToken(token: string): Promise<AuthUser | null> {
  try {
    const { payload } = await jwtVerify(token, secret);
    return { userId: payload.sub as string, role: payload.role as Role };
  } catch {
    return null; // bad signature, expired, or malformed
  }
}