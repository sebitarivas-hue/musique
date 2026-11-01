// Encodage WAV (RIFF, PCM entier 16 ou 24 bits, ou flottant 32 bits). Sans DOM : testé dans Node.
// Les échantillons au-delà de [-1, 1] sont écrêtés (et comptés) : un fichier PCM ne peut pas les porter.
// La conversion en entier arrondit au plus proche (pas de bruit de dither : l'export est fidèle au calcul).
export function encoderWAV(canaux, sr, bits = 16) {
  if (![16, 24, 32].includes(bits)) throw new Error("profondeur non gérée : " + bits + " (16, 24 ou 32 flottant)");
  const nc = canaux.length, n = canaux[0].length, octets = bits / 8, flottant = bits === 32;
  const donnees = n * nc * octets, buf = new ArrayBuffer(44 + donnees), v = new DataView(buf);
  const ecrireTxt = (o, t) => { for (let i = 0; i < t.length; i++) v.setUint8(o + i, t.charCodeAt(i)); };
  ecrireTxt(0, "RIFF"); v.setUint32(4, 36 + donnees, true); ecrireTxt(8, "WAVE"); ecrireTxt(12, "fmt ");
  v.setUint32(16, 16, true); v.setUint16(20, flottant ? 3 : 1, true); v.setUint16(22, nc, true); v.setUint32(24, sr, true);
  v.setUint32(28, sr * nc * octets, true); v.setUint16(32, nc * octets, true); v.setUint16(34, bits, true); ecrireTxt(36, "data"); v.setUint32(40, donnees, true);
  let o = 44, ecretes = 0;
  for (let i = 0; i < n; i++) for (let c = 0; c < nc; c++) {
    let x = canaux[c][i]; if (x !== x) x = 0;
    if (flottant) { v.setFloat32(o, x, true); o += 4; continue; }
    if (x > 1) { x = 1; ecretes++; } else if (x < -1) { x = -1; ecretes++; }
    if (bits === 16) { v.setInt16(o, Math.round(x < 0 ? x * 32768 : x * 32767), true); o += 2; }
    else { const e = Math.round(x < 0 ? x * 8388608 : x * 8388607); v.setUint8(o, e & 255); v.setUint8(o + 1, (e >> 8) & 255); v.setUint8(o + 2, (e >> 16) & 255); o += 3; }
  }
  return { octets: new Uint8Array(buf), ecretes };
}
// Relecture, pour les tests : renvoie { sr, bits, canaux: Float32Array[] }.
export function decoderWAV(octets) {
  const v = new DataView(octets.buffer, octets.byteOffset, octets.byteLength), txt = (o, n) => String.fromCharCode(...octets.subarray(o, o + n));
  if (txt(0, 4) !== "RIFF" || txt(8, 4) !== "WAVE" || txt(12, 4) !== "fmt " || txt(36, 4) !== "data") throw new Error("pas un WAV");
  const fmt = v.getUint16(20, true), nc = v.getUint16(22, true), sr = v.getUint32(24, true), bits = v.getUint16(34, true), n = v.getUint32(40, true) / (nc * bits / 8);
  const canaux = Array.from({ length: nc }, () => new Float32Array(n)); let o = 44;
  for (let i = 0; i < n; i++) for (let c = 0; c < nc; c++) {
    if (fmt === 3) { canaux[c][i] = v.getFloat32(o, true); o += 4; }
    else if (bits === 16) { const e = v.getInt16(o, true); canaux[c][i] = e < 0 ? e / 32768 : e / 32767; o += 2; }
    else { let e = v.getUint8(o) | (v.getUint8(o + 1) << 8) | (v.getUint8(o + 2) << 16); if (e & 0x800000) e |= ~0xffffff; canaux[c][i] = e < 0 ? e / 8388608 : e / 8388607; o += 3; }
  }
  return { sr, bits, canaux };
}
