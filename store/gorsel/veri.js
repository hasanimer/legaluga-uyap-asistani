// Mağaza görselleri için chrome.* taklidi ve tamamen uydurma örnek veri (gerçek kişi/dosya yok).
(() => {
  const V = ['AV. SELİN ARSLAN'];
  const K = n => [n];
  const r = (i, no, birim, tur, turAdi, bt, dosyaTur, durum, acilis, taraflar) => ({
    key: 'k' + i, dosyaNo: no, birimAdi: birim, yargiTuru: tur, yargiTuruAdi: turAdi, birimTuruAdi: bt, dosyaTur,
    durum, sorguDurum: durum === 'Kapalı' ? 1 : 0, acilis, acilisTs: Date.parse(acilis.split('.').reverse().join('-')),
    taraflar, tarafV: 2
  });
  const records = [
    r(1, '2026/214', 'İstanbul Anadolu 7. Asliye Hukuk Mahkemesi', '1', 'Hukuk', 'ASLİYE HUKUK MAHKEMESİ', 'Hukuk Dava Dosyası', 'Açık', '12.03.2026',
      [{ adi: 'MERVE YILMAZ', rol: 'Davacı', vekil: V }, { adi: 'KORU YAPI A.Ş.', rol: 'Davalı', vekil: K('AV. EMRE DEMİR') }]),
    r(2, '2025/1187', 'Ankara 3. İş Mahkemesi', '1', 'Hukuk', 'İŞ MAHKEMESİ', 'Hukuk Dava Dosyası', 'Açık', '04.11.2025',
      [{ adi: 'OĞUZ YILMAZ', rol: 'Davacı', vekil: V }, { adi: 'DENİZ LOJİSTİK LTD. ŞTİ.', rol: 'Davalı', vekil: [] }]),
    r(3, '2024/562', 'İzmir 12. Ağır Ceza Mahkemesi', '0', 'Ceza', 'AĞIR CEZA MAHKEMESİ', 'Ceza Dava Dosyası', 'Açık', '19.06.2024',
      [{ adi: 'CAN YILMAZ', rol: 'Mağdur', vekil: V }, { adi: 'BURAK KAYA', rol: 'Sanık', vekil: K('AV. ZEYNEP ÖZ') }]),
    r(4, '2025/3390', 'İstanbul 21. İcra Dairesi', '2', 'İcra', 'İCRA DAİRESİ', 'İcra Dosyası', 'Açık', '28.08.2025',
      [{ adi: 'MERVE YILMAZ', rol: 'Alacaklı', vekil: V }, { adi: 'TUNA YILMAZ', rol: 'Borçlu', vekil: [] }]),
    r(5, '2023/77', 'Bursa 2. Aile Mahkemesi', '1', 'Hukuk', 'AİLE MAHKEMESİ', 'Hukuk Dava Dosyası', 'Kapalı', '15.02.2023',
      [{ adi: 'AYŞE ÇELİK', rol: 'Davacı', vekil: V }, { adi: 'MURAT ÇELİK', rol: 'Davalı', vekil: K('AV. KEREM ŞAHİN') }]),
    r(6, '2026/45', 'Ankara 1. Tüketici Mahkemesi', '1', 'Hukuk', 'TÜKETİCİ MAHKEMESİ', 'Hukuk Dava Dosyası', 'Açık', '09.01.2026',
      [{ adi: 'ELİF AYDIN', rol: 'Davacı', vekil: V }, { adi: 'NOVA ELEKTRONİK A.Ş.', rol: 'Davalı', vekil: [] }]),
    r(7, '2025/908', 'İstanbul 4. İdare Mahkemesi', '6', 'İdari Yargı', 'İDARE MAHKEMESİ', 'İdari Dava Dosyası', 'Açık', '22.05.2025',
      [{ adi: 'KORU YAPI A.Ş.', rol: 'Davacı', vekil: V }, { adi: 'ÖRNEK BELEDİYE BAŞKANLIĞI', rol: 'Davalı', vekil: [] }])
  ];
  const notes = { k1: 'Bilirkişi raporuna itiraz süresi: 2 hafta', k4: 'Haciz talebi hazırlanacak' };
  const store = {
    uhdIndex: { v: 2, updatedAt: Date.now() - 2 * 3600000, records },
    uhdNotes: notes,
    uhdRecent: ['k1', 'k3', 'k6'],
    uhdPrefs: {},
    uhdProgress: { running: false, text: 'Güncelleme tamamlandı: 7 dosya, 1 yeni.', endedAt: Date.now() - 2 * 3600000 }
  };
  window.chrome = {
    storage: {
      local: {
        async get(keys) { const o = {}; for (const k of [].concat(keys)) if (k in store) o[k] = store[k]; return o; },
        async set(obj) { Object.assign(store, obj); },
        async remove() {}
      },
      onChanged: { addListener() {} }
    }
  };
})();
