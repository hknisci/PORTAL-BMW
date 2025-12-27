# actions.md — Önemli Linkler Sayfası (Important Links)

## Mevcut davranış (bugünkü durum)
- Uygulamada **Önemli Linkler** sayfasına gidildiğinde **Connect / Red Hat / Dynatrace / Confluence / Jira** gibi kategori kartları görünür.
- Her bir kategori altındaki linke tıklanınca kullanıcı **harici bir URL’ye yönlendirilir** (şu an dummy olduğu için örn. *Connect* tıklayınca Google’a gidiyor).

## Kaynak kodda nerede?
- **Link verisi (dummy data):** `constants.ts`
  - Değişken adı: `IMPORTANT_LINKS_DATA`
- **Sayfanın UI + tıklama/yönlendirme mantığı:** `src/components/ImportantLinksPage.tsx`

## Not / Yapı nasıl çalışıyor?
- Sayfa, `IMPORTANT_LINKS_DATA` içindeki kategorileri ve linkleri **map ile dinamik** render ediyor.
- Link tıklama yönlendirmesi genelde iki şekilde yapılır:
  - `<a href="..." target="_blank" rel="noreferrer">`
  - veya `window.open(url, "_blank", "noopener,noreferrer")`
- Bu nedenle:
  - Link / kategori sayısı “hardcoded” değil; **data ne kadar ise UI o kadar basar.**

---

## Aksiyon: İsimlendirme ve gerçek URL’ler
- [ ] `IMPORTANT_LINKS_DATA` içindeki kategori isimlerini **gerçek isimlere** göre düzenle (Connect, Red Hat, Dynatrace, Confluence, Jira vb.).
- [ ] Her linkin URL’sini dummy (Google vb.) yerine **gerçek kurum içi URL** ile değiştir.
- [ ] Link başlıklarını (title/name) ve açıklamalarını (description varsa) standartlaştır:
  - Tutarlı dil (TR/EN seçimi)
  - Tutarlı yazım (örn. “Red Hat Console”, “Dynatrace Dashboard” gibi)

---

## Aksiyon: “8’e çıkarmak” / yeni kategori eklemek mümkün mü?
### Kategori sayısını artırma (ör. 5 → 8)
- [ ] `src/constants.ts` → `IMPORTANT_LINKS_DATA` içine **yeni kategori blokları** ekle.
- Beklenen sonuç:
  - Sayfada otomatik olarak yeni kategori kartları görünür.
  - Ekstra bir kod değişikliği gerekmemeli (ImportantLinksPage map ile çizdiği için).

### Kategori altına yeni link eklemek
- [ ] Aynı kategori bloğu içindeki links/list alanına yeni link objesi ekle.
- Beklenen sonuç:
  - O kategori kartında yeni link otomatik oluşur.

> Doğrulama adımı: Değişiklikten sonra `npm run dev` ile sayfayı aç ve yeni kategori/linklerin UI’da göründüğünü kontrol et.

---

## Aksiyon: Önizleme (preview) var mı? Yoksa eklenebilir mi?
### Mevcut durumda preview var mı?
- [ ] `src/components/ImportantLinksPage.tsx` içinde şu pattern’leri ara:
  - `onMouseEnter`, `onHover`, `tooltip`, `popover`, `modal`, `preview`, `iframe`
- Beklenen durum:
  - Mevcut kodda çoğunlukla sadece link render + yönlendirme var.
  - Eğer tooltip/popover/modal yoksa “preview” yoktur.

### Preview ekleme fikri (isteğe bağlı)
> Eğer ihtiyaç olursa:
- [ ] Link kartına hover ile **tooltip** eklenebilir (kısa açıklama).
- [ ] Alternatif: Linke tıklamadan önce **preview modal** açılabilir:
  - İçerik: açıklama + URL + “Open” butonu
  - (İframe ile gerçek siteyi içerde göstermek çoğu kurum içi sitede CSP nedeniyle çalışmayabilir.)
- [ ] Güvenlik/uyumluluk notu:
  - Harici siteleri iframe ile embed etmek çoğu zaman engellenir (CSP/X-Frame-Options).
  - Bu yüzden “preview” için en güvenlisi: **metadata (title/desc)** gösteren modal/tooltip yaklaşımıdır.

---

## Prod’a giderken yapılacaklar (checklist)
- [ ] Dummy URL’lerin tamamı kaldırıldı (Google vb. kalmadı).
- [ ] Kategori isimleri gerçek isimlendirme standardına çekildi.
- [ ] Yeni sekmede açma davranışı net:
  - Ya tüm linkler `_blank` ile açılır,
  - Ya da kurum standardına göre aynı sekme (karar verilecek).
- [ ] (Opsiyonel) Preview isteniyorsa:
  - Tooltip/Modal ile metadata preview eklendi
  - Iframe kullanılacaksa CSP kontrolü yapıldı
- [ ] Son test: Önemli Linkler sayfasındaki tüm linkler tek tek tıklandı, doğru hedefe gidiyor.


---

