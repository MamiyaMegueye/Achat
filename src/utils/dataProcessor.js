import * as XLSX from 'xlsx';

function excelSerialToDate(serial) {
  // Excel epoch: December 30, 1899
  // serial 1 = Jan 1, 1900
  const msPerDay = 86400000;
  const epoch = new Date(1899, 11, 30);
  return new Date(epoch.getTime() + serial * msPerDay);
}

function parseExcelDate(val) {
  if (!val) return null;

  // Already a valid Date object
  if (val instanceof Date) {
    if (isNaN(val.getTime())) return null;
    const year = val.getFullYear();
    if (year < 1990 || year > 2040) return null;
    return val;
  }

  // Excel serial date number — convert manually (XLSX.SSF.parse_date_code may not exist)
  if (typeof val === 'number') {
    if (val < 30000 || val > 60000) return null;
    const d = excelSerialToDate(val);
    if (!isNaN(d.getTime()) && d.getFullYear() >= 1990 && d.getFullYear() <= 2040) {
      return d;
    }
    return null;
  }

  if (typeof val === 'string') {
    const s = val.replace(/\s+00:00:00$/, '').trim();
    if (!s) return null;

    // Try DD/MM/YYYY first (most common in French data)
    const parts = s.match(/^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})$/);
    if (parts) {
      const d = new Date(+parts[3], +parts[2] - 1, +parts[1]);
      if (!isNaN(d.getTime()) && d.getFullYear() >= 1990) return d;
    }

    // Try ISO / natural parsing
    const d = new Date(s);
    if (!isNaN(d.getTime()) && d.getFullYear() >= 1990 && d.getFullYear() <= 2040) {
      return d;
    }
  }

  return null;
}

