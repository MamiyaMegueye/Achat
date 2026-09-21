import React, { useState, useRef } from 'react';
import { Upload, FileSpreadsheet, CheckCircle2, AlertCircle, Trash2, Database, ArrowRight, RefreshCw, Clock } from 'lucide-react';
import { readExcelFile, parseBonsCommande, parseSuiviCmd, parseStructureCategorisation, parseArticleCategorisation, hasSourceSheet } from '../utils/dataProcessor';
import { importBonsCommande, importSuiviCmd, importCategorisation, importArticleCategorisation, clearAllData, getDataCounts, getActiveMode, setActiveMode } from '../utils/storage';
import { syncFromApi, fetchSyncStatus, refreshGlobalFilesAndCategorisation } from '../utils/apiSync';

export default function FileUpload({ onDataImported, dataCounts }) {
  const [bcStatus, setBcStatus] = useState(null);
  const [cmdStatus, setCmdStatus] = useState(null);
  const [catStatus, setCatStatus] = useState(null);
  const [apiStatus, setApiStatus] = useState(null);
  const [syncDate, setSyncDate] = useState('');
  const [mode, setMode] = useState(getActiveMode());
  const [syncStatusRows, setSyncStatusRows] = useState(null);
  const [syncStatusLoading, setSyncStatusLoading] = useState(false);
  const [syncStatusError, setSyncStatusError] = useState(null);
  const [excelRefreshStatus, setExcelRefreshStatus] = useState(null);
  const [excelRefreshLoading, setExcelRefreshLoading] = useState(false);

  const handleModeChange = (newMode) => {
    if (newMode === mode) return;
    setActiveMode(newMode);
    setMode(newMode);
    onDataImported(); // recharge le tableau de bord avec les donnees du mode choisi
  };
  const [loading, setLoading] = useState(false);
  const bcRef = useRef();
  const cmdRef = useRef();
  const catRef = useRef();

  const handleFile = async (file, type) => {
    const setter = type === 'bc' ? setBcStatus : type === 'cmd' ? setCmdStatus : setCatStatus;
    setter({ status: 'loading', message: 'Lecture du fichier...' });
    setLoading(true);

    try {
      const wb = await readExcelFile(file);

      if (type === 'bc') {
        const rows = parseBonsCommande(wb);
        const result = await importBonsCommande(rows);
        setter({
          status: 'success',
          message: `${result.added} articles ajoutés, ${result.updated} mis à jour, ${result.skipped} inchangés`,
          count: rows.length,
        });
      } else if (type === 'cmd') {
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
      } else if (type === 'cat') {
        const rows = parseStructureCategorisation(wb);
        const result = await importCategorisation(rows);

        // Le classeur peut contenir une feuille "Source" avec le détail par article
        let sourceMsg = '';
        if (hasSourceSheet(wb)) {
          const articleRows = parseArticleCategorisation(wb);
          const articleResult = await importArticleCategorisation(articleRows);
          sourceMsg = ` · ${articleResult.added} articles détaillés (feuille Source)`;
        }

        setter({
          status: 'success',
          message: `${result.added} lignes de catégorisation importées${sourceMsg}`,
          count: rows.length,
        });
      }

      onDataImported();
    } catch (err) {
      setter({ status: 'error', message: `Erreur: ${err.message}` });
    } finally {
      setLoading(false);
    }
  };

  const handleApiSync = async () => {
    setApiStatus({ status: 'loading', message: 'Synchronisation depuis la base...' });
    setLoading(true);
    try {
      const { bcResult, cmdResult } = await syncFromApi(syncDate || null);
      setApiStatus({
        status: 'success',
        message: `${bcResult.added} articles ajoutés, ${bcResult.updated || 0} mis à jour · ${cmdResult.added} commandes ajoutées, ${cmdResult.updated || 0} mises à jour`,
      });
      onDataImported();
    } catch (err) {
      setApiStatus({ status: 'error', message: `Erreur: ${err.message}` });
    } finally {
      setLoading(false);
    }
  };

  const handleCheckSyncStatus = async () => {
    if (syncStatusRows) {
      // toggle off si deja affiche
      setSyncStatusRows(null);
      setSyncStatusError(null);
      return;
    }
    setSyncStatusLoading(true);
    setSyncStatusError(null);
    try {
      const rows = await fetchSyncStatus();
      setSyncStatusRows(rows);
    } catch (err) {
      setSyncStatusError(`Erreur: ${err.message}`);
    } finally {
      setSyncStatusLoading(false);
    }
  };

  const handleRefreshExcelAutoFiles = async () => {
    setExcelRefreshLoading(true);
    setExcelRefreshStatus({ status: 'loading', message: 'Rafraîchissement en cours...' });
    try {
      const { globalFilesResult, catResult } = await refreshGlobalFilesAndCategorisation();
      const parts = [];
      if (globalFilesResult.bc) parts.push(`${globalFilesResult.bc.added} lignes BC`);
      if (globalFilesResult.suiviCmd) parts.push(`${globalFilesResult.suiviCmd.added} commandes`);
      if (catResult) parts.push(`${catResult.detail} lignes catégorisation, ${catResult.source} articles`);
      setExcelRefreshStatus({
        status: 'success',
        message: parts.length > 0 ? `Mis à jour : ${parts.join(' · ')}` : 'Déjà à jour, rien de nouveau.',
      });
      onDataImported();
    } catch (err) {
      setExcelRefreshStatus({ status: 'error', message: `Erreur: ${err.message}` });
    } finally {
      setExcelRefreshLoading(false);
    }
  };

  const handleClear = async () => {
    if (window.confirm('Supprimer toutes les données importées ?')) {
      await clearAllData();
      setBcStatus(null);
      setCmdStatus(null);
      setCatStatus(null);
      setApiStatus(null);
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

      {/* Selecteur de mode : Excel (upload manuel) et Base (synchro SIGA) sont
          deux modes independants, chacun avec ses propres donnees isolees. */}
      <div style={{
        display: 'flex', justifyContent: 'center', gap: 8,
        marginBottom: 20,
      }}>
        <button
          onClick={() => handleModeChange('excel')}
          style={{
            padding: '8px 18px', borderRadius: 8, fontSize: '0.82rem', fontWeight: 600,
            border: mode === 'excel' ? '1px solid #c17550' : '1px solid var(--border-light)',
            background: mode === 'excel' ? '#f3e0d5' : 'white',
            color: mode === 'excel' ? '#c17550' : 'var(--text-secondary)',
            cursor: 'pointer',
          }}
        >
          <FileSpreadsheet size={14} style={{ marginRight: 6, verticalAlign: 'middle' }} />
          Mode Excel
        </button>
        <button
          onClick={() => handleModeChange('api')}
          style={{
            padding: '8px 18px', borderRadius: 8, fontSize: '0.82rem', fontWeight: 600,
            border: mode === 'api' ? '1px solid #2f6fb0' : '1px solid var(--border-light)',
            background: mode === 'api' ? '#eaf1fb' : 'white',
            color: mode === 'api' ? '#2f6fb0' : 'var(--text-secondary)',
            cursor: 'pointer',
          }}
        >
          <RefreshCw size={14} style={{ marginRight: 6, verticalAlign: 'middle' }} />
          Mode Base de données
        </button>
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
                {dataCounts.categorisationCount > 0 && ` · ${dataCounts.categorisationCount} lignes de catégorisation`}
                {dataCounts.articleCategorisationCount > 0 && ` · ${dataCounts.articleCategorisationCount} articles catégorisés`}
              </div>
              <div style={{ color: 'var(--text-muted)', fontSize: '0.72rem' }}>Données actuellement en base ({mode === 'excel' ? 'mode Excel' : 'mode Base de données'})</div>
            </div>
          </div>
          <button className="btn btn-danger" onClick={handleClear} style={{ fontSize: '0.75rem', padding: '6px 12px' }}>
            <Trash2 size={13} /> Effacer
          </button>
        </div>
      )}

      {/* Synchronisation base de données (mode temps réel) — visible uniquement en mode Base */}
      {mode === 'api' && <div style={{
        marginBottom: 12, padding: '12px 16px',
        background: '#eaf1fb', borderRadius: 10,
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        border: '1px solid #c9dcf5',
        flexWrap: 'wrap', gap: 10,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <RefreshCw size={18} style={{ color: '#2f6fb0' }} />
          <div>
            <div style={{ fontWeight: 600, fontSize: '0.82rem', color: 'var(--text-primary)' }}>
              Synchroniser depuis la base SIGA
            </div>
            <div style={{ color: 'var(--text-muted)', fontSize: '0.72rem' }}>
              Alternative aux fichiers Excel — données mises à jour en continu
            </div>
          </div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <input
            type="date"
            value={syncDate}
            onChange={e => setSyncDate(e.target.value)}
            style={{ fontSize: '0.75rem', padding: '5px 8px', borderRadius: 6, border: '1px solid var(--border-light)' }}
          />
          <button className="btn" onClick={handleApiSync} disabled={loading} style={{ fontSize: '0.75rem', padding: '6px 12px' }}>
            <RefreshCw size={13} /> Synchroniser
          </button>
          <button className="btn" onClick={handleCheckSyncStatus} disabled={syncStatusLoading} style={{ fontSize: '0.75rem', padding: '6px 12px' }}>
            <Clock size={13} /> {syncStatusRows ? 'Masquer la date de synchro' : (syncStatusLoading ? 'Chargement...' : 'Date de synchronisation')}
          </button>
        </div>
      </div>}
      {mode === 'api' && syncStatusError && (
        <div style={{
          marginBottom: 12, padding: '8px 16px', borderRadius: 8,
          fontSize: '0.78rem', fontWeight: 500,
          background: 'var(--danger-light)', color: 'var(--danger)',
        }}>
          {syncStatusError}
        </div>
      )}
      {mode === 'api' && syncStatusRows && (
        <div style={{
          marginBottom: 16, padding: '12px 16px', borderRadius: 10,
          background: 'white', border: '1px solid var(--border-light)',
        }}>
          <div style={{ fontWeight: 600, fontSize: '0.82rem', marginBottom: 8, display: 'flex', alignItems: 'center', gap: 6 }}>
            <Clock size={15} style={{ color: '#2f6fb0' }} />
            Date de synchronisation (polling) par table
          </div>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.78rem' }}>
            <thead>
              <tr style={{ textAlign: 'left', color: 'var(--text-muted)' }}>
                <th style={{ padding: '4px 8px' }}>Table source</th>
                <th style={{ padding: '4px 8px' }}>Dernier polling</th>
                <th style={{ padding: '4px 8px' }}>Ancienneté</th>
                <th style={{ padding: '4px 8px' }}>Dernière donnée modifiée</th>
              </tr>
            </thead>
            <tbody>
              {syncStatusRows.map(r => {
                // L'anciennete se base sur le heartbeat de polling (derniereExecution),
                // pas sur dernierDatEcr : une table sans donnee nouvelle depuis des jours
                // (ex: FACT_FRN) reste "a jour" tant que le pipeline tourne bien.
                const heartbeat = r.derniereExecution || r.dernierDatEcr;
                const minutesElapsed = heartbeat ? Math.floor((Date.now() - heartbeat.getTime()) / 60000) : null;
                const days = minutesElapsed !== null ? Math.floor(minutesElapsed / 1440) : null;
                const color = minutesElapsed === null ? 'var(--text-muted)' : minutesElapsed < 5 ? 'var(--success)' : days <= 1 ? '#d99a00' : 'var(--danger)';
                let anciennete = '—';
                if (minutesElapsed !== null) {
                  if (minutesElapsed < 60) anciennete = `${minutesElapsed} min`;
                  else if (minutesElapsed < 1440) anciennete = `${Math.floor(minutesElapsed / 60)} h ${minutesElapsed % 60} min`;
                  else anciennete = `${days} j`;
                }
                return (
                  <tr key={r.tableSource} style={{ borderTop: '1px solid var(--border-light)' }}>
                    <td style={{ padding: '4px 8px', fontWeight: 500 }}>{r.tableSource}</td>
                    <td style={{ padding: '4px 8px' }}>{heartbeat ? heartbeat.toLocaleString('fr-FR') : '—'}</td>
                    <td style={{ padding: '4px 8px', color, fontWeight: 600 }}>
                      {anciennete}
                    </td>
                    <td style={{ padding: '4px 8px', color: 'var(--text-muted)' }}>
                      {r.dernierDatEcr ? r.dernierDatEcr.toLocaleString('fr-FR') : '—'}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
      {mode === 'api' && apiStatus && (
        <div style={{
          marginBottom: 16, padding: '8px 16px', borderRadius: 8,
          display: 'flex', alignItems: 'center', gap: 6,
          fontSize: '0.78rem', fontWeight: 500,
          background: apiStatus.status === 'success' ? 'var(--success-light)' :
                      apiStatus.status === 'error' ? 'var(--danger-light)' : 'transparent',
          color: apiStatus.status === 'success' ? 'var(--success)' :
                 apiStatus.status === 'error' ? 'var(--danger)' : 'var(--text-secondary)',
        }}>
          {apiStatus.status === 'success' && <CheckCircle2 size={14} />}
          {apiStatus.status === 'error' && <AlertCircle size={14} />}
          {apiStatus.message}
        </div>
      )}

      {/* Rafraichissement automatique (fichiers globaux + categorisation) — mode Excel */}
      {mode === 'excel' && <div style={{
        marginBottom: 16, padding: '12px 16px',
        background: '#f3e0d5', borderRadius: 10,
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        border: '1px solid #e0c3b0',
        flexWrap: 'wrap', gap: 10,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <RefreshCw size={18} style={{ color: '#c17550' }} />
          <div>
            <div style={{ fontWeight: 600, fontSize: '0.82rem', color: 'var(--text-primary)' }}>
              Rafraîchir automatiquement
            </div>
            <div style={{ color: 'var(--text-muted)', fontSize: '0.72rem' }}>
              Relit Suivi_CMD_Global, ListePeriodiqueBC_Global et la catégorisation depuis le serveur — sans upload manuel
            </div>
          </div>
        </div>
        <button className="btn" onClick={handleRefreshExcelAutoFiles} disabled={excelRefreshLoading} style={{ fontSize: '0.75rem', padding: '6px 12px' }}>
          <RefreshCw size={13} /> {excelRefreshLoading ? 'Rafraîchissement...' : 'Rafraîchir'}
        </button>
      </div>}
      {mode === 'excel' && excelRefreshStatus && (
        <div style={{
          marginBottom: 16, padding: '8px 16px', borderRadius: 8,
          display: 'flex', alignItems: 'center', gap: 6,
          fontSize: '0.78rem', fontWeight: 500,
          background: excelRefreshStatus.status === 'success' ? 'var(--success-light)' :
                      excelRefreshStatus.status === 'error' ? 'var(--danger-light)' : 'transparent',
          color: excelRefreshStatus.status === 'success' ? 'var(--success)' :
                 excelRefreshStatus.status === 'error' ? 'var(--danger)' : 'var(--text-secondary)',
        }}>
          {excelRefreshStatus.status === 'success' && <CheckCircle2 size={14} />}
          {excelRefreshStatus.status === 'error' && <AlertCircle size={14} />}
          {excelRefreshStatus.message}
        </div>
      )}

      {/* Upload boxes side by side — visibles uniquement en mode Excel (import manuel, alternative au bouton ci-dessus) */}
      {mode === 'excel' && <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 16 }}>
        <UploadBox
          step="1"
          label="Bons de Commande"
          detail="Articles, prix, fournisseurs"
          description="ListePeriodiqueBC"
          inputRef={bcRef}
          onFile={f => handleFile(f, 'bc')}
          status={bcStatus}
          accept=".xlsx,.xls"
          color="#c17550"
          bgColor="#f3e0d5"
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
      </div>}

      <div style={{ maxWidth: 420, margin: '0 auto', display: 'grid', gap: 12 }}>
        <UploadBox
          step="3"
          label="Catégorisation (optionnel)"
          detail="Structure × Catégorie × Nature (+ détail par article si feuille Source)"
          description="stats_structure_sous_type"
          inputRef={catRef}
          onFile={f => handleFile(f, 'cat')}
          status={catStatus}
          accept=".xlsx,.xls"
          color="#8a9a5b"
          bgColor="#eef0e2"
        />
      </div>

    </div>
  );
}