// Séparation d'un morceau en stems (voix, batterie, basse, autres instruments) par réseau de neurones : les modèles Spleeter de Deezer (Jansson et al., ISMIR 2017 ; licence MIT pour le code ET les modèles),
// convertis en ONNX par outils/stems/construire_modeles.py et exécutés dans la page par onnxruntime-web (WebAssembly). Aucun son ne quitte l'appareil.
//
// Ce que fait ce fichier : le traitement du signal AUTOUR des réseaux, à l'identique de Spleeter (vérifié contre outils/stems/separer_ref.py) :
//   1. le son est mis à 44,1 kHz stéréo ; STFT : fenêtre de Hann périodique de 4096, pas de 1024, sans centrage (3072 zéros sont ajoutés avant le son, que Spleeter laisse sous-couvert : ici le début se reconstruit aussi) ;
//   2. par blocs de 512 trames, les 1024 premiers bins (jusqu'à 11 kHz) passent dans un réseau par instrument, qui estime l'amplitude de l'instrument ;
//   3. les estimations de tous les instruments donnent des masques doux de puissance 2 (leur somme vaut 1 : les stems s'additionnent pour redonner le morceau) ;
//   4. les masques sont appliqués au spectre COMPLEXE du morceau (la phase est celle du morceau) puis la STFT est inversée.
// Au-delà de 11 kHz le réseau ne voit rien : Spleeter y met des zéros (stems sans aigus). Ici (option `extension: "tenue"`, par défaut), le masque des derniers bins est prolongé : les cymbales et les « s » gardent leur aigu avec leur instrument,
// et la somme des quatre stems est exactement le morceau d'origine.
// Le réseau est caché derrière un « moteur » { executer(nom, Float32Array [1,2,512,1024]) -> Float32Array } : ce fichier se teste dans Node sans réseau de neurones (voir tests/stems.test.js).
import { fft } from "../science/analyse.js?v=b48919e0af";

export const STEMS = ["vocals", "drums", "bass", "other"];
export const NOMS_STEMS = { vocals: "Voix", drums: "Batterie", bass: "Basse", other: "Autres instruments" };
export const SR = 44100, L = 4096, PAS = 1024, T = 512, F = 1024, NB = L / 2 + 1, MARGE = L - PAS, DUREE_MAX = 240;   // 4 minutes : quatre stems stéréo de plus tiennent mal en mémoire
const FEN = Float64Array.from({ length: L }, (_, i) => 0.5 - 0.5 * Math.cos(2 * Math.PI * i / L));   // Hann périodique ; la somme de ses carrés à 75 % de recouvrement fait 1,5
const pause = () => new Promise(ok => setTimeout(ok, 0));

// Rééchantillonnage par interpolation cubique (Catmull-Rom). Utile seulement si le clip n'est pas à 44,1 kHz : le réseau ne voit que sous 11 kHz, l'interpolation y est fidèle.
export function reechantillonner(x, de, vers) {
  if (de === vers) return x; const n = Math.max(1, Math.round(x.length * vers / de)), y = new Float32Array(n), r = de / vers, m = x.length - 1;
  for (let i = 0; i < n; i++) { const p = i * r, k = Math.floor(p), f = p - k, a = x[Math.max(0, k - 1)], b = x[Math.min(m, k)], c = x[Math.min(m, k + 1)], d = x[Math.min(m, k + 2)]; y[i] = b + 0.5 * f * (c - a + f * (2 * a - 5 * b + 4 * c - d + f * (3 * (b - c) + d - a))); }
  return y;
}
// c : { canaux, sr } -> deux canaux à 44,1 kHz (un son mono est doublé).
export function versStereo44(c) { const g = reechantillonner(c.canaux[0], c.sr, SR), d = c.canaux.length > 1 ? reechantillonner(c.canaux[1], c.sr, SR) : g; return [g, d]; }

