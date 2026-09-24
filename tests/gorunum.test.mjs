// Görünüm yardımcıları, arama sırası, gizlenen dosyalar ve yedek biçimi (extension/common.js).
// Örnek adlar uydurmadır.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';

createRequire(import.meta.url)('../extension/common.js');
const { trTitle, cleanDurum, cleanBirim, evrakTakipAcik, checkBackup, BACKUP_APP, BACKUP_FORMAT, search } = globalThis.UHD;

test('adlar yalnız baş harfleri büyük gösterilir; kısaltmalar ve karışık yazım korunur', () => {
  assert.equal(trTitle('ŞÜKRÜ ÖZTÜRK'), 'Şükrü Öztürk');
  assert.equal(trTitle('İSMAİL IŞIK'), 'İsmail Işık');
  assert.equal(trTitle('KORU YAPI A.Ş.'), 'Koru Yapı A.Ş.');
  assert.equal(trTitle('DENİZ LOJİSTİK LTD. ŞTİ.'), 'Deniz Lojistik LTD. ŞTİ.');
  assert.equal(trTitle('T.C. ÇEVRE VE ŞEHİRCİLİK BAKANLIĞI'), 'T.C. Çevre ve Şehircilik Bakanlığı');
  assert.equal(trTitle('AYŞE YILMAZ-KAYA'), 'Ayşe Yılmaz-Kaya');
  assert.equal(trTitle('Ankara 1. Asliye Hukuk Mahkemesi'), 'Ankara 1. Asliye Hukuk Mahkemesi');
  for (const s of ['ŞÜKRÜ ÖZTÜRK', 'İSMAİL IŞIK', 'KORU YAPI A.Ş.']) assert.equal(trTitle(s).length, s.length);
});

test('dosya durumu ve kapatılan birim adı temizlenir', () => {
  assert.deepEqual(cleanDurum('Kapalı (2022-02-03 13:44:11.0)'), { label: 'Kapalı', tarih: '03.02.2022' });
  assert.deepEqual(cleanDurum('Karara Çıkmış'), { label: 'Karara Çıkmış', tarih: '' });
  assert.equal(cleanBirim('(Kapatılan)Ankara 2. Asliye Ticaret Mahkemesi'), 'Ankara 2. Asliye Ticaret Mahkemesi (kapatılan)');
  assert.equal(cleanBirim('Ankara 2. İcra Dairesi'), 'Ankara 2. İcra Dairesi');
});

test('yeni evrak takibi yeni kurulumda kapalı, önceden kullanılıyorsa açık', () => {
  assert.equal(evrakTakipAcik({}, []), false);
  assert.equal(evrakTakipAcik({}, [{ evrakSeen: ['a'] }]), true);
  assert.equal(evrakTakipAcik({ evrakKapali: true }, [{ evrakSeen: ['a'] }]), false);
  assert.equal(evrakTakipAcik({ evrakTakip: true }, []), true);
  assert.equal(evrakTakipAcik({ evrakTakip: false }, [{ evrakSeen: ['a'] }]), false);
});

const kayit = (key, birimAdi, taraflar, dosyaNo = key) => ({ key, dosyaNo, birimAdi, yargiTuru: '1', sorguDurum: 0, taraflar });
const records = [
  kayit('bolge', 'Ankara Bölge Adliye Mahkemesi 1. Hukuk Dairesi', [{ adi: 'AYŞE GÜNEŞ', vekil: ['KEMAL ÇANKAYA'] }]),
  kayit('asliye', 'Ankara Çankaya 3. Asliye Hukuk Mahkemesi', [{ adi: 'MEHMET KAYA', vekil: [] }]),
  kayit('vekil', 'İzmir 1. İş Mahkemesi', [{ adi: 'ALİ VURAL', vekil: ['DENİZ KARAKAYA'] }])
];

test('birden çok kelime aynı alanda geçen dosya öne çıkar', () => {
  const r = search(records, 'ankara cankaya', {}).items.map(x => x.key);
  assert.deepEqual(r, ['asliye', 'bolge']);
});

test('karşı taraf vekillerinde arama kapatılabilir; gizlenen dosya aramada görünmez', () => {
  assert.deepEqual(search(records, 'karakaya', {}).items.map(x => x.key), ['vekil']);
  assert.equal(search(records, 'karakaya', { vekilAra: false }).total, 0);
  assert.deepEqual(search(records, 'ankara', { gizli: { bolge: true } }).items.map(x => x.key), ['asliye']);
});

test('yedek dosyası: yalnız bu uygulamanın ve desteklenen biçimin yedeği kabul edilir', () => {
  const ok = { app: BACKUP_APP, format: BACKUP_FORMAT, data: { uhdNotes: { a: 'not' }, uhdIndex: { records: [] }, zararli: 1 } };
  assert.deepEqual(Object.keys(checkBackup(ok)).sort(), ['uhdIndex', 'uhdNotes']);
  assert.throws(() => checkBackup({ app: 'baska', format: 1, data: {} }), /yedeği değil/);
  assert.throws(() => checkBackup({ app: BACKUP_APP, format: 99, data: {} }), /desteklenmiyor/);
  assert.throws(() => checkBackup({ app: BACKUP_APP, format: BACKUP_FORMAT, data: { uhdIndex: { records: 'x' } } }), /bozuk/);
  assert.throws(() => checkBackup(null), /yedeği değil/);
});
