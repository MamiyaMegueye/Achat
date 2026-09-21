const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:8000';

import * as XLSX from 'xlsx';
import { importBonsCommande, importSuiviCmd, importCategorisation, importArticleCategorisation, importStructureDirection } from './storage';
import { parseBonsCommande, parseSuiviCmd } from './dataProcessor';

async function fetchBonsCommandeApi(since) {
  const url = since ? `${API_BASE}/commandes/bons?since=${since}` : `${API_BASE}/commandes/bons`;
  const res = await fetch(url);
  const rows = await res.json();

  return rows.map(r => ({
    structure: r.structure || '',
    date: r.date ? new Date(r.date) : null,
    annee: r.date ? new Date(r.date).getFullYear() : null,
    numBC: r.num_cmd || 0,
    codeArticle: r.code_article || '',
    qte: r.qte || 0,
    pu: r.pu || 0,
    totalHT: (r.qte || 0) * (r.pu || 0),
    totalTTC: null,
    fournisseur: r.fournisseur || '',
    objet: r.objet || '',
    article: r.article || '',
  }));
}

async function fetchSuiviCmdApi(since) {
  // Branche sur la vue suivi_cmd_complet (commandes + receptions + factures) :
  // couvre 2020-2023 en plus de 2024+. Paiement reste NULL pour 2020-2023
  // (source Oracle des paiements de cette periode pas encore identifiee).
  const url = since ? `${API_BASE}/commandes/suivi-complet?since=${since}` : `${API_BASE}/commandes/suivi-complet`;
  const res = await fetch(url);
  const rows = await res.json();

  return rows.map(r => ({
    numCmd: r.num_cmd || 0,
    anCmd: r.an_cmd,
    datCde: r.datcde ? new Date(r.datcde) : null,
    dateAffichage: r.date_affichage ? new Date(r.date_affichage) : null,
    delaiLivraison: r.delaicde ? new Date(r.delaicde) : null,
    // --- Demande d'Achat (DA) ---
    // N° et annee : priorite a xan_da/xnumda (STK_CMD, toujours a jour des la
    // creation de la commande) plutot qu'an_da/numda (SUIVI_CMD, qui accuse un
    // retard de synchro sur les commandes recentes) -- numero et annee de DA
    // suffisent, pas besoin de la date de la DA elle-meme.
    anDa: r.xan_da != null ? r.xan_da : (r.an_da != null ? r.an_da : null),
    numDa: r.xnumda != null ? r.xnumda : (r.numda != null ? r.numda : null),
    datDa: r.datda ? new Date(r.datda) : null,
    objDa: r.objda || '',
    libelleDa: r.libelle || '',
    demandeur: r.demandeur || '',
    numAff: r.num_aff || null,
    dateLimite: r.date_limite ? new Date(r.date_limite) : null,
    dateClot: r.date_clot ? new Date(r.date_clot) : null,
    codeFour: Number(r.cod_four) || 0,
    nomFrn: r.nom_frn || '',
    obsCde: r.obs_cde || '',
    montHT: r.mt_ht,
    montTTC: r.montcde,
    numRec: r.num_rec,
    datRec: r.dat_rec ? new Date(r.dat_rec) : null,
    factAnnee: null,
    factNumOrdre: null,
    factNumFact: r.fact_num_fact,
    factDateFact: r.fact_dat_fact ? new Date(r.fact_dat_fact) : null,
    factDateFr: r.fact_dat_fr ? new Date(r.fact_dat_fr) : null,
    paiementAnnee: r.paiement_annee,
    paiementNumOrdre: r.paiement_num_ordre ? String(r.paiement_num_ordre).trim() : null,
    paiementDate: r.paiement_date ? new Date(r.paiement_date) : null,
    paiementMontant: r.paiement_montant,
  }));
}

// --- Fichiers consolides "Suivi CMD" et "Liste Periodique BC" (toutes annees) ---
// Lus directement depuis le dossier categorisation cote serveur (voir
// /commandes/global-files) : evite le reimport manuel en mode Excel. Parses avec
// les memes fonctions que l'upload manuel (parseSuiviCmd / parseBonsCommande),
// pour un comportement identique.

