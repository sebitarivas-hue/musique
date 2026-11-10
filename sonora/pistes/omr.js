// Lire une partition PDF ou image dans Pistes : le navigateur envoie le fichier à un service de lecture (outils/serveur_omr/), qui rend un MusicXML.
// Le service est cherché d'abord sur l'ordinateur de l'élève (127.0.0.1:8765, lancé par outils/serveur_omr/serveur.py), puis à l'adresse du service de la classe.
// Sans DOM : testé dans Node.
export const LOCAL = "http://127.0.0.1:8765";
export const SERVICE_CLASSE = "";   // l'adresse du service hébergé pour la classe, ex. "https://omr.exemple.fr" ; vide tant qu'il n'y en a pas
export const AIDE = "Pour lire un PDF, il faut le service de lecture de partitions. Sur ton ordinateur : « python3 outils/serveur_omr/serveur.py » (voir outils/serveur_omr/LISEZMOI.md), puis recommence. Sinon, exporte un MusicXML ou un MIDI depuis ton logiciel de notation.";

export const estImage = b => b.length > 8 && ((b[0] === 0x25 && b[1] === 0x50 && b[2] === 0x44 && b[3] === 0x46) || (b[0] === 0x89 && b[1] === 0x50 && b[2] === 0x4e && b[3] === 0x47) || (b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff));

const adresses = (extra = []) => { const l = [LOCAL, ...extra, SERVICE_CLASSE].filter(Boolean); try { const s = globalThis.localStorage && globalThis.localStorage.getItem("sonora:omr:url"); if (s) l.splice(1, 0, s); } catch (_) {} return [...new Set(l)]; };
const delai = (ms, f) => { const c = new AbortController(), t = setTimeout(() => c.abort(), ms); return f(c.signal).finally(() => clearTimeout(t)); };

// Le premier service qui répond : { url, local } ou null.
export async function trouverService({ fetch: ft = globalThis.fetch, urls = adresses() } = {}) {
  for (const url of urls) {
    try { const r = await delai(2500, signal => ft(url + "/sante", { signal })); if (r.ok && (await r.json()).service === "omr") return { url, local: url === LOCAL || /^http:\/\/(127\.0\.0\.1|localhost)[:/]/.test(url) }; } catch (_) { /* il ne répond pas : on essaie le suivant */ }
  }
  return null;
}

// Envoie le fichier ; rend { musicxml, rapport, parties, pages, doutes }. Les erreurs du service sont rendues telles quelles, en français.
export async function lireParService(octets, { url, instruments = "", tempo = "", titre = "", pages = "", fetch: ft = globalThis.fetch, delaiMax = 600000 } = {}) {
  const q = new URLSearchParams({ instruments, tempo: String(tempo || ""), titre, pages }); let r;
  try { r = await delai(delaiMax, signal => ft(`${url}/reconnaitre?${q}`, { method: "POST", body: octets, headers: { "Content-Type": "application/octet-stream" }, signal })); }
  catch (e) { throw new Error(e && e.name === "AbortError" ? "La lecture prend trop de temps : essaie avec moins de pages (une à trois à la fois)." : "Le service de lecture ne répond plus."); }
  let j = null; try { j = await r.json(); } catch (_) { /* réponse non JSON */ }
  if (!r.ok) throw new Error((j && j.erreur) || `Le service de lecture a répondu une erreur (${r.status}).`);
  if (!j || typeof j.musicxml !== "string") throw new Error("Réponse inattendue du service de lecture.");
  return j;
}
