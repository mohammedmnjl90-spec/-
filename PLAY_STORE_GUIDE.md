# دليل تجهيز ونشر تطبيق «ميدان المعرفة / قمة التحدي» على متجر Google Play

تم تجهيز مجلد `android/` بالكامل باستخدام **Capacitor 7** مع إعدادات **Gradle** الإنتاجية، التوقيع الرقمي الآمن، دعم بناء ملف **Android App Bundle (`.aab`)**، ومسار **GitHub Actions** تلقائي.

---

## 1) مواصفات مشروع Android الجاهزة
| الإعداد | القيمة المعتمدة |
|---|---|
| **Package ID (معرّف الحزمة الثابت)** | `com.midan.almarifa` |
| **اسم التطبيق على الهاتف** | `قمة التحدي` (قابل للتعديل من `capacitor.config.json` و`android/app/src/main/res/values/strings.xml`) |
| **أدنى إصدار Android (`minSdk`)** | API 23 (Android 6.0) |
| **إصدار البناء والاستهداف (`compileSdk` / `targetSdk`)** | API 35 (Android 15 — متوافق مع أحدث متطلبات Google Play) |
| **الأذونات (Permissions)** | `INTERNET` و `ACCESS_NETWORK_STATE` فقط (بدون أي أذونات حساسة أو غير ضرورية) |
| **الأمان** | `usesCleartextTraffic="false"` (HTTPS إلزامي) + `allowBackup="false"` |
| **دعم AAB اللغوي** | `bundle.language.enableSplit = false` لضمان عمل التبديل الفوري بين العربية والإنجليزية داخل التطبيق |

---

## 2) كيفية إنشاء ملف التوقيع الرقمي (Keystore) وتأمينه
> **تحذير أمني مهم جداً:** لا ترفع أبداً ملف `release-keystore.jks` أو `keystore.properties` أو أي كلمات مرور داخل مستودع GitHub. تم حظرها بالفعل في `.gitignore` و`android/.gitignore`.

### الخطوة الأولى: إنشاء Keystore على جهازك
افتح الطرفية (Terminal / PowerShell) مع التأكد من وجود Java JDK (الإصدار 17 أو 21)، ثم نفّذ الأمر التالي:

```bash
keytool -genkeypair -v \
  -keystore release-keystore.jks \
  -keyalg RSA \
  -keysize 2048 \
  -validity 10000 \
  -alias qimat_release_key
```

سيطلب منك الأمر:
1. **كلمة مرور Keystore** (اختر كلمة مرور قوية واحفظها في مدير كلمات مرور مثل Bitwarden / 1Password).
2. بيانات المطور (الاسم، المؤسسة، المدينة، رمز الدولة مثل `SA`).
3. **كلمة مرور المفتاح (Key Password)** — يُفضّل حفظها بدقة (أو جعلها مطابقة لكلمة مرور Keystore).

### الخطوة الثانية: عمل نسخة احتياطية آمنة
- احفظ نسخة من `release-keystore.jks` + كلمات المرور في **مكانين آمنين خارج المستودع** (مثلاً Google Drive محمي أو قرص خارجي مشفّر).
- إذا فُقد مفتاح التوقيع ولم تكن مفعّلاً لـ **Play App Signing** لن تستطيع تحديث التطبيق مستقبلاً. عند أول رفع على Play Console فعّل خيار **Google Play App Signing** الموصى به من جوجل.

### الخطوة الثالثة: تحويل ملف Keystore إلى Base64 لإضافته في GitHub Secrets
- على **macOS / Linux**:
  ```bash
  base64 -w 0 release-keystore.jks > keystore_base64.txt
  ```
  *(على macOS استخدم `base64 -i release-keystore.jks | tr -d '\n' > keystore_base64.txt`)*
- على **Windows PowerShell**:
  ```powershell
  [Convert]::ToBase64String([IO.File]::ReadAllBytes("release-keystore.jks")) | Out-File -Encoding ascii keystore_base64.txt
  ```
انسخ محتوى `keystore_base64.txt` ثم احذف الملف النصي المؤقت فوراً.

---

## 3) إعداد أسرار GitHub Secrets بدون كشف كلمات المرور
ادخل إلى مستودعك في GitHub ثم اذهب إلى:
**Settings → Secrets and variables → Actions → New repository secret**

أضف الأسرار الأربعة الإلزامية لتوقيع نسخة Google Play:
1. `ANDROID_KEYSTORE_BASE64` ← النص الناتج من تحويل `release-keystore.jks` إلى Base64.
2. `ANDROID_KEYSTORE_PASSWORD` ← كلمة مرور ملف الـ Keystore.
3. `ANDROID_KEY_ALIAS` ← الاسم المستعار للمفتاح (مثل `qimat_release_key`).
4. `ANDROID_KEY_PASSWORD` ← كلمة مرور المفتاح.

