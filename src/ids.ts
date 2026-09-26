// Small, boring id helpers. An 18-year file should not depend on anything
// clever. crypto.randomUUID exists in every browser we target; the fallback
// keeps tests and old engines happy.
export function randomId(): string {
  const c = globalThis.crypto as Crypto | undefined;
  if (c && typeof c.randomUUID === "function") return c.randomUUID();
  let out = "";
  for (let i = 0; i < 32; i++) out += Math.floor(Math.random() * 16).toString(16);
  return out;
}
