# Chrome Web Mağazası — Form Metinleri

Geliştirici konsolunda (`chrome.google.com/webstore/devconsole`) ilgili alanlara kopyalanacak metinler.

## 1. Paket

- **Yüklenecek dosya:** `python scripts/paketle.py` çıktısı (`dist/legaluga-uyap-asistani-<sürüm>.zip`); `manifest.json` zip'in en üst düzeyindedir.

## 2. Mağaza girişi (Store listing)

**Ad** (manifest'ten gelir): Legaluga UYAP Asistanı

**Kısa açıklama** (manifest'ten gelir, 127/132 karakter):
UYAP Avukat Portalı dosyalarınızı ad, soyad, dosya no veya mahkemeyle anında bulur, tek tıkla açar. Veriler yalnız cihazınızda.

**Kategori:** Verimlilik (Productivity) → İş Akışı ve Planlama (Workflow & Planning)
**Dil:** Türkçe

**Ayrıntılı açıklama:**

```
UYAP Avukat Portalı'nda bir dosyayı bulmak için yargı türü, yargı birimi ve taraf seçip sorgu yapmaya son. Legaluga UYAP Asistanı ile müvekkilinizin adını, dosya numarasını veya mahkeme adını yazmanız yeterli; dosya anında listelenir, "Dosya Görüntüle" ile UYAP'ta açılır.

NASIL ÇALIŞIR
1. UYAP Avukat Portalı'na her zamanki gibi e-imzanızla giriş yapın.
2. "Güncelle"ye basın. Vekili olduğunuz dosyalar, taraf bilgileri ve açık dosyaların evrak listesi yalnız bilgisayarınıza kaydedilir.
3. Ad, soyad, dosya no, mahkeme veya not yazın; sonuçlar yazdıkça gelir.
4. "Dosya Görüntüle"ye basın; asistan UYAP'ın Dosya Sorgulama ekranını doldurur ve dosyayı Pencere Görünümü ile açar.

ÖZELLİKLER
• Türkçe karakter gerekmez: "sukru ozturk" yazın, ŞÜKRÜ ÖZTÜRK bulunsun
• Kesintisiz güncelleme: güncelleme sürerken başka sekmelerde çalışabilirsiniz; sekme kapanır ya da oturum düşerse kaldığı yerden sürer
• Yeni evrak takibi: her güncellemede açık dosyalarınıza gelen yeni evrakları (tür, onay tarihi, gönderen) listeler
• Müvekkillerinizi otomatik tanır, ayrı gösterir; yalnız müvekkil adlarında arama
• Duruşma takvimi: sonraki 60 günün duruşmaları dosya kartında ve günlere göre listede; bugünkü duruşma hatırlatması; takvime aktarma (.ics)
• Evrakı açma: yeni ya da son evrakı tek tıkla UYAP'tan getirip görüntüleme
• Kesintisiz güncelleme; durdurup kaldığı yerden sürdürme; isteğe bağlı otomatik güncelleme
• Açık ve koyu tema, dosyayı aramalardan gizleme, yedekle / yedekten yükle
• Süre hatırlatıcı: tebligat için süre ve son gün girin; yaklaşan süreler panelde ve UYAP açılışında hatırlatılır
• Müvekkil kartı: bir taraf adına tıklayın, o kişinin tüm dosyaları ve rolleri tek ekranda
• Karşı taraf vekiliyle arama
• Açık/Kapalı ve Ceza/Hukuk/İcra/İdari filtreleri
• Dosyalara yalnız sizin gördüğünüz notlar
• Künyeyi tek tıkla kopyalama ("… 2026/214 E.")
• Son açılan dosyalar
• Excel'e (CSV) aktarma
• UYAP girişindeki duyuru penceresini gizleme (isteğe bağlı; varsayılan kapalı)
• Klavyeyle kullanım: Alt+Shift+D ile açın, ↑↓ ile seçin, Enter ile açın

GİZLİLİK
• Sunucu yok, hesap yok. Verileriniz hiçbir sunucuya gönderilmez.
• Yazarken UYAP'a istek gitmez; UYAP'tan veri yalnız "Güncelle"ye bastığınızda (ya da açtıysanız otomatik güncellemede) alınır.
• UYAP şifrenize ve e-imzanıza erişilmez. Evrak yalnız siz "Aç"a bastığınızda UYAP'tan alınıp ekranda gösterilir; saklanmaz.
• Ayarlar → "Tüm verileri sil" ile her şey tek tıkla silinir.

YETKİLER VE GEREKÇELERİ
• avukat.uyap.gov.tr erişimi: Eklenti yalnız UYAP Avukat Portalı'nda çalışır; dosya listesini sizin açık oturumunuzdan alır ve dosyayı açmak için Dosya Sorgulama ekranını doldurur. Başka hiçbir siteye erişmez.
• Depolama (storage): Dosya listesi, notlar ve ayarlar yalnız bilgisayarınızda saklanır.
• Sınırsız depolama (unlimitedStorage): Çok dosyalı bürolarda indeks 10 MB sınırını aşabilir.

Gizlilik politikası: https://legaluga.com/gizlilik/uyap-asistani

Legaluga ürünüdür. T.C. Adalet Bakanlığı veya UYAP ile resmî bir bağlantısı yoktur.
```

**Görseller** (`store/gorsel/`):
- Simge 128×128: `extension/icons/icon-128.png`
- Ekran görüntüleri 1280×800: `ekran-1.png`, `ekran-2.png`, `ekran-3.png`
- Küçük tanıtım görseli 440×280: `tanitim-440x280.png`
- Kayan yazı tanıtım bloğu 1400×560: `kayan-1400x560.png`

**Resmî URL / Ana sayfa:** https://legaluga.com
**Destek URL'si:** İsteğe bağlı; sitede iletişim adresi (`ILETISIM_EPOSTA`) tanımlanınca https://legaluga.com/hakkinda verilebilir.

## 3. Gizlilik uygulamaları (Privacy practices)

**Tek amaç (Single purpose):**
```
Avukatın UYAP Avukat Portalı'ndaki kendi dosyalarını ad, soyad, dosya numarası veya mahkeme adıyla yerel olarak aramasını ve seçilen dosyayı UYAP'ta tek tıkla açmasını sağlamak.
```

**Yetki gerekçeleri:**

| Yetki | Gerekçe |
|---|---|
| `storage` | Kullanıcının dosya listesi, açık dosyaların evrak listesi, notları ve ayarları yalnızca cihazda (chrome.storage.local) saklanır; arama bu yerel indeks üzerinde yapılır. |
| `unlimitedStorage` | Çok sayıda dosyası olan avukatlarda taraf bilgileriyle birlikte indeks varsayılan 10 MB sınırını aşabilir; bu yetki olmadan güncelleme yarıda kalır. |
| Ana makine: `https://avukat.uyap.gov.tr/*` | Eklenti yalnızca UYAP Avukat Portalı'nda çalışır: kullanıcının açık oturumunda dosya listesini ve açık dosyaların evrak listesini alır ve seçilen dosyayı açmak için portalın Dosya Sorgulama ekranını doldurur. Başka hiçbir siteye erişmez. |

**Uzak kod (Remote code):** Hayır, uzak kod kullanmıyorum. Tüm JavaScript paketin içindedir; harici betik, `eval` veya uzaktan yüklenen kod yoktur.

**Veri kullanımı — işaretlenecek veri türleri:**
- ☑ **Kişisel tanımlayıcı bilgiler** (Personally identifiable information): Dosya taraflarının ve vekillerinin adları. Yalnızca cihazda saklanır, iletilmez.
- ☑ **Web sitesi içeriği** (Website content): UYAP'tan alınan dosya numarası, mahkeme adı, dosya türü ve durum bilgileri; açık dosyaların evrak listesi (evrak türü, onay ve gönderim tarihi, gönderen, açıklama, birim evrak no); duruşma listesi (tarih, saat, mahkeme, işlem, taraf adları). Kullanıcı "Aç"a bastığında evrak içeriği UYAP'tan alınıp yalnız ekranda gösterilir, saklanmaz. Hepsi yalnızca cihazda kalır, iletilmez.
- Diğerleri (sağlık, finans, kimlik doğrulama, kişisel iletişim, konum, web geçmişi, kullanıcı etkinliği) işaretlenmez.

> Not: Veriler cihazdan çıkmasa da eklenti bu verileri işlediği için beyan ediyoruz. Eksik beyan, fazla beyandan daha büyük bir ret sebebidir.

**Onaylanacak üç beyan (üçü de işaretlenir):**
- ☑ Kullanıcı verilerini onaylanan kullanım alanları dışında üçüncü taraflara satmıyorum veya aktarmıyorum.
- ☑ Kullanıcı verilerini eklentinin tek amacıyla ilgisi olmayan amaçlarla kullanmıyorum veya aktarmıyorum.
- ☑ Kullanıcı verilerini kredibilite belirlemek veya borç verme amacıyla kullanmıyorum veya aktarmıyorum.

**Gizlilik politikası URL'si:** https://legaluga.com/gizlilik/uyap-asistani (kaynağı Legaluga deposunda `apps/web/app/gizlilik/uyap-asistani/page.tsx`)

## 4. Dağıtım

- **Görünürlük:** Herkese açık
- **Bölgeler:** Türkiye (UYAP yalnız Türkiye'de kullanılıyor; tüm bölgeler de seçilebilir)

## 5. İnceleyene not (Test instructions)

```
Bu eklenti, Türkiye'deki avukatların kullandığı UYAP Avukat Portalı (avukat.uyap.gov.tr) için bir yardımcıdır. Portala giriş yalnızca avukatlara özel e-imza ile yapılabildiği için test hesabı sağlanamamaktadır. Eklenti oturum açmadan da yüklenebilir: popup'ta ilk kullanım ekranı görünür. Eklentinin sunucusu yoktur ve hiçbir veriyi harici bir adrese göndermez; tek ağ isteği aynı kaynaktaki avukat.uyap.gov.tr uç noktalarına yapılır (content.js, api fonksiyonu). Mağaza görsellerindeki kişi ve dosya bilgileri tamamen uydurmadır.
```
