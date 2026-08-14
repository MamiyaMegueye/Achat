import React, { useState } from 'react';
import {
  LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid
} from 'recharts';
import { formatMontant } from '../utils/stats';

export default function ArticlesPage({ articleStats }) {
  const { priceEvolution, surstockCandidates, prixComparaison = [], prixAberrants = [] } = articleStats;
  const [selectedArticle, setSelectedArticle] = useState(
    priceEvolution.length > 0 ? priceEvolution[0] : null
  );
  const [filterCause, setFilterCause] = useState('all');

  const filtered = filterCause === 'all'
    ? priceEvolution
    : priceEvolution.filter(a => a.cause === filterCause);

  const nbInflation = priceEvolution.filter(a => a.cause === 'Inflation').length;
  const nbChangement = priceEvolution.filter(a => a.cause === 'Changement fournisseur').length;

  const chartData = selectedArticle
    ? selectedArticle.entries.map(e => ({
        date: e.date ? new Date(e.date).toLocaleDateString('fr-FR', { month: 'short', year: '2-digit' }) : '?',
        prix: e.pu,
        fournisseur: e.fournisseur,
      }))
    : [];

  return (
    <div>
      <div className="page-header">
        <h1>Articles & Prix</h1>
        <p>Évolution du prix unitaire par article dans le temps</p>
      </div>

      {/* Filtres par cause */}
      <div className="tabs" style={{ marginBottom: 16 }}>
        <button className={`tab ${filterCause === 'all' ? 'active' : ''}`} onClick={() => setFilterCause('all')}>
          Tous ({priceEvolution.length})
        </button>
        <button className={`tab ${filterCause === 'Inflation' ? 'active' : ''}`} onClick={() => setFilterCause('Inflation')}>
          Inflation — même fournisseur ({nbInflation})
        </button>
        <button className={`tab ${filterCause === 'Changement fournisseur' ? 'active' : ''}`} onClick={() => setFilterCause('Changement fournisseur')}>
          Changement fournisseur ({nbChangement})
        </button>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1.4fr 1fr', gap: 16 }}>
        <div className="card">
          <div className="card-title">Articles avec variation de prix ({filtered.length})</div>
          <div style={{ maxHeight: 400, overflowY: 'auto' }}>
            {filtered.length === 0 ? (
              <div style={{ color: 'var(--text-muted)', textAlign: 'center', padding: 40 }}>
                Aucun article avec variation de prix détectée
              </div>
            ) : (
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Article</th>
                    <th>Objet</th>
                    <th>Évolution PU</th>
                    <th>Cause</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((a, i) => {
                    // Construire la chaîne d'évolution avec tous les PU
                    const allPUs = a.entries.map(e => formatMontant(e.pu));
                    // Tous les objets distincts
                    const objets = [...new Set(a.entries.map(e => e.objet).filter(Boolean))];
                    return (
                    <tr
                      key={i}
                      onClick={() => setSelectedArticle(a)}
                      style={{
                        cursor: 'pointer',
                        background: selectedArticle?.code === a.code ? 'var(--accent-primary-light)' : undefined,
                      }}
                    >
                      <td style={{ maxWidth: 120, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {a.label || a.code}
                      </td>
                      <td style={{ fontSize: '0.72rem', color: 'var(--text-secondary)', whiteSpace: 'normal', wordBreak: 'break-word', minWidth: 200 }}>
                        {objets.length > 0 ? objets.map((o, j) => (
                          <div key={j} style={{ marginBottom: j < objets.length - 1 ? 3 : 0, paddingLeft: 6, borderLeft: '2px solid #e0d5c5' }}>{o}</div>
                        )) : '—'}
                      </td>
                      <td style={{ fontSize: '0.78rem' }}>
                        <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: '2px 4px' }}>
                          {allPUs.map((pu, j) => (
                            <span key={j} style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                              <span style={{
                                fontWeight: j === 0 || j === allPUs.length - 1 ? 600 : 400,
                                color: j === allPUs.length - 1
                                  ? (a.variation > 0 ? 'var(--danger)' : 'var(--success)')
                                  : j === 0 ? 'var(--text-primary)' : 'var(--text-secondary)'
                              }}>
                                {pu}
                              </span>
                              {j < allPUs.length - 1 && <span style={{ color: 'var(--text-muted)' }}>→</span>}
                            </span>
                          ))}
                        </div>
                      </td>
                      <td>
                        <span className={`badge ${a.cause === 'Inflation' ? 'badge-warning' : 'badge-neutral'}`}>
                          {a.cause === 'Inflation' ? 'Inflation' : 'Chg. fournisseur'}
                        </span>
                      </td>
                    </tr>
                    );
                  })}
                </tbody>
              </table>
            )}
          </div>
        </div>

        <div className="card">
          <div className="card-title">
            Courbe de prix {selectedArticle ? `— ${selectedArticle.label || selectedArticle.code}` : ''}
          </div>
          {selectedArticle ? (
            <>
              <ResponsiveContainer width="100%" height={280}>
                <LineChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--border-light)" />
                  <XAxis dataKey="date" tick={{ fontSize: 11, fill: 'var(--text-secondary)' }} />
                  <YAxis tick={{ fontSize: 11, fill: 'var(--text-secondary)' }} />
                  <Tooltip
                    formatter={(v) => [`${formatMontant(v)} MRU`, 'Prix unitaire']}
                    labelFormatter={l => l}
                    contentStyle={{ borderRadius: 8, border: '1px solid var(--border)', fontSize: '0.82rem' }}
                  />
                  <Line
                    type="monotone"
                    dataKey="prix"
                    stroke="var(--accent-primary)"
                    strokeWidth={2}
                    dot={{ r: 5, fill: 'var(--accent-primary)' }}
                  />
                </LineChart>
              </ResponsiveContainer>
              <div style={{ marginTop: 12 }}>
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>Date</th>
                      <th>Fournisseur</th>
                      <th>Objet</th>
                      <th style={{ textAlign: 'right' }}>PU</th>
                      <th style={{ textAlign: 'right' }}>Qté</th>
                    </tr>
                  </thead>
                  <tbody>
                    {selectedArticle.entries.map((e, i) => (
                      <tr key={i}>
                        <td>{e.date ? new Date(e.date).toLocaleDateString('fr-FR') : '—'}</td>
                        <td style={{ maxWidth: 150, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{e.fournisseur}</td>
                        <td style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', whiteSpace: 'normal', wordBreak: 'break-word', minWidth: 180 }}>{e.objet || '—'}</td>
                        <td className="amount">{formatMontant(e.pu)}</td>
                        <td className="amount">{e.qte}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </>
          ) : (
            <div style={{ color: 'var(--text-muted)', textAlign: 'center', padding: 80 }}>
              Sélectionnez un article à gauche
            </div>
          )}
        </div>
      </div>

      {/* Surstock candidates */}
      <div className="card full-width" style={{ padding: 0, overflow: 'hidden' }}>
        <div style={{ background: '#c48520', color: 'white', padding: '10px 16px', fontSize: '0.78rem', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.06em' }}>Candidats au surstock — articles petits prix commandés fréquemment</div>
        {surstockCandidates.length === 0 ? (
          <div style={{ color: 'var(--text-muted)', textAlign: 'center', padding: 40 }}>
            Pas assez de données (articles commandés au moins 3 fois requis)
          </div>
        ) : (
          <div style={{ padding: '0 16px 16px', maxHeight: 400, overflowY: 'auto' }}>
            <table className="data-table">
              <thead>
                <tr>
                  <th>Code</th>
                  <th>Article</th>
                  <th style={{ textAlign: 'right' }}>Nb commandes</th>
                  <th style={{ textAlign: 'right' }}>Qté totale</th>
                  <th style={{ textAlign: 'right' }}>PU moyen</th>
                  <th style={{ textAlign: 'right' }}>Total HT</th>
                  <th>Dernière date</th>
                  <th>Structure(s)</th>
                </tr>
              </thead>
              <tbody>
                {surstockCandidates.slice(0, 30).map((a, i) => (
                  <tr key={i}>
                    <td style={{ fontFamily: 'monospace', fontSize: '0.78rem' }}>{a.code}</td>
                    <td style={{ maxWidth: 250, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {a.label}
                    </td>
                    <td className="amount">
                      <span className="badge badge-neutral">{a.nbCommandes}x</span>
                    </td>
                    <td className="amount">{formatMontant(a.totalQte)}</td>
                    <td className="amount">{formatMontant(a.puMoyen)}</td>
                    <td className="amount">{formatMontant(a.totalHT)}</td>
                    <td style={{ fontSize: '0.78rem' }}>{a.derniereDate ? new Date(a.derniereDate).toLocaleDateString('fr-FR') : '—'}</td>
                    <td style={{ fontSize: '0.75rem', maxWidth: 160, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{a.structures.join(', ') || '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>



    </div>
  );
}
