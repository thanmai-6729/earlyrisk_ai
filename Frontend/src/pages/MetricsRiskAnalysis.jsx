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

function computeBmi(heightCm, weightKg) {
  const h = Number(heightCm);
  const w = Number(weightKg);
  if (!Number.isFinite(h) || !Number.isFinite(w) || h <= 0) return null;
  const m = h / 100;
  return w / (m * m);
}

function summarizeHighestRisk(analysis) {
  if (!analysis) return null;
  const entries = [
    ['Diabetes', Number(analysis.diabetesRisk)],
    ['Heart Disease', Number(analysis.heartRisk)],
    ['Fatty Liver', Number(analysis.liverRisk)],
    ['Depression', Number(analysis.depressionRisk)],
  ].filter(([, v]) => Number.isFinite(v));

  if (entries.length === 0) return null;
  entries.sort((a, b) => b[1] - a[1]);
  return { disease: entries[0][0], risk: entries[0][1] };
}

export default function MetricsRiskAnalysis() {
  const navigate = useNavigate();
  const { user, signOut } = useAuth();
  const userId = user?.id;

  const [html, setHtml] = useState('');

  useEffect(() => {
    let cancelled = false;
    loadTemplateBody('/templates/dashboard3.html')
      .then((bodyHtml) => {
        if (!cancelled) setHtml(bodyHtml);
      })
      .catch(() => {
        if (!cancelled) setHtml('<div style="padding:24px">Failed to load risk analysis template.</div>');
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

    // Replace placeholder doctor name in sidebar
    const sidebarName = document.querySelector('aside .text-sm.font-medium.text-slate-900');
    if (sidebarName) sidebarName.textContent = username;

    setText('sddPatientName', username);

    let alive = true;
    (async () => {
      try {
        const latest = await getPatientLatest(userId);
        if (!alive) return;

        if (!latest?.analysis) {
          setText('sddRiskHeadline', 'No saved analysis');
          setText('sddRiskBody', 'Go to Data Entry and run an analysis to see insights here.');
          setText('sddRiskMessage', '');
          setText('sddActionTitle', 'Next step');
          setText('sddActionBody', 'Run an analysis to generate personalized advice.');
          return;
        }

        setText('sddLastUpdated', `Last updated: ${new Date().toLocaleString()}`);

        const top = summarizeHighestRisk(latest.analysis);
        if (top) {
          setText('sddRiskHeadline', `${top.disease}: ${Math.round(top.risk)}% risk`);
          setText(
            'sddRiskBody',
            `This view summarizes your latest stored snapshot. Highest risk currently: ${top.disease} (${Math.round(
              top.risk
            )}%).`
          );
          setText('sddRiskMessage', 'Based on the most recent saved metrics.');
        }

        const bmi = computeBmi(latest.patient?.height_cm, latest.latest?.weight_kg);
        if (bmi) setText('sddMetricBmi', `BMI ${bmi.toFixed(1)}`);

        setText(
          'sddMetricSleep',
          Number.isFinite(Number(latest.latest?.sleep_hours)) ? `${Number(latest.latest.sleep_hours)} hrs` : '—'
        );

        const bp =
          Number.isFinite(Number(latest.latest?.bp_systolic)) && Number.isFinite(Number(latest.latest?.bp_diastolic))
            ? `${Number(latest.latest.bp_systolic)}/${Number(latest.latest.bp_diastolic)}`
            : '—';
        setText('sddMetricBp', bp);

        setText(
          'sddMetricStress',
          Number.isFinite(Number(latest.latest?.stress_level)) ? `${Number(latest.latest.stress_level)}` : '—'
        );
        setText(
          'sddMetricSugar',
          Number.isFinite(Number(latest.latest?.sugar_mgdl)) ? `${Number(latest.latest.sugar_mgdl)} mg/dL` : '—'
        );

        const advice = Array.isArray(latest.analysis.advice) ? latest.analysis.advice : [];
        if (advice.length) {
          setText('sddActionTitle', 'Recommended action plan');
          setText('sddActionBody', advice.map((a) => `${a.disease}: ${a.advice}`).join(' '));
        } else {
          setText('sddActionTitle', 'Maintain your routine');
          setText('sddActionBody', 'No high/medium-risk advice triggered for this snapshot.');
        }
      } catch {
        if (!alive) return;
        setText('sddRiskHeadline', 'Unable to load risk insights');
        setText('sddRiskBody', 'Please try again.');
        setText('sddRiskMessage', '');
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
