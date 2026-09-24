# Sahte UYAP sunucusu: eklentinin güncelleme ve düğme bulma akışını test etmek için.
# Yanıtlar windows-1254 kodlamasıyla döner (gerçek UYAP yanıtlarında Türkçe karakterler UTF-8 değil).
import datetime, json, os, random, sys
from http.server import ThreadingHTTPServer, BaseHTTPRequestHandler

HERE = os.path.dirname(os.path.abspath(__file__))
EXT = sys.argv[1] if len(sys.argv) > 1 else os.path.join(HERE, '..', '..', 'extension')
PORT = int(sys.argv[2]) if len(sys.argv) > 2 else 8765

BIRIMLER = {
    '0': [{"altSistKodu": -1, "tablo": "0901", "kod": "AĞIR CEZA MAHKEMESİ"},
          {"altSistKodu": -1, "tablo": "0921", "kod": "ASLİYE CEZA MAHKEMESİ"}],
    '1': [{"altSistKodu": -1, "tablo": "0101", "kod": "ASLİYE HUKUK MAHKEMESİ"}],
    '2': [{"altSistKodu": -1, "tablo": "0501", "kod": "İCRA DAİRESİ"}],
}
ADLAR = ['AYŞE', 'MEHMET', 'ŞÜKRÜ', 'GÜLŞEN', 'İSMAİL', 'ÇAĞLA', 'ÖMER', 'IŞIL', 'ZEYNEP', 'HÜSEYİN']
SOYADLAR = ['YILDIZ', 'ÖZTÜRK', 'ÇELİK', 'KAYA', 'ŞAHİN', 'DOĞAN', 'AYDIN', 'KILIÇ', 'ERDOĞAN', 'GÜNEŞ']

def dosya(i, tur, birim, durum):
    mah = {'0901': 'İstanbul Anadolu 3. Ağır Ceza Mahkemesi', '0921': f'İstanbul Anadolu {30 + i % 3}. Asliye Ceza Mahkemesi',
           '0101': 'Ankara 5. Asliye Hukuk Mahkemesi', '0501': 'İzmir 2. İcra Dairesi'}[birim]
    return {"dosyaId": f"\"ID-{tur}-{birim}-{durum}-{i}@x\"", "dosyaNo": f"{2020 + i % 6}/{100 + i + 50 * durum}",
            "dosyaDurumKod": durum, "dosyaDurum": "Açık" if durum == 0 else "Kapalı",
            "dosyaTurKod": 3, "dosyaTur": {"0": "Ceza Dava Dosyası", "1": "Hukuk Dava Dosyası", "2": "İcra Dosyası"}[tur],
            "dosyaAcilisTarihi": {"date": {"year": 2020 + i % 6, "month": 1 + i % 12, "day": 1 + i % 28}, "time": {"hour": 10, "minute": 0, "second": 0, "nano": 0}},
            "birimAdi": mah, "birimId": str(1000000 + hash(mah) % 99999), "birimTuru1": "09", "birimTuru2": birim, "birimTuru3": "0991"}

DOSYALAR = {}
for tur, bl in BIRIMLER.items():
    for b in bl:
        for durum in (0, 1):
            n = 25 if (b['tablo'] == '0921' and durum == 0) else (3 if durum == 0 else 2)
            DOSYALAR[(tur, b['tablo'], durum)] = [dosya(i, tur, b['tablo'], durum) for i in range(n)]
BY_ID = {d['dosyaId']: d for v in DOSYALAR.values() for d in v}

def taraflar(dosya_id):
    h = sum(map(ord, dosya_id))
    return [{"adi": f"{ADLAR[h % 10]} {SOYADLAR[(h // 10) % 10]}", "rol": "Sanık" if 'Ceza' in BY_ID[dosya_id]['dosyaTur'] else "Davalı", "kisiKurum": "Kişi", **({"vekil": "[DENİZ KARAKAYA]"} if h % 3 == 0 else {})},
            {"adi": f"{ADLAR[(h // 7) % 10]} {SOYADLAR[(h // 3) % 10]}", "rol": "Mağdur" if 'Ceza' in BY_ID[dosya_id]['dosyaTur'] else "Davacı", "vekil": "[TEST AVUKAT]", "kisiKurum": "Kişi"}]

