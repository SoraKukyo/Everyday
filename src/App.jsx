import EntryTracker from './engines/EntryTracker/EntryTracker';
import GenericEngine from './engines/GenericEngines';
import { engines, getModule, modules } from './config/modules';
import { useState } from 'react';
import Dashboard from './dashboard/Dashboard';
import Goals from './meta/Goals';
import Backup from './meta/Backup';
import GlobalSearch from './meta/GlobalSearch';

export default function App() {
  const [activeId, setActiveId] = useState('dashboard');
  const [query, setQuery] = useState('');
  const active = getModule(activeId);
  const visible = modules.filter((module) => module.title.toLowerCase().includes(query.toLowerCase()));
  return <div className="app"><aside><h1>Everyday</h1><div className="meta-nav"><button className={activeId === 'dashboard' ? 'active' : ''} onClick={() => setActiveId('dashboard')}>⌂ Dashboard</button><button className={activeId === 'search' ? 'active' : ''} onClick={() => setActiveId('search')}>⌕ Search</button><button className={activeId === 'goals' ? 'active' : ''} onClick={() => setActiveId('goals')}>◎ Goals</button><button className={activeId === 'backup' ? 'active' : ''} onClick={() => setActiveId('backup')}>⇩ Backup</button></div><input aria-label="Search modules" placeholder="Search modules" value={query} onChange={(e) => setQuery(e.target.value)} />{Object.entries(engines).map(([engine, title]) => <section key={engine}><span className="nav-label">{title}</span>{visible.filter((module) => module.engine === engine).map((module) => <button key={module.id} className={module.id === activeId ? 'active' : ''} onClick={() => setActiveId(module.id)}>{module.icon} {module.title}</button>)}</section>)}</aside><div className="workspace">{activeId === 'dashboard' ? <Dashboard onOpen={setActiveId} /> : activeId === 'search' ? <GlobalSearch onOpen={setActiveId} /> : activeId === 'goals' ? <Goals /> : activeId === 'backup' ? <Backup /> : active.engine === 'entryTracker' ? <EntryTracker module={active} onBack={() => setActiveId('dashboard')} /> : <GenericEngine module={active} />}</div></div>;
}
