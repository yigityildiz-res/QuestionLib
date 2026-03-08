# YKS Soru Çözüm Havuzu

Bu proje, YKS hazırlık sürecinde kişisel soru çözüm kütüphanesi oluşturmak için tasarlanmıştır.

## Özellikler
- **Kütüphane Modu:** Ders, Ünite ve Test hiyerarşisinde düzenlenmiş video çözümleri içerir.
- **Tekrar Modu:** Çözülmüş testleri rastgele sunarak öğrencilerin kendilerini denemelerini sağlar. Soruyu doğru bildikten veya çözümünü izledikten sonra "Bir Daha Gösterme" özelliğiyle havuzu daraltabilirsiniz. Farklı Kayıt (Save) açarak testleri baştan yapabilirsiniz.
- **Tamamen Yerel:** Veriler `data/veri.json` içerisinden okunur. İnternet gerektirmez (videolar yerel olduğu sürece).

## Kurulum ve Çalıştırma
Projeyi çalıştırmak için bir yerel sunucu (Local Server) ayağa kaldırmanız gerekmektedir (dosyaların `.json` erişimi güvenlik politikalarına takılmaması için).

### Python İle Çalıştırma
Proje dizininde şu komutu çalıştırabilirsiniz:
```bash
python -m http.server 8000
```
Ardından tarayıcınızda `http://localhost:8000` adresine gidebilirsiniz.

### Baslat.bat (Windows)
Dizin içerisinde bulunan `baslat.bat` dosyasına tıklayarak doğrudan yerel sunucuyu ve tarayıcıyı başlatabilirsiniz.

Daha fazla bilgi için kaynak kodlara veya `veri.json` formatına göz atabilirsiniz.
