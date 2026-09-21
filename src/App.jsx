import React, { useState, useEffect, useCallback } from 'react';
import TopNav from './components/TopNav';
import FileUpload from './components/FileUpload';
import DashboardPage from './pages/DashboardPage';
import DelaysPage from './pages/DelaysPage';
import ArticlesPage from './pages/ArticlesPage';
import AlertsPage from './pages/AlertsPage';
import StructuresPage from './pages/StructuresPage';
import AnomaliesPage from './pages/AnomaliesPage';
import EngagementsPage from './pages/EngagementsPage';
import ReportingPage from './pages/ReportingPage';
import InstancesPage from './pages/InstancesPage';
import { getAllBonsCommande, getAllSuiviCmd, getAllCategorisation, getAllArticleCategorisation, getAllStructureDirection, getDataCounts, getActiveMode } from './utils/storage';
import { syncFromApi } from './utils/apiSync';
import {
  computeKPIs, computeDelays, computeSupplierStats,
  computeArticleStats, computePaymentAlerts,
  computeStructureStats, computeMissingDocs, computeSeasonality,
  computeDependencyStats
} from './utils/stats';
import { Upload } from 'lucide-react';

export default function App() {
  const [activePage, setActivePage] = useState('import');
  const [mode, setMode] = useState(getActiveMode());
  const [dataCounts, setDataCounts] = useState({ bcCount: 0, cmdCount: 0, categorisationCount: 0 });
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);

  const refreshData = useCallback(async (opts = {}) => {
    const silent = !!opts.silent;
    if (!silent) setLoading(true);
    setMode(getActiveMode());
    try {
      const counts = await getDataCounts();
      setDataCounts(counts);

      if (counts.bcCount > 0 || counts.cmdCount > 0) {
        const [bcs, cmds, categorisation, articleCategorisation, structureDirection] = await Promise.all([
          getAllBonsCommande(),
          getAllSuiviCmd(),
          getAllCategorisation(),
          getAllArticleCategorisation(),
          getAllStructureDirection(),
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
          // Enrichir chaque article avec sa Nature (si catégorisation détaillée importée)
          const artsAvecNature = arts.map(a => {
            const cat = artCatByKey[`${a.numBC}-${a.codeArticle}`];
            return cat ? { ...a, natureArticle: cat.sousType } : a;
          });
          return { ...c, articles: artsAvecNature };
        });

        setStats({
          kpis, delays, supplierStats, articleStats,
          paymentAlerts, structureStats, missingDocs, cmds: cmdsEnrichies, seasonality, dependencyStats,
          categorisation, structureArticleDetail, structureDirection,
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
    if (!silent) setLoading(false);
  }, []);

  useEffect(() => {
    refreshData();
  }, [refreshData]);

  // Synchronisation automatique Postgres -> interface (mode Base uniquement).
  // Le backend (etl_pipeline.py) synchronise Oracle -> Postgres en continu ;
  // cet effet rapatrie ces donnees vers le tableau de bord sans action manuelle.
  useEffect(() => {
    if (mode !== 'api') return;
    const AUTO_SYNC_INTERVAL = 60000; // 60s, aligne sur le cycle de polling du backend
    const tick = async () => {
      try {
        await syncFromApi(null);
        await refreshData({ silent: true });
      } catch (err) {
        console.error('Auto-sync Postgres -> interface echouee:', err);
      }
    };
    const id = setInterval(tick, AUTO_SYNC_INTERVAL);
    return () => clearInterval(id);
  }, [mode, refreshData]);

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
        return <DelaysPage delays={stats.delays} cmds={stats.cmds} supplierStats={stats.supplierStats} />;
      case 'articles':
        return <ArticlesPage articleStats={stats.articleStats} />;
      // alerts supprimé — intégré dans Vue d'ensemble
      case 'engagements':
        return <EngagementsPage cmds={stats.cmds} />;
      case 'reporting':
        return mode === 'api'
          ? <ReportingPage cmds={stats.cmds} />
          : (
            <div className="empty-state">
              <h2>Disponible en mode Base uniquement</h2>
              <p>Le Reporting Journalier s'appuie sur les demandes d'achat synchronisées depuis la base de données. Passez en mode Base (onglet Import) pour y accéder.</p>
            </div>
          );
      case 'structures':
        return <StructuresPage structureStats={stats.structureStats} categorisation={stats.categorisation} structureArticleDetail={stats.structureArticleDetail} />;
      case 'instances':
        return <InstancesPage cmds={stats.cmds} structureDirection={stats.structureDirection} />;
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
        mode={mode}
      />
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