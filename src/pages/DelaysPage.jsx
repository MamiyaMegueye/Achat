import React, { useState, useMemo } from 'react';
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer,
  CartesianGrid, Cell
} from 'recharts';
import { Clock, AlertTriangle, CheckCircle2, Search, Users, TrendingUp, PieChart } from 'lucide-react';
import { formatMontant } from '../utils/stats';
import { matchesAnySearch, matchesSearch } from '../utils/search';
import { sortRows, makeToggleSort } from '../utils/sortUtils';
import SortIcon from '../components/SortIcon';

function fmtDate(d) {
  if (!d) return '—';
  try {
    const dt = d instanceof Date ? d : new Date(d);
    return isNaN(dt) ? '—' : dt.toLocaleDateString('fr-FR');
  } catch { return '—'; }
}

function fmtDuree(jours) {
  if (jours == null) return '—';
  const abs = Math.abs(jours);
  const signe = jours < 0 ? '-' : '';
  if (abs < 30) return `${signe}${abs}j`;
  const mois = Math.floor(abs / 30);
  const reste = abs % 30;
  if (reste === 0) return `${signe}${mois} mois`;
  return `${signe}${mois} mois ${reste}j`;
}

// Error boundary as wrapper
class ErrorBoundary extends React.Component {
  constructor(props) { super(props); this.state = { error: null }; }
  static getDerivedStateFromError(error) { return { error }; }
  render() {
    if (this.state.error) {
      return (
        <div style={{ padding: 40, color: 'red', background: '#fff0f0', borderRadius: 12, margin: 20 }}>
          <h2>Erreur dans la page Délais &amp; Fournisseurs</h2>
          <pre style={{ whiteSpace: 'pre-wrap', fontSize: '0.85rem' }}>{this.state.error.message}</pre>
          <pre style={{ whiteSpace: 'pre-wrap', fontSize: '0.75rem', color: '#666', marginTop: 10 }}>{this.state.error.stack}</pre>
        </div>
      );
    }
    return this.props.children;
  }
}

// === Barre de filtres réutilisable : recherche + statut + jours min/max ===
function FilterBar({ search, setSearch, statut, setStatut, statutOptions, joursMin, setJoursMin, joursMax, setJoursMax, showJoursFilter = true }) {
  const hasFilters = search || statut || joursMin !== '' || joursMax !== '';
  return (
    <div style={{ display: 'flex', gap: 10, marginBottom: 14, flexWrap: 'wrap', alignItems: 'center' }}>
      <div style={{ position: 'relative', flex: '1 1 220px' }}>
        <Search size={14} style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
        <input
          type="text"
          placeholder="N° CMD, fournisseur, article..."
          value={search}
          onChange={e => setSearch(e.target.value)}
          style={{ width: '100%', padding: '7px 10px 7px 30px', border: '1px solid var(--border-light)', borderRadius: 6, fontSize: '0.8rem' }}
        />
      </div>
      {statutOptions && (
        <select value={statut} onChange={e => setStatut(e.target.value)}
          style={{ padding: '7px 10px', border: '1px solid var(--border-light)', borderRadius: 6, fontSize: '0.8rem', background: 'white', minWidth: 150 }}>
          <option value="">Tous les statuts</option>
          {statutOptions.map(s => <option key={s} value={s}>{s}</option>)}
        </select>
      )}
      {showJoursFilter && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Délai (j)</span>
          <input type="number" placeholder="min" value={joursMin} onChange={e => setJoursMin(e.target.value)}
            style={{ width: 64, padding: '7px 8px', border: '1px solid var(--border-light)', borderRadius: 6, fontSize: '0.8rem' }} />
          <span style={{ color: 'var(--text-muted)' }}>–</span>
          <input type="number" placeholder="max" value={joursMax} onChange={e => setJoursMax(e.target.value)}
            style={{ width: 64, padding: '7px 8px', border: '1px solid var(--border-light)', borderRadius: 6, fontSize: '0.8rem' }} />
        </div>
      )}
      {hasFilters && (
        <button
          onClick={() => { setSearch(''); if (setStatut) setStatut(''); setJoursMin(''); setJoursMax(''); }}
          style={{ padding: '7px 10px', border: '1px solid var(--border-light)', borderRadius: 6, fontSize: '0.75rem', background: '#f5f0e8', cursor: 'pointer', color: 'var(--text-secondary)' }}>
          Réinitialiser
        </button>
      )}
    </div>
  );
}

function useTableFilter(rows, { searchFields = [], joursField = 'jours' } = {}) {
  const [search, setSearch] = useState('');
  const [statut, setStatut] = useState('');
  const [joursMin, setJoursMin] = useState('');
  const [joursMax, setJoursMax] = useState('');
  const [sortKey, setSortKey] = useState(null);
  const [sortDir, setSortDir] = useState('asc');
  const toggleSort = makeToggleSort(sortKey, setSortKey, setSortDir);

  const filtered = useMemo(() => {
    let r = rows;
    if (search.trim()) {
      r = r.filter(row => matchesAnySearch(searchFields.map(f => String(row[f] || '')), search));
    }
    if (statut) {
      r = r.filter(row => row.statut === statut);
    }
    if (joursMin !== '') {
      r = r.filter(row => row[joursField] != null && row[joursField] >= Number(joursMin));
    }
    if (joursMax !== '') {
      r = r.filter(row => row[joursField] != null && row[joursField] <= Number(joursMax));
    }
    if (sortKey) {
      r = sortRows(r, sortKey, sortDir);
    }
    return r;
  }, [rows, search, statut, joursMin, joursMax, searchFields, joursField, sortKey, sortDir]);

  return { filtered, search, setSearch, statut, setStatut, joursMin, setJoursMin, joursMax, setJoursMax, sortKey, sortDir, toggleSort };
}

