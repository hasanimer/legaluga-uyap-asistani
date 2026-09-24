// Güncellemeyi yürüten UYAP sekmesi kapanırsa işi hemen serbest bırakır; açık başka bir UYAP sekmesi
// (content.js) onu kaldığı yerden devralır. Kapanan sayfa bunu kendisi her zaman yazamıyor.
// Ağ isteği yapmaz, veri okumaz; yalnız hangi sekmenin güncellemeyi yürüttüğünü (sekme numarası) tutar.

// MIT lisanslı UYAP Haciz Yardımcısı'nın isteğe bağlı haciz hazırlama akışı.
importScripts('haciz/background.js');

chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
  if (msg?.type === 'uhd-haciz-open') {
    const tab = sender.tab;
    if (!Number.isInteger(tab?.id) || !tab.url?.startsWith('https://avukat.uyap.gov.tr/')) {
      sendResponse({ ok: false, error: 'Haciz ekranını UYAP sekmesindeki panelden açın.' });
      return false;
    }
    // Ayrı pencere açıldığında etkin sekme değişir; işlemi kaynak UYAP
    // sekmesine bağlayarak başka dosyada başlamasını önle.
    chrome.windows.create({
      url: chrome.runtime.getURL('haciz/popup.html') + '?tabId=' + tab.id,
      type: 'popup', width: 500, height: 700, focused: true
    }).then(
      opened => sendResponse({ ok: Number.isInteger(opened?.id) }),
      () => sendResponse({ ok: false, error: 'Haciz penceresi açılamadı. Tekrar deneyin.' })
    );
    return true;
  }
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
