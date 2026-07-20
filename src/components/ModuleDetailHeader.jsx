export default function ModuleDetailHeader({ onBack }) {
  if (!onBack) return null;
  return <button className="module-back" type="button" onClick={onBack}>← Dashboard</button>;
}
