import { openDB } from 'idb';

const DB_NAME = 'snde-achats';
const DB_VERSION = 6;

// --- Mode actif : 'excel' (upload manuel) ou 'api' (synchro base) ---
// Les deux modes sont isoles : chaque enregistrement est tagge avec son mode
// d'origine, et les lectures ne renvoient que les donnees du mode actif.
const MODE_KEY = 'achat_mode';

export function getActiveMode() {
  try {
    return localStorage.getItem(MODE_KEY) || 'excel';
  } catch {
    return 'excel';
  }
}

export function setActiveMode(mode) {
  try {
    localStorage.setItem(MODE_KEY, mode);
  } catch {
    // ignore (stockage indisponible)
  }
}

// Un enregistrement sans mode date d'avant l'introduction des deux modes :
// on le rattache par defaut au mode Excel (seul mode qui existait alors).
function matchesActiveMode(row, mode) {
  return row.mode === mode || (!row.mode && mode === 'excel');
}

async function getDB() {
  return openDB(DB_NAME, DB_VERSION, {
    upgrade(db) {
      if (!db.objectStoreNames.contains('bons_commande')) {
        const bcStore = db.createObjectStore('bons_commande', { keyPath: '_id' });
        bcStore.createIndex('numBC', 'numBC');
        bcStore.createIndex('codeArticle', 'codeArticle');
        bcStore.createIndex('fournisseur', 'fournisseur');
        bcStore.createIndex('structure', 'structure');
      }
      // Ne recree suivi_cmd que s'il n'existe pas encore : un delete+create
      // inconditionnel ici viderait toutes les commandes synchronisees a
      // chaque future montee de version (perte des donnees en mode Excel).
      if (!db.objectStoreNames.contains('suivi_cmd')) {
        const cmdStore = db.createObjectStore('suivi_cmd', { keyPath: '_id' });
        cmdStore.createIndex('numCmd', 'numCmd');
        cmdStore.createIndex('codeFour', 'codeFour');
        cmdStore.createIndex('nomFrn', 'nomFrn');
      }
      if (!db.objectStoreNames.contains('import_log')) {
        db.createObjectStore('import_log', { keyPath: 'id', autoIncrement: true });
      }
      if (!db.objectStoreNames.contains('categorisation')) {
        db.createObjectStore('categorisation', { keyPath: '_id', autoIncrement: true });
      }
      if (db.objectStoreNames.contains('article_categorisation')) {
        db.deleteObjectStore('article_categorisation'); // keyPath changé : codeArticle seul → composite BC+code
      }
      db.createObjectStore('article_categorisation', { keyPath: 'key' });
      // Correspondance Code Structure (COD_DIR) -> libelle direction/service.
      if (!db.objectStoreNames.contains('structure_direction')) {
        db.createObjectStore('structure_direction', { keyPath: 'code' });
      }
    }
  });
}

// --- Bons de Commande (Fichier 1) ---

export async function importBonsCommande(rows, mode = getActiveMode()) {
  const db = await getDB();
  const tx = db.transaction('bons_commande', 'readwrite');
  const store = tx.objectStore('bons_commande');

  let added = 0;
  let updated = 0;
  let skipped = 0;

  for (const row of rows) {
    // La structure ne fait plus partie de la clé : elle peut etre corrigee en
    // amont (ex: code direction reel remplacant un defaut) sans que ca cree une
    // ligne dupliquee -- elle doit alors ecraser la meme ligne, pas s'ajouter.
    const id = `${mode}-${row.annee}-${row.numBC}-${row.codeArticle}`;
    row._id = id;
    row.mode = mode;
    const existing = await store.get(id);
    if (!existing) {
      await store.put(row);
      added++;
    } else {
      // Met a jour si une correction en amont (Excel/API) a change une valeur,
      // pour que les corrections se propagent sans devoir tout effacer/reimporter.
      const changed = Object.keys(row).some(
        k => k !== '_id' && k !== 'mode' && JSON.stringify(row[k]) !== JSON.stringify(existing[k])
      );
      if (changed) {
        await store.put({ ...existing, ...row, _id: id, mode });
        updated++;
      } else {
        skipped++;
      }
    }
  }

  await tx.done;

  const logTx = db.transaction('import_log', 'readwrite');
  await logTx.objectStore('import_log').add({
    type: 'bons_commande',
    mode,
    date: new Date().toISOString(),
    totalRows: rows.length,
    added,
    updated,
    skipped
  });
  await logTx.done;

  return { added, updated, skipped };
}

export async function getAllBonsCommande() {
  const db = await getDB();
  const mode = getActiveMode();
  const all = await db.getAll('bons_commande');
  return all.filter(r => matchesActiveMode(r, mode));
}

// --- Suivi Commandes (Fichier 2) ---

