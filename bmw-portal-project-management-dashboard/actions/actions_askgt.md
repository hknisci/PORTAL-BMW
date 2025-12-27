# ✅ ASKGT (kalıcı + admin CRUD + user read-only + Read More wiki link)

## 0) Mevcut Dummy Yapı (Kaldırılacak / kullanılmayacak)
- bmw-portal-project-management-dashboard/constants.ts
  - ASKGT_ARTICLES  ✅ dummy -> kaldırılacak veya artık kullanılmayacak
  - ASKGT_CATEGORIES ✅ bunu koruyabiliriz (UI kategori/renk/icon için sabit)

- bmw-portal-project-management-dashboard/components/AskGTPage.tsx
  - ASKGT_ARTICLES import’u kaldırılacak
  - veri artık API’den gelecek

- bmw-portal-project-management-dashboard/components/AskGTPageSimple.tsx
  - (opsiyonel) demo dosyasıysa bırakılabilir ama kullanılmayacak


## 1) Backend (Kalıcı JSON + API)
- bmw-portal-project-management-dashboard/server/index.cjs
  - mevcut DutyRoster endpoint’lerine ek olarak yeni ASKGT endpointleri eklenecek:
    - GET    /api/askgt/articles
    - POST   /api/askgt/articles/upsert      (create + edit)
    - POST   /api/askgt/articles/import      (opsiyonel: toplu ekleme istersen)
    - DELETE /api/askgt/articles/:id

  - bu endpointler JSON dosyasına yazıp okuyacak (DutyRoster ile aynı mantık)

- bmw-portal-project-management-dashboard/server/data/askgt-articles.json
  - ASKGT makalelerinin kalıcı kaydı burada duracak
  - tüm PC'ler aynı sunucuya gidince aynı dosyayı görecek


## 2) Frontend API Katmanı (Server ile konuşan dosya)
- bmw-portal-project-management-dashboard/src/api/askGtApi.ts   ✅ yeni dosya
  - tipler + fonksiyonlar:
    - getAskGtArticles(): Promise<AskGTArticle[]>
    - upsertAskGtArticle(article): Promise<AskGTArticle[]>
    - deleteAskGtArticle(id): Promise<AskGTArticle[]>
    - (opsiyonel) importAskGtArticles(items): Promise<AskGTArticle[]>


## 3) UI (AskGT Page)
- bmw-portal-project-management-dashboard/components/AskGTPage.tsx  ✅ güncellenecek

  ### 3.1 Veri Kaynağı Değişikliği
  - import { ASKGT_ARTICLES } from "../constants"  ❌ kalkacak
  - bunun yerine:
    - useEffect ile getAskGtArticles() çağrılacak
    - state içinde articles tutulacak

  ### 3.2 Yetki Mantığı
  - useAuth() + isLikelyAdmin(user)
  - sadece admin görecek:
    - + Yeni Makale
    - Edit
    - Delete
  - user sadece:
    - listeleme
    - arama
    - Read more

  ### 3.3 Kategori + Arama
  - selectedCategory yine kalsın (default “jboss”)
  - searchQuery kalsın
  - filtrelenen liste artık API’den gelen articles üzerinden yapılacak

  ### 3.4 Read More Aktif Hale Getirme
  - article içinde "wikiUrl" alanı olacak
  - buton:
    - <a href={article.wikiUrl} target="_blank" rel="noreferrer">READ MORE</a>
    - veya onClick -> window.open(article.wikiUrl, "_blank")
  - (preview iframe) şimdilik önermiyorum:
    - birçok Wikipedia sayfası X-Frame-Options yüzünden iframe’de açılmayabilir
    - bu yüzden en stabil çözüm: new tab link

  ### 3.5 Admin için Modal/Form
  - DutyRoster’daki edit/create modal yapısı aynen kopyalanıp uyarlanacak:
    - title
    - description
    - tags (string input -> “virgülle ayır”)
    - category (dropdown)
    - wikiUrl
    - thumbnailUrl (opsiyonel)
    - author.name / author.department (opsiyonel: otomatik user’dan basılabilir)
    - publishDate (opsiyonel: otomatik today)
    - readTime (opsiyonel: sayı)

  - Kaydet deyince:
    - upsertAskGtArticle() çağrılacak
    - server JSON güncellenecek
    - response olarak dönen liste state’e set edilecek


## 4) Types (mevcut types.ts kullanımı)
- bmw-portal-project-management-dashboard/types.ts
  - AskGTArticle tipi zaten var (gördüğün dummy ile uyumlu)
  - Bu type’ı backend JSON’a uygun şekilde devam ettireceğiz.
  - Backend tarafında da aynı shape’i kullanacağız.

  ÖNEMLİ: "isFavorite, likes, views" gibi alanlar
  - şimdilik UI’da “local state” olarak tutulabilir (kalıcı yapmak istersen sonra API’ye ekleriz)
  - ilk aşamada sadece “makale CRUD + read more” hedefini tamamlayalım.


## 5) Routing / Tab Yapısı
- PAGE_CONFIG içinde AskGT sekmeleri (JBoss/WebSphere/...) aynı kalabilir.
- AskGTPage bu sekmelere göre selectedCategory’yi set eden şekilde çalışabilir
  - (senin tab sistemin nasıl kuruluysa, selectedCategory dışarıdan da alınabilir)


## 6) Üretim Senaryosu (LB arkasında)
- Evet: Admin kullanıcı LB üzerinden erişirse edit yapar, çünkü veri server/data JSON’da.
- ŞART: API endpointleri de aynı host üzerinden erişilebilir olmalı.
  - En iyi: UI + API aynı origin
    - LB -> 3000 (Vite build serve) değil,
    - prod’da genelde build’i statik serve + API aynı node/express veya reverse proxy
  - Şimdilik dev ortamında:
    - Vite (3000)
    - Node API (5055)
    - Vite proxy /api -> 5055 şeklinde çalışmalı