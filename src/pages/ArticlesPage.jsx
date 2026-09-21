import React, { useState, useMemo } from 'react';
import ExcelJS from 'exceljs';
import {
  LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid
} from 'recharts';
import { formatMontant } from '../utils/stats';
import { matchesAnySearch } from '../utils/search';
import { formatCaracteristiques } from '../utils/characteristics';
import { Search, X, FileDown } from 'lucide-react';
import { sortRows, makeToggleSort } from '../utils/sortUtils';
import SortIcon from '../components/SortIcon';

export default function ArticlesPage({ articleStats }) {
  const { referentiel = [] } = articleStats;
  const [search, setSearch] = useState('');
  const [searchNature, setSearchNature] = useState('');
  const [searchObjet, setSearchObjet] = useState('');
  const [searchFournisseur, setSearchFournisseur] = useState('');
  const [selected, setSelected] = useState(null);
  const [caracSearch, setCaracSearch] = useState('');
  const [natureFilter, setNatureFilter] = useState('');
  const [anneeFilter, setAnneeFilter] = useState('');
  const [sortKey, setSortKey] = useState(null);
  const [sortDir, setSortDir] = useState('asc');
  const toggleSort = makeToggleSort(sortKey, setSortKey, setSortDir);
  const [histSortKey, setHistSortKey] = useState(null);
  const [histSortDir, setHistSortDir] = useState('asc');
  const histToggleSort = makeToggleSort(histSortKey, setHistSortKey, setHistSortDir);

  const naturesList = useMemo(
    () => [...new Set(referentiel.map(a => a.natureArticle).filter(Boolean))].sort(),
    [referentiel]
  );

  const anneesList = useMemo(
    () => [...new Set(referentiel.map(a => a.derniereDate ? new Date(a.derniereDate).getFullYear() : null).filter(Boolean))].sort((x, y) => y - x),
    [referentiel]
  );

  // Précalculer les caractéristiques (texte formaté) et les N° BC uniques par article
  const referentielAvecCarac = useMemo(() => {
    return referentiel.map(a => ({
      ...a,
      _caracText: formatCaracteristiques(`${a.label} ${(a.objets || []).join(' ')}`),
      _numBCs: [...new Set((a.entries || []).map(e => e.numBC).filter(Boolean))],
      _fournisseurActuel: (a.entries && a.entries.length > 0)
        ? a.entries[a.entries.length - 1].fournisseur
        : (a.fournisseurs && a.fournisseurs[0]) || null,
    }));
  }, [referentiel]);

  const filtered = useMemo(() => {
    let list = referentielAvecCarac;
    if (search.trim()) {
      list = list.filter(a => matchesAnySearch([a.label, a.code], search));
    }
    if (searchNature.trim()) {
      list = list.filter(a => matchesAnySearch([a.natureArticle], searchNature));
    }
    if (natureFilter) {
      list = list.filter(a => (a.natureArticle || '').trim() === natureFilter.trim());
    }
    if (anneeFilter) {
      list = list.filter(a => a.derniereDate && new Date(a.derniereDate).getFullYear() === Number(anneeFilter));
    }
    if (searchObjet.trim()) {
      list = list.filter(a => matchesAnySearch(a.objets, searchObjet));
    }
    if (searchFournisseur.trim()) {
      list = list.filter(a => matchesAnySearch(a.fournisseurs, searchFournisseur));
    }
    if (caracSearch.trim()) {
      list = list.filter(a => matchesAnySearch([a._caracText], caracSearch));
    }
    return list;
  }, [referentielAvecCarac, search, searchNature, natureFilter, anneeFilter, searchObjet, searchFournisseur, caracSearch]);

  const sortedFiltered = useMemo(() => {
    if (!sortKey) return filtered;
    const getValue = (a) => {
      switch (sortKey) {
        case 'article': return a.label || a.code;
        case 'nature': return a.natureArticle;
        case 'fournisseur': return a._fournisseurActuel;
        case 'numBC': return a._numBCs[0];
        case 'annee': return a.derniereDate ? new Date(a.derniereDate).getFullYear() : null;
        case 'puMinMax': return a.puMin;
        default: return a[sortKey];
      }
    };
    return sortRows(filtered, sortKey, sortDir, getValue);
  }, [filtered, sortKey, sortDir]);

  const sortedEntries = useMemo(() => {
    if (!selected) return [];
    if (!histSortKey) return selected.entries;
    return sortRows(selected.entries, histSortKey, histSortDir);
  }, [selected, histSortKey, histSortDir]);

  const chartData = selected
    ? selected.entries.map(e => ({
        date: e.date ? new Date(e.date).toLocaleDateString('fr-FR', { month: 'short', year: '2-digit' }) : '?',
        prix: e.pu,
        fournisseur: e.fournisseur,
        numBC: e.numBC,
      }))
    : [];

  const variationPct = selected && selected.puMin > 0
    ? Math.round(((selected.puMax - selected.puMin) / selected.puMin) * 100)
    : 0;

  const exportToExcel = async () => {
    const wb = new ExcelJS.Workbook();
    const ws = wb.addWorksheet('Référentiel Prix');

    const columns = [
      { header: 'Article', key: 'article', width: 35 },
      { header: "Nature d'article", key: 'nature', width: 22 },
      { header: 'N° BC', key: 'numBC', width: 18 },
      { header: 'Caractéristiques', key: 'carac', width: 25 },
      { header: 'Année', key: 'annee', width: 10 },
      { header: 'PU actuel', key: 'puActuel', width: 14 },
      { header: 'PU min', key: 'puMin', width: 12 },
      { header: 'PU max', key: 'puMax', width: 12 },
      { header: 'Nb commandes', key: 'nbCmd', width: 14 },
      { header: 'Observation', key: 'observation', width: 30 },
    ];
    ws.columns = columns;

    sortedFiltered.forEach(a => {
      ws.addRow({
        article: a.label || a.code,
        nature: a.natureArticle || '',
        numBC: a._numBCs.join(', '),
        carac: a._caracText,
        annee: a.derniereDate ? new Date(a.derniereDate).getFullYear() : '',
        puActuel: a.puActuel,
        puMin: a.puMin,
        puMax: a.puMax,
        observation: '',
        nbCmd: a.nbCommandes,
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
    a.download = `Referentiel_Prix_${new Date().toISOString().slice(0, 10)}.xlsx`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div>
      <div className="page-header" style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', flexWrap: 'wrap', gap: 10 }}>
        <div>
          <h1>Référentiel Prix</h1>
          <p>{referentiel.length} articles référencés — base de prix par article</p>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <select
            value={natureFilter}
            onChange={e => setNatureFilter(e.target.value)}
            style={{ padding: '8px 12px', border: '1px solid var(--border-light)', borderRadius: 6, fontSize: '0.82rem', background: 'white', minWidth: 170 }}
          >
            <option value="">Toutes les natures</option>
            {naturesList.map(n => <option key={n} value={n}>{n}</option>)}
          </select>
          <select
            value={anneeFilter}
            onChange={e => setAnneeFilter(e.target.value)}
            style={{ padding: '8px 12px', border: '1px solid var(--border-light)', borderRadius: 6, fontSize: '0.82rem', background: 'white', minWidth: 130 }}
          >
            <option value="">Toutes les années</option>
            {anneesList.map(y => <option key={y} value={y}>{y}</option>)}
          </select>
          <button
            onClick={exportToExcel}
            style={{
              display: 'flex', alignItems: 'center', gap: 6,
              padding: '8px 14px', borderRadius: 6, border: 'none',
              background: 'var(--accent-primary)', color: 'white',
              fontSize: '0.82rem', fontWeight: 500, cursor: 'pointer',
            }}
          >
            <FileDown size={15} />
            Exporter Excel
          </button>
        </div>
      </div>

      <div className="card full-width">
        <div style={{ display: 'flex', gap: 10, marginBottom: 14, flexWrap: 'wrap' }}>
          <div style={{ position: 'relative', flex: '1 1 220px' }}>
            <Search size={14} style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
            <input
              type="text"
              placeholder="Rechercher par article..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              style={{ width: '100%', padding: '8px 12px 8px 32px', border: '1px solid var(--border-light)', borderRadius: 6, fontSize: '0.82rem' }}
            />
          </div>
          <div style={{ position: 'relative', flex: '1 1 220px' }}>
            <Search size={14} style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
            <input
              type="text"
              placeholder="Rechercher par nature..."
              value={searchNature}
              onChange={e => setSearchNature(e.target.value)}
              style={{ width: '100%', padding: '8px 12px 8px 32px', border: '1px solid var(--border-light)', borderRadius: 6, fontSize: '0.82rem' }}
            />
          </div>
          <div style={{ position: 'relative', flex: '1 1 220px' }}>
            <Search size={14} style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
            <input
              type="text"
              placeholder="Rechercher par objet..."
              value={searchObjet}
              onChange={e => setSearchObjet(e.target.value)}
              style={{ width: '100%', padding: '8px 12px 8px 32px', border: '1px solid var(--border-light)', borderRadius: 6, fontSize: '0.82rem' }}
            />
          </div>
          <div style={{ position: 'relative', flex: '1 1 220px' }}>
            <Search size={14} style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
            <input
              type="text"
              placeholder="Rechercher par fournisseur..."
              value={searchFournisseur}
              onChange={e => setSearchFournisseur(e.target.value)}
              style={{ width: '100%', padding: '8px 12px 8px 32px', border: '1px solid var(--border-light)', borderRadius: 6, fontSize: '0.82rem' }}
            />
          </div>
        </div>

        <div style={{ position: 'relative', marginBottom: 14 }}>
          <Search size={14} style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
          <input
            type="text"
            placeholder="Filtrer par caractéristique (ex: 55 KW, DN200, 16 GO)..."
            value={caracSearch}
            onChange={e => setCaracSearch(e.target.value)}
            style={{ width: '100%', maxWidth: 420, padding: '8px 12px 8px 32px', border: '1px solid var(--border-light)', borderRadius: 6, fontSize: '0.82rem' }}
          />
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: selected ? '1.3fr 1fr' : '1fr', gap: 16 }}>
          <div>
            <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginBottom: 8 }}>{filtered.length} résultat(s)</div>
            <div style={{ maxHeight: 560, overflowY: 'auto' }}>
              <table className="data-table">
                <thead>
                  <tr>
                    <th onClick={() => toggleSort('article')} style={{ cursor: 'pointer' }}>Article <SortIcon sortKey={sortKey} sortDir={sortDir} col="article" /></th>
                    <th onClick={() => toggleSort('nature')} style={{ cursor: 'pointer' }}>Nature d'article <SortIcon sortKey={sortKey} sortDir={sortDir} col="nature" /></th>
                    <th onClick={() => toggleSort('fournisseur')} style={{ cursor: 'pointer' }}>Fournisseur <SortIcon sortKey={sortKey} sortDir={sortDir} col="fournisseur" /></th>
                    <th onClick={() => toggleSort('numBC')} style={{ cursor: 'pointer' }}>N° BC <SortIcon sortKey={sortKey} sortDir={sortDir} col="numBC" /></th>
                    <th>Caractéristiques</th>
                    <th onClick={() => toggleSort('annee')} style={{ textAlign: 'right', cursor: 'pointer' }}>Année <SortIcon sortKey={sortKey} sortDir={sortDir} col="annee" /></th>
                    <th onClick={() => toggleSort('puActuel')} style={{ textAlign: 'right', cursor: 'pointer' }}>PU actuel <SortIcon sortKey={sortKey} sortDir={sortDir} col="puActuel" /></th>
                    <th onClick={() => toggleSort('puMinMax')} style={{ textAlign: 'right', cursor: 'pointer' }}>PU min - max <SortIcon sortKey={sortKey} sortDir={sortDir} col="puMinMax" /></th>
                    <th onClick={() => toggleSort('nbCommandes')} style={{ textAlign: 'right', cursor: 'pointer' }}>Nb cmd <SortIcon sortKey={sortKey} sortDir={sortDir} col="nbCommandes" /></th>
                  </tr>
                </thead>
                <tbody>
                  {sortedFiltered.slice(0, 300).map((a, i) => (
                    <tr
                      key={i}
                      onClick={() => setSelected(a)}
                      style={{ cursor: 'pointer', background: selected?.code === a.code ? 'var(--accent-primary-light)' : undefined }}
                    >
                      <td style={{ maxWidth: 260, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{a.label || a.code}</td>
                      <td style={{ fontSize: '0.78rem', color: 'var(--text-secondary)' }}>{a.natureArticle || '—'}</td>
                      <td style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }} title={(a.fournisseurs || []).join(', ')}>
                        {a._fournisseurActuel || '—'}
                        {a.fournisseurs && a.fournisseurs.length > 1 && (
                          <span style={{ color: 'var(--text-muted)' }}> (+{a.fournisseurs.length - 1})</span>
                        )}
                      </td>
                      <td style={{ fontSize: '0.75rem', fontFamily: 'monospace' }} title={a._numBCs.join(', ')}>
                        {a._numBCs.length > 0 ? (
                          <>
                            {a._numBCs[0]}
                            {a._numBCs.length > 1 && <span style={{ color: 'var(--text-muted)' }}> (+{a._numBCs.length - 1})</span>}
                          </>
                        ) : '—'}
                      </td>
                      <td style={{ fontSize: '0.75rem', color: 'var(--accent-primary)', fontWeight: 500, whiteSpace: 'nowrap' }}>
                        {a._caracText || '—'}
                      </td>
                      <td className="amount" style={{ fontSize: '0.78rem' }}>
                        {a.derniereDate ? new Date(a.derniereDate).getFullYear() : '—'}
                      </td>
                      <td className="amount">{formatMontant(a.puActuel)}</td>
                      <td className="amount" style={{ fontSize: '0.78rem' }}>
                        {a.puMin === a.puMax ? formatMontant(a.puMin) : `${formatMontant(a.puMin)} – ${formatMontant(a.puMax)}`}
                      </td>
                      <td className="amount">{a.nbCommandes}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {filtered.length === 0 && (
                <div style={{ textAlign: 'center', padding: 30, color: 'var(--text-muted)', fontSize: '0.85rem' }}>Aucun article trouvé.</div>
              )}
              {filtered.length > 300 && (
                <div style={{ textAlign: 'center', padding: 10, fontSize: '0.72rem', color: 'var(--text-muted)' }}>
                  Affichage limité aux 300 premiers résultats — affinez la recherche.
                </div>
              )}
            </div>
          </div>

          {selected && (
            <div>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
                <div>
                  <div className="card-title" style={{ marginBottom: 0 }}>{selected.label || selected.code}</div>
                  {selected.natureArticle && (
                    <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginTop: 2 }}>{selected.natureArticle}</div>
                  )}
                  {selected._caracText && (
                    <div style={{ fontSize: '0.72rem', color: 'var(--accent-primary)', fontWeight: 500, marginTop: 2 }}>
                      {selected._caracText}
                    </div>
                  )}
                </div>
                <button onClick={() => setSelected(null)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)' }}>
                  <X size={16} />
                </button>
              </div>

              <div style={{ display: 'flex', gap: 10, marginBottom: 12, flexWrap: 'wrap' }}>
                <div style={{ flex: 1, minWidth: 100, padding: '8px 10px', background: 'var(--bg-main)', borderRadius: 6 }}>
                  <div style={{ fontSize: '0.65rem', color: 'var(--text-muted)' }}>PU actuel</div>
                  <div style={{ fontSize: '0.95rem', fontWeight: 700 }}>{formatMontant(selected.puActuel)}</div>
                </div>
                <div style={{ flex: 1, minWidth: 100, padding: '8px 10px', background: 'var(--bg-main)', borderRadius: 6 }}>
                  <div style={{ fontSize: '0.65rem', color: 'var(--text-muted)' }}>Variation de prix</div>
                  <div style={{ fontSize: '0.95rem', fontWeight: 700, color: variationPct > 20 ? 'var(--danger)' : 'var(--text-primary)' }}>
                    {variationPct}%
                  </div>
                  <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginTop: 2 }}>
                    +{formatMontant(selected.puMax - selected.puMin)} MRU
                  </div>
                </div>
                <div style={{ flex: 1, minWidth: 100, padding: '8px 10px', background: 'var(--bg-main)', borderRadius: 6 }}>
                  <div style={{ fontSize: '0.65rem', color: 'var(--text-muted)' }}>Fournisseurs</div>
                  <div style={{ fontSize: '0.95rem', fontWeight: 700 }}>{selected.fournisseurs.length}</div>
                </div>
              </div>

              {chartData.length > 1 && (
                <ResponsiveContainer width="100%" height={180}>
                  <LineChart data={chartData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="var(--border-light)" />
                    <XAxis dataKey="date" tick={{ fontSize: 10, fill: 'var(--text-secondary)' }} />
                    <YAxis tick={{ fontSize: 10, fill: 'var(--text-secondary)' }} />
                    <Tooltip
                      content={({ active, payload, label }) => {
                        if (!active || !payload || !payload.length) return null;
                        const d = payload[0].payload;
                        return (
                          <div style={{ background: 'white', border: '1px solid var(--border)', borderRadius: 8, padding: '8px 10px', fontSize: '0.78rem' }}>
                            <div style={{ fontWeight: 600 }}>{label}</div>
                            <div>{formatMontant(d.prix)} MRU</div>
                            <div style={{ color: 'var(--text-secondary)' }}>BC N° {d.numBC || '—'}</div>
                            <div style={{ color: 'var(--text-muted)', fontSize: '0.72rem' }}>{d.fournisseur}</div>
                          </div>
                        );
                      }}
                    />
                    <Line type="monotone" dataKey="prix" stroke="var(--accent-primary)" strokeWidth={2} dot={{ r: 4, fill: 'var(--accent-primary)' }} />
                  </LineChart>
                </ResponsiveContainer>
              )}

              <div style={{ marginTop: 12, maxHeight: 260, overflowY: 'auto' }}>
                <table className="data-table">
                  <thead>
                    <tr>
                      <th onClick={() => histToggleSort('date')} style={{ cursor: 'pointer' }}>Date <SortIcon sortKey={histSortKey} sortDir={histSortDir} col="date" /></th>
                      <th onClick={() => histToggleSort('fournisseur')} style={{ cursor: 'pointer' }}>Fournisseur <SortIcon sortKey={histSortKey} sortDir={histSortDir} col="fournisseur" /></th>
                      <th onClick={() => histToggleSort('pu')} style={{ textAlign: 'right', cursor: 'pointer' }}>PU <SortIcon sortKey={histSortKey} sortDir={histSortDir} col="pu" /></th>
                      <th onClick={() => histToggleSort('qte')} style={{ textAlign: 'right', cursor: 'pointer' }}>Qté <SortIcon sortKey={histSortKey} sortDir={histSortDir} col="qte" /></th>
                    </tr>
                  </thead>
                  <tbody>
                    {sortedEntries.map((e, i) => (
                      <tr key={i}>
                        <td style={{ fontSize: '0.78rem' }}>{e.date ? new Date(e.date).toLocaleDateString('fr-FR') : '—'}</td>
                        <td style={{ maxWidth: 130, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', fontSize: '0.78rem' }}>{e.fournisseur}</td>
                        <td className="amount">{formatMontant(e.pu)}</td>
                        <td className="amount">{e.qte}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {selected.objets.length > 0 && (
                <div style={{ marginTop: 12 }}>
                  <div style={{ fontSize: '0.65rem', color: 'var(--text-muted)', marginBottom: 6, textTransform: 'uppercase', fontWeight: 600 }}>Objets liés</div>
                  {selected.objets.slice(0, 5).map((o, i) => (
                    <div key={i} style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', paddingLeft: 8, borderLeft: '2px solid #e0d5c5', marginBottom: 4 }}>{o}</div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}