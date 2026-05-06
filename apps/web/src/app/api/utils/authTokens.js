import { createHash, randomBytes } from "crypto";
import sql from "./sql";

export function generateRawToken() {
  return randomBytes(32).toString("hex");
}

export function hashToken(rawToken) {
  return createHash("sha256").update(rawToken).digest("hex");
}

export async function storeOneTimeToken({
  identifier,
  rawToken,
  expiresAt,
}) {
  await sql`
    DELETE FROM auth_verification_token
    WHERE identifier = ${identifier}
  `;

  await sql`
    INSERT INTO auth_verification_token (identifier, expires, token)
    VALUES (${identifier}, ${expiresAt.toISOString()}, ${hashToken(rawToken)})
  `;
}

export async function consumeOneTimeToken({ identifier, rawToken }) {
  const hashed = hashToken(rawToken);
  const [tokenRow] = await sql`
    DELETE FROM auth_verification_token
    WHERE identifier = ${identifier}
      AND token = ${hashed}
      AND expires > NOW()
    RETURNING identifier, expires, token
  `;

  return tokenRow || null;
}
