import { useState } from 'react';
import ProjectTracker from './ProjectTracker.jsx';
import WeekTab from './WeekTab.jsx';
import NowTab from './NowTab.jsx';

const TABS = [
  { id: 'now',      label: 'Now' },
  { id: 'database', label: 'Database' },
  { id: 'week',     label: 'Week' },
  { id: 'view3',    label: 'View 3' },
];

const TAB_H = 34;

export default function App() {
  const [activeTab, setActiveTab] = useState('now');
  const [rowInfo, setRowInfo]     = useState({ rowNum: 1, total: 0, selType: 'Area', typeColor: '#e94560' });

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
              <ProjectTracker onRowInfoChange={setRowInfo} />
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

        {/* Row number + type callout — shown only on the Database tab */}
        {activeTab === 'database' && (
          <div style={{
            marginLeft: 'auto', alignSelf: 'center',
            display: 'flex', alignItems: 'center', gap: 14,
            fontSize: 12, fontFamily: "'DM Mono','Fira Code',monospace",
            paddingRight: 8,
          }}>
            <span style={{ color: '#475569' }}>
              Row <span style={{ color: '#94a3b8' }}>{rowInfo.rowNum}</span>
              {' / '}{rowInfo.total}
            </span>
            <span style={{ color: '#475569' }}>
              Type:{' '}
              <span style={{ color: rowInfo.typeColor, fontWeight: 700 }}>{rowInfo.selType}</span>
            </span>
          </div>
        )}
      </div>
    </div>
  );
}
