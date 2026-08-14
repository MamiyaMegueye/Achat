// --- Helpers ---

function daysBetween(d1, d2) {
  if (!d1 || !d2) return null;
  const a = d1 instanceof Date ? d1 : new Date(d1);
  const b = d2 instanceof Date ? d2 : new Date(d2);
  if (isNaN(a) || isNaN(b)) return null;
  return Math.round((b - a) / (1000 * 60 * 60 * 24));
}

function formatMontant(n) {
  if (n == null) return '—';
  return new Intl.NumberFormat('fr-FR').format(Math.round(n));
}

function avg(arr) {
  const valid = arr.filter(v => v != null);
  if (valid.length === 0) return null;
  return valid.reduce((a, b) => a + b, 0) / valid.length;
}

// --- KPIs ---

export function computeKPIs(cmds, bcs) {
  const totalCmds = cmds.length;
  const totalArticles = bcs.length;
  const totalMontantHT = cmds.reduce((s, c) => s + (c.montHT || 0), 0);

  const receptionnees = cmds.filter(c => c.datRec).length;
  const facturees = cmds.filter(c => c.factDateFact).length;
  const payees = cmds.filter(c => c.paiementDate).length;
  const enCours = totalCmds - payees;

  const encoursMontant = cmds
    .filter(c => !c.paiementDate && c.montHT)
    .reduce((s, c) => s + c.montHT, 0);

  return {
    totalCmds,
    totalArticles,
    totalMontantHT,
    receptionnees,
    facturees,
    payees,
    enCours,
    encoursMontant,
    formatMontant
  };
}

// --- Délais ---