// Séparation proprement dite. x : [gauche, droite] à 44,1 kHz ; noms : les instruments, dans l'ordre des modèles ; moteur : voir plus haut.
// options : { rappel(p, texte), extension : "tenue" (défaut) ou "zeros" (comme Spleeter), signal : AbortSignal }. Renvoie { nom: [gauche, droite] } à 44,1 kHz, de même durée que x.
export async function separerAvecMoteur(x, noms, moteur, { rappel = null, extension = "tenue", signal = null } = {}) {
  const n = x[0].length, K = Math.max(1, Math.ceil((n + MARGE) / PAS)), blocs = Math.ceil(K / T), longueur = (K - 1) * PAS + L, sortie = {};
  for (const nom of noms) sortie[nom] = [new Float32Array(longueur), new Float32Array(longueur)];
  const re = [new Float64Array(L), new Float64Array(L)], im = [new Float64Array(L), new Float64Array(L)];
  for (let b = 0; b < blocs; b++) {
    if (signal && signal.aborted) throw new Error("Séparation annulée.");
    const k0 = b * T, nf = Math.min(T, K - k0), spec = [new Float32Array(T * NB * 2), new Float32Array(T * NB * 2)], mel = new Float32Array(2 * T * F);   // spec : (trame, bin, re/im)
    for (let c = 0; c < 2; c++) for (let i = 0; i < nf; i++) {
      const debut = (k0 + i) * PAS - MARGE; for (let j = 0; j < L; j++) { const q = debut + j; re[0][j] = q >= 0 && q < n ? x[c][q] * FEN[j] : 0; im[0][j] = 0; } fft(re[0], im[0]);
      for (let k = 0; k < NB; k++) { spec[c][(i * NB + k) * 2] = re[0][k]; spec[c][(i * NB + k) * 2 + 1] = im[0][k]; if (k < F) mel[(c * T + i) * F + k] = Math.hypot(re[0][k], im[0][k]); }
    }
    const est = {}; let somme = new Float32Array(2 * T * F);
    for (let s = 0; s < noms.length; s++) {
      if (rappel) rappel((b + s / noms.length) / blocs, `Bloc ${b + 1} sur ${blocs} : ${noms[s]}`); await pause();
      const e = await moteur.executer(noms[s], mel); est[noms[s]] = e; for (let i = 0; i < somme.length; i++) somme[i] += e[i] * e[i];
    }
    for (let i = 0; i < somme.length; i++) somme[i] += 1e-10;
    for (const nom of noms) {
      const e = est[nom];
      for (let c = 0; c < 2; c++) for (let i = 0; i < nf; i++) {
        const off = (c * T + i) * F; let moy = 0;
        for (let k = 0; k < NB; k++) {
          let m; if (k < F) { m = (e[off + k] * e[off + k] + 1e-10 / noms.length) / somme[off + k]; if (k >= F - 64) moy += m / 64; } else m = extension === "tenue" ? moy : 0;
          re[0][k] = spec[c][(i * NB + k) * 2] * m; im[0][k] = -spec[c][(i * NB + k) * 2 + 1] * m;   // le conjugué, pour inverser avec la FFT directe
        }
        for (let k = 1; k < L / 2; k++) { re[0][L - k] = re[0][k]; im[0][L - k] = -im[0][k]; } fft(re[0], im[0]);
        const o = sortie[nom][c], debut = (k0 + i) * PAS; for (let j = 0; j < L; j++) o[debut + j] += re[0][j] / L * FEN[j] / 1.5;
      }
    }
    if (rappel) rappel((b + 1) / blocs, `Bloc ${b + 1} sur ${blocs} terminé`); await pause();
  }
  for (const nom of noms) sortie[nom] = sortie[nom].map(o => o.subarray(MARGE, MARGE + n));
  return sortie;
}

