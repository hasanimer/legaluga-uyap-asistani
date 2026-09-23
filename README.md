# Legaluga UYAP Asistanı

UYAP Avukat Portalı (`avukat.uyap.gov.tr`) için Chrome eklentisi (Manifest V3). Avukatın dosyalarını ad, soyad, dosya numarası, mahkeme adı veya notla yerel indekste arar; **Dosya Görüntüle** ile dosyayı UYAP'ın Dosya Sorgulama ekranında bulup **Pencere Görünümü**'nde açar.

Sunucusu yoktur. Veriler yalnız kullanıcının bilgisayarında (`chrome.storage.local`) tutulur. T.C. Adalet Bakanlığı veya UYAP ile resmî bir bağlantısı yoktur.

- Chrome Web Mağazası öğesi: `aicknihmpdcbfgidifffinnbgbghkmcn` (yayıncı `92d486e7-f6aa-45a5-941f-24189e231a84`)
- Gizlilik politikası: https://legaluga.com/gizlilik/uyap-asistani (kaynağı Legaluga deposunda: `apps/web/app/gizlilik/uyap-asistani/page.tsx`)

## Yapı

| Yol | Ne |
| --- | --- |
| `extension/` | Eklentinin kendisi; Chrome'a bu klasör yüklenir |
| `extension/common.js` | Türkçe normalleştirme, yerel arama, müvekkil tespiti, UYAP açılış adresi; marka adı ve renkleri (`BRAND`) |
| `extension/ui.js` | Arama arayüzü; popup ve UYAP sayfasındaki yan panel aynı kodu kullanır |
| `extension/content.js` | UYAP sekmesinde çalışır: güncelleme, düğme bularak dosya açma, açılış duyurusunu gizleme |
| `tests/arama.test.mjs` | Arama çekirdeğinin birim testleri |
| `tests/sahte-uyap/` | DevExtreme 25 ile kurulmuş sahte Dosya Sorgulama ekranı ve windows-1254 yanıt veren sahte sunucu |
| `store/` | Mağaza form metinleri ve görselleri (görseller `store/gorsel/*.html` sayfalarından üretilir; veriler uydurmadır) |
| `scripts/paketle.py` | Mağaza zip'ini üretir |

## Nasıl çalışır

- **Güncelleme** (yalnız kullanıcı "Güncelle"ye bastığında): UYAP Detaylı Sorgulama ekranının kendi kullandığı istekler. Her yargı türü ve birim türü için açık/kapalı dosyalar `search_phrase_detayli.ajx` ile listelenir, taraf ve vekil adları `dosya_taraf_bilgileri_brd.ajx` ile alınır. Yanıtlar UTF-8 değilse windows-1254 olarak çözülür.
- **Arama**: tamamen yerel; yazarken UYAP'a istek gitmez.
- **Dosya açma**: `/dosya-sorgulama?mode=detayli&yargiTur=…&yargiBirimi=…&dosyaDurum=…` adresi formu hazır doldurur (form yeniden kurulsun diye önce boş bir yola geçilir). Eklenti alanları doğrular, **Sorgula**'ya basar, sonuç tablosunda satırı bulur ve `aria-label="Pencere Görünümü"` düğmesine tıklar. Adımlar konsola `[Legaluga]` önekiyle yazılır; açılamazsa bildirim tablo teşhisini (satır/düğme sayısı) gösterir.
- **Açılış duyurusu**: UYAP girişte `sessionStorage.showPopupDuyuru2 = "true"` yapar; eklenti bunu "Tekrar Gösterme" düğmesinin yaptığı gibi `"false"` yapar. Ayarlardan kapatılabilir. KVKK rıza penceresine dokunulmaz.

UYAP'ın kaynak kodundan çıkarılan ve eklentinin dayandığı noktalar: form alanları `#yargiTur`, `#yargiBirim`, `#dosya-durumu-detayli-arama`; sonuç tablosu `#table-dosya-sorgulama`; satır düğmesi `aria-label="Pencere Görünümü"`; dosya penceresi `.dosya-sorgula-popup`. UYAP arayüzü değişirse önce bunlar kontrol edilir.

## Geliştirme

1. `chrome://extensions` → **Geliştirici modu** → **Paketlenmemiş öğe yükle** → bu deponun `extension` klasörü.
2. Kodu değiştirdikten sonra eklentinin ↻ düğmesine basın ve UYAP sekmesini yenileyin.

### Test

```bash
node --test "tests/*.test.mjs"
```

Düğme bularak açma akışı için sahte UYAP:

```bash
python tests/sahte-uyap/server.py extension 8765
```

`http://localhost:8765` açılır; sayfa `chrome.*` API'sini taklit eder. Konsolda `await __uhdSend({type:'uhd-update'})` indeks kurar, `__uhdSend({type:'uhd-open', record})` dosya açar. `localStorage.uyapLike = 1` tabloyu ve düğmeleri gerçek UYAP gibi kimliksiz ve sütun gizlemeli çizer; `localStorage.narrow = 1` dar ekranı, `localStorage.ignoreParams = 1` adres parametrelerini yok sayan formu dener.

## Sürüm yayınlama

1. `extension/manifest.json` içindeki `version` değerini artırın.
2. `python scripts/paketle.py` → `dist/legaluga-uyap-asistani-<sürüm>.zip`.
3. Geliştirici konsolu → öğe → **Paket** → **Yeni paket yükle** → **İnceleme için gönder**.
4. Veri akışı değiştiyse gizlilik sayfası, `store/magaza-formu.md` ve konsoldaki Gizlilik beyanları aynı değişiklikle güncellenir; Google aralarındaki tutarsızlığı politika ihlali sayar.

Chrome, eklentilerin (Claude in Chrome dahil) Web Mağazası sayfalarını kontrol etmesine izin vermez; konsol işlemleri elle ya da Claude masaüstü uygulamasının yerleşik tarayıcısıyla yapılır.
