import jwt from "jsonwebtoken";
import crypto from "crypto";
import { env } from "../config/env.js";

export const signAccessToken = (payload) =>
  jwt.sign(payload, env.jwt.accessSecret, {
    expiresIn: env.jwt.accessExpiresIn,
  });

export const verifyAccessToken = (token) =>
  jwt.verify(token, env.jwt.accessSecret);

// Refresh tokens are opaque random strings, not JWTs — we store only
// their hash in the DB and never need to "verify" a signature on them,
// just look up the hash and check expiry/revocation.
export const generateRefreshToken = () =>
  crypto.randomBytes(64).toString("hex");

export const hashToken = (token) =>
  crypto.createHash("sha256").update(token).digest("hex");
