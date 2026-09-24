// Evrak takibi çekirdeği (extension/common.js): UYAP evrak listesini ayrıştırma ve taramalar arası karşılaştırma.
// Örnek yanıtlar uydurmadır; yapı UYAP'ın list_dosya_evraklar.ajx yanıtıyla aynıdır.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';

createRequire(import.meta.url)('../extension/common.js');
const { parseEvraklar, diffEvrak, unseenEvrak, evrakKey, trDateTs, search, sonEvrak, lastEvrak, personFiles, trToIso, todayIso, addPeriod, daysLeft, sureUyarilari, activeSureler, isTebligat, parseDurusma, upcomingDurusmalar, uyapDate, durusmaIcs } = globalThis.UHD;

// UYAP evrakId/dosyaId'yi her yanıtta yeniden şifreler; testte de her çağrıda farklı kimlik üretilir.
let sayac = 0;
const sifre = () => `"SIFRELI-${++sayac}"`;
const evrak = (no, onay, tur, extra = {}) => ({
  evrakId: sifre(), dosyaId: sifre(), ggEvrakId: sifre(), birimEvrakNo: no,
  onaylandigiTarih: onay, sistemeGonderildigiTarih: onay, gonderenYerKisi: 'Ankara 14. Asliye Ceza Mahkemesi',
  tur, tip: 'GDN', ekEvrakListesi: [], isYetkili: true, ...extra
});
const yanit = evraklar => ({
  tumEvraklar: {
    '2025/9101(Ceza Dava Dosyası)': evraklar(),
    '2024/555(Talimat Dosyası)': [evrak(7001, '11/11/2024', 'Talimat Üst Yazısı')]
  },
  son20Evrak: evraklar().slice(0, 20),
  pageTotal: 1,
  status: 200
});
const ilk = () => [evrak(12, '02/08/2026', 'Kapalı E-Tebliğ Mazbatası'), evrak(11, '21/07/2026', 'Duruşma Zaptı')];

test('evrak, şifreli kimlikle değil birim evrak no + onay tarihi + türle tanınır', () => {
  const a = parseEvraklar(yanit(ilk)).items.map(i => i.k).sort();
  const b = parseEvraklar(yanit(ilk)).items.map(i => i.k).sort();
  assert.deepEqual(a, b);
  assert.equal(evrakKey(evrak(12, '02/08/2026', 'Ara Karar')), '12|02/08/2026|Ara Karar');
});

test('bağlı dosyaların evrakları da okunur, dosya başlığı saklanır', () => {
  const { items, bad } = parseEvraklar(yanit(ilk));
  assert.equal(items.length, 3);
  assert.equal(bad, 0);
  assert.ok(items.some(i => i.dosya === '2024/555(Talimat Dosyası)'));
});

test('kimlik ya da tarih eksikse tahmin edilmez; liste hiç yoksa hata verilir', () => {
  const r = parseEvraklar({ son20Evrak: [evrak(null, '01/01/2026', 'X'), evrak(5, '', 'Y'), evrak(6, '02/01/2026', 'Z')] });
  assert.equal(r.items.length, 1);
  assert.equal(r.bad, 2);
  assert.throws(() => parseEvraklar({ status: 200 }), /Evrak listesi okunamadı/);
  assert.throws(() => parseEvraklar(null), /Evrak listesi okunamadı/);
});

test('ilk tarama başlangıçtır; sonraki taramada yalnız eklenen evrak yenidir', () => {
  const t1 = diffEvrak(undefined, parseEvraklar(yanit(ilk)).items);
  assert.equal(t1.yeni.length, 0);
  assert.equal(t1.seen.length, 3);

  const sonra = () => [evrak(13, '12/09/2026', 'Diğer Evrak', { sistemeGonderildigiTarih: '10/09/2026' }), ...ilk()];
  const t2 = diffEvrak(t1.seen, parseEvraklar(yanit(sonra)).items);
  assert.deepEqual(t2.yeni.map(y => [y.tur, y.onay, y.gonderim]), [['Diğer Evrak', '12/09/2026', '10/09/2026']]);
  assert.equal(t2.seen.length, 4);

  const t3 = diffEvrak(t2.seen, parseEvraklar(yanit(sonra)).items);
  assert.equal(t3.yeni.length, 0);
});

