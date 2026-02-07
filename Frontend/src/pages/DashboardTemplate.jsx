import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Chart from 'chart.js/auto';

import { analyzeHealth, getPatientLatest, uploadReport } from '../api.js';
import { useAuth } from '../auth/useAuth.js';
import { loadTemplateBody } from '../utils/loadTemplateBody.js';
import { usernameFromUser } from '../utils/userDisplayName.js';

function profileKey(userId) {
  return `earlyrisk_profile_v1_${userId}`;
}

function loadProfile(userId) {
  try {
    const raw = localStorage.getItem(profileKey(userId));
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

function saveProfile(userId, profile) {
  try {
    localStorage.setItem(profileKey(userId), JSON.stringify(profile));
  } catch {
    // ignore
  }
}

function fmtPct(x) {
  const n = Number(x);
  if (!Number.isFinite(n)) return '—';
  return `${Math.round(n)}%`;
}

function riskToTextColor(riskPct) {
  const r = Number(riskPct);
  if (!Number.isFinite(r)) return ['text-slate-900', 'dark:text-white'];
  if (r < 35) return ['text-green-700', 'dark:text-green-400'];
  if (r < 70) return ['text-amber-700', 'dark:text-amber-400'];
  return ['text-red-700', 'dark:text-red-400'];
}

function computeBmi(heightCm, weightKg) {
  const h = Number(heightCm);
  const w = Number(weightKg);
  if (!Number.isFinite(h) || !Number.isFinite(w) || h <= 0) return null;
  const m = h / 100;
  return w / (m * m);
}

export default function DashboardTemplate() {
  const navigate = useNavigate();
  const { user, signOut } = useAuth();
  const userId = user?.id;

  const [html, setHtml] = useState('');

  useEffect(() => {
    let cancelled = false;
    loadTemplateBody('/templates/dashboard.html')
      .then((bodyHtml) => {
        if (!cancelled) setHtml(bodyHtml);
      })
      .catch(() => {
        if (!cancelled) setHtml('<div style="padding:24px">Failed to load dashboard template.</div>');
      });
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!html || !userId) return;

    document.documentElement.classList.add('light');

    // Wire logout
    const logoutButtons = Array.from(document.querySelectorAll('[data-sdd-logout]'));
    const onLogout = async (e) => {
      e.preventDefault();
      await signOut();
      navigate('/login', { replace: true });
    };
    for (const b of logoutButtons) b.addEventListener('click', onLogout);

    // Rewire legacy CTA (dashboard1.html)
    const legacyCta = Array.from(document.querySelectorAll('button[onclick]')).find((b) =>
      (b.getAttribute('onclick') || '').includes('dashboard1.html')
    );
    const onGoMetrics = (e) => {
      e.preventDefault();
      navigate('/metrics/analytics');
    };
    if (legacyCta) {
      legacyCta.removeAttribute('onclick');
      legacyCta.addEventListener('click', onGoMetrics);
    }

    // Set identity
    const nameEl = document.getElementById('sddUserName');
    const metaEl = document.getElementById('sddUserMeta');
    const bmiEl = document.getElementById('sddUserBmi');
    const displayName = usernameFromUser(user);
    if (nameEl) nameEl.textContent = displayName;
    if (metaEl) metaEl.textContent = 'Session active';

    const apiMessageEl = document.getElementById('sddApiMessage');
    const uploadStatusEl = document.getElementById('sddUploadStatus');
    const detectedEl = document.getElementById('sddDetectedValues');

    const setVal = (id, value) => {
      const el = document.getElementById(id);
      if (!el || value == null) return;
      el.value = String(value);
    };
    const getVal = (id) => document.getElementById(id)?.value;

    let chart;
    const chartCanvas = document.getElementById('sddTrendChart');

    const renderChart = (trendData) => {
      if (!chartCanvas) return;
      const td = trendData || {};
      const ts = Array.isArray(td.timestamps) ? td.timestamps : [];
      const metrics = td.metrics || {};
      const sugar = Array.isArray(metrics.sugar) ? metrics.sugar : [];
      const hba1c = Array.isArray(metrics.hba1c) ? metrics.hba1c : [];

      const labels = ts.length ? ts.map((t) => new Date(t).toLocaleDateString()) : ['Now'];
      const sugarSeries = sugar.length ? sugar : [Number.NaN];
      const hba1cSeries = hba1c.length ? hba1c : [Number.NaN];

      if (chart) chart.destroy();
      chart = new Chart(chartCanvas, {
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

    const setRisk = (id, value) => {
      const el = document.getElementById(id);
      if (!el) return;
      el.textContent = fmtPct(value);
      el.classList.remove(
        'text-green-700',
        'dark:text-green-400',
        'text-amber-700',
        'dark:text-amber-400',
        'text-red-700',
        'dark:text-red-400'
      );
      for (const cls of riskToTextColor(value)) el.classList.add(cls);
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

    const renderAnalysis = (analysis) => {
      if (!analysis) return;
      setRisk('sddRiskDiabetes', analysis.diabetesRisk);
      setRisk('sddRiskHeart', analysis.heartRisk);
      setRisk('sddRiskLiver', analysis.liverRisk);
      setRisk('sddRiskDepression', analysis.depressionRisk);
      renderAdvice(analysis.advice);
      renderChart(analysis.trendData);
    };

    const readPayload = () => ({
      patient_id: userId,
      age: Number(getVal('sddAge')),
      gender: String(getVal('sddGender')),
      family_history: Number(getVal('sddFamilyHistory')),
      height_cm: Number(getVal('sddHeight')),
      weight_kg: Number(getVal('sddWeight')),
      cholesterol_mgdl: Number(getVal('sddCholesterol')),
      sugar_mgdl: Number(getVal('sddSugar')),
      hba1c_pct: Number(getVal('sddHba1c')),
      sleep_hours: Number(getVal('sddSleep')),
      bp_systolic: Number(getVal('sddBpSys')),
      bp_diastolic: Number(getVal('sddBpDia')),
      exercise_mins_per_week: Number(getVal('sddExercise')),
      stress_level: Number(getVal('sddStress')),
    });

    const seed = loadProfile(userId);
    if (seed) {
      setVal('sddAge', seed.age);
      setVal('sddGender', seed.gender);
      setVal('sddFamilyHistory', seed.family_history ? '1' : '0');
      setVal('sddHeight', seed.height_cm);
      setVal('sddWeight', seed.weight_kg);
      setVal('sddCholesterol', seed.cholesterol_mgdl);
      setVal('sddSugar', seed.sugar_mgdl);
      setVal('sddHba1c', seed.hba1c_pct);
      setVal('sddSleep', seed.sleep_hours);
      setVal('sddBpSys', seed.bp_systolic);
      setVal('sddBpDia', seed.bp_diastolic);
      setVal('sddExercise', seed.exercise_mins_per_week);
      setVal('sddStress', seed.stress_level);
      const bmi = computeBmi(seed.height_cm, seed.weight_kg);
      if (bmiEl) bmiEl.textContent = bmi ? `BMI ${bmi.toFixed(1)}` : 'BMI —';
    } else {
      if (bmiEl) bmiEl.textContent = 'BMI —';
    }

    const analyzeBtn = document.getElementById('sddAnalyzeBtn');
    const onAnalyze = async (e) => {
      e.preventDefault();
      if (apiMessageEl) apiMessageEl.textContent = 'Running AI engine…';
      if (analyzeBtn) analyzeBtn.disabled = true;
      try {
        const payload = readPayload();
        saveProfile(userId, { ...payload, patient_id: undefined });
        const res = await analyzeHealth(payload, { persist: true });
        renderAnalysis(res);
        if (apiMessageEl) apiMessageEl.textContent = 'Analysis complete.';
        const bmi = computeBmi(payload.height_cm, payload.weight_kg);
        if (bmiEl) bmiEl.textContent = bmi ? `BMI ${bmi.toFixed(1)}` : 'BMI —';
      } catch (err) {
        if (apiMessageEl) apiMessageEl.textContent = `Error: ${err?.message || err}`;
      } finally {
        if (analyzeBtn) analyzeBtn.disabled = false;
      }
    };
    if (analyzeBtn) analyzeBtn.addEventListener('click', onAnalyze);

    const uploadBtn = document.getElementById('sddUploadBtn');
    const fileInput = document.getElementById('sddReportFile');
    const onUpload = async (e) => {
      e.preventDefault();
      const file = fileInput?.files?.[0] || null;
      if (!file) {
        if (uploadStatusEl) uploadStatusEl.textContent = 'Please choose a file first.';
        return;
      }
      if (uploadBtn) uploadBtn.disabled = true;
      if (uploadStatusEl) uploadStatusEl.textContent = 'Uploading & scanning…';
      if (detectedEl) detectedEl.innerHTML = '';
      try {
        const payload = readPayload();
        const res = await uploadReport({ file, payload });
        if (uploadStatusEl) uploadStatusEl.textContent = `Scanned ${res.fileName}`;
        if (detectedEl) {
          const dv = res.detectedValues || {};
          detectedEl.innerHTML = `<pre style="white-space:pre-wrap">${JSON.stringify(dv, null, 2)}</pre>`;
        }
        if (res.analysis) renderAnalysis(res.analysis);
      } catch (err) {
        if (uploadStatusEl) uploadStatusEl.textContent = `Error: ${err?.message || err}`;
      } finally {
        if (uploadBtn) uploadBtn.disabled = false;
      }
    };
    if (uploadBtn) uploadBtn.addEventListener('click', onUpload);

    // Latest
    let alive = true;
    (async () => {
      try {
        const latest = await getPatientLatest(userId);
        if (!alive) return;
        if (latest?.patient && latest?.latest) {
          setVal('sddAge', latest.patient.age);
          setVal('sddGender', latest.patient.gender);
          setVal('sddHeight', latest.patient.height_cm);
          setVal('sddWeight', latest.latest.weight_kg);
          setVal('sddBpSys', latest.latest.bp_systolic);
          setVal('sddBpDia', latest.latest.bp_diastolic);
          setVal('sddSugar', latest.latest.sugar_mgdl);
          setVal('sddHba1c', latest.latest.hba1c_pct);
          setVal('sddCholesterol', latest.latest.cholesterol_mgdl);
          setVal('sddSleep', latest.latest.sleep_hours);
          setVal('sddExercise', latest.latest.exercise_mins_per_week);
          setVal('sddStress', latest.latest.stress_level);
          setVal('sddFamilyHistory', String(latest.latest.family_history ? 1 : 0));

          const bmi = computeBmi(latest.patient.height_cm, latest.latest.weight_kg);
          if (bmiEl) bmiEl.textContent = bmi ? `BMI ${bmi.toFixed(1)}` : 'BMI —';
        }
        if (latest?.analysis) renderAnalysis(latest.analysis);
      } catch {
        // ignore
      }
    })();

    return () => {
      alive = false;
      for (const b of logoutButtons) b.removeEventListener('click', onLogout);
      if (legacyCta) legacyCta.removeEventListener('click', onGoMetrics);
      if (analyzeBtn) analyzeBtn.removeEventListener('click', onAnalyze);
      if (uploadBtn) uploadBtn.removeEventListener('click', onUpload);
      if (chart) chart.destroy();
    };
  }, [html, navigate, signOut, user, userId]);

  return <div dangerouslySetInnerHTML={{ __html: html }} />;
}
