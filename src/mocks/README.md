# 🎭 Mock Service Worker (MSW) Setup

Folder ini berisi setup **Mock Service Worker** untuk development frontend tanpa backend asli.

## 📋 Daftar File

| File | Deskripsi |
|------|-----------|
| `handlers.js` | Mock handlers untuk API endpoints |
| `data.js` | Data dummy (users, taxa, observations) |
| `browser.js` | Setup MSW untuk browser |
| `index.js` | Entry point exports |

## 🚀 Cara Menggunakan

### 1. Install MSW

```bash
cd .frontend-react-vite
npm install msw --save-dev
```

### 2. Initialize MSW

```bash
npx msw init public/ --save
```

Ini akan membuat file `public/mockServiceWorker.js`.

### 3. Enable Mock Mode

Edit `.env.development`:

```env
VITE_USE_MOCK_API=true
```

### 4. Jalankan Development Server

```bash
npm run dev
```

Frontend akan menggunakan mock API, tidak perlu backend!

## 🔧 Cara Kerja

1. **MSW intercepts** semua request ke `/api/*`
2. **Handlers** mengembalikan data dummy dari `data.js`
3. **Frontend** bekerja normal seolah-olah ada backend

## 📊 Data yang Tersedia

### Users (3 users)
- Ahmad Naturalis (user biasa)
- Siti Biologi (curator)
- Budi Alam (user biasa)

### Taxa (5 species)
- Passer montanus (Burung Gereja)
- Papilio memnon (Kupu-kupu Raja)
- Halcyon cyanoventris (Cekakak Jawa)
- Troides helena (Kupu-kupu Sayap Burung)
- Nisaetus bartelsi (Elang Jawa)

### Observations (5 observasi)
- Berbagai lokasi di Indonesia
- Berbagai quality grades
- Dengan media/foto

## 🔐 Login Credentials (Mock)

```
Email: ahmad@example.com
Password: password123

Email: siti@example.com
Password: password123
```

## 📝 Menambah Mock Endpoint

Edit `handlers.js`:

```javascript
import { http, HttpResponse } from 'msw';

// Tambahkan handler baru
http.get(`${API_URL}/your-endpoint`, async () => {
  await delay(300); // Simulate network delay
  
  return HttpResponse.json({
    success: true,
    data: { /* your data */ },
  });
}),
```

## 🎯 Endpoints yang Di-mock

### Authentication
- `POST /auth/login` - Login
- `POST /auth/register` - Register
- `POST /auth/logout` - Logout
- `GET /auth/check-token` - Verify token

### Users & Profile
- `GET /profile/home/:id` - User profile
- `GET /profile/stats/:id` - User statistics
- `GET /users/:id/profile` - Public profile

### Observations
- `GET /observations/general` - List observations
- `GET /observations/needs-id` - Needs ID observations
- `GET /observations/:id` - Observation detail
- `POST /observations` - Create observation
- `POST /observations/:id/identifications` - Add identification
- `GET /observations/:id/comments` - Get comments
- `POST /observations/:id/comments` - Add comment

### Taxa
- `GET /taksa/search` - Search taxa
- `GET /taxa/:rank/:id` - Taxa detail
- `GET /taxa/:rank/search` - Search by rank

### Gallery
- `GET /gallery/species` - Species gallery

### Map
- `GET /map/markers` - Map markers
- `GET /map/markers/fobi` - FOBI markers

### Statistics
- `GET /home/fobi-count` - Total observations
- `GET /home/total-species` - Total species
- `GET /home/total-contributors` - Total users
- `GET /home/filtered-stats` - Filtered statistics

### Notifications
- `GET /notifications` - List notifications
- `GET /notifications/unread-count` - Unread count
- `POST /notifications/:id/read` - Mark as read

### Badges
- `GET /badges` - List badges
- `GET /badges/types` - Badge types

### Search
- `GET /search` - Global search

### Follow
- `GET /follow/status/:userId` - Follow status
- `POST /follow/:userId` - Follow user

## ⚠️ Catatan Penting

1. **Mock data tidak persisten** - Data akan reset setiap refresh
2. **Tidak semua endpoint di-mock** - Unhandled requests akan di-bypass
3. **Untuk production** - Set `VITE_USE_MOCK_API=false`

## 🔄 Switching Mode

### Development dengan Backend
```env
VITE_USE_MOCK_API=false
VITE_API_URL=http://localhost:8000/api
```

### Development tanpa Backend (Mock)
```env
VITE_USE_MOCK_API=true
```

## 🐛 Troubleshooting

### MSW tidak aktif
1. Pastikan `mockServiceWorker.js` ada di folder `public/`
2. Jalankan `npx msw init public/` jika belum ada
3. Check console untuk error messages

### Request tidak di-intercept
1. Check apakah endpoint sudah ada di `handlers.js`
2. Pastikan URL pattern match
3. Check console untuk `[MSW] Unhandled request` warnings

### Data tidak muncul
1. Check Network tab di DevTools
2. Pastikan response format sesuai dengan yang diharapkan frontend
3. Update `data.js` jika perlu data tambahan
