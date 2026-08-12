import { openDB } from 'idb';

const DB_NAME = 'snde-achats';
const DB_VERSION = 1;

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
      if (!db.objectStoreNames.contains('suivi_cmd')) {
        const cmdStore = db.createObjectStore('suivi_cmd', { keyPath: 'numCmd' });
        cmdStore.createIndex('codeFour', 'codeFour');
        cmdStore.createIndex('nomFrn', 'nomFrn');
      }
      if (!db.objectStoreNames.contains('import_log')) {
        db.createObjectStore('import_log', { keyPath: 'id', autoIncrement: true });
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
    const existing = await store.get(row.numCmd);
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
        await store.put({ ...existing, ...row });
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
}

export async function getDataCounts() {
  const db = await getDB();
  const bcCount = await db.count('bons_commande');
  const cmdCount = await db.count('suivi_cmd');
  return { bcCount, cmdCount };
}
