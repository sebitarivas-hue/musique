// Liens d'écoute : chaque écoute a deux liens, une recherche Spotify et une recherche YouTube, comme partout sur le site (règle de Sébastien). Aucun enregistrement n'est copié : on ouvre la recherche.
const esc = s => String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
export const spotify = q => "https://open.spotify.com/search/" + encodeURIComponent(q);
export const youtube = q => "https://www.youtube.com/results?search_query=" + encodeURIComponent(q);
// Deux liens côte à côte pour une recherche q ; lib : le nom lu par les lecteurs d'écran.
export function liensEcoute(q, lib) {
  const nom = esc(lib || q);
  return '<span class="paire-ec"><a href="' + esc(spotify(q)) + '" target="_blank" rel="noopener">Spotify<span class="lecteur"> (recherche de ' + nom + ', nouvel onglet)</span></a><a href="' + esc(youtube(q)) + '" target="_blank" rel="noopener">YouTube<span class="lecteur"> (recherche de ' + nom + ', nouvel onglet)</span></a></span>';
}
