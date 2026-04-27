import React, { useState, useEffect } from 'react';
import { Clock, RefreshCw } from 'lucide-react';
import { useApp } from '../../context/AppContext';
import './Topbar.css';

export default function Topbar() {
  const { connected, refresh } = useApp();
  const [now, setNow] = useState(new Date());

  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(t);
  }, []);

  const dateStr = now.toLocaleDateString('en-US', { month: 'numeric', day: 'numeric', year: 'numeric' });
  const timeStr = now.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', second: '2-digit' });

  return (
    <header className="topbar">
      <div className="topbar__left" />
      <div className="topbar__right">
        <div className="topbar__clock">
          <Clock size={14} />
          <span>{dateStr} | {timeStr}</span>
        </div>
        <div className={`topbar__status ${connected ? 'connected' : 'disconnected'}`}>
          <span className="topbar__status-dot" />
          <span>{connected ? 'Connected' : 'Disconnected'}</span>
        </div>
        <button className="topbar__refresh" onClick={refresh} title="Refresh data">
          <RefreshCw size={15} />
        </button>
      </div>
    </header>
  );
}
