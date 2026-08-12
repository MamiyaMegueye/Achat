import React from 'react';
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid
} from 'recharts';
import { formatMontant } from '../utils/stats';

export default function StructuresPage({ structureStats }) {
  const chartData = structureStats.slice(0, 15).map(s => ({
    name: s.structure,
    montant: Math.round(s.montantTotal / 1000),
  }));

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
    </div>
  );
}
