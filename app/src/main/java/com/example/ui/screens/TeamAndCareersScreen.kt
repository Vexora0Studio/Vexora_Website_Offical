package com.example.ui.screens

import android.widget.Toast
import androidx.activity.compose.rememberLauncherForActivityResult
import androidx.activity.result.contract.ActivityResultContracts
import androidx.compose.foundation.BorderStroke
import androidx.compose.foundation.Image
import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.ExperimentalLayoutApi
import androidx.compose.foundation.layout.FlowRow
import androidx.compose.foundation.layout.PaddingValues
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.text.KeyboardOptions
import androidx.compose.foundation.verticalScroll
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.AttachFile
import androidx.compose.material.icons.filled.Badge
import androidx.compose.material.icons.filled.CheckCircle
import androidx.compose.material.icons.filled.Close
import androidx.compose.material.icons.filled.Description
import androidx.compose.material.icons.filled.LocationOn
import androidx.compose.material.icons.filled.Send
import androidx.compose.material.icons.filled.Work
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.material3.HorizontalDivider
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.OutlinedTextField
import androidx.compose.material3.Surface
import androidx.compose.material3.Tab
import androidx.compose.material3.TabRow
import androidx.compose.material3.TabRowDefaults
import androidx.compose.material3.TabRowDefaults.tabIndicatorOffset
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
import androidx.compose.ui.draw.clip
import androidx.compose.ui.layout.ContentScale
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.platform.testTag
import androidx.compose.ui.res.painterResource
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.input.KeyboardType
import androidx.compose.ui.unit.dp
import androidx.compose.ui.window.Dialog
import coil.compose.AsyncImage
import com.example.R
import com.example.localization.AppLanguage
import com.example.localization.LocalAppLanguage
import com.example.localization.LocalStrings
import com.example.model.JobApplication
import com.example.model.JobOpening
import com.example.model.TeamMember
import com.example.model.UiState
import com.example.ui.components.GlassCard
import com.example.ui.components.GlassOutlinedButton
import com.example.ui.components.NeonPrimaryButton
import com.example.ui.components.PdfViewerDialog
import com.example.ui.components.StatusPill
import com.example.ui.theme.LocalVexoraColors
import com.example.util.PickedPdfResult
import com.example.util.readPdfFromUri

@Composable
fun TeamAndCareersScreen(
    teamState: UiState<List<TeamMember>>,
    jobsState: UiState<List<JobOpening>>,
    applicationsState: UiState<List<JobApplication>>,
    isSubmitting: Boolean,
    defaultUserName: String,
    defaultUserEmail: String,
    onSubmitApplication: (
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
    ) -> Unit
) {
    val strings = LocalStrings.current
    val vexora = LocalVexoraColors.current
    var selectedTab by remember { mutableIntStateOf(0) }
    var selectedJobForApply by remember { mutableStateOf<JobOpening?>(null) }

    Column(modifier = Modifier.fillMaxSize()) {
        TabRow(
            selectedTabIndex = selectedTab,
            containerColor = MaterialTheme.colorScheme.surface,
            contentColor = vexora.neonCyan,
            indicator = { tabPositions ->
                TabRowDefaults.SecondaryIndicator(
                    modifier = Modifier.tabIndicatorOffset(tabPositions[selectedTab]),
                    color = vexora.neonCyan
                )
            }
        ) {
            Tab(
                selected = selectedTab == 0,
                onClick = { selectedTab = 0 },
                text = { Text(strings.tabTeam) }
            )
            Tab(
                selected = selectedTab == 1,
                onClick = { selectedTab = 1 },
                text = { Text(strings.tabCareers) }
            )
            Tab(
                selected = selectedTab == 2,
                onClick = { selectedTab = 2 },
                text = { Text(strings.tabMyApplications) }
            )
        }

        when (selectedTab) {
            0 -> TeamDirectoryTab(teamState = teamState)
            1 -> CareersApplyTab(
                jobsState = jobsState,
                isSubmitting = isSubmitting,
                defaultUserName = defaultUserName,
                defaultUserEmail = defaultUserEmail,
                preselectedJob = selectedJobForApply,
                onSelectJob = { selectedJobForApply = it },
                onSubmitApplication = onSubmitApplication
            )
            else -> MyApplicationsTab(applicationsState = applicationsState)
        }
    }
}