**أسرار اختيارية (حسب حاجتك):**
- `GOOGLE_SERVICES_JSON_BASE64`: إذا أضفت تطبيق Android داخل Firebase Console وحمّلت `google-services.json` (حوّله بنفس طريقة Base64).
- `VITE_ADMOB_ANDROID_APP_ID` و `VITE_ADMOB_INTERSTITIAL_ID` و `VITE_ADMOB_REWARDED_ID`: عند تفعيل إعلانات Google AdMob الحقيقية.

---

## 4) تشغيل البناء التلقائي لملف AAB عبر GitHub Actions
1. اذهب في GitHub إلى تبويب **Actions**.
2. اختر المسار: **`Build Play Store Release (Signed AAB)`**.
3. اضغط **Run workflow**:
   - أدخل **`version_name`** (مثلاً `1.0.0`).
   - أدخل **`version_code`** (مثلاً `1`، وزده إلى `2`, `3` مع كل تحديث جديد في Google Play).
4. بعد انتهاء البناء بنجاح، انزل إلى قسم **Artifacts** وحمّل ملف:
   `midan-almarifa-playstore-v1.0.0-code1-signed-aab`
   وستجد بداخله ملف **`app-release.aab`** الموقّع والجاهز مباشرة للرفع في Google Play Console!

*(كما يعمل البناء تلقائياً عند دفع أي Tag يبدأ بـ `v` مثل `git tag v1.0.0 && git push origin v1.0.0`)*

---

## 5) البناء المحلي على جهازك (اختياري)
إذا أردت بناء ملف `.aab` محلياً عبر Android Studio أو الطرفية:
1. انسخ `android/keystore.properties.example` إلى `android/keystore.properties` (هذا الملف مستبعد من Git ولن يُرفع).
2. ضع ملف `release-keystore.jks` داخل `android/app/` وأكمل البيانات داخل `android/keystore.properties`.
3. شغّل الأمر:
   ```bash
   npm run android:aab
   ```
4. ستجد الملف الناتج في:
   `android/app/build/outputs/bundle/release/app-release.aab`

---

## 6) قائمة ما تبقى عليك فعله قبل الرفع على Google Play Console
1. **إنشاء Keystore وإضافة أسرار GitHub Secrets** الموضّحة أعلاه وتشغيل Workflow للحصول على `app-release.aab` موقّع.
2. **تجربة التطبيق على هاتف Android حقيقي** (بتثبيت ملف Debug APK من Workflow `Build Android Debug APK` أو عبر Android Studio) للتأكد من تسجيل الدخول، اللعب، حفظ النقاط، المتصدرين، والدردشة.
3. **التأكد من نشر قواعد `firestore.rules`** في مشروع Firebase (`waled-alsh`) والتحقق من إضافة تطبيق Android (`com.midan.almarifa`) إن كنت ستستخدم خدمات Android الأصلية.
4. **فتح حساب مطوّر Google Play Console** (رسوم مرة واحدة 25$) وإنشاء تطبيق جديد بمعرّف الحزمة `com.midan.almarifa`.
5. **رفع أصول المتجر في Store Listing**:
   - الأيقونة الجاهزة: `public/play-store-assets/app-icon-512.png` (بدقة 512×512 PNG).
   - البانر الترويجي (`Feature Graphic` 1024×500 PNG — يمكن تصديره من `public/play-store-assets/feature-graphic-1024x500.svg`).
   - 4 إلى 8 لقطات شاشة حقيقية من الهاتف أثناء اللعب.
6. **تعبئة السياسات المطلوبة في Play Console**:
   - رابط صفحة سياسة الخصوصية المنشورة (`public/privacy-policy.html`).
   - نموذج **أمان البيانات (Data Safety)** (بيانات الحساب، إحصائيات اللعب، المراسلات، عدم بيع البيانات).
   - استبيان **تصنيف المحتوى (Content Rating)** وتصنيف الفئة العمرية.
   - توضيح إعلان وجود إعلانات (`Ads`) ومشتريات داخل التطبيق (`In-app purchases`) عند تفعيلهما.
7. **الاختبار المغلق (Closed Testing)**: للحسابات الشخصية الجديدة في Google Play، يتطلب المتجر مشاركة 12 مختبِراً لمدة 14 يوماً متواصلة قبل فتح زر النشر العام (`Production`).