test('listeden düşüp geri gelen evrak yeniden "yeni" sayılmaz; yeniler onay tarihine göre sıralanır', () => {
  const t1 = diffEvrak([], [{ k: 'a' }, { k: 'b' }]);
  const t2 = diffEvrak(t1.seen, [{ k: 'a' }]);
  const t3 = diffEvrak(t2.seen, [{ k: 'a' }, { k: 'b' }, { k: 'c', onay: '01/02/2026' }, { k: 'd', onay: '15/03/2026' }]);
  assert.deepEqual(t3.yeni.map(y => y.k), ['d', 'c']);
  assert.equal(trDateTs('12/09/2026'), Date.UTC(2026, 8, 12));
  assert.equal(trDateTs('2026-09-12'), 0);
});

test('"Görüldü" sonrası eski yeniler gizlenir, sonradan gelenler görünür', () => {
  const r = { key: 'a', yeniEvrak: [{ k: '2', at: 200 }, { k: '1', at: 100 }] };
  assert.equal(unseenEvrak(r, {}).length, 2);
  assert.deepEqual(unseenEvrak(r, { a: 150 }).map(y => y.k), ['2']);
  assert.equal(unseenEvrak(r, { a: 300 }).length, 0);
  assert.equal(unseenEvrak({ key: 'b' }, {}).length, 0);
});

test('"Yeni evrak" filtresi yalnız yeni evraklı dosyaları, en yeni evrak önde listeler', () => {
  const kayit = (key, no) => ({ key, dosyaNo: no, birimAdi: 'Ankara 1. Asliye Hukuk Mahkemesi', yargiTuru: '1', sorguDurum: 0, taraflar: [] });
  const records = [kayit('a', '2025/1'), kayit('b', '2025/2'), kayit('c', '2025/3')];
  const yeni = new Map([['a', 10], ['c', 20]]);
  const bul = q => search(records, q, { filter: { onlyNew: true }, yeni }).items.map(r => r.key).join(',');
  assert.equal(bul(''), 'c,a');
  assert.equal(bul('2025/1'), 'a');
  assert.equal(search(records, '', {}).total, 0);
});

test('dosyadaki son evrak onay tarihine göre bulunur; eski kayıtlarda anahtarlardan çıkarılır', () => {
  const items = parseEvraklar(yanit(ilk)).items;
  assert.deepEqual(sonEvrak(items), { k: '12|02/08/2026|Kapalı E-Tebliğ Mazbatası', tur: 'Kapalı E-Tebliğ Mazbatası', onay: '02/08/2026', gonderim: '02/08/2026', dosya: '2025/9101(Ceza Dava Dosyası)' });
  assert.equal(sonEvrak([]), null);
  const seen = diffEvrak(undefined, items).seen;
  assert.deepEqual(lastEvrak({ evrakSeen: seen }), { k: '12|02/08/2026|Kapalı E-Tebliğ Mazbatası', tur: 'Kapalı E-Tebliğ Mazbatası', onay: '02/08/2026', gonderim: undefined, dosya: undefined });
  assert.equal(lastEvrak({ sonEvrak: { onay: '01/01/2026', tur: 'X' }, evrakSeen: seen }).onay, '01/01/2026');
  assert.equal(lastEvrak({}), null);
});

