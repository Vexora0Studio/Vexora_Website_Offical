package com.example.model

import androidx.annotation.Keep
import com.google.firebase.Timestamp
import com.google.firebase.firestore.DocumentId
import com.google.firebase.firestore.FieldValue
import com.google.firebase.firestore.IgnoreExtraProperties
import com.google.firebase.firestore.ServerTimestamp

sealed interface UiState<out T> {
    data object Loading : UiState<Nothing>
    data class Success<T>(val data: T) : UiState<T>
    data class Error(val message: String) : UiState<Nothing>
}

@Keep
@IgnoreExtraProperties
data class ServiceItem(
    @DocumentId val id: String = "",
    val titleEn: String = "",
    val titleAr: String = "",
    val descriptionEn: String = "",
    val descriptionAr: String = "",
    val iconKey: String = "code",
    val category: String = "engineering",
    val sortOrder: Long = 0L,
    val published: Boolean = true,
    @ServerTimestamp val createdAt: Timestamp? = null,
    @ServerTimestamp val updatedAt: Timestamp? = null
) {
    fun toCreateMap(): Map<String, Any> = mapOf(
        "titleEn" to titleEn.trim(),
        "titleAr" to titleAr.trim(),
        "descriptionEn" to descriptionEn.trim(),
        "descriptionAr" to descriptionAr.trim(),
        "iconKey" to iconKey.trim(),
        "category" to category.trim(),
        "sortOrder" to sortOrder,
        "published" to published,
        "createdAt" to FieldValue.serverTimestamp(),
        "updatedAt" to FieldValue.serverTimestamp()
    )
}

@Keep
@IgnoreExtraProperties
data class ProjectItem(
    @DocumentId val id: String = "",
    val nameEn: String = "",
    val nameAr: String = "",
    val descriptionEn: String = "",
    val descriptionAr: String = "",
    val imageUrl: String = "",
    val presetImageKey: String = "web",
    val websiteUrl: String = "",
    val technologies: List<String> = emptyList(),
    val status: String = "available",
    val featured: Boolean = false,
    val published: Boolean = true,
    @ServerTimestamp val createdAt: Timestamp? = null,
    @ServerTimestamp val updatedAt: Timestamp? = null
) {
    fun toCreateMap(): Map<String, Any> = mapOf(
        "nameEn" to nameEn.trim(),
        "nameAr" to nameAr.trim(),
        "descriptionEn" to descriptionEn.trim(),
        "descriptionAr" to descriptionAr.trim(),
        "imageUrl" to imageUrl.trim(),
        "presetImageKey" to presetImageKey.trim().ifBlank { "web" },
        "websiteUrl" to websiteUrl.trim(),
        "technologies" to technologies.map { it.trim() }.filter { it.isNotEmpty() }.take(15),
        "status" to status,
        "featured" to featured,
        "published" to published,
        "createdAt" to FieldValue.serverTimestamp(),
        "updatedAt" to FieldValue.serverTimestamp()
    )
}

@Keep
@IgnoreExtraProperties
data class TeamMember(
    @DocumentId val id: String = "",
    val nameEn: String = "",
    val nameAr: String = "",
    val roleEn: String = "",
    val roleAr: String = "",
    val bioEn: String = "",
    val bioAr: String = "",
    val skills: List<String> = emptyList(),
    val experienceYears: Long = 1L,
    val avatarUrl: String = "",
    val cvSummaryEn: String = "",
    val cvSummaryAr: String = "",
    val cvFileName: String? = null,
    val cvPdfBase64: String? = null,
    val published: Boolean = true,
    @ServerTimestamp val createdAt: Timestamp? = null,
    @ServerTimestamp val updatedAt: Timestamp? = null
) {
    fun toCreateMap(): Map<String, Any> {
        val raw: Map<String, Any?> = mapOf(
            "nameEn" to nameEn.trim(),
            "nameAr" to nameAr.trim(),
            "roleEn" to roleEn.trim(),
            "roleAr" to roleAr.trim(),
            "bioEn" to bioEn.trim(),
            "bioAr" to bioAr.trim(),
            "skills" to skills.map { it.trim() }.filter { it.isNotEmpty() }.take(20),
            "experienceYears" to experienceYears.coerceIn(0L, 60L),
            "avatarUrl" to avatarUrl.trim(),
            "cvSummaryEn" to cvSummaryEn.trim(),
            "cvSummaryAr" to cvSummaryAr.trim(),
            "cvFileName" to cvFileName?.trim()?.takeIf { it.isNotEmpty() },
            "cvPdfBase64" to cvPdfBase64?.takeIf { it.isNotEmpty() },
            "published" to published,
            "createdAt" to FieldValue.serverTimestamp(),
            "updatedAt" to FieldValue.serverTimestamp()
        )
        @Suppress("UNCHECKED_CAST")
        return raw.filterValues { it != null } as Map<String, Any>
    }
}

@Keep
@IgnoreExtraProperties
data class JobOpening(
    @DocumentId val id: String = "",
    val titleEn: String = "",
    val titleAr: String = "",
    val departmentEn: String = "",
    val departmentAr: String = "",
    val descriptionEn: String = "",
    val descriptionAr: String = "",
    val locationEn: String = "",
    val locationAr: String = "",
    val employmentType: String = "full_time",
    val published: Boolean = true,
    @ServerTimestamp val createdAt: Timestamp? = null,
    @ServerTimestamp val updatedAt: Timestamp? = null
) {
    fun toCreateMap(): Map<String, Any> = mapOf(
        "titleEn" to titleEn.trim(),
        "titleAr" to titleAr.trim(),
        "departmentEn" to departmentEn.trim(),
        "departmentAr" to departmentAr.trim(),
        "descriptionEn" to descriptionEn.trim(),
        "descriptionAr" to descriptionAr.trim(),
        "locationEn" to locationEn.trim(),
        "locationAr" to locationAr.trim(),
        "employmentType" to employmentType,
        "published" to published,
        "createdAt" to FieldValue.serverTimestamp(),
        "updatedAt" to FieldValue.serverTimestamp()
    )
}

@Keep
@IgnoreExtraProperties
data class JobApplication(
    @DocumentId val id: String = "",
    val userId: String = "",
    val jobId: String? = null,
    val fullName: String = "",
    val email: String = "",
    val phone: String = "",
    val desiredRole: String = "",
    val experienceYears: Long = 0L,
    val skills: String = "",
    val cvFileName: String = "",
    val cvPdfBase64: String = "",
    val cvSizeBytes: Long = 0L,
    val status: String = "pending",
    val adminNote: String? = null,
    @ServerTimestamp val createdAt: Timestamp? = null,
    @ServerTimestamp val updatedAt: Timestamp? = null
)

@Keep
@IgnoreExtraProperties
data class ContactMessage(
    @DocumentId val id: String = "",
    val userId: String = "",
    val senderName: String = "",
    val email: String = "",
    val subject: String = "",
    val message: String = "",
    val status: String = "new",
    @ServerTimestamp val createdAt: Timestamp? = null,
    @ServerTimestamp val updatedAt: Timestamp? = null
)

@Keep
@IgnoreExtraProperties
data class SiteStats(
    @DocumentId val id: String = "",
    val projectsDelivered: Long = 48L,
    val happyClients: Long = 34L,
    val teamExperts: Long = 12L,
    val yearsExperience: Long = 6L,
    val published: Boolean = true,
    @ServerTimestamp val createdAt: Timestamp? = null,
    @ServerTimestamp val updatedAt: Timestamp? = null
)
