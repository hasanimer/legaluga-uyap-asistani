// Legaluga haciz ekranı: tür seçimi, canlı adımlar ve ortak görünüm tercihi.
//
// Burada dosya/taraf verisi tutulmaz. chrome.storage.local yalnız tercihleri
// (haciz türü tikleri, banka talebinin evrak türü) saklar. Ortak tema
// uhdPrefs içindedir; adım durumu chrome.storage.session'dadır.
'use strict';

// background.js ile aynı numara. Tutmuyorsa Chrome hâlâ eklentinin eski
// sürümünü çalıştırıyordur ve popup'ta yapılan seçimler sayfaya ulaşmaz;
// böyle bir durumda iş hiç başlatılmaz (bkz. background.js'teki açıklama).
const PROTOCOL = 4;

const PROGRESS_KEY = 'ubh_progress';
const PREFS_KEY = 'ubh_prefs';
const UYAP_PREFIX = 'https://avukat.uyap.gov.tr/';
const sourceTabId = new URLSearchParams(window.location.search).get('tabId');
if (sourceTabId !== null) {
  document.documentElement.dataset.window = 'true';
  document.getElementById('back-search').href = '../popup.html' + window.location.search;
}

// Toplu akışta çalışabilecek haciz türleri. Sıra burada değil sayfa tarafında
// belirlenir: banka sorgulardan sonra, maaş talebi onun ardından çalışır.
const BULK_TYPES = ['egm', 'icra', 'takbis', 'banka', 'maas'];

// Sayfa kapanmış ya da sekme değişmişse "çalışıyor" durumu sonsuza kadar
// asılı kalmasın diye üst sınır. Tek tek eklenecek çok sayıda kayıt
// olabildiğinden geniş tutulur.
const STALE_MS = 10 * 60 * 1000;

// Çalışma sürerken sayfaya dokunmak sıralamayı bozabiliyor; uyarı tam da o
// sırada, durum çubuğunun altında durur.
const RUNNING_HINT = 'İşlem sürerken sayfada bir yere tıklamayın; ' +
                     'sıralamayı ve işlemleri sekteye uğratabilirsiniz.';

const el = {
  theme: document.getElementById('theme'),
  start: document.getElementById('start'),
  reset: document.getElementById('reset'),
  howto: document.querySelector('.howto'),
  status: document.getElementById('status'),
  statusText: document.getElementById('status-text'),
  statusDetail: document.getElementById('status-detail'),
  statusFill: document.getElementById('status-fill'),
  stages: document.getElementById('stages'),
  maasOptions: document.getElementById('maas-options'),
  bankaOptions: document.getElementById('banka-options'),
  maasStatus: document.getElementById('maas-status'),
  maasEmployer: document.getElementById('maas-employer'),
  version: document.getElementById('version')
};

// --- Tercihler --------------------------------------------------------------

// Banka talebinin evrak türü. İkisinden biri daima seçilidir.
const BANKA_TALEP = ['ihbarname', 'muzekkere'];

// Önceki dört haciz türü öntanımlı olarak tiklidir; maaş haczi açık bir
// çalışma durumu seçimi gerektirdiği için kapalı başlar. Ücretli sorgu onayı para
// harcattığı için öntanımlı olarak kapalıdır. Banka talebi öntanımlı olarak
// 89/1 haciz ihbarnamesidir.
function defaultPrefs() {
  return {
    toplu: {
      paid: false, egm: true, icra: true, takbis: true, banka: true, maas: false,
      bankaTalep: 'ihbarname'
    }
  };
}

let prefs = defaultPrefs();

function applyPrefs() {
  // Tik kutuları açık/kapalı değer taşır; radyo düğmeleri (banka talebi)
  // seçili seçeneğin adını.
  for (const input of document.querySelectorAll('[data-opt]')) {
    const [group, key] = input.dataset.opt.split('.');
    const value = prefs[group]?.[key];
    input.checked = input.type === 'radio' ? value === input.value : !!value;
  }
  el.maasOptions.hidden = !prefs.toplu.maas;
  el.bankaOptions.hidden = !prefs.toplu.banka;
}

function savePrefs() {
  // Ücretli sorgu izni bir sonraki açılışa taşınmaz.
  chrome.storage.local.set({ [PREFS_KEY]: {
    ...prefs, toplu: { ...prefs.toplu, paid: false }
  } });
}

