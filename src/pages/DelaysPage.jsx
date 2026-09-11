import React, { useState, useMemo } from 'react';
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer,
  CartesianGrid, Cell
} from 'recharts';
import { Clock, AlertTriangle, CheckCircle2, Search } from 'lucide-react';
import { formatMontant } from '../utils/stats';
import { matchesAnySearch } from '../utils/search';

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
          <h2>Erreur dans la page Délais</h2>
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
    return r;
  }, [rows, search, statut, joursMin, joursMax, searchFields, joursField]);

  return { filtered, search, setSearch, statut, setStatut, joursMin, setJoursMin, joursMax, setJoursMax };
}

function DelaysContent({ delays, cmds = [] }) {
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
      <div className="page-header">
        <h1>Analyse des Délais</h1>
        <p>Suivi détaillé des délais : commande, livraison, paiement</p>
      </div>

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
                    <th>N° CMD</th>
                    <th>Fournisseur</th>
                    <th>Article</th>
                    <th>Date Cde</th>
                    <th>Délai prévu</th>
                    <th>Date réception</th>
                    <th style={{ textAlign: 'right' }}>Écart</th>
                    <th>Statut</th>
                    <th style={{ textAlign: 'right' }}>Montant TTC</th>
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
                    <th>N° CMD</th>
                    <th>Fournisseur</th>
                    <th>Article</th>
                    <th>Date Cde</th>
                    <th>Date Réc.</th>
                    <th style={{ textAlign: 'right' }}>Délai</th>
                    <th style={{ textAlign: 'right' }}>Montant</th>
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
                    <th>N° CMD</th>
                    <th>Fournisseur</th>
                    <th>Article</th>
                    <th>Date Réc.</th>
                    <th>Date Paie.</th>
                    <th style={{ textAlign: 'right' }}>Délai</th>
                    <th style={{ textAlign: 'right' }}>Dépasse 90j</th>
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
                    <th>N° CMD</th>
                    <th>Fournisseur</th>
                    <th>Article</th>
                    <th>Date Cde</th>
                    <th>Date livraison prévue</th>
                    <th>Date réception</th>
                    <th style={{ textAlign: 'right' }}>Délai (j)</th>
                    <th>Statut</th>
                    <th style={{ textAlign: 'right' }}>Montant TTC</th>
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

export default function DelaysPage({ delays }) {
  return (
    <ErrorBoundary>
      <DelaysContent delays={delays} />
    </ErrorBoundary>
  );
}