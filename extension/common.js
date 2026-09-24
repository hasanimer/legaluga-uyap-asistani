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
      vekils,
      fields: base.concat(clients, others),
      all: base.concat(clients, others, vekils).join(' | '),
      noVek: base.concat(clients, others).join(' | '),
      clientOnly: base.concat(clients).join(' | ')
    };
    infoCache.set(r, c);
    return c;
  }

  const wordStart = (list, t) => list.some(p => p.startsWith(t) || p.includes(' ' + t));

  // Tüm kelimeler geçmeli; dosya numarası, müvekkil ve taraf adı başından eşleşmeler öne çıkar.
  // o: { myName, notes: {key: metin}, filter: {durum, tur, onlyClient, onlyNew, onlySure}, yeni: Map(key → en yeni evrak zamanı),
  //      sure: Map(key → son gün), gizli: {key: true} (aramada gösterilmeyecek dosyalar), vekilAra: false (karşı vekillerde arama), limit }
  // Birden çok kelimede, hepsi aynı alanda (ör. mahkeme adında) geçen dosyalar öne çıkar.
  function search(records, query, o = {}) {
    const ts = tokens(query);
    const f = o.filter || {};
    const filtered = (f.durum && f.durum !== 'all') || (f.tur && f.tur !== 'all') || f.onlyClient || f.onlyNew || f.onlySure;
    const yeni = o.yeni || new Map();
    const sure = o.sure || new Map();   // kayıt key → en yakın son gün ("yyyy-mm-dd")
    const gizli = o.gizli || {};
    const vekilAra = o.vekilAra !== false;
    if (!ts.length && !filtered) return { total: 0, items: [], tokens: ts };
    const keys = myKeys(o.myName);
    const ctx = keys.join('|');
    const notes = o.notes || {};
    const hits = [];
    for (const r of records) {
      if (!passFilter(r, f)) continue;
      if (f.onlyNew && !yeni.has(r.key)) continue;
      if (f.onlySure && !sure.has(r.key)) continue;
      if (gizli[r.key]) continue;
      const c = info(r, keys, ctx);
      if (f.onlyClient && !c.clients.length) continue;
      const hay = f.onlyClient ? c.clientOnly : vekilAra ? c.all : c.noVek;
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
      if (ok && ts.length > 1) {
        const fields = f.onlyClient ? c.clients : vekilAra ? c.fields.concat(c.vekils) : c.fields;
        if (fields.some(x => ts.every(t => x.includes(t))) || (note && ts.every(t => note.includes(t)))) score += 60;
      }
      if (ok) hits.push({ score, r });
    }
    const bySure = (a, b) => {
      if (!f.onlySure) return 0;
      const x = sure.get(a.r.key) || '', y = sure.get(b.r.key) || '';
      return x < y ? -1 : x > y ? 1 : 0;
    };
    hits.sort((a, b) =>
      bySure(a, b) ||
      b.score - a.score ||
      (yeni.get(b.r.key) || 0) - (yeni.get(a.r.key) || 0) ||
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

  // ------------------------------------------------ evrak takibi
  // list_dosya_evraklar.ajx yanıtındaki evrakId ve dosyaId her istekte yeniden şifrelenir: aynı evrak her
  // yanıtta başka kimlikle gelir. Bu yüzden evrak, birim evrak no + onay tarihi + tür üçlüsüyle tanınır.
  const evrakKey = e => (e && e.birimEvrakNo != null && e.birimEvrakNo !== '' && e.onaylandigiTarih)
    ? `${e.birimEvrakNo}|${e.onaylandigiTarih}|${e.tur || ''}` : null;

  // "12/09/2026" → zaman damgası (sıralama için); tanınmayan biçimde 0.
  function trDateTs(s) {
    const m = /^(\d{2})\/(\d{2})\/(\d{4})/.exec(String(s || ''));
    return m ? Date.UTC(+m[3], +m[2] - 1, +m[1]) : 0;
  }

  // Bir yanıt sayfası → { items, bad }. tumEvraklar dosyayı ve bağlı dosyaları (talimat, soruşturma…)
  // "2025/9101(Ceza Dava Dosyası)" başlıklarıyla gruplar; yoksa yalnız son20Evrak kullanılır.
  // Kimliği ya da onay tarihi eksik evrak tahminle eşleştirilmez, "bad" olarak sayılır.
  function parseEvraklar(res) {
    const str = v => (v == null ? '' : String(v)).trim();
    let list = null;
    if (res && res.tumEvraklar && typeof res.tumEvraklar === 'object' && !Array.isArray(res.tumEvraklar)) {
      list = Object.entries(res.tumEvraklar).flatMap(([g, arr]) => (Array.isArray(arr) ? arr : []).map(e => [g, e]));
    } else if (res && Array.isArray(res.son20Evrak)) {
      list = res.son20Evrak.map(e => ['', e]);
    }
    if (!list) throw new Error('Evrak listesi okunamadı.');
    const items = [];
    let bad = 0;
    for (const [g, e] of list) {
      const k = evrakKey(e);
      if (!k) { bad++; continue; }
      items.push({
        k, tur: str(e.tur), onay: str(e.onaylandigiTarih), gonderim: str(e.sistemeGonderildigiTarih),
        gonderen: str(e.gonderenYerKisi), aciklama: str(e.aciklama).slice(0, 200), dosya: str(g)
      });
    }
    return { items, bad };
  }

  // İlk tarama başlangıç sayılır (yeni evrak yok). Sonrakilerde önceki taramalarda görülmemiş anahtarlar yenidir.
  // seen birleşim olarak tutulur; böylece listeden bir kez düşüp geri gelen evrak yeniden "yeni" sayılmaz.
  function diffEvrak(prevSeen, items) {
    const uniq = new Map();
    for (const i of items) if (!uniq.has(i.k)) uniq.set(i.k, i);
    const prev = Array.isArray(prevSeen) ? new Set(prevSeen) : null;
    const yeni = prev ? [...uniq.values()].filter(i => !prev.has(i.k)) : [];
    yeni.sort((a, b) => trDateTs(b.onay) - trDateTs(a.onay));
    const seen = prev ? [...prev] : [];
    for (const k of uniq.keys()) if (!prev || !prev.has(k)) seen.push(k);
    return { seen, yeni };
  }

  // Görüldü olarak işaretlenmemiş yeni evraklar (goruldu: {kayıtKey: zaman}).
  // Dosyadaki en yeni evrak (onay tarihine göre; aynı günde UYAP'ın sırasındaki ilk evrak).
  function sonEvrak(items) {
    let best = null, bestTs = -1;
    for (const i of items || []) {
      const ts = trDateTs(i.onay);
      if (ts > bestTs) { best = i; bestTs = ts; }
    }
    return best && { k: best.k, tur: best.tur, onay: best.onay, gonderim: best.gonderim, dosya: best.dosya };
  }

  // Kayıtta sonEvrak yoksa (1.1.0'da taranmış dosyalar) görülen evrak anahtarlarından çıkarılır:
  // anahtar "birimEvrakNo|onay tarihi|tür" biçimindedir.
  function lastEvrak(r) {
    if (r.sonEvrak) return r.sonEvrak;
    if (!Array.isArray(r.evrakSeen) || !r.evrakSeen.length) return null;
    return sonEvrak(r.evrakSeen.map(k => {
      const [, onay, ...tur] = String(k).split('|');
      return { k, onay, tur: tur.join('|') };
    }));
  }

  // Müvekkil (kişi) kartı: adı normalleştirilmiş hâliyle birebir eşleşen tarafın geçtiği tüm dosyalar ve
  // o dosyalardaki rolleri. UYAP taraf listesinde kimlik numarası olmadığından aynı adlı farklı kişiler ayrılamaz.
  // Sıra: müvekkil olarak geçtiği dosyalar önce; her grupta açıklar önce, sonra son evrakı yeni olan, sonra yeni açılan.
  function personFiles(records, name, myName) {
    const key = nameKey(name);
    const keys = myKeys(myName);
    const out = [];
    if (!key) return out;
    for (const r of records || []) {
      const ps = (r.taraflar || []).filter(p => nameKey(p.adi) === key);
      if (ps.length) out.push({ r, roller: ps.map(p => ({ rol: p.rol || 'Taraf', muvekkil: isClient(p, keys) })) });
    }
    const son = x => trDateTs((lastEvrak(x.r) || {}).onay);
    const bizde = x => x.roller.some(y => y.muvekkil);
    out.sort((a, b) =>
      bizde(b) - bizde(a) ||
      (a.r.sorguDurum === 1) - (b.r.sorguDurum === 1) ||
      son(b) - son(a) ||
      (b.r.acilisTs || 0) - (a.r.acilisTs || 0));
    return out;
  }

  // ------------------------------------------------ süre hatırlatıcı
  // Eklenti yasal süreyi kendisi belirlemez: tebliğ tarihini ve süreyi avukat girer, son gün yalnız takvim
  // hesabıyla önerilir ve avukat düzeltebilir. Tarihler yerel gün olarak "yyyy-mm-dd" biçiminde tutulur.
  const pad2 = n => String(n).padStart(2, '0');
  const isoOf = d => `${d.getUTCFullYear()}-${pad2(d.getUTCMonth() + 1)}-${pad2(d.getUTCDate())}`;
  function isoToUtc(iso) {
    const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(String(iso || ''));
    return m ? new Date(Date.UTC(+m[1], +m[2] - 1, +m[3])) : null;
  }
  // "31/08/2026" (UYAP) → "2026-08-31"
  const trToIso = s => { const t = trDateTs(s); return t ? isoOf(new Date(t)) : ''; };
  const todayIso = (now = new Date()) => `${now.getFullYear()}-${pad2(now.getMonth() + 1)}-${pad2(now.getDate())}`;

  // Başlangıç + n gün/hafta/ay (ay eklemede ayın son gününe sıkıştırılır: 31 Ocak + 1 ay = 28/29 Şubat).
  function addPeriod(iso, n, unit) {
    const d = isoToUtc(iso);
    n = Math.floor(Number(n));
    if (!d || !(n > 0)) return '';
    if (unit === 'ay') {
      const y = d.getUTCFullYear(), m = d.getUTCMonth() + n, day = d.getUTCDate();
      const last = new Date(Date.UTC(y, m + 1, 0)).getUTCDate();
      return isoOf(new Date(Date.UTC(y, m, Math.min(day, last))));
    }
    return isoOf(new Date(d.getTime() + (unit === 'hafta' ? 7 * n : n) * 86400000));
  }

  // Bugünden son güne kalan gün (geçmişse eksi).
  function daysLeft(iso, today = todayIso()) {
    const a = isoToUtc(today), b = isoToUtc(iso);
    return a && b ? Math.round((b - a) / 86400000) : null;
  }

  // Son gün için dikkat edilecekler. Resmî ve dinî bayramlar bilinmediği için yalnız hafta sonu ve
  // adli tatil (20 Temmuz – 31 Ağustos) uyarılır; hiçbiri kendiliğinden uygulanmaz.
  function sureUyarilari(iso) {
    const d = isoToUtc(iso);
    if (!d) return [];
    const out = [];
    const wd = d.getUTCDay();
    if (wd === 0 || wd === 6) out.push('Son gün hafta sonuna denk geliyor; süre tatili izleyen iş günü bitebilir.');
    const md = (d.getUTCMonth() + 1) * 100 + d.getUTCDate();
    if (md >= 720 && md <= 831) out.push('Son gün adli tatile denk geliyor; işin türüne göre süre uzayabilir.');
    return out;
  }

  // Tamamlanmamış süreler, en yakını önce. sureler: {id: {id, key, baslik, bitis, done}}
  const activeSureler = sureler => Object.values(sureler || {})
    .filter(s => s && !s.done && isoToUtc(s.bitis))
    .sort((a, b) => (a.bitis < b.bitis ? -1 : a.bitis > b.bitis ? 1 : 0));

  // ------------------------------------------------ duruşmalar
  // avukat_durusma_sorgula_brd.ajx kaydı → yerel kayıt. Dosya anahtarı indeksle aynıdır (birimId|dosyaNo|dosyaTurKod).
  // Taraf listesindeki vekil kaydı (isVekil) avukatın kendisidir; saklanmaz.
  function parseDurusma(x) {
    const m = /^(\d{4})-(\d{2})-(\d{2})[ T](\d{2}):(\d{2})/.exec(String((x && x.tarihSaat) || ''));
    if (!m || !x.dosyaNo) return null;
    const str = v => (v == null ? '' : String(v)).trim();
    return {
      id: str(x.kayitId) || `${x.birimId}|${x.dosyaNo}|${m[0]}`,
      key: `${x.birimId}|${x.dosyaNo}|${x.dosyaTurKod}`,
      dosyaNo: str(x.dosyaNo),
      birimAdi: str(x.yerelBirimAd),
      dosyaTur: str(x.dosyaTurKodAciklama),
      tarih: `${m[1]}-${m[2]}-${m[3]}`,
      saat: `${m[4]}:${m[5]}`,
      islem: str(x.islemTuruAciklama) || 'Duruşma',
      sonuc: str(x.islemSonucuAciklama),
      taraflar: (Array.isArray(x.dosyaTaraflari) ? x.dosyaTaraflari : [])
        .filter(t => t && !t.isVekil)
        .map(t => ({ ad: [str(t.isim), str(t.soyad)].filter(Boolean).join(' '), sifat: str(t.sifat) }))
        .filter(t => t.ad)
    };
  }

  // Bugünden itibaren (bugün dahil) duruşmalar, tarih ve saate göre.
  const upcomingDurusmalar = (list, today = todayIso()) => (list || [])
    .filter(d => d && d.tarih >= today)
    .sort((a, b) => (a.tarih + a.saat < b.tarih + b.saat ? -1 : a.tarih + a.saat > b.tarih + b.saat ? 1 : 0));

  // UYAP'ın beklediği "gg.aa.yyyy".
  const uyapDate = d => `${pad2(d.getDate())}.${pad2(d.getMonth() + 1)}.${d.getFullYear()}`;

  // Takvim dosyası (.ics). Türkiye saati yıl boyu UTC+3 olduğu için saatler UTC'ye çevrilir. Taraf adları
  // takvim hizmetlerine (ör. bulut takvim) gidebileceği için yazılmaz; yalnız dosya no, birim ve işlem.
  function durusmaIcs(list, now = new Date()) {
    const esc = s => String(s || '').replace(/[\\;,]/g, c => '\\' + c).replace(/\r?\n/g, '\\n');
    const utc = (tarih, saat, plusMin = 0) => {
      const [y, mo, d] = tarih.split('-').map(Number);
      const [h, mi] = saat.split(':').map(Number);
      const t = new Date(Date.UTC(y, mo - 1, d, h - 3, mi + plusMin));
      return `${t.getUTCFullYear()}${pad2(t.getUTCMonth() + 1)}${pad2(t.getUTCDate())}T${pad2(t.getUTCHours())}${pad2(t.getUTCMinutes())}00Z`;
    };
    const stamp = `${now.getUTCFullYear()}${pad2(now.getUTCMonth() + 1)}${pad2(now.getUTCDate())}T${pad2(now.getUTCHours())}${pad2(now.getUTCMinutes())}00Z`;
    const lines = ['BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//Legaluga//UYAP Asistani//TR', 'CALSCALE:GREGORIAN', 'METHOD:PUBLISH'];
    for (const d of list || []) {
      lines.push('BEGIN:VEVENT',
        `UID:${esc(String(d.id).replace(/[^\w.-]/g, '-'))}@legaluga-uyap-asistani`,
        `DTSTAMP:${stamp}`,
        `DTSTART:${utc(d.tarih, d.saat)}`,
        `DTEND:${utc(d.tarih, d.saat, 60)}`,
        `SUMMARY:${esc(`${d.islem}: ${d.dosyaNo} ${d.birimAdi}`)}`,
        `DESCRIPTION:${esc(`${d.dosyaTur}${d.sonuc ? ' · ' + d.sonuc : ''} (UYAP'tan alındı; saati UYAP'ta teyit edin)`)}`,
        `LOCATION:${esc(d.birimAdi)}`,
        'END:VEVENT');
    }
    lines.push('END:VCALENDAR');
    return lines.join('\r\n') + '\r\n';
  }

  const isTebligat = tur => /tebli[gğ]/i.test(String(tur || ''));

  const unseenEvrak = (r, goruldu) => (r.yeniEvrak || []).filter(y => (y.at || 0) > ((goruldu && goruldu[r.key]) || 0));

  // ------------------------------------------------ görünüm
  // UYAP adları büyük harfle verir; yalnız baş harfleri büyük gösterilir (arama etkilenmez).
  // Nokta içeren kısaltmalar (A.Ş., T.C., LTD.) ve 2-3 harfli şirket ekleri olduğu gibi kalır.
  const KEEP_UPPER = new Set(['AŞ', 'A.Ş.', 'LTD', 'LTD.', 'ŞTİ', 'ŞTİ.', 'T.C.', 'TC', 'KOOP.', 'SGK', 'TCDD', 'PTT', 'TMSF', 'TOKİ', 'TBMM']);
  function trTitle(s) {
    s = String(s == null ? '' : s);
    if (!/[A-ZÇĞİÖŞÜ]/.test(s) || /[a-zçğıöşü]/.test(s)) return s;   // yalnız tamamen büyük harfli metin çevrilir
    return s.split(/(\s+|-|\(|\))/).map(w => {
      if (!w || /^\s+$|^[-()]$/.test(w)) return w;
      if (KEEP_UPPER.has(w) || /\.\S/.test(w) || /^[A-ZÇĞİÖŞÜ]\.?$/.test(w)) return w;
      if (w === 'VE') return 've';
      const low = w.toLocaleLowerCase('tr-TR');
      return low.charAt(0).toLocaleUpperCase('tr-TR') + low.slice(1);
    }).join('');
  }

  // "Kapalı (2022-02-03 13:44:11.0)" → { label: "Kapalı", tarih: "03.02.2022" }
  function cleanDurum(durum) {
    const s = String(durum || '').trim();
    const m = /^(.*?)\s*\((\d{4})-(\d{2})-(\d{2})[^)]*\)\s*$/.exec(s);
    return m ? { label: m[1], tarih: `${m[4]}.${m[3]}.${m[2]}` } : { label: s, tarih: '' };
  }

  // "(Kapatılan)İstanbul Anadolu 2. Asliye Ticaret Mahkemesi" → "İstanbul Anadolu 2. Asliye Ticaret Mahkemesi (kapatılan)"
  function cleanBirim(birim) {
    const s = String(birim || '').trim();
    const m = /^\((.+?)\)\s*(.+)$/.exec(s);
    return m ? `${m[2]} (${m[1].toLocaleLowerCase('tr-TR')})` : s;
  }

  // Yeni evrak takibi: yeni kurulumda kapalı. Önceki sürümde açık kullanılıyorsa (taranmış kayıt varsa) açık kalır.
  function evrakTakipAcik(prefs, records) {
    prefs = prefs || {};
    if (typeof prefs.evrakTakip === 'boolean') return prefs.evrakTakip;
    if (prefs.evrakKapali) return false;
    return (records || []).some(r => r && r.evrakSeen);
  }

  // ------------------------------------------------ yedek
  // Yedek dosyası: { app, format, exportedAt, version, data: { anahtar: değer } }. Başka uygulamanın ya da
  // desteklenmeyen biçimin dosyası reddedilir; yalnız bilinen anahtarlar geri yüklenir.
  const BACKUP_APP = 'legaluga-uyap-asistani';
  const BACKUP_FORMAT = 1;
  const BACKUP_KEYS = ['uhdIndex', 'uhdNotes', 'uhdSureler', 'uhdEvrakGoruldu', 'uhdDurusmalar', 'uhdPrefs', 'uhdRecent', 'uhdGizli'];
  function checkBackup(obj) {
    if (!obj || typeof obj !== 'object' || obj.app !== BACKUP_APP) throw new Error('Bu dosya Legaluga UYAP Asistanı yedeği değil.');
    if (obj.format !== BACKUP_FORMAT) throw new Error(`Bu yedeğin biçimi (${obj.format}) bu sürümde desteklenmiyor.`);
    if (!obj.data || typeof obj.data !== 'object') throw new Error('Yedek dosyası bozuk.');
    const data = {};
    for (const k of BACKUP_KEYS) if (k in obj.data) data[k] = obj.data[k];
    if (data.uhdIndex && !Array.isArray(data.uhdIndex.records)) throw new Error('Yedekteki dosya listesi bozuk.');
    return data;
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

  globalThis.UHD = { TURLER, ORIGIN, BRAND, norm, tokens, nameKey, detectMyName, myKeys, isClient, search, openPath, fmtNum, fmtDate, csvCell, csvDosyaNo, evrakKey, trDateTs, parseEvraklar, diffEvrak, unseenEvrak, sonEvrak, lastEvrak, personFiles, trTitle, cleanDurum, cleanBirim, evrakTakipAcik, BACKUP_APP, BACKUP_FORMAT, BACKUP_KEYS, checkBackup, trToIso, todayIso, addPeriod, daysLeft, sureUyarilari, activeSureler, isTebligat, parseDurusma, upcomingDurusmalar, uyapDate, durusmaIcs };
})();
