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

  const { TURLER, norm, openPath, parseEvraklar, diffEvrak, sonEvrak } = globalThis.UHD;
  const OWNER = Math.random().toString(36).slice(2);
  const DELAY = 150;
  const TARAF_V = 2; // 2: taraflarla birlikte vekiller de saklanır
  const EVRAK_PAGES = 20;   // bir dosyanın evrak listesinde en çok bu kadar sayfa okunur
  const YENI_MAX = 50;      // dosya başına saklanan görülmemiş yeni evrak sayısı
  const STALE_MS = 90000;   // bu süre sinyal gelmezse güncellemeyi yürüten sekme gitmiş sayılır
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
    if (job) return;
    const { uhdProgress: p, uhdJob: j } = await chrome.storage.local.get(['uhdProgress', 'uhdJob']);
    if (!j || j.stop) return;
    // Sekme yenilendiyse işi yürüten, bu sekmenin önceki hâliydi: sinyalin eskimesini beklemeden devral.
    const wasMine = pageLoad && p && p.owner && p.owner === ssGet(SS_OWNER);
    if (alive(p) && !wasMine) return;
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

  async function saveJob(j) {
    const { uhdJob: cur } = await chrome.storage.local.get('uhdJob');
    if (cur && cur.id === j.id && !cur.stop) await chrome.storage.local.set({ uhdJob: j });
  }

  async function runUpdate(j) {
    const startedAt = j.startedAt;
    const st = j.stats = { added: 0, errors: 0, evrakErrors: 0, evrakBad: 0, failed: 0, ...(j.stats || {}) };
    let merged = null;
    try {
      const { uhdIndex, uhdPrefs } = await chrome.storage.local.get(['uhdIndex', 'uhdPrefs']);
      const evrakTakip = !(uhdPrefs && uhdPrefs.evrakKapali);
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
            sonEvrak: o ? o.sonEvrak : undefined
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

      // 3) Taraf adları: yeni dosyalar, vekil bilgisi olmayan eski kayıtlar (veya "Tümünü yenile"de bu işte
      //    henüz yenilenmemiş hepsi).
      const need = [...merged.values()].filter(r => j.full ? (r.tarafAt || 0) < startedAt : (!r.taraflar || r.tarafV !== TARAF_V));
      const phaseStart = Date.now();
      let done = 0, streak = 0;
      for (const r of need) {
        checkStop();
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
        if (done % 10 === 0) { await saveIndex(merged); await saveJob(j); }
        await setProgress({ running: true, phase: 'taraf', done, total: need.length, phaseStart, text: `Taraf bilgileri alınıyor: ${done}/${need.length}` });
        await pace();
      }
      await saveIndex(merged);

      // 4) Evrak takibi: yalnız açık ve bu işte listelenen dosyalar (dosyaId listelemeyle aynı oturumda geçerli).
      if (evrakTakip) {
        const eneed = [...merged.values()].filter(r => r.sorguDurum !== 1 && r.listJob === j.id && (r.evrakAt || 0) < startedAt);
        const ePhaseStart = Date.now();
        let eDone = 0;
        streak = 0;
        for (const r of eneed) {
          checkStop();
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
            streak = 0;
          } catch (e) {
            if (e instanceof Fatal || e instanceof Stopped) throw e;
            st.evrakErrors++;
            if (++streak >= 8) throw new Fatal('Evrak listeleri art arda alınamadı. UYAP oturumunu kontrol edip tekrar deneyin.');
          }
          eDone++;
          if (eDone % 10 === 0) { await saveIndex(merged); await saveJob(j); }
          await setProgress({ running: true, phase: 'evrak', done: eDone, total: eneed.length, phaseStart: ePhaseStart, text: `Yeni evraklar kontrol ediliyor: ${eDone}/${eneed.length}` });
          await pace();
        }
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
      if (st.evrakBad) summary += `, ${st.evrakBad} evrakta kimlik/tarih eksik olduğu için karşılaştırılamadı`;
      if (st.failed) summary += `, ${st.failed} sorgu grubu hata verdi (eski kayıtlar korundu)`;
      summary += '.';
      await chrome.storage.local.remove('uhdJob');
      await setProgress({ running: false, final: true, text: summary, endedAt: Date.now(), startedAt });
      toast(summary, 'ok', 6000);
    } catch (e) {
      // Başka sekme devraldıysa (ör. sayfa geri getirildi) hiçbir şeye dokunmadan çekil.
      if (e instanceof Stopped && e.message === 'lost') return;
      if (merged) await saveIndex(merged).catch(() => {});
      if (e instanceof Stopped) {
        await chrome.storage.local.remove('uhdJob');
        const text = merged ? 'Güncelleme durduruldu; o ana kadar alınan bilgiler saklandı.' : 'Güncelleme durduruldu; indeks değiştirilmedi.';
        await setProgress({ running: false, text, endedAt: Date.now(), startedAt });
        toast(text, '', 8000);
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

  async function openFile(rec, fresh) {
    if (opening) { toast('Önceki dosya hâlâ açılıyor…', '', 3000); return; }
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
        return;
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
    } catch (e) {
      log('Dosya açılamadı:', e.message);
      toast(`${title}\nDosya açılamadı: ${e.message}`, 'err', 0, { label: 'Tekrar dene', fn: () => openFile(rec) });
    } finally {
      opening = false;
    }
  }

  // ---------------------------------------------------------------- Sayfa içi panel ve bildirim

  const { el, mountUI, BRAND } = globalThis.UHD;
  const PAGE_CSS = `
.launch{position:fixed;right:0;top:50%;transform:translateY(-50%);writing-mode:vertical-rl;background:${BRAND.primary};color:#fff;border:0;
  border-radius:8px 0 0 8px;padding:12px 7px;font:600 12px "Segoe UI",system-ui,sans-serif;cursor:pointer;box-shadow:0 2px 10px rgba(0,0,0,.2);z-index:1}
.launch:hover{padding-right:10px}
.panel{position:fixed;top:0;right:0;height:100vh;width:min(480px,100vw);box-shadow:-8px 0 30px rgba(0,0,0,.2);z-index:2}
.toast{position:fixed;right:16px;bottom:16px;max-width:440px;background:#1d2939;color:#fff;padding:10px 12px 10px 14px;border-radius:10px;
  font:13px/1.45 "Segoe UI",system-ui,sans-serif;box-shadow:0 6px 24px rgba(0,0,0,.25);z-index:3;display:flex;gap:10px;align-items:flex-start}
.toast .msg{white-space:pre-line;flex:1}
.toast.busy .msg::before{content:"";display:inline-block;width:10px;height:10px;margin-right:7px;border:2px solid rgba(255,255,255,.35);
  border-top-color:#fff;border-radius:50%;animation:uhdspin .8s linear infinite;vertical-align:-1px}
@keyframes uhdspin{to{transform:rotate(360deg)}}
.toast button{flex:none;border:1px solid rgba(255,255,255,.6);background:none;color:#fff;border-radius:6px;padding:3px 9px;font:inherit;font-size:12px;cursor:pointer}
.toast button.close{border:0;font-size:18px;line-height:1;padding:0 2px;opacity:.8}
.toast.err{background:#8a1f17}.toast.ok{background:#12805c}
.panel:not([hidden]) ~ .toast{right:calc(min(480px,100vw) + 16px)}
[hidden]{display:none!important}
`;
  let panel, ui, toastEl, toastTimer;

  function mountPage() {
    const host = document.createElement('div');
    host.id = 'uhd-host';
    host.style.cssText = 'all:initial;position:fixed;top:0;left:0;width:0;height:0;z-index:2147483646';
    document.documentElement.append(host);
    const shadow = host.attachShadow({ mode: 'closed' }); // UYAP sayfasındaki betikler panel içeriğini okuyamaz
    const launch = el('button', { class: 'launch', title: BRAND.name + ' (yerel arama)' }, 'Dosya Ara');
    panel = el('div', { class: 'panel', hidden: true });
    toastEl = el('div', { class: 'toast', hidden: true });
    shadow.append(el('style', null, PAGE_CSS), launch, panel, toastEl);
    ui = mountUI(panel, {
      mode: 'page',
      onOpen: r => openFile(r),
      onUpdate: async full => {
        const res = await startUpdate(full);
        if (!res.ok) ui.setNotice(res.error, 'err');
      },
      onStop: () => stopUpdate(),
      onClose: hidePanel
    });
    launch.addEventListener('click', () => {
      panel.hidden = !panel.hidden;
      if (!panel.hidden) ui.focus();
    });
    // Panel dışına tıklanınca kapat (gölge DOM içindeki tıklamaların hedefi host olarak görünür).
    document.addEventListener('mousedown', e => {
      if (!panel.hidden && e.target !== host) hidePanel();
    }, true);
  }

  function hidePanel() { if (panel) panel.hidden = true; }

  function toast(text, kind, ms, action) {
    if (!toastEl) return;
    clearTimeout(toastTimer);
    const close = el('button', { class: 'close', title: 'Kapat' }, '×');
    close.addEventListener('click', () => { toastEl.hidden = true; });
    toastEl.replaceChildren(el('div', { class: 'msg' }, text));
    if (action) {
      const b = el('button', null, action.label);
      b.addEventListener('click', () => { toastEl.hidden = true; action.fn(); });
      toastEl.append(b);
    }
    if (kind !== 'busy') toastEl.append(close);
    toastEl.className = 'toast' + (kind ? ' ' + kind : '');
    toastEl.hidden = false;
    if (ms) toastTimer = setTimeout(() => { toastEl.hidden = true; }, ms);
  }

  // ---------------------------------------------------------------- Açılış duyurusu
  // UYAP girişte sessionStorage "showPopupDuyuru2" = "true" yapar; ana sayfa bu işaret "true" iken
  // duyuru penceresini gösterir. Penceredeki "Tekrar Gösterme" düğmesi yalnızca işareti "false" yapar;
  // aynısını girişte kendiliğinden yapıyoruz. (KVKK rıza penceresine dokunulmaz.)
  let hideDuyuru = true;
  let duyuruQueued = false;

  function suppressDuyuru() {
    duyuruQueued = false;
    if (!hideDuyuru) return;
    try {
      if (sessionStorage.getItem('showPopupDuyuru2') === 'true') sessionStorage.setItem('showPopupDuyuru2', 'false');
    } catch {}
    // İşaret zamanında değişmediyse açılmış duyuru penceresini UYAP'ın kendi düğmesiyle kapat.
    const body = document.getElementById('duyuruicerik');
    const pop = body && body.closest('.dx-overlay-content');
    if (pop && visible(pop)) {
      const btn = [...pop.querySelectorAll('.dx-button')].find(b => norm(b.textContent.trim()) === 'tekrar gosterme');
      if (btn) btn.click();
    }
  }

  new MutationObserver(() => {
    if (hideDuyuru && !duyuruQueued) { duyuruQueued = true; setTimeout(suppressDuyuru, 0); }
  }).observe(document.documentElement, { childList: true, subtree: true });

  chrome.storage.local.get('uhdPrefs').then(({ uhdPrefs }) => {
    hideDuyuru = !(uhdPrefs && uhdPrefs.showDuyuru);
    suppressDuyuru();
  });
  chrome.storage.onChanged.addListener((ch, area) => {
    if (area === 'local' && ch.uhdPrefs) hideDuyuru = !(ch.uhdPrefs.newValue && ch.uhdPrefs.newValue.showDuyuru);
  });

  // ---------------------------------------------------------------- Mesajlar

  chrome.runtime.onMessage.addListener((msg, sender, send) => {
    if (!msg || typeof msg.type !== 'string') return;
    if (msg.type === 'uhd-ping') send({ ok: true });
    else if (msg.type === 'uhd-open') { openFile(msg.record); send({ ok: true }); }
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
      if (!job && p && p.handoff) setTimeout(() => maybeResume(false), Math.random() * 500);
      // Güncelleme başka sekmede bittiyse görünür sekmede de bildir.
      if (!job && p && p.final && p.owner !== OWNER && !document.hidden) toast(p.text, 'ok', 6000);
    }
  });

  // Sekme kapanır, yenilenir ya da UYAP'tan çıkılırsa işi bırak; açık başka UYAP sekmesi hemen devralır.
  window.addEventListener('pagehide', () => {
    if (!job) return;
    job.lost = true;
    chrome.storage.local.set({ uhdProgress: {
      owner: null, running: false, paused: true, handoff: true, beat: 0, endedAt: Date.now(),
      text: 'Güncelleme yarıda kaldı; açık bir UYAP sekmesinde ya da UYAP’ı yeniden açtığınızda kaldığı yerden sürer.'
    } });
  });

  // Yürüten sekme sinyal vermeden gittiyse (çöktü, Chrome sekmeyi uykuya aldı) bir süre sonra devral.
  setInterval(() => maybeResume(false), 20000);
  setTimeout(() => maybeResume(true), 1500);

  // Son günü 3 gün ya da daha az kalan (veya geçmiş) süreler: UYAP açılınca bu sekmede günde bir kez hatırlat.
  chrome.storage.local.get('uhdSureler').then(({ uhdSureler }) => {
    const { activeSureler, daysLeft, todayIso } = globalThis.UHD;
    const yakin = activeSureler(uhdSureler).filter(s => daysLeft(s.bitis) <= 3);
    if (!yakin.length || ssGet('legalugaSureGosterildi') === todayIso()) return;
    ssSet('legalugaSureGosterildi', todayIso());
    const s = yakin[0], d = daysLeft(s.bitis);
    const kalan = d < 0 ? `${-d} gün geçti` : d === 0 ? 'bugün son gün' : d === 1 ? 'yarın son gün' : `${d} gün kaldı`;
    toast(`${yakin.length > 1 ? `Süresi yaklaşan ${yakin.length} iş var. En yakını: ` : 'Süre yaklaşıyor: '}${s.dosyaNo} · ${s.baslik || 'Süre'} — ${kalan}.`, 'err', 0, {
      label: 'Göster', fn: () => { panel.hidden = false; ui.showSureler(); }
    });
  });

  // Popup'tan gelen ve sayfa yenilemesi gerektiren açma isteği.
  chrome.storage.local.get('uhdPending').then(async ({ uhdPending: p }) => {
    if (!p) return;
    await chrome.storage.local.remove('uhdPending');
    if (Date.now() - p.at > 120000 || !onFormPage()) return;
    openFile(p.record, true);
  });
})();
