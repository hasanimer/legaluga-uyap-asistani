// Arama arayüzü: hem eklenti popup'ında hem UYAP sayfasındaki yan panelde aynı kod kullanılır.
(() => {
  if (globalThis.UHD.mountUI) return;
  const { search, fmtNum, fmtDate, norm, detectMyName, myKeys, isClient, nameKey, BRAND, csvCell, csvDosyaNo, unseenEvrak, trDateTs, lastEvrak, personFiles, trTitle, cleanDurum, cleanBirim, evrakTakipAcik, BACKUP_APP, BACKUP_FORMAT, BACKUP_KEYS, checkBackup, todayIso, daysLeft, upcomingDurusmalar, durusmaIcs, evrakKey } = globalThis.UHD;
  const EVRAK_SHOW = 3;
  const LIMIT = 60;
  const RECENT_MAX = 10;
  const RUN_STALE_MS = 90000;
  const REMIND_DAYS = 7;
  const TARAF_V = 2;

  const CSS = `
.uhd{--navy:${BRAND.primary};--navy2:${BRAND.primaryDark};--deep:${BRAND.deep};--soft:${BRAND.soft};--bord:${BRAND.border};--focus:${BRAND.focus};
  --shadow:0 2px 8px #182b4010;--accent-text:#0b6663;
  --bg:#f5f7fb;--card:#fff;--text:#1d2939;--text2:#344054;--muted:#667085;--line:#e3e8f2;--line2:#cfd6e4;
  --green:#12805c;--green-bg:#e7f6ef;--grey:#98a2b3;--grey-bg:#eef0f3;--amber:#b54708;--amber-bg:#fef0c7;--red:#b42318;
  --note-bg:#fffbea;--note-bd:#f2c94c;--ev-bg:#f0f5ff;--ev-bd:#528bff;--ev-tx:#1849a9;--warn-bg:#fff4e5;--warn-tx:#7a4b00;
  --err-bg:#fdecea;--err-tx:#8a1f17;--mark:#ffe58a;
  font:13px/1.5 "Segoe UI",system-ui,-apple-system,Roboto,Arial,sans-serif;color:var(--text);background:var(--bg);
  display:flex;flex-direction:column;height:100%;min-height:0;box-sizing:border-box;color-scheme:light}
.uhd[data-theme=dark]{--soft:#173d39;--bord:#428d83;--shadow:0 2px 8px #0002;--accent-text:#8ae0d2;
  --bg:#0f1720;--card:#18222d;--text:#e6edf3;--text2:#c9d3de;--muted:#98a2b3;--line:#2a3644;--line2:#3a4756;
  --green:#4fd1a5;--green-bg:#0f2e25;--grey:#667085;--grey-bg:#25303c;--amber:#f5b04c;--amber-bg:#33260f;--red:#f97066;
  --note-bg:#2b2716;--note-bd:#b38f1f;--ev-bg:#16233a;--ev-bd:#528bff;--ev-tx:#9ec1ff;--warn-bg:#33270f;--warn-tx:#f5c26b;
  --err-bg:#3a1714;--err-tx:#f7a8a1;--mark:#6b5a12;color-scheme:dark}
.uhd[data-theme=dark] :is(.onboard b,.ib:hover,.ib.on,.pmore,.pname:hover,.lnk:hover,.rolein,.dayhead,.durrow .t,.tag){color:#7fd6cc}
.uhd *{box-sizing:border-box}
.uhd [hidden]{display:none!important}
.uhd :focus-visible{outline:2px solid var(--focus);outline-offset:2px}
.uhd button{font:inherit;color:inherit}
.uhd svg{width:16px;height:16px;fill:none;stroke:currentColor;stroke-width:2;stroke-linecap:round;stroke-linejoin:round;flex:none}
.uhd header{display:flex;flex-shrink:0;align-items:center;gap:8px;padding:10px 16px;background:var(--card);color:var(--text)}
.uhd header strong{font-size:14px;font-weight:700;flex:1;min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;letter-spacing:-.2px}
.uhd .brand-mark{display:block;width:30px;height:30px;flex:none;fill:none;stroke:none}
.uhd .settings-toggle{flex:none}
.uhd .settings-toggle.on{background:var(--soft);color:var(--accent-text);border-color:var(--bord)}
.uhd .x{background:none;border:0;color:var(--muted);font-size:22px;line-height:1;cursor:pointer;width:32px;height:32px;border-radius:8px}
.uhd .x:hover{background:var(--grey-bg)}
.uhd .search{position:relative;padding:0 14px 10px;background:var(--card)}
.uhd .q{width:100%;border:1px solid var(--line2);border-radius:10px;padding:10px 72px 10px 13px;font:inherit;font-size:14px;outline:none;background:var(--bg);color:var(--text);transition:border-color .15s,box-shadow .15s}
.uhd .q::-webkit-search-cancel-button{display:none}
.uhd .q:focus{border-color:var(--focus);box-shadow:0 0 0 3px var(--soft)}
.uhd .q::placeholder{color:var(--muted);opacity:1}
.uhd .sbtn{position:absolute;top:5px;width:32px;height:32px;border:0;background:none;border-radius:6px;color:var(--muted);cursor:pointer;display:flex;align-items:center;justify-content:center}
.uhd .sbtn:hover{background:var(--grey-bg);color:var(--text)}
.uhd .sbtn.clear{right:52px}
.uhd .sbtn.help{right:18px}
.uhd .views{display:flex;gap:4px;padding:0 14px 8px;background:var(--card);border-bottom:1px solid var(--line)}
.uhd .view{flex:1;display:flex;align-items:center;justify-content:center;gap:6px;min-height:36px;padding:6px;border:0;border-radius:8px;color:var(--muted);background:none;font-weight:600;cursor:pointer;font-size:12px}
.uhd .view:hover{background:var(--bg);color:var(--text)}
.uhd .view.on{background:var(--soft);color:var(--accent-text)}
.uhd .view small{font-size:10px;padding:0 5px;border-radius:5px;background:var(--bg);color:var(--muted)}
.uhd .filters{display:flex;flex-direction:column;gap:8px;padding:8px 14px 0}
.uhd .filter-top{display:flex;gap:8px;align-items:center;justify-content:space-between}
.uhd .filter-summary{color:var(--muted);font-size:11px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;flex:1}
.uhd .filter-body{display:flex;flex-direction:column;gap:8px;padding:10px;background:var(--card);border:1px solid var(--line);border-radius:10px}
.uhd .frow{display:flex;flex-wrap:wrap;gap:5px;align-items:center}
.uhd .frow .lbl{font-size:11px;color:var(--muted);margin-right:2px}
.uhd .chip{border:1px solid var(--line2);background:var(--card);color:var(--text2);border-radius:7px;min-height:30px;padding:4px 10px;font-size:12px;cursor:pointer}
.uhd .chip:hover{border-color:var(--focus)}
.uhd .chip.on{background:var(--navy);border-color:var(--navy);color:#fff}
.uhd .chip.client.on{background:var(--deep);border-color:var(--deep)}
.uhd .chip.new{border-color:var(--ev-bd);color:var(--ev-tx)}
.uhd .chip.new.on{background:#1849a9;border-color:#1849a9;color:#fff}
.uhd .chip.dur.on{background:var(--text2);border-color:var(--text2);color:var(--card)}
.uhd .sep{width:1px;height:16px;background:var(--line2);margin:0 2px}
.uhd .notice{margin:8px 10px 0;padding:8px 10px;border-radius:8px;background:var(--warn-bg);color:var(--warn-tx);font-size:12px;display:flex;gap:8px;align-items:center}
.uhd .notice.err{background:var(--err-bg);color:var(--err-tx)}
.uhd .notice>span{flex:1;min-width:0;overflow-wrap:anywhere}
.uhd .notice button{flex:none;border:1px solid currentColor;background:none;color:inherit;border-radius:6px;min-height:30px;padding:3px 8px;cursor:pointer}
.uhd .notice .dismiss{border:0;font-size:18px;padding:0 6px}
.uhd .results{flex:1;min-height:0;overflow:auto;overscroll-behavior:contain;scrollbar-width:thin;padding:10px 12px}
.uhd .empty{padding:32px 16px;text-align:center;color:var(--muted)}
.uhd .empty .btn{margin-top:10px}
.uhd .more{padding:6px 10px 10px;text-align:center;font-size:12px;color:var(--muted)}
.uhd .section{display:flex;justify-content:space-between;align-items:center;gap:8px;padding:0 2px 10px;font-size:12px;color:var(--muted)}
.uhd .section b{font-weight:600;color:var(--text2)}
.uhd .sort{max-width:180px;min-height:30px;padding:4px 6px;border:1px solid var(--line);border-radius:7px;font:inherit;font-size:11px;color:var(--text2);background:var(--card)}
.uhd .sr-only{position:absolute;width:1px;height:1px;padding:0;margin:-1px;overflow:hidden;clip:rect(0,0,0,0);white-space:nowrap;border:0}
.uhd .empty strong{display:block;color:var(--text);font-size:15px;margin-bottom:6px}
.uhd .empty p{margin:4px 0 12px}
.uhd .quick-actions{display:flex;justify-content:center;gap:8px;flex-wrap:wrap}
.uhd .load-more{width:100%;justify-content:center;margin:6px 0}
.uhd .onboard{margin:14px 6px;padding:16px 18px;background:var(--card);border:1px solid var(--line);border-radius:12px}
.uhd .onboard b{display:block;font-size:14px;color:var(--navy);margin-bottom:6px}
.uhd .onboard ol{margin:0 0 14px;padding-left:20px;color:var(--text2)}
.uhd .onboard li{margin:4px 0}
.uhd .btn{display:inline-flex;align-items:center;gap:6px;border:1px solid var(--line2);background:var(--card);color:var(--text);border-radius:8px;padding:6px 11px;cursor:pointer;white-space:nowrap}
.uhd .btn:hover{border-color:var(--focus)}
.uhd .btn.primary{background:var(--navy);border-color:var(--navy);color:#fff;font-weight:600}
.uhd .btn.primary:hover{background:var(--navy2)}
.uhd .btn.danger{border-color:#e5b3ae;color:var(--red)}
.uhd .btn.sm{padding:5px 9px;min-height:30px;font-size:12px;border-radius:7px}
.uhd .ib{width:32px;height:32px;border:0;background:none;border-radius:8px;color:var(--muted);cursor:pointer;display:inline-flex;align-items:center;justify-content:center;flex:none}
.uhd .ib:hover{background:var(--soft);color:var(--navy)}
.uhd .ib.on{color:var(--navy)}
.uhd .ib.done{color:var(--green)}
.uhd .item{background:var(--card);border:1px solid var(--line);border-left:3px solid var(--st,var(--green));border-radius:12px;padding:11px 10px 10px 12px;margin-bottom:9px;cursor:pointer;box-shadow:var(--shadow)}
.uhd .item.closed{--st:var(--grey)}
.uhd .item.karar{--st:var(--amber)}
.uhd .item:hover{border-color:var(--bord);border-left-color:var(--st,var(--green))}
.uhd .item.sel{border-color:var(--focus);border-left-color:var(--st,var(--green));box-shadow:0 0 0 1px var(--focus)}
.uhd .ihead{display:flex;align-items:flex-start;gap:6px}
.uhd .ititle{flex:1;min-width:0;padding-top:2px;font-size:13px;font-weight:600;color:var(--text);line-height:1.45;overflow-wrap:anywhere}
.uhd .file-number{display:block;font-size:17px;font-weight:750;letter-spacing:-.3px;color:var(--accent-text);margin-bottom:3px}
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
.uhd .evrak-more{border:0;background:none;padding:2px 0;color:var(--ev-tx);font-size:12px;font-weight:600;text-decoration:underline;text-underline-offset:2px;cursor:pointer}
.uhd .lnk{border:1px solid var(--line2);background:var(--card);color:var(--text2);border-radius:5px;padding:3px 7px;min-height:26px;font-size:11px;cursor:pointer;margin-left:4px;vertical-align:1px}
.uhd .lnk:hover{border-color:var(--focus);color:var(--navy)}
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
.uhd .settings .top{position:sticky;top:-10px;background:var(--bg);z-index:1;padding:10px 0}
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
.uhd footer{display:flex;flex-shrink:0;gap:6px;padding:8px 10px;background:var(--card);align-items:center;border-top:1px solid var(--line)}
.uhd footer .stx{flex:1;min-width:0;font-size:12px;color:var(--muted);overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.uhd footer .stx.err{color:var(--red)}
.uhd button:disabled{opacity:.5;cursor:default}
.uhd :is(.client,.parties,.durrow .info){overflow-wrap:anywhere;min-width:0}
.uhd a{color:var(--accent-text)}
.uhd :is(input,select,textarea):focus-visible{outline:2px solid var(--focus);outline-offset:2px}
.uhd button,.uhd input,.uhd select,.uhd textarea{-webkit-tap-highlight-color:transparent}
@media(prefers-reduced-motion:reduce){.uhd *{transition:none!important;scroll-behavior:auto!important}}
@media(max-width:390px){.uhd .results{padding:8px}.uhd .view{font-size:11px}.uhd .icons{gap:0}.uhd .ib{width:28px}}
`;

  // Basit çizgi simgeleri (24×24, stroke).
  const ICONS = {
    copy: '<rect x="9" y="9" width="12" height="12" rx="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/>',
    note: '<path d="M12 20h9"/><path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4Z"/>',
    hide: '<path d="M3 3l18 18"/><path d="M10.6 10.6a2 2 0 0 0 2.8 2.8"/><path d="M9.9 4.2A10 10 0 0 1 12 4c7 0 10 8 10 8a17 17 0 0 1-3.2 4.3"/><path d="M6.6 6.6C3.8 8.4 2 12 2 12s3 8 10 8a9.7 9.7 0 0 0 5.4-1.6"/>',
    eye: '<path d="M2 12s3-8 10-8 10 8 10 8-3 8-10 8S2 12 2 12Z"/><circle cx="12" cy="12" r="3"/>',
    down: '<path d="M6 9l6 6 6-6"/>',
    up: '<path d="M18 15l-6-6-6 6"/>',
    sync: '<path d="M21 12a9 9 0 1 1-2.6-6.4"/><path d="M21 3v6h-6"/>',
    gear: '<path d="M4 21v-7M4 10V3M12 21v-9M12 8V3M20 21v-5M20 12V3M1 14h6M9 8h6M17 16h6"/>',
    stop: '<rect x="6" y="6" width="12" height="12" rx="1"/>',
    x: '<path d="M18 6 6 18M6 6l12 12"/>',
    help: '<circle cx="12" cy="12" r="9"/><path d="M9.1 9a3 3 0 0 1 5.8 1c0 2-3 3-3 3"/><path d="M12 17h.01"/>',
    theme: '<path d="M21 12.8A9 9 0 0 1 11.2 3 9 9 0 1 0 21 12.8Z"/>',
    filter: '<path d="M4 7h16M7 12h10M10 17h4"/>',
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

  // Mağaza görsellerindeki Legaluga logosunun özgün SVG'si (magaza/gorsel/logo.svg).
  function brandLogo() {
    const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    svg.setAttribute('class', 'brand-mark');
    svg.setAttribute('viewBox', '0 0 32 32');
    svg.setAttribute('aria-hidden', 'true');
    svg.innerHTML = `<rect width="32" height="32" rx="7" fill="#171717"/>
      <g fill="none" stroke="#ffffff" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round">
        <path d="M10 8v14h12"/><path d="M10 15l8.5-4.8"/>
      </g>
      <g fill="#ffffff">
        <circle cx="10" cy="8" r="2.5"/><circle cx="18.5" cy="10.2" r="2.5"/><circle cx="22" cy="22" r="2.5"/>
      </g>`;
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
    const views = el('nav', { class: 'views', 'aria-label': 'Görünümler' });
    const live = el('div', { class: 'sr-only', role: 'status', 'aria-live': 'polite', 'aria-atomic': 'true' });
    const btnTheme = el('button', { class: 'ib', title: 'Temayı değiştir', 'aria-label': 'Temayı değiştir' }, icon('theme'));
    const filters = el('div', { class: 'filters' });
    const notice = el('div', { class: 'notice', hidden: true, role: 'status', 'aria-live': 'polite' });
    const list = el('div', { class: 'results', role: 'region', 'aria-label': 'Dosya sonuçları' });
    const settings = el('div', { class: 'settings', hidden: true });
    const barFill = el('i');
    const bar = el('div', { class: 'bar', hidden: true, role: 'progressbar', 'aria-label': 'Dosya güncelleme', 'aria-valuemin': '0', 'aria-valuemax': '100' }, barFill);
    const status = el('div', { class: 'status', hidden: true }, bar);
    const statusText = el('div', { class: 'stx' });
    const btnUpdate = el('button', { class: 'btn sm primary' }, icon('sync'), el('span', null, 'Güncelle'));
    const btnStop = el('button', { class: 'btn sm danger', hidden: true }, icon('stop'), el('span', null, 'Durdur'));
    const btnSettings = el('button', { class: 'btn sm settings-toggle', title: 'Ayarlar', 'aria-label': 'Ayarlar', 'aria-expanded': 'false' }, icon('gear'), 'Ayarlar');
    const root = el('div', { class: 'uhd ' + (opts.mode || '') },
      el('header', null, brandLogo(), el('strong', { title: BRAND.name }, BRAND.name), btnTheme, btnSettings,
        opts.onClose ? el('button', { class: 'x', title: 'Kapat', 'aria-label': 'Paneli kapat', onclick: opts.onClose }, '×') : null),
      el('div', { class: 'search' }, input, btnQClear, btnHelp),
      views, filters, notice, list, settings, live, status,
      el('footer', null, statusText, btnStop, btnUpdate));
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
    let filtersExpanded = false;
    let hearingRange = 'week';
    let shownLimit = LIMIT;
    let loaded = false;
    let prefsRevision = 0;
    const dismissedNotices = new Set();
    let durusmaMeta = null;    // uhdDurusmalar: { at, gun, list }
    let durusmaByKey = new Map(); // kayıt key → yaklaşan duruşmalar (sıralı)
    let yeniMap = new Map();   // kayıt key → en yeni görülmemiş evrakın onay zamanı
    let yeniCount = 0;         // görülmemiş yeni evrak sayısı
    let evrakTracked = false;  // en az bir dosyanın evrakları tarandı mı
    const filter = { durum: 'all', tur: 'all', onlyClient: false, onlyNew: false, onlyDurusma: false };

    // Tema: ayar "auto" ise sistemin açık/koyu tercihine uyar.
    const darkMq = window.matchMedia ? window.matchMedia('(prefers-color-scheme: dark)') : null;
    function applyTheme() {
      const t = prefs.tema || 'auto';
      root.dataset.theme = t === 'auto' ? (darkMq && darkMq.matches ? 'dark' : 'light') : t;
      const label = root.dataset.theme === 'dark' ? 'Açık temaya geç' : 'Koyu temaya geç';
      btnTheme.title = label;
      btnTheme.setAttribute('aria-label', label);
    }
    if (darkMq && darkMq.addEventListener) darkMq.addEventListener('change', applyTheme);
    applyTheme();

    const pref = (k, d) => (prefs[k] === undefined ? d : prefs[k]);
    async function setPref(k, v) {
      const { uhdPrefs } = await chrome.storage.local.get('uhdPrefs');
      prefs = { ...(uhdPrefs || {}), [k]: v };
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
    }

    // ------------------------------------------------ bildirim

    function showNotice(text, kind, action, noticeKey) {
      notice.replaceChildren();
      if (!text || (noticeKey && dismissedNotices.has(noticeKey))) { notice.hidden = true; return; }
      notice.className = 'notice' + (kind === 'err' ? ' err' : '');
      notice.append(el('span', null, text));
      if (action) notice.append(el('button', { onclick: action.fn }, action.label));
      const dismiss = el('button', { class: 'dismiss', title: 'Bildirimi kapat', 'aria-label': 'Bildirimi kapat' }, '×');
      dismiss.addEventListener('click', () => {
        if (noticeKey) dismissedNotices.add(noticeKey);
        manualNotice = false;
        notice.hidden = true;
        input.focus();
      });
      notice.append(dismiss);
      notice.hidden = false;
    }

    function setNotice(text, kind, action) {
      manualNotice = !!text;
      if (text) showNotice(text, kind, action);
      else autoNotice();
    }

    function autoNotice() {
      if (manualNotice) return;
      if (filter.onlyDurusma || filter.onlyNew || person || !settings.hidden) return showNotice('');
      const yakinDur = upcomingDurusmalar(durusmaMeta && durusmaMeta.list).filter(d => daysLeft(d.tarih) <= 1);
      if (pref('durusmaBildirim', true) && records.length && yakinDur.length && !filter.onlyDurusma) {
        const bugun = yakinDur.filter(d => daysLeft(d.tarih) === 0);
        const ilk = (bugun[0] || yakinDur[0]);
        const text = bugun.length
          ? `Bugün ${bugun.length} duruşmanız var; ilki ${ilk.saat}, ${ilk.dosyaNo} ${ilk.birimAdi}.`
          : `Yarın ${yakinDur.length} duruşmanız var; ilki ${ilk.saat}, ${ilk.dosyaNo} ${ilk.birimAdi}.`;
        return showNotice(text, '', { label: 'Göster', fn: () => showDurusmalar() }, 'hearings:' + todayIso());
      }
      const update = { label: 'Güncelle', fn: () => { setNotice(''); opts.onUpdate(false); } };
      if (!records.length || running()) return showNotice('');
      const oldParties = records.filter(r => r.taraflar && r.tarafV !== TARAF_V).length;
      if (oldParties) return showNotice(`Müvekkil ve vekil bilgisi için bir kez Güncelle’ye basın (${fmtNum(oldParties)} dosyanın tarafları yenilenecek).`, '', update, 'parties:' + oldParties);
      const days = meta.updatedAt ? Math.floor((Date.now() - meta.updatedAt) / 86400000) : 0;
      if (days >= REMIND_DAYS) return showNotice(`Son güncelleme ${days} gün önce yapıldı. Yeni dosyalar için güncellemeniz önerilir.`, '', update, 'update:' + meta.updatedAt);
      if (yeniMap.size && !filter.onlyNew) {
        return showNotice(`${fmtNum(yeniMap.size)} dosyada ${fmtNum(yeniCount)} yeni evrak var.`, '', {
          label: 'Göster', fn: () => switchView('new')
        }, 'new:' + yeniCount);
      }
      showNotice('');
    }

    // ------------------------------------------------ filtreler

    const CHIPS = [
      { group: 'durum', v: 'acik', label: 'Açık' },
      { group: 'durum', v: 'kapali', label: 'Kapalı' },
      { group: 'tur', v: '0', label: 'Ceza' },
      { group: 'tur', v: '1', label: 'Hukuk' },
      { group: 'tur', v: '2', label: 'İcra' },
      { group: 'tur', v: 'other', label: 'Diğer', title: 'İdari Yargı, Satış Memurluğu, Arabuluculuk, Tazminat Komisyonu' },
      { group: 'onlyClient', v: true, label: 'Yalnız müvekkillerim', title: 'Yalnızca müvekkil adlarında ara', cls: 'client' }
    ];
    const viewName = () => filter.onlyDurusma ? 'hearings' : filter.onlyNew ? 'new' : 'files';
    function clearFilters() {
      filter.durum = 'all'; filter.tur = 'all'; filter.onlyClient = false;
      shownLimit = LIMIT;
    }
    function switchView(name) {
      person = null;
      editing = null;
      filter.onlyDurusma = name === 'hearings';
      filter.onlyNew = name === 'new';
      sel = 0; shownLimit = LIMIT;
      input.value = '';
      btnQClear.hidden = true;
      if (!settings.hidden) closeSettings();
      renderFilters(); render(); autoNotice();
      list.scrollTop = 0;
    }
    function renderViews() {
      views.replaceChildren();
      const active = viewName();
      for (const [name, title, total] of [
        ['files', 'Dosyalar', records.length],
        ['hearings', 'Duruşmalar', upcomingDurusmalar(durusmaMeta && durusmaMeta.list).length],
        ['new', 'Yeni evrak', yeniMap.size]
      ]) {
        const b = el('button', { class: 'view' + (name === active ? ' on' : ''), 'aria-pressed': String(name === active), 'data-view': name },
          title, total ? el('small', { 'aria-label': fmtNum(total) + ' kayıt' }, fmtNum(total)) : null);
        b.addEventListener('click', () => {
          switchView(name);
          views.querySelector(`[data-view="${name}"]`).focus();
        });
        views.append(b);
      }
      input.placeholder = active === 'hearings' ? 'Duruşmalarda kişi, dosya veya mahkeme ara' : 'Ad, dosya no, mahkeme veya not ara';
      input.setAttribute('aria-label', active === 'hearings' ? 'Duruşmalarda ara' : 'Dosyalarda ara');
    }
    function renderFilters() {
      renderViews();
      filters.replaceChildren();
      if (filter.onlyDurusma) return;
      const active = CHIPS.filter(c => filter[c.group] === c.v);
      const toggle = el('button', { class: 'btn sm', 'aria-expanded': String(filtersExpanded) }, icon('filter'), active.length ? `Filtreler · ${active.length}` : 'Filtreler');
      toggle.addEventListener('click', () => {
        filtersExpanded = !filtersExpanded; renderFilters(); filters.querySelector('button').focus();
      });
      const top = el('div', { class: 'filter-top' }, toggle,
        el('span', { class: 'filter-summary', title: active.map(c => c.label).join(' · ') }, active.length ? active.map(c => c.label).join(' · ') : 'Tüm dosya türleri'));
      if (active.length) {
        const reset = el('button', { class: 'btn sm', title: 'Dosya filtrelerini temizle' }, 'Temizle');
        reset.addEventListener('click', () => { clearFilters(); sel = 0; renderFilters(); render(); filters.querySelector('button').focus(); });
        top.append(reset);
      }
      filters.append(top);
      if (!filtersExpanded) return;
      const body = el('div', { class: 'filter-body' });
      for (const [group, label] of [['durum', 'Durum'], ['tur', 'Yargı'], ['onlyClient', 'Taraf']]) {
        const row = el('div', { class: 'frow', role: 'group', 'aria-label': label }, el('span', { class: 'lbl' }, label));
        for (const c of CHIPS.filter(c => c.group === group)) {
          const on = filter[c.group] === c.v;
          const b = el('button', { class: 'chip' + (on ? ' on' : ''), 'aria-pressed': String(on), 'data-filter': c.group + ':' + c.v, title: c.title || null }, c.label);
          b.addEventListener('click', () => {
            if (c.group === 'onlyClient' && !on && !myKeys(myName()).length) {
              return setNotice('Müvekkilleri ayırmak için Ayarlar’dan vekil adınızı ekleyin.', '', { label: 'Ayarlar', fn: openSettings });
            }
            filter[c.group] = on ? (c.group === 'onlyClient' ? false : 'all') : c.v;
            sel = 0; shownLimit = LIMIT;
            renderFilters(); render(); list.scrollTop = 0;
            filters.querySelector(`[data-filter="${c.group}:${c.v}"]`).focus();
          });
          row.append(b);
        }
        body.append(row);
      }
      filters.append(body);
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
      const ta = el('textarea', { class: 'note-ta', rows: '1', placeholder: 'Bu dosyaya not yazın (yalnız bu bilgisayarda saklanır)…', 'aria-label': `${r.dosyaNo} kişisel notu`, title: 'Kişisel not · Enter: kaydet · Shift+Enter: yeni satır · Esc: vazgeç', spellcheck: 'true' });
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
      setTimeout(() => { fit(); if (editing === r.key) ta.focus(); }, 0);
      return ta;
    }

    // Evrak "2024/555(Talimat Dosyası)" gibi bağlı bir dosyadansa hangi dosya olduğu gösterilir.
    function evrakDosya(r, g) {
      if (!g || g.startsWith(r.dosyaNo + '(')) return '';
      const m = /^(.+?)\((.+)\)$/.exec(g);
      return m ? `${m[2]} ${m[1]}` : g;
    }

    const expandedEvrak = new Set();

    function evrakBlock(r, toks) {
      const u = unseenEvrak(r, goruldu);
      if (!u.length) return null;
      const seenBtn = el('button', { class: 'btn sm', title: 'Bu dosyadaki yeni evrakları görüldü olarak işaretle' }, icon('check'), 'Görüldü');
      seenBtn.addEventListener('click', e => { e.stopPropagation(); markSeen([r.key]); });
      const makeLine = y => {
        // UYAP listeyi onay tarihine göre sıralar; sisteme gönderim tarihi farklıysa o da yazılır.
        const tarih = y.gonderim && y.gonderim !== y.onay ? `Onay ${y.onay} (sisteme gönderim ${y.gonderim})` : `Onay ${y.onay}`;
        const alt = [y.gonderen, evrakDosya(r, y.dosya), y.aciklama].filter(Boolean).join(' · ');
        return el('li', { title: [y.tur, tarih, y.gonderen, evrakDosya(r, y.dosya), y.aciklama].filter(Boolean).join('\n') },
          el('b', null, y.tur || 'Evrak'), ' · ', tarih,
          ' ', evrakOpenBtn(r, y.k, y.dosya),
          alt ? el('div', null, el('small', null, highlight(alt, toks))) : null);
      };
      const lines = u.slice(0, EVRAK_SHOW).map(makeLine);
      let isExpanded = expandedEvrak.has(r.key);
      let extraLines = isExpanded ? u.slice(EVRAK_SHOW).map(makeLine) : [];
      const moreText = () => isExpanded ? 'Daha az göster' : `+${u.length - EVRAK_SHOW} evrak daha · Tümünü göster`;
      let moreRow = null;
      if (u.length > EVRAK_SHOW) {
        const more = el('button', { class: 'evrak-more', 'aria-expanded': String(isExpanded) }, moreText());
        moreRow = el('li', null, more);
        more.addEventListener('click', e => {
          e.stopPropagation();
          isExpanded = !isExpanded;
          if (isExpanded) {
            expandedEvrak.add(r.key);
            extraLines = u.slice(EVRAK_SHOW).map(makeLine);
            moreRow.before(...extraLines);
          } else {
            expandedEvrak.delete(r.key);
            extraLines.forEach(line => line.remove());
            extraLines = [];
          }
          more.setAttribute('aria-expanded', String(isExpanded));
          more.textContent = moreText();
        });
      }
      return el('div', { class: 'evrak', onclick: e => e.stopPropagation() },
        el('div', { class: 'head' }, el('span', null, `${u.length} yeni evrak`), seenBtn),
        el('ul', null, lines, extraLines, moreRow));
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
        s.k ? [' ', evrakOpenBtn(r, s.k, s.dosya)] : null);
    }

    // ------------------------------------------------ evrak açma ve duruşmalar

    function evrakOpenBtn(r, k, dosya) {
      if (!k || !opts.onOpenEvrak) return null;
      const b = el('button', { class: 'lnk', title: 'Evrakı UYAP’tan getirip göster (evrak saklanmaz)' }, 'Aç');
      b.addEventListener('click', e => { e.stopPropagation(); opts.onOpenEvrak(r, k, dosya); });
      return b;
    }

    function computeDurusma() {
      durusmaByKey = new Map();
      for (const d of upcomingDurusmalar(durusmaMeta && durusmaMeta.list)) {
        if (!durusmaByKey.has(d.key)) durusmaByKey.set(d.key, []);
        durusmaByKey.get(d.key).push(d);
      }
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
      hearingRange = 'week';
      switchView('hearings');
      input.focus();
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
      const ranged = all.filter(d => hearingRange === 'all' || daysLeft(d.tarih) < (hearingRange === 'today' ? 1 : 7));
      const rows = toks.length
        ? ranged.filter(d => { const h = norm([d.dosyaNo, d.birimAdi, d.islem, ...(d.taraflar || []).map(t => t.ad)].join(' ')); return toks.every(t => h.includes(t)); })
        : ranged;
      const ranges = el('div', { class: 'frow', role: 'group', 'aria-label': 'Duruşma tarih aralığı' });
      for (const [value, label] of [['today', 'Bugün'], ['week', 'Önümüzdeki 7 gün'], ['all', 'Tümü']]) {
        const b = el('button', { class: 'chip' + (hearingRange === value ? ' on' : ''), 'aria-pressed': String(hearingRange === value), 'data-range': value }, label);
        b.addEventListener('click', () => { hearingRange = value; sel = 0; render(); list.querySelector(`[data-range="${value}"]`).focus(); });
        ranges.append(b);
      }
      const ics = el('button', { class: 'btn sm', title: 'Listelenen duruşmaları takvim dosyası (.ics) olarak indir; Outlook, Google Takvim ve telefon takvimleri açar. Taraf adları yazılmaz.' }, 'Takvime aktar (.ics)');
      ics.addEventListener('click', () => exportIcs(rows));
      const src = durusmaMeta && durusmaMeta.at ? `UYAP’tan ${fmtAgo(durusmaMeta.at)} alındı; sonraki ${durusmaMeta.gun || 60} gün.` : '';
      const head = el('div', { class: 'durhead' },
        ranges,
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
              el('div', { class: 'parties' }, (d.taraflar || []).map(t => `${t.sifat ? trTitle(t.sifat) + ': ' : ''}${trTitle(t.ad)}`).join(' · ')),
              el('div', { class: 'meta' }, 'Bu dosya indekste yok; açmak için Güncelle’ye basın.'))));
        }
      }
      if (!rows.length) {
        const showAll = el('button', { class: 'btn sm' }, 'Tüm tarihleri göster');
        showAll.addEventListener('click', () => { hearingRange = 'all'; render(); });
        out.push(el('div', { class: 'empty' }, el('strong', null, durusmaMeta ? 'Bu aralıkta duruşma yok' : 'Duruşmalar henüz alınmadı'),
          el('p', null, toks.length ? 'Başka bir isim deneyin veya tarih aralığını genişletin.' : durusmaMeta ? 'Yeni bilgiler için dosyalarınızı güncelleyebilirsiniz.' : 'Güncelle’ye bastığınızda duruşmalarınız burada görünür.'),
          hearingRange !== 'all' && all.length ? showAll : null));
      }
      list.append(...out);
      live.textContent = `${fmtNum(rows.length)} duruşma listelendi.`;
      if (sel >= current.length) sel = 0;
    }

    const GUNLER = ['Pazar', 'Pazartesi', 'Salı', 'Çarşamba', 'Perşembe', 'Cuma', 'Cumartesi'];
    function fmtIso(iso, withDay) {
      const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(iso || '');
      if (!m) return '';
      const s = `${m[3]}.${m[2]}.${m[1]}`;
      return withDay ? `${s} ${GUNLER[new Date(Date.UTC(+m[1], +m[2] - 1, +m[3])).getUTCDay()]}` : s;
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
        ib('hide', 'Bu dosyayı aramalarda gösterme (Ayarlar’dan geri alınır)', () => hideFile(r)));
      const isOpen = expanded.has(r.key);
      const detBtn = el('button', { class: 'btn sm', 'aria-expanded': String(isOpen), title: 'Durum, dosya türü, açılış tarihi ve son evrak' }, icon(isOpen ? 'up' : 'down'), 'Detay');
      detBtn.addEventListener('click', e => {
        e.stopPropagation();
        if (isOpen) expanded.delete(r.key); else expanded.add(r.key);
        render();
        list.querySelectorAll('.item')[i]?.querySelector('.ifoot button')?.focus();
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
      const row = el('article', { class: 'item' + (st.cls ? ' ' + st.cls : '') + (i === sel ? ' sel' : ''), 'aria-label': `${r.dosyaNo} ${cleanBirim(r.birimAdi)}` },
        el('div', { class: 'ihead' },
          el('div', { class: 'ititle' },
            el('span', { class: 'file-number' }, highlight(r.dosyaNo, toks)), highlight(cleanBirim(r.birimAdi), toks),
            el('span', { class: 'pill st ' + st.cls, title: st.tarih ? `${st.label} · ${st.tarih}` : st.label }, st.label),
            yeniMap.has(r.key) ? el('span', { class: 'pill new' }, 'Yeni Evrak') : null),
          icons),
        el('div', { class: 'hr' }),
        durLine(r),
        islemLine(r),
        extra || null,
        partyLines(r, toks, keys),
        !filter.onlyDurusma || isOpen ? evrakBlock(r, toks) : null,
        noteBlock(r),
        det,
        el('div', { class: 'ifoot' }, detBtn, open));
      row.addEventListener('click', e => {
        if (e.target.closest('button, a, input, textarea, select') || String(window.getSelection && window.getSelection()).trim()) return;
        openRecord(r);
      });
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
      btnQClear.hidden = !input.value;
      views.hidden = !loaded || (!records.length && !durusmaMeta) || !!person || !settings.hidden;
      filters.hidden = !records.length || !!person || !settings.hidden || filter.onlyDurusma;
      if (!loaded) {
        list.append(el('div', { class: 'empty', role: 'status' }, 'Dosyalarınız hazırlanıyor…'));
        return;
      }
      if (person) return renderPerson();
      if (filter.onlyDurusma) return renderDurusmalar();
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
      const keys = myKeys(myName());
      const q = input.value;
      const res = search(records, q, { myName: myName(), notes, filter, yeni: yeniMap, gizli, vekilAra: pref('vekilAra', true), sort: pref('siralama', 'relevance'), limit: shownLimit });
      live.textContent = `${fmtNum(res.total)} dosya bulundu.`;
      const sortSelect = el('select', { class: 'sort', 'aria-label': 'Dosya sıralaması' },
        [['relevance', 'En uygun'], ['newest', 'Açılış: yeniden eskiye'], ['fileNo', 'Dosya no: büyükten küçüğe']].map(([value, label]) => el('option', { value }, label)));
      sortSelect.value = pref('siralama', 'relevance');
      sortSelect.addEventListener('change', async () => {
        sel = 0; shownLimit = LIMIT;
        await setPref('siralama', sortSelect.value);
        render(); list.querySelector('.sort')?.focus();
      });
      if (!res.tokens.length && !res.total && filter.durum === 'all' && filter.tur === 'all' && !filter.onlyClient && !filter.onlyNew) {
        const byKey = new Map(records.map(r => [r.key, r]));
        current = recent.map(k => byKey.get(k)).filter(r => r && !gizli[r.key]);
        if (!current.length) {
          const openFiles = el('button', { class: 'btn sm' }, 'Açık dosyalar');
          openFiles.addEventListener('click', () => { filter.durum = 'acik'; renderFilters(); render(); input.focus(); });
          const hearings = el('button', { class: 'btn sm' }, 'Duruşmalarım');
          hearings.addEventListener('click', showDurusmalar);
          list.append(el('div', { class: 'empty' }, el('strong', null, 'Dosyanızı kolayca bulun'),
            el('p', null, `${fmtNum(records.length)} dosya hazır. Bir isim, dosya numarası veya mahkeme yazın.`),
            el('div', { class: 'quick-actions' }, openFiles, hearings)));
          return;
        }
        live.textContent = `${fmtNum(current.length)} son açılan dosya.`;
        list.append(el('div', { class: 'section' }, el('b', null, 'Son açılanlar'), el('span', null, 'Kaldığınız yerden devam edin')));
      } else {
        current = res.items;
        if (!res.total) {
          const narrowed = filter.durum !== 'all' || filter.tur !== 'all' || filter.onlyClient || filter.onlyNew;
          let text = 'Eşleşen dosya yok.';
          let action = narrowed ? { label: 'Filtreleri kaldır', fn: () => { clearFilters(); renderFilters(); render(); } } : null;
          if (filter.onlyNew && res.tokens.length) action = { label: 'Tüm dosyalarda ara', fn: () => {
            filter.onlyNew = false; clearFilters(); renderFilters(); render(); input.focus();
          } };
          if (filter.onlyNew && !res.tokens.length) {
            text = evrakTracked ? 'Son güncellemeden bu yana yeni evrak yok.' : 'Evrak takibi henüz açılmadı.';
            action = !evrakTracked ? { label: 'Takibi ayarla', fn: openSettings }
              : { label: 'Güncelle', fn: () => { setNotice(''); opts.onUpdate(false); } };
          }
          const box = el('div', { class: 'empty' }, el('strong', null, text),
            res.tokens.length ? el('p', null, 'Adın bir bölümünü veya dosya numarasını deneyin. Türkçe karakter kullanmanız gerekmez.') : null);
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
        list.append(el('div', { class: 'section' }, total, sortSelect));
      }
      if (sel >= current.length) sel = 0;
      current.forEach((r, i) => list.append(item(r, i, res.tokens, keys)));
      if (res.tokens.length && !pref('vekilAra', true)) list.append(el('div', { class: 'more' }, 'Karşı taraf vekillerinde arama kapalı (Ayarlar).'));
      if (res.total > current.length) {
        const more = el('button', { class: 'btn sm load-more' }, `Daha fazla göster · ${fmtNum(current.length)} / ${fmtNum(res.total)}`);
        more.addEventListener('click', () => {
          const previous = current.length;
          shownLimit += LIMIT; render();
          list.querySelectorAll('.item')[previous]?.querySelector('button')?.focus();
        });
        list.append(more);
      }
      list.scrollTop = scroll;
    }

    // ------------------------------------------------ müvekkil kartı

    function openPerson(name) {
      person = { name };
      editing = null;
      sel = 0;
      render();
      list.scrollTop = 0;
      list.querySelector('.person button')?.focus();
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
      const err = !run && !!(progress && progress.error);
      statusText.classList.toggle('err', err);
      status.hidden = !run || !progress.total;
      bar.hidden = status.hidden;
      if (run) {
        let text = progress.text || 'Güncelleniyor…';
        if (progress.total && progress.done && progress.phaseStart) {
          const perItem = (Date.now() - progress.phaseStart) / progress.done;
          const min = Math.ceil(perItem * (progress.total - progress.done) / 60000);
          text += ` · kalan ~${min} dk`;
        }
        statusText.textContent = text;
        barFill.style.width = progress.total ? `${Math.round(100 * progress.done / progress.total)}%` : '0';
        bar.setAttribute('aria-valuenow', String(progress.total ? Math.min(100, Math.round(100 * progress.done / progress.total)) : 0));
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
      views.hidden = true;
      btnSettings.classList.add('on');
      btnSettings.setAttribute('aria-expanded', 'true');
      renderSettings();
      settings.scrollTop = 0;
      autoNotice();
      settings.querySelector('button')?.focus();
    }

    function closeSettings() {
      settings.hidden = true;
      list.hidden = false;
      btnSettings.classList.remove('on');
      btnSettings.setAttribute('aria-expanded', 'false');
      render();
      input.focus();
      autoNotice();
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
        const sel = el('select', { 'aria-label': label }, options.map(([v, t]) => el('option', { value: v, selected: pref(key, def) === v }, t)));
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
      const nameIn = el('input', { type: 'text', placeholder: 'Ad Soyad', 'aria-label': 'Müvekkilleri ayırmak için vekil adı', autocomplete: 'off', spellcheck: 'false' });
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
      const btnBackup = el('button', { class: 'btn sm', title: 'Dosya listesi, notlar, duruşmalar ve ayarlar tek dosyaya yedeklenir.' }, 'Yedekle');
      btnBackup.addEventListener('click', exportBackup);
      const fileIn = el('input', { type: 'file', accept: '.json,application/json', hidden: true });
      fileIn.addEventListener('change', () => { if (fileIn.files[0]) importBackup(fileIn.files[0]); fileIn.value = ''; });
      const btnRestore = el('button', { class: 'btn sm', title: 'Başka bilgisayarda alınan yedeği yükler; yeniden tarama gerekmez.' }, 'Yedekten yükle');
      btnRestore.addEventListener('click', () => fileIn.click());
      const btnClear = el('button', { class: 'btn sm danger', title: 'Eklentinin bu bilgisayarda sakladığı her şeyi siler.' }, 'Tüm verileri sil');
      btnClear.disabled = running();
      btnClear.addEventListener('click', async () => {
        if (!confirm('Dosya listesi, duruşmalar, notlarınız, gizlenen dosyalar, son açılanlar ve ayarlarınız bu bilgisayardan silinsin mi? Bu işlem geri alınamaz; UYAP’taki dosyalarınız etkilenmez.')) return;
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
          check('durusmaBildirim', true, 'Yaklaşan duruşmaları hatırlat', 'Bugün ve yarınki duruşmaları bildirir. Duruşmalar ekranına her zaman ulaşabilirsiniz.', () => autoNotice()),
          check('duyuruBildirim', true, 'Duyuruları küçük bildirim olarak göster', 'UYAP duyuruları sağ altta görünür; tıklayınca tamamını okuyabilirsiniz. Kapatırsanız UYAP’ın normal duyuru penceresi açılır.')),

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
          el('div', { class: 'hint' }, 'Tüm veriler yalnız bu bilgisayarda saklanır ve hiçbir sunucuya gönderilmez. Notlar eklentiye aittir; UYAP’taki notlarla ilgisi yoktur.'),
          el('div', { class: 'hint' }, BRAND.disclaimer),
          el('div', { class: 'row' },
            el('a', { href: BRAND.site, target: '_blank', rel: 'noopener' }, 'legaluga.com'),
            el('a', { href: BRAND.site + '/gizlilik/uyap-asistani', target: '_blank', rel: 'noopener' }, 'Gizlilik politikası'),
            el('a', { href: 'https://github.com/hasanimer/legaluga-uyap-asistani', target: '_blank', rel: 'noopener' }, 'Kaynak kodu'))));
    }

    // ------------------------------------------------ olaylar

    // Yazma bittikten kısa süre sonra ara; büyük listelerde ana iş parçacığını her tuşta meşgul etme.
    let typeTimer;
    input.addEventListener('input', () => {
      sel = 0;
      shownLimit = LIMIT;
      editing = null;
      person = null;
      btnQClear.hidden = !input.value;
      if (!settings.hidden) closeSettings();
      clearTimeout(typeTimer);
      typeTimer = setTimeout(() => { typeTimer = null; render(); list.scrollTop = 0; }, records.length > 3000 ? 100 : 60);
    });
    // Oklar sonuç seçer; Tab tarayıcının doğal odak sırasını korur.
    input.addEventListener('keydown', e => {
      if (e.isComposing) return;
      if (e.key === 'ArrowDown' || e.key === 'ArrowUp' || e.key === 'Enter') {
        if (typeTimer) { clearTimeout(typeTimer); typeTimer = null; render(); }
        if (e.key === 'ArrowDown') { e.preventDefault(); select(sel + 1, true); }
        else if (e.key === 'ArrowUp') { e.preventDefault(); select(sel - 1, true); }
        else if (current[sel]) { e.preventDefault(); openRecord(current[sel]); }
      }
    });
    root.addEventListener('keydown', e => {
      if (e.key !== 'Escape' || e.defaultPrevented) return;
      e.preventDefault(); e.stopPropagation();
      clearTimeout(typeTimer);
      if (!settings.hidden) closeSettings();
      else if (person) closePerson();
      else if (input.value) { input.value = ''; sel = 0; shownLimit = LIMIT; render(); input.focus(); }
      else if (filter.onlyDurusma || filter.onlyNew) { switchView('files'); input.focus(); }
      else if (filtersExpanded) { filtersExpanded = false; renderFilters(); input.focus(); }
      else if (opts.onClose) opts.onClose();
    });
    btnQClear.addEventListener('click', () => { input.value = ''; input.dispatchEvent(new Event('input')); input.focus(); });
    btnHelp.addEventListener('click', () => {
      setNotice('İsim, dosya no, mahkeme veya not yazın; Türkçe karakter gerekmez. ↑ ↓ ile sonuç seçin, Enter ile açın. Tab kontrollere geçer, Esc bir adım geri döner.', '', { label: 'Tamam', fn: () => { setNotice(''); input.focus(); } });
    });
    btnUpdate.addEventListener('click', () => { setNotice(''); opts.onUpdate(false); });
    btnStop.addEventListener('click', async () => {
      if (running()) return opts.onStop();
      // Yürüten sekme yok: duraklamış işi doğrudan iptal et (popup'ta açık UYAP sekmesi olmayabilir).
      await chrome.storage.local.remove('uhdJob');
      await chrome.storage.local.set({ uhdProgress: { running: false, text: 'Yarıda kalan güncelleme iptal edildi.', endedAt: Date.now() } });
    });
    btnSettings.addEventListener('click', () => (settings.hidden ? openSettings() : closeSettings()));
    btnTheme.addEventListener('click', async () => {
      await setPref('tema', root.dataset.theme === 'dark' ? 'light' : 'dark');
      applyTheme();
    });

    render();
    const initialPrefsRevision = prefsRevision;
    chrome.storage.local.get(['uhdIndex', 'uhdProgress', 'uhdNotes', 'uhdRecent', 'uhdPrefs', 'uhdEvrakGoruldu', 'uhdJob', 'uhdDurusmalar', 'uhdGizli']).then(v => {
      loaded = true;
      if (prefsRevision === initialPrefsRevision) prefs = v.uhdPrefs || {};
      applyTheme();
      durusmaMeta = v.uhdDurusmalar || null;
      gizli = v.uhdGizli || {};
      computeDurusma();
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
    }).catch(() => {
      loaded = true;
      render();
      setNotice('Yerel dosyalar okunamadı. Eklentiyi güncellediyseniz UYAP sayfasını yenileyin.', 'err');
    });
    chrome.storage.onChanged.addListener((ch, area) => {
      if (area !== 'local') return;
      let redraw = false;
      if (ch.uhdEvrakGoruldu) goruldu = ch.uhdEvrakGoruldu.newValue || {};
      if (ch.uhdJob) pendingJob = ch.uhdJob.newValue || null;
      if (ch.uhdGizli) { gizli = ch.uhdGizli.newValue || {}; redraw = true; }
      if (ch.uhdDurusmalar) { durusmaMeta = ch.uhdDurusmalar.newValue || null; computeDurusma(); renderFilters(); redraw = true; }
      if (ch.uhdIndex) setIndex(ch.uhdIndex.newValue);
      else if (ch.uhdEvrakGoruldu) computeYeni();
      if (ch.uhdIndex || ch.uhdEvrakGoruldu) { renderFilters(); redraw = true; }
      if (ch.uhdNotes) { notes = ch.uhdNotes.newValue || {}; redraw = true; }
      if (ch.uhdRecent) recent = ch.uhdRecent.newValue || [];
      if (ch.uhdPrefs) { prefsRevision++; prefs = ch.uhdPrefs.newValue || {}; applyTheme(); redraw = true; }
      if (ch.uhdProgress) {
        progress = ch.uhdProgress.newValue || null;
        if (!records.length) redraw = true;   // ilk kullanım ekranındaki düğmenin durumu
      }
      if (redraw && !editing && settings.hidden) render();
      renderStatus();
      if (ch.uhdIndex || ch.uhdProgress || ch.uhdEvrakGoruldu || ch.uhdDurusmalar || ch.uhdPrefs) autoNotice();
    });
    setInterval(renderStatus, 5000);

    return {
      root,
      input,
      setNotice,
      focus() { input.focus(); input.select(); },
      setQuery(q) { input.value = q || ''; render(); },
      showDurusmalar
    };
  }

  globalThis.UHD.el = el;
  globalThis.UHD.mountUI = mountUI;
})();