async function fetchGlobalFilesMeta() {
  const res = await fetch(`${API_BASE}/commandes/global-files/meta`);
  if (!res.ok) throw new Error(`global-files/meta HTTP ${res.status}`);
  return res.json(); // { "suivi-cmd": {exists, mtime}, "liste-periodique": {exists, mtime} }
}

async function fetchGlobalWorkbook(key) {
  const res = await fetch(`${API_BASE}/commandes/global-files/${key}`);
  if (!res.ok) throw new Error(`global-files/${key} HTTP ${res.status}`);
  const buf = await res.arrayBuffer();
  return XLSX.read(new Uint8Array(buf), { type: 'array', cellDates: false });
}

// N'importe chaque fichier global que s'il a change depuis le dernier import
// (mtime compare a une valeur retenue en localStorage).
async function syncGlobalFilesIfChanged(force = false) {
  const results = {};
  try {
    const meta = await fetchGlobalFilesMeta();

    const suiviMeta = meta['suivi-cmd'];
    if (suiviMeta && suiviMeta.exists && suiviMeta.mtime) {
      const key = 'global_suivi_cmd_last_mtime';
      if (force || suiviMeta.mtime !== localStorage.getItem(key)) {
        const wb = await fetchGlobalWorkbook('suivi-cmd');
        const rows = parseSuiviCmd(wb);
        results.suiviCmd = await importSuiviCmd(rows);
        localStorage.setItem(key, suiviMeta.mtime);
      }
    }

    const bcMeta = meta['liste-periodique'];
    if (bcMeta && bcMeta.exists && bcMeta.mtime) {
      const key = 'global_liste_bc_last_mtime';
      if (force || bcMeta.mtime !== localStorage.getItem(key)) {
        const wb = await fetchGlobalWorkbook('liste-periodique');
        const rows = parseBonsCommande(wb);
        results.bc = await importBonsCommande(rows);
        localStorage.setItem(key, bcMeta.mtime);
      }
    }
  } catch (err) {
    console.error('Sync fichiers globaux echouee:', err);
  }
  return results;
}

// Rafraichissement manuel (bouton) : relit fichiers globaux + categorisation
// directement depuis le serveur, quel que soit le mode actif (Excel ou Base) --
// utile en mode Excel ou rien n'est resynchronise automatiquement en arriere-plan.
export async function refreshGlobalFilesAndCategorisation() {
  const globalFilesResult = await syncGlobalFilesIfChanged(true);
  const catResult = await syncCategorisationIfChanged(true);
  return { globalFilesResult, catResult };
}

// --- Categorisation des articles (famille_achat / nature_article) ---
// Lue directement depuis articles_categorises.xlsx cote serveur (voir
// /commandes/categorisation) : evite le reimport manuel du fichier en mode Excel.

async function fetchCategorisationMeta() {
  const res = await fetch(`${API_BASE}/commandes/categorisation/meta`);
  if (!res.ok) throw new Error(`categorisation/meta HTTP ${res.status}`);
  return res.json(); // { exists, mtime }
}

async function fetchCategorisationApi() {
  const res = await fetch(`${API_BASE}/commandes/categorisation`);
  if (!res.ok) throw new Error(`categorisation HTTP ${res.status}`);
  const data = await res.json();

  const detailRows = (data.detail || []).map(r => ({
    structure: String(r['Structure'] || '').trim(),
    nomStructure: String(r['Nom Structure'] || '').trim(),
    annee: r['Annee'] != null ? Number(r['Annee']) : null,
    grandeCategorie: String(r["Famille d'achat"] || '').trim(),
    categorie: String(r['Categorie'] || '').trim(),
    sousType: String(r["Nature d'article"] || '').trim(),
    nbLignes: Number(r['Nb lignes']) || 0,
    montantHT: Number(r['Montant HT']) || 0,
    totalStructure: Number(r['Total structure']) || 0,
    pctStructure: Number(r['% de la structure']) || 0,
  })).filter(r => r.structure);

  const sourceRows = (data.source || []).map(r => {
    const codeRaw = r['CODE ARTICLE'];
    const codeArticle = codeRaw != null
      ? (typeof codeRaw === 'number' ? String(Math.trunc(codeRaw)) : String(codeRaw).trim())
      : null;
    const numBC = Number(r['N° BC']) || null;
    return {
      numBC,
      codeArticle,
      structure: String(r['Structure'] || '').trim(),
      annee: r['Année'] != null ? Number(r['Année']) : null,
      grandeCategorie: String(r["Famille d'achat"] || '').trim(),
      categorie: String(r['categorie'] || r['Categorie'] || '').trim(),
      sousType: String(r["Nature d'article"] || '').trim(),
    };
  }).filter(r => r.codeArticle && r.numBC);

  return { detailRows, sourceRows, mtime: data.mtime };
}

