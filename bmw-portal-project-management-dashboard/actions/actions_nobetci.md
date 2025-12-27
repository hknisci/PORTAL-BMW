# Duty Roster (Aylık Nöbet Listesi) – Yapılanlar, Aksiyonlar, Dosyalar ve İçerikler

Bu doküman, “Nöbetçi Listesi” özelliği için yaptığımız kalıcı/ortak veri mimarisini ve aktif çalışan dosyaları toparlar.

---

## 1) Problem (Başlangıçtaki Sorun)
- Excel/CSV ile import edilen kayıtlar:
  - Sayfa değiştirince kayboluyordu
  - Uygulama yeniden açılınca kayboluyordu
- Yeni kayıt ekleme:
  - Bazen import edilen kayıtların üstüne yazıyor/siliyor gibi davranıyordu
- LocalStorage yaklaşımı:
  - Sadece tek PC’de işe yarar
  - Şirket geneli (tüm PC’ler) için ortak veri sağlamaz

---

## 2) Hedef (İstenen Davranış)
- Kayıtlar **kalıcı** olsun (sayfa değişince / restart olunca kaybolmasın)
- Kayıtlar **tüm bilgisayarlardan** görülebilsin (merkezi veri)
- Excel import, manuel ekleme, edit ve delete işlemleri:
  - Eski kayıtları “toptan silmesin”
  - Mantıklı şekilde “merge” etsin
- Admin kullanıcı ekleme/edit/import/delete yapabilsin; normal user sadece görüntüleyebilsin

---

## 3) Çözüm (Nihai Mimari)
### Katmanlar
1) **Frontend (React/Vite)**: UI + Admin kontrolleri
2) **Backend (Node/Express API)**: CRUD + import + merge
3) **Kalıcı veri dosyası (JSON)**: Repo/sunucu üzerinde tek kaynak

> Böylece veri local browser’da değil, sunucuda saklanır ve tüm kullanıcılar aynı datayı görür.

---

## 4) Çalıştırma (Aktif Çalışan Komutlar)
### Terminal-1 (Backend – açık kalmalı)
- Repo root dizininde:
  - `node server/index.cjs`

### Terminal-2 (Frontend – Vite)
- Repo root dizininde:
  - `npm run dev`

> Backend kapatılırsa Vite proxy `/api/...` için `ECONNREFUSED` verir (gördüğümüz hata buydu).

---

## 5) Dosya Yapısı (Nöbetçi Listesi ile ilgili dosyalar)

### 5.1 Frontend (UI)
- `components/DutyRosterPage.tsx`
  - Nöbet listesi ekranı
  - Ay seçimi
  - Listeleme
  - Admin için: Excel/CSV import, yeni kayıt, edit, delete
  - API çağrılarını `src/api/dutyRosterApi.ts` üzerinden yapar
  - Admin kontrolü `contexts/AuthContext.tsx` üzerinden yapılır

- `src/api/dutyRosterApi.ts`
  - Frontend’in tek API istemcisi
  - `GET /api/duty-roster`
  - `POST /api/duty-roster/upsert`
  - `POST /api/duty-roster/import`
  - `DELETE /api/duty-roster/:id`

- `contexts/AuthContext.tsx`
  - “Admin / User” rol bilgisi
  - DutyRosterPage içinde butonlar ve aksiyonlar admin’e göre gösterilir

- `vite.config.ts`
  - Frontend’in dev server ayarı
  - `/api` isteklerini backend’e proxy eder (3000 → 5055)
  - Proxy örneği: `/api/*` → `http://localhost:5055/*`

---

### 5.2 Backend (API)
- `server/index.cjs`
  - Express API
  - JSON dosyadan okur/yazar
  - Import/upsert gibi işlemlerde merge mantığı uygular
  - Endpoint’ler:
    - `GET    /api/duty-roster` → tüm kayıtları döner
    - `POST   /api/duty-roster/upsert` → tek kaydı ekle/güncelle (merge)
    - `POST   /api/duty-roster/import` → toplu kayıt import (merge)
    - `DELETE /api/duty-roster/:id` → id ile sil

- `server/data/duty-roster.json`
  - Kalıcı veri deposu
  - Tüm makineler için ortak “tek kaynak”
  - Uygulama her işlemde burayı günceller

---

## 6) Dosya İçerikleri (Aktif Çalışan Örnek İçerikler)

