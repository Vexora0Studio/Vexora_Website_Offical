package com.example.ui.screens

import androidx.activity.compose.rememberLauncherForActivityResult
import androidx.activity.result.contract.ActivityResultContracts
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.text.KeyboardOptions
import androidx.compose.foundation.verticalScroll
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.AttachFile
import androidx.compose.material3.FilterChip
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.OutlinedTextField
import androidx.compose.material3.Surface
import androidx.compose.material3.Switch
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.text.input.KeyboardType
import androidx.compose.ui.unit.dp
import androidx.compose.ui.window.Dialog
import com.example.localization.AppLanguage
import com.example.localization.LocalAppLanguage
import com.example.localization.LocalStrings
import com.example.model.JobOpening
import com.example.model.ProjectItem
import com.example.model.ServiceItem
import com.example.model.TeamMember
import com.example.ui.components.GlassOutlinedButton
import com.example.ui.components.NeonPrimaryButton
import com.example.ui.theme.LocalVexoraColors
import com.example.util.readPdfFromUri

@Composable
fun ServiceEditorDialog(
    initial: ServiceItem?,
    onDismiss: () -> Unit,
    onSave: (ServiceItem) -> Unit
) {
    val strings = LocalStrings.current
    val isArabic = LocalAppLanguage.current == AppLanguage.AR
    var titleEn by remember { mutableStateOf(initial?.titleEn ?: "") }
    var titleAr by remember { mutableStateOf(initial?.titleAr ?: "") }
    var descEn by remember { mutableStateOf(initial?.descriptionEn ?: "") }
    var descAr by remember { mutableStateOf(initial?.descriptionAr ?: "") }
    var category by remember { mutableStateOf(initial?.category ?: "web") }
    var iconKey by remember { mutableStateOf(initial?.iconKey ?: "web") }
    var published by remember { mutableStateOf(initial?.published ?: true) }

    Dialog(onDismissRequest = onDismiss) {
        Surface(shape = MaterialTheme.shapes.large, color = MaterialTheme.colorScheme.surface) {
            Column(
                modifier = Modifier.padding(18.dp).verticalScroll(rememberScrollState()),
                verticalArrangement = Arrangement.spacedBy(10.dp)
            ) {
                Text(if (initial == null) strings.addNew else strings.edit, style = MaterialTheme.typography.titleLarge)
                OutlinedTextField(value = titleAr, onValueChange = { titleAr = it }, label = { Text("العنوان (AR)") }, modifier = Modifier.fillMaxWidth())
                OutlinedTextField(value = titleEn, onValueChange = { titleEn = it }, label = { Text("Title (EN)") }, modifier = Modifier.fillMaxWidth())
                OutlinedTextField(value = descAr, onValueChange = { descAr = it }, label = { Text("الوصف (AR)") }, minLines = 2, modifier = Modifier.fillMaxWidth())
                OutlinedTextField(value = descEn, onValueChange = { descEn = it }, label = { Text("Description (EN)") }, minLines = 2, modifier = Modifier.fillMaxWidth())
                OutlinedTextField(value = category, onValueChange = { category = it }, label = { Text("Category (web/mobile/ai/design/media/engineering)") }, modifier = Modifier.fillMaxWidth())
                OutlinedTextField(value = iconKey, onValueChange = { iconKey = it }, label = { Text("Icon (web/android/ai/palette/video/uiux/code)") }, modifier = Modifier.fillMaxWidth())
                Row(verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.SpaceBetween, modifier = Modifier.fillMaxWidth()) {
                    Text(if (isArabic) "منشور" else "Published")
                    Switch(checked = published, onCheckedChange = { published = it })
                }
                Row(horizontalArrangement = Arrangement.spacedBy(8.dp), modifier = Modifier.fillMaxWidth()) {
                    GlassOutlinedButton(text = strings.cancel, onClick = onDismiss, modifier = Modifier.weight(1f))
                    NeonPrimaryButton(
                        text = strings.save,
                        enabled = titleEn.isNotBlank() && titleAr.isNotBlank() && descEn.isNotBlank() && descAr.isNotBlank(),
                        onClick = {
                            onSave(
                                (initial ?: ServiceItem()).copy(
                                    titleEn = titleEn,
                                    titleAr = titleAr,
                                    descriptionEn = descEn,
                                    descriptionAr = descAr,
                                    category = category.ifBlank { "engineering" },
                                    iconKey = iconKey.ifBlank { "code" },
                                    published = published
                                )
                            )
                        },
                        modifier = Modifier.weight(1f)
                    )
                }
            }
        }
    }
}

