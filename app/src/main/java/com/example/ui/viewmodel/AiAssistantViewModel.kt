package com.example.ui.viewmodel

import android.util.Log
import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.example.data.StudioAiRepository
import com.example.data.StudioLiveContext
import kotlinx.coroutines.CancellationException
import kotlinx.coroutines.TimeoutCancellationException
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.launch
import kotlinx.coroutines.withTimeout

data class AiChatMessage(
    val id: String,
    val isUser: Boolean,
    val text: String,
    val isStreaming: Boolean = false
)

sealed interface AiUiState {
    data object Idle : AiUiState
    data object Loading : AiUiState
    data class Error(val message: String) : AiUiState
}

class AiAssistantViewModel(
    private val aiRepository: StudioAiRepository = StudioAiRepository()
) : ViewModel() {

    private val _messages = MutableStateFlow<List<AiChatMessage>>(emptyList())
    val messages: StateFlow<List<AiChatMessage>> = _messages.asStateFlow()

    private val _status = MutableStateFlow<AiUiState>(AiUiState.Idle)
    val status: StateFlow<AiUiState> = _status.asStateFlow()

    fun clearChat() {
        _messages.value = emptyList()
        _status.value = AiUiState.Idle
    }

    fun sendQuestion(
        question: String,
        liveContext: StudioLiveContext,
        preferArabic: Boolean
    ) {
        val trimmed = question.trim()
        if (trimmed.isEmpty() || _status.value is AiUiState.Loading) return

        val historyPairs = buildHistoryPairs(_messages.value)
        val userMsg = AiChatMessage(
            id = "u_${System.currentTimeMillis()}",
            isUser = true,
            text = trimmed
        )
        val modelId = "m_${System.currentTimeMillis()}"
        _messages.value = _messages.value + userMsg + AiChatMessage(
            id = modelId,
            isUser = false,
            text = "",
            isStreaming = true
        )
        _status.value = AiUiState.Loading

        viewModelScope.launch {
            val builder = StringBuilder()
            try {
                withTimeout(60_000L) {
                    aiRepository.streamStudioAnswer(
                        question = trimmed,
                        historyPairs = historyPairs,
                        liveContext = liveContext,
                        preferArabic = preferArabic
                    ).collect { chunk ->
                        builder.append(chunk)
                        updateStreamingMessage(modelId, builder.toString(), isStreaming = true)
                    }
                }
                val finalText = builder.toString().trim()
                if (finalText.isNotEmpty()) {
                    updateStreamingMessage(modelId, finalText, isStreaming = false)
                    _status.value = AiUiState.Idle
                } else {
                    removeMessage(modelId)
                    _status.value = AiUiState.Error(
                        if (preferArabic) "لم يتم استلام رد من المساعد الذكي."
                        else "AI assistant returned an empty response."
                    )
                }
            } catch (e: TimeoutCancellationException) {
                Log.e("AiAssistantVM", "AI generation timed out", e)
                removeEmptyStreaming(modelId, builder.toString())
                _status.value = AiUiState.Error(
                    if (preferArabic) "انتهت مهلة الاتصال بالمساعد الذكي (60 ثانية). حاول مرة أخرى."
                    else "AI response timed out after 60 seconds. Please try again."
                )
            } catch (e: CancellationException) {
                throw e
            } catch (e: Exception) {
                Log.e("AiAssistantVM", "AI generation failed", e)
                removeEmptyStreaming(modelId, builder.toString())
                _status.value = AiUiState.Error(e.localizedMessage ?: "AI request failed.")
            }
        }
    }

    private fun updateStreamingMessage(id: String, text: String, isStreaming: Boolean) {
        _messages.value = _messages.value.map { msg ->
            if (msg.id == id) msg.copy(text = text, isStreaming = isStreaming) else msg
        }
    }

    private fun removeMessage(id: String) {
        _messages.value = _messages.value.filterNot { it.id == id }
    }

    private fun removeEmptyStreaming(id: String, partial: String) {
        if (partial.isBlank()) {
            removeMessage(id)
        } else {
            updateStreamingMessage(id, partial, isStreaming = false)
        }
    }

    private fun buildHistoryPairs(items: List<AiChatMessage>): List<Pair<String, String>> {
        val pairs = mutableListOf<Pair<String, String>>()
        var pendingUser: String? = null
        for (item in items) {
            if (item.isUser) {
                pendingUser = item.text
            } else if (pendingUser != null && item.text.isNotBlank()) {
                pairs += (pendingUser to item.text)
                pendingUser = null
            }
        }
        return pairs
    }
}
