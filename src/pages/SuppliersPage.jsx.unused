import React, { useState, useMemo } from 'react';
import { formatMontant } from '../utils/stats';
import { matchesSearch } from '../utils/search';
import { Clock, TrendingUp, AlertTriangle, PieChart, Users, Search } from 'lucide-react';

export default function SuppliersPage({ supplierStats }) {
  const [sortKey, setSortKey] = useState('montantTotal');
  const [sortDir, setSortDir] = useState('desc');
  const [search, setSearch] = useState('');

  const toggleSort = (key) => {
    if (sortKey === key) {
      setSortDir(d => d === 'asc' ? 'desc' : 'asc');
    } else {
      setSortKey(key);
      setSortDir('desc');
    }
  };

  const SortIcon = ({ col }) => {
    if (sortKey !== col) return null;
    return <span style={{ fontSize: '0.65rem', marginLeft: 4 }}>{sortDir === 'asc' ? '▲' : '▼'}</span>;
  };

  const sorted = useMemo(() => {
    let list = [...supplierStats];
    if (search.trim()) {
      list = list.filter(f => matchesSearch(f.nom, search));
    }
    list.sort((a, b) => {
      let va, vb;
      if (sortKey === 'nom') { va = a.nom.toLowerCase(); vb = b.nom.toLowerCase(); }
      else if (sortKey === 'montantTotal') { va = a.montantTotal; vb = b.montantTotal; }
      else if (sortKey === 'nbCommandes') { va = a.nbCommandes; vb = b.nbCommandes; }
      else if (sortKey === 'delaiMoyen') { va = a.delais.length ? a.delaiMoyen : -1; vb = b.delais.length ? b.delaiMoyen : -1; }
      else if (sortKey === 'sansReception') { va = a.sansReception; vb = b.sansReception; }
      else if (sortKey === 'sansPaiement') { va = a.sansPaiement; vb = b.sansPaiement; }
      else return 0;
      if (va < vb) return sortDir === 'asc' ? -1 : 1;
      if (va > vb) return sortDir === 'asc' ? 1 : -1;
      return 0;
    });
    return list;
  }, [supplierStats, search, sortKey, sortDir]);

  // Stats résumé
  const avgDelai = supplierStats.length > 0
    ? Math.round(supplierStats.filter(s => s.delais.length > 0).reduce((s, f) => s + f.delaiMoyen, 0) / supplierStats.filter(s => s.delais.length > 0).length)
    : 0;
  const nbLents = supplierStats.filter(s => s.delaiMoyen > 60 && s.delais.length >= 3).length;
  const nbSansRec = supplierStats.filter(s => s.sansReception > 0).length;

  // === Fournisseurs inactifs (aucune commande depuis 2 ans, ou date absente) ===
  const { sansDate, anciens } = useMemo(() => {
    const seuil = new Date();
    seuil.setFullYear(seuil.getFullYear() - 2);
    const sd = supplierStats.filter(s => !s.dateMax);
    const anc = supplierStats
      .filter(s => s.dateMax && s.dateMax < seuil)
      .sort((a, b) => a.dateMax - b.dateMax);
    return { sansDate: sd, anciens: anc };
  }, [supplierStats]);

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
      <div className="page-header">
        <h1>Analyse Fournisseurs</h1>
        <p>{supplierStats.length} fournisseurs référencés</p>
      </div>

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
                <th onClick={() => toggleSort('nom')} style={{ cursor: 'pointer' }}>Fournisseur <SortIcon col="nom" /></th>
                <th onClick={() => toggleSort('nbCommandes')} style={{ textAlign: 'right', cursor: 'pointer' }}>Commandes <SortIcon col="nbCommandes" /></th>
                <th onClick={() => toggleSort('montantTotal')} style={{ textAlign: 'right', cursor: 'pointer' }}>Montant HT <SortIcon col="montantTotal" /></th>
                <th onClick={() => toggleSort('delaiMoyen')} style={{ textAlign: 'right', cursor: 'pointer' }}>Délai moy. <SortIcon col="delaiMoyen" /></th>
                <th onClick={() => toggleSort('sansReception')} style={{ textAlign: 'right', cursor: 'pointer' }}>Sans réception <SortIcon col="sansReception" /></th>
                <th onClick={() => toggleSort('sansPaiement')} style={{ textAlign: 'right', cursor: 'pointer' }}>Sans paiement <SortIcon col="sansPaiement" /></th>
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

      {/* === Fournisseurs sans date de commande === */}
      <div className="card full-width" style={{ padding: 0, overflow: 'hidden' }}>
        <div style={{ background: '#c17550', color: 'white', padding: '10px 16px', fontSize: '0.78rem', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.06em', display: 'flex', alignItems: 'center', gap: 8 }}>
          <AlertTriangle size={15} /> Fournisseurs sans date de commande
        </div>
        <div style={{ padding: '16px 18px', borderBottom: '1px solid var(--border-light)' }}>
          <div style={{ fontSize: '0.95rem', fontWeight: 600, color: 'var(--text-primary)' }}>
            <span style={{ color: '#c17550' }}>{sansDate.length} fournisseurs</span> n'ont aucune date de commande enregistrée dans les données
          </div>
        </div>
        <div style={{ padding: '0 16px 16px', maxHeight: 350, overflowY: 'auto' }}>
          {sansDate.length === 0 ? (
            <div style={{ textAlign: 'center', padding: 24, color: 'var(--text-muted)', fontSize: '0.85rem' }}>Aucun fournisseur concerné.</div>
          ) : (
            <table className="data-table">
              <thead>
                <tr>
                  <th>Fournisseur</th>
                  <th style={{ textAlign: 'right' }}>Nb commandes</th>
                  <th style={{ textAlign: 'right' }}>Montant HT total</th>
                </tr>
              </thead>
              <tbody>
                {sansDate.map((s, i) => (
                  <tr key={i}>
                    <td style={{ fontWeight: 500, maxWidth: 260, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{s.nom}</td>
                    <td className="amount">{s.nbCommandes}</td>
                    <td className="amount">{formatMontant(s.montantTotal)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
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
                  <th>Fournisseur</th>
                  <th style={{ textAlign: 'right' }}>Nb commandes</th>
                  <th style={{ textAlign: 'right' }}>Montant HT total</th>
                  <th style={{ textAlign: 'right' }}>Dernière commande</th>
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