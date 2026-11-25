package com.example.data

import android.content.Context
import com.example.R
import com.example.model.ContactMessage
import com.example.model.JobApplication
import com.example.model.JobOpening
import com.example.model.ProjectItem
import com.example.model.ServiceItem
import com.example.model.SiteStats
import com.example.model.TeamMember
import com.google.firebase.Firebase
import com.google.firebase.Timestamp
import com.google.firebase.auth.FirebaseAuth
import com.google.firebase.auth.auth
import com.google.firebase.firestore.DocumentSnapshot
import com.google.firebase.firestore.FieldValue
import com.google.firebase.firestore.FirebaseFirestore
import com.google.firebase.firestore.snapshots
import com.example.util.isAdminAccount
import kotlinx.coroutines.CancellationException
import kotlinx.coroutines.flow.Flow
import kotlinx.coroutines.flow.catch
import kotlinx.coroutines.flow.emitAll
import kotlinx.coroutines.flow.flow
import kotlinx.coroutines.flow.map
import kotlinx.coroutines.tasks.await

class StudioRepository(
    private val db: FirebaseFirestore,
    private val auth: FirebaseAuth = Firebase.auth
) {
    constructor(context: Context) : this(
        FirebaseFirestore.getInstance(
            context.applicationContext.getString(R.string.firestore_database_id)
        )
    )

    private val removedDefaultProjectIds = setOf(
        "proj_vexora_cloud",
        "proj_nova_pay",
        "proj_aether_ai"
    )

    private val removedDefaultTeamIds = setOf(
        "tm_tariq",
        "tm_layla"
    )

    private fun requireUserId(): String {
        return auth.currentUser?.uid
            ?: throw IllegalStateException("User must be signed in with Google.")
    }

    suspend fun checkIsAdmin(uid: String, email: String?, emailVerified: Boolean): Boolean {
        if (isAdminAccount(email, emailVerified)) {
            return true
        }
        return try {
            val snap = db.collection("admins").document(uid).get().await()
            snap.exists()
        } catch (_: Exception) {
            false
        }
    }

    // --- REALTIME OBSERVATION FLOWS ---

    fun observeServices(isAdmin: Boolean): Flow<List<ServiceItem>> = flow {
        requireUserId()
        val query = if (isAdmin) db.collection("services")
        else db.collection("services").whereEqualTo("published", true)

        emitAll(
            query.snapshots()
                .map { snap ->
                    snap.toObjects(ServiceItem::class.java, DocumentSnapshot.ServerTimestampBehavior.ESTIMATE)
                        .sortedBy { it.sortOrder }
                }
                .catch { error ->
                    logStreamError(error, "services")
                    throw error
                }
        )
    }

    fun observeProjects(isAdmin: Boolean): Flow<List<ProjectItem>> = flow {
        requireUserId()
        val query = if (isAdmin) db.collection("projects")
        else db.collection("projects").whereEqualTo("published", true)

        emitAll(
            query.snapshots()
                .map { snap ->
                    snap.toObjects(ProjectItem::class.java, DocumentSnapshot.ServerTimestampBehavior.ESTIMATE)
                        .filterNot { it.id in removedDefaultProjectIds }
                        .sortedWith(compareByDescending<ProjectItem> { it.featured }.thenByDescending { it.id == "proj_f_cutus" })
                }
                .catch { error ->
                    logStreamError(error, "projects")
                    throw error
                }
        )
    }

    fun observeTeamMembers(isAdmin: Boolean): Flow<List<TeamMember>> = flow {
        requireUserId()
        val query = if (isAdmin) db.collection("team_members")
        else db.collection("team_members").whereEqualTo("published", true)

        emitAll(
            query.snapshots()
                .map { snap ->
                    snap.toObjects(TeamMember::class.java, DocumentSnapshot.ServerTimestampBehavior.ESTIMATE)
                        .filterNot { it.id in removedDefaultTeamIds }
                        .sortedByDescending { it.experienceYears }
                }
                .catch { error ->
                    logStreamError(error, "team_members")
                    throw error
                }
        )
    }

    fun observeJobs(isAdmin: Boolean): Flow<List<JobOpening>> = flow {
        requireUserId()
        val query = if (isAdmin) db.collection("jobs")
        else db.collection("jobs").whereEqualTo("published", true)

        emitAll(
            query.snapshots()
                .map { snap ->
                    snap.toObjects(JobOpening::class.java, DocumentSnapshot.ServerTimestampBehavior.ESTIMATE)
                        .sortedByDescending { it.createdAt ?: Timestamp(0, 0) }
                }
                .catch { error ->
                    logStreamError(error, "jobs")
                    throw error
                }
        )
    }

    fun observeSiteStats(isAdmin: Boolean): Flow<SiteStats> = flow {
        requireUserId()
        val query = if (isAdmin) db.collection("site_stats")
        else db.collection("site_stats").whereEqualTo("published", true)

        emitAll(
            query.snapshots()
                .map { snap ->
                    snap.toObjects(SiteStats::class.java, DocumentSnapshot.ServerTimestampBehavior.ESTIMATE)
                        .firstOrNull() ?: SiteStats(id = "overview")
                }
                .catch { error ->
                    logStreamError(error, "site_stats")
                    throw error
                }
        )
    }

    fun observeJobApplications(isAdmin: Boolean, userId: String): Flow<List<JobApplication>> = flow {
        requireUserId()
        val query = if (isAdmin) db.collection("job_applications")
        else db.collection("job_applications").whereEqualTo("userId", userId)

        emitAll(
            query.snapshots()
                .map { snap ->
                    snap.toObjects(JobApplication::class.java, DocumentSnapshot.ServerTimestampBehavior.ESTIMATE)
                        .sortedByDescending { it.createdAt ?: Timestamp(0, 0) }
                }
                .catch { error ->
                    logStreamError(error, "job_applications")
                    throw error
                }
        )
    }

    fun observeContactMessages(isAdmin: Boolean, userId: String): Flow<List<ContactMessage>> = flow {
        requireUserId()
        val query = if (isAdmin) db.collection("contact_messages")
        else db.collection("contact_messages").whereEqualTo("userId", userId)

        emitAll(
            query.snapshots()
                .map { snap ->
                    snap.toObjects(ContactMessage::class.java, DocumentSnapshot.ServerTimestampBehavior.ESTIMATE)
                        .sortedByDescending { it.createdAt ?: Timestamp(0, 0) }
                }
                .catch { error ->
                    logStreamError(error, "contact_messages")
                    throw error
                }
        )
    }

    private fun logStreamError(error: Throwable, path: String) {
        if (error is CancellationException && error.cause == null) return
        if (auth.currentUser != null) {
            handleFirestoreError(error, OperationType.LIST, path)
        }
    }

    // --- VISITOR MUTATIONS ---

    suspend fun submitJobApplication(
        jobId: String?,
        fullName: String,
        email: String,
        phone: String,
        desiredRole: String,
        experienceYears: Long,
        skills: String,
        cvFileName: String,
        cvPdfBase64: String,
        cvSizeBytes: Long
    ): Result<Unit> {
        var docPath = "job_applications"
        return try {
            val uid = requireUserId()
            require(fullName.trim().length in 2..120) { "Invalid full name length" }
            require(email.trim().length in 5..150) { "Invalid email length" }
            require(phone.trim().length in 5..40) { "Invalid phone length" }
            require(desiredRole.trim().length in 2..120) { "Invalid role" }
            require(skills.trim().length in 2..600) { "Invalid skills" }
            require(cvPdfBase64.length in 10..900_000) { "Invalid PDF attachment" }
            require(cvSizeBytes in 1..700_000) { "PDF exceeds size limit" }

            val docRef = db.collection("job_applications").document()
            docPath = docRef.path
            val raw: Map<String, Any?> = mapOf(
                "userId" to uid,
                "jobId" to jobId?.takeIf { it.isNotBlank() },
                "fullName" to fullName.trim(),
                "email" to email.trim(),
                "phone" to phone.trim(),
                "desiredRole" to desiredRole.trim(),
                "experienceYears" to experienceYears.coerceIn(0L, 60L),
                "skills" to skills.trim(),
                "cvFileName" to cvFileName.trim().take(150),
                "cvPdfBase64" to cvPdfBase64,
                "cvSizeBytes" to cvSizeBytes,
                "status" to "pending",
                "createdAt" to FieldValue.serverTimestamp(),
                "updatedAt" to FieldValue.serverTimestamp()
            )
            @Suppress("UNCHECKED_CAST")
            docRef.set(raw.filterValues { it != null } as Map<String, Any>).await()
            Result.success(Unit)
        } catch (e: CancellationException) {
            throw e
        } catch (e: Exception) {
            handleFirestoreError(e, OperationType.CREATE, docPath)
            Result.failure(e)
        }
    }

    suspend fun submitContactMessage(
        senderName: String,
        email: String,
        subject: String,
        message: String
    ): Result<Unit> {
        var docPath = "contact_messages"
        return try {
            val uid = requireUserId()
            require(senderName.trim().length in 2..120) { "Invalid name" }
            require(email.trim().length in 5..150) { "Invalid email" }
            require(subject.trim().length in 2..150) { "Invalid subject" }
            require(message.trim().length in 5..2000) { "Invalid message" }

            val docRef = db.collection("contact_messages").document()
            docPath = docRef.path
            val payload = mapOf(
                "userId" to uid,
                "senderName" to senderName.trim(),
                "email" to email.trim(),
                "subject" to subject.trim(),
                "message" to message.trim(),
                "status" to "new",
                "createdAt" to FieldValue.serverTimestamp(),
                "updatedAt" to FieldValue.serverTimestamp()
            )
            docRef.set(payload).await()
            Result.success(Unit)
        } catch (e: CancellationException) {
            throw e
        } catch (e: Exception) {
            handleFirestoreError(e, OperationType.CREATE, docPath)
            Result.failure(e)
        }
    }

    // --- ADMIN MUTATIONS ---

    suspend fun saveService(service: ServiceItem): Result<Unit> {
        val isNew = service.id.isBlank()
        val docRef = if (isNew) db.collection("services").document() else db.collection("services").document(service.id)
        return try {
            requireUserId()
            if (isNew) {
                docRef.set(service.toCreateMap()).await()
            } else {
                docRef.update(
                    mapOf(
                        "titleEn" to service.titleEn.trim(),
                        "titleAr" to service.titleAr.trim(),
                        "descriptionEn" to service.descriptionEn.trim(),
                        "descriptionAr" to service.descriptionAr.trim(),
                        "iconKey" to service.iconKey.trim(),
                        "category" to service.category.trim(),
                        "sortOrder" to service.sortOrder,
                        "published" to service.published,
                        "updatedAt" to FieldValue.serverTimestamp()
                    )
                ).await()
            }
            Result.success(Unit)
        } catch (e: CancellationException) {
            throw e
        } catch (e: Exception) {
            handleFirestoreError(e, if (isNew) OperationType.CREATE else OperationType.UPDATE, docRef.path)
            Result.failure(e)
        }
    }

    suspend fun deleteService(serviceId: String): Result<Unit> =
        deleteDoc("services", serviceId)

    suspend fun saveProject(project: ProjectItem): Result<Unit> {
        val isNew = project.id.isBlank()
        val docRef = if (isNew) db.collection("projects").document() else db.collection("projects").document(project.id)
        return try {
            requireUserId()
            if (isNew) {
                docRef.set(project.toCreateMap()).await()
            } else {
                docRef.update(
                    mapOf(
                        "nameEn" to project.nameEn.trim(),
                        "nameAr" to project.nameAr.trim(),
                        "descriptionEn" to project.descriptionEn.trim(),
                        "descriptionAr" to project.descriptionAr.trim(),
                        "imageUrl" to project.imageUrl.trim(),
                        "presetImageKey" to project.presetImageKey.trim().ifBlank { "web" },
                        "websiteUrl" to project.websiteUrl.trim(),
                        "technologies" to project.technologies.map { it.trim() }.filter { it.isNotEmpty() }.take(15),
                        "status" to project.status,
                        "featured" to project.featured,
                        "published" to project.published,
                        "updatedAt" to FieldValue.serverTimestamp()
                    )
                ).await()
            }
            Result.success(Unit)
        } catch (e: CancellationException) {
            throw e
        } catch (e: Exception) {
            handleFirestoreError(e, if (isNew) OperationType.CREATE else OperationType.UPDATE, docRef.path)
            Result.failure(e)
        }
    }

    suspend fun deleteProject(projectId: String): Result<Unit> =
        deleteDoc("projects", projectId)

    suspend fun saveTeamMember(member: TeamMember): Result<Unit> {
        val isNew = member.id.isBlank()
        val docRef = if (isNew) db.collection("team_members").document() else db.collection("team_members").document(member.id)
        return try {
            requireUserId()
            if (isNew) {
                docRef.set(member.toCreateMap()).await()
            } else {
                val raw: Map<String, Any?> = mapOf(
                    "nameEn" to member.nameEn.trim(),
                    "nameAr" to member.nameAr.trim(),
                    "roleEn" to member.roleEn.trim(),
                    "roleAr" to member.roleAr.trim(),
                    "bioEn" to member.bioEn.trim(),
                    "bioAr" to member.bioAr.trim(),
                    "skills" to member.skills.map { it.trim() }.filter { it.isNotEmpty() }.take(20),
                    "experienceYears" to member.experienceYears.coerceIn(0L, 60L),
                    "avatarUrl" to member.avatarUrl.trim(),
                    "cvSummaryEn" to member.cvSummaryEn.trim(),
                    "cvSummaryAr" to member.cvSummaryAr.trim(),
                    "cvFileName" to member.cvFileName?.trim()?.takeIf { it.isNotEmpty() },
                    "cvPdfBase64" to member.cvPdfBase64?.takeIf { it.isNotEmpty() },
                    "published" to member.published,
                    "updatedAt" to FieldValue.serverTimestamp()
                )
                @Suppress("UNCHECKED_CAST")
                docRef.update(raw.filterValues { it != null } as Map<String, Any>).await()
            }
            Result.success(Unit)
        } catch (e: CancellationException) {
            throw e
        } catch (e: Exception) {
            handleFirestoreError(e, if (isNew) OperationType.CREATE else OperationType.UPDATE, docRef.path)
            Result.failure(e)
        }
    }

    suspend fun deleteTeamMember(memberId: String): Result<Unit> =
        deleteDoc("team_members", memberId)

    suspend fun saveJob(job: JobOpening): Result<Unit> {
        val isNew = job.id.isBlank()
        val docRef = if (isNew) db.collection("jobs").document() else db.collection("jobs").document(job.id)
        return try {
            requireUserId()
            if (isNew) {
                docRef.set(job.toCreateMap()).await()
            } else {
                docRef.update(
                    mapOf(
                        "titleEn" to job.titleEn.trim(),
                        "titleAr" to job.titleAr.trim(),
                        "departmentEn" to job.departmentEn.trim(),
                        "departmentAr" to job.departmentAr.trim(),
                        "descriptionEn" to job.descriptionEn.trim(),
                        "descriptionAr" to job.descriptionAr.trim(),
                        "locationEn" to job.locationEn.trim(),
                        "locationAr" to job.locationAr.trim(),
                        "employmentType" to job.employmentType,
                        "published" to job.published,
                        "updatedAt" to FieldValue.serverTimestamp()
                    )
                ).await()
            }
            Result.success(Unit)
        } catch (e: CancellationException) {
            throw e
        } catch (e: Exception) {
            handleFirestoreError(e, if (isNew) OperationType.CREATE else OperationType.UPDATE, docRef.path)
            Result.failure(e)
        }
    }

    suspend fun deleteJob(jobId: String): Result<Unit> =
        deleteDoc("jobs", jobId)

    suspend fun updateApplicationStatus(
        applicationId: String,
        status: String,
        adminNote: String?
    ): Result<Unit> {
        val docRef = db.collection("job_applications").document(applicationId)
        return try {
            requireUserId()
            val raw: Map<String, Any?> = mapOf(
                "status" to status,
                "adminNote" to adminNote?.trim()?.takeIf { it.isNotEmpty() },
                "updatedAt" to FieldValue.serverTimestamp()
            )
            @Suppress("UNCHECKED_CAST")
            docRef.update(raw.filterValues { it != null } as Map<String, Any>).await()
            Result.success(Unit)
        } catch (e: CancellationException) {
            throw e
        } catch (e: Exception) {
            handleFirestoreError(e, OperationType.UPDATE, docRef.path)
            Result.failure(e)
        }
    }

    suspend fun deleteApplication(applicationId: String): Result<Unit> =
        deleteDoc("job_applications", applicationId)

    suspend fun updateContactMessageStatus(messageId: String, status: String): Result<Unit> {
        val docRef = db.collection("contact_messages").document(messageId)
        return try {
            requireUserId()
            docRef.update(
                mapOf(
                    "status" to status,
                    "updatedAt" to FieldValue.serverTimestamp()
                )
            ).await()
            Result.success(Unit)
        } catch (e: CancellationException) {
            throw e
        } catch (e: Exception) {
            handleFirestoreError(e, OperationType.UPDATE, docRef.path)
            Result.failure(e)
        }
    }

    suspend fun deleteContactMessage(messageId: String): Result<Unit> =
        deleteDoc("contact_messages", messageId)

    suspend fun saveSiteStats(stats: SiteStats): Result<Unit> {
        val docRef = db.collection("site_stats").document("overview")
        return try {
            requireUserId()
            val existing = docRef.get().await()
            if (existing.exists()) {
                docRef.update(
                    mapOf(
                        "projectsDelivered" to stats.projectsDelivered.coerceIn(0L, 100_000L),
                        "happyClients" to stats.happyClients.coerceIn(0L, 100_000L),
                        "teamExperts" to stats.teamExperts.coerceIn(0L, 10_000L),
                        "yearsExperience" to stats.yearsExperience.coerceIn(0L, 200L),
                        "published" to true,
                        "updatedAt" to FieldValue.serverTimestamp()
                    )
                ).await()
            } else {
                docRef.set(
                    mapOf(
                        "projectsDelivered" to stats.projectsDelivered.coerceIn(0L, 100_000L),
                        "happyClients" to stats.happyClients.coerceIn(0L, 100_000L),
                        "teamExperts" to stats.teamExperts.coerceIn(0L, 10_000L),
                        "yearsExperience" to stats.yearsExperience.coerceIn(0L, 200L),
                        "published" to true,
                        "createdAt" to FieldValue.serverTimestamp(),
                        "updatedAt" to FieldValue.serverTimestamp()
                    )
                ).await()
            }
            Result.success(Unit)
        } catch (e: CancellationException) {
            throw e
        } catch (e: Exception) {
            handleFirestoreError(e, OperationType.WRITE, docRef.path)
            Result.failure(e)
        }
    }

    private suspend fun deleteDoc(collection: String, docId: String): Result<Unit> {
        val docRef = db.collection(collection).document(docId)
        return try {
            requireUserId()
            require(docId.isNotBlank())
            docRef.delete().await()
            Result.success(Unit)
        } catch (e: CancellationException) {
            throw e
        } catch (e: Exception) {
            handleFirestoreError(e, OperationType.DELETE, docRef.path)
            Result.failure(e)
        }
    }

    suspend fun seedDefaultStudioDataIfEmpty(): Result<Unit> {
        return try {
            requireUserId()
            val existingServices = db.collection("services").limit(1).get().await()
            if (existingServices.isEmpty) {
                val defaultServices = listOf(
                    "srv_web" to ServiceItem(
                        titleEn = "Web Design & Development",
                        titleAr = "تصميم وتطوير المواقع",
                        descriptionEn = "High-speed React, Next.js, and cloud-native web platforms engineered for global scale and conversion.",
                        descriptionAr = "تصميم وتطوير مواقع ومنصات ويب فائقة السرعة بأحدث تقنيات React والسحابة.",
                        iconKey = "web",
                        category = "web",
                        sortOrder = 1L
                    ),
                    "srv_android" to ServiceItem(
                        titleEn = "Android App Development",
                        titleAr = "تطوير تطبيقات Android",
                        descriptionEn = "Native Kotlin & Jetpack Compose mobile apps with Material 3 polish, offline resilience, and Firebase sync.",
                        descriptionAr = "بناء تطبيقات أندرويد أصلية بلغة Kotlin وJetpack Compose بأعلى معايير الأداء وتجربة المستخدم.",
                        iconKey = "android",
                        category = "mobile",
                        sortOrder = 2L
                    ),
                    "srv_ai" to ServiceItem(
                        titleEn = "Artificial Intelligence (AI)",
                        titleAr = "الذكاء الاصطناعي AI",
                        descriptionEn = "Custom Gemini assistants, workflow automation, RAG search systems, and intelligent analytics pipelines.",
                        descriptionAr = "تطوير مساعدات ذكية، أتمتة الأعمال، وحلول الذكاء الاصطناعي التوليدي المخصصة للشركات.",
                        iconKey = "ai",
                        category = "ai",
                        sortOrder = 3L
                    ),
                    "srv_graphic" to ServiceItem(
                        titleEn = "Graphic & Logo Design",
                        titleAr = "تصميم الجرافيك والشعارات",
                        descriptionEn = "Memorable brand identities, geometric logos, brand guidelines, and high-impact visual campaigns.",
                        descriptionAr = "ابتكار هويات بصرية متكاملة، شعارات احترافية، وتصاميم إعلانية تعكس فخامة علامتك التجارية.",
                        iconKey = "palette",
                        category = "design",
                        sortOrder = 4L
                    ),
                    "srv_video" to ServiceItem(
                        titleEn = "Video Editing & Production",
                        titleAr = "المونتاج وصناعة الفيديو",
                        descriptionEn = "Cinematic motion graphics, product launch reels, color grading, and engaging commercial video editing.",
                        descriptionAr = "إنتاج فيديوهات دعائية احترافية، موشن جرافيك سينمائي، ومونتاج متكامل للمحتوى الرقمي.",
                        iconKey = "video",
                        category = "media",
                        sortOrder = 5L
                    ),
                    "srv_uiux" to ServiceItem(
                        titleEn = "UI/UX Experience Design",
                        titleAr = "تصميم واجهات UI/UX",
                        descriptionEn = "User-centered wireframes, interactive Figma prototypes, and sleek dark/light design systems.",
                        descriptionAr = "تصميم واجهات مستخدم عصرية وتجارب استخدام سلسة مدروسة لزيادة تفاعل العملاء.",
                        iconKey = "uiux",
                        category = "design",
                        sortOrder = 6L
                    ),
                    "srv_software" to ServiceItem(
                        titleEn = "Custom Software Engineering",
                        titleAr = "تطوير البرمجيات",
                        descriptionEn = "Scalable enterprise backends, secure APIs, SaaS architectures, and automated cloud infrastructure.",
                        descriptionAr = "تطوير أنظمة برمجية متكاملة، واجهات برمجة تطبيقات آمنة، وبنية سحابية قابلة للتوسع.",
                        iconKey = "code",
                        category = "engineering",
                        sortOrder = 7L
                    )
                )
                defaultServices.forEach { (id, srv) ->
                    db.collection("services").document(id).set(srv.toCreateMap()).await()
                }
            }

            ensureFcutusProjectPresent()
            ensureCeoMemberPresent()
            removeLegacyDefaultSamples()

            val existingJobs = db.collection("jobs").limit(1).get().await()
            if (existingJobs.isEmpty) {
                val defaultJobs = listOf(
                    "job_fullstack" to JobOpening(
                        titleEn = "Senior React & TypeScript Engineer",
                        titleAr = "مهندس React وTypeScript أول",
                        departmentEn = "Web Engineering",
                        departmentAr = "هندسة الويب",
                        descriptionEn = "Build responsive, high-performance web applications with modern TypeScript and glassmorphism UI systems.",
                        descriptionAr = "تطوير تطبيقات ومواقع ويب سريعة ومتجاوبة باستخدام React وTypeScript بأعلى جودة بصرية.",
                        locationEn = "Remote / Hybrid",
                        locationAr = "عن بُعد / هجين",
                        employmentType = "full_time"
                    ),
                    "job_android" to JobOpening(
                        titleEn = "Android Jetpack Compose Developer",
                        titleAr = "مطور تطبيقات Android (Compose)",
                        departmentEn = "Mobile Engineering",
                        departmentAr = "تطبيقات الجوال",
                        descriptionEn = "Architect native Android experiences using Kotlin, Jetpack Compose, Material 3, and Firebase.",
                        descriptionAr = "تصميم وبرمجة تطبيقات أندرويد حديثة باستخدام Kotlin وJetpack Compose وFirebase.",
                        locationEn = "Remote",
                        locationAr = "عن بُعد",
                        employmentType = "remote"
                    ),
                    "job_motion" to JobOpening(
                        titleEn = "Creative Motion & Video Editor",
                        titleAr = "مصمم موشن جرافيك ومونتاج فيديو",
                        departmentEn = "Creative Media",
                        departmentAr = "الإنتاج الإبداعي",
                        descriptionEn = "Produce sleek product launch trailers, social reels, and brand motion animations.",
                        descriptionAr = "إنتاج فيديوهات إطلاق المنتجات والموشن جرافيك الاحترافي للعلامات التجارية التقنية.",
                        locationEn = "Full-Time / Remote",
                        locationAr = "دوام كامل / عن بُعد",
                        employmentType = "full_time"
                    )
                )
                defaultJobs.forEach { (id, job) ->
                    db.collection("jobs").document(id).set(job.toCreateMap()).await()
                }
            }

            val statsDoc = db.collection("site_stats").document("overview").get().await()
            if (!statsDoc.exists()) {
                saveSiteStats(
                    SiteStats(
                        projectsDelivered = 48L,
                        happyClients = 34L,
                        teamExperts = 12L,
                        yearsExperience = 6L,
                        published = true
                    )
                )
            }

            Result.success(Unit)
        } catch (e: CancellationException) {
            throw e
        } catch (e: Exception) {
            handleFirestoreError(e, OperationType.WRITE, "seed")
            Result.failure(e)
        }
    }

    suspend fun ensureCeoMemberPresent(): Result<Unit> {
        val docRef = db.collection("team_members").document("tm_omar_ceo")
        return try {
            requireUserId()
            val snap = docRef.get().await()
            if (!snap.exists()) {
                val ceo = TeamMember(
                    nameEn = "omar_develepor",
                    nameAr = "omar_develepor",
                    roleEn = "Site Owner & Chief Executive Officer (CEO)",
                    roleAr = "مالك الموقع والمدير التنفيذي (CEO)",
                    bioEn = "Owner & Chief Executive Officer of Vexora Studio (omarmotaz.develepor@gmail.com). Leads web engineering, Python, C++, Java, Kotlin & AI innovation — Code • Create • Innovate.",
                    bioAr = "مالك الموقع والمدير التنفيذي لشركة Vexora Studio. يقود تطوير المواقع والبرمجيات ولغات Python وC++ وJava والذكاء الاصطناعي — Code • Create • Innovate.",
                    skills = listOf("Python", "C++", "Java", "Kotlin", "Web & AI Systems", "Owner & CEO"),
                    experienceYears = 10L,
                    avatarUrl = "drawable:omar_develepor",
                    cvSummaryEn = "Site Owner & Chief Executive Officer (CEO) at Vexora Studio (omarmotaz.develepor@gmail.com). Directs platform strategy, full-stack web engineering, Android development, and AI systems.",
                    cvSummaryAr = "مالك الموقع والمدير التنفيذي (CEO) في Vexora Studio. يشرف على استراتيجية المنصة وتطوير الويب وتطبيقات Android وأنظمة الذكاء الاصطناعي.",
                    published = true
                )
                docRef.set(ceo.toCreateMap()).await()
            }
            Result.success(Unit)
        } catch (e: CancellationException) {
            throw e
        } catch (e: Exception) {
            handleFirestoreError(e, OperationType.WRITE, docRef.path)
            Result.failure(e)
        }
    }

    suspend fun ensureFcutusProjectPresent(): Result<Unit> {
        val docRef = db.collection("projects").document("proj_f_cutus")
        return try {
            requireUserId()
            val snap = docRef.get().await()
            if (!snap.exists()) {
                val fcutus = ProjectItem(
                    nameEn = "F.cutus",
                    nameAr = "F.cutus",
                    descriptionEn = "Created by Vexora Studio — a modern, responsive web platform crafted with bold visual identity and smooth digital experiences.",
                    descriptionAr = "تم إنشاء هذا الموقع من قبل Vexora Studio — موقع ويب احترافي بتصميم عصري متجاوب وتجربة مستخدم سلسة.",
                    presetImageKey = "f_cutus",
                    websiteUrl = "https://vexora-1studio.github.io/F.cuts/",
                    technologies = listOf("HTML5", "CSS3", "JavaScript", "Vexora Studio"),
                    status = "available",
                    featured = true,
                    published = true
                )
                docRef.set(fcutus.toCreateMap()).await()
            }
            Result.success(Unit)
        } catch (e: CancellationException) {
            throw e
        } catch (e: Exception) {
            handleFirestoreError(e, OperationType.WRITE, docRef.path)
            Result.failure(e)
        }
    }

    suspend fun removeLegacyDefaultSamples() {
        try {
            requireUserId()
            removedDefaultProjectIds.forEach { docId ->
                try {
                    db.collection("projects").document(docId).delete().await()
                } catch (_: Exception) {
                    // Ignore missing/unauthorized cleanup errors
                }
            }
            removedDefaultTeamIds.forEach { docId ->
                try {
                    db.collection("team_members").document(docId).delete().await()
                } catch (_: Exception) {
                    // Ignore missing/unauthorized cleanup errors
                }
            }
        } catch (e: CancellationException) {
            throw e
        } catch (_: Exception) {
            // Ignore cleanup errors when unauthenticated
        }
    }
}
