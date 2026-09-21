import React, { useState, useMemo } from 'react';
import ExcelJS from 'exceljs';
import { ShoppingCart, FileText, Receipt, CheckCircle2, XCircle, FileDown, CalendarDays, X, Layers } from 'lucide-react';
import { computeReportingJournalier } from '../utils/stats';
import { sortRows, makeToggleSort } from '../utils/sortUtils';
import SortIcon from '../components/SortIcon';

function normalizeStructureCode(code) {
  return String(code || '').trim().toUpperCase();
}

export default function ReportingPage({ cmds = [], structureDirection = [] }) {
  const reporting = useMemo(() => computeReportingJournalier(cmds), [cmds]);
  const { rows, totaux: totauxGlobal } = reporting;

  // Code Structure (COD_DIR de STK_CMD) -> libellé Direction/Service, depuis
  // code_structure_direction.xlsx (meme principe que la page Instances).
  const structureNameMap = useMemo(() => {
    const map = {};
    structureDirection.forEach(r => {
      if (r.code && r.direction) map[normalizeStructureCode(r.code)] = r.direction;
    });
    return map;
  }, [structureDirection]);

  // Années disponibles (extraites des données)
  const availableYears = useMemo(() => {
    const yrs = new Set();
    rows.forEach(r => {
      if (!r.date) return;
      const y = r.date.slice(0, 4);
      const n = parseInt(y, 10);
      if (n >= 2020 && n <= 2030) yrs.add(y);
    });
    return [...yrs].sort().reverse();
  }, [rows]);
  const [selectedYear, setSelectedYear] = useState(() => String(new Date().getFullYear()));

  const [dateMin, setDateMin] = useState('');
  const [dateMax, setDateMax] = useState('');

  const filteredRows = useMemo(() => {
    const base = rows.filter(r => {
      if (selectedYear && r.date && r.date.slice(0, 4) !== selectedYear) return false;
      if (dateMin && r.date < dateMin) return false;
      if (dateMax && r.date > dateMax) return false;
      return true;
    });

    // Periode bornee des deux cotes (ex: "Aujourd'hui") : on complete les jours
    // sans aucune activite avec des zeros plutot que de les faire disparaitre.
    if (dateMin && dateMax && dateMin <= dateMax) {
      const parDate = {};
      base.forEach(r => { parDate[r.date] = r; });
      const result = [];
      const cur = new Date(dateMin + 'T00:00:00');
      const fin = new Date(dateMax + 'T00:00:00');
      while (cur <= fin) {
        const k = `${cur.getFullYear()}-${String(cur.getMonth() + 1).padStart(2, '0')}-${String(cur.getDate()).padStart(2, '0')}`;
        result.push(parDate[k] || { date: k, nbCommandes: 0, nbDA: 0, nbFactures: 0, nbFrnPayes: 0 });
        cur.setDate(cur.getDate() + 1);
      }
      return result.sort((a, b) => b.date.localeCompare(a.date));
    }

    return base;
  }, [rows, selectedYear, dateMin, dateMax]);

  // KPIs recalculés sur les lignes filtrées (année + dates)
  const totaux = useMemo(() => {
    let totalCommandes = 0, totalDA = 0, totalFactures = 0, totalFrnPayes = 0;
    filteredRows.forEach(r => {
      totalCommandes += r.nbCommandes || 0;
      totalDA += r.nbDA || 0;
      totalFactures += r.nbFactures || 0;
      totalFrnPayes += r.nbFrnPayes || 0;
    });
    // Fournisseurs non payés : recalcul sur les cmds filtrées par année
    const frnStatut = {};
    cmds.forEach(c => {
      if (!c.nomFrn) return;
      const k = c.datCde ? String(c.datCde instanceof Date ? c.datCde.getFullYear() : new Date(c.datCde).getFullYear()) : null;
      if (selectedYear && k !== selectedYear) return;
      if (!(c.nomFrn in frnStatut)) frnStatut[c.nomFrn] = false;
      if (c.paiementDate) frnStatut[c.nomFrn] = true;
    });
    const fournisseursPayes = Object.keys(frnStatut).filter(k => frnStatut[k]).sort();
    const fournisseursNonPayes = Object.keys(frnStatut).filter(k => !frnStatut[k]).sort();
    return {
      totalCommandes, totalDA, totalFactures,
      nbFournisseursPayes: fournisseursPayes.length,
      nbFournisseursNonPayes: fournisseursNonPayes.length,
      fournisseursPayes,
      fournisseursNonPayes,
    };
  }, [filteredRows, cmds, selectedYear]);

  const fmtDate = (k) => {
    const [y, m, d] = k.split('-');
    return `${d}/${m}/${y}`;
  };

  const [showFrnList, setShowFrnList] = useState(null); // 'payes' | 'nonPayes' | null
  const [selectedDay, setSelectedDay] = useState(null);

  const dayKey = (d) => {
    const dt = d instanceof Date ? d : new Date(d);
    if (!d || isNaN(dt)) return null;
    return `${dt.getFullYear()}-${String(dt.getMonth() + 1).padStart(2, '0')}-${String(dt.getDate()).padStart(2, '0')}`;
  };

  const dayDetail = useMemo(() => {
    if (!selectedDay) return [];
    const out = [];
    const seenDA = new Set();
    const articleLabel = (c) => Array.isArray(c.articles) && c.articles.length > 0
      ? c.articles.map(a => a.article).filter(Boolean).join(', ')
      : '—';
    // Structure (COD_DIR de STK_CMD) : portee par les lignes de bon de commande
    // jointes a la commande (articles), comme dans la page Instances.
    const structureOf = (c) => Array.isArray(c.articles) && c.articles.length > 0
      ? c.articles[0].structure || null
      : null;
    // Objet reel de la commande (OBJ_CMD de STK_CMD, toujours a jour), porte
    // par les lignes de bon de commande jointes (articles.objet) -- obsCde
    // (OBS_CDE de SUIVI_CMD) n'est utilise qu'en repli si la jointure manque.
    const objetCmdOf = (c) => {
      const fromArticles = Array.isArray(c.articles) && c.articles.length > 0
        ? (c.articles.find(a => a.objet)?.objet || null)
        : null;
      return fromArticles || c.obsCde || null;
    };
    // Montant de la commande (MONTCDE de STK_CMD, toujours a jour, porte par
    // les lignes de bon de commande jointes) -- montTTC/montHT (SUIVI_CMD)
    // ne sont utilises qu'en repli si la jointure manque.
    const montantCmdOf = (c) => {
      const fromArticles = Array.isArray(c.articles) && c.articles.length > 0
        ? (c.articles.find(a => a.totalTTC != null)?.totalTTC ?? null)
        : null;
      return fromArticles ?? c.montTTC ?? c.montHT ?? null;
    };
    // Libelle de la structure (code -> nom Direction/Service), depuis le
    // meme referentiel que la page Instances.
    const structureLibelleOf = (c) => {
      const code = structureOf(c);
      return code ? (structureNameMap[normalizeStructureCode(code)] || null) : null;
    };

    cmds.forEach(c => {
      if (dayKey(c.datCde) === selectedDay) {
        out.push({ type: 'Commande émise', ref: c.numCmd, tiers: c.nomFrn || '—', article: articleLabel(c), objet: objetCmdOf(c) || '—', structure: structureOf(c), structureLibelle: structureLibelleOf(c), montant: montantCmdOf(c) });
      }
      // Reference = le bon de commande (datCde), pas la date de la DA elle-meme
      // (datDa, souvent vide sur les commandes recentes).
      if (c.numDa && dayKey(c.datCde) === selectedDay) {
        const daKey = `${c.anDa}-${c.numDa}`;
        if (!seenDA.has(daKey)) {
          seenDA.add(daKey);
          // OBJDA/LIBELLE (SUIVI_CMD) manquent souvent sur les DA recentes ;
          // a defaut, on affiche l'objet de la commande (OBJ_CMD, toujours a
          // jour via STK_CMD) comme approximation -- dupliquee entre la DA
          // et la commande, comme pour la structure.
          // Montant de la commande liee (STK_CMD), en repli faute de montant propre a la DA.
          out.push({ type: "Demande d'achat", ref: c.numDa, tiers: c.demandeur || '—', article: '—', objet: c.objDa || c.libelleDa || objetCmdOf(c) || '—', structure: structureOf(c), structureLibelle: structureLibelleOf(c), montant: montantCmdOf(c) });
        }
      }
      if (dayKey(c.factDateFact) === selectedDay) {
        out.push({ type: 'Facture émise', ref: c.factNumFact || c.numCmd, tiers: c.nomFrn || '—', article: articleLabel(c), objet: objetCmdOf(c) || '—', structure: structureOf(c), structureLibelle: structureLibelleOf(c), montant: montantCmdOf(c) });
      }
      if (dayKey(c.paiementDate) === selectedDay) {
        out.push({ type: 'Paiement', ref: c.numCmd, tiers: c.nomFrn || '—', article: articleLabel(c), objet: objetCmdOf(c) || '—', structure: structureOf(c), structureLibelle: structureLibelleOf(c), montant: c.paiementMontant ?? montantCmdOf(c) });
      }
    });
    return out;
  }, [cmds, selectedDay, structureNameMap]);

  const [sortKey, setSortKey] = useState(null);
  const [sortDir, setSortDir] = useState('asc');
  const toggleSort = makeToggleSort(sortKey, setSortKey, setSortDir);
  const sortedRows = useMemo(
    () => (sortKey ? sortRows(filteredRows, sortKey, sortDir) : filteredRows),
    [filteredRows, sortKey, sortDir]
  );

  const [detailSortKey, setDetailSortKey] = useState(null);
  const [detailSortDir, setDetailSortDir] = useState('asc');
  const detailToggleSort = makeToggleSort(detailSortKey, setDetailSortKey, setDetailSortDir);
  const sortedDayDetail = useMemo(
    () => (detailSortKey ? sortRows(dayDetail, detailSortKey, detailSortDir) : dayDetail),
    [dayDetail, detailSortKey, detailSortDir]
  );

  const todayKey = () => {
    const n = new Date();
    return `${n.getFullYear()}-${String(n.getMonth() + 1).padStart(2, '0')}-${String(n.getDate()).padStart(2, '0')}`;
  };
  const showToday = () => { const t = todayKey(); setDateMin(t); setDateMax(t); };

  // Colore l'en-tete situe a la ligne rowNum (pas forcement la ligne 1, vu que
  // les deux tableaux partagent desormais la meme feuille).
  const colorHeaderRow = (ws, rowNum) => {
    const headerRow = ws.getRow(rowNum);
    headerRow.eachCell(cell => {
      cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFC17550' } };
      cell.font = { color: { argb: 'FFFFFFFF' }, bold: true };
      cell.alignment = { vertical: 'middle' };
    });
  };

  // Bordures sur la plage [startRow, endRow] x [1, nbCols] d'un tableau.
  const addBorders = (ws, startRow, endRow, nbCols) => {
    for (let r = startRow; r <= endRow; r++) {
      const row = ws.getRow(r);
      for (let c = 1; c <= nbCols; c++) {
        row.getCell(c).border = {
          top: { style: 'thin' }, left: { style: 'thin' },
          bottom: { style: 'thin' }, right: { style: 'thin' },
        };
      }
    }
  };

  const exportToExcel = async () => {
    const wb = new ExcelJS.Workbook();
    const ws = wb.addWorksheet('Reporting');

    // Largeurs de colonnes : les deux tableaux n'ont pas le meme nombre de
    // colonnes (6 pour le general, 8 pour le detail) -- on prend la plus
    // large des deux pour chaque position de colonne.
    ws.columns = [
      { width: 20 }, { width: 18 }, { width: 28 }, { width: 35 }, { width: 45 }, { width: 30 }, { width: 30 }, { width: 16 }, { width: 30 },
    ];
    // Retour automatique sur toutes les colonnes pour afficher le texte en entier
    ws.columns.forEach(col => { col.alignment = { wrapText: true, vertical: 'top' }; });

    // Tableau general (filtre selon la periode active)
    const globalHeaderRow = ws.addRow(['Date', 'Commandes émises', "Demandes d'achat", 'Factures émises', 'Fournisseurs payés (ce jour)', 'Observation']);
    const globalHeaderRowNum = globalHeaderRow.number;
    filteredRows.forEach(r => {
      ws.addRow([fmtDate(r.date), r.nbCommandes, r.nbDA, r.nbFactures, r.nbFrnPayes, '']);
    });
    const globalEndRow = ws.lastRow.number;
    colorHeaderRow(ws, globalHeaderRowNum);
    addBorders(ws, globalHeaderRowNum, globalEndRow, 6);

    // Tableau detail du jour selectionne, juste en dessous (separe par une
    // ligne vide), si un jour est actif.
    if (selectedDay) {
      ws.addRow([]);
      const detailHeaderRow = ws.addRow(['Type', 'Référence', 'Fournisseur', 'Article', 'Objet', 'Structure', 'Libellé Structure', 'Montant', 'Observation']);
      const detailHeaderRowNum = detailHeaderRow.number;
      dayDetail.forEach(d => {
        ws.addRow([d.type, d.ref ?? '—', d.tiers, d.article ?? '—', d.objet, d.structure || '—', d.structureLibelle || '—', d.montant != null ? Math.round(d.montant) : null, '']);
      });
      const detailEndRow = ws.lastRow.number;
      colorHeaderRow(ws, detailHeaderRowNum);
      addBorders(ws, detailHeaderRowNum, detailEndRow, 9);
    }

    const buffer = await wb.xlsx.writeBuffer();
    const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    const suffix = dateMin || dateMax ? `_${dateMin || 'debut'}_a_${dateMax || 'fin'}` : '';
    a.download = `Reporting_journalier${suffix}.xlsx`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div>
      <div className="page-header">
        <h1>Reporting Journalier</h1>
        <p>Activité quotidienne des achats : commandes, demandes d'achat, factures et paiements</p>
      </div>

      {/* KPI - activité */}
      <div className="grid-3">
        <div className="card kpi-card">
          <div className="kpi-icon" style={{ background: 'var(--accent-primary-light)' }}>
            <ShoppingCart size={20} style={{ color: 'var(--accent-primary)' }} />
          </div>
          <div className="kpi-value">{totaux.totalCommandes}</div>
          <div className="kpi-label">Nombre de commandes émises</div>
        </div>
        <div className="card kpi-card">
          <div className="kpi-icon" style={{ background: 'var(--accent-secondary-light)' }}>
            <FileText size={20} style={{ color: 'var(--accent-secondary)' }} />
          </div>
          <div className="kpi-value">{totaux.totalDA}</div>
          <div className="kpi-label">Nombre de demandes d'achat</div>
        </div>
        <div className="card kpi-card">
          <div className="kpi-icon" style={{ background: 'var(--warning-light)' }}>
            <Receipt size={20} style={{ color: 'var(--warning)' }} />
          </div>
          <div className="kpi-value">{totaux.totalFactures}</div>
          <div className="kpi-label">Nombre de fiches factures émises</div>
        </div>
      </div>

      {/* KPI - fournisseurs */}
      <div className="grid-2">
        <div className="card kpi-card" onClick={() => setShowFrnList(showFrnList === 'payes' ? null : 'payes')} style={{ cursor: 'pointer', outline: showFrnList === 'payes' ? '2px solid var(--success)' : undefined }}>
          <div className="kpi-icon" style={{ background: 'var(--success-light)' }}>
            <CheckCircle2 size={20} style={{ color: 'var(--success)' }} />
          </div>
          <div className="kpi-value" style={{ color: 'var(--success)' }}>{totaux.nbFournisseursPayes}</div>
          <div className="kpi-label">Fournisseurs payés</div>
        </div>
        <div className="card kpi-card" onClick={() => setShowFrnList(showFrnList === 'nonPayes' ? null : 'nonPayes')} style={{ cursor: 'pointer', outline: showFrnList === 'nonPayes' ? '2px solid var(--danger)' : undefined }}>
          <div className="kpi-icon" style={{ background: 'var(--danger-light)' }}>
            <XCircle size={20} style={{ color: 'var(--danger)' }} />
          </div>
          <div className="kpi-value" style={{ color: 'var(--danger)' }}>{totaux.nbFournisseursNonPayes}</div>
          <div className="kpi-label">Fournisseurs non payés</div>
        </div>
      </div>

      {/* Liste fournisseurs payés / non payés */}
      {showFrnList && (
        <div className="card full-width">
          <div className="card-title" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              {showFrnList === 'payes' ? <CheckCircle2 size={15} style={{ color: 'var(--success)' }} /> : <XCircle size={15} style={{ color: 'var(--danger)' }} />}
              {showFrnList === 'payes' ? 'Fournisseurs payés' : 'Fournisseurs non payés'}
              <span style={{ fontSize: '0.65rem', fontWeight: 400, color: 'var(--text-muted)' }}>
                — {(showFrnList === 'payes' ? totaux.fournisseursPayes : totaux.fournisseursNonPayes).length} fournisseur(s)
              </span>
            </span>
            <button onClick={() => setShowFrnList(null)}
              style={{ display: 'flex', alignItems: 'center', gap: 4, padding: '5px 10px', border: '1px solid var(--border-light)', borderRadius: 6, fontSize: '0.75rem', background: 'var(--bg-main)', cursor: 'pointer', color: 'var(--text-secondary)' }}>
              <X size={13} /> Fermer
            </button>
          </div>
          <div style={{ maxHeight: 350, overflowY: 'auto', marginTop: 10 }}>
            <table className="data-table">
              <thead>
                <tr>
                  <th style={{ width: 50 }}>N°</th>
                  <th>Fournisseur</th>
                </tr>
              </thead>
              <tbody>
                {(showFrnList === 'payes' ? totaux.fournisseursPayes : totaux.fournisseursNonPayes).map((frn, i) => (
                  <tr key={frn}>
                    <td style={{ color: 'var(--text-muted)', fontSize: '0.75rem' }}>{i + 1}</td>
                    <td style={{ fontSize: '0.78rem' }}>{frn}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Tableau journalier */}
      <div className="card full-width">
        <div className="card-title" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 10 }}>
          <span>Détail par jour <span style={{ fontSize: '0.65rem', fontWeight: 400, color: 'var(--text-muted)' }}>— {filteredRows.length} jour(s)</span></span>
          <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
            <select value={selectedYear} onChange={e => setSelectedYear(e.target.value)}
              style={{ padding: '5px 8px', border: '1px solid var(--border-light)', borderRadius: 6, fontSize: '0.78rem', background: 'white' }}>
              <option value="">Toutes les années</option>
              {availableYears.map(y => <option key={y} value={y}>{y}</option>)}
            </select>
            <label style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>Du</label>
            <input type="date" value={dateMin} onChange={e => setDateMin(e.target.value)}
              style={{ padding: '5px 8px', border: '1px solid var(--border-light)', borderRadius: 6, fontSize: '0.78rem' }} />
            <label style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>Au</label>
            <input type="date" value={dateMax} onChange={e => setDateMax(e.target.value)}
              style={{ padding: '5px 8px', border: '1px solid var(--border-light)', borderRadius: 6, fontSize: '0.78rem' }} />
            <button onClick={showToday}
              style={{ display: 'flex', alignItems: 'center', gap: 5, padding: '5px 10px', border: '1px solid var(--border-light)', borderRadius: 6, fontSize: '0.75rem', background: 'white', cursor: 'pointer', color: 'var(--text-secondary)' }}>
              <CalendarDays size={13} /> Aujourd'hui
            </button>
            {(dateMin || dateMax) && (
              <button onClick={() => { setDateMin(''); setDateMax(''); }}
                style={{ padding: '5px 10px', border: '1px solid var(--border-light)', borderRadius: 6, fontSize: '0.75rem', background: 'var(--bg-main)', cursor: 'pointer', color: 'var(--text-secondary)' }}>
                Réinitialiser
              </button>
            )}
            <button
              onClick={exportToExcel}
              disabled={filteredRows.length === 0}
              style={{
                display: 'flex', alignItems: 'center', gap: 6,
                padding: '6px 12px', borderRadius: 6, border: 'none',
                background: filteredRows.length === 0 ? 'var(--border-light)' : 'var(--accent-primary)',
                color: filteredRows.length === 0 ? 'var(--text-muted)' : 'white',
                fontSize: '0.78rem', fontWeight: 500,
                cursor: filteredRows.length === 0 ? 'not-allowed' : 'pointer',
              }}
            >
              <FileDown size={14} /> Exporter Excel
            </button>
          </div>
        </div>
        <div style={{ maxHeight: 520, overflowY: 'auto', marginTop: 10 }}>
          <table className="data-table">
            <thead>
              <tr>
                <th onClick={() => toggleSort('date')} style={{ cursor: 'pointer' }}>Date <SortIcon sortKey={sortKey} sortDir={sortDir} col="date" /></th>
                <th onClick={() => toggleSort('nbCommandes')} style={{ textAlign: 'right', cursor: 'pointer' }}>Commandes émises <SortIcon sortKey={sortKey} sortDir={sortDir} col="nbCommandes" /></th>
                <th onClick={() => toggleSort('nbDA')} style={{ textAlign: 'right', cursor: 'pointer' }}>Demandes d'achat <SortIcon sortKey={sortKey} sortDir={sortDir} col="nbDA" /></th>
                <th onClick={() => toggleSort('nbFactures')} style={{ textAlign: 'right', cursor: 'pointer' }}>Factures émises <SortIcon sortKey={sortKey} sortDir={sortDir} col="nbFactures" /></th>
                <th onClick={() => toggleSort('nbFrnPayes')} style={{ textAlign: 'right', cursor: 'pointer' }}>Fournisseurs payés (ce jour) <SortIcon sortKey={sortKey} sortDir={sortDir} col="nbFrnPayes" /></th>
              </tr>
            </thead>
            <tbody>
              {sortedRows.slice(0, 500).map(r => (
                <tr
                  key={r.date}
                  onClick={() => setSelectedDay(r.date === selectedDay ? null : r.date)}
                  style={{ cursor: 'pointer', background: r.date === selectedDay ? 'var(--accent-primary-light)' : undefined }}
                >
                  <td style={{ fontWeight: 500 }}>{fmtDate(r.date)}</td>
                  <td className="amount">{r.nbCommandes}</td>
                  <td className="amount">{r.nbDA}</td>
                  <td className="amount">{r.nbFactures}</td>
                  <td className="amount">{r.nbFrnPayes}</td>
                </tr>
              ))}
            </tbody>
          </table>
          {filteredRows.length === 0 && (
            <div style={{ textAlign: 'center', padding: 24, fontSize: '0.8rem', color: 'var(--text-muted)' }}>
              Aucune donnée sur cette période.
            </div>
          )}
          {filteredRows.length > 500 && (
            <div style={{ textAlign: 'center', padding: 12, fontSize: '0.75rem', color: 'var(--text-muted)' }}>
              Affichage limité aux 500 premiers jours — affinez la période.
            </div>
          )}
          {filteredRows.length > 0 && !selectedDay && (
            <div style={{ textAlign: 'center', padding: 10, fontSize: '0.72rem', color: 'var(--text-muted)' }}>
              Cliquez sur une ligne pour voir le détail du jour.
            </div>
          )}
        </div>
      </div>

      {/* Detail du jour selectionne */}
      {selectedDay && (
        <div className="card full-width">
          <div className="card-title" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <Layers size={15} /> Détail du {fmtDate(selectedDay)}
              <span style={{ fontSize: '0.65rem', fontWeight: 400, color: 'var(--text-muted)' }}>
                — {dayDetail.length} mouvement(s)
              </span>
            </span>
            <button onClick={() => setSelectedDay(null)}
              style={{ display: 'flex', alignItems: 'center', gap: 4, padding: '5px 10px', border: '1px solid var(--border-light)', borderRadius: 6, fontSize: '0.75rem', background: 'var(--bg-main)', cursor: 'pointer', color: 'var(--text-secondary)' }}>
              <X size={13} /> Fermer
            </button>
          </div>
          <div style={{ maxHeight: 420, overflowY: 'auto', overflowX: 'auto', marginTop: 10 }}>
            <table className="data-table">
              <thead>
                <tr>
                  <th onClick={() => detailToggleSort('type')} style={{ cursor: 'pointer' }}>Type <SortIcon sortKey={detailSortKey} sortDir={detailSortDir} col="type" /></th>
                  <th onClick={() => detailToggleSort('ref')} style={{ cursor: 'pointer' }}>Référence <SortIcon sortKey={detailSortKey} sortDir={detailSortDir} col="ref" /></th>
                  <th onClick={() => detailToggleSort('tiers')} style={{ cursor: 'pointer' }}>Fournisseur <SortIcon sortKey={detailSortKey} sortDir={detailSortDir} col="tiers" /></th>
                  <th>Article</th>
                  <th onClick={() => detailToggleSort('objet')} style={{ cursor: 'pointer' }}>Objet <SortIcon sortKey={detailSortKey} sortDir={detailSortDir} col="objet" /></th>
                  <th onClick={() => detailToggleSort('structure')} style={{ cursor: 'pointer' }}>Structure <SortIcon sortKey={detailSortKey} sortDir={detailSortDir} col="structure" /></th>
                  <th onClick={() => detailToggleSort('structureLibelle')} style={{ cursor: 'pointer' }}>Libellé Structure <SortIcon sortKey={detailSortKey} sortDir={detailSortDir} col="structureLibelle" /></th>
                  <th onClick={() => detailToggleSort('montant')} style={{ textAlign: 'right', cursor: 'pointer' }}>Montant <SortIcon sortKey={detailSortKey} sortDir={detailSortDir} col="montant" /></th>
                </tr>
              </thead>
              <tbody>
                {sortedDayDetail.map((d, i) => (
                  <tr key={i}>
                    <td style={{ fontSize: '0.78rem', fontWeight: 500 }}>{d.type}</td>
                    <td style={{ fontFamily: 'monospace', fontSize: '0.75rem' }}>{d.ref ?? '—'}</td>
                    <td style={{ fontSize: '0.78rem' }}>{d.tiers}</td>
                    <td style={{ fontSize: '0.78rem', maxWidth: 220, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{d.article}</td>
                    <td style={{ fontSize: '0.78rem', minWidth: 260, whiteSpace: 'normal', wordBreak: 'break-word' }}>{d.objet}</td>
                    <td style={{ fontSize: '0.78rem', whiteSpace: 'nowrap' }}>{d.structure || '—'}</td>
                    <td style={{ fontSize: '0.78rem', whiteSpace: 'nowrap' }}>{d.structureLibelle || '—'}</td>
                    <td className="amount">{d.montant != null ? new Intl.NumberFormat('fr-FR').format(Math.round(d.montant)) : '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            {dayDetail.length === 0 && (
              <div style={{ textAlign: 'center', padding: 24, fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                Aucun mouvement ce jour-là.
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
