// Lien de retour des pages SONORA : ramène là où l'on était avant d'entrer (espace élèves ou espace enseignant).
// L'origine est retenue pour la session ; sans origine connue, le lien mène au choix élève ou enseignant.
(function () {
  const CLE = "sonora:origine"; let origine = null;
  try { origine = sessionStorage.getItem(CLE); } catch (_) {}
  try { if (document.referrer) { const u = new URL(document.referrer); if (u.origin === location.origin && !u.pathname.includes("/sonora/")) { origine = u.href; try { sessionStorage.setItem(CLE, origine); } catch (_) {} } } } catch (_) {}
  const a = document.querySelector("a.retour"); if (a && origine) a.href = origine;
})();
