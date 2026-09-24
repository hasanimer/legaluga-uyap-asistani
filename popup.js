const { ORIGIN, openPath, mountUI } = UHD;
const UYAP_MATCH = ORIGIN + '/*';
const sourceTabId = new URLSearchParams(window.location.search).get('tabId');
if (sourceTabId !== null) document.documentElement.dataset.window = 'true';

async function uyapTab() {
  if (sourceTabId !== null) {
    if (!/^\d+$/.test(sourceTabId) || !Number.isSafeInteger(Number(sourceTabId))) return null;
    try {
      const source = await chrome.tabs.get(Number(sourceTabId));
      return source.url?.startsWith(ORIGIN + '/') ? source : null;
    } catch { return null; }
  }
  const [active] = await chrome.tabs.query({ active: true, currentWindow: true });
  if (active && active.url && active.url.startsWith(ORIGIN + '/')) return active;
  const tabs = await chrome.tabs.query({ url: UYAP_MATCH });
  tabs.sort((a, b) => (b.lastAccessed || 0) - (a.lastAccessed || 0));
  return tabs[0] || null;
}

// UYAP sekmesi yoksa: UYAP açılır; dosya istendiyse giriş yapıldıktan sonra kendiliğinden açılır (3 dk içinde).
function noTab(rec) {
  ui.setNotice(rec
    ? 'UYAP’ta açık sekme yok. “UYAP’ı aç”a basın; giriş yaptığınızda dosya kendiliğinden açılır.'
    : 'UYAP’ta açık sekme yok. “UYAP’ı aç”a basıp giriş yapın; sonra tekrar deneyin.', 'err', {
    label: 'UYAP’ı aç',
    fn: async () => {
      if (rec) await chrome.storage.local.set({ uhdPending: { record: rec, at: Date.now() } });
      await chrome.tabs.create({ url: ORIGIN + (rec ? openPath(rec) : '/') });
      window.close();
    }
  });
}

async function closeIfWanted() {
  const { uhdPrefs } = await chrome.storage.local.get('uhdPrefs');
  if (!uhdPrefs || uhdPrefs.popupKapat !== false) window.close();
}

async function focusTab(tab) {
  await chrome.tabs.update(tab.id, { active: true });
  await chrome.windows.update(tab.windowId, { focused: true });
}

async function openRecord(rec) {
  const tab = await uyapTab();
  if (!tab) return noTab(rec);
  await focusTab(tab);
  try {
    await chrome.tabs.sendMessage(tab.id, { type: 'uhd-open', record: rec });
  } catch {
    // Sekme eklenti yüklenmeden önce açılmışsa içerik betiği yoktur: sayfayı dosya sorgulama adresine götür.
    await chrome.storage.local.set({ uhdPending: { record: rec, at: Date.now() } });
    await chrome.tabs.update(tab.id, { url: ORIGIN + openPath(rec) });
  }
  closeIfWanted();
}

// Evrak UYAP sekmesinde, sayfa içi görüntüleyicide açılır (evrakı UYAP oturumu getirir).
async function openEvrak(rec, key) {
  const tab = await uyapTab();
  if (!tab) return noTab();
  await focusTab(tab);
  try {
    await chrome.tabs.sendMessage(tab.id, { type: 'uhd-open-evrak', record: rec, key });
    closeIfWanted();
  } catch {
    ui.setNotice('UYAP sekmesi eklentiye yanıt vermedi. Sekmeyi yenileyip tekrar deneyin.', 'err', {
      label: 'Sekmeyi yenile',
      fn: () => chrome.tabs.reload(tab.id)
    });
  }
}

// Dosya paneli (safahat, icra özeti, borçlu sorgusu) UYAP sekmesinde açılır.
async function dosyaPanel(rec, tab) {
  const t = await uyapTab();
  if (!t) return noTab();
  await focusTab(t);
  try {
    await chrome.tabs.sendMessage(t.id, { type: 'uhd-dosya-panel', record: rec, tab });
    window.close();
  } catch {
    ui.setNotice('UYAP sekmesi eklentiye yanıt vermedi. Sekmeyi yenileyip tekrar deneyin.', 'err', {
      label: 'Sekmeyi yenile',
      fn: () => chrome.tabs.reload(t.id)
    });
  }
}

async function update(full) {
  const tab = await uyapTab();
  if (!tab) return noTab();
  try {
    const res = await chrome.tabs.sendMessage(tab.id, { type: 'uhd-update', full });
    if (!res || !res.ok) ui.setNotice((res && res.error) || 'Güncelleme başlatılamadı.', 'err');
    else ui.setNotice('Güncelleme UYAP sekmesinde sürüyor. Bu pencereyi kapatıp başka sekmelerde çalışabilirsiniz; UYAP sekmesi kapanırsa kaldığı yerden sürer.');
  } catch {
    ui.setNotice('UYAP sekmesi eklentiye yanıt vermedi. Sekmeyi yenileyip tekrar deneyin.', 'err', {
      label: 'Sekmeyi yenile',
      fn: () => chrome.tabs.reload(tab.id)
    });
  }
}

async function stop() {
  const tabs = await chrome.tabs.query({ url: UYAP_MATCH });
  await Promise.all(tabs.map(t => chrome.tabs.sendMessage(t.id, { type: 'uhd-stop' }).catch(() => {})));
}

const ui = mountUI(document.getElementById('app'), {
  mode: 'popup',
  onOpen: openRecord,
  onOpenEvrak: openEvrak,
  onDosyaPanel: dosyaPanel,
  onHaciz: () => { window.location.href = chrome.runtime.getURL('haciz/popup.html') + window.location.search; },
  onUpdate: update,
  onStop: stop
});

// Arama metni müvekkil adı içerebileceği için saklanmaz; önceki sürümden kalan kaydı da sil.
try { localStorage.removeItem('uhd-q'); } catch {}
setTimeout(() => ui.focus(), 50);