export function computeDelays(cmds) {
  const delaiCdeRec = [];
  const delaiRecPaiement = [];
  const delaiCdePaiement = [];
  const respectDelai = { respecte: 0, depasse: 0, sansDelai: 0 };
  const livraisonsEnRetard = [];
  const livraisonsDansLesTemps = [];
  const sansReception = [];
  const sansDelaiPrevu = [];

  cmds.forEach(c => {
    const dcr = daysBetween(c.datCde, c.datRec);
    if (dcr != null) {
      delaiCdeRec.push({
        numCmd: c.numCmd, fournisseur: c.nomFrn, jours: dcr,
        datCde: c.datCde, datRec: c.datRec, montant: c.montTTC, objet: c.obsCde,
        delaiPrevu: c.delaiLivraison
      });
    }

    const drp = daysBetween(c.datRec, c.paiementDate);
    if (drp != null) {
      delaiRecPaiement.push({
        numCmd: c.numCmd, fournisseur: c.nomFrn, jours: drp,
        datRec: c.datRec, paiementDate: c.paiementDate, montant: c.montTTC, objet: c.obsCde,
        depassement90: drp > 90 ? drp - 90 : 0
      });
    }

    const dcp = daysBetween(c.datCde, c.paiementDate);
    if (dcp != null) delaiCdePaiement.push({ numCmd: c.numCmd, jours: dcp });

    if (c.delaiLivraison) {
      const delaiPrevu = c.delaiLivraison instanceof Date ? c.delaiLivraison : new Date(c.delaiLivraison);
      const datCdeDate = c.datCde instanceof Date ? c.datCde : new Date(c.datCde);
      // Exclure les délais invalides : delaiPrevu doit être après datCde et dans un écart raisonnable (< 3 ans)
      if (!isNaN(delaiPrevu) && !isNaN(datCdeDate) && delaiPrevu >= datCdeDate && daysBetween(datCdeDate, delaiPrevu) < 1095) {
        if (c.datRec) {
          const datRec = c.datRec instanceof Date ? c.datRec : new Date(c.datRec);
          if (!isNaN(datRec) && datRec <= delaiPrevu) {
            // À temps : réceptionné avant ou le jour du délai
            respectDelai.respecte++;
            livraisonsDansLesTemps.push({
              numCmd: c.numCmd, fournisseur: c.nomFrn, objet: c.obsCde,
              datCde: c.datCde, delaiPrevu: c.delaiLivraison, datRec: c.datRec,
              joursAvance: Math.abs(daysBetween(delaiPrevu, datRec)), montant: c.montTTC
            });
          } else {
            // En retard : réceptionné après le délai
            respectDelai.depasse++;
            livraisonsEnRetard.push({
              numCmd: c.numCmd, fournisseur: c.nomFrn, objet: c.obsCde,
              datCde: c.datCde, delaiPrevu: c.delaiLivraison, datRec: c.datRec,
              joursRetard: daysBetween(delaiPrevu, datRec), montant: c.montTTC
            });
          }
        } else {
          // Non réceptionnée : comparer délai prévu avec aujourd'hui
          if (new Date() > delaiPrevu) {
            respectDelai.depasse++;
            livraisonsEnRetard.push({
              numCmd: c.numCmd, fournisseur: c.nomFrn, objet: c.obsCde,
              datCde: c.datCde, delaiPrevu: c.delaiLivraison, datRec: null,
              joursRetard: daysBetween(delaiPrevu, new Date()), montant: c.montTTC,
              nonReceptionnee: true
            });
          } else {
            respectDelai.respecte++;
            livraisonsDansLesTemps.push({
              numCmd: c.numCmd, fournisseur: c.nomFrn, objet: c.obsCde,
              datCde: c.datCde, delaiPrevu: c.delaiLivraison, datRec: null,
              joursAvance: daysBetween(new Date(), delaiPrevu), montant: c.montTTC,
              nonReceptionnee: true
            });
          }
        }
      }
    } else if (!c.delaiLivraison) {
      respectDelai.sansDelai++;
      if (c.datRec) {
        const delaiReel = daysBetween(c.datCde, c.datRec);
        sansDelaiPrevu.push({
          numCmd: c.numCmd, fournisseur: c.nomFrn, objet: c.obsCde,
          datCde: c.datCde, datRec: c.datRec, montant: c.montTTC,
          delaiReel
        });
      }
    }

    if (!c.datRec) {
      sansReception.push({
        numCmd: c.numCmd, fournisseur: c.nomFrn, objet: c.obsCde,
        datCde: c.datCde, delaiPrevu: c.delaiLivraison, montant: c.montTTC,
        enRetard: c.delaiLivraison ? new Date() > new Date(c.delaiLivraison) : null,
        joursDepuisCde: daysBetween(c.datCde, new Date())
      });
    }
  });

  return {
    delaiCdeRec: {
      data: delaiCdeRec.sort((a, b) => b.jours - a.jours),
      moyenne: Math.round(avg(delaiCdeRec.map(d => d.jours)) || 0),
    },
    delaiRecPaiement: {
      data: delaiRecPaiement.sort((a, b) => b.jours - a.jours),
      moyenne: Math.round(avg(delaiRecPaiement.map(d => d.jours)) || 0),
    },
    delaiCdePaiement: {
      moyenne: Math.round(avg(delaiCdePaiement.map(d => d.jours)) || 0),
    },
    respectDelai,
    livraisonsEnRetard: livraisonsEnRetard.sort((a, b) => b.joursRetard - a.joursRetard),
    livraisonsDansLesTemps: livraisonsDansLesTemps.sort((a, b) => b.joursAvance - a.joursAvance),
    sansReception: sansReception.sort((a, b) => (b.joursDepuisCde || 0) - (a.joursDepuisCde || 0)),
    sansDelaiPrevu: sansDelaiPrevu.sort((a, b) => (b.delaiReel || 0) - (a.delaiReel || 0)),
  };
}

// --- Fournisseurs ---

export function computeSupplierStats(cmds) {
  const map = {};

  cmds.forEach(c => {
    const name = c.nomFrn || 'Inconnu';
    if (!map[name]) {
      map[name] = {
        nom: name,
        nbCommandes: 0,
        montantTotal: 0,
        delais: [],
        sansReception: 0,
        sansPaiement: 0,
      };
    }
    map[name].nbCommandes++;
    map[name].montantTotal += c.montHT || 0;

    const d = daysBetween(c.datCde, c.datRec);
    if (d != null) map[name].delais.push(d);

    if (!c.datRec) map[name].sansReception++;
    if (!c.paiementDate) map[name].sansPaiement++;
  });

  return Object.values(map)
    .map(s => ({
      ...s,
      delaiMoyen: Math.round(avg(s.delais) || 0),
    }))
    .sort((a, b) => b.montantTotal - a.montantTotal);
}

