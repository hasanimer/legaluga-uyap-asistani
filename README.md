<p align="center">
  <a href="https://chromewebstore.google.com/detail/legaluga-uyap-asistan%C4%B1/aicknihmpdcbfgidifffinnbgbghkmcn?hl=tr">
    <img src="assets/kapak.png" alt="Legaluga UYAP Asistanı: UYAP dosyanızı isimle bulun, tek tıkla açın" width="100%">
  </a>
</p>

<h1 align="center">Legaluga UYAP Asistanı</h1>

<p align="center">
  <strong>Dosyanızı isimle bulun. UYAP'ta tek tıkla açın.</strong><br>
  UYAP Avukat Portalı için ücretsiz ve açık kaynaklı Chrome eklentisi.
</p>

<p align="center">
  <a href="https://chromewebstore.google.com/detail/legaluga-uyap-asistan%C4%B1/aicknihmpdcbfgidifffinnbgbghkmcn?hl=tr"><strong>⬇️ Chrome'a ekle</strong></a>
  &nbsp;·&nbsp; <a href="#nasıl-çalışır">Nasıl çalışır?</a>
  &nbsp;·&nbsp; <a href="#gizlilik">Gizlilik</a>
</p>

---

| 🔎 **İsimle ara** | 🗂️ **Tek tıkla aç** | 🔔 **Takip et** |
| :--- | :--- | :--- |
| Kişi adı, dosya no, mahkeme veya not yazın. Türkçe karakter şart değil. | Sonuçtaki dosyayı UYAP'ta doğrudan açın. | Duruşmaları ve isteğe bağlı yeni evrakları görün. |

## Nasıl çalışır?

1. **Güncelle:** UYAP oturumunuzdaki dosyalar yerel indekse alınır.
2. **Ara:** İsmi, dosya numarasını veya mahkemeyi yazın.
3. **Aç:** **Dosya Görüntüle**'ye basın.

![Müvekkil adıyla arama ve dosya sonuçları](assets/arama.png)

## Eklentiden bir bakış

| Filtreleyin, not alın | Verileriniz cihazınızda kalsın |
| :---: | :---: |
| <img src="assets/filtreler.png" alt="Dosya filtreleri ve notlar" width="100%"> | <img src="assets/gizlilik.png" alt="Yerel veri saklama ayarları" width="100%"> |

Dosyaları açık/kapalı ve yargı türüne göre süzebilir, aynı kişiye ait dosyaları bir arada görebilir, kendinize not ve süre hatırlatıcısı ekleyebilirsiniz.

## Kurulum

1. **[Chrome Web Mağazası'nda aç →](https://chromewebstore.google.com/detail/legaluga-uyap-asistan%C4%B1/aicknihmpdcbfgidifffinnbgbghkmcn?hl=tr)** bağlantısına gidip **Chrome'a ekle**'ye basın.
2. Eklentiyi araç çubuğuna sabitleyin.
3. [UYAP Avukat Portalı](https://avukat.uyap.gov.tr/)'na giriş yapın ve eklentide **Güncelle**'ye basın. İlk tarama dosya sayınıza göre birkaç dakika sürebilir.

Arama kutusuna yazmaya başladığınızda sonuçlar yerel indeksinizden gelir. Yeni evrak takibi isterseniz **Ayarlar → Güncelleme → Yeni evrakları bul** seçeneğini açın; başlangıçta kapalıdır.

<details>
<summary>Kaynak kodundan yükleme</summary>

1. **Code → Download ZIP** ile depoyu indirin ve ZIP'i kalıcı bir klasöre çıkarın.
2. Chrome'da `chrome://extensions` sayfasını açıp **Geliştirici modu**nu etkinleştirin.
3. **Paketlenmemiş öğe yükle** ile `manifest.json` dosyasının bulunduğu klasörü seçin.

Chrome eklentiyi bu klasörden çalıştırır; klasörü sonradan silmeyin veya taşımayın.

</details>

## Gizlilik

> **Ararken UYAP'a yeni istek gönderilmez.** Dosya indeksi ve notlar Chrome'un yerel depolamasında tutulur; eklentinin kendi sunucusu yoktur. Güncelleme ve dosya açma işlemleri UYAP oturumunuz üzerinden yapılır.

[Gizlilik politikasını okuyun →](https://legaluga.com/gizlilik/uyap-asistani)

## Açık kaynak ve önemli notlar

Kaynak kodu [MIT lisansıyla](LICENSE) yayımlanır. Hata ve öneriler için [issue açabilirsiniz](https://github.com/hasanimer/legaluga-uyap-asistani/issues).

Eklenti yalnız `avukat.uyap.gov.tr` üzerinde çalışır ve T.C. Adalet Bakanlığı veya UYAP'ın resmî ürünü değildir. Süre hatırlatıcısında tarih ve süreyi siz girersiniz; önerilen son günü ve duruşma bilgilerini UYAP üzerinden doğrulayın.