async function loadPrefs() {
  const stored = await chrome.storage.local.get(PREFS_KEY);
  const saved = stored[PREFS_KEY];

  // Yalnız tanınan alanlar alınır: eski sürümlerden kalan (ödeme türü, bölüm
  // tikleri) anahtarlar taşınmaz.
  if (saved) {
    prefs.toplu = { ...defaultPrefs().toplu, ...(saved.toplu || {}) };
    prefs.toplu.paid = false;
    if (!BANKA_TALEP.includes(prefs.toplu.bankaTalep)) {
      prefs.toplu.bankaTalep = defaultPrefs().toplu.bankaTalep;
    }
  }
  applyPrefs();
}

const darkMq = window.matchMedia('(prefers-color-scheme: dark)');
let themeChoice = 'auto';

function applyTheme() {
  document.documentElement.dataset.theme = themeChoice === 'auto'
    ? (darkMq.matches ? 'dark' : 'light') : themeChoice;
  el.theme.value = themeChoice;
}

async function loadTheme() {
  const { uhdPrefs } = await chrome.storage.local.get('uhdPrefs');
  themeChoice = ['auto', 'light', 'dark'].includes(uhdPrefs?.tema) ? uhdPrefs.tema : 'auto';
  applyTheme();
}

darkMq.addEventListener('change', () => {
  if (themeChoice === 'auto') applyTheme();
});
applyTheme();
chrome.storage.onChanged.addListener((changes, area) => {
  if (area !== 'local' || !changes.uhdPrefs) return;
  const value = changes.uhdPrefs.newValue?.tema;
  themeChoice = ['auto', 'light', 'dark'].includes(value) ? value : 'auto';
  applyTheme();
});

// --- Durum ------------------------------------------------------------------

// Her bölüm için bir satır: durum noktası, bölümün adı ve gerekiyorsa altında
// tek satırlık not ("Araç kaydı yok", engelin adı ...). Notun altına, bölüm
// yürümüş olsa da gözden geçirilmesi gereken uyarılar düşebilir: eşleşmediği
// için atlanan kurumlar, banka sonucunun teyit hatırlatması. Metin daima
// textContent ile yazılır; sayfadan gelen bir cümle biçimlendirme olarak
// yorumlanmaz.
function stageRow(item) {
  const row = document.createElement('li');
  row.className = 'stage';
  row.dataset.state = item.state || 'running';

  const dot = document.createElement('span');
  dot.className = 'stage__dot';
  row.append(dot);

  const body = document.createElement('span');
  body.className = 'stage__body';

  const name = document.createElement('span');
  name.className = 'stage__name';
  name.textContent = item.name || '';
  body.append(name);

  if (item.note) {
    const note = document.createElement('span');
    note.className = 'stage__note';
    note.textContent = item.note;
    body.append(note);
  }

  for (const text of Array.isArray(item.warns) ? item.warns : []) {
    if (!text) continue;

    const warn = document.createElement('span');
    warn.className = 'stage__warn';
    warn.textContent = text;
    body.append(warn);
  }

  row.append(body);
  return row;
}

// Liste ne zaman yeniden kurulacak ve nereye kaydırılacak.
//
// render() hem her ilerleme mesajında (saniyede birkaç kez) hem de beş
// saniyelik yoklamada çalışır. Satırları her seferinde yıkıp yeniden kurmak
// iki soruna yol açıyordu: #stages bir aria-live bölgesidir, ekran okuyucu
// listenin tamamını sürekli baştan okur; bir de listenin kaydırma konumu her
// seferinde sıfırlanır. Bu yüzden içerik gerçekten değişmediyse DOM'a hiç
// dokunulmaz.
let stagesSignature = null;

