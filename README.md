# ChatApp Pro

پیام‌رسان وب بلادرنگ با رابط کاربری حرفه‌ای، پیام‌رسانی متنی و رسانه‌ای، وضعیت آنلاین/Seen و رمزنگاری End-to-End.

> این README بر اساس ساختار و قابلیت‌های نسخه فعلی پروژه نوشته شده است. مسیرها و نام فایل‌ها را مطابق پروژه نگه دارید.

---

# 1. معرفی و قابلیت‌ها

ChatApp یک پیام‌رسان وب Full-Stack است که با معماری Frontend/Backend جداگانه ساخته شده و ارتباط بلادرنگ آن با Socket.IO انجام می‌شود.

## قابلیت‌های اصلی

### حساب کاربری
- ثبت‌نام
- ورود
- خروج
- احراز هویت با Token
- پروفایل کاربر
- نام کاربری و نام نمایشی
- Avatar و Bio
- نمایش وضعیت آنلاین و آخرین بازدید

### مخاطبین
- افزودن مخاطب با Username
- نمایش فقط مخاطبین اضافه‌شده
- به‌روزرسانی زنده اطلاعات مخاطب
- نمایش Online / Last Seen
- ساخت گفتگو با مخاطب

### پیام‌رسانی بلادرنگ
- ارسال پیام بدون Refresh
- دریافت پیام لحظه‌ای با WebSocket
- Typing Indicator
- وضعیت Sent / Seen
- شمارنده پیام‌های خوانده‌نشده
- Notification مرورگر
- Jump/Scroll خودکار به پیام جدید
- تاریخ پیام
- نمایش زمان ارسال

### مدیریت پیام
- Reply
- Edit
- Delete
- Reaction
- Forward
- Pin
- نمایش پیام حذف‌شده
- نمایش وضعیت Seen با تیک‌ها

### فایل و رسانه
- ارسال فایل
- عکس
- Video
- Audio
- Voice Message
- MediaRecorder برای ضبط صدا
- نمایش حجم فایل
- Image Lightbox
- Video Player
- Audio Player
- Drag & Drop در رابط نسخه‌های رسانه‌ای پروژه

### امنیت و رمزنگاری
نسخه فعلی شامل لایه E2E برای پیام‌ها و فایل‌های جدید است.

- رمزنگاری سمت مرورگر
- AES-256-GCM برای محتوای داده
- ECDH P-256 برای توافق کلید
- کلید خصوصی در مرورگر کاربر باقی می‌ماند
- سرور نباید متن خام پیام E2E را دریافت کند
- فایل قبل از ارسال رمزنگاری می‌شود
- WebSocket همچنان برای Live Messaging، Typing و Seen استفاده می‌شود

**نکته امنیتی مهم:** E2E به این معنی نیست که کل سامانه به‌صورت خودکار یک پیاده‌سازی کامل و ممیزی‌شده در سطح Signal شده است. برای Production حساس، باید Key Verification، مدیریت دستگاه‌ها، Rotation، Backup/Recovery و Audit امنیتی نیز اضافه شود.

### ظاهر و UX
- طراحی Responsive
- Desktop / Mobile
- Light / Dark Theme
- Bubble UI
- Message grouping
- Hover actions
- Skeleton / Loading states
- Sidebar
- Contact panel
- Composer حرفه‌ای
- پنجره افزودن مخاطب
- انیمیشن‌های رابط
- رابط فارسی و RTL

---

# 2. Tech Stack

## Frontend

- Next.js
- React
- TypeScript
- Socket.IO Client
- CSS
- Web Crypto API
- MediaRecorder API

Frontend مسئول:
- UI
- Authentication state
- مدیریت گفتگو
- دریافت و ارسال Real-Time
- رمزنگاری/رمزگشایی E2E
- نمایش فایل و رسانه

## Backend

- NestJS
- TypeScript
- Socket.IO
- Express
- JWT/Token-based authentication
- REST API
- WebSocket Gateway
- Static file serving برای uploads

Backend مسئول:
- Authentication
- Users
- Contacts
- Conversations
- Messages
- Presence
- Typing
- Seen
- Reactions
- Edit/Delete/Pin/Forward
- Upload handling
- Relay کردن داده رمزنگاری‌شده

