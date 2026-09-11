import React, { useState, useMemo } from 'react';
import {
  LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid
} from 'recharts';
import { formatMontant } from '../utils/stats';
import { matchesAnySearch } from '../utils/search';
import { formatCaracteristiques } from '../utils/characteristics';
import { Search, X } from 'lucide-react';

export default function ArticlesPage({ articleStats }) {
  const { referentiel = [] } = articleStats;
  const [search, setSearch] = useState('');
  const [searchObjet, setSearchObjet] = useState('');
  const [selected, setSelected] = useState(null);
  const [caracSearch, setCaracSearch] = useState('');
  const [natureFilter, setNatureFilter] = useState('');

  const naturesList = useMemo(
    () => [...new Set(referentiel.map(a => a.natureArticle).filter(Boolean))].sort(),
    [referentiel]
  );

  // Précalculer les caractéristiques (texte formaté) une fois par article
  const referentielAvecCarac = useMemo(() => {
    return referentiel.map(a => ({
      ...a,
      _caracText: formatCaracteristiques(`${a.label} ${(a.objets || []).join(' ')}`),
    }));
  }, [referentiel]);

  const filtered = useMemo(() => {
    let list = referentielAvecCarac;
    if (search.trim()) {
      list = list.filter(a => matchesAnySearch([a.label, a.code, a.natureArticle], search));
    }
    if (searchObjet.trim()) {
      list = list.filter(a => matchesAnySearch(a.objets, searchObjet));
    }
    if (natureFilter) {
      list = list.filter(a => a.natureArticle === natureFilter);
    }
    if (caracSearch.trim()) {
      list = list.filter(a => matchesAnySearch([a._caracText], caracSearch));
    }
    return list;
  }, [referentielAvecCarac, search, searchObjet, caracSearch]);

  const chartData = selected
    ? selected.entries.map(e => ({
        date: e.date ? new Date(e.date).toLocaleDateString('fr-FR', { month: 'short', year: '2-digit' }) : '?',
        prix: e.pu,
        fournisseur: e.fournisseur,
      }))
    : [];

  const variationPct = selected && selected.puMin > 0
    ? Math.round(((selected.puMax - selected.puMin) / selected.puMin) * 100)
    : 0;

  return (
    <div>
      <div className="page-header">
        <h1>Référentiel Prix</h1>
        <p>{referentiel.length} articles référencés — base de prix par article</p>
      </div>

      <div className="card full-width">
        <div style={{ display: 'flex', gap: 10, marginBottom: 14, flexWrap: 'wrap' }}>
          <div style={{ position: 'relative', flex: '1 1 260px' }}>
            <Search size={14} style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
            <input
              type="text"
              placeholder="Rechercher par article ou nature..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              style={{ width: '100%', padding: '8px 12px 8px 32px', border: '1px solid var(--border-light)', borderRadius: 6, fontSize: '0.82rem' }}
            />
          </div>
          <div style={{ position: 'relative', flex: '1 1 260px' }}>
            <Search size={14} style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
            <input
              type="text"
              placeholder="Rechercher par objet..."
              value={searchObjet}
              onChange={e => setSearchObjet(e.target.value)}
              style={{ width: '100%', padding: '8px 12px 8px 32px', border: '1px solid var(--border-light)', borderRadius: 6, fontSize: '0.82rem' }}
            />
          </div>
          <select
            value={natureFilter}
            onChange={e => setNatureFilter(e.target.value)}
            style={{ padding: '8px 12px', border: '1px solid var(--border-light)', borderRadius: 6, fontSize: '0.82rem', background: 'white', minWidth: 180 }}
          >
            <option value="">Toutes les natures</option>
            {naturesList.map(n => <option key={n} value={n}>{n}</option>)}
          </select>
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
                    <th>Article</th>
                    <th>Nature d'article</th>
                    <th>Caractéristiques</th>
                    <th style={{ textAlign: 'right' }}>PU actuel</th>
                    <th style={{ textAlign: 'right' }}>PU min - max</th>
                    <th style={{ textAlign: 'right' }}>Nb cmd</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.slice(0, 300).map((a, i) => (
                    <tr
                      key={i}
                      onClick={() => setSelected(a)}
                      style={{ cursor: 'pointer', background: selected?.code === a.code ? 'var(--accent-primary-light)' : undefined }}
                    >
                      <td style={{ maxWidth: 260, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{a.label || a.code}</td>
                      <td style={{ fontSize: '0.78rem', color: 'var(--text-secondary)' }}>{a.natureArticle || '—'}</td>
                      <td style={{ fontSize: '0.75rem', color: 'var(--accent-primary)', fontWeight: 500, whiteSpace: 'nowrap' }}>
                        {a._caracText || '—'}
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
                      formatter={(v) => [`${formatMontant(v)} MRU`, 'Prix unitaire']}
                      contentStyle={{ borderRadius: 8, border: '1px solid var(--border)', fontSize: '0.8rem' }}
                    />
                    <Line type="monotone" dataKey="prix" stroke="var(--accent-primary)" strokeWidth={2} dot={{ r: 4, fill: 'var(--accent-primary)' }} />
                  </LineChart>
                </ResponsiveContainer>
              )}

              <div style={{ marginTop: 12, maxHeight: 260, overflowY: 'auto' }}>
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>Date</th>
                      <th>Fournisseur</th>
                      <th style={{ textAlign: 'right' }}>PU</th>
                      <th style={{ textAlign: 'right' }}>Qté</th>
                    </tr>
                  </thead>
                  <tbody>
                    {selected.entries.map((e, i) => (
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