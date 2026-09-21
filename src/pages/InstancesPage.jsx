import React, { useState, useEffect, useMemo } from 'react';
import ExcelJS from 'exceljs';
import { FileDown, Search } from 'lucide-react';
import { formatMontant } from '../utils/stats';
import { sortRows, makeToggleSort } from '../utils/sortUtils';
import { matchesAnySearch } from '../utils/search';
import SortIcon from '../components/SortIcon';

// Source de vérité : le fichier "Etat des BC" fourni par la Direction, mais
// seulement pour identifier CHAQUE commande (numéro de DA + numéro de BC),
// pour vérifier ce rapprochement (Objet attendu) et pour les colonnes de
// commentaires (Motif de retard, Solution convenable, Délais Réel) qui
// n'existent nulle part ailleurs. Tout le reste (Objet affiché, Fournisseur,
// dates, montant, structure, statut...) est reconstruit depuis les commandes
// synchronisées, en retrouvant la commande par la combinaison N° BC + Année +
// N° DA : le numéro de BC seul n'est pas fiable (deux commandes de séries
// différentes peuvent partager le même numéro et la même année). L'Objet du
// fichier sert en plus de garde-fou : si la commande retrouvée par ces
// numéros a un Objet totalement différent, c'est probablement une erreur de
// saisie dans le fichier (numéro de BC mal recopié, par exemple) — la ligne
// est alors marquée comme non retrouvée plutôt que d'afficher une commande
// qui n'a rien à voir.
const INSTANCES_REF = [
  { da: '1627/2024', bc: '62/2025', objet: 'Acquisition des tuyaux DN125 en inox pour le stock tempon de Gouraye', delaisReel: null, motif: 'Les tuyaux livrés ne pas conforment', solution: 'Annulation' },
  { da: '159/2025', bc: '119/2025', objet: 'Complément Matériel du soufflage', delaisReel: null, motif: null, solution: 'Annulation' },
  { da: '217/2025', bc: '163/2025', objet: 'materiel axe sud partie II', delaisReel: null, motif: 'Toutes les articles sont livrés et exploités sauf le variateur', solution: null },
  { da: '214/2025', bc: '180/2025', objet: 'Reconstitution d\'un stock de matériel électrique pour Bouhchicha', delaisReel: '2025-03-17', motif: null, solution: "L'Annulation" },
  { da: '219/2025', bc: '212/2025', objet: 'Matériel Electrique pour Hodh el gharbi', delaisReel: '2025-04-04', motif: null, solution: "L'Annulation" },
  { da: '121/2025', bc: '408/2025', objet: 'Acquisition des pompes pour PK17', delaisReel: '2025-08-17', motif: null, solution: "L'Annulation" },
  { da: '1047', bc: '511/2025', objet: 'Acquisition des matériels déstinés aux enjeux de Dhar', delaisReel: '2025-07-20', motif: "Toutes les articles sont livrés sauf Appareil métamétre l'utilisateur exige une marque qui n'été pas prévus sur la demande d'achat en outre le fournisseur propose une marque de qualité", solution: 'Proposer une solution' },
  { da: '796/2025', bc: '467/2025', objet: 'acquisItion de demarreur  et transmetteur pour la station PK31', delaisReel: '2025-08-10', motif: 'Proléme de demarreur digistar', solution: null },
  { da: '1130/2026', bc: '611/2025', objet: 'Acquisition de deux électropompes de surpression de secours KSB Etanorm RM 200-330 pour la nouvelle station de pompage du Ksar', delaisReel: '2026-06-10', motif: 'Les pompes sont  arrivées au maroc reste transport par camion', solution: null },
  { da: '1229/2025', bc: '652/2025', objet: 'Materiel d\'automatisme pour le site de BENI NAJI', delaisReel: '2025-09-27', motif: "Toute les matériels sont livrés sauf le TIA Portal V17 en raison qu'il est obslete en attendant l'accord de Abel Latif pour leur équivalent V19", solution: null },
  { da: '1391/2025', bc: '688/2025', objet: 'Matériel demandé par les brigades de l\'intérieur', delaisReel: null, motif: "Toutes les articles sont livrés sauf manchon de réparartion 350 il ya une doute si c'est 315 ou 350", solution: 'avoir une solution' },
  { da: '1529/2025', bc: '782/2025', objet: 'Réalisation des deux (2) nouveaux forages à Aioun', delaisReel: '2025-12-15', motif: "avoir l'importance (l'utilisateur n'est raclame jamais le retard de cette action)", solution: null },
  { da: '1492/2025', bc: '785/2025', objet: 'Construction d\'un abri pour le groupe électrogène de 160KVA de Levrayesse', delaisReel: '2025-10-06', motif: "avoir l'importance (l'utilisateur n'est raclame jamis le retard de cette action)", solution: 'Annulation' },
  { da: '1528/2025', bc: '786/2025', objet: 'Réalisation des deux (2) nouveaux forages à Tintan', delaisReel: '2025-11-20', motif: "Voir l'importance", solution: null },
  { da: '1551/2025', bc: '800/2025', objet: 'Acquisition d\'une electropompe horizontal pour la station SP1 de Teyarett  sdar', delaisReel: '2026-04-05', motif: 'selon le fournisseur la pompe sera à nouakchott le 25/09/2026 le signé en 2026', solution: null },
  { da: '1415/2025', bc: '804/2025', objet: 'Aquisition du matériel pour la protection de transformateur de la station SP1', delaisReel: '2025-12-10', motif: "Fusibles : arrivée au port le 14 septembre 2026. Cellules MT : payées début janvier avec un délai de fabr de 16 semaines. À l'échéance, le fournisseur ne disposait que d'une seule cellule. Après réclamation, del de remboursement et recherche d'un fournisseur alternatif plus rapide (sans succès), nous avons pris la disponible : elle est actuellement en notre possession. La seconde cellule sera réceptionnée début novermbre 2026 (selon le fournisseur)", solution: null },
  { da: '1501/2025', bc: '822/2025', objet: 'acquisition des pieces pieces de rechangede la station de traitement de Gouraye', delaisReel: '2025-11-10', motif: "80% de cette commande est à NKTT selon le fournisseur le 20% qui est fabriqué sur de spécification qui n'est pas conforme a la demande de la SNDE et fait l'objet d'un nouveau commande qui sera disponible au milieu du septembre", solution: null },
  { da: '1409/2025', bc: '838/2025', objet: 'Demande d\'achat pour  groupe électrogène 165 kVA de station de EL Mina', delaisReel: '2025-12-29', motif: "Fabriqué en route maritime selon le founisseur l'arrivée est prévus le 05/09/2026", solution: null },
  { da: '1644/2025', bc: '851/2025', objet: 'Remise à NIveau des stations de traitement  de Rosso', delaisReel: '2026-01-06', motif: 'Sera livré cette semaine', solution: null },
  { da: '1607/2025', bc: '890/2025', objet: 'Acquisition des matériels à Rosso', delaisReel: '2025-11-15', motif: "Proléme de graisse l'utilisateur exige une graisse qui n'est pas mentionner dans la DA", solution: null },
  { da: '1764/2025', bc: '900/2025', objet: 'Acquisitions des manchons de reparations pour la station de Dhar', delaisReel: '2026-06-15', motif: null, solution: null },
  { da: '1652/2025', bc: '902/2025', objet: 'Achat du materiel pour le Cellue Axiliaire d\'AFT', delaisReel: '2025-12-16', motif: "Toute les articles sont livrés il reste de s'assurer du confirmé de cable hersatene", solution: null },
  { da: '1705/2025', bc: '903/2025', objet: 'Acquisition des matériels pour la station de Levrayesse', delaisReel: null, motif: 'Toutes les articles sont livrés et exploité sauf câble livré mais ne pas conforme', solution: 'avoir une solution' },
  { da: '1706/2025', bc: '904/2025', objet: 'Acquisition des matériels pour le forage de Levrayesse', delaisReel: null, motif: 'Toutes les articles sont livréset exploité sauf câble livré mais ne pas conforme', solution: 'avoir une solution' },
  { da: '1674/2025', bc: '949/2025', objet: 'Acquistion du matériel pour stock tampon du magasin d\'Idini', delaisReel: null, motif: "L'échantiillon fournie non satisfait selon l'utilisateur", solution: 'Annulation' },
  { da: '1786/2025', bc: '960/2025', objet: 'Acquisition d\'un armoire de commande du forage F30 à Idini', delaisReel: '2026-01-20', motif: 'Date prévus d\'arrivée à NKTT est 06/09/2026 selon le fournisseur', solution: null },
  { da: '1508/2025', bc: '964/2025', objet: 'Acquisition du matériel pour Rosso', delaisReel: '2025-12-30', motif: 'Livré', solution: null },
  { da: '1869/2025', bc: '982/2025', objet: 'bobine à minimum de tension AFTOUT BENI NAJI PK 17 ET VANNE TROIS VOIX', delaisReel: '2026-01-15', motif: 'Selon le fournisseur Les vannes sont disponibles à NKTT les bobines sont obstletes en cours de recherche à leurs équivalents', solution: null },
  { da: '1961/2025', bc: '996/2025', objet: 'Rébobinage du moteur 45 KW de la pompe de rejet de l\'usine de dessalement de NDB', delaisReel: '2025-12-30', motif: 'Achevé en attendant le service fait', solution: null },
  { da: '1926/2025', bc: '1002/2025', objet: 'outillage pour le controle des transfo MT du copmlexe d\'AFTOUT ESSAHILI', delaisReel: null, motif: 'BC non signé mais le DG à demander l\'avis du DM et DAL pour discuter la necessité de cette commande', solution: null },
  { da: '1919/2025', bc: '1003/2025', objet: 'Automatisme instrumentation et bureautique  PK17', delaisReel: '2026-01-31', motif: 'Déjà sur place sauf deux article sera livré dans deux semaines selon le fournisseur', solution: null },
  { da: '1991/2025', bc: '55/2026', objet: 'Acquisition du matériel pour les armoires de forages Idini', delaisReel: '2026-02-10', motif: "Livré conforme a la fiche technique valider par l'utilisateur mais l'exploitant indique que sont pas conforme celle à qui sont sur place", solution: null },
  { da: '1776/2025', bc: '59/2026', objet: 'Acquisition des matériels pour l\'installation des nouveaux GES à Bougadoum (Baudouin 20kva et 50kva)', delaisReel: '2026-02-22', motif: 'Livré sauf le câble', solution: null },
  { da: '1514/2025', bc: '81/2026', objet: 'Acquisition de pièces de rechange pour la nouvelle station de pompage du Ksar (salle de Commande)', delaisReel: '2026-03-15', motif: 'Les matériels sera livré en total dans deux semaine selon le fournisseur', solution: null },
  { da: '84/2026', bc: '149/2026', objet: 'Acquisition d\'une électropompe pour la station de Bouhchicha', delaisReel: '2026-04-01', motif: 'selon le fournisseur la pompe est expédié', solution: null },
  { da: '80/2026', bc: '182/2026', objet: 'Acquisition du matériels pour la station de dessalement Nouadhibou', delaisReel: '2026-05-25', motif: 'Disponible à Nouakchott Sera livré dans quelque jours', solution: null },
  { da: '136/2026', bc: '202/2026', objet: 'Acquisition de deux pompes de secours de 55kW pour la nouvelle de surpression', delaisReel: '2026-06-02', motif: 'Les pompes sont fabriquées en cours de livraison maritime selon le fournisseur', solution: null },
  { da: '122/2026', bc: '213/2026', objet: 'materiel de groupe de refroidiisement et de plomberie PK17', delaisReel: '2026-06-04', motif: 'Livré au magasin general pas encore receptionné', solution: null },
  { da: '1630/2025', bc: '221/2026', objet: 'Acquisition des tuyaux DN125 en inox pour la prise  de Gouraye (Relancement de la DA 1627/2024)', delaisReel: '2026-06-01', motif: 'les tuyaux sont disponibles il reste les accrochages', solution: null },
  { da: '45/2026', bc: '245/2026', objet: 'PDR BENI NAJI', delaisReel: '2026-06-25', motif: 'Toutes les articles sont à NKTT sauf vanne papillon sera disponible dans deux semaines selon le fournisseur', solution: null },
  { da: '737/2026', bc: '277/2026', objet: 'Demande d\'achat équipements télégestion', delaisReel: '2026-06-01', motif: "Sera livré cette semaine selon l'utilisateur", solution: null },
  { da: '312/2026', bc: '308/2026', objet: 'Acquisition banc de charge résistif pour test des groupes electrogenes 150 kw', delaisReel: '2026-06-20', motif: 'Sera livré dans deux semaines', solution: null },
  { da: '410/2026', bc: '318/2026', objet: 'PDR Entretien Compresseurs Atlas Copco G15L P du PK17', delaisReel: '2026-05-15', motif: 'Couroire et huile non conforme', solution: null },
  { da: '326/2026', bc: '322/2026', objet: 'Acquisition de pompe immergée 26 kw 6\'\' ,de qualité supérieure', delaisReel: '2026-06-15', motif: 'Toutes les pompes sont fabriquées et en cours de livraison maritime', solution: null },
  { da: '327/2026', bc: '323/2026', objet: 'Acquisition de pompe immergée 30 kw 6\'\' ,de qualité supérieure', delaisReel: '2026-06-15', motif: 'Toutes les pompes sont fabriquées et en cours de livraison maritime', solution: null },
  { da: '324/2026', bc: '327/2026', objet: 'Acquisition de pompe immergée 11 kw 6\'\' ,de qualité supérieure', delaisReel: '2026-06-15', motif: 'Toutes les pompes sont fabriquées et en cours de livraison maritime', solution: null },
  { da: '325/2026', bc: '328/2026', objet: 'Acquisition de pompe immergée 22 kw 6\'\' ,de qualité supérieure', delaisReel: '2026-06-15', motif: 'Toutes les pompes sont fabriquées et la livraison prévus la samaine prochian', solution: null },
  { da: '1605/2025', bc: '349/2026', objet: 'Acquisition du matériel pour le groupe électrogène de 900 KVA de Beni naji', delaisReel: '2026-05-20', motif: 'Livré au magasin general pas encore receptionné', solution: null },
  { da: '166/2026', bc: '352/2026', objet: 'Acquisition des armoires électrique pour F26, F28, F41, F24 et F13', delaisReel: '2026-07-04', motif: 'Les Armoires sont fabriqués et expédiés', solution: null },
  { da: '939/2026', bc: '367/2026', objet: 'Acquisition du matériel pour les stations de Dhar (SP0,SP1,SP2)', delaisReel: '2026-05-05', motif: "Les pompes ont été livrés mais elles ne repondent pas aux spécifications techniques réquises, ce qui a contraint le fournisseur à les racheter sera livré dans une semaine", solution: null },
  { da: '408/2026', bc: '377/2026', objet: 'Verins servo et kits vannes regulatrice PK17', delaisReel: '2026-07-25', motif: null, solution: null },
  { da: '378/2026', bc: '395/2026', objet: 'Acquisitioon de matériel pour la station de Nakat', delaisReel: '2026-06-15', motif: 'Livré pas encore receptionné', solution: null },
  { da: '1021/2026', bc: '459/2026', objet: 'Acquisition du matériel pour les pompe de l\'ancienne station DN 700 D\'Idini', delaisReel: '2026-06-25', motif: 'Livré pas encore receptionné', solution: null },
];

