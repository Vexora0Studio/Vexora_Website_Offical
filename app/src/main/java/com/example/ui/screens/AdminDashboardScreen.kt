package com.example.ui.screens

import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.PaddingValues
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.LazyRow
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.lazy.itemsIndexed
import androidx.compose.foundation.text.KeyboardOptions
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Add
import androidx.compose.material.icons.filled.AdminPanelSettings
import androidx.compose.material.icons.filled.Check
import androidx.compose.material.icons.filled.Close
import androidx.compose.material.icons.filled.Delete
import androidx.compose.material.icons.filled.Description
import androidx.compose.material.icons.filled.Edit
import androidx.compose.material.icons.filled.Lock
import androidx.compose.material.icons.filled.Refresh
import androidx.compose.material3.FilterChip
import androidx.compose.material3.FilterChipDefaults
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.OutlinedTextField
import androidx.compose.material3.Text
import androidx.compose.material3.minimumInteractiveComponentSize
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableIntStateOf
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.platform.testTag
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.input.KeyboardType
import androidx.compose.ui.unit.dp
import com.example.localization.AppLanguage
import com.example.localization.LocalAppLanguage
import com.example.localization.LocalStrings
import com.example.model.ContactMessage
import com.example.model.JobApplication
import com.example.model.JobOpening
import com.example.model.ProjectItem
import com.example.model.ServiceItem
import com.example.model.SiteStats
import com.example.model.TeamMember
import com.example.model.UiState
import com.example.ui.components.GlassCard
import com.example.ui.components.GlassOutlinedButton
import com.example.ui.components.NeonPrimaryButton
import com.example.ui.components.PdfViewerDialog
import com.example.ui.components.StatusPill
import com.example.ui.theme.LocalVexoraColors
import com.example.util.OWNER_EMAIL
import com.example.util.OWNER_NAME

