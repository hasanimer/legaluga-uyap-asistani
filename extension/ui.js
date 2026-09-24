// Arama arayüzü: hem eklenti popup'ında hem UYAP sayfasındaki yan panelde aynı kod kullanılır.
(() => {
  if (globalThis.UHD.mountUI) return;
  const { search, fmtNum, fmtDate, norm, detectMyName, myKeys, isClient, nameKey, BRAND, csvCell, csvDosyaNo, unseenEvrak, trDateTs, lastEvrak, personFiles, trToIso, todayIso, addPeriod, daysLeft, sureUyarilari, activeSureler, isTebligat, upcomingDurusmalar, durusmaIcs, evrakKey } = globalThis.UHD;
  const SURE_UYAR_GUN = 7;   // bu kadar gün ya da daha az kalan süreler panelde uyarılır
  const EVRAK_SHOW = 3;
  const LIMIT = 60;
  const RECENT_MAX = 10;
  const RUN_STALE_MS = 90000;
  const REMIND_DAYS = 7;
  const TARAF_V = 2;

  const CSS = `
.uhd{--navy:${BRAND.primary};--navy2:${BRAND.primaryDark};--deep:${BRAND.deep};--soft:${BRAND.soft};--bord:${BRAND.border};--focus:${BRAND.focus};--line:#e3e8f2;--muted:#667085;--bg:#f5f7fb;--text:#1d2939;--green:#12805c;--red:#b42318;
  font:13px/1.4 "Segoe UI",system-ui,-apple-system,Roboto,Arial,sans-serif;color:var(--text);background:var(--bg);
  display:flex;flex-direction:column;height:100%;min-height:0;box-sizing:border-box}
.uhd *{box-sizing:border-box}
.uhd [hidden]{display:none!important}
.uhd header{display:flex;align-items:center;gap:8px;padding:12px 14px 10px;background:var(--navy);color:#fff}
.uhd header strong{font-size:14px;font-weight:600;flex:1}
.uhd .count{font-size:12px;opacity:.8}
.uhd .x{background:none;border:0;color:#fff;font-size:22px;line-height:1;cursor:pointer;padding:0 2px}
.uhd .search{padding:0 12px 10px;background:var(--navy)}
.uhd .q{width:100%;border:0;border-radius:8px;padding:10px 12px;font:inherit;font-size:14px;outline:none;background:#fff;color:var(--text)}
.uhd .q:focus{box-shadow:0 0 0 3px rgba(255,255,255,.4)}
.uhd .filters{display:flex;flex-wrap:wrap;gap:5px;padding:8px 10px 2px;align-items:center}
.uhd .chip{border:1px solid #cfd6e4;background:#fff;color:#344054;border-radius:14px;padding:2px 10px;font:inherit;font-size:12px;cursor:pointer}
.uhd .chip:hover{border-color:var(--focus)}
.uhd .chip.on{background:var(--navy);border-color:var(--navy);color:#fff}
.uhd .chip.client.on{background:var(--deep);border-color:var(--deep)}
.uhd .chip.new{border-color:#b2ccff;color:#1849a9}
.uhd .chip.new.on{background:#1849a9;border-color:#1849a9;color:#fff}
.uhd .badge.new{background:#e0eaff;color:#1849a9}
.uhd .son{margin-top:2px;font-size:12px;color:var(--muted)}
.uhd .pname{border:0;background:none;padding:0;font:inherit;color:inherit;cursor:pointer;text-align:left;text-decoration:underline dotted;text-underline-offset:2px}
.uhd .pname:hover{color:var(--navy);text-decoration:underline}
.uhd .person{background:#fff;border:1px solid var(--line);border-radius:10px;padding:10px 12px;margin-bottom:8px}
.uhd .person .top{display:flex;align-items:center;gap:8px}
.uhd .person .top b{font-size:15px;color:var(--deep);flex:1}
.uhd .person .back{border:1px solid #cfd6e4;background:#fff;border-radius:8px;padding:3px 9px;font:inherit;font-size:12px;cursor:pointer}
.uhd .person .kind{font-size:11px;font-weight:600;letter-spacing:.04em;text-transform:uppercase;color:var(--muted)}
.uhd .person .sum{margin-top:4px;color:#344054}
.uhd .person .warn{margin-top:6px;padding:5px 8px;border-radius:6px;background:#fff4e5;color:#7a4b00;font-size:12px}
.uhd .person .hint{margin-top:6px;color:var(--muted);font-size:11px}
.uhd .person .row{display:flex;gap:10px;margin-top:6px}
.uhd .rolein{margin-top:3px;font-size:12px;color:var(--deep)}
.uhd .rolein.other{color:#7a4b00}
.uhd .chip.dur{border-color:#b9c4d4;color:#344054}
.uhd .chip.dur.on{background:#344054;border-color:#344054;color:#fff}
.uhd .durline{margin-top:2px;font-size:12px;color:#344054}
.uhd .durline b{font-weight:600}
.uhd .durline.today b{color:#b42318}
.uhd .durline.soon b{color:#93370d}
.uhd .dayhead{display:flex;justify-content:space-between;align-items:baseline;padding:8px 4px 5px;font-size:12px;font-weight:700;color:var(--deep)}
.uhd .dayhead.today{color:#b42318}
.uhd .dayhead small{font-weight:400;color:var(--muted)}
.uhd .durhead{background:#fff;border:1px solid var(--line);border-radius:10px;padding:10px 12px;margin-bottom:4px;font-size:12px;color:#344054}
.uhd .durhead .row{display:flex;gap:10px;align-items:center;margin-top:6px}
.uhd .durrow{display:flex;gap:10px;align-items:center;background:#fff;border:1px solid var(--line);border-radius:10px;padding:8px 10px;margin-bottom:6px}
.uhd .durrow .t{flex:none;font-weight:700;font-size:14px;color:var(--deep);width:44px}
.uhd .evopen{margin-left:4px}
.uhd .chip.sure{border-color:#f4b4ad;color:#b42318}
.uhd .chip.sure.on{background:#b42318;border-color:#b42318;color:#fff}
.uhd .sure{margin-top:5px;padding:5px 8px;border-left:3px solid #98a2b3;background:#f5f6f8;border-radius:0 6px 6px 0;font-size:12px;cursor:default}
.uhd .sure.warm{border-left-color:#f79009;background:#fff6e8}
.uhd .sure.hot{border-left-color:#d92d20;background:#fdecea}
.uhd .sure .line{display:flex;gap:8px;align-items:baseline;flex-wrap:wrap}
.uhd .sure .line b{color:#1d2939}
.uhd .sure .left{font-weight:600}
.uhd .sure.hot .left{color:#b42318}
.uhd .sure.warm .left{color:#93370d}
.uhd .sure .acts2{margin-left:auto;display:flex;gap:8px}
.uhd .sure-form{margin-top:6px;padding:8px;border:1px solid #cfd6e4;border-radius:8px;background:#fff;font-size:12px;cursor:default}
.uhd .sure-form .g{display:grid;grid-template-columns:auto 1fr;gap:6px 8px;align-items:center}
.uhd .sure-form input,.uhd .sure-form select{border:1px solid #cfd6e4;border-radius:6px;padding:4px 6px;font:inherit;min-width:0}
.uhd .sure-form .per{display:flex;gap:6px}
.uhd .sure-form .per input{width:60px}
.uhd .sure-form .w{margin-top:6px;color:#93370d}
.uhd .sure-form .h{margin-top:6px;color:var(--muted);font-size:11px}
.uhd .sure-form .b{display:flex;gap:8px;margin-top:8px}
.uhd .sure-form .b button{border:1px solid #cfd6e4;background:#fff;border-radius:6px;padding:4px 10px;font:inherit;cursor:pointer}
.uhd .sure-form .b button.p{background:var(--navy);border-color:var(--navy);color:#fff;font-weight:600}
.uhd .son b{font-weight:600;color:#344054}
.uhd .evrak{margin-top:5px;padding:5px 8px;border-left:3px solid #528bff;background:#f0f5ff;border-radius:0 6px 6px 0;font-size:12px;cursor:default}
.uhd .evrak .head{display:flex;justify-content:space-between;gap:8px;font-weight:600;color:#1849a9}
.uhd .evrak ul{margin:3px 0 0;padding:0;list-style:none}
.uhd .evrak li{margin:2px 0;color:#344054}
.uhd .evrak li small{color:var(--muted)}
.uhd .evrak .notebtn{color:#1849a9}
.uhd .sep{width:1px;height:16px;background:#d0d5dd;margin:0 2px}
.uhd .notice{margin:8px 10px 0;padding:8px 10px;border-radius:8px;background:#fff4e5;color:#7a4b00;font-size:12px;display:flex;gap:8px;align-items:center}
.uhd .notice.err{background:#fdecea;color:#8a1f17}
.uhd .notice button{margin-left:auto;flex:none;border:1px solid currentColor;background:none;color:inherit;border-radius:6px;padding:3px 8px;font:inherit;cursor:pointer}
.uhd .results{flex:1;min-height:0;overflow:auto;padding:8px}
.uhd .empty{padding:32px 16px;text-align:center;color:var(--muted)}
.uhd .more{padding:6px 10px 10px;text-align:center;font-size:12px;color:var(--muted)}
.uhd .section{display:flex;justify-content:space-between;padding:2px 4px 6px;font-size:11px;font-weight:600;letter-spacing:.04em;text-transform:uppercase;color:var(--muted)}
.uhd .section kbd{font:inherit;text-transform:none;letter-spacing:0;font-weight:400}
.uhd .onboard{margin:14px 6px;padding:16px 18px;background:#fff;border:1px solid var(--line);border-radius:12px}
.uhd .onboard b{display:block;font-size:14px;color:var(--navy);margin-bottom:6px}
.uhd .onboard ol{margin:0 0 14px;padding-left:20px;color:#344054}
.uhd .onboard li{margin:4px 0}
.uhd .onboard button{border:0;background:var(--navy);color:#fff;border-radius:8px;padding:9px 14px;font:inherit;font-weight:600;cursor:pointer}
.uhd .onboard button:disabled{opacity:.6;cursor:default}
.uhd .item{display:flex;gap:10px;align-items:center;background:#fff;border:1px solid var(--line);border-radius:10px;padding:10px 10px 10px 12px;margin-bottom:6px;cursor:pointer}
.uhd .item:hover{border-color:var(--bord)}
.uhd .item.sel{border-color:var(--focus);background:var(--soft)}
.uhd .info{flex:1;min-width:0}
.uhd .title{display:flex;gap:6px;align-items:baseline;flex-wrap:wrap}
.uhd .title b{font-size:14px;color:var(--navy)}
.uhd .title span{font-weight:500}
.uhd .meta{margin-top:2px;color:var(--muted);font-size:12px}
.uhd .badge{display:inline-block;padding:0 6px;border-radius:9px;font-size:11px;font-weight:600;background:#e7f6ef;color:var(--green);margin-right:4px}
.uhd .badge.closed{background:#eef0f3;color:#5b6474}
.uhd .client{margin-top:4px;font-size:12px;color:var(--deep)}
.uhd .client b{font-weight:600}
.uhd .parties{margin-top:3px;font-size:12px;color:#344054;display:-webkit-box;-webkit-line-clamp:3;-webkit-box-orient:vertical;overflow:hidden}
.uhd .parties .rol,.uhd .vek{color:var(--muted)}
.uhd .parties em{color:var(--muted)}
.uhd .note{margin-top:5px;padding:4px 8px;border-left:3px solid #f2c94c;background:#fffbea;border-radius:0 6px 6px 0;font-size:12px;white-space:pre-wrap}
.uhd .note-edit{margin-top:5px}
.uhd .note-edit textarea{width:100%;min-height:52px;resize:vertical;border:1px solid #cfd6e4;border-radius:6px;padding:6px 8px;font:inherit;font-size:12px;outline:none}
.uhd .note-edit textarea:focus{border-color:var(--navy)}
.uhd .note-edit small{color:var(--muted);font-size:11px}
.uhd mark{background:#ffe58a;color:inherit;border-radius:2px}
.uhd .acts{flex:none;display:flex;flex-direction:column;gap:4px;align-items:stretch}
.uhd .open{border:0;background:var(--navy);color:#fff;border-radius:8px;padding:8px 10px;font:inherit;font-weight:600;font-size:12px;cursor:pointer;white-space:nowrap}
.uhd .open:hover{background:var(--navy2)}
.uhd .minis{display:flex;justify-content:center;gap:8px}
.uhd .notebtn{border:0;background:none;color:var(--muted);font:inherit;font-size:11px;cursor:pointer;padding:2px 0;text-decoration:underline}
.uhd .notebtn:hover{color:var(--navy)}
.uhd .notebtn.done{color:var(--green);text-decoration:none}
.uhd .settings{padding:10px 12px;border-top:1px solid var(--line);background:#fff;font-size:12px}
.uhd .settings label{display:block;font-weight:600;margin-bottom:4px}
.uhd .settings label small{font-weight:400;color:var(--muted)}
.uhd .settings input{width:100%;border:1px solid #cfd6e4;border-radius:6px;padding:6px 8px;font:inherit;outline:none}
.uhd .settings input:focus{border-color:var(--navy)}
.uhd .settings .row{display:flex;gap:6px;margin-top:10px;align-items:center}
.uhd .settings .row button{border:1px solid #cfd6e4;background:#fff;border-radius:8px;padding:6px 10px;font:inherit;cursor:pointer}
.uhd .settings .row button.danger{border-color:#e5b3ae;color:var(--red)}
.uhd .settings .hint{color:var(--muted);margin-top:6px}
.uhd .settings label.check{display:flex;gap:6px;align-items:center;font-weight:400;margin:10px 0 0;cursor:pointer}
.uhd .settings label.check input{width:auto;margin:0}
.uhd .status{padding:7px 12px;color:var(--muted);font-size:12px;border-top:1px solid var(--line);background:#fff}
.uhd .status.err{color:var(--red)}
.uhd .bar{height:4px;background:var(--line);border-radius:2px;margin-top:5px;overflow:hidden}
.uhd .bar i{display:block;height:100%;width:0;background:var(--navy);transition:width .3s}
.uhd footer{display:flex;gap:6px;padding:4px 12px 10px;background:#fff;align-items:center}
.uhd footer button{border:1px solid #cfd6e4;background:#fff;color:var(--text);border-radius:8px;padding:7px 11px;font:inherit;cursor:pointer}
.uhd footer button.primary{background:var(--navy);border-color:var(--navy);color:#fff;font-weight:600}
.uhd footer button.danger{border-color:#e5b3ae;color:var(--red)}
.uhd footer button.link{margin-left:auto;border:0;background:none;color:var(--muted);text-decoration:underline;padding:7px 2px}
.uhd button:disabled{opacity:.5;cursor:default}
`;

  function el(tag, attrs, ...kids) {
    const e = document.createElement(tag);
    for (const [k, v] of Object.entries(attrs || {})) {
      if (v == null || v === false) continue;
      if (k.startsWith('on')) e.addEventListener(k.slice(2), v);
      else e.setAttribute(k, v === true ? '' : v);
    }
    for (const k of kids.flat()) if (k != null && k !== false) e.append(k);
    return e;
  }

  function highlight(text, toks) {
    text = text == null ? '' : String(text);
    const frag = document.createDocumentFragment();
    if (!toks.length || !text) { frag.append(text); return frag; }
    const n = norm(text);
    const marks = new Uint8Array(text.length);
    for (const t of toks) {
      for (let i = n.indexOf(t); i !== -1; i = n.indexOf(t, i + t.length)) marks.fill(1, i, i + t.length);
    }
    for (let i = 0; i < text.length;) {
      let j = i;
      while (j < text.length && marks[j] === marks[i]) j++;
      const part = text.slice(i, j);
      frag.append(marks[i] ? el('mark', null, part) : part);
      i = j;
    }
    return frag;
  }

  function fmtAgo(ts) {
    const m = Math.floor((Date.now() - ts) / 60000);
    if (m < 1) return 'az önce';
    if (m < 60) return `${m} dk önce`;
    const h = Math.floor(m / 60);
    if (h < 24) return `${h} saat önce`;
    const d = Math.floor(h / 24);
    return d === 1 ? 'dün' : `${d} gün önce`;
  }


  function mountUI(container, opts) {
    const input = el('input', { type: 'search', class: 'q', placeholder: 'Ad, soyad, dosya no, mahkeme veya not…', autocomplete: 'off', spellcheck: 'false', 'aria-label': 'Dosya ara' });
    const count = el('span', { class: 'count' });
    const filters = el('div', { class: 'filters' });
    const notice = el('div', { class: 'notice', hidden: true });
    const list = el('div', { class: 'results' });
    const statusText = el('div');
    const barFill = el('i');
    const bar = el('div', { class: 'bar', hidden: true }, barFill);
    const status = el('div', { class: 'status' }, statusText, bar);
    const nameInput = el('input', { type: 'text', autocomplete: 'off', spellcheck: 'false' });
    const duyuruBox = el('input', { type: 'checkbox' });
    const evrakBox = el('input', { type: 'checkbox' });
    const btnExport = el('button', { title: 'Tüm dosyaları taraflar ve notlarla birlikte Excel’de açılabilen CSV dosyası olarak indirir.' }, 'Excel’e aktar (CSV)');
    const btnClear = el('button', { class: 'danger', title: 'Dosya indeksini, notları, son açılanları ve ayarları bu bilgisayardan siler.' }, 'Tüm verileri sil');
    const settings = el('div', { class: 'settings', hidden: true },
      el('label', null, 'Vekil adınız ', el('small', null, '(müvekkil tespiti için; birden çok ad virgülle ayrılabilir)')),
      nameInput,
      el('label', { class: 'check' }, duyuruBox, 'UYAP girişindeki duyuru penceresini gösterme'),
      el('label', { class: 'check', title: 'Her açık dosya için UYAP’a bir istek daha yapılır; güncelleme bir miktar uzar.' }, evrakBox, 'Güncellemede açık dosyalardaki yeni evrakları bul'),
      el('div', { class: 'row' }, btnExport, btnClear),
      el('div', { class: 'hint' }, 'Tüm veriler yalnız bu bilgisayarda saklanır ve hiçbir sunucuya gönderilmez.'),
      el('div', { class: 'hint' }, BRAND.disclaimer, ' ', el('a', { href: BRAND.site + '/gizlilik/uyap-asistani', target: '_blank', rel: 'noopener' }, 'Gizlilik politikası')));
    const btnUpdate = el('button', { class: 'primary', title: 'Dosya listesini UYAP’tan yeniler; yalnızca yeni ve eksik dosyaların taraf bilgilerini alır.' }, 'Güncelle');
    const btnFull = el('button', { title: 'Dosya listesini ve tüm dosyaların taraf bilgilerini yeniden alır. Uzun sürebilir.' }, 'Tümünü yenile');
    const btnStop = el('button', { class: 'danger', hidden: true }, 'Durdur');
    const btnSettings = el('button', { class: 'link' }, 'Ayarlar');
    const root = el('div', { class: 'uhd ' + (opts.mode || '') },
      el('header', null, el('strong', null, BRAND.name), count,
        opts.onClose ? el('button', { class: 'x', title: 'Kapat', onclick: opts.onClose }, '×') : null),
      el('div', { class: 'search' }, input),
      filters, notice, list, settings, status,
      el('footer', null, btnUpdate, btnFull, btnStop, btnSettings));
    container.append(el('style', null, CSS), root);

    let records = [];
    let meta = {};
    let progress = null;
    let notes = {};
    let recent = [];
    let prefs = {};
    let detected = '';
    let current = [];
    let sel = 0;
    let editing = null;
    let manualNotice = false;
    let goruldu = {};
    let pendingJob = null;     // yarıda kalmış güncelleme işi (uhdJob)
    let person = null;         // açık müvekkil kartı: { name }
    let sureler = {};          // süre hatırlatmaları (uhdSureler): { id: { id, key, dosyaNo, birimAdi, baslik, baslangic, n, unit, bitis, done } }
    let sureMap = new Map();   // kayıt key → en yakın son gün
    let sureEdit = null;       // açık süre formu: { key, baslangic, kaynak }
    let durusmaMeta = null;    // uhdDurusmalar: { at, gun, list }
    let durusmaByKey = new Map(); // kayıt key → yaklaşan duruşmalar (sıralı)
    let yeniMap = new Map();   // kayıt key → en yeni görülmemiş evrakın onay zamanı
    let yeniCount = 0;         // görülmemiş yeni evrak sayısı
    let evrakTracked = false;  // en az bir dosyanın evrakları tarandı mı
    const filter = { durum: 'all', tur: 'all', onlyClient: false, onlyNew: false, onlySure: false, onlyDurusma: false };

    const myName = () => (prefs.myName || '').trim() || detected;
    const running = () => !!(progress && progress.running && Date.now() - (progress.beat || 0) < RUN_STALE_MS);

    function setIndex(ix) {
      records = (ix && ix.records) || [];
      meta = ix || {};
      detected = detectMyName(records);
      nameInput.placeholder = detected ? `Otomatik: ${detected}` : 'Örn. Ad Soyad';
      computeYeni();
    }

    function computeYeni() {
      yeniMap = new Map();
      yeniCount = 0;
      evrakTracked = false;
      for (const r of records) {
        if (r.evrakSeen) evrakTracked = true;
        const u = unseenEvrak(r, goruldu);
        if (!u.length) continue;
        yeniCount += u.length;
        yeniMap.set(r.key, Math.max(...u.map(y => trDateTs(y.onay))) || 1);
      }
      if (!yeniMap.size) filter.onlyNew = false;
    }

    // ------------------------------------------------ bildirim

    function showNotice(text, kind, action) {
      notice.replaceChildren();
      if (!text) { notice.hidden = true; return; }
      notice.className = 'notice' + (kind === 'err' ? ' err' : '');
      notice.append(el('span', null, text));
      if (action) notice.append(el('button', { onclick: action.fn }, action.label));
      notice.hidden = false;
    }

    function setNotice(text, kind, action) {
      manualNotice = !!text;
      if (text) showNotice(text, kind, action);
      else autoNotice();
    }

    function autoNotice() {
      if (manualNotice) return;
      const yakin = activeSureler(sureler).filter(s => daysLeft(s.bitis) <= SURE_UYAR_GUN);
      if (records.length && yakin.length && !filter.onlySure) {
        const s = yakin[0];
        return showNotice(`${yakin.length > 1 ? `${yakin.length} süre yaklaşıyor. En yakını: ` : 'Süre yaklaşıyor: '}${s.dosyaNo} · ${s.baslik || 'Süre'} — ${kalanText(daysLeft(s.bitis))}.`, 'err', {
          label: 'Göster', fn: () => showSureler()
        });
      }
      const yakinDur = upcomingDurusmalar(durusmaMeta && durusmaMeta.list).filter(d => daysLeft(d.tarih) <= 1);
      if (records.length && yakinDur.length && !filter.onlyDurusma) {
        const bugun = yakinDur.filter(d => daysLeft(d.tarih) === 0);
        const ilk = (bugun[0] || yakinDur[0]);
        const text = bugun.length
          ? `Bugün ${bugun.length} duruşmanız var; ilki ${ilk.saat}, ${ilk.dosyaNo} ${ilk.birimAdi}.`
          : `Yarın ${yakinDur.length} duruşmanız var; ilki ${ilk.saat}, ${ilk.dosyaNo} ${ilk.birimAdi}.`;
        return showNotice(text, '', { label: 'Göster', fn: () => showDurusmalar() });
      }
      const update = { label: 'Güncelle', fn: () => { setNotice(''); opts.onUpdate(false); } };
      if (!records.length || running()) return showNotice('');
      const oldParties = records.filter(r => r.taraflar && r.tarafV !== TARAF_V).length;
      if (oldParties) return showNotice(`Müvekkil ve vekil bilgisi için bir kez Güncelle’ye basın (${fmtNum(oldParties)} dosyanın tarafları yenilenecek).`, '', update);
      const days = meta.updatedAt ? Math.floor((Date.now() - meta.updatedAt) / 86400000) : 0;
      if (days >= REMIND_DAYS) return showNotice(`Son güncelleme ${days} gün önce yapıldı. Yeni dosyalar için güncellemeniz önerilir.`, '', update);
      if (yeniMap.size && !filter.onlyNew) {
        return showNotice(`${fmtNum(yeniMap.size)} dosyada ${fmtNum(yeniCount)} yeni evrak var.`, '', {
          label: 'Göster', fn: () => { filter.onlyNew = true; sel = 0; renderFilters(); render(); autoNotice(); }
        });
      }
      showNotice('');
    }

    // ------------------------------------------------ filtreler

    const CHIPS = [
      { group: 'durum', v: 'acik', label: 'Açık' },
      { group: 'durum', v: 'kapali', label: 'Kapalı' },
      null,
      { group: 'tur', v: '0', label: 'Ceza' },
      { group: 'tur', v: '1', label: 'Hukuk' },
      { group: 'tur', v: '2', label: 'İcra' },
      { group: 'tur', v: 'other', label: 'Diğer', title: 'İdari Yargı, Satış Memurluğu, Arabuluculuk, Tazminat Komisyonu' },
      null,
      { group: 'onlyClient', v: true, label: 'Müvekkil', title: 'Yalnızca müvekkil adlarında ara', cls: 'client' },
      { group: 'onlyDurusma', v: true, label: 'Duruşmalar', title: 'Son güncellemede UYAP’tan alınan yaklaşan duruşmalar, günlere göre', cls: 'dur' },
      { group: 'onlySure', v: true, label: 'Süreler', title: 'Süre hatırlatması eklediğiniz dosyalar, son günü en yakın olan önce', cls: 'sure' },
      { group: 'onlyNew', v: true, label: 'Yeni evrak', title: 'Güncellemelerde yeni evrak gelen ve henüz “Görüldü” demediğiniz dosyalar', cls: 'new' }
    ];
    function renderFilters() {
      filters.replaceChildren();
      for (const c of CHIPS) {
        if (!c) { filters.append(el('span', { class: 'sep' })); continue; }
        if (c.group === 'onlyNew' && !evrakTracked) continue;
        if (c.group === 'onlySure' && !sureMap.size && !filter.onlySure) continue;
        if (c.group === 'onlyDurusma' && !durusmaMeta) continue;
        const on = filter[c.group] === c.v;
        const label = c.group === 'onlyNew' && yeniMap.size ? `${c.label} (${fmtNum(yeniMap.size)})`
          : c.group === 'onlySure' && sureMap.size ? `${c.label} (${fmtNum(sureMap.size)})`
          : c.group === 'onlyDurusma' ? `${c.label} (${fmtNum(upcomingDurusmalar(durusmaMeta.list).length)})` : c.label;
        const b = el('button', { class: 'chip' + (c.cls ? ' ' + c.cls : '') + (on ? ' on' : ''), title: c.title || null, 'aria-pressed': String(on) }, label);
        b.addEventListener('click', () => {
          if (c.group === 'onlyClient' && !on && !myKeys(myName()).length) {
            setNotice('Müvekkil tespiti için vekil adınız bulunamadı. Ayarlar’dan adınızı girin.', '', { label: 'Ayarlar', fn: () => { setNotice(''); openSettings(); } });
            return;
          }
          filter[c.group] = on ? (['onlyClient', 'onlyNew', 'onlySure', 'onlyDurusma'].includes(c.group) ? false : 'all') : c.v;
          if (c.group === 'onlyDurusma') person = null;
          sel = 0;
          renderFilters();
          render();
          if (c.group === 'onlyNew' || c.group === 'onlySure' || c.group === 'onlyDurusma') autoNotice();
        });
        filters.append(b);
      }
    }

    // ------------------------------------------------ sonuç satırı

    // Taraf adı: tıklanınca o kişinin tüm dosyaları (müvekkil kartı) açılır.
    function nameBtn(name, toks) {
      const b = el('button', { class: 'pname', title: `${name}: tüm dosyaları göster` }, highlight(name, toks));
      b.addEventListener('click', e => { e.stopPropagation(); openPerson(name); });
      return b;
    }

    function partyLines(r, toks, keys) {
      const out = [];
      if (!r.taraflar) return [el('div', { class: 'parties' }, el('em', null, 'Taraf bilgisi henüz alınmadı'))];
      if (!r.taraflar.length) return [el('div', { class: 'parties' }, el('em', null, 'Taraf kaydı yok'))];
      const clients = r.taraflar.filter(p => isClient(p, keys));
      const others = r.taraflar.filter(p => !isClient(p, keys));
      if (clients.length) {
        const line = el('div', { class: 'client' }, 'Müvekkil: ');
        clients.forEach((p, i) => {
          if (i) line.append(', ');
          line.append(el('b', null, nameBtn(p.adi, toks)), p.rol ? ` (${p.rol})` : '');
        });
        out.push(line);
      }
      if (others.length) {
        const box = el('div', { class: 'parties' });
        const groups = new Map();
        for (const p of others) {
          const k = p.rol || 'Taraf';
          if (!groups.has(k)) groups.set(k, []);
          groups.get(k).push(p);
        }
        let first = true;
        for (const [rol, ps] of groups) {
          if (!first) box.append(' · ');
          first = false;
          box.append(el('span', { class: 'rol' }, rol + ': '));
          ps.forEach((p, i) => {
            if (i) box.append(', ');
            box.append(nameBtn(p.adi, toks));
            const vek = (p.vekil || [])
              .filter(v => !keys.some(m => nameKey(v).includes(m)))
              .map(v => v.replace(/^av\.?\s+/i, ''));
            if (vek.length) box.append(el('span', { class: 'vek' }, ' (Av. ', highlight(vek.join(', '), toks), ')'));
          });
        }
        out.push(box);
      }
      return out;
    }

    function noteBlock(r, toks) {
      if (editing === r.key) {
        const ta = el('textarea', { placeholder: 'Bu dosyaya not yazın…' });
        ta.value = notes[r.key] || '';
        const save = () => { if (editing === r.key) { editing = null; saveNote(r.key, ta.value); } };
        ta.addEventListener('click', e => e.stopPropagation());
        ta.addEventListener('keydown', e => {
          e.stopPropagation();
          if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); save(); }
          else if (e.key === 'Escape') { editing = null; render(); input.focus(); }
        });
        ta.addEventListener('blur', save);
        setTimeout(() => { ta.focus(); ta.setSelectionRange(ta.value.length, ta.value.length); }, 0);
        return el('div', { class: 'note-edit', onclick: e => e.stopPropagation() }, ta, el('small', null, 'Enter: kaydet · Shift+Enter: yeni satır · Esc: vazgeç'));
      }
      return notes[r.key] ? el('div', { class: 'note' }, highlight(notes[r.key], toks)) : null;
    }

    // Evrak "2024/555(Talimat Dosyası)" gibi bağlı bir dosyadansa hangi dosya olduğu gösterilir.
    function evrakDosya(r, g) {
      if (!g || g.startsWith(r.dosyaNo + '(')) return '';
      const m = /^(.+?)\((.+)\)$/.exec(g);
      return m ? `${m[2]} ${m[1]}` : g;
    }

    function evrakBlock(r, toks) {
      const u = unseenEvrak(r, goruldu);
      if (!u.length) return null;
      const seenBtn = el('button', { class: 'notebtn', title: 'Bu dosyadaki yeni evrakları görüldü olarak işaretle' }, 'Görüldü');
      seenBtn.addEventListener('click', e => { e.stopPropagation(); markSeen([r.key]); });
      const lines = u.slice(0, EVRAK_SHOW).map(y => {
        // UYAP listeyi onay tarihine göre sıralar; sisteme gönderim tarihi farklıysa o da yazılır.
        const tarih = y.gonderim && y.gonderim !== y.onay ? `Onay ${y.onay} (sisteme gönderim ${y.gonderim})` : `Onay ${y.onay}`;
        const alt = [y.gonderen, evrakDosya(r, y.dosya), y.aciklama].filter(Boolean).join(' · ');
        return el('li', { title: [y.tur, tarih, y.gonderen, evrakDosya(r, y.dosya), y.aciklama].filter(Boolean).join('\n') },
          el('b', null, y.tur || 'Evrak'), ' · ', tarih,
          ' ', evrakOpenBtn(r, y.k),
          isTebligat(y.tur) ? [' ', sureLink(r, y)] : null,
          alt ? el('div', null, el('small', null, highlight(alt, toks))) : null);
      });
      if (u.length > EVRAK_SHOW) lines.push(el('li', null, el('small', null, `+${u.length - EVRAK_SHOW} evrak daha`)));
      return el('div', { class: 'evrak', onclick: e => e.stopPropagation() },
        el('div', { class: 'head' }, el('span', null, `${u.length} yeni evrak`), seenBtn),
        el('ul', null, lines));
    }

    async function markSeen(keys) {
      const next = { ...goruldu };
      const now = Date.now();
      for (const k of keys) next[k] = now;
      goruldu = next;
      computeYeni();
      renderFilters();
      render();
      autoNotice();
      await chrome.storage.local.set({ uhdEvrakGoruldu: next });
    }

    // "Son evrak 12/09/2026 · Bilirkişi Raporu" (bağlı dosyadansa hangi dosya olduğu da).
    function sonText(r) {
      const s = lastEvrak(r);
      if (!s || !s.onay) return '';
      return [s.onay, s.tur, evrakDosya(r, s.dosya)].filter(Boolean).join(' · ');
    }

    function sonLine(r) {
      const t = sonText(r);
      if (!t) return null;
      const s = lastEvrak(r);
      const title = s.gonderim && s.gonderim !== s.onay ? `Onay ${s.onay}, sisteme gönderim ${s.gonderim}` : `Onay ${s.onay}`;
      return el('div', { class: 'son', title: 'Dosyadaki en yeni evrak (son güncellemeye göre). ' + title }, 'Son evrak: ', el('b', null, s.onay), t.slice(s.onay.length),
        s.k ? [' ', evrakOpenBtn(r, s.k)] : null,
        isTebligat(s.tur) ? [' ', sureLink(r, s)] : null);
    }

    // ------------------------------------------------ evrak açma ve duruşmalar

    function evrakOpenBtn(r, k) {
      if (!k || !opts.onOpenEvrak) return null;
      const b = el('button', { class: 'notebtn evopen', title: 'Evrakı UYAP’tan getirip göster (evrak saklanmaz)' }, 'Aç');
      b.addEventListener('click', e => { e.stopPropagation(); opts.onOpenEvrak(r, k); });
      return b;
    }

    function computeDurusma() {
      durusmaByKey = new Map();
      for (const d of upcomingDurusmalar(durusmaMeta && durusmaMeta.list)) {
        if (!durusmaByKey.has(d.key)) durusmaByKey.set(d.key, []);
        durusmaByKey.get(d.key).push(d);
      }
      if (!durusmaMeta) filter.onlyDurusma = false;
    }

    const gunText = n => (n === 0 ? 'bugün' : n === 1 ? 'yarın' : `${n} gün sonra`);

    function durLine(r) {
      if (filter.onlyDurusma) return null;   // duruşmalar görünümünde saat satırı ayrıca yazılıyor
      const list = durusmaByKey.get(r.key);
      if (!list || !list.length) return null;
      const d = list[0];
      const n = daysLeft(d.tarih);
      return el('div', { class: 'durline' + (n === 0 ? ' today' : n <= 3 ? ' soon' : ''), title: list.map(x => `${fmtIso(x.tarih, true)} ${x.saat} · ${x.islem}`).join('\n') },
        `${d.islem}: `, el('b', null, `${fmtIso(d.tarih, true)} ${d.saat}`), ` · ${gunText(n)}`, list.length > 1 ? ` (+${list.length - 1})` : '');
    }

    function showDurusmalar() {
      person = null;
      filter.onlyDurusma = true;
      sel = 0;
      renderFilters();
      render();
      autoNotice();
    }

    function exportIcs(list) {
      const url = URL.createObjectURL(new Blob([durusmaIcs(list)], { type: 'text/calendar;charset=utf-8' }));
      const a = el('a', { href: url, download: `durusmalar-${todayIso()}.ics` });
      document.body.append(a);
      a.click();
      a.remove();
      setTimeout(() => URL.revokeObjectURL(url), 10000);
    }

    function renderDurusmalar() {
      const keys = myKeys(myName());
      const byKey = new Map(records.map(r => [r.key, r]));
      const toks = norm(input.value).split(/\s+/).filter(Boolean);
      const all = upcomingDurusmalar(durusmaMeta && durusmaMeta.list);
      const rows = toks.length
        ? all.filter(d => { const h = norm([d.dosyaNo, d.birimAdi, d.islem, ...d.taraflar.map(t => t.ad)].join(' ')); return toks.every(t => h.includes(t)); })
        : all;
      const ics = el('button', { class: 'notebtn', title: 'Listelenen duruşmaları takvim dosyası (.ics) olarak indir; Outlook, Google Takvim ve telefon takvimleri açar. Taraf adları yazılmaz.' }, 'Takvime aktar (.ics)');
      ics.addEventListener('click', () => exportIcs(rows));
      const src = durusmaMeta && durusmaMeta.at ? `UYAP’tan ${fmtAgo(durusmaMeta.at)} alındı; sonraki ${durusmaMeta.gun || 60} gün.` : '';
      const head = el('div', { class: 'durhead' },
        el('div', null, el('b', null, `${fmtNum(rows.length)} duruşma`), toks.length ? ` (“${input.value.trim()}” içeren)` : '', ' · ', src),
        el('div', { class: 'row' }, rows.length ? ics : null,
          el('span', { style: 'color:var(--muted);font-size:11px' }, 'Saatleri UYAP’ta teyit edin; liste yalnız Güncelle’de yenilenir.')));
      const out = [head];
      current = [];
      let day = null;
      for (const d of rows) {
        if (d.tarih !== day) {
          day = d.tarih;
          const n = daysLeft(d.tarih);
          out.push(el('div', { class: 'dayhead' + (n === 0 ? ' today' : '') },
            el('span', null, n === 0 ? `Bugün · ${fmtIso(d.tarih, true)}` : n === 1 ? `Yarın · ${fmtIso(d.tarih, true)}` : fmtIso(d.tarih, true)),
            el('small', null, gunText(n))));
        }
        const r = byKey.get(d.key);
        const info = el('div', { class: 'durline' }, el('b', null, `${d.saat} · ${d.islem}`), d.sonuc ? ` · ${d.sonuc}` : '');
        if (r) {
          out.push(item(r, current.length, toks, keys, info));
          current.push(r);
        } else {
          out.push(el('div', { class: 'durrow' },
            el('span', { class: 't' }, d.saat),
            el('div', { class: 'info' },
              el('div', { class: 'title' }, el('b', null, d.dosyaNo), el('span', null, d.birimAdi)),
              el('div', { class: 'meta' }, [d.islem, d.dosyaTur].filter(Boolean).join(' · ')),
              el('div', { class: 'parties' }, d.taraflar.map(t => `${t.sifat ? t.sifat + ': ' : ''}${t.ad}`).join(' · ')),
              el('div', { class: 'meta' }, 'Bu dosya indekste yok; açmak için Güncelle’ye basın.'))));
        }
      }
      if (!rows.length) out.push(el('div', { class: 'empty' }, all.length ? 'Aramanızla eşleşen duruşma yok.' : `Sonraki ${durusmaMeta && durusmaMeta.gun || 60} günde duruşma görünmüyor.`));
      list.append(...out);
      if (sel >= current.length) sel = 0;
    }

    // ------------------------------------------------ süre hatırlatıcı

    const GUNLER = ['Pazar', 'Pazartesi', 'Salı', 'Çarşamba', 'Perşembe', 'Cuma', 'Cumartesi'];
    function fmtIso(iso, withDay) {
      const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(iso || '');
      if (!m) return '';
      const s = `${m[3]}.${m[2]}.${m[1]}`;
      return withDay ? `${s} ${GUNLER[new Date(Date.UTC(+m[1], +m[2] - 1, +m[3])).getUTCDay()]}` : s;
    }
    function kalanText(d) {
      if (d == null) return '';
      if (d < 0) return `${-d} gün geçti`;
      if (d === 0) return 'bugün son gün';
      if (d === 1) return 'yarın son gün';
      return `${d} gün kaldı`;
    }

    function computeSure() {
      sureMap = new Map();
      for (const s of activeSureler(sureler)) if (!sureMap.has(s.key)) sureMap.set(s.key, s.bitis);
      if (!sureMap.size) filter.onlySure = false;
    }

    function showSureler() {
      person = null;
      filter.onlySure = true;
      sel = 0;
      renderFilters();
      render();
      autoNotice();
    }

    function openSureForm(r, baslangic, kaynak) {
      sureEdit = { key: r.key, baslangic: baslangic || '', kaynak: kaynak || '' };
      editing = null;
      render();
    }

    function sureBtn(r) {
      const b = el('button', { class: 'notebtn', title: 'Bu dosya için süre hatırlatması ekleyin (ör. istinaf, cevap dilekçesi)' }, 'Süre ekle');
      b.addEventListener('click', e => { e.stopPropagation(); openSureForm(r); });
      return b;
    }

    // Tebligat evrakından süre formu: başlangıç olarak evrakın onay tarihi önerilir (kontrol edilmek üzere).
    function sureLink(r, y) {
      const b = el('button', { class: 'notebtn', title: 'Bu tebligat için süre hatırlatması ekleyin' }, 'Süre ekle');
      b.addEventListener('click', e => { e.stopPropagation(); openSureForm(r, trToIso(y.onay), `${y.tur} · onay ${y.onay}`); });
      return b;
    }

    async function saveSureler(next) {
      sureler = next;
      computeSure();
      renderFilters();
      render();
      autoNotice();
      await chrome.storage.local.set({ uhdSureler: next });
    }

    function sureForm(r) {
      const stop = e => e.stopPropagation();
      const baslik = el('input', { type: 'text', placeholder: 'Örn. İstinaf, cevap dilekçesi', maxlength: '80' });
      const bas = el('input', { type: 'date', value: sureEdit.baslangic || todayIso() });
      const n = el('input', { type: 'number', min: '1', max: '999', value: '2' });
      const unit = el('select', null, ['gün', 'hafta', 'ay'].map(u => el('option', { value: u, selected: u === 'hafta' }, u)));
      const son = el('input', { type: 'date' });
      const warn = el('div', { class: 'w' });
      let auto = true;
      const upd = () => {
        if (auto) son.value = addPeriod(bas.value, n.value, unit.value);
        const d = daysLeft(son.value);
        warn.replaceChildren(...[
          son.value ? `Son gün: ${fmtIso(son.value, true)} (${kalanText(d)}).` : 'Son günü girin.',
          ...sureUyarilari(son.value)
        ].map(t => el('div', null, t)));
      };
      [bas, n, unit].forEach(x => x.addEventListener('input', upd));
      son.addEventListener('input', () => { auto = false; upd(); });
      const save = el('button', { class: 'p' }, 'Kaydet');
      const cancel = el('button', null, 'Vazgeç');
      save.addEventListener('click', () => {
        if (!son.value) { son.focus(); return; }
        const id = Math.random().toString(36).slice(2);
        sureEdit = null;
        saveSureler({ ...sureler, [id]: {
          id, key: r.key, dosyaNo: r.dosyaNo, birimAdi: r.birimAdi, baslik: baslik.value.trim(),
          baslangic: bas.value, n: Number(n.value) || null, unit: unit.value, bitis: son.value, kaynak: '', createdAt: Date.now()
        } });
      });
      cancel.addEventListener('click', () => { sureEdit = null; render(); });
      const box = el('div', { class: 'sure-form', onclick: stop },
        el('div', { class: 'g' },
          el('span', null, 'Açıklama'), baslik,
          el('span', null, 'Tebliğ / başlangıç'), bas,
          el('span', null, 'Süre'), el('div', { class: 'per' }, n, unit),
          el('span', null, 'Son gün'), son),
        warn,
        sureEdit.kaynak ? el('div', { class: 'h' }, `Başlangıç, evrakın onay tarihinden önerildi (${sureEdit.kaynak}); tebliğ tarihi farklı olabilir.`) : null,
        el('div', { class: 'h' }, 'Süreyi ve tebliğ tarihini kendiniz kontrol edin. E-tebligatta tebliğ, adrese ulaştığı günü izleyen 5. günün sonunda yapılmış sayılır. Son gün yalnız takvimle önerilir; resmî tatiller ve adli tatil uzaması uygulanmaz, son günü elle düzeltebilirsiniz.'),
        el('div', { class: 'b' }, save, cancel));
      box.addEventListener('keydown', e => {
        e.stopPropagation();
        if (e.key === 'Escape') { sureEdit = null; render(); input.focus(); }
        else if (e.key === 'Enter' && e.target.tagName !== 'SELECT') { e.preventDefault(); save.click(); }
      });
      upd();
      setTimeout(() => baslik.focus(), 0);
      return box;
    }

    function sureBlock(r) {
      if (sureEdit && sureEdit.key === r.key) return sureForm(r);
      const mine = activeSureler(sureler).filter(s => s.key === r.key);
      if (!mine.length) return null;
      return mine.map(s => {
        const d = daysLeft(s.bitis);
        const done = el('button', { class: 'notebtn', title: 'İş yapıldı; hatırlatmayı kapat' }, 'Tamamlandı');
        done.addEventListener('click', e => { e.stopPropagation(); saveSureler({ ...sureler, [s.id]: { ...s, done: true, doneAt: Date.now() } }); });
        const del = el('button', { class: 'notebtn', title: 'Hatırlatmayı sil' }, 'Sil');
        del.addEventListener('click', e => {
          e.stopPropagation();
          const next = { ...sureler };
          delete next[s.id];
          saveSureler(next);
        });
        const detay = [s.baslangic ? `Başlangıç ${fmtIso(s.baslangic)}` : '', s.n ? `${s.n} ${s.unit}` : ''].filter(Boolean).join(' · ');
        return el('div', { class: 'sure' + (d <= 3 ? ' hot' : d <= SURE_UYAR_GUN ? ' warm' : ''), onclick: e => e.stopPropagation(), title: detay || null },
          el('div', { class: 'line' },
            el('b', null, s.baslik || 'Süre'),
            el('span', null, `son gün ${fmtIso(s.bitis, true)}`),
            el('span', { class: 'left' }, kalanText(d)),
            el('span', { class: 'acts2' }, done, del)));
      });
    }

    function item(r, i, toks, keys, extra) {
      const closed = r.sorguDurum === 1;
      const open = el('button', { class: 'open', title: 'Dosyayı UYAP’ta Pencere Görünümü ile aç' }, 'Dosya Görüntüle');
      open.addEventListener('click', e => { e.stopPropagation(); openRecord(r); });
      const noteBtn = el('button', { class: 'notebtn', title: 'Bu dosyaya yalnızca bu bilgisayarda görünen bir not ekleyin' }, notes[r.key] ? 'Notu düzenle' : 'Not ekle');
      noteBtn.addEventListener('click', e => { e.stopPropagation(); editing = r.key; sel = i; render(); });
      const kunye = `${r.birimAdi} ${r.dosyaNo} E.`;
      const copyBtn = el('button', { class: 'notebtn', title: `Künyeyi kopyala: ${kunye}` }, 'Kopyala');
      copyBtn.addEventListener('click', async e => {
        e.stopPropagation();
        try {
          await navigator.clipboard.writeText(kunye);
          copyBtn.textContent = 'Kopyalandı ✓';
          copyBtn.classList.add('done');
          setTimeout(() => { copyBtn.textContent = 'Kopyala'; copyBtn.classList.remove('done'); }, 1500);
        } catch {
          copyBtn.textContent = 'Kopyalanamadı';
        }
      });
      const partyEls = partyLines(r, toks, keys);
      const row = el('div', { class: 'item' + (i === sel ? ' sel' : ''), title: (r.taraflar || []).map(p => `${p.rol ? p.rol + ': ' : ''}${p.adi}`).join('\n') || null },
        el('div', { class: 'info' },
          el('div', { class: 'title' }, el('b', null, highlight(r.dosyaNo, toks)), el('span', null, highlight(r.birimAdi, toks))),
          el('div', { class: 'meta' },
            el('span', { class: 'badge' + (closed ? ' closed' : '') }, r.durum || (closed ? 'Kapalı' : 'Açık')),
            yeniMap.has(r.key) ? el('span', { class: 'badge new' }, 'Yeni evrak') : null,
            [r.dosyaTur, r.acilis].filter(Boolean).join(' · ')),
          sonLine(r),
          durLine(r),
          extra || null,
          partyEls,
          evrakBlock(r, toks),
          sureBlock(r),
          noteBlock(r, toks)),
        el('div', { class: 'acts' }, open, el('div', { class: 'minis' }, copyBtn, noteBtn), el('div', { class: 'minis' }, sureBtn(r))));
      row.addEventListener('click', () => openRecord(r));
      row.addEventListener('mouseenter', () => select(i, false));
      return row;
    }

    function select(i, scroll) {
      const rows = list.querySelectorAll('.item');
      if (!rows.length) return;
      sel = Math.max(0, Math.min(i, rows.length - 1));
      rows.forEach((r, k) => r.classList.toggle('sel', k === sel));
      if (scroll) rows[sel].scrollIntoView({ block: 'nearest' });
    }

    function render() {
      const scroll = list.scrollTop;
      list.replaceChildren();
      current = [];
      filters.hidden = !records.length || !!person;
      if (!records.length) {
        const run = running();
        const go = el('button', { disabled: run }, run ? 'İlk güncelleme sürüyor…' : 'Şimdi güncelle');
        go.addEventListener('click', () => { setNotice(''); opts.onUpdate(false); });
        list.append(el('div', { class: 'onboard' },
          el('b', null, 'Başlamak için'),
          el('ol', null,
            el('li', null, 'UYAP Avukat Portalı’na e-imza ile giriş yapın.'),
            el('li', null, '“Şimdi güncelle”ye basın. Vekili olduğunuz dosyaların listesi, taraf adları, vekilleri ve açık dosyaların evrak listesi UYAP’tan alınıp yalnızca bu bilgisayara kaydedilir; hiçbir yere gönderilmez. İlk seferde birkaç dakika sürebilir.'),
            el('li', null, 'Ad, soyad, dosya no veya mahkeme yazın; “Dosya Görüntüle” ile dosya UYAP’ta açılır.')),
          go,
          el('p', { style: 'margin:12px 0 0;font-size:12px;color:var(--muted)' }, 'Ayrıntılar: ', el('a', { href: BRAND.site + '/gizlilik/uyap-asistani', target: '_blank', rel: 'noopener' }, 'gizlilik politikası'), '.')));
        return;
      }
      if (person) return renderPerson();
      if (filter.onlyDurusma) return renderDurusmalar();
      const keys = myKeys(myName());
      const q = input.value;
      const res = search(records, q, { myName: myName(), notes, filter, yeni: yeniMap, sure: sureMap, limit: LIMIT });
      const hint = el('kbd', null, '↑↓ seç · Enter aç');
      if (!res.tokens.length && !res.total && filter.durum === 'all' && filter.tur === 'all' && !filter.onlyClient && !filter.onlyNew && !filter.onlySure) {
        const byKey = new Map(records.map(r => [r.key, r]));
        current = recent.map(k => byKey.get(k)).filter(Boolean);
        if (!current.length) {
          list.append(el('div', { class: 'empty' }, `${fmtNum(records.length)} dosya indekste. Aramak için ad, soyad, dosya no veya mahkeme yazın ya da yukarıdan filtre seçin.`));
          return;
        }
        list.append(el('div', { class: 'section' }, el('span', null, 'Son açılanlar'), hint));
      } else {
        current = res.items;
        if (!res.total) {
          const narrowed = filter.durum !== 'all' || filter.tur !== 'all' || filter.onlyClient || filter.onlyNew || filter.onlySure;
          const box = el('div', { class: 'empty' }, 'Eşleşen dosya yok.');
          if (narrowed) {
            box.append(el('br'), el('button', { class: 'notebtn', onclick: () => { filter.durum = 'all'; filter.tur = 'all'; filter.onlyClient = false; filter.onlyNew = false; filter.onlySure = false; filter.onlyDurusma = false; renderFilters(); render(); } }, 'Filtreleri kaldırıp tekrar ara'));
          }
          list.append(box);
          return;
        }
        const total = el('span', null, `${fmtNum(res.total)} sonuç`);
        if (filter.onlyNew) {
          const all = el('button', { class: 'notebtn', title: 'Listelenen dosyaların yeni evraklarını görüldü olarak işaretle' }, 'Tümünü görüldü say');
          all.addEventListener('click', () => markSeen(search(records, q, { myName: myName(), notes, filter, yeni: yeniMap, limit: Infinity }).items.map(r => r.key)));
          total.append(' · ', all);
        }
        list.append(el('div', { class: 'section' }, total, hint));
      }
      if (sel >= current.length) sel = 0;
      current.forEach((r, i) => list.append(item(r, i, res.tokens, keys)));
      if (res.total > current.length) list.append(el('div', { class: 'more' }, `${fmtNum(res.total)} sonuçtan ilk ${current.length} gösteriliyor. Aramayı daraltın.`));
      list.scrollTop = scroll;
    }

    // ------------------------------------------------ müvekkil kartı

    function openPerson(name) {
      person = { name };
      editing = null;
      sel = 0;
      render();
      list.scrollTop = 0;
    }

    function closePerson() {
      person = null;
      sel = 0;
      render();
      input.focus();
    }

    function renderPerson() {
      const keys = myKeys(myName());
      const files = personFiles(records, person.name, myName());
      const acik = files.filter(f => f.r.sorguDurum !== 1).length;
      const muvekkil = files.filter(f => f.roller.some(x => x.muvekkil));
      const diger = files.filter(f => !f.roller.some(x => x.muvekkil));
      const roller = new Map();
      for (const f of files) for (const x of f.roller) roller.set(x.rol, (roller.get(x.rol) || 0) + 1);

      const back = el('button', { class: 'back', title: 'Aramaya dön (Esc)' }, '← Geri');
      back.addEventListener('click', closePerson);
      const copyAll = el('button', { class: 'notebtn', title: 'Bu kişinin tüm dosyalarının künyelerini alt alta kopyala' }, 'Künyeleri kopyala');
      copyAll.addEventListener('click', async () => {
        try {
          await navigator.clipboard.writeText(files.map(f => `${f.r.birimAdi} ${f.r.dosyaNo} E.`).join('\n'));
          copyAll.textContent = 'Kopyalandı ✓';
          copyAll.classList.add('done');
        } catch { copyAll.textContent = 'Kopyalanamadı'; }
      });
      const head = el('div', { class: 'person' },
        el('div', { class: 'kind' }, muvekkil.length ? 'Müvekkil kartı' : 'Kişi kartı'),
        el('div', { class: 'top' }, el('b', null, person.name), back),
        el('div', { class: 'sum' }, files.length
          ? `${fmtNum(files.length)} dosya · ${fmtNum(acik)} açık · ${fmtNum(files.length - acik)} kapalı` +
            (roller.size ? ' — ' + [...roller].map(([rol, n]) => `${rol} (${n})`).join(', ') : '')
          : 'Bu adla kayıtlı dosya bulunamadı.'),
        muvekkil.length && diger.length
          ? el('div', { class: 'warn' }, `Dikkat: ${fmtNum(diger.length)} dosyada müvekkiliniz olarak değil, başka bir tarafın ya da vekilin tarafında geçiyor. Aynı adlı farklı bir kişi de olabilir; dosyaları kontrol edin.`)
          : null,
        files.length ? el('div', { class: 'row' }, copyAll) : null,
        el('div', { class: 'hint' }, 'UYAP taraf listesinde kimlik numarası yer almadığından aynı ad-soyada sahip farklı kişiler birlikte listelenebilir.'));
      list.append(head);
      current = files.map(f => f.r);
      if (sel >= current.length) sel = 0;
      files.forEach((f, i) => {
        const bizde = f.roller.some(x => x.muvekkil);
        const rolText = f.roller.map(x => x.rol + (x.muvekkil ? ' · müvekkiliniz' : '')).join(', ');
        list.append(item(f.r, i, [], keys, el('div', { class: 'rolein' + (bizde ? '' : ' other') }, `Bu dosyada: ${rolText}`)));
      });
    }

    // ------------------------------------------------ kayıt işlemleri

    async function openRecord(r) {
      recent = [r.key, ...recent.filter(k => k !== r.key)].slice(0, RECENT_MAX);
      await chrome.storage.local.set({ uhdRecent: recent });
      opts.onOpen(r);
    }

    async function saveNote(key, text) {
      const next = { ...notes };
      text = text.trim();
      if (text) next[key] = text; else delete next[key];
      notes = next;
      render();
      await chrome.storage.local.set({ uhdNotes: next });
    }

    function exportCsv() {
      const keys = myKeys(myName());
      const rows = [['Dosya No', 'Birim', 'Yargı Türü', 'Dosya Türü', 'Durum', 'Açılış', 'Müvekkil', 'Diğer Taraflar', 'Karşı Taraf Vekilleri', 'Son Evrak', 'Sonraki Duruşma', 'Not']];
      const sorted = [...records].sort((a, b) =>
        (a.yargiTuruAdi || '').localeCompare(b.yargiTuruAdi || '', 'tr') ||
        (a.birimAdi || '').localeCompare(b.birimAdi || '', 'tr') ||
        (a.acilisTs || 0) - (b.acilisTs || 0));
      for (const r of sorted) {
        const ps = r.taraflar || [];
        const clients = ps.filter(p => isClient(p, keys));
        const others = ps.filter(p => !isClient(p, keys));
        const vek = [...new Set(others.flatMap(p => p.vekil || []))];
        rows.push([
          r.dosyaNo, r.birimAdi, r.yargiTuruAdi, r.dosyaTur, r.durum, r.acilis,
          clients.map(p => `${p.adi}${p.rol ? ' (' + p.rol + ')' : ''}`).join(', '),
          others.map(p => `${p.rol ? p.rol + ': ' : ''}${p.adi}`).join('; '),
          vek.join(', '),
          sonText(r),
          (d => (d ? `${fmtIso(d.tarih)} ${d.saat} ${d.islem}` : ''))((durusmaByKey.get(r.key) || [])[0]),
          notes[r.key] || ''
        ]);
      }
      const csv = '﻿' + rows.map((row, r) => row.map((v, i) => (r > 0 && i === 0 ? csvDosyaNo(v) : csvCell(v))).join(';')).join('\r\n');
      const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8' }));
      const d = new Date();
      const a = el('a', { href: url, download: `uyap-dosyalar-${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}.csv` });
      document.body.append(a);
      a.click();
      a.remove();
      setTimeout(() => URL.revokeObjectURL(url), 10000);
    }

    // ------------------------------------------------ durum satırı

    function renderStatus() {
      const run = running();
      btnUpdate.disabled = btnFull.disabled = btnClear.disabled = run;
      const paused = !run && !!pendingJob && !pendingJob.stop;
      btnStop.hidden = !run && !paused;
      btnStop.textContent = paused ? 'İptal et' : 'Durdur';
      btnStop.title = paused ? 'Yarıda kalan güncellemeyi iptal eder; o ana kadar alınan bilgiler saklı kalır.' : '';
      btnUpdate.textContent = paused ? 'Sürdür' : 'Güncelle';
      btnUpdate.title = paused ? 'Yarıda kalan güncellemeyi kaldığı yerden sürdürür.' : 'Dosya listesini UYAP’tan yeniler; yalnızca yeni ve eksik dosyaların taraf bilgilerini alır.';
      count.textContent = records.length ? `${fmtNum(records.length)} dosya` : '';
      status.classList.toggle('err', !run && !!(progress && progress.error));
      if (run) {
        let text = progress.text || 'Güncelleniyor…';
        if (progress.total && progress.done && progress.phaseStart) {
          const perItem = (Date.now() - progress.phaseStart) / progress.done;
          const min = Math.ceil(perItem * (progress.total - progress.done) / 60000);
          text += ` · kalan ~${min} dk`;
        }
        statusText.textContent = text;
        bar.hidden = !progress.total;
        barFill.style.width = progress.total ? `${Math.round(100 * progress.done / progress.total)}%` : '0';
      } else {
        bar.hidden = true;
        const last = meta.updatedAt ? `Son güncelleme: ${fmtAgo(meta.updatedAt)} (${fmtDate(meta.updatedAt)})` : 'Henüz güncelleme yapılmadı.';
        statusText.textContent = progress && progress.text && progress.endedAt ? `${progress.text} · ${fmtAgo(progress.endedAt)}` : last;
      }
    }

    function openSettings() {
      settings.hidden = false;
      btnSettings.textContent = 'Ayarları kapat';
      nameInput.focus();
    }

    // ------------------------------------------------ olaylar

    // Büyük indekslerde her tuşta değil, yazmaya kısa bir ara verilince ara.
    let typeTimer;
    input.addEventListener('input', () => {
      sel = 0;
      editing = null;
      person = null;
      clearTimeout(typeTimer);
      if (records.length > 3000) typeTimer = setTimeout(render, 90);
      else render();
    });
    input.addEventListener('keydown', e => {
      if (e.key === 'ArrowDown') { e.preventDefault(); select(sel + 1, true); }
      else if (e.key === 'ArrowUp') { e.preventDefault(); select(sel - 1, true); }
      else if (e.key === 'Enter' && current[sel]) { e.preventDefault(); openRecord(current[sel]); }
      else if (e.key === 'Escape' && person) { e.preventDefault(); closePerson(); }
      else if (e.key === 'Escape' && opts.onClose) { opts.onClose(); }
    });
    btnUpdate.addEventListener('click', () => { setNotice(''); opts.onUpdate(false); });
    btnFull.addEventListener('click', () => {
      if (confirm('Tüm dosyaların taraf bilgileri UYAP’tan yeniden alınacak. Dosya sayısına göre uzun sürebilir. Devam edilsin mi?')) {
        setNotice(''); opts.onUpdate(true);
      }
    });
    btnStop.addEventListener('click', async () => {
      if (running()) return opts.onStop();
      // Yürüten sekme yok: duraklamış işi doğrudan iptal et (popup'ta açık UYAP sekmesi olmayabilir).
      await chrome.storage.local.remove('uhdJob');
      await chrome.storage.local.set({ uhdProgress: { running: false, text: 'Yarıda kalan güncelleme iptal edildi.', endedAt: Date.now() } });
    });
    btnSettings.addEventListener('click', () => {
      if (settings.hidden) openSettings();
      else { settings.hidden = true; btnSettings.textContent = 'Ayarlar'; }
    });
    let nameTimer;
    nameInput.addEventListener('input', () => {
      clearTimeout(nameTimer);
      nameTimer = setTimeout(() => {
        prefs = { ...prefs, myName: nameInput.value.trim() };
        chrome.storage.local.set({ uhdPrefs: prefs });
        render();
      }, 400);
    });
    evrakBox.addEventListener('change', () => {
      prefs = { ...prefs, evrakKapali: !evrakBox.checked };
      chrome.storage.local.set({ uhdPrefs: prefs });
    });
    duyuruBox.addEventListener('change', () => {
      prefs = { ...prefs, showDuyuru: !duyuruBox.checked };
      chrome.storage.local.set({ uhdPrefs: prefs });
    });
    btnExport.addEventListener('click', () => {
      if (!records.length) return setNotice('Dışa aktarılacak dosya yok. Önce Güncelle’ye basın.', 'err');
      exportCsv();
    });
    btnClear.addEventListener('click', async () => {
      if (!confirm('Dosya indeksi, duruşma listesi, notlarınız, süre hatırlatmalarınız, son açılanlar ve ayarlarınız bu bilgisayardan silinsin mi? Bu işlem geri alınamaz; UYAP’taki dosyalarınız etkilenmez.')) return;
      await chrome.storage.local.remove(['uhdIndex', 'uhdProgress', 'uhdRecent', 'uhdNotes', 'uhdPrefs', 'uhdPending', 'uhdEvrakGoruldu', 'uhdJob', 'uhdSureler', 'uhdDurusmalar']);
      setNotice('Tüm yerel veriler silindi.');
    });

    chrome.storage.local.get(['uhdIndex', 'uhdProgress', 'uhdNotes', 'uhdRecent', 'uhdPrefs', 'uhdEvrakGoruldu', 'uhdJob', 'uhdSureler', 'uhdDurusmalar']).then(v => {
      sureler = v.uhdSureler || {};
      durusmaMeta = v.uhdDurusmalar || null;
      computeDurusma();
      computeSure();
      goruldu = v.uhdEvrakGoruldu || {};
      pendingJob = v.uhdJob || null;
      setIndex(v.uhdIndex);
      progress = v.uhdProgress || null;
      notes = v.uhdNotes || {};
      recent = v.uhdRecent || [];
      prefs = v.uhdPrefs || {};
      nameInput.value = prefs.myName || '';
      duyuruBox.checked = !prefs.showDuyuru;
      evrakBox.checked = !prefs.evrakKapali;
      renderFilters();
      render();
      renderStatus();
      autoNotice();
    });
    chrome.storage.onChanged.addListener((ch, area) => {
      if (area !== 'local') return;
      let redraw = false;
      if (ch.uhdEvrakGoruldu) goruldu = ch.uhdEvrakGoruldu.newValue || {};
      if (ch.uhdJob) pendingJob = ch.uhdJob.newValue || null;
      if (ch.uhdSureler) { sureler = ch.uhdSureler.newValue || {}; computeSure(); renderFilters(); redraw = true; }
      if (ch.uhdDurusmalar) { durusmaMeta = ch.uhdDurusmalar.newValue || null; computeDurusma(); renderFilters(); redraw = true; }
      if (ch.uhdIndex) setIndex(ch.uhdIndex.newValue);
      else if (ch.uhdEvrakGoruldu) computeYeni();
      if (ch.uhdIndex || ch.uhdEvrakGoruldu) { renderFilters(); redraw = true; }
      if (ch.uhdNotes) { notes = ch.uhdNotes.newValue || {}; redraw = true; }
      if (ch.uhdRecent) recent = ch.uhdRecent.newValue || [];
      if (ch.uhdPrefs) {
        prefs = ch.uhdPrefs.newValue || {};
        if (document.activeElement !== nameInput && (!root.getRootNode().activeElement || root.getRootNode().activeElement !== nameInput)) nameInput.value = prefs.myName || '';
        duyuruBox.checked = !prefs.showDuyuru;
        evrakBox.checked = !prefs.evrakKapali;
        redraw = true;
      }
      if (ch.uhdProgress) {
        progress = ch.uhdProgress.newValue || null;
        if (!records.length) redraw = true;   // ilk kullanım ekranındaki düğmenin durumu
      }
      if (redraw && !editing && !sureEdit) render();
      renderStatus();
      if (ch.uhdIndex || ch.uhdProgress || ch.uhdEvrakGoruldu || ch.uhdSureler || ch.uhdDurusmalar) autoNotice();
    });
    setInterval(renderStatus, 5000);

    return {
      root,
      input,
      setNotice,
      focus() { input.focus(); input.select(); },
      setQuery(q) { input.value = q || ''; render(); },
      showSureler,
      showDurusmalar
    };
  }

  globalThis.UHD.el = el;
  globalThis.UHD.mountUI = mountUI;
})();