test('müvekkil kartı: aynı kişinin tüm dosyaları, rolleri; açık ve son evrakı yeni olan önde', () => {
  const kayit = (key, durum, onay, taraflar, acilisTs = 0) => ({ key, dosyaNo: key, birimAdi: 'X', sorguDurum: durum, acilisTs,
    sonEvrak: onay ? { onay, tur: 'Ara Karar' } : undefined, taraflar });
  const V = ['TEST AVUKAT'];
  const records = [
    kayit('kapali', 1, '01/09/2026', [{ adi: 'AYŞE YILMAZ', rol: 'Davacı', vekil: V }]),
    kayit('eski', 0, '01/01/2026', [{ adi: 'Ayşe  Yılmaz', rol: 'Alacaklı', vekil: V }]),
    kayit('yeni', 0, '05/09/2026', [{ adi: 'AYŞE YILMAZ', rol: 'Mağdur', vekil: V }]),
    kayit('karsi', 0, null, [{ adi: 'AYŞE YILMAZ', rol: 'Davalı', vekil: ['DENİZ KARAKAYA'] }]),
    kayit('baska', 0, '10/09/2026', [{ adi: 'AYŞE YILMAZER', rol: 'Davacı', vekil: V }])
  ];
  const f = personFiles(records, 'ayse yilmaz', 'Test Avukat');
  assert.deepEqual(f.map(x => x.r.key), ['yeni', 'eski', 'kapali', 'karsi']);
  assert.deepEqual(f[0].roller, [{ rol: 'Mağdur', muvekkil: true }]);
  assert.deepEqual(f.find(x => x.r.key === 'karsi').roller, [{ rol: 'Davalı', muvekkil: false }]);
  assert.deepEqual(personFiles(records, '', 'Test Avukat'), []);
});

test('süre hatırlatıcı: takvim hesabı, kalan gün, uyarılar', () => {
  assert.equal(addPeriod('2026-09-01', 2, 'hafta'), '2026-09-15');
  assert.equal(addPeriod('2026-09-25', 10, 'gün'), '2026-10-05');
  assert.equal(addPeriod('2026-01-31', 1, 'ay'), '2026-02-28');
  assert.equal(addPeriod('2028-01-31', 1, 'ay'), '2028-02-29');
  assert.equal(addPeriod('2026-12-15', 1, 'ay'), '2027-01-15');
  assert.equal(addPeriod('', 2, 'hafta'), '');
  assert.equal(addPeriod('2026-09-01', 0, 'gün'), '');
  assert.equal(daysLeft('2026-09-30', '2026-09-24'), 6);
  assert.equal(daysLeft('2026-09-20', '2026-09-24'), -4);
  assert.equal(daysLeft('2026-03-30', '2026-03-28'), 2);   // yaz saati geçişinden etkilenmez
  assert.equal(trToIso('05/09/2026'), '2026-09-05');
  assert.equal(todayIso(new Date(2026, 8, 4, 23, 59)), '2026-09-04');
  assert.deepEqual(sureUyarilari('2026-09-23'), []);                 // Çarşamba
  assert.equal(sureUyarilari('2026-09-26').length, 1);               // Cumartesi
  assert.equal(sureUyarilari('2026-07-20').length, 1);               // adli tatil başı (Pazartesi)
  assert.equal(sureUyarilari('2026-08-29').length, 2);               // adli tatil + Cumartesi
  assert.deepEqual(sureUyarilari('2026-09-01'), []);
  assert.ok(isTebligat('Kapalı E-Tebliğ Mazbatası'));
  assert.ok(isTebligat('TEBLIGAT'));
  assert.ok(!isTebligat('Bilirkişi Raporu'));
});