@Composable
fun ProjectEditorDialog(
    initial: ProjectItem?,
    onDismiss: () -> Unit,
    onSave: (ProjectItem) -> Unit
) {
    val strings = LocalStrings.current
    val isArabic = LocalAppLanguage.current == AppLanguage.AR
    var nameEn by remember { mutableStateOf(initial?.nameEn ?: "") }
    var nameAr by remember { mutableStateOf(initial?.nameAr ?: "") }
    var descEn by remember { mutableStateOf(initial?.descriptionEn ?: "") }
    var descAr by remember { mutableStateOf(initial?.descriptionAr ?: "") }
    var imageUrl by remember { mutableStateOf(initial?.imageUrl ?: "") }
    var presetKey by remember { mutableStateOf(initial?.presetImageKey ?: "web") }
    var websiteUrl by remember { mutableStateOf(initial?.websiteUrl ?: "") }
    var techText by remember { mutableStateOf(initial?.technologies?.joinToString(", ") ?: "React, TypeScript") }
    var status by remember { mutableStateOf(initial?.status ?: "available") }
    var featured by remember { mutableStateOf(initial?.featured ?: false) }
    var published by remember { mutableStateOf(initial?.published ?: true) }

    Dialog(onDismissRequest = onDismiss) {
        Surface(shape = MaterialTheme.shapes.large, color = MaterialTheme.colorScheme.surface) {
            Column(
                modifier = Modifier.padding(18.dp).verticalScroll(rememberScrollState()),
                verticalArrangement = Arrangement.spacedBy(10.dp)
            ) {
                Text(if (initial == null) strings.addNew else strings.edit, style = MaterialTheme.typography.titleLarge)
                OutlinedTextField(value = nameAr, onValueChange = { nameAr = it }, label = { Text("اسم المشروع (AR)") }, modifier = Modifier.fillMaxWidth())
                OutlinedTextField(value = nameEn, onValueChange = { nameEn = it }, label = { Text("Project Name (EN)") }, modifier = Modifier.fillMaxWidth())
                OutlinedTextField(value = descAr, onValueChange = { descAr = it }, label = { Text("الوصف (AR)") }, minLines = 2, modifier = Modifier.fillMaxWidth())
                OutlinedTextField(value = descEn, onValueChange = { descEn = it }, label = { Text("Description (EN)") }, minLines = 2, modifier = Modifier.fillMaxWidth())
                OutlinedTextField(value = websiteUrl, onValueChange = { websiteUrl = it }, label = { Text("Website URL") }, modifier = Modifier.fillMaxWidth())
                OutlinedTextField(value = imageUrl, onValueChange = { imageUrl = it }, label = { Text("Preview Image URL (optional)") }, modifier = Modifier.fillMaxWidth())
                OutlinedTextField(value = presetKey, onValueChange = { presetKey = it }, label = { Text("Fallback Art (web/mobile/studio/hero/f_cutus/noorix)") }, modifier = Modifier.fillMaxWidth())
                OutlinedTextField(value = techText, onValueChange = { techText = it }, label = { Text("Technologies (comma-separated)") }, modifier = Modifier.fillMaxWidth())

                Row(horizontalArrangement = Arrangement.spacedBy(6.dp)) {
                    listOf("available", "in_development", "completed").forEach { st ->
                        FilterChip(selected = status == st, onClick = { status = st }, label = { Text(st) })
                    }
                }
                Row(verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.SpaceBetween, modifier = Modifier.fillMaxWidth()) {
                    Text(if (isArabic) "مميز بالرئيسية" else "Featured")
                    Switch(checked = featured, onCheckedChange = { featured = it })
                }
                Row(verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.SpaceBetween, modifier = Modifier.fillMaxWidth()) {
                    Text(if (isArabic) "منشور" else "Published")
                    Switch(checked = published, onCheckedChange = { published = it })
                }
                Row(horizontalArrangement = Arrangement.spacedBy(8.dp), modifier = Modifier.fillMaxWidth()) {
                    GlassOutlinedButton(text = strings.cancel, onClick = onDismiss, modifier = Modifier.weight(1f))
                    NeonPrimaryButton(
                        text = strings.save,
                        enabled = nameEn.isNotBlank() && nameAr.isNotBlank() && descEn.isNotBlank() && descAr.isNotBlank(),
                        onClick = {
                            onSave(
                                (initial ?: ProjectItem()).copy(
                                    nameEn = nameEn,
                                    nameAr = nameAr,
                                    descriptionEn = descEn,
                                    descriptionAr = descAr,
                                    imageUrl = imageUrl,
                                    presetImageKey = presetKey.ifBlank { "web" },
                                    websiteUrl = websiteUrl,
                                    technologies = techText.split(",").map { it.trim() }.filter { it.isNotEmpty() },
                                    status = status,
                                    featured = featured,
                                    published = published
                                )
                            )
                        },
                        modifier = Modifier.weight(1f)
                    )
                }
            }
        }
    }
}

