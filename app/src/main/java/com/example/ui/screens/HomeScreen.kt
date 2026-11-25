package com.example.ui.screens

import androidx.compose.animation.AnimatedVisibility
import androidx.compose.animation.core.animateIntAsState
import androidx.compose.animation.core.tween
import androidx.compose.animation.fadeIn
import androidx.compose.animation.slideInVertically
import androidx.compose.foundation.Image
import androidx.compose.foundation.background
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
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.layout.widthIn
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.LazyRow
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.filled.ArrowForward
import androidx.compose.material.icons.filled.AutoAwesome
import androidx.compose.material.icons.filled.Email
import androidx.compose.material.icons.filled.RocketLaunch
import androidx.compose.material3.Icon
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Surface
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.layout.ContentScale
import androidx.compose.ui.platform.testTag
import androidx.compose.ui.res.painterResource
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp
import com.example.R
import com.example.localization.AppLanguage
import com.example.localization.LocalAppLanguage
import com.example.localization.LocalStrings
import com.example.model.ProjectItem
import com.example.model.ServiceItem
import com.example.model.SiteStats
import com.example.model.UiState
import com.example.ui.components.GlassCard
import com.example.ui.components.GlassOutlinedButton
import com.example.ui.components.NeonPrimaryButton
import com.example.ui.components.ProjectPreviewImage
import com.example.ui.components.StatusPill
import com.example.ui.components.VexoraLogo
import com.example.ui.components.serviceIconForKey
import com.example.ui.theme.LocalVexoraColors

