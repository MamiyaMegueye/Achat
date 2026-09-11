import React, { useState, useMemo } from 'react';
import {
  ShoppingCart, CreditCard, PackageCheck, AlertTriangle, Ban, X, Search, ChevronUp, ChevronDown
} from 'lucide-react';
import { formatMontant } from '../utils/stats';
import { matchesAnySearch } from '../utils/search';

export default function DashboardPage({ kpis, delays, supplierStats, paymentAlerts, cmds = [], seasonality = [] }) {

  const colFilterInputStyle = {
    width: '100%', padding: '4px 6px', fontSize: '0.72rem', fontWeight: 400,
    border: '1px solid var(--border-light)', borderRadius: 4, background: 'white',
  };
  const colFilterDateStyle = {
    width: '100%', padding: '2px 4px', fontSize: '0.65rem', fontWeight: 400,
    border: '1px solid var(--border-light)', borderRadius: 4, background: 'white',
  };

  const [selectedPipeline, setSelectedPipeline] = useState(null);
  const [showAnnulees, setShowAnnulees] = useState(null); // null, 'annulees', 'sansMontant'

  // Recherche + filtres du tableau de suivi
  const [search, setSearch] = useState('');
  const [statutFilter, setStatutFilter] = useState('');
  const [sortKey, setSortKey] = useState('datCde');
  const [sortDir, setSortDir] = useState('desc');

  // Filtres par colonne
  const [colFilters, setColFilters] = useState({
    fournisseur: '', article: '', objet: '',
    dateAffichageMin: '', dateAffichageMax: '',
    datCdeMin: '', datCdeMax: '',
    delaiLivraisonMin: '', delaiLivraisonMax: '',
    datRecMin: '', datRecMax: '',
    factDateFrMin: '', factDateFrMax: '',
    paiementDateMin: '', paiementDateMax: '',
    montantMin: '', montantMax: '',
    puMin: '', puMax: '',
  });
  const setColFilter = (key, val) => setColFilters(f => ({ ...f, [key]: val }));
  const hasColFilters = Object.values(colFilters).some(v => v);
  const resetColFilters = () => setColFilters({
    fournisseur: '', article: '', objet: '',
    dateAffichageMin: '', dateAffichageMax: '',
    datCdeMin: '', datCdeMax: '',
    delaiLivraisonMin: '', delaiLivraisonMax: '',
    datRecMin: '', datRecMax: '',
    factDateFrMin: '', factDateFrMax: '',
    paiementDateMin: '', paiementDateMax: '',
    montantMin: '', montantMax: '',
    puMin: '', puMax: '',
  });

  const inDateRange = (val, min, max) => {
    if (!min && !max) return true;
    if (!val) return false;
    const d = new Date(val).getTime();
    if (min && d < new Date(min).getTime()) return false;
    if (max && d > new Date(max).getTime()) return false;
    return true;
  };

  const statusData = [
    { name: 'Payées', value: kpis.payees, color: '#3d8b6e', bg: '#e4f2ec' },
    { name: 'Facturées', value: kpis.facturees - kpis.payees, color: '#7b6fa0', bg: '#edeaf4' },
    { name: 'Réceptionnées', value: kpis.receptionnees - kpis.facturees, color: '#d99870', bg: '#f8f0e8' },
    { name: 'Non réceptionnée', value: kpis.totalCmds - kpis.receptionnees, color: '#c44a3f', bg: '#fae8e6' },
  ].filter(d => d.value > 0);

  const pctPayees = Math.round(kpis.payees / kpis.totalCmds * 100);

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
      case 'Non réceptionnée':
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

  // Commandes annulées (montant explicitement = 0) vs sans montant (vide/null)
  const listeAnnulees = cmds.filter(c => (c.montTTC === 0 || c.montHT === 0) && c.montTTC != null && c.montHT != null);
  const listeSansMontant = cmds.filter(c => c.montTTC == null && c.montHT == null);
  const cmdsAnnulees = listeAnnulees.length;
  const cmdsSansMontant = listeSansMontant.length;

  // Statut dérivé pour chaque commande
  const getStatut = (c) => {
    if (c.paiementDate) return 'Payée';
    if (c.factDateFact) return 'Facturée';
    if (c.datRec) return 'Réceptionnée';
    return 'Non réceptionnée';
  };

  // Tableau de suivi : recherche + filtre statut + tri
  const filteredCmds = useMemo(() => {
    let rows = cmds.map(c => ({ ...c, statut: getStatut(c) }));

    if (search.trim()) {
      rows = rows.filter(c =>
        matchesAnySearch([
          String(c.numCmd || ''),
          c.nomFrn || '',
          c.obsCde || '',
          ...(c.articles || []).map(a => a.article || ''),
        ], search)
      );
    }

    if (statutFilter) {
      rows = rows.filter(c => c.statut === statutFilter);
    }

    if (colFilters.fournisseur) {
      rows = rows.filter(c => matchesAnySearch([c.nomFrn || ''], colFilters.fournisseur));
    }
    if (colFilters.article) {
      rows = rows.filter(c => matchesAnySearch((c.articles || []).map(a => a.article || ''), colFilters.article));
    }
    if (colFilters.objet) {
      rows = rows.filter(c => matchesAnySearch([c.obsCde || ''], colFilters.objet));
    }
    rows = rows.filter(c => inDateRange(c.dateAffichage, colFilters.dateAffichageMin, colFilters.dateAffichageMax));
    rows = rows.filter(c => inDateRange(c.datCde, colFilters.datCdeMin, colFilters.datCdeMax));
    rows = rows.filter(c => inDateRange(c.delaiLivraison, colFilters.delaiLivraisonMin, colFilters.delaiLivraisonMax));
    rows = rows.filter(c => inDateRange(c.datRec, colFilters.datRecMin, colFilters.datRecMax));
    rows = rows.filter(c => inDateRange(c.factDateFr, colFilters.factDateFrMin, colFilters.factDateFrMax));
    rows = rows.filter(c => inDateRange(c.paiementDate, colFilters.paiementDateMin, colFilters.paiementDateMax));

    if (colFilters.montantMin !== '') {
      rows = rows.filter(c => (c.montTTC || c.montHT || 0) >= Number(colFilters.montantMin));
    }
    if (colFilters.montantMax !== '') {
      rows = rows.filter(c => (c.montTTC || c.montHT || 0) <= Number(colFilters.montantMax));
    }
    if (colFilters.puMin !== '') {
      rows = rows.filter(c => (c.articles || []).some(a => (a.pu || 0) >= Number(colFilters.puMin)));
    }
    if (colFilters.puMax !== '') {
      rows = rows.filter(c => (c.articles || []).some(a => (a.pu || 0) <= Number(colFilters.puMax)));
    }

    rows.sort((a, b) => {
      let va = a[sortKey], vb = b[sortKey];
      if (sortKey === 'datCde') {
        va = va ? new Date(va).getTime() : 0;
        vb = vb ? new Date(vb).getTime() : 0;
      }
      if (sortKey === 'montTTC' || sortKey === 'montHT') {
        va = va || 0; vb = vb || 0;
      }
      if (typeof va === 'string') va = va.toLowerCase();
      if (typeof vb === 'string') vb = vb.toLowerCase();
      if (va < vb) return sortDir === 'asc' ? -1 : 1;
      if (va > vb) return sortDir === 'asc' ? 1 : -1;
      return 0;
    });

    return rows;
  }, [cmds, search, statutFilter, sortKey, sortDir, colFilters]);

  const toggleSort = (key) => {
    if (sortKey === key) {
      setSortDir(d => d === 'asc' ? 'desc' : 'asc');
    } else {
      setSortKey(key);
      setSortDir('desc');
    }
  };

  const statutColors = {
    'Payée': { color: '#2b6e52', bg: '#e4f2ec' },
    'Facturée': { color: '#5e5288', bg: '#edeaf4' },
    'Réceptionnée': { color: '#b8663f', bg: '#f8f0e8' },
    'Non réceptionnée': { color: '#a63b32', bg: '#fae8e6' },
  };

  const SortIcon = ({ col }) => {
    if (sortKey !== col) return null;
    return sortDir === 'asc' ? <ChevronUp size={12} /> : <ChevronDown size={12} />;
  };

  return (
    <div>
      <div className="page-header">
        <h1>Vue d'ensemble</h1>
        <p>Synthèse de l'activité achats</p>
      </div>

      {/* === Bandeau principal === */}
      <div className="card full-width" style={{ padding: 0, overflow: 'hidden' }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)' }}>
          <div style={{ padding: '16px 18px', borderRight: '1px solid var(--border-light)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
              <div style={{ width: 28, height: 28, borderRadius: 7, background: '#f3e0d5', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <ShoppingCart size={13} style={{ color: '#c17550' }} />
              </div>
              <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)', fontWeight: 500 }}>Commandes</span>
            </div>
            <div style={{ fontSize: '1.3rem', fontWeight: 700, color: '#c17550' }}>{kpis.totalCmds}</div>
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

          <div style={{ padding: '16px 18px', borderLeft: '1px solid var(--border-light)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
              <div style={{ width: 28, height: 28, borderRadius: 7, background: '#fae8e6', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <Ban size={13} style={{ color: '#a63b32' }} />
              </div>
              <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)', fontWeight: 500 }}>Annulées</span>
            </div>
            <div style={{ fontSize: '1.3rem', fontWeight: 700, color: '#a63b32', cursor: 'pointer', textDecoration: 'underline dotted' }} onClick={() => setShowAnnulees('annulees')}>{cmdsAnnulees}</div>
            <div style={{ fontSize: '0.65rem', color: 'var(--text-muted)', marginTop: 2 }}>montant = 0</div>
            {cmdsSansMontant > 0 && (
              <div style={{ fontSize: '0.65rem', color: '#cc8560', marginTop: 2, cursor: 'pointer', textDecoration: 'underline dotted' }} onClick={() => setShowAnnulees('sansMontant')}>{cmdsSansMontant} sans montant</div>
            )}
          </div>
        </div>
      </div>

      {/* Modal détail annulées / sans montant */}
      {showAnnulees && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center' }} onClick={() => setShowAnnulees(null)}>
          <div style={{ background: 'white', borderRadius: 12, padding: 24, maxWidth: 800, width: '90%', maxHeight: '80vh', overflow: 'auto', boxShadow: '0 8px 32px rgba(0,0,0,0.2)' }} onClick={e => e.stopPropagation()}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
              <h3 style={{ margin: 0, color: showAnnulees === 'annulees' ? '#a63b32' : '#cc8560' }}>
                {showAnnulees === 'annulees' ? `Commandes annulées (${cmdsAnnulees})` : `Commandes sans montant (${cmdsSansMontant})`}
              </h3>
              <button onClick={() => setShowAnnulees(null)} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 4 }}><X size={18} /></button>
            </div>
            <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginBottom: 12 }}>
              {showAnnulees === 'annulees' ? 'Commandes dont le montant HT et TTC est égal à 0.' : 'Commandes dont le montant est absent dans le fichier.'}
            </p>
            <table className="data-table">
              <thead>
                <tr>
                  <th>N° CMD</th>
                  <th>Fournisseur</th>
                  <th>Article</th>
                  <th>Date Cde</th>
                  <th>Date Réception</th>
                </tr>
              </thead>
              <tbody>
                {(showAnnulees === 'annulees' ? listeAnnulees : listeSansMontant).map((c, i) => (
                  <tr key={i}>
                    <td style={{ fontWeight: 600 }}>{c.numCmd}</td>
                    <td>{c.nomFrn || '—'}</td>
                    <td style={{ whiteSpace: 'normal', wordBreak: 'break-word' }}>{c.obsCde || '—'}</td>
                    <td>{c.datCde ? new Date(c.datCde).toLocaleDateString('fr-FR') : '—'}</td>
                    <td>{c.datRec ? new Date(c.datRec).toLocaleDateString('fr-FR') : '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

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

      {/* === Tableau de suivi des commandes === */}
      <div className="card full-width">
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 8 }}>
          <div className="card-title" style={{ marginBottom: 0 }}>Suivi des commandes <span style={{ fontSize: '0.65rem', fontWeight: 400, color: 'var(--text-muted)' }}>— {filteredCmds.length} résultat(s)</span></div>
        </div>

        <div style={{ display: 'flex', gap: 10, marginBottom: 14, marginTop: 12, flexWrap: 'wrap' }}>
          <div style={{ position: 'relative', flex: '1 1 260px' }}>
            <Search size={14} style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
            <input
              type="text"
              placeholder="Rechercher par N° CMD, fournisseur, article, objet..."
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
            <option value="Payée">Payée</option>
            <option value="Facturée">Facturée</option>
            <option value="Réceptionnée">Réceptionnée</option>
            <option value="Non réceptionnée">Non réceptionnée</option>
          </select>
          {(search || statutFilter || hasColFilters) && (
            <button
              onClick={() => { setSearch(''); setStatutFilter(''); resetColFilters(); }}
              style={{
                padding: '8px 12px', border: '1px solid var(--border-light)',
                borderRadius: 6, fontSize: '0.78rem', background: 'var(--bg-main)',
                cursor: 'pointer', color: 'var(--text-secondary)',
              }}
            >
              Réinitialiser tout
            </button>
          )}
        </div>

        <div style={{ maxHeight: 560, overflow: 'auto' }}>
          <table className="data-table" style={{ minWidth: 1500 }}>
            <thead>
              <tr>
                <th onClick={() => toggleSort('numCmd')} style={{ cursor: 'pointer', whiteSpace: 'nowrap' }}>N° CMD <SortIcon col="numCmd" /></th>
                <th onClick={() => toggleSort('nomFrn')} style={{ cursor: 'pointer', whiteSpace: 'nowrap' }}>Fournisseur <SortIcon col="nomFrn" /></th>
                <th style={{ whiteSpace: 'nowrap' }}>Article</th>
                <th style={{ textAlign: 'right', whiteSpace: 'nowrap' }}>Prix unitaire</th>
                <th style={{ whiteSpace: 'nowrap' }}>Objet</th>
                <th onClick={() => toggleSort('dateAffichage')} style={{ cursor: 'pointer', whiteSpace: 'nowrap' }}>Date Affichage <SortIcon col="dateAffichage" /></th>
                <th onClick={() => toggleSort('datCde')} style={{ cursor: 'pointer', whiteSpace: 'nowrap' }}>Date Cde <SortIcon col="datCde" /></th>
                <th onClick={() => toggleSort('delaiLivraison')} style={{ cursor: 'pointer', whiteSpace: 'nowrap' }}>Délai Livr. Prévu <SortIcon col="delaiLivraison" /></th>
                <th onClick={() => toggleSort('datRec')} style={{ cursor: 'pointer', whiteSpace: 'nowrap' }}>Date Réception <SortIcon col="datRec" /></th>
                <th onClick={() => toggleSort('factDateFr')} style={{ cursor: 'pointer', whiteSpace: 'nowrap' }}>Date Facture <SortIcon col="factDateFr" /></th>
                <th onClick={() => toggleSort('paiementDate')} style={{ cursor: 'pointer', whiteSpace: 'nowrap' }}>Date Paiement <SortIcon col="paiementDate" /></th>
                <th onClick={() => toggleSort('montTTC')} style={{ textAlign: 'right', cursor: 'pointer', whiteSpace: 'nowrap' }}>Montant TTC <SortIcon col="montTTC" /></th>
                <th onClick={() => toggleSort('statut')} style={{ cursor: 'pointer', whiteSpace: 'nowrap' }}>Statut <SortIcon col="statut" /></th>
              </tr>
              <tr>
                <th></th>
                <th>
                  <input type="text" value={colFilters.fournisseur} onChange={e => setColFilter('fournisseur', e.target.value)}
                    placeholder="Filtrer..." style={colFilterInputStyle} />
                </th>
                <th>
                  <input type="text" value={colFilters.article} onChange={e => setColFilter('article', e.target.value)}
                    placeholder="Filtrer..." style={colFilterInputStyle} />
                </th>
                <th>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                    <input type="number" value={colFilters.puMin} onChange={e => setColFilter('puMin', e.target.value)}
                      placeholder="min" style={colFilterInputStyle} />
                    <input type="number" value={colFilters.puMax} onChange={e => setColFilter('puMax', e.target.value)}
                      placeholder="max" style={colFilterInputStyle} />
                  </div>
                </th>
                <th>
                  <input type="text" value={colFilters.objet} onChange={e => setColFilter('objet', e.target.value)}
                    placeholder="Filtrer..." style={colFilterInputStyle} />
                </th>
                <th>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                    <input type="date" value={colFilters.dateAffichageMin} onChange={e => setColFilter('dateAffichageMin', e.target.value)} style={colFilterDateStyle} />
                    <input type="date" value={colFilters.dateAffichageMax} onChange={e => setColFilter('dateAffichageMax', e.target.value)} style={colFilterDateStyle} />
                  </div>
                </th>
                <th>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                    <input type="date" value={colFilters.datCdeMin} onChange={e => setColFilter('datCdeMin', e.target.value)} style={colFilterDateStyle} />
                    <input type="date" value={colFilters.datCdeMax} onChange={e => setColFilter('datCdeMax', e.target.value)} style={colFilterDateStyle} />
                  </div>
                </th>
                <th>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                    <input type="date" value={colFilters.delaiLivraisonMin} onChange={e => setColFilter('delaiLivraisonMin', e.target.value)} style={colFilterDateStyle} />
                    <input type="date" value={colFilters.delaiLivraisonMax} onChange={e => setColFilter('delaiLivraisonMax', e.target.value)} style={colFilterDateStyle} />
                  </div>
                </th>
                <th>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                    <input type="date" value={colFilters.datRecMin} onChange={e => setColFilter('datRecMin', e.target.value)} style={colFilterDateStyle} />
                    <input type="date" value={colFilters.datRecMax} onChange={e => setColFilter('datRecMax', e.target.value)} style={colFilterDateStyle} />
                  </div>
                </th>
                <th>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                    <input type="date" value={colFilters.factDateFrMin} onChange={e => setColFilter('factDateFrMin', e.target.value)} style={colFilterDateStyle} />
                    <input type="date" value={colFilters.factDateFrMax} onChange={e => setColFilter('factDateFrMax', e.target.value)} style={colFilterDateStyle} />
                  </div>
                </th>
                <th>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                    <input type="date" value={colFilters.paiementDateMin} onChange={e => setColFilter('paiementDateMin', e.target.value)} style={colFilterDateStyle} />
                    <input type="date" value={colFilters.paiementDateMax} onChange={e => setColFilter('paiementDateMax', e.target.value)} style={colFilterDateStyle} />
                  </div>
                </th>
                <th>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                    <input type="number" value={colFilters.montantMin} onChange={e => setColFilter('montantMin', e.target.value)}
                      placeholder="min" style={colFilterInputStyle} />
                    <input type="number" value={colFilters.montantMax} onChange={e => setColFilter('montantMax', e.target.value)}
                      placeholder="max" style={colFilterInputStyle} />
                  </div>
                </th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {filteredCmds.slice(0, 200).map((c, i) => {
                const sc = statutColors[c.statut] || { color: 'var(--text-secondary)', bg: 'var(--border-light)' };
                const fmtD = (d) => d ? new Date(d).toLocaleDateString('fr-FR') : '—';
                return (
                  <tr key={i}>
                    <td style={{ fontFamily: 'monospace', fontSize: '0.75rem' }}>{c.numCmd}</td>
                    <td style={{ maxWidth: 160, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{c.nomFrn || '—'}</td>
                    <td style={{ maxWidth: 200, fontSize: '0.78rem' }} title={(c.articles || []).map(a => a.article).join(', ')}>
                      {c.articles && c.articles.length > 0 ? (
                        <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', display: 'block' }}>
                          {c.articles[0].article}
                          {c.articles.length > 1 && <span style={{ color: 'var(--text-muted)' }}> (+{c.articles.length - 1})</span>}
                        </span>
                      ) : '—'}
                    </td>
                    <td className="amount" style={{ fontSize: '0.78rem' }}>
                      {c.articles && c.articles.length > 0 ? (
                        c.articles.length === 1
                          ? formatMontant(c.articles[0].pu)
                          : `${formatMontant(Math.min(...c.articles.map(a => a.pu || 0)))} – ${formatMontant(Math.max(...c.articles.map(a => a.pu || 0)))}`
                      ) : '—'}
                    </td>
                    <td style={{ maxWidth: 220, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', fontSize: '0.78rem', color: 'var(--text-secondary)' }}>{c.obsCde || '—'}</td>
                    <td style={{ fontSize: '0.78rem', whiteSpace: 'nowrap' }}>{fmtD(c.dateAffichage)}</td>
                    <td style={{ fontSize: '0.78rem', whiteSpace: 'nowrap' }}>{fmtD(c.datCde)}</td>
                    <td style={{ fontSize: '0.78rem', whiteSpace: 'nowrap' }}>{fmtD(c.delaiLivraison)}</td>
                    <td style={{ fontSize: '0.78rem', whiteSpace: 'nowrap' }}>{fmtD(c.datRec)}</td>
                    <td style={{ fontSize: '0.78rem', whiteSpace: 'nowrap' }}>{fmtD(c.factDateFr)}</td>
                    <td style={{ fontSize: '0.78rem', whiteSpace: 'nowrap' }}>{fmtD(c.paiementDate)}</td>
                    <td className="amount">{formatMontant(c.montTTC || c.montHT || 0)}</td>
                    <td>
                      <span style={{
                        display: 'inline-block', padding: '2px 8px', borderRadius: 10,
                        fontSize: '0.7rem', fontWeight: 600, color: sc.color, background: sc.bg, whiteSpace: 'nowrap',
                      }}>
                        {c.statut}
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          {filteredCmds.length > 200 && (
            <div style={{ textAlign: 'center', padding: 12, fontSize: '0.75rem', color: 'var(--text-muted)' }}>
              Affichage limité aux 200 premiers résultats — affinez la recherche pour voir plus précisément.
            </div>
          )}
          {filteredCmds.length === 0 && (
            <div style={{ textAlign: 'center', padding: 24, fontSize: '0.8rem', color: 'var(--text-muted)' }}>
              Aucune commande ne correspond à ces critères.
            </div>
          )}
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