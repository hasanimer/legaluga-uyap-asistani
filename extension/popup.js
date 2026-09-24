const { ORIGIN, openPath, mountUI } = UHD;
const UYAP_MATCH = ORIGIN + '/*';

async function uyapTab() {
  const [active] = await chrome.tabs.query({ active: true, currentWindow: true });
  if (active && active.url && active.url.startsWith(ORIGIN + '/')) return active;
  const tabs = await chrome.tabs.query({ url: UYAP_MATCH });
  tabs.sort((a, b) => (b.lastAccessed || 0) - (a.lastAccessed || 0));
  return tabs[0] || null;
}

function noTab() {
  ui.setNotice('Açık bir UYAP Avukat Portalı sekmesi bulunamadı. Önce UYAP’a giriş yapın.', 'err', {
    label: 'UYAP’ı aç',
    fn: () => chrome.tabs.create({ url: ORIGIN + '/' })
  });
}

async function focusTab(tab) {
  await chrome.tabs.update(tab.id, { active: true });
  await chrome.windows.update(tab.windowId, { focused: true });
}

async function openRecord(rec) {
  const tab = await uyapTab();
  if (!tab) return noTab();
  await focusTab(tab);
  try {
    await chrome.tabs.sendMessage(tab.id, { type: 'uhd-open', record: rec });
  } catch {
    // Sekme eklenti yüklenmeden önce açılmışsa içerik betiği yoktur: sayfayı dosya sorgulama adresine götür.
    await chrome.storage.local.set({ uhdPending: { record: rec, at: Date.now() } });
    await chrome.tabs.update(tab.id, { url: ORIGIN + openPath(rec) });
  }
  window.close();
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
  onUpdate: update,
  onStop: stop
});

// Arama metni müvekkil adı içerebileceği için saklanmaz; önceki sürümden kalan kaydı da sil.
try { localStorage.removeItem('uhd-q'); } catch {}
setTimeout(() => ui.focus(), 50);