// --- Articles: prix dans le temps + top articles petit prix ---

export function computeArticleStats(bcs) {
  const articleVolume = {};
  const priceMap = {};

  bcs.forEach(bc => {
    const key = bc.codeArticle;
    const label = bc.article || key;
    const frn = bc.fournisseur || 'Inconnu';

    // Grouper par CODE ARTICLE (tous fournisseurs)
    if (!priceMap[key]) {
      priceMap[key] = { code: key, label, entries: [] };
    }
    priceMap[key].entries.push({
      date: bc.date,
      pu: bc.pu,
      fournisseur: frn,
      qte: bc.qte,
      objet: bc.objet || '',
    });

    if (!articleVolume[key]) {
      articleVolume[key] = { code: key, label, totalQte: 0, totalHT: 0, nbCommandes: 0, puMoyen: 0, pus: [], dates: [], structures: new Set() };
    }
    articleVolume[key].totalQte += bc.qte || 0;
    articleVolume[key].totalHT += bc.totalHT || 0;
    articleVolume[key].nbCommandes++;
    articleVolume[key].pus.push(bc.pu || 0);
    if (bc.date) articleVolume[key].dates.push(bc.date);
    if (bc.structure) articleVolume[key].structures.add(bc.structure);
  });

  // Evolution prix par article dans le temps
  const priceEvolution = Object.values(priceMap)
    .filter(a => a.entries.length >= 2)
    .map(a => {
      const sorted = [...a.entries].sort((x, y) => new Date(x.date) - new Date(y.date));
      const prices = sorted.map(e => e.pu);
      const uniquePrices = [...new Set(prices)];
      // Ignorer si toutes les commandes ont le même prix
      if (uniquePrices.length <= 1) return null;

      const firstPrice = prices[0];
      const lastPrice = prices[prices.length - 1];
      const variation = firstPrice > 0 ? ((lastPrice - firstPrice) / firstPrice) * 100 : 0;

      // Cause : si tous les achats viennent du même fournisseur → Inflation
      // Sinon → Changement fournisseur
      const fournisseurs = [...new Set(sorted.map(e => e.fournisseur))];
      const cause = fournisseurs.length === 1 ? 'Inflation' : 'Changement fournisseur';

      return {
        ...a,
        entries: sorted,
        variation: Math.round(variation),
        cause,
        fournisseurs,
        premierPU: firstPrice,
        dernierPU: lastPrice,
      };
    })
    .filter(a => a !== null && a.variation !== 0)
    .sort((a, b) => Math.abs(b.variation) - Math.abs(a.variation));

  // Articles petits prix et gros volumes → candidats au surstock
  const surstockCandidates = Object.values(articleVolume)
    .map(a => {
      a.puMoyen = Math.round(avg(a.pus) || 0);
      a.structures = [...a.structures];
      a.derniereDate = a.dates.length > 0 ? a.dates.sort((x, y) => new Date(y) - new Date(x))[0] : null;
      return a;
    })
    .filter(a => a.nbCommandes >= 3 && a.puMoyen > 0 && a.puMoyen < 10000)
    .sort((a, b) => b.nbCommandes - a.nbCommandes);

  // === Comparaison prix fournisseurs (économies potentielles) ===
  const pricesByArticleFrn = {};
  bcs.forEach(bc => {
    const key = bc.codeArticle;
    const frn = bc.fournisseur || 'Inconnu';
    if (!bc.pu || bc.pu <= 0) return;
    if (!pricesByArticleFrn[key]) pricesByArticleFrn[key] = {};
    if (!pricesByArticleFrn[key][frn]) pricesByArticleFrn[key][frn] = { pus: [], qtes: 0 };
    pricesByArticleFrn[key][frn].pus.push(bc.pu);
    pricesByArticleFrn[key][frn].qtes += bc.qte || 0;
  });

  const prixComparaison = [];
  for (const code in pricesByArticleFrn) {
    const frns = pricesByArticleFrn[code];
    const frnNames = Object.keys(frns);
    if (frnNames.length < 2) continue;

    const avgByFrn = {};
    frnNames.forEach(f => { avgByFrn[f] = Math.round(avg(frns[f].pus) || 0); });

    const bestFrn = frnNames.reduce((a, b) => avgByFrn[a] < avgByFrn[b] ? a : b);
    const bestPrice = avgByFrn[bestFrn];
    if (bestPrice <= 0) continue;

    frnNames.forEach(frn => {
      if (frn === bestFrn) return;
      const frnPrice = avgByFrn[frn];
      if (frnPrice > bestPrice * 1.2) {
        const qte = frns[frn].qtes;
        const saving = (frnPrice - bestPrice) * qte;
        if (saving > 1000) {
          const label = articleVolume[code]?.label || code;
          prixComparaison.push({
            code, label, fournisseurCher: frn, fournisseurMoinsCher: bestFrn,
            prixCher: frnPrice, prixBas: bestPrice, qteAchetee: qte,
            economie: Math.round(saving),
            ecartPct: Math.round(((frnPrice - bestPrice) / bestPrice) * 100),
          });
        }
      }
    });
  }
  prixComparaison.sort((a, b) => b.economie - a.economie);

  // === Prix aberrants (même article, ratio x10+) ===
  const prixAberrants = [];
  for (const code in pricesByArticleFrn) {
    const allPus = [];
    for (const frn in pricesByArticleFrn[code]) {
      pricesByArticleFrn[code][frn].pus.forEach(p => { if (p > 0) allPus.push(p); });
    }
    if (allPus.length < 2) continue;
    const mn = Math.min(...allPus);
    const mx = Math.max(...allPus);
    if (mn > 0 && mx / mn >= 10) {
      const label = articleVolume[code]?.label || code;
      prixAberrants.push({ code, label, prixMin: mn, prixMax: mx, ratio: Math.round(mx / mn) });
    }
  }
  prixAberrants.sort((a, b) => b.ratio - a.ratio);

  return { priceEvolution, surstockCandidates, prixComparaison, prixAberrants };
}