# Evrak listesi. Gerçek UYAP gibi evrakId/dosyaId her yanıtta yeniden "şifrelenir" (rastgele);
# eklenti evrakları birimEvrakNo + onay tarihi + tür ile tanımalı. Her 4 dosyadan birine her sorguda bir evrak eklenir.
EVRAK_CALLS = {}
EVRAK_TURLERI = ['Duruşma Zaptı', 'Bilirkişi Raporu', 'Kapalı E-Tebliğ Mazbatası', 'Ara Karar', 'Diğer Evrak']

def evraklar(dosya_id):
    d = BY_ID[dosya_id]
    n = EVRAK_CALLS[dosya_id] = EVRAK_CALLS.get(dosya_id, 0) + 1
    h = sum(map(ord, dosya_id))
    count = 3 + ((n - 1) if h % 4 == 0 else 0)
    sifre = lambda: '"' + ''.join(random.choice('abcdefXYZ0123456789') for _ in range(40)) + '"'
    def evrak(j, grup_no):
        onay = datetime.date(2026, 1, 1) + datetime.timedelta(days=3 * j)
        gonderim = onay - datetime.timedelta(days=j % 3)
        return {"evrakId": sifre(), "dosyaId": sifre(), "ggEvrakId": sifre(), "birimEvrakNo": 1000 * (h % 97) + j + grup_no,
                "onaylandigiTarih": onay.strftime('%d/%m/%Y'), "sistemeGonderildigiTarih": gonderim.strftime('%d/%m/%Y'),
                "gonderenYerKisi": d['birimAdi'], "tur": EVRAK_TURLERI[j % 5], "tip": "GDN",
                "aciklama": f"Örnek evrak {j}", "ekEvrakListesi": [], "isYetkili": True}
    ana = [evrak(j, 0) for j in range(count, 0, -1)]
    gruplar = {f"{d['dosyaNo']}({d['dosyaTur']})": ana}
    if h % 3 == 0:
        gruplar["2024/555(Talimat Dosyası)"] = [evrak(j, 500) for j in (2, 1)]
    return {"tumEvraklar": gruplar, "son20Evrak": ana[:20], "pageTotal": 1, "status": 200}

# Duruşmalar: her 5 dosyadan birine istenen aralıkta bir duruşma (bugünden i % 20 gün sonra).
def durusmalar(body):
    bas = datetime.datetime.strptime(body['baslangicTarihi'], '%d.%m.%Y').date()
    bit = datetime.datetime.strptime(body['bitisTarihi'], '%d.%m.%Y').date()
    bugun = datetime.date.today()
    out = []
    for i, d in enumerate(BY_ID.values()):
        if i % 5 or d['dosyaDurumKod'] != 0:
            continue
        gun = bugun + datetime.timedelta(days=i % 20)
        if not (bas <= gun <= bit):
            continue
        out.append({"kayitId": 1000 + i, "dosyaId": d['dosyaId'], "dosyaNo": d['dosyaNo'], "dosyaTurKod": d['dosyaTurKod'],
                    "dosyaTurKodAciklama": d['dosyaTur'], "birimId": d['birimId'], "birimTuru2": d['birimTuru2'],
                    "yerelBirimAd": d['birimAdi'], "tarihSaat": f"{gun.isoformat()} {9 + i % 7:02d}:30:00.0",
                    "islemTuru": 0, "islemTuruAciklama": "Duruşma" if i % 3 else "Ön İnceleme", "islemSonucu": 0,
                    "islemSonucuAciklama": "Günü Verildi", "token": "",
                    "dosyaTaraflari": [dict(isim=t['adi'].split(' ')[0], soyad=' '.join(t['adi'].split(' ')[1:]), sifat=t['rol'].upper(),
                                            ilkKisiKurumID=str(j), isVekil=False) for j, t in enumerate(taraflar(d['dosyaId']))]
                                     + [dict(isim='TEST', soyad='AVUKAT', sifat='VEKİL', ilkKisiKurumID='9', isVekil=True)]})
    return out