@OptIn(ExperimentalLayoutApi::class)
@Composable
private fun TeamDirectoryTab(teamState: UiState<List<TeamMember>>) {
    val strings = LocalStrings.current
    val isArabic = LocalAppLanguage.current == AppLanguage.AR
    val vexora = LocalVexoraColors.current
    var cvMemberDialog by remember { mutableStateOf<TeamMember?>(null) }
    var pdfMemberViewer by remember { mutableStateOf<TeamMember?>(null) }

    LazyColumn(
        modifier = Modifier.fillMaxSize(),
        contentPadding = PaddingValues(16.dp),
        verticalArrangement = Arrangement.spacedBy(14.dp)
    ) {
        item {
            Image(
                painter = painterResource(R.drawable.img_studio_team),
                contentDescription = strings.tabTeam,
                contentScale = ContentScale.Crop,
                modifier = Modifier
                    .fillMaxWidth()
                    .height(150.dp)
                    .clip(MaterialTheme.shapes.large)
            )
        }

        when (teamState) {
            is UiState.Loading -> item {
                Box(Modifier.fillMaxWidth().padding(32.dp), contentAlignment = Alignment.Center) {
                    CircularProgressIndicator(color = vexora.neonCyan)
                }
            }
            is UiState.Error -> item {
                GlassCard(modifier = Modifier.fillMaxWidth()) {
                    Text("${strings.errorOccurred} ${teamState.message}", color = vexora.error)
                }
            }
            is UiState.Success -> {
                val members = teamState.data.filter { it.published }
                items(members, key = { it.id }) { member ->
                    val name = if (isArabic) member.nameAr else member.nameEn
                    val role = if (isArabic) member.roleAr else member.roleEn
                    val bio = if (isArabic) member.bioAr else member.bioEn
                    val isCeo = member.id == "tm_omar_ceo" ||
                        member.avatarUrl == "drawable:omar_develepor" ||
                        member.nameEn.contains("Omar_Develepor", ignoreCase = true)

                    GlassCard(
                        modifier = Modifier.fillMaxWidth(),
                        highlightBorder = isCeo
                    ) {
                        Row(
                            verticalAlignment = Alignment.CenterVertically,
                            horizontalArrangement = Arrangement.spacedBy(14.dp)
                        ) {
                            MemberAvatar(
                                name = name,
                                avatarUrl = member.avatarUrl,
                                isCeo = isCeo
                            )
                            Column(modifier = Modifier.weight(1f)) {
                                Text(name, style = MaterialTheme.typography.titleMedium, fontWeight = FontWeight.Bold)
                                Text(role, style = MaterialTheme.typography.bodyMedium, color = vexora.neonCyan)
                                Spacer(Modifier.height(4.dp))
                                Text(
                                    text = "${member.experienceYears} ${strings.yearsExpSuffix}",
                                    style = MaterialTheme.typography.labelMedium,
                                    color = vexora.mutedText
                                )
                            }
                        }
                        Spacer(Modifier.height(10.dp))
                        Text(bio, style = MaterialTheme.typography.bodyMedium, color = MaterialTheme.colorScheme.onSurface)
                        if (member.skills.isNotEmpty()) {
                            Spacer(Modifier.height(10.dp))
                            FlowRow(
                                horizontalArrangement = Arrangement.spacedBy(6.dp),
                                verticalArrangement = Arrangement.spacedBy(6.dp)
                            ) {
                                member.skills.forEach { skill ->
                                    Surface(
                                        shape = RoundedCornerShape(8.dp),
                                        color = MaterialTheme.colorScheme.surfaceVariant,
                                        border = BorderStroke(1.dp, vexora.glassWhiteBorder)
                                    ) {
                                        Text(
                                            text = skill,
                                            style = MaterialTheme.typography.labelSmall,
                                            modifier = Modifier.padding(horizontal = 10.dp, vertical = 5.dp)
                                        )
                                    }
                                }
                            }
                        }
                        Spacer(Modifier.height(12.dp))
                        GlassOutlinedButton(
                            text = strings.viewCv,
                            icon = Icons.Filled.Description,
                            onClick = { cvMemberDialog = member },
                            modifier = Modifier.fillMaxWidth()
                        )
                    }
                }
            }
        }
    }

    cvMemberDialog?.let { member ->
        val name = if (isArabic) member.nameAr else member.nameEn
        val role = if (isArabic) member.roleAr else member.roleEn
        val cvSummary = if (isArabic) member.cvSummaryAr else member.cvSummaryEn
        Dialog(onDismissRequest = { cvMemberDialog = null }) {
            GlassCard(highlightBorder = true, modifier = Modifier.fillMaxWidth()) {
                Row(
                    modifier = Modifier.fillMaxWidth(),
                    horizontalArrangement = Arrangement.SpaceBetween,
                    verticalAlignment = Alignment.CenterVertically
                ) {
                    Text(strings.cvDetailsTitle, style = MaterialTheme.typography.titleLarge, color = vexora.neonCyan)
                    IconButton(onClick = { cvMemberDialog = null }, modifier = Modifier.minimumInteractiveComponentSize()) {
                        Icon(Icons.Filled.Close, contentDescription = strings.close)
                    }
                }
                Spacer(Modifier.height(8.dp))
                Text(name, style = MaterialTheme.typography.titleMedium, fontWeight = FontWeight.Bold)
                Text(role, style = MaterialTheme.typography.bodyMedium, color = vexora.neonCyan)
                HorizontalDivider(modifier = Modifier.padding(vertical = 12.dp), color = vexora.glassWhiteBorder)
                Text(
                    text = cvSummary.ifBlank { if (isArabic) member.bioAr else member.bioEn },
                    style = MaterialTheme.typography.bodyLarge
                )
                if (member.skills.isNotEmpty()) {
                    Spacer(Modifier.height(12.dp))
                    Text(member.skills.joinToString(" • "), style = MaterialTheme.typography.bodyMedium, color = vexora.mutedText)
                }
                if (!member.cvPdfBase64.isNullOrBlank()) {
                    Spacer(Modifier.height(16.dp))
                    NeonPrimaryButton(
                        text = strings.viewDownloadPdf,
                        icon = Icons.Filled.Description,
                        onClick = {
                            cvMemberDialog = null
                            pdfMemberViewer = member
                        },
                        modifier = Modifier.fillMaxWidth()
                    )
                }
            }
        }
    }

    pdfMemberViewer?.let { member ->
        PdfViewerDialog(
            fileName = member.cvFileName ?: "${member.nameEn}_CV.pdf",
            base64Content = member.cvPdfBase64.orEmpty(),
            onDismiss = { pdfMemberViewer = null }
        )
    }
}

