import React, { useState, useEffect } from 'react';
import { Clock, RefreshCw, Wifi, WifiOff, Database } from 'lucide-react';
import { useApp } from '../../context/AppContext';
import './Topbar.css';

export default function Topbar() {
  const { connected, wsConnected, refresh, loading } = useApp();
  const [now, setNow] = useState(new Date());
  const [spinning, setSpinning] = useState(false);

  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(t);
  }, []);

  const dateStr = now.toLocaleDateString('en-US', { month: 'numeric', day: 'numeric', year: 'numeric' });
  const timeStr = now.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', second: '2-digit' });

  async function handleRefresh() {
    setSpinning(true);
    await refresh();
    setTimeout(() => setSpinning(false), 800);
  }

  return (
    <header className="topbar">
      <div className="topbar__left" />
      <div className="topbar__right">

        {/* Clock */}
        <div className="topbar__clock">
          <Clock size={14} />
          <span>{dateStr} | {timeStr}</span>
        </div>

        {/* WebSocket status */}
        <div className={`topbar__status ${wsConnected ? 'connected' : 'disconnected'}`}
             title={wsConnected ? 'WebSocket live' : 'WebSocket disconnected'}>
          {wsConnected
            ? <Wifi size={13} />
            : <WifiOff size={13} />}
          <span>{wsConnected ? 'Live' : 'WS Off'}</span>
        </div>

        {/* DB / API status */}
        <div className={`topbar__status ${connected ? 'connected' : 'disconnected'}`}
             title={connected ? 'Database connected' : 'Database unreachable'}>
          <span className="topbar__status-dot" />
          <Database size={13} />
          <span>{connected ? 'DB OK' : 'DB Off'}</span>
        </div>

        {/* Refresh — only refreshes DB data, never touches WebSocket */}
        <button
          className={`topbar__refresh ${spinning ? 'spinning' : ''}`}
          onClick={handleRefresh}
          disabled={loading || spinning}
          title="Refresh data from database (does not reset WebSocket)"
        >
          <RefreshCw size={15} />
        </button>
      </div>
    </header>
  );
}
