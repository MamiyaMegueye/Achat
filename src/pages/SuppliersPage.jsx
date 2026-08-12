import React, { useState } from 'react';
import { formatMontant } from '../utils/stats';
import { Clock, TrendingUp, AlertTriangle } from 'lucide-react';

export default function SuppliersPage({ supplierStats }) {
  const [sortKey, setSortKey] = useState('montantTotal');

  const sorted = [...supplierStats].sort((a, b) => {
    if (sortKey === 'montantTotal') return b.montantTotal - a.montantTotal;
    if (sortKey === 'nbCommandes') return b.nbCommandes - a.nbCommandes;
    if (sortKey === 'delaiMoyen') return b.delaiMoyen - a.delaiMoyen;
    return 0;
  });

  const top10Delai = [...supplierStats]
    .filter(s => s.delais.length >= 3)
    .sort((a, b) => b.delaiMoyen - a.delaiMoyen)
    .slice(0, 10);

  const maxDelai = top10Delai.length > 0 ? top10Delai[0].delaiMoyen : 1;

  const getDelaiColor = (d) => {
    if (d > 60) return { bg: '#fae8e6', bar: '#c44a3f', text: '#a63b32' };
    if (d > 30) return { bg: '#fdf3e4', bar: '#c48520', text: '#8a5e16' };
    return { bg: '#e4f2ec', bar: '#3d8b6e', text: '#2b6e52' };
  };

  // Stats résumé
  const avgDelai = supplierStats.length > 0
    ? Math.round(supplierStats.filter(s => s.delais.length > 0).reduce((s, f) => s + f.delaiMoyen, 0) / supplierStats.filter(s => s.delais.length > 0).length)
    : 0;
  const nbLents = supplierStats.filter(s => s.delaiMoyen > 60 && s.delais.length >= 3).length;
  const nbSansRec = supplierStats.filter(s => s.sansReception > 0).length;

  return (
    <div>
      <div className="page-header">
        <h1>Analyse Fournisseurs</h1>
        <p>{supplierStats.length} fournisseurs référencés</p>
      </div>

      {/* Mini KPIs */}
      <div className="grid-3" style={{ marginBottom: 20 }}>
        <div className="card kpi-card" style={{ background: '#f7ece0', borderLeft: '2.5px solid #8a5220' }}>
          <div className="kpi-icon" style={{ background: 'rgba(255,255,255,0.6)' }}>
            <Clock size={14} style={{ color: '#8a5220' }} />
          </div>
          <div className="kpi-value" style={{ color: '#8a5220' }}>{avgDelai}j</div>
          <div className="kpi-label">Délai moyen global</div>
        </div>
        <div className="card kpi-card" style={{ background: '#fae8e6', borderLeft: '2.5px solid #a63b32' }}>
          <div className="kpi-icon" style={{ background: 'rgba(255,255,255,0.6)' }}>
            <AlertTriangle size={14} style={{ color: '#a63b32' }} />
          </div>
          <div className="kpi-value" style={{ color: '#a63b32' }}>{nbLents}</div>
          <div className="kpi-label">Fournisseurs lents (&gt;60j)</div>
        </div>
        <div className="card kpi-card" style={{ background: '#fdf3e4', borderLeft: '2.5px solid #8a5e16' }}>
          <div className="kpi-icon" style={{ background: 'rgba(255,255,255,0.6)' }}>
            <TrendingUp size={14} style={{ color: '#8a5e16' }} />
          </div>
          <div className="kpi-value" style={{ color: '#8a5e16' }}>{nbSansRec}</div>
          <div className="kpi-label">Avec livraisons manquantes</div>
        </div>
      </div>

      {/* Top 10 délais — barres visuelles */}
      <div className="card full-width">
        <div className="card-title">Top 10 fournisseurs les plus lents (délai moyen en jours)</div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          {top10Delai.map((s, i) => {
            const pct = (s.delaiMoyen / maxDelai) * 100;
            const colors = getDelaiColor(s.delaiMoyen);
            return (
              <div key={i} style={{
                display: 'flex', alignItems: 'center', gap: 10,
                padding: '6px 10px', borderRadius: 6,
                background: colors.bg,
                transition: 'transform 0.15s',
              }}>
                <span style={{
                  width: 20, fontSize: '0.68rem', fontWeight: 600,
                  color: colors.text, textAlign: 'center', flexShrink: 0,
                }}>{i + 1}</span>
                <span style={{
                  width: 160, fontSize: '0.78rem', fontWeight: 500,
                  color: 'var(--text-primary)', overflow: 'hidden',
                  textOverflow: 'ellipsis', whiteSpace: 'nowrap', flexShrink: 0,
                }}>{s.nom}</span>
                <div style={{ flex: 1, height: 14, background: 'rgba(255,255,255,0.5)', borderRadius: 7, overflow: 'hidden' }}>
                  <div style={{
                    width: `${pct}%`, height: '100%',
                    background: colors.bar, borderRadius: 7,
                    transition: 'width 0.4s ease',
                  }} />
                </div>
                <span style={{
                  fontSize: '0.78rem', fontWeight: 700, color: colors.text,
                  minWidth: 36, textAlign: 'right', flexShrink: 0,
                }}>{s.delaiMoyen}j</span>
                <span style={{
                  fontSize: '0.65rem', color: 'var(--text-muted)',
                  minWidth: 50, textAlign: 'right', flexShrink: 0,
                }}>{s.delais.length} cmd{s.delais.length > 1 ? 's' : ''}</span>
              </div>
            );
          })}
        </div>
      </div>

      {/* Table */}
      <div className="card full-width">
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
          <div className="card-title" style={{ marginBottom: 0 }}>Classement fournisseurs</div>
          <div className="tabs" style={{ marginBottom: 0 }}>
            <button className={`tab ${sortKey === 'montantTotal' ? 'active' : ''}`} onClick={() => setSortKey('montantTotal')}>Par montant</button>
            <button className={`tab ${sortKey === 'nbCommandes' ? 'active' : ''}`} onClick={() => setSortKey('nbCommandes')}>Par volume</button>
            <button className={`tab ${sortKey === 'delaiMoyen' ? 'active' : ''}`} onClick={() => setSortKey('delaiMoyen')}>Par délai</button>
          </div>
        </div>
        <div style={{ maxHeight: 500, overflowY: 'auto' }}>
          <table className="data-table">
            <thead>
              <tr>
                <th>#</th>
                <th>Fournisseur</th>
                <th style={{ textAlign: 'right' }}>Commandes</th>
                <th style={{ textAlign: 'right' }}>Montant HT</th>
                <th style={{ textAlign: 'right' }}>Délai moy.</th>
                <th style={{ textAlign: 'right' }}>Sans réception</th>
                <th style={{ textAlign: 'right' }}>Sans paiement</th>
              </tr>
            </thead>
            <tbody>
              {sorted.slice(0, 50).map((s, i) => (
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
        </div>
      </div>
    </div>
  );
}
