import { signToken, type Role } from "../platform/auth.js";

const role = (process.argv[2] as Role) || "viewer";
const token = await signToken({ userId: "test-user", role });

console.log(`Role: ${role}`);
console.log(token);