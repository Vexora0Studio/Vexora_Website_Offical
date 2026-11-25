const {
  initializeTestEnvironment,
  assertFails,
  assertSucceeds,
} = require("@firebase/rules-unit-testing");
const { test, before, after, beforeEach } = require("node:test");
const fs = require("node:fs");

let testEnv;
const PROJECT_ID = process.env.GCP_PROJECT || "demo-no-project";
const ADMIN_UID = "admin_vexora";
const ADMIN_EMAIL = "vexora0studio@gmail.com";
const ALICE_UID = "alice_123";
const BOB_UID = "bob_456";

const [emulatorHost, emulatorPortStr] = (process.env.FIRESTORE_EMULATOR_HOST || "127.0.0.1:8085").split(":");
const emulatorPort = parseInt(emulatorPortStr, 10);

function adminDb() {
  return testEnv.authenticatedContext(ADMIN_UID, {
    email: ADMIN_EMAIL,
    email_verified: true,
  }).firestore();
}

function spoofedAdminDb() {
  return testEnv.authenticatedContext("spoof_uid", {
    email: ADMIN_EMAIL,
    email_verified: false,
  }).firestore();
}

before(async () => {
  const rules = fs.readFileSync("./firestore.rules", "utf8");
  testEnv = await initializeTestEnvironment({
    projectId: PROJECT_ID,
    firestore: {
      rules,
      host: emulatorHost,
      port: emulatorPort,
    },
  });
});

after(async () => {
  if (testEnv) {
    await testEnv.cleanup();
  }
});

beforeEach(async () => {
  if (testEnv) {
    await testEnv.clearFirestore();
  }
});

test("Unauthenticated users cannot read or write any collection", async () => {
  const unauthDb = testEnv.unauthenticatedContext().firestore();
  await assertFails(unauthDb.collection("services").where("published", "==", true).get());
  await assertFails(unauthDb.collection("projects").where("published", "==", true).get());
  await assertFails(unauthDb.collection("job_applications").get());
  await assertFails(
    unauthDb.collection("contact_messages").doc("msg_1").set({
      userId: ALICE_UID,
      senderName: "Anon",
      email: "anon@example.com",
      subject: "Hi",
      message: "Hello world",
      status: "new",
      createdAt: new Date(Date.now() - 1000),
      updatedAt: new Date(Date.now() - 1000),
    })
  );
});

test("Spoofed admin email without email_verified is rejected", async () => {
  const spoofDb = spoofedAdminDb();
  const now = new Date(Date.now() - 1000);
  await assertFails(
    spoofDb.collection("services").doc("srv_1").set({
      titleEn: "AI",
      titleAr: "الذكاء الاصطناعي",
      descriptionEn: "AI engineering",
      descriptionAr: "تطوير حلول الذكاء الاصطناعي",
      iconKey: "ai",
      category: "ai",
      sortOrder: 1,
      published: true,
      createdAt: now,
      updatedAt: now,
    })
  );
});

test("Admin can CRUD services, projects, team_members, jobs, and site_stats; non-admin can only query published", async () => {
  const adm = adminDb();
  const alice = testEnv.authenticatedContext(ALICE_UID).firestore();
  const now = new Date(Date.now() - 5000);

  await assertSucceeds(
    adm.collection("services").doc("srv_web").set({
      titleEn: "Web Development",
      titleAr: "تطوير المواقع",
      descriptionEn: "Modern React & Cloud platforms",
      descriptionAr: "تطوير مواقع حديثة سريعة",
      iconKey: "web",
      category: "web",
      sortOrder: 1,
      published: true,
      createdAt: now,
      updatedAt: now,
    })
  );

  await assertSucceeds(
    adm.collection("services").doc("srv_draft").set({
      titleEn: "Draft Service",
      titleAr: "خدمة مسودة",
      descriptionEn: "Hidden",
      descriptionAr: "مخفية",
      iconKey: "code",
      category: "dev",
      sortOrder: 2,
      published: false,
      createdAt: now,
      updatedAt: now,
    })
  );

  // Non-admin filtered query succeeds; unfiltered query fails
  await assertSucceeds(alice.collection("services").where("published", "==", true).get());
  await assertFails(alice.collection("services").get());
  await assertFails(alice.collection("services").doc("srv_draft").get());
  await assertFails(alice.collection("services").doc("srv_web").update({ titleEn: "Hacked" }));

  // Admin partial update preserves createdAt
  await assertSucceeds(
    adm.collection("services").doc("srv_web").update({
      titleEn: "Web & Cloud Engineering",
      updatedAt: new Date(Date.now() - 1000),
    })
  );
  // Reject immutable createdAt tamper
  await assertFails(
    adm.collection("services").doc("srv_web").update({
      createdAt: new Date(Date.now() - 500),
      updatedAt: new Date(Date.now() - 500),
    })
  );
});

