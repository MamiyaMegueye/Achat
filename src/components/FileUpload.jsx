import React, { useState, useRef } from 'react';
import { Upload, FileSpreadsheet, CheckCircle2, AlertCircle, Trash2, Database, ArrowRight } from 'lucide-react';
import { readExcelFile, parseBonsCommande, parseSuiviCmd } from '../utils/dataProcessor';
import { importBonsCommande, importSuiviCmd, clearAllData, getDataCounts } from '../utils/storage';

export default function FileUpload({ onDataImported, dataCounts }) {
  const [bcStatus, setBcStatus] = useState(null);
  const [cmdStatus, setCmdStatus] = useState(null);
  const [loading, setLoading] = useState(false);
  const bcRef = useRef();
  const cmdRef = useRef();

  const handleFile = async (file, type) => {
    const setter = type === 'bc' ? setBcStatus : setCmdStatus;
    setter({ status: 'loading', message: 'Lecture du fichier...' });
    setLoading(true);

    try {
      const wb = await readExcelFile(file);

      if (type === 'bc') {
        const rows = parseBonsCommande(wb);
        const result = await importBonsCommande(rows);
        setter({
          status: 'success',
          message: `${result.added} articles ajoutés, ${result.skipped} existants`,
          count: rows.length,
        });
      } else {
        const rows = parseSuiviCmd(wb);
        const withDatCde = rows.filter(r => r.datCde instanceof Date).length;
        const withDatRec = rows.filter(r => r.datRec instanceof Date).length;
        const withDelai = rows.filter(r => r.delaiLivraison instanceof Date).length;
        const withPaiement = rows.filter(r => r.paiementDate instanceof Date).length;
        const sansRec = rows.filter(r => !r.datRec).length;
        const diag = `${rows.length} cmds | datCde:${withDatCde} | datRec:${withDatRec} | delai:${withDelai} | paiement:${withPaiement} | sansRec:${sansRec}`;
        console.log('[DIAG]', diag);
        window.__SNDE_DIAG = diag;

        const result = await importSuiviCmd(rows);
        setter({
          status: 'success',
          message: `${result.added} ajoutées, ${result.updated || 0} mises à jour, ${result.skipped} existantes`,
          count: rows.length,
          diag,
        });
      }

      onDataImported();
    } catch (err) {
      setter({ status: 'error', message: `Erreur: ${err.message}` });
    } finally {
      setLoading(false);
    }
  };

  const handleClear = async () => {
    if (window.confirm('Supprimer toutes les données importées ?')) {
      await clearAllData();
      setBcStatus(null);
      setCmdStatus(null);
      onDataImported();
    }
  };

  const UploadBox = ({ label, step, description, detail, inputRef, onFile, status, accept, color, bgColor }) => {
    const [dragging, setDragging] = useState(false);

    return (
      <div style={{
        background: 'white',
        borderRadius: 12,
        border: `1px solid ${status?.status === 'success' ? 'var(--success)' : 'var(--border-light)'}`,
        overflow: 'hidden',
        transition: 'all 0.25s',
        boxShadow: dragging ? '0 0 0 3px ' + color + '30' : 'var(--shadow-sm)',
      }}>
        {/* Header coloré */}
        <div style={{
          background: bgColor,
          padding: '12px 16px',
          display: 'flex',
          alignItems: 'center',
          gap: 10,
          borderBottom: '1px solid ' + color + '20',
        }}>
          <div style={{
            width: 28, height: 28, borderRadius: 8,
            background: color, color: 'white',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: '0.75rem', fontWeight: 700,
          }}>{step}</div>
          <div>
            <div style={{ fontSize: '0.82rem', fontWeight: 600, color: 'var(--text-primary)' }}>{label}</div>
            <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>{detail}</div>
          </div>
        </div>

        {/* Zone drop compacte */}
        <div
          className={`${dragging ? 'dragging' : ''}`}
          onClick={() => inputRef.current?.click()}
          onDragOver={e => { e.preventDefault(); setDragging(true); }}
          onDragLeave={() => setDragging(false)}
          onDrop={e => {
            e.preventDefault();
            setDragging(false);
            const f = e.dataTransfer.files[0];
            if (f) onFile(f);
          }}
          style={{
            padding: '20px 16px',
            textAlign: 'center',
            cursor: 'pointer',
            transition: 'background 0.2s',
            background: dragging ? color + '08' : 'transparent',
          }}
        >
          <input
            ref={inputRef}
            type="file"
            accept={accept}
            hidden
            onChange={e => {
              const f = e.target.files[0];
              if (f) onFile(f);
            }}
          />
          <FileSpreadsheet size={24} style={{ color: color, marginBottom: 8 }} />
          <div style={{ fontSize: '0.85rem', fontWeight: 500, color: 'var(--text-primary)', marginBottom: 4 }}>
            {description}
          </div>
          <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
            Glisser ici ou <span style={{ color: color, fontWeight: 500 }}>parcourir</span>
          </div>
          <div style={{ fontSize: '0.68rem', color: 'var(--text-muted)', marginTop: 4 }}>.xlsx</div>
        </div>

        {/* Status */}
        {status && (
          <div style={{
            padding: '8px 16px',
            borderTop: '1px solid var(--border-light)',
            display: 'flex', alignItems: 'center', gap: 6,
            fontSize: '0.78rem', fontWeight: 500,
            background: status.status === 'success' ? 'var(--success-light)' :
                        status.status === 'error' ? 'var(--danger-light)' : 'transparent',
            color: status.status === 'success' ? 'var(--success)' :
                   status.status === 'error' ? 'var(--danger)' : 'var(--text-secondary)',
          }}>
            {status.status === 'success' && <CheckCircle2 size={14} />}
            {status.status === 'error' && <AlertCircle size={14} />}
            {status.message}
          </div>
        )}
      </div>
    );
  };

  const hasData = dataCounts.bcCount > 0 || dataCounts.cmdCount > 0;

  return (
    <div style={{ maxWidth: 680, margin: '0 auto' }}>
      <div className="page-header" style={{ textAlign: 'center' }}>
        <h1>Importer vos données</h1>
      </div>

      {/* Data counts */}
      {hasData && (
        <div style={{
          marginBottom: 20, padding: '12px 16px',
          background: '#e4f2ec', borderRadius: 10,
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          border: '1px solid #c5e3d5',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <Database size={18} style={{ color: 'var(--accent-secondary)' }} />
            <div>
              <div style={{ fontWeight: 600, fontSize: '0.82rem', color: 'var(--text-primary)' }}>
                {dataCounts.bcCount} articles · {dataCounts.cmdCount} commandes
              </div>
              <div style={{ color: 'var(--text-muted)', fontSize: '0.72rem' }}>Données actuellement en base</div>
            </div>
          </div>
          <button className="btn btn-danger" onClick={handleClear} style={{ fontSize: '0.75rem', padding: '6px 12px' }}>
            <Trash2 size={13} /> Effacer
          </button>
        </div>
      )}

      {/* Upload boxes side by side */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 20 }}>
        <UploadBox
          step="1"
          label="Bons de Commande"
          detail="Articles, prix, fournisseurs"
          description="ListePeriodiqueBC"
          inputRef={bcRef}
          onFile={f => handleFile(f, 'bc')}
          status={bcStatus}
          accept=".xlsx,.xls"
          color="#b06830"
          bgColor="#f7ece0"
        />
        <UploadBox
          step="2"
          label="Suivi des Commandes"
          detail="Dates, réceptions, paiements"
          description="Suivi CMD"
          inputRef={cmdRef}
          onFile={f => handleFile(f, 'cmd')}
          status={cmdStatus}
          accept=".xlsx,.xls"
          color="#3d8b6e"
          bgColor="#e4f2ec"
        />
      </div>

    </div>
  );
}
