// Partage par lien : le programme est compressé (deflate, natif : CompressionStream) puis écrit en base64url dans la partie # de l'adresse.
// Rien ne part vers un serveur : la partie # d'une adresse n'est jamais envoyée. Limite : une adresse très longue peut être refusée par certains messageries.
const VERSION = 1;
const versB64 = u8 => { let s = ""; for (let i = 0; i < u8.length; i += 8192) s += String.fromCharCode(...u8.subarray(i, i + 8192)); return btoa(s).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, ""); };
const depuisB64 = t => { const s = atob(t.replace(/-/g, "+").replace(/_/g, "/")); return Uint8Array.from(s, c => c.charCodeAt(0)); };
async function fluxVers(octets, Flux) {
  const f = new Flux("deflate-raw"), w = f.writable.getWriter();
  (async () => { await w.write(octets); await w.close(); })().catch(() => {}); // l'erreur remonte par la lecture
  const morceaux = []; const r = f.readable.getReader(); for (;;) { const { done, value } = await r.read(); if (done) break; morceaux.push(value); }
  const n = morceaux.reduce((s, m) => s + m.length, 0), out = new Uint8Array(n); let o = 0; for (const m of morceaux) { out.set(m, o); o += m.length; } return out;
}
export async function encoder({ source, titre = "" }) {
  const json = new TextEncoder().encode(JSON.stringify({ v: VERSION, s: source, t: titre }));
  return versB64(await fluxVers(json, CompressionStream));
}
export async function decoder(texte) {
  let json;
  try { json = new TextDecoder().decode(await fluxVers(depuisB64(texte), DecompressionStream)); } catch (e) { throw new Error("Ce lien de partage est abîmé ou incomplet."); }
  let o; try { o = JSON.parse(json); } catch (e) { throw new Error("Ce lien de partage est abîmé ou incomplet."); }
  if (!o || o.v !== VERSION || typeof o.s !== "string") throw new Error("Ce lien vient d'une autre version de SONORA.");
  if (o.s.length > 200000) throw new Error("Ce programme est trop long pour un lien de partage.");
  return { source: o.s, titre: typeof o.t === "string" ? o.t.slice(0, 80) : "" };
}
export const motif = /^#p=([A-Za-z0-9_-]+)$/;
