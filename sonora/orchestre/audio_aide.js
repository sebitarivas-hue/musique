// Petite aide partagée : les trois registres (grave, médium, aigu) de la zone jouable d'un instrument.
import { jouables } from "./donnees.js?v=d9eaf9b6ef";
export function registresDe_(inst) { const z = jouables(inst); if (!z) return null; const e = z[1] - z[0]; return [Math.round(z[0] + e * 0.12), Math.round((z[0] + z[1]) / 2), Math.round(z[1] - e * 0.12)]; }
