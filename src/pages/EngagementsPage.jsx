import React, { useState } from 'react';
import { formatMontant, daysBetween } from '../utils/stats';
import { Filter, X } from 'lucide-react';

export default function EngagementsPage({ cmds }) {
  const today = new Date();

  // Engagements = facture reçue (FACT_DAT_FR) mais pas encore payée
  const engagements = cmds
    .filter(c => c.factDateFr && !c.paiementDate)
    .map(c => {
      const datFacture = c.factDateFr instanceof Date ? c.factDateFr : new Date(c.factDateFr);
      const joursAttente = daysBetween(datFacture, today) || 0;
      return {
        numCmd: c.numCmd,
        fournisseur: c.nomFrn || '—',
        objet: c.obsCde || '—',
        montTTC: c.montTTC || 0,
        montHT: c.montHT || 0,
        datCde: c.datCde,
        datRec: c.datRec,
        datFacture,
        joursAttente,
        moisFacture: `${datFacture.getFullYear()}-${String(datFacture.getMonth() + 1).padStart(2, '0')}`,
        dateEcheance: new Date(datFacture.getTime() + 90 * 24 * 60 * 60 * 1000),
        moisEcheance: (() => { const ech = new Date(datFacture.getTime() + 90 * 24 * 60 * 60 * 1000); return `${ech.getFullYear()}-${String(ech.getMonth() + 1).padStart(2, '0')}`; })(),
      };
    })
    .sort((a, b) => a.datFacture - b.datFacture);

  // Grouper par mois de facture
  const parMois = {};
  engagements.forEach(e => {
    if (!parMois[e.moisFacture]) parMois[e.moisFacture] = { mois: e.moisFacture, cmds: [], total: 0, nbFrn: new Set() };
    parMois[e.moisFacture].cmds.push(e);
    parMois[e.moisFacture].total += e.montTTC;
    parMois[e.moisFacture].nbFrn.add(e.fournisseur);
  });
  const moisList = Object.values(parMois).sort((a, b) => a.mois.localeCompare(b.mois));

  // Grouper par mois d'échéance (facture + 90j)
  const parMoisEcheance = {};
  engagements.forEach(e => {
    if (!parMoisEcheance[e.moisEcheance]) parMoisEcheance[e.moisEcheance] = { mois: e.moisEcheance, cmds: [], total: 0, nbFrn: new Set() };
    parMoisEcheance[e.moisEcheance].cmds.push(e);
    parMoisEcheance[e.moisEcheance].total += e.montTTC;
    parMoisEcheance[e.moisEcheance].nbFrn.add(e.fournisseur);
  });
  const moisEcheanceList = Object.values(parMoisEcheance).sort((a, b) => a.mois.localeCompare(b.mois));

  const totalEngagements = engagements.reduce((s, e) => s + e.montTTC, 0);
  const nbFrnTotal = new Set(engagements.map(e => e.fournisseur)).size;

  const [selectedMois, setSelectedMois] = useState(null);
  const [selectedMoisEcheance, setSelectedMoisEcheance] = useState(null);
  const [frnFilter, setFrnFilter] = useState('');
  const [openFrnFilter, setOpenFrnFilter] = useState(false);

  // Commandes filtrées par mois facture et/ou mois échéance
  let cmdsAffichees = engagements;
  if (selectedMois) cmdsAffichees = cmdsAffichees.filter(e => e.moisFacture === selectedMois);
  if (selectedMoisEcheance) cmdsAffichees = cmdsAffichees.filter(e => e.moisEcheance === selectedMoisEcheance);

  // Filtrage par fournisseur
  const frnUniques = [...new Set(cmdsAffichees.map(e => e.fournisseur))].sort();
  const [frnSelected, setFrnSelected] = useState(new Set());
  const cmdsFilterees = frnSelected.size > 0
    ? cmdsAffichees.filter(e => frnSelected.has(e.fournisseur))
    : cmdsAffichees;

  const totalFiltre = cmdsFilterees.reduce((s, e) => s + e.montTTC, 0);

  const fmtMois = (m) => {
    const [y, mo] = m.split('-');
    const moisNoms = ['Janv', 'Fév', 'Mars', 'Avr', 'Mai', 'Juin', 'Juil', 'Août', 'Sept', 'Oct', 'Nov', 'Déc'];
    return `${moisNoms[parseInt(mo) - 1]} ${y}`;
  };

  const fmtDate = d => {
    if (!d) return '—';
    const dt = d instanceof Date ? d : new Date(d);
    return isNaN(dt) ? '—' : dt.toLocaleDateString('fr-FR');
  };

  return (
    <div>
      <div className="page-header">
        <h1>Échéancier de paiement</h1>
        <p>Factures reçues en attente de paiement</p>
      </div>

      {/* KPIs */}
      <div className="card full-width" style={{ padding: 0, overflow: 'hidden', marginBottom: 20 }}>
        <div style={{ background: '#c17550', color: 'white', padding: '10px 16px', fontSize: '0.78rem', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.06em' }}>
          Synthèse des engagements en cours
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', borderBottom: '1px solid var(--border-light)' }}>
          <div style={{ padding: '14px 18px', borderRight: '1px solid var(--border-light)' }}>
            <div style={{ fontSize: '0.65rem', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 600, marginBottom: 4 }}>Total à payer</div>
            <div style={{ fontSize: '1.1rem', fontWeight: 700, color: '#a63b32' }}>{formatMontant(totalEngagements)}</div>
            <div style={{ fontSize: '0.62rem', color: 'var(--text-muted)' }}>MRU · {engagements.length} factures</div>
          </div>
          <div style={{ padding: '14px 18px', borderRight: '1px solid var(--border-light)' }}>
            <div style={{ fontSize: '0.65rem', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 600, marginBottom: 4 }}>Fournisseurs concernés</div>
            <div style={{ fontSize: '1.1rem', fontWeight: 700, color: '#c17550' }}>{nbFrnTotal}</div>
          </div>
          <div style={{ padding: '14px 18px' }}>
            <div style={{ fontSize: '0.65rem', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 600, marginBottom: 4 }}>Factures &gt; 90 jours</div>
            <div style={{ fontSize: '1.1rem', fontWeight: 700, color: engagements.filter(e => e.joursAttente > 90).length > 0 ? '#a63b32' : '#2b6e52' }}>
              {engagements.filter(e => e.joursAttente > 90).length}
            </div>
            <div style={{ fontSize: '0.62rem', color: 'var(--text-muted)' }}>
              {formatMontant(engagements.filter(e => e.joursAttente > 90).reduce((s, e) => s + e.montTTC, 0))} MRU
            </div>
          </div>
        </div>
      </div>

      {/* Filtres */}
      <div style={{ display: 'flex', gap: 10, marginBottom: 14, alignItems: 'center', flexWrap: 'wrap' }}>
        {/* Filtre mois facture */}
        <select value={selectedMois || ''} onChange={e => { setSelectedMois(e.target.value || null); setFrnSelected(new Set()); }}
          style={{ padding: '7px 12px', border: '1px solid var(--border-light)', borderRadius: 6, fontSize: '0.82rem', background: selectedMois ? '#f3e0d5' : 'white', color: '#333', cursor: 'pointer' }}>
          <option value="">Mois facture — tous ({engagements.length})</option>
          {moisList.map(m => (
            <option key={m.mois} value={m.mois}>{fmtMois(m.mois)} — {m.cmds.length} factures · {formatMontant(m.total)} MRU</option>
          ))}
        </select>
        {/* Filtre mois échéance */}
        <select value={selectedMoisEcheance || ''} onChange={e => { setSelectedMoisEcheance(e.target.value || null); setFrnSelected(new Set()); }}
          style={{ padding: '7px 12px', border: '1px solid var(--border-light)', borderRadius: 6, fontSize: '0.82rem', background: selectedMoisEcheance ? '#e8f0e4' : 'white', color: '#333', cursor: 'pointer' }}>
          <option value="">Mois échéance — tous</option>
          {moisEcheanceList.map(m => (
            <option key={m.mois} value={m.mois}>{fmtMois(m.mois)} — {m.cmds.length} factures · {formatMontant(m.total)} MRU</option>
          ))}
        </select>
        <div style={{ position: 'relative' }}>
          <button onClick={() => setOpenFrnFilter(!openFrnFilter)}
            style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '7px 14px', border: '1px solid var(--border-light)', borderRadius: 6, background: frnSelected.size > 0 ? '#f3e0d5' : 'white', cursor: 'pointer', fontSize: '0.8rem' }}>
            <Filter size={13} style={{ color: frnSelected.size > 0 ? '#c17550' : '#999' }} />
            Fournisseur {frnSelected.size > 0 ? `(${frnSelected.size})` : ''}
          </button>
          {openFrnFilter && (
            <div style={{ position: 'absolute', top: '100%', left: 0, background: 'white', border: '1px solid #ddd', borderRadius: 8, boxShadow: '0 4px 16px rgba(0,0,0,0.15)', zIndex: 100, minWidth: 280, maxHeight: 350, display: 'flex', flexDirection: 'column' }}>
              <div style={{ padding: '8px 12px', borderBottom: '1px solid #eee', display: 'flex', gap: 10 }}>
                <button onClick={() => setFrnSelected(new Set(frnUniques))}
                  style={{ fontSize: '0.72rem', color: '#2b6e52', background: 'none', border: 'none', cursor: 'pointer', fontWeight: 600 }}>Tout sélectionner</button>
                <button onClick={() => setFrnSelected(new Set())}
                  style={{ fontSize: '0.72rem', color: '#a63b32', background: 'none', border: 'none', cursor: 'pointer', fontWeight: 600 }}>Effacer</button>
              </div>
              <div style={{ overflowY: 'auto', maxHeight: 260, padding: '4px 0' }}>
                {frnUniques.map((f, i) => (
                  <label key={i} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '4px 12px', fontSize: '0.78rem', cursor: 'pointer' }}
                    onMouseEnter={e => e.currentTarget.style.background = '#f5f0e8'}
                    onMouseLeave={e => e.currentTarget.style.background = 'none'}>
                    <input type="checkbox" checked={frnSelected.has(f)}
                      onChange={e => {
                        const nw = new Set(frnSelected);
                        if (e.target.checked) nw.add(f); else nw.delete(f);
                        setFrnSelected(nw);
                      }}
                      style={{ accentColor: '#c17550' }} />
                    {f}
                  </label>
                ))}
              </div>
              <div style={{ padding: '8px 12px', borderTop: '1px solid #eee', textAlign: 'right' }}>
                <button onClick={() => setOpenFrnFilter(false)}
                  style={{ fontSize: '0.75rem', background: '#c17550', color: 'white', border: 'none', borderRadius: 4, padding: '5px 16px', cursor: 'pointer' }}>OK</button>
              </div>
            </div>
          )}
        </div>
        {frnSelected.size > 0 && (
          <div style={{ fontSize: '0.78rem', color: '#c17550' }}>
            {cmdsFilterees.length} factures · <strong>{formatMontant(totalFiltre)}</strong> MRU
          </div>
        )}
      </div>

      {/* Tableau détaillé */}
      <div className="card full-width">
        <div style={{ maxHeight: 550, overflowY: 'auto' }}>
          <table className="data-table">
            <thead>
              <tr>
                <th>N° CMD</th>
                <th>Fournisseur</th>
                <th>Article</th>
                <th>Date Cde</th>
                <th>Date Réception</th>
                <th>Date Facture</th>
                <th>Date échéance</th>
                <th style={{ textAlign: 'right' }}>Jours d'attente</th>
                <th style={{ textAlign: 'right' }}>Montant HT</th>
                <th style={{ textAlign: 'right' }}>Montant TTC</th>
              </tr>
            </thead>
            <tbody>
              {cmdsFilterees.map((e, i) => (
                <tr key={i} style={{ background: e.joursAttente > 90 ? '#f8f0e8' : undefined }}>
                  <td style={{ fontWeight: 600 }}>{e.numCmd}</td>
                  <td style={{ whiteSpace: 'normal', wordBreak: 'break-word' }}>{e.fournisseur}</td>
                  <td style={{ whiteSpace: 'normal', wordBreak: 'break-word', fontSize: '0.78rem', color: 'var(--text-secondary)' }}>{e.objet}</td>
                  <td>{fmtDate(e.datCde)}</td>
                  <td>{fmtDate(e.datRec)}</td>
                  <td>{fmtDate(e.datFacture)}</td>
                  <td style={{ color: e.dateEcheance < today ? '#a63b32' : '#2b6e52', fontWeight: e.dateEcheance < today ? 600 : 400 }}>{fmtDate(e.dateEcheance)}</td>
                  <td className="amount">
                    <span className={`badge ${e.joursAttente > 90 ? 'badge-danger' : e.joursAttente > 60 ? 'badge-warning' : 'badge-neutral'}`}>
                      {e.joursAttente}j
                    </span>
                  </td>
                  <td className="amount">{formatMontant(e.montHT)}</td>
                  <td className="amount">{formatMontant(e.montTTC)}</td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr style={{ fontWeight: 700, borderTop: '2px solid var(--border-light)' }}>
                <td colSpan={8}>Total ({cmdsFilterees.length} factures)</td>
                <td className="amount">{formatMontant(cmdsFilterees.reduce((s, e) => s + e.montHT, 0))}</td>
                <td className="amount">{formatMontant(totalFiltre)}</td>
              </tr>
            </tfoot>
          </table>
        </div>
      </div>
    </div>
  );
}