@Composable
fun AdminDashboardScreen(
    isAdmin: Boolean,
    userEmail: String?,
    statsState: UiState<SiteStats>,
    servicesState: UiState<List<ServiceItem>>,
    projectsState: UiState<List<ProjectItem>>,
    teamState: UiState<List<TeamMember>>,
    jobsState: UiState<List<JobOpening>>,
    applicationsState: UiState<List<JobApplication>>,
    messagesState: UiState<List<ContactMessage>>,
    onSwitchAccount: () -> Unit,
    onSeedDefaultData: () -> Unit,
    onSaveStats: (SiteStats) -> Unit,
    onSaveService: (ServiceItem) -> Unit,
    onDeleteService: (String) -> Unit,
    onSaveProject: (ProjectItem) -> Unit,
    onDeleteProject: (String) -> Unit,
    onSaveTeamMember: (TeamMember) -> Unit,
    onDeleteTeamMember: (String) -> Unit,
    onSaveJob: (JobOpening) -> Unit,
    onDeleteJob: (String) -> Unit,
    onUpdateApplication: (String, String, String?) -> Unit,
    onDeleteApplication: (String) -> Unit,
    onUpdateMessageStatus: (String, String) -> Unit,
    onDeleteMessage: (String) -> Unit
) {
    val strings = LocalStrings.current
    val isArabic = LocalAppLanguage.current == AppLanguage.AR
    val vexora = LocalVexoraColors.current

    if (!isAdmin) {
        Box(
            modifier = Modifier.fillMaxSize().padding(24.dp),
            contentAlignment = Alignment.Center
        ) {
            GlassCard(highlightBorder = true, modifier = Modifier.fillMaxWidth()) {
                Icon(Icons.Filled.Lock, contentDescription = null, tint = vexora.neonCyan, modifier = Modifier.size(40.dp))
                Spacer(Modifier.height(12.dp))
                Text(strings.adminLockedTitle, style = MaterialTheme.typography.headlineMedium, fontWeight = FontWeight.Bold)
                Spacer(Modifier.height(8.dp))
                Text(strings.adminLockedDesc, style = MaterialTheme.typography.bodyLarge, color = vexora.mutedText)
                if (!userEmail.isNullOrBlank()) {
                    Spacer(Modifier.height(8.dp))
                    Text(userEmail, style = MaterialTheme.typography.labelMedium, color = vexora.neonCyan)
                }
                Spacer(Modifier.height(18.dp))
                NeonPrimaryButton(
                    text = strings.switchAccount,
                    onClick = onSwitchAccount,
                    modifier = Modifier.fillMaxWidth().testTag("admin_switch_account_btn")
                )
            }
        }
        return
    }

    var selectedSection by remember { mutableIntStateOf(0) }
    val sections = listOf(
        strings.adminOverview,
        strings.adminServices,
        strings.adminProjects,
        strings.adminTeam,
        strings.adminJobs,
        strings.adminApplications,
        strings.adminMessages
    )

    var showServiceDialog by remember { mutableStateOf<Pair<Boolean, ServiceItem?>>(false to null) }
    var showProjectDialog by remember { mutableStateOf<Pair<Boolean, ProjectItem?>>(false to null) }
    var showTeamDialog by remember { mutableStateOf<Pair<Boolean, TeamMember?>>(false to null) }
    var showJobDialog by remember { mutableStateOf<Pair<Boolean, JobOpening?>>(false to null) }
    var pdfToPreview by remember { mutableStateOf<Pair<String, String>?>(null) }

    Column(modifier = Modifier.fillMaxSize()) {
        Row(
            modifier = Modifier.fillMaxWidth().padding(horizontal = 16.dp, vertical = 12.dp),
            verticalAlignment = Alignment.CenterVertically,
            horizontalArrangement = Arrangement.spacedBy(10.dp)
        ) {
            Icon(Icons.Filled.AdminPanelSettings, contentDescription = null, tint = vexora.neonCyan)
            Column(modifier = Modifier.weight(1f)) {
                Text(strings.adminTitle, style = MaterialTheme.typography.headlineMedium, fontWeight = FontWeight.Bold)
                if (!userEmail.isNullOrBlank()) {
                    val ownerLabel = if (userEmail.equals(OWNER_EMAIL, ignoreCase = true)) {
                        "$OWNER_NAME • $userEmail"
                    } else {
                        userEmail
                    }
                    Text(
                        text = ownerLabel,
                        style = MaterialTheme.typography.labelMedium,
                        color = vexora.neonCyan
                    )
                }
            }
        }

        LazyRow(
            contentPadding = PaddingValues(horizontal = 16.dp),
            horizontalArrangement = Arrangement.spacedBy(8.dp)
        ) {
            itemsIndexed(sections) { index, label ->
                FilterChip(
                    selected = selectedSection == index,
                    onClick = { selectedSection = index },
                    label = { Text(label) },
                    colors = FilterChipDefaults.filterChipColors(
                        selectedContainerColor = vexora.neonCyan.copy(alpha = 0.22f),
                        selectedLabelColor = vexora.neonCyan
                    )
                )
            }
        }

        LazyColumn(
            modifier = Modifier.weight(1f).fillMaxWidth(),
            contentPadding = PaddingValues(16.dp),
            verticalArrangement = Arrangement.spacedBy(12.dp)
        ) {
            when (selectedSection) {
                0 -> { // Stats & Seed
                    val currentStats = (statsState as? UiState.Success)?.data ?: SiteStats()
                    item {
                        StatsEditorCard(
                            initial = currentStats,
                            onSaveStats = onSaveStats,
                            onSeedDefaultData = onSeedDefaultData
                        )
                    }
                }
                1 -> { // Services
                    item {
                        NeonPrimaryButton(
                            text = "${strings.addNew} — ${strings.adminServices}",
                            icon = Icons.Filled.Add,
                            onClick = { showServiceDialog = true to null },
                            modifier = Modifier.fillMaxWidth().testTag("admin_add_service_btn")
                        )
                    }
                    val list = (servicesState as? UiState.Success)?.data.orEmpty()
                    items(list, key = { it.id }) { srv ->
                        AdminRowCard(
                            title = if (isArabic) srv.titleAr else srv.titleEn,
                            subtitle = "${srv.category} • ${if (srv.published) "Published" else "Draft"}",
                            onEdit = { showServiceDialog = true to srv },
                            onDelete = { onDeleteService(srv.id) }
                        )
                    }
                }
                2 -> { // Projects
                    item {
                        NeonPrimaryButton(
                            text = "${strings.addNew} — ${strings.adminProjects}",
                            icon = Icons.Filled.Add,
                            onClick = { showProjectDialog = true to null },
                            modifier = Modifier.fillMaxWidth().testTag("admin_add_project_btn")
                        )
                    }
                    val list = (projectsState as? UiState.Success)?.data.orEmpty()
                    items(list, key = { it.id }) { proj ->
                        AdminRowCard(
                            title = if (isArabic) proj.nameAr else proj.nameEn,
                            subtitle = "${proj.status} • ${proj.websiteUrl}",
                            onEdit = { showProjectDialog = true to proj },
                            onDelete = { onDeleteProject(proj.id) }
                        )
                    }
                }
                3 -> { // Team
                    item {
                        NeonPrimaryButton(
                            text = "${strings.addNew} — ${strings.adminTeam}",
                            icon = Icons.Filled.Add,
                            onClick = { showTeamDialog = true to null },
                            modifier = Modifier.fillMaxWidth().testTag("admin_add_team_btn")
                        )
                    }
                    val list = (teamState as? UiState.Success)?.data.orEmpty()
                    items(list, key = { it.id }) { member ->
                        val roleLabel = if (isArabic) member.roleAr else member.roleEn
                        val cvTag = if (!member.cvPdfBase64.isNullOrBlank()) "PDF CV ✓" else "CV Summary"
                        AdminRowCard(
                            title = if (isArabic) member.nameAr else member.nameEn,
                            subtitle = "$roleLabel • $cvTag",
                            onEdit = { showTeamDialog = true to member },
                            onDelete = { onDeleteTeamMember(member.id) }
                        )
                    }
                }
                4 -> { // Jobs
                    item {
                        NeonPrimaryButton(
                            text = "${strings.addNew} — ${strings.adminJobs}",
                            icon = Icons.Filled.Add,
                            onClick = { showJobDialog = true to null },
                            modifier = Modifier.fillMaxWidth().testTag("admin_add_job_btn")
                        )
                    }
                    val list = (jobsState as? UiState.Success)?.data.orEmpty()
                    items(list, key = { it.id }) { job ->
                        AdminRowCard(
                            title = if (isArabic) job.titleAr else job.titleEn,
                            subtitle = if (isArabic) job.departmentAr else job.departmentEn,
                            onEdit = { showJobDialog = true to job },
                            onDelete = { onDeleteJob(job.id) }
                        )
                    }
                }
                5 -> { // Applications
                    val apps = (applicationsState as? UiState.Success)?.data.orEmpty()
                    items(apps, key = { it.id }) { app ->
                        val (stLabel, stColor) = when (app.status) {
                            "accepted" -> strings.statusAccepted to vexora.success
                            "rejected" -> strings.statusRejected to vexora.error
                            else -> strings.statusPending to vexora.warning
                        }
                        GlassCard(modifier = Modifier.fillMaxWidth()) {
                            Row(
                                modifier = Modifier.fillMaxWidth(),
                                horizontalArrangement = Arrangement.SpaceBetween,
                                verticalAlignment = Alignment.CenterVertically
                            ) {
                                Column(modifier = Modifier.weight(1f)) {
                                    Text(app.fullName, style = MaterialTheme.typography.titleMedium, fontWeight = FontWeight.Bold)
                                    Text(app.desiredRole, style = MaterialTheme.typography.bodyMedium, color = vexora.neonCyan)
                                }
                                StatusPill(label = stLabel, color = stColor)
                            }
                            Spacer(Modifier.height(6.dp))
                            Text("${app.email} • ${app.phone}", style = MaterialTheme.typography.bodyMedium, color = vexora.mutedText)
                            Text("${app.experienceYears} ${strings.yearsExpSuffix} • ${app.skills}", style = MaterialTheme.typography.bodyMedium)
                            Spacer(Modifier.height(10.dp))
                            GlassOutlinedButton(
                                text = "${strings.viewDownloadPdf} (${app.cvFileName})",
                                icon = Icons.Filled.Description,
                                onClick = { pdfToPreview = app.cvFileName to app.cvPdfBase64 },
                                modifier = Modifier.fillMaxWidth()
                            )
                            Spacer(Modifier.height(8.dp))
                            Row(horizontalArrangement = Arrangement.spacedBy(8.dp), modifier = Modifier.fillMaxWidth()) {
                                NeonPrimaryButton(
                                    text = strings.accept,
                                    icon = Icons.Filled.Check,
                                    onClick = { onUpdateApplication(app.id, "accepted", null) },
                                    modifier = Modifier.weight(1f)
                                )
                                GlassOutlinedButton(
                                    text = strings.reject,
                                    icon = Icons.Filled.Close,
                                    onClick = { onUpdateApplication(app.id, "rejected", null) },
                                    modifier = Modifier.weight(1f)
                                )
                                IconButton(
                                    onClick = { onDeleteApplication(app.id) },
                                    modifier = Modifier.minimumInteractiveComponentSize()
                                ) {
                                    Icon(Icons.Filled.Delete, contentDescription = strings.delete, tint = vexora.error)
                                }
                            }
                        }
                    }
                }
                else -> { // Messages
                    val msgs = (messagesState as? UiState.Success)?.data.orEmpty()
                    items(msgs, key = { it.id }) { msg ->
                        GlassCard(modifier = Modifier.fillMaxWidth()) {
                            Row(
                                modifier = Modifier.fillMaxWidth(),
                                horizontalArrangement = Arrangement.SpaceBetween,
                                verticalAlignment = Alignment.CenterVertically
                            ) {
                                Column(modifier = Modifier.weight(1f)) {
                                    Text(msg.subject, style = MaterialTheme.typography.titleMedium, fontWeight = FontWeight.Bold)
                                    Text("${msg.senderName} • ${msg.email}", style = MaterialTheme.typography.bodyMedium, color = vexora.neonCyan)
                                }
                                StatusPill(
                                    label = msg.status,
                                    color = if (msg.status == "replied") vexora.success else vexora.warning
                                )
                            }
                            Spacer(Modifier.height(6.dp))
                            Text(msg.message, style = MaterialTheme.typography.bodyMedium)
                            Spacer(Modifier.height(10.dp))
                            Row(horizontalArrangement = Arrangement.spacedBy(8.dp), modifier = Modifier.fillMaxWidth()) {
                                NeonPrimaryButton(
                                    text = strings.markReplied,
                                    icon = Icons.Filled.Check,
                                    onClick = { onUpdateMessageStatus(msg.id, "replied") },
                                    modifier = Modifier.weight(1f)
                                )
                                IconButton(
                                    onClick = { onDeleteMessage(msg.id) },
                                    modifier = Modifier.minimumInteractiveComponentSize()
                                ) {
                                    Icon(Icons.Filled.Delete, contentDescription = strings.delete, tint = vexora.error)
                                }
                            }
                        }
                    }
                }
            }
        }
    }

    if (showServiceDialog.first) {
        ServiceEditorDialog(
            initial = showServiceDialog.second,
            onDismiss = { showServiceDialog = false to null },
            onSave = {
                onSaveService(it)
                showServiceDialog = false to null
            }
        )
    }
    if (showProjectDialog.first) {
        ProjectEditorDialog(
            initial = showProjectDialog.second,
            onDismiss = { showProjectDialog = false to null },
            onSave = {
                onSaveProject(it)
                showProjectDialog = false to null
            }
        )
    }
    if (showTeamDialog.first) {
        TeamMemberEditorDialog(
            initial = showTeamDialog.second,
            onDismiss = { showTeamDialog = false to null },
            onSave = {
                onSaveTeamMember(it)
                showTeamDialog = false to null
            }
        )
    }
    if (showJobDialog.first) {
        JobEditorDialog(
            initial = showJobDialog.second,
            onDismiss = { showJobDialog = false to null },
            onSave = {
                onSaveJob(it)
                showJobDialog = false to null
            }
        )
    }
    pdfToPreview?.let { (name, base64) ->
        PdfViewerDialog(
            fileName = name,
            base64Content = base64,
            onDismiss = { pdfToPreview = null }
        )
    }
}