export async function importSuiviCmd(rows, mode = getActiveMode()) {
  const db = await getDB();
  const tx = db.transaction('suivi_cmd', 'readwrite');
  const store = tx.objectStore('suivi_cmd');

  let added = 0;
  let updated = 0;
  let skipped = 0;

  for (const row of rows) {
    const id = `${mode}-${row.anCmd}-${row.numCmd}-${row.codeFour || 0}`;
    row._id = id;
    row.mode = mode;
    const existing = await store.get(id);
    if (!existing) {
      await store.put(row);
      added++;
    } else {
      // Si la ligne existante n'a pas de paiement/reception/facture/DA mais la
      // nouvelle oui → mettre à jour (ex: colonnes DA ajoutees a l'API apres coup,
      // deja presentes en base mais absentes des lignes importees precedemment).
      const hasNewData = (
        (!existing.paiementDate && row.paiementDate) ||
        (!existing.datRec && row.datRec) ||
        (!existing.factDateFact && row.factDateFact) ||
        (!existing.numDa && row.numDa) ||
        (!existing.dateAffichage && row.dateAffichage) ||
        (!existing.numAff && row.numAff) ||
        (!existing.dateLimite && row.dateLimite) ||
        (!existing.dateClot && row.dateClot) ||
        (!existing.objDa && row.objDa) ||
        (!existing.delaiLivraison && row.delaiLivraison)
      );
      if (hasNewData) {
        await store.put({ ...existing, ...row, _id: id, mode });
        updated++;
      } else {
        skipped++;
      }
    }
  }

  await tx.done;

  const logTx = db.transaction('import_log', 'readwrite');
  await logTx.objectStore('import_log').add({
    type: 'suivi_cmd',
    mode,
    date: new Date().toISOString(),
    totalRows: rows.length,
    added,
    updated,
    skipped
  });
  await logTx.done;

  return { added, updated, skipped };
}

export async function getAllSuiviCmd() {
  const db = await getDB();
  const mode = getActiveMode();
  const all = await db.getAll('suivi_cmd');
  return all.filter(r => matchesActiveMode(r, mode));
}

// --- Catégorisation Structure × Catégorie × Sous-type (Fichier 3, optionnel) ---

export async function importCategorisation(rows) {
  const db = await getDB();
  const tx = db.transaction('categorisation', 'readwrite');
  await tx.objectStore('categorisation').clear(); // remplace entièrement à chaque import
  for (const row of rows) {
    await tx.objectStore('categorisation').add(row);
  }
  await tx.done;
  return { added: rows.length };
}

export async function getAllCategorisation() {
  const db = await getDB();
  return db.getAll('categorisation');
}

// --- Correspondance Code Structure (COD_DIR) -> libellé Direction/Service ---

export async function importStructureDirection(rows) {
  const db = await getDB();
  const tx = db.transaction('structure_direction', 'readwrite');
  const store = tx.objectStore('structure_direction');
  await store.clear(); // remplace entièrement à chaque import
  for (const row of rows) {
    if (!row.code) continue;
    await store.put(row);
  }
  await tx.done;
  return { added: rows.length };
}

export async function getAllStructureDirection() {
  const db = await getDB();
  return db.getAll('structure_direction');
}

// --- Catégorisation détaillée par article (Fichier 4, optionnel) ---
// clé composite (numBC + codeArticle) -> { categorie, sousType, grandeCategorie }

export async function importArticleCategorisation(rows) {
  const db = await getDB();
  const tx = db.transaction('article_categorisation', 'readwrite');
  const store = tx.objectStore('article_categorisation');
  let added = 0;
  for (const row of rows) {
    if (!row.codeArticle || !row.numBC) continue;
    row.key = `${row.numBC}-${row.codeArticle}`;
    await store.put(row);
    added++;
  }
  await tx.done;
  return { added };
}

export async function getAllArticleCategorisation() {
  const db = await getDB();
  return db.getAll('article_categorisation');
}

// --- Utils ---

export async function getImportLog() {
  const db = await getDB();
  return db.getAll('import_log');
}

// Ne vide que les donnees du mode actif pour bons_commande/suivi_cmd (l'autre
// mode reste intact) ; categorisation/article_categorisation/import_log sont
// partagees entre les deux modes et sont toujours entierement videes.
export async function clearAllData() {
  const db = await getDB();
  const mode = getActiveMode();

  const tx1 = db.transaction('bons_commande', 'readwrite');
  const store1 = tx1.objectStore('bons_commande');
  for (const row of await store1.getAll()) {
    if (matchesActiveMode(row, mode)) await store1.delete(row._id);
  }
  await tx1.done;

  const tx2 = db.transaction('suivi_cmd', 'readwrite');
  const store2 = tx2.objectStore('suivi_cmd');
  for (const row of await store2.getAll()) {
    if (matchesActiveMode(row, mode)) await store2.delete(row._id);
  }
  await tx2.done;

  const tx3 = db.transaction('import_log', 'readwrite');
  await tx3.objectStore('import_log').clear();
  await tx3.done;
  const tx4 = db.transaction('categorisation', 'readwrite');
  await tx4.objectStore('categorisation').clear();
  await tx4.done;
  const tx5 = db.transaction('article_categorisation', 'readwrite');
  await tx5.objectStore('article_categorisation').clear();
  await tx5.done;
}

export async function getDataCounts() {
  const db = await getDB();
  const mode = getActiveMode();
  const allBc = await db.getAll('bons_commande');
  const allCmd = await db.getAll('suivi_cmd');
  const bcCount = allBc.filter(r => matchesActiveMode(r, mode)).length;
  const cmdCount = allCmd.filter(r => matchesActiveMode(r, mode)).length;
  const categorisationCount = await db.count('categorisation');
  const articleCategorisationCount = await db.count('article_categorisation');
  return { bcCount, cmdCount, categorisationCount, articleCategorisationCount };
}