## Storage

نسخه فعلی برای اجرای ساده Local بدون Docker و PostgreSQL طراحی شده است و داده‌های پروژه در Backend نگهداری می‌شوند.

برای Production بهتر است Storage پایدار و Database واقعی مانند PostgreSQL اضافه شود.

---

# 3. ساختار پروژه

ساختار اصلی به‌صورت زیر است:

```text
chatApp/
├─ apps/
│  ├─ web/
│  │  ├─ app/
│  │  ├─ components/
│  │  │  └─ Messenger.tsx
│  │  ├─ lib/
│  │  │  ├─ api.ts
│  │  │  └─ e2e.ts
│  │  ├─ public/
│  │  ├─ package.json
│  │  └─ ...
│  │
│  └─ api/
│     ├─ src/
│     │  ├─ main.ts
│     │  ├─ app.module.ts
│     │  └─ ...
│     ├─ uploads/
│     ├─ package.json
│     └─ ...
│
├─ package.json
├─ README.md
└─ ...
```

## `apps/web`

Frontend پروژه است.

### `components/Messenger.tsx`

هسته اصلی UI پیام‌رسان:

- لیست گفتگوها
- Chat View
- Composer
- Contacts
- Login/Register
- Socket events
- Seen
- Typing
- Reactions
- Reply/Edit/Delete/Forward/Pin
- Upload
- Voice recording

### `lib/api.ts`

ارتباط REST با Backend و مدیریت Token.

### `lib/e2e.ts`

لایه رمزنگاری سمت Client.

این فایل نباید به Backend وابسته باشد.

---

# 4. پیش‌نیازها

برای اجرای Local نیاز دارید:

## Node.js

پیشنهاد:

```text
Node.js 20 LTS یا بالاتر
npm 10 یا بالاتر
```

نسخه‌های جدید Node نیز ممکن است کار کنند، اما برای Production بهتر است از نسخه LTS استفاده شود.

بررسی:

```powershell
node -v
npm -v
```

مثال:

```text
v20.x.x
10.x.x
```

## Git

اختیاری ولی توصیه‌شده:

```powershell
git --version
```

## Docker لازم نیست

نسخه فعلی برای اجرای ساده نیاز به Docker ندارد.

## PostgreSQL لازم نیست

نسخه فعلی برای اجرای Local به PostgreSQL نیاز ندارد.

---

# 5. نصب پروژه

پروژه را در مسیر دلخواه قرار دهید:

```powershell
cd D:\Projects
```

سپس:

```powershell
cd chatApp
```

بررسی کنید:

```powershell
dir
```

باید پوشه `apps` را ببینید.

---

# 6. نصب Dependencyها

اگر پروژه Monorepo است، از Root اجرا کنید:

```powershell
npm install
```

سپس Backend:

```powershell
cd apps\api
npm install
```

Frontend:

```powershell
cd ..\web
npm install
```

اگر Workspace پروژه از Root مدیریت می‌شود، فقط دستور Root را اجرا کنید و دوباره `npm install` جداگانه نزنید.

---

# 7. تنظیم Environment

## Backend

در:

```text
apps/api/.env
```

نمونه:

```env
PORT=4000
JWT_SECRET=CHANGE_THIS_TO_A_LONG_RANDOM_SECRET
```

برای Production مقدار `JWT_SECRET` را طولانی و تصادفی انتخاب کنید.

مثال PowerShell برای تولید مقدار تصادفی:

```powershell
[Convert]::ToBase64String((1..48 | ForEach-Object { Get-Random -Maximum 256 }))
```

مقدار خروجی را داخل `.env` قرار دهید.

---

## Frontend

در:

```text
apps/web/.env.local
```

قرار دهید:

```env
NEXT_PUBLIC_API_URL=http://localhost:4000/api
NEXT_PUBLIC_SOCKET_URL=http://localhost:4000
```

اگر پروژه فعلی نام متغیر متفاوتی دارد، همان نام موجود در `Messenger.tsx` را نگه دارید.

---

# 8. اجرای Backend

Terminal اول:

```powershell
cd D:\Projects\chatApp\apps\api
npm run start:dev
```

در صورت موفقیت باید چیزی شبیه این ببینید:

```text
ChatApp API listening on http://localhost:4000
```

