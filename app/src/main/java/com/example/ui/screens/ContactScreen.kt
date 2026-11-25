package com.example.ui.screens

import android.content.Intent
import android.net.Uri
import android.widget.Toast
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.ExperimentalLayoutApi
import androidx.compose.foundation.layout.FlowRow
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.text.KeyboardOptions
import androidx.compose.foundation.verticalScroll
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.ContentCopy
import androidx.compose.material.icons.filled.Email
import androidx.compose.material.icons.filled.OpenInNew
import androidx.compose.material.icons.filled.Send
import androidx.compose.material3.Icon
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.OutlinedTextField
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.platform.LocalClipboardManager
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.platform.LocalUriHandler
import androidx.compose.ui.platform.testTag
import androidx.compose.ui.text.AnnotatedString
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.input.KeyboardType
import androidx.compose.ui.unit.dp
import com.example.localization.LocalStrings
import com.example.model.ContactMessage
import com.example.model.UiState
import com.example.ui.components.GlassCard
import com.example.ui.components.GlassOutlinedButton
import com.example.ui.components.NeonPrimaryButton
import com.example.ui.components.StatusPill
import com.example.ui.theme.LocalVexoraColors
import com.example.util.ADMIN_EMAIL

@OptIn(ExperimentalLayoutApi::class)
@Composable
fun ContactScreen(
    messagesState: UiState<List<ContactMessage>>,
    isSubmitting: Boolean,
    defaultUserName: String,
    defaultUserEmail: String,
    onSendMessage: (name: String, email: String, subject: String, message: String) -> Unit
) {
    val strings = LocalStrings.current
    val vexora = LocalVexoraColors.current
    val context = LocalContext.current
    val clipboard = LocalClipboardManager.current
    val uriHandler = LocalUriHandler.current

    var senderName by remember(defaultUserName) { mutableStateOf(defaultUserName) }
    var email by remember(defaultUserEmail) { mutableStateOf(defaultUserEmail) }
    var subject by remember { mutableStateOf("") }
    var message by remember { mutableStateOf("") }
    var validationError by remember { mutableStateOf<String?>(null) }

    Column(
        modifier = Modifier
            .fillMaxSize()
            .verticalScroll(rememberScrollState())
            .padding(16.dp),
        verticalArrangement = Arrangement.spacedBy(16.dp)
    ) {
        Column(verticalArrangement = Arrangement.spacedBy(6.dp)) {
            Text(strings.contactHeadline, style = MaterialTheme.typography.headlineMedium, fontWeight = FontWeight.Bold)
            Text(strings.contactSubheadline, style = MaterialTheme.typography.bodyLarge, color = vexora.mutedText)
        }

        GlassCard(highlightBorder = true, modifier = Modifier.fillMaxWidth()) {
            OutlinedTextField(
                value = senderName,
                onValueChange = { senderName = it },
                label = { Text(strings.fullNameLabel) },
                singleLine = true,
                modifier = Modifier.fillMaxWidth().testTag("contact_name_input")
            )
            Spacer(Modifier.height(10.dp))
            OutlinedTextField(
                value = email,
                onValueChange = { email = it },
                label = { Text(strings.emailLabel) },
                singleLine = true,
                keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Email),
                modifier = Modifier.fillMaxWidth().testTag("contact_email_input")
            )
            Spacer(Modifier.height(10.dp))
            OutlinedTextField(
                value = subject,
                onValueChange = { subject = it },
                label = { Text(strings.subjectLabel) },
                singleLine = true,
                modifier = Modifier.fillMaxWidth().testTag("contact_subject_input")
            )
            Spacer(Modifier.height(10.dp))
            OutlinedTextField(
                value = message,
                onValueChange = { message = it },
                label = { Text(strings.messageLabel) },
                minLines = 4,
                maxLines = 8,
                modifier = Modifier.fillMaxWidth().testTag("contact_message_input")
            )

            if (!validationError.isNullOrBlank()) {
                Spacer(Modifier.height(8.dp))
                Text(validationError!!, color = vexora.error, style = MaterialTheme.typography.bodyMedium)
            }

            Spacer(Modifier.height(16.dp))
            NeonPrimaryButton(
                text = if (isSubmitting) strings.loading else strings.sendMessage,
                icon = Icons.Filled.Send,
                enabled = !isSubmitting,
                onClick = {
                    when {
                        senderName.trim().length < 2 -> validationError = strings.fullNameLabel
                        !email.contains("@") || email.trim().length < 5 -> validationError = strings.emailLabel
                        subject.trim().length < 2 -> validationError = strings.subjectLabel
                        message.trim().length < 5 -> validationError = strings.messageLabel
                        else -> {
                            validationError = null
                            onSendMessage(senderName, email, subject, message)
                            subject = ""
                            message = ""
                            Toast.makeText(context, strings.messageSent, Toast.LENGTH_SHORT).show()
                        }
                    }
                },
                modifier = Modifier.fillMaxWidth().testTag("contact_submit_btn")
            )
        }

        GlassCard(modifier = Modifier.fillMaxWidth()) {
            Row(verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                Icon(Icons.Filled.Email, contentDescription = null, tint = vexora.neonCyan)
                Text(strings.directEmailLabel, style = MaterialTheme.typography.titleMedium)
            }
            Spacer(Modifier.height(6.dp))
            Text(ADMIN_EMAIL, style = MaterialTheme.typography.bodyLarge, color = vexora.neonCyan)
            Spacer(Modifier.height(12.dp))
            Row(modifier = Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.spacedBy(10.dp)) {
                GlassOutlinedButton(
                    text = strings.copyEmail,
                    icon = Icons.Filled.ContentCopy,
                    onClick = {
                        clipboard.setText(AnnotatedString(ADMIN_EMAIL))
                        Toast.makeText(context, strings.emailCopied, Toast.LENGTH_SHORT).show()
                    },
                    modifier = Modifier.weight(1f)
                )
                GlassOutlinedButton(
                    text = strings.contactUsCta,
                    icon = Icons.Filled.Email,
                    onClick = {
                        val intent = Intent(Intent.ACTION_SENDTO, Uri.parse("mailto:$ADMIN_EMAIL"))
                        try {
                            context.startActivity(intent)
                        } catch (_: Exception) {
                            Toast.makeText(context, ADMIN_EMAIL, Toast.LENGTH_SHORT).show()
                        }
                    },
                    modifier = Modifier.weight(1f)
                )
            }
        }

        GlassCard(modifier = Modifier.fillMaxWidth()) {
            Text(strings.socialLinksTitle, style = MaterialTheme.typography.titleMedium)
            Spacer(Modifier.height(10.dp))
            val links = listOf(
                "Website" to "https://vexora.studio",
                "GitHub" to "https://github.com",
                "LinkedIn" to "https://linkedin.com",
                "X / Twitter" to "https://x.com"
            )
            FlowRow(
                horizontalArrangement = Arrangement.spacedBy(8.dp),
                verticalArrangement = Arrangement.spacedBy(8.dp)
            ) {
                links.forEach { (label, url) ->
                    GlassOutlinedButton(
                        text = label,
                        icon = Icons.Filled.OpenInNew,
                        onClick = {
                            try {
                                uriHandler.openUri(url)
                            } catch (_: Exception) {
                                Toast.makeText(context, url, Toast.LENGTH_SHORT).show()
                            }
                        }
                    )
                }
            }
        }

        if (messagesState is UiState.Success && messagesState.data.isNotEmpty()) {
            Text(strings.myMessagesTitle, style = MaterialTheme.typography.titleLarge)
            messagesState.data.forEach { msg ->
                GlassCard(modifier = Modifier.fillMaxWidth()) {
                    Row(
                        modifier = Modifier.fillMaxWidth(),
                        horizontalArrangement = Arrangement.SpaceBetween,
                        verticalAlignment = Alignment.CenterVertically
                    ) {
                        Text(msg.subject, style = MaterialTheme.typography.titleMedium, modifier = Modifier.weight(1f))
                        StatusPill(
                            label = msg.status,
                            color = if (msg.status == "replied") vexora.success else vexora.neonCyan
                        )
                    }
                    Spacer(Modifier.height(6.dp))
                    Text(msg.message, style = MaterialTheme.typography.bodyMedium, color = vexora.mutedText)
                }
            }
        }
    }
}