@Composable
fun HomeScreen(
    statsState: UiState<SiteStats>,
    servicesState: UiState<List<ServiceItem>>,
    projectsState: UiState<List<ProjectItem>>,
    onExploreServices: () -> Unit,
    onNavigateProjects: () -> Unit,
    onNavigateContact: () -> Unit,
    onNavigateAi: () -> Unit
) {
    val strings = LocalStrings.current
    val isArabic = LocalAppLanguage.current == AppLanguage.AR
    val vexora = LocalVexoraColors.current
    var visible by remember { mutableStateOf(false) }
    LaunchedEffect(Unit) { visible = true }

    val stats = (statsState as? UiState.Success)?.data ?: SiteStats()
    val services = (servicesState as? UiState.Success)?.data.orEmpty().filter { it.published }.take(4)
    val projects = (projectsState as? UiState.Success)?.data.orEmpty().filter { it.published }.take(3)

    LazyColumn(
        modifier = Modifier.fillMaxSize(),
        contentPadding = PaddingValues(horizontal = 16.dp, vertical = 16.dp),
        verticalArrangement = Arrangement.spacedBy(22.dp)
    ) {
        // 1. Hero Section
        item {
            AnimatedVisibility(
                visible = visible,
                enter = fadeIn(tween(350)) + slideInVertically(tween(350)) { it / 8 }
            ) {
                GlassCard(
                    highlightBorder = true,
                    contentPadding = PaddingValues(0.dp),
                    modifier = Modifier
                        .widthIn(max = 960.dp)
                        .fillMaxWidth()
                ) {
                    Box(
                        modifier = Modifier
                            .fillMaxWidth()
                            .height(235.dp)
                    ) {
                        Image(
                            painter = painterResource(R.drawable.img_vexora_official_logo),
                            contentDescription = strings.appName,
                            contentScale = ContentScale.Crop,
                            modifier = Modifier.fillMaxSize()
                        )
                        Box(
                            modifier = Modifier
                                .fillMaxSize()
                                .background(
                                    Brush.verticalGradient(
                                        listOf(
                                            MaterialTheme.colorScheme.background.copy(alpha = 0.18f),
                                            MaterialTheme.colorScheme.background.copy(alpha = 0.94f)
                                        )
                                    )
                                )
                        )
                        Column(
                            modifier = Modifier
                                .align(Alignment.BottomStart)
                                .padding(18.dp),
                            verticalArrangement = Arrangement.spacedBy(8.dp)
                        ) {
                            VexoraLogo(iconSize = 34.dp, showSubtitle = true)
                            Text(
                                text = strings.heroTitle,
                                style = MaterialTheme.typography.headlineMedium,
                                color = MaterialTheme.colorScheme.onBackground,
                                fontWeight = FontWeight.Bold
                            )
                        }
                    }

                    Column(
                        modifier = Modifier.padding(18.dp),
                        verticalArrangement = Arrangement.spacedBy(16.dp)
                    ) {
                        Text(
                            text = strings.heroSubtitle,
                            style = MaterialTheme.typography.bodyLarge,
                            color = vexora.mutedText
                        )
                        Row(
                            modifier = Modifier.fillMaxWidth(),
                            horizontalArrangement = Arrangement.spacedBy(10.dp)
                        ) {
                            NeonPrimaryButton(
                                text = strings.exploreServices,
                                icon = Icons.Filled.RocketLaunch,
                                onClick = onExploreServices,
                                modifier = Modifier
                                    .weight(1f)
                                    .testTag("home_explore_services_btn")
                            )
                            GlassOutlinedButton(
                                text = strings.contactUsCta,
                                icon = Icons.Filled.Email,
                                onClick = onNavigateContact,
                                modifier = Modifier
                                    .weight(1f)
                                    .testTag("home_contact_btn")
                            )
                        }
                        GlassOutlinedButton(
                            text = strings.askAiCta,
                            icon = Icons.Filled.AutoAwesome,
                            onClick = onNavigateAi,
                            modifier = Modifier
                                .fillMaxWidth()
                                .testTag("home_ai_btn")
                        )
                    }
                }
            }
        }

        // 2. Company Statistics Grid
        item {
            Column(verticalArrangement = Arrangement.spacedBy(12.dp)) {
                Text(
                    text = strings.statsTitle,
                    style = MaterialTheme.typography.titleLarge,
                    color = MaterialTheme.colorScheme.onBackground
                )
                Row(
                    modifier = Modifier.fillMaxWidth(),
                    horizontalArrangement = Arrangement.spacedBy(10.dp)
                ) {
                    AnimatedStatTile(
                        targetValue = stats.projectsDelivered.toInt(),
                        label = strings.statProjects,
                        suffix = "+",
                        modifier = Modifier.weight(1f)
                    )
                    AnimatedStatTile(
                        targetValue = stats.happyClients.toInt(),
                        label = strings.statClients,
                        suffix = "+",
                        modifier = Modifier.weight(1f)
                    )
                }
                Row(
                    modifier = Modifier.fillMaxWidth(),
                    horizontalArrangement = Arrangement.spacedBy(10.dp)
                ) {
                    AnimatedStatTile(
                        targetValue = stats.teamExperts.toInt(),
                        label = strings.statExperts,
                        suffix = "+",
                        modifier = Modifier.weight(1f)
                    )
                    AnimatedStatTile(
                        targetValue = stats.yearsExperience.toInt(),
                        label = strings.statYears,
                        suffix = "+",
                        modifier = Modifier.weight(1f)
                    )
                }
            }
        }

        // 3. Featured Services
        item {
            Column(verticalArrangement = Arrangement.spacedBy(12.dp)) {
                SectionHeaderRow(
                    title = strings.featuredServicesTitle,
                    actionLabel = strings.viewAll,
                    onAction = onExploreServices
                )
                if (services.isEmpty()) {
                    GlassCard(modifier = Modifier.fillMaxWidth()) {
                        Text(strings.noServicesYet, color = vexora.mutedText)
                    }
                } else {
                    LazyRow(horizontalArrangement = Arrangement.spacedBy(12.dp)) {
                        items(services, key = { it.id }) { srv ->
                            GlassCard(
                                modifier = Modifier.width(240.dp),
                                onClick = onExploreServices
                            ) {
                                Surface(
                                    shape = RoundedCornerShape(12.dp),
                                    color = vexora.neonCyan.copy(alpha = 0.14f),
                                    modifier = Modifier.size(44.dp)
                                ) {
                                    Box(contentAlignment = Alignment.Center) {
                                        Icon(
                                            imageVector = serviceIconForKey(srv.iconKey),
                                            contentDescription = null,
                                            tint = vexora.neonCyan,
                                            modifier = Modifier.size(24.dp)
                                        )
                                    }
                                }
                                Spacer(Modifier.height(12.dp))
                                Text(
                                    text = if (isArabic) srv.titleAr else srv.titleEn,
                                    style = MaterialTheme.typography.titleMedium,
                                    maxLines = 1,
                                    overflow = TextOverflow.Ellipsis
                                )
                                Spacer(Modifier.height(6.dp))
                                Text(
                                    text = if (isArabic) srv.descriptionAr else srv.descriptionEn,
                                    style = MaterialTheme.typography.bodyMedium,
                                    color = vexora.mutedText,
                                    maxLines = 3,
                                    overflow = TextOverflow.Ellipsis
                                )
                            }
                        }
                    }
                }
            }
        }

        // 4. Featured Projects
        item {
            Column(verticalArrangement = Arrangement.spacedBy(12.dp)) {
                SectionHeaderRow(
                    title = strings.featuredProjectsTitle,
                    actionLabel = strings.viewAll,
                    onAction = onNavigateProjects
                )
                if (projects.isEmpty()) {
                    GlassCard(modifier = Modifier.fillMaxWidth()) {
                        Text(strings.noProjectsYet, color = vexora.mutedText)
                    }
                } else {
                    projects.forEach { proj ->
                        GlassCard(
                            modifier = Modifier.fillMaxWidth(),
                            contentPadding = PaddingValues(0.dp),
                            onClick = onNavigateProjects
                        ) {
                            ProjectPreviewImage(
                                imageUrl = proj.imageUrl,
                                presetImageKey = proj.presetImageKey,
                                contentDescription = if (isArabic) proj.nameAr else proj.nameEn,
                                modifier = Modifier
                                    .fillMaxWidth()
                                    .height(155.dp)
                                    .clip(RoundedCornerShape(topStart = 22.dp, topEnd = 22.dp))
                            )
                            Column(
                                modifier = Modifier.padding(16.dp),
                                verticalArrangement = Arrangement.spacedBy(8.dp)
                            ) {
                                Row(
                                    modifier = Modifier.fillMaxWidth(),
                                    horizontalArrangement = Arrangement.SpaceBetween,
                                    verticalAlignment = Alignment.CenterVertically
                                ) {
                                    Text(
                                        text = if (isArabic) proj.nameAr else proj.nameEn,
                                        style = MaterialTheme.typography.titleMedium,
                                        modifier = Modifier.weight(1f),
                                        maxLines = 1,
                                        overflow = TextOverflow.Ellipsis
                                    )
                                    Spacer(Modifier.width(8.dp))
                                    ProjectStatusBadge(proj.status)
                                }
                                Text(
                                    text = if (isArabic) proj.descriptionAr else proj.descriptionEn,
                                    style = MaterialTheme.typography.bodyMedium,
                                    color = vexora.mutedText,
                                    maxLines = 2,
                                    overflow = TextOverflow.Ellipsis
                                )
                            }
                        }
                        Spacer(Modifier.height(10.dp))
                    }
                }
            }
        }
    }
}

