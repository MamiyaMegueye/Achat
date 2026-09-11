// Extrait les caractéristiques techniques numériques d'un libellé d'article
// (puissance, tension, courant, fréquence, diamètre, pression nominale, débit,
// HMT, section câble, vitesse rotation, poids, mémoire, capacité batterie,
// longueur mm/cm/km, puissance apparente VA, nombre de pôles)
// — utile pour repérer rapidement les specs d'un équipement sans ouvrir le détail.

function buildMatches(t) {
  const m = {};

  // Puissance : kW, kVA, CV, HP, W, MW
  m.puissance = t.match(/(\d+[.,]?\d*)\s*(mw|kw|kva|cv|hp|w)\b/);

  // Tension : kV, V, mV, VDC, VAC (courant continu/alternatif)
  m.tension = t.match(/(\d+[.,]?\d*)\s*(kv|mv|vdc|vac|v)\b/);

  // Puissance apparente : VA (volt-ampère, sans préfixe k — kVA déjà capté en puissance)
  m.va = t.match(/(\d+[.,]?\d*)\s*va\b/);

  // Courant électrique : A (ampères), mA, kA — nécessite un contexte numérique collé ou espacé
  m.courant = t.match(/(\d+[.,]?\d*)\s*(ka|ma|a)\b(?!h)/); // (?!h) évite de capter "Ah" (batterie)

  // Fréquence : Hz
  m.frequence = t.match(/(\d+[.,]?\d*)\s*hz\b/);

  // Diamètre : DN xxx ou DE xxx (2 à 4 chiffres)
  m.diametre = t.match(/\bdn\s?(\d{2,4})\b/) || t.match(/\bde\s?(\d{2,4})\b/);

  // Pression nominale (tuyauterie/vannes) : PN xx
  m.pn = t.match(/\bpn\s?(\d{1,3})\b/);

  // Nombre de pôles (contacteurs, disjoncteurs) : "4 pôles", "2poles"
  m.poles = t.match(/(\d+)\s*p[oô]les?\b/);

  // Débit : m3/h, l/s, l/min
  m.debit = t.match(/(\d+[.,]?\d*)\s*m3\s?\/?\s?h/);
  m.debitLs = !m.debit ? t.match(/(\d+[.,]?\d*)\s*l\s?\/\s?s\b/) : null;
  m.debitLmin = (!m.debit && !m.debitLs) ? t.match(/(\d+[.,]?\d*)\s*l\s?\/\s?min\b/) : null;

  // Volume / capacité : litres (hors débit l/s, l/min déjà captés ci-dessus)
  m.volume = (!m.debitLs && !m.debitLmin) ? t.match(/(\d+[.,]?\d*)\s*(litres?|l)(?!\s?\/)\b/) : null;

  // Pression : bars
  m.pression = t.match(/(\d+[.,]?\d*)\s*(bar|bars)\b/);

  // HMT (Hauteur Manométrique Totale) : "HMT 45m", "HMT 45 mce", "H = 30m"
  m.hmt = t.match(/hmt\s*[:=]?\s*(\d+[.,]?\d*)\s*(m|mce)?\b/) || t.match(/\bh\s*=\s*(\d+[.,]?\d*)\s*m\b/);

  // Section de câble électrique : mm² — souvent formaté "3x2.5mm2" ou "2,5 mm²"
  m.section = t.match(/(\d+[.,]?\d*)\s*mm(?:2|²)\b/);

  // Longueur : km, cm, mm (hors mm² déjà capté en section)
  m.longueurKm = t.match(/(\d+[.,]?\d*)\s*km\b/);
  m.longueurCm = !m.longueurKm ? t.match(/(\d+[.,]?\d*)\s*cm\b/) : null;
  m.longueurMm = (!m.section && !m.longueurKm && !m.longueurCm) ? t.match(/(\d+[.,]?\d*)\s*mm\b/) : null;

  // Vitesse de rotation : tr/min, rpm
  m.vitesse = t.match(/(\d+[.,]?\d*)\s*(tr\/min|rpm)\b/);

  // Poids / masse : kg, tonnes
  m.poids = t.match(/(\d+[.,]?\d*)\s*(kg|tonnes?|t)\b/);

  // Capacité batterie : Ah
  m.batterie = t.match(/(\d+[.,]?\d*)\s*ah\b/);

  // Mémoire / capacité informatique : Go, Gb, To, Tb
  m.memoire = t.match(/(\d+[.,]?\d*)\s*(to|tera|teraoctet|go|gb|giga|gigaoctet)\b/);

  return m;
}

