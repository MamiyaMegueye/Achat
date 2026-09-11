import React, { useState, useMemo } from 'react';
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid
} from 'recharts';
import { formatMontant } from '../utils/stats';
import { matchesSearch } from '../utils/search';
import { Search, Layers } from 'lucide-react';

export default function StructuresPage({ structureStats, categorisation = [] }) {
  const chartData = structureStats.slice(0, 15).map(s => ({
    name: s.structure,
    montant: Math.round(s.montantTotal / 1000),
  }));

  // === Répartition Structure × Catégorie × Nature ===
  const [structureFilter, setStructureFilter] = useState('');
  const [categorieFilter, setCategorieFilter] = useState('');
  const [sousTypeSearch, setSousTypeSearch] = useState('');

  const structuresList = useMemo(
    () => [...new Set(categorisation.map(c => c.structure))].sort(),
    [categorisation]
  );
  const categoriesList = useMemo(
    () => [...new Set(categorisation.map(c => c.categorie))].filter(Boolean).sort(),
    [categorisation]
  );

  const filteredCategorisation = useMemo(() => {
    let rows = categorisation;
    if (structureFilter) rows = rows.filter(r => r.structure === structureFilter);
    if (categorieFilter) rows = rows.filter(r => r.categorie === categorieFilter);
    if (sousTypeSearch.trim()) rows = rows.filter(r => matchesSearch(r.sousType, sousTypeSearch));
    return [...rows].sort((a, b) => b.montantHT - a.montantHT);
  }, [categorisation, structureFilter, categorieFilter, sousTypeSearch]);

  return (
    <div>
      <div className="page-header">
        <h1>Analyse par Structure</h1>
        <p>Répartition des achats par direction / agence</p>
      </div>

      <div className="card full-width">
        <div className="card-title">Montant des achats par structure (milliers MRU)</div>
        <ResponsiveContainer width="100%" height={380}>
          <BarChart data={chartData}>
            <CartesianGrid strokeDasharray="3 3" stroke="var(--border-light)" />
            <XAxis dataKey="name" tick={{ fontSize: 11, fill: 'var(--text-secondary)' }} angle={-30} textAnchor="end" height={60} />
            <YAxis tick={{ fontSize: 11, fill: 'var(--text-secondary)' }} />
            <Tooltip
              formatter={v => [`${formatMontant(v * 1000)} MRU`, 'Montant']}
              contentStyle={{ borderRadius: 8, border: '1px solid var(--border)', fontSize: '0.82rem' }}
            />
            <Bar dataKey="montant" fill="var(--accent-primary)" radius={[4, 4, 0, 0]} barSize={30} />
          </BarChart>
        </ResponsiveContainer>
      </div>

      <div className="card full-width">
        <div className="card-title">Détail par structure</div>
        <table className="data-table">
          <thead>
            <tr>
              <th>Structure</th>
              <th style={{ textAlign: 'right' }}>Nb BC</th>
              <th style={{ textAlign: 'right' }}>Nb articles</th>
              <th style={{ textAlign: 'right' }}>Montant total HT</th>
              <th style={{ textAlign: 'right' }}>Part (%)</th>
            </tr>
          </thead>
          <tbody>
            {structureStats.map((s, i) => {
              const totalGlobal = structureStats.reduce((sum, x) => sum + x.montantTotal, 0);
              const pct = totalGlobal > 0 ? Math.round(s.montantTotal / totalGlobal * 100) : 0;
              return (
                <tr key={i}>
                  <td style={{ fontWeight: 600 }}>{s.structure}</td>
                  <td className="amount">{s.nbBC}</td>
                  <td className="amount">{s.nbArticles}</td>
                  <td className="amount">{formatMontant(s.montantTotal)}</td>
                  <td className="amount">
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: 8 }}>
                      <div style={{
                        width: 60, height: 6, background: 'var(--bg-main)', borderRadius: 3, overflow: 'hidden'
                      }}>
                        <div style={{
                          width: `${pct}%`, height: '100%', background: 'var(--accent-primary)', borderRadius: 3
                        }} />
                      </div>
                      <span>{pct}%</span>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* === Structure × Catégorie × Nature === */}
      {categorisation.length > 0 && (
        <div className="card full-width">
          <div className="card-title" style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <Layers size={15} /> Répartition Structure × Catégorie × Nature
            <span style={{ fontSize: '0.65rem', fontWeight: 400, color: 'var(--text-muted)' }}>
              — {filteredCategorisation.length} ligne(s)
            </span>
          </div>
          <p style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', marginBottom: 12 }}>
            Issu de la catégorisation détaillée des articles (importée depuis le notebook de classification).
          </p>

          <div style={{ display: 'flex', gap: 10, marginBottom: 14, flexWrap: 'wrap' }}>
            <select
              value={structureFilter}
              onChange={e => setStructureFilter(e.target.value)}
              style={{ padding: '8px 12px', border: '1px solid var(--border-light)', borderRadius: 6, fontSize: '0.82rem', background: 'white', minWidth: 160 }}
            >
              <option value="">Toutes les structures</option>
              {structuresList.map(s => <option key={s} value={s}>{s}</option>)}
            </select>
            <select
              value={categorieFilter}
              onChange={e => setCategorieFilter(e.target.value)}
              style={{ padding: '8px 12px', border: '1px solid var(--border-light)', borderRadius: 6, fontSize: '0.82rem', background: 'white', minWidth: 180 }}
            >
              <option value="">Toutes les catégories</option>
              {categoriesList.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
            <div style={{ position: 'relative', flex: '1 1 200px' }}>
              <Search size={14} style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
              <input
                type="text"
                placeholder="Rechercher une nature d'article..."
                value={sousTypeSearch}
                onChange={e => setSousTypeSearch(e.target.value)}
                style={{ width: '100%', padding: '8px 12px 8px 32px', border: '1px solid var(--border-light)', borderRadius: 6, fontSize: '0.82rem' }}
              />
            </div>
            {(structureFilter || categorieFilter || sousTypeSearch) && (
              <button
                onClick={() => { setStructureFilter(''); setCategorieFilter(''); setSousTypeSearch(''); }}
                style={{ padding: '8px 12px', border: '1px solid var(--border-light)', borderRadius: 6, fontSize: '0.78rem', background: 'var(--bg-main)', cursor: 'pointer', color: 'var(--text-secondary)' }}
              >
                Réinitialiser
              </button>
            )}
          </div>

          <div style={{ maxHeight: 500, overflowY: 'auto' }}>
            <table className="data-table">
              <thead>
                <tr>
                  <th>Structure</th>
                  <th>Nom Structure</th>
                  <th>Domaine d'achat</th>
                  <th>Catégorie</th>
                  <th>Nature d'article</th>
                  <th style={{ textAlign: 'right' }}>Nb lignes</th>
                  <th style={{ textAlign: 'right' }}>Montant HT</th>
                  <th style={{ textAlign: 'right' }}>% structure</th>
                </tr>
              </thead>
              <tbody>
                {filteredCategorisation.slice(0, 300).map((r, i) => (
                  <tr key={i}>
                    <td style={{ fontWeight: 600 }}>{r.structure}</td>
                    <td style={{ fontSize: '0.78rem', color: 'var(--text-secondary)' }}>{r.nomStructure || '—'}</td>
                    <td style={{ fontSize: '0.78rem', color: 'var(--text-secondary)' }}>{r.grandeCategorie}</td>
                    <td style={{ fontSize: '0.78rem' }}>{r.categorie}</td>
                    <td style={{ fontSize: '0.78rem', fontWeight: 500 }}>{r.sousType}</td>
                    <td className="amount">{r.nbLignes}</td>
                    <td className="amount">{formatMontant(r.montantHT)}</td>
                    <td className="amount" style={{ fontSize: '0.78rem' }}>{r.pctStructure}%</td>
                  </tr>
                ))}
              </tbody>
            </table>
            {filteredCategorisation.length > 300 && (
              <div style={{ textAlign: 'center', padding: 12, fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                Affichage limité aux 300 premières lignes — affinez les filtres.
              </div>
            )}
            {filteredCategorisation.length === 0 && (
              <div style={{ textAlign: 'center', padding: 24, fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                Aucune ligne ne correspond à ces critères.
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}