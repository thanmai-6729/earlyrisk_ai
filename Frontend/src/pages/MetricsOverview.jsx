import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Chart from 'chart.js/auto';

import { getPatientLatest } from '../api.js';
import { useAuth } from '../auth/useAuth.js';
import { loadTemplateBody } from '../utils/loadTemplateBody.js';
import { usernameFromUser } from '../utils/userDisplayName.js';

function fmtPct(x) {
  const n = Number(x);
  if (!Number.isFinite(n)) return '—';
  return `${Math.round(n)}%`;
}

function computeBmi(heightCm, weightKg) {
  const h = Number(heightCm);
  const w = Number(weightKg);
  if (!Number.isFinite(h) || !Number.isFinite(w) || h <= 0) return null;
  const m = h / 100;
  return w / (m * m);
}

function rewriteInternalLinks(navigate) {
  const map = {
    'dashboard4.html': '/metrics/overview',
    'dashboard2.html': '/metrics/analytics',
    'dashboard1.html': '/metrics/analytics',
    'dashboard3.html': '/metrics/risk-analysis',
    'dashboard.html': '/app',
    'dashboard5.html': '/reports',
  };

  const anchors = Array.from(document.querySelectorAll('a[href]'));
  const cleanups = [];

  for (const a of anchors) {
    const href = a.getAttribute('href') || '';
    const key = href.split('?')[0].split('#')[0];
    const dest = map[key];
    if (!dest) continue;

    a.setAttribute('href', dest);
    const onClick = (e) => {
      e.preventDefault();
      navigate(dest);
    };
    a.addEventListener('click', onClick);
    cleanups.push(() => a.removeEventListener('click', onClick));
  }

  return () => {
    for (const c of cleanups) c();
  };
}

function wireMobileMenu() {
  const mobileMenuBtn = document.getElementById('mobile-menu-btn');
  const closeMenuBtn = document.getElementById('close-menu-btn');
  const mobileMenu = document.getElementById('mobile-menu');

  if (!mobileMenuBtn || !closeMenuBtn || !mobileMenu) return () => {};

  const open = () => mobileMenu.classList.remove('hidden');
  const close = () => mobileMenu.classList.add('hidden');

  mobileMenuBtn.addEventListener('click', open);
  closeMenuBtn.addEventListener('click', close);

  return () => {
    mobileMenuBtn.removeEventListener('click', open);
    closeMenuBtn.removeEventListener('click', close);
  };
}

