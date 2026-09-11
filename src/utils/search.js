// Normalise une chaîne : minuscules, accents retirés, espaces superflus supprimés
export function normalizeSearch(str) {
  return (str || '')
    .toString()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim();
}

// Vérifie que TOUS les mots de la requête apparaissent quelque part dans le texte,
// peu importe l'ordre — permet de retrouver un article composé en tapant un seul mot
// (ex: "collier" trouve "Collier strié PEHD DN160 sans bride")
export function matchesSearch(text, query) {
  if (!query || !query.trim()) return true;
  const words = normalizeSearch(query).split(/\s+/).filter(Boolean);
  const normText = normalizeSearch(text);
  return words.every(w => normText.includes(w));
}

// Variante : vérifie si la requête matche au moins un des textes fournis
export function matchesAnySearch(texts, query) {
  if (!query || !query.trim()) return true;
  const words = normalizeSearch(query).split(/\s+/).filter(Boolean);
  const normTexts = texts.map(t => normalizeSearch(t));
  return words.every(w => normTexts.some(t => t.includes(w)));
}