@Composable
private fun StatsEditorCard(
    initial: SiteStats,
    onSaveStats: (SiteStats) -> Unit,
    onSeedDefaultData: () -> Unit
) {
    val strings = LocalStrings.current
    var projects by remember(initial) { mutableStateOf(initial.projectsDelivered.toString()) }
    var clients by remember(initial) { mutableStateOf(initial.happyClients.toString()) }
    var experts by remember(initial) { mutableStateOf(initial.teamExperts.toString()) }
    var years by remember(initial) { mutableStateOf(initial.yearsExperience.toString()) }

    GlassCard(highlightBorder = true, modifier = Modifier.fillMaxWidth()) {
        Text(strings.statsTitle, style = MaterialTheme.typography.titleLarge)
        Spacer(Modifier.height(12.dp))
        OutlinedTextField(
            value = projects,
            onValueChange = { projects = it.filter { c -> c.isDigit() } },
            label = { Text(strings.statProjects) },
            keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Number),
            modifier = Modifier.fillMaxWidth()
        )
        Spacer(Modifier.height(8.dp))
        OutlinedTextField(
            value = clients,
            onValueChange = { clients = it.filter { c -> c.isDigit() } },
            label = { Text(strings.statClients) },
            keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Number),
            modifier = Modifier.fillMaxWidth()
        )
        Spacer(Modifier.height(8.dp))
        OutlinedTextField(
            value = experts,
            onValueChange = { experts = it.filter { c -> c.isDigit() } },
            label = { Text(strings.statExperts) },
            keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Number),
            modifier = Modifier.fillMaxWidth()
        )
        Spacer(Modifier.height(8.dp))
        OutlinedTextField(
            value = years,
            onValueChange = { years = it.filter { c -> c.isDigit() } },
            label = { Text(strings.statYears) },
            keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Number),
            modifier = Modifier.fillMaxWidth()
        )
        Spacer(Modifier.height(14.dp))
        NeonPrimaryButton(
            text = strings.updateStats,
            onClick = {
                onSaveStats(
                    initial.copy(
                        projectsDelivered = projects.toLongOrNull() ?: initial.projectsDelivered,
                        happyClients = clients.toLongOrNull() ?: initial.happyClients,
                        teamExperts = experts.toLongOrNull() ?: initial.teamExperts,
                        yearsExperience = years.toLongOrNull() ?: initial.yearsExperience
                    )
                )
            },
            modifier = Modifier.fillMaxWidth()
        )
        Spacer(Modifier.height(10.dp))
        GlassOutlinedButton(
            text = strings.seedDataBtn,
            icon = Icons.Filled.Refresh,
            onClick = onSeedDefaultData,
            modifier = Modifier.fillMaxWidth()
        )
    }
}

@Composable
private fun AdminRowCard(
    title: String,
    subtitle: String,
    onEdit: () -> Unit,
    onDelete: () -> Unit
) {
    val strings = LocalStrings.current
    val vexora = LocalVexoraColors.current
    GlassCard(modifier = Modifier.fillMaxWidth()) {
        Row(
            modifier = Modifier.fillMaxWidth(),
            verticalAlignment = Alignment.CenterVertically,
            horizontalArrangement = Arrangement.SpaceBetween
        ) {
            Column(modifier = Modifier.weight(1f)) {
                Text(title, style = MaterialTheme.typography.titleMedium, fontWeight = FontWeight.Bold)
                Text(subtitle, style = MaterialTheme.typography.bodyMedium, color = vexora.mutedText)
            }
            Row {
                IconButton(onClick = onEdit, modifier = Modifier.minimumInteractiveComponentSize()) {
                    Icon(Icons.Filled.Edit, contentDescription = strings.edit, tint = vexora.neonCyan)
                }
                IconButton(onClick = onDelete, modifier = Modifier.minimumInteractiveComponentSize()) {
                    Icon(Icons.Filled.Delete, contentDescription = strings.delete, tint = vexora.error)
                }
            }
        }
    }
}
