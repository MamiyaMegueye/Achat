import React, { useState, useEffect, useCallback } from 'react';
import TopNav from './components/TopNav';
import FileUpload from './components/FileUpload';
import DashboardPage from './pages/DashboardPage';
import DelaysPage from './pages/DelaysPage';
import SuppliersPage from './pages/SuppliersPage';
import ArticlesPage from './pages/ArticlesPage';
import AlertsPage from './pages/AlertsPage';
import StructuresPage from './pages/StructuresPage';
import AnomaliesPage from './pages/AnomaliesPage';
import EngagementsPage from './pages/EngagementsPage';
import { getAllBonsCommande, getAllSuiviCmd, getAllCategorisation, getAllArticleCategorisation, getDataCounts } from './utils/storage';
import {
  computeKPIs, computeDelays, computeSupplierStats,
  computeArticleStats, computePaymentAlerts,
  computeStructureStats, computeMissingDocs, computeSeasonality,
  computeDependencyStats
} from './utils/stats';
import { Upload, FileDown } from 'lucide-react';
import { exportAllPagesPdf } from './utils/exportPdf';

export default function App() {
  const [activePage, setActivePage] = useState('import');
  const [dataCounts, setDataCounts] = useState({ bcCount: 0, cmdCount: 0, categorisationCount: 0 });
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [exporting, setExporting] = useState(false);
  const [exportProgress, setExportProgress] = useState('');

  const handleExportPdf = async () => {
    const originalPage = activePage;
    setExporting(true);
    try {
      await exportAllPagesPdf(setActivePage, (current, total, label) => {
        setExportProgress(`${label} (${current}/${total})`);
      });
    } catch (err) {
      console.error('Export PDF error:', err);
    }
    setActivePage(originalPage);
    setExporting(false);
    setExportProgress('');
  };

  const refreshData = useCallback(async () => {
    setLoading(true);
    try {
      const counts = await getDataCounts();
      setDataCounts(counts);

      if (counts.bcCount > 0 || counts.cmdCount > 0) {
        const [bcs, cmds, categorisation, articleCategorisation] = await Promise.all([
          getAllBonsCommande(),
          getAllSuiviCmd(),
          getAllCategorisation(),
          getAllArticleCategorisation(),
        ]);

        const kpis = computeKPIs(cmds, bcs);
        const delays = computeDelays(cmds);
        const supplierStats = computeSupplierStats(cmds);
        const articleStats = computeArticleStats(bcs);

        // Enrichir le référentiel prix avec la Nature d'article — jointure par (N° BC + Code Article)
        const artCatByKey = {};
        articleCategorisation.forEach(a => { artCatByKey[`${a.numBC}-${a.codeArticle}`] = a; });

        if (articleCategorisation.length > 0) {
          let matched = 0, unmatched = 0;
          articleStats.referentiel = articleStats.referentiel.map(a => {
            // Chercher la nature via la première entrée (BC) qui matche ; à défaut, garder l'article tel quel
            let found = null;
            for (const e of a.entries) {
              const f = artCatByKey[`${e.numBC}-${a.code}`];
              if (f) { found = f; break; }
            }
            if (found) matched++; else unmatched++;
            return found
              ? { ...a, natureArticle: found.sousType, categorie: found.categorie, grandeCategorie: found.grandeCategorie }
              : a;
          });
          console.log(`[DIAG Nature] ${matched} articles matchés, ${unmatched} non matchés sur ${articleStats.referentiel.length}`);
          // Échantillon de clés pour comparaison manuelle
          const sampleArtCatKeys = Object.keys(artCatByKey).slice(0, 5);
          const sampleRefKeys = articleStats.referentiel.slice(0, 5).map(a => a.entries[0] ? `${a.entries[0].numBC}-${a.code}` : 'none');
          console.log('[DIAG Nature] Exemples clés catégorisation:', sampleArtCatKeys);
          console.log('[DIAG Nature] Exemples clés référentiel:', sampleRefKeys);
          window.__NATURE_DIAG = { matched, unmatched, sampleArtCatKeys, sampleRefKeys, artCatByKey, referentiel: articleStats.referentiel };
        }

        // Détail ligne par ligne Structure × N° BC × Code Article × Catégorie × Nature (pour la page Structures)
        const structureArticleDetail = articleCategorisation.length > 0
          ? bcs
              .map(bc => {
                const cat = artCatByKey[`${bc.numBC}-${bc.codeArticle}`];
                if (!cat) return null;
                return {
                  structure: bc.structure,
                  numBC: bc.numBC,
                  codeArticle: bc.codeArticle,
                  article: bc.article,
                  grandeCategorie: cat.grandeCategorie,
                  categorie: cat.categorie,
                  natureArticle: cat.sousType,
                  montantHT: bc.totalHT || 0,
                  fournisseur: bc.fournisseur,
                };
              })
              .filter(Boolean)
          : [];

        const paymentAlerts = computePaymentAlerts(cmds);
        const structureStats = computeStructureStats(bcs);
        const missingDocs = computeMissingDocs(cmds);
        const seasonality = computeSeasonality(cmds);
        const dependencyStats = computeDependencyStats(bcs);

        // Jointure BC → commandes sur (année + numéro) pour exposer les articles par commande
        const toNum = v => {
          if (v == null || v === '') return null;
          const n = Number(v);
          return isNaN(n) ? null : n;
        };
        const bcByKey = {};
        const bcByNum = {};
        bcs.forEach(bc => {
          const an = toNum(bc.annee);
          const num = toNum(bc.numBC);
          if (num == null) return;
          const key = `${an}-${num}`;
          if (!bcByKey[key]) bcByKey[key] = [];
          bcByKey[key].push(bc);
          if (!bcByNum[num]) bcByNum[num] = [];
          bcByNum[num].push(bc);
        });
        const cmdsEnrichies = cmds.map(c => {
          const an = toNum(c.anCmd);
          const num = toNum(c.numCmd);
          let arts = bcByKey[`${an}-${num}`];
          if (!arts || arts.length === 0) {
            // Repli : ignorer l'année si aucune correspondance exacte
            arts = bcByNum[num] || [];
          }
          return { ...c, articles: arts };
        });

        setStats({
          kpis, delays, supplierStats, articleStats,
          paymentAlerts, structureStats, missingDocs, cmds: cmdsEnrichies, seasonality, dependencyStats,
          categorisation, structureArticleDetail,
        });

        if (activePage === 'import' && counts.bcCount > 0 && counts.cmdCount > 0) {
          setActivePage('dashboard');
        }
      } else {
        setStats(null);
      }
    } catch (err) {
      console.error('Error loading data:', err);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    refreshData();
  }, [refreshData]);

  const dataLoaded = stats !== null;

  const renderPage = () => {
    if (activePage === 'import') {
      return <FileUpload onDataImported={refreshData} dataCounts={dataCounts} />;
    }

    if (!dataLoaded) {
      return (
        <div className="empty-state">
          <div className="empty-state-icon">
            <Upload size={32} style={{ color: 'var(--accent-primary)' }} />
          </div>
          <h2>Aucune donnée importée</h2>
          <p>Importez vos fichiers Excel pour afficher les statistiques</p>
          <button className="btn btn-primary" onClick={() => setActivePage('import')}>
            <Upload size={16} /> Importer des fichiers
          </button>
        </div>
      );
    }

    switch (activePage) {
      case 'dashboard':
        return <DashboardPage
          kpis={stats.kpis}
          delays={stats.delays}
          supplierStats={stats.supplierStats}
          paymentAlerts={stats.paymentAlerts}
          cmds={stats.cmds}
          seasonality={stats.seasonality}
        />;
      case 'delays':
        return <DelaysPage delays={stats.delays} cmds={stats.cmds} />;
      case 'suppliers':
        return <SuppliersPage supplierStats={stats.supplierStats} />;
      case 'articles':
        return <ArticlesPage articleStats={stats.articleStats} />;
      // alerts supprimé — intégré dans Vue d'ensemble
      case 'engagements':
        return <EngagementsPage cmds={stats.cmds} />;
      case 'structures':
        return <StructuresPage structureStats={stats.structureStats} categorisation={stats.categorisation} structureArticleDetail={stats.structureArticleDetail} />;
      case 'anomalies':
        return <AnomaliesPage missingDocs={stats.missingDocs} cmds={stats.cmds} />;
      default:
        return null;
    }
  };

  return (
    <div className="app-layout">
      <TopNav
        activePage={activePage}
        onNavigate={setActivePage}
        dataLoaded={dataLoaded}
        onExportPdf={handleExportPdf}
        exporting={exporting}
      />
      {exporting && (
        <div style={{
          position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
          background: 'rgba(0,0,0,0.4)', zIndex: 9999,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>
          <div style={{
            background: 'white', borderRadius: 12, padding: '30px 50px',
            boxShadow: '0 8px 32px rgba(0,0,0,0.2)', textAlign: 'center',
          }}>
            <div style={{ fontSize: '1rem', fontWeight: 600, color: '#333', marginBottom: 8 }}>
              Export PDF en cours...
            </div>
            <div style={{ fontSize: '0.85rem', color: '#c17550' }}>{exportProgress}</div>
          </div>
        </div>
      )}
      <main className="main-content">
        {loading ? (
          <div style={{
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            minHeight: '60vh', color: 'var(--text-secondary)'
          }}>
            Chargement...
          </div>
        ) : (
          renderPage()
        )}
      </main>
    </div>
  );
}