import { useEffect, useRef } from 'react';
import Chart from 'chart.js/auto';

export default function RiskCharts({ trendData }) {
  const canvasRef = useRef(null);
  const chartRef = useRef(null);

  useEffect(() => {
    const td = trendData || {};
    const timestamps = Array.isArray(td.timestamps) ? td.timestamps : [];
    const metrics = td.metrics || {};

    const sugar = Array.isArray(metrics.sugar) ? metrics.sugar : [];
    const hba1c = Array.isArray(metrics.hba1c) ? metrics.hba1c : [];

    const labels = timestamps.length
      ? timestamps.map((t) => new Date(t).toLocaleDateString())
      : ['Now'];

    if (chartRef.current) {
      chartRef.current.destroy();
      chartRef.current = null;
    }

    const el = canvasRef.current;
    if (!el) return;

    chartRef.current = new Chart(el, {
      type: 'line',
      data: {
        labels,
        datasets: [
          {
            label: 'Sugar (mg/dL)',
            data: sugar.length ? sugar : [NaN],
            borderColor: '#2463eb',
            backgroundColor: 'rgba(36,99,235,0.15)',
            tension: 0.3,
            fill: true,
          },
          {
            label: 'HbA1c (%)',
            data: hba1c.length ? hba1c : [NaN],
            borderColor: '#f59e0b',
            backgroundColor: 'rgba(245,158,11,0.15)',
            tension: 0.3,
            fill: true,
          },
        ],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: {
            position: 'bottom',
            labels: {
              color: '#94a3b8',
              usePointStyle: true,
              padding: 20,
            },
          },
        },
        scales: {
          x: {
            ticks: { color: '#94a3b8' },
            grid: { color: 'rgba(148,163,184,0.1)' },
          },
          y: {
            ticks: { color: '#94a3b8' },
            grid: { color: 'rgba(148,163,184,0.1)' },
          },
        },
      },
    });

    return () => {
      if (chartRef.current) {
        chartRef.current.destroy();
        chartRef.current = null;
      }
    };
  }, [trendData]);

  return (
    <div className="bg-white dark:bg-slate-800 rounded-xl p-6 shadow-sm border border-slate-200 dark:border-slate-700">
      <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-4">
        <span className="material-symbols-outlined align-middle mr-2 text-primary">trending_up</span>
        Health Trends
      </h3>
      <div className="h-64">
        <canvas ref={canvasRef} />
      </div>
    </div>
  );
}