> Not: Aşağıdaki içerikler, “şu an çalışan” yaklaşımın referans içerikleridir.

### 6.1 `server/index.cjs`
- Express server
- JSON read/write
- Merge anahtarı (stableKey): `date + email`
- Import edilen kayıtlar, aynı date+email varsa overwrite eder; yoksa ekler.
- Port: `5055`

(İçerik burada tam olarak senin oluşturduğun CJS dosyasıdır; sunucuyu ayağa kaldırır ve `server/data/duty-roster.json` ile çalışır.)

---

### 6.2 `server/data/duty-roster.json`
- Array formatında saklanır:
```json
[
  {
    "id": "1766861549934-50d7339cf206e8",
    "date": "2024-08-05",
    "firstName": "Zeynep",
    "lastName": "Arslan",
    "phone": "555-010-1010",
    "email": "zeynep.arslan@example.com"
  }
]
```

⸻

6.3 vite.config.ts (Duty Roster için kritik kısım)
	•	/api çağrılarını backend’e yönlendirir:
```
server: {
  port: 3000,
  host: "0.0.0.0",
  proxy: {
    "/api": {
      target: "http://localhost:5055",
      changeOrigin: true,
      secure: false
    }
  }
}
```

⸻

6.4 src/api/dutyRosterApi.ts (Duty Roster için kritik kısım)
	•	Base URL olarak proxy kullandığımız için:
	•	DEFAULT_BASE = "/api"
	•	Sonuçta frontend:
	•	GET /api/duty-roster der
	•	Vite proxy bunu backend’e taşır

⸻

6.5 components/DutyRosterPage.tsx
	•	UI tarafı
	•	Excel/CSV parse + validasyon
	•	Admin modal (create/edit)
	•	Import modal
	•	API ile senkron çalışma:
	•	Sayfa açılınca API’den çek
	•	Import/Save/Delete sonrası API’ye yaz + yeniden listeyi güncelle

⸻

7) Kontroller (Doğrulama Checklist)
	•	Backend açık mı?
	•	node server/index.cjs çalışınca:
	•	[DutyRosterAPI] running on http://localhost:5055 görünüyor olmalı
	•	http://localhost:5055/api/duty-roster açılınca JSON dönüyor mu?
	•	Frontend dev server:
	•	npm run dev → http://localhost:3000/
	•	Proxy çalışıyor mu?
	•	Vite log’da /api/duty-roster için ECONNREFUSED görünmüyorsa backend erişilebilir
	•	Import sonrası sayfa değiştirip geri gelince kayıt duruyor mu?
	•	Durmalı (veri artık JSON dosyada)

⸻

Soru: “Bunu sunucuya yükleyip LB ile 3000 portuna yönlendirsem… Admin isem datayı editleyebilir miyim?”

Kısa cevap: Evet, ama şartları var.

Sen LB ile sadece 3000 portunu dışarı açarsan (frontend), admin kullanıcı:
	•	UI üzerinden edit/import yapabilir gibi görünür
	•	Ancak bu edit/import’un gerçekten kalıcı olması için backend’in (5055) de çalışıyor ve erişilebilir olması gerekir.

Şart-1: Backend aynı sunucuda çalışıyor olmalı
	•	Sunucuda:
	•	Frontend: :3000
	•	Backend: :5055
	•	Vite proxy sunucu tarafında localhost:5055’e ulaşabildiği sürece UI’dan gelen /api/... istekleri backend’e gider.

Şart-2: Backend kapalıysa veya ulaşılamazsa
	•	Vite log’da şu olur:
	•	http proxy error: /api/duty-roster
	•	ECONNREFUSED
	•	Bu durumda admin edit yapamaz (istekler düşer).

Şart-3: Bu kurulum “dev mod” (vite dev server) olduğu için
	•	Teknik olarak çalıştırabilirsin ama bu “production” için ideal değildir.
	•	Yine de senin soruna “edit yapılır mı?” açısından:
	•	Backend açık + erişilebilir + JSON dosyaya yazma izni varsa evet, admin kullanıcı kalıcı edit yapar.

Özet: LB’den 3000’e erişebilen bir admin, backend 5055 aynı sunucuda ayaktaysa ve proxy doğruysa datayı editleyebilir; edit sunucudaki server/data/duty-roster.json dosyasına yazılır ve tüm PC’lerden görülür.

