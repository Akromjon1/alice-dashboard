import { useState, useEffect } from 'react';
import { isConfigured } from './api';
import { LayoutDashboard, Bot, Puzzle, Settings as SettingsIcon, Sun, Moon, Youtube, Crosshair, Trophy, Clock, HelpCircle, ClipboardList } from 'lucide-react';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import MissionControl from './pages/MissionControl';
import Agents from './pages/Agents';
import Skills from './pages/Skills';
import Settings from './pages/Settings';
import YouTubePage from './pages/YouTube';
import Matches from './pages/Matches';
import CronJobs from './pages/CronJobs';
import PlanPage from './pages/Plan';
import KeyboardShortcuts from './pages/KeyboardShortcuts';

type Page = 'mission' | 'plan' | 'dashboard' | 'agents' | 'matches' | 'youtube' | 'cron' | 'skills' | 'settings';

export default function App() {
  const [loggedIn, setLoggedIn] = useState(isConfigured());
  const [page, setPage] = useState<Page>('mission');
  const [showShortcuts, setShowShortcuts] = useState(false);
  const [theme, setTheme] = useState<'dark' | 'light'>(() => {
    return (localStorage.getItem('alice-theme') as 'dark' | 'light') || 'dark';
  });

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem('alice-theme', theme);
  }, [theme]);

  // Global keyboard shortcuts
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement;
      const isInput = target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.tagName === 'SELECT' || target.isContentEditable;

      if (e.key === 'Escape' && showShortcuts) {
        setShowShortcuts(false);
        return;
      }

      if (isInput) return;

      if (e.key === '?') {
        e.preventDefault();
        setShowShortcuts(prev => !prev);
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [showShortcuts]);

  if (!loggedIn) {
    return <Login onLogin={() => setLoggedIn(true)} />;
  }

  const nav = [
    { id: 'mission' as Page, label: 'Mission Control', icon: Crosshair },
    { id: 'plan' as Page, label: 'Daily Plan', icon: ClipboardList },
    { id: 'dashboard' as Page, label: 'System', icon: LayoutDashboard },
    { id: 'agents' as Page, label: 'Agents', icon: Bot },
    { id: 'matches' as Page, label: 'Matches', icon: Trophy },
    { id: 'youtube' as Page, label: 'YouTube', icon: Youtube },
    { id: 'cron' as Page, label: 'Cron Jobs', icon: Clock },
    { id: 'skills' as Page, label: 'Skills', icon: Puzzle },
    { id: 'settings' as Page, label: 'Settings', icon: SettingsIcon },
  ];

  const renderPage = () => {
    switch (page) {
      case 'mission': return <MissionControl />;
      case 'plan': return <PlanPage />;
      case 'dashboard': return <Dashboard />;
      case 'agents': return <Agents />;
      case 'matches': return <Matches />;
      case 'youtube': return <YouTubePage />;
      case 'cron': return <CronJobs />;
      case 'skills': return <Skills />;
      case 'settings': return <Settings onLogout={() => setLoggedIn(false)} />;
    }
  };

  return (
    <div className="app">
      <div className="sidebar">
        <div className="sidebar-header">
          <h1>⚡ Alice</h1>
          <div className="status online">
            <span className="status-pulse" />
            Connected
          </div>
        </div>
        {nav.map(item => (
          <div
            key={item.id}
            className={`nav-item ${page === item.id ? 'active' : ''}`}
            onClick={() => setPage(item.id)}
          >
            <item.icon size={18} />
            {item.label}
          </div>
        ))}
        <div className="sidebar-footer">
          <div
            className="theme-toggle"
            onClick={() => setShowShortcuts(true)}
            style={{ marginBottom: 4, cursor: 'pointer' }}
          >
            <HelpCircle size={18} />
            Shortcuts
          </div>
          <div
            className="theme-toggle"
            onClick={() => setTheme(t => t === 'dark' ? 'light' : 'dark')}
          >
            {theme === 'dark' ? <Sun size={18} /> : <Moon size={18} />}
            {theme === 'dark' ? 'Light Mode' : 'Dark Mode'}
          </div>
        </div>
      </div>
      <div className="main">
        {renderPage()}
      </div>

      {showShortcuts && <KeyboardShortcuts onClose={() => setShowShortcuts(false)} />}
    </div>
  );
}
