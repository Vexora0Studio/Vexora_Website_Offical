package com.example.ui.screens

import androidx.compose.foundation.BorderStroke
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
import androidx.compose.foundation.lazy.rememberLazyListState
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.filled.Send
import androidx.compose.material.icons.filled.AutoAwesome
import androidx.compose.material.icons.filled.Refresh
import androidx.compose.material.icons.filled.Verified
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.OutlinedTextField
import androidx.compose.material3.Surface
import androidx.compose.material3.Text
import androidx.compose.material3.minimumInteractiveComponentSize
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.platform.testTag
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import com.example.data.StudioLiveContext
import com.example.localization.AppLanguage
import com.example.localization.LocalAppLanguage
import com.example.localization.LocalStrings
import com.example.ui.components.GlassCard
import com.example.ui.theme.LocalVexoraColors
import com.example.ui.viewmodel.AiChatMessage
import com.example.ui.viewmodel.AiUiState

@Composable
fun AiAssistantScreen(
    messages: List<AiChatMessage>,
    status: AiUiState,
    liveContext: StudioLiveContext,
    onSendQuestion: (String, StudioLiveContext, Boolean) -> Unit,
    onClearChat: () -> Unit
) {
    val strings = LocalStrings.current
    val isArabic = LocalAppLanguage.current == AppLanguage.AR
    val vexora = LocalVexoraColors.current
    var inputText by remember { mutableStateOf("") }
    val listState = rememberLazyListState()

    LaunchedEffect(messages.size) {
        if (messages.isNotEmpty()) {
            listState.animateScrollToItem(messages.size)
        }
    }

    Column(
        modifier = Modifier
            .fillMaxSize()
            .padding(horizontal = 16.dp, vertical = 12.dp),
        verticalArrangement = Arrangement.spacedBy(10.dp)
    ) {
        GlassCard(highlightBorder = true, contentPadding = PaddingValues(14.dp), modifier = Modifier.fillMaxWidth()) {
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.SpaceBetween,
                verticalAlignment = Alignment.CenterVertically
            ) {
                Row(
                    verticalAlignment = Alignment.CenterVertically,
                    horizontalArrangement = Arrangement.spacedBy(10.dp),
                    modifier = Modifier.weight(1f)
                ) {
                    Icon(Icons.Filled.AutoAwesome, contentDescription = null, tint = vexora.neonCyan)
                    Column {
                        Text(strings.aiTitle, style = MaterialTheme.typography.titleMedium, fontWeight = FontWeight.Bold)
                        Text(strings.aiSubtitle, style = MaterialTheme.typography.bodyMedium, color = vexora.mutedText)
                    }
                }
                IconButton(
                    onClick = onClearChat,
                    modifier = Modifier.minimumInteractiveComponentSize().testTag("ai_clear_btn")
                ) {
                    Icon(Icons.Filled.Refresh, contentDescription = strings.aiClear, tint = vexora.neonCyan)
                }
            }
            Spacer(Modifier.height(8.dp))
            Row(verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(6.dp)) {
                Icon(Icons.Filled.Verified, contentDescription = null, tint = vexora.success, modifier = Modifier.size(15.dp))
                Text(strings.aiGroundedBadge, style = MaterialTheme.typography.labelSmall, color = vexora.success)
            }
        }

        LazyRow(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
            items(strings.aiQuickPrompts) { prompt ->
                Surface(
                    onClick = { onSendQuestion(prompt, liveContext, isArabic) },
                    enabled = status !is AiUiState.Loading,
                    shape = RoundedCornerShape(50),
                    color = MaterialTheme.colorScheme.surfaceVariant,
                    border = BorderStroke(1.dp, vexora.neonCyan.copy(alpha = 0.4f)),
                    modifier = Modifier.minimumInteractiveComponentSize()
                ) {
                    Text(
                        text = prompt,
                        style = MaterialTheme.typography.labelMedium,
                        modifier = Modifier.padding(horizontal = 14.dp, vertical = 10.dp)
                    )
                }
            }
        }

        LazyColumn(
            state = listState,
            modifier = Modifier.weight(1f).fillMaxWidth(),
            verticalArrangement = Arrangement.spacedBy(10.dp),
            contentPadding = PaddingValues(vertical = 4.dp)
        ) {
            item {
                ChatBubble(
                    text = strings.aiWelcomeBubble,
                    isUser = false,
                    isStreaming = false
                )
            }
            items(messages, key = { it.id }) { msg ->
                ChatBubble(
                    text = msg.text.ifBlank { strings.loading },
                    isUser = msg.isUser,
                    isStreaming = msg.isStreaming
                )
            }
        }

        if (status is AiUiState.Error) {
            Surface(
                shape = MaterialTheme.shapes.small,
                color = vexora.error.copy(alpha = 0.16f),
                border = BorderStroke(1.dp, vexora.error.copy(alpha = 0.5f)),
                modifier = Modifier.fillMaxWidth()
            ) {
                Text(
                    text = status.message,
                    style = MaterialTheme.typography.bodyMedium,
                    color = vexora.error,
                    modifier = Modifier.padding(12.dp)
                )
            }
        }

        Row(
            modifier = Modifier.fillMaxWidth(),
            verticalAlignment = Alignment.CenterVertically,
            horizontalArrangement = Arrangement.spacedBy(8.dp)
        ) {
            OutlinedTextField(
                value = inputText,
                onValueChange = { inputText = it },
                placeholder = { Text(strings.aiPlaceholder) },
                maxLines = 3,
                modifier = Modifier
                    .weight(1f)
                    .testTag("ai_input_field")
            )
            Surface(
                onClick = {
                    val q = inputText.trim()
                    if (q.isNotEmpty() && status !is AiUiState.Loading) {
                        inputText = ""
                        onSendQuestion(q, liveContext, isArabic)
                    }
                },
                enabled = inputText.isNotBlank() && status !is AiUiState.Loading,
                shape = RoundedCornerShape(14.dp),
                color = vexora.neonCyan,
                modifier = Modifier
                    .size(52.dp)
                    .testTag("ai_send_button")
            ) {
                Box(contentAlignment = Alignment.Center) {
                    if (status is AiUiState.Loading) {
                        CircularProgressIndicator(
                            modifier = Modifier.size(22.dp),
                            color = MaterialTheme.colorScheme.onPrimary,
                            strokeWidth = 2.dp
                        )
                    } else {
                        Icon(
                            imageVector = Icons.AutoMirrored.Filled.Send,
                            contentDescription = strings.aiSend,
                            tint = MaterialTheme.colorScheme.onPrimary
                        )
                    }
                }
            }
        }
    }
}

@Composable
private fun ChatBubble(
    text: String,
    isUser: Boolean,
    isStreaming: Boolean
) {
    val vexora = LocalVexoraColors.current
    Row(
        modifier = Modifier.fillMaxWidth(),
        horizontalArrangement = if (isUser) Arrangement.End else Arrangement.Start
    ) {
        Surface(
            shape = RoundedCornerShape(18.dp),
            color = if (isUser) vexora.electricBlue.copy(alpha = 0.35f) else MaterialTheme.colorScheme.surfaceVariant,
            border = BorderStroke(
                1.dp,
                if (isUser) vexora.neonCyan.copy(alpha = 0.6f) else vexora.glassWhiteBorder
            ),
            modifier = Modifier.widthIn(max = 330.dp)
        ) {
            Column(modifier = Modifier.padding(14.dp)) {
                Text(
                    text = text,
                    style = MaterialTheme.typography.bodyLarge,
                    color = MaterialTheme.colorScheme.onBackground
                )
                if (isStreaming) {
                    Spacer(Modifier.height(6.dp))
                    CircularProgressIndicator(
                        modifier = Modifier.size(14.dp),
                        color = vexora.neonCyan,
                        strokeWidth = 2.dp
                    )
                }
            }
        }
    }
}
