import React from 'react';
import {
  LayoutDashboard, Upload, Clock, Package,
  AlertTriangle, Building2, FileWarning, Wallet, CalendarCheck, ListChecks
} from 'lucide-react';

const navItems = [
  { id: 'import', label: 'Import', icon: Upload },
  { id: 'dashboard', label: 'Vue d\'ensemble', icon: LayoutDashboard },
  { id: 'articles', label: 'Articles & Prix', icon: Package },
  { id: 'instances', label: 'Instances', icon: ListChecks },
  { id: 'reporting', label: 'Reporting Journalier', icon: CalendarCheck },
  { id: 'delays', label: 'Délais & Fournisseurs', icon: Clock },
  { id: 'engagements', label: 'Échéancier de paiement', icon: Wallet },
  { id: 'structures', label: 'Structures', icon: Building2 },
  { id: 'anomalies', label: 'Anomalies', icon: FileWarning },
];

export default function TopNav({ activePage, onNavigate, dataLoaded, mode }) {
  return (
    <header className="top-nav">
      {/* Brand */}
      <div className="top-nav-brand">
        <div className="top-nav-logo">SN</div>
        <div className="top-nav-brand-text">
          <span className="top-nav-title">SNDE</span>
          <span className="top-nav-subtitle">Direction des Achats</span>
        </div>
      </div>

      {/* Tabs */}
      <nav className="top-nav-tabs">
        {navItems.map(item => {
          const active = activePage === item.id;
          const Icon = item.icon;
          const needsApiMode = item.id === 'reporting' && mode !== 'api';
          const disabled = (item.id !== 'import' && !dataLoaded) || needsApiMode;
          return (
            <button
              key={item.id}
              onClick={() => !disabled && onNavigate(item.id)}
              disabled={disabled}
              title={needsApiMode ? 'Disponible en mode Base uniquement' : undefined}
              className={`top-nav-tab ${active ? 'active' : ''}`}
            >
              <Icon size={15} />
              <span>{item.label}</span>
            </button>
          );
        })}
      </nav>
    </header>
  );
}