@Composable
fun TeamMemberEditorDialog(
    initial: TeamMember?,
    onDismiss: () -> Unit,
    onSave: (TeamMember) -> Unit
) {
    val context = LocalContext.current
    val strings = LocalStrings.current
    val vexora = LocalVexoraColors.current
    var nameEn by remember { mutableStateOf(initial?.nameEn ?: "") }
    var nameAr by remember { mutableStateOf(initial?.nameAr ?: "") }
    var roleEn by remember { mutableStateOf(initial?.roleEn ?: "") }
    var roleAr by remember { mutableStateOf(initial?.roleAr ?: "") }
    var bioEn by remember { mutableStateOf(initial?.bioEn ?: "") }
    var bioAr by remember { mutableStateOf(initial?.bioAr ?: "") }
    var skillsText by remember { mutableStateOf(initial?.skills?.joinToString(", ") ?: "") }
    var expYears by remember { mutableStateOf((initial?.experienceYears ?: 3L).toString()) }
    var avatarUrl by remember { mutableStateOf(initial?.avatarUrl ?: "") }
    var cvSummaryEn by remember { mutableStateOf(initial?.cvSummaryEn ?: "") }
    var cvSummaryAr by remember { mutableStateOf(initial?.cvSummaryAr ?: "") }
    var cvFileName by remember { mutableStateOf(initial?.cvFileName) }
    var cvPdfBase64 by remember { mutableStateOf(initial?.cvPdfBase64) }
    var pdfError by remember { mutableStateOf<String?>(null) }

    val pdfLauncher = rememberLauncherForActivityResult(ActivityResultContracts.OpenDocument()) { uri ->
        if (uri != null) {
            readPdfFromUri(context, uri)
                .onSuccess {
                    cvFileName = it.fileName
                    cvPdfBase64 = it.base64
                    pdfError = null
                }
                .onFailure { pdfError = it.localizedMessage }
        }
    }

    Dialog(onDismissRequest = onDismiss) {
        Surface(shape = MaterialTheme.shapes.large, color = MaterialTheme.colorScheme.surface) {
            Column(
                modifier = Modifier.padding(18.dp).verticalScroll(rememberScrollState()),
                verticalArrangement = Arrangement.spacedBy(10.dp)
            ) {
                Text(if (initial == null) strings.addNew else strings.edit, style = MaterialTheme.typography.titleLarge)
                OutlinedTextField(value = nameAr, onValueChange = { nameAr = it }, label = { Text("الاسم (AR)") }, modifier = Modifier.fillMaxWidth())
                OutlinedTextField(value = nameEn, onValueChange = { nameEn = it }, label = { Text("Name (EN)") }, modifier = Modifier.fillMaxWidth())
                OutlinedTextField(value = roleAr, onValueChange = { roleAr = it }, label = { Text("المسمى الوظيفي (AR)") }, modifier = Modifier.fillMaxWidth())
                OutlinedTextField(value = roleEn, onValueChange = { roleEn = it }, label = { Text("Role (EN)") }, modifier = Modifier.fillMaxWidth())
                OutlinedTextField(value = bioAr, onValueChange = { bioAr = it }, label = { Text("النبذة (AR)") }, minLines = 2, modifier = Modifier.fillMaxWidth())
                OutlinedTextField(value = bioEn, onValueChange = { bioEn = it }, label = { Text("Bio (EN)") }, minLines = 2, modifier = Modifier.fillMaxWidth())
                OutlinedTextField(value = skillsText, onValueChange = { skillsText = it }, label = { Text("Skills (comma-separated)") }, modifier = Modifier.fillMaxWidth())
                OutlinedTextField(
                    value = expYears,
                    onValueChange = { expYears = it.filter { ch -> ch.isDigit() }.take(2) },
                    label = { Text(strings.experienceYearsLabel) },
                    keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Number),
                    modifier = Modifier.fillMaxWidth()
                )
                OutlinedTextField(value = avatarUrl, onValueChange = { avatarUrl = it }, label = { Text("Avatar URL (optional)") }, modifier = Modifier.fillMaxWidth())
                OutlinedTextField(value = cvSummaryAr, onValueChange = { cvSummaryAr = it }, label = { Text("ملخص CV (AR)") }, minLines = 2, modifier = Modifier.fillMaxWidth())
                OutlinedTextField(value = cvSummaryEn, onValueChange = { cvSummaryEn = it }, label = { Text("CV Summary (EN)") }, minLines = 2, modifier = Modifier.fillMaxWidth())

                GlassOutlinedButton(
                    text = cvFileName ?: strings.uploadPdfCv,
                    icon = Icons.Filled.AttachFile,
                    onClick = { pdfLauncher.launch(arrayOf("application/pdf")) },
                    modifier = Modifier.fillMaxWidth()
                )
                if (!pdfError.isNullOrBlank()) {
                    Text(pdfError!!, color = vexora.error, style = MaterialTheme.typography.bodyMedium)
                }

                Spacer(Modifier.height(4.dp))
                Row(horizontalArrangement = Arrangement.spacedBy(8.dp), modifier = Modifier.fillMaxWidth()) {
                    GlassOutlinedButton(text = strings.cancel, onClick = onDismiss, modifier = Modifier.weight(1f))
                    NeonPrimaryButton(
                        text = strings.save,
                        enabled = nameEn.isNotBlank() && nameAr.isNotBlank() && roleEn.isNotBlank() && roleAr.isNotBlank(),
                        onClick = {
                            onSave(
                                (initial ?: TeamMember()).copy(
                                    nameEn = nameEn,
                                    nameAr = nameAr,
                                    roleEn = roleEn,
                                    roleAr = roleAr,
                                    bioEn = bioEn.ifBlank { roleEn },
                                    bioAr = bioAr.ifBlank { roleAr },
                                    skills = skillsText.split(",").map { it.trim() }.filter { it.isNotEmpty() },
                                    experienceYears = expYears.toLongOrNull() ?: 1L,
                                    avatarUrl = avatarUrl,
                                    cvSummaryEn = cvSummaryEn,
                                    cvSummaryAr = cvSummaryAr,
                                    cvFileName = cvFileName,
                                    cvPdfBase64 = cvPdfBase64,
                                    published = true
                                )
                            )
                        },
                        modifier = Modifier.weight(1f)
                    )
                }
            }
        }
    }
}

