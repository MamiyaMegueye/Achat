import React from 'react';
import {
  LayoutDashboard, Upload, Clock, Users, Package,
  AlertTriangle, Building2, FileWarning
} from 'lucide-react';

const navItems = [
  { id: 'import', label: 'Import', icon: Upload },
  { id: 'dashboard', label: 'Vue d\'ensemble', icon: LayoutDashboard },
  { id: 'delays', label: 'Délais', icon: Clock },
  { id: 'suppliers', label: 'Fournisseurs', icon: Users },
  { id: 'articles', label: 'Articles & Prix', icon: Package },
  { id: 'alerts', label: 'Alertes', icon: AlertTriangle },
  { id: 'structures', label: 'Structures', icon: Building2 },
  { id: 'anomalies', label: 'Anomalies', icon: FileWarning },
];

export default function TopNav({ activePage, onNavigate, dataLoaded }) {
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
          const disabled = item.id !== 'import' && !dataLoaded;
          return (
            <button
              key={item.id}
              onClick={() => !disabled && onNavigate(item.id)}
              disabled={disabled}
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
