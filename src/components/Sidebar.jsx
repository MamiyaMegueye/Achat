import React from 'react';
import {
  LayoutDashboard, Upload, TrendingUp, Users, Package,
  AlertTriangle, Building2, FileWarning, ChevronRight
} from 'lucide-react';

const navItems = [
  { id: 'dashboard', label: 'Vue d\'ensemble', icon: LayoutDashboard },
  { id: 'delays', label: 'Analyse des Délais', icon: TrendingUp },
  { id: 'suppliers', label: 'Fournisseurs', icon: Users },
  { id: 'articles', label: 'Articles & Prix', icon: Package },
  { id: 'alerts', label: 'Alertes Paiement', icon: AlertTriangle },
  { id: 'structures', label: 'Par Structure', icon: Building2 },
  { id: 'anomalies', label: 'Anomalies', icon: FileWarning },
];

export default function Sidebar({ activePage, onNavigate, dataLoaded }) {
  return (
    <aside style={{
      width: 260,
      background: 'var(--bg-sidebar)',
      position: 'fixed',
      top: 0,
      left: 0,
      bottom: 0,
      display: 'flex',
      flexDirection: 'column',
      zIndex: 100,
    }}>
      {/* Logo */}
      <div style={{
        padding: '28px 24px 20px',
        borderBottom: '1px solid rgba(255,255,255,0.06)',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <div style={{
            width: 36, height: 36, borderRadius: 10,
            background: 'linear-gradient(135deg, var(--accent-primary), #e8a963)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            color: 'white', fontWeight: 700, fontSize: '0.9rem',
          }}>
            SN
          </div>
          <div>
            <div style={{ color: 'var(--text-inverse)', fontWeight: 700, fontSize: '0.95rem' }}>
              SNDE
            </div>
            <div style={{ color: 'var(--text-muted)', fontSize: '0.7rem', letterSpacing: '0.05em' }}>
              Direction des Achats
            </div>
          </div>
        </div>
      </div>

      {/* Import button */}
      <div style={{ padding: '16px 16px 8px' }}>
        <button
          onClick={() => onNavigate('import')}
          style={{
            width: '100%',
            padding: '10px 16px',
            borderRadius: 'var(--radius-sm)',
            border: activePage === 'import' ? '1px solid var(--accent-primary)' : '1px solid rgba(255,255,255,0.08)',
            background: activePage === 'import' ? 'var(--accent-primary)' : 'rgba(255,255,255,0.04)',
            color: activePage === 'import' ? 'white' : 'var(--text-sidebar)',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: 10,
            fontSize: '0.82rem',
            fontWeight: 500,
            transition: 'all 0.2s',
          }}
        >
          <Upload size={16} />
          Importer des fichiers
        </button>
      </div>

      {/* Nav */}
      <nav style={{ flex: 1, padding: '8px 12px', overflowY: 'auto' }}>
        <div style={{
          fontSize: '0.65rem', fontWeight: 600, color: 'var(--text-muted)',
          textTransform: 'uppercase', letterSpacing: '0.08em',
          padding: '16px 12px 8px',
        }}>
          Statistiques
        </div>
        {navItems.map(item => {
          const active = activePage === item.id;
          const Icon = item.icon;
          return (
            <button
              key={item.id}
              onClick={() => dataLoaded && onNavigate(item.id)}
              disabled={!dataLoaded}
              style={{
                width: '100%',
                padding: '9px 12px',
                borderRadius: 'var(--radius-xs)',
                border: 'none',
                background: active ? 'var(--bg-sidebar-active)' : 'transparent',
                color: !dataLoaded ? 'rgba(255,255,255,0.15)' : active ? 'white' : 'var(--text-sidebar)',
                cursor: dataLoaded ? 'pointer' : 'not-allowed',
                display: 'flex',
                alignItems: 'center',
                gap: 10,
                fontSize: '0.82rem',
                fontWeight: active ? 600 : 400,
                textAlign: 'left',
                marginBottom: 2,
                transition: 'all 0.15s',
              }}
              onMouseEnter={e => {
                if (dataLoaded && !active) e.currentTarget.style.background = 'var(--bg-sidebar-hover)';
              }}
              onMouseLeave={e => {
                if (!active) e.currentTarget.style.background = 'transparent';
              }}
            >
              <Icon size={16} style={{ opacity: dataLoaded ? 0.7 : 0.2 }} />
              <span style={{ flex: 1 }}>{item.label}</span>
              {active && <ChevronRight size={14} style={{ opacity: 0.4 }} />}
            </button>
          );
        })}
      </nav>

      {/* Footer */}
      <div style={{
        padding: '16px 20px',
        borderTop: '1px solid rgba(255,255,255,0.06)',
        fontSize: '0.7rem',
        color: 'var(--text-muted)',
      }}>
        Tableau de Bord Achats v1.0
      </div>
    </aside>
  );
}
