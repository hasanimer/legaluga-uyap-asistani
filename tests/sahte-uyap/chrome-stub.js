// chrome.* API'sinin test için bellek içi taklidi (sayfa yenilense de localStorage'da kalır).
(() => {
  const KEY = 'uhd-mock-storage';
  const load = () => { try { return JSON.parse(localStorage.getItem(KEY)) || {}; } catch { return {}; } };
  const save = d => localStorage.setItem(KEY, JSON.stringify(d));
  const listeners = [];
  const msgListeners = [];
  window.chrome = {
    storage: {
      local: {
        async get(keys) {
          const d = load();
          if (keys == null) return d;
          const out = {};
          for (const k of [].concat(keys)) if (k in d) out[k] = d[k];
          return out;
        },
        async set(obj) {
          const d = load();
          const ch = {};
          for (const [k, v] of Object.entries(obj)) { ch[k] = { oldValue: d[k], newValue: JSON.parse(JSON.stringify(v)) }; d[k] = v; }
          save(d);
          listeners.forEach(fn => fn(ch, 'local'));
        },
        async remove(keys) {
          const d = load();
          const ch = {};
          for (const k of [].concat(keys)) { if (k in d) { ch[k] = { oldValue: d[k] }; delete d[k]; } }
          save(d);
          listeners.forEach(fn => fn(ch, 'local'));
        }
      },
      onChanged: { addListener: fn => listeners.push(fn) }
    },
    runtime: { onMessage: { addListener: fn => msgListeners.push(fn) } }
  };
  // Gerçek chrome.storage gibi başka sekmedeki değişiklikleri de bildir (localStorage "storage" olayıyla).
  window.addEventListener('storage', e => {
    if (e.key !== KEY) return;
    let o = {}, n = {};
    try { o = JSON.parse(e.oldValue) || {}; } catch {}
    try { n = JSON.parse(e.newValue) || {}; } catch {}
    const ch = {};
    for (const k of new Set([...Object.keys(o), ...Object.keys(n)])) {
      if (JSON.stringify(o[k]) !== JSON.stringify(n[k])) ch[k] = { oldValue: o[k], newValue: n[k] };
    }
    if (Object.keys(ch).length) listeners.forEach(fn => fn(ch, 'local'));
  });
  window.__uhdSend = msg => new Promise(res => { for (const fn of msgListeners) fn(msg, {}, res); });
  window.confirm = () => true;
})();
