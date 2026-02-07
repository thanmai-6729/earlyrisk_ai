import { useState, useMemo } from 'react';
import { motion } from 'framer-motion';

/**
 * RiskTrends - Risk trend visualization
 * Shows line chart with diabetes, heart disease, liver health risk trends
 * Uses real historical data from Supabase when available
 * Plus summary cards with current vs initial values
 */
export default function RiskTrends({ analysis, trendData: realTrendData, compact = false }) {
  const [activeFilters, setActiveFilters] = useState(['diabetes', 'heart', 'liver']);
  const [hoveredPoint, setHoveredPoint] = useState(null);

  // Check if we have real trend data from Supabase
  const hasRealData = realTrendData && realTrendData.count > 1;

  // Generate trend data - use real data if available, otherwise generate from current analysis
  const trendData = useMemo(() => {
    if (!analysis) return [];

    // If we have real historical data from Supabase, use it
    if (hasRealData) {
      return realTrendData.timestamps.map((ts, i) => {
        const date = new Date(ts);
        return {
          month: date.toLocaleDateString('en-US', { month: 'short', year: 'numeric' }),
          shortMonth: date.toLocaleDateString('en-US', { month: 'short' }),
          year: date.getFullYear(),
          diabetes: realTrendData.diabetes[i] || 0,
          heart: realTrendData.heart[i] || 0,
          liver: realTrendData.liver[i] || 0,
          isReal: true,
        };
      });
    }

    // Fallback: Generate data from current analysis only (single point)
    // This happens for new users with only one analysis
    const currentDiabetes = (analysis.diabetesRisk ?? 0) / 100;
    const currentHeart = (analysis.heartRisk ?? 0) / 100;
    const currentLiver = (analysis.liverRisk ?? 0) / 100;

    const now = new Date();
    return [{
      month: now.toLocaleDateString('en-US', { month: 'short', year: 'numeric' }),
      shortMonth: now.toLocaleDateString('en-US', { month: 'short' }),
      year: now.getFullYear(),
      diabetes: currentDiabetes,
      heart: currentHeart,
      liver: currentLiver,
      isReal: true,
    }];
  }, [analysis, realTrendData, hasRealData]);

  // Calculate initial and current values for cards
  const summaryData = useMemo(() => {
    if (trendData.length < 1) return null;

    const initial = trendData[0];
    const current = trendData[trendData.length - 1];
    const hasHistory = trendData.length > 1;

    return {
      diabetes: {
        current: Math.round(current.diabetes * 100),
        initial: Math.round(initial.diabetes * 100),
        change: hasHistory ? Math.round((current.diabetes - initial.diabetes) * 100) : 0,
      },
      heart: {
        current: Math.round(current.heart * 100),
        initial: Math.round(initial.heart * 100),
        change: hasHistory ? Math.round((current.heart - initial.heart) * 100) : 0,
      },
      liver: {
        current: Math.round(current.liver * 100),
        initial: Math.round(initial.liver * 100),
        change: hasHistory ? Math.round((current.liver - initial.liver) * 100) : 0,
      },
      hasHistory,
    };
  }, [trendData]);

  const toggleFilter = (filter) => {
    setActiveFilters(prev => {
      if (prev.includes(filter)) {
        // Don't allow deselecting all
        if (prev.length === 1) return prev;
        return prev.filter(f => f !== filter);
      }
      return [...prev, filter];
    });
  };

  // Chart dimensions - smaller for compact mode
  const chartWidth = compact ? 450 : 600;
  const chartHeight = compact ? 180 : 250;
  const padding = { top: 15, right: 15, bottom: 35, left: 40 };
  const graphWidth = chartWidth - padding.left - padding.right;
  const graphHeight = chartHeight - padding.top - padding.bottom;

  // Generate SVG path for a data series
  const generatePath = (dataKey) => {
    if (trendData.length === 0) return '';
    
    const points = trendData.map((d, i) => {
      const x = padding.left + (i / (trendData.length - 1)) * graphWidth;
      const y = padding.top + graphHeight - (d[dataKey] * graphHeight);
      return `${x},${y}`;
    });

    return `M ${points.join(' L ')}`;
  };

  // Colors matching the categories
  const colors = {
    diabetes: '#22c55e', // green
    heart: '#ef4444', // red
    liver: '#eab308', // yellow/amber
  };

  const filterButtons = [
    { 
      key: 'diabetes', 
      label: 'Diabetes', 
      bgActive: 'bg-green-500 text-white ring-2 ring-green-300 ring-offset-1 shadow-md', 
      bgInactive: 'bg-slate-100 text-slate-500 hover:bg-slate-200' 
    },
    { 
      key: 'heart', 
      label: 'Heart Disease', 
      bgActive: 'bg-red-500 text-white ring-2 ring-red-300 ring-offset-1 shadow-md', 
      bgInactive: 'bg-slate-100 text-slate-500 hover:bg-slate-200' 
    },
    { 
      key: 'liver', 
      label: 'Liver Health', 
      bgActive: 'bg-yellow-500 text-white ring-2 ring-yellow-300 ring-offset-1 shadow-md', 
      bgInactive: 'bg-slate-100 text-slate-500 hover:bg-slate-200' 
    },
  ];

  if (!analysis) {
    return (
      <div className="bg-white rounded-2xl border border-slate-200 p-6">
        <div className="text-center py-8 text-slate-400">
          <span className="material-symbols-outlined text-4xl mb-2">trending_up</span>
          <p>Complete your first health analysis to see risk trends</p>
        </div>
      </div>
    );
  }

  // Determine title based on data availability
  const trendTitle = hasRealData 
    ? `Risk Trends (${trendData.length} Analysis${trendData.length > 1 ? 'es' : ''})`
    : 'Current Risk Levels';

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.2 }}
      className={`bg-white rounded-2xl border border-slate-200 ${compact ? 'p-4' : 'p-6'} h-full`}
    >
      {/* Header */}
      <div className={`flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 ${compact ? 'mb-3' : 'mb-6'}`}>
        <div className="flex items-center gap-2">
          <span className={`material-symbols-outlined text-green-500 ${compact ? 'text-xl' : 'text-2xl'}`}>trending_up</span>
          <h2 className={`font-semibold text-slate-800 ${compact ? 'text-base' : 'text-xl'}`}>{trendTitle}</h2>
          {!hasRealData && (
            <span className="text-xs text-slate-400 bg-slate-100 px-2 py-0.5 rounded-full">
              Add more analyses to see trends
            </span>
          )}
        </div>

        {/* Filter Buttons */}
        <div className="flex gap-1.5">
          {filterButtons.map(btn => (
            <button
              key={btn.key}
              onClick={() => toggleFilter(btn.key)}
              className={`${compact ? 'px-2.5 py-1 text-xs' : 'px-4 py-1.5 text-sm'} rounded-full font-medium transition-all ${
                activeFilters.includes(btn.key) ? btn.bgActive : btn.bgInactive
              }`}
            >
              {btn.label}
            </button>
          ))}
        </div>
      </div>

      {/* Line Chart */}
      <div className="relative overflow-x-auto">
        <svg 
          viewBox={`0 0 ${chartWidth} ${chartHeight}`} 
          className="w-full max-w-full"
          style={{ minWidth: compact ? '300px' : '400px' }}
        >
          {/* Grid lines */}
          {[0, 25, 50, 75, 100].map(pct => {
            const y = padding.top + graphHeight - (pct / 100) * graphHeight;
            return (
              <g key={pct}>
                <line
                  x1={padding.left}
                  y1={y}
                  x2={padding.left + graphWidth}
                  y2={y}
                  stroke="#e2e8f0"
                  strokeWidth="1"
                />
                <text
                  x={padding.left - 10}
                  y={y + 4}
                  textAnchor="end"
                  className="text-xs fill-slate-400"
                  fontSize="11"
                >
                  {pct}%
                </text>
              </g>
            );
          })}

          {/* X-axis labels (every other month) */}
          {trendData.map((d, i) => {
            if (i % 2 !== 1 && i !== trendData.length - 1) return null;
            const x = padding.left + (i / (trendData.length - 1)) * graphWidth;
            return (
              <text
                key={i}
                x={x}
                y={chartHeight - 10}
                textAnchor="middle"
                className="fill-slate-500"
                fontSize="11"
              >
                {d.month}
              </text>
            );
          })}

          {/* Lines */}
          {activeFilters.includes('diabetes') && (
            <path
              d={generatePath('diabetes')}
              fill="none"
              stroke={colors.diabetes}
              strokeWidth="3"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          )}
          {activeFilters.includes('heart') && (
            <path
              d={generatePath('heart')}
              fill="none"
              stroke={colors.heart}
              strokeWidth="3"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          )}
          {activeFilters.includes('liver') && (
            <path
              d={generatePath('liver')}
              fill="none"
              stroke={colors.liver}
              strokeWidth="3"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          )}

          {/* Data points */}
          {trendData.map((d, i) => {
            const x = padding.left + (i / (trendData.length - 1)) * graphWidth;
            return (
              <g key={i}>
                {activeFilters.includes('diabetes') && (
                  <circle
                    cx={x}
                    cy={padding.top + graphHeight - (d.diabetes * graphHeight)}
                    r="5"
                    fill={colors.diabetes}
                    stroke="white"
                    strokeWidth="2"
                    className="cursor-pointer"
                    onMouseEnter={() => setHoveredPoint({ index: i, data: d })}
                    onMouseLeave={() => setHoveredPoint(null)}
                  />
                )}
                {activeFilters.includes('heart') && (
                  <circle
                    cx={x}
                    cy={padding.top + graphHeight - (d.heart * graphHeight)}
                    r="5"
                    fill={colors.heart}
                    stroke="white"
                    strokeWidth="2"
                    className="cursor-pointer"
                    onMouseEnter={() => setHoveredPoint({ index: i, data: d })}
                    onMouseLeave={() => setHoveredPoint(null)}
                  />
                )}
                {activeFilters.includes('liver') && (
                  <circle
                    cx={x}
                    cy={padding.top + graphHeight - (d.liver * graphHeight)}
                    r="5"
                    fill={colors.liver}
                    stroke="white"
                    strokeWidth="2"
                    className="cursor-pointer"
                    onMouseEnter={() => setHoveredPoint({ index: i, data: d })}
                    onMouseLeave={() => setHoveredPoint(null)}
                  />
                )}

                {/* Hover tooltip */}
                {hoveredPoint?.index === i && (
                  <g>
                    {/* Vertical line */}
                    <line
                      x1={x}
                      y1={padding.top}
                      x2={x}
                      y2={padding.top + graphHeight}
                      stroke="#94a3b8"
                      strokeWidth="1"
                      strokeDasharray="4"
                    />
                    {/* Tooltip box */}
                    <foreignObject x={x + 10} y={padding.top} width="100" height="80">
                      <div className="bg-white rounded-lg shadow-lg border border-slate-200 p-2 text-xs">
                        <div className="font-semibold text-slate-700 mb-1">{d.month}</div>
                        {activeFilters.includes('diabetes') && (
                          <div className="flex items-center gap-1">
                            <span className="w-2 h-2 rounded-full bg-green-500"></span>
                            <span className="text-green-600 font-medium">{Math.round(d.diabetes * 100)}%</span>
                          </div>
                        )}
                        {activeFilters.includes('heart') && (
                          <div className="flex items-center gap-1">
                            <span className="w-2 h-2 rounded-full bg-red-500"></span>
                            <span className="text-red-600 font-medium">{Math.round(d.heart * 100)}%</span>
                          </div>
                        )}
                        {activeFilters.includes('liver') && (
                          <div className="flex items-center gap-1">
                            <span className="w-2 h-2 rounded-full bg-yellow-500"></span>
                            <span className="text-yellow-600 font-medium">{Math.round(d.liver * 100)}%</span>
                          </div>
                        )}
                      </div>
                    </foreignObject>
                  </g>
                )}
              </g>
            );
          })}
        </svg>

        {/* Legend */}
        <div className={`flex items-center justify-center gap-4 ${compact ? 'mt-2' : 'mt-4'}`}>
          {activeFilters.includes('diabetes') && (
            <div className="flex items-center gap-1.5">
              <span className={`${compact ? 'w-2 h-2' : 'w-3 h-3'} rounded-full bg-green-500`}></span>
              <span className={`${compact ? 'text-xs' : 'text-sm'} text-slate-600`}>Diabetes</span>
            </div>
          )}
          {activeFilters.includes('heart') && (
            <div className="flex items-center gap-1.5">
              <span className={`${compact ? 'w-2 h-2' : 'w-3 h-3'} rounded-full bg-red-500`}></span>
              <span className={`${compact ? 'text-xs' : 'text-sm'} text-slate-600`}>Heart Disease</span>
            </div>
          )}
          {activeFilters.includes('liver') && (
            <div className="flex items-center gap-1.5">
              <span className={`${compact ? 'w-2 h-2' : 'w-3 h-3'} rounded-full bg-yellow-500`}></span>
              <span className={`${compact ? 'text-xs' : 'text-sm'} text-slate-600`}>Liver Health</span>
            </div>
          )}
        </div>
      </div>

      {/* Summary Cards */}
      {summaryData && (
        <div className={`grid grid-cols-3 gap-3 ${compact ? 'mt-3' : 'mt-6'}`}>
          {/* Diabetes Card */}
          <div className={`bg-slate-50 rounded-xl ${compact ? 'p-2.5' : 'p-4'} border border-slate-100`}>
            <div className="flex items-center justify-between mb-1">
              <span className={`${compact ? 'text-xs' : 'text-sm'} font-medium text-slate-600`}>Diabetes</span>
              <svg width={compact ? '28' : '40'} height={compact ? '14' : '20'} viewBox="0 0 40 20" className="text-green-500">
                <polyline
                  points="0,15 10,12 20,8 30,5 40,3"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                />
              </svg>
            </div>
            <div className="flex items-baseline gap-1.5">
              <span className={`${compact ? 'text-lg' : 'text-2xl'} font-bold text-slate-800`}>{summaryData.diabetes.current}%</span>
              <span className={`${compact ? 'text-xs' : 'text-sm'} text-slate-500`}>Current</span>
            </div>
            <div className={`flex items-center gap-2 ${compact ? 'mt-0.5' : 'mt-1'}`}>
              <span className={`${compact ? 'text-xs' : 'text-sm'} text-slate-400`}>{summaryData.diabetes.initial}%</span>
              <span className={`${compact ? 'text-xs' : 'text-sm'} font-medium ${summaryData.diabetes.change >= 0 ? 'text-red-500' : 'text-green-500'}`}>
                {summaryData.diabetes.change >= 0 ? '+' : ''}{summaryData.diabetes.change}%
              </span>
            </div>
          </div>

          {/* Heart Disease Card */}
          <div className={`bg-slate-50 rounded-xl ${compact ? 'p-2.5' : 'p-4'} border border-slate-100`}>
            <div className="flex items-center justify-between mb-1">
              <span className={`${compact ? 'text-xs' : 'text-sm'} font-medium text-slate-600`}>Heart</span>
              <svg width={compact ? '28' : '40'} height={compact ? '14' : '20'} viewBox="0 0 40 20" className="text-red-500">
                <polyline
                  points="0,15 10,13 20,10 30,8 40,6"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                />
              </svg>
            </div>
            <div className="flex items-baseline gap-1.5">
              <span className={`${compact ? 'text-lg' : 'text-2xl'} font-bold text-slate-800`}>{summaryData.heart.current}%</span>
              <span className={`${compact ? 'text-xs' : 'text-sm'} text-slate-500`}>Current</span>
            </div>
            <div className={`flex items-center gap-2 ${compact ? 'mt-0.5' : 'mt-1'}`}>
              <span className={`${compact ? 'text-xs' : 'text-sm'} text-slate-400`}>{summaryData.heart.initial}%</span>
              <span className={`${compact ? 'text-xs' : 'text-sm'} font-medium ${summaryData.heart.change >= 0 ? 'text-red-500' : 'text-green-500'}`}>
                {summaryData.heart.change >= 0 ? '+' : ''}{summaryData.heart.change}%
              </span>
            </div>
          </div>

          {/* Liver Health Card */}
          <div className={`bg-slate-50 rounded-xl ${compact ? 'p-2.5' : 'p-4'} border border-slate-100`}>
            <div className="flex items-center justify-between mb-1">
              <span className={`${compact ? 'text-xs' : 'text-sm'} font-medium text-slate-600`}>Liver</span>
              <svg width={compact ? '28' : '40'} height={compact ? '14' : '20'} viewBox="0 0 40 20" className="text-yellow-500">
                <polyline
                  points="0,14 10,12 20,9 30,7 40,5"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                />
              </svg>
            </div>
            <div className="flex items-baseline gap-1.5">
              <span className={`${compact ? 'text-lg' : 'text-2xl'} font-bold text-slate-800`}>{summaryData.liver.current}%</span>
              <span className={`${compact ? 'text-xs' : 'text-sm'} text-slate-500`}>Current</span>
            </div>
            <div className={`flex items-center gap-2 ${compact ? 'mt-0.5' : 'mt-1'}`}>
              <span className={`${compact ? 'text-xs' : 'text-sm'} text-slate-400`}>{summaryData.liver.initial}%</span>
              <span className={`${compact ? 'text-xs' : 'text-sm'} font-medium ${summaryData.liver.change >= 0 ? 'text-red-500' : 'text-green-500'}`}>
                {summaryData.liver.change >= 0 ? '+' : ''}{summaryData.liver.change}%
              </span>
            </div>
          </div>
        </div>
      )}
    </motion.div>
  );
}
