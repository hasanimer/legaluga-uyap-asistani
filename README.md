# Legaluga UYAP Asistanı

**UYAP dosyanızı aramak, açmak ve takip etmek daha kolay.**

Legaluga UYAP Asistanı, [UYAP Avukat Portalı](https://avukat.uyap.gov.tr/) için açık kaynaklı bir Chrome eklentisidir. Dosyalarınızı bir kez güncelledikten sonra kişi adı, dosya numarası, mahkeme veya kendi notunuzla saniyeler içinde bulabilirsiniz.

**[Chrome Web Mağazası'ndan yükle](https://chromewebstore.google.com/detail/legaluga-uyap-asistan%C4%B1/aicknihmpdcbfgidifffinnbgbghkmcn?hl=tr)**

## Neler yapar?

- **Hızlı arama:** Açık ve kapalı dosyaları Türkçe karakter yazmadan da arayın.
- **Tek tıkla açma:** Bulduğunuz dosyayı UYAP'ta açın.
- **Dosya takibi:** Yaklaşan duruşmaları ve isteğe bağlı yeni evrak bildirimlerini görün.
- **Kişi kartı:** Aynı kişinin geçtiği dosyaları bir arada inceleyin.
- **Kişisel düzen:** Dosyalara not ve süre hatırlatıcısı ekleyin.

Arama, bilgisayarınızda tutulan yerel indeks üzerinde çalışır. Eklentinin kendi sunucusu yoktur; indeks ve notlar Chrome'un yerel depolamasında kalır. Güncelleme ve dosya açma işlemleri için UYAP oturumunuzu kullanır.

## Kurulum

1. [Chrome Web Mağazası sayfasını](https://chromewebstore.google.com/detail/legaluga-uyap-asistan%C4%B1/aicknihmpdcbfgidifffinnbgbghkmcn?hl=tr) açın ve **Chrome'a ekle**'ye basın.
2. Eklentiyi araç çubuğuna sabitleyin.

Kaynak kodundan kurmak isterseniz **Code → Download ZIP** ile depoyu indirin, ZIP'i kalıcı bir klasöre çıkarın ve `chrome://extensions` sayfasında **Geliştirici modu → Paketlenmemiş öğe yükle** yoluyla `manifest.json` dosyasının bulunduğu klasörü seçin. Bu klasörü sonradan silmeyin veya taşımayın.

## İlk kullanım

1. UYAP Avukat Portalı'na giriş yapın.
2. Eklenti simgesine veya sayfanın sağındaki **Dosya Ara** şeridine tıklayın.
3. **Güncelle**'ye basın. İlk tarama dosya sayınıza göre birkaç dakika sürebilir.
4. Arama kutusuna bir isim, dosya numarası ya da mahkeme yazın. Sonuçtaki **Dosya Görüntüle** ile dosyayı açın.

Yeni evrakları görmek isterseniz **Ayarlar → Güncelleme → Yeni evrakları bul** seçeneğini açın. Bu seçenek varsayılan olarak kapalıdır.

## Bilmeniz gerekenler

- Eklenti yalnız `avukat.uyap.gov.tr` üzerinde çalışır ve UYAP hesabınızla giriş yapmanız gerekir.
- Süre hatırlatıcısında başlangıç tarihi ve süreyi siz girersiniz. Önerilen son günü ve duruşma bilgilerini UYAP üzerinden doğrulayın.
- Bu proje T.C. Adalet Bakanlığı veya UYAP'ın resmî ürünü değildir.
- [Gizlilik politikası](https://legaluga.com/gizlilik/uyap-asistani)

## Açık kaynak

Kaynak kodu [MIT lisansı](LICENSE) ile yayımlanır. Kullanabilir, değiştirebilir ve lisans koşullarına uyarak dağıtabilirsiniz. Hata veya öneri için GitHub'da bir issue açabilirsiniz.
