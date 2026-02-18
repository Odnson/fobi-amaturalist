# AMATURALIST

Masih beta version, detail lengkap dan dokumentasi akan diupdate nanti 

---

Teknologi yang Digunakan

Core Framework
- **React** (18.3.1)
- **Vite** (5.4.10)
- **React Router** (6.27.0)
- **TanStack Query** (5.62.8)

Tampilan & UI
- **TailwindCSS** (3.4.14)
- **MUI (Material UI)** (6.3.1)
- **Framer Motion** (12.4.7)
- **FontAwesome** (6.6.0)
- **Lucide React** (0.475.0)
- **Headless UI** (2.2.0)

Peta & Visualisasi Data
- **Leaflet** (1.9.4)
- **React Leaflet** (4.2.1)
- **Leaflet MarkerCluster** (1.5.3)
- **Leaflet Heat** (0.2.0)
- **D3.js** (7.9.0)
- **Chart.js** (4.4.7)
- **ApexCharts** (5.3.6)
- **Turf.js** (7.2.0)

Media & Image Processing
- **React Image Crop** (11.0.10)
- **React Easy Crop** (5.4.2)
- **EXIFR** (7.1.3)
- **HEIC2Any** (0.0.4)
- **WaveSurfer.js** (7.8.8)
- **Swiper** (11.1.14)

Form & Validasi
- **React Quill** (2.0.0)
- **React Datepicker** (7.5.0)
- **DOMPurify** (3.2.3)
- **reCAPTCHA v3** (1.10.1)

Data & Storage
- **Axios** (1.7.7)
- **LocalForage** (1.10.0)
- **IDB** (8.0.1)
- **Lodash** (4.17.21)

Development Tools
- **MSW** (2.12.10)
- **ESLint** (9.13.0)
- **PostCSS** (8.4.47)
- **Autoprefixer** (10.4.20)

---

Usage

Persiapan
- Node.js versi 18 atau lebih baru
- npm atau yarn

Instalasi

```bash
# Clone repo
git clone https://github.com/Odnson/amaturalist.git
cd amaturalist

# Install dependencies
npm install

# Copy file env
cp .env.example .env

```

Environment Variables

```env
VITE_APP_ENV=development
VITE_API_URL=http://localhost:8000/api
VITE_RECAPTCHA_SITE_KEY=api_key_recaptcha_kamu
VITE_WS_URL=ws://localhost:8443
```

---

Development

Jalankan dengan Backend API

Contohh backend : https://github.com/Odnson/backend-amat-example.git

```bash
npm run dev
```

Aplikasi akan berjalan di `http://localhost:5173`

Jalankan dengan Mock Server (Tanpa Backend)

```bash
npm run dev:mock
```

Mode ini menggunakan **Mock Service Worker (MSW)** untuk simulasi API tanpa perlu backend.

---

Mock Server (Development Tanpa Backend)

Setup MSW

```bash
# Initialize MSW (cukup sekali saja)
npm run msw:init
```

Ini akan membuat file `public/mockServiceWorker.js`.

Login untuk Testing

```
Email: ahmad@example.com
Password: password123

Email: siti@example.com  
Password: password123
```

API Endpoints yang Di-mock

Autentikasi
- `POST /api/login` - Masuk ke sistem
- `POST /api/auth/register` - Daftar akun baru
- `POST /api/auth/logout` - Keluar dari sistem

Profil User
- `GET /api/profile/home/:id` - Data profil lengkap
- `GET /api/profile/stats/:id` - Statistik user
- `GET /api/profile/activities/:id` - Grafik aktivitas
- `GET /api/profile/top-taxa/:id` - Spesies terbanyak diamati

Observasi
- `GET /api/observations/general` - Daftar observasi
- `GET /api/observations/:id` - Detail observasi
- `POST /api/observations` - Tambah observasi baru

Peta
- `GET /api/markers` - Semua marker
- `GET /api/amaturalist-markers` - Marker AMATURALIST
- `GET /api/burungnesia-markers` - Marker Burungnesia
- `GET /api/kupunesia-markers` - Marker Kupunesia

Taksonomi
- `GET /api/taksa/search` - Cari spesies
- `GET /api/taxa/:rank/:id` - Detail taksonomi

Lihat file `src/mocks/handlers.js` untuk daftar lengkap endpoints.

Kalo mau menambah endpoint baru

Edit file `src/mocks/handlers.js`:

```javascript
import { http, HttpResponse } from 'msw';

http.get(`${API_URL}/endpoint-baru`, async () => {
  await delay(300); // Simulasi delay network
  
  return HttpResponse.json({
    success: true,
    data: { /* data mockk di sini */ },
  });
}),
```

---

Build untuk Production

```bash
# Build untuk production
npm run build

# Preview hasil build
npm run preview
```

---

Struktur Project

```
src/
├── assets/          # File statis (gambar, icon)
├── components/      # Komponen React
│   ├── Auth/        # Komponen login/register
│   ├── BurnesUpload/    # Upload Burungnesia
│   ├── Charts/      # Komponen grafik
│   ├── DetailObservations/  # Detail observasi
│   ├── AmaturalistUpload/  # Upload media AMATURALIST
│   ├── Header/      # Header dengan search
│   ├── Home/        # Komponen homepage
│   ├── KupnesUpload/    # Upload Kupunesia
│   ├── Map/         # Komponen peta
│   ├── Modals/      # Modal dialogs
│   ├── Observations/    # Form observasi
│   ├── Profile/     # Komponen profil
│   └── ...
├── context/         # React context providers
├── hooks/           # Custom React hooks
├── mocks/           # Mock API handlers & data
├── pages/           # Halaman utama
├── services/        # API services
└── utils/           # Utility functions
```

---

Scripts yang Tersedia

- `npm run dev` - Jalankan development server
- `npm run dev:mock` - Jalankan dengan mock API  
- `npm run build` - Build untuk production
- `npm run preview` - Preview hasil build
- `npm run lint` - Check code quality
- `npm run msw:init` - Setup MSW

---