function cleanStr(v) {
  if (!v) return '';
  return String(v).replace(/\/\/$/g, '').replace(/\/\//g, '').trim();
}

// Flexible column getter: tries exact name, with trailing space,
// and case-insensitive partial match
function makeGetter(row, colNames) {
  // Cache column names for fuzzy matching
  if (!makeGetter._cols) {
    makeGetter._cols = colNames;
  }
  return (...keys) => {
    for (const k of keys) {
      // Exact match
      if (row[k] !== undefined && row[k] !== null) return row[k];
      // With trailing space
      if (row[k + ' '] !== undefined && row[k + ' '] !== null) return row[k + ' '];
    }
    // Fuzzy: case-insensitive match against actual column names
    for (const k of keys) {
      const lower = k.toLowerCase().replace(/[\s_]+/g, '');
      for (const col of colNames) {
        const colLower = col.toLowerCase().replace(/[\s_]+/g, '');
        if (colLower === lower && row[col] !== undefined && row[col] !== null) {
          return row[col];
        }
      }
    }
    return null;
  };
}

// --- Parse Fichier 1: ListePeriodiqueBC ---

export function parseBonsCommande(workbook) {
  const sheetName = workbook.SheetNames[0];
  const rows = XLSX.utils.sheet_to_json(workbook.Sheets[sheetName], { defval: null });
  if (rows.length === 0) return [];

  const colNames = Object.keys(rows[0]);
  console.log('[SNDE] Colonnes Fichier BC:', colNames);

  const parsed = rows
    .filter(r => {
      const struct = (r['Structure'] || r['Structure '] || '').toString().trim();
      return struct && struct.length > 0;
    })
    .map(r => {
      const get = makeGetter(r, colNames);

      return {
        structure: cleanStr(get('Structure')),
        date: parseExcelDate(get('Date')),
        annee: get('Année', 'Annee', 'ANNEE'),
        numBC: Number(get('N° BC', 'N°BC', 'NUM_BC')) || 0,
        codeArticle: String(get('CODE ARTICLE', 'CODE_ARTICLE', 'CODEARTICLE') || '').trim(),
        qte: Number(get('QTE', 'Qte', 'QUANTITE')) || 0,
        pu: Number(get('PU', 'PRIX UNITAIRE', 'PRIX_UNITAIRE')) || 0,
        totalHT: Number(get('TOTAL HT', 'TOTAL_HT', 'TOTALHT')) || 0,
        totalTTC: Number(get('TOTAL TTC', 'TOTAL_TTC', 'TOTALTTC')) || 0,
        fournisseur: cleanStr(get('FOURNISSEUR', 'NOM_FRN')),
        objet: cleanStr(get('OBJET', 'OBS_CDE')),
        article: cleanStr(get('ARTICLE', 'DESIGNATION')),
      };
    })
    .filter(r => r.numBC > 0);

  // === Normalisation des noms d'articles ===
  // Pour chaque CODE ARTICLE, le nom le plus fréquent devient le nom canonique
  const nameCount = {};
  parsed.forEach(r => {
    if (!r.codeArticle || !r.article) return;
    if (!nameCount[r.codeArticle]) nameCount[r.codeArticle] = {};
    nameCount[r.codeArticle][r.article] = (nameCount[r.codeArticle][r.article] || 0) + 1;
  });

  const canonicalNames = {};
  for (const code in nameCount) {
    const names = nameCount[code];
    let bestName = '';
    let bestCount = 0;
    for (const name in names) {
      if (names[name] > bestCount) {
        bestCount = names[name];
        bestName = name;
      }
    }
    canonicalNames[code] = bestName;
  }

  // Appliquer le nom canonique
  let normalized = 0;
  parsed.forEach(r => {
    if (r.codeArticle && canonicalNames[r.codeArticle] && r.article !== canonicalNames[r.codeArticle]) {
      r.article = canonicalNames[r.codeArticle];
      normalized++;
    }
  });

  if (normalized > 0) {
    console.log(`[SNDE] Normalisation: ${normalized} noms d'articles corrigés`);
  }

  return parsed;
}

// --- Parse Fichier 2: Suivi CMD ---

export function parseSuiviCmd(workbook) {
  const sheetName = workbook.SheetNames[0];
  const rows = XLSX.utils.sheet_to_json(workbook.Sheets[sheetName], { defval: null });
  if (rows.length === 0) return [];

  const colNames = Object.keys(rows[0]);
  console.log('[SNDE] Colonnes Fichier CMD:', colNames);

  // Debug: show first row values for date columns
  const firstRow = rows.find(r => r['NUM_CMD']);
  if (firstRow) {
    console.log('[SNDE] Exemple 1ère ligne:', {
      NUM_CMD: firstRow['NUM_CMD'],
      DATCDE: firstRow['DATCDE'],
      DAT_REC: firstRow['DAT_REC'],
      DELAI: firstRow['DELAI DE LIVRAISON'] || firstRow['DELAI_LIVRAISON'] || firstRow['DELAI'] || 'INTROUVABLE',
    });
    // Show all columns containing "DELAI" or "LIVR"
    const delaiCols = colNames.filter(c => /delai|livr/i.test(c));
    console.log('[SNDE] Colonnes contenant DELAI/LIVR:', delaiCols);
    const recCols = colNames.filter(c => /rec/i.test(c));
    console.log('[SNDE] Colonnes contenant REC:', recCols);
  }

  return rows
    .filter(r => {
      const numCmd = r['NUM_CMD'];
      return numCmd !== null && numCmd !== undefined;
    })
    .map(r => {
      const get = makeGetter(r, colNames);

      return {
        numCmd: Number(get('NUM_CMD')) || 0,
        anCmd: get('AN_CMD'),
        datCde: parseExcelDate(get('DATCDE', 'DAT_CDE', 'DATE_CDE', 'DATE COMMANDE')),
        delaiLivraison: parseExcelDate(get('DELAI DE LIVRAISON', 'DELAI_LIVRAISON', 'DELAI_DE_LIVRAISON', 'DELAILIVRAISON', 'DELAI')),
        codeFour: Number(get('COD_FOUR', 'CODE_FOUR')) || 0,
        nomFrn: cleanStr(get('NOM_FRN', 'NOM_FOURNISSEUR', 'FOURNISSEUR')),
        obsCde: cleanStr(get('OBS_CDE', 'OBJET', 'OBSERVATION')),
        montHT: Number(get('MONT HT', 'MONT_HT', 'MONTANT_HT', 'MONTHT')) || 0,
        montTTC: Number(get('MONT TTC', 'MONT_TTC', 'MONTANT_TTC', 'MONTTTC')) || 0,
        numRec: get('NUM_REC') ? Number(get('NUM_REC')) : null,
        datRec: parseExcelDate(get('DAT_REC', 'DATE_REC', 'DATE_RECEPTION', 'DATREC')),
        factAnnee: get('FACT_ANNEE') ? Number(get('FACT_ANNEE')) : null,
        factNumOrdre: get('FACT_NUM_ORDRE') ? String(get('FACT_NUM_ORDRE')).trim() : null,
        factNumFact: get('FACT_NUM_FACT') ? cleanStr(get('FACT_NUM_FACT')) : null,
        factDateFact: parseExcelDate(get('FACT_DAT_FACT', 'FACT_DATE_FACT')),
        factDateFr: parseExcelDate(get('FACT_DAT_FR', 'FACT_DATE_FR')),
        paiementAnnee: get('PAIEMENT_ANNEE', 'PAIEMENT_ANNEE '),
        paiementNumOrdre: get('PAIEMENT_NUM_ORDRE') ? String(get('PAIEMENT_NUM_ORDRE')).trim() : null,
        paiementDate: parseExcelDate(get('PAIEMENT_DATE', 'PAIEMENT_DAT', 'DATE_PAIEMENT')),
        paiementMontant: Number(get('PAIEMENT_MONTANT', 'PAIEMENT_MONT')) || null,
      };
    })
    .filter(r => r.numCmd > 0);
}

// --- Read file as workbook ---

export function readExcelFile(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const data = new Uint8Array(e.target.result);
        // cellDates:false → dates stay as serial numbers, we parse them ourselves
        const wb = XLSX.read(data, { type: 'array', cellDates: false });
        resolve(wb);
      } catch (err) {
        reject(err);
      }
    };
    reader.onerror = reject;
    reader.readAsArrayBuffer(file);
  });
}