// --- Dépendance fournisseurs / articles ---

export function computeDependencyStats(bcs) {
  // Fournisseur → articles distincts
  const frnArticles = {};
  // Article → fournisseurs distincts
  const articleFrns = {};

  bcs.forEach(bc => {
    const frn = bc.fournisseur || 'Inconnu';
    const code = bc.codeArticle;
    const label = bc.article || code;
    if (!code) return;

    if (!frnArticles[frn]) frnArticles[frn] = { nom: frn, articles: new Set(), articleLabels: {}, montantTotal: 0, nbCommandes: 0, numBCs: [], dates: [] };
    frnArticles[frn].articles.add(code);
    frnArticles[frn].articleLabels[code] = label;
    frnArticles[frn].montantTotal += bc.totalHT || 0;
    frnArticles[frn].nbCommandes++;
    if (bc.numBC) frnArticles[frn].numBCs.push(bc.numBC);
    if (bc.date) frnArticles[frn].dates.push(new Date(bc.date));

    if (!articleFrns[code]) articleFrns[code] = { code, label, fournisseurs: new Set(), montantTotal: 0, nbCommandes: 0, numBCs: [], dates: [] };
    articleFrns[code].fournisseurs.add(frn);
    articleFrns[code].montantTotal += bc.totalHT || 0;
    articleFrns[code].nbCommandes++;
    if (bc.numBC) articleFrns[code].numBCs.push(bc.numBC);
    if (bc.date) articleFrns[code].dates.push(new Date(bc.date));
  });

  // Fournisseurs mono-article vs multi
  const frnList = Object.values(frnArticles).map(f => {
    const validDates = f.dates.filter(d => !isNaN(d));
    validDates.sort((a, b) => a - b);
    return {
      nom: f.nom,
      nbArticles: f.articles.size,
      articles: [...f.articles],
      articleLabels: f.articleLabels,
      montantTotal: f.montantTotal,
      nbCommandes: f.nbCommandes,
      numBCs: [...new Set(f.numBCs)],
      dateMin: validDates.length > 0 ? validDates[0] : null,
      dateMax: validDates.length > 0 ? validDates[validDates.length - 1] : null,
    };
  }).sort((a, b) => a.nbArticles - b.nbArticles);

  const monoArticle = frnList.filter(f => f.nbArticles === 1);
  const multiArticle = frnList.filter(f => f.nbArticles > 1);

  // Articles mono-fournisseur (risque approvisionnement)
  const artList = Object.values(articleFrns).map(a => {
    const validDates = a.dates.filter(d => !isNaN(d));
    validDates.sort((x, y) => x - y);
    return {
      code: a.code,
      label: a.label,
      nbFournisseurs: a.fournisseurs.size,
      fournisseurs: [...a.fournisseurs],
      montantTotal: a.montantTotal,
      nbCommandes: a.nbCommandes,
      numBCs: [...new Set(a.numBCs)],
      dateMin: validDates.length > 0 ? validDates[0] : null,
      dateMax: validDates.length > 0 ? validDates[validDates.length - 1] : null,
    };
  }).sort((a, b) => b.montantTotal - a.montantTotal);

  const monoFournisseur = artList.filter(a => a.nbFournisseurs === 1);
  const multiFournisseur = artList.filter(a => a.nbFournisseurs > 1);

  return { frnList, monoArticle, multiArticle, artList, monoFournisseur, multiFournisseur };
}