test("Job applications enforce PII isolation, pending initial status, and admin-only review", async () => {
  const adm = adminDb();
  const alice = testEnv.authenticatedContext(ALICE_UID).firestore();
  const bob = testEnv.authenticatedContext(BOB_UID).firestore();
  const now = new Date(Date.now() - 5000);

  await assertSucceeds(
    adm.collection("jobs").doc("job_android").set({
      titleEn: "Senior Android Engineer",
      titleAr: "مهندس أندرويد أول",
      departmentEn: "Mobile",
      departmentAr: "تطبيقات الجوال",
      descriptionEn: "Jetpack Compose & Kotlin",
      descriptionAr: "تطوير تطبيقات أندرويد الحديثة",
      locationEn: "Remote",
      locationAr: "عن بُعد",
      employmentType: "full_time",
      published: true,
      createdAt: now,
      updatedAt: now,
    })
  );

  // Reject self-accepted status on create
  await assertFails(
    alice.collection("job_applications").doc("app_bad").set({
      userId: ALICE_UID,
      jobId: "job_android",
      fullName: "Alice Dev",
      email: "alice@example.com",
      phone: "+966500000001",
      desiredRole: "Senior Android Engineer",
      experienceYears: 4,
      skills: "Kotlin, Compose, Firebase",
      cvFileName: "alice_cv.pdf",
      cvPdfBase64: "JVBERi0xLjQKMSAwIG9iago=",
      cvSizeBytes: 24,
      status: "accepted",
      createdAt: now,
      updatedAt: now,
    })
  );

  // Valid create succeeds
  await assertSucceeds(
    alice.collection("job_applications").doc("app_1").set({
      userId: ALICE_UID,
      jobId: "job_android",
      fullName: "Alice Dev",
      email: "alice@example.com",
      phone: "+966500000001",
      desiredRole: "Senior Android Engineer",
      experienceYears: 4,
      skills: "Kotlin, Compose, Firebase",
      cvFileName: "alice_cv.pdf",
      cvPdfBase64: "JVBERi0xLjQKMSAwIG9iago=",
      cvSizeBytes: 24,
      status: "pending",
      createdAt: now,
      updatedAt: now,
    })
  );

  // Bob cannot read or list Alice's PII application
  await assertFails(bob.collection("job_applications").doc("app_1").get());
  await assertFails(bob.collection("job_applications").get());
  await assertSucceeds(alice.collection("job_applications").where("userId", "==", ALICE_UID).get());

  // Admin can list all and accept application
  await assertSucceeds(adm.collection("job_applications").get());
  await assertSucceeds(
    adm.collection("job_applications").doc("app_1").update({
      status: "accepted",
      adminNote: "Great Compose portfolio",
      updatedAt: new Date(Date.now() - 1000),
    })
  );

  // Alice cannot modify status
  await assertFails(
    alice.collection("job_applications").doc("app_1").update({
      status: "rejected",
      updatedAt: new Date(Date.now() - 500),
    })
  );
});

test("Contact messages enforce PII isolation and reject shadow fields", async () => {
  const adm = adminDb();
  const alice = testEnv.authenticatedContext(ALICE_UID).firestore();
  const bob = testEnv.authenticatedContext(BOB_UID).firestore();
  const now = new Date(Date.now() - 3000);

  await assertSucceeds(
    alice.collection("contact_messages").doc("msg_1").set({
      userId: ALICE_UID,
      senderName: "Alice",
      email: "alice@example.com",
      subject: "New AI App",
      message: "We want Vexora Studio to build our Android & Web platform.",
      status: "new",
      createdAt: now,
      updatedAt: now,
    })
  );

  // Shadow field rejected
  await assertFails(
    alice.collection("contact_messages").doc("msg_shadow").set({
      userId: ALICE_UID,
      senderName: "Alice",
      email: "alice@example.com",
      subject: "Test",
      message: "Hello world!",
      status: "new",
      isVerified: true,
      createdAt: now,
      updatedAt: now,
    })
  );

  await assertFails(bob.collection("contact_messages").doc("msg_1").get());
  await assertSucceeds(alice.collection("contact_messages").where("userId", "==", ALICE_UID).get());
  await assertSucceeds(adm.collection("contact_messages").get());
  await assertSucceeds(
    adm.collection("contact_messages").doc("msg_1").update({
      status: "replied",
      updatedAt: new Date(Date.now() - 1000),
    })
  );
});

