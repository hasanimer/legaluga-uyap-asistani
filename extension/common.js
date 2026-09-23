// Popup ve UYAP sayfası arasında paylaşılan yardımcılar: Türkçe normalleştirme, yerel arama, açılış adresi.
(() => {
  if (globalThis.UHD) return;

  // Dosya Sorgulama > Detaylı Sorgulama ekranındaki yargı türleri (UYAP kaynak kodundaki sırayla).
  // Cbs (kod 3) il/savcılık seçimi gerektiren ayrı bir sorgu kullandığı için indekslenmiyor.
  const TURLER = [
    { kod: '0', ad: 'Ceza' },
    { kod: '1', ad: 'Hukuk' },
    { kod: '2', ad: 'İcra' },
    { kod: '6', ad: 'İdari Yargı' },
    { kod: '11', ad: 'Satış Memurluğu' },
    { kod: '25', ad: 'Arabuluculuk' },
    { kod: '26', ad: 'Tazminat Komisyonu Başkanlığı' }
  ];

  const ORIGIN = 'https://avukat.uyap.gov.tr';

  // Marka kimliği: ad ve renkler yalnızca buradan değiştirilir (arayüz, sayfa paneli, bildirimler).
  const BRAND = {
    name: 'Legaluga UYAP Asistanı',
    short: 'Legaluga',
    disclaimer: 'Legaluga ürünüdür. T.C. Adalet Bakanlığı veya UYAP ile resmî bir bağlantısı yoktur.',
    site: 'https://legaluga.com',
    // legaluga.com (apps/web/app/globals.css) marka renkleri
    primary: '#0f817e',
    primaryDark: '#0b6663',
    deep: '#104b49',
    soft: '#e8f7f5',
    border: '#a7d9d2',
    focus: '#48aaa3'
  };

  // Her karakter tek karaktere eşlenir; böylece normalleştirilmiş metindeki konumlar
  // özgün metinle birebir örtüşür (vurgulama bu sayede doğru çalışır).
  const MAP = { 'ç': 'c', 'ğ': 'g', 'ı': 'i', 'ö': 'o', 'ş': 's', 'ü': 'u', 'â': 'a', 'î': 'i', 'û': 'u' };
  const charCache = new Map();
  function normChar(ch) {
    let c = charCache.get(ch);
    if (c !== undefined) return c;
    if (/\s/.test(ch)) c = ' ';
    else {
      c = ch.toLocaleLowerCase('tr-TR');
      c = MAP[c] || c;
      if (c.length !== 1 || c.charCodeAt(0) > 127) {
        const base = c.normalize('NFD').replace(/[̀-ͯ]/g, '');
        c = MAP[base] || base[0] || ' ';
      }
    }
    charCache.set(ch, c);
    return c;
  }
  function norm(s) {
    s = s == null ? '' : String(s);
    let out = '';
    for (let i = 0; i < s.length; i++) out += normChar(s[i]);
    return out;
  }
  const tokens = q => norm(q).split(/[\s,;]+/).filter(Boolean);
  const nameKey = s => norm(s).replace(/^av\.?\s+/, '').replace(/\s+/g, ' ').trim();

  // "Vekil adınız" ayarı boşsa: indekste en çok dosyada vekil olarak geçen ad kullanıcının adıdır.
  function detectMyName(records) {
    const counts = new Map();
    for (const r of records) {
      const seen = new Set();
      for (const p of r.taraflar || []) {
        for (const v of p.vekil || []) {
          const k = nameKey(v);
          if (!k || seen.has(k)) continue;
          seen.add(k);
          const c = counts.get(k) || { name: v, n: 0 };
          c.n++;
          counts.set(k, c);
        }
      }
    }
    let best = null;
    for (const c of counts.values()) if (!best || c.n > best.n) best = c;
    return best && best.n >= 2 ? best.name : '';
  }

  function myKeys(myName) {
    return String(myName || '').split(/[,;]/).map(nameKey).filter(k => k.length >= 5);
  }

  const isClient = (p, keys) => keys.length > 0 && (p.vekil || []).some(v => {
    const k = nameKey(v);
    return keys.some(m => k === m || k.includes(m));
  });

  const OTHER_TUR = new Set(['6', '11', '25', '26']);
  function passFilter(r, f) {
    if (f.durum === 'acik' && r.sorguDurum === 1) return false;
    if (f.durum === 'kapali' && r.sorguDurum !== 1) return false;
    if (f.tur && f.tur !== 'all') {
      if (f.tur === 'other' ? !OTHER_TUR.has(r.yargiTuru) : r.yargiTuru !== f.tur) return false;
    }
    return true;
  }

  // Normalleştirilmiş alanlar kayıt başına bir kez hesaplanır; vekil adı değişince yenilenir.
  const infoCache = new WeakMap();
  function info(r, keys, ctx) {
    let c = infoCache.get(r);
    if (c && c.ctx === ctx) return c;
    const clients = [], others = [], vekils = [];
    for (const p of r.taraflar || []) {
      (isClient(p, keys) ? clients : others).push(norm(p.adi));
      for (const v of p.vekil || []) {
        const k = nameKey(v);
        if (!keys.some(m => k === m || k.includes(m))) vekils.push(norm(v));
      }
    }
    const base = [r.dosyaNo, r.birimAdi, r.dosyaTur, r.yargiTuruAdi, r.birimTuruAdi].map(norm);
    c = {
      ctx,
      no: norm(r.dosyaNo),
      birim: norm(r.birimAdi),
      clients,
      parties: clients.concat(others),
      all: base.concat(clients, others, vekils).join(' | '),
      clientOnly: base.concat(clients).join(' | ')
    };
    infoCache.set(r, c);
    return c;
  }

  const wordStart = (list, t) => list.some(p => p.startsWith(t) || p.includes(' ' + t));

  // Tüm kelimeler geçmeli; dosya numarası, müvekkil ve taraf adı başından eşleşmeler öne çıkar.
  // o: { myName, notes: {key: metin}, filter: {durum, tur, onlyClient}, limit }
  function search(records, query, o = {}) {
    const ts = tokens(query);
    const f = o.filter || {};
    const filtered = (f.durum && f.durum !== 'all') || (f.tur && f.tur !== 'all') || f.onlyClient;
    if (!ts.length && !filtered) return { total: 0, items: [], tokens: ts };
    const keys = myKeys(o.myName);
    const ctx = keys.join('|');
    const notes = o.notes || {};
    const hits = [];
    for (const r of records) {
      if (!passFilter(r, f)) continue;
      const c = info(r, keys, ctx);
      if (f.onlyClient && !c.clients.length) continue;
      const hay = f.onlyClient ? c.clientOnly : c.all;
      const note = notes[r.key] ? norm(notes[r.key]) : '';
      let score = 0;
      let ok = true;
      for (const t of ts) {
        if (!hay.includes(t) && !note.includes(t)) { ok = false; break; }
        if (c.no === t) score += 100;
        else if (c.no.includes(t)) score += 20;
        if (wordStart(c.clients, t)) score += 15;
        else if (wordStart(c.parties, t)) score += 10;
        if (note.includes(t)) score += 5;
        if (c.birim.includes(t)) score += 2;
      }
      if (ok) hits.push({ score, r });
    }
    hits.sort((a, b) =>
      b.score - a.score ||
      (a.r.sorguDurum || 0) - (b.r.sorguDurum || 0) ||
      (b.r.acilisTs || 0) - (a.r.acilisTs || 0));
    const limit = o.limit || 60;
    return { total: hits.length, items: hits.slice(0, limit).map(h => h.r), tokens: ts };
  }

  // UYAP'ın Dosya Sorgulama sayfası bu parametrelerle Detaylı Sorgulama formunu hazır doldurur.
  function openPath(r) {
    const p = new URLSearchParams({
      mode: 'detayli',
      yargiTur: r.yargiTuru,
      yargiBirimi: r.birimTuru2,
      dosyaDurum: r.sorguDurum === 1 ? 'kapali' : 'acik'
    });
    return '/dosya-sorgulama?' + p.toString();
  }

  // UYAP'tan gelen değerler (taraf, vekil adı…) =, +, -, @ ya da sekme/satır başıyla başlıyorsa
  // Excel onları formül olarak çalıştırabilir; başa kesme işareti eklenerek düz metne çevrilir.
  const csvCell = v => {
    let s = String(v == null ? '' : v);
    if (/^[=+\-@\t\r]/.test(s)) s = "'" + s;
    return '"' + s.replace(/"/g, '""') + '"';
  };
  // Dosya numarası Excel'de tarihe dönmesin diye ="…" biçiminde yazılır; yalnız "yıl/sıra" biçimine izin verilir.
  const csvDosyaNo = no => /^\d{4}\/\d+$/.test(String(no || '')) ? `"=""${no}"""` : csvCell(no);

  const fmtNum = n => Number(n || 0).toLocaleString('tr-TR');
  const fmtDate = ts => ts ? new Date(ts).toLocaleString('tr-TR', { dateStyle: 'short', timeStyle: 'short' }) : '';

  globalThis.UHD = { TURLER, ORIGIN, BRAND, norm, tokens, nameKey, detectMyName, myKeys, isClient, search, openPath, fmtNum, fmtDate, csvCell, csvDosyaNo };
})();
