package com.example.data

import com.example.model.JobOpening
import com.example.model.ProjectItem
import com.example.model.ServiceItem
import com.example.model.SiteStats
import com.example.model.TeamMember
import com.google.firebase.Firebase
import com.google.firebase.ai.ai
import com.google.firebase.ai.type.Content
import com.google.firebase.ai.type.content
import kotlinx.coroutines.flow.Flow
import kotlinx.coroutines.flow.mapNotNull
import kotlinx.coroutines.withTimeout

data class StudioLiveContext(
    val services: List<ServiceItem> = emptyList(),
    val projects: List<ProjectItem> = emptyList(),
    val team: List<TeamMember> = emptyList(),
    val jobs: List<JobOpening> = emptyList(),
    val stats: SiteStats = SiteStats()
)

class StudioAiRepository {
    private val model by lazy {
        Firebase.ai.generativeModel(modelName = "gemini-3.8-flash")
    }

    suspend fun streamStudioAnswer(
        question: String,
        historyPairs: List<Pair<String, String>>,
        liveContext: StudioLiveContext,
        preferArabic: Boolean
    ): Flow<String> {
        val systemPrompt = buildGroundedContextPrompt(liveContext, preferArabic)
        val chatHistory = mutableListOf<Content>(
            content("user") { text(systemPrompt) },
            content("model") {
                text(
                    if (preferArabic) {
                        "فهمت تماماً. سأجيب بدقة ووضوح بالاعتماد حصرياً على بيانات Vexora Studio الفعلية المزودة أعلاه دون اختراع أي معلومات."
                    } else {
                        "Understood. I will answer clearly using strictly the live Vexora Studio company data provided above without inventing any details."
                    }
                )
            }
        )
        historyPairs.takeLast(6).forEach { (userMsg, modelMsg) ->
            chatHistory += content("user") { text(userMsg) }
            chatHistory += content("model") { text(modelMsg) }
        }

        val chat = model.startChat(history = chatHistory)
        return withTimeout(60_000L) {
            chat.sendMessageStream(question).mapNotNull { chunk -> chunk.text }
        }
    }

    private fun buildGroundedContextPrompt(ctx: StudioLiveContext, preferArabic: Boolean): String {
        val servicesText = if (ctx.services.isEmpty()) {
            "None currently listed."
        } else {
            ctx.services.joinToString("\n") { s ->
                "- ${s.titleEn} / ${s.titleAr} [${s.category}]: ${s.descriptionEn} | ${s.descriptionAr}"
            }
        }

        val projectsText = if (ctx.projects.isEmpty()) {
            "None currently listed."
        } else {
            ctx.projects.joinToString("\n") { p ->
                "- ${p.nameEn} / ${p.nameAr} (status: ${p.status}, URL: ${p.websiteUrl.ifBlank { "N/A" }}, tech: ${p.technologies.joinToString(", ")}): ${p.descriptionEn} | ${p.descriptionAr}"
            }
        }

        val teamText = if (ctx.team.isEmpty()) {
            "None currently listed."
        } else {
            ctx.team.joinToString("\n") { m ->
                "- ${m.nameEn} / ${m.nameAr} — ${m.roleEn} / ${m.roleAr} (${m.experienceYears} yrs exp, skills: ${m.skills.joinToString(", ")}). Bio: ${m.bioEn} | ${m.bioAr}"
            }
        }

        val jobsText = if (ctx.jobs.isEmpty()) {
            "No open job listings currently published."
        } else {
            ctx.jobs.joinToString("\n") { j ->
                "- ${j.titleEn} / ${j.titleAr} (${j.departmentEn} / ${j.departmentAr}, ${j.locationEn} / ${j.locationAr}, type: ${j.employmentType}): ${j.descriptionEn}"
            }
        }

        return """
You are the official AI Assistant for Vexora Studio.
STRICT GROUNDING RULES:
1. Answer ONLY using the real company data below. NEVER invent services, projects, URLs, employees, job openings, or contact channels that are not listed below.
2. If the user asks about something not present in the data, politely state that it is not currently listed in Vexora Studio's live records and suggest contacting vexora0studio@gmail.com.
3. Reply in the same language as the user's message (default to ${if (preferArabic) "Arabic" else "English"} if ambiguous).
4. Keep answers clear, well-structured, concise, and helpful.

=== VEXORA STUDIO LIVE DATA ===
Company Name: Vexora Studio
Official Email: vexora0studio@gmail.com
How to Apply for Jobs: Visitors can open the "Team & Jobs" -> "Careers" section in the app, fill out Full Name, Email, Phone, Desired Role, Years of Experience, Skills, and upload their CV in PDF format.
How to Contact: Visitors can send a message via the "Contact" page in the app or email vexora0studio@gmail.com.

Company Statistics:
- Projects Delivered: ${ctx.stats.projectsDelivered}
- Happy Clients: ${ctx.stats.happyClients}
- Team Experts: ${ctx.stats.teamExperts}
- Years Experience: ${ctx.stats.yearsExperience}

Services (${ctx.services.size}):
$servicesText

Projects & Websites (${ctx.projects.size}):
$projectsText

Team Members (${ctx.team.size}):
$teamText

Open Jobs (${ctx.jobs.size}):
$jobsText
        """.trimIndent()
    }
}
