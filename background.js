// Güncellemeyi yürüten UYAP sekmesi kapanırsa işi hemen serbest bırakır; açık başka bir UYAP sekmesi
// (content.js) onu kaldığı yerden devralır. Kapanan sayfa bunu kendisi her zaman yazamıyor.
// Ağ isteği yapmaz, veri okumaz; yalnız hangi sekmenin güncellemeyi yürüttüğünü (sekme numarası) tutar.

// Kaldırılan modülün eski tercih ve geçici kayıtlarını güncellemede temizle.
chrome.runtime.onInstalled.addListener(async details => {
  if (details.reason === 'install') await chrome.storage.local.set({ uhdLauncherIntroPending: true });
  await chrome.storage.local.remove('ubh_prefs');
  await chrome.storage.session.remove(['ubh_banks', 'ubh_progress']);
});

chrome.runtime.onMessage.addListener((msg, sender) => {
  if (msg && msg.type === 'uhd-owner' && sender.tab) {
    chrome.storage.session.set({ uhdOwnerTab: { tabId: sender.tab.id, owner: msg.owner } });
  }
});

chrome.tabs.onRemoved.addListener(async tabId => {
  const { uhdOwnerTab: o } = await chrome.storage.session.get('uhdOwnerTab');
  if (!o || o.tabId !== tabId) return;
  await chrome.storage.session.remove('uhdOwnerTab');
  const { uhdProgress: p, uhdJob: j } = await chrome.storage.local.get(['uhdProgress', 'uhdJob']);
  if (!j || !p || !p.running || p.owner !== o.owner) return;
  await chrome.storage.local.set({ uhdProgress: {
    ...p, owner: null, running: false, paused: true, handoff: true, beat: 0, endedAt: Date.now(),
    text: 'Güncelleme yarıda kaldı; açık bir UYAP sekmesinde ya da UYAP’ı yeniden açtığınızda kaldığı yerden sürer.'
  } });
});
