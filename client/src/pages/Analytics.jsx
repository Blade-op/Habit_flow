import { useState, useEffect } from 'react';
import {
  BarChart, Bar, LineChart, Line, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend,
} from 'recharts';
import { getAnalytics } from '../api';

const PASTEL = ['#a78bfa', '#f472b6', '#60a5fa', '#2dd4bf', '#fbbf24', '#f87171', '#4ade80', '#fb923c'];

function StatCard({ icon, label, value, sub, color }) {
  return (
    <div className="insight-card">
      <div className="insight-icon" style={{ background: color + '22' }}>
        {icon}
      </div>
      <div className="insight-body">
        <h4>{label}</h4>
        <div className="insight-value">{value}</div>
        {sub && <div className="insight-sub">{sub}</div>}
      </div>
    </div>
  );
}

function CustomTooltip({ active, payload, label }) {
  if (!active || !payload?.length) return null;
  return (
    <div className="card card-sm" style={{ minWidth: 140, fontSize: '0.82rem' }}>
      <div style={{ fontWeight: 700, marginBottom: 4, color: 'var(--text-primary)' }}>{label}</div>
      {payload.map((p, i) => (
        <div key={i} style={{ color: p.color }}>
          {p.name}: <strong>{p.value}{p.name === 'Rate' ? '%' : ''}</strong>
        </div>
      ))}
    </div>
  );
}

