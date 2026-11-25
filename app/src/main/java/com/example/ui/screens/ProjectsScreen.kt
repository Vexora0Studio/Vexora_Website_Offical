package com.example.ui.screens

import android.widget.Toast
import androidx.compose.foundation.BorderStroke
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
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.LazyRow
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.OpenInNew
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.material3.FilterChip
import androidx.compose.material3.FilterChipDefaults
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Surface
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.platform.LocalUriHandler
import androidx.compose.ui.platform.testTag
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import com.example.localization.AppLanguage
import com.example.localization.LocalAppLanguage
import com.example.localization.LocalStrings
import com.example.model.ProjectItem
import com.example.model.UiState
import com.example.ui.components.GlassCard
import com.example.ui.components.NeonPrimaryButton
import com.example.ui.components.ProjectPreviewImage
import com.example.ui.theme.LocalVexoraColors
import com.example.util.normalizeExternalUrl

@OptIn(ExperimentalLayoutApi::class)
@Composable
fun ProjectsScreen(
    projectsState: UiState<List<ProjectItem>>
) {
    val strings = LocalStrings.current
    val isArabic = LocalAppLanguage.current == AppLanguage.AR
    val vexora = LocalVexoraColors.current
    val uriHandler = LocalUriHandler.current
    val context = LocalContext.current

    var selectedStatus by remember { mutableStateOf("all") }
    val statusFilters = listOf(
        "all" to strings.statusAll,
        "available" to strings.statusAvailable,
        "in_development" to strings.statusInDevelopment,
        "completed" to strings.statusCompleted
    )

    LazyColumn(
        modifier = Modifier.fillMaxSize(),
        contentPadding = PaddingValues(16.dp),
        verticalArrangement = Arrangement.spacedBy(16.dp)
    ) {
        item {
            Column(verticalArrangement = Arrangement.spacedBy(6.dp)) {
                Text(
                    text = strings.projectsHeadline,
                    style = MaterialTheme.typography.headlineMedium,
                    fontWeight = FontWeight.Bold
                )
                Text(
                    text = strings.projectsSubheadline,
                    style = MaterialTheme.typography.bodyLarge,
                    color = vexora.mutedText
                )
            }
        }

        item {
            LazyRow(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                items(statusFilters) { (key, label) ->
                    FilterChip(
                        selected = selectedStatus == key,
                        onClick = { selectedStatus = key },
                        label = { Text(label) },
                        colors = FilterChipDefaults.filterChipColors(
                            selectedContainerColor = vexora.neonCyan.copy(alpha = 0.22f),
                            selectedLabelColor = vexora.neonCyan
                        )
                    )
                }
            }
        }

        when (projectsState) {
            is UiState.Loading -> {
                item {
                    Box(Modifier.fillMaxWidth().padding(32.dp), contentAlignment = Alignment.Center) {
                        CircularProgressIndicator(color = vexora.neonCyan)
                    }
                }
            }
            is UiState.Error -> {
                item {
                    GlassCard(modifier = Modifier.fillMaxWidth()) {
                        Text("${strings.errorOccurred} ${projectsState.message}", color = vexora.error)
                    }
                }
            }
            is UiState.Success -> {
                val filtered = projectsState.data
                    .filter { it.published }
                    .filter { selectedStatus == "all" || it.status == selectedStatus }

                if (filtered.isEmpty()) {
                    item {
                        GlassCard(modifier = Modifier.fillMaxWidth()) {
                            Text(strings.noProjectsYet, color = vexora.mutedText)
                        }
                    }
                } else {
                    items(filtered, key = { it.id }) { proj ->
                        GlassCard(
                            modifier = Modifier.fillMaxWidth(),
                            highlightBorder = proj.featured,
                            contentPadding = PaddingValues(0.dp)
                        ) {
                            ProjectPreviewImage(
                                imageUrl = proj.imageUrl,
                                presetImageKey = proj.presetImageKey,
                                contentDescription = if (isArabic) proj.nameAr else proj.nameEn,
                                modifier = Modifier
                                    .fillMaxWidth()
                                    .height(190.dp)
                                    .clip(RoundedCornerShape(topStart = 22.dp, topEnd = 22.dp))
                            )
                            Column(
                                modifier = Modifier.padding(16.dp),
                                verticalArrangement = Arrangement.spacedBy(10.dp)
                            ) {
                                Row(
                                    modifier = Modifier.fillMaxWidth(),
                                    horizontalArrangement = Arrangement.SpaceBetween,
                                    verticalAlignment = Alignment.CenterVertically
                                ) {
                                    Text(
                                        text = if (isArabic) proj.nameAr else proj.nameEn,
                                        style = MaterialTheme.typography.titleLarge,
                                        modifier = Modifier.weight(1f)
                                    )
                                    ProjectStatusBadge(proj.status)
                                }
                                Text(
                                    text = if (isArabic) proj.descriptionAr else proj.descriptionEn,
                                    style = MaterialTheme.typography.bodyMedium,
                                    color = vexora.mutedText
                                )
                                if (proj.technologies.isNotEmpty()) {
                                    Text(
                                        text = strings.technologiesLabel,
                                        style = MaterialTheme.typography.labelMedium,
                                        color = vexora.neonCyan
                                    )
                                    FlowRow(
                                        horizontalArrangement = Arrangement.spacedBy(6.dp),
                                        verticalArrangement = Arrangement.spacedBy(6.dp)
                                    ) {
                                        proj.technologies.forEach { tech ->
                                            Surface(
                                                shape = RoundedCornerShape(8.dp),
                                                color = MaterialTheme.colorScheme.surfaceVariant,
                                                border = BorderStroke(1.dp, vexora.glassWhiteBorder)
                                            ) {
                                                Text(
                                                    text = tech,
                                                    style = MaterialTheme.typography.labelSmall,
                                                    modifier = Modifier.padding(horizontal = 10.dp, vertical = 5.dp)
                                                )
                                            }
                                        }
                                    }
                                }
                                val safeUrl = normalizeExternalUrl(proj.websiteUrl)
                                if (safeUrl.isNotBlank()) {
                                    Spacer(Modifier.height(4.dp))
                                    NeonPrimaryButton(
                                        text = strings.visitWebsite,
                                        icon = Icons.Filled.OpenInNew,
                                        onClick = {
                                            try {
                                                uriHandler.openUri(safeUrl)
                                            } catch (e: Exception) {
                                                Toast.makeText(
                                                    context,
                                                    e.localizedMessage ?: "Unable to open URL",
                                                    Toast.LENGTH_SHORT
                                                ).show()
                                            }
                                        },
                                        modifier = Modifier
                                            .fillMaxWidth()
                                            .testTag("visit_project_${proj.id}")
                                    )
                                }
                            }
                        }
                    }
                }
            }
        }
    }
}
