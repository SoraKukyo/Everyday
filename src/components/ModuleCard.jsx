export default function ModuleCard({ module, snapshot, onOpen, featured = false }) {
  return <button className={`module-card accent-${module.accent} ${featured ? 'module-card-featured' : ''}`} onClick={() => onOpen(module.id)}>
    <span className="module-card-top"><span className="module-card-category">{module.engine === 'entryTracker' ? 'Tracker' : module.engine === 'checklist' ? 'List' : module.engine === 'streakTracker' ? 'Routine' : module.engine === 'savedItems' ? 'Library' : 'Schedule'}</span><span className="module-card-open">Details ›</span></span>
    <span className="module-card-icon">{module.icon}</span>
    <span className="module-card-copy"><strong>{module.title}</strong><small>{snapshot}</small></span>
  </button>;
}
