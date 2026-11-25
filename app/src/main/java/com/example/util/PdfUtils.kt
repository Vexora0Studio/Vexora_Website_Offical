package com.example.util

import android.content.Context
import android.content.Intent
import android.net.Uri
import android.provider.OpenableColumns
import android.util.Base64
import androidx.core.content.FileProvider
import java.io.File

const val MAX_PDF_BYTES = 650_000L
const val ADMIN_EMAIL = "vexora0studio@gmail.com"
const val OWNER_EMAIL = "omarmotaz.develepor@gmail.com"
const val OWNER_NAME = "omar_develepor"
val ADMIN_EMAILS = setOf(ADMIN_EMAIL, OWNER_EMAIL)

data class PickedPdfResult(
    val fileName: String,
    val sizeBytes: Long,
    val base64: String
)

fun isAdminAccount(email: String?, isEmailVerified: Boolean): Boolean {
    val normalized = email?.trim()?.lowercase() ?: return false
    return isEmailVerified && normalized in ADMIN_EMAILS
}

fun readPdfFromUri(context: Context, uri: Uri): Result<PickedPdfResult> {
    return try {
        val resolver = context.contentResolver
        var displayName = "cv_document.pdf"
        resolver.query(uri, arrayOf(OpenableColumns.DISPLAY_NAME), null, null, null)?.use { cursor ->
            if (cursor.moveToFirst()) {
                val idx = cursor.getColumnIndex(OpenableColumns.DISPLAY_NAME)
                if (idx >= 0) {
                    displayName = cursor.getString(idx)?.takeIf { it.isNotBlank() } ?: displayName
                }
            }
        }
        val bytes = resolver.openInputStream(uri)?.use { it.readBytes() }
            ?: return Result.failure(IllegalStateException("Unable to read selected PDF file."))
        if (bytes.isEmpty()) {
            return Result.failure(IllegalArgumentException("Selected PDF file is empty."))
        }
        if (bytes.size > MAX_PDF_BYTES) {
            return Result.failure(IllegalArgumentException("PDF exceeds 650 KB limit."))
        }
        val header = String(bytes.take(5).toByteArray(), Charsets.US_ASCII)
        if (!header.startsWith("%PDF-")) {
            return Result.failure(IllegalArgumentException("File must be a valid PDF document."))
        }
        val base64 = Base64.encodeToString(bytes, Base64.NO_WRAP)
        Result.success(
            PickedPdfResult(
                fileName = displayName.take(140),
                sizeBytes = bytes.size.toLong(),
                base64 = base64
            )
        )
    } catch (e: Exception) {
        Result.failure(e)
    }
}

fun decodePdfToCacheFile(context: Context, fileName: String, base64: String): Result<File> {
    return try {
        val cleanName = fileName.replace(Regex("[^a-zA-Z0-9._\\-]"), "_").ifBlank { "cv.pdf" }
        val dir = File(context.cacheDir, "cvs").apply { mkdirs() }
        val outFile = File(dir, cleanName)
        val bytes = Base64.decode(base64, Base64.DEFAULT)
        outFile.writeBytes(bytes)
        Result.success(outFile)
    } catch (e: Exception) {
        Result.failure(e)
    }
}

fun openPdfExternally(context: Context, file: File): Result<Unit> {
    return try {
        val uri = FileProvider.getUriForFile(
            context,
            "${context.packageName}.fileprovider",
            file
        )
        val intent = Intent(Intent.ACTION_VIEW).apply {
            setDataAndType(uri, "application/pdf")
            addFlags(Intent.FLAG_GRANT_READ_URI_PERMISSION)
        }
        context.startActivity(Intent.createChooser(intent, file.name))
        Result.success(Unit)
    } catch (e: Exception) {
        Result.failure(e)
    }
}

fun normalizeExternalUrl(rawUrl: String): String {
    val trimmed = rawUrl.trim()
    return when {
        trimmed.isEmpty() -> ""
        trimmed.startsWith("http://") || trimmed.startsWith("https://") -> trimmed
        else -> "https://$trimmed"
    }
}