// --- Alertes paiement > 90 jours ---

export function computePaymentAlerts(cmds) {
  const today = new Date();
  const alerts = [];

  cmds.forEach(c => {
    if (c.factDateFr && !c.paiementDate) {
      const dateFacture = c.factDateFr instanceof Date ? c.factDateFr : new Date(c.factDateFr);
      if (!isNaN(dateFacture)) {
        const jours = daysBetween(dateFacture, today);
        if (jours > 90) {
          alerts.push({
            numCmd: c.numCmd,
            fournisseur: c.nomFrn,
            montant: c.montTTC,
            dateFacture,
            joursRetard: jours,
            retardSur90: jours - 90,
          });
        }
      }
    }
  });

  return alerts.sort((a, b) => b.joursRetard - a.joursRetard);
}

// --- Montant par structure ---

export function computeStructureStats(bcs) {
  const map = {};

  bcs.forEach(bc => {
    const s = bc.structure || 'Inconnu';
    if (!map[s]) {
      map[s] = { structure: s, montantTotal: 0, nbBC: new Set(), nbArticles: 0 };
    }
    map[s].montantTotal += bc.totalHT || 0;
    map[s].nbBC.add(bc.numBC);
    map[s].nbArticles++;
  });

  return Object.values(map)
    .map(s => ({ ...s, nbBC: s.nbBC.size }))
    .sort((a, b) => b.montantTotal - a.montantTotal);
}

// --- Commandes sans facture après réception ---

export function computeMissingDocs(cmds) {
  const sansFacture = cmds.filter(c => c.datRec && !c.factDateFact);
  const sansPaiement = cmds.filter(c => c.factDateFr && !c.paiementDate);
  const sansReception = cmds.filter(c => !c.datRec);

  return {
    sansFacture: sansFacture.map(c => ({
      numCmd: c.numCmd, fournisseur: c.nomFrn, montant: c.montTTC, dateRec: c.datRec
    })),
    sansPaiement: sansPaiement.length,
    sansReception: sansReception.length,
  };
}

// --- Saisonnalité des commandes par mois ---

export function computeSeasonality(cmds) {
  const monthMap = {};
  cmds.forEach(c => {
    if (!c.datCde) return;
    const d = c.datCde instanceof Date ? c.datCde : new Date(c.datCde);
    if (isNaN(d)) return;
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
    if (!monthMap[key]) monthMap[key] = { mois: key, nbCmds: 0, montantHT: 0 };
    monthMap[key].nbCmds++;
    monthMap[key].montantHT += c.montHT || 0;
  });
  return Object.values(monthMap).sort((a, b) => a.mois.localeCompare(b.mois));
}

export { formatMontant, daysBetween };