Backend روی:

```text
http://localhost:4000
```

در دسترس خواهد بود.

API با prefix زیر ارائه می‌شود:

```text
http://localhost:4000/api
```

---

# 9. اجرای Frontend

Terminal دوم:

```powershell
cd D:\Projects\chatApp\apps\web
npm run dev
```

سپس مرورگر:

```text
http://localhost:3000
```

را باز کنید.

---

# 10. اجرای همزمان Backend و Frontend

دو Terminal باز کنید.

### Terminal 1

```powershell
cd D:\Projects\chatApp\apps\api
npm run start:dev
```

### Terminal 2

```powershell
cd D:\Projects\chatApp\apps\web
npm run dev
```

سپس:

```text
http://localhost:3000
```

---

# 11. ورود و ثبت‌نام

اگر حساب دارید:

1. Username را وارد کنید.
2. Password را وارد کنید.
3. روی ورود کلیک کنید.

برای ثبت‌نام:

1. حالت ثبت‌نام را انتخاب کنید.
2. Display Name
3. Username
4. Password
5. ثبت‌نام

---

# 12. افزودن مخاطب

بعد از ورود:

1. روی `+` کلیک کنید.
2. Username مخاطب را وارد کنید.
3. افزودن به مخاطبین را بزنید.
4. مخاطب در Contact List نمایش داده می‌شود.
5. روی مخاطب کلیک کنید تا Conversation ساخته شود.

کاربرانی که به‌عنوان Contact اضافه نشده‌اند، در لیست مخاطبین شما نمایش داده نمی‌شوند.

---

# 13. ارسال پیام

داخل Conversation:

- متن را بنویسید.
- Enter = ارسال
- Shift + Enter = خط جدید
- دکمه Send = ارسال

پیام بدون Refresh منتقل می‌شود.

---

# 14. وضعیت پیام

برای پیام‌های ارسالی:

```text
✓
```

یعنی پیام ارسال شده است.

وقتی گیرنده Conversation را باز کند و پیام‌ها Read شوند:

```text
✓✓
```

نمایش داده می‌شود.

این وضعیت با WebSocket به‌صورت Live منتقل می‌شود.

---

# 15. Typing و Online

وقتی کاربر در حال تایپ است، Typing Indicator نمایش داده می‌شود.

Presence نیز شامل:

```text
آنلاین
```

یا:

```text
آخرین بازدید ...
```

است.

---

# 16. ارسال فایل

روی Attach کلیک کنید.

انواع فایل قابل استفاده:

- Image
- Video
- Audio
- File
- Voice

در نسخه E2E، فایل جدید قبل از ارسال باید در Browser رمزنگاری شود.

---

# 17. Voice Message

روی Microphone کلیک کنید.

مرورگر برای دسترسی به Microphone اجازه می‌خواهد.

بعد از ضبط:

- Recording متوقف می‌شود.
- فایل Voice ساخته می‌شود.
- فایل برای ارسال آماده می‌شود.
- در حالت E2E، فایل قبل از ارسال رمز می‌شود.

برای این قابلیت بهتر است سایت روی HTTPS باشد، چون مرورگرها برای Media APIها محدودیت امنیتی دارند.

---

# 18. Reply / Edit / Delete / Reaction

با Hover روی پیام، ابزارهای پیام نمایش داده می‌شوند.

امکانات:

```text
↩ Reply
✎ Edit
🗑 Delete
❤️ Reaction
👍 Reaction
↗ Forward
📌 Pin
```

Edit و Delete برای پیام‌های مالک حساب محدود شده‌اند.

---

# 19. رمزنگاری E2E

## مدل کلی

```text
User A Browser
      │
      │ Encrypt
      ▼
Ciphertext
      │
      │ WebSocket / API
      ▼
    Server
      │
      │ Relay
      ▼
User B Browser
      │
      │ Decrypt
      ▼
Plaintext
```

سرور نباید برای پیام E2E متن خام را نیاز داشته باشد.

## کلیدها

برای هر کاربر یک Key Pair ایجاد می‌شود:

```text
Private Key
Public Key
```

Private Key نباید به Server ارسال شود.

Public Key برای برقراری توافق کلید استفاده می‌شود.

## الگوریتم‌ها

### Key Agreement

