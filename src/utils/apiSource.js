const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:8000';

export async function getBonsCommandeApi() {
  const res = await fetch(`${API_BASE}/commandes/bons`);
  const rows = await res.json();

  return rows.map(r => ({
    structure: '0055',
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

export async function getSuiviCmdApi() {
  const res = await fetch(`${API_BASE}/commandes/suivi`);
  const rows = await res.json();

  return rows.map(r => ({
    numCmd: r.num_cmd || 0,
    anCmd: r.an_cmd,
    datCde: r.datcde ? new Date(r.datcde) : null,
    dateAffichage: r.date_affichage ? new Date(r.date_affichage) : null,
    delaiLivraison: null,
    codeFour: Number(r.cod_four) || 0,
    nomFrn: r.nom_frn || '',
    obsCde: r.obs_cmd || '',
    montHT: r.mont_ht,
    montTTC: r.mont_ttc,
    numRec: null,
    datRec: null,
    factAnnee: null,
    factNumOrdre: null,
    factNumFact: null,
    factDateFact: null,
    factDateFr: null,
    paiementAnnee: null,
    paiementNumOrdre: null,
    paiementDate: null,
    paiementMontant: null,
  }));
}


export async function getSuiviCmdApi() {
  const res = await fetch(`${API_BASE}/commandes/suivi`);
  const rows = await res.json();

  return rows.map(r => ({
    numCmd: r.num_cmd || 0,
    anCmd: r.an_cmd,
    datCde: r.datcde ? new Date(r.datcde) : null,
    dateAffichage: r.date_affichage ? new Date(r.date_affichage) : null,
    delaiLivraison: null,
    // --- Demande d'Achat (DA) ---
    anDa: r.an_da != null ? r.an_da : null,
    numDa: r.numda != null ? r.numda : null,
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
    factAnnee: r.fact_annee,
    factNumOrdre: r.fact_num_ordre ? String(r.fact_num_ordre).trim() : null,
    factNumFact: r.fact_num_fact,
    factDateFact: r.fact_dat_fact ? new Date(r.fact_dat_fact) : null,
    factDateFr: r.fact_dat_fr ? new Date(r.fact_dat_fr) : null,
    paiementAnnee: r.paiement_annee,
    paiementNumOrdre: r.paiement_num_ordre ? String(r.paiement_num_ordre).trim() : null,
    paiementDate: r.paiement_date ? new Date(r.paiement_date) : null,
    paiementMontant: r.paiement_montant,
  }));
}