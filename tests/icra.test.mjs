// Safahat ve icra yardımcıları (extension/common.js). Örnekler uydurmadır.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';

createRequire(import.meta.url)('../extension/common.js');
const { parseSafahat, sonIslemOf, fmtTL, humanKey, borcluAdi, BORCLU_SORGULARI } = globalThis.UHD;

test('safahat en yeni işlem önce; son işlem kısa özet', () => {
  const r = parseSafahat({ safahatlar: [
    { safahatTarihiSTR: '03/02/2026 10:15', safahatTuruAciklama: 'Tensip Zaptı', aciklama: 'Tensip yapıldı', islemYapanBirim: 'Ankara 1. İcra Dairesi' },
    { safahatTarihiSTR: '12/09/2026 14:40', safahatTuruAciklama: 'Haciz Talebi', aciklama: '' },
    { safahatTarihiSTR: '', safahatTuruAciklama: '', aciklama: '' }
  ] });
  assert.deepEqual(r.map(x => x.tur), ['Haciz Talebi', 'Tensip Zaptı']);
  assert.deepEqual(sonIslemOf(r), { tarih: '12/09/2026', tur: 'Haciz Talebi' });
  assert.equal(sonIslemOf([]), null);
  assert.throws(() => parseSafahat({}), /Safahat bilgisi okunamadı/);
});

test('tutar, alan adı ve borçlu adı biçimlenir', () => {
  assert.equal(fmtTL(12345.5), '12.345,50 ₺');
  assert.equal(fmtTL(null), '—');
  assert.equal(humanKey('alacakKalemFaizTutar'), 'Alacak kalem faiz tutar');
  assert.equal(humanKey('toplamTahsilHarci'), 'Toplam tahsil harci');
  assert.equal(borcluAdi({ kisiTumDVO: { adi: 'AHMET', soyadi: 'YILMAZ', tcKimlikNo: '1' } }), 'AHMET YILMAZ');
  assert.equal(borcluAdi({ kisiTumDVO: { kurumAdi: 'ÖRNEK A.Ş.' } }), 'ÖRNEK A.Ş.');
  assert.equal(borcluAdi({}), '');
  assert.ok(BORCLU_SORGULARI.every(s => /^[a-zA-Z_]+$/.test(s.id) && s.ad));
});
