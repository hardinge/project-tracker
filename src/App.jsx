import { useState } from 'react';
import ProjectTracker from './ProjectTracker.jsx';
import WeekTab from './WeekTab.jsx';
import NowTab from './NowTab.jsx';

const TABS = [
  { id: 'now',      label: 'Now' },
  { id: 'week',     label: 'Week' },
  { id: 'database', label: 'Database' },
  { id: 'view3',    label: 'View 3' },
];

const TAB_H = 34;

export default function App() {
  const [activeTab, setActiveTab] = useState('now');

  return (
    <div style={{
      display: 'flex', flexDirection: 'column',
      height: '100vh', overflow: 'hidden',
    }}>
      {/* Content area */}
      <div style={{ flex: 1, overflow: 'hidden', position: 'relative' }}>
        {TABS.map(tab => (
          <div
            key={tab.id}
            style={{
              display: activeTab === tab.id ? 'flex' : 'none',
              flexDirection: 'column',
              height: '100%', width: '100%',
            }}
          >
            {tab.id === 'database' ? (
              <ProjectTracker />
            ) : tab.id === 'week' ? (
              <WeekTab />
            ) : tab.id === 'now' ? (
              <NowTab />
            ) : (
              <div style={{ flex: 1, background: '#0f1117' }} />
            )}
          </div>
        ))}
      </div>

      {/* Tab bar */}
      <div style={{
        display: 'flex', alignItems: 'flex-end',
        background: '#0a0c14',
        borderTop: '1px solid #1e2235',
        height: TAB_H, flexShrink: 0,
        padding: '0 12px', gap: 3,
        fontFamily: "'DM Mono','Fira Code',monospace",
      }}>
        {TABS.map(tab => {
          const active = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              style={{
                height: active ? TAB_H : TAB_H - 5,
                padding: '0 18px',
                background: active ? '#1a1d2e' : '#111420',
                color: active ? '#e2e8f0' : '#4a5568',
                border: '1px solid',
                borderColor: active ? '#2d3149' : '#1a1d2e',
                borderBottom: active ? '1px solid #1a1d2e' : '1px solid #111420',
                borderRadius: '5px 5px 0 0',
                cursor: 'pointer',
                fontSize: 12,
                fontFamily: 'inherit',
                fontWeight: active ? 700 : 400,
                letterSpacing: 0.5,
                outline: 'none',
                alignSelf: 'flex-end',
                transition: 'color 0.1s, background 0.1s',
              }}
            >
              {tab.label}
            </button>
          );
        })}
      </div>
    </div>
  );
}
