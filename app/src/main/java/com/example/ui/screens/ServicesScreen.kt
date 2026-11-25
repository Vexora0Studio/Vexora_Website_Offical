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
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.LazyRow
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.material3.FilterChip
import androidx.compose.material3.FilterChipDefaults
import androidx.compose.material3.Icon
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
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import com.example.localization.AppLanguage
import com.example.localization.LocalAppLanguage
import com.example.localization.LocalStrings
import com.example.model.ServiceItem
import com.example.model.UiState
import com.example.ui.components.GlassCard
import com.example.ui.components.GlassOutlinedButton
import com.example.ui.components.serviceIconForKey
import com.example.ui.theme.LocalVexoraColors

@Composable
fun ServicesScreen(
    servicesState: UiState<List<ServiceItem>>,
    onRequestQuote: () -> Unit
) {
    val strings = LocalStrings.current
    val isArabic = LocalAppLanguage.current == AppLanguage.AR
    val vexora = LocalVexoraColors.current
    var selectedCategory by remember { mutableStateOf("all") }

    val categories = listOf("all", "web", "mobile", "ai", "design", "media", "engineering")

    LazyColumn(
        modifier = Modifier.fillMaxSize(),
        contentPadding = PaddingValues(16.dp),
        verticalArrangement = Arrangement.spacedBy(14.dp)
    ) {
        item {
            Column(verticalArrangement = Arrangement.spacedBy(6.dp)) {
                Text(
                    text = strings.servicesHeadline,
                    style = MaterialTheme.typography.headlineMedium,
                    fontWeight = FontWeight.Bold
                )
                Text(
                    text = strings.servicesSubheadline,
                    style = MaterialTheme.typography.bodyLarge,
                    color = vexora.mutedText
                )
            }
        }

        item {
            LazyRow(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                items(categories) { cat ->
                    val label = categoryLabel(cat, isArabic, strings.allCategories)
                    FilterChip(
                        selected = selectedCategory == cat,
                        onClick = { selectedCategory = cat },
                        label = { Text(label) },
                        colors = FilterChipDefaults.filterChipColors(
                            selectedContainerColor = vexora.neonCyan.copy(alpha = 0.22f),
                            selectedLabelColor = vexora.neonCyan
                        )
                    )
                }
            }
        }

        when (servicesState) {
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
                        Text("${strings.errorOccurred} ${servicesState.message}", color = vexora.error)
                    }
                }
            }
            is UiState.Success -> {
                val filtered = servicesState.data
                    .filter { it.published }
                    .filter { selectedCategory == "all" || it.category.equals(selectedCategory, ignoreCase = true) }

                if (filtered.isEmpty()) {
                    item {
                        GlassCard(modifier = Modifier.fillMaxWidth()) {
                            Text(strings.noServicesYet, color = vexora.mutedText)
                        }
                    }
                } else {
                    items(filtered, key = { it.id }) { srv ->
                        GlassCard(modifier = Modifier.fillMaxWidth()) {
                            Row(
                                modifier = Modifier.fillMaxWidth(),
                                verticalAlignment = Alignment.Top,
                                horizontalArrangement = Arrangement.spacedBy(14.dp)
                            ) {
                                Surface(
                                    shape = RoundedCornerShape(14.dp),
                                    color = vexora.neonCyan.copy(alpha = 0.14f),
                                    modifier = Modifier.size(50.dp)
                                ) {
                                    Box(contentAlignment = Alignment.Center) {
                                        Icon(
                                            imageVector = serviceIconForKey(srv.iconKey),
                                            contentDescription = null,
                                            tint = vexora.neonCyan,
                                            modifier = Modifier.size(26.dp)
                                        )
                                    }
                                }
                                Column(
                                    modifier = Modifier.weight(1f),
                                    verticalArrangement = Arrangement.spacedBy(6.dp)
                                ) {
                                    Text(
                                        text = if (isArabic) srv.titleAr else srv.titleEn,
                                        style = MaterialTheme.typography.titleMedium,
                                        color = MaterialTheme.colorScheme.onBackground
                                    )
                                    Text(
                                        text = if (isArabic) srv.descriptionAr else srv.descriptionEn,
                                        style = MaterialTheme.typography.bodyMedium,
                                        color = vexora.mutedText
                                    )
                                }
                            }
                            Spacer(Modifier.height(12.dp))
                            GlassOutlinedButton(
                                text = strings.contactUsCta,
                                onClick = onRequestQuote
                            )
                        }
                    }
                }
            }
        }
    }
}

private fun categoryLabel(key: String, isArabic: Boolean, allLabel: String): String = when (key) {
    "all" -> allLabel
    "web" -> if (isArabic) "الويب" else "Web"
    "mobile" -> if (isArabic) "Android" else "Android"
    "ai" -> if (isArabic) "ذكاء اصطناعي" else "AI"
    "design" -> if (isArabic) "التصميم" else "Design"
    "media" -> if (isArabic) "المونتاج" else "Video"
    "engineering" -> if (isArabic) "البرمجيات" else "Software"
    else -> key
}
