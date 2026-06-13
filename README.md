# Stok Planlayıcı

Bu proje, Trendyol mağazan için hazırladığım stok takip uygulamasıdır.

## Ne yapıldı?
- `index.html`, `style.css`, `script.js` ile tarayıcıda çalışan stok takip uygulaması eklendi.
- `package.json` ve `main.js` ile Electron uygulaması haline getirildi.
- `package` betiği ile Windows için `.exe` dosyası oluşturma yapılabilir.

## `.exe` oluşturma
1. `stokplanlayıcı` klasöründe bir terminal aç.
2. `npm install` komutunu çalıştır.
3. `npm run package` komutunu çalıştır.
4. Oluşan `.exe` dosyası `release\StokPlanlayici-win32-x64\StokPlanlayici.exe` içinde olacaktır.

> Eğer `electron-builder` ile kurulum dosyası istersen:
> - `npm run dist`
> - Bu da `dist` klasörüne Windows taşınabilir uygulama oluşturur.

## Not
- Bu ortamda `.exe` üretimi denendi ancak bazı paketleme/sistem kısıtları nedeniyle son dosya burada oluşturulamadı.
- Kendi bilgisayarında terminali Yönetici olarak açarak `npm run package` çalıştırman daha güvenli olacaktır.