@Composable
private fun AnimatedStatTile(
    targetValue: Int,
    label: String,
    suffix: String,
    modifier: Modifier = Modifier
) {
    val vexora = LocalVexoraColors.current
    val animated by animateIntAsState(
        targetValue = targetValue,
        animationSpec = tween(durationMillis = 700),
        label = "stat_count"
    )
    GlassCard(modifier = modifier, contentPadding = PaddingValues(16.dp)) {
        Text(
            text = "$animated$suffix",
            style = MaterialTheme.typography.headlineLarge,
            color = vexora.neonCyan,
            fontWeight = FontWeight.Bold
        )
        Spacer(Modifier.height(4.dp))
        Text(
            text = label,
            style = MaterialTheme.typography.bodyMedium,
            color = MaterialTheme.colorScheme.onSurface
        )
    }
}

@Composable
private fun SectionHeaderRow(
    title: String,
    actionLabel: String,
    onAction: () -> Unit
) {
    val vexora = LocalVexoraColors.current
    Row(
        modifier = Modifier.fillMaxWidth(),
        horizontalArrangement = Arrangement.SpaceBetween,
        verticalAlignment = Alignment.CenterVertically
    ) {
        Text(
            text = title,
            style = MaterialTheme.typography.titleLarge,
            color = MaterialTheme.colorScheme.onBackground
        )
        TextButton(onClick = onAction) {
            Text(actionLabel, color = vexora.neonCyan)
            Spacer(Modifier.width(4.dp))
            Icon(
                imageVector = Icons.AutoMirrored.Filled.ArrowForward,
                contentDescription = null,
                tint = vexora.neonCyan,
                modifier = Modifier.size(16.dp)
            )
        }
    }
}

@Composable
fun ProjectStatusBadge(status: String) {
    val strings = LocalStrings.current
    val vexora = LocalVexoraColors.current
    val (label, color) = when (status) {
        "available" -> strings.statusAvailable to vexora.success
        "in_development" -> strings.statusInDevelopment to vexora.warning
        else -> strings.statusCompleted to vexora.neonCyan
    }
    StatusPill(label = label, color = color)
}