# Evrak görüntüleme: tek sayfalık küçük bir PDF (gerçek UYAP application/pdf döndürüyor).
ORNEK_PDF = (b"%PDF-1.4\n1 0 obj<</Type/Catalog/Pages 2 0 R>>endobj 2 0 obj<</Type/Pages/Kids[3 0 R]/Count 1>>endobj "
             b"3 0 obj<</Type/Page/Parent 2 0 R/MediaBox[0 0 300 120]/Contents 4 0 R/Resources<</Font<</F1 5 0 R>>>>>>endobj "
             b"4 0 obj<</Length 44>>stream\nBT /F1 18 Tf 20 60 Td (Ornek evrak) Tj ET\nendstream endobj "
             b"5 0 obj<</Type/Font/Subtype/Type1/BaseFont/Helvetica>>endobj\ntrailer<</Root 1 0 R>>\n%%EOF\n")

class H(BaseHTTPRequestHandler):
    def log_message(self, fmt, *a):
        sys.stderr.write("%s\n" % (fmt % a))

    def send(self, code, body, ctype):
        self.send_response(code)
        self.send_header('Content-Type', ctype)
        self.send_header('Content-Length', str(len(body)))
        self.send_header('Cache-Control', 'no-store')
        self.end_headers()
        self.wfile.write(body)

    def do_GET(self):
        p = self.path.split('?')[0]
        if p.startswith('/ext/'):
            f = os.path.join(EXT, p[5:])
            if os.path.isfile(f):
                return self.send(200, open(f, 'rb').read(), 'text/javascript; charset=utf-8' if f.endswith('.js') else 'text/css')
            return self.send(404, b'', 'text/plain')
        if p == '/view_document_brd.uyap':
            from urllib.parse import urlparse, parse_qs
            q = parse_qs(urlparse(self.path).query)
            if not q.get('evrakId') or not q.get('dosyaId'):
                return self.send(200, b'{"error":"eksik"}', 'text/json')
            return self.send(200, ORNEK_PDF, 'application/pdf')
        if p.startswith('/mock/'):
            return self.send(200, open(os.path.join(HERE, p[6:]), 'rb').read(), 'text/javascript; charset=utf-8')
        return self.send(200, open(os.path.join(HERE, 'mock.html'), 'rb').read(), 'text/html; charset=utf-8')

    def do_POST(self):
        body = json.loads(self.rfile.read(int(self.headers.get('Content-Length', 0))) or b'{}')
        p = self.path.lstrip('/')
        if p == 'yargiBirimleriSorgula_brd.ajx':
            out = BIRIMLER.get(body.get('yargiTuru'), [])
        elif p == 'search_phrase_detayli.ajx':
            rows = DOSYALAR.get((body.get('birimTuru3'), body.get('birimTuru2'), body.get('dosyaDurumKod')), [])
            if body.get('birimId'):
                rows = [r for r in rows if r['birimId'] == body['birimId']]
            size, page = body.get('pageSize', 500), body.get('pageNumber', 1)
            out = [rows[(page - 1) * size: page * size], len(rows)]
        elif p == 'dosya_taraf_bilgileri_brd.ajx':
            out = taraflar(body['dosyaId']) if body.get('dosyaId') in BY_ID else {"error": "yok"}
        elif p == 'avukat_durusma_sorgula_brd.ajx':
            out = durusmalar(body)
        elif p == 'list_dosya_evraklar.ajx':
            out = evraklar(body['dosyaId']) if body.get('dosyaId') in BY_ID else {"error": "yok"}
        else:
            out = {}
        self.send(200, json.dumps(out, ensure_ascii=False).encode('windows-1254'), 'text/json')

ThreadingHTTPServer(('127.0.0.1', PORT), H).serve_forever()
