import React from 'react';
import { AlertTriangle, Clock } from 'lucide-react';
import { formatMontant } from '../utils/stats';

export default function AlertsPage({ paymentAlerts }) {
  const totalMontant = paymentAlerts.reduce((s, a) => s + (a.montant || 0), 0);

  return (
    <div>
      <div className="page-header">
        <h1>Alertes Paiement</h1>
        <p>Factures impayées au-delà du délai réglementaire de 90 jours</p>
      </div>

      {/* Summary */}
      <div className="grid-3">
        <div className="card kpi-card">
          <div className="kpi-icon" style={{ background: 'var(--danger-light)' }}>
            <AlertTriangle size={20} style={{ color: 'var(--danger)' }} />
          </div>
          <div className="kpi-value" style={{ color: 'var(--danger)' }}>{paymentAlerts.length}</div>
          <div className="kpi-label">Factures en retard</div>
        </div>
        <div className="card kpi-card">
          <div className="kpi-icon" style={{ background: 'var(--warning-light)' }}>
            <Clock size={20} style={{ color: 'var(--warning)' }} />
          </div>
          <div className="kpi-value">
            {paymentAlerts.length > 0 ? Math.max(...paymentAlerts.map(a => a.joursRetard)) : 0}j
          </div>
          <div className="kpi-label">Retard maximum</div>
        </div>
        <div className="card kpi-card">
          <div className="kpi-icon" style={{ background: 'var(--danger-light)' }}>
            <AlertTriangle size={20} style={{ color: 'var(--danger)' }} />
          </div>
          <div className="kpi-value">{formatMontant(totalMontant)}</div>
          <div className="kpi-label">Montant total impayé (MRU)</div>
        </div>
      </div>

      {/* Table */}
      <div className="card full-width">
        <div className="card-title">Détail des factures impayées &gt; 90 jours</div>
        {paymentAlerts.length === 0 ? (
          <div style={{ textAlign: 'center', padding: 60, color: 'var(--text-muted)' }}>
            <div style={{
              width: 60, height: 60, borderRadius: '50%', background: 'var(--success-light)',
              display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px'
            }}>
              <span style={{ fontSize: '1.5rem' }}>&#10003;</span>
            </div>
            Aucune facture en retard de paiement
          </div>
        ) : (
          <table className="data-table">
            <thead>
              <tr>
                <th>N° CMD</th>
                <th>Fournisseur</th>
                <th style={{ textAlign: 'right' }}>Montant TTC</th>
                <th>Date facture reçue</th>
                <th style={{ textAlign: 'right' }}>Jours depuis facture</th>
                <th style={{ textAlign: 'right' }}>Retard / 90j</th>
              </tr>
            </thead>
            <tbody>
              {paymentAlerts.map((a, i) => (
                <tr key={i}>
                  <td style={{ fontWeight: 500 }}>{a.numCmd}</td>
                  <td style={{ maxWidth: 250, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {a.fournisseur}
                  </td>
                  <td className="amount">{formatMontant(a.montant)}</td>
                  <td>{a.dateFacture ? new Date(a.dateFacture).toLocaleDateString('fr-FR') : '—'}</td>
                  <td className="amount">
                    <span className={`badge ${a.joursRetard > 120 ? 'badge-danger' : 'badge-warning'}`}>
                      {a.joursRetard}j
                    </span>
                  </td>
                  <td className="amount" style={{ color: 'var(--danger)', fontWeight: 600 }}>
                    +{a.retardSur90}j
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