// Version structurée : retourne des valeurs numériques exploitables pour filtrage
export function extractCaracteristiquesStructurees(texte) {
  if (!texte) return {};
  const t = String(texte).toLowerCase();
  const m = buildMatches(t);
  const result = {};

  if (m.puissance) {
    result.puissance = parseFloat(m.puissance[1].replace(',', '.'));
    result.puissanceUnite = m.puissance[2].toUpperCase();
  }
  if (m.tension && !(m.puissance && m.tension.index >= m.puissance.index && m.tension.index < m.puissance.index + m.puissance[0].length)) {
    result.tension = parseFloat(m.tension[1].replace(',', '.'));
    result.tensionUnite = m.tension[2].toUpperCase();
  }
  if (m.va) result.va = parseFloat(m.va[1].replace(',', '.'));
  if (m.courant) result.courant = parseFloat(m.courant[1].replace(',', '.'));
  if (m.frequence) result.frequence = parseFloat(m.frequence[1].replace(',', '.'));
  if (m.diametre) result.diametre = parseInt(m.diametre[1], 10);
  if (m.pn) result.pn = parseInt(m.pn[1], 10);
  if (m.poles) result.poles = parseInt(m.poles[1], 10);
  if (m.debit) result.debit = parseFloat(m.debit[1].replace(',', '.'));
  else if (m.debitLs) result.debitLs = parseFloat(m.debitLs[1].replace(',', '.'));
  else if (m.debitLmin) result.debitLmin = parseFloat(m.debitLmin[1].replace(',', '.'));
  if (m.pression) result.pression = parseFloat(m.pression[1].replace(',', '.'));
  if (m.hmt) result.hmt = parseFloat(m.hmt[1].replace(',', '.'));
  if (m.volume) result.volume = parseFloat(m.volume[1].replace(',', '.'));
  if (m.section) result.section = parseFloat(m.section[1].replace(',', '.'));
  if (m.longueurKm) result.longueurMm2 = parseFloat(m.longueurKm[1].replace(',', '.')) * 1000000;
  else if (m.longueurCm) result.longueurMm2 = parseFloat(m.longueurCm[1].replace(',', '.')) * 10;
  else if (m.longueurMm) result.longueurMm2 = parseFloat(m.longueurMm[1].replace(',', '.'));
  if (m.vitesse) result.vitesse = parseFloat(m.vitesse[1].replace(',', '.'));
  if (m.poids) {
    let val = parseFloat(m.poids[1].replace(',', '.'));
    if (m.poids[2].startsWith('t')) val *= 1000; // normaliser tonnes → kg
    result.poidsKg = val;
  }
  if (m.batterie) result.batterie = parseFloat(m.batterie[1].replace(',', '.'));
  if (m.memoire) {
    let val = parseFloat(m.memoire[1].replace(',', '.'));
    if (m.memoire[2].startsWith('t')) val *= 1000; // normaliser en Go
    result.memoireGo = val;
  }

  return result;
}

// Version texte affichable, dans l'ordre le plus lisible
export function extractCaracteristiques(texte) {
  if (!texte) return [];
  const t = String(texte).toLowerCase();
  const m = buildMatches(t);
  const resultats = [];

  if (m.puissance) resultats.push(`${m.puissance[1].replace(',', '.')} ${m.puissance[2].toUpperCase()}`);
  if (m.tension && !(m.puissance && m.tension.index >= m.puissance.index && m.tension.index < m.puissance.index + m.puissance[0].length)) {
    resultats.push(`${m.tension[1].replace(',', '.')} ${m.tension[2].toUpperCase()}`);
  }
  if (m.va) resultats.push(`${m.va[1].replace(',', '.')} VA`);
  if (m.courant) resultats.push(`${m.courant[1].replace(',', '.')} A`);
  if (m.frequence) resultats.push(`${m.frequence[1].replace(',', '.')} Hz`);
  if (m.diametre) resultats.push(`DN${m.diametre[1]}`);
  if (m.pn) resultats.push(`PN${m.pn[1]}`);
  if (m.poles) resultats.push(`${m.poles[1]} pôles`);
  if (m.debit) resultats.push(`${m.debit[1].replace(',', '.')} m³/h`);
  else if (m.debitLs) resultats.push(`${m.debitLs[1].replace(',', '.')} l/s`);
  else if (m.debitLmin) resultats.push(`${m.debitLmin[1].replace(',', '.')} l/min`);
  if (m.pression) resultats.push(`${m.pression[1].replace(',', '.')} bar`);
  if (m.hmt) resultats.push(`HMT ${m.hmt[1].replace(',', '.')}m`);
  if (m.volume) resultats.push(`${m.volume[1].replace(',', '.')} L`);
  if (m.section) resultats.push(`${m.section[1].replace(',', '.')} mm²`);
  if (m.longueurKm) resultats.push(`${m.longueurKm[1].replace(',', '.')} km`);
  else if (m.longueurCm) resultats.push(`${m.longueurCm[1].replace(',', '.')} cm`);
  else if (m.longueurMm) resultats.push(`${m.longueurMm[1].replace(',', '.')} mm`);
  if (m.vitesse) resultats.push(`${m.vitesse[1].replace(',', '.')} tr/min`);
  if (m.poids) {
    const unite = m.poids[2].startsWith('t') ? 'T' : 'kg';
    resultats.push(`${m.poids[1].replace(',', '.')} ${unite}`);
  }
  if (m.batterie) resultats.push(`${m.batterie[1].replace(',', '.')} Ah`);
  if (m.memoire) resultats.push(`${m.memoire[1].replace(',', '.')} ${m.memoire[2].toUpperCase()}`);

  return resultats;
}

export function formatCaracteristiques(texte) {
  const c = extractCaracteristiques(texte);
  return c.length > 0 ? c.join(' · ') : '';
}