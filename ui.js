// Arama arayüzü: hem eklenti popup'ında hem UYAP sayfasındaki yan panelde aynı kod kullanılır.
(() => {
  if (globalThis.UHD.mountUI) return;
  const { search, fmtNum, fmtDate, norm, detectMyName, myKeys, isClient, nameKey, BRAND, csvCell, csvDosyaNo, unseenEvrak, trDateTs, lastEvrak, personFiles, trTitle, cleanDurum, cleanBirim, evrakTakipAcik, BACKUP_APP, BACKUP_FORMAT, BACKUP_KEYS, checkBackup, trToIso, todayIso, addPeriod, daysLeft, sureUyarilari, activeSureler, isTebligat, upcomingDurusmalar, durusmaIcs, evrakKey } = globalThis.UHD;
  const SURE_UYAR_GUN = 7;   // bu kadar gün ya da daha az kalan süreler panelde uyarılır
  const EVRAK_SHOW = 3;
  const LIMIT = 60;
  const RECENT_MAX = 10;
  const RUN_STALE_MS = 90000;
  const REMIND_DAYS = 7;
  const TARAF_V = 2;

  const CSS = `
.uhd{--navy:${BRAND.primary};--navy2:${BRAND.primaryDark};--deep:${BRAND.deep};--soft:${BRAND.soft};--bord:${BRAND.border};--focus:${BRAND.focus};
  --bg:#f5f7fb;--card:#fff;--text:#1d2939;--text2:#344054;--muted:#667085;--line:#e3e8f2;--line2:#cfd6e4;
  --green:#12805c;--green-bg:#e7f6ef;--grey:#98a2b3;--grey-bg:#eef0f3;--amber:#b54708;--amber-bg:#fef0c7;--red:#b42318;
  --note-bg:#fffbea;--note-bd:#f2c94c;--ev-bg:#f0f5ff;--ev-bd:#528bff;--ev-tx:#1849a9;--warn-bg:#fff4e5;--warn-tx:#7a4b00;
  --err-bg:#fdecea;--err-tx:#8a1f17;--mark:#ffe58a;--hot-bg:#fdecea;--warm-bg:#fff6e8;
  font:13px/1.4 "Segoe UI",system-ui,-apple-system,Roboto,Arial,sans-serif;color:var(--text);background:var(--bg);
  display:flex;flex-direction:column;height:100%;min-height:0;box-sizing:border-box;color-scheme:light}
.uhd[data-theme=dark]{--soft:#143532;--bord:#2f6f69;
  --bg:#0f1720;--card:#18222d;--text:#e6edf3;--text2:#c9d3de;--muted:#98a2b3;--line:#2a3644;--line2:#3a4756;
  --green:#4fd1a5;--green-bg:#0f2e25;--grey:#667085;--grey-bg:#25303c;--amber:#f5b04c;--amber-bg:#33260f;--red:#f97066;
  --note-bg:#2b2716;--note-bd:#b38f1f;--ev-bg:#16233a;--ev-bd:#528bff;--ev-tx:#9ec1ff;--warn-bg:#33270f;--warn-tx:#f5c26b;
  --err-bg:#3a1714;--err-tx:#f7a8a1;--mark:#6b5a12;--hot-bg:#3a1714;--warm-bg:#33260f;color-scheme:dark}
.uhd *{box-sizing:border-box}
.uhd [hidden]{display:none!important}
.uhd button{font:inherit;color:inherit}
.uhd svg{width:16px;height:16px;fill:none;stroke:currentColor;stroke-width:2;stroke-linecap:round;stroke-linejoin:round;flex:none}
.uhd header{display:flex;align-items:center;gap:8px;padding:12px 14px 10px;background:var(--navy);color:#fff}
.uhd header strong{font-size:14px;font-weight:600;flex:1}
.uhd .count{font-size:12px;opacity:.8}
.uhd .x{background:none;border:0;color:#fff;font-size:22px;line-height:1;cursor:pointer;padding:0 2px}
.uhd .search{position:relative;padding:0 12px 10px;background:var(--navy)}
.uhd .q{width:100%;border:0;border-radius:8px;padding:10px 70px 10px 12px;font:inherit;font-size:14px;outline:none;background:var(--card);color:var(--text)}
.uhd .q::-webkit-search-cancel-button{display:none}
.uhd .q:focus{box-shadow:0 0 0 3px rgba(255,255,255,.4)}
.uhd .sbtn{position:absolute;top:4px;width:32px;height:32px;border:0;background:none;border-radius:6px;color:var(--muted);cursor:pointer;display:flex;align-items:center;justify-content:center}
.uhd .sbtn:hover{background:var(--grey-bg);color:var(--text)}
.uhd .sbtn.clear{right:52px}
.uhd .sbtn.help{right:18px}
.uhd .filters{display:flex;flex-direction:column;gap:5px;padding:8px 10px 2px}
.uhd .frow{display:flex;flex-wrap:wrap;gap:5px;align-items:center}
.uhd .frow .lbl{font-size:11px;color:var(--muted);margin-right:2px}
.uhd .chip{border:1px solid var(--line2);background:var(--card);color:var(--text2);border-radius:14px;padding:2px 10px;font-size:12px;cursor:pointer}
.uhd .chip:hover{border-color:var(--focus)}
.uhd .chip.on{background:var(--navy);border-color:var(--navy);color:#fff}
.uhd .chip.client.on{background:var(--deep);border-color:var(--deep)}
.uhd .chip.new{border-color:var(--ev-bd);color:var(--ev-tx)}
.uhd .chip.new.on{background:#1849a9;border-color:#1849a9;color:#fff}
.uhd .chip.sure{border-color:#f4b4ad;color:var(--red)}
.uhd .chip.sure.on{background:#b42318;border-color:#b42318;color:#fff}
.uhd .chip.dur.on{background:var(--text2);border-color:var(--text2);color:var(--card)}
.uhd .sep{width:1px;height:16px;background:var(--line2);margin:0 2px}
.uhd .notice{margin:8px 10px 0;padding:8px 10px;border-radius:8px;background:var(--warn-bg);color:var(--warn-tx);font-size:12px;display:flex;gap:8px;align-items:center}
.uhd .notice.err{background:var(--err-bg);color:var(--err-tx)}
.uhd .notice button{margin-left:auto;flex:none;border:1px solid currentColor;background:none;border-radius:6px;padding:3px 8px;cursor:pointer}
.uhd .results{flex:1;min-height:0;overflow:auto;padding:8px}
.uhd .empty{padding:32px 16px;text-align:center;color:var(--muted)}
.uhd .empty .btn{margin-top:10px}
.uhd .more{padding:6px 10px 10px;text-align:center;font-size:12px;color:var(--muted)}
.uhd .section{display:flex;justify-content:space-between;align-items:baseline;gap:8px;padding:2px 4px 6px;font-size:11px;color:var(--muted)}
.uhd .section b{font-weight:600;letter-spacing:.04em;text-transform:uppercase}
.uhd .onboard{margin:14px 6px;padding:16px 18px;background:var(--card);border:1px solid var(--line);border-radius:12px}
.uhd .onboard b{display:block;font-size:14px;color:var(--navy);margin-bottom:6px}
.uhd .onboard ol{margin:0 0 14px;padding-left:20px;color:var(--text2)}
.uhd .onboard li{margin:4px 0}
.uhd .btn{display:inline-flex;align-items:center;gap:6px;border:1px solid var(--line2);background:var(--card);color:var(--text);border-radius:8px;padding:6px 11px;cursor:pointer;white-space:nowrap}
.uhd .btn:hover{border-color:var(--focus)}
.uhd .btn.primary{background:var(--navy);border-color:var(--navy);color:#fff;font-weight:600}
.uhd .btn.primary:hover{background:var(--navy2)}
.uhd .btn.danger{border-color:#e5b3ae;color:var(--red)}
.uhd .btn.sm{padding:3px 8px;font-size:12px;border-radius:6px}
.uhd .ib{width:28px;height:28px;border:0;background:none;border-radius:6px;color:var(--muted);cursor:pointer;display:inline-flex;align-items:center;justify-content:center;flex:none}
.uhd .ib:hover{background:var(--soft);color:var(--navy)}
.uhd .ib.on{color:var(--navy)}
.uhd .ib.done{color:var(--green)}
.uhd .item{background:var(--card);border:1px solid var(--line);border-left:4px solid var(--st,var(--green));border-radius:10px;padding:8px 8px 7px 11px;margin-bottom:6px;cursor:pointer}
.uhd .item.closed{--st:var(--grey)}
.uhd .item.karar{--st:var(--amber)}
.uhd .item:hover{border-color:var(--bord);border-left-color:var(--st,var(--green))}
.uhd .item.sel{background:var(--soft);box-shadow:0 0 0 1px var(--focus) inset}
.uhd .ihead{display:flex;align-items:flex-start;gap:6px}
.uhd .ititle{flex:1;min-width:0;padding-top:4px;font-size:13.5px;font-weight:600;color:var(--text);line-height:1.35}
.uhd .ititle .dot{color:var(--muted);font-weight:400;margin:0 4px}
.uhd .pill{display:inline-block;padding:0 6px;border-radius:9px;font-size:11px;font-weight:600;margin-left:6px;vertical-align:1px;white-space:nowrap}
.uhd .pill.new{background:var(--ev-bg);color:var(--ev-tx)}
.uhd .pill.st{background:var(--green-bg);color:var(--green)}
.uhd .pill.st.closed{background:var(--grey-bg);color:var(--muted)}
.uhd .pill.st.karar{background:var(--amber-bg);color:var(--amber)}
.uhd .icons{flex:none;display:flex;gap:0}
.uhd .hr{height:1px;background:var(--line);margin:5px 0 6px}
.uhd .ifoot{display:flex;align-items:center;gap:6px;margin-top:6px}
.uhd .ifoot .open{margin-left:auto}
.uhd .det{margin-top:5px;padding:6px 8px;border-radius:6px;background:var(--bg);font-size:12px;color:var(--text2)}
.uhd .det div{margin:1px 0}
.uhd .det .k{color:var(--muted)}
.uhd .client{font-size:12px;color:var(--deep)}
.uhd[data-theme=dark] .client{color:#7fd6cc}
.uhd .client b{font-weight:600}
.uhd .parties{margin-top:2px;font-size:12px;color:var(--text2);display:-webkit-box;-webkit-line-clamp:3;-webkit-box-orient:vertical;overflow:hidden}
.uhd .parties.all{display:block}
.uhd .parties .rol,.uhd .vek{color:var(--muted)}
.uhd .parties em{color:var(--muted)}
.uhd .pmore{border:0;background:none;padding:0;margin-top:2px;font-size:11px;color:var(--navy);cursor:pointer}
.uhd .pname{border:0;background:none;padding:0;color:inherit;cursor:pointer;text-align:left;border-bottom:1px dotted transparent}
.uhd .pname:hover{color:var(--navy);border-bottom-color:currentColor}
.uhd .note-ta{display:block;width:100%;margin-top:6px;padding:5px 8px;border:0;border-left:3px solid var(--note-bd);background:var(--note-bg);border-radius:0 6px 6px 0;
  font:inherit;font-size:12px;color:var(--text);resize:none;outline:none;overflow-wrap:anywhere;max-height:150px;overflow:auto;cursor:text}
.uhd .note-ta:focus{box-shadow:0 0 0 2px var(--note-bd)}
.uhd .note-hint{font-size:11px;color:var(--muted)}
.uhd mark{background:var(--mark);color:inherit;border-radius:2px}
.uhd .son{font-size:12px;color:var(--muted)}
.uhd .son b{font-weight:600;color:var(--text2)}
.uhd .durline{margin-top:2px;font-size:12px;color:var(--text2)}
.uhd .durline b{font-weight:600}
.uhd .durline.today b{color:var(--red)}
.uhd .durline.soon b{color:var(--amber)}
.uhd .rolein{margin-top:2px;font-size:12px;color:var(--deep)}
.uhd .rolein.other{color:var(--warn-tx)}
.uhd .evrak{margin-top:6px;padding:5px 8px;border-left:3px solid var(--ev-bd);background:var(--ev-bg);border-radius:0 6px 6px 0;font-size:12px;cursor:default}
.uhd .evrak .head{display:flex;justify-content:space-between;align-items:center;gap:8px;font-weight:600;color:var(--ev-tx)}
.uhd .evrak ul{margin:3px 0 0;padding:0;list-style:none}
.uhd .evrak li{margin:3px 0;color:var(--text2)}
.uhd .evrak li small{color:var(--muted)}
.uhd .lnk{border:1px solid var(--line2);background:var(--card);color:var(--text2);border-radius:5px;padding:0 6px;font-size:11px;cursor:pointer;margin-left:4px;vertical-align:1px}
.uhd .lnk:hover{border-color:var(--focus);color:var(--navy)}
.uhd .sure{margin-top:6px;padding:5px 8px;border-left:3px solid var(--grey);background:var(--bg);border-radius:0 6px 6px 0;font-size:12px;cursor:default}
.uhd .sure.warm{border-left-color:#f79009;background:var(--warm-bg)}
.uhd .sure.hot{border-left-color:#d92d20;background:var(--hot-bg)}
.uhd .sure .line{display:flex;gap:8px;align-items:center;flex-wrap:wrap}
.uhd .sure .left{font-weight:600}
.uhd .sure.hot .left{color:var(--red)}
.uhd .sure.warm .left{color:var(--amber)}
.uhd .sure .acts2{margin-left:auto;display:flex;gap:4px}
.uhd .sure-form{margin-top:6px;padding:8px;border:1px solid var(--line2);border-radius:8px;background:var(--card);font-size:12px;cursor:default}
.uhd .sure-form .g{display:grid;grid-template-columns:auto 1fr;gap:6px 8px;align-items:center}
.uhd .sure-form input,.uhd .sure-form select{border:1px solid var(--line2);border-radius:6px;padding:4px 6px;font:inherit;min-width:0;background:var(--card);color:var(--text)}
.uhd .sure-form .per{display:flex;gap:6px}
.uhd .sure-form .per input{width:60px}
.uhd .sure-form .w{margin-top:6px;color:var(--warn-tx)}
.uhd .sure-form .h{margin-top:6px;color:var(--muted);font-size:11px}
.uhd .sure-form .b{display:flex;gap:8px;margin-top:8px}
.uhd .person,.uhd .durhead{background:var(--card);border:1px solid var(--line);border-radius:10px;padding:10px 12px;margin-bottom:8px;font-size:12px;color:var(--text2)}
.uhd .person .top{display:flex;align-items:center;gap:8px}
.uhd .person .top b{font-size:15px;color:var(--deep);flex:1}
.uhd[data-theme=dark] .person .top b{color:#7fd6cc}
.uhd .person .kind{font-size:11px;font-weight:600;letter-spacing:.04em;text-transform:uppercase;color:var(--muted)}
.uhd .person .sum{margin-top:4px}
.uhd .person .warn{margin-top:6px;padding:5px 8px;border-radius:6px;background:var(--warn-bg);color:var(--warn-tx)}
.uhd .person .hint,.uhd .durhead .hint{margin-top:6px;color:var(--muted);font-size:11px}
.uhd .row{display:flex;gap:8px;align-items:center;flex-wrap:wrap;margin-top:6px}
.uhd .dayhead{display:flex;justify-content:space-between;align-items:baseline;padding:8px 4px 5px;font-size:12px;font-weight:700;color:var(--deep)}
.uhd[data-theme=dark] .dayhead{color:#7fd6cc}
.uhd .dayhead.today{color:var(--red)}
.uhd .dayhead small{font-weight:400;color:var(--muted)}
.uhd .durrow{display:flex;gap:10px;align-items:center;background:var(--card);border:1px solid var(--line);border-radius:10px;padding:8px 10px;margin-bottom:6px}
.uhd .durrow .t{flex:none;font-weight:700;font-size:14px;color:var(--deep);width:44px}
.uhd .durrow .meta{color:var(--muted);font-size:12px}
.uhd .settings{flex:1;min-height:0;overflow:auto;padding:10px 12px 16px;font-size:12px}
.uhd .settings h3{margin:14px 0 6px;font-size:11px;font-weight:700;letter-spacing:.05em;text-transform:uppercase;color:var(--muted)}
.uhd .settings h3:first-of-type{margin-top:4px}
.uhd .settings .box{background:var(--card);border:1px solid var(--line);border-radius:10px;padding:10px 12px}
.uhd .settings .top{display:flex;align-items:center;gap:8px;margin-bottom:4px}
.uhd .settings .top b{flex:1;font-size:14px}
.uhd .settings label.check{display:flex;gap:8px;align-items:flex-start;margin:6px 0;cursor:pointer}
.uhd .settings label.check input{margin:2px 0 0}
.uhd .settings .field{display:flex;align-items:center;gap:8px;margin:6px 0}
.uhd .settings .field span{flex:1}
.uhd .settings select,.uhd .settings input[type=text]{border:1px solid var(--line2);border-radius:6px;padding:5px 8px;font:inherit;background:var(--card);color:var(--text);outline:none;min-width:0}
.uhd .settings input[type=text]{flex:1}
.uhd .settings .hint{color:var(--muted);font-size:11px;margin-top:4px}
.uhd .tags{display:flex;flex-wrap:wrap;gap:5px;margin:6px 0}
.uhd .tag{display:inline-flex;align-items:center;gap:4px;padding:2px 4px 2px 9px;border-radius:12px;background:var(--soft);color:var(--deep);font-size:12px}
.uhd[data-theme=dark] .tag{color:#7fd6cc}
.uhd .tag.auto{background:var(--grey-bg);color:var(--muted);padding-right:9px}
.uhd .tag button{border:0;background:none;cursor:pointer;color:inherit;padding:0 2px;line-height:1;font-size:14px}
.uhd .gz{display:flex;align-items:center;gap:8px;padding:4px 0;border-top:1px solid var(--line)}
.uhd .gz span{flex:1;min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.uhd .status{padding:6px 12px 0;color:var(--muted);font-size:12px;border-top:1px solid var(--line);background:var(--card)}
.uhd .status.err{color:var(--red)}
.uhd .bar{height:4px;background:var(--line);border-radius:2px;margin-top:5px;overflow:hidden}
.uhd .bar i{display:block;height:100%;width:0;background:var(--navy);transition:width .3s}
.uhd footer{display:flex;gap:6px;padding:6px 10px 8px;background:var(--card);align-items:center}
.uhd footer .stx{flex:1;min-width:0;font-size:12px;color:var(--muted);overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.uhd footer .stx.err{color:var(--red)}
.uhd button:disabled{opacity:.5;cursor:default}
`;

  // Basit çizgi simgeleri (24×24, stroke).
  const ICONS = {
    copy: '<rect x="9" y="9" width="12" height="12" rx="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/>',
    note: '<path d="M12 20h9"/><path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4Z"/>',
    clock: '<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>',
    hide: '<path d="M3 3l18 18"/><path d="M10.6 10.6a2 2 0 0 0 2.8 2.8"/><path d="M9.9 4.2A10 10 0 0 1 12 4c7 0 10 8 10 8a17 17 0 0 1-3.2 4.3"/><path d="M6.6 6.6C3.8 8.4 2 12 2 12s3 8 10 8a9.7 9.7 0 0 0 5.4-1.6"/>',
    eye: '<path d="M2 12s3-8 10-8 10 8 10 8-3 8-10 8S2 12 2 12Z"/><circle cx="12" cy="12" r="3"/>',
    down: '<path d="M6 9l6 6 6-6"/>',
    up: '<path d="M18 15l-6-6-6 6"/>',
    sync: '<path d="M21 12a9 9 0 1 1-2.6-6.4"/><path d="M21 3v6h-6"/>',
    gear: '<path d="M4 21v-7M4 10V3M12 21v-9M12 8V3M20 21v-5M20 12V3M1 14h6M9 8h6M17 16h6"/>',
    stop: '<rect x="6" y="6" width="12" height="12" rx="1"/>',
    x: '<path d="M18 6 6 18M6 6l12 12"/>',
    help: '<circle cx="12" cy="12" r="9"/><path d="M9.1 9a3 3 0 0 1 5.8 1c0 2-3 3-3 3"/><path d="M12 17h.01"/>',
    back: '<path d="M15 18l-6-6 6-6"/>',
    check: '<path d="M20 6 9 17l-5-5"/>'
  };
  function icon(name) {
    const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    svg.setAttribute('viewBox', '0 0 24 24');
    svg.setAttribute('aria-hidden', 'true');
    svg.innerHTML = ICONS[name] || '';
    return svg;
  }

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
    const input = el('input', { type: 'search', class: 'q', placeholder: 'Ad, soyad, dosya no, mahkeme veya not yazınız', autocomplete: 'off', spellcheck: 'false', 'aria-label': 'Dosya ara' });
    const btnQClear = el('button', { class: 'sbtn clear', title: 'Aramayı temizle', 'aria-label': 'Aramayı temizle', hidden: true }, icon('x'));
    const btnHelp = el('button', { class: 'sbtn help', title: 'Nerede aranır?', 'aria-label': 'Nerede aranır?' }, icon('help'));
    const count = el('span', { class: 'count' });
    const filters = el('div', { class: 'filters' });
    const notice = el('div', { class: 'notice', hidden: true });
    const list = el('div', { class: 'results' });
    const settings = el('div', { class: 'settings', hidden: true });
    const barFill = el('i');
    const bar = el('div', { class: 'bar', hidden: true }, barFill);
    const status = el('div', { class: 'status', hidden: true }, bar);
    const statusText = el('div', { class: 'stx' });
    const btnUpdate = el('button', { class: 'btn sm primary' }, icon('sync'), el('span', null, 'Güncelle'));
    const btnStop = el('button', { class: 'btn sm danger', hidden: true }, icon('stop'), el('span', null, 'Durdur'));
    const btnSettings = el('button', { class: 'ib', title: 'Ayarlar', 'aria-label': 'Ayarlar' }, icon('gear'));
    const root = el('div', { class: 'uhd ' + (opts.mode || '') },
      el('header', null, el('strong', null, BRAND.name), count,
        opts.onClose ? el('button', { class: 'x', title: 'Kapat', onclick: opts.onClose }, '×') : null),
      el('div', { class: 'search' }, input, btnQClear, btnHelp),
      filters, notice, list, settings, status,
      el('footer', null, statusText, btnStop, btnUpdate, btnSettings));
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
    let editing = null;        // notu düzenlenen kayıt (düzenleme sürerken liste yeniden çizilmez)
    let manualNotice = false;
    let goruldu = {};
    let gizli = {};            // aramada gösterilmeyecek dosyalar (uhdGizli): { key: { dosyaNo, birimAdi, at } }
    let expanded = new Set();  // ayrıntısı açık kartlar
    let allParties = new Set();// tüm tarafları gösterilen kartlar
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

    // Tema: ayar "auto" ise sistemin açık/koyu tercihine uyar.
    const darkMq = window.matchMedia ? window.matchMedia('(prefers-color-scheme: dark)') : null;
    function applyTheme() {
      const t = prefs.tema || 'auto';
      root.dataset.theme = t === 'auto' ? (darkMq && darkMq.matches ? 'dark' : 'light') : t;
    }
    if (darkMq && darkMq.addEventListener) darkMq.addEventListener('change', applyTheme);

    const pref = (k, d) => (prefs[k] === undefined ? d : prefs[k]);
    async function setPref(k, v) {
      prefs = { ...prefs, [k]: v };
      await chrome.storage.local.set({ uhdPrefs: prefs });
    }

    const myNames = () => String(prefs.myName || '').split(/[,;]/).map(x => x.trim()).filter(Boolean);
    const myName = () => myNames().join(', ') || detected;
    const running = () => !!(progress && progress.running && Date.now() - (progress.beat || 0) < RUN_STALE_MS);

    function setIndex(ix) {
      records = (ix && ix.records) || [];
      meta = ix || {};
      detected = detectMyName(records);
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
      { row: 2, group: 'onlyDurusma', v: true, label: 'Duruşmalar', title: 'Son güncellemede UYAP’tan alınan yaklaşan duruşmalar, günlere göre', cls: 'dur' },
      { row: 2, group: 'onlySure', v: true, label: 'Süreler', title: 'Süre hatırlatması eklediğiniz dosyalar, son günü en yakın olan önce', cls: 'sure' },
      { row: 2, group: 'onlyNew', v: true, label: 'Yeni Evrak', title: 'Güncellemelerde yeni evrak gelen ve henüz “Görüldü” demediğiniz dosyalar', cls: 'new' }
    ];
    const TOGGLES = ['onlyClient', 'onlyNew', 'onlySure', 'onlyDurusma'];
    function clearFilters() {
      filter.durum = 'all'; filter.tur = 'all';
      for (const k of TOGGLES) filter[k] = false;
    }
    function renderFilters() {
      filters.replaceChildren();
      const row1 = el('div', { class: 'frow' });
      const row2 = el('div', { class: 'frow' }, el('span', { class: 'lbl' }, 'Takip:'));
      let n2 = 0;
      for (const c of CHIPS) {
        if (!c) { row1.append(el('span', { class: 'sep' })); continue; }
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
            setNotice('Müvekkilleri ayırmak için vekil adınız bulunamadı. Ayarlar’dan ekleyin.', '', { label: 'Ayarlar', fn: () => { setNotice(''); openSettings(); } });
            return;
          }
          filter[c.group] = on ? (TOGGLES.includes(c.group) ? false : 'all') : c.v;
          if (c.row === 2 && !on) for (const k of ['onlyNew', 'onlySure', 'onlyDurusma']) if (k !== c.group) filter[k] = false;
          if (c.group === 'onlyDurusma') person = null;
          sel = 0;
          renderFilters();
          render();
          if (c.row === 2) autoNotice();
        });
        if (c.row === 2) { row2.append(b); n2++; } else row1.append(b);
      }
      filters.append(row1);
      if (n2) filters.append(row2);
    }

    // ------------------------------------------------ sonuç satırı

    // Taraf adı: tıklanınca o kişinin tüm dosyaları (müvekkil kartı) açılır. Adlar baş harfleri büyük gösterilir.
    function nameBtn(name, toks) {
      const b = el('button', { class: 'pname', title: `${trTitle(name)}: tüm dosyaları göster` }, highlight(trTitle(name), toks));
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
        const showAll = allParties.has(r.key);
        const box = el('div', { class: 'parties' + (showAll ? ' all' : '') });
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
              .map(v => trTitle(v.replace(/^av\.?\s+/i, '')));
            if (vek.length) box.append(el('span', { class: 'vek' }, ' (Av. ', highlight(vek.join(', '), toks), ')'));
          });
        }
        out.push(box);
        if (others.length > 4) {
          const more = el('button', { class: 'pmore' }, showAll ? 'Daha az göster' : `Tüm tarafları göster (${fmtNum(others.length)})`);
          more.addEventListener('click', e => {
            e.stopPropagation();
            if (showAll) allParties.delete(r.key); else allParties.add(r.key);
            render();
          });
          out.push(more);
        }
      }
      return out;
    }

    // Not doğrudan metin kutusunda gösterilir: tıklanan yerde imleçle düzenlenir, Enter kaydeder, Esc vazgeçer.
    // Notlar yalnız bu bilgisayarda tutulur; UYAP'taki notlarla ilgisi yoktur.
    function noteBlock(r) {
      const has = !!notes[r.key];
      if (!has && editing !== r.key) return null;
      const ta = el('textarea', { class: 'note-ta', rows: '1', placeholder: 'Bu dosyaya not yazın (yalnız bu bilgisayarda saklanır)…', title: 'Kişisel not · Enter: kaydet · Shift+Enter: yeni satır · Esc: vazgeç', spellcheck: 'true' });
      ta.value = notes[r.key] || '';
      const fit = () => { ta.style.height = 'auto'; ta.style.height = Math.min(ta.scrollHeight + 2, 150) + 'px'; };
      let cancelled = false, finished = false;
      const done = () => {
        if (finished) return;
        finished = true;
        if (editing === r.key) editing = null;
        if (!cancelled && ta.value.trim() !== (notes[r.key] || '')) saveNote(r.key, ta.value);
        else render();
      };
      ta.addEventListener('click', e => e.stopPropagation());
      ta.addEventListener('mousedown', e => e.stopPropagation());
      ta.addEventListener('focus', () => { editing = r.key; });
      ta.addEventListener('input', fit);
      ta.addEventListener('keydown', e => {
        e.stopPropagation();
        if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); done(); }
        else if (e.key === 'Escape') { e.preventDefault(); cancelled = true; done(); input.focus(); }
      });
      ta.addEventListener('blur', done);
      setTimeout(() => { fit(); if (editing === r.key && !has) ta.focus(); }, 0);
      return ta;
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
      const seenBtn = el('button', { class: 'btn sm', title: 'Bu dosyadaki yeni evrakları görüldü olarak işaretle' }, icon('check'), 'Görüldü');
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
      return el('div', { class: 'son', title: 'Dosyadaki en yeni evrak (son güncellemeye göre). ' + title }, el('span', { class: 'k' }, 'Son evrak: '), el('b', null, s.onay), t.slice(s.onay.length),
        s.k ? [' ', evrakOpenBtn(r, s.k)] : null,
        isTebligat(s.tur) ? [' ', sureLink(r, s)] : null);
    }

    // ------------------------------------------------ evrak açma ve duruşmalar

    function evrakOpenBtn(r, k) {
      if (!k || !opts.onOpenEvrak) return null;
      const b = el('button', { class: 'lnk', title: 'Evrakı UYAP’tan getirip göster (evrak saklanmaz)' }, 'Aç');
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
      const ics = el('button', { class: 'btn sm', title: 'Listelenen duruşmaları takvim dosyası (.ics) olarak indir; Outlook, Google Takvim ve telefon takvimleri açar. Taraf adları yazılmaz.' }, 'Takvime aktar (.ics)');
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
              el('div', { class: 'parties' }, d.taraflar.map(t => `${t.sifat ? trTitle(t.sifat) + ': ' : ''}${trTitle(t.ad)}`).join(' · ')),
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
      const b = el('button', { class: 'ib', title: 'Süre hatırlatması ekle (ör. istinaf, cevap dilekçesi)', 'aria-label': 'Süre hatırlatması ekle' }, icon('clock'));
      b.addEventListener('click', e => { e.stopPropagation(); openSureForm(r); });
      return b;
    }

    // Tebligat evrakından süre formu: başlangıç olarak evrakın onay tarihi önerilir (kontrol edilmek üzere).
    function sureLink(r, y) {
      const b = el('button', { class: 'lnk', title: 'Bu tebligat için süre hatırlatması ekleyin' }, 'Süre ekle');
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
      const save = el('button', { class: 'btn sm primary' }, 'Kaydet');
      const cancel = el('button', { class: 'btn sm' }, 'Vazgeç');
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
        const done = el('button', { class: 'btn sm', title: 'İş yapıldı; hatırlatmayı kapat' }, icon('check'), 'Tamamlandı');
        done.addEventListener('click', e => { e.stopPropagation(); saveSureler({ ...sureler, [s.id]: { ...s, done: true, doneAt: Date.now() } }); });
        const del = el('button', { class: 'ib', title: 'Hatırlatmayı sil', 'aria-label': 'Hatırlatmayı sil' }, icon('x'));
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

    // Durum rengi: açık yeşil, kapalı gri, karara çıkmış turuncu.
    function stateOf(r) {
      const d = cleanDurum(r.durum);
      const label = d.label || (r.sorguDurum === 1 ? 'Kapalı' : 'Açık');
      const cls = r.sorguDurum === 1 ? 'closed' : /karar/i.test(label) ? 'karar' : '';
      return { label, tarih: d.tarih, cls };
    }

    function panelBtn(r, tab, label, title) {
      const b = el('button', { class: 'btn sm', title }, label);
      b.addEventListener('click', e => { e.stopPropagation(); opts.onDosyaPanel(r, tab); });
      return b;
    }

    // Son işlem (güncellemede safahat takibi açıksa): "Son işlem: 12/09/2026 · Haciz Talebi"
    function islemLine(r) {
      if (!r.sonIslem || !r.sonIslem.tarih) return null;
      return el('div', { class: 'son', title: 'Son güncellemedeki safahata göre en yeni işlem' }, el('span', { class: 'k' }, 'Son işlem: '), el('b', null, r.sonIslem.tarih), r.sonIslem.tur ? ` · ${r.sonIslem.tur}` : '');
    }

    const kunyeOf = r => `${cleanBirim(r.birimAdi).replace(/\s*\(kapatılan\)$/i, '')} ${r.dosyaNo} E.`;

    async function copyText(btn, text) {
      try {
        await navigator.clipboard.writeText(text);
        btn.classList.add('done');
        btn.replaceChildren(icon('check'));
        setTimeout(() => { btn.classList.remove('done'); btn.replaceChildren(icon('copy')); }, 1500);
      } catch {
        btn.title = 'Kopyalanamadı';
      }
    }

    function item(r, i, toks, keys, extra) {
      const st = stateOf(r);
      const kunye = kunyeOf(r);
      const ib = (name, title, fn, cls) => {
        const b = el('button', { class: 'ib' + (cls ? ' ' + cls : ''), title, 'aria-label': title }, icon(name));
        b.addEventListener('click', e => { e.stopPropagation(); fn(b); });
        return b;
      };
      const icons = el('div', { class: 'icons' },
        ib('copy', `Künyeyi kopyala: ${kunye}`, b => copyText(b, kunye)),
        ib('note', notes[r.key] ? 'Notu düzenle (yalnız bu bilgisayarda)' : 'Not ekle (yalnız bu bilgisayarda)', () => { editing = r.key; sel = i; render(); }, notes[r.key] ? 'on' : ''),
        sureBtn(r),
        ib('hide', 'Bu dosyayı aramalarda gösterme (Ayarlar’dan geri alınır)', () => hideFile(r)));
      const isOpen = expanded.has(r.key);
      const detBtn = el('button', { class: 'btn sm', title: 'Durum, dosya türü, açılış tarihi ve son evrak' }, icon(isOpen ? 'up' : 'down'), 'Detay');
      detBtn.addEventListener('click', e => {
        e.stopPropagation();
        if (isOpen) expanded.delete(r.key); else expanded.add(r.key);
        render();
      });
      const open = el('button', { class: 'btn sm primary open', title: 'Dosyayı UYAP’ta Pencere Görünümü ile aç (karta tıklamak da açar)' }, icon('eye'), 'Dosya Görüntüle');
      open.addEventListener('click', e => { e.stopPropagation(); openRecord(r); });
      const det = isOpen ? el('div', { class: 'det', onclick: e => e.stopPropagation() },
        el('div', null, el('span', { class: 'k' }, 'Durum: '), st.label, st.tarih ? ` (${st.tarih})` : ''),
        el('div', null, el('span', { class: 'k' }, 'Dosya türü: '), r.dosyaTur || '—', r.acilis ? [el('span', { class: 'k' }, ' · Açılış: '), r.acilis] : null),
        sonLine(r) || el('div', { class: 'son' }, el('span', { class: 'k' }, 'Son evrak: '), evrakTracked ? 'yok' : 'evrak takibi kapalı'),
        opts.onDosyaPanel ? el('div', { class: 'row' },
          r.yargiTuru === '2' ? panelBtn(r, 'ozet', 'İcra özeti', 'Alacak, tahsilat ve kalan tutar (ücretsiz)') : null,
          r.yargiTuru === '2' ? panelBtn(r, 'sorgu', 'Borçlu sorgusu', 'SGK, banka, tapu, araç… (ücretli olabilir; onayla ve tek tek)') : null,
          panelBtn(r, 'safahat', 'Safahat', 'Dosyanın işlem geçmişi')) : null) : null;
      const row = el('div', { class: 'item' + (st.cls ? ' ' + st.cls : '') + (i === sel ? ' sel' : '') },
        el('div', { class: 'ihead' },
          el('div', { class: 'ititle' },
            highlight(cleanBirim(r.birimAdi), toks), el('span', { class: 'dot' }, '·'), highlight(r.dosyaNo, toks),
            st.cls ? el('span', { class: 'pill st ' + st.cls, title: st.tarih ? `${st.label} · ${st.tarih}` : st.label }, st.label) : null,
            yeniMap.has(r.key) ? el('span', { class: 'pill new' }, 'Yeni Evrak') : null),
          icons),
        el('div', { class: 'hr' }),
        durLine(r),
        islemLine(r),
        extra || null,
        partyLines(r, toks, keys),
        evrakBlock(r, toks),
        sureBlock(r),
        noteBlock(r),
        det,
        el('div', { class: 'ifoot' }, detBtn, open));
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
      filters.hidden = !records.length || !!person || !settings.hidden;
      if (!records.length) {
        const run = running();
        const go = el('button', { class: 'btn primary', disabled: run }, run ? 'İlk güncelleme sürüyor…' : 'Şimdi güncelle');
        go.addEventListener('click', () => { setNotice(''); opts.onUpdate(false); });
        list.append(el('div', { class: 'onboard' },
          el('b', null, 'Başlamak için'),
          el('ol', null,
            el('li', null, 'UYAP Avukat Portalı’na e-imza ile giriş yapın.'),
            el('li', null, '“Şimdi güncelle”ye basın. Vekili olduğunuz dosyaların listesi, taraf adları, vekilleri ve duruşmalarınız UYAP’tan alınıp yalnızca bu bilgisayara kaydedilir; hiçbir yere gönderilmez. İlk seferde birkaç dakika sürebilir.'),
            el('li', null, 'Ad, soyad, dosya no veya mahkeme yazın; “Dosya Görüntüle” ile dosya UYAP’ta açılır.')),
          go,
          el('p', { style: 'margin:12px 0 0;font-size:12px;color:var(--muted)' }, 'Ayrıntılar: ', el('a', { href: BRAND.site + '/gizlilik/uyap-asistani', target: '_blank', rel: 'noopener' }, 'gizlilik politikası'), '.')));
        return;
      }
      if (person) return renderPerson();
      if (filter.onlyDurusma) return renderDurusmalar();
      const keys = myKeys(myName());
      const q = input.value;
      const res = search(records, q, { myName: myName(), notes, filter, yeni: yeniMap, sure: sureMap, gizli, vekilAra: pref('vekilAra', true), limit: LIMIT });
      const hint = el('span', { title: 'Arama kutusundayken ↑ ↓ ya da Tab ile dosyalar arasında gezinin, Enter ile seçili dosyayı açın.' }, '↑ ↓ / Tab: seç · Enter: aç');
      if (!res.tokens.length && !res.total && filter.durum === 'all' && filter.tur === 'all' && !filter.onlyClient && !filter.onlyNew && !filter.onlySure) {
        const byKey = new Map(records.map(r => [r.key, r]));
        current = recent.map(k => byKey.get(k)).filter(r => r && !gizli[r.key]);
        if (!current.length) {
          list.append(el('div', { class: 'empty' }, `${fmtNum(records.length)} dosya indekste. Aramak için ad, soyad, dosya no veya mahkeme yazın ya da yukarıdan filtre seçin.`));
          return;
        }
        list.append(el('div', { class: 'section' }, el('b', null, 'Son açılanlar'), hint));
      } else {
        current = res.items;
        if (!res.total) {
          const narrowed = filter.durum !== 'all' || filter.tur !== 'all' || filter.onlyClient || filter.onlyNew || filter.onlySure;
          let text = 'Eşleşen dosya yok.';
          let action = narrowed ? { label: 'Filtreleri kaldır', fn: () => { clearFilters(); renderFilters(); render(); } } : null;
          if (filter.onlyNew && !res.tokens.length) {
            text = 'Son güncellemeden bu yana yeni evrak yok.';
            action = { label: 'Güncelle', fn: () => { setNotice(''); opts.onUpdate(false); } };
          } else if (filter.onlySure && !res.tokens.length) {
            text = 'Açık süre hatırlatması yok. Bir dosyada saat simgesiyle ekleyebilirsiniz.';
          }
          const box = el('div', { class: 'empty' }, el('div', null, text));
          if (action) {
            const b = el('button', { class: 'btn' }, action.label);
            b.addEventListener('click', action.fn);
            box.append(b);
          }
          list.append(box);
          return;
        }
        const total = el('span', null, el('b', null, `${fmtNum(res.total)} sonuç`));
        if (filter.onlyNew) {
          const all = el('button', { class: 'btn sm', title: 'Listelenen dosyaların yeni evraklarını görüldü olarak işaretle' }, icon('check'), 'Tümünü görüldü say');
          all.addEventListener('click', () => markSeen(search(records, q, { myName: myName(), notes, filter, yeni: yeniMap, gizli, limit: Infinity }).items.map(r => r.key)));
          total.append(' · ', all);
        }
        list.append(el('div', { class: 'section' }, total, hint));
      }
      if (sel >= current.length) sel = 0;
      current.forEach((r, i) => list.append(item(r, i, res.tokens, keys)));
      if (res.tokens.length && !pref('vekilAra', true)) list.append(el('div', { class: 'more' }, 'Karşı taraf vekillerinde arama kapalı (Ayarlar).'));
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

      const back = el('button', { class: 'btn sm', title: 'Aramaya dön (Esc)' }, icon('back'), 'Geri');
      back.addEventListener('click', closePerson);
      const copyAll = el('button', { class: 'btn sm', title: 'Bu kişinin tüm dosyalarının künyelerini alt alta kopyala' }, icon('copy'), 'Künyeleri kopyala');
      copyAll.addEventListener('click', async () => {
        try {
          await navigator.clipboard.writeText(files.map(f => kunyeOf(f.r)).join('\n'));
          copyAll.replaceChildren(icon('check'), 'Kopyalandı');
        } catch { copyAll.textContent = 'Kopyalanamadı'; }
      });
      const head = el('div', { class: 'person' },
        el('div', { class: 'kind' }, muvekkil.length ? 'Müvekkil kartı' : 'Kişi kartı'),
        el('div', { class: 'top' }, el('b', null, trTitle(person.name)), back),
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
      const paused = !run && !!pendingJob && !pendingJob.stop;
      btnStop.hidden = !run && !paused;
      btnStop.replaceChildren(icon(paused ? 'x' : 'stop'), el('span', null, paused ? 'İptal et' : 'Durdur'));
      btnStop.title = paused ? 'Yarıda kalan güncellemeyi bırakır; o ana kadar alınan bilgiler saklı kalır.' : 'Güncellemeyi durdurur; sonra “Sürdür” ile kaldığı yerden devam edebilirsiniz.';
      btnUpdate.hidden = run;
      btnUpdate.replaceChildren(icon('sync'), el('span', null, paused ? 'Sürdür' : 'Güncelle'));
      btnUpdate.title = paused ? 'Yarıda kalan güncellemeyi kaldığı yerden sürdürür.' : 'Dosya listesini, yeni dosyaların taraflarını ve duruşmaları UYAP’tan yeniler.';
      count.textContent = records.length ? `${fmtNum(records.length)} dosya` : '';
      const err = !run && !!(progress && progress.error);
      statusText.classList.toggle('err', err);
      status.hidden = !run || !progress.total;
      if (run) {
        let text = progress.text || 'Güncelleniyor…';
        if (progress.total && progress.done && progress.phaseStart) {
          const perItem = (Date.now() - progress.phaseStart) / progress.done;
          const min = Math.ceil(perItem * (progress.total - progress.done) / 60000);
          text += ` · kalan ~${min} dk`;
        }
        statusText.textContent = text;
        barFill.style.width = progress.total ? `${Math.round(100 * progress.done / progress.total)}%` : '0';
      } else {
        const last = meta.updatedAt ? `Son güncelleme: ${fmtAgo(meta.updatedAt)} (${fmtDate(meta.updatedAt)})` : 'Henüz güncelleme yapılmadı.';
        const recentText = progress && progress.text && progress.endedAt && (paused || err || Date.now() - progress.endedAt < 3600000);
        statusText.textContent = recentText ? `${progress.text} · ${fmtAgo(progress.endedAt)}` : last;
      }
      statusText.title = statusText.textContent;
    }

    // ------------------------------------------------ gizlenen dosyalar

    async function hideFile(r) {
      gizli = { ...gizli, [r.key]: { dosyaNo: r.dosyaNo, birimAdi: r.birimAdi, at: Date.now() } };
      await chrome.storage.local.set({ uhdGizli: gizli });
      render();
      setNotice(`${r.dosyaNo} ${cleanBirim(r.birimAdi)} aramalarda gösterilmeyecek.`, '', { label: 'Geri al', fn: () => unhideFile(r.key) });
    }

    async function unhideFile(key) {
      const next = { ...gizli };
      delete next[key];
      gizli = next;
      await chrome.storage.local.set({ uhdGizli: next });
      setNotice('');
      if (!settings.hidden) renderSettings();
      render();
    }

    // ------------------------------------------------ yedek

    async function exportBackup() {
      const data = await chrome.storage.local.get(BACKUP_KEYS);
      const version = (chrome.runtime && chrome.runtime.getManifest) ? chrome.runtime.getManifest().version : '';
      const body = JSON.stringify({ app: BACKUP_APP, format: BACKUP_FORMAT, version, exportedAt: new Date().toISOString(), data });
      const url = URL.createObjectURL(new Blob([body], { type: 'application/json' }));
      const a = el('a', { href: url, download: `legaluga-uyap-yedek-${todayIso()}.json` });
      document.body.append(a);
      a.click();
      a.remove();
      setTimeout(() => URL.revokeObjectURL(url), 10000);
    }

    async function importBackup(file) {
      try {
        const data = checkBackup(JSON.parse(await file.text()));
        const n = data.uhdIndex ? data.uhdIndex.records.length : 0;
        if (!confirm(`Yedek yüklenecek${n ? ` (${fmtNum(n)} dosya)` : ''}. Bu bilgisayardaki eklenti verilerinin yerini alır. Devam edilsin mi?`)) return;
        await chrome.storage.local.remove(BACKUP_KEYS);
        await chrome.storage.local.set(data);
        setNotice(`Yedek yüklendi${n ? `: ${fmtNum(n)} dosya` : ''}. Güncel bilgiler için bir kez Güncelle’ye basmanız önerilir.`);
      } catch (e) {
        setNotice(e instanceof SyntaxError ? 'Dosya okunamadı; yedek dosyası bozuk.' : e.message, 'err');
      }
    }

    // ------------------------------------------------ ayarlar ekranı

    function openSettings() {
      settings.hidden = false;
      list.hidden = true;
      filters.hidden = true;
      btnSettings.classList.add('on');
      renderSettings();
      settings.scrollTop = 0;
    }

    function closeSettings() {
      settings.hidden = true;
      list.hidden = false;
      btnSettings.classList.remove('on');
      render();
      input.focus();
    }

    function renderSettings() {
      const version = (chrome.runtime && chrome.runtime.getManifest) ? chrome.runtime.getManifest().version : '';
      const check = (key, def, label, hint, onChange) => {
        const box = el('input', { type: 'checkbox' });
        box.checked = !!pref(key, def);
        box.addEventListener('change', async () => { await setPref(key, box.checked); if (onChange) onChange(box.checked); });
        return el('label', { class: 'check' }, box, el('div', null, el('div', null, label), hint ? el('div', { class: 'hint' }, hint) : null));
      };
      const select = (key, def, label, options, onChange) => {
        const sel = el('select', null, options.map(([v, t]) => el('option', { value: v, selected: pref(key, def) === v }, t)));
        sel.addEventListener('change', async () => { await setPref(key, sel.value); if (onChange) onChange(sel.value); });
        return el('div', { class: 'field' }, el('span', null, label), sel);
      };

      // Vekil adları: etiket olarak eklenir, çarpıyla çıkarılır.
      const names = myNames();
      const tags = el('div', { class: 'tags' });
      if (!names.length && detected) tags.append(el('span', { class: 'tag auto', title: 'Dosyalarda en çok vekil olarak geçen ad' }, `${trTitle(detected)} (otomatik)`));
      for (const n of names) {
        const x = el('button', { title: 'Çıkar', 'aria-label': `${n} adını çıkar` }, '×');
        x.addEventListener('click', async () => { await setPref('myName', names.filter(v => v !== n).join(', ')); renderSettings(); render(); });
        tags.append(el('span', { class: 'tag' }, trTitle(n), x));
      }
      const nameIn = el('input', { type: 'text', placeholder: 'Ad Soyad', autocomplete: 'off', spellcheck: 'false' });
      const add = async () => {
        const v = nameIn.value.trim().replace(/^av\.?\s+/i, '');
        if (!v) return;
        // Otomatik bulunan ad da kalıcı etikete dönüşür; aynı ad iki kez eklenmez.
        const base = names.length ? names : (detected ? [detected] : []);
        await setPref('myName', (base.some(x => nameKey(x) === nameKey(v)) ? base : [...base, v]).join(', '));
        renderSettings();
        render();
      };
      const addBtn = el('button', { class: 'btn sm' }, 'Ekle');
      addBtn.addEventListener('click', add);
      nameIn.addEventListener('keydown', e => { if (e.key === 'Enter') { e.preventDefault(); add(); } });

      const btnFull = el('button', { class: 'btn sm', title: 'Dosya listesini ve tüm dosyaların taraf bilgilerini baştan alır. Uzun sürebilir.' }, 'Baştan tara');
      btnFull.addEventListener('click', () => {
        if (confirm('Tüm dosyaların taraf bilgileri UYAP’tan baştan alınacak. Dosya sayısına göre uzun sürebilir; durdurursanız kaldığı yerden sürdürebilirsiniz. Devam edilsin mi?')) {
          closeSettings(); setNotice(''); opts.onUpdate(true);
        }
      });
      btnFull.disabled = running();
      const btnExport = el('button', { class: 'btn sm', title: 'Tüm dosyaları taraflar, son evrak, sonraki duruşma ve notlarla Excel’de açılabilen dosya olarak indirir.' }, 'Excel’e aktar (CSV)');
      btnExport.addEventListener('click', () => {
        if (!records.length) return setNotice('Dışa aktarılacak dosya yok. Önce Güncelle’ye basın.', 'err');
        exportCsv();
      });
      const btnBackup = el('button', { class: 'btn sm', title: 'Dosya listesi, notlar, süre hatırlatmaları, duruşmalar ve ayarlar tek dosyaya yedeklenir.' }, 'Yedekle');
      btnBackup.addEventListener('click', exportBackup);
      const fileIn = el('input', { type: 'file', accept: '.json,application/json', hidden: true });
      fileIn.addEventListener('change', () => { if (fileIn.files[0]) importBackup(fileIn.files[0]); fileIn.value = ''; });
      const btnRestore = el('button', { class: 'btn sm', title: 'Başka bilgisayarda alınan yedeği yükler; yeniden tarama gerekmez.' }, 'Yedekten yükle');
      btnRestore.addEventListener('click', () => fileIn.click());
      const btnClear = el('button', { class: 'btn sm danger', title: 'Eklentinin bu bilgisayarda sakladığı her şeyi siler.' }, 'Tüm verileri sil');
      btnClear.disabled = running();
      btnClear.addEventListener('click', async () => {
        if (!confirm('Dosya listesi, duruşmalar, notlarınız, süre hatırlatmalarınız, gizlenen dosyalar, son açılanlar ve ayarlarınız bu bilgisayardan silinsin mi? Bu işlem geri alınamaz; UYAP’taki dosyalarınız etkilenmez.')) return;
        await chrome.storage.local.remove(['uhdIndex', 'uhdProgress', 'uhdRecent', 'uhdNotes', 'uhdPrefs', 'uhdPending', 'uhdEvrakGoruldu', 'uhdJob', 'uhdSureler', 'uhdDurusmalar', 'uhdGizli']);
        closeSettings();
        setNotice('Tüm yerel veriler silindi.');
      });

      const gz = Object.entries(gizli);
      const gzBox = el('div', null, gz.length ? gz.map(([k, g]) => {
        const b = el('button', { class: 'btn sm' }, 'Geri al');
        b.addEventListener('click', () => unhideFile(k));
        return el('div', { class: 'gz' }, el('span', { title: `${g.dosyaNo} ${g.birimAdi}` }, `${g.dosyaNo} · ${cleanBirim(g.birimAdi)}`), b);
      }) : el('div', { class: 'hint' }, 'Gizlenen dosya yok. Bir dosyayı kartındaki göz simgesiyle aramalardan çıkarabilirsiniz.'));

      const back = el('button', { class: 'btn sm' }, icon('back'), 'Geri');
      back.addEventListener('click', closeSettings);
      settings.replaceChildren(
        el('div', { class: 'top' }, el('b', null, 'Ayarlar'), back),

        el('h3', null, 'Müvekkil'),
        el('div', { class: 'box' },
          el('div', null, 'Müvekkil olarak gösterilecek vekil adları'),
          tags,
          el('div', { class: 'field' }, nameIn, addBtn),
          el('div', { class: 'hint' }, 'Bu adların vekil olduğu taraflar kartta “Müvekkil” olarak ayrı gösterilir. Hiç ad eklemezseniz dosyalarda en çok vekil olarak geçen ad kullanılır.')),

        el('h3', null, 'Arama ve görünüm'),
        el('div', { class: 'box' },
          check('vekilAra', true, 'Karşı taraf vekillerinin adlarında da ara', 'Kapatırsanız avukat adıyla yapılan aramalarda yalnız taraflar ve dosya bilgileri aranır.', () => render()),
          select('tema', 'auto', 'Tema', [['auto', 'Sistemle aynı'], ['light', 'Açık'], ['dark', 'Koyu']], () => applyTheme())),

        el('h3', null, 'Dosya açma'),
        el('div', { class: 'box' },
          select('acilisSekme', 'yok', 'Dosya açılınca geçilecek sekme', [['yok', 'Hiçbiri'], ['evrak', 'Evrak'], ['taraf', 'Taraf bilgileri']]),
          el('div', { class: 'hint' }, 'Sekme o dosyada yoksa (ör. Yargıtay dosyaları) hiçbir şeye basılmaz.'),
          check('popupKapat', true, 'Dosya açılınca eklenti penceresini kapat', 'Kapatırsanız araç çubuğundaki pencere açık kalır; arka arkaya dosyalara bakmak için. UYAP sekmesine geçildiğinde Chrome pencereyi yine kapatabilir.')),

        el('h3', null, 'Güncelleme'),
        el('div', { class: 'box' },
          check('evrakTakip', evrakTakipAcik(prefs, records), 'Yeni evrakları bul', 'Her açık dosya için UYAP’a bir istek daha gider; dosya sayısına göre güncelleme belirgin uzar.'),
          check('safahatTakip', false, 'Son işlemi (safahat) kartta göster', 'Güncellemede her açık dosyanın safahatı da alınır ve yalnız en yeni işlemin tarihi ve türü saklanır; güncelleme uzar.'),
          select('otoGuncelle', 'kapali', 'Otomatik güncelleme', [['kapali', 'Kapalı'], ['6s', '6 saatte bir'], ['gunluk', 'Günde bir']]),
          el('div', { class: 'hint' }, 'Otomatik güncelleme yalnız UYAP sekmesi açıkken, son güncellemenin üzerinden bu süre geçtiyse başlar.'),
          el('div', { class: 'row' }, btnFull, el('span', { class: 'hint' }, '“Güncelle” yalnız yeni dosyaların taraflarını alır; “Baştan tara” hepsini yeniden alır.'))),

        el('h3', null, 'UYAP'),
        el('div', { class: 'box' },
          check('duyuruGizle', false, 'Girişteki duyuru penceresini gizle', 'Önerilmez: kesinti ve bakım duyurularını kaçırabilirsiniz. KVKK onay penceresine hiçbir durumda dokunulmaz.')),

        el('h3', null, 'Veriler'),
        el('div', { class: 'box' },
          el('div', { class: 'row' }, btnExport, btnBackup, btnRestore, fileIn),
          el('div', { class: 'hint' }, 'Yedek dosyası müvekkil ve dosya bilgileri içerir; güvenli bir yerde saklayın.'),
          el('div', { style: 'margin-top:10px' }, `Gizlenen dosyalar (${fmtNum(gz.length)})`),
          gzBox,
          el('div', { class: 'row' }, btnClear)),

        el('h3', null, 'Hakkında'),
        el('div', { class: 'box' },
          el('div', null, el('b', null, BRAND.name), version ? ` · sürüm ${version}` : ''),
          el('div', { class: 'hint' }, 'Tüm veriler yalnız bu bilgisayarda saklanır ve hiçbir sunucuya gönderilmez. Notlar ve süre hatırlatmaları eklentiye aittir; UYAP’taki notlarla ilgisi yoktur.'),
          el('div', { class: 'hint' }, BRAND.disclaimer),
          el('div', { class: 'row' },
            el('a', { href: BRAND.site, target: '_blank', rel: 'noopener' }, 'legaluga.com'),
            el('a', { href: BRAND.site + '/gizlilik/uyap-asistani', target: '_blank', rel: 'noopener' }, 'Gizlilik politikası'),
            el('a', { href: 'https://github.com/hasanimer/legaluga-uyap-asistani', target: '_blank', rel: 'noopener' }, 'Kaynak kodu'))));
    }

    // ------------------------------------------------ olaylar

    // Büyük indekslerde her tuşta değil, yazmaya kısa bir ara verilince ara.
    let typeTimer;
    input.addEventListener('input', () => {
      sel = 0;
      editing = null;
      person = null;
      btnQClear.hidden = !input.value;
      if (!settings.hidden) closeSettings();
      clearTimeout(typeTimer);
      if (records.length > 3000) typeTimer = setTimeout(render, 90);
      else render();
    });
    // Arama kutusundayken ↑ ↓ ve Tab / Shift+Tab sonuçlar arasında gezinir, Enter seçili dosyayı açar.
    input.addEventListener('keydown', e => {
      const n = list.querySelectorAll('.item').length;
      if (e.key === 'ArrowDown' || (e.key === 'Tab' && !e.shiftKey && n)) { e.preventDefault(); select(sel + 1 >= n && e.key === 'Tab' ? 0 : sel + 1, true); }
      else if (e.key === 'ArrowUp' || (e.key === 'Tab' && e.shiftKey && n)) { e.preventDefault(); select(sel - 1 < 0 && e.key === 'Tab' ? n - 1 : sel - 1, true); }
      else if (e.key === 'Enter' && current[sel]) { e.preventDefault(); openRecord(current[sel]); }
      else if (e.key === 'Escape' && person) { e.preventDefault(); closePerson(); }
      else if (e.key === 'Escape' && input.value) { e.preventDefault(); input.value = ''; input.dispatchEvent(new Event('input')); }
      else if (e.key === 'Escape' && opts.onClose) { opts.onClose(); }
    });
    btnQClear.addEventListener('click', () => { input.value = ''; input.dispatchEvent(new Event('input')); input.focus(); });
    btnHelp.addEventListener('click', () => {
      setNotice('Aranan yerler: dosya no, mahkeme, dosya türü, taraf adları, karşı taraf vekilleri (Ayarlar’dan kapatılabilir) ve notlarınız. Türkçe karakter gerekmez. Birden çok kelime yazarsanız hepsi aranır; aynı yerde geçenler (ör. mahkeme adında) önce gelir.', '', { label: 'Tamam', fn: () => setNotice('') });
    });
    btnUpdate.addEventListener('click', () => { setNotice(''); opts.onUpdate(false); });
    btnStop.addEventListener('click', async () => {
      if (running()) return opts.onStop();
      // Yürüten sekme yok: duraklamış işi doğrudan iptal et (popup'ta açık UYAP sekmesi olmayabilir).
      await chrome.storage.local.remove('uhdJob');
      await chrome.storage.local.set({ uhdProgress: { running: false, text: 'Yarıda kalan güncelleme iptal edildi.', endedAt: Date.now() } });
    });
    btnSettings.addEventListener('click', () => (settings.hidden ? openSettings() : closeSettings()));

    chrome.storage.local.get(['uhdIndex', 'uhdProgress', 'uhdNotes', 'uhdRecent', 'uhdPrefs', 'uhdEvrakGoruldu', 'uhdJob', 'uhdSureler', 'uhdDurusmalar', 'uhdGizli']).then(v => {
      prefs = v.uhdPrefs || {};
      applyTheme();
      sureler = v.uhdSureler || {};
      durusmaMeta = v.uhdDurusmalar || null;
      gizli = v.uhdGizli || {};
      computeDurusma();
      computeSure();
      goruldu = v.uhdEvrakGoruldu || {};
      pendingJob = v.uhdJob || null;
      setIndex(v.uhdIndex);
      progress = v.uhdProgress || null;
      notes = v.uhdNotes || {};
      recent = v.uhdRecent || [];
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
      if (ch.uhdGizli) { gizli = ch.uhdGizli.newValue || {}; redraw = true; }
      if (ch.uhdSureler) { sureler = ch.uhdSureler.newValue || {}; computeSure(); renderFilters(); redraw = true; }
      if (ch.uhdDurusmalar) { durusmaMeta = ch.uhdDurusmalar.newValue || null; computeDurusma(); renderFilters(); redraw = true; }
      if (ch.uhdIndex) setIndex(ch.uhdIndex.newValue);
      else if (ch.uhdEvrakGoruldu) computeYeni();
      if (ch.uhdIndex || ch.uhdEvrakGoruldu) { renderFilters(); redraw = true; }
      if (ch.uhdNotes) { notes = ch.uhdNotes.newValue || {}; redraw = true; }
      if (ch.uhdRecent) recent = ch.uhdRecent.newValue || [];
      if (ch.uhdPrefs) { prefs = ch.uhdPrefs.newValue || {}; applyTheme(); redraw = true; }
      if (ch.uhdProgress) {
        progress = ch.uhdProgress.newValue || null;
        if (!records.length) redraw = true;   // ilk kullanım ekranındaki düğmenin durumu
      }
      if (redraw && !editing && !sureEdit && settings.hidden) render();
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
