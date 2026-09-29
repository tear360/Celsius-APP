/**
 * Choisit la plateforme cible d'une action.
 *
 * Regle : on privilegie la plateforme de l'appareil courant, et on ne bascule sur
 * l'autre que si celle-ci n'a aucun binaire dans la release. Candidatement
 * Windows d'abord produit l'erreur « Cible non geree sur android » quand on
 * touche « Installer » depuis la fiche d'une app sur Android.
 */
export function preferredPlatform(app, current) {
  const here = current === 'android' ? 'android' : 'windows';
  const there = here === 'android' ? 'windows' : 'android';
  const platforms = app?.platforms || {};
  if (platforms[here]?.available) return here;
  if (platforms[there]?.available) return there;
  return here;
}