```text
ECDH P-256
```

### Message Encryption

```text
AES-256-GCM
```

AES-GCM علاوه بر محرمانگی، Integrity/Authentication داده را نیز فراهم می‌کند.

---

# 20. محل نگهداری کلید خصوصی

Private Key در Browser ذخیره می‌شود و نباید در:

```text
API
Database
WebSocket server
```

ارسال شود.

در نسخه فعلی، کلید محلی کاربر به Browser وابسته است.

بنابراین اگر کاربر Browser storage را پاک کند، ممکن است کلید قبلی از دست برود.

برای Production باید Key Backup / Recovery طراحی شود.

---

# 21. نکته بسیار مهم درباره E2E

E2E فقط برای داده‌هایی که با لایه جدید رمزنگاری ارسال می‌شوند اعمال می‌شود.

پیام‌های قدیمی که قبل از نصب E2E ذخیره شده‌اند ممکن است plaintext باشند.

همچنین E2E به‌تنهایی این موارد را حل نمی‌کند:

- تأیید هویت واقعی طرف مقابل
- MITM در زمان تعویض کلید
- دستگاه‌های متعدد
- Recovery کلید
- Backup امن
- Key Rotation
- Revocation
- امنیت Endpoint آلوده

برای یک پیام‌رسان Production حساس، پیشنهاد می‌شود مرحله بعدی:

```text
Key Verification
Device Management
Key Rotation
Secure Recovery
Security Audit
```

باشد.

---

# 22. Upload و فایل‌ها

Backend فایل‌ها را در:

```text
apps/api/uploads/
```

نگهداری می‌کند.

در اجرای Local، این پوشه باید وجود داشته باشد یا Backend آن را ایجاد کند.

برای Production بهتر است فایل‌ها روی:

- Object Storage
- S3-compatible storage
- CDN

قرار بگیرند.

در صورت استفاده از E2E واقعی، فایل خام نباید قبل از رمزنگاری روی Storage عمومی قرار بگیرد.

---

# 23. Build برای Production

## Backend

```powershell
cd D:\Projects\chatApp\apps\api
npm run build
```

سپس:

```powershell
npm run start:prod
```

## Frontend

```powershell
cd D:\Projects\chatApp\apps\web
npm run build
```

سپس:

```powershell
npm run start
```

---

# 24. Deploy روی VPS

برای Production یک VPS لینوکسی پیشنهاد می‌شود.

مثلاً:

```text
Ubuntu 24.04 LTS
```

نصب Node.js LTS:

```bash
node -v
npm -v
```

سپس پروژه را منتقل کنید:

```bash
git clone YOUR_REPOSITORY
cd chatApp
npm install
```

یا فایل ZIP پروژه را Upload و Extract کنید.

---

# 25. اجرای Backend روی VPS

```bash
cd apps/api
npm install
npm run build
npm run start:prod
```

برای اجرای دائمی بهتر است از PM2 استفاده شود:

```bash
npm install -g pm2
```

سپس:

```bash
pm2 start dist/main.js --name chatapp-api
pm2 save
pm2 startup
```

بررسی:

```bash
pm2 status
```

---

# 26. اجرای Frontend روی VPS

```bash
cd apps/web
npm install
npm run build
npm run start
```

با PM2:

```bash
pm2 start npm --name chatapp-web -- start
pm2 save
```

مثلاً:

```text
Frontend = localhost:3000
Backend  = localhost:4000
```

---

# 27. Nginx

برای Production بهتر است Nginx جلوی برنامه قرار بگیرد.

معماری:

```text
Internet
   │
   ▼
 Nginx :443
   │
   ├── /       → Next.js :3000
   │
   └── /api    → NestJS :4000
```

برای WebSocket نیز باید Upgrade headers فعال باشند.

نمونه:

```nginx
server {
    listen 80;
    server_name chat.example.com;

    location / {
        proxy_pass http://127.0.0.1:3000;
        proxy_http_version 1.1;

        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }

    location /api/ {
        proxy_pass http://127.0.0.1:4000;
        proxy_http_version 1.1;

        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }

    location /socket.io/ {
        proxy_pass http://127.0.0.1:4000/socket.io/;
        proxy_http_version 1.1;

        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";

        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
    }
}
```