export default function MetricsOverview() {
  const navigate = useNavigate();
  const { user, signOut } = useAuth();
  const userId = user?.id;

  const [html, setHtml] = useState('');

  useEffect(() => {
    let cancelled = false;
    loadTemplateBody('/templates/dashboard4.html')
      .then((bodyHtml) => {
        if (!cancelled) setHtml(bodyHtml);
      })
      .catch(() => {
        if (!cancelled) setHtml('<div style="padding:24px">Failed to load overview template.</div>');
      });
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!html || !userId) return;
    document.documentElement.classList.add('light');

    const cleanupLinks = rewriteInternalLinks(navigate);
    const cleanupMenu = wireMobileMenu();

    const logoutButtons = Array.from(document.querySelectorAll('[data-sdd-logout]'));
    const onLogout = async (e) => {
      e.preventDefault();
      await signOut();
      navigate('/login', { replace: true });
    };
    for (const b of logoutButtons) b.addEventListener('click', onLogout);

    // Replace doctor placeholders with current user username
    const username = usernameFromUser(user);
    const overviewUser = document.getElementById('sddOverviewUser');
    if (overviewUser) overviewUser.textContent = username;

    const greeting = Array.from(document.querySelectorAll('h2')).find((h) =>
      (h.textContent || '').trim().toLowerCase().startsWith('good morning')
    );
    if (greeting) greeting.textContent = `Good morning, ${username}`;

    const sidebarName = document.querySelector('aside .truncate.text-slate-900');
    if (sidebarName) sidebarName.textContent = username;

    const msgEl = document.getElementById('sddOverviewMessage');

    let trendChart;
    const trendCanvas = document.getElementById('sddTrendChart');

    const renderTrend = (trendData) => {
      if (!trendCanvas) return;
      const td = trendData || {};
      const ts = Array.isArray(td.timestamps) ? td.timestamps : [];
      const metrics = td.metrics || {};
      const sugar = Array.isArray(metrics.sugar) ? metrics.sugar : [];
      const hba1c = Array.isArray(metrics.hba1c) ? metrics.hba1c : [];

      const labels = ts.length ? ts.map((t) => new Date(t).toLocaleDateString()) : ['Now'];
      const sugarSeries = sugar.length ? sugar : [Number.NaN];
      const hba1cSeries = hba1c.length ? hba1c : [Number.NaN];

      if (trendChart) trendChart.destroy();
      trendChart = new Chart(trendCanvas, {
        type: 'line',
        data: {
          labels,
          datasets: [
            {
              label: 'Sugar (mg/dL)',
              data: sugarSeries,
              borderColor: '#2463eb',
              backgroundColor: 'rgba(36, 99, 235, 0.15)',
              tension: 0.3,
            },
            {
              label: 'HbA1c (%)',
              data: hba1cSeries,
              borderColor: '#f59e0b',
              backgroundColor: 'rgba(245, 158, 11, 0.15)',
              tension: 0.3,
            },
          ],
        },
        options: {
          responsive: true,
          plugins: { legend: { labels: { color: '#94a3b8' } } },
          scales: {
            x: { ticks: { color: '#94a3b8' }, grid: { color: 'rgba(148,163,184,0.15)' } },
            y: { ticks: { color: '#94a3b8' }, grid: { color: 'rgba(148,163,184,0.15)' } },
          },
        },
      });
    };

    const setText = (id, text) => {
      const el = document.getElementById(id);
      if (el) el.textContent = text;
    };

    const renderAdvice = (advice) => {
      const list = document.getElementById('sddAdviceList');
      if (!list) return;
      list.innerHTML = '';
      const items = Array.isArray(advice) ? advice : [];
      if (items.length === 0) {
        const li = document.createElement('li');
        li.className = 'text-slate-500 dark:text-slate-400';
        li.textContent = 'No high/medium-risk advice triggered for this snapshot.';
        list.appendChild(li);
        return;
      }
      for (const a of items) {
        const li = document.createElement('li');
        li.className = 'flex items-start gap-2';
        li.innerHTML = `<span class="material-symbols-outlined text-primary text-[18px] mt-0.5">check_circle</span><span><span class="font-bold">${a.disease}:</span> ${a.advice}</span>`;
        list.appendChild(li);
      }
    };

    let alive = true;
    (async () => {
      try {
        const latest = await getPatientLatest(userId);
        if (!alive) return;

        if (!latest?.analysis) {
          if (msgEl) msgEl.textContent = 'No saved analysis yet. Go to Data Entry and run analysis.';
          return;
        }

        setText('sddRiskDiabetes', fmtPct(latest.analysis.diabetesRisk));
        setText('sddRiskHeart', fmtPct(latest.analysis.heartRisk));
        setText('sddRiskLiver', fmtPct(latest.analysis.liverRisk));
        setText('sddRiskDepression', fmtPct(latest.analysis.depressionRisk));
        renderAdvice(latest.analysis.advice);
        renderTrend(latest.analysis.trendData);

        const bmi = computeBmi(latest.patient?.height_cm, latest.latest?.weight_kg);
        if (msgEl) msgEl.textContent = bmi ? `Latest snapshot loaded (BMI ${bmi.toFixed(1)}).` : 'Latest snapshot loaded.';
      } catch {
        if (msgEl) msgEl.textContent = 'Unable to load latest snapshot.';
      }
    })();

    return () => {
      alive = false;
      cleanupLinks();
      cleanupMenu();
      for (const b of logoutButtons) b.removeEventListener('click', onLogout);
      if (trendChart) trendChart.destroy();
    };
  }, [html, navigate, signOut, user, userId]);

  return <div dangerouslySetInnerHTML={{ __html: html }} />;
}
