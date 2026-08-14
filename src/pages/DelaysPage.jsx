import React, { useState } from 'react';
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer,
  CartesianGrid, Cell
} from 'recharts';
import { Clock, AlertTriangle, CheckCircle2 } from 'lucide-react';
import { formatMontant } from '../utils/stats';

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

function DelaysContent({ delays }) {
  const [section, setSection] = useState('livraison');

  // Safe access with defaults
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
          Livraisons en retard ({livraisonsEnRetard.length})
        </button>
        <button className={`tab ${section === 'cde-rec' ? 'active' : ''}`} onClick={() => setSection('cde-rec')}>
          Commande → Réception
        </button>
        <button className={`tab ${section === 'rec-paie' ? 'active' : ''}`} onClick={() => setSection('rec-paie')}>
          Réception → Paiement
        </button>
        <button className={`tab ${section === 'non-recues' ? 'active' : ''}`} onClick={() => setSection('non-recues')}>
          Non réceptionnées ({sansReception.length})
        </button>
        <button className={`tab ${section === 'sans-delai' ? 'active' : ''}`} onClick={() => setSection('sans-delai')}>
          Sans date de livraison ({sansDelaiPrevu.length})
        </button>
      </div>

      {/* SECTION: Livraisons en retard */}
      {section === 'livraison' && (
        <>
          <div className="card full-width" style={{ borderLeft: '4px solid var(--danger)' }}>
            <div className="card-title" style={{ color: 'var(--danger)' }}>
              Livraisons en retard — réceptionnées après la date prévue ({livraisonsEnRetard.length})
            </div>
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.82rem', marginBottom: 16 }}>
              Commandes livrées après la date contractuelle. Le retard indique le dépassement au-delà du délai prévu.
            </p>
            {livraisonsEnRetard.length === 0 ? (
              <div style={{ textAlign: 'center', padding: 40, color: 'var(--success)' }}>Aucune livraison en retard</div>
            ) : (
              <div style={{ maxHeight: 450, overflowY: 'auto' }}>
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>N° CMD</th>
                      <th>Fournisseur</th>
                      <th>Article</th>
                      <th>Date Cde</th>
                      <th>Délai prévu</th>
                      <th>Date réception</th>
                      <th style={{ textAlign: 'right' }}>Retard</th>
                      <th style={{ textAlign: 'right' }}>Montant TTC</th>
                    </tr>
                  </thead>
                  <tbody>
                    {livraisonsEnRetard.map((d, i) => (
                      <tr key={i}>
                        <td style={{ fontWeight: 600 }}>{d.numCmd}</td>
                        <td style={{ maxWidth: 180, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{d.fournisseur}</td>
                        <td style={{ maxWidth: 200, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', fontSize: '0.78rem', color: 'var(--text-secondary)' }}>{d.objet || '—'}</td>
                        <td>{fmtDate(d.datCde)}</td>
                        <td>{fmtDate(d.delaiPrevu)}</td>
                        <td style={{ color: 'var(--danger)' }}>{fmtDate(d.datRec)}</td>
                        <td className="amount">
                          <span className={`badge ${d.joursRetard > 30 ? 'badge-danger' : 'badge-warning'}`}>
                            +{fmtDuree(d.joursRetard)}
                          </span>
                        </td>
                        <td className="amount">{formatMontant(d.montant)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {livraisonsDansLesTemps.length > 0 && (
            <div className="card full-width" style={{ borderLeft: '4px solid var(--success)' }}>
              <div className="card-title" style={{ color: 'var(--success)' }}>
                Livraisons dans les temps ({livraisonsDansLesTemps.length})
              </div>
              <div style={{ maxHeight: 300, overflowY: 'auto' }}>
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>N° CMD</th>
                      <th>Fournisseur</th>
                      <th>Article</th>
                      <th>Date Cde</th>
                      <th>Délai prévu</th>
                      <th>Date réception</th>
                      <th style={{ textAlign: 'right' }}>Avance</th>
                    </tr>
                  </thead>
                  <tbody>
                    {livraisonsDansLesTemps.slice(0, 30).map((d, i) => (
                      <tr key={i}>
                        <td>{d.numCmd}</td>
                        <td style={{ maxWidth: 200, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{d.fournisseur}</td>
                        <td style={{ maxWidth: 180, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', fontSize: '0.78rem', color: 'var(--text-secondary)' }}>{d.objet || '—'}</td>
                        <td>{fmtDate(d.datCde)}</td>
                        <td>{fmtDate(d.delaiPrevu)}</td>
                        <td style={{ color: 'var(--success)' }}>{fmtDate(d.datRec)}</td>
                        <td className="amount">
                          <span className="badge badge-success">-{fmtDuree(d.joursAvance)}</span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </>
      )}

      {/* SECTION: Commande → Réception */}
      {section === 'cde-rec' && (
        <div className="grid-2">
          <div className="card">
            <div className="card-title">Distribution — Moyenne : {fmtDuree(delaiCdeRec.moyenne)}</div>
            <ResponsiveContainer width="100%" height={280}>
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
          <div className="card">
            <div className="card-title">Top 30 — plus longues à réceptionner</div>
            <div style={{ maxHeight: 380, overflowY: 'auto' }}>
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
                  {delaiCdeRec.data.slice(0, 30).map((d, i) => (
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
        </div>
      )}

      {/* SECTION: Réception → Paiement */}
      {section === 'rec-paie' && (
        <div className="grid-2">
          <div className="card">
            <div className="card-title">Distribution — Moyenne : {fmtDuree(delaiRecPaiement.moyenne)} · Délai réglementaire : 90j</div>
            <ResponsiveContainer width="100%" height={280}>
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
          <div className="card">
            <div className="card-title">Top 30 — paiements les plus longs</div>
            <div style={{ maxHeight: 380, overflowY: 'auto' }}>
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
                  {delaiRecPaiement.data.slice(0, 30).map((d, i) => (
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
        </div>
      )}

      {/* SECTION: Non réceptionnées */}
      {section === 'non-recues' && (
        <div className="card full-width" style={{ borderLeft: '4px solid var(--warning)' }}>
          <div className="card-title">
            Commandes non réceptionnées ({sansReception.length})
          </div>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.82rem', marginBottom: 16 }}>
            Commandes passées sans réception enregistrée. Les lignes en rouge ont dépassé le délai prévu.
          </p>
          {sansReception.length === 0 ? (
            <div style={{ textAlign: 'center', padding: 40, color: 'var(--success)' }}>Toutes les commandes ont été réceptionnées</div>
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
                    <th style={{ textAlign: 'right' }}>Depuis Cde</th>
                    <th>Statut</th>
                    <th style={{ textAlign: 'right' }}>Montant TTC</th>
                  </tr>
                </thead>
                <tbody>
                  {sansReception.map((d, i) => (
                    <tr key={i} style={{ background: d.enRetard ? 'var(--danger-light)' : undefined }}>
                      <td style={{ fontWeight: 600 }}>{d.numCmd}</td>
                      <td style={{ maxWidth: 180, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{d.fournisseur}</td>
                      <td style={{ maxWidth: 200, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', fontSize: '0.78rem', color: 'var(--text-secondary)' }}>{d.objet}</td>
                      <td>{fmtDate(d.datCde)}</td>
                      <td>{fmtDate(d.delaiPrevu)}</td>
                      <td className="amount">{d.joursDepuisCde != null ? fmtDuree(d.joursDepuisCde) : '—'}</td>
                      <td>
                        {d.enRetard === true && <span className="badge badge-danger">En retard</span>}
                        {d.enRetard === false && <span className="badge badge-neutral">En attente</span>}
                        {d.enRetard === null && <span className="badge badge-neutral">Sans délai</span>}
                      </td>
                      <td className="amount">{formatMontant(d.montant)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
      {/* SECTION: Sans date de livraison */}
      {section === 'sans-delai' && (
        <div className="card full-width" style={{ borderLeft: '4px solid #7b6fa0' }}>
          <div className="card-title" style={{ color: '#7b6fa0' }}>
            Commandes sans date de livraison — réceptionnées ({sansDelaiPrevu.length})
          </div>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.82rem', marginBottom: 16 }}>
            Sur {sansDelai} commandes sans date de livraison : {sansDelaiPrevu.length} ont été réceptionnées (affichées ci-dessous avec leur délai réel), {sansDelai - sansDelaiPrevu.length} ne sont pas encore réceptionnées (visibles dans l'onglet "Non réceptionnées"). Ces commandes sont exclues du taux de respect des délais.
          </p>
          {sansDelaiPrevu.length === 0 ? (
            <div style={{ textAlign: 'center', padding: 40, color: 'var(--text-muted)' }}>Aucune commande dans cette catégorie</div>
          ) : (
            <div style={{ maxHeight: 500, overflowY: 'auto' }}>
              <table className="data-table">
                <thead>
                  <tr>
                    <th>N° CMD</th>
                    <th>Fournisseur</th>
                    <th>Article</th>
                    <th>Date Cde</th>
                    <th>Date Réception</th>
                    <th style={{ textAlign: 'right' }}>Délai réel</th>
                    <th style={{ textAlign: 'right' }}>Montant TTC</th>
                  </tr>
                </thead>
                <tbody>
                  {sansDelaiPrevu.map((d, i) => (
                    <tr key={i}>
                      <td style={{ fontWeight: 600 }}>{d.numCmd}</td>
                      <td style={{ maxWidth: 180, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{d.fournisseur}</td>
                      <td style={{ maxWidth: 200, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', fontSize: '0.78rem', color: 'var(--text-secondary)' }}>{d.objet || '—'}</td>
                      <td>{fmtDate(d.datCde)}</td>
                      <td>{fmtDate(d.datRec)}</td>
                      <td className="amount">
                        <span className={`badge ${d.delaiReel > 90 ? 'badge-danger' : d.delaiReel > 60 ? 'badge-warning' : 'badge-neutral'}`}>
                          {fmtDuree(d.delaiReel)}
                        </span>
                      </td>
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