test('süre hatırlatıcı: yalnız tamamlanmamışlar, en yakın önce; "Süreler" filtresi', () => {
  const s = activeSureler({
    a: { id: 'a', key: 'k1', bitis: '2026-10-10' },
    b: { id: 'b', key: 'k2', bitis: '2026-09-30' },
    c: { id: 'c', key: 'k3', bitis: '2026-09-25', done: true },
    d: { id: 'd', key: 'k4', bitis: 'bozuk' }
  });
  assert.deepEqual(s.map(x => x.id), ['b', 'a']);
  const kayit = key => ({ key, dosyaNo: key, birimAdi: 'X', sorguDurum: 0, taraflar: [] });
  const sure = new Map([['k1', '2026-10-10'], ['k2', '2026-09-30']]);
  const bul = q => search([kayit('k1'), kayit('k2'), kayit('k3')], q, { filter: { onlySure: true }, sure }).items.map(r => r.key).join(',');
  assert.equal(bul(''), 'k2,k1');
  assert.equal(bul('k1'), 'k1');
});

// Uydurma örnek; yapı avukat_durusma_sorgula_brd.ajx yanıtıyla aynı.
const durusmaYaniti = (tarihSaat, extra = {}) => ({
  kayitId: 123456789, dosyaId: '"SIFRELI"', dosyaNo: '2025/9101', dosyaTurKod: 3, dosyaTurKodAciklama: 'Ceza Dava Dosyası',
  birimId: '1000123', birimTuru2: '0921', yerelBirimAd: 'Ankara 14. Asliye Ceza Mahkemesi', tarihSaat,
  islemTuru: 0, islemTuruAciklama: 'Duruşma', islemSonucu: 0, islemSonucuAciklama: 'Günü Verildi',
  dosyaTaraflari: [
    { isim: 'AHMET', soyad: 'YILMAZ', sifat: 'SANIK', ilkKisiKurumID: '1', isVekil: false },
    { isim: 'TEST', soyad: 'AVUKAT', sifat: 'VEKİL', ilkKisiKurumID: '2', isVekil: true },
    { isim: 'ÖRNEK KURUM', sifat: 'MÜŞTEKİ', ilkKisiKurumID: '3', isVekil: false }
  ],
  token: 'GIZLI', ...extra
});

test('duruşma kaydı: indeks anahtarı, tarih/saat, vekil (avukatın kendisi) ve jeton saklanmaz', () => {
  const d = parseDurusma(durusmaYaniti('2026-10-07 10:30:00.0'));
  assert.equal(d.key, '1000123|2025/9101|3');
  assert.equal(d.tarih, '2026-10-07');
  assert.equal(d.saat, '10:30');
  assert.equal(d.islem, 'Duruşma');
  assert.deepEqual(d.taraflar, [{ ad: 'AHMET YILMAZ', sifat: 'SANIK' }, { ad: 'ÖRNEK KURUM', sifat: 'MÜŞTEKİ' }]);
  assert.ok(!JSON.stringify(d).includes('GIZLI') && !JSON.stringify(d).includes('SIFRELI'));
  assert.equal(parseDurusma(durusmaYaniti('bozuk')), null);
  assert.equal(uyapDate(new Date(2026, 8, 4)), '04.09.2026');
});

test('yaklaşan duruşmalar sıralı; takvim dosyası UTC saatli ve taraf adsız', () => {
  const a = parseDurusma(durusmaYaniti('2026-10-07 14:00:00.0', { kayitId: 2 }));
  const b = parseDurusma(durusmaYaniti('2026-10-07 09:15:00.0', { kayitId: 3 }));
  const c = parseDurusma(durusmaYaniti('2026-09-01 09:00:00.0', { kayitId: 4 }));
  assert.deepEqual(upcomingDurusmalar([a, b, c], '2026-09-24').map(d => d.id), ['3', '2']);
  const ics = durusmaIcs([b], new Date(Date.UTC(2026, 8, 24, 7, 0)));
  assert.match(ics, /DTSTART:20261007T061500Z/);
  assert.match(ics, /DTEND:20261007T071500Z/);
  assert.match(ics, /SUMMARY:Duruşma: 2025\/9101 Ankara 14. Asliye Ceza Mahkemesi/);
  assert.ok(!ics.includes('AHMET'));
  assert.ok(ics.startsWith('BEGIN:VCALENDAR\r\n') && ics.endsWith('END:VCALENDAR\r\n'));
});
