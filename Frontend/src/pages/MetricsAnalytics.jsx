import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';

import { getPatientLatest } from '../api.js';
import { useAuth } from '../auth/useAuth.js';
import { loadTemplateBody } from '../utils/loadTemplateBody.js';
import { usernameFromUser } from '../utils/userDisplayName.js';

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

function setText(id, text) {
  const el = document.getElementById(id);
  if (el) el.textContent = text;
}

export default function MetricsAnalytics() {
  const navigate = useNavigate();
  const { user, signOut } = useAuth();
  const userId = user?.id;

  const [html, setHtml] = useState('');

  useEffect(() => {
    let cancelled = false;
    loadTemplateBody('/templates/dashboard1.html')
      .then((bodyHtml) => {
        if (!cancelled) setHtml(bodyHtml);
      })
      .catch(() => {
        if (!cancelled) setHtml('<div style="padding:24px">Failed to load analytics template.</div>');
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

    const username = usernameFromUser(user);

    // Replace sidebar/footer placeholder doctor name
    const sidebarName = document.querySelector('aside .text-sm.font-medium.text-slate-900');
    if (sidebarName) sidebarName.textContent = username;

    let alive = true;
    (async () => {
      try {
        const pageMsgEl = document.getElementById('sddPageMessage');
        if (pageMsgEl) pageMsgEl.textContent = 'Loading risk metrics…';

        const latestRes = await getPatientLatest(userId).catch(() => null);
        if (!alive) return;

        const patientNameEl = document.getElementById('sddPatientName');
        const patientIdEl = document.getElementById('sddPatientId');
        if (patientNameEl) patientNameEl.textContent = username;
        if (patientIdEl) patientIdEl.textContent = userId;

        const analysis = latestRes?.analysis || null;
        if (!analysis) {
          if (pageMsgEl) pageMsgEl.textContent = 'No saved analysis yet. Run Data Entry analysis first.';
          return;
        }

        const setGauge = ({ pctId, bandId, circleId }, pct) => {
          const pctEl = document.getElementById(pctId);
          const bandEl = document.getElementById(bandId);
          const circleEl = document.getElementById(circleId);

          const n = Number(pct);
          if (!Number.isFinite(n)) return;

          if (pctEl) pctEl.textContent = `${Math.round(n)}%`;

          let bandText = 'Low Risk';
          let bandClasses = 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400';
          let strokeColorClass = 'text-risk-low';
          if (n >= 70) {
            bandText = 'High Risk';
            bandClasses = 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400';
            strokeColorClass = 'text-risk-high';
          } else if (n >= 35) {
            bandText = 'Medium Risk';
            bandClasses = 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400';
            strokeColorClass = 'text-risk-medium';
          }

          if (bandEl) {
            bandEl.textContent = bandText;
            bandEl.className = `inline-flex items-center rounded-full px-3 py-1 text-sm font-bold ${bandClasses}`;
          }

          if (circleEl) {
            circleEl.classList.remove('text-risk-low', 'text-risk-medium', 'text-risk-high');
            circleEl.classList.add(strokeColorClass);
            const circumference = 251.2;
            const clamped = Math.max(0, Math.min(100, n));
            const offset = circumference * (1 - clamped / 100);
            circleEl.setAttribute('stroke-dashoffset', String(offset));
          }
        };

        setGauge(
          { pctId: 'sddGaugeDiabetesPct', bandId: 'sddGaugeDiabetesBand', circleId: 'sddGaugeDiabetesCircle' },
          analysis.diabetesRisk
        );
        setGauge(
          { pctId: 'sddGaugeHeartPct', bandId: 'sddGaugeHeartBand', circleId: 'sddGaugeHeartCircle' },
          analysis.heartRisk
        );
        setGauge(
          { pctId: 'sddGaugeLiverPct', bandId: 'sddGaugeLiverBand', circleId: 'sddGaugeLiverCircle' },
          analysis.liverRisk
        );

        const risks = [
          ['Diabetes', Number(analysis.diabetesRisk)],
          ['Heart Disease', Number(analysis.heartRisk)],
          ['Fatty Liver', Number(analysis.liverRisk)],
          ['Depression', Number(analysis.depressionRisk)],
        ].filter(([, v]) => Number.isFinite(v));
        risks.sort((a, b) => b[1] - a[1]);
        const [topName, topRisk] = risks[0] || [];

        const insightTitle = document.getElementById('sddInsightTitle');
        const insightBody = document.getElementById('sddInsightBody');
        if (insightTitle && topName) insightTitle.textContent = `Highest risk: ${topName}`;
        if (insightBody && topName) {
          insightBody.textContent = `Your latest stored snapshot indicates the highest risk is ${topName} (${Math.round(
            Number(topRisk)
          )}%). Review contributing factors in Risk Analysis.`;
        }

        if (pageMsgEl) pageMsgEl.textContent = 'Loaded from latest saved analysis.';
      } catch {
        const pageMsgEl = document.getElementById('sddPageMessage');
        if (pageMsgEl) pageMsgEl.textContent = 'Unable to load risk metrics.';
      }
    })();

    return () => {
      alive = false;
      cleanupLinks();
      cleanupMenu();
      for (const b of logoutButtons) b.removeEventListener('click', onLogout);
    };
  }, [html, navigate, signOut, user, userId]);

  return <div dangerouslySetInnerHTML={{ __html: html }} />;
}
