# Legaluga UYAP Asistanı

UYAP Avukat Portalı (`avukat.uyap.gov.tr`) için Chrome eklentisi (Manifest V3). Avukatın dosyalarını ad, soyad, dosya numarası, mahkeme adı veya notla yerel indekste arar; **Dosya Görüntüle** ile dosyayı UYAP'ın Dosya Sorgulama ekranında bulup **Pencere Görünümü**'nde açar. Güncellemede açık dosyalara gelen yeni evrakları da bulup gösterir.

Sunucusu yoktur. Veriler yalnız kullanıcının bilgisayarında (`chrome.storage.local`) tutulur. T.C. Adalet Bakanlığı veya UYAP ile resmî bir bağlantısı yoktur.

- Chrome Web Mağazası öğesi: `aicknihmpdcbfgidifffinnbgbghkmcn` (yayıncı `92d486e7-f6aa-45a5-941f-24189e231a84`)
- Gizlilik politikası: https://legaluga.com/gizlilik/uyap-asistani (kaynağı Legaluga deposunda: `apps/web/app/gizlilik/uyap-asistani/page.tsx`)

## Kurulum

Chrome Web Mağazası'nda yayınlandığında mağaza sayfasından **Chrome'a ekle** ile kurulur. O zamana kadar:

1. Bu sayfada **Code → Download ZIP** ile depoyu indirin ve bir klasöre çıkarın (OneDrive gibi eşitlenen klasörler yerine örn. `C:\Legaluga\`).
2. Chrome'da `chrome://extensions` adresini açın, sağ üstten **Geliştirici modu**nu açın.
3. **Paketlenmemiş öğe yükle** → çıkardığınız klasördeki `extension` klasörünü seçin.
4. Araç çubuğundaki yapboz simgesinden **Legaluga UYAP Asistanı**'nı sabitleyin.

Klasörü silmeyin ya da taşımayın; Chrome eklentiyi oradan çalıştırır.

## Kullanım

### 1. İlk güncelleme (bir kez)

1. [UYAP Avukat Portalı](https://avukat.uyap.gov.tr)'na e-imza ile giriş yapın.
2. Eklenti simgesine tıklayın ya da UYAP sayfasının sağ kenarındaki **Dosya Ara** şeridine basın.
3. **Güncelle**'ye basın. Eklenti tüm açık ve kapalı dosyalarınızı, ardından taraf ve vekil adlarını ve açık dosyaların evrak listesini UYAP'tan alır. Dosya sayısına göre birkaç dakika sürebilir. Bu sırada UYAP'ta gezinebilir, başka sekmelerde ya da programlarda çalışabilirsiniz; güncelleme arka planda sürer. **Durdur** ile yarıda kesebilirsiniz; o ana kadar alınan bilgiler korunur.

**Güncelleme yarıda kalırsa** kendiliğinden kaldığı yerden sürer:

| Durum | Ne olur |
| --- | --- |
| UYAP sekmesini yenilediniz | Sayfa açılınca birkaç saniye içinde sürer. |
| Güncellemenin yürüdüğü sekmeyi kapattınız | Açık başka bir UYAP sekmesi hemen devralır; hiç yoksa UYAP'ı bir sonraki açışınızda sürer. |
| UYAP oturumu düştü | Güncelleme duraklar; UYAP'a yeniden girdiğinizde sürer. |
| Chrome sekmeyi uykuya aldı ya da kapandı | En geç 2 dakika içinde açık başka bir UYAP sekmesi, ya da UYAP'ı bir sonraki açışınızda sürer. |

Yarıda kalmış bir güncelleme varken **Güncelle** düğmesi **Sürdür** olur; **İptal et** onu bırakır. Liste alma adımında kalındıysa dosya listesi yeniden alınır (kısa sürer), taraf ve evrak adımları kaldığı yerden sürer.

Sonraki güncellemelerde yalnız yeni ve eksik dosyaların taraf bilgileri alınır, bu yüzden çok daha kısa sürer. Liste 7 günden eskiyse eklenti hatırlatır. **Tümünü yenile** her şeyi baştan alır.

### 2. Arama

Arama kutusuna yazmaya başlayın; sonuçlar anında gelir ve yazarken UYAP'a istek gitmez.

| Yazdığınız | Örnek |
| --- | --- |
| Taraf adı / soyadı | `yılmaz`, `ayşe yıl` |
| Dosya numarası | `2025/123`, `123` |
| Mahkeme / birim | `ankara 14 asliye hukuk`, `icra` |
| Karşı taraf vekili | vekilin adı |
| Kendi notunuz | notta geçen bir kelime |

- Birden çok kelime yazarsanız hepsini içeren dosyalar gelir; sıra önemsizdir.
- Türkçe karakter gerekmez: `sukru` = `Şükrü`, `IŞIK` = `ışık`.
- Kutu boşken **Son açılanlar** listelenir.

**Filtreler:** **Açık / Kapalı** (dosya durumu), **Ceza / Hukuk / İcra / Diğer** (yargı türü; Diğer = İdari Yargı, Satış Memurluğu, Arabuluculuk, Tazminat Komisyonu), **Müvekkil** (yalnız müvekkil adlarında arar). Filtre seçip kutuyu boş bırakırsanız o gruptaki tüm dosyalar listelenir.

**Müvekkil tespiti:** Sizin vekil olduğunuz taraflar sonuçta **Müvekkil** olarak ayrı gösterilir ve aramada öne çıkar. Adınız çoğu zaman otomatik bulunur; bulunamazsa **Ayarlar → Vekil adınız** alanına yazın (birden çok ad virgülle ayrılabilir).

### 3. Dosyayı açma

Sonuçta **Dosya Görüntüle**'ye basın (ya da ↑↓ ile seçip **Enter**). Eklenti UYAP'ın Dosya Sorgulama ekranını açar, yargı türü, birim ve durumu seçer, **Sorgula**'ya basar, tablodaki satırı bulur ve dosyayı **Pencere Görünümü**'nde açar. Adımlar sağ altta kısa bildirimlerle görünür.

Dosya açılamazsa bildirimde nedeni yazar; Dosya Sorgulama ekranı yine doldurulmuş olarak kalır, satırı elle açabilirsiniz. Dosya yakın zamanda kapandı ya da taşındıysa önce **Güncelle**'ye basın.

### 4. Yeni evraklar

Her **Güncelle**'de açık dosyaların evrak listesi (UYAP'taki **Evrak Getir** ekranının listesi) bir önceki güncellemeyle karşılaştırılır:

- **İlk güncelleme başlangıçtır:** o ana kadarki evraklar "görülmüş" sayılır, yeni evrak gösterilmez. Yeni evraklar ikinci güncellemeden itibaren çıkar.
- Her açık dosyanın kartında **Son evrak** tarihi ve türü görünür (ör. `Son evrak 12/09/2026 · Bilirkişi Raporu`); Excel'e aktarımda da ayrı sütundur. Tarih son güncellemedeki duruma göredir.
- Yeni evrak gelen dosyalarda **Yeni evrak** etiketi ve evrakların türü, tarihi, göndereni görünür. Tarih UYAP'ın sıraladığı **onay tarihi**dir; sisteme gönderim tarihi farklıysa parantez içinde o da yazılır (ör. `Onay 12/09/2026 (sisteme gönderim 10/09/2026)`).
- Dosyaya bağlı talimat ya da soruşturma dosyasına gelen evrak da gösterilir; hangi dosyaya geldiği ayrıca yazılır.
- Paneldeki **… dosyada … yeni evrak var · Göster** bildirimi ya da **Yeni evrak** filtresi yalnız bu dosyaları listeler.
- **Görüldü** o dosyanın yeni evraklarını listeden kaldırır; filtre açıkken **Tümünü görüldü say** hepsini kaldırır. Sonraki güncellemelerde gelen evraklar yine görünür.

Evrakların kendisi ve içerikleri indirilmez; yalnız liste bilgisi (tür, tarih, gönderen, açıklama, birim evrak no) saklanır. Kapalı dosyalar kontrol edilmez. Her açık dosya için UYAP'a bir istek daha gittiği için güncelleme biraz uzar; istemezseniz **Ayarlar → Güncellemede açık dosyalardaki yeni evrakları bul** işaretini kaldırın.

### 5. Diğer özellikler

- **Kopyala:** Dosya künyesini (`Ankara 14. Asliye Hukuk Mahkemesi 2025/123 E.` biçiminde) panoya kopyalar; dilekçeye yapıştırmak için.
- **Not ekle:** Dosyaya yalnız bu bilgisayarda görünen not yazın (Enter kaydeder, Shift+Enter yeni satır, Esc vazgeçer). Notlar aramada da bulunur.
- **Excel'e aktar (CSV):** Ayarlar'dan tüm dosyaları taraflar, vekiller ve notlarla birlikte Excel'de açılabilen dosya olarak indirir.
- **UYAP duyuru penceresi:** UYAP girişte her seferinde çıkan duyuru penceresi varsayılan olarak gizlenir. Görmek isterseniz Ayarlar'dan işareti kaldırın. KVKK onay penceresine dokunulmaz.
- **Kısayol:** **Alt+Shift+D** eklentiyi açar. `chrome://extensions/shortcuts` adresinden değiştirebilirsiniz.

### Verileriniz

Dosya listesi, taraf adları, açık dosyaların evrak listesi, notlar ve ayarlar yalnız bu bilgisayarda Chrome'un eklenti deposunda tutulur; Legaluga'ya ya da başka bir sunucuya gönderilmez. Eklenti yalnız `avukat.uyap.gov.tr` üzerinde çalışır ve UYAP'a yalnız siz **Güncelle**'ye bastığınızda, sizin oturumunuzla, UYAP'ın kendi ekranlarının kullandığı istekleri yapar. **Ayarlar → Tüm verileri sil** her şeyi siler; eklentiyi kaldırmak da siler. Ayrıntı: [Gizlilik politikası](https://legaluga.com/gizlilik/uyap-asistani).

### Sorun giderme

| Durum | Çözüm |
| --- | --- |
| Güncelleme "yarıda kaldı" diyor | UYAP açıksa kendiliğinden sürer; beklemek istemezseniz **Sürdür**'e basın. |
| "UYAP sekmesi eklentiye yanıt vermedi" | UYAP sekmesini yenileyin (F5) ve tekrar deneyin. Eklentiyi yeni kurduysanız açık UYAP sekmeleri yenilenmeden çalışmaz. |
| Güncelleme oturum hatasıyla durdu | UYAP oturumunuz düşmüş olabilir; yeniden giriş yapıp **Güncelle**'ye basın, kaldığı yerden devam eder. |
| Yeni evrak görünmüyor | İlk güncelleme başlangıç sayılır; yeni evraklar ikinci güncellemeden itibaren çıkar. Ayarlar'da evrak kontrolünün açık olduğunu ve dosyanın açık olduğunu kontrol edin. |
| Aradığım dosya çıkmıyor | Yeni açılan dosyalar için **Güncelle**'ye basın; filtrelerin kapalı olduğunu kontrol edin. |
| Dosya açılmıyor | Bildirimdeki mesajı ve Chrome konsolundaki (F12) `[Legaluga]` satırlarını info@legaluga.com'a gönderin. Ekran görüntüsünde müvekkil bilgisi varsa kapatın. |

## Yapı

| Yol | Ne |
| --- | --- |
| `extension/` | Eklentinin kendisi; Chrome'a bu klasör yüklenir |
| `extension/common.js` | Türkçe normalleştirme, yerel arama, müvekkil tespiti, UYAP açılış adresi; marka adı ve renkleri (`BRAND`) |
| `extension/ui.js` | Arama arayüzü; popup ve UYAP sayfasındaki yan panel aynı kodu kullanır |
| `extension/content.js` | UYAP sekmesinde çalışır: güncelleme (dosya listesi, taraflar, evrak kontrolü; kaldığı yerden sürdürülebilir), düğme bularak dosya açma, açılış duyurusunu gizleme |
| `extension/background.js` | Güncellemeyi yürüten sekme kapanınca işi hemen serbest bırakır (ağ isteği yapmaz, veri okumaz) |
| `tests/arama.test.mjs`, `tests/evrak.test.mjs` | Arama ve evrak takibi çekirdeğinin birim testleri |
| `tests/sahte-uyap/` | DevExtreme 25 ile kurulmuş sahte Dosya Sorgulama ekranı ve windows-1254 yanıt veren sahte sunucu |
| `store/` | Mağaza form metinleri ve görselleri (görseller `store/gorsel/*.html` sayfalarından üretilir; veriler uydurmadır) |
| `scripts/paketle.py` | Mağaza zip'ini üretir |

## Nasıl çalışır

- **Güncelleme** (yalnız kullanıcı "Güncelle"ye bastığında): UYAP Detaylı Sorgulama ekranının kendi kullandığı istekler. Her yargı türü ve birim türü için açık/kapalı dosyalar `search_phrase_detayli.ajx` ile listelenir, taraf ve vekil adları `dosya_taraf_bilgileri_brd.ajx` ile alınır. Yanıtlar UTF-8 değilse windows-1254 olarak çözülür.
- **Evrak takibi** (Güncelle'nin son adımı, Ayarlar'dan kapatılabilir): bu taramada bulunan her açık dosya için `list_dosya_evraklar.ajx {dosyaId, pageNumber}` çağrılır (UYAP'ın Evrak Getir ekranının isteği; `pageTotal` > 1 ise en çok 20 sayfa). Yanıttaki `tumEvraklar` dosyayı ve bağlı dosyaları (talimat, soruşturma…) `"2025/9101(Ceza Dava Dosyası)"` başlıklarıyla gruplar, `son20Evrak` ana dosyanın son 20 evrakıdır. **`evrakId` ve `dosyaId` her yanıtta yeniden şifrelenir** (aynı evrak her istekte farklı kimlikle gelir), bu yüzden evrak `birimEvrakNo|onaylandigiTarih|tur` anahtarıyla tanınır; bu alanlardan biri eksikse evrak tahminle eşleştirilmez, özette sayılır. Görülen anahtarlar kayıtta `evrakSeen`, yeniler `yeniEvrak` olarak tutulur; "Görüldü" zamanları ayrı `uhdEvrakGoruldu` anahtarındadır (güncelleme sürerken indeksle yarışmasın diye).
- **Kesintisiz güncelleme**: Güncelleme bir iş kaydıdır (`uhdJob`: aşama, istatistikler). Yürüten sekme `uhdProgress.owner/beat` ile sinyal verir; indeks her 10 dosyada bir kaydedilir. Sekme yenilenirse `sessionStorage`'daki sekme kimliğinden işin kendisinde olduğunu anlayıp hemen sürdürür; sekme kapanırsa `background.js` (`tabs.onRemoved`) işi serbest bırakır ve açık başka UYAP sekmesi devralır; sinyal 90 sn gelmezse her UYAP sekmesi 20 sn'de bir devralmayı dener (aynı anda birden çok sekme denerse son yazan kazanır, diğerleri çekilir). Oturum düşmesi işi `paused: 'oturum'` ile duraklatır; bir sonraki sayfa yüklemesinde (yeniden girişten sonra) liste tazelenip sürer. Sekme arka plandayken Chrome zamanlayıcıları yavaşlattığı için istekler arası 150 ms bekleme yalnız sekme görünürken yapılır; istekler her durumda sırayla, birer birer gider.
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

`http://localhost:8765` açılır; sayfa `chrome.*` API'sini taklit eder. Sahte sunucu evrak listesinde kimlikleri her yanıtta rastgele üretir ve her 4 dosyadan birine her sorguda bir evrak ekler; iki güncellemeden sonra "Yeni evrak" görünür. Konsolda `await __uhdSend({type:'uhd-update'})` indeks kurar, `__uhdSend({type:'uhd-open', record})` dosya açar. `localStorage.uyapLike = 1` tabloyu ve düğmeleri gerçek UYAP gibi kimliksiz ve sütun gizlemeli çizer; `localStorage.narrow = 1` dar ekranı, `localStorage.ignoreParams = 1` adres parametrelerini yok sayan formu dener.

## Sürüm yayınlama

1. `extension/manifest.json` içindeki `version` değerini artırın.
2. `python scripts/paketle.py` → `dist/legaluga-uyap-asistani-<sürüm>.zip`.
3. Geliştirici konsolu → öğe → **Paket** → **Yeni paket yükle** → **İnceleme için gönder**.
4. Veri akışı değiştiyse gizlilik sayfası, `store/magaza-formu.md` ve konsoldaki Gizlilik beyanları aynı değişiklikle güncellenir; Google aralarındaki tutarsızlığı politika ihlali sayar.

Chrome, eklentilerin (Claude in Chrome dahil) Web Mağazası sayfalarını kontrol etmesine izin vermez; konsol işlemleri elle ya da Claude masaüstü uygulamasının yerleşik tarayıcısıyla yapılır.
