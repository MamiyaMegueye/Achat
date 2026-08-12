import React, { useState } from 'react';
import {
  ShoppingCart, PackageCheck, CreditCard, Clock,
  AlertTriangle, TrendingUp, CheckCircle2, XCircle, X
} from 'lucide-react';
import { formatMontant } from '../utils/stats';

export default function DashboardPage({ kpis, delays, supplierStats, paymentAlerts, cmds = [] }) {

  const [selectedPipeline, setSelectedPipeline] = useState(null);
  const [selectedFrn, setSelectedFrn] = useState(null);

  const statusData = [
    { name: 'Payées', value: kpis.payees, color: '#3d8b6e', bg: '#e4f2ec' },
    { name: 'Facturées', value: kpis.facturees - kpis.payees, color: '#7b6fa0', bg: '#edeaf4' },
    { name: 'Réceptionnées', value: kpis.receptionnees - kpis.facturees, color: '#d4975a', bg: '#fdf3e4' },
    { name: 'En cours', value: kpis.totalCmds - kpis.receptionnees, color: '#c44a3f', bg: '#fae8e6' },
  ].filter(d => d.value > 0);

  const pctPayees = Math.round(kpis.payees / kpis.totalCmds * 100);
  const pctRespect = delays.respectDelai.respecte + delays.respectDelai.depasse > 0
    ? Math.round(delays.respectDelai.respecte / (delays.respectDelai.respecte + delays.respectDelai.depasse) * 100)
    : 0;

  const top8 = supplierStats.slice(0, 8);
  const maxMontant = top8.length > 0 ? top8[0].montantTotal : 1;

  const CircleProgress = ({ pct, color, bgColor, size = 54, stroke = 5 }) => {
    const r = (size - stroke) / 2;
    const circ = 2 * Math.PI * r;
    const offset = circ - (pct / 100) * circ;
    return (
      <svg width={size} height={size} style={{ transform: 'rotate(-90deg)' }}>
        <circle cx={size/2} cy={size/2} r={r} fill="none" stroke={bgColor} strokeWidth={stroke} />
        <circle cx={size/2} cy={size/2} r={r} fill="none" stroke={color} strokeWidth={stroke}
          strokeDasharray={circ} strokeDashoffset={offset} strokeLinecap="round"
          style={{ transition: 'stroke-dashoffset 0.6s ease' }} />
      </svg>
    );
  };

  // Filtrer les commandes selon le segment pipeline cliqué
  const getPipelineCmds = () => {
    if (!selectedPipeline || !cmds.length) return [];
    let filtered = [];
    switch (selectedPipeline) {
      case 'Payées':
        filtered = cmds.filter(c => c.paiementDate);
        break;
      case 'Facturées':
        filtered = cmds.filter(c => c.factDateFact && !c.paiementDate);
        break;
      case 'Réceptionnées':
        filtered = cmds.filter(c => c.datRec && !c.factDateFact);
        break;
      case 'En cours':
        filtered = cmds.filter(c => !c.datRec);
        break;
      default:
        return [];
    }
    return filtered.slice(0, 20).map(c => ({
      numCmd: c.numCmd,
      fournisseur: c.nomFrn || '—',
      objet: c.obsCde || '—',
      montant: c.montTTC || c.montHT || 0,
      datCde: c.datCde,
    }));
  };

  const barColors = ['#b06830', '#3d8b6e', '#7b6fa0', '#c48520', '#5a9bb5', '#d4975a', '#9b8ec4', '#c44a3f'];

  return (
    <div>
      <div className="page-header">
        <h1>Vue d'ensemble</h1>
        <p>Synthèse de l'activité achats</p>
      </div>

      {/* === Bandeau principal === */}
      <div className="card full-width" style={{ padding: 0, overflow: 'hidden' }}>
        <div style={{
          display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)',
        }}>
          <div style={{ padding: '16px 18px', borderRight: '1px solid var(--border-light)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
              <div style={{ width: 28, height: 28, borderRadius: 7, background: '#f7ece0', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <ShoppingCart size={13} style={{ color: '#8a5220' }} />
              </div>
              <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)', fontWeight: 500 }}>Commandes</span>
            </div>
            <div style={{ fontSize: '1.3rem', fontWeight: 700, color: '#8a5220' }}>{kpis.totalCmds}</div>
            <div style={{ fontSize: '0.65rem', color: 'var(--text-muted)', marginTop: 2 }}>{kpis.totalArticles} articles</div>
          </div>

          <div style={{ padding: '16px 18px', borderRight: '1px solid var(--border-light)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
              <div style={{ width: 28, height: 28, borderRadius: 7, background: '#e4f2ec', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <CreditCard size={13} style={{ color: '#2b6e52' }} />
              </div>
              <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)', fontWeight: 500 }}>Montant total HT</span>
            </div>
            <div style={{ fontSize: '1.3rem', fontWeight: 700, color: '#2b6e52' }}>{formatMontant(kpis.totalMontantHT)}</div>
            <div style={{ fontSize: '0.65rem', color: 'var(--text-muted)', marginTop: 2 }}>MRU</div>
          </div>

          <div style={{ padding: '16px 18px', borderRight: '1px solid var(--border-light)' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                  <div style={{ width: 28, height: 28, borderRadius: 7, background: '#edeaf4', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <PackageCheck size={13} style={{ color: '#5e5288' }} />
                  </div>
                  <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)', fontWeight: 500 }}>Payées</span>
                </div>
                <div style={{ fontSize: '1.3rem', fontWeight: 700, color: '#5e5288' }}>{kpis.payees}</div>
                <div style={{ fontSize: '0.65rem', color: 'var(--text-muted)', marginTop: 2 }}>sur {kpis.totalCmds}</div>
              </div>
              <div style={{ position: 'relative' }}>
                <CircleProgress pct={pctPayees} color="#7b6fa0" bgColor="#edeaf4" />
                <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.7rem', fontWeight: 700, color: '#5e5288' }}>
                  {pctPayees}%
                </div>
              </div>
            </div>
          </div>

          <div style={{ padding: '16px 18px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
              <div style={{ width: 28, height: 28, borderRadius: 7, background: '#fae8e6', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <AlertTriangle size={13} style={{ color: '#a63b32' }} />
              </div>
              <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)', fontWeight: 500 }}>Encours</span>
            </div>
            <div style={{ fontSize: '1.3rem', fontWeight: 700, color: '#a63b32' }}>{formatMontant(kpis.encoursMontant)}</div>
            <div style={{ fontSize: '0.65rem', color: 'var(--text-muted)', marginTop: 2 }}>{kpis.enCours} non payées</div>
          </div>
        </div>
      </div>

      {/* === Ligne 2 : Délais === */}
      <div className="grid-4">
        <div className="card" style={{ padding: '14px 16px', display: 'flex', alignItems: 'center', gap: 12 }}>
          <div style={{ width: 36, height: 36, borderRadius: '50%', background: '#f7ece0', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Clock size={15} style={{ color: '#8a5220' }} />
          </div>
          <div>
            <div style={{ fontSize: '1.05rem', fontWeight: 700, color: '#8a5220' }}>{delays.delaiCdeRec.moyenne}j</div>
            <div style={{ fontSize: '0.65rem', color: 'var(--text-muted)' }}>Cde → Réception</div>
          </div>
        </div>

        <div className="card" style={{ padding: '14px 16px', display: 'flex', alignItems: 'center', gap: 12 }}>
          <div style={{ width: 36, height: 36, borderRadius: '50%', background: '#e4f2ec', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Clock size={15} style={{ color: '#2b6e52' }} />
          </div>
          <div>
            <div style={{ fontSize: '1.05rem', fontWeight: 700, color: '#2b6e52' }}>{delays.delaiRecPaiement.moyenne}j</div>
            <div style={{ fontSize: '0.65rem', color: 'var(--text-muted)' }}>Réception → Paiement</div>
          </div>
        </div>

        <div className="card" style={{ padding: '14px 16px', display: 'flex', alignItems: 'center', gap: 12 }}>
          <div style={{ position: 'relative' }}>
            <CircleProgress pct={pctRespect} color={pctRespect > 50 ? '#3d8b6e' : '#c44a3f'} bgColor={pctRespect > 50 ? '#e4f2ec' : '#fae8e6'} size={40} stroke={4} />
            <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.6rem', fontWeight: 700, color: pctRespect > 50 ? '#2b6e52' : '#a63b32' }}>
              {pctRespect}%
            </div>
          </div>
          <div>
            <div style={{ fontSize: '0.72rem', fontWeight: 600, color: 'var(--text-primary)' }}>Respect délai</div>
            <div style={{ fontSize: '0.6rem', color: 'var(--text-muted)' }}>
              <span style={{ color: '#3d8b6e' }}>{delays.respectDelai.respecte}</span> ok · <span style={{ color: '#c44a3f' }}>{delays.respectDelai.depasse}</span> retard
            </div>
          </div>
        </div>

        <div className="card" style={{ padding: '14px 16px', display: 'flex', alignItems: 'center', gap: 12 }}>
          <div style={{ width: 36, height: 36, borderRadius: '50%', background: paymentAlerts.length > 0 ? '#fae8e6' : '#e4f2ec', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            {paymentAlerts.length > 0
              ? <XCircle size={15} style={{ color: '#a63b32' }} />
              : <CheckCircle2 size={15} style={{ color: '#2b6e52' }} />
            }
          </div>
          <div>
            <div style={{ fontSize: '1.05rem', fontWeight: 700, color: paymentAlerts.length > 0 ? '#a63b32' : '#2b6e52' }}>
              {paymentAlerts.length}
            </div>
            <div style={{ fontSize: '0.65rem', color: 'var(--text-muted)' }}>
              Impayées &gt;90j{paymentAlerts.length > 0 ? ` · ${formatMontant(paymentAlerts.reduce((s, a) => s + a.montant, 0))}` : ''}
            </div>
          </div>
        </div>
      </div>

      {/* === Pipeline cliquable === */}
      <div className="card full-width">
        <div className="card-title">Pipeline des commandes <span style={{ fontSize: '0.65rem', fontWeight: 400, color: 'var(--text-muted)' }}>— cliquez un segment</span></div>
        <div style={{ display: 'flex', borderRadius: 8, overflow: 'hidden', height: 36, marginBottom: 12, cursor: 'pointer' }}>
          {statusData.map((d, i) => {
            const pct = (d.value / kpis.totalCmds) * 100;
            const isSelected = selectedPipeline === d.name;
            return (
              <div key={i}
                onClick={() => setSelectedPipeline(isSelected ? null : d.name)}
                style={{
                  width: `${pct}%`, background: d.color, minWidth: pct > 3 ? 'auto' : 4,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  transition: 'all 0.3s ease',
                  opacity: selectedPipeline && !isSelected ? 0.4 : 1,
                  transform: isSelected ? 'scaleY(1.15)' : 'scaleY(1)',
                  outline: isSelected ? '2px solid ' + d.color : 'none',
                  outlineOffset: 2,
                  borderRadius: isSelected ? 4 : 0,
                  zIndex: isSelected ? 2 : 1,
                  position: 'relative',
                }}>
                <span style={{ fontSize: '0.7rem', fontWeight: 600, color: 'white' }}>{d.value}</span>
              </div>
            );
          })}
        </div>
        <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap' }}>
          {statusData.map((d, i) => {
            const pct = Math.round((d.value / kpis.totalCmds) * 100);
            const isSelected = selectedPipeline === d.name;
            return (
              <div key={i}
                onClick={() => setSelectedPipeline(isSelected ? null : d.name)}
                style={{
                  display: 'flex', alignItems: 'center', gap: 6, cursor: 'pointer',
                  padding: '4px 10px', borderRadius: 6,
                  background: isSelected ? d.bg : 'transparent',
                  transition: 'all 0.2s',
                }}>
                <div style={{ width: 10, height: 10, borderRadius: 3, background: d.color }} />
                <span style={{ fontSize: '0.75rem', color: isSelected ? d.color : 'var(--text-secondary)', fontWeight: isSelected ? 600 : 400 }}>{d.name}</span>
                <span style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-primary)' }}>{d.value}</span>
                <span style={{ fontSize: '0.65rem', color: 'var(--text-muted)' }}>({pct}%)</span>
              </div>
            );
          })}
        </div>

        {/* Détail au clic */}
        {selectedPipeline && (() => {
          const sel = statusData.find(d => d.name === selectedPipeline);
          const pipelineCmds = getPipelineCmds();
          return (
            <div style={{
              marginTop: 14, padding: '14px 16px',
              background: sel?.bg || 'var(--border-light)', borderRadius: 8,
              animation: 'fadeIn 0.3s ease',
            }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
                <span style={{ fontSize: '0.78rem', fontWeight: 600, color: sel?.color }}>
                  {selectedPipeline} — {sel?.value} commandes
                </span>
                <button onClick={() => setSelectedPipeline(null)} style={{
                  background: 'none', border: 'none', cursor: 'pointer', padding: 4, borderRadius: 4,
                  color: 'var(--text-muted)', display: 'flex',
                }}>
                  <X size={14} />
                </button>
              </div>
              {pipelineCmds.length > 0 ? (
                <div style={{ maxHeight: 200, overflowY: 'auto' }}>
                  <table className="data-table">
                    <thead>
                      <tr>
                        <th>N° Cmd</th>
                        <th>Fournisseur</th>
                        <th>Objet</th>
                        <th style={{ textAlign: 'right' }}>Montant</th>
                        <th style={{ textAlign: 'right' }}>Date Cde</th>
                      </tr>
                    </thead>
                    <tbody>
                      {pipelineCmds.map((c, j) => (
                        <tr key={j}>
                          <td style={{ fontFamily: 'monospace', fontSize: '0.75rem' }}>{c.numCmd}</td>
                          <td style={{ maxWidth: 150, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{c.fournisseur}</td>
                          <td style={{ maxWidth: 180, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', fontSize: '0.78rem', color: 'var(--text-secondary)' }}>{c.objet}</td>
                          <td className="amount">{formatMontant(c.montant)}</td>
                          <td className="amount" style={{ fontSize: '0.75rem' }}>{c.datCde ? new Date(c.datCde).toLocaleDateString('fr-FR') : '—'}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', textAlign: 'center', padding: 16 }}>
                  Détails disponibles sur la page dédiée
                </div>
              )}
            </div>
          );
        })()}
      </div>

      {/* === Top fournisseurs cliquable === */}
      <div className="card full-width">
        <div className="card-title">Top fournisseurs par montant <span style={{ fontSize: '0.65rem', fontWeight: 400, color: 'var(--text-muted)' }}>— cliquez pour détails</span></div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
          {top8.map((s, i) => {
            const pct = (s.montantTotal / maxMontant) * 100;
            const color = barColors[i % barColors.length];
            const isSelected = selectedFrn === s.nom;
            return (
              <div key={i}>
                <div
                  onClick={() => setSelectedFrn(isSelected ? null : s.nom)}
                  style={{
                    display: 'flex', alignItems: 'center', gap: 8,
                    padding: '6px 8px', borderRadius: 6, cursor: 'pointer',
                    background: isSelected ? color + '12' : 'transparent',
                    transition: 'all 0.2s',
                  }}
                  onMouseEnter={e => { if (!isSelected) e.currentTarget.style.background = 'var(--border-light)'; }}
                  onMouseLeave={e => { if (!isSelected) e.currentTarget.style.background = 'transparent'; }}
                >
                  <span style={{ width: 140, fontSize: '0.75rem', fontWeight: isSelected ? 600 : 500, color: isSelected ? color : 'var(--text-primary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', flexShrink: 0 }}>
                    {s.nom}
                  </span>
                  <div style={{ flex: 1, height: 18, background: 'var(--border-light)', borderRadius: 5, overflow: 'hidden', position: 'relative' }}>
                    <div style={{
                      width: `${pct}%`, height: '100%',
                      background: `linear-gradient(90deg, ${color}bb, ${color})`,
                      borderRadius: 5, transition: 'width 0.5s ease',
                      display: 'flex', alignItems: 'center', justifyContent: 'flex-end', paddingRight: 6,
                    }}>
                      {pct > 18 && <span style={{ fontSize: '0.63rem', fontWeight: 600, color: 'white' }}>{formatMontant(Math.round(s.montantTotal / 1000))}k</span>}
                    </div>
                    {pct <= 18 && <span style={{ position: 'absolute', left: `${pct + 1}%`, top: '50%', transform: 'translateY(-50%)', fontSize: '0.63rem', fontWeight: 600, color: color }}>{formatMontant(Math.round(s.montantTotal / 1000))}k</span>}
                  </div>
                  <span style={{ fontSize: '0.63rem', color: 'var(--text-muted)', minWidth: 42, textAlign: 'right', flexShrink: 0 }}>
                    {s.nbCommandes} cmds
                  </span>
                </div>

                {/* Panneau détail */}
                {isSelected && (
                  <div style={{
                    margin: '4px 0 6px 8px', padding: '12px 14px',
                    background: color + '0a', borderRadius: 8,
                    borderLeft: `3px solid ${color}`,
                    animation: 'fadeIn 0.3s ease',
                  }}>
                    <div style={{ display: 'flex', gap: 20, flexWrap: 'wrap', marginBottom: 8 }}>
                      <div>
                        <div style={{ fontSize: '0.62rem', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Montant HT</div>
                        <div style={{ fontSize: '0.88rem', fontWeight: 700, color: color }}>{formatMontant(s.montantTotal)} MRU</div>
                      </div>
                      <div>
                        <div style={{ fontSize: '0.62rem', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Commandes</div>
                        <div style={{ fontSize: '0.88rem', fontWeight: 700, color: 'var(--text-primary)' }}>{s.nbCommandes}</div>
                      </div>
                      <div>
                        <div style={{ fontSize: '0.62rem', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Délai moyen</div>
                        <div style={{ fontSize: '0.88rem', fontWeight: 700, color: 'var(--text-primary)' }}>
                          {s.delais.length > 0 ? (
                            <span className={`badge ${s.delaiMoyen > 60 ? 'badge-danger' : s.delaiMoyen > 30 ? 'badge-warning' : 'badge-success'}`}>
                              {s.delaiMoyen}j
                            </span>
                          ) : '—'}
                        </div>
                      </div>
                      <div>
                        <div style={{ fontSize: '0.62rem', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Sans réception</div>
                        <div style={{ fontSize: '0.88rem', fontWeight: 700, color: s.sansReception > 0 ? 'var(--warning)' : 'var(--text-primary)' }}>
                          {s.sansReception}
                        </div>
                      </div>
                      <div>
                        <div style={{ fontSize: '0.62rem', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Sans paiement</div>
                        <div style={{ fontSize: '0.88rem', fontWeight: 700, color: s.sansPaiement > 0 ? 'var(--danger)' : 'var(--text-primary)' }}>
                          {s.sansPaiement}
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      <style>{`
        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(-6px); }
          to { opacity: 1; transform: translateY(0); }
        }
      `}</style>
    </div>
  );
}
