# دليل نشر تطبيق «قمة التحدي» على متجر Google Play

هذا الدليل يوضح جميع الخطوات العملية لنشر التطبيق بصيغة **AAB موقّعة**، وتفعيل **الاشتراكات والدفع الحقيقي (Google Play Billing)**، وتفعيل **الإعلانات الحقيقية (Google AdMob)**.

---

## 1) الملفات الجاهزة داخل المشروع
- `capacitor.config.json`: إعدادات التطبيق الإنتاجية (`com.midan.almarifa`، اسم التطبيق، شاشة البداية، وشريط الحالة).
- `.github/workflows/build-playstore-release.yml`: مسار بناء أوتوماتيكي لإنتاج ملف **`app-release.aab`** الموقّع المطلوب لمتجر Google Play.
- `public/privacy-policy.html`: صفحة سياسة خصوصية كاملة بالعربية والإنجليزية (ارفع رابطها في Play Console).
- `public/manifest.webmanifest`: ملف تعريف التطبيق.
- `public/app-ads.txt`: ملف توثيق AdMob (استبدل `pub-0000000000000000` بمعرّف الناشر الخاص بك).
- `public/play-store-assets/app-icon-512.svg` و `public/play-store-assets/feature-graphic-1024x500.svg`: الأيقونة والبانر الترويجي (قم بتصديرهما إلى PNG بدقة `512×512` و `1024×500` عند الرفع في Play Console).
- `src/services/nativePlayBridge.ts`: جسر الربط الجاهز مع إضافات Capacitor الأصلية لكل من AdMob وGoogle Play Billing.
- `src/services/vipServerVerification.ts`: يحتوي على كود Cloud Function جاهز للتحقق من إيصالات الشراء على السيرفر.

---

## 2) تجهيز التوقيع الرقمي (Keystore) وبناء ملف `.aab`
1. أنشئ مفتاح التوقيع مرة واحدة واحتفظ به في مكان آمن جداً:
   ```bash
   keytool -genkey -v -keystore release-keystore.jks -keyalg RSA -keysize 2048 -validity 10000 -alias qimat_key
   ```
2. حوّله إلى نص Base64:
   ```bash
   base64 -w 0 release-keystore.jks
   ```
3. في مستودع GitHub (`Settings -> Secrets and variables -> Actions`) أضف الأسرار التالية:
   - `ANDROID_KEYSTORE_BASE64`: ناتج الأمر السابق
   - `ANDROID_KEYSTORE_PASSWORD`: كلمة مرور ملف Keystore
   - `ANDROID_KEY_ALIAS`: `qimat_key`
   - `ANDROID_KEY_PASSWORD`: كلمة مرور المفتاح
   - `GOOGLE_SERVICES_JSON_BASE64`: محتوى ملف `google-services.json` من Firebase بصيغة Base64
4. شغّل Workflow باسم **Build Signed Play Store Release (AAB + APK)** من تبويب Actions، وحمّل ملف **`app-release.aab`**.

---

## 3) تفعيل الاشتراكات والدفع الحقيقي (Google Play Billing)
1. من **Google Play Console** → اختر تطبيقك → **Monetize (تحقيق الربح)**:
   - أنشئ حساب تاجر (**Payments Profile**) واربط حسابك البنكي.
   - من **Subscriptions (الاشتراكات)** أنشئ 3 اشتراكات شهرية بنفس المعرّفات المستخدمة داخل التطبيق:
     - `com.qimataltahadi.vip.bronze` (باقة VIP البرونزية)
     - `com.qimataltahadi.vip.silver` (باقة VIP الفضية)
     - `com.qimataltahadi.vip.gold` (باقة VIP الذهبية)
   - من **In-app products (المنتجات داخل التطبيق)** أنشئ باقات العملات:
     - `pack_coins_250`
     - `pack_coins_700`
     - `pack_coins_1800`
2. في مشروع الأندرويد (Capacitor)، ثبّت إضافة الدفع الأصلية:
   ```bash
   npm install @revenuecat/purchases-capacitor
   npx cap sync android
   ```
   (أو `cordova-plugin-purchase` مع الربط المباشر بـ Google Play Billing API).
3. فعّل التحقق السحابي عبر نشر دالة `verifyVipSubscriptionPurchase` الموجودة داخل `src/services/vipServerVerification.ts` على Firebase Functions مع ربط حساب الخدمة (Google Play Android Developer API) لضمان تفعيل VIP بشكل آمن ضد التلاعب.

---

## 4) تفعيل الإعلانات الحقيقية (Google AdMob)
1. أنشئ حساباً في **[Google AdMob](https://admob.google.com/)** وأضف تطبيق Android جديد.
2. أنشئ وحدتين إعلانيتين (Ad Units):
   - **Interstitial (إعلان بيني)** — يظهر تلقائياً في الخلفية عند انتهاء الفاصل الزمني للاعبين غير المشتركين.
   - **Rewarded (إعلان مكافآت)** — يستخدم لمكافآت العملات أو إنقاذ الجولة.
3. ثبّت إضافة AdMob لـ Capacitor:
   ```bash
   npm install @capacitor-community/admob
   npx cap sync android
   ```
4. أضف `AdMob App ID` داخل `android/app/src/main/AndroidManifest.xml`:
   ```xml
   <meta-data
     android:name="com.google.android.gms.ads.APPLICATION_ID"
     android:value="ca-app-pub-XXXXXXXXXXXXXXXX~YYYYYYYYYY" />
   ```
5. أضف معرّفات وحدات الإعلانات في GitHub Secrets:
   - `VITE_ADMOB_ANDROID_APP_ID`
   - `VITE_ADMOB_INTERSTITIAL_ID`
   - `VITE_ADMOB_REWARDED_ID`
6. ضع معرّف الناشر الحقيقي داخل `public/app-ads.txt` على موقعك الرسمي المربوط بصفحة التطبيق في Play Console.
