import { openDB } from 'idb';

const DB_NAME = 'snde-achats';
const DB_VERSION = 4;

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
      if (db.objectStoreNames.contains('suivi_cmd')) {
        db.deleteObjectStore('suivi_cmd');
      }
      const cmdStore = db.createObjectStore('suivi_cmd', { keyPath: '_id' });
      cmdStore.createIndex('numCmd', 'numCmd');
      cmdStore.createIndex('codeFour', 'codeFour');
      cmdStore.createIndex('nomFrn', 'nomFrn');
      if (!db.objectStoreNames.contains('import_log')) {
        db.createObjectStore('import_log', { keyPath: 'id', autoIncrement: true });
      }
      if (!db.objectStoreNames.contains('categorisation')) {
        db.createObjectStore('categorisation', { keyPath: '_id', autoIncrement: true });
      }
      if (!db.objectStoreNames.contains('article_categorisation')) {
        db.createObjectStore('article_categorisation', { keyPath: 'codeArticle' });
      }
    }
  });
}

// --- Bons de Commande (Fichier 1) ---

export async function importBonsCommande(rows) {
  const db = await getDB();
  const tx = db.transaction('bons_commande', 'readwrite');
  const store = tx.objectStore('bons_commande');

  let added = 0;
  let skipped = 0;

  for (const row of rows) {
    const id = `${row.numBC}-${row.codeArticle}-${row.structure}`;
    row._id = id;
    const existing = await store.get(id);
    if (!existing) {
      await store.put(row);
      added++;
    } else {
      skipped++;
    }
  }

  await tx.done;

  const logTx = db.transaction('import_log', 'readwrite');
  await logTx.objectStore('import_log').add({
    type: 'bons_commande',
    date: new Date().toISOString(),
    totalRows: rows.length,
    added,
    skipped
  });
  await logTx.done;

  return { added, skipped };
}

export async function getAllBonsCommande() {
  const db = await getDB();
  return db.getAll('bons_commande');
}

// --- Suivi Commandes (Fichier 2) ---

export async function importSuiviCmd(rows) {
  const db = await getDB();
  const tx = db.transaction('suivi_cmd', 'readwrite');
  const store = tx.objectStore('suivi_cmd');

  let added = 0;
  let updated = 0;
  let skipped = 0;

  for (const row of rows) {
    const id = `${row.numCmd}-${row.codeFour || 0}`;
    row._id = id;
    const existing = await store.get(id);
    if (!existing) {
      await store.put(row);
      added++;
    } else {
      // Si la ligne existante n'a pas de paiement mais la nouvelle oui → mettre à jour
      const hasNewData = (
        (!existing.paiementDate && row.paiementDate) ||
        (!existing.datRec && row.datRec) ||
        (!existing.factDateFact && row.factDateFact)
      );
      if (hasNewData) {
        await store.put({ ...existing, ...row, _id: id });
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
  return db.getAll('suivi_cmd');
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

// --- Catégorisation détaillée par article (Fichier 4, optionnel) ---
// codeArticle -> { categorie, sousType, grandeCategorie }

export async function importArticleCategorisation(rows) {
  const db = await getDB();
  const tx = db.transaction('article_categorisation', 'readwrite');
  const store = tx.objectStore('article_categorisation');
  let added = 0;
  for (const row of rows) {
    if (!row.codeArticle) continue;
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

export async function clearAllData() {
  const db = await getDB();
  const tx1 = db.transaction('bons_commande', 'readwrite');
  await tx1.objectStore('bons_commande').clear();
  await tx1.done;
  const tx2 = db.transaction('suivi_cmd', 'readwrite');
  await tx2.objectStore('suivi_cmd').clear();
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
  const bcCount = await db.count('bons_commande');
  const cmdCount = await db.count('suivi_cmd');
  const categorisationCount = await db.count('categorisation');
  const articleCategorisationCount = await db.count('article_categorisation');
  return { bcCount, cmdCount, categorisationCount, articleCategorisationCount };
}