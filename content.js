// UYAP Avukat Portalı sekmesinde çalışır.
// - Güncelleme: UYAP ekranının kendi kullandığı JSON uçlarıyla dosya listesi, taraf adları ve
//   açık dosyaların evrak listesi alınır; evrak listesi önceki taramayla karşılaştırılıp yeni evraklar işaretlenir.
//   Güncelleme kaldığı yerden sürdürülebilir bir iştir (uhdJob): sekme kapanırsa açık başka bir UYAP sekmesi,
//   hiç yoksa UYAP bir sonraki açıldığında devralır; oturum düşerse yeniden girişte sürer.
// - Dosya açma: Dosya Sorgulama ekranı açılır, form doldurulur, Sorgula'ya basılır,
//   sonuçta ilgili satırın "Pencere Görünümü" düğmesine tıklanır.
(() => {
  if (window.__uhdLoaded) return;
  window.__uhdLoaded = true;

  const { TURLER, norm, openPath, parseEvraklar, diffEvrak, sonEvrak, evrakKey, parseDurusma, uyapDate, evrakTakipAcik, parseSafahat, sonIslemOf, fmtTL, humanKey, borcluAdi, BORCLU_SORGULARI, SORGU_ORTAK } = globalThis.UHD;
  const OWNER = Math.random().toString(36).slice(2);
  const DELAY = 150;
  const TARAF_V = 2; // 2: taraflarla birlikte vekiller de saklanır
  const EVRAK_PAGES = 20;   // bir dosyanın evrak listesinde en çok bu kadar sayfa okunur
  const YENI_MAX = 50;      // dosya başına saklanan görülmemiş yeni evrak sayısı
  const STALE_MS = 90000;
  const ESZAMANLI = 3;
  const ARA_KAYIT_MS = 30000;  // yarıda kalırsa kaybolmasın diye ara kayıt sıklığı; büyük indekste sık yazmak paneli yavaşlatır      // taraf ve evrak adımlarında aynı anda en çok bu kadar istek (UYAP ekranları da paralel istek yapar)
  const DURUSMA_GUN = 60;   // güncellemede bugünden itibaren bu kadar günün duruşmaları alınır (30'ar günlük sorgularla)   // bu süre sinyal gelmezse güncellemeyi yürüten sekme gitmiş sayılır
  const sleep = ms => new Promise(r => setTimeout(r, ms));
  const pad = n => String(n).padStart(2, '0');
  const visible = e => !!e && e.isConnected && e.getClientRects().length > 0 && getComputedStyle(e).visibility !== 'hidden';

  class Fatal extends Error {}
  class Stopped extends Error {}

  async function waitFor(fn, ms = 10000, msg) {
    const end = Date.now() + ms;
    for (;;) {
      const v = fn();
      if (v) return v;
      if (Date.now() > end) throw new Error(msg || 'UYAP ekranı zamanında yanıt vermedi.');
      await sleep(120);
    }
  }

  // ---------------------------------------------------------------- UYAP istekleri

  async function api(path, body) {
    const ctl = new AbortController();
    const timer = setTimeout(() => ctl.abort(), 60000);
    let res;
    try {
      res = await fetch('/' + path, {
        method: 'POST',
        credentials: 'include',
        cache: 'no-store',
        signal: ctl.signal,
        headers: {
          'Accept': 'application/json, text/plain, */*',
          'Content-Type': 'application/json',
          'Cache-Control': 'no-cache',
          'Pragma': 'no-cache',
          'Expires': '0'
        },
        body: JSON.stringify(body)
      });
    } catch (e) {
      throw new Error(`UYAP’a ulaşılamadı (${path}).`);
    } finally {
      clearTimeout(timer);
    }
    const expired = 'UYAP oturumu kapanmış görünüyor. Yeniden giriş yapıp tekrar deneyin.';
    if (res.status === 401 || res.status === 403) throw new Fatal(expired);
    if (!res.ok) throw new Error(`UYAP hata döndürdü (${path}: HTTP ${res.status}).`);
    const buf = await res.arrayBuffer();
    let text;
    try { text = new TextDecoder('utf-8', { fatal: true }).decode(buf); }
    catch { text = new TextDecoder('windows-1254').decode(buf); }
    text = text.trim();
    if (!text) return null;
    let data;
    try { data = JSON.parse(text); } catch { throw new Fatal(expired); }
    if (data && typeof data === 'object' && !Array.isArray(data) && (data.error || data.errorCode || data.type === 'error')) {
      const msg = String(data.message || (data.error && data.error.message) || data.error || data.errorCode);
      if (/oturum|session|login|giri[sş]/i.test(msg)) throw new Fatal(`UYAP: ${msg}`);
      throw new Error(`UYAP: ${msg}`);
    }
    return data;
  }

  // ---------------------------------------------------------------- Güncelleme

  let job = null;   // bu sekmede yürüyen iş: { id, stop, lost }

  // Chrome eklenti yenilenince açık UYAP sekmesindeki eski content script'i
  // hemen kaldırmaz. Eski betik artık storage API'sini kullanamaz; zamanlı
  // devralma kontrolleri o bağlamda sessizce durmalıdır.
  let contextGone = false;
  let resumeInterval = null;
  let autoInterval = null;
  function invalidated(error) {
    return /extension context invalidated|context invalidated/i.test(String(error?.message || error));
  }
  function stopInvalidatedContext() {
    contextGone = true;
    hidePanel();
    if (job) job.lost = true;
    if (resumeInterval !== null) clearInterval(resumeInterval);
    if (autoInterval !== null) clearInterval(autoInterval);
  }
  function contextAvailable() {
    if (contextGone) return false;
    try {
      if (chrome.runtime?.id) return true;
    } catch (_) {}
    stopInvalidatedContext();
    return false;
  }
  function scheduled(task) {
    if (!contextAvailable()) return;
    Promise.resolve().then(task).catch(error => {
      if (invalidated(error)) stopInvalidatedContext();
      else console.error('Legaluga zamanlı işlem hatası:', error);
    });
  }

  // İstekler arası bekleme. Arka plandaki sekmede Chrome zamanlayıcıları en az 1 sn'ye yuvarladığı için
  // orada yapay bekleme yapılmaz; istekler yine de sırayla, birer birer gider.
  const pace = () => (document.hidden ? Promise.resolve() : sleep(DELAY));

  async function setProgress(p) {
    if (job && job.lost) return;   // sayfa kapanıyor ya da iş başka sekmede: ilerleme kaydına dokunma
    await chrome.storage.local.set({ uhdProgress: { owner: OWNER, beat: Date.now(), jobId: job && job.id, ...p } });
  }

  const alive = p => p && p.running && p.owner && p.owner !== OWNER && Date.now() - (p.beat || 0) < STALE_MS;

  // Birden çok UYAP sekmesi aynı anda devralmaya kalkarsa son yazan kazanır; diğerleri çekilir.
  async function claim(text) {
    await setProgress({ running: true, text });
    await sleep(300 + Math.random() * 300);
    const { uhdProgress: p } = await chrome.storage.local.get('uhdProgress');
    return !!p && p.owner === OWNER;
  }

  async function startUpdate(full) {
    if (job) return { ok: false, error: 'Güncelleme zaten sürüyor.' };
    const { uhdProgress: p, uhdJob: old } = await chrome.storage.local.get(['uhdProgress', 'uhdJob']);
    if (alive(p)) return { ok: false, error: 'Güncelleme başka bir UYAP sekmesinde sürüyor.' };
    // Yarıda kalmış iş varsa "Güncelle" onu sürdürür; "Tümünü yenile" yeni iş başlatır.
    const resuming = !!(old && !old.stop && !full);
    const j = resuming
      ? { ...old, paused: null, listDone: old.paused === 'oturum' ? false : old.listDone }
      : { id: Math.random().toString(36).slice(2), full: !!full, startedAt: Date.now(), listDone: false, stats: {} };
    await chrome.storage.local.set({ uhdJob: j });
    if (!(await claim(resuming ? 'Güncelleme kaldığı yerden sürdürülüyor…' : 'Güncelleme başlıyor…'))) {
      return { ok: false, error: 'Güncelleme başka bir UYAP sekmesinde başladı.' };
    }
    run(j);
    return { ok: true };
  }

  // Yarıda kalmış işi devral. Oturum düşmesiyle duraklayan iş yalnız sayfa yüklenirken (yeniden girişten sonra) sürer.
  async function maybeResume(pageLoad) {
    if (job || !contextAvailable()) return;
    const { uhdProgress: p, uhdJob: j } = await chrome.storage.local.get(['uhdProgress', 'uhdJob']);
    if (!j || j.stop) return;
    // Sekme yenilendiyse işi yürüten, bu sekmenin önceki hâliydi: sinyalin eskimesini beklemeden devral.
    const wasMine = pageLoad && p && p.owner && p.owner === ssGet(SS_OWNER);
    if (alive(p) && !wasMine) return;
    if (j.paused === 'kullanici') return;   // kullanıcı durdurdu: yalnız "Sürdür" ile devam eder
    if (j.paused === 'oturum' && !pageLoad) return;
    if (!(await claim('Yarıda kalan güncelleme sürdürülüyor…'))) return;
    const { uhdJob: cur } = await chrome.storage.local.get('uhdJob');
    if (!cur || cur.id !== j.id || cur.stop) return setProgress({ running: false, endedAt: Date.now(), text: 'Güncelleme durduruldu.' });
    const next = { ...cur, paused: null, listDone: cur.paused === 'oturum' ? false : cur.listDone };
    await chrome.storage.local.set({ uhdJob: next });
    log('Yarıda kalan güncelleme sürdürülüyor.');
    run(next);
  }

  function run(j) {
    job = { id: j.id, stop: false, lost: false };
    ssSet(SS_OWNER, OWNER);
    // Sekme kapanırsa arka plan betiği işi hemen serbest bıraksın (background.js).
    try { chrome.runtime.sendMessage({ type: 'uhd-owner', owner: OWNER }).catch(() => {}); } catch {}
    const mine = job;
    runUpdate(j).finally(() => {
      // Sayfa kapanırken çekildiyse not kalır: sekme yenilenince iş hemen devralınır.
      if (!mine.lost) ssSet(SS_OWNER, null);
      if (job === mine) job = null;
    });
  }

  // Sekmeye özgü, yenilemede korunan küçük not (UYAP'ın sessionStorage'ı; yalnız rastgele sekme kimliği yazılır).
  const SS_OWNER = 'legalugaUhdOwner';
  function ssGet(k) { try { return sessionStorage.getItem(k); } catch { return null; } }
  function ssSet(k, v) { try { v == null ? sessionStorage.removeItem(k) : sessionStorage.setItem(k, v); } catch {} }

  // Durdur: yürüyen iş hangi sekmedeyse depolama üzerinden durur; duraklamış iş iptal edilir.
  async function stopUpdate() {
    if (job) job.stop = true;
    const { uhdJob: j, uhdProgress: p } = await chrome.storage.local.get(['uhdJob', 'uhdProgress']);
    if (!j) return;
    if (job || alive(p)) await chrome.storage.local.set({ uhdJob: { ...j, stop: true } });
    else {
      await chrome.storage.local.remove('uhdJob');
      await chrome.storage.local.set({ uhdProgress: { running: false, text: 'Yarıda kalan güncelleme iptal edildi.', endedAt: Date.now() } });
    }
  }

  function checkStop() {
    if (job && job.lost) throw new Stopped('lost');
    if (job && job.stop) throw new Stopped('Durduruldu');
  }

  function toRecord(d, tur, birim, durumKod) {
    const t = d.dosyaAcilisTarihi && d.dosyaAcilisTarihi.date;
    return {
      key: `${d.birimId}|${d.dosyaNo}|${d.dosyaTurKod}`,
      dosyaId: d.dosyaId,
      dosyaNo: d.dosyaNo,
      birimAdi: d.birimAdi,
      birimId: d.birimId,
      dosyaTur: d.dosyaTur,
      dosyaTurKod: d.dosyaTurKod,
      durum: d.dosyaDurum || (durumKod ? 'Kapalı' : 'Açık'),
      sorguDurum: durumKod,
      yargiTuru: tur.kod,
      yargiTuruAdi: tur.ad,
      birimTuru2: birim.tablo,
      birimTuruAdi: birim.kod,
      acilis: t ? `${pad(t.day)}.${pad(t.month)}.${t.year}` : '',
      acilisTs: t ? Date.UTC(t.year, t.month - 1, t.day) : 0
    };
  }

  async function saveIndex(map) {
    if (job && job.lost) return;   // iş başka sekmeye geçtiyse onun indeksinin üzerine yazma
    await chrome.storage.local.set({ uhdIndex: { v: 2, updatedAt: Date.now(), records: [...map.values()] } });
  }

  async function fetchParties(dosyaId) {
    let res = await api('dosya_taraf_bilgileri_brd.ajx', { dosyaId });
    if (!Array.isArray(res)) {
      // UYAP'ın kendi penceresi önce işlem türlerini sorgular; gerekirse aynı sırayı izle.
      await api('dosya_islem_turleri_sorgula_brd.ajx', { dosyaId });
      await pace();
      res = await api('dosya_taraf_bilgileri_brd.ajx', { dosyaId });
    }
    if (!Array.isArray(res)) throw new Error('Taraf bilgisi okunamadı.');
    return res
      .map(p => ({
        adi: String(p.adi || '').trim(),
        rol: String(p.rol || '').trim(),
        // UYAP vekili "[AD SOYAD]" biçiminde verir; birden çok vekil olabilir.
        vekil: String(p.vekil || '').split(/[[\],;]+/).map(s => s.trim()).filter(Boolean)
      }))
      .filter(p => p.adi);
  }

  // UYAP'ın Evrak Getir ekranıyla aynı istek. Birden çok sayfa varsa hepsi (en çok EVRAK_PAGES) okunur.
  async function fetchEvraklar(dosyaId) {
    const ok = r => r && typeof r === 'object' && !Array.isArray(r) && (r.tumEvraklar || r.son20Evrak);
    let res = await api('list_dosya_evraklar.ajx', { dosyaId, pageNumber: 1 });
    if (!ok(res)) {
      // UYAP'ın kendi penceresi önce işlem türlerini sorgular; gerekirse aynı sırayı izle.
      await api('dosya_islem_turleri_sorgula_brd.ajx', { dosyaId });
      await pace();
      res = await api('list_dosya_evraklar.ajx', { dosyaId, pageNumber: 1 });
    }
    const { items, bad } = parseEvraklar(res);
    const pages = Math.min(Number(res.pageTotal) || 1, EVRAK_PAGES);
    let skipped = bad;
    for (let page = 2; page <= pages; page++) {
      checkStop();
      await pace();
      const more = parseEvraklar(await api('list_dosya_evraklar.ajx', { dosyaId, pageNumber: page }));
      items.push(...more.items);
      skipped += more.bad;
    }
    return { items, bad: skipped };
  }

  async function fetchDurusmalar() {
    const byId = new Map();
    const day = 86400000;
    const start = new Date();
    for (let w = 0; w < DURUSMA_GUN; w += 30) {
      checkStop();
      const from = new Date(start.getTime() + w * day);
      const to = new Date(start.getTime() + Math.min(w + 29, DURUSMA_GUN - 1) * day);
      const res = await api('avukat_durusma_sorgula_brd.ajx', { baslangicTarihi: uyapDate(from), bitisTarihi: uyapDate(to) });
      if (res != null && !Array.isArray(res)) throw new Error('Beklenmeyen duruşma yanıtı.');
      for (const x of res || []) {
        const d = parseDurusma(x);
        if (d) byId.set(d.id, d);
      }
      await pace();
    }
    const list = [...byId.values()];
    await chrome.storage.local.set({ uhdDurusmalar: { at: Date.now(), gun: DURUSMA_GUN, list } });
    return list.length;
  }

  // Öğeleri en çok n işçiyle işler; her işçi kendi içinde sırayla ve istekler arasında bekleyerek ilerler.
  // Bir işçi hata verirse (durdurma, oturum düşmesi) diğerleri elindeki isteği bitirip durur; hata hepsi
  // durduktan sonra atılır ki duraklatma kaydının üzerine sonradan ilerleme yazılmasın.
  async function pool(items, n, fn) {
    let next = 0, failed = null;
    const worker = async () => {
      while (!failed && next < items.length) {
        try {
          checkStop();
          await fn(items[next++]);
          await pace();
        } catch (e) {
          failed = failed || e;
        }
      }
    };
    await Promise.all(Array.from({ length: Math.min(n, items.length) }, worker));
    if (failed) throw failed;
  }

  // Ara kayıt: dosya sayısına değil süreye bağlı; tüm indeks yazıldığı ve açık paneller yeniden çizildiği için
  // binlerce dosyada her birkaç dosyada bir yazmak güncellemeyi ve paneli yavaşlatıyordu.
  let lastCheckpoint = 0;
  async function checkpoint(map, j) {
    if (Date.now() - lastCheckpoint < ARA_KAYIT_MS) return;
    lastCheckpoint = Date.now();
    await saveIndex(map);
    await saveJob(j);
  }

  async function saveJob(j) {
    const { uhdJob: cur } = await chrome.storage.local.get('uhdJob');
    if (cur && cur.id === j.id && !cur.stop) await chrome.storage.local.set({ uhdJob: j });
  }

  async function runUpdate(j) {
    const startedAt = j.startedAt;
    lastCheckpoint = Date.now();
    const st = j.stats = { added: 0, errors: 0, evrakErrors: 0, evrakBad: 0, failed: 0, ...(j.stats || {}) };
    let merged = null;
    try {
      const { uhdIndex, uhdPrefs } = await chrome.storage.local.get(['uhdIndex', 'uhdPrefs']);
      const evrakTakip = evrakTakipAcik(uhdPrefs, uhdIndex && uhdIndex.records);
      const safahatTakip = !!(uhdPrefs && uhdPrefs.safahatTakip);
      const old = new Map(((uhdIndex && uhdIndex.records) || []).map(r => [r.key, r]));

      if (j.listDone) {
        merged = old;
      } else {
        const found = new Map();
        const failed = new Set();

        // 1) Dosya listesi: her yargı türü × birim türü × açık/kapalı. Yarıda kalırsa baştan alınır (kısa sürer
        //    ve dosyaId'ler oturuma bağlı olabildiği için taze olmalı).
        for (const tur of TURLER) {
          checkStop();
          await setProgress({ running: true, phase: 'liste', text: `${tur.ad} birimleri alınıyor… (${found.size} dosya bulundu)` });
          let birimler;
          try { birimler = await api('yargiBirimleriSorgula_brd.ajx', { yargiTuru: tur.kod }); }
          catch (e) { if (e instanceof Fatal) throw e; failed.add(tur.kod + '|*'); continue; }
          if (!Array.isArray(birimler)) { failed.add(tur.kod + '|*'); continue; }
          await pace();

          for (const b of birimler) {
            for (const durumKod of [0, 1]) {
              checkStop();
              await setProgress({ running: true, phase: 'liste', text: `Dosyalar taranıyor: ${tur.ad} · ${b.kod} · ${durumKod ? 'kapalı' : 'açık'} (${found.size} dosya bulundu)` });
              try {
                for (let page = 1; page <= 200; page++) {
                  const res = await api('search_phrase_detayli.ajx', {
                    dosyaDurumKod: durumKod, pageSize: 500, pageNumber: page,
                    birimId: '', birimTuru2: b.tablo, birimTuru3: tur.kod
                  });
                  if (res == null) break;
                  if (!Array.isArray(res) || !Array.isArray(res[0])) throw new Error('Beklenmeyen sorgu yanıtı.');
                  for (const d of res[0]) {
                    const r = toRecord(d, tur, b, durumKod);
                    found.set(r.key, r);
                  }
                  const total = Number(res[1]) || 0;
                  if (res[0].length < 500 || page * 500 >= total) break;
                  await pace();
                }
              } catch (e) {
                if (e instanceof Fatal) throw e;
                failed.add(`${tur.kod}|${b.tablo}|${durumKod}`);
              }
              await pace();
            }
          }
        }
        checkStop();

        // 2) Eskiyle birleştir. Sorgusu hata veren gruptaki eski kayıtlar silinmez. Bu işte listelenen
        //    kayıtlar listJob ile işaretlenir; sonraki adımlar kaldığı yerden bunlara göre sürer.
        merged = new Map();
        let added = 0;
        for (const [k, r] of found) {
          const o = old.get(k);
          if (!o) added++;
          merged.set(k, {
            ...r,
            listJob: j.id,
            taraflar: o ? o.taraflar : null, tarafAt: o ? o.tarafAt : 0, tarafV: o ? o.tarafV : 0,
            evrakSeen: o ? o.evrakSeen : undefined, evrakAt: o ? o.evrakAt : 0, yeniEvrak: o ? o.yeniEvrak : undefined,
            sonEvrak: o ? o.sonEvrak : undefined, sonIslem: o ? o.sonIslem : undefined, islemAt: o ? o.islemAt : 0
          });
        }
        for (const [k, o] of old) {
          if (merged.has(k)) continue;
          if (failed.has(o.yargiTuru + '|*') || failed.has(`${o.yargiTuru}|${o.birimTuru2}|${o.sorguDurum}`)) merged.set(k, o);
        }
        // Oturum düşüp liste yeniden alındıysa ilk listelemedeki "yeni dosya" sayısı korunur.
        if (!st.listed) st.added = added;
        st.listed = true;
        st.failed = failed.size;
        j.listDone = true;
        await saveIndex(merged);
        await saveJob(j);
      }

      // 2b) Duruşmalar (UYAP'ın Duruşma Sorgula ekranının isteği): birkaç istek, bir kez.
      if (!j.durusmaDone) {
        checkStop();
        await setProgress({ running: true, phase: 'durusma', text: 'Duruşmalar alınıyor…' });
        try {
          st.durusma = await fetchDurusmalar();
        } catch (e) {
          if (e instanceof Fatal) throw e;
          st.durusmaErr = true;
          log('Duruşmalar alınamadı:', e.message);
        }
        j.durusmaDone = true;
        await saveJob(j);
      }

      // 3) Taraf adları: yeni dosyalar, vekil bilgisi olmayan eski kayıtlar (veya "Tümünü yenile"de bu işte
      //    henüz yenilenmemiş hepsi).
      const need = [...merged.values()].filter(r => j.full ? (r.tarafAt || 0) < startedAt : (!r.taraflar || r.tarafV !== TARAF_V));
      const phaseStart = Date.now();
      let done = 0, streak = 0;
      await pool(need, ESZAMANLI, async r => {
        try {
          r.taraflar = await fetchParties(r.dosyaId);
          r.tarafAt = Date.now();
          r.tarafV = TARAF_V;
          streak = 0;
        } catch (e) {
          if (e instanceof Fatal) throw e;
          st.errors++;
          if (++streak >= 8) throw new Fatal('Taraf bilgileri art arda alınamadı. UYAP oturumunu kontrol edip tekrar deneyin.');
        }
        done++;
        await checkpoint(merged, j);
        await setProgress({ running: true, phase: 'taraf', done, total: need.length, phaseStart, text: `Taraf bilgileri alınıyor: ${done}/${need.length}` });
      });
      await saveIndex(merged);

      // 4) Evrak takibi: yalnız açık ve bu işte listelenen dosyalar (dosyaId listelemeyle aynı oturumda geçerli).
      if (evrakTakip) {
        const eneed = [...merged.values()].filter(r => r.sorguDurum !== 1 && r.listJob === j.id && (r.evrakAt || 0) < startedAt);
        const ePhaseStart = Date.now();
        let eDone = 0, eStreak = 0;
        await pool(eneed, ESZAMANLI, async r => {
          try {
            const { items, bad } = await fetchEvraklar(r.dosyaId);
            const { seen, yeni } = diffEvrak(r.evrakSeen, items);
            r.evrakSeen = seen;
            r.evrakAt = Date.now();
            r.sonEvrak = sonEvrak(items);
            st.evrakBad += bad;
            if (yeni.length) {
              const at = Date.now();
              r.yeniEvrak = [...yeni.map(y => ({ ...y, at })), ...(r.yeniEvrak || [])].slice(0, YENI_MAX);
            }
            eStreak = 0;
          } catch (e) {
            if (e instanceof Fatal || e instanceof Stopped) throw e;
            st.evrakErrors++;
            if (++eStreak >= 8) throw new Fatal('Evrak listeleri art arda alınamadı. UYAP oturumunu kontrol edip tekrar deneyin.');
          }
          eDone++;
          await checkpoint(merged, j);
          await setProgress({ running: true, phase: 'evrak', done: eDone, total: eneed.length, phaseStart: ePhaseStart, text: `Yeni evraklar kontrol ediliyor: ${eDone}/${eneed.length}` });
        });
        await saveIndex(merged);
      }

      // 5) Son işlem (isteğe bağlı): açık dosyaların safahatından yalnız en yeni işlemin tarihi ve türü saklanır.
      if (safahatTakip) {
        const sneed = [...merged.values()].filter(r => r.sorguDurum !== 1 && r.listJob === j.id && (r.islemAt || 0) < startedAt);
        const sPhaseStart = Date.now();
        let sDone = 0, sStreak = 0;
        await pool(sneed, ESZAMANLI, async r => {
          try {
            r.sonIslem = sonIslemOf(parseSafahat(await api('dosya_safahat_bilgileri_brd.ajx', { dosyaId: r.dosyaId })));
            r.islemAt = Date.now();
            sStreak = 0;
          } catch (e) {
            if (e instanceof Fatal || e instanceof Stopped) throw e;
            st.islemErrors = (st.islemErrors || 0) + 1;
            if (++sStreak >= 8) throw new Fatal('Safahat bilgileri art arda alınamadı. UYAP oturumunu kontrol edip tekrar deneyin.');
          }
          sDone++;
          await checkpoint(merged, j);
          await setProgress({ running: true, phase: 'islem', done: sDone, total: sneed.length, phaseStart: sPhaseStart, text: `Son işlemler alınıyor: ${sDone}/${sneed.length}` });
        });
        await saveIndex(merged);
      }

      // Bu işte bulunan yeni evraklar (iş yarıda kalıp sürdürüldüyse önceki bölümlerdekiler de).
      let yeniEvrak = 0, yeniDosya = 0;
      for (const r of merged.values()) {
        const n = (r.yeniEvrak || []).filter(y => (y.at || 0) >= startedAt).length;
        if (n) { yeniEvrak += n; yeniDosya++; }
      }
      let summary = `Güncelleme tamamlandı: ${merged.size.toLocaleString('tr-TR')} dosya, ${st.added} yeni`;
      if (yeniEvrak) summary += `; ${yeniDosya} dosyada ${yeniEvrak} yeni evrak`;
      if (st.errors) summary += `, ${st.errors} dosyanın tarafları alınamadı`;
      if (st.evrakErrors) summary += `, ${st.evrakErrors} dosyanın evrakları alınamadı`;
      if (st.islemErrors) summary += `, ${st.islemErrors} dosyanın son işlemi alınamadı`;
      if (st.evrakBad) summary += `, ${st.evrakBad} evrakta kimlik/tarih eksik olduğu için karşılaştırılamadı`;
      if (st.failed) summary += `, ${st.failed} sorgu grubu hata verdi (eski kayıtlar korundu)`;
      if (st.durusma) summary += `; ${DURUSMA_GUN} gün içinde ${st.durusma} duruşma`;
      if (st.durusmaErr) summary += '; duruşmalar alınamadı (önceki liste korundu)';
      summary += '.';
      await chrome.storage.local.remove('uhdJob');
      await setProgress({ running: false, final: true, text: summary, endedAt: Date.now(), startedAt });
      toast(summary, 'ok', 6000);
    } catch (e) {
      if (invalidated(e)) {
        stopInvalidatedContext();
        return;
      }
      // Başka sekme devraldıysa (ör. sayfa geri getirildi) hiçbir şeye dokunmadan çekil.
      if (e instanceof Stopped && e.message === 'lost') return;
      if (merged) await saveIndex(merged).catch(() => {});
      if (e instanceof Stopped) {
        const { uhdJob: cur } = await chrome.storage.local.get('uhdJob');
        if (cur && cur.id === j.id) await chrome.storage.local.set({ uhdJob: { ...j, stop: false, paused: 'kullanici' } });
        const text = 'Güncelleme durduruldu; alınan bilgiler saklandı. “Sürdür” ile kaldığı yerden devam edebilir ya da “İptal et” ile bırakabilirsiniz.';
        await setProgress({ running: false, paused: true, text, endedAt: Date.now(), startedAt });
        toast('Güncelleme durduruldu; “Sürdür” ile kaldığı yerden devam edebilirsiniz.', '', 6000);
        return;
      }
      // Oturum düşmesi ve benzeri: iş saklanır; yeniden girişte (sayfa yüklenince) kaldığı yerden sürer.
      const reason = String(e.message || e).replace(/\s*(Yeniden giriş yapıp|UYAP oturumunu kontrol edip) tekrar deneyin\.$/, '');
      await saveJob({ ...j, paused: 'oturum' }).catch(() => {});
      const text = `Güncelleme duraklatıldı: ${reason} UYAP’a yeniden girdiğinizde kaldığı yerden sürer.`;
      await setProgress({ running: false, paused: true, error: true, text, endedAt: Date.now(), startedAt });
      toast(text, 'err', 0);
    }
  }

  // ---------------------------------------------------------------- Dosya açma (düğme bulma)

  let opening = false;

  function spaPush(path) {
    const st = history.state || {};
    const idx = typeof st.idx === 'number' ? st.idx + 1 : 0;
    history.pushState({ usr: null, key: Math.random().toString(36).slice(2, 10), idx }, '', path);
    window.dispatchEvent(new PopStateEvent('popstate', { state: history.state }));
  }

  function setInputValue(input, value) {
    const setter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value').set;
    input.focus();
    setter.call(input, value);
    input.dispatchEvent(new Event('input', { bubbles: true }));
    input.dispatchEvent(new KeyboardEvent('keyup', { bubbles: true, key: 'Unidentified' }));
    input.dispatchEvent(new Event('change', { bubbles: true }));
  }

  function alertText() {
    const p = document.querySelector('.swal2-popup');
    if (!visible(p)) return '';
    const t = p.querySelector('.swal2-html-container, .swal2-title');
    return (t ? t.innerText : p.innerText).trim();
  }

  function findButton(text) {
    const want = norm(text);
    return [...document.querySelectorAll('.dx-button')].find(b =>
      visible(b) && (norm(b.getAttribute('aria-label') || '') === want || norm(b.textContent.trim()) === want));
  }

  function detayliToggle() {
    return [...document.querySelectorAll('button')].find(b => visible(b) && /Detayl[ıi] Sorgulama/i.test(b.textContent));
  }

  const onFormPage = () => location.pathname === '/dosya-sorgulama';

  async function gotoForm(path, fresh) {
    if (!fresh) {
      if (onFormPage()) {
        // Form ancak yeniden oluşturulunca adres parametrelerini okur: boş bir sayfaya geçip geri dön.
        spaPush('/uhd-gecis');
        await waitFor(() => !document.getElementById('yargiTur') && !document.getElementById('table-dosya-sorgulama'), 3000).catch(() => {});
        await sleep(60);
      }
      spaPush(path);
    }
    const ok = await waitFor(() => onFormPage() && (document.getElementById('yargiTur') || detayliToggle()), 15000).catch(() => null);
    if (!ok) return false;
    if (!document.getElementById('yargiTur')) {
      detayliToggle().click();
      await waitFor(() => document.getElementById('yargiTur'), 6000, 'Detaylı sorgulama formu açılamadı.');
    }
    return true;
  }

  function listItems(input) {
    const id = input.getAttribute('aria-controls') || input.getAttribute('aria-owns');
    const scope = id && document.getElementById(id);
    const items = scope ? scope.querySelectorAll('.dx-list-item') : document.querySelectorAll('.dx-overlay-wrapper .dx-list-item');
    return [...items].filter(visible);
  }

  async function setSelect(id, text, prefillWait) {
    const want = norm(text);
    const read = () => norm((document.getElementById(id) || {}).value || '');
    const input = await waitFor(() => document.getElementById(id), 8000, `“${id}” alanı bulunamadı.`);
    // Adres parametreleriyle gelen değer, seçenek listesi yüklenince görünür.
    if (await waitFor(() => read() === want, prefillWait).then(() => true, () => false)) return;

    const box = input.closest('.dx-dropdowneditor') || input.parentElement;
    input.click();
    let opened = await waitFor(() => listItems(input).length, 2500).catch(() => 0);
    if (!opened) {
      const btn = box && box.querySelector('.dx-dropdowneditor-button');
      if (btn) btn.click();
      opened = await waitFor(() => listItems(input).length, 4000).catch(() => 0);
    }
    let item = opened && listItems(input).find(li => norm(li.textContent.trim()) === want);
    if (!item) {
      setInputValue(input, text);
      item = await waitFor(() => listItems(input).find(li => norm(li.textContent.trim()) === want), 5000).catch(() => null);
    }
    if (!item) {
      input.dispatchEvent(new KeyboardEvent('keydown', { bubbles: true, key: 'Escape' }));
      throw new Error(`UYAP formunda “${text}” seçeneği bulunamadı.`);
    }
    item.click();
    await waitFor(() => read() === want, 4000, `UYAP formunda “${text}” seçilemedi.`);
  }

  async function setSwitch(on) {
    const sw = document.getElementById('dosya-durumu-detayli-arama');
    if (!sw) return;
    const isOn = () => sw.classList.contains('dx-switch-on-value') || sw.getAttribute('aria-checked') === 'true';
    if (isOn() === on) return;
    sw.click();
    await waitFor(() => isOn() === on, 3000, 'Dosya durumu (açık/kapalı) değiştirilemedi.');
    await sleep(250);
  }

  async function ensureForm(rec) {
    await setSelect('yargiTur', rec.yargiTuruAdi, 2000);
    const birim = await waitFor(() => document.getElementById('yargiBirim'), 4000).catch(() => null);
    if (birim) await setSelect('yargiBirim', rec.birimTuruAdi, 6000);
    await setSwitch(rec.sorguDurum !== 1);
  }

  const log = (...a) => console.info('[Legaluga]', ...a);

  // Sonuç tablosu: kimliğiyle; bulunamazsa pencere içinde olmayan ve "Pencere Görünümü" düğmesi ya da
  // "Dosya No"/"Dosya Görüntüle" başlığı taşıyan tablo. Dar ekranda sütunlar gizlenip başlıktan kaybolabilir.
  function gridEl() {
    const byId = document.getElementById('table-dosya-sorgulama');
    if (byId) return byId;
    return [...document.querySelectorAll('.dx-datagrid')].find(g => {
      if (g.closest('.dx-overlay-content')) return false;
      const head = norm((g.querySelector('.dx-datagrid-headers') || {}).textContent || '');
      return head.includes('dosya no') || head.includes('dosya goruntule') || !!g.querySelector(EYE);
    }) || null;
  }
  const dataRows = () => { const g = gridEl(); return g ? [...g.querySelectorAll('.dx-datagrid-rowsview tr.dx-data-row')] : []; };
  const freshRows = () => dataRows().filter(tr => !tr.dataset.uhdOld);

  // "Pencere Görünümü" düğmesi: UYAP bunu aria-label ile işaretler; id ikinci yol.
  const EYE = '[aria-label="Pencere Görünümü"], [id="dosya-goruntule"]';
  const findEye = scope => scope ? [...scope.querySelectorAll(EYE)].find(visible) || null : null;

  async function waitIdle(btn) {
    await waitFor(() => /Sorgulan/i.test(btn.textContent) || alertText(), 2500).catch(() => {});
    await waitFor(() => {
      const a = alertText();
      if (a) throw new Error(`UYAP: ${a}`);
      return !/Sorgulan/i.test(btn.textContent) && !btn.classList.contains('dx-state-disabled');
    }, 60000, 'UYAP sorgusu zaman aşımına uğradı.');
  }

  async function runQuery() {
    const btn = findButton('Sorgula');
    if (!btn) throw new Error('“Sorgula” düğmesi bulunamadı.');
    dataRows().forEach(tr => { tr.dataset.uhdOld = '1'; });
    btn.click();
    await waitIdle(btn);
    await waitFor(() => freshRows().length, 4000).catch(() => {});
    return btn;
  }

  // Hücre metni: satır sonları ve fazla boşluklar tek boşluğa indirilir.
  const cellText = td => norm((td.textContent || '').replace(/\s+/g, ' ').trim());

  function findRow(rec) {
    const g = gridEl();
    if (!g) return null;
    const wantNo = norm(rec.dosyaNo);
    const wantBirim = norm(rec.birimAdi);
    const main = [...g.querySelectorAll('.dx-datagrid-rowsview .dx-datagrid-content:not(.dx-datagrid-content-fixed) tr.dx-data-row')];
    const fixed = [...g.querySelectorAll('.dx-datagrid-rowsview .dx-datagrid-content-fixed tr.dx-data-row')];
    const cand = main
      .map((tr, i) => ({ tr, i, cells: [...tr.cells].map(cellText) }))
      .filter(x => x.cells.some(c => c === wantNo || c.split(' ').includes(wantNo)));
    const hit = cand.find(x => x.cells.some(c => c.includes(wantBirim))) || (cand.length === 1 ? cand[0] : null);
    if (!hit) return null;
    const ri = hit.tr.getAttribute('aria-rowindex');
    const twin = (ri && fixed.find(f => f.getAttribute('aria-rowindex') === ri)) || fixed[hit.i] || null;
    return { tr: hit.tr, twin };
  }

  // Satırdaki düğme; eski sürümlerde sağa sabitli sütunun ayrı tablo kopyasında da olabilir.
  function locate(rec) {
    const row = findRow(rec);
    return row ? (findEye(row.tr) || findEye(row.twin)) : null;
  }

  // Dar ekranda UYAP tablosu sütun gizler: düğme, satırın "…" ile açılan ayrıntı satırına taşınır.
  async function locateAdaptive(rec) {
    const row = findRow(rec);
    if (!row) return null;
    const more = row.tr.querySelector('.dx-datagrid-adaptive-more') || (row.twin && row.twin.querySelector('.dx-datagrid-adaptive-more'));
    if (!visible(more)) return null;
    log('Sütunlar gizli; satır ayrıntısı açılıyor.');
    more.click();
    const detail = await waitFor(() => {
      const next = row.tr.nextElementSibling;
      return next && next.classList.contains('dx-adaptive-detail-row') ? next : null;
    }, 3000).catch(() => null);
    return findEye(detail);
  }

  const firstRowSig = () => {
    const tr = dataRows()[0];
    return tr ? tr.innerText : '';
  };

  async function locateOnGrid(rec) {
    let btn = locate(rec) || await locateAdaptive(rec);
    if (btn) return btn;
    const g = gridEl();
    if (!g) return null;
    const sp = g.querySelector('.dx-datagrid-search-panel input');
    if (sp) {
      log('Tablo araması:', rec.dosyaNo);
      setInputValue(sp, rec.dosyaNo);
      if (await waitFor(() => findRow(rec), 5000).catch(() => null)) {
        btn = locate(rec) || await locateAdaptive(rec);
        if (btn) return btn;
      }
    }
    // DevExtreme sürümüne göre pasif "sonraki" düğmesi dx-button-disable ya da dx-state-disabled taşır.
    const nextDisabled = b => b.classList.contains('dx-button-disable') || b.classList.contains('dx-state-disabled') ||
      b.getAttribute('aria-disabled') === 'true';
    for (let i = 0; i < 200; i++) {
      const next = g.querySelector('.dx-next-button');
      if (!visible(next) || nextDisabled(next)) break;
      const sig = firstRowSig();
      next.click();
      // Sayfa değişmediyse son sayfadayız: boşuna tekrar tıklama.
      if (!(await waitFor(() => firstRowSig() !== sig, 5000).catch(() => false))) break;
      btn = locate(rec) || await locateAdaptive(rec);
      if (btn) return btn;
    }
    return null;
  }

  // Açılamadığında nedenini anlamak için tablonun özeti (kişisel veri içermez: yalnızca sayılar ve sınıflar).
  function gridDiagnosis(rec) {
    const g = gridEl();
    if (!g) return 'sonuç tablosu bulunamadı';
    const rows = dataRows();
    const row = findRow(rec);
    const eyes = g.querySelectorAll(EYE).length;
    return `tablo=${g.id || 'kimliksiz'}, satır=${rows.length}, eşleşen satır=${row ? 'var' : 'yok'}, görüntüle düğmesi=${eyes}`;
  }

  function moreLink() {
    const all = [...document.querySelectorAll('#content-div2 *')].filter(e => /Devam[ıi]n[ıi] Getir/.test(e.textContent) && visible(e));
    return all[all.length - 1] || null;
  }

  // Dosya penceresinde istenen sekmeye (Evrak / Taraf bilgileri) geç; sekme yoksa hiçbir şeye basma.
  async function gotoTab(rec) {
    const { uhdPrefs } = await chrome.storage.local.get('uhdPrefs');
    const want = uhdPrefs && uhdPrefs.acilisSekme;
    if (!want || want === 'yok') return;
    const words = want === 'evrak' ? ['evrak'] : ['taraf bilgi', 'taraflar'];
    const find = () => {
      const pop = document.querySelector('.dosya-sorgula-popup .dx-overlay-content') ||
        [...document.querySelectorAll('.dx-overlay-content')].find(e => visible(e) && e.innerText.includes(rec.dosyaNo));
      if (!pop) return null;
      return [...pop.querySelectorAll('[role="tab"], .dx-tab, .nav-link, .nav-item a, button')]
        .find(e => visible(e) && e.innerText.trim().length < 40 && words.some(w => norm(e.innerText.trim()).startsWith(w))) || null;
    };
    try {
      const tab = await waitFor(find, 5000, 'yok');
      log('Sekmeye geçiliyor:', tab.innerText.trim());
      tab.click();
    } catch {
      log('İstenen sekme bu dosyada yok; hiçbir şeye basılmadı.');
    }
  }

  async function openFile(rec, fresh) {
    if (opening) { toast('Önceki dosya hâlâ açılıyor…', '', 3000); return false; }
    opening = true;
    hidePanel();
    const title = `${rec.dosyaNo} · ${rec.birimAdi}`;
    const step = (n, text) => log(`${n}/4`, text) || toast(`${title}\n${n}/4 · ${text}`, 'busy');
    try {
      step(1, 'Dosya Sorgulama ekranı açılıyor…');
      const path = openPath(rec);
      if (!(await gotoForm(path, fresh))) {
        if (job || fresh) throw new Error('Dosya Sorgulama ekranı açılamadı.');
        await chrome.storage.local.set({ uhdPending: { record: rec, at: Date.now() } });
        location.assign(path);
        return false;
      }
      step(2, 'Form dolduruluyor…');
      await ensureForm(rec);
      step(3, 'UYAP’ta sorgulanıyor…');
      const btnQuery = await runQuery();
      const hadRows = freshRows().length > 0;
      step(4, 'Dosya sonuçlarda aranıyor…');
      let btn = await locateOnGrid(rec);
      for (let n = 0; !btn && n < 30; n++) {
        const more = moreLink();
        if (!more) break;
        more.click();
        await waitIdle(btnQuery);
        btn = await locateOnGrid(rec);
      }
      if (!btn) {
        const why = gridDiagnosis(rec);
        log('Düğme bulunamadı:', why);
        throw new Error((hadRows
          ? 'Dosya UYAP sonuçlarında bulunamadı. Dosya durumu değişmiş olabilir; indeksi güncelleyin.'
          : 'UYAP bu sorguda sonuç döndürmedi. İndeksi güncelleyin.') + ` (${why})`);
      }
      log('Pencere Görünümü düğmesine basılıyor.');
      btn.scrollIntoView({ block: 'center' });
      btn.click();
      await waitFor(() => {
        const pop = document.querySelector('.dosya-sorgula-popup .dx-overlay-content');
        return visible(pop) || [...document.querySelectorAll('.dx-overlay-content')].some(e => visible(e) && e.innerText.includes(rec.dosyaNo));
      }, 10000, 'Dosya penceresi açılmadı.');
      toast(`${rec.dosyaNo} açıldı.`, 'ok', 2500);
      gotoTab(rec);
      return true;
    } catch (e) {
      log('Dosya açılamadı:', e.message);
      toast(`${title}\nDosya açılamadı: ${e.message}`, 'err', 0, { label: 'Tekrar dene', fn: () => openFile(rec) });
      return false;
    } finally {
      opening = false;
    }
  }

  // ---------------------------------------------------------------- Sayfa içi panel ve bildirim

  const { el, mountUI, BRAND } = globalThis.UHD;
  const PAGE_CSS = `
:host{--shell-bg:#fff;--shell-soft:#f5f7fb;--shell-text:#1d2939;--shell-muted:#667085;--shell-line:#e3e8f2;--shell-accent:${BRAND.primary};--shell-warn-bg:#fff4e5;--shell-warn-text:#7a4b00;--shell-error:#b42318}
:host([data-theme=dark]){--shell-bg:#18222d;--shell-soft:#0f1720;--shell-text:#e6edf3;--shell-muted:#a8b5c3;--shell-line:#3a4756;--shell-accent:#7fd6cc;--shell-warn-bg:#33270f;--shell-warn-text:#f5c26b;--shell-error:#f97066;color-scheme:dark}
.launch{position:fixed;right:0;top:50%;transform:translateY(-50%);writing-mode:vertical-rl;background:${BRAND.primary};color:#fff;border:0;
  border-radius:12px 0 0 12px;padding:16px 10px;min-width:40px;min-height:104px;font:600 12px "Segoe UI",system-ui,sans-serif;cursor:pointer;box-shadow:0 4px 16px rgba(16,75,73,.24);z-index:1;transition:background .15s,box-shadow .15s}
.launch:hover{background:${BRAND.primaryDark};box-shadow:0 6px 20px rgba(16,75,73,.32)}
.launch[aria-expanded=true]{visibility:hidden}
.panel{position:fixed;top:0;right:0;height:100vh;height:100dvh;width:var(--dock-width,min(480px,100vw));box-shadow:-8px 0 36px rgba(0,0,0,.2);z-index:2;overscroll-behavior:contain}
.panel .panel-pin{display:inline-flex;align-items:center;justify-content:center;flex:none;width:32px;height:32px;padding:7px;border:1px solid transparent;border-radius:9px;background:transparent;color:var(--muted);cursor:pointer}
.panel .panel-pin svg{width:16px;height:16px;fill:none;stroke:currentColor;stroke-width:1.8;stroke-linecap:round;stroke-linejoin:round}
.panel .panel-pin:hover,.panel .panel-pin[aria-pressed=true]{background:var(--soft);border-color:var(--bord);color:var(--accent-text)}
.panel .panel-pin:disabled{opacity:.55;cursor:wait}
.launch:focus-visible,.toast button:focus-visible,.announcement button:focus-visible,.viewer :is(button,a):focus-visible{outline:3px solid ${BRAND.focus};outline-offset:3px}
.notifications{position:fixed;right:16px;bottom:16px;width:max-content;max-width:min(440px,calc(100vw - 32px));z-index:3;display:flex;flex-direction:column;align-items:flex-end;gap:8px;pointer-events:none}
.notifications>*{pointer-events:auto;max-width:100%;box-sizing:border-box}
.toast{background:#1d2939;color:#fff;padding:10px 12px 10px 14px;border-radius:10px;
  width:max-content;font:13px/1.45 "Segoe UI",system-ui,sans-serif;box-shadow:0 6px 24px rgba(0,0,0,.25);display:flex;gap:10px;align-items:center}
.toast .msg{white-space:pre-line;flex:1;min-width:0;overflow-wrap:anywhere}
.toast.busy .msg::before{content:"";display:inline-block;width:10px;height:10px;margin-right:7px;border:2px solid rgba(255,255,255,.35);
  border-top-color:#fff;border-radius:50%;animation:uhdspin .8s linear infinite;vertical-align:-1px}
@keyframes uhdspin{to{transform:rotate(360deg)}}
.toast button{flex:none;min-height:32px;border:1px solid rgba(255,255,255,.6);background:none;color:#fff;border-radius:7px;padding:4px 10px;font:inherit;font-size:12px;cursor:pointer}
.toast button:hover{background:rgba(255,255,255,.12)}
.toast button.close{border:0;font-size:20px;line-height:1;min-width:32px;padding:4px;opacity:.9}
.toast.err{background:#8a1f17}.toast.ok{background:#12805c}
.panel:not([hidden]) ~ .notifications{right:calc(var(--dock-width,480px) + 16px);max-width:min(440px,calc(100vw - var(--dock-width,480px) - 32px))}
@media(max-width:800px){.panel:not([hidden]) ~ .notifications{right:12px;bottom:80px;max-width:calc(100vw - 24px)}.notifications{right:12px;bottom:12px;max-width:calc(100vw - 24px)}}
:host([data-dock=bottom]) .panel{top:auto;bottom:0;width:100vw;height:var(--dock-height);box-shadow:0 -8px 36px rgba(0,0,0,.2)}
:host([data-dock=bottom]) .panel:not([hidden]) ~ .notifications{right:12px;bottom:calc(var(--dock-height) + 12px);max-width:calc(100vw - 24px)}
.announcement{width:320px;display:flex;align-items:center;gap:4px;padding:8px;border:1px solid var(--shell-line);border-left:3px solid var(--shell-accent);border-radius:12px;background:var(--shell-bg);color:var(--shell-text);box-shadow:0 6px 24px #0002;font:12px/1.45 "Segoe UI",system-ui,sans-serif}
.announcement .read{display:block;min-width:0;flex:1;border:0;background:none;color:inherit;text-align:left;padding:2px 6px;font:inherit;cursor:pointer}
.announcement strong{display:block;color:var(--shell-accent);font-size:12px}
.announcement .preview{display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;overflow:hidden;overflow-wrap:anywhere;color:var(--shell-muted);margin-top:2px}
.announcement .close{flex:none;width:30px;height:30px;border:0;border-radius:7px;background:none;color:var(--shell-muted);font-size:20px;cursor:pointer}
.announcement button:hover{background:var(--shell-soft);border-radius:7px}
.viewer.announcement-viewer .box{width:min(720px,96vw);height:auto;max-height:88vh;max-height:88dvh}
.announcement-body{min-height:0;overflow:auto;overscroll-behavior:contain;padding:20px;line-height:1.65;overflow-wrap:anywhere}
.announcement-body img{max-width:100%;height:auto}.announcement-body a[href]{color:var(--shell-accent);text-decoration:underline}
.announcement-body :is(h1,h2,h3){line-height:1.35}.announcement-body table{display:block;max-width:100%;overflow:auto;border-collapse:collapse}
.announcement-body :is(td,th){border:1px solid var(--shell-line);padding:6px}
@media(prefers-reduced-motion:reduce){.launch{transition:none}.toast.busy .msg::before{animation:none}}
.viewer{position:fixed;inset:0;background:rgba(16,24,40,.55);z-index:4;display:flex;align-items:center;justify-content:center}
.viewer .box{background:var(--shell-bg);width:min(1000px,96vw);height:92vh;height:92dvh;border-radius:16px;display:flex;flex-direction:column;overflow:hidden;box-shadow:0 20px 50px rgba(0,0,0,.35);font:13px/1.4 "Segoe UI",system-ui,sans-serif;color:var(--shell-text)}
.viewer .bar{display:flex;gap:10px;align-items:center;padding:10px 12px;background:${BRAND.primary};color:#fff;flex-wrap:wrap}
.viewer .bar b{flex:1;font-size:14px;font-weight:600;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.viewer .bar a,.viewer .bar button{color:#fff;border:1px solid rgba(255,255,255,.6);background:none;border-radius:6px;padding:8px 10px;font:inherit;cursor:pointer;text-decoration:none}
.viewer iframe{flex:1;border:0;width:100%}
.viewer .msg{padding:28px;color:var(--shell-text)}
.viewer .dp-tabs{display:flex;gap:4px;padding:8px 12px 0;border-bottom:1px solid var(--shell-line);background:var(--shell-soft)}
.viewer .dp-tab{border:1px solid transparent;border-bottom:0;background:none;border-radius:8px 8px 0 0;padding:8px 12px;font:inherit;cursor:pointer;color:var(--shell-text)}
.viewer .dp-tab.on{background:var(--shell-bg);border-color:var(--shell-line);color:var(--shell-accent);font-weight:600;margin-bottom:-1px}
.viewer .dp-body{flex:1;overflow:auto;overscroll-behavior:contain;padding:12px 14px;background:var(--shell-bg)}
.viewer .dp-muted{color:var(--shell-muted);font-size:12px;margin:6px 0}
.viewer .dp-err{color:var(--shell-error);margin:6px 0}
.viewer .dp-warn{padding:8px 10px;border-radius:8px;background:var(--shell-warn-bg);color:var(--shell-warn-text);font-size:12px;margin-bottom:8px}
.viewer .dp-bakiye{font-size:12px;color:var(--shell-text);margin-bottom:8px}
.viewer .dp-grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(240px,1fr));gap:10px}
.viewer .dp-card{border:1px solid var(--shell-line);border-radius:10px;padding:10px 12px}
.viewer .dp-card h4,.viewer .dp-res h4{margin:0 0 6px;font-size:13px}
.viewer .dp-card div{margin:2px 0}
.viewer .dp-k{color:var(--shell-muted)}
.viewer .dp-strong{font-weight:700}
.viewer .dp-check{display:flex;gap:6px;align-items:center;margin:3px 0;cursor:pointer}
.viewer .dp-actions{margin:10px 0}
.viewer .dp-go{border:0;background:${BRAND.primary};color:#fff;border-radius:8px;padding:8px 14px;font:inherit;font-weight:600;cursor:pointer}
.viewer .dp-go:disabled{opacity:.5;cursor:default}
.viewer .dp-res{border-top:1px solid var(--shell-line);padding:8px 0}
.viewer .dp-tablewrap{overflow:auto;max-width:100%}
.viewer .dp-table{border-collapse:collapse;font-size:12px;width:100%}
.viewer .dp-table th,.viewer .dp-table td{border:1px solid var(--shell-line);padding:4px 6px;text-align:left;vertical-align:top}
.viewer .dp-table th{background:var(--shell-soft);font-weight:600}
.viewer .dp-table td.nw{white-space:nowrap}
.viewer .dp-kv div{margin:2px 0}
.viewer .dp-sub{margin:6px 0;padding-left:8px;border-left:2px solid var(--shell-line)}
.viewer .dp-more{margin-top:10px;font-size:12px}
[hidden]{display:none!important}
`;
  let panel, ui, launch, pinButton, toastEl, toastTimer, shadowRoot, focusBeforePanel, announcementEl;
  let pagePrefs = {}, toastRemaining = 0, toastStarted = 0;
  const pageDarkMq = window.matchMedia ? window.matchMedia('(prefers-color-scheme: dark)') : null;

  // Geçici stil kaldırılınca UYAP'ın kuralları aynen geri gelir; inline stillerine
  // veya uygulamanın DOM yapısına dokunmadan panel için ayrı alan açılır.
  let dockStyle, dockObserver, dockFrame = 0, dockTimer = 0;
  const dockFixed = new Map();
  const DOCK_FIXED_ATTR = 'data-legaluga-dock-fixed';

  function viewportFixed(node) {
    if (getComputedStyle(node).position !== 'fixed' || !node.getClientRects().length) return false;
    for (let parent = node.parentElement; parent && parent !== document.documentElement; parent = parent.parentElement) {
      const css = getComputedStyle(parent);
      // Bunlar zaten kendi kapsayıcısıyla ölçeklenir; ikinci kez düzeltmeyiz.
      if (css.transform !== 'none' || css.translate !== 'none' || css.rotate !== 'none' || css.scale !== 'none' ||
          css.perspective !== 'none' || css.filter !== 'none' || /(?:layout|paint|strict|content)/.test(css.contain) ||
          /(?:transform|translate|scale|rotate|filter|perspective)/.test(css.willChange)) return false;
    }
    return true;
  }

  function fitPageBesidePanel() {
    dockFrame = 0;
    if (!panel || panel.hidden || !document.body) return;
    // Ölçüleri özgün sayfadan al; aynı kare içinde yeni stil yerleşir.
    if (dockStyle) dockStyle.remove();
    const width = window.innerWidth, height = window.innerHeight;
    const stacked = width < 800;
    const panelWidth = stacked ? width : Math.min(480, Math.max(320, Math.round(width * .30)));
    const panelHeight = stacked ? Math.min(Math.round(height * .60), Math.max(240, height - 160)) : height;
    const availableWidth = stacked ? width : width - panelWidth;
    const availableHeight = stacked ? height - panelHeight : height;
    const ratio = availableWidth / width;
    const bodyCss = getComputedStyle(document.body);
    const zoom = (Number.parseFloat(bodyCss.zoom) || 1) * ratio;
    const host = shadowRoot.host;
    host.dataset.dock = stacked ? 'bottom' : 'side';
    host.style.setProperty('--dock-width', panelWidth + 'px');
    host.style.setProperty('--dock-height', panelHeight + 'px');
    const rules = [
      `html{overflow-x:hidden!important;${stacked ? 'overflow-y:hidden!important;' : ''}}`,
      `body{zoom:${zoom}!important;width:${bodyCss.width}!important;max-width:none!important;min-width:0!important;` +
        `min-height:${availableHeight / zoom}px!important;` +
        (stacked ? `height:${availableHeight / zoom}px!important;max-height:${availableHeight / zoom}px!important;overflow:auto!important;` :
          (bodyCss.overflowY !== 'visible' && document.body.getBoundingClientRect().height <= height + 1 ? `height:${availableHeight / zoom}px!important;` : '')) + '}'
    ];
    // Zoom tek başına viewport'a bağlı right:0 başlığı sağda bırakır.
    // Özgün yatay ölçülerini sabitleriz; dikey fixed davranışı sürer.
    for (const node of document.body.querySelectorAll('*')) {
      if (!viewportFixed(node)) continue;
      const css = getComputedStyle(node);
      if (!dockFixed.has(node)) dockFixed.set(node, { original: node.getAttribute(DOCK_FIXED_ATTR), id: String(dockFixed.size + 1) });
      const { id } = dockFixed.get(node);
      node.setAttribute(DOCK_FIXED_ATTR, id);
      const bottom = stacked && css.bottom !== 'auto' ? `bottom:calc(${css.bottom} + ${panelHeight / zoom}px)!important;` : '';
      rules.push(`[${DOCK_FIXED_ATTR}="${id}"]{left:${css.left}!important;right:auto!important;width:${css.width}!important;max-width:${availableWidth / zoom}px!important;${bottom}}`);
    }
    if (!dockStyle) dockStyle = document.createElement('style');
    dockStyle.textContent = rules.join('\n');
    document.documentElement.append(dockStyle);
  }

  function schedulePanelFit() {
    if (!panel || panel.hidden || dockFrame) return;
    dockFrame = requestAnimationFrame(fitPageBesidePanel);
  }

  function startPanelDock() {
    fitPageBesidePanel();
    window.addEventListener('resize', schedulePanelFit);
    if (!dockObserver) dockObserver = new MutationObserver(() => {
      clearTimeout(dockTimer);
      dockTimer = setTimeout(schedulePanelFit, 120);
    });
    dockObserver.observe(document.body, { childList: true, subtree: true, attributes: true, attributeFilter: ['class', 'style', 'hidden'] });
  }

  function stopPanelDock() {
    window.removeEventListener('resize', schedulePanelFit);
    if (dockObserver) dockObserver.disconnect();
    clearTimeout(dockTimer);
    if (dockFrame) cancelAnimationFrame(dockFrame);
    dockFrame = 0;
    if (dockStyle) dockStyle.remove();
    for (const [node, { original }] of dockFixed) {
      if (original === null) node.removeAttribute(DOCK_FIXED_ATTR);
      else node.setAttribute(DOCK_FIXED_ATTR, original);
    }
    dockFixed.clear();
    if (shadowRoot) {
      delete shadowRoot.host.dataset.dock;
      shadowRoot.host.style.removeProperty('--dock-width');
      shadowRoot.host.style.removeProperty('--dock-height');
    }
  }

  function applyPagePrefs(prefs) {
    pagePrefs = prefs || {};
    if (toastEl && pagePrefs.durusmaBildirim === false && toastEl.dataset.source === 'durusma') dismissToast();
    const theme = pagePrefs.tema || 'auto';
    if (shadowRoot) shadowRoot.host.dataset.theme = theme === 'auto' ? (pageDarkMq && pageDarkMq.matches ? 'dark' : 'light') : theme;
    if (pinButton) {
      const pinned = !!pagePrefs.panelSabit;
      const label = pinned ? 'Panel sabit. Sabitlemeyi kaldır' : 'Paneli sabitle: UYAP’a tıklayınca açık kalsın';
      pinButton.setAttribute('aria-pressed', String(pinned));
      pinButton.setAttribute('aria-label', label);
      pinButton.title = label;
    }
  }

  function mountPage() {
    const host = document.createElement('div');
    host.id = 'uhd-host';
    host.style.cssText = 'all:initial;position:fixed;top:0;left:0;width:0;height:0;z-index:2147483646';
    document.documentElement.append(host);
    const shadow = host.attachShadow({ mode: 'closed' }); // UYAP sayfasındaki betikler panel içeriğini okuyamaz
    launch = el('button', { class: 'launch', type: 'button', title: BRAND.name + ' · Dosyalarınızda ara', 'aria-label': BRAND.name + ' panelini aç', 'aria-expanded': 'false', 'aria-controls': 'legaluga-search-panel' }, 'Dosya Ara');
    panel = el('div', { class: 'panel', id: 'legaluga-search-panel', role: 'dialog', 'aria-label': BRAND.name, 'aria-modal': 'false', hidden: true });
    toastEl = el('div', { class: 'toast', role: 'status', 'aria-live': 'polite', 'aria-atomic': 'true', hidden: true });
    announcementEl = el('div', { class: 'announcement', role: 'status', 'aria-live': 'polite', hidden: true });
    shadow.append(el('style', null, PAGE_CSS), launch, panel, el('div', { class: 'notifications' }, toastEl, announcementEl));
    shadowRoot = shadow;
    ui = mountUI(panel, {
      mode: 'page',
      onOpen: r => openFile(r),
      onOpenEvrak: (r, k) => openEvrak(r, k),
      onDosyaPanel: (r, tab) => openDosyaPanel(r, tab),
      onUpdate: async full => {
        const res = await startUpdate(full);
        if (!res.ok) ui.setNotice(res.error, 'err');
      },
      onStop: () => stopUpdate(),
      onClose: () => hidePanel(true)
    });
    pinButton = el('button', { class: 'panel-pin', type: 'button', 'aria-pressed': 'false' });
    const pinIcon = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    pinIcon.setAttribute('viewBox', '0 0 24 24');
    pinIcon.setAttribute('aria-hidden', 'true');
    const pinPath = document.createElementNS('http://www.w3.org/2000/svg', 'path');
    pinPath.setAttribute('d', 'M16 3 21 8 17 9 13 13 12 17 7 12 11 11 15 7Z M7 17 3 21');
    pinIcon.append(pinPath);
    pinButton.append(pinIcon);
    const header = ui.root.querySelector('header');
    if (header) header.insertBefore(pinButton, header.querySelector('.x'));
    pinButton.addEventListener('click', async () => {
      pinButton.disabled = true;
      try {
        const { uhdPrefs } = await chrome.storage.local.get('uhdPrefs');
        const next = { ...(uhdPrefs || {}), panelSabit: !pagePrefs.panelSabit };
        await chrome.storage.local.set({ uhdPrefs: next });
        applyPagePrefs(next);
      } catch (error) {
        if (invalidated(error)) stopInvalidatedContext();
        else toast('Panel tercihi kaydedilemedi. Tekrar deneyin.', 'err', 5000);
      } finally { pinButton.disabled = false; }
    });
    applyPagePrefs(pagePrefs);
    chrome.storage.local.get('uhdPrefs').then(v => applyPagePrefs(v.uhdPrefs)).catch(error => {
      if (invalidated(error)) stopInvalidatedContext();
    });
    chrome.storage.onChanged.addListener((changes, area) => {
      if (area === 'local' && changes.uhdPrefs) applyPagePrefs(changes.uhdPrefs.newValue);
    });
    if (pageDarkMq && pageDarkMq.addEventListener) pageDarkMq.addEventListener('change', () => applyPagePrefs(pagePrefs));
    launch.addEventListener('click', () => {
      if (panel.hidden) showPanel();
      else hidePanel(true);
    });
    panel.addEventListener('keydown', e => {
      if (e.key === 'Escape' && !e.defaultPrevented) {
        e.preventDefault();
        e.stopPropagation();
        hidePanel(true);
      }
    });
    // UYAP'ın tıklama işlemi bitsin; basılan öğe pointerdown ile click arasında kaymasın.
    // Gölge DOM içindeki tıklamaların hedefi host olarak görünür.
    document.addEventListener('click', e => {
      if (!panel.hidden && !pagePrefs.panelSabit && e.target !== host) {
        setTimeout(() => { if (!pagePrefs.panelSabit) hidePanel(); }, 0);
      }
    }, true);
    toastEl.addEventListener('mouseenter', pauseToast);
    toastEl.addEventListener('mouseleave', resumeToast);
    toastEl.addEventListener('focusin', pauseToast);
    toastEl.addEventListener('focusout', e => { if (!toastEl.contains(e.relatedTarget)) resumeToast(); });
  }

  function showPanel() {
    if (!panel) return;
    if (panel.hidden) focusBeforePanel = document.activeElement;
    panel.hidden = false;
    startPanelDock();
    launch.setAttribute('aria-expanded', 'true');
    launch.setAttribute('aria-label', BRAND.name + ' panelini kapat');
    ui.focus();
  }

  function hidePanel(restoreFocus = false) {
    if (!panel || panel.hidden) return;
    panel.hidden = true;
    stopPanelDock();
    launch.setAttribute('aria-expanded', 'false');
    launch.setAttribute('aria-label', BRAND.name + ' panelini aç');
    if (restoreFocus) {
      const previous = focusBeforePanel;
      const target = previous && previous !== shadowRoot.host && previous !== document.body && previous.isConnected ? previous : launch;
      target.focus({ preventScroll: true });
    }
  }

  // ---------------------------------------------------------------- Evrakı açma
  // Evrak kimlikleri her yanıtta yeniden şifrelendiği için saklanmaz: açarken dosyanın evrak listesi yeniden
  // alınır, evrak anahtarıyla (birim evrak no + onay tarihi + tür) bulunur ve UYAP'ın kendi görüntüleme
  // adresinden getirilip sayfa içinde gösterilir. Evrak içeriği saklanmaz; pencere kapanınca bellekten atılır.

  async function rawEvraklar(dosyaId) {
    const ok = r => r && typeof r === 'object' && !Array.isArray(r) && (r.tumEvraklar || r.son20Evrak);
    const out = [];
    let res = await api('list_dosya_evraklar.ajx', { dosyaId, pageNumber: 1 });
    if (!ok(res)) throw new Error('Evrak listesi alınamadı.');
    const pages = Math.min(Number(res.pageTotal) || 1, EVRAK_PAGES);
    for (let page = 1; ; page++) {
      if (res.tumEvraklar && typeof res.tumEvraklar === 'object') {
        for (const arr of Object.values(res.tumEvraklar)) if (Array.isArray(arr)) out.push(...arr);
      } else if (Array.isArray(res.son20Evrak)) out.push(...res.son20Evrak);
      if (page >= pages) break;
      res = await api('list_dosya_evraklar.ajx', { dosyaId, pageNumber: page + 1 });
      if (!ok(res)) break;
    }
    return out;
  }

  // Dosyanın bu oturumda geçerli kimliği: önce kayıttaki denenir, olmazsa dosya grubu yeniden sorgulanır.
  async function freshDosyaId(rec) {
    for (const birimId of [rec.birimId || '', '']) {
      for (let page = 1; page <= 200; page++) {
        const res = await api('search_phrase_detayli.ajx', {
          dosyaDurumKod: rec.sorguDurum === 1 ? 1 : 0, pageSize: 500, pageNumber: page,
          birimId, birimTuru2: rec.birimTuru2, birimTuru3: rec.yargiTuru
        });
        if (!Array.isArray(res) || !Array.isArray(res[0])) break;
        const hit = res[0].find(d => `${d.birimId}|${d.dosyaNo}|${d.dosyaTurKod}` === rec.key);
        if (hit) return hit.dosyaId;
        if (res[0].length < 500 || page * 500 >= (Number(res[1]) || 0)) break;
      }
      if (!rec.birimId) break;
    }
    return null;
  }

  async function viewDocument(evrakId, dosyaId) {
    const url = `/view_document_brd.uyap?evrakId=${encodeURIComponent(evrakId)}&dosyaId=${encodeURIComponent(dosyaId)}`;
    const res = await fetch(url, { credentials: 'include', cache: 'no-store' });
    if (res.status === 401 || res.status === 403) throw new Fatal('UYAP oturumu kapanmış görünüyor.');
    if (!res.ok) throw new Error(`UYAP evrakı vermedi (HTTP ${res.status}).`);
    const type = (res.headers.get('Content-Type') || '').toLowerCase();
    if (/json|html|text\//.test(type)) throw new Error('UYAP evrak yerine hata yanıtı döndü.');
    return { blob: await res.blob(), type };
  }

  let evrakBusy = false;
  async function openEvrak(rec, key) {
    if (evrakBusy) return;
    evrakBusy = true;
    const title = `${rec.dosyaNo} ${rec.birimAdi}`;
    try {
      toast(`${title}\nEvrak UYAP'tan getiriliyor…`, 'busy');
      let dosyaId = rec.dosyaId;
      let list = null;
      try { list = await rawEvraklar(dosyaId); } catch (e) { if (e instanceof Fatal) throw e; }
      if (!list) {
        dosyaId = await freshDosyaId(rec);
        if (!dosyaId) throw new Error('Dosya UYAP’ta bulunamadı; Güncelle’ye basıp tekrar deneyin.');
        list = await rawEvraklar(dosyaId);
      }
      const e = list.find(x => evrakKey(x) === key);
      if (!e) throw new Error('Evrak dosyanın evrak listesinde bulunamadı; Güncelle’ye basıp tekrar deneyin.');
      log('Evrak açılıyor:', e.tur);
      let doc;
      try { doc = await viewDocument(e.evrakId, e.dosyaId || dosyaId); }
      catch (err) {
        if (err instanceof Fatal || !e.dosyaId || e.dosyaId === dosyaId) throw err;
        doc = await viewDocument(e.evrakId, dosyaId);   // evrak kaydındaki dosya kimliği kabul edilmezse sorgudaki
      }
      toastEl.hidden = true;
      showViewer(rec, e, doc);
    } catch (err) {
      log('Evrak açılamadı:', err.message);
      toast(`${title}\nEvrak açılamadı: ${err.message}`, 'err', 0, { label: 'Dosyayı aç', fn: () => openFile(rec) });
    } finally {
      evrakBusy = false;
    }
  }

  // ---------------------------------------------------------------- Dosya paneli: safahat, icra özeti, borçlu sorgusu
  // Hepsi yalnız kullanıcı panelde istediğinde, o dosya için sorgulanır; sonuçlar ekranda gösterilir, saklanmaz.
  // Borçlu sorguları UYAP'ta sorgu bakiyesinden düşebildiği için yalnız seçilenler, açık onayla ve tek tek yapılır.

  // Kayıttaki dosya kimliği bu oturumda geçersizse (ör. yeniden giriş) dosya yeniden sorgulanıp taze kimlikle denenir.
  async function withDosya(rec, fn) {
    try { return await fn(rec.dosyaId); }
    catch (e) {
      if (e instanceof Fatal) throw e;
      const id = await freshDosyaId(rec);
      if (!id) throw new Error('Dosya UYAP’ta bulunamadı; Güncelle’ye basıp tekrar deneyin.');
      rec.dosyaId = id;
      return fn(id);
    }
  }

  // Bilinmeyen yapıdaki yanıtı okunur göstermek için: nesne listesi → tablo, nesne → alan listesi.
  function renderValue(v, depth = 0) {
    const fmt = x => (x == null || x === '' ? '—' : typeof x === 'boolean' ? (x ? 'Evet' : 'Hayır') : typeof x === 'object' ? JSON.stringify(x).slice(0, 120) : String(x));
    if (Array.isArray(v)) {
      if (!v.length) return el('div', { class: 'dp-muted' }, 'Kayıt yok.');
      if (v.every(x => x && typeof x === 'object' && !Array.isArray(x))) {
        const cols = [...new Set(v.slice(0, 20).flatMap(x => Object.keys(x)))]
          .filter(k => !/(^id$|Id$|DVO$)/.test(k) || v.every(x => typeof x[k] !== 'object')).slice(0, 10);
        return el('div', { class: 'dp-tablewrap' }, el('table', { class: 'dp-table' },
          el('thead', null, el('tr', null, cols.map(c => el('th', null, humanKey(c))))),
          el('tbody', null, v.slice(0, 500).map(x => el('tr', null, cols.map(c => el('td', null, fmt(x[c]))))))));
      }
      return el('div', null, v.map(x => el('div', null, fmt(x))));
    }
    if (v && typeof v === 'object') {
      const rows = Object.entries(v).filter(([k]) => !SORGU_ORTAK.has(k));
      if (!rows.length) return el('div', { class: 'dp-muted' }, 'Sonuç yok.');
      return el('div', { class: 'dp-kv' }, rows.map(([k, x]) => (x && typeof x === 'object' && depth < 2)
        ? el('div', { class: 'dp-sub' }, el('div', { class: 'dp-k' }, humanKey(k)), renderValue(x, depth + 1))
        : el('div', null, el('span', { class: 'dp-k' }, humanKey(k) + ': '), fmt(x))));
    }
    return el('div', null, fmt(v));
  }

  let dosyaPanel = null;
  function viewerKeys(ev, box, done) {
    if (ev.key === 'Escape') {
      ev.preventDefault();
      ev.stopPropagation();
      done();
    } else if (ev.key === 'Tab') {
      const targets = [...box.querySelectorAll('button:not(:disabled),a[href],input:not(:disabled),select:not(:disabled),textarea:not(:disabled),iframe,[tabindex="0"]')].filter(visible);
      if (!targets.length) return;
      const active = shadowRoot.activeElement;
      const next = ev.shiftKey ? targets[targets.length - 1] : targets[0];
      if (!box.contains(active) || (ev.shiftKey ? active === targets[0] : active === targets[targets.length - 1])) {
        ev.preventDefault();
        next.focus();
      }
    }
  }

  function restoreAfterViewer(wasPanelOpen, previous) {
    if (wasPanelOpen) showPanel();
    const target = previous && previous.isConnected && visible(previous) ? previous : launch;
    target.focus({ preventScroll: true });
  }

  function openDosyaPanel(rec, tab) {
    if (dosyaPanel) dosyaPanel.close();
    const wasPanelOpen = !panel.hidden;
    const previous = shadowRoot.activeElement || document.activeElement;
    hidePanel();
    const icra = rec.yargiTuru === '2';
    const tabs = [icra && ['ozet', 'Özet'], icra && ['sorgu', 'Borçlu sorgusu'], ['safahat', 'Safahat']].filter(Boolean);
    let active = tabs.some(t => t[0] === tab) ? tab : tabs[0][0];
    const body = el('div', { class: 'dp-body' });
    const tabBar = el('div', { class: 'dp-tabs' });
    const close = el('button', { title: 'Kapat (Esc)' }, 'Kapat');
    const box = el('div', { class: 'box', role: 'dialog', 'aria-modal': 'true', 'aria-label': 'Dosya paneli' },
      el('div', { class: 'bar' }, el('b', null, `${rec.dosyaNo} · ${rec.birimAdi}`), close), tabBar, body);
    const viewer = el('div', { class: 'viewer' }, box);
    const onKey = ev => viewerKeys(ev, box, done);
    const done = () => { viewer.remove(); document.removeEventListener('keydown', onKey, true); dosyaPanel = null; restoreAfterViewer(wasPanelOpen, previous); };
    close.addEventListener('click', done);
    viewer.addEventListener('click', ev => { if (ev.target === viewer) done(); });
    document.addEventListener('keydown', onKey, true);
    const show = t => {
      active = t;
      tabBar.replaceChildren(...tabs.map(([k, label]) => {
        const b = el('button', { class: 'dp-tab' + (k === active ? ' on' : '') }, label);
        b.addEventListener('click', () => show(k));
        return b;
      }));
      // Her sekme kendi alanına yazar: sekme değişince geç gelen yanıt yeni sekmenin üzerine yazmaz.
      const pane = el('div', null, el('div', { class: 'dp-muted' }, 'UYAP’tan alınıyor…'));
      body.replaceChildren(pane);
      const run = { ozet: () => loadOzet(rec, pane), sorgu: () => loadSorgu(rec, pane), safahat: () => loadSafahat(rec, pane) }[t];
      run().catch(err => pane.replaceChildren(el('div', { class: 'dp-err' }, `Alınamadı: ${err.message}`)));
    };
    dosyaPanel = { close: done };
    shadowRoot.append(viewer);
    show(active);
    close.focus();
  }

  async function loadSafahat(rec, body) {
    const items = await withDosya(rec, id => api('dosya_safahat_bilgileri_brd.ajx', { dosyaId: id }).then(parseSafahat));
    body.replaceChildren(
      el('div', { class: 'dp-muted' }, `${items.length} işlem, en yeni önce. UYAP’tan şimdi alındı; saklanmaz.`),
      el('div', { class: 'dp-tablewrap' }, el('table', { class: 'dp-table' },
        el('thead', null, el('tr', null, ['Tarih', 'İşlem', 'Açıklama', 'Birim'].map(h => el('th', null, h)))),
        el('tbody', null, items.map(x => el('tr', null, el('td', { class: 'nw' }, x.tarih), el('td', null, x.tur), el('td', null, x.aciklama), el('td', null, x.birim)))))));
  }

  async function loadOzet(rec, body) {
    const [ayrinti, tahsilat, kesin] = await withDosya(rec, id => Promise.all([
      api('dosyaAyrintiBilgileri_brd.ajx', { dosyaId: id }),
      api('dosya_tahsilat_reddiyat_bilgileri_brd.ajx', { dosyaId: id, dosyaTurKod: Number(rec.dosyaTurKod) }).catch(() => null),
      api('getTakibiKesinlesenBorcluListesi_brd.ajx', { dosyaId: id }).catch(() => null)
    ]));
    if (!ayrinti || typeof ayrinti !== 'object') throw new Error('Dosya ayrıntısı okunamadı.');
    const money = (k, label) => (typeof ayrinti[k] === 'number' ? el('div', null, el('span', { class: 'dp-k' }, label + ': '), fmtTL(ayrinti[k])) : null);
    const text = (k, label) => (ayrinti[k] ? el('div', null, el('span', { class: 'dp-k' }, label + ': '), String(ayrinti[k])) : null);
    const known = new Set(['takibinTuruAciklama', 'takibinSekliAciklama', 'takibinYoluAciklama', 'alacakKalemToplamTutar', 'alacakKalemFaizTutar',
      'takipSonrasiMasraf', 'vekaletUcreti', 'tahsilHarci', 'yapilmisBorcTahsilati', 'takibinTuru', 'takibinSekli', 'takibinYolu']);
    const others = Object.entries(ayrinti).filter(([k, v]) => !known.has(k) && (typeof v === 'number' || (typeof v === 'string' && v.length < 80)));
    const t = tahsilat && typeof tahsilat === 'object' ? tahsilat : null;
    const kesinN = Array.isArray(kesin) ? kesin.length : null;
    body.replaceChildren(
      el('div', { class: 'dp-grid' },
        el('div', { class: 'dp-card' }, el('h4', null, 'Takip'),
          text('takibinTuruAciklama', 'Türü'), text('takibinSekliAciklama', 'Şekli'), text('takibinYoluAciklama', 'Yolu'),
          kesinN != null ? el('div', null, el('span', { class: 'dp-k' }, 'Takibi kesinleşen borçlu: '), String(kesinN)) : null),
        el('div', { class: 'dp-card' }, el('h4', null, 'Alacak'),
          money('alacakKalemToplamTutar', 'Alacak kalemleri toplamı'), money('alacakKalemFaizTutar', 'Faiz'),
          money('takipSonrasiMasraf', 'Takip sonrası masraf'), money('vekaletUcreti', 'Vekâlet ücreti'), money('tahsilHarci', 'Tahsil harcı')),
        t ? el('div', { class: 'dp-card' }, el('h4', null, 'Tahsilat'),
          el('div', null, el('span', { class: 'dp-k' }, 'Toplam tahsilat: '), fmtTL(t.toplamTahsilat)),
          el('div', null, el('span', { class: 'dp-k' }, 'Toplam reddiyat: '), fmtTL(t.toplamreddiyat)),
          typeof t.haricen === 'number' ? el('div', null, el('span', { class: 'dp-k' }, 'Haricen: '), fmtTL(t.haricen)) : null,
          el('div', { class: 'dp-strong' }, el('span', { class: 'dp-k' }, 'Kalan: '), fmtTL(t.toplamKalan))) : money('yapilmisBorcTahsilati', 'Yapılmış tahsilat')),
      others.length ? el('details', { class: 'dp-more' }, el('summary', null, 'Diğer bilgiler'),
        el('div', { class: 'dp-kv' }, others.map(([k, v]) => el('div', null, el('span', { class: 'dp-k' }, humanKey(k) + ': '), typeof v === 'number' ? v.toLocaleString('tr-TR') : v)))) : null,
      el('div', { class: 'dp-muted' }, 'Tutarlar UYAP’ın dosya ayrıntısından şimdi alındı; saklanmaz. Resmî hesap için UYAP’taki dosya hesabını esas alın.'));
  }

  async function loadSorgu(rec, body) {
    const [borclular, bakiye] = await withDosya(rec, id => Promise.all([
      api('dosya_borclu_list.ajx', { dosyaId: id }),
      api('ws_sorgu_bakiyesi.ajx', { params: { dosyaId: id } }).catch(() => null)
    ]));
    if (!Array.isArray(borclular) || !borclular.length) {
      body.replaceChildren(el('div', { class: 'dp-muted' }, 'Bu dosyada borçlu kaydı bulunamadı.'));
      return;
    }
    const bakiyeEl = el('div', { class: 'dp-bakiye' });
    const showBakiye = b => bakiyeEl.replaceChildren(b && typeof b === 'object'
      ? `Sorgu bakiyesi: ${fmtTL(b.sorguBakiye)}` + (b.ucretsizSorguLimit != null ? ` · Ücretsiz sorgu limiti: ${b.ucretsizSorguLimit}` : '') +
        (b.sorguKalanIslemSayisi != null ? ` · Kalan işlem: ${b.sorguKalanIslemSayisi}` : '') + (b.hasBarokart === false ? ' · Barokart tanımlı değil' : '')
      : 'Sorgu bakiyesi alınamadı.');
    showBakiye(bakiye);
    const bSel = borclular.map((b, i) => {
      const box = el('input', { type: 'checkbox' });
      box.checked = borclular.length === 1;
      return { b, box, label: borcluAdi(b) || `Borçlu ${i + 1}` };
    });
    const qSel = BORCLU_SORGULARI.map(q => ({ q, box: el('input', { type: 'checkbox' }) }));
    const go = el('button', { class: 'dp-go' }, 'Seçilenleri sorgula');
    const out = el('div', { class: 'dp-results' });
    const count = () => bSel.filter(x => x.box.checked).length * qSel.filter(x => x.box.checked).length;
    const upd = () => { const n = count(); go.disabled = !n; go.textContent = n ? `Seçilenleri sorgula (${n} sorgu)` : 'Borçlu ve sorgu seçin'; };
    [...bSel, ...qSel].forEach(x => x.box.addEventListener('change', upd));
    upd();
    go.addEventListener('click', async () => {
      const bs = bSel.filter(x => x.box.checked), qs = qSel.filter(x => x.box.checked);
      const n = bs.length * qs.length;
      if (!n) return;
      if (!confirm(`${n} borçlu sorgusu yapılacak (${qs.map(x => x.q.ad).join(', ')}).\n\nBu sorgular UYAP’ta ücretli olabilir ve sorgu bakiyenizden ya da ücretsiz sorgu hakkınızdan düşer. Sonuçlar yalnız ekranda gösterilir, saklanmaz.\n\nDevam edilsin mi?`)) return;
      go.disabled = true;
      out.replaceChildren();
      let i = 0;
      for (const { b, label } of bs) {
        for (const { q } of qs) {
          i++;
          go.textContent = `Sorgulanıyor… ${i}/${n}`;
          const sec = el('div', { class: 'dp-res' }, el('h4', null, `${label} · ${q.ad}`), el('div', { class: 'dp-muted' }, 'Sorgulanıyor…'));
          out.append(sec);
          try {
            const res = await api(`borclu_bilgileri_goruntule_${q.id}.ajx`, { dosyaId: rec.dosyaId, kisiKurumId: b.kisiKurumId, ...(q.extra || {}) });
            sec.replaceChild(renderValue(res), sec.lastChild);
          } catch (err) {
            sec.replaceChild(el('div', { class: 'dp-err' }, `Sorgulanamadı: ${err.message}`), sec.lastChild);
            if (err instanceof Fatal) { i = n; break; }
          }
          await sleep(2000);   // UYAP'ı yormamak için sorgular arası bekleme
        }
      }
      showBakiye(await api('ws_sorgu_bakiyesi.ajx', { params: { dosyaId: rec.dosyaId } }).catch(() => null));
      upd();
    });
    body.replaceChildren(
      el('div', { class: 'dp-warn' }, 'Borçlu sorguları UYAP’ta ücretli olabilir; sorgu bakiyenizden ya da ücretsiz sorgu hakkınızdan düşer. Yalnız seçtikleriniz, onayınızdan sonra tek tek sorgulanır. Sonuçlar saklanmaz; pencere kapanınca silinir.'),
      bakiyeEl,
      el('div', { class: 'dp-grid' },
        el('div', { class: 'dp-card' }, el('h4', null, 'Borçlular'), bSel.map(x => el('label', { class: 'dp-check' }, x.box, x.label))),
        el('div', { class: 'dp-card' }, el('h4', null, 'Sorgular'), qSel.map(x => el('label', { class: 'dp-check' }, x.box, x.q.ad)))),
      el('div', { class: 'dp-actions' }, go),
      out);
  }

  function showViewer(rec, e, doc) {
    const wasPanelOpen = !panel.hidden;
    const previous = shadowRoot.activeElement || document.activeElement;
    const url = URL.createObjectURL(doc.blob);
    const pdf = doc.type.includes('pdf');
    const ext = pdf ? 'pdf' : doc.type.includes('tif') ? 'tif' : doc.type.includes('udf') ? 'udf' : 'bin';
    const name = `${rec.dosyaNo} ${e.tur || 'evrak'} ${String(e.onaylandigiTarih || '').slice(0, 10)}`.replace(/[\\/:*?"<>|]+/g, '-') + '.' + ext;
    const close = el('button', { title: 'Kapat (Esc)' }, 'Kapat');
    const box = el('div', { class: 'box', role: 'dialog', 'aria-modal': 'true', 'aria-label': 'Evrak' },
      el('div', { class: 'bar' },
        el('b', null, `${e.tur || 'Evrak'} · ${e.onaylandigiTarih || ''} · ${rec.dosyaNo}`),
        pdf ? el('a', { href: url, target: '_blank', rel: 'noopener' }, 'Yeni sekmede aç') : null,
        el('a', { href: url, download: name }, 'İndir'),
        close),
      pdf ? el('iframe', { src: url, title: 'Evrak' })
        : el('div', { class: 'msg' }, `Bu evrak ${doc.type || 'bilinmeyen'} biçiminde; tarayıcı doğrudan gösteremiyor. “İndir” ile kaydedip açabilir ya da dosyayı UYAP’ta açabilirsiniz.`));
    const viewer = el('div', { class: 'viewer' }, box);
    const done = () => {
      viewer.remove();
      document.removeEventListener('keydown', onKey, true);
      setTimeout(() => URL.revokeObjectURL(url), 60000);   // yeni sekmede açıldıysa yüklenmesine zaman tanı
      restoreAfterViewer(wasPanelOpen, previous);
    };
    const onKey = ev => viewerKeys(ev, box, done);
    close.addEventListener('click', done);
    viewer.addEventListener('click', ev => { if (ev.target === viewer) done(); });
    document.addEventListener('keydown', onKey, true);
    hidePanel();
    shadowRoot.append(viewer);
    close.focus();
  }

  function dismissToast() {
    clearTimeout(toastTimer);
    toastTimer = null;
    toastRemaining = 0;
    if (toastEl) toastEl.hidden = true;
  }

  function pauseToast() {
    if (!toastTimer) return;
    clearTimeout(toastTimer);
    toastTimer = null;
    toastRemaining = Math.max(1, toastRemaining - (Date.now() - toastStarted));
  }

  function resumeToast() {
    if (!toastEl || toastEl.hidden || !toastRemaining || toastTimer || toastEl.matches(':hover') || toastEl.contains(shadowRoot.activeElement)) return;
    toastStarted = Date.now();
    toastTimer = setTimeout(dismissToast, toastRemaining);
  }

  function toast(text, kind, ms, action) {
    if (!toastEl) return;
    dismissToast();
    const close = el('button', { class: 'close', type: 'button', title: 'Bildirimi kapat', 'aria-label': 'Bildirimi kapat' }, '×');
    close.addEventListener('click', () => {
      dismissToast();
      if (panel.hidden) launch.focus({ preventScroll: true });
      else ui.focus();
    });
    toastEl.replaceChildren(el('div', { class: 'msg' }, text));
    if (action) {
      const b = el('button', { type: 'button' }, action.label);
      b.addEventListener('click', () => { dismissToast(); action.fn(); });
      toastEl.append(b);
    }
    if (kind !== 'busy') toastEl.append(close);
    toastEl.className = 'toast' + (kind ? ' ' + kind : '');
    toastEl.dataset.source = action && action.source || '';
    toastEl.setAttribute('role', kind === 'err' ? 'alert' : 'status');
    toastEl.setAttribute('aria-live', kind === 'err' ? 'assertive' : 'polite');
    toastEl.hidden = false;
    toastRemaining = ms || 0;
    resumeToast();
  }

  // ---------------------------------------------------------------- Açılış duyurusu
  // Yalnız UYAP'ın #duyuruicerik penceresi küçültülür; KVKK ve diğer onay pencereleri kapsam dışıdır.
  // İçerik okunmadan showPopupDuyuru2 değiştirilmez; duyuru servisine yeni sorgu gönderilmez.
  let compactDuyuru = false, duyuruQueued = false, lastAnnouncement = null, announcementViewer = null;
  let dismissedAnnouncement = '';
  const closingAnnouncements = new WeakSet();

  function announcementSnapshot(body, pop) {
    const content = el('div', { class: 'announcement-body' });
    let unsupported = false;
    const allowed = new Set(['P', 'DIV', 'SPAN', 'BR', 'HR', 'B', 'STRONG', 'I', 'EM', 'U', 'S', 'UL', 'OL', 'LI', 'H1', 'H2', 'H3', 'H4', 'H5', 'H6', 'BLOCKQUOTE', 'PRE', 'CODE', 'TABLE', 'THEAD', 'TBODY', 'TFOOT', 'TR', 'TD', 'TH', 'A', 'IMG']);
    const safeUrl = (value, image) => {
      if (!value) return '';
      if (image && /^data:image\/(png|jpeg|gif|webp);base64,/i.test(value)) return value;
      try {
        const url = new URL(value, document.baseURI);
        return /^https?:$/.test(url.protocol) ? url.href : '';
      } catch { return ''; }
    };
    const copy = (node, target) => {
      if (node.nodeType === 3) { target.append(node.textContent); return; }
      if (node.nodeType !== 1) return;
      const tag = node.tagName;
      if (['SCRIPT', 'STYLE', 'TEMPLATE', 'NOSCRIPT'].includes(tag)) return;
      if (['IFRAME', 'OBJECT', 'EMBED', 'FORM', 'INPUT', 'BUTTON', 'VIDEO', 'AUDIO', 'CANVAS', 'SVG'].includes(tag)) { unsupported = true; return; }
      if (!allowed.has(tag)) { for (const child of node.childNodes) copy(child, target); return; }
      const item = el(tag.toLowerCase());
      if (tag === 'A') {
        const href = safeUrl(node.getAttribute('href'), false);
        if (href) { item.setAttribute('href', href); item.setAttribute('target', '_blank'); item.setAttribute('rel', 'noopener noreferrer'); }
      }
      if (tag === 'IMG') {
        const src = safeUrl(node.getAttribute('src'), true);
        if (!src) { unsupported = true; return; }
        item.setAttribute('src', src);
        item.setAttribute('alt', node.getAttribute('alt') || 'Duyuru görseli');
        item.setAttribute('loading', 'lazy');
      }
      if (tag === 'TD' || tag === 'TH') for (const attr of ['colspan', 'rowspan']) {
        const value = node.getAttribute(attr);
        if (/^[1-9]\d?$/.test(value || '')) item.setAttribute(attr, value);
      }
      for (const child of node.childNodes) copy(child, item);
      target.append(item);
      if (['P', 'DIV', 'BR', 'HR', 'LI', 'H1', 'H2', 'H3', 'H4', 'H5', 'H6', 'TR', 'BLOCKQUOTE', 'PRE'].includes(tag)) target.append('\n');
    };
    for (const node of body.childNodes) copy(node, content);
    const text = content.textContent.replace(/\s+/g, ' ').trim();
    if (unsupported || (!text && !content.querySelector('img'))) return null;
    const titleNode = pop.querySelector('.dx-popup-title .dx-toolbar-label, .dx-popup-title');
    const title = (titleNode && titleNode.textContent.trim()) || 'UYAP duyurusu';
    return { content, title, preview: text || 'Duyuru görselini açıp inceleyin.', signature: title + '\n' + content.innerHTML };
  }

  function renderAnnouncement() {
    if (!announcementEl) return;
    announcementEl.hidden = !compactDuyuru || !lastAnnouncement || dismissedAnnouncement === lastAnnouncement.signature;
    if (announcementEl.hidden) return;
    const read = el('button', { class: 'read', type: 'button', title: 'Duyurunun tamamını oku', 'aria-label': 'UYAP duyurusunu oku: ' + lastAnnouncement.title },
      el('strong', null, 'UYAP duyurusu · Oku'), el('span', { class: 'preview' }, lastAnnouncement.preview));
    read.addEventListener('click', openAnnouncement);
    const close = el('button', { class: 'close', type: 'button', title: 'Bildirimi kapat', 'aria-label': 'Duyuru bildirimini kapat' }, '×');
    close.addEventListener('click', () => {
      dismissedAnnouncement = lastAnnouncement.signature;
      announcementEl.hidden = true;
      if (panel.hidden) launch.focus({ preventScroll: true }); else ui.focus();
    });
    announcementEl.replaceChildren(read, close);
  }

  function openAnnouncement() {
    if (announcementViewer) { announcementViewer.querySelector('button').focus(); return; }
    if (!lastAnnouncement) return;
    const snapshot = lastAnnouncement;
    const wasPanelOpen = !panel.hidden, previous = shadowRoot.activeElement || document.activeElement;
    const close = el('button', { type: 'button', title: 'Kapat (Esc)' }, 'Kapat');
    const box = el('div', { class: 'box', role: 'dialog', 'aria-modal': 'true', 'aria-label': snapshot.title },
      el('div', { class: 'bar' }, el('b', null, snapshot.title), close), snapshot.content.cloneNode(true));
    const viewer = el('div', { class: 'viewer announcement-viewer' }, box);
    const done = () => {
      viewer.remove();
      announcementViewer = null;
      document.removeEventListener('keydown', onKey, true);
      renderAnnouncement();
      restoreAfterViewer(wasPanelOpen, previous);
    };
    const onKey = ev => viewerKeys(ev, box, done);
    close.addEventListener('click', done);
    viewer.addEventListener('click', ev => { if (ev.target === viewer) done(); });
    document.addEventListener('keydown', onKey, true);
    dismissedAnnouncement = snapshot.signature;
    announcementEl.hidden = true;
    announcementViewer = viewer;
    hidePanel();
    shadowRoot.append(viewer);
    close.focus();
  }

  function compactAnnouncement() {
    duyuruQueued = false;
    if (!compactDuyuru || !announcementEl || contextGone) return;
    const body = document.getElementById('duyuruicerik');
    const pop = body && body.closest('.dx-overlay-content');
    if (!pop || !visible(pop) || closingAnnouncements.has(pop)) return;
    const buttons = [...pop.querySelectorAll('.dx-button, button')].filter(b => !body.contains(b) && !b.disabled && b.getAttribute('aria-disabled') !== 'true');
    const close = buttons.find(b => norm(b.textContent.trim()) === 'kapat')
      || buttons.find(b => norm(b.textContent.trim()) === 'tekrar gosterme');
    if (!close) return;
    let snapshot;
    try { snapshot = announcementSnapshot(body, pop); } catch { return; }
    // Aktarılamayan (ör. iframe içeren) duyuru UYAP'ın kendi penceresinde okunabilir kalır.
    if (!snapshot) return;
    const changed = !lastAnnouncement || snapshot.signature !== lastAnnouncement.signature;
    lastAnnouncement = snapshot;
    if (changed) renderAnnouncement();
    closingAnnouncements.add(pop);
    close.click();
    setTimeout(() => closingAnnouncements.delete(pop), 250);
  }

  function queueAnnouncement() {
    if (compactDuyuru && !duyuruQueued && !contextGone) { duyuruQueued = true; setTimeout(compactAnnouncement, 50); }
  }
  new MutationObserver(queueAnnouncement).observe(document.documentElement, {
    childList: true, subtree: true, characterData: true, attributes: true, attributeFilter: ['class', 'style', 'hidden']
  });
  function applyAnnouncementPref(prefs) {
    const next = !prefs || prefs.duyuruBildirim !== false;
    if (compactDuyuru && !next && announcementEl && !announcementEl.hidden) openAnnouncement();
    compactDuyuru = next;
    renderAnnouncement();
    queueAnnouncement();
  }
  chrome.storage.local.get('uhdPrefs').then(({ uhdPrefs }) => applyAnnouncementPref(uhdPrefs)).catch(error => {
    if (invalidated(error)) stopInvalidatedContext();
  });
  chrome.storage.onChanged.addListener((ch, area) => {
    if (area === 'local' && ch.uhdPrefs) applyAnnouncementPref(ch.uhdPrefs.newValue);
  });

  // ---------------------------------------------------------------- Mesajlar

  chrome.runtime.onMessage.addListener((msg, sender, send) => {
    if (!msg || typeof msg.type !== 'string') return;
    if (msg.type === 'uhd-ping') send({ ok: true });
    else if (msg.type === 'uhd-open') { openFile(msg.record); send({ ok: true }); }
    else if (msg.type === 'uhd-open-evrak') { openEvrak(msg.record, msg.key); send({ ok: true }); }
    else if (msg.type === 'uhd-dosya-panel') { openDosyaPanel(msg.record, msg.tab); send({ ok: true }); }
    else if (msg.type === 'uhd-stop') { stopUpdate().then(() => send({ ok: true })); return true; }
    else if (msg.type === 'uhd-update') { startUpdate(msg.full).then(send); return true; }
  });

  mountPage();

  // ---------------------------------------------------------------- Güncellemenin sekmeler arası sürmesi

  chrome.storage.onChanged.addListener((ch, area) => {
    if (area !== 'local') return;
    if (ch.uhdJob && job) {
      const j = ch.uhdJob.newValue;
      if (j && j.id === job.id && j.stop) job.stop = true;
    }
    if (ch.uhdProgress) {
      const p = ch.uhdProgress.newValue;
      // Başka sekme işi devraldıysa bu sekmedeki kopya çekilir.
      if (job && p && p.owner && p.owner !== OWNER) job.lost = true;
      // Yürüten sekme kapandı: bu sekme devralmayı dener.
      if (!job && p && p.handoff) setTimeout(() => scheduled(() => maybeResume(false)), Math.random() * 500);
      // Güncelleme başka sekmede bittiyse görünür sekmede de bildir.
      if (!job && p && p.final && p.owner !== OWNER && !document.hidden) toast(p.text, 'ok', 6000);
    }
  });

  // Sekme kapanır, yenilenir ya da UYAP'tan çıkılırsa işi bırak; açık başka UYAP sekmesi hemen devralır.
  window.addEventListener('pagehide', () => {
    if (!job) return;
    job.lost = true;
    if (!contextAvailable()) return;
    chrome.storage.local.set({ uhdProgress: {
      owner: null, running: false, paused: true, handoff: true, beat: 0, endedAt: Date.now(),
      text: 'Güncelleme yarıda kaldı; açık bir UYAP sekmesinde ya da UYAP’ı yeniden açtığınızda kaldığı yerden sürer.'
    } }).catch(error => {
      if (invalidated(error)) stopInvalidatedContext();
      else console.error('Legaluga güncelleme devri hatası:', error);
    });
  });

  // Yürüten sekme sinyal vermeden gittiyse (çöktü, Chrome sekmeyi uykuya aldı) bir süre sonra devral.
  resumeInterval = setInterval(() => scheduled(() => maybeResume(false)), 20000);
  setTimeout(() => scheduled(() => maybeResume(true)), 1500);

  // UYAP açılınca bu sekmede günde bir kez bugünkü duruşmaları göster.
  chrome.storage.local.get(['uhdDurusmalar', 'uhdPrefs']).then(({ uhdDurusmalar, uhdPrefs }) => {
    const { todayIso, upcomingDurusmalar } = globalThis.UHD;
    if (uhdPrefs && uhdPrefs.durusmaBildirim === false) return;
    if (ssGet('legalugaHatirlatma') === todayIso()) return;
    const bugun = upcomingDurusmalar(uhdDurusmalar && uhdDurusmalar.list).filter(d => d.tarih === todayIso());
    if (!bugun.length) return;
    ssSet('legalugaHatirlatma', todayIso());
    const text = `Bugün ${bugun.length} duruşma: ` + bugun.slice(0, 3).map(d => `${d.saat} ${d.dosyaNo}`).join(', ') + (bugun.length > 3 ? ' …' : '');
    toast(text, 'ok', 8000, {
      source: 'durusma', label: 'Duruşmaları aç', fn: () => { showPanel(); ui.showDurusmalar(); }
    });
  });

  // Popup'tan gelen ve sayfa yenilemesi gerektiren açma isteği. UYAP açık değilken istendiyse giriş yapıldıktan sonra
  // gelen ilk sayfada açılır; 3 dakika içinde açılamazsa bırakılır.
  const PENDING_MS = 180000;
  chrome.storage.local.get('uhdPending').then(async ({ uhdPending: p }) => {
    if (!p) return;
    if (Date.now() - p.at > PENDING_MS) return chrome.storage.local.remove('uhdPending');
    await sleep(onFormPage() ? 0 : 1500);   // giriş sonrası ana sayfanın oturmasını bekle
    const { uhdPending: cur } = await chrome.storage.local.get('uhdPending');
    if (!cur || cur.at !== p.at) return;   // başka sekme üstlendi
    await chrome.storage.local.remove('uhdPending');
    const ok = await openFile(p.record, onFormPage());
    // Giriş henüz tamamlanmadıysa bir sonraki sayfada bir kez daha denenir.
    const tries = (p.tries || 0) + 1;
    if (!ok && tries < 2 && Date.now() - p.at < PENDING_MS) {
      const { uhdPending: again } = await chrome.storage.local.get('uhdPending');
      if (!again) await chrome.storage.local.set({ uhdPending: { ...p, tries } });
    }
  });

  // Otomatik güncelleme (Ayarlar'dan açılırsa): UYAP sekmesi açıkken, son güncellemenin üzerinden seçilen süre geçtiyse.
  const OTO_MS = { '6s': 6 * 3600000, gunluk: 24 * 3600000 };
  async function autoUpdate() {
    if (job || document.hidden || !contextAvailable()) return;
    const { uhdPrefs, uhdIndex, uhdProgress, uhdJob } = await chrome.storage.local.get(['uhdPrefs', 'uhdIndex', 'uhdProgress', 'uhdJob']);
    const every = OTO_MS[uhdPrefs && uhdPrefs.otoGuncelle];
    if (!every || !uhdIndex || !uhdIndex.updatedAt || uhdJob || alive(uhdProgress)) return;
    if (Date.now() - uhdIndex.updatedAt < every) return;
    log('Otomatik güncelleme başlıyor.');
    await startUpdate(false);
  }
  setTimeout(() => scheduled(autoUpdate), 8000);
  autoInterval = setInterval(() => scheduled(autoUpdate), 10 * 60000);
})();