function DelaysSection({ delays, cmds = [] }) {
  const [section, setSection] = useState('livraison');

  const respectDelai = delays.respectDelai || { respecte: 0, depasse: 0, sansDelai: 0 };
  const { respecte = 0, depasse = 0, sansDelai = 0 } = respectDelai;
  const total = respecte + depasse;
  const tauxRespect = total > 0 ? Math.round(respecte / total * 100) : 0;

  const delaiCdeRec = delays.delaiCdeRec || { data: [], moyenne: 0 };
  const delaiRecPaiement = delays.delaiRecPaiement || { data: [], moyenne: 0 };
  const livraisonsEnRetard = delays.livraisonsEnRetard || [];
  const livraisonsDansLesTemps = delays.livraisonsDansLesTemps || [];
  const sansReception = delays.sansReception || [];
  const sansDelaiPrevu = delays.sansDelaiPrevu || [];

  const buckets = [
    { range: '0-15j', min: 0, max: 15, color: '#2a7f62' },
    { range: '16-30j', min: 16, max: 30, color: '#e8a963' },
    { range: '31-60j', min: 31, max: 60, color: '#d97706' },
    { range: '61-90j', min: 61, max: 90, color: '#dc4a3d' },
    { range: '+90j', min: 91, max: 9999, color: '#991b1b' },
  ];

  const histoCdeRec = buckets.map(b => ({
    range: b.range,
    count: delaiCdeRec.data.filter(d => d.jours >= b.min && d.jours <= b.max).length,
    fill: b.color,
  }));

  const histoRecPaie = buckets.map(b => ({
    range: b.range,
    count: delaiRecPaiement.data.filter(d => d.jours >= b.min && d.jours <= b.max).length,
    fill: b.color,
  }));

  // === Table fusionnée : Livraisons en retard + dans les temps ===
  const livraisonsRows = useMemo(() => {
    const retard = livraisonsEnRetard.map(d => ({
      ...d, statut: 'En retard', jours: d.joursRetard,
    }));
    const temps = livraisonsDansLesTemps.map(d => ({
      ...d, statut: 'À temps', jours: -d.joursAvance,
    }));
    return [...retard, ...temps];
  }, [livraisonsEnRetard, livraisonsDansLesTemps]);

  const livraisonsFilter = useTableFilter(livraisonsRows, {
    searchFields: ['numCmd', 'fournisseur', 'objet'],
    joursField: 'jours',
  });

  // === Table fusionnée : Non réceptionnées + Sans date de livraison + Annulées ===
  const nonRecuesRows = useMemo(() => {
    const nonRecues = sansReception.map(d => ({
      numCmd: d.numCmd, fournisseur: d.fournisseur, objet: d.objet,
      datCde: d.datCde, dateLivraison: d.delaiPrevu, datRec: null,
      statut: d.enRetard === true ? 'Non réceptionnée - en retard'
        : d.enRetard === false ? 'Non réceptionnée - en attente'
        : 'Non réceptionnée - sans délai',
      jours: d.joursDepuisCde, montant: d.montant,
    }));
    const sansDelai = sansDelaiPrevu.map(d => ({
      numCmd: d.numCmd, fournisseur: d.fournisseur, objet: d.objet,
      datCde: d.datCde, dateLivraison: null, datRec: d.datRec,
      statut: 'Réceptionnée - sans délai prévu',
      jours: d.delaiReel, montant: d.montant,
    }));
    // Commandes annulées : montant explicitement à 0 (HT et TTC), non réceptionnées
    const annulees = cmds
      .filter(c => c.montHT === 0 && c.montTTC === 0 && !c.datRec)
      .map(c => ({
        numCmd: c.numCmd, fournisseur: c.nomFrn, objet: c.obsCde,
        datCde: c.datCde, dateLivraison: null, datRec: null,
        statut: 'Annulée',
        jours: null, montant: 0,
      }));
    return [...nonRecues, ...sansDelai, ...annulees];
  }, [sansReception, sansDelaiPrevu, cmds]);

  const nonRecuesFilter = useTableFilter(nonRecuesRows, {
    searchFields: ['numCmd', 'fournisseur', 'objet'],
    joursField: 'jours',
  });

  // === Filtres pour Commande → Réception et Réception → Paiement ===
  const cdeRecFilter = useTableFilter(delaiCdeRec.data, {
    searchFields: ['numCmd', 'fournisseur', 'objet'],
    joursField: 'jours',
  });
  const recPaieFilter = useTableFilter(delaiRecPaiement.data, {
    searchFields: ['numCmd', 'fournisseur', 'objet'],
    joursField: 'jours',
  });

  const statutColors = {
    'En retard': { color: '#a63b32', bg: '#fae8e6' },
    'À temps': { color: '#2b6e52', bg: '#e4f2ec' },
    'Non réceptionnée - en retard': { color: '#a63b32', bg: '#fae8e6' },
    'Non réceptionnée - en attente': { color: '#b8663f', bg: '#f8f0e8' },
    'Non réceptionnée - sans délai': { color: '#7b6fa0', bg: '#edeaf4' },
    'Réceptionnée - sans délai prévu': { color: '#5a9bb5', bg: '#e5f1f6' },
    'Annulée': { color: '#8a8a8a', bg: '#eeeeee' },
  };

  const StatutBadge = ({ statut }) => {
    const sc = statutColors[statut] || { color: 'var(--text-secondary)', bg: 'var(--border-light)' };
    return (
      <span style={{ display: 'inline-block', padding: '2px 8px', borderRadius: 10, fontSize: '0.68rem', fontWeight: 600, color: sc.color, background: sc.bg, whiteSpace: 'nowrap' }}>
        {statut}
      </span>
    );
  };

  return (
    <div>
      {/* KPIs */}
      <div className="grid-4">
        <div className="card kpi-card">
          <div className="kpi-icon" style={{ background: 'var(--accent-primary-light)' }}>
            <Clock size={20} style={{ color: 'var(--accent-primary)' }} />
          </div>
          <div className="kpi-value">{fmtDuree(delaiCdeRec.moyenne)}</div>
          <div className="kpi-label">Délai moyen Commande → Réception</div>
          <div className="kpi-sub">Sur {delaiCdeRec.data.length} commandes</div>
        </div>
        <div className="card kpi-card">
          <div className="kpi-icon" style={{ background: 'var(--accent-secondary-light)' }}>
            <Clock size={20} style={{ color: 'var(--accent-secondary)' }} />
          </div>
          <div className="kpi-value">{fmtDuree(delaiRecPaiement.moyenne)}</div>
          <div className="kpi-label">Délai moyen Réception → Paiement</div>
          <div className="kpi-sub">Sur {delaiRecPaiement.data.length} commandes</div>
        </div>
        <div className="card kpi-card">
          <div className="kpi-icon" style={{ background: sansReception.length > 0 ? 'var(--danger-light)' : 'var(--success-light)' }}>
            <AlertTriangle size={20} style={{ color: sansReception.length > 0 ? 'var(--danger)' : 'var(--success)' }} />
          </div>
          <div className="kpi-value">{sansReception.length}</div>
          <div className="kpi-label">Non réceptionnées</div>
          <div className="kpi-sub">{sansReception.filter(s => s.enRetard).length} ont dépassé le délai</div>
        </div>
        <div className="card kpi-card">
          <div className="kpi-icon" style={{ background: tauxRespect >= 70 ? 'var(--success-light)' : 'var(--danger-light)' }}>
            <CheckCircle2 size={20} style={{ color: tauxRespect >= 70 ? 'var(--success)' : 'var(--danger)' }} />
          </div>
          <div className="kpi-value" style={{ color: tauxRespect >= 70 ? 'var(--success)' : tauxRespect >= 50 ? 'var(--warning)' : 'var(--danger)' }}>{tauxRespect}%</div>
          <div className="kpi-label">Respect délai livraison</div>
          <div className="kpi-sub">{respecte} à temps · {depasse} en retard</div>
          <div className="kpi-sub" style={{ marginTop: 2 }}>{sansDelai} sans date de livraison (dont {sansDelaiPrevu.length} réceptionnées, {sansDelai - sansDelaiPrevu.length} non réceptionnées)</div>
        </div>
      </div>

      {/* Barre de respect */}
      <div className="card full-width">
        <div className="card-title">Respect du délai de livraison prévu</div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 24, marginBottom: 12 }}>
          <div style={{ flex: 1, height: 24, background: 'var(--bg-main)', borderRadius: 12, overflow: 'hidden', display: 'flex' }}>
            {respecte > 0 && (
              <div style={{ width: `${tauxRespect}%`, background: 'var(--success)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.72rem', color: 'white', fontWeight: 600 }}>
                {tauxRespect}% à temps
              </div>
            )}
            {depasse > 0 && (
              <div style={{ width: `${100 - tauxRespect}%`, background: 'var(--danger)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.72rem', color: 'white', fontWeight: 600 }}>
                {100 - tauxRespect}% en retard
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="tabs">
        <button className={`tab ${section === 'livraison' ? 'active' : ''}`} onClick={() => setSection('livraison')}>
          Livraisons ({livraisonsRows.length})
        </button>
        <button className={`tab ${section === 'cde-rec' ? 'active' : ''}`} onClick={() => setSection('cde-rec')}>
          Commande → Réception
        </button>
        <button className={`tab ${section === 'rec-paie' ? 'active' : ''}`} onClick={() => setSection('rec-paie')}>
          Réception → Paiement
        </button>
        <button className={`tab ${section === 'non-recues' ? 'active' : ''}`} onClick={() => setSection('non-recues')}>
          Non réceptionnées ({nonRecuesRows.length})
        </button>
      </div>

      {/* SECTION: Livraisons (fusion retard + à temps) */}
      {section === 'livraison' && (
        <div className="card full-width">
          <div className="card-title">
            Suivi des livraisons <span style={{ fontSize: '0.65rem', fontWeight: 400, color: 'var(--text-muted)' }}>— {livraisonsFilter.filtered.length} résultat(s)</span>
          </div>
          <FilterBar
            search={livraisonsFilter.search} setSearch={livraisonsFilter.setSearch}
            statut={livraisonsFilter.statut} setStatut={livraisonsFilter.setStatut}
            statutOptions={['En retard', 'À temps']}
            joursMin={livraisonsFilter.joursMin} setJoursMin={livraisonsFilter.setJoursMin}
            joursMax={livraisonsFilter.joursMax} setJoursMax={livraisonsFilter.setJoursMax}
          />
          {livraisonsFilter.filtered.length === 0 ? (
            <div style={{ textAlign: 'center', padding: 40, color: 'var(--text-muted)' }}>Aucun résultat</div>
          ) : (
            <div style={{ maxHeight: 500, overflowY: 'auto' }}>
              <table className="data-table">
                <thead>
                  <tr>
                    <th onClick={() => livraisonsFilter.toggleSort('numCmd')} style={{ cursor: 'pointer' }}>N° CMD <SortIcon sortKey={livraisonsFilter.sortKey} sortDir={livraisonsFilter.sortDir} col="numCmd" /></th>
                    <th onClick={() => livraisonsFilter.toggleSort('fournisseur')} style={{ cursor: 'pointer' }}>Fournisseur <SortIcon sortKey={livraisonsFilter.sortKey} sortDir={livraisonsFilter.sortDir} col="fournisseur" /></th>
                    <th onClick={() => livraisonsFilter.toggleSort('objet')} style={{ cursor: 'pointer' }}>Article <SortIcon sortKey={livraisonsFilter.sortKey} sortDir={livraisonsFilter.sortDir} col="objet" /></th>
                    <th onClick={() => livraisonsFilter.toggleSort('datCde')} style={{ cursor: 'pointer' }}>Date Cde <SortIcon sortKey={livraisonsFilter.sortKey} sortDir={livraisonsFilter.sortDir} col="datCde" /></th>
                    <th onClick={() => livraisonsFilter.toggleSort('delaiPrevu')} style={{ cursor: 'pointer' }}>Délai prévu <SortIcon sortKey={livraisonsFilter.sortKey} sortDir={livraisonsFilter.sortDir} col="delaiPrevu" /></th>
                    <th onClick={() => livraisonsFilter.toggleSort('datRec')} style={{ cursor: 'pointer' }}>Date réception <SortIcon sortKey={livraisonsFilter.sortKey} sortDir={livraisonsFilter.sortDir} col="datRec" /></th>
                    <th onClick={() => livraisonsFilter.toggleSort('jours')} style={{ cursor: 'pointer', textAlign: 'right' }}>Écart <SortIcon sortKey={livraisonsFilter.sortKey} sortDir={livraisonsFilter.sortDir} col="jours" /></th>
                    <th onClick={() => livraisonsFilter.toggleSort('statut')} style={{ cursor: 'pointer' }}>Statut <SortIcon sortKey={livraisonsFilter.sortKey} sortDir={livraisonsFilter.sortDir} col="statut" /></th>
                    <th onClick={() => livraisonsFilter.toggleSort('montant')} style={{ cursor: 'pointer', textAlign: 'right' }}>Montant TTC <SortIcon sortKey={livraisonsFilter.sortKey} sortDir={livraisonsFilter.sortDir} col="montant" /></th>
                  </tr>
                </thead>
                <tbody>
                  {livraisonsFilter.filtered.map((d, i) => (
                    <tr key={i}>
                      <td style={{ fontWeight: 600 }}>{d.numCmd}</td>
                      <td style={{ maxWidth: 160, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{d.fournisseur}</td>
                      <td style={{ maxWidth: 180, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', fontSize: '0.78rem', color: 'var(--text-secondary)' }}>{d.objet || '—'}</td>
                      <td style={{ fontSize: '0.78rem' }}>{fmtDate(d.datCde)}</td>
                      <td style={{ fontSize: '0.78rem' }}>{fmtDate(d.delaiPrevu)}</td>
                      <td style={{ fontSize: '0.78rem', color: d.statut === 'En retard' ? 'var(--danger)' : 'var(--success)' }}>{fmtDate(d.datRec)}</td>
                      <td className="amount">
                        <span className={`badge ${d.statut === 'En retard' ? (d.jours > 30 ? 'badge-danger' : 'badge-warning') : 'badge-success'}`}>
                          {d.statut === 'En retard' ? '+' : '-'}{fmtDuree(Math.abs(d.jours))}
                        </span>
                      </td>
                      <td><StatutBadge statut={d.statut} /></td>
                      <td className="amount">{formatMontant(d.montant)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* SECTION: Commande → Réception */}
      {section === 'cde-rec' && (
        <>
          <div className="card full-width">
            <div className="card-title">Distribution — Moyenne : {fmtDuree(delaiCdeRec.moyenne)}</div>
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={histoCdeRec}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border-light)" />
                <XAxis dataKey="range" tick={{ fontSize: 12, fill: 'var(--text-secondary)' }} />
                <YAxis tick={{ fontSize: 12, fill: 'var(--text-secondary)' }} />
                <Tooltip formatter={v => [`${v} commandes`, 'Nombre']} contentStyle={{ borderRadius: 8, border: '1px solid var(--border)', fontSize: '0.82rem' }} />
                <Bar dataKey="count" radius={[4, 4, 0, 0]} barSize={40}>
                  {histoCdeRec.map((entry, i) => (
                    <Cell key={i} fill={entry.fill} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
          <div className="card full-width">
            <div className="card-title">
              Détail des commandes <span style={{ fontSize: '0.65rem', fontWeight: 400, color: 'var(--text-muted)' }}>— {cdeRecFilter.filtered.length} résultat(s)</span>
            </div>
            <FilterBar
              search={cdeRecFilter.search} setSearch={cdeRecFilter.setSearch}
              joursMin={cdeRecFilter.joursMin} setJoursMin={cdeRecFilter.setJoursMin}
              joursMax={cdeRecFilter.joursMax} setJoursMax={cdeRecFilter.setJoursMax}
            />
            <div style={{ maxHeight: 450, overflowY: 'auto' }}>
              <table className="data-table">
                <thead>
                  <tr>
                    <th onClick={() => cdeRecFilter.toggleSort('numCmd')} style={{ cursor: 'pointer' }}>N° CMD <SortIcon sortKey={cdeRecFilter.sortKey} sortDir={cdeRecFilter.sortDir} col="numCmd" /></th>
                    <th onClick={() => cdeRecFilter.toggleSort('fournisseur')} style={{ cursor: 'pointer' }}>Fournisseur <SortIcon sortKey={cdeRecFilter.sortKey} sortDir={cdeRecFilter.sortDir} col="fournisseur" /></th>
                    <th onClick={() => cdeRecFilter.toggleSort('objet')} style={{ cursor: 'pointer' }}>Article <SortIcon sortKey={cdeRecFilter.sortKey} sortDir={cdeRecFilter.sortDir} col="objet" /></th>
                    <th onClick={() => cdeRecFilter.toggleSort('datCde')} style={{ cursor: 'pointer' }}>Date Cde <SortIcon sortKey={cdeRecFilter.sortKey} sortDir={cdeRecFilter.sortDir} col="datCde" /></th>
                    <th onClick={() => cdeRecFilter.toggleSort('datRec')} style={{ cursor: 'pointer' }}>Date Réc. <SortIcon sortKey={cdeRecFilter.sortKey} sortDir={cdeRecFilter.sortDir} col="datRec" /></th>
                    <th onClick={() => cdeRecFilter.toggleSort('jours')} style={{ cursor: 'pointer', textAlign: 'right' }}>Délai <SortIcon sortKey={cdeRecFilter.sortKey} sortDir={cdeRecFilter.sortDir} col="jours" /></th>
                    <th onClick={() => cdeRecFilter.toggleSort('montant')} style={{ cursor: 'pointer', textAlign: 'right' }}>Montant <SortIcon sortKey={cdeRecFilter.sortKey} sortDir={cdeRecFilter.sortDir} col="montant" /></th>
                  </tr>
                </thead>
                <tbody>
                  {cdeRecFilter.filtered.map((d, i) => (
                    <tr key={i}>
                      <td style={{ fontWeight: 500 }}>{d.numCmd}</td>
                      <td style={{ maxWidth: 160, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{d.fournisseur}</td>
                      <td style={{ maxWidth: 180, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', fontSize: '0.78rem', color: 'var(--text-secondary)' }}>{d.objet || '—'}</td>
                      <td style={{ fontSize: '0.78rem' }}>{fmtDate(d.datCde)}</td>
                      <td style={{ fontSize: '0.78rem' }}>{fmtDate(d.datRec)}</td>
                      <td className="amount">
                        <span className={`badge ${d.jours > 90 ? 'badge-danger' : d.jours > 60 ? 'badge-warning' : d.jours > 30 ? 'badge-neutral' : 'badge-success'}`}>
                          {fmtDuree(d.jours)}
                        </span>
                      </td>
                      <td className="amount" style={{ fontSize: '0.78rem' }}>{formatMontant(d.montant)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}

      {/* SECTION: Réception → Paiement */}
      {section === 'rec-paie' && (
        <>
          <div className="card full-width">
            <div className="card-title">Distribution — Moyenne : {fmtDuree(delaiRecPaiement.moyenne)} · Délai réglementaire : 90j</div>
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={histoRecPaie}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border-light)" />
                <XAxis dataKey="range" tick={{ fontSize: 12, fill: 'var(--text-secondary)' }} />
                <YAxis tick={{ fontSize: 12, fill: 'var(--text-secondary)' }} />
                <Tooltip formatter={v => [`${v} commandes`, 'Nombre']} contentStyle={{ borderRadius: 8, border: '1px solid var(--border)', fontSize: '0.82rem' }} />
                <Bar dataKey="count" radius={[4, 4, 0, 0]} barSize={40}>
                  {histoRecPaie.map((entry, i) => (
                    <Cell key={i} fill={entry.fill} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
          <div className="card full-width">
            <div className="card-title">
              Détail des paiements <span style={{ fontSize: '0.65rem', fontWeight: 400, color: 'var(--text-muted)' }}>— {recPaieFilter.filtered.length} résultat(s)</span>
            </div>
            <FilterBar
              search={recPaieFilter.search} setSearch={recPaieFilter.setSearch}
              joursMin={recPaieFilter.joursMin} setJoursMin={recPaieFilter.setJoursMin}
              joursMax={recPaieFilter.joursMax} setJoursMax={recPaieFilter.setJoursMax}
            />
            <div style={{ maxHeight: 450, overflowY: 'auto' }}>
              <table className="data-table">
                <thead>
                  <tr>
                    <th onClick={() => recPaieFilter.toggleSort('numCmd')} style={{ cursor: 'pointer' }}>N° CMD <SortIcon sortKey={recPaieFilter.sortKey} sortDir={recPaieFilter.sortDir} col="numCmd" /></th>
                    <th onClick={() => recPaieFilter.toggleSort('fournisseur')} style={{ cursor: 'pointer' }}>Fournisseur <SortIcon sortKey={recPaieFilter.sortKey} sortDir={recPaieFilter.sortDir} col="fournisseur" /></th>
                    <th onClick={() => recPaieFilter.toggleSort('objet')} style={{ cursor: 'pointer' }}>Article <SortIcon sortKey={recPaieFilter.sortKey} sortDir={recPaieFilter.sortDir} col="objet" /></th>
                    <th onClick={() => recPaieFilter.toggleSort('datRec')} style={{ cursor: 'pointer' }}>Date Réc. <SortIcon sortKey={recPaieFilter.sortKey} sortDir={recPaieFilter.sortDir} col="datRec" /></th>
                    <th onClick={() => recPaieFilter.toggleSort('paiementDate')} style={{ cursor: 'pointer' }}>Date Paie. <SortIcon sortKey={recPaieFilter.sortKey} sortDir={recPaieFilter.sortDir} col="paiementDate" /></th>
                    <th onClick={() => recPaieFilter.toggleSort('jours')} style={{ cursor: 'pointer', textAlign: 'right' }}>Délai <SortIcon sortKey={recPaieFilter.sortKey} sortDir={recPaieFilter.sortDir} col="jours" /></th>
                    <th onClick={() => recPaieFilter.toggleSort('depassement90')} style={{ cursor: 'pointer', textAlign: 'right' }}>Dépasse 90j <SortIcon sortKey={recPaieFilter.sortKey} sortDir={recPaieFilter.sortDir} col="depassement90" /></th>
                  </tr>
                </thead>
                <tbody>
                  {recPaieFilter.filtered.map((d, i) => (
                    <tr key={i}>
                      <td style={{ fontWeight: 500 }}>{d.numCmd}</td>
                      <td style={{ maxWidth: 160, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{d.fournisseur}</td>
                      <td style={{ maxWidth: 180, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', fontSize: '0.78rem', color: 'var(--text-secondary)' }}>{d.objet || '—'}</td>
                      <td style={{ fontSize: '0.78rem' }}>{fmtDate(d.datRec)}</td>
                      <td style={{ fontSize: '0.78rem' }}>{fmtDate(d.paiementDate)}</td>
                      <td className="amount">
                        <span className={`badge ${d.jours > 90 ? 'badge-danger' : d.jours > 60 ? 'badge-warning' : 'badge-success'}`}>
                          {fmtDuree(d.jours)}
                        </span>
                      </td>
                      <td className="amount">
                        {d.depassement90 > 0 ? (
                          <span style={{ color: 'var(--danger)', fontWeight: 600 }}>+{fmtDuree(d.depassement90)}</span>
                        ) : (
                          <span style={{ color: 'var(--success)' }}>OK</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}

      {/* SECTION: Non réceptionnées (fusion avec sans date de livraison) */}
      {section === 'non-recues' && (
        <div className="card full-width">
          <div className="card-title">
            Commandes non réceptionnées & sans délai prévu <span style={{ fontSize: '0.65rem', fontWeight: 400, color: 'var(--text-muted)' }}>— {nonRecuesFilter.filtered.length} résultat(s)</span>
          </div>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.8rem', marginBottom: 12 }}>
            Regroupe les commandes sans réception enregistrée et celles réceptionnées sans date de livraison prévue au départ.
          </p>
          <FilterBar
            search={nonRecuesFilter.search} setSearch={nonRecuesFilter.setSearch}
            statut={nonRecuesFilter.statut} setStatut={nonRecuesFilter.setStatut}
            statutOptions={[
              'Non réceptionnée - en retard',
              'Non réceptionnée - en attente',
              'Non réceptionnée - sans délai',
              'Réceptionnée - sans délai prévu',
              'Annulée',
            ]}
            joursMin={nonRecuesFilter.joursMin} setJoursMin={nonRecuesFilter.setJoursMin}
            joursMax={nonRecuesFilter.joursMax} setJoursMax={nonRecuesFilter.setJoursMax}
          />
          {nonRecuesFilter.filtered.length === 0 ? (
            <div style={{ textAlign: 'center', padding: 40, color: 'var(--text-muted)' }}>Aucun résultat</div>
          ) : (
            <div style={{ maxHeight: 500, overflowY: 'auto' }}>
              <table className="data-table">
                <thead>
                  <tr>
                    <th onClick={() => nonRecuesFilter.toggleSort('numCmd')} style={{ cursor: 'pointer' }}>N° CMD <SortIcon sortKey={nonRecuesFilter.sortKey} sortDir={nonRecuesFilter.sortDir} col="numCmd" /></th>
                    <th onClick={() => nonRecuesFilter.toggleSort('fournisseur')} style={{ cursor: 'pointer' }}>Fournisseur <SortIcon sortKey={nonRecuesFilter.sortKey} sortDir={nonRecuesFilter.sortDir} col="fournisseur" /></th>
                    <th onClick={() => nonRecuesFilter.toggleSort('objet')} style={{ cursor: 'pointer' }}>Article <SortIcon sortKey={nonRecuesFilter.sortKey} sortDir={nonRecuesFilter.sortDir} col="objet" /></th>
                    <th onClick={() => nonRecuesFilter.toggleSort('datCde')} style={{ cursor: 'pointer' }}>Date Cde <SortIcon sortKey={nonRecuesFilter.sortKey} sortDir={nonRecuesFilter.sortDir} col="datCde" /></th>
                    <th onClick={() => nonRecuesFilter.toggleSort('dateLivraison')} style={{ cursor: 'pointer' }}>Date livraison prévue <SortIcon sortKey={nonRecuesFilter.sortKey} sortDir={nonRecuesFilter.sortDir} col="dateLivraison" /></th>
                    <th onClick={() => nonRecuesFilter.toggleSort('datRec')} style={{ cursor: 'pointer' }}>Date réception <SortIcon sortKey={nonRecuesFilter.sortKey} sortDir={nonRecuesFilter.sortDir} col="datRec" /></th>
                    <th onClick={() => nonRecuesFilter.toggleSort('jours')} style={{ cursor: 'pointer', textAlign: 'right' }}>Délai (j) <SortIcon sortKey={nonRecuesFilter.sortKey} sortDir={nonRecuesFilter.sortDir} col="jours" /></th>
                    <th onClick={() => nonRecuesFilter.toggleSort('statut')} style={{ cursor: 'pointer' }}>Statut <SortIcon sortKey={nonRecuesFilter.sortKey} sortDir={nonRecuesFilter.sortDir} col="statut" /></th>
                    <th onClick={() => nonRecuesFilter.toggleSort('montant')} style={{ cursor: 'pointer', textAlign: 'right' }}>Montant TTC <SortIcon sortKey={nonRecuesFilter.sortKey} sortDir={nonRecuesFilter.sortDir} col="montant" /></th>
                  </tr>
                </thead>
                <tbody>
                  {nonRecuesFilter.filtered.map((d, i) => (
                    <tr key={i}>
                      <td style={{ fontWeight: 600 }}>{d.numCmd}</td>
                      <td style={{ maxWidth: 160, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{d.fournisseur}</td>
                      <td style={{ maxWidth: 180, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', fontSize: '0.78rem', color: 'var(--text-secondary)' }}>{d.objet || '—'}</td>
                      <td style={{ fontSize: '0.78rem' }}>{fmtDate(d.datCde)}</td>
                      <td style={{ fontSize: '0.78rem' }}>{fmtDate(d.dateLivraison)}</td>
                      <td style={{ fontSize: '0.78rem' }}>{fmtDate(d.datRec)}</td>
                      <td className="amount">{d.jours != null ? fmtDuree(d.jours) : '—'}</td>
                      <td><StatutBadge statut={d.statut} /></td>
                      <td className="amount">{formatMontant(d.montant)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function SuppliersSection({ supplierStats }) {
  const [sortKey, setSortKey] = useState('montantTotal');
  const [sortDir, setSortDir] = useState('desc');
  const [search, setSearch] = useState('');

  const toggleSort = makeToggleSort(sortKey, setSortKey, setSortDir);

  const sorted = useMemo(() => {
    let list = [...supplierStats];
    if (search.trim()) {
      list = list.filter(f => matchesSearch(f.nom, search));
    }
    // Cas particulier : le délai moyen n'a de sens que pour les fournisseurs
    // ayant au moins une livraison ; sans quoi la valeur est absente (null),
    // ce que sortRows place toujours en fin de liste.
    list = sortRows(list, sortKey, sortDir, row => (
      sortKey === 'delaiMoyen' ? (row.delais.length ? row.delaiMoyen : null) : row[sortKey]
    ));
    return list;
  }, [supplierStats, search, sortKey, sortDir]);

  // Stats résumé
  const avgDelai = supplierStats.length > 0
    ? Math.round(supplierStats.filter(s => s.delais.length > 0).reduce((s, f) => s + f.delaiMoyen, 0) / supplierStats.filter(s => s.delais.length > 0).length)
    : 0;
  const nbLents = supplierStats.filter(s => s.delaiMoyen > 60 && s.delais.length >= 3).length;
  const nbSansRec = supplierStats.filter(s => s.sansReception > 0).length;

  // === Fournisseurs sans commande depuis 2 ans ===
  const [ancSortKey, setAncSortKey] = useState('dateMax');
  const [ancSortDir, setAncSortDir] = useState('asc');
  const ancToggleSort = makeToggleSort(ancSortKey, setAncSortKey, setAncSortDir);

  const anciensBase = useMemo(() => {
    const seuil = new Date();
    seuil.setFullYear(seuil.getFullYear() - 2);
    return supplierStats.filter(s => s.dateMax && s.dateMax < seuil);
  }, [supplierStats]);

  const anciens = useMemo(
    () => sortRows(anciensBase, ancSortKey, ancSortDir, row => (ancSortKey === 'nom' ? row.nom : row[ancSortKey])),
    [anciensBase, ancSortKey, ancSortDir]
  );

  // === Analyse Pareto (80/20) ===
  const pareto = useMemo(() => {
    const total = supplierStats.reduce((s, f) => s + f.montantTotal, 0);
    const rangs = [...supplierStats].sort((a, b) => b.montantTotal - a.montantTotal);
    let cumul = 0;
    let seuil80Index = -1;
    const rows = rangs.map((f, i) => {
      cumul += f.montantTotal;
      const pctIndividuel = total > 0 ? (f.montantTotal / total) * 100 : 0;
      const pctCumule = total > 0 ? (cumul / total) * 100 : 0;
      if (seuil80Index === -1 && pctCumule >= 80) seuil80Index = i;
      return { ...f, pctIndividuel, pctCumule };
    });
    return { rows, total, nbPour80: seuil80Index + 1, pctFrnPour80: rangs.length > 0 ? Math.round(((seuil80Index + 1) / rangs.length) * 100) : 0 };
  }, [supplierStats]);

  return (
    <div>
      {/* Mini KPIs */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr', gap: 14, marginBottom: 20 }}>
        <div className="card kpi-card" style={{ background: '#e8f0e4', borderLeft: '2.5px solid #2b6e52' }}>
          <div className="kpi-icon" style={{ background: 'rgba(255,255,255,0.6)' }}>
            <Users size={14} style={{ color: '#2b6e52' }} />
          </div>
          <div className="kpi-value" style={{ color: '#2b6e52' }}>{supplierStats.length}</div>
          <div className="kpi-label">Total fournisseurs</div>
        </div>
        <div className="card kpi-card" style={{ background: '#f3e0d5', borderLeft: '2.5px solid #c17550' }}>
          <div className="kpi-icon" style={{ background: 'rgba(255,255,255,0.6)' }}>
            <Clock size={14} style={{ color: '#c17550' }} />
          </div>
          <div className="kpi-value" style={{ color: '#c17550' }}>{avgDelai}j</div>
          <div className="kpi-label">Délai moyen global</div>
        </div>
        <div className="card kpi-card" style={{ background: '#fae8e6', borderLeft: '2.5px solid #a63b32' }}>
          <div className="kpi-icon" style={{ background: 'rgba(255,255,255,0.6)' }}>
            <AlertTriangle size={14} style={{ color: '#a63b32' }} />
          </div>
          <div className="kpi-value" style={{ color: '#a63b32' }}>{nbLents}</div>
          <div className="kpi-label">Fournisseurs lents (&gt;60j)</div>
        </div>
        <div className="card kpi-card" style={{ background: '#eef0e2', borderLeft: '2.5px solid #7d8a4f' }}>
          <div className="kpi-icon" style={{ background: 'rgba(255,255,255,0.6)' }}>
            <TrendingUp size={14} style={{ color: '#7d8a4f' }} />
          </div>
          <div className="kpi-value" style={{ color: '#7d8a4f' }}>{nbSansRec}</div>
          <div className="kpi-label">Avec livraisons manquantes</div>
        </div>
      </div>

      {/* Table classement */}
      <div className="card full-width">
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16, flexWrap: 'wrap', gap: 10 }}>
          <div className="card-title" style={{ marginBottom: 0 }}>Classement fournisseurs</div>
        </div>

        <div style={{ position: 'relative', maxWidth: 320, marginBottom: 14 }}>
          <Search size={14} style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
          <input
            type="text"
            placeholder="Rechercher un fournisseur..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            style={{ width: '100%', padding: '7px 10px 7px 30px', border: '1px solid var(--border-light)', borderRadius: 6, fontSize: '0.8rem' }}
          />
        </div>

        <div style={{ maxHeight: 500, overflowY: 'auto' }}>
          <table className="data-table">
            <thead>
              <tr>
                <th>#</th>
                <th onClick={() => toggleSort('nom')} style={{ cursor: 'pointer' }}>Fournisseur <SortIcon sortKey={sortKey} sortDir={sortDir} col="nom" /></th>
                <th onClick={() => toggleSort('nbCommandes')} style={{ textAlign: 'right', cursor: 'pointer' }}>Commandes <SortIcon sortKey={sortKey} sortDir={sortDir} col="nbCommandes" /></th>
                <th onClick={() => toggleSort('montantTotal')} style={{ textAlign: 'right', cursor: 'pointer' }}>Montant HT <SortIcon sortKey={sortKey} sortDir={sortDir} col="montantTotal" /></th>
                <th onClick={() => toggleSort('delaiMoyen')} style={{ textAlign: 'right', cursor: 'pointer' }}>Délai moy. <SortIcon sortKey={sortKey} sortDir={sortDir} col="delaiMoyen" /></th>
                <th onClick={() => toggleSort('sansReception')} style={{ textAlign: 'right', cursor: 'pointer' }}>Sans réception <SortIcon sortKey={sortKey} sortDir={sortDir} col="sansReception" /></th>
                <th onClick={() => toggleSort('sansPaiement')} style={{ textAlign: 'right', cursor: 'pointer' }}>Sans paiement <SortIcon sortKey={sortKey} sortDir={sortDir} col="sansPaiement" /></th>
              </tr>
            </thead>
            <tbody>
              {sorted.slice(0, 100).map((s, i) => (
                <tr key={i}>
                  <td style={{ color: 'var(--text-muted)', fontSize: '0.75rem' }}>{i + 1}</td>
                  <td style={{ fontWeight: 500, maxWidth: 250, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {s.nom}
                  </td>
                  <td className="amount">{s.nbCommandes}</td>
                  <td className="amount">{formatMontant(s.montantTotal)}</td>
                  <td className="amount">
                    {s.delais.length > 0 ? (
                      <span className={`badge ${s.delaiMoyen > 60 ? 'badge-danger' : s.delaiMoyen > 30 ? 'badge-warning' : 'badge-success'}`}>
                        {s.delaiMoyen}j
                      </span>
                    ) : (
                      <span className="badge badge-neutral">—</span>
                    )}
                  </td>
                  <td className="amount">{s.sansReception > 0 ? <span style={{ color: 'var(--warning)' }}>{s.sansReception}</span> : '—'}</td>
                  <td className="amount">{s.sansPaiement > 0 ? <span style={{ color: 'var(--danger)' }}>{s.sansPaiement}</span> : '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
          {sorted.length === 0 && (
            <div style={{ textAlign: 'center', padding: 24, color: 'var(--text-muted)', fontSize: '0.85rem' }}>Aucun fournisseur trouvé.</div>
          )}
        </div>
      </div>

      {/* === Fournisseurs sans commande depuis 2 ans === */}
      <div className="card full-width" style={{ padding: 0, overflow: 'hidden' }}>
        <div style={{ background: '#6b6b6b', color: 'white', padding: '10px 16px', fontSize: '0.78rem', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.06em', display: 'flex', alignItems: 'center', gap: 8 }}>
          <AlertTriangle size={15} /> Fournisseurs sans commande depuis 2 ans
        </div>
        <div style={{ padding: '16px 18px', borderBottom: '1px solid var(--border-light)' }}>
          <div style={{ fontSize: '0.95rem', fontWeight: 600, color: 'var(--text-primary)' }}>
            <span style={{ color: '#6b6b6b' }}>{anciens.length} fournisseurs</span> dont la dernière commande date de plus de 2 ans
          </div>
        </div>
        <div style={{ padding: '0 16px 16px', maxHeight: 350, overflowY: 'auto' }}>
          {anciens.length === 0 ? (
            <div style={{ textAlign: 'center', padding: 24, color: 'var(--text-muted)', fontSize: '0.85rem' }}>Aucun fournisseur concerné.</div>
          ) : (
            <table className="data-table">
              <thead>
                <tr>
                  <th onClick={() => ancToggleSort('nom')} style={{ cursor: 'pointer' }}>Fournisseur <SortIcon sortKey={ancSortKey} sortDir={ancSortDir} col="nom" /></th>
                  <th onClick={() => ancToggleSort('nbCommandes')} style={{ textAlign: 'right', cursor: 'pointer' }}>Nb commandes <SortIcon sortKey={ancSortKey} sortDir={ancSortDir} col="nbCommandes" /></th>
                  <th onClick={() => ancToggleSort('montantTotal')} style={{ textAlign: 'right', cursor: 'pointer' }}>Montant HT total <SortIcon sortKey={ancSortKey} sortDir={ancSortDir} col="montantTotal" /></th>
                  <th onClick={() => ancToggleSort('dateMax')} style={{ textAlign: 'right', cursor: 'pointer' }}>Dernière commande <SortIcon sortKey={ancSortKey} sortDir={ancSortDir} col="dateMax" /></th>
                </tr>
              </thead>
              <tbody>
                {anciens.map((s, i) => (
                  <tr key={i}>
                    <td style={{ fontWeight: 500, maxWidth: 260, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{s.nom}</td>
                    <td className="amount">{s.nbCommandes}</td>
                    <td className="amount">{formatMontant(s.montantTotal)}</td>
                    <td className="amount">{s.dateMax.toLocaleDateString('fr-FR')}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {/* === Analyse Pareto (80/20) === */}
      <div className="card full-width" style={{ padding: 0, overflow: 'hidden' }}>
        <div style={{ background: '#8a9a5b', color: 'white', padding: '10px 16px', fontSize: '0.78rem', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.06em', display: 'flex', alignItems: 'center', gap: 8 }}>
          <PieChart size={15} /> Concentration des achats — Principe de Pareto
        </div>

        <div style={{ padding: '16px 18px', borderBottom: '1px solid var(--border-light)' }}>
          <div style={{ fontSize: '0.95rem', fontWeight: 600, color: 'var(--text-primary)' }}>
            <span style={{ color: '#a63b32' }}>{pareto.nbPour80} fournisseurs</span> ({pareto.pctFrnPour80}% du total) concentrent <span style={{ color: '#a63b32' }}>80%</span> du montant total des achats
          </div>
          <div style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', marginTop: 4 }}>
            Sur {supplierStats.length} fournisseurs actifs, un nombre restreint représente l'essentiel de la dépense — ce sont les partenaires à surveiller en priorité.
          </div>
        </div>

        <div style={{ padding: '0 16px 16px', maxHeight: 450, overflowY: 'auto' }}>
          <table className="data-table">
            <thead>
              <tr>
                <th>#</th>
                <th>Fournisseur</th>
                <th style={{ textAlign: 'right' }}>Montant HT</th>
                <th style={{ textAlign: 'right' }}>% individuel</th>
                <th style={{ textAlign: 'right' }}>% cumulé</th>
              </tr>
            </thead>
            <tbody>
              {pareto.rows.slice(0, 100).map((f, i) => {
                const dans80 = i < pareto.nbPour80;
                return (
                  <tr key={i} style={dans80 ? { background: '#fdf3ec' } : {}}>
                    <td style={{ color: 'var(--text-muted)', fontSize: '0.75rem' }}>{i + 1}</td>
                    <td style={{ fontWeight: dans80 ? 600 : 400, maxWidth: 250, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {f.nom}
                    </td>
                    <td className="amount">{formatMontant(f.montantTotal)}</td>
                    <td className="amount" style={{ fontSize: '0.78rem' }}>{f.pctIndividuel.toFixed(1)}%</td>
                    <td className="amount">
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: 8 }}>
                        <div style={{ width: 60, height: 6, background: 'var(--bg-main)', borderRadius: 3, overflow: 'hidden' }}>
                          <div style={{ width: `${Math.min(f.pctCumule, 100)}%`, height: '100%', background: dans80 ? '#c44a3f' : '#3d8b6e', borderRadius: 3 }} />
                        </div>
                        <span style={{ fontWeight: 600, fontSize: '0.78rem', color: dans80 ? '#a63b32' : 'var(--text-secondary)', minWidth: 42 }}>
                          {f.pctCumule.toFixed(1)}%
                        </span>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

function DelaysAndSuppliersContent({ delays, cmds = [], supplierStats = [] }) {
  const [view, setView] = useState('delais');

  return (
    <div>
      <div className="page-header">
        <h1>Délais &amp; Fournisseurs</h1>
        <p>Suivi des délais (commande, livraison, paiement) et analyse des fournisseurs</p>
      </div>

      <div className="tabs" style={{ marginBottom: 20 }}>
        <button className={`tab ${view === 'delais' ? 'active' : ''}`} onClick={() => setView('delais')}>
          Délais
        </button>
        <button className={`tab ${view === 'fournisseurs' ? 'active' : ''}`} onClick={() => setView('fournisseurs')}>
          Fournisseurs
        </button>
      </div>

      {view === 'delais' && <DelaysSection delays={delays} cmds={cmds} />}
      {view === 'fournisseurs' && <SuppliersSection supplierStats={supplierStats} />}
    </div>
  );
}

export default function DelaysPage({ delays, cmds, supplierStats }) {
  return (
    <ErrorBoundary>
      <DelaysAndSuppliersContent delays={delays} cmds={cmds} supplierStats={supplierStats} />
    </ErrorBoundary>
  );
}
