import React from 'react';
import { AlertTriangle, FileX, CreditCard } from 'lucide-react';
import { formatMontant } from '../utils/stats';

export default function AnomaliesPage({ missingDocs, cmds }) {
  // Commandes avec écart HT/TTC significatif
  const ecartTaxes = cmds
    .filter(c => c.montHT && c.montTTC && Math.abs(c.montTTC - c.montHT) > 100)
    .map(c => ({
      numCmd: c.numCmd,
      fournisseur: c.nomFrn,
      montHT: c.montHT,
      montTTC: c.montTTC,
      ecart: c.montTTC - c.montHT,
    }))
    .sort((a, b) => Math.abs(b.ecart) - Math.abs(a.ecart));

  // Commandes avec paiement différent du TTC
  const ecartPaiement = cmds
    .filter(c => c.paiementMontant && c.montTTC && Math.abs(c.paiementMontant - c.montTTC) > 100)
    .map(c => ({
      numCmd: c.numCmd,
      fournisseur: c.nomFrn,
      montTTC: c.montTTC,
      paiement: c.paiementMontant,
      ecart: c.paiementMontant - c.montTTC,
    }))
    .sort((a, b) => Math.abs(b.ecart) - Math.abs(a.ecart));

  // Bilan global : commandé vs payé
  const totalTTC = cmds.reduce((s, c) => s + (c.montTTC || 0), 0);
  const totalPaye = cmds.reduce((s, c) => s + (c.paiementMontant || 0), 0);
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
        <div style={{ padding: '14px 18px', borderBottom: '1px solid var(--border-light)' }}>
          <div className="card-title" style={{ marginBottom: 0 }}>Bilan financier global</div>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', borderBottom: '1px solid var(--border-light)' }}>
          <div style={{ padding: '14px 18px', borderRight: '1px solid var(--border-light)' }}>
            <div style={{ fontSize: '0.65rem', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 600, marginBottom: 4 }}>Total commandé (TTC)</div>
            <div style={{ fontSize: '1.1rem', fontWeight: 700, color: '#8a5220' }}>{formatMontant(totalTTC)}</div>
            <div style={{ fontSize: '0.62rem', color: 'var(--text-muted)' }}>MRU · {cmds.length} commandes</div>
          </div>
          <div style={{ padding: '14px 18px', borderRight: '1px solid var(--border-light)' }}>
            <div style={{ fontSize: '0.65rem', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 600, marginBottom: 4 }}>Total payé</div>
            <div style={{ fontSize: '1.1rem', fontWeight: 700, color: '#2b6e52' }}>{formatMontant(totalPaye)}</div>
            <div style={{ fontSize: '0.62rem', color: 'var(--text-muted)' }}>{pctPaye}% du total</div>
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
          <div className="kpi-value" style={{ color: '#5e5288' }}>{ecartPaiement.length}</div>
          <div className="kpi-label">Écart paiement / TTC</div>
        </div>
      </div>

      {/* Réceptionnées sans facture */}
      <div className="card full-width">
        <div className="card-title">Commandes réceptionnées sans facture enregistrée</div>
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
                  <tr key={i}>
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

      {/* Écart paiement / TTC */}
      {ecartPaiement.length > 0 && (
        <div className="card full-width">
          <div className="card-title">Écart entre montant payé et montant TTC (retenues, acomptes)</div>
          <div style={{ maxHeight: 350, overflowY: 'auto' }}>
            <table className="data-table">
              <thead>
                <tr>
                  <th>N° CMD</th>
                  <th>Fournisseur</th>
                  <th style={{ textAlign: 'right' }}>Montant TTC</th>
                  <th style={{ textAlign: 'right' }}>Montant payé</th>
                  <th style={{ textAlign: 'right' }}>Écart</th>
                </tr>
              </thead>
              <tbody>
                {ecartPaiement.map((c, i) => (
                  <tr key={i}>
                    <td style={{ fontWeight: 500 }}>{c.numCmd}</td>
                    <td style={{ maxWidth: 250, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {c.fournisseur}
                    </td>
                    <td className="amount">{formatMontant(c.montTTC)}</td>
                    <td className="amount">{formatMontant(c.paiement)}</td>
                    <td className="amount" style={{ color: c.ecart < 0 ? 'var(--danger)' : 'var(--warning)', fontWeight: 600 }}>
                      {c.ecart > 0 ? '+' : ''}{formatMontant(c.ecart)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Écart HT / TTC */}
      {ecartTaxes.length > 0 && (
        <div className="card full-width">
          <div className="card-title">Commandes avec écart HT / TTC significatif</div>
          <div style={{ maxHeight: 300, overflowY: 'auto' }}>
            <table className="data-table">
              <thead>
                <tr>
                  <th>N° CMD</th>
                  <th>Fournisseur</th>
                  <th style={{ textAlign: 'right' }}>Mont. HT</th>
                  <th style={{ textAlign: 'right' }}>Mont. TTC</th>
                  <th style={{ textAlign: 'right' }}>Écart</th>
                </tr>
              </thead>
              <tbody>
                {ecartTaxes.map((c, i) => (
                  <tr key={i}>
                    <td>{c.numCmd}</td>
                    <td style={{ maxWidth: 250, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {c.fournisseur}
                    </td>
                    <td className="amount">{formatMontant(c.montHT)}</td>
                    <td className="amount">{formatMontant(c.montTTC)}</td>
                    <td className="amount" style={{ color: 'var(--warning)', fontWeight: 600 }}>
                      +{formatMontant(c.ecart)}
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