@Composable
private fun MemberAvatar(name: String, avatarUrl: String, isCeo: Boolean = false) {
    val vexora = LocalVexoraColors.current
    val avatarSize = if (isCeo) 72.dp else 58.dp
    val initials = name.trim().split(" ").filter { it.isNotEmpty() }.take(2)
        .joinToString("") { it.first().uppercaseChar().toString() }.ifBlank { "VX" }
    when {
        avatarUrl == "drawable:omar_develepor" || name.contains("Omar_Develepor", ignoreCase = true) -> {
            Image(
                painter = painterResource(R.drawable.img_omar_developer),
                contentDescription = name,
                contentScale = ContentScale.Crop,
                modifier = Modifier
                    .size(avatarSize)
                    .clip(CircleShape)
                    .border(2.dp, vexora.neonCyan, CircleShape)
            )
        }
        avatarUrl.isNotBlank() -> {
            AsyncImage(
                model = avatarUrl,
                contentDescription = name,
                contentScale = ContentScale.Crop,
                modifier = Modifier
                    .size(avatarSize)
                    .clip(CircleShape)
                    .border(1.5.dp, vexora.neonCyan, CircleShape)
            )
        }
        else -> {
            Box(
                modifier = Modifier
                    .size(avatarSize)
                    .clip(CircleShape)
                    .background(MaterialTheme.colorScheme.primaryContainer)
                    .border(1.5.dp, vexora.neonCyan, CircleShape),
                contentAlignment = Alignment.Center
            ) {
                Text(
                    text = initials,
                    style = MaterialTheme.typography.titleMedium,
                    fontWeight = FontWeight.Bold,
                    color = vexora.neonCyan
                )
            }
        }
    }
}

