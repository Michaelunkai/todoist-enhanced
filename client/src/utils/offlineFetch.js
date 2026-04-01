export async function offlineFetch(url, options = {}) {
  if (!window.navigator.onLine) {
    // Queue mutation for later
    const pending = JSON.parse(localStorage.getItem('pending_mutations') || '[]');
    pending.push({
      method: options.method || 'GET',
      url,
      body: options.body || null,
      timestamp: Date.now()
    });
    localStorage.setItem('pending_mutations', JSON.stringify(pending));
    // Return a fake success response to avoid UI errors
    return { ok: true, queued: true };
  }
  return fetch(url, options);
}
