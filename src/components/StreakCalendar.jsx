const day = (date) => date.toISOString().slice(0, 10);

export default function StreakCalendar({ completedDates = [], title = 'Check-in calendar', days = 365 }) {
  const completed = new Set(completedDates.filter(Boolean));
  const cells = Array.from({ length: days }, (_, index) => {
    const date = new Date();
    date.setUTCHours(0, 0, 0, 0);
    date.setUTCDate(date.getUTCDate() - (days - 1 - index));
    const value = day(date);
    return { value, done: completed.has(value) };
  });

  return <section className="suite-card streak-calendar">
    <div className="chart-title"><div><span className="section-label">History</span><h2>{title}</h2></div><small>{completed.size} logged day{completed.size === 1 ? '' : 's'} in the last year</small></div>
    <div className="streak-calendar-scroll"><div className="streak-calendar-grid" role="grid" aria-label={`${title}, last 12 months`}>
      {cells.map(({ value, done }) => <i key={value} role="gridcell" className={done ? 'done' : ''} title={`${value}${done ? ': completed' : ': no check-in'}`} aria-label={`${value}${done ? ': completed' : ': no check-in'}`} />)}
    </div></div>
    <div className="streak-calendar-legend"><span><i /> Less</span><span><i className="done" /> More</span><small>{cells[0].value} – {cells.at(-1).value}</small></div>
  </section>;
}