export default function Analytics() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [view, setView] = useState('30d'); // '7d' | '30d'

  useEffect(() => {
    getAnalytics()
      .then(setData)
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <div className="spinner-wrapper"><div className="spinner" /></div>;

  if (!data) return (
    <div className="empty-state">
      <div className="empty-state-icon">⚠️</div>
      <h3>Could not load analytics</h3>
      <p>Make sure the server is running and MongoDB is connected.</p>
    </div>
  );

  // Guard: no valid data yet (user has no habits or none scheduled)
  if (data.dailyData.length === 0 && data.habitStats.length === 0) {
    return (
      <div className="empty-state" style={{ marginTop: 40 }}>
        <div className="empty-state-icon">📊</div>
        <h3>No analytics yet</h3>
        <p>Start tracking your habits and check back soon!</p>
      </div>
    );
  }

  // dailyData only contains dates where ≥1 habit was scheduled (backend filtered)
  const dailySlice = view === '7d' ? data.dailyData.slice(-7) : data.dailyData;

  // 3-segment pie: Completed / Missed / Skipped
  const totalMissed  = data.totalMissed  ?? Math.max(0, (data.totalScheduled ?? 0) - (data.totalCompleted ?? 0) - (data.totalSkipped ?? 0));
  const totalSkipped = data.totalSkipped ?? 0;

  const pieData = [
    { name: 'Completed', value: data.totalCompleted },
    { name: 'Missed',    value: totalMissed },
    { name: 'Skipped',   value: totalSkipped },
  ].filter((seg) => seg.value > 0);

  const PIE_COLORS = ['#a78bfa', '#f1efff', '#fbbf24'];

  // Overall rate display — null means "No active tracking"
  const overallRateDisplay =
    data.overallRate === null || data.overallRate === undefined
      ? '—'
      : `${data.overallRate}%`;

  const overallRateSub =
    data.overallRate === null || data.overallRate === undefined
      ? 'No active tracking yet'
      : 'Based on active days only';

  return (
    <div>
      {/* Header */}
      <div className="page-header">
        <div className="page-header-left">
          <h1>Analytics 📊</h1>
          <p>Your habit performance over the last 30 days</p>
        </div>
        <div className="flex gap-8">
          {['7d', '30d'].map((v) => (
            <button
              key={v}
              className={`btn${view === v ? ' btn-primary' : ' btn-ghost'}`}
              onClick={() => setView(v)}
              id={`view-${v}`}
            >
              {v === '7d' ? 'Last 7 Days' : 'Last 30 Days'}
            </button>
          ))}
        </div>
      </div>

      {/* Insight stat cards — now 5 cards including Skipped */}
      <div className="insights-grid mb-24">
        <StatCard
          icon="🎯"
          label="Overall Rate"
          value={overallRateDisplay}
          sub={overallRateSub}
          color="#7c3aed"
        />
        <StatCard
          icon="✅"
          label="Completed"
          value={data.totalCompleted}
          sub={`of ${(data.totalCompleted + totalMissed)} active days`}
          color="#2dd4bf"
        />
        <StatCard
          icon="❌"
          label="Missed"
          value={totalMissed}
          sub="Active days not completed"
          color="#f87171"
        />
        <StatCard
          icon="⏭"
          label="Skipped"
          value={totalSkipped}
          sub="Excluded from rate"
          color="#fbbf24"
        />
        <StatCard
          icon="🏆"
          label="Most Consistent"
          value={data.mostConsistent?.title || '—'}
          sub={
            data.mostConsistent
              ? data.mostConsistent.completionRate !== null
                ? `${data.mostConsistent.completionRate}% completion`
                : 'No active days yet'
              : ''
          }
          color="#fbbf24"
        />
        <StatCard
          icon="⚠️"
          label="Needs Attention"
          value={data.leastFollowed?.title || '—'}
          sub={
            data.leastFollowed
              ? data.leastFollowed.completionRate !== null
                ? `${data.leastFollowed.completionRate}% completion`
                : 'No active days yet'
              : ''
          }
          color="#f472b6"
        />
      </div>

      <div className="analytics-grid">
        {/* Bar chart — Daily completion with skipped */}
        <div className="chart-card" style={{ gridColumn: 'span 2' }}>
          <h3>📅 Daily Completion</h3>
          <p>Completed, missed, and skipped habits each day</p>
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={dailySlice} margin={{ top: 5, right: 10, left: -20, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
              <XAxis dataKey="label" tick={{ fontSize: 11, fill: 'var(--text-muted)' }} tickLine={false} interval={view === '30d' ? 4 : 0} />
              <YAxis tick={{ fontSize: 11, fill: 'var(--text-muted)' }} tickLine={false} axisLine={false} />
              <Tooltip content={<CustomTooltip />} />
              <Legend wrapperStyle={{ fontSize: '0.8rem' }} />
              <Bar dataKey="completed" name="Completed" fill="#a78bfa" radius={[4, 4, 0, 0]} />
              <Bar dataKey="missed"    name="Missed"    fill="#e8e3ff" radius={[4, 4, 0, 0]} />
              <Bar dataKey="skipped"   name="Skipped"   fill="#fbbf24" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Pie chart — 3 segments */}
        <div className="chart-card">
          <h3>🍩 Status Split</h3>
          <p>Completed / Missed / Skipped over 30 days</p>
          <ResponsiveContainer width="100%" height={220}>
            <PieChart>
              <Pie
                data={pieData}
                cx="50%"
                cy="50%"
                innerRadius={55}
                outerRadius={85}
                paddingAngle={4}
                dataKey="value"
                label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                labelLine={false}
              >
                {pieData.map((entry, i) => {
                  const colorMap = { Completed: '#a78bfa', Missed: '#e8e3ff', Skipped: '#fbbf24' };
                  return <Cell key={i} fill={colorMap[entry.name] || PASTEL[i]} />;
                })}
              </Pie>
              <Tooltip formatter={(v) => [`${v} days`, '']} />
            </PieChart>
          </ResponsiveContainer>
        </div>

        {/* Line chart — Completion rate */}
        <div className="chart-card" style={{ gridColumn: 'span 2' }}>
          <h3>📈 Completion Rate Trend</h3>
          <p>Daily completion % (skipped days excluded from calculation)</p>
          <ResponsiveContainer width="100%" height={220}>
            <LineChart data={dailySlice} margin={{ top: 5, right: 10, left: -20, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
              <XAxis dataKey="label" tick={{ fontSize: 11, fill: 'var(--text-muted)' }} tickLine={false} interval={view === '30d' ? 4 : 0} />
              <YAxis domain={[0, 100]} tick={{ fontSize: 11, fill: 'var(--text-muted)' }} tickLine={false} axisLine={false} />
              <Tooltip content={<CustomTooltip />} />
              <Line
                type="monotone"
                dataKey="rate"
                name="Rate"
                stroke="#f472b6"
                strokeWidth={2.5}
                dot={{ r: 3, fill: '#f472b6' }}
                activeDot={{ r: 6 }}
                connectNulls
              />
            </LineChart>
          </ResponsiveContainer>
        </div>

        {/* Habit-wise performance */}
        <div className="chart-card">
          <h3>🌱 Habit Performance</h3>
          <p>Completion rate per habit (active days only)</p>
          <div className="habit-perf-list">
            {data.habitStats.length === 0 && (
              <p className="text-muted text-center" style={{ padding: '20px 0' }}>No habits tracked yet</p>
            )}
            {data.habitStats
              .sort((a, b) => (b.completionRate ?? -1) - (a.completionRate ?? -1))
              .map((h, i) => (
                <div className="habit-perf-item" key={h.habitId}>
                  <div className="habit-perf-dot" style={{ background: h.color || PASTEL[i % PASTEL.length] }} />
                  <div className="habit-perf-info">
                    <div className="habit-perf-name">
                      <span>{h.title}</span>
                      <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                        {h.skippedDays > 0 && (
                          <span style={{ color: 'var(--amber)', fontSize: '0.72rem' }}>⏭ {h.skippedDays}</span>
                        )}
                        <span style={{ color: 'var(--text-muted)', fontSize: '0.78rem' }}>
                          {h.completionRate !== null ? `${h.completionRate}%` : '—'}
                        </span>
                      </span>
                    </div>
                    <div className="habit-perf-bar-bg">
                      <div
                        className="habit-perf-bar-fill"
                        style={{
                          width: `${h.completionRate ?? 0}%`,
                          background: h.color || PASTEL[i % PASTEL.length],
                        }}
                      />
                    </div>
                    {h.streak > 0 && (
                      <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginTop: 3 }}>
                        🔥 {h.streak} day streak
                      </div>
                    )}
                    {h.completionRate === null && (
                      <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginTop: 3 }}>
                        No active tracking yet
                      </div>
                    )}
                  </div>
                </div>
              ))}
          </div>
        </div>
      </div>
    </div>
  );
}
