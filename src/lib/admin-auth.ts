const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD;

export function checkAdminPassword(provided: string | undefined | null): boolean {
  if (!ADMIN_PASSWORD || ADMIN_PASSWORD.length < 12) {
    console.error('ADMIN_PASSWORD env var missing or too weak (min 12 chars)');
    return false;
  }
  if (!provided) return false;
  if (provided.length !== ADMIN_PASSWORD.length) return false;
  let mismatch = 0;
  for (let i = 0; i < provided.length; i++) {
    mismatch |= provided.charCodeAt(i) ^ ADMIN_PASSWORD.charCodeAt(i);
  }
  return mismatch === 0;
}
