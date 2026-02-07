import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';

import { uploadReport } from '../api.js';
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

function showToast() {
  const toast = document.getElementById('successToast');
  if (!toast) return;
  toast.classList.remove('translate-y-24', 'opacity-0');
  toast.classList.add('translate-y-0', 'opacity-100');
}

export default function ReportsTemplate() {
  const navigate = useNavigate();
  const { user, signOut } = useAuth();
  const userId = user?.id;

  const [html, setHtml] = useState('');

  useEffect(() => {
    let cancelled = false;
    loadTemplateBody('/templates/reports.html')
      .then((bodyHtml) => {
        if (!cancelled) setHtml(bodyHtml);
      })
      .catch(() => {
        if (!cancelled) setHtml('<div style="padding:24px">Failed to load reports template.</div>');
      });
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!html || !userId) return;
    document.documentElement.classList.add('light');

    // Logout hooks (template includes auth scripts; we replace)
    const logoutButtons = Array.from(document.querySelectorAll('[data-sdd-logout]'));
    const onLogout = async (e) => {
      e.preventDefault();
      await signOut();
      navigate('/login', { replace: true });
    };
    for (const b of logoutButtons) b.addEventListener('click', onLogout);

    const userEl = document.getElementById('sddReportUser');
    if (userEl) userEl.textContent = usernameFromUser(user);

    const dateEl = document.getElementById('current-date');
    if (dateEl) dateEl.textContent = new Date().toLocaleDateString();

    const statusEl = document.getElementById('sddReportStatus');
    const listEl = document.getElementById('sddDetectedList');
    const summaryEl = document.getElementById('sddAnalysisSummary');

    const btn = document.getElementById('downloadBtn');
    const btnContent = document.getElementById('btnContent');
    const btnLoader = document.getElementById('btnLoader');
    const fileInput = document.getElementById('sddReportFile');

    const setLoading = (loading) => {
      if (!btn || !btnContent || !btnLoader) return;
      btn.disabled = loading;
      if (loading) {
        btnContent.classList.add('hidden');
        btnLoader.classList.remove('hidden');
      } else {
        btnContent.classList.remove('hidden');
        btnLoader.classList.add('hidden');
      }
    };

    const renderDetected = (detectedValues) => {
      if (!listEl) return;
      listEl.innerHTML = '';
      const entries = Object.entries(detectedValues || {});
      if (!entries.length) {
        const li = document.createElement('li');
        li.textContent = 'No values detected.';
        listEl.appendChild(li);
        return;
      }
      for (const [k, v] of entries) {
        const li = document.createElement('li');
        li.textContent = `${k}: ${v}`;
        listEl.appendChild(li);
      }
    };

    const onAnalyzeAndDownload = async (e) => {
      e.preventDefault();
      const file = fileInput?.files?.[0] || null;
      if (!file) {
        if (statusEl) statusEl.textContent = 'Please select a report file.';
        return;
      }

      const seed = loadProfile(userId) || {};
      const payload = { ...seed, patient_id: userId };

      setLoading(true);
      if (statusEl) statusEl.textContent = 'Analyzing report…';
      if (summaryEl) summaryEl.textContent = '';

      try {
        const res = await uploadReport({ file, payload });

        renderDetected(res.detectedValues || {});

        const analysis = res.analysis || null;
        if (summaryEl && analysis) {
          summaryEl.textContent = `Diabetes ${Math.round(Number(analysis.diabetesRisk) || 0)}% • Heart ${Math.round(Number(analysis.heartRisk) || 0)}% • Liver ${Math.round(Number(analysis.liverRisk) || 0)}% • Depression ${Math.round(Number(analysis.depressionRisk) || 0)}%`;
        }

        // Download a JSON report (browser "Save as PDF" can be used from print if desired)
        const report = {
          generatedAt: new Date().toISOString(),
          user: { id: userId, email: user?.email || null },
          file: { name: res.fileName, contentType: res.contentType },
          detectedValues: res.detectedValues || {},
          analysis: res.analysis || null,
        };

        const blob = new Blob([JSON.stringify(report, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `sdd-report-${Date.now()}.json`;
        document.body.appendChild(a);
        a.click();
        a.remove();
        URL.revokeObjectURL(url);

        if (statusEl) statusEl.textContent = 'Done.';
        showToast();
      } catch (err) {
        if (statusEl) statusEl.textContent = `Error: ${err?.message || err}`;
      } finally {
        setLoading(false);
      }
    };

    if (btn) btn.addEventListener('click', onAnalyzeAndDownload);

    return () => {
      for (const b of logoutButtons) b.removeEventListener('click', onLogout);
      if (btn) btn.removeEventListener('click', onAnalyzeAndDownload);
    };
  }, [html, navigate, signOut, user, userId]);

  return <div dangerouslySetInnerHTML={{ __html: html }} />;
}