---

# 28. HTTPS

برای Production حتماً HTTPS فعال کنید.

مثلاً با Let's Encrypt و Certbot.

HTTPS برای موارد زیر مهم است:

- Login
- Token
- API
- WebSocket
- File Upload
- Microphone
- Browser Notifications
- امنیت کلی ارتباط

بعد از فعال شدن HTTPS:

```text
https://chat.example.com
```

و WebSocket:

```text
wss://chat.example.com
```

استفاده می‌شود.

---

# 29. Environment در Production

Frontend:

```env
NEXT_PUBLIC_API_URL=https://chat.example.com/api
NEXT_PUBLIC_SOCKET_URL=https://chat.example.com
```

Backend:

```env
PORT=4000
JWT_SECRET=LONG_RANDOM_SECRET
```

**هیچ Secret خصوصی را داخل `NEXT_PUBLIC_*` قرار ندهید.**

متغیرهای `NEXT_PUBLIC_*` در سمت Browser قابل مشاهده‌اند.

---

# 30. Firewall

روی VPS فقط Portهای ضروری را باز کنید:

```text
22   SSH
80   HTTP
443  HTTPS
```

لازم نیست Portهای:

```text
3000
4000
```

برای Internet عمومی باز باشند اگر Nginx به‌عنوان Reverse Proxy استفاده می‌شود.

---

# 31. Database برای Production

نسخه فعلی بدون PostgreSQL قابل اجراست تا Setup ساده باشد.

اما برای Production واقعی توصیه می‌شود:

```text
PostgreSQL
```

اضافه شود.

داده‌هایی که بهتر است Database داشته باشند:

- Users
- Contacts
- Conversations
- Messages
- Reactions
- Read Receipts
- Attachments metadata
- Sessions
- Public Keys
- Devices

---

# 32. Storage برای Production

به‌جای نگهداری فایل‌ها روی VPS:

```text
apps/api/uploads/
```

بهتر است از Object Storage استفاده شود.

مثال معماری:

```text
Browser
   │
   │ encrypted file
   ▼
Object Storage
```

Server فقط Metadata و Permission را مدیریت کند.

---

# 33. تست بعد از نصب

پس از بالا آمدن پروژه این موارد را تست کنید:

## Authentication

- Register
- Login
- Logout

## Contacts

- Add Contact
- Contact List
- Online status

## Messaging

- Send message
- Receive message
- Typing
- Seen
- Notification

## Message actions

- Reply
- Edit
- Delete
- Reaction
- Forward
- Pin

## Media

- Image
- Video
- Audio
- File
- Voice

## E2E

با دو Browser/Profile مختلف:

```text
Browser A = User A
Browser B = User B
```

پیام بفرستید.

در Network/Backend نباید انتظار داشته باشید متن خام E2E به Server ارسال شود.

---

# 34. تست دو کاربر روی یک سیستم

برای تست Local:

### Browser 1

مثلاً:

```text
Chrome Normal
```

User:

```text
ali
```

### Browser 2

مثلاً:

```text
Chrome Incognito
```

User:

```text
sara
```

سپس:

```text
ali → sara
sara → ali
```

را تست کنید.

---

# 35. خطاهای رایج

## Backend اجرا نیست

اگر Frontend خطای اتصال می‌دهد:

```powershell
cd apps\api
npm run start:dev
```

را اجرا کنید.

## Frontend اجرا نیست

```powershell
cd apps\web
npm run dev
```

## Socket وصل نمی‌شود

مقدار:

```env
NEXT_PUBLIC_SOCKET_URL
```

را بررسی کنید.

Local:

```env
NEXT_PUBLIC_SOCKET_URL=http://localhost:4000
```

Production:

```env
NEXT_PUBLIC_SOCKET_URL=https://chat.example.com
```

## CORS

اگر Frontend و Backend روی Domainهای مختلف هستند، CORS Backend باید مطابق Domain واقعی تنظیم شود.

## Voice کار نمی‌کند

Microphone در Browser به Secure Context نیاز دارد.

Production باید HTTPS باشد.

## Seen کار نمی‌کند

بررسی کنید:

- Socket متصل است.
- Conversation باز است.
- `conversation:read` ارسال می‌شود.
- Backend `message:seen` ارسال می‌کند.

