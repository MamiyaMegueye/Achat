// Normalise une chaîne : minuscules, accents retirés, espaces superflus supprimés
export function normalizeSearch(str) {
  return (str || '')
    .toString()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim();
}

// Mots vides français à ignorer dans la recherche — trop fréquents pour être discriminants
const STOP_WORDS = new Set([
  'de', 'du', 'des', 'la', 'le', 'les', 'un', 'une', 'et', 'ou', 'a', 'au', 'aux',
  'pour', 'par', 'en', 'sur', 'sous', 'dans', 'avec', 'sans', 'ce', 'cette', 'ces',
  'son', 'sa', 'ses', 'notre', 'nos', 'votre', 'vos', 'leur', 'leurs',
  'est', 'sont', 'etre', 'avoir', 'ont', 'a',
]);

function extractWords(query) {
  return normalizeSearch(query)
    .split(/\s+/)
    .filter(Boolean)
    .filter(w => !STOP_WORDS.has(w));
}

// Vérifie que TOUS les mots de la requête apparaissent quelque part dans le texte,
// peu importe l'ordre — permet de retrouver un article composé en tapant un seul mot
// (ex: "collier" trouve "Collier strié PEHD DN160 sans bride")
export function matchesSearch(text, query) {
  if (!query || !query.trim()) return true;
  const words = extractWords(query);
  if (words.length === 0) return true; // requête composée uniquement de mots vides
  const normText = normalizeSearch(text);
  return words.every(w => normText.includes(w));
}

// Variante : vérifie si la requête matche au moins un des textes fournis
export function matchesAnySearch(texts, query) {
  if (!query || !query.trim()) return true;
  const words = extractWords(query);
  if (words.length === 0) return true;
  const normTexts = texts.map(t => normalizeSearch(t));
  return words.every(w => normTexts.some(t => t.includes(w)));
}