"""Chrome Web Mağazası paketi: dist/legaluga-uyap-asistani-<sürüm>.zip

Zip yolları düz eğik çizgiyle yazılır. Windows PowerShell'in Compress-Archive'ı ters eğik çizgi
yazıyor; mağaza bu durumda icons/ altındaki simgeleri bulamayabiliyor.
Kullanım: python scripts/paketle.py
"""
import json
import os
import zipfile

KOK = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
KAYNAK = os.path.join(KOK, 'extension')
CIKTI = os.path.join(KOK, 'dist')

surum = json.load(open(os.path.join(KAYNAK, 'manifest.json'), encoding='utf-8'))['version']
os.makedirs(CIKTI, exist_ok=True)
hedef = os.path.join(CIKTI, f'legaluga-uyap-asistani-{surum}.zip')

with zipfile.ZipFile(hedef, 'w', zipfile.ZIP_DEFLATED, compresslevel=9) as z:
    for kok, dizinler, dosyalar in os.walk(KAYNAK):
        dizinler.sort()
        for ad in sorted(dosyalar):
            yol = os.path.join(kok, ad)
            z.write(yol, os.path.relpath(yol, KAYNAK).replace(os.sep, '/'))

with zipfile.ZipFile(hedef) as z:
    assert z.testzip() is None
    assert 'manifest.json' in z.namelist()
    print(f'{hedef} ({os.path.getsize(hedef)} bayt, {len(z.namelist())} dosya)')
