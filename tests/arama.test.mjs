// Eklentinin yerel arama çekirdeği (extension/common.js): Türkçe normalleştirme, arama, müvekkil tespiti,
// filtreler ve UYAP açılış adresi. Bağımlılık yoktur: node --test "tests/*.test.mjs"
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';

createRequire(import.meta.url)('../extension/common.js');
const { norm, search, openPath, detectMyName, myKeys, isClient, csvCell, csvDosyaNo } = globalThis.UHD;

const V = ['TEST AVUKAT'];
const kayitlar = [
  { key: 'a', dosyaNo: '2025/9101', birimAdi: 'Ankara 14. Asliye Ceza Mahkemesi', dosyaTur: 'Ceza Dava Dosyası', yargiTuru: '0', yargiTuruAdi: 'Ceza', birimTuru2: '0921', birimTuruAdi: 'ASLİYE CEZA MAHKEMESİ', sorguDurum: 0, acilisTs: 3,
    taraflar: [{ adi: 'AHMET YILMAZ', rol: 'Sanık', vekil: ['DENİZ KARAKAYA'] }, { adi: 'ŞÜKRÜ ÖZTÜRK', rol: 'Mağdur', vekil: V }] },
  { key: 'b', dosyaNo: '2024/4450', birimAdi: 'İstanbul 5. Asliye Hukuk Mahkemesi', dosyaTur: 'Hukuk Dava Dosyası', yargiTuru: '1', yargiTuruAdi: 'Hukuk', birimTuru2: '0101', birimTuruAdi: 'ASLİYE HUKUK MAHKEMESİ', sorguDurum: 1, acilisTs: 2,
    taraflar: [{ adi: 'MEHMET ÖZTÜRK', rol: 'Davacı', vekil: V }, { adi: 'AHMET KAYA', rol: 'Davalı', vekil: [] }] },
  { key: 'c', dosyaNo: '2023/12', birimAdi: 'Ankara 2. İcra Dairesi', dosyaTur: 'İcra Dosyası', yargiTuru: '2', yargiTuruAdi: 'İcra', birimTuru2: '0501', birimTuruAdi: 'İCRA DAİRESİ', sorguDurum: 0, acilisTs: 1, taraflar: null },
  { key: 'd', dosyaNo: '2022/7', birimAdi: 'Ankara İdare Mahkemesi', dosyaTur: 'İdari Dava Dosyası', yargiTuru: '6', yargiTuruAdi: 'İdari Yargı', birimTuru2: '0601', birimTuruAdi: 'İDARE MAHKEMESİ', sorguDurum: 0, acilisTs: 0, taraflar: [] }
];
const bul = (q, o = {}) => search(kayitlar, q, { myName: 'TEST AVUKAT', ...o }).items.map(r => r.key).join(',');

test('normalleştirme uzunluğu korur (vurgulama buna dayanır)', () => {
  for (const s of ['İSTANBUL Kartal 9. Asliye Ceza Mahkemesi', 'ŞÜKRÜ ÇAĞLAR ığdır', 'Âdem Îmer Ûmit', 'x y']) {
    assert.equal(norm(s).length, s.length, s);
  }
  assert.equal(norm('İSTANBUL ÇAĞLAR'), 'istanbul caglar');
  assert.equal(norm('IŞIK'), 'isik');
});

test('Türkçe karakter gerekmeden ad, dosya no ve mahkemeyle bulur', () => {
  assert.equal(bul('ozturk'), 'a,b');
  assert.equal(bul('sukru'), 'a');
  assert.equal(bul('Öztürk mehmet'), 'b');
  assert.equal(bul('2025/9101'), 'a');
  assert.equal(bul('asliye hukuk'), 'b');
  assert.equal(bul('icra ankara'), 'c');
  assert.equal(bul('ANKARA asliye ceza'), 'a');
  assert.equal(bul('yok böyle'), '');
  assert.equal(bul(''), '');
});

test('müvekkil tespiti ve müvekkil filtresi', () => {
  assert.equal(detectMyName(kayitlar), 'TEST AVUKAT');
  assert.ok(isClient(kayitlar[0].taraflar[1], myKeys('Av. Test Avukat')));
  assert.ok(!isClient(kayitlar[0].taraflar[0], myKeys('test avukat')));
  assert.equal(bul('ahmet'), 'a,b');
  assert.equal(bul('ahmet', { filter: { onlyClient: true } }), '');
  assert.equal(bul('ozturk', { filter: { onlyClient: true } }), 'a,b');
});

test('karşı vekil aranır, kendi vekil adı her dosyayı eşleştirmez', () => {
  assert.equal(bul('karakaya'), 'a');
  assert.equal(bul('test avukat'), '');
});

test('notla arama ve durum/tür filtreleri', () => {
  assert.equal(bul('bilirkisi', { notes: { c: 'Bilirkişi raporu bekleniyor' } }), 'c');
  assert.equal(bul('', { filter: { durum: 'kapali' } }), 'b');
  assert.equal(bul('', { filter: { tur: 'other' } }), 'd');
  assert.equal(bul('ankara', { filter: { tur: '2', durum: 'acik' } }), 'c');
});

test('UYAP Dosya Sorgulama adresi formu hazır doldurur', () => {
  assert.equal(openPath(kayitlar[1]), '/dosya-sorgulama?mode=detayli&yargiTur=1&yargiBirimi=0101&dosyaDurum=kapali');
  assert.equal(openPath(kayitlar[0]), '/dosya-sorgulama?mode=detayli&yargiTur=0&yargiBirimi=0921&dosyaDurum=acik');
});

test("Excel dışa aktarımı UYAP'tan gelen formülleri çalıştırmaz", () => {
  for (const kotu of ['=HYPERLINK("http://x","t")', '+1+1', '-2+3', '@SUM(A1)', '	=1']) {
    assert.ok(csvCell(kotu).startsWith(`"'`), kotu);
  }
  assert.equal(csvCell('AHMET "KOCA" YILMAZ'), '"AHMET ""KOCA"" YILMAZ"');
  assert.equal(csvCell(null), '""');
  assert.equal(csvDosyaNo('2025/9101'), '"=""2025/9101"""');
  assert.equal(csvDosyaNo('=1+1'), `"'=1+1"`);
});
