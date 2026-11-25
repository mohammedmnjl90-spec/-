import { CategoryId, QuestionItem } from '../../types/game';

type RawTuple = [string, string, string, string, string];

function buildHardQuestions(
  categoryId: Exclude<CategoryId, 'cocktail'>,
  prefix: string,
  items: RawTuple[]
): QuestionItem[] {
  return items.map(([question, correct, w1, w2, w3], idx) => ({
    id: `${prefix}_${categoryId}_${idx + 1}`,
    categoryId,
    question,
    options: [correct, w1, w2, w3],
    correctAnswer: correct,
    difficulty: 3,
  }));
}

/**
 * Curated Expert & Grandmaster Hard Questions (Arabic)
 * Activated progressively across every category as the player's points climb.
 */
export const HARD_QUESTIONS_AR: Record<Exclude<CategoryId, 'cocktail'>, QuestionItem[]> = {
  quran: buildHardQuestions('quran', 'hard_ar', [
    ['ما هي السورة الوحيدة التي وردت فيها سجدتا تلاوة في القرآن الكريم؟', 'سورة الحج', 'سورة الأعراف', 'سورة النمل', 'سورة فصلت'],
    ['ما هي السورة التي يُطلق عليها «الجامعة» و«المانعة» وتسمى أيضاً «الواقية»؟', 'سورة الفاتحة', 'سورة البقرة', 'سورة الإخلاص', 'سورة الملك'],
    ['ما هي الآية التي اشتملت على جميع حروف اللغة العربية الثمانية والعشرين؟', 'آخر آية في سورة الفتح', 'آية الدَّين في سورة البقرة', 'آية الكرسي', 'أول آية في سورة النساء'],
    ['في أي سورة ورد ذكر «غزوة مؤتة» أو الإشارة إلى بيعة الرضوان تحت الشجرة؟', 'سورة الفتح', 'سورة الأحزاب', 'سورة الأنفال', 'سورة الحشر'],
    ['ما هي السورة المدنية التي نزلت بتمامها في المدينة رغم قصرها وعدد آياتها 8 آيات؟', 'سورة البينة', 'سورة الزلزلة', 'سورة التين', 'سورة القارعة'],
    ['كم عدد السور التي تبدأ بالحروف المقطعة (الم، حم، طسم...) في القرآن الكريم؟', '29 سورة', '25 سورة', '33 سورة', '21 سورة'],
    ['ما هي السور السبع التي تبدأ جميعها بـ «حم» وتُعرف بـ «الحواميم»؟', 'غافر إلى الأحقاف', 'الزمر إلى الجاثية', 'الشورى إلى محمد', 'فصلت إلى ق'],
    ['ما هي السورة التي ذُكر فيها اسم النبي «إلياس عليه السلام» بصيغة «إلياسين»؟', 'سورة الصافات', 'سورة الأنعام', 'سورة الأنبياء', 'سورة ص'],
    ['ما هي السورة التي لم يُذكر فيها حرف «الفاء» مطلقاً؟', 'سورة الفاتحة', 'سورة الكوثر', 'سورة الإخلاص', 'سورة العصر'],
    ['ما هي السورة التي خلت تماماً من حرف «الميم»؟', 'سورة الكوثر', 'سورة النصر', 'سورة قريش', 'سورة العصر'],
    ['كم عدد السور في القرآن الكريم التي تبدأ بالحمد (الحمد لله)؟', '5 سور', '4 سور', '6 سور', '7 سور'],
    ['في أي سورة وردت قصة الثلاثة الذين خُلِّفوا عن غزوة تبوك؟', 'سورة التوبة', 'سورة الفتح', 'سورة الأنفال', 'سورة المنافقون'],
  ]),

  islamic: buildHardQuestions('islamic', 'hard_ar', [
    ['من هو الصحابي الذي أُطلق عليه لقب «ذو الشهادتين» لأن النبي ﷺ جعل شهادته بشهادة رجلين؟', 'خزيمة بن ثابت', 'سعد بن معاذ', 'ثابت بن قيس', 'أسيد بن حضير'],
    ['في أي عام هجري وقعت معركة «القادسية» بقيادة سعد بن أبي وقاص؟', '15 هـ', '13 هـ', '18 هـ', '21 هـ'],
    ['من هو القائد المسلم الذي قاد معركة «نهاوند» التي سُميت «فتح الفتوح»؟', 'النعمان بن مقرن', 'المثنى بن حارثة', 'أبو عبيدة بن الجراح', 'عمرو بن العاص'],
    ['ما اسم المعركة البحرية الكبرى التي انتصر فيها المسلمون على البيزنطيين عام 34 هـ؟', 'ذات الصواري', 'أجنادين', 'فحل', 'مرج الصفر'],
    ['من هو التابعي الجليل الذي يُعد أول من أمر بتدوين الحديث النبوي تدويناً رسمياً؟', 'عمر بن عبد العزيز', 'سعيد بن المسيب', 'الحسن البصري', 'ابن شهاب الزهري'],
    ['ما اسم الكتاب الفقهي الشهير الذي ألّفه الإمام الشافعي في أصول الفقه كأول مصنّف مستقل؟', 'الرسالة', 'الأم', 'المبسوط', 'المغني'],
    ['من هو الصحابي الذي كان يُعرف بـ «صاحب سر رسول الله ﷺ»؟', 'حذيفة بن اليمان', 'أبو ذر الغفاري', 'سلمان الفارسي', 'معاذ بن جبل'],
    ['في أي عام هجري وقعت سرية «مؤتة» التي استشهد فيها زيد وجعفر وابن رواحة؟', '8 هـ', '6 هـ', '7 هـ', '9 هـ'],
    ['من هو الصحابي الذي لُقّب بـ «غسيل الملائكة» واستشهد يوم أحد؟', 'حنظلة بن أبي عامر', 'مصعب بن عمير', 'عمرو بن الجموح', 'أنس بن النضر'],
    ['كم كان عدد المسلمين في بيعة العقبة الثانية التي سبقت الهجرة إلى المدينة؟', '73 رجلاً وامرأتان', '12 رجلاً فقط', '40 رجلاً وامرأة', '100 رجل'],
  ]),

  medicine: buildHardQuestions('medicine', 'hard_ar', [
    ['ما اسم العصب القحفي العاشر المسؤول عن تنظيم ضربات القلب والهضم (العصب الحائر)؟', 'العصب المبهم (Vagus)', 'العصب الثلاثي التوائم', 'العصب الوجهي', 'العصب البصري'],
    ['ما اسم الخلايا المتخصصة في البنكرياس التي تفرز هرمون الإنسولين؟', 'خلايا بيتا في جزر لانغرهانس', 'خلايا ألفا الكبدية', 'خلايا كوفر', 'خلايا شوان'],
    ['ما هو البروتين المسؤول عن تخثر الدم وتكوين الشبكة الليفية عند الجروح؟', 'الفيبرين (Fibrin)', 'الألبومين', 'الكولاجين', 'الميوسين'],
    ['ما اسم الصمام القلبي الذي يفصل بين الأذين الأيسر والبطين الأيسر؟', 'الصمام التاجي (المترالي)', 'الصمام ثلاثي الشرفات', 'الصمام الأورطي', 'الصمام الرئوي'],
    ['ما اسم المنطقة في الدماغ المسؤولة بشكل رئيسي عن التوازن وتنسيق الحركات الدقيقة؟', 'المخيخ (Cerebellum)', 'النخاع المستطيل', 'المهاد (Thalamus)', 'اللوزة الدماغية'],
    ['أي فيتامين يُعرف علمياً باسم «السيانوكوبالامين» ويؤدي نقصه لفقر الدم الخبيث؟', 'فيتامين B12', 'فيتامين B6', 'فيتامين K', 'فيتامين E'],
    ['ما هو المصطلح الطبي الذي يُطلق على ارتفاع ضغط العين المؤدي لتلف العصب البصري؟', 'الجلوكوما (المياه الزرقاء)', 'الكتاراكت (المياه البيضاء)', 'اللابؤرية', 'الحول الوحشي'],
    ['ما هي الغدة الصماء التي تُعرف بـ «سيدة الغدد» وتقع أسفل الدماغ؟', 'الغدة النخامية', 'الغدة الصنوبرية', 'الغدة الدرقية', 'الغدة الكظرية'],
    ['كم عدد أزواج الأعصاب القحفية (الدماغية) التي تخرج مباشرة من الدماغ؟', '12 زوجاً', '10 أزواج', '14 زوجاً', '31 زوجاً'],
    ['ما هو الأنزيم الموجود في اللعاب والذي يبدأ بهضم النشويات داخل الفم؟', 'الأميليز اللعابي', 'الببسين', 'الليبيز', 'التربسين'],
  ]),

  engineering: buildHardQuestions('engineering', 'hard_ar', [
    ['ما هي التعقيدية الزمنية (Time Complexity) الأسوأ لخوارزمية الترتيب السريع (QuickSort)؟', 'O(n²)', 'O(n log n)', 'O(log n)', 'O(n)'],
    ['في نموذج الشبكات OSI ذي الطبقات السبع، أي طبقة مسؤولة عن التوجيه (Routing) وعناوين IP؟', 'طبقة الشبكة (الطبقة الثالثة)', 'طبقة النقل (الطبقة الرابعة)', 'طبقة ربط البيانات (الثانية)', 'طبقة الجلسة (الخامسة)'],
    ['ما هي البوابة المنطقية التي تعطي مخرجاً (1) فقط عندما يكون المدخلان مختلفين؟', 'بوابة XOR', 'بوابة NAND', 'بوابة NOR', 'بوابة AND'],
    ['ما اسم المبدأ في هندسة البرمجيات الذي يرمز له بالحرف S في مبادئ SOLID؟', 'مبدأ المسؤولية الواحدة', 'مبدأ الاستبدال', 'مبدأ عكس الاعتماد', 'مبدأ فصل الواجهات'],
    ['ما هو المنفذ (Port) الافتراضي لبروتوكول الاتصال الآمن SSH؟', '22', '21', '25', '53'],
    ['ما اسم نظرية الأنظمة الموزعة التي تنص على استحالة تحقيق الاتساق والتوفر وتحمل التقسيم معاً؟', 'نظرية CAP', 'نظرية بايز', 'قانون أمدال', 'نظرية شانون'],
    ['في قواعد البيانات، ماذا يعني الحرف A في خصائص المعاملات ACID؟', 'الذرية (Atomicity)', 'التوافر (Availability)', 'الاستقلالية (Autonomy)', 'التحليل (Analysis)'],
    ['ما هو القانون الذي يحكم العلاقة بين التردد الأعلى للإشارة ومعدل أخذ العينات الرقمية؟', 'مبرهنة نيكويست-شانون', 'قانون مور', 'قانون أوم', 'قانون كيرشوف'],
    ['أي خوارزمية تُستخدم لإيجاد أقصر مسار في رسم بياني موزون بأوزان غير سالبة؟', 'خوارزمية ديكسترا (Dijkstra)', 'خوارزمية كروسكال', 'خوارزمية البحث العميق DFS', 'خوارزمية الترتيب الفقاعي'],
    ['ما هو الفرق الأساسي بين TCP و UDP في طبقة النقل؟', 'TCP يضمن وصول الحزم مرتبة بينما UDP أسرع بلا تأكيد', 'UDP مشفر دائماً بينما TCP غير مشفر', 'TCP يعمل فقط في الشبكات المحلية', 'لا يوجد فرق في الموثوقية'],
  ]),

  sports: buildHardQuestions('sports', 'hard_ar', [
    ['من هو المدرب الوحيد الذي فاز بلقب دوري أبطال أوروبا 5 مرات كمدرب؟', 'كارلو أنشيلوتي', 'بيب غوارديولا', 'زين الدين زيدان', 'أليكس فيرغسون'],
    ['في أي عام أُقيمت أول دورة ألعاب أولمبية حديثة في أثينا باليونان؟', '1896م', '1900م', '1888م', '1904م'],
    ['من هو اللاعب الذي سجل أسرع هدف في تاريخ نهائيات كأس العالم (بعد 11 ثانية عام 2002)؟', 'هاكان شوكور', 'رونالدو نازاريو', 'كلينت ديمبسي', 'بريان روبسون'],
    ['ما هو النادي الأوروبي الوحيد الذي حقق لقب دوري أبطال أوروبا في خمسينيات القرن الماضي 5 مرات متتالية؟', 'ريال مدريد', 'بنفيكا', 'إيه سي ميلان', 'أياكس أمستردام'],
    ['في أي عام تأسس الاتحاد الدولي لكرة القدم (FIFA) في العاصمة الفرنسية باريس؟', '1904م', '1920م', '1898م', '1930م'],
    ['من هو المنتخب الذي فاز بلقب كأس العالم 1950 في المباراة الشهيرة المعروفة بـ «ماراكانازو»؟', 'الأوروغواي', 'البرازيل', 'إيطاليا', 'المجر'],
    ['ما هو الحد الأقصى لعدد النقاط الممكن تسجيله في رمية واحدة (Turn) في لعبة البولينغ (اللعبة الكاملة المثالية)؟', '300 نقطة', '250 نقطة', '200 نقطة', '360 نقطة'],
    ['من هو اللاعب العربي الذي حقق جائزة أفضل لاعب في أفريقيا عام 1987 وتُوج بدوري أبطال أوروبا مع بورتو؟', 'رابح ماجر', 'جورج ويا', 'الأخضر بلومي', 'محمود الخطيب'],
    ['كم عدد النقاط اللازمة للفوز بشوط واحد قياسي في كرة الطائرة (باستثناء الشوط الخامس الفاصل)؟', '25 نقطة بفارق نقطتين', '21 نقطة بفارق نقطتين', '15 نقطة بفارق نقطتين', '30 نقطة'],
    ['من هو بطل العالم في الشطرنج الذي احتفظ باللقب الكلاسيكي لمدة 10 سنوات متتالية (2013–2023)؟', 'ماغنوس كارلسن', 'غاري كاسباروف', 'أناتولي كاربوف', 'بوبي فيشر'],
  ]),

  arabic: buildHardQuestions('arabic', 'hard_ar', [
    ['ما اسم البحر الشعري الذي وزنه: «فعولن مفاعيلن فعولن مفاعلن»؟', 'البحر الطويل', 'البحر البسيط', 'البحر الكامل', 'البحر الوافر'],
    ['في علم البلاغة، ما المصطلح الذي يُطلق على تشبيه حُذف منه المشبَّه وصُرِّح بالمشبَّه به؟', 'الاستعارة التصريحية', 'الاستعارة المكنية', 'التشبيه البليغ', 'المجاز المرسل'],
    ['ما هو الإعراب الصحيح لكلمة «فوق» في جملة: «العصفورُ فوقَ الشجرةِ»؟', 'ظرف مكان منصوب بالفتحة', 'خبر مرفوع بالضمة', 'مفعول به منصوب', 'اسم مجرور'],
    ['ما اسم الكتاب النحوي الأشهر الذي ألّفه «سيبويه» ويُعرف بقرآن النحو؟', 'الكتاب', 'الألفية', 'المقتضب', 'شرح المفصل'],
    ['أي من الأسماء التالية يُعد من «الممنوع من الصرف» للعلمية والعجمة؟', 'إبراهيم', 'صالح', 'محمد', 'شعيب'],
    ['ما هو جمع التكسير الصحيح لكلمة «عَندَليب» في المعاجم العربية الفصحى؟', 'عنادل', 'عندليبات', 'عناديل', 'عنودل'],
    ['من هو صاحب المعلقة التي مطلعها: «هل غادر الشعراء من متردم»؟', 'عنترة بن شداد', 'امرؤ القيس', 'زهير بن أبي سلمى', 'لبيد بن ربيعة'],
    ['في علم الصرف، ما هو الوزن الصرفي الدقيق لكلمة «اضطرب»؟', 'افْتَعَلَ', 'انْفَعَلَ', 'تَفَعَّلَ', 'اسْتَفْعَلَ'],
    ['ما معنى كلمة «الهِزَبْر» في اللغة العربية الفصحى؟', 'الأسد', 'الصقر', 'السيف القاطع', 'الفرس السريع'],
    ['من هو الشاعر الأندلسي صاحب النونية الشهيرة: «أضحى التنائي بديلاً من تدانينا»؟', 'ابن زيدون', 'ابن خفاجة', 'لسان الدين بن الخطيب', 'المعتمد بن عباد'],
  ]),

  science: buildHardQuestions('science', 'hard_ar', [
    ['ما هو العدد الذري لعنصر الذهب (Au) في الجدول الدوري للعناصر؟', '79', '47', '82', '74'],
    ['ما هو الغاز النبيل الأثقل والأكثر كثافة بين الغازات النبيلة الطبيعية والمشع أيضاً؟', 'الرادون (Rn)', 'الزينون (Xe)', 'الأرغون (Ar)', 'الكريبتون (Kr)'],
    ['ما اسم الظاهرة الكونية التي يتمدد فيها الطول الموجي للضوء القادم من المجرات البعيدة؟', 'الانزياح نحو الأحمر (Redshift)', 'تأثير كوريوليس', 'الانكسار الكلي', 'الحيود الكمي'],
    ['كم تبلغ قيمة ثابت أفوغادرو (عدد الجسيمات في مول واحد) تقريباً؟', '6.022 × 10²³', '3.14 × 10⁸', '9.81 × 10¹⁹', '1.602 × 10⁻¹⁹'],
    ['ما اسم القمر الأكبر في المجموعة الشمسية بأكملها ويدور حول كوكب المشتري؟', 'غانيميد (Ganymede)', 'تيتان', 'أوروبا', 'كاليستو'],
    ['ما هو المركب الكيميائي المسؤول عن اللون الأخضر وامتصاص الضوء في عملية البناء الضوئي؟', 'الكلوروفيل (اليخضور)', 'الكاروتين', 'الهيموغلوبين', 'السليلوز'],
    ['أي حمض قوي يُنتج في معدة الإنسان للمساعدة في هضم البروتينات وقتل الميكروبات؟', 'حمض الهيدروكلوريك (HCl)', 'حمض الكبريتيك', 'حمض النيتريك', 'حمض الخليك'],
    ['ما اسم الطبقة الجوية التي تحتوي على معظم غاز الأوزون الواقي من الأشعة فوق البنفسجية؟', 'الستراتوسفير', 'التروبوسفير', 'الميزوسفير', 'الثرموسفير'],
    ['ما هو العنصر الفلزي الوحيد الذي يكون في الحالة السائلة عند درجة حرارة الغرفة القياسية؟', 'الزئبق (Hg)', 'البروم (Br)', 'الغاليوم (Ga)', 'السيزيوم (Cs)'],
    ['ما اسم العملية الخلوية التي ينتج عنها أربع خلايا جنسية تحمل نصف عدد الكروموسومات؟', 'الانقسام المنصّف (الميوزي)', 'الانقسام المتساوي (الميتوزي)', 'التبرعم الخلوي', 'الانشطار الثنائي'],
  ]),

  history: buildHardQuestions('history', 'hard_ar', [
    ['في أي عام ميلادي تأسست الدولة السعودية الأولى على يد الإمام محمد بن سعود في الدرعية؟', '1727م', '1744م', '1818م', '1902م'],
    ['في أي عام ميلادي وقعت معركة «حطين» الفاصلة بقيادة صلاح الدين الأيوبي؟', '1187م', '1174م', '1260م', '1099م'],
    ['في أي عام هجري وقعت معركة «عين جالوت» التي أوقفت زحف المغول؟', '658 هـ', '656 هـ', '583 هـ', '699 هـ'],
    ['من هو المؤسس الحقيقي لمدينة «القيروان» في تونس عام 50 هـ؟', 'عقبة بن نافع', 'حسان بن النعمان', 'موسى بن نصير', 'طارق بن زياد'],
    ['في أي عام سقطت غرناطة آخر معاقل المسلمين في الأندلس؟', '1492م', '1453م', '1212م', '1517م'],
    ['في أي عام تم فتح القسطنطينية على يد السلطان محمد الفاتح؟', '1453م', '1492م', '1389م', '1520م'],
    ['ما اسم المعاهدة التي أنهت الحرب العالمية الأولى رسمياً عام 1919م؟', 'معاهدة فرساي', 'معاهدة وستفاليا', 'معاهدة يالطا', 'معاهدة لوزان'],
    ['من هو الخليفة العباسي الذي أسس «بيت الحكمة» في بغداد وأوسع نشاط الترجمة؟', 'هارون الرشيد ثم ازدهر في عهد المأمون', 'أبو العباس السفاح', 'المعتصم بالله', 'المتوكل على الله'],
    ['في أي عام ميلادي تم توحيد المملكة العربية السعودية تحت اسمها الحالي؟', '1932م', '1902م', '1926م', '1938م'],
    ['ما اسم الحضارة القديمة التي ابتكرت الكتابة المسمارية في بلاد الرافدين؟', 'الحضارة السومرية', 'الحضارة الفينيقية', 'الحضارة الآشورية', 'الحضارة الإغريقية'],
  ]),

  geography: buildHardQuestions('geography', 'hard_ar', [
    ['ما اسم أعمق نقطة معروفة في محيطات الأرض وتقع في خندق ماريانا بالمحيط الهادئ؟', 'تشالنجر ديب (نحو 10,984 م)', 'خندق بورتوريكو', 'خندق تونغا', 'خندق جاوة'],
    ['ما هو المضيق الذي يفصل بين قارتي آسيا وأمريكا الشمالية؟', 'مضيق بيرنغ', 'مضيق ماجلان', 'مضيق ملقا', 'مضيق جبل طارق'],
    ['ما هي أكبر بحيرة مياه عذبة في العالم من حيث المساحة السطحية؟', 'بحيرة سوبيريور', 'بحيرة فيكتوريا', 'بحيرة بايكال', 'بحيرة تنجانيقا'],
    ['ما هي أعمق بحيرة في العالم وتقع في سيبيريا بروسيا؟', 'بحيرة بايكال', 'بحيرة تيتيكاكا', 'بحيرة قزوين', 'بحيرة ملاوي'],
    ['أي دولة تمتلك أكبر عدد من المناطق الزمنية (12 منطقة زمنية باحتساب أقاليمها)؟', 'فرنسا', 'روسيا', 'الولايات المتحدة', 'كندا'],
    ['ما هو أعلى شلال في العالم ويقع في فنزويلا بارتفاع 979 متراً؟', 'شلالات آنجل (Angel Falls)', 'شلالات نياغارا', 'شلالات فيكتوريا', 'شلالات إغوازو'],
    ['ما هي الصحراء الأشد جفافاً غير القطبية على سطح الأرض؟', 'صحراء أتاكاما في تشيلي', 'صحراء الربع الخالي', 'صحراء غوبي', 'صحراء كالهاري'],
    ['ما اسم المضيق الاستراتيجي الذي يربط الخليج العربي بخليج عُمان؟', 'مضيق هرمز', 'مضيق باب المندب', 'مضيق تيران', 'مضيق البوسفور'],
    ['في أي قارة تقع سلسلة «جبال دراكنزبرغ» الشهيرة؟', 'أفريقيا (جنوب أفريقيا وليسوتو)', 'أوروبا', 'أمريكا الجنوبية', 'أوقيانوسيا'],
    ['ما هي أطول سلسلة جبلية فوق سطح البحر في العالم؟', 'جبال الأنديز (نحو 7000 كم)', 'جبال الهيمالايا', 'جبال الروكي', 'جبال الألب'],
  ]),

  countries: buildHardQuestions('countries', 'hard_ar', [
    ['ما هي الدولة الوحيدة في العالم التي يتكون علمها الوطني من شكل غير رباعي (مثلثين متداخلين)؟', 'نيبال', 'بوتان', 'سويسرا', 'الفاتيكان'],
    ['ما هي العاصمة الرسمية لجمهورية كازاخستان حالياً؟', 'أستانا', 'ألماتي', 'طشقند', 'بشكيك'],
    ['ما هي العاصمة الإدارية لدولة ميانمار (بورما)؟', 'نايبيداو', 'يانغون', 'ماندالاي', 'بنوم بنه'],
    ['ما هي الدولة الحبيسة المزدوجة (تحيط بها دول حبيسة فقط) في آسيا الوسطى؟', 'أوزبكستان', 'كازاخستان', 'طاجيكستان', 'منغوليا'],
    ['ما هي عاصمة دولة «بوتان» الواقعة في جبال الهيمالايا؟', 'تيمفو', 'كاتماندو', 'دكا', 'أولان باتور'],
    ['ما هي عاصمة دولة «بوركينا فاسو» في غرب أفريقيا؟', 'واغادوغو', 'باماكو', 'نيامي', 'أبيدجان'],
    ['ما هي الدولة التي تُعد عاصمتها «لاباز» أعلى مقر حكومة في العالم؟', 'بوليفيا', 'الإكوادور', 'بيرو', 'كولومبيا'],
    ['ما هي عاصمة دولة «سورينام» في أمريكا الجنوبية؟', 'باراماريبو', 'جورج تاون', 'كايين', 'أسونسيون'],
    ['ما هما الدولتان الوحيدتان اللتان يمتلكان علماً مربع الشكل تماماً؟', 'سويسرا والفاتيكان', 'نيبال وبوتان', 'موناكو وسان مارينو', 'أندورا ومالطا'],
    ['ما هي عاصمة دولة «بالاو» في المحيط الهادئ؟', 'نغيرولمود', 'ماجورو', 'تاراوا', 'بورت فيلا'],
  ]),

  math: buildHardQuestions('math', 'hard_ar', [
    ['ما قيمة مجموع الأعداد الصحيحة المتتالية من 1 إلى 100 (حسب صيغة غاوس)؟', '5050', '5000', '4950', '5500'],
    ['كم يساوي اللوغاريتم العشري للعدد 1000 أي log₁₀(1000)؟', '3', '10', '100', '2'],
    ['ما هي مشتقة الدالة f(x) = 3x³ + 2x بالنسبة للمتغير x؟', '9x² + 2', '6x² + 2', '9x³ + 2', '3x² + 2'],
    ['ما هو مجموع الزوايا الداخلية لمضلع سداسي منتظم؟', '720 درجة', '540 درجة', '900 درجة', '1080 درجة'],
    ['إذا كان 2ˣ = 128، فما هي قيمة x؟', '7', '6', '8', '5'],
    ['كم عدد الأعداد الأولية المحصورة بين 1 و 20؟', '8 أعداد', '7 أعداد', '9 أعداد', '6 أعداد'],
    ['ما قيمة المضروب (6!) أي 6 × 5 × 4 × 3 × 2 × 1؟', '720', '360', '600', '540'],
    ['ما هو ناتج جمع الكسرين: 1/3 + 1/4 ؟', '7/12', '2/7', '5/12', '1/2'],
    ['إذا كانت مساحة دائرة 100π سم²، فكم يبلغ محيطها؟', '20π سم', '10π سم', '50π سم', '40π سم'],
    ['ما قيمة sin²(θ) + cos²(θ) لأي زاوية حقيقية θ؟', '1 دائماً', '0 دائماً', '2', 'تتغير حسب الزاوية'],
  ]),

  physics: buildHardQuestions('physics', 'hard_ar', [
    ['ما اسم الثابت الفيزيائي الذي يربط طاقة الفوتون بتردده في المعادلة E = h·f؟', 'ثابت بلانك (h)', 'ثابت بولتزمان', 'ثابت الجذب العام', 'ثابت كولوم'],
    ['ما هي وحدة قياس شدة المجال المغناطيسي (كثافة التدفق المغناطيسي) في النظام الدولي؟', 'التسلا (Tesla)', 'الهنري (Henry)', 'الويبر (Weber)', 'الفاراد (Farad)'],
    ['عند توصيل مقاومتين قيمتهما 6 أوم و3 أوم على التوازي، كم تكون المقاومة المكافئة؟', '2 أوم', '9 أوم', '4.5 أوم', '1.5 أوم'],
    ['ما هي سرعة الإفلات التقريبية اللازمة للتحرر من جاذبية الأرض عند سطحها؟', '11.2 كم/ثانية', '7.9 كم/ثانية', '9.8 كم/ثانية', '25 كم/ثانية'],
    ['ما اسم القانون الذي ينص على أن ضغط غاز مثالي يتناسب عكسياً مع حجمه عند ثبوت درجة الحرارة؟', 'قانون بويل', 'قانون شارل', 'قانون غاي-لوساك', 'قانون باسكال'],
    ['ما هي قيمة الصفر المطلق (0 كلفن) بمقياس سيلسيوس؟', '-273.15 درجة مئوية', '-100 درجة مئوية', '-373.15 درجة مئوية', '-459.67 درجة مئوية'],
    ['أي ظاهرة فيزيائية تُثبت الطبيعة الجسيمية للضوء وفاز عنها أينشتاين بنوبل؟', 'التأثير الكهروضوئي', 'تداخل الشق المزدوج', 'الاستقطاب الخطي', 'انكسار سنيل'],
    ['ما هي وحدة قياس الحث الذاتي للملفات الكهربائية في النظام الدولي (SI)؟', 'الهنري (Henry)', 'الفاراد', 'الأوم', 'السيمنز'],
    ['حسب قانون الجذب العام لنيوتن، إذا تضاعفت المسافة بين جسمين إلى الضعف فإن قوة الجذب:', 'تقل إلى الربع (1/4)', 'تقل إلى النصف (1/2)', 'تتضاعف مرتين', 'تبقى ثابتة'],
    ['ما هو الجسيم الأولي الحامل للقوة الكهرومغناطيسية وكتلته السكونية تساوي صفراً؟', 'الفوتون', 'الغلون', 'البروتون', 'النيوترينو'],
  ]),
};

