import React from 'react';
import { AlertTriangle, FileX, CreditCard } from 'lucide-react';
import { formatMontant } from '../utils/stats';

export default function AnomaliesPage({ missingDocs, cmds }) {
  // Analyse par ordre de paiement → retenues de garantie
  const ordresMap = {};
  cmds.forEach(c => {
    if (!c.paiementNumOrdre || !c.paiementMontant) return;
    const key = c.paiementNumOrdre;
    if (!ordresMap[key]) {
      ordresMap[key] = { numOrdre: key, montantPaye: c.paiementMontant, commandes: [] };
    }
    ordresMap[key].commandes.push({
      numCmd: c.numCmd,
      fournisseur: c.nomFrn,
      montTTC: c.montTTC || 0,
    });
  });

  const retenues = Object.values(ordresMap)
    .map(o => {
      const sommeTTC = o.commandes.reduce((s, c) => s + c.montTTC, 0);
      const ecart = o.montantPaye - sommeTTC;
      return {
        ...o,
        sommeTTC,
        ecart,
        nbCmds: o.commandes.length,
        fournisseur: o.commandes[0].fournisseur,
      };
    })
    .filter(o => o.ecart < -100 && o.sommeTTC > 0)
    .sort((a, b) => a.ecart - b.ecart);

  // Bilan global : commandé vs payé
  const totalTTC = cmds.reduce((s, c) => s + (c.montTTC || 0), 0);
  // Total payé = somme des montants par ordre (dédupliqué)
  const ordresPaye = {};
  cmds.forEach(c => {
    if (c.paiementNumOrdre && c.paiementMontant) {
      ordresPaye[c.paiementNumOrdre] = c.paiementMontant;
    }
  });
  const totalPaye = Object.values(ordresPaye).reduce((s, v) => s + v, 0);
  const soldeRestant = totalTTC - totalPaye;
  const pctPaye = totalTTC > 0 ? Math.round((totalPaye / totalTTC) * 100) : 0;

  return (
    <div>
      <div className="page-header">
        <h1>Anomalies & Documents manquants</h1>
        <p>Points d'attention nécessitant une vérification</p>
      </div>

      {/* Bilan financier global */}
      <div className="card full-width" style={{ padding: 0, overflow: 'hidden', marginBottom: 20 }}>
        <div style={{ background: '#8a5220', color: 'white', padding: '10px 16px', fontSize: '0.78rem', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.06em' }}>Bilan financier global</div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', borderBottom: '1px solid var(--border-light)' }}>
          <div style={{ padding: '14px 18px', borderRight: '1px solid var(--border-light)' }}>
            <div style={{ fontSize: '0.65rem', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 600, marginBottom: 4 }}>Total commandé (TTC)</div>
            <div style={{ fontSize: '1.1rem', fontWeight: 700, color: '#8a5220' }}>{formatMontant(totalTTC)}</div>
            <div style={{ fontSize: '0.62rem', color: 'var(--text-muted)' }}>MRU · {cmds.length} commandes</div>
          </div>
          <div style={{ padding: '14px 18px', borderRight: '1px solid var(--border-light)' }}>
            <div style={{ fontSize: '0.65rem', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 600, marginBottom: 4 }}>Total payé</div>
            <div style={{ fontSize: '1.1rem', fontWeight: 700, color: '#2b6e52' }}>{formatMontant(totalPaye)}</div>
            <div style={{ fontSize: '0.62rem', color: 'var(--text-muted)' }}>{pctPaye}% du total · {Object.keys(ordresPaye).length} ordres</div>
          </div>
          <div style={{ padding: '14px 18px' }}>
            <div style={{ fontSize: '0.65rem', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 600, marginBottom: 4 }}>Solde restant</div>
            <div style={{ fontSize: '1.1rem', fontWeight: 700, color: soldeRestant > 0 ? '#a63b32' : '#2b6e52' }}>{formatMontant(soldeRestant)}</div>
            <div style={{ fontSize: '0.62rem', color: 'var(--text-muted)' }}>{100 - pctPaye}% non payé</div>
          </div>
        </div>
        {/* Barre de progression */}
        <div style={{ padding: '10px 18px' }}>
          <div style={{ display: 'flex', borderRadius: 6, overflow: 'hidden', height: 14 }}>
            <div style={{ width: `${pctPaye}%`, background: '#3d8b6e', transition: 'width 0.5s', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              {pctPaye > 15 && <span style={{ fontSize: '0.58rem', fontWeight: 600, color: 'white' }}>{pctPaye}%</span>}
            </div>
            <div style={{ flex: 1, background: '#fae8e6', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              {(100 - pctPaye) > 15 && <span style={{ fontSize: '0.58rem', fontWeight: 600, color: '#a63b32' }}>{100 - pctPaye}%</span>}
            </div>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 4 }}>
            <span style={{ fontSize: '0.62rem', color: '#2b6e52' }}>Payé</span>
            <span style={{ fontSize: '0.62rem', color: '#a63b32' }}>Restant</span>
          </div>
        </div>
      </div>

      {/* KPIs */}
      <div className="grid-3">
        <div className="card kpi-card" style={{ background: '#fdf3e4', borderLeft: '2.5px solid #c48520' }}>
          <div className="kpi-icon" style={{ background: 'rgba(255,255,255,0.6)' }}>
            <FileX size={14} style={{ color: '#c48520' }} />
          </div>
          <div className="kpi-value" style={{ color: '#8a5e16' }}>{missingDocs.sansFacture.length}</div>
          <div className="kpi-label">Réceptionnées sans facture</div>
        </div>
        <div className="card kpi-card" style={{ background: '#fae8e6', borderLeft: '2.5px solid #a63b32' }}>
          <div className="kpi-icon" style={{ background: 'rgba(255,255,255,0.6)' }}>
            <AlertTriangle size={14} style={{ color: '#a63b32' }} />
          </div>
          <div className="kpi-value" style={{ color: '#a63b32' }}>{missingDocs.sansReception}</div>
          <div className="kpi-label">Sans réception</div>
        </div>
        <div className="card kpi-card" style={{ background: '#edeaf4', borderLeft: '2.5px solid #5e5288' }}>
          <div className="kpi-icon" style={{ background: 'rgba(255,255,255,0.6)' }}>
            <CreditCard size={14} style={{ color: '#5e5288' }} />
          </div>
          <div className="kpi-value" style={{ color: '#5e5288' }}>{retenues.length}</div>
          <div className="kpi-label">Ordres avec montant retenu</div>
        </div>
      </div>

      {/* Réceptionnées sans facture */}
      <div className="card full-width">
        <div style={{ background: '#b06830', color: 'white', padding: '10px 16px', borderRadius: '8px 8px 0 0', margin: '-24px -24px 16px -24px', fontSize: '0.78rem', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.06em' }}>Commandes réceptionnées sans facture enregistrée</div>
        {missingDocs.sansFacture.length === 0 ? (
          <div style={{ textAlign: 'center', padding: 40, color: 'var(--text-muted)' }}>Aucune anomalie</div>
        ) : (
          <div style={{ maxHeight: 350, overflowY: 'auto' }}>
            <table className="data-table">
              <thead>
                <tr>
                  <th>N° CMD</th>
                  <th>Fournisseur</th>
                  <th style={{ textAlign: 'right' }}>Montant TTC</th>
                  <th>Date réception</th>
                </tr>
              </thead>
              <tbody>
                {missingDocs.sansFacture.map((c, i) => (
                  <tr key={i} style={{ background: i % 2 === 0 ? '#fdf3e4' : '#fae8e6' }}>
                    <td style={{ fontWeight: 500 }}>{c.numCmd}</td>
                    <td style={{ maxWidth: 300, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {c.fournisseur}
                    </td>
                    <td className="amount">{formatMontant(c.montant)}</td>
                    <td>{c.dateRec ? new Date(c.dateRec).toLocaleDateString('fr-FR') : '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Retenues de garantie */}
      {retenues.length > 0 && (
        <div className="card full-width">
          <div style={{ background: '#3d8b6e', color: 'white', padding: '10px 16px', borderRadius: '8px 8px 0 0', margin: '-24px -24px 16px -24px', fontSize: '0.78rem', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.06em' }}>Écart entre montant facturé (TTC) et montant effectivement payé par ordre de paiement</div>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.78rem', marginBottom: 14 }}>
            Pour chaque ordre de paiement, comparaison entre la somme des montants TTC des commandes et le montant versé. Le taux standard est de 2%.
          </p>
          <div style={{ maxHeight: 400, overflowY: 'auto' }}>
            <table className="data-table">
              <thead>
                <tr>
                  <th>N° Ordre</th>
                  <th>Fournisseur</th>
                  <th style={{ textAlign: 'center' }}>Nb CMD</th>
                  <th style={{ textAlign: 'right' }}>Somme TTC</th>
                  <th style={{ textAlign: 'right' }}>Montant payé</th>
                  <th style={{ textAlign: 'right' }}>Montant retenu</th>
                  <th style={{ textAlign: 'right' }}>Taux</th>
                </tr>
              </thead>
              <tbody>
                {retenues.map((o, i) => (
                  <tr key={i}>
                    <td style={{ fontFamily: 'monospace', fontSize: '0.78rem', fontWeight: 500 }}>{o.numOrdre}</td>
                    <td style={{ maxWidth: 200, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {o.fournisseur}
                    </td>
                    <td style={{ textAlign: 'center' }}>
                      <span className="badge badge-neutral">{o.nbCmds}</span>
                    </td>
                    <td className="amount">{formatMontant(o.sommeTTC)}</td>
                    <td className="amount">{formatMontant(o.montantPaye)}</td>
                    <td className="amount" style={{ color: '#a63b32', fontWeight: 600 }}>
                      {formatMontant(Math.abs(o.ecart))}
                    </td>
                    <td className="amount" style={{ fontWeight: 600, color: Math.round(Math.abs(o.ecart) / o.sommeTTC * 100) !== 2 ? '#a63b32' : 'var(--text-secondary)' }}>
                      {Math.round(Math.abs(o.ecart) / o.sommeTTC * 100)}%
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

    </div>
  );
}
