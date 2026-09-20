import {
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { formatDateFr } from '../lib/storage';

type Point = { date: string; value: number };

export function ChartCard({
  title,
  unit,
  data,
  color = '#2dd4bf',
}: {
  title: string;
  unit: string;
  data: Point[];
  color?: string;
}) {
  if (data.length === 0) {
    return (
      <section className="card chart-card">
        <h3>{title}</h3>
        <p className="muted">Aucune donnée pour le moment.</p>
      </section>
    );
  }

  const chartData = data.map((d) => ({
    ...d,
    label: formatDateFr(d.date),
  }));

  return (
    <section className="card chart-card">
      <div className="card-head">
        <h3>{title}</h3>
        <span className="badge">{unit}</span>
      </div>
      <div className="chart-wrap">
        <ResponsiveContainer width="100%" height={180}>
          <LineChart data={chartData} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
            <CartesianGrid stroke="rgba(255,255,255,0.08)" strokeDasharray="3 3" />
            <XAxis
              dataKey="label"
              tick={{ fill: '#94a3b8', fontSize: 10 }}
              tickMargin={6}
              interval="preserveStartEnd"
            />
            <YAxis
              tick={{ fill: '#94a3b8', fontSize: 10 }}
              width={40}
              domain={['auto', 'auto']}
            />
            <Tooltip
              contentStyle={{
                background: '#0f172a',
                border: '1px solid #334155',
                borderRadius: 8,
                color: '#e2e8f0',
              }}
              formatter={(value) => [`${value} ${unit}`, title]}
            />
            <Line
              type="monotone"
              dataKey="value"
              stroke={color}
              strokeWidth={2.5}
              dot={{ r: 3, fill: color }}
              activeDot={{ r: 5 }}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </section>
  );
}