const NOTES_KEY = 'instances_notes_v1';

function loadNotes() {
  try {
    const raw = localStorage.getItem(NOTES_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}

// Compare les codes Structure (COD_DIR, ex: "PS02") sans tenir compte de la
// casse ni des espaces superflus.
function normalizeStructureCode(code) {
  return String(code || '').trim().toUpperCase();
}

function fmtDate(d) {
  if (!d) return '—';
  try {
    const dt = d instanceof Date ? d : new Date(d);
    return isNaN(dt) ? '—' : dt.toLocaleDateString('fr-FR');
  } catch {
    return '—';
  }
}

// Statut dérivé, identique à celui du Dashboard (Payée > Facturée > Réceptionnée > Non réceptionnée).
function getStatut(c) {
  if (c.paiementDate) return 'Payée';
  if (c.factDateFact) return 'Facturée';
  if (c.datRec) return 'Réceptionnée';
  return 'Non réceptionnée';
}

// Similarité d'Objet : sert uniquement de vérification (pas de méthode de
// rapprochement principale) — voir commentaire en tête de fichier.
function normalizeText(s) {
  return (s || '')
    .toString()
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

const STOPWORDS = new Set([
  'de', 'des', 'du', 'la', 'le', 'les', 'un', 'une', 'pour', 'et', 'a', 'au',
  'aux', 'en', 'dans', 'sur', 'avec', 'sans', 'par', 'ce', 'ces', 'ne', 'pas',
  'se', 'sa', 'son', 'ses', 'que', 'qui',
]);

function significantWords(s) {
  return normalizeText(s).split(' ').filter(w => w.length > 2 && !STOPWORDS.has(w));
}

function objetSimilarity(refObjet, candidateObjet) {
  const wa = significantWords(refObjet);
  const wb = new Set(significantWords(candidateObjet));
  if (wa.length === 0 || wb.size === 0) return 0;
  let inter = 0;
  wa.forEach(w => { if (wb.has(w)) inter++; });
  return inter / Math.min(wa.length, wb.size);
}

const OBJET_MATCH_THRESHOLD = 0.3;

// Rapprochement : N° BC + Année + N° DA identifient normalement une commande
// de façon unique (contrairement au numéro de BC seul, voir commentaire en
// tête de fichier). On exige en plus que l'Objet retrouvé ressemble à
// l'Objet attendu, pour détecter une erreur de saisie dans le fichier plutôt
// que d'afficher silencieusement la mauvaise commande.
function findMatch(ref, refNumBc, refAnBc, refNumDa, cmds) {
  const candidates = cmds.filter(c =>
    String(c.numCmd) === String(refNumBc) &&
    String(c.anCmd) === String(refAnBc)
  );
  if (candidates.length === 0) return null;

  // Meilleur cas : le N° DA de la commande correspond exactement à celui du fichier.
  const byDa = candidates.find(c => c.numDa != null && String(c.numDa) === String(refNumDa));
  if (byDa) return byDa;

  // La DA n'est pas encore renseignée côté base pour cette commande (constaté sur
  // toutes les commandes BC 2026 : numda/an_da valent NULL tant que la synchronisation
  // SUIVI_CMD Oracle ne les a pas rattrapées) — on se rabat alors sur l'Objet parmi
  // les commandes portant ce N° BC + Année pour confirmer/choisir la bonne.
  let best = null;
  let bestScore = 0;
  candidates.forEach(c => {
    const score = objetSimilarity(ref.objet, c.obsCde);
    if (score > bestScore) { bestScore = score; best = c; }
  });
  return bestScore >= OBJET_MATCH_THRESHOLD ? best : null;
}

const STATUTS = ['Payée', 'Facturée', 'Réceptionnée', 'Non réceptionnée'];

export default function InstancesPage({ cmds = [], structureDirection = [] }) {
  const [notes, setNotes] = useState(loadNotes);
  const [search, setSearch] = useState('');
  const [statutFilter, setStatutFilter] = useState('');

  useEffect(() => {
    try { localStorage.setItem(NOTES_KEY, JSON.stringify(notes)); } catch { /* ignore */ }
  }, [notes]);

  // Code Structure (COD_DIR de STK_CMD) -> libellé Direction/Service, depuis
  // code_structure_direction.xlsx (meme principe que la categorisation).
  const structureNameMap = useMemo(() => {
    const map = {};
    structureDirection.forEach(r => {
      if (r.code && r.direction) map[normalizeStructureCode(r.code)] = r.direction;
    });
    return map;
  }, [structureDirection]);

  const rows = useMemo(() => {
    return INSTANCES_REF.map(ref => {
      const [refNumDa, refAnDaFile] = ref.da.includes('/') ? ref.da.split('/') : [ref.da, null];
      const [refNumBc, refAnBc] = ref.bc.split('/');
      const match = findMatch(ref, refNumBc, refAnBc, refNumDa, cmds);
      // Si le fichier de référence n'indique pas l'année de la DA (ex: "1047"),
      // on la complète avec l'année réelle de la DA de la commande retrouvée.
      const anDa = refAnDaFile || (match && match.anDa != null ? String(match.anDa) : null);
      const articles = match && match.articles ? match.articles : [];
      // La structure (COD_DIR de STK_CMD) est portee par les lignes de bon de
      // commande jointes a la commande (articles) -- pas de valeur par defaut,
      // elle varie reellement d'une commande a l'autre.
      const structure = articles.length > 0 ? articles[0].structure : null;
      return {
        bc: ref.bc,
        numDa: refNumDa,
        anDa,
        datDa: match ? match.datDa : null,
        numCmd: match ? match.numCmd : refNumBc,
        anCmd: match ? match.anCmd : refAnBc,
        objet: match ? match.obsCde : null,
        fournisseur: match ? match.nomFrn : null,
        delaisReel: ref.delaisReel,
        motifRef: ref.motif,
        solutionRef: ref.solution,
        datCde: match ? match.datCde : null,
        delaiLivraison: match ? match.delaiLivraison : null,
        datReception: match ? match.datRec : null,
        montTTC: match ? (match.montTTC ?? match.montHT ?? null) : null,
        structure,
        structureLibelle: structure ? (structureNameMap[normalizeStructureCode(structure)] || null) : null,
        statut: match ? getStatut(match) : null,
        found: !!match,
      };
    });
  }, [cmds, structureNameMap]);

  const foundCount = rows.filter(r => r.found).length;

  // Filtre statut + recherche globale (toutes colonnes, y compris les commentaires)
  const filteredRows = useMemo(() => {
    let out = rows;
    if (statutFilter) {
      out = out.filter(r => r.statut === statutFilter);
    }
    if (search.trim()) {
      out = out.filter(r =>
        matchesAnySearch([
          String(r.numDa || ''),
          String(r.anDa || ''),
          String(r.numCmd || ''),
          String(r.anCmd || ''),
          fmtDate(r.datCde),
          r.objet || '',
          r.fournisseur || '',
          fmtDate(r.delaiLivraison),
          fmtDate(r.datReception),
          String(r.montTTC ?? ''),
          r.structure || '',
          r.structureLibelle || '',
          r.statut || '',
          fmtDate(r.delaisReel),
          noteValue(r, 'motif'),
          noteValue(r, 'solution'),
        ], search)
      );
    }
    return out;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [rows, search, statutFilter, notes]);

  // Tri : par défaut sur la colonne Année, ordre croissant.
  const [sortKey, setSortKey] = useState('anCmd');
  const [sortDir, setSortDir] = useState('asc');
  const toggleSort = makeToggleSort(sortKey, setSortKey, setSortDir);
  const sortedRows = useMemo(() => {
    if (!sortKey) return filteredRows;
    const getValue = (r) => (
      sortKey === 'motif' ? noteValue(r, 'motif')
      : sortKey === 'solution' ? noteValue(r, 'solution')
      : r[sortKey]
    );
    return sortRows(filteredRows, sortKey, sortDir, getValue);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filteredRows, sortKey, sortDir, notes]);

  const updateNote = (bc, field, value) => {
    setNotes(prev => ({
      ...prev,
      [bc]: { ...prev[bc], [field]: value },
    }));
  };

  function noteValue(r, field) {
    const local = notes[r.bc] && notes[r.bc][field];
    if (local !== undefined) return local;
    return (field === 'motif' ? r.motifRef : r.solutionRef) || '';
  }

  const hasFilters = search || statutFilter;

  const exportToExcel = async () => {
    const wb = new ExcelJS.Workbook();
    const ws = wb.addWorksheet('Instances');

    ws.columns = [
      { header: 'N° DA', key: 'numDa', width: 14 },
      { header: 'Année DA', key: 'anDa', width: 10 },
      { header: 'N° BC', key: 'numCmd', width: 12 },
      { header: 'Date BC', key: 'datCde', width: 18 },
      { header: 'Objet', key: 'objet', width: 40 },
      { header: 'Fournisseur', key: 'fournisseur', width: 26 },
      { header: 'Date de réception', key: 'datReception', width: 16 },
      { header: 'Montant TTC', key: 'montTTC', width: 16 },
      { header: 'Structure', key: 'structure', width: 12 },
      { header: 'Libellé Structure', key: 'structureLibelle', width: 22 },
      { header: 'Date de livraison prévue', key: 'delaiLivraison', width: 18 },
      { header: 'Motif de retard', key: 'motif', width: 32 },
      { header: 'Solution convenable', key: 'solution', width: 26 },
    ];

    sortedRows.forEach(r => {
      ws.addRow({
        numDa: r.numDa || '',
        anDa: r.anDa || '',
        numCmd: r.numCmd,
        datCde: fmtDate(r.datCde),
        objet: r.objet || '',
        fournisseur: r.fournisseur || '',
        delaiLivraison: fmtDate(r.delaiLivraison),
        datReception: fmtDate(r.datReception),
        montTTC: r.montTTC || 0,
        structure: r.structure || '',
        structureLibelle: r.structureLibelle || '',
        motif: noteValue(r, 'motif'),
        solution: noteValue(r, 'solution'),
      });
    });

    // Retour automatique sur toutes les colonnes pour afficher le texte en entier
    ws.columns.forEach(col => { col.alignment = { wrapText: true, vertical: 'top' }; });

    // En-tête coloré
    const headerRow = ws.getRow(1);
    headerRow.eachCell(cell => {
      cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFC17550' } };
      cell.font = { color: { argb: 'FFFFFFFF' }, bold: true };
      cell.alignment = { vertical: 'middle' };
    });

    // Bordures sur tout le tableau (en-tête + données)
    ws.eachRow(row => {
      row.eachCell({ includeEmpty: true }, cell => {
        cell.border = {
          top: { style: 'thin' }, left: { style: 'thin' },
          bottom: { style: 'thin' }, right: { style: 'thin' },
        };
      });
    });

    const buffer = await wb.xlsx.writeBuffer();
    const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `Instances_${new Date().toISOString().slice(0, 10)}.xlsx`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div>
      <div className="page-header">
        <h1>Instances</h1>
        <p>Suivi particulier de {rows.length} commande(s) — {foundCount} retrouvée(s) dans les données synchronisées (rapprochement par N° BC + N° DA)</p>
      </div>

      <div className="card full-width">
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 8 }}>
          <div className="card-title" style={{ marginBottom: 0 }}>
            Commandes suivies <span style={{ fontSize: '0.65rem', fontWeight: 400, color: 'var(--text-muted)' }}>— {sortedRows.length} résultat(s)</span>
          </div>
          <button
            onClick={exportToExcel}
            style={{
              display: 'flex', alignItems: 'center', gap: 6,
              padding: '8px 14px', borderRadius: 6, border: 'none',
              background: 'var(--accent-primary)', color: 'white',
              fontSize: '0.82rem', fontWeight: 500, cursor: 'pointer',
            }}
          >
            <FileDown size={15} /> Exporter Excel
          </button>
        </div>

        <div style={{ display: 'flex', gap: 10, marginBottom: 14, marginTop: 12, flexWrap: 'wrap' }}>
          <div style={{ position: 'relative', flex: '1 1 260px' }}>
            <Search size={14} style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
            <input
              type="text"
              placeholder="Rechercher (toutes colonnes : DA, BC, objet, fournisseur, motif, solution...)"
              value={search}
              onChange={e => setSearch(e.target.value)}
              style={{
                width: '100%', padding: '8px 12px 8px 32px',
                border: '1px solid var(--border-light)', borderRadius: 6, fontSize: '0.82rem',
              }}
            />
          </div>
          <select
            value={statutFilter}
            onChange={e => setStatutFilter(e.target.value)}
            style={{
              padding: '8px 12px', border: '1px solid var(--border-light)',
              borderRadius: 6, fontSize: '0.82rem', background: 'white', minWidth: 160,
            }}
          >
            <option value="">Tous les statuts</option>
            {STATUTS.map(s => <option key={s} value={s}>{s}</option>)}
          </select>
          {hasFilters && (
            <button
              onClick={() => { setSearch(''); setStatutFilter(''); }}
              style={{
                padding: '8px 12px', border: '1px solid var(--border-light)',
                borderRadius: 6, fontSize: '0.78rem', background: 'var(--bg-main)', cursor: 'pointer',
              }}
            >
              Réinitialiser
            </button>
          )}
        </div>

        <div style={{ maxHeight: 640, overflow: 'auto' }}>
          <table className="data-table" style={{ minWidth: 1750 }}>
            <thead>
              <tr>
                <th onClick={() => toggleSort('numDa')} style={{ whiteSpace: 'nowrap', cursor: 'pointer' }}>N° DA <SortIcon sortKey={sortKey} sortDir={sortDir} col="numDa" /></th>
                <th onClick={() => toggleSort('anDa')} style={{ whiteSpace: 'nowrap', cursor: 'pointer' }}>Année DA <SortIcon sortKey={sortKey} sortDir={sortDir} col="anDa" /></th>
                <th onClick={() => toggleSort('numCmd')} style={{ whiteSpace: 'nowrap', cursor: 'pointer' }}>N° BC <SortIcon sortKey={sortKey} sortDir={sortDir} col="numCmd" /></th>
                <th onClick={() => toggleSort('datCde')} style={{ whiteSpace: 'nowrap', cursor: 'pointer' }}>Date BC <SortIcon sortKey={sortKey} sortDir={sortDir} col="datCde" /></th>
                <th onClick={() => toggleSort('objet')} style={{ width: 260, cursor: 'pointer' }}>Objet <SortIcon sortKey={sortKey} sortDir={sortDir} col="objet" /></th>
                <th onClick={() => toggleSort('fournisseur')} style={{ whiteSpace: 'nowrap', cursor: 'pointer' }}>Fournisseur <SortIcon sortKey={sortKey} sortDir={sortDir} col="fournisseur" /></th>
                <th onClick={() => toggleSort('datReception')} style={{ whiteSpace: 'nowrap', cursor: 'pointer' }}>Date de réception <SortIcon sortKey={sortKey} sortDir={sortDir} col="datReception" /></th>
                <th onClick={() => toggleSort('montTTC')} style={{ textAlign: 'right', whiteSpace: 'nowrap', cursor: 'pointer' }}>Montant TTC <SortIcon sortKey={sortKey} sortDir={sortDir} col="montTTC" /></th>
                <th onClick={() => toggleSort('structure')} style={{ whiteSpace: 'nowrap', cursor: 'pointer' }}>Structure <SortIcon sortKey={sortKey} sortDir={sortDir} col="structure" /></th>
                <th onClick={() => toggleSort('structureLibelle')} style={{ whiteSpace: 'nowrap', cursor: 'pointer' }}>Libellé Structure <SortIcon sortKey={sortKey} sortDir={sortDir} col="structureLibelle" /></th>
                <th onClick={() => toggleSort('delaiLivraison')} style={{ whiteSpace: 'nowrap', cursor: 'pointer' }}>Date de livraison prévue <SortIcon sortKey={sortKey} sortDir={sortDir} col="delaiLivraison" /></th>
                <th onClick={() => toggleSort('motif')} style={{ minWidth: 220, cursor: 'pointer' }}>Motif de retard <SortIcon sortKey={sortKey} sortDir={sortDir} col="motif" /></th>
                <th onClick={() => toggleSort('solution')} style={{ minWidth: 220, cursor: 'pointer' }}>Solution convenable <SortIcon sortKey={sortKey} sortDir={sortDir} col="solution" /></th>
                <th onClick={() => toggleSort('statut')} style={{ whiteSpace: 'nowrap', cursor: 'pointer' }}>Statut <SortIcon sortKey={sortKey} sortDir={sortDir} col="statut" /></th>
              </tr>
            </thead>
            <tbody>
              {sortedRows.map(r => (
                <tr key={r.bc} style={!r.found ? { opacity: 0.55 } : undefined}>
                  <td style={{ whiteSpace: 'nowrap' }}>{r.numDa || '—'}</td>
                  <td style={{ whiteSpace: 'nowrap' }}>{r.anDa || '—'}</td>
                  <td style={{ whiteSpace: 'nowrap', fontWeight: 500 }}>{r.numCmd}</td>
                  <td style={{ whiteSpace: 'nowrap' }}>{fmtDate(r.datCde)}</td>
                  <td>{r.objet || '—'}</td>
                  <td style={{ whiteSpace: 'nowrap' }}>{r.fournisseur || '—'}</td>
                  <td style={{ whiteSpace: 'nowrap' }}>{fmtDate(r.datReception)}</td>
                  <td style={{ textAlign: 'right', whiteSpace: 'nowrap' }}>{r.montTTC != null ? formatMontant(r.montTTC) : '—'}</td>
                  <td style={{ whiteSpace: 'nowrap' }}>{r.structure || '—'}</td>
                  <td style={{ whiteSpace: 'nowrap' }}>{r.structureLibelle || '—'}</td>
                  <td style={{ whiteSpace: 'nowrap' }}>{fmtDate(r.delaiLivraison)}</td>
                  <td>
                    <textarea
                      value={noteValue(r, 'motif')}
                      onChange={e => updateNote(r.bc, 'motif', e.target.value)}
                      placeholder="Saisir le motif..."
                      rows={2}
                      style={{
                        width: '100%', minWidth: 220, padding: '5px 8px',
                        border: '1px solid var(--border-light)', borderRadius: 5,
                        fontSize: '0.8rem', fontFamily: 'inherit', resize: 'vertical',
                        whiteSpace: 'pre-wrap', overflowWrap: 'break-word',
                      }}
                    />
                  </td>
                  <td>
                    <input
                      type="text"
                      value={noteValue(r, 'solution')}
                      onChange={e => updateNote(r.bc, 'solution', e.target.value)}
                      placeholder="Saisir la solution..."
                      style={{ width: '100%', padding: '5px 8px', border: '1px solid var(--border-light)', borderRadius: 5, fontSize: '0.8rem' }}
                    />
                  </td>
                  <td style={{ whiteSpace: 'nowrap' }}>{r.statut || '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
