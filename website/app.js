/* Vexora Studio — Official Software Company Web Application */
(function () {
  const I18N = window.VEXORA_I18N;
  const Backend = window.VexoraBackend;

  const ASSET_BASE = window.location.pathname.includes("/website/")
    ? "../app/src/main/res/drawable/"
    : "app/src/main/res/drawable/";

  const APK_URL = window.location.pathname.includes("/website/")
    ? "vexora-studio.apk"
    : "website/vexora-studio.apk";

  const WEBSITE_LOGO = window.location.pathname.includes("/website/")
    ? "vexora-logo.png"
    : "website/vexora-logo.png";

  const STUDIO_IMAGES = {
    logoBanner: WEBSITE_LOGO,
    appIcon: `${ASSET_BASE}app_icon_vexora.jpg`,
    omarAvatar: `${ASSET_BASE}img_omar_developer.jpg`,
    f_cutus: `${ASSET_BASE}img_project_fcutus.webp`,
    noorix: `${ASSET_BASE}img_project_noorix.jpg`,
    web: `${ASSET_BASE}img_project_web.jpg`,
    mobile: `${ASSET_BASE}img_project_mobile.jpg`,
    studio: `${ASSET_BASE}img_studio_team.jpg`
  };

  const PROJECT_CATEGORIES = [
    "Websites",
    "Android Applications",
    "AI Projects",
    "Software Systems",
    "Other Software Projects"
  ];

  const PROJECT_STATUSES = ["Completed", "In Progress", "Coming Soon"];

  const SERVICE_CATEGORIES = [
    { key: "web", en: "Web & Frontend", ar: "الويب والواجهات" },
    { key: "mobile", en: "Android", ar: "تطبيقات Android" },
    { key: "backend", en: "Backend, DB & API", ar: "الأنظمة الخلفية وAPIs" },
    { key: "ai", en: "Artificial Intelligence", ar: "الذكاء الاصطناعي" },
    { key: "engineering", en: "Software & UI/UX", ar: "الهندسة وتجربة المستخدم" }
  ];

  const ADMIN_SESSION_KEY = "vexora_admin_unlocked_v5";
  const ADMIN_CODE_POINTS = [86, 120, 64, 57, 35, 81, 109, 55, 50, 33, 76, 112, 36, 52, 90, 107];
  const STORAGE_KEY = "vexora_studio_state_v5";
  const LEGACY_KEYS = ["vexora_studio_state_v4", "vexora_studio_state_v3"];

  function createDefaultState() {
    return {
      settings: {
        companyName: "Vexora Studio",
        taglineEn: "Building The Future Through Code.",
        taglineAr: "نبني المستقبل عبر البرمجة.",
        homeDescEn:
          "Vexora Studio is a software development company specializing in modern websites, mobile applications, software engineering, and AI-powered solutions.",
        homeDescAr:
          "شركة Vexora Studio متخصصة في برمجة وتطوير المواقع الحديثة، تطبيقات Android، هندسة البرمجيات، وحلول الذكاء الاصطناعي والأنظمة المخصصة.",
        officialEmail: "vexora0studio@gmail.com",
        githubUrl: "https://github.com/Vexora0studio",
        linkedinUrl: "",
        youtubeUrl: "",
        websiteUrl: "https://vexora0studio.github.io/Vexora_Website_Offical/"
      },
      services: [
        {
          id: "srv_web",
          titleEn: "Web Development",
          titleAr: "تطوير المواقع (Web Development)",
          descriptionEn: "End-to-end development of fast, responsive, SEO-ready websites and modern web applications.",
          descriptionAr: "تطوير مواقع ومنصات ويب حديثة، سريعة الاستجابة، ومهيأة لمحركات البحث والأجهزة المختلفة.",
          detailsEn: "Full lifecycle web builds with clean structure, responsive mobile-first layouts, SEO foundations, and static or cloud deployment.",
          detailsAr: "بناء مواقع متكاملة بهيكلة نظيفة، تصميم متجاوب للهواتف أولاً، تهيئة SEO، ونشر سحابي مستقر.",
          technologies: ["HTML5", "CSS3", "JavaScript", "TypeScript", "React", "Next.js"],
          iconKey: "web",
          category: "web",
          sortOrder: 1,
          published: true
        },
        {
          id: "srv_android",
          titleEn: "Android App Development",
          titleAr: "تطوير تطبيقات Android",
          descriptionEn: "Native Android applications built with Kotlin and Jetpack Compose for speed, stability, and modern UX.",
          descriptionAr: "تطوير تطبيقات Android أصلية بلغة Kotlin وJetpack Compose بأداء مستقر وتجربة مستخدم حديثة.",
          detailsEn: "Native Android apps supporting RTL/LTR localization, offline resilience, cloud sync, and Material Design 3 standards.",
          detailsAr: "بناء تطبيقات أندرويد تدعم العربية والإنجليزية، المزامنة السحابية، وأحدث معايير Material Design 3.",
          technologies: ["Kotlin", "Jetpack Compose", "Material 3", "Android SDK", "Firebase", "Room"],
          iconKey: "android",
          category: "mobile",
          sortOrder: 2,
          published: true
        },
        {
          id: "srv_software",
          titleEn: "Software Engineering",
          titleAr: "هندسة البرمجيات (Software Engineering)",
          descriptionEn: "Structured software architecture and reliable engineering systems designed for long-term scalability.",
          descriptionAr: "تصميم وبناء الأنظمة البرمجية وفق مبادئ هندسة البرمجيات النظيفة وقابلية التوسع.",
          detailsEn: "Modular architectures, maintainable codebases, automated validation, and clean separation of concerns.",
          detailsAr: "بناء معمارية برمجية منظمة تسهل الصيانة والاختبار وتوسيع الميزات مستقبلاً.",
          technologies: ["Clean Architecture", "Python", "C++", "Java", "Kotlin", "Git"],
          iconKey: "code",
          category: "engineering",
          sortOrder: 3,
          published: true
        },
        {
          id: "srv_ai_eng",
          titleEn: "Artificial Intelligence",
          titleAr: "الذكاء الاصطناعي (Artificial Intelligence)",
          descriptionEn: "Intelligent software assistants, smart workflows, and practical AI systems grounded in verified data.",
          descriptionAr: "تطوير حلول ذكاء اصطناعي عملية ومساعدات ذكية مبنية على بيانات النظام الفعلية.",
          detailsEn: "Prompt engineering, structured outputs, bilingual Arabic/English AI assistants, and grounded knowledge systems.",
          detailsAr: "تطوير مساعدات ذكية ثنائية اللغة ومعالجة ذكية للاستفسارات بالاعتماد على بيانات الشركة الحقيقية.",
          technologies: ["Gemini API", "Python", "Edge Functions", "Prompt Engineering"],
          iconKey: "ai",
          category: "ai",
          sortOrder: 4,
          published: true
        },
        {
          id: "srv_ai_integration",
          titleEn: "AI Integration",
          titleAr: "دمج الذكاء الاصطناعي (AI Integration)",
          descriptionEn: "Secure server-side integration of Gemini and modern AI models into existing websites and apps.",
          descriptionAr: "ربط المواقع والتطبيقات القائمة بنماذج الذكاء الاصطناعي عبر خادم خلفي آمن دون كشف مفاتيح API.",
          detailsEn: "API proxy functions, secret management, rate protection, and reliable fallback handling.",
          detailsAr: "إعداد وظائف خادم آمنة لإدارة مفاتيح API، التحقق من المدخلات، ودمج الذكاء الاصطناعي في تجربة المستخدم.",
          technologies: ["Gemini API", "Supabase Edge Functions", "REST APIs", "JSON"],
          iconKey: "ai_link",
          category: "ai",
          sortOrder: 5,
          published: true
        },
        {
          id: "srv_frontend",
          titleEn: "Frontend Development",
          titleAr: "تطوير الواجهات الأمامية (Frontend Development)",
          descriptionEn: "Interactive, accessible, high-speed client interfaces crafted with modern web standards.",
          descriptionAr: "برمجة واجهات أمامية تفاعلية وسريعة ومتوافقة مع جميع قياسات الشاشات والمتصفحات.",
          detailsEn: "Component-driven interfaces, RTL/LTR layout mastery, smooth micro-interactions, and high Lighthouse performance.",
          detailsAr: "بناء واجهات دقيقة تدعم RTL وLTR مع انتقالات سلسة وأداء سريع على الهواتف.",
          technologies: ["HTML5", "CSS3", "JavaScript", "TypeScript", "React", "Responsive CSS"],
          iconKey: "frontend",
          category: "web",
          sortOrder: 6,
          published: true
        },
        {
          id: "srv_backend",
          titleEn: "Backend Development",
          titleAr: "تطوير الأنظمة الخلفية (Backend Development)",
          descriptionEn: "Secure server logic, authentication flows, access control, and scalable cloud architectures.",
          descriptionAr: "برمجة الأنظمة الخلفية وإدارة المصادقة والصلاحيات ومنطق الأعمال الآمن.",
          detailsEn: "Authentication systems, role-based access control, server endpoints, and encrypted credential handling.",
          detailsAr: "بناء نظم المصادقة، صلاحيات المديرين، ومعالجة البيانات على الخوادم بأمان عالٍ.",
          technologies: ["Supabase", "Node.js", "Python", "Edge Functions", "Auth", "Security"],
          iconKey: "backend",
          category: "backend",
          sortOrder: 7,
          published: true
        },
        {
          id: "srv_database",
          titleEn: "Database Development",
          titleAr: "تطوير قواعد البيانات (Database Development)",
          descriptionEn: "Structured relational and cloud database modeling protected by strict Row Level Security.",
          descriptionAr: "تصميم وهيكلة قواعد البيانات السحابية والعلائقية مع قواعد حماية البيانات (RLS).",
          detailsEn: "Normalized PostgreSQL schemas, Firestore collections, indexing, and zero-trust access policies.",
          detailsAr: "تصميم جداول PostgreSQL وFirestore، تحسين الاستعلامات، وتطبيق سياسات Row Level Security.",
          technologies: ["PostgreSQL", "Supabase", "Firebase Firestore", "SQL", "RLS"],
          iconKey: "database",
          category: "backend",
          sortOrder: 8,
          published: true
        },
        {
          id: "srv_api",
          titleEn: "API Development",
          titleAr: "تطوير واجهات البرمجة (API Development)",
          descriptionEn: "Clean RESTful APIs connecting web apps, Android clients, databases, and external services.",
          descriptionAr: "تصميم وبرمجة واجهات برمجة تطبيقات (REST APIs) آمنة وموثقة لربط الأنظمة.",
          detailsEn: "Input validation, predictable JSON schemas, CORS protection, and cross-platform API integration.",
          detailsAr: "بناء نقاط اتصال موثوقة بين المواقع وتطبيقات Android وقواعد البيانات والخدمات الخارجية.",
          technologies: ["REST APIs", "JSON", "HTTP/HTTPS", "Deno", "Node.js"],
          iconKey: "api",
          category: "backend",
          sortOrder: 9,
          published: true
        },
        {
          id: "srv_custom",
          titleEn: "Custom Software Solutions",
          titleAr: "حلول برمجية مخصصة (Custom Software Solutions)",
          descriptionEn: "Tailored software systems, dashboards, and automation tools built around your workflow.",
          descriptionAr: "تطوير أنظمة برمجية مخصصة ولوحات تحكم وأدوات أتمتة مصممة وفق احتياج مشروعك.",
          detailsEn: "Custom admin panels, client portals, workflow automation, and specialized software utilities.",
          detailsAr: "بناء منصات إدارة مخصصة وأنظمة أعمال متكاملة من التحليل وحتى التشغيل.",
          technologies: ["JavaScript", "Python", "Kotlin", "C++", "Supabase"],
          iconKey: "custom",
          category: "engineering",
          sortOrder: 10,
          published: true
        },
        {
          id: "srv_uiux_dev",
          titleEn: "UI/UX Development",
          titleAr: "تطوير واجهات وتجربة المستخدم (UI/UX Development)",
          descriptionEn: "Translating clean dark-glass product interfaces into functional, accessible frontend and mobile code.",
          descriptionAr: "تحويل تصاميم واجهات وتجربة المستخدم إلى كود فعلي سلس، متجاوب، وسهل الاستخدام.",
          detailsEn: "Mobile-first ergonomics, clear visual hierarchy, dark mode precision, and touch-friendly interactive components.",
          detailsAr: "تطوير واجهات مريحة للاستخدام على الهواتف والحواسيب مع تباين واضح وتفاعل سريع.",
          technologies: ["CSS3", "Jetpack Compose", "Material 3", "Accessibility", "Mobile First"],
          iconKey: "uiux",
          category: "engineering",
          sortOrder: 11,
          published: true
        }
      ],
      projects: [
        {
          id: "proj_f_cutus",
          nameEn: "F.cutus",
          nameAr: "F.cutus",
          descriptionEn:
            "A modern, responsive web platform developed by Vexora Studio with a dark interactive interface and smooth user experience.",
          descriptionAr:
            "موقع ويب حديث ومتجاوب تم تطويره من قِبل Vexora Studio بواجهة عصرية وتجربة استخدام سلسة.",
          category: "Websites",
          status: "Completed",
          technologies: ["HTML5", "CSS3", "JavaScript"],
          websiteUrl: "https://vexora-1studio.github.io/F.cuts/",
          imageUrl: "",
          presetImageKey: "f_cutus",
          featured: true,
          published: true
        },
        {
          id: "proj_noorix",
          nameEn: "Noorix",
          nameAr: "Noorix",
          descriptionEn:
            "A web platform currently in progress by Vexora Studio featuring a modern digital identity and structured user experience.",
          descriptionAr:
            "مشروع موقع ويب قيد التطوير حالياً من قِبل Vexora Studio بتجربة رقمية حديثة وهوية تقنية متطورة.",
          category: "Websites",
          status: "In Progress",
          technologies: ["Web Development", "UI/UX Development"],
          websiteUrl: "",
          imageUrl: "",
          presetImageKey: "noorix",
          featured: true,
          published: true
        }
      ],
      team: [
        {
          id: "tm_omar_ceo",
          nameEn: "Omar Moataz",
          nameAr: "عمر معتز (Omar Moataz)",
          specializationEn: "Full-Stack Web, Android & AI Software Engineering",
          specializationAr: "هندسة البرمجيات وتطوير الويب وAndroid والذكاء الاصطناعي",
          roleEn: "Founder & CEO",
          roleAr: "المؤسس والمدير التنفيذي (Founder & CEO)",
          bioEn:
            "Founder and director of Vexora Studio. Focuses on web platforms, Android application development, custom software engineering, and AI-powered systems.",
          bioAr:
            "مؤسس ومدير شركة Vexora Studio. يقود تطوير المواقع، تطبيقات Android، هندسة البرمجيات، ودمج حلول الذكاء الاصطناعي.",
          skills: ["Python", "C++", "Java", "Kotlin", "JavaScript", "HTML5 & CSS3", "AI Integration"],
          experienceYears: null,
          avatarUrl: "drawable:omar_develepor",
          githubUrl: "https://github.com/Vexora0studio",
          linkedinUrl: "",
          published: true,
          sortOrder: 1
        }
      ],
      knowledgeBase: [
        {
          id: "kb_identity",
          topic: "company",
          titleEn: "Vexora Studio Core Identity & Focus",
          titleAr: "هوية شركة Vexora Studio وتخصصها",
          contentEn:
            "Vexora Studio is a Software Development & Technology Company ('Building The Future Through Code.'). It focuses strictly on websites, native Android apps, software engineering, databases, APIs, UI/UX development, and AI integration — never video editing, graphic design, or marketing.",
          contentAr:
            "شركة Vexora Studio هي شركة تطوير برمجيات وتكنولوجيا تحت شعار Building The Future Through Code، وتتخصص حصرياً في تطوير المواقع، تطبيقات Android، هندسة البرمجيات، قواعد البيانات، APIs، والذكاء الاصطناعي.",
          keywords: ["identity", "company", "vexora", "about", "هوية", "تخصص", "شركة"],
          sortOrder: 1,
          published: true
        },
        {
          id: "kb_founder",
          topic: "team",
          titleEn: "Founder & Engineering Leadership",
          titleAr: "المؤسس والقيادة الهندسية",
          contentEn:
            "Vexora Studio was founded and is directed by Omar Moataz (omar_develepor), specializing in Python, C++, Java, Kotlin, JavaScript, web architecture, Android development, and AI integration.",
          contentAr:
            "أسس شركة Vexora Studio ويديرها عمر معتز (Omar Moataz)، ويقود هندسة الويب وتطبيقات Android والأنظمة المخصصة وتكاملات الذكاء الاصطناعي بلغات Python وC++ وJava وKotlin وJavaScript.",
          keywords: ["omar", "moataz", "founder", "ceo", "عمر", "مؤسس", "مدير"],
          sortOrder: 2,
          published: true
        },
        {
          id: "kb_security",
          topic: "security",
          titleEn: "Data Security, RLS & Backend AI Keys",
          titleAr: "أمان البيانات وقواعد RLS وحماية مفاتيح AI",
          contentEn:
            "Vexora Studio protects all database tables with PostgreSQL Row Level Security (RLS), stores Gemini API keys strictly on backend servers (Supabase Edge Functions or secure backend proxies), validates contact inputs, and restricts admin CRUD to authenticated admin_users.",
          contentAr:
            "تلتزم Vexora Studio بحماية البيانات عبر قواعد Row Level Security في PostgreSQL، وتشغيل مفاتيح Gemini API من الخادم فقط عبر Edge Functions أو بوابة خلفية آمنة دون كشفها في المتصفح، مع قصر صلاحيات الإدارة على الحسابات المصرح لها.",
          keywords: ["security", "rls", "api", "key", "gemini", "privacy", "أمان", "حماية", "مفتاح"],
          sortOrder: 3,
          published: true
        },
        {
          id: "kb_projects_real",
          topic: "projects",
          titleEn: "Published Projects Policy & Portfolio",
          titleAr: "سياسة المشاريع الحقيقية ومعرض الأعمال",
          contentEn:
            "Vexora Studio publishes only verified real projects: F.cutus (Completed modern responsive website at https://vexora-1studio.github.io/F.cuts/) and Noorix (In Progress web platform), plus any live projects added by the admin.",
          contentAr:
            "تعرض Vexora Studio المشاريع الحقيقية فقط: مشروع F.cutus (موقع مكتمل متجاوب على https://vexora-1studio.github.io/F.cuts/) ومشروع Noorix (موقع ويب قيد التطوير)، إلى جانب ما يضيفه المدير في لوحة التحكم.",
          keywords: ["projects", "f.cutus", "noorix", "portfolio", "مشاريع", "معرض"],
          sortOrder: 4,
          published: true
        },
        {
          id: "kb_android_apk",
          topic: "mobile",
          titleEn: "Official Android Companion App (APK)",
          titleAr: "تطبيق Vexora Studio الرسمي على Android",
          contentEn:
            "Visitors can download the official Vexora Studio Android APK (v1.0, Android 7.0+, package com.aistudio.vexorastudio.k7m9p2) directly from the Android App page (#download) or top navigation bar.",
          contentAr:
            "يمكن تحميل تطبيق Vexora Studio الرسمي بصيغة APK (الإصدار v1.0 متوافق مع Android 7.0+ ومعرّف الحزمة com.aistudio.vexorastudio.k7m9p2) مباشرة من صفحة تطبيق Android (#download) أو زر APK في الشريط العلوي.",
          keywords: ["android", "apk", "download", "app", "mobile", "تحميل", "تطبيق", "أندرويد"],
          sortOrder: 5,
          published: true
        },
        {
          id: "kb_request_workflow",
          topic: "workflow",
          titleEn: "How to Request a Software Project",
          titleAr: "خطوات طلب مشروع برمجي من Vexora Studio",
          contentEn:
            "To request a website, Android app, API, or AI integration: select the service from #services (using Request This Service) or fill out the #contact form, or email vexora0studio@gmail.com with your project scope. Pricing is evaluated per technical requirements rather than fixed generic tiers.",
          contentAr:
            "لطلب موقع ويب أو تطبيق Android أو نظام برمجي أو دمج ذكاء اصطناعي: اختر الخدمة من صفحة #services واضغط اطلب هذه الخدمة، أو أرسل تفاصيل مشروعك عبر نموذج #contact أو البريد الرسمي vexora0studio@gmail.com، ويتم تقييم النطاق حسب المتطلبات الفعلية.",
          keywords: ["request", "contact", "price", "cost", "workflow", "طلب", "تواصل", "سعر", "تكلفة"],
          sortOrder: 6,
          published: true
        }
      ],
      faqs: [
        {
          id: "faq_services",
          category: "services",
          questionEn: "What software services does Vexora Studio specialize in?",
          questionAr: "ما هي الخدمات البرمجية التي تقدمها Vexora Studio؟",
          answerEn:
            "We provide 11 focused software services: Web Development, Android App Development, Software Engineering, Artificial Intelligence, AI Integration, Frontend, Backend, Database Development, API Development, Custom Software Solutions, and UI/UX Development.",
          answerAr:
            "نقدم 11 خدمة برمجية متخصصة: تطوير المواقع، تطبيقات Android، هندسة البرمجيات، الذكاء الاصطناعي، دمج الذكاء الاصطناعي، تطوير الواجهات الأمامية، الأنظمة الخلفية، قواعد البيانات، تطوير APIs، الحلول البرمجية المخصصة، وتطوير UI/UX.",
          sortOrder: 1,
          published: true
        },
        {
          id: "faq_platforms",
          category: "technologies",
          questionEn: "Which technologies do you use for websites and Android apps?",
          questionAr: "ما التقنيات التي تستخدمونها في المواقع وتطبيقات Android؟",
          answerEn:
            "For web we build with HTML5, CSS3, JavaScript, TypeScript, React, and Next.js. For native Android we use Kotlin, Jetpack Compose, Material 3, and Room alongside Supabase/PostgreSQL, Firebase Firestore, Python, C++, Java, and Gemini API.",
          answerAr:
            "في الويب نعتمد على HTML5 وCSS3 وJavaScript وTypeScript وReact وNext.js. وفي تطبيقات Android الأصلية نستخدم Kotlin وJetpack Compose وMaterial 3 وRoom، مع قواعد بيانات PostgreSQL/Supabase وFirestore وPython وC++ وJava وGemini API.",
          sortOrder: 2,
          published: true
        },
        {
          id: "faq_ai_security",
          category: "security",
          questionEn: "How does Vexora Studio secure user data and Gemini API keys?",
          questionAr: "كيف تحمي Vexora Studio بيانات العملاء ومفاتيح Gemini API؟",
          answerEn:
            "Database access uses PostgreSQL Row Level Security (RLS) so visitors cannot read other inquiries, while Gemini API keys stay strictly server-side inside Supabase Edge Functions or a protected backend proxy—never exposed in client HTML/JS.",
          answerAr:
            "نطبق قواعد Row Level Security (RLS) على قاعدة البيانات لمنع وصول أي زائر لرسائل غيره، وتُحفظ مفاتيح Gemini API على الخادم فقط داخل Edge Functions أو بوابة خلفية آمنة دون تضمينها في كود الواجهة.",
          sortOrder: 3,
          published: true
        },
        {
          id: "faq_request",
          category: "workflow",
          questionEn: "How can I request a project or contact the team?",
          questionAr: "كيف أطلب بناء موقع أو تطبيق أو أتواصل مع الفريق؟",
          answerEn:
            "Open the Services page (#services) and tap 'Request This Service', submit your details in Contact Us (#contact), or email vexora0studio@gmail.com directly.",
          answerAr:
            "يمكنك اختيار الخدمة من صفحة خدماتنا والضغط على 'اطلب هذه الخدمة'، أو إرسال تفاصيل مشروعك عبر صفحة تواصل معنا، أو مراسلتنا مباشرة على vexora0studio@gmail.com.",
          sortOrder: 4,
          published: true
        },
        {
          id: "faq_apk",
          category: "mobile",
          questionEn: "Is there an official Android app for Vexora Studio?",
          questionAr: "هل يتوفر تطبيق Android رسمي لشركة Vexora Studio؟",
          answerEn:
            "Yes. Visit the Android App section (#download) or tap the APK button in the top bar to download the official Vexora-Studio.apk package for Android 7.0 and higher.",
          answerAr:
            "نعم، يمكنك تنزيل تطبيق Vexora Studio الرسمي بصيغة APK مباشرة من قسم تطبيق Android (#download) أو عبر زر APK في الشريط العلوي للهواتف العاملة بنظام Android 7.0 فأحدث.",
          sortOrder: 5,
          published: true
        }
      ],
      messages: []
    };
  }

  function loadState() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        const def = createDefaultState();
        return {
          ...def,
          ...parsed,
          settings: { ...def.settings, ...(parsed.settings || {}) },
          knowledgeBase: Array.isArray(parsed.knowledgeBase) && parsed.knowledgeBase.length > 0 ? parsed.knowledgeBase : def.knowledgeBase,
          faqs: Array.isArray(parsed.faqs) && parsed.faqs.length > 0 ? parsed.faqs : def.faqs
        };
      }
      // Preserve any visitor messages from previous version while upgrading services/projects/team schema cleanly
      const rawOld = LEGACY_KEYS.map((k) => localStorage.getItem(k)).find(Boolean);
      const def = createDefaultState();
      if (rawOld) {
        const oldParsed = JSON.parse(rawOld);
        if (Array.isArray(oldParsed?.messages)) {
          def.messages = oldParsed.messages;
        }
      }
      localStorage.setItem(STORAGE_KEY, JSON.stringify(def));
      return def;
    } catch {
      return createDefaultState();
    }
  }

  let studioState = loadState();
  let currentLang = localStorage.getItem("vexora_lang") === "en" ? "en" : "ar";
  let currentRoute = normalizeRoute(window.location.hash.replace("#", "")) || "home";
  let serviceCategory = "all";
  let projectCategoryFilter = "all";
  let projectStatusFilter = "all";
  let projectSearchQuery = "";
  let techCategoryFilter = "all";
  let contactPreselectedService = "";
  let adminSection = "dashboard";
  let adminMsgSearch = "";
  let adminMsgStatusFilter = "all";
  let dbSyncStatus = { tested: false, ok: false, latencyMs: null, message: "" };
  let aiSyncStatus = { tested: false, ok: false, latencyMs: null, mode: "", message: "" };
  let aiChatHistory = [];
  let aiBusy = false;

  function saveState() {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(studioState));
    } catch {
      // Ignore storage quota errors
    }
  }

  function normalizeRoute(r) {
    const clean = String(r || "").toLowerCase().trim();
    const valid = [
      "home",
      "about",
      "services",
      "projects",
      "technologies",
      "team",
      "ai",
      "download",
      "contact",
      "admin",
      "privacy",
      "terms"
    ];
    return valid.includes(clean) ? clean : null;
  }

  function t(key) {
    return (I18N[currentLang] && I18N[currentLang][key]) || key;
  }

  function isArabic() {
    return currentLang === "ar";
  }

  function escapeHtml(str) {
    return String(str ?? "")
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;");
  }

  function safeHttpUrl(url) {
    const val = String(url || "").trim();
    if (!val) return "";
    if (/^https?:\/\//i.test(val)) return val;
    return "";
  }

  function showToast(msg) {
    const toast = document.getElementById("toast");
    toast.textContent = msg;
    toast.hidden = false;
    clearTimeout(showToast._timer);
    showToast._timer = setTimeout(() => {
      toast.hidden = true;
    }, 3200);
  }

  function isAdminAuthorized() {
    if (Backend.isConfigured()) {
      return Boolean(Backend.getStoredAuth()?.access_token);
    }
    return sessionStorage.getItem(ADMIN_SESSION_KEY) === "1";
  }

  function verifyLocalAdminCode(input) {
    const value = String(input || "");
    if (value.length !== ADMIN_CODE_POINTS.length) return false;
    let diff = 0;
    for (let i = 0; i < ADMIN_CODE_POINTS.length; i++) {
      diff |= value.charCodeAt(i) ^ ADMIN_CODE_POINTS[i];
    }
    return diff === 0;
  }

  function serviceIconGlyph(key) {
    switch ((key || "").toLowerCase()) {
      case "web": return "🌐";
      case "android":
      case "mobile": return "📱";
      case "code": return "⚙️";
      case "ai": return "🧠";
      case "ai_link": return "🔗";
      case "frontend": return "🖥️";
      case "backend": return "🛡️";
      case "database": return "🗄️";
      case "api": return "🔌";
      case "custom": return "🧩";
      case "uiux": return "✨";
      default: return "⚡";
    }
  }

  function projectImageSrc(proj) {
    if (proj.imageUrl) return proj.imageUrl;
    return STUDIO_IMAGES[proj.presetImageKey] || STUDIO_IMAGES.web;
  }

  function normalizeProjectStatus(raw) {
    const s = String(raw || "").toLowerCase();
    if (s === "completed" || s === "available") return "Completed";
    if (s === "coming soon" || s === "coming_soon") return "Coming Soon";
    return "In Progress";
  }

  function statusMeta(raw) {
    const normalized = normalizeProjectStatus(raw);
    if (normalized === "Completed") return { label: t("statusCompleted"), cls: "success", key: "Completed" };
    if (normalized === "Coming Soon") return { label: t("statusComingSoon"), cls: "cyan", key: "Coming Soon" };
    return { label: t("statusInProgress"), cls: "warning", key: "In Progress" };
  }

  function projectCategoryLabel(cat) {
    if (!isArabic()) return cat;
    switch (cat) {
      case "Websites": return "مواقع ويب (Websites)";
      case "Android Applications": return "تطبيقات Android";
      case "AI Projects": return "مشاريع ذكاء اصطناعي";
      case "Software Systems": return "أنظمة برمجية";
      default: return "مشاريع برمجية أخرى";
    }
  }

  function navigate(route) {
    currentRoute = normalizeRoute(route) || "home";
    window.location.hash = currentRoute;
    closeDrawer();
    renderAll();
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function openDrawer() {
    document.getElementById("drawerBackdrop").hidden = false;
    document.getElementById("drawerSheet").hidden = false;
  }

  function closeDrawer() {
    document.getElementById("drawerBackdrop").hidden = true;
    document.getElementById("drawerSheet").hidden = true;
  }

  function updateDocumentSeo() {
    const titles = I18N[currentLang]?.seoTitles || {};
    const title = titles[currentRoute] || titles.home || "Vexora Studio";
    document.title = title;
    const ogTitle = document.querySelector('meta[property="og:title"]');
    if (ogTitle) ogTitle.setAttribute("content", title);
  }

  /* =========================================================
     Chrome / Navigation
     ========================================================= */
  function renderChrome() {
    document.documentElement.lang = currentLang;
    document.documentElement.dir = isArabic() ? "rtl" : "ltr";
    document.getElementById("langToggleLabel").textContent = t("langToggleLabel");
    updateDocumentSeo();

    const settings = studioState.settings;
    const tagline = isArabic() ? settings.taglineAr : settings.taglineEn;

    const navItems = [
      { key: "home", label: t("navHome"), icon: "🏠" },
      { key: "about", label: t("navAbout"), icon: "🏢" },
      { key: "services", label: t("navServices"), icon: "🛠️" },
      { key: "projects", label: t("navProjects"), icon: "🚀" },
      { key: "technologies", label: t("navTechnologies"), icon: "💻" },
      { key: "team", label: t("navTeam"), icon: "👥" },
      { key: "ai", label: t("navAi"), icon: "🤖" },
      { key: "download", label: t("navDownload"), icon: "📲" },
      { key: "contact", label: t("navContact"), icon: "✉️" },
      { key: "admin", label: t("navAdmin"), icon: "🛡️" }
    ];

    document.getElementById("navRail").innerHTML = navItems
      .map(
        (item) => `
        <button type="button" class="rail-item ${currentRoute === item.key ? "active" : ""}" data-route="${item.key}" ${currentRoute === item.key ? 'aria-current="page"' : ""}>
          <span class="rail-icon">${item.icon}</span>
          <span>${escapeHtml(item.label)}</span>
        </button>
      `
      )
      .join("");

    // Mobile Bottom Bar: 5 core touch-friendly destinations
    const mobileBottomKeys = ["home", "services", "projects", "ai", "contact"];
    document.getElementById("bottomNav").innerHTML = navItems
      .filter((i) => mobileBottomKeys.includes(i.key))
      .map(
        (item) => `
        <button type="button" class="bottom-item ${currentRoute === item.key ? "active" : ""}" data-route="${item.key}" ${currentRoute === item.key ? 'aria-current="page"' : ""}>
          <span style="font-size:1.15rem;line-height:1">${item.icon}</span>
          <span>${escapeHtml(item.label)}</span>
        </button>
      `
      )
      .join("");

    document.getElementById("drawerTagline").textContent = tagline;
    document.getElementById("drawerNavList").innerHTML = navItems
      .map(
        (item) => `
        <button type="button" class="drawer-item ${currentRoute === item.key ? "active" : ""}" data-route="${item.key}" ${currentRoute === item.key ? 'aria-current="page"' : ""}>
          <span>${item.icon}</span>
          <span>${escapeHtml(item.label)}</span>
        </button>
      `
      )
      .join("");

    document.querySelectorAll("[data-route]").forEach((btn) => {
      btn.addEventListener("click", () => navigate(btn.dataset.route));
    });
  }

  /* =========================================================
     1. HOME SCREEN
     ========================================================= */
  function renderHomeScreen(root) {
    const settings = studioState.settings;
    const publishedServices = studioState.services
      .filter((s) => s.published)
      .sort((a, b) => (a.sortOrder || 0) - (b.sortOrder || 0));
    const publishedProjects = studioState.projects.filter((p) => p.published);
    const publishedTeam = studioState.team.filter((m) => m.published);

    const trustBadges = I18N[currentLang].heroTrustBadges || [];
    const whyChoose = I18N[currentLang].whyChooseItems || [];
    const homeIntro = isArabic() ? settings.homeDescAr : settings.homeDescEn;
    const tagline = isArabic() ? settings.taglineAr : settings.taglineEn;

    root.innerHTML = `
      <section class="glass-card no-pad highlight-border" data-tilt-3d="subtle">
        <div class="hero-banner-wrap">
          <img class="hero-banner-img" src="${STUDIO_IMAGES.logoBanner}" alt="Vexora Studio Logo" decoding="async" onerror="this.style.display='none'" />
          <div class="hero-3d-stage" id="hero3dStage" title="Vexora Studio 3D Core">
            <div class="hero-3d-orbit"></div>
            <div class="hero-3d-orbit ring-2"></div>
            <div class="hero-3d-cube">
              <span class="hero-cube-face front">VX</span>
              <span class="hero-cube-face back">&lt;/&gt;</span>
              <span class="hero-cube-face right">KT</span>
              <span class="hero-cube-face left">AI</span>
              <span class="hero-cube-face top">API</span>
              <span class="hero-cube-face bottom">{ }</span>
            </div>
          </div>
          <div class="hero-banner-gradient"></div>
          <div class="hero-banner-overlay">
            <div style="display:flex;align-items:center;gap:10px;flex-wrap:wrap;">
              <span class="brand-name" style="color:var(--neon-cyan)">${escapeHtml(settings.companyName)}</span>
              <span class="muted-text" style="font-size:0.82rem">${escapeHtml(tagline)}</span>
            </div>
            <h1 class="hero-title">${escapeHtml(t("heroTitle"))}</h1>
          </div>
        </div>
        <div class="hero-body">
          <p class="hero-subtitle">${escapeHtml(homeIntro || t("heroSubtitle"))}</p>
          <div class="btn-row">
            <button type="button" class="btn btn-primary" data-go="projects">🚀 ${escapeHtml(t("exploreProjectsCta"))}</button>
            <button type="button" class="btn btn-outline" data-go="services">🛠️ ${escapeHtml(t("ourServicesCta"))}</button>
            <button type="button" class="btn btn-outline" data-go="ai">🤖 ${escapeHtml(t("askAiBtn"))}</button>
          </div>
          <div class="hero-trust-row">
            ${trustBadges.map((b) => `<span class="trust-badge">✓ ${escapeHtml(b)}</span>`).join("")}
          </div>
        </div>
      </section>

      <section class="section-block">
        <div class="section-header-row">
          <h2 class="card-title">${escapeHtml(t("statsTitle"))}</h2>
          <button type="button" class="btn btn-text" data-go="about">${escapeHtml(t("learnMoreAboutUs"))} →</button>
        </div>
        <div class="stats-grid">
          <div class="glass-card" data-tilt-3d="1">
            <div class="stat-value">${publishedProjects.length}</div>
            <div class="stat-label">${escapeHtml(t("statProjects"))}</div>
          </div>
          <div class="glass-card" data-tilt-3d="1">
            <div class="stat-value">${publishedServices.length}</div>
            <div class="stat-label">${escapeHtml(t("statServices"))}</div>
          </div>
          <div class="glass-card" data-tilt-3d="1">
            <div class="stat-value">${publishedTeam.length}</div>
            <div class="stat-label">${escapeHtml(t("statTeam"))}</div>
          </div>
          <div class="glass-card" data-tilt-3d="1">
            <div class="stat-value">10</div>
            <div class="stat-label">${escapeHtml(t("statDomains"))}</div>
          </div>
        </div>
      </section>

      <section class="section-block">
        <div class="section-header-row">
          <h2 class="card-title">${escapeHtml(t("featuredServicesTitle"))}</h2>
          <button type="button" class="btn btn-text" data-go="services">${escapeHtml(t("viewAll"))} →</button>
        </div>
        <div class="horizontal-scroll">
          ${publishedServices
            .slice(0, 6)
            .map(
              (srv) => `
            <div class="glass-card featured-srv-card" data-tilt-3d="1" data-go="services">
              <div class="service-icon-box">${serviceIconGlyph(srv.iconKey)}</div>
              <h3 class="card-title" style="margin-top:12px;">${escapeHtml(isArabic() ? srv.titleAr : srv.titleEn)}</h3>
              <p class="muted-text" style="margin-top:6px;">${escapeHtml(isArabic() ? srv.descriptionAr : srv.descriptionEn)}</p>
            </div>
          `
            )
            .join("")}
        </div>
      </section>

      <section class="section-block">
        <div class="section-header-row">
          <h2 class="card-title">${escapeHtml(t("featuredProjectsTitle"))}</h2>
          <button type="button" class="btn btn-text" data-go="projects">${escapeHtml(t("viewAll"))} →</button>
        </div>
        <div class="two-col-grid">
          ${publishedProjects
            .slice(0, 4)
            .map((proj) => {
              const st = statusMeta(proj.status);
              return `
              <div class="glass-card no-pad" data-tilt-3d="subtle" style="cursor:pointer;" data-go="projects">
                <img class="project-img ${proj.presetImageKey === "f_cutus" || proj.presetImageKey === "noorix" ? "contain" : ""}" src="${escapeHtml(projectImageSrc(proj))}" alt="${escapeHtml(isArabic() ? proj.nameAr : proj.nameEn)}" loading="lazy" decoding="async" onerror="this.style.display='none'" />
                <div class="card-inner">
                  <div class="row-between">
                    <h3 class="card-title">${escapeHtml(isArabic() ? proj.nameAr : proj.nameEn)}</h3>
                    <span class="status-pill ${st.cls}"><span class="pill-dot"></span>${escapeHtml(st.label)}</span>
                  </div>
                  <div style="font-size:0.78rem;color:var(--neon-cyan);font-weight:600;">${escapeHtml(projectCategoryLabel(proj.category))}</div>
                  <p class="muted-text">${escapeHtml(isArabic() ? proj.descriptionAr : proj.descriptionEn)}</p>
                </div>
              </div>
            `;
            })
            .join("")}
        </div>
      </section>

      <section class="section-block">
        <div class="section-header-row">
          <h2 class="card-title">${escapeHtml(t("homeTeamTitle"))}</h2>
          <button type="button" class="btn btn-text" data-go="team">${escapeHtml(t("viewAll"))} →</button>
        </div>
        <div class="stack-list">
          ${publishedTeam
            .slice(0, 2)
            .map((m) => renderTeamCardHtml(m))
            .join("")}
        </div>
      </section>

      <section class="section-block">
        <div class="section-header-row" style="align-items:flex-end;">
          <div>
            <h2 class="card-title">${escapeHtml(t("whyChooseTitle"))}</h2>
            <p class="section-desc">${escapeHtml(t("whyChooseSubtitle"))}</p>
          </div>
          <div class="btn-row" style="flex:0 0 auto;">
            <button type="button" class="btn btn-outline btn-sm" data-go="technologies">💻 ${escapeHtml(t("whyChooseTechCta"))}</button>
            <button type="button" class="btn btn-primary btn-sm" data-go="contact">✉️ ${escapeHtml(t("whyChooseContactCta"))}</button>
          </div>
        </div>
        <div class="guarantees-grid">
          ${whyChoose
            .map(
              (g) => `
            <div class="glass-card guarantee-card" data-tilt-3d="1">
              <div class="guarantee-icon">${g.icon}</div>
              <div>
                <h3 class="card-title">${escapeHtml(g.title)}</h3>
                <p class="muted-text" style="margin-top:4px;">${escapeHtml(g.desc)}</p>
              </div>
            </div>
          `
            )
            .join("")}
        </div>
      </section>

      ${renderFaqSectionHtml()}

      <section class="glass-card highlight-border" data-tilt-3d="1">
        <div class="app-download-hero">
          <img class="app-icon-badge" src="${STUDIO_IMAGES.appIcon}" alt="Vexora Studio Android App" loading="lazy" decoding="async" onerror="this.style.display='none'" />
          <div style="flex:1;min-width:210px;">
            <div style="display:flex;align-items:center;gap:8px;flex-wrap:wrap;">
              <h2 class="card-title">${escapeHtml(t("downloadBannerTitle"))}</h2>
              <span class="status-pill success"><span class="pill-dot"></span>APK v1.0</span>
            </div>
            <p class="muted-text" style="margin-top:6px;">${escapeHtml(t("downloadBannerDesc"))}</p>
            <div class="btn-row" style="margin-top:12px;">
              <a href="${APK_URL}" download="Vexora-Studio.apk" class="btn btn-primary" data-apk-dl="1">⬇️ ${escapeHtml(t("downloadApkBtn"))}</a>
              <button type="button" class="btn btn-outline" data-go="download">📲 ${escapeHtml(t("downloadDetailsBtn"))}</button>
            </div>
          </div>
        </div>
      </section>

      <section class="glass-card highlight-border cta-banner">
        <div style="flex:1;min-width:210px;">
          <h2 class="card-title" style="font-size:1.2rem;color:var(--neon-cyan);">${escapeHtml(t("ctaBannerTitle"))}</h2>
          <p class="muted-text" style="margin-top:6px;">${escapeHtml(t("ctaBannerDesc"))}</p>
        </div>
        <div class="btn-row" style="flex:0 0 auto;">
          <button type="button" class="btn btn-primary" data-go="contact">✉️ ${escapeHtml(t("ctaBannerBtn"))}</button>
          <button type="button" class="btn btn-outline" data-go="ai">🤖 ${escapeHtml(t("askAiBtn"))}</button>
        </div>
      </section>
    `;

    root.querySelectorAll("[data-go]").forEach((el) => {
      el.addEventListener("click", () => navigate(el.dataset.go));
    });
    root.querySelectorAll("[data-apk-dl]").forEach((el) => {
      el.addEventListener("click", () => showToast(t("downloadStartedToast")));
    });
  }

  function renderFaqSectionHtml() {
    const publishedFaqs = (studioState.faqs || [])
      .filter((f) => f.published !== false)
      .sort((a, b) => (a.sortOrder || 0) - (b.sortOrder || 0));
    if (publishedFaqs.length === 0) return "";
    return `
      <section class="section-block" id="faqSection">
        <div class="section-header-row" style="align-items:flex-end;">
          <div>
            <h2 class="card-title">❓ ${escapeHtml(t("faqTitle"))}</h2>
            <p class="section-desc">${escapeHtml(t("faqSubtitle"))}</p>
          </div>
          <button type="button" class="btn btn-text" data-go="ai">🤖 ${escapeHtml(t("faqAskAiCta"))} →</button>
        </div>
        <div class="faq-list">
          ${publishedFaqs
            .map(
              (f, idx) => `
            <details class="faq-item" ${idx === 0 ? "open" : ""}>
              <summary>${escapeHtml(isArabic() ? f.questionAr : f.questionEn)}</summary>
              <p class="faq-answer">${escapeHtml(isArabic() ? f.answerAr : f.answerEn)}</p>
            </details>
          `
            )
            .join("")}
        </div>
      </section>
    `;
  }

  /* =========================================================
     2. ABOUT US SCREEN
     ========================================================= */
  function renderAboutScreen(root) {
    const goals = I18N[currentLang].aboutGoals || [];
    const values = I18N[currentLang].aboutValues || [];
    const domains = I18N[currentLang].aboutDomains || [];

    root.innerHTML = `
      <div>
        <h1 class="screen-title">🏢 ${escapeHtml(t("aboutHeadline"))}</h1>
        <p class="screen-subtitle">${escapeHtml(t("aboutSubheadline"))}</p>
      </div>

      <div class="glass-card highlight-border stack-list" data-tilt-3d="subtle">
        <h2 class="card-title" style="color:var(--neon-cyan);">${escapeHtml(t("aboutOverviewTitle"))}</h2>
        <p style="margin:0;">${escapeHtml(t("aboutOverviewBody"))}</p>
      </div>

      <div class="glass-card stack-list">
        <h2 class="card-title">${escapeHtml(t("aboutStoryTitle"))}</h2>
        <p class="muted-text" style="margin:0;">${escapeHtml(t("aboutStoryBody"))}</p>
      </div>

      <div class="two-col-grid">
        <div class="glass-card stack-list" data-tilt-3d="1">
          <h2 class="card-title" style="color:var(--neon-cyan);">🔭 ${escapeHtml(t("aboutVisionTitle"))}</h2>
          <p class="muted-text" style="margin:0;">${escapeHtml(t("aboutVisionBody"))}</p>
        </div>
        <div class="glass-card stack-list" data-tilt-3d="1">
          <h2 class="card-title" style="color:var(--neon-cyan);">🎯 ${escapeHtml(t("aboutMissionTitle"))}</h2>
          <p class="muted-text" style="margin:0;">${escapeHtml(t("aboutMissionBody"))}</p>
        </div>
      </div>

      <div class="glass-card stack-list">
        <h2 class="card-title">${escapeHtml(t("aboutGoalsTitle"))}</h2>
        <div class="stack-list" style="gap:10px;">
          ${goals
            .map(
              (goal, idx) => `
            <div class="install-step">
              <span class="install-step-num">${idx + 1}</span>
              <p class="muted-text" style="margin:0;">${escapeHtml(goal)}</p>
            </div>
          `
            )
            .join("")}
        </div>
      </div>

      <div class="section-block">
        <h2 class="card-title">${escapeHtml(t("aboutValuesTitle"))}</h2>
        <div class="guarantees-grid">
          ${values
            .map(
              (v) => `
            <div class="glass-card stack-list" data-tilt-3d="1">
              <h3 class="card-title" style="color:var(--neon-cyan);">${escapeHtml(v.title)}</h3>
              <p class="muted-text" style="margin:0;">${escapeHtml(v.desc)}</p>
            </div>
          `
            )
            .join("")}
        </div>
      </div>

      <div class="glass-card stack-list">
        <h2 class="card-title">${escapeHtml(t("aboutDomainsTitle"))}</h2>
        <div class="chips-wrap">
          ${domains.map((d) => `<span class="tech-chip">${escapeHtml(d)}</span>`).join("")}
        </div>
      </div>

      <div class="glass-card highlight-border stack-list" data-tilt-3d="subtle">
        <h2 class="card-title" style="color:var(--neon-cyan);">${escapeHtml(t("aboutFounderTitle"))}</h2>
        <div class="member-row">
          <img class="member-avatar-img" src="${STUDIO_IMAGES.omarAvatar}" alt="Omar Moataz" loading="lazy" decoding="async" onerror="this.style.display='none'" />
          <div>
            <h3 class="card-title">${escapeHtml(t("aboutFounderName"))}</h3>
            <div style="color:var(--neon-cyan);font-size:0.9rem;font-weight:600;">${escapeHtml(t("aboutFounderRole"))}</div>
          </div>
        </div>
        <p class="muted-text" style="margin:0;">${escapeHtml(t("aboutFounderBio"))}</p>
        <div class="btn-row">
          <button type="button" class="btn btn-primary" data-go="services">${escapeHtml(t("ourServicesCta"))}</button>
          <button type="button" class="btn btn-outline" data-go="contact">${escapeHtml(t("contactUsCta"))}</button>
        </div>
      </div>
    `;

    root.querySelectorAll("[data-go]").forEach((el) => {
      el.addEventListener("click", () => navigate(el.dataset.go));
    });
  }

  /* =========================================================
     3. SERVICES SCREEN (Exact 11 Software Services)
     ========================================================= */
  function renderServicesScreen(root) {
    const categories = [
      { key: "all", label: t("allCategories") },
      ...SERVICE_CATEGORIES.map((c) => ({ key: c.key, label: isArabic() ? c.ar : c.en }))
    ];

    const list = studioState.services
      .filter((s) => s.published)
      .sort((a, b) => (a.sortOrder || 0) - (b.sortOrder || 0))
      .filter((s) => serviceCategory === "all" || (s.category || "").toLowerCase() === serviceCategory);

    root.innerHTML = `
      <div>
        <h1 class="screen-title">🛠️ ${escapeHtml(t("servicesHeadline"))}</h1>
        <p class="screen-subtitle">${escapeHtml(t("servicesSubheadline"))}</p>
      </div>

      <div class="chips-scroll">
        ${categories
          .map(
            (c) => `
          <button type="button" class="chip-btn ${serviceCategory === c.key ? "active" : ""}" data-cat="${c.key}">
            ${escapeHtml(c.label)}
          </button>
        `
          )
          .join("")}
      </div>

      <div class="two-col-grid">
        ${
          list.length === 0
            ? `<div class="glass-card"><p class="muted-text">${escapeHtml(t("noServicesYet"))}</p></div>`
            : list
                .map((srv) => {
                  const title = isArabic() ? srv.titleAr : srv.titleEn;
                  const desc = isArabic() ? srv.descriptionAr : srv.descriptionEn;
                  const details = isArabic() ? srv.detailsAr : srv.detailsEn;
                  return `
          <div class="glass-card stack-list" data-tilt-3d="1">
            <div style="display:flex;gap:14px;align-items:flex-start;">
              <div class="service-icon-box" style="flex-shrink:0;">${serviceIconGlyph(srv.iconKey)}</div>
              <div style="flex:1;min-width:0;">
                <h2 class="card-title">${escapeHtml(title)}</h2>
                <p class="muted-text" style="margin-top:6px;">${escapeHtml(desc)}</p>
              </div>
            </div>
            ${
              details
                ? `<div style="font-size:0.86rem;color:var(--text-soft);padding-top:8px;border-top:1px solid var(--subtle-outline);">
                    <strong style="color:var(--neon-cyan);">${escapeHtml(t("serviceDetailsLabel"))}:</strong> ${escapeHtml(details)}
                  </div>`
                : ""
            }
            ${
              srv.technologies?.length
                ? `<div>
                    <div style="font-size:0.78rem;color:var(--text-muted);margin-bottom:6px;">${escapeHtml(t("serviceTechLabel"))}</div>
                    <div class="chips-wrap">${srv.technologies.map((tech) => `<span class="tech-chip">${escapeHtml(tech)}</span>`).join("")}</div>
                  </div>`
                : ""
            }
            <div style="margin-top:auto;padding-top:6px;">
              <button type="button" class="btn btn-outline btn-full btn-sm" data-req-srv="${escapeHtml(title)}">
                ✉️ ${escapeHtml(t("requestServiceBtn"))}
              </button>
            </div>
          </div>
        `;
                })
                .join("")
        }
      </div>
    `;

    root.querySelectorAll("[data-cat]").forEach((btn) => {
      btn.addEventListener("click", () => {
        serviceCategory = btn.dataset.cat;
        renderScreen();
      });
    });

    root.querySelectorAll("[data-req-srv]").forEach((btn) => {
      btn.addEventListener("click", () => {
        contactPreselectedService = btn.dataset.reqSrv || "";
        navigate("contact");
      });
    });
  }

  /* =========================================================
     4. PROJECTS & PORTFOLIO SCREEN
     ========================================================= */
  function renderProjectsGridHtml() {
    const q = projectSearchQuery.trim().toLowerCase();
    const list = studioState.projects
      .filter((p) => p.published)
      .filter((p) => projectCategoryFilter === "all" || p.category === projectCategoryFilter)
      .filter((p) => projectStatusFilter === "all" || normalizeProjectStatus(p.status) === projectStatusFilter)
      .filter((p) => {
        if (!q) return true;
        const haystack = [
          p.nameEn,
          p.nameAr,
          p.descriptionEn,
          p.descriptionAr,
          p.category,
          ...(p.technologies || [])
        ]
          .join(" ")
          .toLowerCase();
        return haystack.includes(q);
      });

    if (list.length === 0) {
      return `<div class="glass-card"><p class="muted-text" style="margin:0;">${escapeHtml(t("noProjectsYet"))}</p></div>`;
    }

    return `<div class="two-col-grid">
      ${list
        .map((proj) => {
          const st = statusMeta(proj.status);
          const link = safeHttpUrl(proj.websiteUrl);
          return `
          <div class="glass-card no-pad ${proj.featured ? "highlight-border" : ""}" data-tilt-3d="subtle">
            <img class="project-img ${proj.presetImageKey === "f_cutus" || proj.presetImageKey === "noorix" ? "contain" : ""}" src="${escapeHtml(projectImageSrc(proj))}" alt="${escapeHtml(isArabic() ? proj.nameAr : proj.nameEn)}" loading="lazy" decoding="async" onerror="this.style.display='none'" />
            <div class="card-inner">
              <div class="row-between">
                <h2 class="card-title" style="font-size:1.18rem;">${escapeHtml(isArabic() ? proj.nameAr : proj.nameEn)}</h2>
                <span class="status-pill ${st.cls}"><span class="pill-dot"></span>${escapeHtml(st.label)}</span>
              </div>
              <div style="font-size:0.8rem;color:var(--neon-cyan);font-weight:700;">${escapeHtml(projectCategoryLabel(proj.category))}</div>
              <p class="muted-text">${escapeHtml(isArabic() ? proj.descriptionAr : proj.descriptionEn)}</p>
              ${
                proj.technologies?.length
                  ? `
                <div style="font-size:0.8rem;font-weight:700;color:var(--neon-cyan);">${escapeHtml(t("technologiesLabel"))}</div>
                <div class="chips-wrap">
                  ${proj.technologies.map((tech) => `<span class="tech-chip">${escapeHtml(tech)}</span>`).join("")}
                </div>
              `
                  : ""
              }
              ${
                link
                  ? `<a href="${escapeHtml(link)}" target="_blank" rel="noopener noreferrer" class="btn btn-primary btn-full" style="margin-top:8px;">
                      ${escapeHtml(t("visitWebsite"))}
                    </a>`
                  : ""
              }
            </div>
          </div>
        `;
        })
        .join("")}
    </div>`;
  }

  function renderProjectsScreen(root) {
    const catFilters = [
      { key: "all", label: t("projectTypeAll") },
      ...PROJECT_CATEGORIES.map((c) => ({ key: c, label: projectCategoryLabel(c) }))
    ];
    const statusFilters = [
      { key: "all", label: t("statusAll") },
      { key: "Completed", label: t("statusCompleted") },
      { key: "In Progress", label: t("statusInProgress") },
      { key: "Coming Soon", label: t("statusComingSoon") }
    ];

    root.innerHTML = `
      <div>
        <h1 class="screen-title">🚀 ${escapeHtml(t("projectsHeadline"))}</h1>
        <p class="screen-subtitle">${escapeHtml(t("projectsSubheadline"))}</p>
      </div>

      <div class="field">
        <input id="projectSearchInput" type="search" value="${escapeHtml(projectSearchQuery)}" placeholder="${escapeHtml(t("searchProjectsPlaceholder"))}" aria-label="${escapeHtml(t("searchProjectsPlaceholder"))}" />
      </div>

      <div class="chips-scroll" aria-label="${escapeHtml(t("projectTypeLabel"))}">
        ${catFilters
          .map(
            (f) => `
          <button type="button" class="chip-btn ${projectCategoryFilter === f.key ? "active" : ""}" data-pcat="${escapeHtml(f.key)}">
            ${escapeHtml(f.label)}
          </button>
        `
          )
          .join("")}
      </div>

      <div class="chips-scroll" aria-label="${escapeHtml(t("statusLabel"))}">
        ${statusFilters
          .map(
            (f) => `
          <button type="button" class="chip-btn ${projectStatusFilter === f.key ? "active" : ""}" data-pstat="${escapeHtml(f.key)}">
            ${escapeHtml(f.label)}
          </button>
        `
          )
          .join("")}
      </div>

      <div id="projectsGridWrap">${renderProjectsGridHtml()}</div>
    `;

    const searchInput = document.getElementById("projectSearchInput");
    const gridWrap = document.getElementById("projectsGridWrap");

    searchInput.addEventListener("input", () => {
      projectSearchQuery = searchInput.value;
      gridWrap.innerHTML = renderProjectsGridHtml();
      bind3DEffects(gridWrap);
    });

    root.querySelectorAll("[data-pcat]").forEach((btn) => {
      btn.addEventListener("click", () => {
        projectCategoryFilter = btn.dataset.pcat;
        renderScreen();
      });
    });

    root.querySelectorAll("[data-pstat]").forEach((btn) => {
      btn.addEventListener("click", () => {
        projectStatusFilter = btn.dataset.pstat;
        renderScreen();
      });
    });
  }

  /* =========================================================
     4B. TECHNOLOGIES SCREEN
     ========================================================= */
  function renderTechnologiesScreen(root) {
    const groups = I18N[currentLang].techGroups || [];
    const publishedServices = studioState.services.filter((s) => s.published);
    const publishedProjects = studioState.projects.filter((p) => p.published);

    const visibleGroups =
      techCategoryFilter === "all"
        ? groups
        : groups.filter((g) => g.key === techCategoryFilter);

    root.innerHTML = `
      <div>
        <h1 class="screen-title">💻 ${escapeHtml(t("techHeadline"))}</h1>
        <p class="screen-subtitle">${escapeHtml(t("techSubheadline"))}</p>
      </div>

      <div class="chips-scroll">
        <button type="button" class="chip-btn ${techCategoryFilter === "all" ? "active" : ""}" data-tcat="all">
          ${escapeHtml(t("techCategoryAll"))}
        </button>
        ${groups
          .map(
            (g) => `
          <button type="button" class="chip-btn ${techCategoryFilter === g.key ? "active" : ""}" data-tcat="${escapeHtml(g.key)}">
            ${g.icon} ${escapeHtml(g.title.split(" (")[0])}
          </button>
        `
          )
          .join("")}
      </div>

      <div class="tech-stack-grid">
        ${visibleGroups
          .map((g) => {
            const tokens = g.items.map((x) => x.toLowerCase());
            const relatedServices = publishedServices
              .filter((s) => (s.technologies || []).some((st) => tokens.some((tk) => st.toLowerCase().includes(tk) || tk.includes(st.toLowerCase()))))
              .slice(0, 3);
            const relatedProjects = publishedProjects
              .filter((p) => {
                const techMatch = (p.technologies || []).some((pt) => {
                  const low = pt.toLowerCase();
                  return (
                    tokens.some((tk) => low.includes(tk) || tk.includes(low)) ||
                    (g.key === "frontend" && (low.includes("web") || low.includes("ui/ux")))
                  );
                });
                const catMatch =
                  (g.key === "frontend" && p.category === "Websites") ||
                  (g.key === "mobile" && p.category === "Android Applications") ||
                  (g.key === "ai" && p.category === "AI Projects");
                return techMatch || catMatch;
              })
              .slice(0, 3);

            return `
          <article class="glass-card tech-cat-card" data-tilt-3d="1">
            <div class="tech-cat-head">
              <div class="tech-cat-icon">${g.icon}</div>
              <h2 class="card-title">${escapeHtml(g.title)}</h2>
            </div>
            <p class="muted-text" style="margin:0;">${escapeHtml(g.desc)}</p>
            <div class="chips-wrap">
              ${g.items.map((item) => `<span class="tech-chip">${escapeHtml(item)}</span>`).join("")}
            </div>
            ${
              relatedServices.length > 0
                ? `<div class="tech-rel-row">
                    <span class="tech-rel-label">${escapeHtml(t("techLinkedServices"))}:</span>
                    <div class="chips-wrap">
                      ${relatedServices
                        .map((s) => `<button type="button" class="footer-link-btn" data-go-srv="${escapeHtml(s.category || "all")}">${escapeHtml(isArabic() ? s.titleAr.split(" (")[0] : s.titleEn)}</button>`)
                        .join("")}
                    </div>
                  </div>`
                : ""
            }
            ${
              relatedProjects.length > 0
                ? `<div class="tech-rel-row">
                    <span class="tech-rel-label">${escapeHtml(t("techLinkedProjects"))}:</span>
                    <div class="chips-wrap">
                      ${relatedProjects
                        .map((p) => `<button type="button" class="footer-link-btn" data-go-proj="${escapeHtml(p.nameEn)}">🚀 ${escapeHtml(isArabic() ? p.nameAr : p.nameEn)}</button>`)
                        .join("")}
                    </div>
                  </div>`
                : ""
            }
            <div style="margin-top:auto;padding-top:6px;">
              <button type="button" class="btn btn-outline btn-full btn-sm" data-req-stack="${escapeHtml(g.title)}">
                ✉️ ${escapeHtml(t("techRequestWithStack"))}
              </button>
            </div>
          </article>
        `;
          })
          .join("")}
      </div>
    `;

    root.querySelectorAll("[data-tcat]").forEach((btn) => {
      btn.addEventListener("click", () => {
        techCategoryFilter = btn.dataset.tcat;
        renderScreen();
      });
    });

    root.querySelectorAll("[data-go-srv]").forEach((btn) => {
      btn.addEventListener("click", () => {
        serviceCategory = btn.dataset.goSrv || "all";
        navigate("services");
      });
    });

    root.querySelectorAll("[data-go-proj]").forEach((btn) => {
      btn.addEventListener("click", () => {
        projectSearchQuery = btn.dataset.goProj || "";
        navigate("projects");
      });
    });

    root.querySelectorAll("[data-req-stack]").forEach((btn) => {
      btn.addEventListener("click", () => {
        contactPreselectedService = btn.dataset.reqStack || "";
        navigate("contact");
      });
    });
  }

  /* =========================================================
     5. TEAM SCREEN (No CV / No Hiring)
     ========================================================= */
  function renderTeamCardHtml(m) {
    const name = isArabic() ? m.nameAr : m.nameEn;
    const role = isArabic() ? m.roleAr : m.roleEn;
    const spec = isArabic() ? m.specializationAr : m.specializationEn;
    const bio = isArabic() ? m.bioAr : m.bioEn;
    const isFounder = m.id === "tm_omar_ceo" || m.avatarUrl === "drawable:omar_develepor";

    const initials =
      name
        .split(" ")
        .filter(Boolean)
        .slice(0, 2)
        .map((w) => w[0].toUpperCase())
        .join("") || "VX";

    const avatarHtml = isFounder && (!m.avatarUrl || m.avatarUrl.startsWith("drawable:"))
      ? `<img class="member-avatar-img" src="${STUDIO_IMAGES.omarAvatar}" alt="${escapeHtml(name)}" loading="lazy" decoding="async" onerror="this.outerHTML='<div class=member-avatar-fallback>${escapeHtml(initials)}</div>'" />`
      : m.avatarUrl && !m.avatarUrl.startsWith("drawable:")
      ? `<img class="member-avatar-img" src="${escapeHtml(m.avatarUrl)}" alt="${escapeHtml(name)}" loading="lazy" decoding="async" />`
      : `<div class="member-avatar-fallback">${escapeHtml(initials)}</div>`;

    const ghUrl = safeHttpUrl(m.githubUrl);
    const liUrl = safeHttpUrl(m.linkedinUrl);

    return `
      <div class="glass-card ${isFounder ? "highlight-border" : ""}" data-tilt-3d="subtle">
        <div class="member-row">
          ${avatarHtml}
          <div style="flex:1;min-width:0;">
            <h3 class="card-title">${escapeHtml(name)}</h3>
            <div style="color:var(--neon-cyan);font-size:0.9rem;font-weight:700;">${escapeHtml(role)}</div>
            ${spec ? `<div class="muted-text" style="font-size:0.84rem;margin-top:2px;">${escapeHtml(spec)}</div>` : ""}
            ${
              m.experienceYears !== null && m.experienceYears !== undefined && Number(m.experienceYears) > 0
                ? `<div class="muted-text" style="font-size:0.8rem;margin-top:2px;">${Number(m.experienceYears)} ${escapeHtml(t("yearsExpSuffix"))}</div>`
                : ""
            }
          </div>
        </div>
        <p style="margin:12px 0 0;font-size:0.93rem;">${escapeHtml(bio)}</p>
        ${
          m.skills?.length
            ? `<div style="margin-top:10px;">
                <div style="font-size:0.78rem;color:var(--text-muted);margin-bottom:6px;">${escapeHtml(t("skillsSectionLabel"))}</div>
                <div class="chips-wrap">${m.skills.map((s) => `<span class="tech-chip">${escapeHtml(s)}</span>`).join("")}</div>
              </div>`
            : ""
        }
        ${
          ghUrl || liUrl
            ? `<div class="btn-row" style="margin-top:14px;">
                ${ghUrl ? `<a href="${escapeHtml(ghUrl)}" target="_blank" rel="noopener noreferrer" class="btn btn-outline btn-sm">GitHub ↗</a>` : ""}
                ${liUrl ? `<a href="${escapeHtml(liUrl)}" target="_blank" rel="noopener noreferrer" class="btn btn-outline btn-sm">LinkedIn ↗</a>` : ""}
              </div>`
            : ""
        }
      </div>
    `;
  }

  function renderTeamScreen(root) {
    const members = studioState.team
      .filter((m) => m.published)
      .sort((a, b) => (a.sortOrder || 0) - (b.sortOrder || 0));

    root.innerHTML = `
      <div>
        <h1 class="screen-title">👥 ${escapeHtml(t("teamHeadline"))}</h1>
        <p class="screen-subtitle">${escapeHtml(t("teamSubheadline"))}</p>
      </div>
      <img class="team-banner" src="${STUDIO_IMAGES.studio}" alt="${escapeHtml(t("teamHeadline"))}" loading="lazy" decoding="async" onerror="this.style.display='none'" />
      <div class="stack-list">
        ${
          members.length === 0
            ? `<div class="glass-card"><p class="muted-text">${escapeHtml(t("noTeamYet"))}</p></div>`
            : members.map((m) => renderTeamCardHtml(m)).join("")
        }
      </div>
    `;
  }

  /* =========================================================
     6. VEXORA AI ASSISTANT SCREEN (Knowledge Base + Multi-Turn)
     ========================================================= */
  function buildPublicCatalogForAI() {
    return {
      settings: studioState.settings,
      about: {
        founder: t("aboutFounderName"),
        story: t("aboutStoryBody"),
        vision: t("aboutVisionBody"),
        mission: t("aboutMissionBody"),
        domains: I18N[currentLang].aboutDomains
      },
      services: studioState.services
        .filter((s) => s.published)
        .map((s) => ({
          titleEn: s.titleEn,
          titleAr: s.titleAr,
          descriptionEn: s.descriptionEn,
          descriptionAr: s.descriptionAr,
          detailsEn: s.detailsEn,
          detailsAr: s.detailsAr,
          technologies: s.technologies
        })),
      projects: studioState.projects
        .filter((p) => p.published)
        .map((p) => ({
          nameEn: p.nameEn,
          nameAr: p.nameAr,
          category: p.category,
          status: p.status,
          descriptionEn: p.descriptionEn,
          descriptionAr: p.descriptionAr,
          technologies: p.technologies,
          websiteUrl: p.websiteUrl
        })),
      team: studioState.team
        .filter((m) => m.published)
        .map((m) => ({
          nameEn: m.nameEn,
          nameAr: m.nameAr,
          roleEn: m.roleEn,
          roleAr: m.roleAr,
          specializationEn: m.specializationEn,
          specializationAr: m.specializationAr,
          skills: m.skills
        })),
      knowledgeBase: (studioState.knowledgeBase || [])
        .filter((k) => k.published !== false)
        .map((k) => ({
          topic: k.topic,
          titleEn: k.titleEn,
          titleAr: k.titleAr,
          contentEn: k.contentEn,
          contentAr: k.contentAr,
          keywords: k.keywords
        })),
      faqs: (studioState.faqs || [])
        .filter((f) => f.published !== false)
        .map((f) => ({
          questionEn: f.questionEn,
          questionAr: f.questionAr,
          answerEn: f.answerEn,
          answerAr: f.answerAr
        })),
      technologies: (I18N[currentLang].techGroups || []).map((g) => ({
        category: g.title,
        items: g.items
      }))
    };
  }

  function resolveConversationContext(question, history) {
    const recentText = (history || [])
      .slice(-6)
      .map((m) => m.text || "")
      .join(" ")
      .toLowerCase();
    const isFollowUp = /(أكتر|أكثر|تفاصيل|عنه|عنها|فيه|فيها|هذا|هذه|التي ذكرت|more|details|about it|this project|this service|how to request|request it|tech|stack|link|url|رابط)/i.test(
      question
    );
    if (!isFollowUp) return { project: null, service: null };

    const projects = studioState.projects.filter((p) => p.published);
    const services = studioState.services.filter((s) => s.published);
    const ctxProject = [...projects]
      .reverse()
      .find((p) => recentText.includes(p.nameEn.toLowerCase()) || recentText.includes(p.nameAr.toLowerCase()));
    const ctxService = [...services]
      .reverse()
      .find(
        (s) =>
          recentText.includes(s.titleEn.toLowerCase()) ||
          (s.titleAr && recentText.includes(s.titleAr.toLowerCase().split(" (")[0]))
      );
    return { project: ctxProject || null, service: ctxService || null };
  }

  // Honest grounded local fallback powered by Company Knowledge Base, FAQs, Catalog & Multi-Turn Context
  function answerLocallyGrounded(question, lang, history = []) {
    const q = question.toLowerCase();
    const ar = lang === "ar";
    const services = studioState.services.filter((s) => s.published);
    const projects = studioState.projects.filter((p) => p.published);
    const team = studioState.team.filter((m) => m.published);
    const kb = (studioState.knowledgeBase || []).filter((k) => k.published !== false);
    const faqs = (studioState.faqs || []).filter((f) => f.published !== false);
    const settings = studioState.settings;

    // 1. Direct service match
    let matchedService = services.find(
      (s) =>
        q.includes(s.titleEn.toLowerCase()) ||
        (s.titleAr && q.includes(s.titleAr.toLowerCase().split(" (")[0]))
    );

    // 2. Direct project match
    let matchedProject = projects.find(
      (p) => q.includes(p.nameEn.toLowerCase()) || q.includes(p.nameAr.toLowerCase())
    );

    // 3. Multi-turn context resolution when user sends a follow-up question
    if (!matchedProject && !matchedService) {
      const ctx = resolveConversationContext(question, history);
      matchedProject = ctx.project;
      matchedService = ctx.service;
    }

    if (matchedService) {
      const title = ar ? matchedService.titleAr : matchedService.titleEn;
      const desc = ar ? matchedService.descriptionAr : matchedService.descriptionEn;
      const details = ar ? matchedService.detailsAr : matchedService.detailsEn;
      const techs = (matchedService.technologies || []).join("، ");
      return {
        text: ar
          ? `${title}: ${desc}${details ? `\n${details}` : ""}${techs ? `\nالتقنيات: ${techs}` : ""}\nيمكنك طلب هذه الخدمة مباشرة من صفحة الخدمات أو تواصل معنا.`
          : `${title}: ${desc}${details ? `\n${details}` : ""}${techs ? `\nTechnologies: ${techs}` : ""}\nYou can request this service from Services or Contact Us.`,
        links: ["services", "technologies", "contact"]
      };
    }

    if (matchedProject) {
      const name = ar ? matchedProject.nameAr : matchedProject.nameEn;
      const desc = ar ? matchedProject.descriptionAr : matchedProject.descriptionEn;
      const techs = (matchedProject.technologies || []).join("، ");
      const urlInfo = matchedProject.websiteUrl ? `\n${matchedProject.websiteUrl}` : "";
      return {
        text: ar
          ? `مشروع ${name} (${matchedProject.category} — ${matchedProject.status}): ${desc}${techs ? `\nالتقنيات: ${techs}` : ""}${urlInfo}`
          : `${name} (${matchedProject.category} — ${matchedProject.status}): ${desc}${techs ? `\nTechnologies: ${techs}` : ""}${urlInfo}`,
        links: ["projects", "technologies"]
      };
    }

    // 4. Pricing / Private / Unknown info (strict factual grounding)
    if (/(سعر|أسعار|تكلف|كم يكلف|ميزانية|price|cost|budget|how much|salary|password|كلمة السر|رسائل)/i.test(q)) {
      return {
        text: ar
          ? `لا تتوفر تسعيرة ثابتة أو بيانات خاصة داخل المعلومات المنشورة حالياً. تواصل معنا بتفاصيل مشروعك عبر صفحة تواصل معنا أو البريد ${settings.officialEmail} وسنحدد النطاق المناسب.`
          : `Fixed pricing and private records are not listed in public company data. Please share your requirements via Contact Us or ${settings.officialEmail} so our team can assist.`,
        links: ["contact"]
      };
    }

    // 5. Company Knowledge Base keyword match
    let bestKb = null;
    let bestKbScore = 0;
    for (const item of kb) {
      const kws = (item.keywords || []).map((k) => String(k).toLowerCase());
      let score = 0;
      for (const kw of kws) {
        if (kw && q.includes(kw)) score += 2;
      }
      if (item.titleEn && q.includes(item.titleEn.toLowerCase())) score += 3;
      if (item.titleAr && q.includes(item.titleAr.toLowerCase())) score += 3;
      if (score > bestKbScore) {
        bestKbScore = score;
        bestKb = item;
      }
    }
    if (bestKb && bestKbScore >= 2) {
      return {
        text: ar ? `${bestKb.titleAr}:\n${bestKb.contentAr}` : `${bestKb.titleEn}:\n${bestKb.contentEn}`,
        links: bestKb.topic === "projects" ? ["projects"] : bestKb.topic === "mobile" ? ["download"] : ["about", "contact"]
      };
    }

    // 6. Published FAQs match
    const qWords = q.split(/\s+/).filter((w) => w.length >= 3);
    const matchedFaq = faqs.find((f) => {
      const hay = `${f.questionEn} ${f.questionAr} ${f.answerEn} ${f.answerAr}`.toLowerCase();
      return qWords.filter((w) => hay.includes(w)).length >= 2;
    });
    if (matchedFaq) {
      return {
        text: ar ? `${matchedFaq.questionAr}\n${matchedFaq.answerAr}` : `${matchedFaq.questionEn}\n${matchedFaq.answerEn}`,
        links: ["services", "technologies", "contact"]
      };
    }

    // 7. Services list query
    if (/(خدم|services|service|تقدمون|بتعملوا|مجالات|تخصص)/i.test(q)) {
      const names = services.map((s, i) => `${i + 1}. ${ar ? s.titleAr : s.titleEn}`).join("\n");
      return {
        text: ar
          ? `تقدم ${settings.companyName} ${services.length} خدمة برمجية متخصصة:\n${names}`
          : `${settings.companyName} provides ${services.length} software engineering services:\n${names}`,
        links: ["services", "contact"]
      };
    }

    // 8. Projects list query
    if (/(مشاريع|مشروع|project|projects|portfolio|اعمال|أعمال|noorix|f\.cut|fcutus)/i.test(q)) {
      if (projects.length === 0) {
        return {
          text: ar ? "لا توجد مشاريع منشورة حالياً في المعرض." : "There are no published projects currently listed.",
          links: ["projects"]
        };
      }
      const list = projects
        .map((p) => `• ${ar ? p.nameAr : p.nameEn} (${p.category} • ${p.status})${p.websiteUrl ? ` — ${p.websiteUrl}` : ""}`)
        .join("\n");
      return {
        text: ar ? `المشاريع المنشورة حالياً:\n${list}` : `Currently published projects:\n${list}`,
        links: ["projects"]
      };
    }

    // 9. Team / Founder query
    if (/(فريق|مؤسس|مدير|عمر|omar|team|founder|ceo|من انتم|من أنتم|about)/i.test(q)) {
      const teamText = team
        .map((m) => `• ${ar ? m.nameAr : m.nameEn} — ${ar ? m.roleAr : m.roleEn} (${(m.skills || []).join(", ")})`)
        .join("\n");
      return {
        text: ar
          ? `${settings.companyName} شركة تطوير برمجيات وتكنولوجيا (${settings.taglineEn}).\nالفريق المنشور:\n${teamText}`
          : `${settings.companyName} is a Software Development & Technology Company (${settings.taglineEn}).\nPublished team:\n${teamText}`,
        links: ["team", "about"]
      };
    }

    // 10. Tech stack query
    if (/(تقني|لغات|برمجة|tech|stack|python|kotlin|java|c\+\+|react|database|قواعد|api)/i.test(q)) {
      const allTech = [...new Set(services.flatMap((s) => s.technologies || []))];
      return {
        text: ar
          ? `تعتمد Vexora Studio على التقنيات التالية: ${allTech.join("، ")}. يمكنك تصفح التفاصيل الكاملة في صفحة التقنيات.`
          : `Vexora Studio works with: ${allTech.join(", ")}. Explore full categories on our Technologies page.`,
        links: ["technologies", "services"]
      };
    }

    // 11. Contact / Request / Android APK
    if (/(تواصل|طلب|بريد|ايميل|إيميل|contact|email|apk|تطبيق|تحميل|download)/i.test(q)) {
      return {
        text: ar
          ? `لطلب خدمة أو التواصل الرسمي، استخدم صفحة تواصل معنا أو البريد ${settings.officialEmail}. كما يمكنك تحميل تطبيق Android الرسمي من صفحة تطبيق Android.`
          : `To request a project or contact us directly, use the Contact Us page or email ${settings.officialEmail}. You can also download our official Android APK from the Android App page.`,
        links: ["contact", "download"]
      };
    }

    // 12. General fallback admitting boundary without repeating boilerplate
    return {
      text: ar
        ? "يمكنني مساعدتك بمعلومات موثقة من قاعدة معرفة Vexora Studio عن الخدمات الـ 11، المشاريع، التقنيات، الأمان، أو التواصل. ما السؤال المحدد الذي تود معرفته؟"
        : "I can answer specific questions from Vexora Studio's Knowledge Base about our 11 services, published projects, tech stack, security, or contacting the team. What would you like to know?",
      links: ["services", "projects", "technologies"]
    };
  }

  function renderAiScreen(root) {
    if (aiChatHistory.length === 0) {
      aiChatHistory.push({
        role: "assistant",
        text: t("aiGreeting"),
        links: ["services", "projects", "technologies"],
        source: "knowledge"
      });
    }

    const suggestions = I18N[currentLang].aiSuggestions || [];
    const cfg = Backend.getConfig();
    const aiReady = Backend.isAiConfigured ? Backend.isAiConfigured() : Backend.isConfigured();
    const statusText = cfg.aiEndpointUrl
      ? t("aiStatusCustomProxy")
      : Backend.isConfigured()
      ? t("aiStatusConnected")
      : t("aiStatusLocal");
    const activeKbCount = (studioState.knowledgeBase || []).filter((k) => k.published !== false).length;

    root.innerHTML = `
      <div class="row-between" style="flex-wrap:wrap;">
        <div>
          <h1 class="screen-title">🤖 ${escapeHtml(t("aiHeadline"))}</h1>
          <p class="screen-subtitle">${escapeHtml(t("aiSubheadline"))}</p>
        </div>
        <div style="display:flex;gap:8px;flex-wrap:wrap;align-items:center;">
          <span class="status-pill cyan">📚 ${activeKbCount} ${escapeHtml(t("aiKbCountLabel"))}</span>
          <span class="status-pill ${aiReady ? "success" : "cyan"}">
            <span class="pill-dot"></span>
            ${escapeHtml(statusText)}
          </span>
        </div>
      </div>

      <div class="chips-scroll">
        ${suggestions
          .map(
            (s) => `<button type="button" class="chip-btn" data-ai-suggest="${escapeHtml(s)}">${escapeHtml(s)}</button>`
          )
          .join("")}
      </div>

      <div class="glass-card highlight-border stack-list">
        <div id="aiChatBox" class="chat-box">
          ${aiChatHistory
            .map((msg) => {
              const cls = msg.role === "user" ? "user" : "bot";
              const sourcePill =
                msg.role === "assistant" && msg.source
                  ? `<div style="font-size:0.72rem;color:var(--neon-cyan);margin-bottom:4px;font-weight:700;">${escapeHtml(
                      msg.source === "gemini" ? t("aiSourceGemini") : t("aiSourceKnowledge")
                    )}</div>`
                  : "";
              const routeButtons =
                msg.role === "assistant" && Array.isArray(msg.links) && msg.links.length
                  ? `<div class="chips-wrap" style="margin-top:10px;">
                      ${msg.links
                        .map((rk) => `<button type="button" class="chip-btn" data-ai-go="${escapeHtml(rk)}">↗ ${escapeHtml(routeLabel(rk))}</button>`)
                        .join("")}
                    </div>`
                  : "";
              return `<div class="chat-bubble ${cls}">${sourcePill}${escapeHtml(msg.text)}${routeButtons}</div>`;
            })
            .join("")}
          ${aiBusy ? `<div class="chat-bubble bot">${escapeHtml(t("aiThinking"))}</div>` : ""}
        </div>

        <form id="aiChatForm" class="chat-input-row">
          <input id="aiInput" type="text" placeholder="${escapeHtml(t("aiInputPlaceholder"))}" ${aiBusy ? "disabled" : ""} required />
          <button type="submit" class="btn btn-primary" ${aiBusy ? "disabled" : ""}>${escapeHtml(t("aiSendBtn"))}</button>
        </form>
        <div class="row-between">
          <span class="muted-text" style="font-size:0.78rem;">Gemini API runs strictly via secure backend (Edge Function or Proxy) grounded with Knowledge Base + chat context.</span>
          <button id="aiClearBtn" type="button" class="btn btn-text btn-sm">${escapeHtml(t("aiClearBtn"))}</button>
        </div>
      </div>
    `;

    const chatBox = document.getElementById("aiChatBox");
    chatBox.scrollTop = chatBox.scrollHeight;

    root.querySelectorAll("[data-ai-go]").forEach((btn) => {
      btn.addEventListener("click", () => navigate(btn.dataset.aiGo));
    });

    root.querySelectorAll("[data-ai-suggest]").forEach((btn) => {
      btn.addEventListener("click", () => handleAiSubmit(btn.dataset.aiSuggest));
    });

    document.getElementById("aiClearBtn").addEventListener("click", () => {
      aiChatHistory = [{ role: "assistant", text: t("aiGreeting"), links: ["services", "projects", "technologies"], source: "knowledge" }];
      renderScreen();
    });

    document.getElementById("aiChatForm").addEventListener("submit", (e) => {
      e.preventDefault();
      const input = document.getElementById("aiInput");
      const val = input.value.trim();
      if (!val || aiBusy) return;
      handleAiSubmit(val);
    });
  }

  function routeLabel(rk) {
    switch (rk) {
      case "about": return t("navAbout");
      case "services": return t("navServices");
      case "projects": return t("navProjects");
      case "technologies": return t("navTechnologies");
      case "team": return t("navTeam");
      case "download": return t("navDownload");
      case "contact": return t("navContact");
      default: return t("navHome");
    }
  }

  async function handleAiSubmit(promptText) {
    const clean = String(promptText || "").trim();
    if (!clean || aiBusy) return;

    const priorHistory = aiChatHistory.slice(-10).map((m) => ({ role: m.role, text: m.text }));
    aiChatHistory.push({ role: "user", text: clean });
    aiBusy = true;
    renderScreen();

    try {
      const catalog = buildPublicCatalogForAI();
      const remote = await Backend.askVexoraAI(clean, currentLang, priorHistory, catalog);

      if (remote.ok && remote.reply) {
        aiChatHistory.push({
          role: "assistant",
          text: remote.reply,
          links: inferSuggestedRoutes(remote.reply),
          source: "gemini"
        });
      } else {
        const localAns = answerLocallyGrounded(clean, currentLang, priorHistory);
        aiChatHistory.push({
          role: "assistant",
          text: localAns.text,
          links: localAns.links,
          source: "knowledge"
        });
      }
    } finally {
      aiBusy = false;
      renderScreen();
    }
  }

  function inferSuggestedRoutes(text) {
    const lower = String(text || "").toLowerCase();
    const out = [];
    if (lower.includes("#services") || lower.includes("service")) out.push("services");
    if (lower.includes("#projects") || lower.includes("f.cutus") || lower.includes("noorix")) out.push("projects");
    if (lower.includes("#technologies") || lower.includes("kotlin") || lower.includes("react") || lower.includes("python")) out.push("technologies");
    if (lower.includes("#contact") || lower.includes("vexora0studio@gmail.com")) out.push("contact");
    if (lower.includes("#download") || lower.includes("apk")) out.push("download");
    return [...new Set(out)].slice(0, 3);
  }

  /* =========================================================
     7. ANDROID DOWNLOAD SCREEN
     ========================================================= */
  function renderDownloadScreen(root) {
    root.innerHTML = `
      <div>
        <h1 class="screen-title">📲 ${escapeHtml(t("downloadHeadline"))}</h1>
        <p class="screen-subtitle">${escapeHtml(t("downloadSubheadline"))}</p>
      </div>

      <div class="glass-card highlight-border stack-list" data-tilt-3d="1">
        <div class="app-download-hero">
          <img class="app-icon-badge" src="${STUDIO_IMAGES.appIcon}" alt="Vexora Studio APK" loading="lazy" decoding="async" onerror="this.style.display='none'" />
          <div style="flex:1;min-width:210px;">
            <div style="display:flex;align-items:center;gap:10px;flex-wrap:wrap;">
              <h2 class="card-title" style="font-size:1.28rem;">Vexora Studio Android App</h2>
              <span class="status-pill success"><span class="pill-dot"></span>Android APK</span>
            </div>
            <p class="muted-text" style="margin-top:6px;">${escapeHtml(t("downloadBannerDesc"))}</p>
          </div>
        </div>

        <div class="spec-grid">
          <div class="spec-item">
            <div class="spec-label">${escapeHtml(t("apkVersionLabel"))}</div>
            <div class="spec-value">v1.0</div>
          </div>
          <div class="spec-item">
            <div class="spec-label">${escapeHtml(t("apkSizeLabel"))}</div>
            <div class="spec-value">~32 MB (.apk)</div>
          </div>
          <div class="spec-item">
            <div class="spec-label">${escapeHtml(t("apkMinAndroidLabel"))}</div>
            <div class="spec-value">Android 7.0+</div>
          </div>
          <div class="spec-item">
            <div class="spec-label">${escapeHtml(t("apkPackageLabel"))}</div>
            <div class="spec-value" style="font-size:0.82rem;">com.aistudio.vexorastudio.k7m9p2</div>
          </div>
        </div>

        <a id="apkDownloadBtn" href="${APK_URL}" download="Vexora-Studio.apk" class="btn btn-primary btn-full">
          ⬇️ ${escapeHtml(t("downloadApkBtn"))}
        </a>
      </div>

      <div class="glass-card stack-list">
        <h2 class="card-title">${escapeHtml(t("installStepsTitle"))}</h2>
        <div class="install-steps">
          <div class="install-step">
            <span class="install-step-num">1</span>
            <p class="muted-text" style="margin:0;">${escapeHtml(t("installStep1"))}</p>
          </div>
          <div class="install-step">
            <span class="install-step-num">2</span>
            <p class="muted-text" style="margin:0;">${escapeHtml(t("installStep2"))}</p>
          </div>
          <div class="install-step">
            <span class="install-step-num">3</span>
            <p class="muted-text" style="margin:0;">${escapeHtml(t("installStep3"))}</p>
          </div>
        </div>
      </div>
    `;

    document.getElementById("apkDownloadBtn").addEventListener("click", () => {
      showToast(t("downloadStartedToast"));
    });
  }

  /* =========================================================
     8. CONTACT US SCREEN
     ========================================================= */
  function renderContactScreen(root) {
    const settings = studioState.settings;
    const services = studioState.services.filter((s) => s.published);
    const msgs = studioState.messages;

    const gh = safeHttpUrl(settings.githubUrl);
    const li = safeHttpUrl(settings.linkedinUrl);
    const yt = safeHttpUrl(settings.youtubeUrl);
    const web = safeHttpUrl(settings.websiteUrl);

    root.innerHTML = `
      <div>
        <h1 class="screen-title">✉️ ${escapeHtml(t("contactHeadline"))}</h1>
        <p class="screen-subtitle">${escapeHtml(t("contactSubheadline"))}</p>
      </div>

      <form id="contactForm" class="glass-card highlight-border stack-list" novalidate>
        <div class="form-two-col">
          <div class="field">
            <label for="cName">${escapeHtml(t("fullNameLabel"))}</label>
            <input id="cName" type="text" required />
          </div>
          <div class="field">
            <label for="cEmail">${escapeHtml(t("emailLabel"))}</label>
            <input id="cEmail" type="email" required />
          </div>
        </div>

        <div class="field">
          <label for="cService">${escapeHtml(t("requestedServiceLabel"))}</label>
          <select id="cService">
            <option value="">${escapeHtml(t("noSpecificServiceOption"))}</option>
            ${services
              .map((s) => {
                const label = isArabic() ? s.titleAr : s.titleEn;
                const sel = contactPreselectedService && label === contactPreselectedService ? "selected" : "";
                return `<option value="${escapeHtml(label)}" ${sel}>${escapeHtml(label)}</option>`;
              })
              .join("")}
          </select>
        </div>

        <div class="field">
          <label for="cSubject">${escapeHtml(t("subjectLabel"))}</label>
          <input id="cSubject" type="text" value="${escapeHtml(contactPreselectedService ? (isArabic() ? `طلب خدمة: ${contactPreselectedService}` : `Service Request: ${contactPreselectedService}`) : "")}" required />
        </div>

        <div class="field">
          <label for="cMessage">${escapeHtml(t("messageLabel"))}</label>
          <textarea id="cMessage" rows="4" required></textarea>
        </div>

        <div id="cErr" class="error-text"></div>
        <button id="cSubmitBtn" type="submit" class="btn btn-primary btn-full">✉️ ${escapeHtml(t("sendMessage"))}</button>
      </form>

      ${
        settings.officialEmail
          ? `<div class="glass-card stack-list">
              <div class="card-title">✉️ ${escapeHtml(t("directEmailLabel"))}</div>
              <div style="color:var(--neon-cyan);font-family:'Space Grotesk',sans-serif;word-break:break-all;">${escapeHtml(settings.officialEmail)}</div>
              <div class="btn-row">
                <button id="copyEmailBtn" type="button" class="btn btn-outline">📋 ${escapeHtml(t("copyEmail"))}</button>
                <a href="mailto:${escapeHtml(settings.officialEmail)}" class="btn btn-outline">✉️ ${escapeHtml(t("contactUsCta"))}</a>
              </div>
            </div>`
          : ""
      }

      ${
        gh || li || yt || web
          ? `<div class="glass-card stack-list">
              <div class="card-title">${escapeHtml(t("socialLinksTitle"))}</div>
              <div class="chips-scroll">
                ${web ? `<a href="${escapeHtml(web)}" target="_blank" rel="noopener noreferrer" class="btn btn-outline btn-sm">Website ↗</a>` : ""}
                ${gh ? `<a href="${escapeHtml(gh)}" target="_blank" rel="noopener noreferrer" class="btn btn-outline btn-sm">GitHub ↗</a>` : ""}
                ${li ? `<a href="${escapeHtml(li)}" target="_blank" rel="noopener noreferrer" class="btn btn-outline btn-sm">LinkedIn ↗</a>` : ""}
                ${yt ? `<a href="${escapeHtml(yt)}" target="_blank" rel="noopener noreferrer" class="btn btn-outline btn-sm">YouTube ↗</a>` : ""}
              </div>
            </div>`
          : ""
      }

      ${
        msgs.length > 0
          ? `<h2 class="card-title" style="font-size:1.15rem;">${escapeHtml(t("myMessagesTitle"))}</h2>
             <div class="stack-list">
               ${msgs
                 .map(
                   (m) => `
                 <div class="glass-card">
                   <div class="row-between">
                     <h3 class="card-title">${escapeHtml(m.subject)}</h3>
                     <span class="status-pill ${m.status === "replied" ? "success" : "cyan"}"><span class="pill-dot"></span>${escapeHtml(m.status === "replied" ? t("messageStatusReplied") : t("messageStatusNew"))}</span>
                   </div>
                   <p class="muted-text" style="margin-top:6px;white-space:pre-wrap;">${escapeHtml(m.message)}</p>
                 </div>
               `
                 )
                 .join("")}
             </div>`
          : ""
      }
    `;

    contactPreselectedService = "";

    document.getElementById("contactForm").addEventListener("submit", async (e) => {
      e.preventDefault();
      const senderName = document.getElementById("cName").value.trim();
      const email = document.getElementById("cEmail").value.trim();
      const serviceRequested = document.getElementById("cService").value.trim();
      const subject = document.getElementById("cSubject").value.trim();
      const rawMessage = document.getElementById("cMessage").value.trim();
      const err = document.getElementById("cErr");
      const btn = document.getElementById("cSubmitBtn");

      if (senderName.length < 2 || !email.includes("@") || subject.length < 2 || rawMessage.length < 5) {
        err.textContent = t("validationError");
        return;
      }
      err.textContent = "";
      btn.disabled = true;

      const finalMsgText = serviceRequested ? `[${serviceRequested}]\n${rawMessage}` : rawMessage;
      const msgObj = {
        id: `msg_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
        senderName,
        email,
        subject,
        message: finalMsgText,
        serviceRequested,
        status: "new",
        createdAt: new Date().toISOString()
      };

      let savedToCloud = false;
      if (Backend.isConfigured()) {
        try {
          const res = await Backend.submitContactMessage(msgObj);
          savedToCloud = Boolean(res.synced);
        } catch (submitErr) {
          err.textContent = submitErr?.message || "Failed to send message";
          btn.disabled = false;
          return;
        }
      }

      studioState.messages.unshift(msgObj);
      saveState();
      btn.disabled = false;
      showToast(savedToCloud ? t("messageSentDb") : t("messageSentLocal"));
      renderScreen();
    });

    const copyBtn = document.getElementById("copyEmailBtn");
    if (copyBtn) {
      copyBtn.addEventListener("click", async () => {
        try {
          await navigator.clipboard.writeText(settings.officialEmail);
        } catch {
          // Ignore clipboard fallback
        }
        showToast(t("emailCopied"));
      });
    }
  }

  /* =========================================================
     9. ADMIN DASHBOARD (Zero CV / Zero Hiring)
     ========================================================= */
  function renderAdminScreen(root) {
    const cloudConfigured = Backend.isConfigured();

    if (!isAdminAuthorized()) {
      if (cloudConfigured) {
        root.innerHTML = `
          <form id="adminCloudLoginForm" class="glass-card highlight-border stack-list" style="margin-top:16px;" novalidate>
            <div style="font-size:2rem;">🛡️</div>
            <h1 class="screen-title">${escapeHtml(t("adminAuthCloudTitle"))}</h1>
            <p class="muted-text">${escapeHtml(t("adminAuthCloudDesc"))}</p>
            <div class="field">
              <label for="adminEmailInput">${escapeHtml(t("adminEmailLabel"))}</label>
              <input id="adminEmailInput" type="email" autocomplete="email" required />
            </div>
            <div class="field">
              <label for="adminPassInput">${escapeHtml(t("adminPasswordLabel"))}</label>
              <input id="adminPassInput" type="password" autocomplete="current-password" required />
            </div>
            <div id="adminAuthErr" class="error-text"></div>
            <button id="adminLoginSubmit" type="submit" class="btn btn-primary btn-full">🔐 ${escapeHtml(t("adminSignInBtn"))}</button>
            <button id="clearCloudCfgBtn" type="button" class="btn btn-text btn-sm">⚙️ Reset Local Backend Override</button>
          </form>
        `;

        document.getElementById("adminCloudLoginForm").addEventListener("submit", async (e) => {
          e.preventDefault();
          const email = document.getElementById("adminEmailInput").value.trim();
          const pass = document.getElementById("adminPassInput").value;
          const err = document.getElementById("adminAuthErr");
          const btn = document.getElementById("adminLoginSubmit");
          err.textContent = "";
          btn.disabled = true;
          try {
            await Backend.signInAdmin(email, pass);
            const msgs = await Backend.fetchAdminMessages();
            if (Array.isArray(msgs)) {
              studioState.messages = msgs;
              saveState();
            }
            showToast(t("adminUnlockedToast"));
            renderScreen();
          } catch (authErr) {
            err.textContent = authErr?.message || t("adminInvalidAuth");
          } finally {
            btn.disabled = false;
          }
        });

        document.getElementById("clearCloudCfgBtn").addEventListener("click", () => {
          Backend.clearPublicConfigOverride();
          Backend.signOutAdmin();
          renderScreen();
        });
      } else {
        root.innerHTML = `
          <form id="adminLocalForm" class="glass-card highlight-border stack-list" style="margin-top:16px;" novalidate>
            <div style="font-size:2rem;">🔒</div>
            <h1 class="screen-title">${escapeHtml(t("adminAuthLocalTitle"))}</h1>
            <p class="muted-text">${escapeHtml(t("adminAuthLocalDesc"))}</p>
            <div class="field">
              <label for="adminCodeInput">${escapeHtml(t("adminCodeLabel"))}</label>
              <div style="display:flex;gap:8px;">
                <input id="adminCodeInput" type="password" autocomplete="off" placeholder="${escapeHtml(t("adminCodePlaceholder"))}" style="flex:1;" required />
                <button id="toggleAdminCodeBtn" type="button" class="icon-btn" aria-label="Show/Hide Code">👁️</button>
              </div>
            </div>
            <div id="adminCodeErr" class="error-text"></div>
            <button type="submit" class="btn btn-primary btn-full">🔓 ${escapeHtml(t("adminUnlockBtn"))}</button>
          </form>
        `;
        const codeInput = document.getElementById("adminCodeInput");
        document.getElementById("toggleAdminCodeBtn").addEventListener("click", () => {
          codeInput.type = codeInput.type === "password" ? "text" : "password";
        });
        document.getElementById("adminLocalForm").addEventListener("submit", (e) => {
          e.preventDefault();
          const err = document.getElementById("adminCodeErr");
          if (verifyLocalAdminCode(codeInput.value.trim())) {
            sessionStorage.setItem(ADMIN_SESSION_KEY, "1");
            err.textContent = "";
            showToast(t("adminUnlockedToast"));
            renderScreen();
          } else {
            err.textContent = t("adminInvalidAuth");
          }
        });
      }
      return;
    }

    const unreadCount = studioState.messages.filter((m) => m.status !== "replied").length;
    const tabs = [
      { key: "dashboard", label: t("adminTabDashboard") },
      { key: "projects", label: t("adminTabProjects") },
      { key: "services", label: t("adminTabServices") },
      { key: "team", label: t("adminTabTeam") },
      { key: "knowledge", label: t("adminTabKnowledge") },
      { key: "messages", label: unreadCount > 0 ? `${t("adminTabMessages")} (${unreadCount})` : t("adminTabMessages") },
      { key: "settings", label: t("adminTabSettings") }
    ];

    root.innerHTML = `
      <div class="row-between">
        <h1 class="screen-title">🛡️ ${escapeHtml(t("adminTitle"))}</h1>
        <button id="adminLogoutBtn" type="button" class="btn btn-outline btn-sm">🔒 ${escapeHtml(t("adminLogoutBtn"))}</button>
      </div>

      <div class="chips-scroll">
        ${tabs
          .map(
            (tb) => `
          <button type="button" class="chip-btn ${adminSection === tb.key ? "active" : ""}" data-atab="${tb.key}">
            ${escapeHtml(tb.label)}
          </button>
        `
          )
          .join("")}
      </div>

      <div id="adminBody" class="stack-list"></div>
    `;

    document.getElementById("adminLogoutBtn").addEventListener("click", () => {
      sessionStorage.removeItem(ADMIN_SESSION_KEY);
      Backend.signOutAdmin();
      renderScreen();
    });

    root.querySelectorAll("[data-atab]").forEach((btn) => {
      btn.addEventListener("click", async () => {
        adminSection = btn.dataset.atab;
        if (adminSection === "messages" && cloudConfigured && Backend.getStoredAuth()?.access_token) {
          try {
            const liveMsgs = await Backend.fetchAdminMessages();
            if (Array.isArray(liveMsgs)) {
              studioState.messages = liveMsgs;
              saveState();
            }
          } catch {
            // Keep existing messages state
          }
        }
        renderScreen();
      });
    });

    const body = document.getElementById("adminBody");

    if (adminSection === "dashboard") {
      const dbBadge = !cloudConfigured
        ? `<span class="status-pill warning"><span class="pill-dot"></span>${escapeHtml(t("dbNotConfiguredMsg"))}</span>`
        : dbSyncStatus.tested && dbSyncStatus.ok
        ? `<span class="status-pill success"><span class="pill-dot"></span>${escapeHtml(t("dbConnectedMsg"))} (${dbSyncStatus.latencyMs}ms)</span>`
        : dbSyncStatus.tested && !dbSyncStatus.ok
        ? `<span class="status-pill error"><span class="pill-dot"></span>${escapeHtml(t("dbErrorMsg"))}: ${escapeHtml(dbSyncStatus.message)}</span>`
        : `<span class="status-pill cyan"><span class="pill-dot"></span>Supabase Configured</span>`;

      const aiConfigured = Backend.isAiConfigured ? Backend.isAiConfigured() : cloudConfigured;
      const aiBadge = !aiConfigured
        ? `<span class="status-pill cyan"><span class="pill-dot"></span>${escapeHtml(t("aiStatusLocal"))}</span>`
        : aiSyncStatus.tested && aiSyncStatus.ok
        ? `<span class="status-pill success"><span class="pill-dot"></span>${escapeHtml(t("aiEndpointOkMsg"))} (${aiSyncStatus.latencyMs}ms)</span>`
        : aiSyncStatus.tested && !aiSyncStatus.ok
        ? `<span class="status-pill error"><span class="pill-dot"></span>${escapeHtml(t("aiEndpointErrorMsg"))}: ${escapeHtml(aiSyncStatus.message)}</span>`
        : `<span class="status-pill cyan"><span class="pill-dot"></span>AI Endpoint Configured</span>`;

      body.innerHTML = `
        <div class="stats-grid">
          <div class="glass-card">
            <div class="stat-value">${studioState.projects.length}</div>
            <div class="stat-label">${escapeHtml(t("adminTabProjects"))}</div>
          </div>
          <div class="glass-card">
            <div class="stat-value">${studioState.services.length}</div>
            <div class="stat-label">${escapeHtml(t("adminTabServices"))}</div>
          </div>
          <div class="glass-card">
            <div class="stat-value">${(studioState.knowledgeBase || []).length + (studioState.faqs || []).length}</div>
            <div class="stat-label">${escapeHtml(t("adminTabKnowledge"))}</div>
          </div>
          <div class="glass-card">
            <div class="stat-value">${studioState.messages.length}</div>
            <div class="stat-label">${escapeHtml(t("adminTabMessages"))}</div>
          </div>
        </div>

        <div class="glass-card highlight-border stack-list">
          <h2 class="card-title">${escapeHtml(t("backendStatusTitle"))}</h2>
          <div class="chips-wrap">${dbBadge}${aiBadge}</div>
          <div class="btn-row">
            <button id="testDbBtn" type="button" class="btn btn-primary">🔌 ${escapeHtml(t("testDbBtn"))}</button>
            <button id="testAiBtn" type="button" class="btn btn-outline">🤖 ${escapeHtml(t("testAiBtn"))}</button>
            <button id="seedCatalogBtn" type="button" class="btn btn-outline">🔄 ${escapeHtml(t("resetCatalogBtn"))}</button>
          </div>
        </div>
      `;

      document.getElementById("testDbBtn").addEventListener("click", async () => {
        const res = await Backend.testConnection();
        dbSyncStatus = {
          tested: true,
          ok: res.ok,
          latencyMs: res.latencyMs || null,
          message: res.reason || ""
        };
        showToast(res.ok ? `${t("dbConnectedMsg")} (${res.latencyMs}ms)` : res.reason || t("dbNotConfiguredMsg"));
        renderScreen();
      });

      document.getElementById("testAiBtn").addEventListener("click", async () => {
        const res = await Backend.testAiEndpoint();
        aiSyncStatus = {
          tested: true,
          ok: res.ok,
          latencyMs: res.latencyMs || null,
          mode: res.mode || "",
          message: res.reason || ""
        };
        showToast(res.ok ? `${t("aiEndpointOkMsg")} (${res.latencyMs}ms)` : res.reason || t("aiEndpointErrorMsg"));
        renderScreen();
      });

      document.getElementById("seedCatalogBtn").addEventListener("click", async () => {
        const def = createDefaultState();
        studioState.services = def.services;
        studioState.projects = def.projects;
        studioState.team = def.team;
        studioState.knowledgeBase = def.knowledgeBase;
        studioState.faqs = def.faqs;
        saveState();
        if (Backend.isConfigured() && Backend.getStoredAuth()?.access_token) {
          try {
            await Promise.all([
              Backend.updateSiteSettings(studioState.settings),
              ...studioState.services.map((s) => Backend.upsertService(s)),
              ...studioState.projects.map((p) => Backend.upsertProject(p)),
              ...studioState.team.map((m) => Backend.upsertTeamMember(m)),
              ...studioState.knowledgeBase.map((k) => Backend.upsertKnowledgeItem(k)),
              ...studioState.faqs.map((f) => Backend.upsertFaq(f))
            ]);
          } catch (err) {
            showToast(err?.message || "Sync warning");
            return;
          }
        }
        showToast("✓");
        renderScreen();
      });
    } else if (adminSection === "projects") {
      body.innerHTML = `
        <button id="addProjBtn" type="button" class="btn btn-primary btn-full">+ ${escapeHtml(t("addNew"))} — ${escapeHtml(t("adminTabProjects"))}</button>
        ${studioState.projects
          .map(
            (p) => `
          <div class="glass-card row-between">
            <div style="min-width:0;">
              <h3 class="card-title">${escapeHtml(isArabic() ? p.nameAr : p.nameEn)}</h3>
              <p class="muted-text" style="word-break:break-word;">${escapeHtml(p.category)} • ${escapeHtml(normalizeProjectStatus(p.status))} • ${p.published ? "Published" : "Draft"}</p>
            </div>
            <div style="display:flex;gap:4px;flex-shrink:0;align-items:center;">
              <button type="button" class="btn btn-outline btn-sm" data-pub-proj="${escapeHtml(p.id)}">${escapeHtml(p.published ? t("unpublishToggleBtn") : t("publishToggleBtn"))}</button>
              <button type="button" class="icon-btn" data-edit-proj="${escapeHtml(p.id)}" aria-label="${escapeHtml(t("edit"))}">✏️</button>
              <button type="button" class="icon-btn danger" data-del-proj="${escapeHtml(p.id)}" aria-label="${escapeHtml(t("delete"))}">🗑️</button>
            </div>
          </div>
        `
          )
          .join("")}
      `;

      document.getElementById("addProjBtn").addEventListener("click", () => openProjectEditor(null));
      body.querySelectorAll("[data-pub-proj]").forEach((b) =>
        b.addEventListener("click", async () => {
          const item = studioState.projects.find((x) => x.id === b.dataset.pubProj);
          if (!item) return;
          item.published = !item.published;
          if (Backend.isConfigured() && Backend.getStoredAuth()?.access_token) {
            try { await Backend.upsertProject(item); } catch (err) { showToast(err.message); return; }
          }
          saveState();
          renderScreen();
        })
      );
      body.querySelectorAll("[data-edit-proj]").forEach((b) =>
        b.addEventListener("click", () => openProjectEditor(studioState.projects.find((x) => x.id === b.dataset.editProj)))
      );
      body.querySelectorAll("[data-del-proj]").forEach((b) =>
        b.addEventListener("click", async () => {
          const id = b.dataset.delProj;
          if (Backend.isConfigured() && Backend.getStoredAuth()?.access_token) {
            try {
              await Backend.deleteProject(id);
            } catch (err) {
              showToast(err.message);
              return;
            }
          }
          studioState.projects = studioState.projects.filter((x) => x.id !== id);
          saveState();
          renderScreen();
        })
      );
    } else if (adminSection === "services") {
      body.innerHTML = `
        <button id="addSrvBtn" type="button" class="btn btn-primary btn-full">+ ${escapeHtml(t("addNew"))} — ${escapeHtml(t("adminTabServices"))}</button>
        ${studioState.services
          .sort((a, b) => (a.sortOrder || 0) - (b.sortOrder || 0))
          .map(
            (s) => `
          <div class="glass-card row-between">
            <div style="min-width:0;">
              <h3 class="card-title">${serviceIconGlyph(s.iconKey)} ${escapeHtml(isArabic() ? s.titleAr : s.titleEn)}</h3>
              <p class="muted-text">${escapeHtml(s.category)} • ${s.published ? "Published" : "Draft"}</p>
            </div>
            <div style="display:flex;gap:4px;flex-shrink:0;align-items:center;">
              <button type="button" class="btn btn-outline btn-sm" data-pub-srv="${escapeHtml(s.id)}">${escapeHtml(s.published ? t("unpublishToggleBtn") : t("publishToggleBtn"))}</button>
              <button type="button" class="icon-btn" data-edit-srv="${escapeHtml(s.id)}" aria-label="${escapeHtml(t("edit"))}">✏️</button>
              <button type="button" class="icon-btn danger" data-del-srv="${escapeHtml(s.id)}" aria-label="${escapeHtml(t("delete"))}">🗑️</button>
            </div>
          </div>
        `
          )
          .join("")}
      `;

      document.getElementById("addSrvBtn").addEventListener("click", () => openServiceEditor(null));
      body.querySelectorAll("[data-pub-srv]").forEach((b) =>
        b.addEventListener("click", async () => {
          const item = studioState.services.find((x) => x.id === b.dataset.pubSrv);
          if (!item) return;
          item.published = !item.published;
          if (Backend.isConfigured() && Backend.getStoredAuth()?.access_token) {
            try { await Backend.upsertService(item); } catch (err) { showToast(err.message); return; }
          }
          saveState();
          renderScreen();
        })
      );
      body.querySelectorAll("[data-edit-srv]").forEach((b) =>
        b.addEventListener("click", () => openServiceEditor(studioState.services.find((x) => x.id === b.dataset.editSrv)))
      );
      body.querySelectorAll("[data-del-srv]").forEach((b) =>
        b.addEventListener("click", async () => {
          const id = b.dataset.delSrv;
          if (Backend.isConfigured() && Backend.getStoredAuth()?.access_token) {
            try {
              await Backend.deleteService(id);
            } catch (err) {
              showToast(err.message);
              return;
            }
          }
          studioState.services = studioState.services.filter((x) => x.id !== id);
          saveState();
          renderScreen();
        })
      );
    } else if (adminSection === "team") {
      body.innerHTML = `
        <button id="addTeamBtn" type="button" class="btn btn-primary btn-full">+ ${escapeHtml(t("addNew"))} — ${escapeHtml(t("adminTabTeam"))}</button>
        ${studioState.team
          .map(
            (m) => `
          <div class="glass-card row-between">
            <div style="min-width:0;">
              <h3 class="card-title">${escapeHtml(isArabic() ? m.nameAr : m.nameEn)}</h3>
              <p class="muted-text">${escapeHtml(isArabic() ? m.roleAr : m.roleEn)} • ${m.published ? "Published" : "Draft"}</p>
            </div>
            <div style="display:flex;gap:4px;flex-shrink:0;align-items:center;">
              <button type="button" class="btn btn-outline btn-sm" data-pub-tm="${escapeHtml(m.id)}">${escapeHtml(m.published ? t("unpublishToggleBtn") : t("publishToggleBtn"))}</button>
              <button type="button" class="icon-btn" data-edit-tm="${escapeHtml(m.id)}" aria-label="${escapeHtml(t("edit"))}">✏️</button>
              <button type="button" class="icon-btn danger" data-del-tm="${escapeHtml(m.id)}" aria-label="${escapeHtml(t("delete"))}">🗑️</button>
            </div>
          </div>
        `
          )
          .join("")}
      `;

      document.getElementById("addTeamBtn").addEventListener("click", () => openTeamEditor(null));
      body.querySelectorAll("[data-pub-tm]").forEach((b) =>
        b.addEventListener("click", async () => {
          const item = studioState.team.find((x) => x.id === b.dataset.pubTm);
          if (!item) return;
          item.published = !item.published;
          if (Backend.isConfigured() && Backend.getStoredAuth()?.access_token) {
            try { await Backend.upsertTeamMember(item); } catch (err) { showToast(err.message); return; }
          }
          saveState();
          renderScreen();
        })
      );
      body.querySelectorAll("[data-edit-tm]").forEach((b) =>
        b.addEventListener("click", () => openTeamEditor(studioState.team.find((x) => x.id === b.dataset.editTm)))
      );
      body.querySelectorAll("[data-del-tm]").forEach((b) =>
        b.addEventListener("click", async () => {
          const id = b.dataset.delTm;
          if (Backend.isConfigured() && Backend.getStoredAuth()?.access_token) {
            try {
              await Backend.deleteTeamMember(id);
            } catch (err) {
              showToast(err.message);
              return;
            }
          }
          studioState.team = studioState.team.filter((x) => x.id !== id);
          saveState();
          renderScreen();
        })
      );
    } else if (adminSection === "knowledge") {
      const kbItems = (studioState.knowledgeBase || []).sort((a, b) => (a.sortOrder || 0) - (b.sortOrder || 0));
      const faqItems = (studioState.faqs || []).sort((a, b) => (a.sortOrder || 0) - (b.sortOrder || 0));
      body.innerHTML = `
        <div class="glass-card highlight-border stack-list">
          <div class="row-between">
            <div>
              <h2 class="card-title">📚 ${escapeHtml(t("adminKbTitle"))}</h2>
              <p class="muted-text" style="margin:4px 0 0;font-size:0.86rem;">${escapeHtml(t("adminKbDesc"))}</p>
            </div>
            <button id="addKbBtn" type="button" class="btn btn-primary btn-sm">+ ${escapeHtml(t("addNew"))}</button>
          </div>
          ${kbItems
            .map(
              (k) => `
            <div class="glass-card row-between">
              <div style="min-width:0;">
                <h3 class="card-title">${escapeHtml(isArabic() ? k.titleAr : k.titleEn)}</h3>
                <p class="muted-text" style="margin-top:4px;">${escapeHtml(k.topic)} • ${k.published !== false ? "Published" : "Draft"}</p>
              </div>
              <div style="display:flex;gap:4px;flex-shrink:0;">
                <button type="button" class="icon-btn" data-edit-kb="${escapeHtml(k.id)}" aria-label="${escapeHtml(t("edit"))}">✏️</button>
                <button type="button" class="icon-btn danger" data-del-kb="${escapeHtml(k.id)}" aria-label="${escapeHtml(t("delete"))}">🗑️</button>
              </div>
            </div>
          `
            )
            .join("")}
        </div>

        <div class="glass-card stack-list">
          <div class="row-between">
            <h2 class="card-title">❓ ${escapeHtml(t("adminFaqTitle"))}</h2>
            <button id="addFaqBtn" type="button" class="btn btn-outline btn-sm">+ ${escapeHtml(t("addNew"))}</button>
          </div>
          ${faqItems
            .map(
              (f) => `
            <div class="glass-card row-between">
              <div style="min-width:0;">
                <h3 class="card-title">${escapeHtml(isArabic() ? f.questionAr : f.questionEn)}</h3>
                <p class="muted-text" style="margin-top:4px;">${escapeHtml(f.category || "general")} • ${f.published !== false ? "Published" : "Draft"}</p>
              </div>
              <div style="display:flex;gap:4px;flex-shrink:0;">
                <button type="button" class="icon-btn" data-edit-faq="${escapeHtml(f.id)}" aria-label="${escapeHtml(t("edit"))}">✏️</button>
                <button type="button" class="icon-btn danger" data-del-faq="${escapeHtml(f.id)}" aria-label="${escapeHtml(t("delete"))}">🗑️</button>
              </div>
            </div>
          `
            )
            .join("")}
        </div>
      `;

      document.getElementById("addKbBtn").addEventListener("click", () => openKbEditor(null));
      body.querySelectorAll("[data-edit-kb]").forEach((b) =>
        b.addEventListener("click", () => openKbEditor((studioState.knowledgeBase || []).find((x) => x.id === b.dataset.editKb)))
      );
      body.querySelectorAll("[data-del-kb]").forEach((b) =>
        b.addEventListener("click", async () => {
          const id = b.dataset.delKb;
          if (Backend.isConfigured() && Backend.getStoredAuth()?.access_token) {
            try { await Backend.deleteKnowledgeItem(id); } catch (err) { showToast(err.message); return; }
          }
          studioState.knowledgeBase = (studioState.knowledgeBase || []).filter((x) => x.id !== id);
          saveState();
          renderScreen();
        })
      );

      document.getElementById("addFaqBtn").addEventListener("click", () => openFaqEditor(null));
      body.querySelectorAll("[data-edit-faq]").forEach((b) =>
        b.addEventListener("click", () => openFaqEditor((studioState.faqs || []).find((x) => x.id === b.dataset.editFaq)))
      );
      body.querySelectorAll("[data-del-faq]").forEach((b) =>
        b.addEventListener("click", async () => {
          const id = b.dataset.delFaq;
          if (Backend.isConfigured() && Backend.getStoredAuth()?.access_token) {
            try { await Backend.deleteFaq(id); } catch (err) { showToast(err.message); return; }
          }
          studioState.faqs = (studioState.faqs || []).filter((x) => x.id !== id);
          saveState();
          renderScreen();
        })
      );
    } else if (adminSection === "messages") {
      const mq = adminMsgSearch.trim().toLowerCase();
      const filteredMsgs = studioState.messages
        .filter((m) => adminMsgStatusFilter === "all" || (adminMsgStatusFilter === "replied" ? m.status === "replied" : m.status !== "replied"))
        .filter((m) => {
          if (!mq) return true;
          return `${m.senderName} ${m.email} ${m.subject} ${m.message}`.toLowerCase().includes(mq);
        });

      body.innerHTML = `
        <div class="glass-card stack-list">
          <div class="field">
            <input id="adminMsgSearchInput" type="search" value="${escapeHtml(adminMsgSearch)}" placeholder="${escapeHtml(t("msgSearchPlaceholder"))}" />
          </div>
          <div class="row-between">
            <div class="chips-scroll">
              <button type="button" class="chip-btn ${adminMsgStatusFilter === "all" ? "active" : ""}" data-mstat="all">${escapeHtml(t("msgFilterAll"))} (${studioState.messages.length})</button>
              <button type="button" class="chip-btn ${adminMsgStatusFilter === "new" ? "active" : ""}" data-mstat="new">${escapeHtml(t("msgFilterNew"))} (${unreadCount})</button>
              <button type="button" class="chip-btn ${adminMsgStatusFilter === "replied" ? "active" : ""}" data-mstat="replied">${escapeHtml(t("msgFilterReplied"))} (${studioState.messages.length - unreadCount})</button>
            </div>
            ${
              studioState.messages.length > 0
                ? `<button id="exportMsgsBtn" type="button" class="btn btn-outline btn-sm">📥 ${escapeHtml(t("exportMessagesBtn"))}</button>`
                : ""
            }
          </div>
        </div>
        ${
          filteredMsgs.length === 0
            ? `<div class="glass-card"><p class="muted-text" style="margin:0;">${escapeHtml(t("noReceivedMessages"))}</p></div>`
            : filteredMsgs
                .map((m) => {
                  const isReplied = m.status === "replied";
                  const mailtoHref = `mailto:${encodeURIComponent(m.email)}?subject=${encodeURIComponent(`Re: ${m.subject}`)}`;
                  return `
            <div class="glass-card stack-list ${!isReplied ? "highlight-border" : ""}">
              <div class="row-between">
                <div style="min-width:0;">
                  <h3 class="card-title">${escapeHtml(m.subject)}</h3>
                  <div style="color:var(--neon-cyan);font-size:0.86rem;word-break:break-word;">${escapeHtml(m.senderName)} • ${escapeHtml(m.email)}</div>
                </div>
                <span class="status-pill ${isReplied ? "success" : "warning"}"><span class="pill-dot"></span>${escapeHtml(isReplied ? t("messageStatusReplied") : t("messageStatusNew"))}</span>
              </div>
              <p class="muted-text" style="margin:0;white-space:pre-wrap;">${escapeHtml(m.message)}</p>
              <div class="btn-row">
                <button type="button" class="btn btn-outline btn-sm" data-view-msg="${escapeHtml(m.id)}">👁️ ${escapeHtml(t("viewDetails"))}</button>
                <a href="${mailtoHref}" class="btn btn-primary btn-sm" data-reply-client="${escapeHtml(m.id)}">✉️ ${escapeHtml(t("replyToClient"))}</a>
                ${!isReplied ? `<button type="button" class="btn btn-outline btn-sm" data-rep-msg="${escapeHtml(m.id)}">✓ ${escapeHtml(t("markReplied"))}</button>` : ""}
                <button type="button" class="icon-btn danger" data-del-msg="${escapeHtml(m.id)}" aria-label="${escapeHtml(t("delete"))}">🗑️</button>
              </div>
            </div>
          `;
                })
                .join("")
        }
      `;

      const msgSearchEl = document.getElementById("adminMsgSearchInput");
      if (msgSearchEl) {
        msgSearchEl.addEventListener("input", () => {
          adminMsgSearch = msgSearchEl.value;
          renderScreen();
        });
      }
      body.querySelectorAll("[data-mstat]").forEach((btn) => {
        btn.addEventListener("click", () => {
          adminMsgStatusFilter = btn.dataset.mstat;
          renderScreen();
        });
      });
      const exportBtn = document.getElementById("exportMsgsBtn");
      if (exportBtn) {
        exportBtn.addEventListener("click", () => {
          const textOut = studioState.messages
            .map((m) => `[${m.status}] ${m.createdAt} | ${m.senderName} <${m.email}>\nSubject: ${m.subject}\n${m.message}\n---`)
            .join("\n");
          const blob = new Blob([textOut], { type: "text/plain;charset=utf-8" });
          const a = document.createElement("a");
          a.href = URL.createObjectURL(blob);
          a.download = `vexora-messages-${new Date().toISOString().slice(0, 10)}.txt`;
          a.click();
          URL.revokeObjectURL(a.href);
          showToast(t("msgExportedToast"));
        });
      }

      body.querySelectorAll("[data-view-msg]").forEach((b) =>
        b.addEventListener("click", () => {
          const m = studioState.messages.find((x) => x.id === b.dataset.viewMsg);
          if (!m) return;
          openModal(
            m.subject,
            `
            <div style="color:var(--neon-cyan);font-size:0.9rem;">${escapeHtml(m.senderName)} • ${escapeHtml(m.email)}</div>
            <div class="muted-text" style="font-size:0.8rem;">${escapeHtml(new Date(m.createdAt).toLocaleString())}</div>
            <hr style="border:none;border-top:1px solid var(--subtle-outline);width:100%;" />
            <p style="margin:0;white-space:pre-wrap;">${escapeHtml(m.message)}</p>
          `
          );
        })
      );

      body.querySelectorAll("[data-reply-client]").forEach((link) =>
        link.addEventListener("click", async () => {
          const m = studioState.messages.find((x) => x.id === link.dataset.replyClient);
          if (!m) return;
          m.status = "replied";
          saveState();
          if (Backend.isConfigured() && Backend.getStoredAuth()?.access_token) {
            try { await Backend.updateMessageStatus(m.id, "replied"); } catch {}
          }
          setTimeout(() => renderScreen(), 250);
        })
      );

      body.querySelectorAll("[data-rep-msg]").forEach((b) =>
        b.addEventListener("click", async () => {
          const m = studioState.messages.find((x) => x.id === b.dataset.repMsg);
          if (!m) return;
          m.status = "replied";
          saveState();
          if (Backend.isConfigured() && Backend.getStoredAuth()?.access_token) {
            try { await Backend.updateMessageStatus(m.id, "replied"); } catch {}
          }
          renderScreen();
        })
      );

      body.querySelectorAll("[data-del-msg]").forEach((b) =>
        b.addEventListener("click", async () => {
          const id = b.dataset.delMsg;
          if (Backend.isConfigured() && Backend.getStoredAuth()?.access_token) {
            try {
              await Backend.deleteMessage(id);
            } catch (err) {
              showToast(err.message);
              return;
            }
          }
          studioState.messages = studioState.messages.filter((x) => x.id !== id);
          saveState();
          renderScreen();
        })
      );
    } else if (adminSection === "settings") {
      const s = studioState.settings;
      const cfg = Backend.getConfig();
      body.innerHTML = `
        <form id="settingsForm" class="glass-card highlight-border stack-list">
          <h2 class="card-title">${escapeHtml(t("settingsCompanyTitle"))}</h2>
          <div class="field"><label>Company Name</label><input id="setCompany" value="${escapeHtml(s.companyName)}" required /></div>
          <div class="form-two-col">
            <div class="field"><label>Tagline (EN)</label><input id="setTagEn" value="${escapeHtml(s.taglineEn)}" required /></div>
            <div class="field"><label>Tagline (AR)</label><input id="setTagAr" value="${escapeHtml(s.taglineAr)}" required /></div>
          </div>
          <div class="field"><label>Home Intro (EN)</label><textarea id="setDescEn" rows="2">${escapeHtml(s.homeDescEn)}</textarea></div>
          <div class="field"><label>Home Intro (AR)</label><textarea id="setDescAr" rows="2">${escapeHtml(s.homeDescAr)}</textarea></div>

          <h2 class="card-title" style="margin-top:8px;">${escapeHtml(t("settingsSocialTitle"))}</h2>
          <div class="form-two-col">
            <div class="field"><label>Official Email</label><input id="setEmail" type="email" value="${escapeHtml(s.officialEmail)}" /></div>
            <div class="field"><label>Website URL</label><input id="setWeb" value="${escapeHtml(s.websiteUrl)}" /></div>
          </div>
          <div class="form-two-col">
            <div class="field"><label>GitHub URL</label><input id="setGh" value="${escapeHtml(s.githubUrl)}" /></div>
            <div class="field"><label>LinkedIn URL</label><input id="setLi" value="${escapeHtml(s.linkedinUrl)}" /></div>
          </div>
          <div class="field"><label>YouTube URL</label><input id="setYt" value="${escapeHtml(s.youtubeUrl)}" /></div>

          <button type="submit" class="btn btn-primary btn-full">${escapeHtml(t("saveSettingsBtn"))}</button>
        </form>

        <form id="backendCfgForm" class="glass-card stack-list">
          <h2 class="card-title">${escapeHtml(t("settingsBackendTitle"))}</h2>
          <p class="muted-text" style="font-size:0.84rem;">${escapeHtml(t("settingsBackendHint"))}</p>
          <div class="field"><label>Supabase Project URL</label><input id="cfgSbUrl" placeholder="https://xxxx.supabase.co" value="${escapeHtml(cfg.supabaseUrl)}" /></div>
          <div class="field"><label>Supabase Public Anon Key</label><input id="cfgSbKey" placeholder="eyJ..." value="${escapeHtml(cfg.supabaseAnonKey)}" /></div>
          <div class="field"><label>AI Edge Function Name</label><input id="cfgAiFn" value="${escapeHtml(cfg.aiFunctionName)}" /></div>
          <div class="field"><label>${escapeHtml(t("aiEndpointUrlLabel"))}</label><input id="cfgAiUrl" placeholder="https://your-secure-proxy.workers.dev/vexora-ai" value="${escapeHtml(cfg.aiEndpointUrl || "")}" /></div>
          <div class="btn-row">
            <button type="submit" class="btn btn-outline">💾 Save Backend Config</button>
            <button id="cfgResetBtn" type="button" class="btn btn-text">Reset</button>
          </div>
        </form>
      `;

      document.getElementById("settingsForm").addEventListener("submit", async (e) => {
        e.preventDefault();
        const updated = {
          companyName: document.getElementById("setCompany").value.trim() || "Vexora Studio",
          taglineEn: document.getElementById("setTagEn").value.trim(),
          taglineAr: document.getElementById("setTagAr").value.trim(),
          homeDescEn: document.getElementById("setDescEn").value.trim(),
          homeDescAr: document.getElementById("setDescAr").value.trim(),
          officialEmail: document.getElementById("setEmail").value.trim(),
          websiteUrl: document.getElementById("setWeb").value.trim(),
          githubUrl: document.getElementById("setGh").value.trim(),
          linkedinUrl: document.getElementById("setLi").value.trim(),
          youtubeUrl: document.getElementById("setYt").value.trim()
        };
        if (Backend.isConfigured() && Backend.getStoredAuth()?.access_token) {
          try {
            await Backend.updateSiteSettings(updated);
          } catch (err) {
            showToast(err.message);
            return;
          }
        }
        studioState.settings = updated;
        saveState();
        showToast(t("settingsSavedToast"));
        renderAll();
      });

      document.getElementById("backendCfgForm").addEventListener("submit", async (e) => {
        e.preventDefault();
        Backend.savePublicConfigOverride({
          supabaseUrl: document.getElementById("cfgSbUrl").value,
          supabaseAnonKey: document.getElementById("cfgSbKey").value,
          aiFunctionName: document.getElementById("cfgAiFn").value,
          aiEndpointUrl: document.getElementById("cfgAiUrl").value
        });
        const check = await Backend.testConnection();
        dbSyncStatus = {
          tested: true,
          ok: check.ok,
          latencyMs: check.latencyMs || null,
          message: check.reason || ""
        };
        showToast(check.ok ? `${t("dbConnectedMsg")} (${check.latencyMs}ms)` : check.reason || t("settingsSavedToast"));
        renderScreen();
      });

      document.getElementById("cfgResetBtn").addEventListener("click", () => {
        Backend.clearPublicConfigOverride();
        Backend.signOutAdmin();
        renderScreen();
      });
    }
  }

  /* =========================================================
     MODALS & ADMIN EDITORS (with Real Image Upload)
     ========================================================= */
  function openModal(title, htmlContent) {
    document.getElementById("modalTitle").textContent = title;
    document.getElementById("modalBody").innerHTML = htmlContent;
    document.getElementById("modalBackdrop").hidden = false;
  }

  function closeModal() {
    document.getElementById("modalBackdrop").hidden = true;
  }

  function openServiceEditor(initial) {
    const item = initial || {
      id: `srv_${Date.now()}`,
      titleEn: "",
      titleAr: "",
      descriptionEn: "",
      descriptionAr: "",
      detailsEn: "",
      detailsAr: "",
      technologies: [],
      iconKey: "code",
      category: "engineering",
      sortOrder: studioState.services.length + 1,
      published: true
    };
    const iconOptions = ["web", "android", "code", "ai", "ai_link", "frontend", "backend", "database", "api", "custom", "uiux"];

    openModal(
      t("adminTabServices"),
      `
      <form id="srvEditor" class="stack-list">
        <div class="field"><label>Title (EN)</label><input id="eTitleEn" value="${escapeHtml(item.titleEn)}" required /></div>
        <div class="field"><label>Title (AR)</label><input id="eTitleAr" value="${escapeHtml(item.titleAr)}" required /></div>
        <div class="field"><label>Description (EN)</label><textarea id="eDescEn" rows="2" required>${escapeHtml(item.descriptionEn)}</textarea></div>
        <div class="field"><label>Description (AR)</label><textarea id="eDescAr" rows="2" required>${escapeHtml(item.descriptionAr)}</textarea></div>
        <div class="field"><label>Details (EN)</label><textarea id="eDetEn" rows="2">${escapeHtml(item.detailsEn || "")}</textarea></div>
        <div class="field"><label>Details (AR)</label><textarea id="eDetAr" rows="2">${escapeHtml(item.detailsAr || "")}</textarea></div>
        <div class="field"><label>Technologies (comma-separated)</label><input id="eTech" value="${escapeHtml((item.technologies || []).join(", "))}" /></div>
        <div class="form-two-col">
          <div class="field"><label>${escapeHtml(t("categoryLabel"))}</label>
            <select id="eCat">
              ${SERVICE_CATEGORIES.map((c) => `<option value="${c.key}" ${item.category === c.key ? "selected" : ""}>${c.en}</option>`).join("")}
            </select>
          </div>
          <div class="field"><label>Icon</label>
            <select id="eIcon">
              ${iconOptions.map((ik) => `<option value="${ik}" ${item.iconKey === ik ? "selected" : ""}>${serviceIconGlyph(ik)} ${ik}</option>`).join("")}
            </select>
          </div>
        </div>
        <div class="field"><label>Order</label><input id="eOrder" type="number" value="${item.sortOrder || 1}" /></div>
        <label class="checkbox-row"><input id="ePub" type="checkbox" ${item.published ? "checked" : ""} /> ${escapeHtml(t("publishedLabel"))}</label>
        <button type="submit" class="btn btn-primary btn-full">${escapeHtml(t("save"))}</button>
      </form>
    `
    );

    document.getElementById("srvEditor").addEventListener("submit", async (e) => {
      e.preventDefault();
      const updated = {
        ...item,
        titleEn: document.getElementById("eTitleEn").value.trim(),
        titleAr: document.getElementById("eTitleAr").value.trim(),
        descriptionEn: document.getElementById("eDescEn").value.trim(),
        descriptionAr: document.getElementById("eDescAr").value.trim(),
        detailsEn: document.getElementById("eDetEn").value.trim(),
        detailsAr: document.getElementById("eDetAr").value.trim(),
        technologies: document.getElementById("eTech").value.split(",").map((x) => x.trim()).filter(Boolean),
        category: document.getElementById("eCat").value,
        iconKey: document.getElementById("eIcon").value,
        sortOrder: Number(document.getElementById("eOrder").value || 1),
        published: document.getElementById("ePub").checked
      };
      if (Backend.isConfigured() && Backend.getStoredAuth()?.access_token) {
        try {
          await Backend.upsertService(updated);
        } catch (err) {
          showToast(err.message);
          return;
        }
      }
      const idx = studioState.services.findIndex((x) => x.id === item.id);
      if (idx >= 0) studioState.services[idx] = updated;
      else studioState.services.push(updated);
      saveState();
      closeModal();
      renderScreen();
    });
  }

  function openProjectEditor(initial) {
    const item = initial || {
      id: `proj_${Date.now()}`,
      nameEn: "",
      nameAr: "",
      descriptionEn: "",
      descriptionAr: "",
      category: "Websites",
      status: "In Progress",
      technologies: [],
      websiteUrl: "",
      imageUrl: "",
      presetImageKey: "web",
      featured: false,
      published: true
    };

    openModal(
      t("adminTabProjects"),
      `
      <form id="projEditor" class="stack-list">
        <div class="field"><label>Name (EN)</label><input id="pNameEn" value="${escapeHtml(item.nameEn)}" required /></div>
        <div class="field"><label>Name (AR)</label><input id="pNameAr" value="${escapeHtml(item.nameAr)}" required /></div>
        <div class="field"><label>Description (EN)</label><textarea id="pDescEn" rows="2" required>${escapeHtml(item.descriptionEn)}</textarea></div>
        <div class="field"><label>Description (AR)</label><textarea id="pDescAr" rows="2" required>${escapeHtml(item.descriptionAr)}</textarea></div>
        <div class="form-two-col">
          <div class="field"><label>${escapeHtml(t("categoryLabel"))}</label>
            <select id="pCat">
              ${PROJECT_CATEGORIES.map((c) => `<option value="${escapeHtml(c)}" ${item.category === c ? "selected" : ""}>${escapeHtml(c)}</option>`).join("")}
            </select>
          </div>
          <div class="field"><label>${escapeHtml(t("statusLabel"))}</label>
            <select id="pStatus">
              ${PROJECT_STATUSES.map((s) => `<option value="${escapeHtml(s)}" ${normalizeProjectStatus(item.status) === s ? "selected" : ""}>${escapeHtml(s)}</option>`).join("")}
            </select>
          </div>
        </div>
        <div class="field"><label>${escapeHtml(t("websiteUrlLabel"))}</label><input id="pUrl" placeholder="https://..." value="${escapeHtml(item.websiteUrl || "")}" /></div>
        <div class="field"><label>Technologies (comma-separated)</label><input id="pTech" value="${escapeHtml((item.technologies || []).join(", "))}" /></div>
        <div class="field">
          <label>${escapeHtml(t("uploadImageLabel"))}</label>
          <input id="pImgUrl" placeholder="https://... or upload below" value="${escapeHtml(item.imageUrl || "")}" />
          <input id="pImgFile" type="file" accept="image/*" style="margin-top:6px;" />
        </div>
        <label class="checkbox-row"><input id="pFeat" type="checkbox" ${item.featured ? "checked" : ""} /> ${escapeHtml(t("featuredLabel"))}</label>
        <label class="checkbox-row"><input id="pPub" type="checkbox" ${item.published ? "checked" : ""} /> ${escapeHtml(t("publishedLabel"))}</label>
        <button type="submit" class="btn btn-primary btn-full">${escapeHtml(t("save"))}</button>
      </form>
    `
    );

    document.getElementById("pImgFile").addEventListener("change", async (e) => {
      const file = e.target.files?.[0];
      if (!file) return;
      try {
        const uploadedUrl = await Backend.uploadImageFile(file, "projects");
        document.getElementById("pImgUrl").value = uploadedUrl;
        showToast(t("imageUploadedToast"));
      } catch (err) {
        showToast(err.message);
      }
    });

    document.getElementById("projEditor").addEventListener("submit", async (e) => {
      e.preventDefault();
      const updated = {
        ...item,
        nameEn: document.getElementById("pNameEn").value.trim(),
        nameAr: document.getElementById("pNameAr").value.trim(),
        descriptionEn: document.getElementById("pDescEn").value.trim(),
        descriptionAr: document.getElementById("pDescAr").value.trim(),
        category: document.getElementById("pCat").value,
        status: document.getElementById("pStatus").value,
        websiteUrl: document.getElementById("pUrl").value.trim(),
        imageUrl: document.getElementById("pImgUrl").value.trim(),
        technologies: document.getElementById("pTech").value.split(",").map((x) => x.trim()).filter(Boolean),
        featured: document.getElementById("pFeat").checked,
        published: document.getElementById("pPub").checked
      };
      if (Backend.isConfigured() && Backend.getStoredAuth()?.access_token) {
        try {
          await Backend.upsertProject(updated);
        } catch (err) {
          showToast(err.message);
          return;
        }
      }
      const idx = studioState.projects.findIndex((x) => x.id === item.id);
      if (idx >= 0) studioState.projects[idx] = updated;
      else studioState.projects.push(updated);
      saveState();
      closeModal();
      renderScreen();
    });
  }

  function openTeamEditor(initial) {
    const item = initial || {
      id: `tm_${Date.now()}`,
      nameEn: "",
      nameAr: "",
      specializationEn: "",
      specializationAr: "",
      roleEn: "",
      roleAr: "",
      bioEn: "",
      bioAr: "",
      skills: [],
      experienceYears: null,
      avatarUrl: "",
      githubUrl: "",
      linkedinUrl: "",
      published: true,
      sortOrder: studioState.team.length + 1
    };

    openModal(
      t("adminTabTeam"),
      `
      <form id="tmEditor" class="stack-list">
        <div class="field"><label>Name (EN)</label><input id="tNameEn" value="${escapeHtml(item.nameEn)}" required /></div>
        <div class="field"><label>Name (AR)</label><input id="tNameAr" value="${escapeHtml(item.nameAr)}" required /></div>
        <div class="field"><label>Specialization (EN)</label><input id="tSpecEn" value="${escapeHtml(item.specializationEn || "")}" /></div>
        <div class="field"><label>Specialization (AR)</label><input id="tSpecAr" value="${escapeHtml(item.specializationAr || "")}" /></div>
        <div class="field"><label>Job Title (EN)</label><input id="tRoleEn" value="${escapeHtml(item.roleEn)}" required /></div>
        <div class="field"><label>Job Title (AR)</label><input id="tRoleAr" value="${escapeHtml(item.roleAr)}" required /></div>
        <div class="field"><label>Bio (EN)</label><textarea id="tBioEn" rows="2" required>${escapeHtml(item.bioEn)}</textarea></div>
        <div class="field"><label>Bio (AR)</label><textarea id="tBioAr" rows="2" required>${escapeHtml(item.bioAr)}</textarea></div>
        <div class="field"><label>Skills (comma-separated)</label><input id="tSkills" value="${escapeHtml((item.skills || []).join(", "))}" /></div>
        <div class="field"><label>Experience Years (optional)</label><input id="tExp" type="number" min="0" value="${item.experienceYears ?? ""}" /></div>
        <div class="form-two-col">
          <div class="field"><label>GitHub URL (optional)</label><input id="tGh" value="${escapeHtml(item.githubUrl || "")}" /></div>
          <div class="field"><label>LinkedIn URL (optional)</label><input id="tLi" value="${escapeHtml(item.linkedinUrl || "")}" /></div>
        </div>
        <div class="field">
          <label>${escapeHtml(t("uploadImageLabel"))}</label>
          <input id="tImgUrl" placeholder="https://... or upload below" value="${escapeHtml(item.avatarUrl && !item.avatarUrl.startsWith("drawable:") ? item.avatarUrl : "")}" />
          <input id="tImgFile" type="file" accept="image/*" style="margin-top:6px;" />
        </div>
        <label class="checkbox-row"><input id="tPub" type="checkbox" ${item.published ? "checked" : ""} /> ${escapeHtml(t("publishedLabel"))}</label>
        <button type="submit" class="btn btn-primary btn-full">${escapeHtml(t("save"))}</button>
      </form>
    `
    );

    document.getElementById("tImgFile").addEventListener("change", async (e) => {
      const file = e.target.files?.[0];
      if (!file) return;
      try {
        const uploadedUrl = await Backend.uploadImageFile(file, "team");
        document.getElementById("tImgUrl").value = uploadedUrl;
        showToast(t("imageUploadedToast"));
      } catch (err) {
        showToast(err.message);
      }
    });

    document.getElementById("tmEditor").addEventListener("submit", async (e) => {
      e.preventDefault();
      const expRaw = document.getElementById("tExp").value.trim();
      const imgUrl = document.getElementById("tImgUrl").value.trim();
      const updated = {
        ...item,
        nameEn: document.getElementById("tNameEn").value.trim(),
        nameAr: document.getElementById("tNameAr").value.trim(),
        specializationEn: document.getElementById("tSpecEn").value.trim(),
        specializationAr: document.getElementById("tSpecAr").value.trim(),
        roleEn: document.getElementById("tRoleEn").value.trim(),
        roleAr: document.getElementById("tRoleAr").value.trim(),
        bioEn: document.getElementById("tBioEn").value.trim(),
        bioAr: document.getElementById("tBioAr").value.trim(),
        skills: document.getElementById("tSkills").value.split(",").map((x) => x.trim()).filter(Boolean),
        experienceYears: expRaw === "" ? null : Number(expRaw),
        githubUrl: document.getElementById("tGh").value.trim(),
        linkedinUrl: document.getElementById("tLi").value.trim(),
        avatarUrl: imgUrl || item.avatarUrl || "",
        published: document.getElementById("tPub").checked
      };
      if (Backend.isConfigured() && Backend.getStoredAuth()?.access_token) {
        try {
          await Backend.upsertTeamMember(updated);
        } catch (err) {
          showToast(err.message);
          return;
        }
      }
      const idx = studioState.team.findIndex((x) => x.id === item.id);
      if (idx >= 0) studioState.team[idx] = updated;
      else studioState.team.push(updated);
      saveState();
      closeModal();
      renderScreen();
    });
  }

  function openKbEditor(initial) {
    const item = initial || {
      id: `kb_${Date.now()}`,
      topic: "general",
      titleEn: "",
      titleAr: "",
      contentEn: "",
      contentAr: "",
      keywords: [],
      sortOrder: (studioState.knowledgeBase || []).length + 1,
      published: true
    };
    openModal(
      t("adminKbTitle"),
      `
      <form id="kbEditor" class="stack-list">
        <div class="form-two-col">
          <div class="field"><label>Topic</label><input id="kbTopic" value="${escapeHtml(item.topic)}" required /></div>
          <div class="field"><label>Order</label><input id="kbOrder" type="number" value="${item.sortOrder || 1}" /></div>
        </div>
        <div class="field"><label>Title (EN)</label><input id="kbTitleEn" value="${escapeHtml(item.titleEn)}" required /></div>
        <div class="field"><label>Title (AR)</label><input id="kbTitleAr" value="${escapeHtml(item.titleAr)}" required /></div>
        <div class="field"><label>Content (EN)</label><textarea id="kbBodyEn" rows="3" required>${escapeHtml(item.contentEn)}</textarea></div>
        <div class="field"><label>Content (AR)</label><textarea id="kbBodyAr" rows="3" required>${escapeHtml(item.contentAr)}</textarea></div>
        <div class="field"><label>Keywords (comma-separated)</label><input id="kbKeys" value="${escapeHtml((item.keywords || []).join(", "))}" /></div>
        <label class="checkbox-row"><input id="kbPub" type="checkbox" ${item.published !== false ? "checked" : ""} /> ${escapeHtml(t("publishedLabel"))}</label>
        <button type="submit" class="btn btn-primary btn-full">${escapeHtml(t("save"))}</button>
      </form>
    `
    );

    document.getElementById("kbEditor").addEventListener("submit", async (e) => {
      e.preventDefault();
      const updated = {
        ...item,
        topic: document.getElementById("kbTopic").value.trim() || "general",
        titleEn: document.getElementById("kbTitleEn").value.trim(),
        titleAr: document.getElementById("kbTitleAr").value.trim(),
        contentEn: document.getElementById("kbBodyEn").value.trim(),
        contentAr: document.getElementById("kbBodyAr").value.trim(),
        keywords: document.getElementById("kbKeys").value.split(",").map((x) => x.trim()).filter(Boolean),
        sortOrder: Number(document.getElementById("kbOrder").value || 1),
        published: document.getElementById("kbPub").checked
      };
      if (Backend.isConfigured() && Backend.getStoredAuth()?.access_token) {
        try { await Backend.upsertKnowledgeItem(updated); } catch (err) { showToast(err.message); return; }
      }
      if (!Array.isArray(studioState.knowledgeBase)) studioState.knowledgeBase = [];
      const idx = studioState.knowledgeBase.findIndex((x) => x.id === item.id);
      if (idx >= 0) studioState.knowledgeBase[idx] = updated;
      else studioState.knowledgeBase.push(updated);
      saveState();
      closeModal();
      renderScreen();
    });
  }

  function openFaqEditor(initial) {
    const item = initial || {
      id: `faq_${Date.now()}`,
      category: "general",
      questionEn: "",
      questionAr: "",
      answerEn: "",
      answerAr: "",
      sortOrder: (studioState.faqs || []).length + 1,
      published: true
    };
    openModal(
      t("adminFaqTitle"),
      `
      <form id="faqEditor" class="stack-list">
        <div class="form-two-col">
          <div class="field"><label>Category</label><input id="fqCat" value="${escapeHtml(item.category || "general")}" required /></div>
          <div class="field"><label>Order</label><input id="fqOrder" type="number" value="${item.sortOrder || 1}" /></div>
        </div>
        <div class="field"><label>Question (EN)</label><input id="fqQEn" value="${escapeHtml(item.questionEn)}" required /></div>
        <div class="field"><label>Question (AR)</label><input id="fqQAr" value="${escapeHtml(item.questionAr)}" required /></div>
        <div class="field"><label>Answer (EN)</label><textarea id="fqAEn" rows="3" required>${escapeHtml(item.answerEn)}</textarea></div>
        <div class="field"><label>Answer (AR)</label><textarea id="fqAAr" rows="3" required>${escapeHtml(item.answerAr)}</textarea></div>
        <label class="checkbox-row"><input id="fqPub" type="checkbox" ${item.published !== false ? "checked" : ""} /> ${escapeHtml(t("publishedLabel"))}</label>
        <button type="submit" class="btn btn-primary btn-full">${escapeHtml(t("save"))}</button>
      </form>
    `
    );

    document.getElementById("faqEditor").addEventListener("submit", async (e) => {
      e.preventDefault();
      const updated = {
        ...item,
        category: document.getElementById("fqCat").value.trim() || "general",
        questionEn: document.getElementById("fqQEn").value.trim(),
        questionAr: document.getElementById("fqQAr").value.trim(),
        answerEn: document.getElementById("fqAEn").value.trim(),
        answerAr: document.getElementById("fqAAr").value.trim(),
        sortOrder: Number(document.getElementById("fqOrder").value || 1),
        published: document.getElementById("fqPub").checked
      };
      if (Backend.isConfigured() && Backend.getStoredAuth()?.access_token) {
        try { await Backend.upsertFaq(updated); } catch (err) { showToast(err.message); return; }
      }
      if (!Array.isArray(studioState.faqs)) studioState.faqs = [];
      const idx = studioState.faqs.findIndex((x) => x.id === item.id);
      if (idx >= 0) studioState.faqs[idx] = updated;
      else studioState.faqs.push(updated);
      saveState();
      closeModal();
      renderScreen();
    });
  }

  /* =========================================================
     10. LEGAL SCREENS (Privacy & Terms)
     ========================================================= */
  function renderLegalScreen(root, type) {
    const headline = type === "privacy" ? t("privacyHeadline") : t("termsHeadline");
    const sections = type === "privacy" ? I18N[currentLang].privacySections : I18N[currentLang].termsSections;

    root.innerHTML = `
      <div>
        <h1 class="screen-title">${escapeHtml(headline)}</h1>
      </div>
      <div class="stack-list">
        ${(sections || [])
          .map(
            (sec) => `
          <div class="glass-card stack-list">
            <h2 class="card-title" style="color:var(--neon-cyan);">${escapeHtml(sec.title)}</h2>
            <p class="muted-text" style="margin:0;">${escapeHtml(sec.body)}</p>
          </div>
        `
          )
          .join("")}
      </div>
    `;
  }

  /* =========================================================
     11. PROFESSIONAL FOOTER
     ========================================================= */
  function renderFooter(root) {
    const settings = studioState.settings;
    const footerServices = studioState.services.filter((s) => s.published).slice(0, 5);
    const footerProjects = studioState.projects.filter((p) => p.published).slice(0, 4);

    const gh = safeHttpUrl(settings.githubUrl);
    const li = safeHttpUrl(settings.linkedinUrl);
    const yt = safeHttpUrl(settings.youtubeUrl);

    const footer = document.createElement("footer");
    footer.className = "site-footer";
    footer.innerHTML = `
      <div class="footer-grid footer-four">
        <div style="display:flex;flex-direction:column;gap:8px;">
          <div style="display:flex;align-items:center;gap:10px;">
            <img class="brand-svg" src="${STUDIO_IMAGES.logoBanner}" alt="Vexora Studio" loading="lazy" decoding="async" onerror="this.style.display='none'" />
            <div>
              <div class="brand-name">${escapeHtml(settings.companyName)}</div>
              <div class="brand-sub">${escapeHtml(settings.taglineEn)}</div>
            </div>
          </div>
          <p class="muted-text" style="font-size:0.85rem;">${escapeHtml(isArabic() ? settings.homeDescAr : settings.homeDescEn)}</p>
        </div>

        <div style="display:flex;flex-direction:column;gap:8px;">
          <div class="card-title" style="font-size:0.95rem;">${escapeHtml(t("footerQuickLinks"))}</div>
          <div class="footer-links">
            <button type="button" class="footer-link-btn" data-footer-go="home">${escapeHtml(t("navHome"))}</button>
            <button type="button" class="footer-link-btn" data-footer-go="about">${escapeHtml(t("navAbout"))}</button>
            <button type="button" class="footer-link-btn" data-footer-go="services">${escapeHtml(t("navServices"))}</button>
            <button type="button" class="footer-link-btn" data-footer-go="projects">${escapeHtml(t("navProjects"))}</button>
            <button type="button" class="footer-link-btn" data-footer-go="technologies">${escapeHtml(t("navTechnologies"))}</button>
            <button type="button" class="footer-link-btn" data-footer-go="team">${escapeHtml(t("navTeam"))}</button>
            <button type="button" class="footer-link-btn" data-footer-go="ai">${escapeHtml(t("navAi"))}</button>
            <button type="button" class="footer-link-btn" data-footer-go="contact">${escapeHtml(t("navContact"))}</button>
          </div>
        </div>

        <div style="display:flex;flex-direction:column;gap:8px;">
          <div class="card-title" style="font-size:0.95rem;">${escapeHtml(t("footerServicesTitle"))}</div>
          <div class="footer-links">
            ${footerServices
              .map(
                (s) =>
                  `<button type="button" class="footer-link-btn" data-footer-go="services">${escapeHtml(isArabic() ? s.titleAr.split(" (")[0] : s.titleEn)}</button>`
              )
              .join("")}
          </div>
          <div class="card-title" style="font-size:0.95rem;margin-top:6px;">${escapeHtml(t("footerProjectsTitle"))}</div>
          <div class="footer-links">
            ${footerProjects
              .map(
                (p) =>
                  `<button type="button" class="footer-link-btn" data-footer-go="projects">${escapeHtml(isArabic() ? p.nameAr : p.nameEn)}</button>`
              )
              .join("")}
          </div>
        </div>

        <div style="display:flex;flex-direction:column;gap:8px;">
          <div class="card-title" style="font-size:0.95rem;">${escapeHtml(t("footerSocialTitle"))}</div>
          ${settings.officialEmail ? `<a href="mailto:${escapeHtml(settings.officialEmail)}" style="color:var(--neon-cyan);font-size:0.86rem;text-decoration:none;word-break:break-all;">${escapeHtml(settings.officialEmail)}</a>` : ""}
          <div class="footer-links">
            ${gh ? `<a href="${escapeHtml(gh)}" target="_blank" rel="noopener noreferrer" class="footer-link-btn">GitHub ↗</a>` : ""}
            ${li ? `<a href="${escapeHtml(li)}" target="_blank" rel="noopener noreferrer" class="footer-link-btn">LinkedIn ↗</a>` : ""}
            ${yt ? `<a href="${escapeHtml(yt)}" target="_blank" rel="noopener noreferrer" class="footer-link-btn">YouTube ↗</a>` : ""}
            <a href="${APK_URL}" download="Vexora-Studio.apk" class="footer-link-btn">📲 APK</a>
          </div>
        </div>
      </div>

      <div class="footer-bottom">
        <span>${escapeHtml(t("footerRights"))}</span>
        <div class="footer-links">
          <button type="button" class="footer-link-btn" data-footer-go="privacy">${escapeHtml(t("privacyPolicy"))}</button>
          <button type="button" class="footer-link-btn" data-footer-go="terms">${escapeHtml(t("termsOfService"))}</button>
        </div>
      </div>
    `;

    footer.querySelectorAll("[data-footer-go]").forEach((btn) => {
      btn.addEventListener("click", () => navigate(btn.dataset.footerGo));
    });
    root.appendChild(footer);
  }

  /* =========================================================
     12. 3D EFFECTS (CPU/Battery Friendly on Mobile Devices)
     ========================================================= */
  function bind3DEffects(container) {
    const prefersReduced =
      window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const finePointer =
      window.matchMedia && window.matchMedia("(hover: hover) and (pointer: fine)").matches;
    if (prefersReduced) return;

    const cubeStage = document.getElementById("hero3dStage");
    if (cubeStage) {
      cubeStage.addEventListener("click", (e) => {
        e.stopPropagation();
        cubeStage.classList.toggle("boosted");
      });
    }

    if (!finePointer) return;

    container.querySelectorAll("[data-tilt-3d]").forEach((card) => {
      const strength = card.dataset.tilt3d === "subtle" ? 4.5 : 8;
      card.addEventListener("pointermove", (e) => {
        if (e.pointerType === "touch") return;
        const rect = card.getBoundingClientRect();
        if (!rect.width || !rect.height) return;
        const px = (e.clientX - rect.left) / rect.width;
        const py = (e.clientY - rect.top) / rect.height;
        const rx = (0.5 - py) * strength;
        const ry = (px - 0.5) * strength;
        card.style.setProperty("--mx", `${(px * 100).toFixed(1)}%`);
        card.style.setProperty("--my", `${(py * 100).toFixed(1)}%`);
        card.style.transform = `perspective(950px) rotateX(${rx.toFixed(2)}deg) rotateY(${ry.toFixed(2)}deg) translateZ(5px)`;
      });
      card.addEventListener("pointerleave", () => {
        card.style.transform = "";
      });
    });
  }

  /* =========================================================
     13. RENDER DISPATCH & BOOTSTRAP
     ========================================================= */
  function renderScreen() {
    const root = document.getElementById("screenContainer");
    switch (currentRoute) {
      case "about":
        renderAboutScreen(root);
        break;
      case "services":
        renderServicesScreen(root);
        break;
      case "projects":
        renderProjectsScreen(root);
        break;
      case "technologies":
        renderTechnologiesScreen(root);
        break;
      case "team":
        renderTeamScreen(root);
        break;
      case "ai":
        renderAiScreen(root);
        break;
      case "download":
        renderDownloadScreen(root);
        break;
      case "contact":
        renderContactScreen(root);
        break;
      case "admin":
        renderAdminScreen(root);
        break;
      case "privacy":
        renderLegalScreen(root, "privacy");
        break;
      case "terms":
        renderLegalScreen(root, "terms");
        break;
      default:
        renderHomeScreen(root);
        break;
    }
    renderFooter(root);
    bind3DEffects(root);
  }

  function renderAll() {
    renderChrome();
    renderScreen();
  }

  async function syncFromSupabaseIfConfigured() {
    if (!Backend.isConfigured()) return;
    try {
      const live = await Backend.fetchPublicCatalog();
      if (!live) return;
      if (live.settings) studioState.settings = { ...studioState.settings, ...live.settings };
      if (Array.isArray(live.services) && live.services.length > 0) studioState.services = live.services;
      if (Array.isArray(live.projects) && live.projects.length > 0) studioState.projects = live.projects;
      if (Array.isArray(live.team) && live.team.length > 0) studioState.team = live.team;
      if (Array.isArray(live.knowledgeBase) && live.knowledgeBase.length > 0) studioState.knowledgeBase = live.knowledgeBase;
      if (Array.isArray(live.faqs) && live.faqs.length > 0) studioState.faqs = live.faqs;
      dbSyncStatus = { tested: true, ok: true, latencyMs: null, message: "" };
      saveState();
      renderAll();
    } catch {
      // Keep local catalog gracefully if Supabase hasn't been seeded/reachable yet
    }
  }

  document.addEventListener("DOMContentLoaded", () => {
    const fav = document.getElementById("faviconLink");
    if (fav) fav.href = WEBSITE_LOGO;

    const topDlBtn = document.getElementById("topbarDownloadBtn");
    if (topDlBtn) topDlBtn.addEventListener("click", () => navigate("download"));

    document.getElementById("langToggleBtn").addEventListener("click", () => {
      currentLang = currentLang === "ar" ? "en" : "ar";
      localStorage.setItem("vexora_lang", currentLang);
      renderAll();
    });

    document.getElementById("brandHomeBtn").addEventListener("click", () => navigate("home"));
    document.getElementById("mobileMenuBtn").addEventListener("click", openDrawer);
    document.getElementById("drawerBackdrop").addEventListener("click", closeDrawer);

    document.getElementById("closeModalBtn").addEventListener("click", closeModal);
    document.getElementById("modalBackdrop").addEventListener("click", (e) => {
      if (e.target.id === "modalBackdrop") closeModal();
    });

    window.addEventListener("hashchange", () => {
      const next = normalizeRoute(window.location.hash.replace("#", ""));
      if (next && next !== currentRoute) {
        currentRoute = next;
        renderAll();
      }
    });

    renderAll();
    syncFromSupabaseIfConfigured();
  });
})();