// Importe la categorisation seulement si le fichier a change depuis le dernier
// import (mtime compare a une valeur retenue en localStorage).
async function syncCategorisationIfChanged(force = false) {
  const CAT_MTIME_KEY = 'categorisation_last_mtime';
  try {
    const meta = await fetchCategorisationMeta();
    if (!meta.exists || !meta.mtime) return null;
    if (!force && meta.mtime === localStorage.getItem(CAT_MTIME_KEY)) return null;

    const { detailRows, sourceRows, mtime } = await fetchCategorisationApi();
    await importCategorisation(detailRows);
    await importArticleCategorisation(sourceRows);
    localStorage.setItem(CAT_MTIME_KEY, mtime);
    return { detail: detailRows.length, source: sourceRows.length };
  } catch (err) {
    console.error('Sync categorisation echouee:', err);
    return null;
  }
}

// --- Correspondance Code Structure (COD_DIR) -> libelle Direction/Service ---
// Lue directement depuis code_structure_direction.xlsx cote serveur (voir
// /commandes/code-structure-direction) : meme principe que la categorisation.

async function fetchStructureDirectionMeta() {
  const res = await fetch(`${API_BASE}/commandes/code-structure-direction/meta`);
  if (!res.ok) throw new Error(`code-structure-direction/meta HTTP ${res.status}`);
  return res.json(); // { exists, mtime }
}

async function fetchStructureDirectionApi() {
  const res = await fetch(`${API_BASE}/commandes/code-structure-direction`);
  if (!res.ok) throw new Error(`code-structure-direction HTTP ${res.status}`);
  const data = await res.json();
  const rows = (data.rows || []).map(r => ({
    code: String(r['Code Structure'] || '').trim().toUpperCase(),
    direction: String(r['Direction'] || '').trim(),
  })).filter(r => r.code);
  return { rows, mtime: data.mtime };
}

async function syncStructureDirectionIfChanged(force = false) {
  const MTIME_KEY = 'structure_direction_last_mtime';
  try {
    const meta = await fetchStructureDirectionMeta();
    if (!meta.exists || !meta.mtime) return null;
    if (!force && meta.mtime === localStorage.getItem(MTIME_KEY)) return null;

    const { rows, mtime } = await fetchStructureDirectionApi();
    await importStructureDirection(rows);
    localStorage.setItem(MTIME_KEY, mtime);
    return { rows: rows.length };
  } catch (err) {
    console.error('Sync code-structure-direction echouee:', err);
    return null;
  }
}

// Date de polling (derniere synchro Oracle -> Postgres) par table source.
export async function fetchSyncStatus() {
  const res = await fetch(`${API_BASE}/commandes/sync-status`);
  if (!res.ok) throw new Error(`sync-status HTTP ${res.status}`);
  const rows = await res.json();
  return rows.map(r => ({
    tableSource: r.table_source,
    dernierDatEcr: r.dernier_dat_ecr ? new Date(r.dernier_dat_ecr) : null,
    derniereExecution: r.derniere_execution ? new Date(r.derniere_execution) : null,
  }));
}

export async function syncFromApi(since) {
  const bcRows = await fetchBonsCommandeApi(since);
  const bcResult = await importBonsCommande(bcRows);

  const cmdRows = await fetchSuiviCmdApi(since);
  const cmdResult = await importSuiviCmd(cmdRows);

  const catResult = await syncCategorisationIfChanged();
  const structureDirResult = await syncStructureDirectionIfChanged();
  const globalFilesResult = await syncGlobalFilesIfChanged();

  return { bcResult, cmdResult, catResult, structureDirResult, globalFilesResult };
}