/**
 * Curated Expert & Grandmaster Hard Questions (English)
 */
export const HARD_QUESTIONS_EN: Record<Exclude<CategoryId, 'cocktail'>, QuestionItem[]> = {
  quran: buildHardQuestions('quran', 'hard_en', [
    ['Which is the only Surah in the Holy Quran containing two verses of prostration (Sajdah)?', 'Surah Al-Hajj', 'Surah Al-Araf', 'Surah An-Naml', 'Surah Fussilat'],
    ['How many Surahs in the Holy Quran begin with the disjointed letters (Muqattaat)?', '29 Surahs', '25 Surahs', '33 Surahs', '21 Surahs'],
    ['Which Surah contains the longest single Arabic word in the Quran ("Fa-asqaynakumuhu")?', 'Surah Al-Hijr', 'Surah Al-Baqarah', 'Surah Hud', 'Surah Yusuf'],
    ['Which Surah completely omits the Arabic letter "Meem"?', 'Surah Al-Kawthar', 'Surah Al-Ikhlas', 'Surah Al-Asr', 'Surah An-Nasr'],
    ['How many Surahs in the Holy Quran open with "Alhamdulillah"?', '5 Surahs', '4 Surahs', '6 Surahs', '7 Surahs'],
    ['Which Surah mentions the companion Zayd ibn Harithah explicitly by name?', 'Surah Al-Ahzab', 'Surah At-Tawbah', 'Surah Al-Fath', 'Surah Al-Anfal'],
  ]),
  islamic: buildHardQuestions('islamic', 'hard_en', [
    ['Which major naval battle in 34 AH secured Muslim dominance in the Eastern Mediterranean?', 'Battle of the Masts (Dhat al-Sawari)', 'Battle of Yarmouk', 'Battle of Qadisiyyah', 'Battle of Nahavand'],
    ['Who authored "Al-Risalah", the earliest surviving systematic work on Islamic jurisprudence (Usul al-Fiqh)?', 'Imam Al-Shafii', 'Imam Malik', 'Imam Abu Hanifa', 'Imam Ahmad ibn Hanbal'],
    ['Which companion was known as the Keeper of the Prophet’s Secret ("Sahib Sirr")?', 'Hudhayfah ibn al-Yaman', 'Salman al-Farsi', 'Abu Dharr al-Ghifari', 'Muadh ibn Jabal'],
    ['In which Hijri year did the decisive Battle of Al-Qadisiyyah take place?', '15 AH', '13 AH', '18 AH', '21 AH'],
    ['Who ordered the first official state-sponsored compilation of Hadith?', 'Umar ibn Abd al-Aziz', 'Muawiyah I', 'Harun al-Rashid', 'Uthman ibn Affan'],
    ['Which battle in 21 AH was called "Victory of Victories" (Fath al-Futuh)?', 'Battle of Nahavand', 'Battle of Tabuk', 'Battle of Hunayn', 'Battle of Ajnadayn'],
  ]),
  medicine: buildHardQuestions('medicine', 'hard_en', [
    ['Which cranial nerve (CN X) regulates parasympathetic control of the heart and digestive tract?', 'Vagus nerve', 'Trigeminal nerve', 'Facial nerve', 'Glossopharyngeal nerve'],
    ['Which valve separates the left atrium from the left ventricle of the human heart?', 'Mitral (bicuspid) valve', 'Tricuspid valve', 'Aortic valve', 'Pulmonary valve'],
    ['Which pancreatic cells are specifically responsible for secreting insulin?', 'Beta cells of Islets of Langerhans', 'Alpha cells', 'Kupffer cells', 'Schwann cells'],
    ['Which vitamin is chemically known as cyanocobalamin?', 'Vitamin B12', 'Vitamin B6', 'Vitamin K', 'Vitamin B9'],
    ['What protein forms the insoluble mesh stabilizing a blood clot?', 'Fibrin', 'Albumin', 'Keratin', 'Myosin'],
    ['How many pairs of cranial nerves emerge directly from the human brain?', '12 pairs', '10 pairs', '14 pairs', '31 pairs'],
  ]),
  engineering: buildHardQuestions('engineering', 'hard_en', [
    ['What is the worst-case time complexity of standard QuickSort?', 'O(n²)', 'O(n log n)', 'O(log n)', 'O(n)'],
    ['Which OSI model layer is responsible for logical IP addressing and packet routing?', 'Network Layer (Layer 3)', 'Transport Layer (Layer 4)', 'Data Link Layer (Layer 2)', 'Session Layer (Layer 5)'],
    ['Which theorem states a distributed store cannot simultaneously guarantee Consistency, Availability, and Partition tolerance?', 'CAP Theorem', 'Amdahl’s Law', 'Byzantine Theorem', 'Shannon’s Theorem'],
    ['What does the letter "A" stand for in database ACID transactions?', 'Atomicity', 'Availability', 'Asynchronous', 'Authentication'],
    ['Which algorithm finds shortest paths in a weighted graph with non-negative edge weights?', 'Dijkstra’s Algorithm', 'Kruskal’s Algorithm', 'Bubble Sort', 'Depth-First Search'],
    ['Which sampling theorem defines the minimum sampling rate to avoid aliasing?', 'Nyquist–Shannon theorem', 'Moore’s Law', 'Kirchhoff’s Law', 'Fourier’s Inequality'],
  ]),
  sports: buildHardQuestions('sports', 'hard_en', [
    ['Who is the only football manager to have won 5 UEFA Champions League titles?', 'Carlo Ancelotti', 'Pep Guardiola', 'Zinedine Zidane', 'Alex Ferguson'],
    ['In what year were the first modern Olympic Games held in Athens?', '1896', '1900', '1888', '1904'],
    ['Who scored the fastest goal in FIFA World Cup history (11 seconds in 2002)?', 'Hakan Sukur', 'Ronaldo Nazario', 'Clint Dempsey', 'Bryan Robson'],
    ['Which score constitutes a perfect game in ten-pin bowling?', '300 points', '250 points', '200 points', '360 points'],
    ['In what year was FIFA founded in Paris?', '1904', '1920', '1898', '1930'],
    ['Who held the Classical World Chess Championship title uninterrupted from 2013 to 2023?', 'Magnus Carlsen', 'Garry Kasparov', 'Viswanathan Anand', 'Fabiano Caruana'],
  ]),
  arabic: buildHardQuestions('arabic', 'hard_en', [
    ['Who authored "Al-Kitab", the foundational treatise of classical Arabic grammar?', 'Sibawayh', 'Al-Khalil ibn Ahmad', 'Al-Jahiz', 'Ibn Jinni'],
    ['Who wrote the famous Andalusian Nuniyyah poem "Adha al-tana’i"?', 'Ibn Zaydun', 'Al-Mutanabbi', 'Abu Tammam', 'Imru al-Qays'],
    ['Which classical scholar compiled the first Arabic dictionary "Kitab al-Ayn"?', 'Al-Khalil ibn Ahmad al-Farahidi', 'Ibn Manzur', 'Al-Firuzabadi', 'Al-Asmai'],
    ['Which medieval Arab polymath authored "Kitab al-Bukhala" (Book of Misers) and "Al-Bayan wa al-Tabyin"?', 'Al-Jahiz', 'Ibn al-Muqaffa', 'Al-Maarri', 'Ibn Qutaybah'],
    ['Who is the Arab novelist who won the 1988 Nobel Prize in Literature?', 'Naguib Mahfouz', 'Taha Hussein', 'Tawfiq al-Hakim', 'Mahmoud Darwish'],
    ['How many classical poetic meters (Buhur) were codified by Al-Khalil ibn Ahmad (later plus Al-Akhfash)?', '16 meters', '12 meters', '10 meters', '20 meters'],
  ]),
  science: buildHardQuestions('science', 'hard_en', [
    ['What is the atomic number of Gold (Au) on the periodic table?', '79', '47', '82', '74'],
    ['Which is the largest moon in the entire Solar System?', 'Ganymede', 'Titan', 'Europa', 'Callisto'],
    ['What is the approximate value of Avogadro’s constant?', '6.022 × 10²³', '3.14 × 10⁸', '9.81 × 10¹⁹', '1.602 × 10⁻¹⁹'],
    ['Which atmospheric layer contains the bulk of Earth’s protective ozone layer?', 'Stratosphere', 'Troposphere', 'Mesosphere', 'Thermosphere'],
    ['Which noble gas is both radioactive and the densest naturally occurring noble gas?', 'Radon (Rn)', 'Xenon (Xe)', 'Krypton (Kr)', 'Argon (Ar)'],
    ['What phenomenon stretches the wavelength of light from receding distant galaxies?', 'Cosmological Redshift', 'Coriolis Effect', 'Total Internal Reflection', 'Quantum Tunneling'],
  ]),
  history: buildHardQuestions('history', 'hard_en', [
    ['In what year was the First Saudi State founded in Diriyah by Imam Muhammad bin Saud?', '1727', '1744', '1818', '1902'],
    ['In what year did the decisive Battle of Hattin take place?', '1187', '1174', '1260', '1099'],
    ['In what year was the Kingdom of Saudi Arabia unified under its current name?', '1932', '1902', '1926', '1938'],
    ['Which treaty formally ended World War I in 1919?', 'Treaty of Versailles', 'Treaty of Westphalia', 'Treaty of Lausanne', 'Treaty of Utrecht'],
    ['Which ancient Mesopotamian civilization invented cuneiform writing?', 'Sumerians', 'Phoenicians', 'Assyrians', 'Hittites'],
    ['In what year did Constantinople fall to Sultan Mehmed II?', '1453', '1492', '1389', '1520'],
  ]),
  geography: buildHardQuestions('geography', 'hard_en', [
    ['What is the deepest known point in Earth’s oceans inside the Mariana Trench?', 'Challenger Deep', 'Puerto Rico Trench', 'Tonga Trench', 'Java Trench'],
    ['Which strait separates Asia from North America?', 'Bering Strait', 'Strait of Magellan', 'Strait of Malacca', 'Strait of Gibraltar'],
    ['Which is the deepest freshwater lake in the world, located in Siberia?', 'Lake Baikal', 'Lake Tanganyika', 'Lake Superior', 'Lake Victoria'],
    ['Which country spans the most time zones when including overseas territories (12)?', 'France', 'Russia', 'United States', 'Canada'],
    ['What is the tallest uninterrupted waterfall in the world (979 m) in Venezuela?', 'Angel Falls', 'Niagara Falls', 'Victoria Falls', 'Iguazu Falls'],
    ['What is the driest non-polar desert on Earth?', 'Atacama Desert', 'Sahara Desert', 'Gobi Desert', 'Kalahari Desert'],
  ]),
  countries: buildHardQuestions('countries', 'hard_en', [
    ['Which is the only country in the world with a non-quadrilateral national flag?', 'Nepal', 'Bhutan', 'Switzerland', 'Vatican City'],
    ['Which Central Asian country is one of only two doubly landlocked nations on Earth?', 'Uzbekistan', 'Kazakhstan', 'Tajikistan', 'Mongolia'],
    ['What is the administrative capital of Myanmar?', 'Naypyidaw', 'Yangon', 'Mandalay', 'Phnom Penh'],
    ['What is the capital city of Bhutan in the Himalayas?', 'Thimphu', 'Kathmandu', 'Dhaka', 'Ulaanbaatar'],
    ['Which two sovereign states have square-shaped national flags?', 'Switzerland & Vatican City', 'Nepal & Bhutan', 'Monaco & San Marino', 'Andorra & Malta'],
    ['What is the capital city of Suriname in South America?', 'Paramaribo', 'Georgetown', 'Cayenne', 'Asuncion'],
  ]),
  math: buildHardQuestions('math', 'hard_en', [
    ['What is the sum of all positive integers from 1 to 100?', '5050', '5000', '4950', '5500'],
    ['What is the derivative of f(x) = 3x³ + 2x with respect to x?', '9x² + 2', '6x² + 2', '9x³ + 2', '3x² + 2'],
    ['What is the sum of interior angles of a regular hexagon?', '720 degrees', '540 degrees', '900 degrees', '1080 degrees'],
    ['If 2ˣ = 128, what is the value of x?', '7', '6', '8', '5'],
    ['What is the value of 6! (6 factorial)?', '720', '360', '600', '540'],
    ['How many prime numbers exist between 1 and 20?', '8 primes', '7 primes', '9 primes', '6 primes'],
  ]),
  physics: buildHardQuestions('physics', 'hard_en', [
    ['What is the SI unit of magnetic flux density (magnetic field strength)?', 'Tesla (T)', 'Henry (H)', 'Weber (Wb)', 'Farad (F)'],
    ['What is the equivalent resistance of a 6 Ω and a 3 Ω resistor connected in parallel?', '2 Ω', '9 Ω', '4.5 Ω', '1.5 Ω'],
    ['What is Earth’s approximate escape velocity from the surface?', '11.2 km/s', '7.9 km/s', '9.8 km/s', '25 km/s'],
    ['What constant relates a photon’s energy to its frequency in E = h·f?', 'Planck’s constant', 'Boltzmann constant', 'Gravitational constant', 'Coulomb constant'],
    ['What is absolute zero (0 Kelvin) in degrees Celsius?', '-273.15 °C', '-100 °C', '-373.15 °C', '-459.67 °C'],
    ['Which SI unit measures electrical inductance?', 'Henry (H)', 'Farad (F)', 'Ohm (Ω)', 'Siemens (S)'],
  ]),
};