@Composable
fun JobEditorDialog(
    initial: JobOpening?,
    onDismiss: () -> Unit,
    onSave: (JobOpening) -> Unit
) {
    val strings = LocalStrings.current
    var titleEn by remember { mutableStateOf(initial?.titleEn ?: "") }
    var titleAr by remember { mutableStateOf(initial?.titleAr ?: "") }
    var deptEn by remember { mutableStateOf(initial?.departmentEn ?: "Engineering") }
    var deptAr by remember { mutableStateOf(initial?.departmentAr ?: "الهندسة") }
    var descEn by remember { mutableStateOf(initial?.descriptionEn ?: "") }
    var descAr by remember { mutableStateOf(initial?.descriptionAr ?: "") }
    var locEn by remember { mutableStateOf(initial?.locationEn ?: "Remote") }
    var locAr by remember { mutableStateOf(initial?.locationAr ?: "عن بُعد") }
    var empType by remember { mutableStateOf(initial?.employmentType ?: "full_time") }

    Dialog(onDismissRequest = onDismiss) {
        Surface(shape = MaterialTheme.shapes.large, color = MaterialTheme.colorScheme.surface) {
            Column(
                modifier = Modifier.padding(18.dp).verticalScroll(rememberScrollState()),
                verticalArrangement = Arrangement.spacedBy(10.dp)
            ) {
                Text(if (initial == null) strings.addNew else strings.edit, style = MaterialTheme.typography.titleLarge)
                OutlinedTextField(value = titleAr, onValueChange = { titleAr = it }, label = { Text("المسمى (AR)") }, modifier = Modifier.fillMaxWidth())
                OutlinedTextField(value = titleEn, onValueChange = { titleEn = it }, label = { Text("Title (EN)") }, modifier = Modifier.fillMaxWidth())
                OutlinedTextField(value = deptAr, onValueChange = { deptAr = it }, label = { Text("القسم (AR)") }, modifier = Modifier.fillMaxWidth())
                OutlinedTextField(value = deptEn, onValueChange = { deptEn = it }, label = { Text("Department (EN)") }, modifier = Modifier.fillMaxWidth())
                OutlinedTextField(value = descAr, onValueChange = { descAr = it }, label = { Text("الوصف (AR)") }, minLines = 2, modifier = Modifier.fillMaxWidth())
                OutlinedTextField(value = descEn, onValueChange = { descEn = it }, label = { Text("Description (EN)") }, minLines = 2, modifier = Modifier.fillMaxWidth())
                OutlinedTextField(value = locAr, onValueChange = { locAr = it }, label = { Text("الموقع (AR)") }, modifier = Modifier.fillMaxWidth())
                OutlinedTextField(value = locEn, onValueChange = { locEn = it }, label = { Text("Location (EN)") }, modifier = Modifier.fillMaxWidth())
                Row(horizontalArrangement = Arrangement.spacedBy(6.dp)) {
                    listOf("full_time", "part_time", "remote").forEach { t ->
                        FilterChip(selected = empType == t, onClick = { empType = t }, label = { Text(t) })
                    }
                }
                Row(horizontalArrangement = Arrangement.spacedBy(8.dp), modifier = Modifier.fillMaxWidth()) {
                    GlassOutlinedButton(text = strings.cancel, onClick = onDismiss, modifier = Modifier.weight(1f))
                    NeonPrimaryButton(
                        text = strings.save,
                        enabled = titleEn.isNotBlank() && titleAr.isNotBlank() && descEn.isNotBlank() && descAr.isNotBlank(),
                        onClick = {
                            onSave(
                                (initial ?: JobOpening()).copy(
                                    titleEn = titleEn,
                                    titleAr = titleAr,
                                    departmentEn = deptEn,
                                    departmentAr = deptAr,
                                    descriptionEn = descEn,
                                    descriptionAr = descAr,
                                    locationEn = locEn,
                                    locationAr = locAr,
                                    employmentType = empType,
                                    published = true
                                )
                            )
                        },
                        modifier = Modifier.weight(1f)
                    )
                }
            }
        }
    }
}
