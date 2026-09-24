// Evrak takibi çekirdeği (extension/common.js): UYAP evrak listesini ayrıştırma ve taramalar arası karşılaştırma.
// Örnek yanıtlar uydurmadır; yapı UYAP'ın list_dosya_evraklar.ajx yanıtıyla aynıdır.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';

createRequire(import.meta.url)('../extension/common.js');
const { parseEvraklar, diffEvrak, unseenEvrak, evrakKey, trDateTs, search, sonEvrak, lastEvrak, personFiles } = globalThis.UHD;

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
  assert.deepEqual(sonEvrak(items), { tur: 'Kapalı E-Tebliğ Mazbatası', onay: '02/08/2026', gonderim: '02/08/2026', dosya: '2025/9101(Ceza Dava Dosyası)' });
  assert.equal(sonEvrak([]), null);
  const seen = diffEvrak(undefined, items).seen;
  assert.deepEqual(lastEvrak({ evrakSeen: seen }), { tur: 'Kapalı E-Tebliğ Mazbatası', onay: '02/08/2026', gonderim: undefined, dosya: undefined });
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