function renderStages(stages) {
  const signature = JSON.stringify(
    stages.map(item => [item.key, item.name, item.state, item.note, item.warns])
  );
  if (signature === stagesSignature) return;
  stagesSignature = signature;

  // Listenin yüksekliği sınırlıdır (bkz. popup.css). UYAP'ın uzun uyarı
  // cümleleri satırları şişirdiğinde liste taşar ve sıra sabit olduğu için
  // görünmez kalan daima EN ALTTAKİ satır olur — çalışma sürerken de o satır
  // canlı izlenen satırdır. Liste dipteyse dibe yapışır; kullanıcı bir notu
  // okumak için yukarı kaydırdıysa yerinden edilmez.
  const running = stages.some(item => item.state === 'running');
  const previousTop = el.stages.scrollTop;
  const atBottom =
    el.stages.scrollTop + el.stages.clientHeight >= el.stages.scrollHeight - 4;

  el.stages.hidden = stages.length === 0;
  el.stages.replaceChildren(...stages.map(stageRow));

  // Bitmiş bir liste baştan okunur; dibe yapışma yalnız çalışma sürerken
  // geçerlidir.
  el.stages.scrollTop = running && atBottom ? el.stages.scrollHeight : previousTop;
}

function render(progress) {
  let state = progress?.state || 'idle';
  let label = progress?.label || 'Hazır';

  if (state === 'running' && Date.now() - (progress.at || 0) > STALE_MS) {
    state = 'error';
    label = 'Bir şeyler ters gitti';
  }

  const total = progress?.total || 0;
  const index = progress?.index || 0;

  el.status.dataset.state = state;
  el.statusText.textContent = label;

  el.start.disabled = state === 'running';

  // Çalıştırma bitmiştir: ya sonuç yazılıdır ya da nerede takıldığı. İki
  // durumda da ekranda duran özeti kaldırıp “Hazır”a dönmenin bir yolu olmalı.
  el.reset.hidden = !(state === 'done' || state === 'error');

  // Bittiğinde SONUÇ özeti, takıldığında nerede durulduğu, çalışırken de
  // sayfaya dokunmama uyarısı aynı satırda görünür.
  let detail = '';
  if (state === 'done' || state === 'error') detail = progress?.detail || '';
  else if (state === 'running') detail = RUNNING_HINT;

  el.statusDetail.textContent = detail;
  el.statusDetail.hidden = !detail;

  renderStages(Array.isArray(progress?.stages) ? progress.stages : []);

  let percent = 0;
  if (state === 'running' && total > 0) percent = Math.min(100, (index / total) * 100);
  else if (state === 'done') percent = 100;
  else if (state === 'error') percent = 100;

  el.statusFill.style.width = `${percent}%`;
}

async function refresh() {
  const stored = await chrome.storage.session.get(PROGRESS_KEY);
  render(stored[PROGRESS_KEY]);
}

chrome.storage.session.onChanged.addListener(changes => {
  if (changes[PROGRESS_KEY]) render(changes[PROGRESS_KEY].newValue);
});

// Askıda kalmış bir çalıştırma popup açıkken de fark edilsin.
setInterval(refresh, 5000);

// --- Olaylar ----------------------------------------------------------------

el.theme.addEventListener('change', async () => {
  themeChoice = el.theme.value;
  applyTheme();
  const { uhdPrefs } = await chrome.storage.local.get('uhdPrefs');
  await chrome.storage.local.set({ uhdPrefs: { ...(uhdPrefs || {}), tema: themeChoice } });
});

for (const input of document.querySelectorAll('[data-opt]')) {
  // Radyo düğmesinde change yalnız yeni seçilen seçenekte tetiklenir; diğerinin
  // tiki tarayıcı tarafından kaldırılır.
  input.addEventListener('change', () => {
    const [group, key] = input.dataset.opt.split('.');
    prefs[group][key] = input.type === 'radio' ? input.value : input.checked;
    if (key === 'maas') el.maasOptions.hidden = !input.checked;
    if (key === 'banka') el.bankaOptions.hidden = !input.checked;
    savePrefs();
  });
}

// Etkin sekme popup içinden bulunur: service worker'ın kendine ait bir
// pencere bağlamı yoktur, orada "currentWindow" güvenilir değildir.
async function activeUyapTab() {
  if (sourceTabId !== null) {
    if (!/^\d+$/.test(sourceTabId) || !Number.isSafeInteger(Number(sourceTabId))) return null;
    try {
      const source = await chrome.tabs.get(Number(sourceTabId));
      return source.url?.startsWith(UYAP_PREFIX) ? source : null;
    } catch { return null; }
  }
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  if (!tab?.id) return null;
  // "tabs" izni olmadığından host izni dışındaki sekmelerde tab.url boş gelir;
  // boş adres de UYAP değildir. Eskiden boş adres kontrolü atlıyor, enjeksiyon
  // patlıyor ve kullanıcı yanlış bir "sayfayı yenileyin" hatası görüyordu.
  if (!tab.url || !tab.url.startsWith(UYAP_PREFIX)) return null;
  return tab;
}

