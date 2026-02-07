export async function loadTemplateBody(url) {
  const resp = await fetch(url, { cache: 'no-cache' });
  if (!resp.ok) throw new Error(`Failed to load template: ${url}`);

  const html = await resp.text();
  const doc = new DOMParser().parseFromString(html, 'text/html');

  // Preserve inline <style> blocks from the template <head> so the injected page
  // can match the reference pixel styling.
  const headStyles = Array.from(doc.head?.querySelectorAll('style') || []);
  headStyles.forEach((styleEl, idx) => {
    const key = `${url}::${idx}`;
    if (document.head.querySelector(`style[data-sdd-template-style="${CSS.escape(key)}"]`)) return;
    const s = document.createElement('style');
    s.setAttribute('data-sdd-template-style', key);
    s.textContent = styleEl.textContent || '';
    document.head.appendChild(s);
  });

  // Remove scripts from injected markup; React/template pages wire behavior separately.
  for (const script of Array.from(doc.querySelectorAll('script'))) {
    script.remove();
  }

  return doc.body?.innerHTML || '';
}