@Composable
private fun CareersApplyTab(
    jobsState: UiState<List<JobOpening>>,
    isSubmitting: Boolean,
    defaultUserName: String,
    defaultUserEmail: String,
    preselectedJob: JobOpening?,
    onSelectJob: (JobOpening) -> Unit,
    onSubmitApplication: (
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
    ) -> Unit
) {
    val context = LocalContext.current
    val strings = LocalStrings.current
    val isArabic = LocalAppLanguage.current == AppLanguage.AR
    val vexora = LocalVexoraColors.current

    var fullName by remember(defaultUserName) { mutableStateOf(defaultUserName) }
    var email by remember(defaultUserEmail) { mutableStateOf(defaultUserEmail) }
    var phone by remember { mutableStateOf("") }
    var desiredRole by remember(preselectedJob, isArabic) {
        mutableStateOf(preselectedJob?.let { if (isArabic) it.titleAr else it.titleEn } ?: "")
    }
    var experienceYears by remember { mutableStateOf("") }
    var skills by remember { mutableStateOf("") }
    var pickedPdf by remember { mutableStateOf<PickedPdfResult?>(null) }
    var validationError by remember { mutableStateOf<String?>(null) }

    val pdfPickerLauncher = rememberLauncherForActivityResult(
        contract = ActivityResultContracts.OpenDocument()
    ) { uri ->
        if (uri != null) {
            readPdfFromUri(context, uri)
                .onSuccess {
                    pickedPdf = it
                    validationError = null
                }
                .onFailure { err ->
                    validationError = err.localizedMessage ?: "Invalid PDF"
                }
        }
    }

    Column(
        modifier = Modifier
            .fillMaxSize()
            .verticalScroll(rememberScrollState())
            .padding(16.dp),
        verticalArrangement = Arrangement.spacedBy(16.dp)
    ) {
        Text(strings.openPositionsTitle, style = MaterialTheme.typography.titleLarge)

        when (jobsState) {
            is UiState.Loading -> CircularProgressIndicator(color = vexora.neonCyan)
            is UiState.Error -> Text("${strings.errorOccurred} ${jobsState.message}", color = vexora.error)
            is UiState.Success -> {
                val openJobs = jobsState.data.filter { it.published }
                if (openJobs.isEmpty()) {
                    GlassCard(modifier = Modifier.fillMaxWidth()) {
                        Text(strings.noJobsYet, color = vexora.mutedText)
                    }
                } else {
                    openJobs.forEach { job ->
                        val title = if (isArabic) job.titleAr else job.titleEn
                        val dept = if (isArabic) job.departmentAr else job.departmentEn
                        val desc = if (isArabic) job.descriptionAr else job.descriptionEn
                        val loc = if (isArabic) job.locationAr else job.locationEn
                        val isSelected = preselectedJob?.id == job.id

                        GlassCard(
                            modifier = Modifier.fillMaxWidth(),
                            highlightBorder = isSelected,
                            onClick = {
                                onSelectJob(job)
                                desiredRole = title
                            }
                        ) {
                            Row(
                                modifier = Modifier.fillMaxWidth(),
                                horizontalArrangement = Arrangement.SpaceBetween,
                                verticalAlignment = Alignment.CenterVertically
                            ) {
                                Text(title, style = MaterialTheme.typography.titleMedium, modifier = Modifier.weight(1f))
                                StatusPill(label = dept, color = vexora.neonCyan)
                            }
                            Spacer(Modifier.height(6.dp))
                            Text(desc, style = MaterialTheme.typography.bodyMedium, color = vexora.mutedText)
                            Spacer(Modifier.height(8.dp))
                            Row(
                                verticalAlignment = Alignment.CenterVertically,
                                horizontalArrangement = Arrangement.spacedBy(6.dp)
                            ) {
                                Icon(Icons.Filled.LocationOn, contentDescription = null, tint = vexora.neonCyan, modifier = Modifier.size(16.dp))
                                Text(loc, style = MaterialTheme.typography.labelMedium, color = MaterialTheme.colorScheme.onSurface)
                            }
                        }
                    }
                }
            }
        }

        GlassCard(highlightBorder = true, modifier = Modifier.fillMaxWidth()) {
            Row(
                verticalAlignment = Alignment.CenterVertically,
                horizontalArrangement = Arrangement.spacedBy(8.dp)
            ) {
                Icon(Icons.Filled.Work, contentDescription = null, tint = vexora.neonCyan)
                Text(strings.applyForJobTitle, style = MaterialTheme.typography.titleLarge)
            }
            Spacer(Modifier.height(14.dp))

            OutlinedTextField(
                value = fullName,
                onValueChange = { fullName = it },
                label = { Text(strings.fullNameLabel) },
                singleLine = true,
                modifier = Modifier.fillMaxWidth().testTag("career_fullname_input")
            )
            Spacer(Modifier.height(10.dp))
            OutlinedTextField(
                value = email,
                onValueChange = { email = it },
                label = { Text(strings.emailLabel) },
                singleLine = true,
                keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Email),
                modifier = Modifier.fillMaxWidth().testTag("career_email_input")
            )
            Spacer(Modifier.height(10.dp))
            OutlinedTextField(
                value = phone,
                onValueChange = { phone = it },
                label = { Text(strings.phoneLabel) },
                singleLine = true,
                keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Phone),
                modifier = Modifier.fillMaxWidth().testTag("career_phone_input")
            )
            Spacer(Modifier.height(10.dp))
            OutlinedTextField(
                value = desiredRole,
                onValueChange = { desiredRole = it },
                label = { Text(strings.desiredRoleLabel) },
                singleLine = true,
                modifier = Modifier.fillMaxWidth().testTag("career_role_input")
            )
            Spacer(Modifier.height(10.dp))
            OutlinedTextField(
                value = experienceYears,
                onValueChange = { experienceYears = it.filter { ch -> ch.isDigit() }.take(2) },
                label = { Text(strings.experienceYearsLabel) },
                singleLine = true,
                keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Number),
                modifier = Modifier.fillMaxWidth().testTag("career_exp_input")
            )
            Spacer(Modifier.height(10.dp))
            OutlinedTextField(
                value = skills,
                onValueChange = { skills = it },
                label = { Text(strings.skillsLabel) },
                minLines = 2,
                maxLines = 4,
                modifier = Modifier.fillMaxWidth().testTag("career_skills_input")
            )
            Spacer(Modifier.height(12.dp))

            GlassOutlinedButton(
                text = strings.uploadPdfCv,
                icon = Icons.Filled.AttachFile,
                onClick = { pdfPickerLauncher.launch(arrayOf("application/pdf")) },
                modifier = Modifier.fillMaxWidth().testTag("upload_pdf_cv_btn")
            )
            Spacer(Modifier.height(6.dp))
            val pdf = pickedPdf
            if (pdf != null) {
                Row(
                    verticalAlignment = Alignment.CenterVertically,
                    horizontalArrangement = Arrangement.spacedBy(6.dp)
                ) {
                    Icon(Icons.Filled.CheckCircle, contentDescription = null, tint = vexora.success, modifier = Modifier.size(16.dp))
                    Text(
                        text = "${strings.pdfSelectedPrefix} ${pdf.fileName} (${pdf.sizeBytes / 1024} KB)",
                        style = MaterialTheme.typography.labelMedium,
                        color = vexora.success
                    )
                }
            } else {
                Text(strings.pdfLimitHint, style = MaterialTheme.typography.labelSmall, color = vexora.mutedText)
            }

            if (!validationError.isNullOrBlank()) {
                Spacer(Modifier.height(8.dp))
                Text(validationError!!, style = MaterialTheme.typography.bodyMedium, color = vexora.error)
            }

            Spacer(Modifier.height(16.dp))
            NeonPrimaryButton(
                text = if (isSubmitting) strings.loading else strings.submitApplication,
                icon = Icons.Filled.Send,
                enabled = !isSubmitting,
                onClick = {
                    val yrs = experienceYears.toLongOrNull() ?: 0L
                    val attached = pickedPdf
                    when {
                        fullName.trim().length < 2 -> validationError = strings.fullNameLabel
                        !email.contains("@") || email.trim().length < 5 -> validationError = strings.emailLabel
                        phone.trim().length < 5 -> validationError = strings.phoneLabel
                        desiredRole.trim().length < 2 -> validationError = strings.desiredRoleLabel
                        skills.trim().length < 2 -> validationError = strings.skillsLabel
                        attached == null -> validationError = strings.uploadPdfCv
                        else -> {
                            validationError = null
                            onSubmitApplication(
                                preselectedJob?.id,
                                fullName,
                                email,
                                phone,
                                desiredRole,
                                yrs,
                                skills,
                                attached.fileName,
                                attached.base64,
                                attached.sizeBytes
                            )
                            Toast.makeText(context, strings.applicationSubmitted, Toast.LENGTH_SHORT).show()
                        }
                    }
                },
                modifier = Modifier.fillMaxWidth().testTag("submit_application_btn")
            )
        }
    }
}