---

# 36. امنیت Production

قبل از Production موارد زیر را انجام دهید:

- HTTPS اجباری
- Secret قوی
- Rate Limit
- Validation ورودی‌ها
- محدودیت حجم فایل
- محدودیت MIME Type
- Malware scanning برای فایل‌های غیر-E2E
- Secure Headers
- مدیریت Session
- Backup
- Database Backup
- Log Monitoring
- Error Monitoring
- Key Verification برای E2E
- جلوگیری از XSS
- CSRF strategy در صورت استفاده از Cookie
- محدودیت CORS
- عدم قرار دادن Secret در Frontend

---

# 37. معماری نهایی پیشنهادی Production

```text
                  ┌──────────────────┐
                  │     Browser      │
                  │   Next.js/React  │
                  │                  │
                  │ E2E Encrypt/     │
                  │ Decrypt          │
                  └────────┬─────────┘
                           │
                    HTTPS / WSS
                           │
                           ▼
                  ┌──────────────────┐
                  │      Nginx       │
                  │ Reverse Proxy    │
                  └───────┬──────────┘
                          │
             ┌────────────┴────────────┐
             ▼                         ▼
      ┌──────────────┐          ┌──────────────┐
      │   Next.js    │          │   NestJS     │
      │   Frontend   │          │   REST/WS    │
      └──────────────┘          └──────┬───────┘
                                       │
                         ┌─────────────┼─────────────┐
                         ▼             ▼             ▼
                    PostgreSQL     Redis       Object Storage
```

---

# 38. اصل مهم طراحی E2E

در معماری E2E:

```text
Client → Encrypt → Server → Relay → Client → Decrypt
```

و نه:

```text
Client → Server → Encrypt
```

اگر Server قبل از رمزنگاری متن را دریافت کند، E2E واقعی نیست.

---

# 39. وضعیت نسخه فعلی

این نسخه شامل بخش‌های زیر است:

```text
Authentication
Contacts
Conversations
Real-Time Messaging
Typing
Presence
Unread
Notifications
Seen Receipts
Reply
Edit
Delete
Reaction
Forward
Pin
Image
Video
Audio
File
Voice
Light/Dark UI
Responsive UI
E2E Encryption
```

اما برای تبدیل پروژه به یک پیام‌رسان Production در مقیاس بالا، موارد زیر باید در مراحل بعد اضافه شوند:

```text
PostgreSQL
Redis
Object Storage
Horizontal Scaling
Socket.IO Adapter
Multi-device E2E
Key Verification
Key Rotation
Device Management
Push Notifications
Advanced Search
Message Pagination
Message Delivery Guarantees
Observability
Automated Tests
Security Audit
```

---

# 40. Quick Start

اگر فقط می‌خواهید سریع اجرا کنید:

### Terminal 1

```powershell
cd D:\Projects\chatApp\apps\api
npm install
npm run start:dev
```

### Terminal 2

```powershell
cd D:\Projects\chatApp\apps\web
npm install
npm run dev
```

### Browser

```text
http://localhost:3000
```

سپس:

```text
Register/Login
      ↓
Add Contact
      ↓
Create Conversation
      ↓
Send Message
      ↓
Test Seen / Typing / Reactions
      ↓
Test File / Voice
      ↓
Test E2E with second Browser
```

---

# 41. خلاصه

ChatApp یک Web Messenger مبتنی بر:

```text
Next.js
React
TypeScript
NestJS
Socket.IO
Express
Web Crypto API
MediaRecorder API
```

است.

Frontend مسئول رابط کاربری، Real-Time Client و E2E است؛ Backend مسئول API، Authentication، WebSocket، Users، Contacts، Conversations و Message Relay است.

برای Local:

```text
Frontend → localhost:3000
Backend  → localhost:4000
```

برای Production:

```text
HTTPS/WSS
      ↓
Nginx
 ┌────┴────┐
 ▼         ▼
Next.js  NestJS
           │
           ├── PostgreSQL
           ├── Redis
           └── Object Storage
```

و در حالت E2E:

```text
Plaintext
   ↓
Browser Encryption
   ↓
Ciphertext
   ↓
Server
   ↓
Ciphertext
   ↓
Browser Decryption
   ↓
Plaintext
```

