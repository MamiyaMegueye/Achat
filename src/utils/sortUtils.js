// Utilitaires de tri partagés entre toutes les pages.
//
// Pourquoi le tri se mélangeait parfois : les colonnes du tableau contiennent
// des valeurs de types différents selon les lignes (Date pour certaines,
// chaîne vide '' ou null pour les valeurs manquantes, nombre pour d'autres,
// parfois un nombre stocké sous forme de texte comme '9' ou '10'). Le
// comparateur `<`/`>` natif de JavaScript ne connaît pas ces cas : une chaîne
// vide, `null` ou `undefined` n'est ni "plus grand" ni "plus petit" de façon
// cohérente, et deux nombres écrits en texte se comparent alors lettre par
// lettre ("10" passe avant "9"). Le tri paraît alors mélangé. Cette fonction
// normalise chaque valeur selon son type réel avant de la comparer, et place
// systématiquement les valeurs manquantes en fin de liste (quel que soit le
// sens du tri) pour un résultat stable.

export function compareValues(va, vb) {
  if (va instanceof Date) va = isNaN(va.getTime()) ? null : va.getTime();
  if (vb instanceof Date) vb = isNaN(vb.getTime()) ? null : vb.getTime();

  const aEmpty = va === null || va === undefined || va === '';
  const bEmpty = vb === null || vb === undefined || vb === '';
  if (aEmpty && bEmpty) return 0;
  if (aEmpty) return 1;
  if (bEmpty) return -1;

  // Deux chaînes : si les deux ressemblent à des nombres, comparer
  // numériquement (sinon "10" se retrouve avant "9") ; sinon comparaison
  // alphabétique insensible à la casse.
  if (typeof va === 'string' && typeof vb === 'string') {
    const na = Number(va.replace(',', '.'));
    const nb = Number(vb.replace(',', '.'));
    if (va.trim() !== '' && vb.trim() !== '' && !isNaN(na) && !isNaN(nb)) {
      return na - nb;
    }
    return va.localeCompare(vb, 'fr', { sensitivity: 'base' });
  }

  if (typeof va === 'number' && typeof vb === 'number') return va - vb;

  // Types mixtes (ex: nombre vs texte) : tenter une comparaison numérique,
  // sinon retomber sur une comparaison textuelle.
  const na = Number(va);
  const nb = Number(vb);
  if (!isNaN(na) && !isNaN(nb)) return na - nb;
  return String(va).localeCompare(String(vb), 'fr', { sensitivity: 'base' });
}

// Trie une copie du tableau `rows` selon la clé `key` (ou une fonction
// d'extraction `getValue(row)` si fournie), dans le sens `dir` ('asc'|'desc').
export function sortRows(rows, key, dir, getValue) {
  const extract = getValue || ((row) => row[key]);
  return [...rows].sort((a, b) => {
    const cmp = compareValues(extract(a), extract(b));
    return dir === 'asc' ? cmp : -cmp;
  });
}

// Fabrique une fonction toggleSort(key) prête à l'emploi à partir des setters
// useState d'un composant : premier clic sur une colonne -> tri ascendant,
// reclique sur la même colonne -> inverse le sens.
export function makeToggleSort(sortKey, setSortKey, setSortDir) {
  return (key) => {
    if (sortKey === key) {
      setSortDir(d => (d === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortKey(key);
      setSortDir('asc');
    }
  };
}
