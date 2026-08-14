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
import { getAllBonsCommande, getAllSuiviCmd, getDataCounts } from './utils/storage';
import {
  computeKPIs, computeDelays, computeSupplierStats,
  computeArticleStats, computePaymentAlerts,
  computeStructureStats, computeMissingDocs, computeSeasonality
} from './utils/stats';
import { Upload } from 'lucide-react';

export default function App() {
  const [activePage, setActivePage] = useState('import');
  const [dataCounts, setDataCounts] = useState({ bcCount: 0, cmdCount: 0 });
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);

  const refreshData = useCallback(async () => {
    setLoading(true);
    try {
      const counts = await getDataCounts();
      setDataCounts(counts);

      if (counts.bcCount > 0 || counts.cmdCount > 0) {
        const [bcs, cmds] = await Promise.all([
          getAllBonsCommande(),
          getAllSuiviCmd()
        ]);

        const kpis = computeKPIs(cmds, bcs);
        const delays = computeDelays(cmds);
        const supplierStats = computeSupplierStats(cmds);
        const articleStats = computeArticleStats(bcs);
        const paymentAlerts = computePaymentAlerts(cmds);
        const structureStats = computeStructureStats(bcs);
        const missingDocs = computeMissingDocs(cmds);
        const seasonality = computeSeasonality(cmds);

        setStats({
          kpis, delays, supplierStats, articleStats,
          paymentAlerts, structureStats, missingDocs, cmds, seasonality
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
        return <DelaysPage delays={stats.delays} />;
      case 'suppliers':
        return <SuppliersPage supplierStats={stats.supplierStats} />;
      case 'articles':
        return <ArticlesPage articleStats={stats.articleStats} />;
      // alerts supprimé — intégré dans Vue d'ensemble
      case 'structures':
        return <StructuresPage structureStats={stats.structureStats} />;
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
