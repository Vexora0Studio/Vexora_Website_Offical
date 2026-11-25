package com.example.ui.viewmodel

import android.util.Log
import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.example.data.StudioLiveContext
import com.example.data.StudioRepository
import com.example.model.ContactMessage
import com.example.model.JobApplication
import com.example.model.JobOpening
import com.example.model.ProjectItem
import com.example.model.ServiceItem
import com.example.model.SiteStats
import com.example.model.TeamMember
import com.example.model.UiState
import com.example.util.isAdminAccount
import com.google.firebase.firestore.FirebaseFirestoreException
import kotlinx.coroutines.CancellationException
import kotlinx.coroutines.ExperimentalCoroutinesApi
import kotlinx.coroutines.flow.Flow
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.SharingStarted
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.flow.catch
import kotlinx.coroutines.flow.combine
import kotlinx.coroutines.flow.flatMapLatest
import kotlinx.coroutines.flow.map
import kotlinx.coroutines.flow.stateIn
import kotlinx.coroutines.launch

@OptIn(ExperimentalCoroutinesApi::class)
class StudioViewModel(
    private val repository: StudioRepository,
    private val currentUserId: String,
    private val userEmail: String?,
    private val isEmailVerified: Boolean
) : ViewModel() {

    private val _isAdmin = MutableStateFlow(
        isAdminAccount(userEmail, isEmailVerified)
    )
    val isAdmin: StateFlow<Boolean> = _isAdmin.asStateFlow()

    private val _actionMessage = MutableStateFlow<String?>(null)
    val actionMessage: StateFlow<String?> = _actionMessage.asStateFlow()

    private val _actionError = MutableStateFlow<String?>(null)
    val actionError: StateFlow<String?> = _actionError.asStateFlow()

    private val _isSubmitting = MutableStateFlow(false)
    val isSubmitting: StateFlow<Boolean> = _isSubmitting.asStateFlow()

    init {
        viewModelScope.launch {
            val admin = repository.checkIsAdmin(currentUserId, userEmail, isEmailVerified)
            _isAdmin.value = admin
            if (admin) {
                repository.ensureCeoMemberPresent()
                repository.ensureFcutusProjectPresent()
                repository.seedDefaultStudioDataIfEmpty()
            }
        }
    }

    val servicesState: StateFlow<UiState<List<ServiceItem>>> = _isAdmin
        .flatMapLatest { admin -> repository.observeServices(admin) }
        .toUiState("services")
        .stateIn(viewModelScope, SharingStarted.WhileSubscribed(5000L), UiState.Loading)

    val projectsState: StateFlow<UiState<List<ProjectItem>>> = _isAdmin
        .flatMapLatest { admin -> repository.observeProjects(admin) }
        .toUiState("projects")
        .stateIn(viewModelScope, SharingStarted.WhileSubscribed(5000L), UiState.Loading)

    val teamState: StateFlow<UiState<List<TeamMember>>> = _isAdmin
        .flatMapLatest { admin -> repository.observeTeamMembers(admin) }
        .toUiState("team_members")
        .stateIn(viewModelScope, SharingStarted.WhileSubscribed(5000L), UiState.Loading)

    val jobsState: StateFlow<UiState<List<JobOpening>>> = _isAdmin
        .flatMapLatest { admin -> repository.observeJobs(admin) }
        .toUiState("jobs")
        .stateIn(viewModelScope, SharingStarted.WhileSubscribed(5000L), UiState.Loading)

    val statsState: StateFlow<UiState<SiteStats>> = _isAdmin
        .flatMapLatest { admin -> repository.observeSiteStats(admin) }
        .toUiState("site_stats")
        .stateIn(viewModelScope, SharingStarted.WhileSubscribed(5000L), UiState.Loading)

    val applicationsState: StateFlow<UiState<List<JobApplication>>> = _isAdmin
        .flatMapLatest { admin -> repository.observeJobApplications(admin, currentUserId) }
        .toUiState("job_applications")
        .stateIn(viewModelScope, SharingStarted.WhileSubscribed(5000L), UiState.Loading)

    val messagesState: StateFlow<UiState<List<ContactMessage>>> = _isAdmin
        .flatMapLatest { admin -> repository.observeContactMessages(admin, currentUserId) }
        .toUiState("contact_messages")
        .stateIn(viewModelScope, SharingStarted.WhileSubscribed(5000L), UiState.Loading)

    val liveAiContext: StateFlow<StudioLiveContext> = combine(
        servicesState,
        projectsState,
        teamState,
        jobsState,
        statsState
    ) { services, projects, team, jobs, stats ->
        StudioLiveContext(
            services = (services as? UiState.Success)?.data.orEmpty().filter { it.published },
            projects = (projects as? UiState.Success)?.data.orEmpty().filter { it.published },
            team = (team as? UiState.Success)?.data.orEmpty().filter { it.published },
            jobs = (jobs as? UiState.Success)?.data.orEmpty().filter { it.published },
            stats = (stats as? UiState.Success)?.data ?: SiteStats()
        )
    }.stateIn(viewModelScope, SharingStarted.WhileSubscribed(5000L), StudioLiveContext())

    private fun <T> Flow<T>.toUiState(label: String): Flow<UiState<T>> =
        this.map<T, UiState<T>> { UiState.Success(it) }
            .catch { error ->
                val firestoreError = generateSequence(error) { it.cause }
                    .filterIsInstance<FirebaseFirestoreException>()
                    .firstOrNull()
                if (firestoreError == null && error is CancellationException) throw error
                val rootError = firestoreError ?: error
                Log.w("StudioVM", "Error observing $label", rootError)
                emit(UiState.Error(rootError.localizedMessage ?: "Failed to load $label"))
            }

    fun clearFeedback() {
        _actionMessage.value = null
        _actionError.value = null
    }

    fun submitJobApplication(
        jobId: String?,
        fullName: String,
        email: String,
        phone: String,
        desiredRole: String,
        experienceYears: Long,
        skills: String,
        cvFileName: String,
        cvPdfBase64: String,
        cvSizeBytes: Long,
        successMsg: String
    ) {
        runMutation(successMsg) {
            repository.submitJobApplication(
                jobId = jobId,
                fullName = fullName,
                email = email,
                phone = phone,
                desiredRole = desiredRole,
                experienceYears = experienceYears,
                skills = skills,
                cvFileName = cvFileName,
                cvPdfBase64 = cvPdfBase64,
                cvSizeBytes = cvSizeBytes
            )
        }
    }

    fun submitContactMessage(
        senderName: String,
        email: String,
        subject: String,
        message: String,
        successMsg: String
    ) {
        runMutation(successMsg) {
            repository.submitContactMessage(senderName, email, subject, message)
        }
    }

    fun saveService(service: ServiceItem, successMsg: String = "Saved") =
        runMutation(successMsg) { repository.saveService(service) }

    fun deleteService(id: String) =
        runMutation("Deleted") { repository.deleteService(id) }

    fun saveProject(project: ProjectItem, successMsg: String = "Saved") =
        runMutation(successMsg) { repository.saveProject(project) }

    fun deleteProject(id: String) =
        runMutation("Deleted") { repository.deleteProject(id) }

    fun saveTeamMember(member: TeamMember, successMsg: String = "Saved") =
        runMutation(successMsg) { repository.saveTeamMember(member) }

    fun deleteTeamMember(id: String) =
        runMutation("Deleted") { repository.deleteTeamMember(id) }

    fun saveJob(job: JobOpening, successMsg: String = "Saved") =
        runMutation(successMsg) { repository.saveJob(job) }

    fun deleteJob(id: String) =
        runMutation("Deleted") { repository.deleteJob(id) }

    fun updateApplicationStatus(id: String, status: String, note: String?) =
        runMutation("Updated") { repository.updateApplicationStatus(id, status, note) }

    fun deleteApplication(id: String) =
        runMutation("Deleted") { repository.deleteApplication(id) }

    fun updateMessageStatus(id: String, status: String) =
        runMutation("Updated") { repository.updateContactMessageStatus(id, status) }

    fun deleteMessage(id: String) =
        runMutation("Deleted") { repository.deleteContactMessage(id) }

    fun saveSiteStats(stats: SiteStats, successMsg: String = "Updated") =
        runMutation(successMsg) { repository.saveSiteStats(stats) }

    fun seedDefaultStudioData(successMsg: String = "Initialized") =
        runMutation(successMsg) { repository.seedDefaultStudioDataIfEmpty() }

    private fun runMutation(successMessage: String, block: suspend () -> Result<Unit>) {
        viewModelScope.launch {
            _isSubmitting.value = true
            _actionError.value = null
            _actionMessage.value = null
            val result = block()
            _isSubmitting.value = false
            result.onSuccess {
                _actionMessage.value = successMessage
            }.onFailure { err ->
                _actionError.value = err.localizedMessage ?: "Operation failed"
            }
        }
    }
}