// Séparer un clip { canaux, sr } : renvoie { vocals, drums, bass, other }, chacun { canaux, sr } dans la fréquence et le nombre de canaux du clip.
export async function separerStems(c, moteur, options = {}) {
  const duree = c.canaux[0].length / c.sr; if (duree > DUREE_MAX) throw new Error(`Ce clip dure ${Math.round(duree)} secondes : la séparation par intelligence artificielle est limitée à ${DUREE_MAX / 60} minutes (quatre stems stéréo prennent beaucoup de mémoire). Raccourcis le clip.`);
  const x = versStereo44(c), res = await separerAvecMoteur(x, options.noms || STEMS, moteur, options), sortie = {};
  for (const nom of Object.keys(res)) { const [g, d] = res[nom].map(o => reechantillonner(o, SR, c.sr).subarray(0, c.canaux[0].length)); sortie[nom] = { canaux: c.canaux.length > 1 ? [Float32Array.from(g), Float32Array.from(d)] : [Float32Array.from(g)], sr: c.sr }; }
  return sortie;
}

// ---------------------------------------------------------------- le moteur du navigateur : onnxruntime-web (WebAssembly, un seul fil : GitHub Pages ne permet pas SharedArrayBuffer)
const CACHE = "sonora-modeles-v1";
const lireOctets = async (url, rappel) => {
  const rep = await fetch(url); if (!rep.ok) throw new Error(`Le modèle « ${url.split("/").pop()} » n'a pas pu être téléchargé (${rep.status}).`);
  const total = +rep.headers.get("content-length") || 0, lecteur = rep.body && rep.body.getReader ? rep.body.getReader() : null; if (!lecteur) return new Uint8Array(await rep.arrayBuffer());
  const morceaux = []; let recu = 0; for (;;) { const { done, value } = await lecteur.read(); if (done) break; morceaux.push(value); recu += value.length; if (rappel && total) rappel(recu / total); }
  const o = new Uint8Array(recu); let p = 0; for (const m of morceaux) { o.set(m, p); p += m.length; } return o;
};
// Les modèles sont-ils déjà dans le navigateur ?
export async function modelesEnCache(base) { try { const c = await caches.open(CACHE); for (const s of STEMS) if (!(await c.match(new URL(`spleeter-${s}.onnx`, base).href))) return false; return true; } catch (_) { return false; } }
export const TAILLE_MODELES_MO = 40;
async function chargerORT(base) {
  if (window.ort && window.ort.InferenceSession) return window.ort;
  await new Promise((ok, ko) => { const s = document.createElement("script"); s.src = new URL("../vendor/ort/ort.wasm.min.js", base).href; s.onload = ok; s.onerror = () => ko(new Error("Le moteur de calcul (onnxruntime-web) n'a pas pu être chargé.")); document.head.append(s); });
  const ort = window.ort; ort.env.wasm.wasmPaths = new URL("../vendor/ort/", base).href; ort.env.wasm.numThreads = 1; ort.env.wasm.proxy = false; return ort;
}
// base : l'adresse du dossier des modèles (ex. new URL("./modeles/", import.meta.url)).
export async function creerMoteurORT(base, { rappel = null, noms = STEMS } = {}) {
  const ort = await chargerORT(base), sessions = {}; let cache = null; try { cache = await caches.open(CACHE); } catch (_) { /* navigation privée : pas de cache, on retélécharge */ }
  for (let i = 0; i < noms.length; i++) {
    const url = new URL(`spleeter-${noms[i]}.onnx`, base).href; let octets = null;
    if (cache) { const r = await cache.match(url); if (r) octets = new Uint8Array(await r.arrayBuffer()); }
    if (!octets) { octets = await lireOctets(url, p => rappel && rappel((i + p) / noms.length, `Téléchargement du modèle « ${noms[i]} » (${Math.round(p * 100)} %)`)); if (cache) { try { await cache.put(url, new Response(octets, { headers: { "content-type": "application/octet-stream" } })); } catch (_) { /* quota */ } } }
    if (rappel) rappel((i + 1) / noms.length, `Préparation du modèle « ${noms[i]} »`); await pause();
    sessions[noms[i]] = await ort.InferenceSession.create(octets, { executionProviders: ["wasm"], graphOptimizationLevel: "all" });
  }
  return {
    async executer(nom, mel) { const r = await sessions[nom].run({ melange: new ort.Tensor("float32", mel, [1, 2, T, F]) }); return r.estimation.data; },
    async fermer() { for (const s of Object.values(sessions)) { try { await s.release(); } catch (_) { /* déjà libérée */ } } },
  };
}