// Arka plan bu popup'la aynı sürüm mü? Eski service worker bilinmeyen mesaja
// yanıt vermez; o zaman sendMessage ya boş döner ya da hata atar.
async function workerReady() {
  try {
    const reply = await chrome.runtime.sendMessage({ type: 'UBH_PING' });
    return reply?.protocol === PROTOCOL;
  } catch (_) {
    return false;
  }
}

el.start.addEventListener('click', async () => {
  const types = BULK_TYPES.filter(type => prefs.toplu[type] !== false);

  if (types.length === 0) {
    render({ state: 'error', label: 'En az bir haciz türü seçin' });
    return;
  }

  if (types.includes('maas') && !el.maasStatus.value) {
    render({ state: 'error', label: 'Maaş haczi için çalışma durumu seçin' });
    return;
  }

  if (prefs.toplu.paid && !window.confirm(
    'Ücretsiz hak biterse UYAP ücretli sorgu onayını otomatik kabul edebilir. ' +
    'Bakiye ve işlem ücretlerini kontrol ettiniz mi?'
  )) return;

  el.start.disabled = true;
  render({ state: 'running', label: 'Başlatılıyor', at: Date.now() });

  try {
    const tab = await activeUyapTab();

    if (!tab) {
      render({ state: 'error', label: sourceTabId !== null
        ? 'Bu pencerenin bağlı olduğu UYAP sekmesi kapalı veya başka sayfaya geçmiş'
        : 'UYAP Avukat Portalı sekmesi bulunamadı' });
      return;
    }

    // Eski sürüm çalışıyorsa buradaki seçimler sayfaya ulaşmaz: sessizce
    // yanlış iş yapmaktansa hiç başlamamak gerekir.
    if (!await workerReady()) {
      render({
        state: 'error',
        label: 'Eklentiyi yenileyin',
        detail: 'Yeni sürüm yüklendi ama Chrome arka planda hâlâ eskisini ' +
                'çalıştırıyor. chrome://extensions sayfasında bu eklentinin ' +
                'yenile düğmesine basın.'
      });
      return;
    }

    const reply = await chrome.runtime.sendMessage({
      type: 'UBH_START',
      tabId: tab.id,
      types,
      paid: prefs.toplu.paid === true,
      bankaTalep: prefs.toplu.bankaTalep,
      maasStatus: types.includes('maas') ? el.maasStatus.value : '',
      maasEmployer: types.includes('maas') ? el.maasEmployer.value.trim() : ''
    });
    if (!reply?.ok) render({ state: 'error', label: reply?.error || 'Başlatılamadı' });
  } catch (_) {
    render({ state: 'error', label: 'Bir şeyler ters gitti' });
  }
});

// Biten bir çalıştırmanın özetini kaldırıp ekranı “Hazır”a döndürür: popup’ı
// kapatıp açmaya gerek kalmadan yeni bir sorgu yapılabilsin. Silme işini arka
// plan yapar; geçici banka belleği de orada durduğu için durumun tek kaynağı
// orasıdır. Arka plan uyanmadıysa hiç değilse ekran temizlenir.
el.reset.addEventListener('click', async () => {
  el.reset.hidden = true;

  try {
    await chrome.runtime.sendMessage({ type: 'UBH_RESET' });
  } catch (_) {
    await chrome.storage.session.set({
      [PROGRESS_KEY]: {
        state: 'idle',
        label: 'Hazır',
        at: Date.now(),
        stages: [],
        index: 0,
        total: 0,
        detail: ''
      }
    });
  }

  refresh();
});

// Bölüm popup’ın en altındadır. Sonuç listesi doluyken açılınca metin
// ekranın altında kalıyor ve tıklama hiçbir şey yapmamış gibi görünüyordu;
// açılan bölüm görünür alana getirilir.
el.howto.addEventListener('toggle', () => {
  if (el.howto.open) {
    el.howto.scrollIntoView({ block: 'end', behavior: 'smooth' });
  }
});

el.version.textContent = `v${chrome.runtime.getManifest().version}`;

loadTheme();
loadPrefs();
refresh();