@Composable
private fun MyApplicationsTab(applicationsState: UiState<List<JobApplication>>) {
    val strings = LocalStrings.current
    val vexora = LocalVexoraColors.current

    LazyColumn(
        modifier = Modifier.fillMaxSize(),
        contentPadding = PaddingValues(16.dp),
        verticalArrangement = Arrangement.spacedBy(12.dp)
    ) {
        when (applicationsState) {
            is UiState.Loading -> item {
                Box(Modifier.fillMaxWidth().padding(32.dp), contentAlignment = Alignment.Center) {
                    CircularProgressIndicator(color = vexora.neonCyan)
                }
            }
            is UiState.Error -> item {
                GlassCard(modifier = Modifier.fillMaxWidth()) {
                    Text("${strings.errorOccurred} ${applicationsState.message}", color = vexora.error)
                }
            }
            is UiState.Success -> {
                if (applicationsState.data.isEmpty()) {
                    item {
                        GlassCard(modifier = Modifier.fillMaxWidth()) {
                            Row(verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(10.dp)) {
                                Icon(Icons.Filled.Badge, contentDescription = null, tint = vexora.neonCyan)
                                Text(strings.tabMyApplications, color = vexora.mutedText)
                            }
                        }
                    }
                } else {
                    items(applicationsState.data, key = { it.id }) { app ->
                        val (statusText, statusColor) = when (app.status) {
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
                                Text(app.desiredRole, style = MaterialTheme.typography.titleMedium, modifier = Modifier.weight(1f))
                                StatusPill(label = statusText, color = statusColor)
                            }
                            Spacer(Modifier.height(6.dp))
                            Text("${app.fullName} • ${app.cvFileName}", style = MaterialTheme.typography.bodyMedium, color = vexora.mutedText)
                            if (!app.adminNote.isNullOrBlank()) {
                                Spacer(Modifier.height(6.dp))
                                Text(app.adminNote, style = MaterialTheme.typography.bodyMedium, color = vexora.neonCyan)
                            }
                        }
                    }
                }
            }
        }
    }
}
