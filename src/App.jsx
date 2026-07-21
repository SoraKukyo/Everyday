import { useState } from 'react';
import EntryTracker from './engines/EntryTracker/EntryTracker';
import GenericEngine from './engines/GenericEngines';
import { engines, getModule, modules } from './config/modules';
import Dashboard from './dashboard/Dashboard';
import Goals from './meta/Goals';
import Backup from './meta/Backup';
import GlobalSearch from './meta/GlobalSearch';
import ConnectAI from './meta/ConnectAI';
import ErrorBoundary from './components/ErrorBoundary';
import everydayLogo from './assets/everyday-logo.svg';

export default function App() {
  const [activeId, setActiveId] = useState('dashboard');
  const [query, setQuery] = useState('');
  const active = getModule(activeId);
  const visible = modules.filter((module) => module.title.toLowerCase().includes(query.toLowerCase()));
  const nav = [
    ['dashboard', '⌂ Dashboard'], ['search', '⌕ Search'], ['goals', '◎ Goals'], ['backup', '⇩ Backup'], ['connect-ai', '✦ Connect to AI'],
  ];
  const content = activeId === 'dashboard' ? <Dashboard onOpen={setActiveId} /> : activeId === 'search' ? <GlobalSearch onOpen={setActiveId} /> : activeId === 'goals' ? <Goals /> : activeId === 'backup' ? <Backup /> : activeId === 'connect-ai' ? <ConnectAI /> : active?.engine === 'entryTracker' ? <EntryTracker module={active} onBack={() => setActiveId('dashboard')} /> : active ? <GenericEngine module={active} /> : <Dashboard onOpen={setActiveId} />;
  return <div className="app"><aside><div className="brand"><img className="brand-logo" src={everydayLogo} alt="Everyday" /></div><div className="meta-nav">{nav.map(([id, label]) => <button key={id} className={activeId === id ? 'active' : ''} onClick={() => setActiveId(id)}>{label}</button>)}</div><input aria-label="Search modules" placeholder="Search modules" value={query} onChange={(event) => setQuery(event.target.value)} />{Object.entries(engines).map(([engine, title]) => <section key={engine}><span className="nav-label">{title}</span>{visible.filter((module) => module.engine === engine).map((module) => <button key={module.id} className={module.id === activeId ? 'active' : ''} onClick={() => setActiveId(module.id)}>{module.icon} {module.title}</button>)}</section>)}</aside><div className="workspace"><ErrorBoundary resetKey={activeId} onRecover={() => setActiveId('dashboard')}>{content}</ErrorBoundary></div></div>;
}