test("Projects and team members enforce valid IDs and schema", async () => {
  const adm = adminDb();
  const alice = testEnv.authenticatedContext(ALICE_UID).firestore();
  const now = new Date(Date.now() - 3000);

  // Ghost @DocumentId `id` field rejected
  await assertFails(
    adm.collection("projects").doc("proj_1").set({
      id: "proj_1",
      nameEn: "Vexora Cloud",
      nameAr: "فيكسورا كلاود",
      descriptionEn: "Cloud analytics",
      descriptionAr: "تحليلات سحابية",
      imageUrl: "",
      presetImageKey: "web",
      websiteUrl: "https://vexora.studio",
      technologies: ["React", "TypeScript"],
      status: "available",
      featured: true,
      published: true,
      createdAt: now,
      updatedAt: now,
    })
  );

  await assertSucceeds(
    adm.collection("projects").doc("proj_1").set({
      nameEn: "Vexora Cloud",
      nameAr: "فيكسورا كلاود",
      descriptionEn: "Cloud analytics",
      descriptionAr: "تحليلات سحابية",
      imageUrl: "",
      presetImageKey: "web",
      websiteUrl: "https://vexora.studio",
      technologies: ["React", "TypeScript"],
      status: "available",
      featured: true,
      published: true,
      createdAt: now,
      updatedAt: now,
    })
  );

  await assertSucceeds(
    adm.collection("team_members").doc("tm_1").set({
      nameEn: "Tariq Al-Mansoor",
      nameAr: "طارق المنصور",
      roleEn: "Lead AI Architect",
      roleAr: "كبير مهندسي الذكاء الاصطناعي",
      bioEn: "Leads Gemini & cloud engineering.",
      bioAr: "يقود هندسة الذكاء الاصطناعي والأنظمة السحابية.",
      skills: ["Kotlin", "Gemini AI", "Cloud"],
      experienceYears: 8,
      avatarUrl: "",
      cvSummaryEn: "8+ years building scalable AI & Android systems.",
      cvSummaryAr: "خبرة تتجاوز 8 سنوات في بناء أنظمة الذكاء الاصطناعي وتطبيقات أندرويد.",
      published: true,
      createdAt: now,
      updatedAt: now,
    })
  );

  await assertSucceeds(alice.collection("projects").where("published", "==", true).get());
  await assertSucceeds(alice.collection("team_members").where("published", "==", true).get());
});

test("Site owner omarmotaz.develepor@gmail.com has full Admin and CV operations access when email_verified is true", async () => {
  const OWNER_EMAIL = "omarmotaz.develepor@gmail.com";
  const ownerDb = testEnv.authenticatedContext("owner_omar", {
    email: OWNER_EMAIL,
    email_verified: true,
  }).firestore();
  const unverifiedOwnerDb = testEnv.authenticatedContext("owner_unverified", {
    email: OWNER_EMAIL,
    email_verified: false,
  }).firestore();
  const alice = testEnv.authenticatedContext(ALICE_UID).firestore();
  const now = new Date(Date.now() - 3000);

  // Unverified owner email must be denied
  await assertFails(
    unverifiedOwnerDb.collection("services").doc("srv_unverified").set({
      titleEn: "Test",
      titleAr: "اختبار",
      descriptionEn: "Desc",
      descriptionAr: "وصف",
      iconKey: "code",
      category: "web",
      sortOrder: 1,
      published: true,
      createdAt: now,
      updatedAt: now,
    })
  );

  // Alice submits a job application with PDF CV
  await assertSucceeds(
    alice.collection("job_applications").doc("app_cv_1").set({
      userId: ALICE_UID,
      fullName: "Alice Candidate",
      email: "alice@example.com",
      phone: "+201000000001",
      desiredRole: "Android Engineer",
      experienceYears: 3,
      skills: "Kotlin, Compose",
      cvFileName: "alice_resume.pdf",
      cvPdfBase64: "JVBERi0xLjQKMSAwIG9iago=",
      cvSizeBytes: 24,
      status: "pending",
      createdAt: now,
      updatedAt: now,
    })
  );

  // Verified owner omar_develepor can manage team member CVs
  await assertSucceeds(
    ownerDb.collection("team_members").doc("tm_omar_ceo").set({
      nameEn: "omar_develepor",
      nameAr: "omar_develepor",
      roleEn: "Site Owner & Chief Executive Officer (CEO)",
      roleAr: "مالك الموقع والمدير التنفيذي (CEO)",
      bioEn: "Owner & CEO of Vexora Studio",
      bioAr: "مالك الموقع والمدير التنفيذي في Vexora Studio",
      skills: ["Python", "C++", "Java", "Kotlin"],
      experienceYears: 10,
      avatarUrl: "drawable:omar_develepor",
      cvSummaryEn: "Site Owner & CEO CV summary.",
      cvSummaryAr: "ملخص السيرة الذاتية لمالك الموقع.",
      cvFileName: "omar_cv.pdf",
      cvPdfBase64: "JVBERi0xLjQKMSAwIG9iago=",
      published: true,
      createdAt: now,
      updatedAt: now,
    })
  );

  // Verified owner can list/read all candidate CVs, accept/reject, and delete applications
  await assertSucceeds(ownerDb.collection("job_applications").get());
  await assertSucceeds(
    ownerDb.collection("job_applications").doc("app_cv_1").update({
      status: "accepted",
      adminNote: "Approved by omar_develepor",
      updatedAt: new Date(Date.now() - 1000),
    })
  );
  await assertSucceeds(ownerDb.collection("job_applications").doc("app_cv_1").delete());

  // Verified owner can perform Admin CRUD on services
  await assertSucceeds(
    ownerDb.collection("services").doc("srv_owner").set({
      titleEn: "Enterprise AI",
      titleAr: "الذكاء الاصطناعي للمؤسسات",
      descriptionEn: "Custom AI platforms",
      descriptionAr: "منصات ذكاء اصطناعي مخصصة",
      iconKey: "ai",
      category: "ai",
      sortOrder: 1,
      published: true,
      createdAt: now,
      updatedAt: now,
    })
  );
});

