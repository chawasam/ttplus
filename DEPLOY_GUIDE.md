# 🚀 คู่มือ Deploy TTplus (ทีละขั้นตอน)

ไม่ต้องมีความรู้ coding — ทำตามนี้ได้เลยครับ!

---

## ✅ ขั้นตอนที่ 1 — ติดตั้ง Node.js

1. ไปที่ https://nodejs.org
2. ดาวน์โหลด **LTS version** (ปุ่มสีเขียวซ้าย)
3. ติดตั้งตามปกติ → กด Next ไปเรื่อยๆ
4. เปิด Terminal (Windows: กด Win+R → พิมพ์ `cmd` → OK)
5. พิมพ์: `node -v` → ควรเห็นเวอร์ชัน เช่น v20.x.x

---

## ✅ ขั้นตอนที่ 2 — ตั้งค่า Firebase

### 2.1 สร้าง Firebase Project
1. ไปที่ https://console.firebase.google.com
2. คลิก **Add project** → ตั้งชื่อ เช่น "ttplus"
3. กด Continue จนจบ

### 2.2 เปิด Google Authentication
1. ในเมนูซ้าย คลิก **Authentication** → **Get started**
2. คลิก **Google** → เปิด Enable → กด Save

### 2.3 เปิด Firestore Database
1. ในเมนูซ้าย คลิก **Firestore Database** → **Create database**
2. เลือก **Start in test mode** → เลือก region ใกล้บ้าน (asia-southeast1)
3. กด Done

### 2.4 ได้ Firebase Config สำหรับ Frontend
1. คลิก icon ⚙️ → **Project settings**
2. เลื่อนลงมาที่ **Your apps** → คลิก icon `</>`  (Web)
3. ตั้งชื่อ app → กด Register
4. **คัดลอก** ค่า firebaseConfig ที่แสดงขึ้นมา (จะใช้ในขั้นตอนถัดไป)

### 2.5 ได้ Service Account สำหรับ Backend
1. คลิก ⚙️ → **Project settings** → แท็บ **Service accounts**
2. คลิก **Generate new private key** → กด Generate key
3. ไฟล์ JSON จะดาวน์โหลดมา → เก็บไว้ก่อน (จะใช้ด้านล่าง)

---

## ✅ ขั้นตอนที่ 3 — ตั้งค่า Backend

1. เปิด Terminal → `cd` ไปยังโฟลเดอร์ `backend`
   ```
   cd path/to/ttplus/backend
   ```
2. ติดตั้ง packages:
   ```
   npm install
   ```
3. คัดลอกไฟล์ .env:
   ```
   cp .env.example .env
   ```
4. เปิดไฟล์ `.env` ด้วย Notepad แล้วใส่ค่าจาก Firebase Service Account JSON:
   ```
   FIREBASE_PROJECT_ID=   (เอาจาก "project_id" ในไฟล์ JSON)
   FIREBASE_CLIENT_EMAIL= (เอาจาก "client_email")
   FIREBASE_PRIVATE_KEY=  (เอาจาก "private_key" ทั้งหมดรวม -----BEGIN...END-----)
   FRONTEND_URL=http://localhost:3000
   ```
5. ทดสอบรัน:
   ```
   npm run dev
   ```
   ควรเห็น: `🚀 TTplus Backend running on port 4000`

---

## ✅ ขั้นตอนที่ 4 — ตั้งค่า Frontend

1. เปิด Terminal ใหม่ → `cd` ไปยังโฟลเดอร์ `frontend`
   ```
   cd path/to/ttplus/frontend
   ```
2. ติดตั้ง packages:
   ```
   npm install
   ```
3. คัดลอกไฟล์ .env:
   ```
   cp .env.example .env.local
   ```
4. เปิดไฟล์ `.env.local` แล้วใส่ค่าจาก Firebase Web Config ที่คัดลอกมาในขั้นตอน 2.4:
   ```
   NEXT_PUBLIC_FIREBASE_API_KEY=xxx
   NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=xxx.firebaseapp.com
   NEXT_PUBLIC_FIREBASE_PROJECT_ID=xxx
   NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=xxx.appspot.com
   NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=xxx
   NEXT_PUBLIC_FIREBASE_APP_ID=xxx
   NEXT_PUBLIC_BACKEND_URL=http://localhost:4000
   ```
5. ทดสอบรัน:
   ```
   npm run dev
   ```
   เปิดเบราว์เซอร์: http://localhost:3000

---

## ✅ ขั้นตอนที่ 5 — Deploy ขึ้น Internet (ฟรี!)

### 5.1 Deploy Backend บน Railway
1. ไปที่ https://railway.app → Sign up ด้วย GitHub
2. คลิก **New Project** → **Deploy from GitHub repo**
3. เลือก repo ที่ upload โค้ด backend ไว้
4. ไปที่ **Variables** → เพิ่มทุกค่าจากไฟล์ `.env` ของ backend
5. Railway จะให้ URL เช่น `https://ttplus-backend.up.railway.app`

### 5.2 Deploy Frontend บน Vercel
1. ไปที่ https://vercel.com → Sign up ด้วย GitHub
2. คลิก **New Project** → เลือก repo ของ frontend
3. ไปที่ **Environment Variables** → เพิ่มทุกค่าจาก `.env.local`
   - แก้ `NEXT_PUBLIC_BACKEND_URL` เป็น URL จาก Railway ในข้อ 5.1
4. กด Deploy → Vercel จะให้ URL ของเว็บ

### 5.3 อัปเดต CORS ใน Backend
- เปิดไฟล์ `.env` ของ backend → แก้ `FRONTEND_URL` เป็น URL จาก Vercel
- Redeploy backend

---

## 🎛️ วิธีใช้ OBS Widget

1. เปิดเว็บ → Login → Dashboard → กรอก TikTok username → กด เชื่อมต่อ
2. ไปหน้า **Widgets** → Copy URL ของ widget ที่ต้องการ
3. ใน OBS: Sources → + → Browser → วาง URL → ตั้ง Width/Height
4. Widgets จะแสดง real-time ทันทีที่มี gift/comment/follow

---

## ❓ ปัญหาที่พบบ่อย

| ปัญหา | วิธีแก้ |
|-------|---------|
| "ไม่ได้ไลฟ์อยู่" | user ต้องไลฟ์จริงๆ ถึงจะ connect ได้ |
| Login ไม่ได้ | ตรวจสอบ Firebase config ใน .env.local |
| Widget ไม่แสดง | ตรวจสอบว่า connect TikTok แล้ว และ Token ยังไม่หมดอายุ |
| Backend ไม่ start | ตรวจสอบ FIREBASE_PRIVATE_KEY ให้ครบและมี \n |

---

## 💰 แก้ไข Donate Link

เปิดไฟล์ `frontend/pages/donate.js` แล้วแก้:
- `YOUR_USERNAME` ใน Buy Me a Coffee / Ko-fi link
- เบอร์ PromptPay

---

สร้างด้วย ❤️ โดย Claude AI
