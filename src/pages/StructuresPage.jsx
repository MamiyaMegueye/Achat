import React, { useState, useMemo } from 'react';
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid
} from 'recharts';
import { formatMontant } from '../utils/stats';
import { matchesSearch, matchesAnySearch } from '../utils/search';
import { Search, Layers } from 'lucide-react';

export default function StructuresPage({ structureStats, categorisation = [], structureArticleDetail = [] }) {
  const structureNameMap = useMemo(() => {
    const map = {};
    categorisation.forEach(r => { if (r.structure && r.nomStructure) map[r.structure] = r.nomStructure; });
    return map;
  }, [categorisation]);

  const chartData = structureStats.slice(0, 15).map(s => ({
    name: structureNameMap[s.structure] ? `${s.structure} — ${structureNameMap[s.structure]}` : s.structure,
    montant: Math.round(s.montantTotal / 1000),
  }));

  // === (2) Répartition Catégorie × Domaine d'achat par structure ===
  const [structureFilterMain, setStructureFilterMain] = useState('');

  const repartitionParStructure = useMemo(() => {
    const map = {};
    categorisation.forEach(r => {
      const key = `${r.structure}|${r.grandeCategorie}|${r.categorie}`;
      if (!map[key]) {
        map[key] = {
          structure: r.structure, nomStructure: r.nomStructure,
          grandeCategorie: r.grandeCategorie, categorie: r.categorie,
          nbLignes: 0, montantHT: 0,
        };
      }
      map[key].nbLignes += r.nbLignes;
      map[key].montantHT += r.montantHT;
    });
    let rows = Object.values(map);
    if (structureFilterMain) rows = rows.filter(r => r.structure === structureFilterMain);
    return rows.sort((a, b) => b.montantHT - a.montantHT);
  }, [categorisation, structureFilterMain]);

  const structuresListMain = useMemo(
    () => [...new Set(categorisation.map(c => c.structure))].sort(),
    [categorisation]
  );

  // === (3) Détail ligne par ligne : Structure × N° BC × Code Article × Catégorie × Nature ===
  const [structureFilter, setStructureFilter] = useState('');
  const [categorieFilter, setCategorieFilter] = useState('');
  const [natureSearch, setNatureSearch] = useState('');
  const [codeSearch, setCodeSearch] = useState('');

  const structuresList = useMemo(
    () => [...new Set(structureArticleDetail.map(c => c.structure))].sort(),
    [structureArticleDetail]
  );
  const categoriesList = useMemo(
    () => [...new Set(structureArticleDetail.map(c => c.categorie))].filter(Boolean).sort(),
    [structureArticleDetail]
  );

  const filteredDetail = useMemo(() => {
    let rows = structureArticleDetail;
    if (structureFilter) rows = rows.filter(r => r.structure === structureFilter);
    if (categorieFilter) rows = rows.filter(r => r.categorie === categorieFilter);
    if (natureSearch.trim()) rows = rows.filter(r => matchesSearch(r.natureArticle, natureSearch));
    if (codeSearch.trim()) rows = rows.filter(r => matchesAnySearch([String(r.numBC), r.codeArticle, r.article], codeSearch));
    return [...rows].sort((a, b) => b.montantHT - a.montantHT);
  }, [structureArticleDetail, structureFilter, categorieFilter, natureSearch, codeSearch]);

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

      {/* === (2) Répartition par Catégorie et Domaine d'achat === */}
      {categorisation.length > 0 && (
        <div className="card full-width">
          <div className="card-title" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <span>Répartition par Catégorie et Domaine d'achat</span>
            <select
              value={structureFilterMain}
              onChange={e => setStructureFilterMain(e.target.value)}
              style={{ padding: '6px 10px', border: '1px solid var(--border-light)', borderRadius: 6, fontSize: '0.78rem', background: 'white', minWidth: 160, fontWeight: 400 }}
            >
              <option value="">Toutes les structures</option>
              {structuresListMain.map(s => <option key={s} value={s}>{s}</option>)}
            </select>
          </div>
          <div style={{ maxHeight: 420, overflowY: 'auto', marginTop: 10 }}>
            <table className="data-table">
              <thead>
                <tr>
                  <th>Structure</th>
                  <th>Nom Structure</th>
                  <th>Domaine d'achat</th>
                  <th>Catégorie</th>
                  <th style={{ textAlign: 'right' }}>Nb lignes</th>
                  <th style={{ textAlign: 'right' }}>Montant HT</th>
                </tr>
              </thead>
              <tbody>
                {repartitionParStructure.slice(0, 200).map((r, i) => (
                  <tr key={i}>
                    <td style={{ fontWeight: 500 }}>{r.structure}</td>
                    <td style={{ fontSize: '0.78rem', color: 'var(--text-secondary)' }}>{r.nomStructure || '—'}</td>
                    <td style={{ fontSize: '0.78rem', color: 'var(--text-secondary)' }}>{r.grandeCategorie}</td>
                    <td style={{ fontSize: '0.78rem' }}>{r.categorie}</td>
                    <td className="amount">{r.nbLignes}</td>
                    <td className="amount">{formatMontant(r.montantHT)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* === (3) Détail ligne par ligne : Structure × N° BC × Code Article === */}
      {structureArticleDetail.length > 0 && (
        <div className="card full-width">
          <div className="card-title" style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <Layers size={15} /> Détail par N° BC et Code Article
            <span style={{ fontSize: '0.65rem', fontWeight: 400, color: 'var(--text-muted)' }}>
              — {filteredDetail.length} ligne(s)
            </span>
          </div>
          <p style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', marginBottom: 12 }}>
            Chaque ligne d'achat (Bon de Commande + Code Article) avec sa catégorisation détaillée.
          </p>

          <div style={{ display: 'flex', gap: 10, marginBottom: 14, flexWrap: 'wrap' }}>
            <select
              value={structureFilter}
              onChange={e => setStructureFilter(e.target.value)}
              style={{ padding: '8px 12px', border: '1px solid var(--border-light)', borderRadius: 6, fontSize: '0.82rem', background: 'white', minWidth: 150 }}
            >
              <option value="">Toutes les structures</option>
              {structuresList.map(s => <option key={s} value={s}>{s}</option>)}
            </select>
            <select
              value={categorieFilter}
              onChange={e => setCategorieFilter(e.target.value)}
              style={{ padding: '8px 12px', border: '1px solid var(--border-light)', borderRadius: 6, fontSize: '0.82rem', background: 'white', minWidth: 170 }}
            >
              <option value="">Toutes les catégories</option>
              {categoriesList.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
            <div style={{ position: 'relative', flex: '1 1 180px' }}>
              <Search size={14} style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
              <input
                type="text"
                placeholder="Nature d'article..."
                value={natureSearch}
                onChange={e => setNatureSearch(e.target.value)}
                style={{ width: '100%', padding: '8px 12px 8px 32px', border: '1px solid var(--border-light)', borderRadius: 6, fontSize: '0.82rem' }}
              />
            </div>
            <div style={{ position: 'relative', flex: '1 1 180px' }}>
              <Search size={14} style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
              <input
                type="text"
                placeholder="N° BC, code article..."
                value={codeSearch}
                onChange={e => setCodeSearch(e.target.value)}
                style={{ width: '100%', padding: '8px 12px 8px 32px', border: '1px solid var(--border-light)', borderRadius: 6, fontSize: '0.82rem' }}
              />
            </div>
            {(structureFilter || categorieFilter || natureSearch || codeSearch) && (
              <button
                onClick={() => { setStructureFilter(''); setCategorieFilter(''); setNatureSearch(''); setCodeSearch(''); }}
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
                  <th>N° BC</th>
                  <th>Code Article</th>
                  <th>Article</th>
                  <th>Domaine d'achat</th>
                  <th>Catégorie</th>
                  <th>Nature d'article</th>
                  <th style={{ textAlign: 'right' }}>Montant HT</th>
                </tr>
              </thead>
              <tbody>
                {filteredDetail.slice(0, 300).map((r, i) => (
                  <tr key={i}>
                    <td style={{ fontWeight: 600 }}>{r.structure}</td>
                    <td style={{ fontFamily: 'monospace', fontSize: '0.75rem' }}>{r.numBC}</td>
                    <td style={{ fontFamily: 'monospace', fontSize: '0.75rem' }}>{r.codeArticle}</td>
                    <td style={{ maxWidth: 180, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', fontSize: '0.78rem' }}>{r.article}</td>
                    <td style={{ fontSize: '0.78rem', color: 'var(--text-secondary)' }}>{r.grandeCategorie}</td>
                    <td style={{ fontSize: '0.78rem' }}>{r.categorie}</td>
                    <td style={{ fontSize: '0.78rem', fontWeight: 500 }}>{r.natureArticle}</td>
                    <td className="amount">{formatMontant(r.montantHT)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            {filteredDetail.length > 300 && (
              <div style={{ textAlign: 'center', padding: 12, fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                Affichage limité aux 300 premières lignes — affinez les filtres.
              </div>
            )}
            {filteredDetail.length === 0 && (
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