import { useState, useEffect } from 'react';
import ProjectTracker from './ProjectTracker.jsx';
import Login from './Login.jsx';
import { checkAuth } from './storage.js';

export default function App() {
  // null = checking session, false = need login, true = authenticated
  const [authed, setAuthed] = useState(null);

  useEffect(() => {
    checkAuth().then(ok => setAuthed(ok));
  }, []);

  if (authed === null) {
    return (
      <div style={{
        height: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center',
        background: '#0f1117', fontFamily: "'DM Mono','Fira Code',monospace",
        color: '#475569', fontSize: 15,
      }}>
        Loading…
      </div>
    );
  }

  if (!authed) {
    return <Login onLogin={() => setAuthed(true)} />;
  }

  return <ProjectTracker onLogout={() => setAuthed(false)} />;
}
