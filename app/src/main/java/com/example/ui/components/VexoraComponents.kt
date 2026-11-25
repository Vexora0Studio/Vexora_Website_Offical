package com.example.ui.components

import android.graphics.Bitmap
import android.graphics.pdf.PdfRenderer
import android.os.ParcelFileDescriptor
import android.util.Base64
import android.widget.Toast
import androidx.activity.compose.rememberLauncherForActivityResult
import androidx.activity.result.contract.ActivityResultContracts
import androidx.compose.foundation.BorderStroke
import androidx.compose.foundation.Canvas
import androidx.compose.foundation.Image
import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.ColumnScope
import androidx.compose.foundation.layout.PaddingValues
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.heightIn
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.itemsIndexed
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Brush
import androidx.compose.material.icons.filled.Close
import androidx.compose.material.icons.filled.Code
import androidx.compose.material.icons.filled.Download
import androidx.compose.material.icons.filled.Language
import androidx.compose.material.icons.filled.OpenInNew
import androidx.compose.material.icons.filled.Palette
import androidx.compose.material.icons.filled.PhoneAndroid
import androidx.compose.material.icons.filled.Psychology
import androidx.compose.material.icons.filled.Videocam
import androidx.compose.material3.Button
import androidx.compose.material3.ButtonDefaults
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.OutlinedButton
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
import androidx.compose.ui.draw.clip
import androidx.compose.ui.draw.drawBehind
import androidx.compose.ui.geometry.Offset
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.Path
import androidx.compose.ui.graphics.StrokeCap
import androidx.compose.ui.graphics.StrokeJoin
import androidx.compose.ui.graphics.asImageBitmap
import androidx.compose.ui.graphics.drawscope.Stroke
import androidx.compose.ui.graphics.vector.ImageVector
import androidx.compose.ui.layout.ContentScale
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.platform.testTag
import androidx.compose.ui.res.painterResource
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.Dp
import androidx.compose.ui.unit.dp
import androidx.compose.ui.window.Dialog
import androidx.compose.ui.window.DialogProperties
import coil.compose.AsyncImage
import com.example.R
import com.example.localization.LocalStrings
import com.example.ui.theme.LocalVexoraColors
import com.example.util.decodePdfToCacheFile
import com.example.util.openPdfExternally
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.withContext

@Composable
fun VexoraBackground(
    modifier: Modifier = Modifier,
    content: @Composable () -> Unit
) {
    val vexora = LocalVexoraColors.current
    val bgColor = MaterialTheme.colorScheme.background
    Box(
        modifier = modifier
            .fillMaxSize()
            .background(bgColor)
            .drawBehind {
                drawCircle(
                    brush = Brush.radialGradient(
                        colors = listOf(
                            vexora.neonCyan.copy(alpha = 0.14f),
                            Color.Transparent
                        ),
                        center = Offset(size.width * 0.85f, size.height * 0.08f),
                        radius = size.maxDimension * 0.45f
                    ),
                    radius = size.maxDimension * 0.45f,
                    center = Offset(size.width * 0.85f, size.height * 0.08f)
                )
                drawCircle(
                    brush = Brush.radialGradient(
                        colors = listOf(
                            vexora.electricBlue.copy(alpha = 0.12f),
                            Color.Transparent
                        ),
                        center = Offset(size.width * 0.15f, size.height * 0.72f),
                        radius = size.maxDimension * 0.40f
                    ),
                    radius = size.maxDimension * 0.40f,
                    center = Offset(size.width * 0.15f, size.height * 0.72f)
                )
            }
    ) {
        content()
    }
}

@Composable
fun VexoraLogo(
    modifier: Modifier = Modifier,
    iconSize: Dp = 36.dp,
    showSubtitle: Boolean = false
) {
    val vexora = LocalVexoraColors.current
    val strings = LocalStrings.current
    Row(
        modifier = modifier,
        verticalAlignment = Alignment.CenterVertically,
        horizontalArrangement = Arrangement.spacedBy(10.dp)
    ) {
        Image(
            painter = painterResource(R.drawable.img_vexora_official_logo),
            contentDescription = "Vexora Studio",
            contentScale = ContentScale.Crop,
            modifier = Modifier
                .size(iconSize)
                .clip(RoundedCornerShape(10.dp))
                .border(1.dp, vexora.neonCyan.copy(alpha = 0.65f), RoundedCornerShape(10.dp))
        )
        Column {
            Row(verticalAlignment = Alignment.CenterVertically) {
                Text(
                    text = "VEXORA",
                    style = MaterialTheme.typography.titleMedium,
                    fontWeight = FontWeight.Bold,
                    color = MaterialTheme.colorScheme.onBackground
                )
                Spacer(Modifier.width(5.dp))
                Text(
                    text = "STUDIO",
                    style = MaterialTheme.typography.labelMedium,
                    fontWeight = FontWeight.Bold,
                    color = vexora.neonCyan
                )
            }
            if (showSubtitle) {
                Text(
                    text = strings.studioTagline,
                    style = MaterialTheme.typography.labelSmall,
                    color = vexora.mutedText,
                    maxLines = 1,
                    overflow = TextOverflow.Ellipsis
                )
            }
        }
    }
}

@Composable
fun GlassCard(
    modifier: Modifier = Modifier,
    highlightBorder: Boolean = false,
    onClick: (() -> Unit)? = null,
    contentPadding: PaddingValues = PaddingValues(16.dp),
    content: @Composable ColumnScope.() -> Unit
) {
    val vexora = LocalVexoraColors.current
    val shape = MaterialTheme.shapes.large
    val borderBrush = if (highlightBorder) {
        Brush.linearGradient(
            listOf(
                vexora.neonCyan.copy(alpha = 0.65f),
                vexora.electricBlue.copy(alpha = 0.35f),
                vexora.glassWhiteBorder
            )
        )
    } else {
        Brush.linearGradient(
            listOf(
                vexora.glassBorder,
                vexora.glassWhiteBorder
            )
        )
    }

    val cardModifier = modifier
        .clip(shape)
        .background(
            Brush.verticalGradient(
                listOf(
                    vexora.glassFill,
                    MaterialTheme.colorScheme.surface.copy(alpha = 0.90f)
                )
            )
        )
        .border(BorderStroke(1.dp, borderBrush), shape)
        .let { m -> if (onClick != null) m.clickable(onClick = onClick) else m }

    Column(
        modifier = cardModifier.padding(contentPadding),
        content = content
    )
}

@Composable
fun NeonPrimaryButton(
    text: String,
    onClick: () -> Unit,
    modifier: Modifier = Modifier,
    enabled: Boolean = true,
    icon: ImageVector? = null
) {
    val vexora = LocalVexoraColors.current
    Button(
        onClick = onClick,
        enabled = enabled,
        modifier = modifier.heightIn(min = 48.dp),
        shape = MaterialTheme.shapes.medium,
        colors = ButtonDefaults.buttonColors(
            containerColor = vexora.neonCyan,
            contentColor = MaterialTheme.colorScheme.onPrimary,
            disabledContainerColor = vexora.neonCyan.copy(alpha = 0.35f)
        ),
        contentPadding = PaddingValues(horizontal = 20.dp, vertical = 12.dp)
    ) {
        if (icon != null) {
            Icon(icon, contentDescription = null, modifier = Modifier.size(18.dp))
            Spacer(Modifier.width(8.dp))
        }
        Text(text = text, style = MaterialTheme.typography.labelLarge, fontWeight = FontWeight.Bold)
    }
}

@Composable
fun GlassOutlinedButton(
    text: String,
    onClick: () -> Unit,
    modifier: Modifier = Modifier,
    icon: ImageVector? = null
) {
    val vexora = LocalVexoraColors.current
    OutlinedButton(
        onClick = onClick,
        modifier = modifier.heightIn(min = 48.dp),
        shape = MaterialTheme.shapes.medium,
        border = BorderStroke(1.dp, vexora.neonCyan.copy(alpha = 0.55f)),
        colors = ButtonDefaults.outlinedButtonColors(
            containerColor = MaterialTheme.colorScheme.surfaceVariant.copy(alpha = 0.45f),
            contentColor = MaterialTheme.colorScheme.onBackground
        ),
        contentPadding = PaddingValues(horizontal = 18.dp, vertical = 12.dp)
    ) {
        if (icon != null) {
            Icon(icon, contentDescription = null, modifier = Modifier.size(18.dp), tint = vexora.neonCyan)
            Spacer(Modifier.width(8.dp))
        }
        Text(text = text, style = MaterialTheme.typography.labelLarge)
    }
}

@Composable
fun LanguageToggleChip(
    label: String,
    onToggle: () -> Unit,
    modifier: Modifier = Modifier
) {
    val vexora = LocalVexoraColors.current
    Surface(
        onClick = onToggle,
        modifier = modifier
            .minimumInteractiveComponentSize()
            .testTag("language_toggle_button"),
        shape = RoundedCornerShape(50),
        color = MaterialTheme.colorScheme.surfaceVariant.copy(alpha = 0.85f),
        border = BorderStroke(1.dp, vexora.neonCyan.copy(alpha = 0.45f))
    ) {
        Row(
            modifier = Modifier.padding(horizontal = 12.dp, vertical = 8.dp),
            verticalAlignment = Alignment.CenterVertically,
            horizontalArrangement = Arrangement.spacedBy(6.dp)
        ) {
            Icon(
                imageVector = Icons.Filled.Language,
                contentDescription = label,
                tint = vexora.neonCyan,
                modifier = Modifier.size(16.dp)
            )
            Text(
                text = label,
                style = MaterialTheme.typography.labelMedium,
                fontWeight = FontWeight.Bold,
                color = MaterialTheme.colorScheme.onBackground
            )
        }
    }
}

@Composable
fun StatusPill(
    label: String,
    color: Color,
    modifier: Modifier = Modifier
) {
    Surface(
        modifier = modifier,
        shape = RoundedCornerShape(50),
        color = color.copy(alpha = 0.16f),
        border = BorderStroke(1.dp, color.copy(alpha = 0.55f))
    ) {
        Row(
            modifier = Modifier.padding(horizontal = 10.dp, vertical = 4.dp),
            verticalAlignment = Alignment.CenterVertically,
            horizontalArrangement = Arrangement.spacedBy(6.dp)
        ) {
            Box(
                modifier = Modifier
                    .size(7.dp)
                    .clip(CircleShape)
                    .background(color)
            )
            Text(
                text = label,
                style = MaterialTheme.typography.labelSmall,
                fontWeight = FontWeight.SemiBold,
                color = color
            )
        }
    }
}

@Composable
fun ProjectPreviewImage(
    imageUrl: String,
    presetImageKey: String,
    contentDescription: String,
    modifier: Modifier = Modifier
) {
    val vexora = LocalVexoraColors.current
    val fallbackRes = when (presetImageKey) {
        "f_cutus" -> R.drawable.img_project_fcutus
        "mobile" -> R.drawable.img_project_mobile
        "studio" -> R.drawable.img_studio_team
        "hero" -> R.drawable.img_hero_banner
        else -> R.drawable.img_project_web
    }
    if (imageUrl.isNotBlank()) {
        AsyncImage(
            model = imageUrl,
            contentDescription = contentDescription,
            placeholder = painterResource(fallbackRes),
            error = painterResource(fallbackRes),
            contentScale = ContentScale.Crop,
            modifier = modifier
        )
    } else if (presetImageKey == "f_cutus") {
        Box(
            modifier = modifier.background(
                Brush.radialGradient(
                    listOf(
                        vexora.electricBlue.copy(alpha = 0.16f),
                        MaterialTheme.colorScheme.background
                    )
                )
            ),
            contentAlignment = Alignment.Center
        ) {
            Image(
                painter = painterResource(R.drawable.img_project_fcutus),
                contentDescription = contentDescription,
                contentScale = ContentScale.Fit,
                modifier = Modifier.fillMaxSize().padding(10.dp)
            )
        }
    } else {
        Image(
            painter = painterResource(fallbackRes),
            contentDescription = contentDescription,
            contentScale = ContentScale.Crop,
            modifier = modifier
        )
    }
}

fun serviceIconForKey(key: String): ImageVector = when (key.lowercase()) {
    "web" -> Icons.Filled.Language
    "android", "mobile" -> Icons.Filled.PhoneAndroid
    "ai" -> Icons.Filled.Psychology
    "palette", "graphic" -> Icons.Filled.Palette
    "video", "media" -> Icons.Filled.Videocam
    "uiux" -> Icons.Filled.Brush
    else -> Icons.Filled.Code
}

@Composable
fun PdfViewerDialog(
    fileName: String,
    base64Content: String,
    onDismiss: () -> Unit
) {
    val context = LocalContext.current
    val strings = LocalStrings.current
    val vexora = LocalVexoraColors.current
    var pages by remember { mutableStateOf<List<Bitmap>>(emptyList()) }
    var loadError by remember { mutableStateOf<String?>(null) }
    var isLoading by remember { mutableStateOf(true) }

    val saveLauncher = rememberLauncherForActivityResult(
        contract = ActivityResultContracts.CreateDocument("application/pdf")
    ) { uri ->
        if (uri != null) {
            try {
                val bytes = Base64.decode(base64Content, Base64.DEFAULT)
                context.contentResolver.openOutputStream(uri)?.use { it.write(bytes) }
                Toast.makeText(context, "$fileName saved", Toast.LENGTH_SHORT).show()
            } catch (e: Exception) {
                Toast.makeText(context, e.localizedMessage ?: "Save failed", Toast.LENGTH_SHORT).show()
            }
        }
    }

    LaunchedEffect(fileName, base64Content) {
        isLoading = true
        loadError = null
        withContext(Dispatchers.IO) {
            val fileRes = decodePdfToCacheFile(context, fileName, base64Content)
            fileRes.onSuccess { file ->
                try {
                    val pfd = ParcelFileDescriptor.open(file, ParcelFileDescriptor.MODE_READ_ONLY)
                    val renderer = PdfRenderer(pfd)
                    val rendered = mutableListOf<Bitmap>()
                    val maxPages = minOf(renderer.pageCount, 8)
                    for (i in 0 until maxPages) {
                        val page = renderer.openPage(i)
                        val width = 900
                        val height = ((width.toFloat() / page.width.coerceAtLeast(1)) * page.height).toInt().coerceAtLeast(100)
                        val bmp = Bitmap.createBitmap(width, height, Bitmap.Config.ARGB_8888)
                        bmp.eraseColor(android.graphics.Color.WHITE)
                        page.render(bmp, null, null, PdfRenderer.Page.RENDER_MODE_FOR_DISPLAY)
                        page.close()
                        rendered += bmp
                    }
                    renderer.close()
                    pfd.close()
                    pages = rendered
                } catch (e: Exception) {
                    loadError = e.localizedMessage ?: "Failed to render PDF"
                }
            }.onFailure { err ->
                loadError = err.localizedMessage ?: "Failed to decode PDF"
            }
        }
        isLoading = false
    }

    Dialog(
        onDismissRequest = onDismiss,
        properties = DialogProperties(usePlatformDefaultWidth = false)
    ) {
        Surface(
            modifier = Modifier
                .fillMaxSize()
                .padding(16.dp),
            shape = MaterialTheme.shapes.large,
            color = MaterialTheme.colorScheme.surface,
            border = BorderStroke(1.dp, vexora.glassBorder)
        ) {
            Column(modifier = Modifier.fillMaxSize().padding(16.dp)) {
                Row(
                    modifier = Modifier.fillMaxWidth(),
                    verticalAlignment = Alignment.CenterVertically,
                    horizontalArrangement = Arrangement.SpaceBetween
                ) {
                    Text(
                        text = fileName,
                        style = MaterialTheme.typography.titleMedium,
                        maxLines = 1,
                        overflow = TextOverflow.Ellipsis,
                        modifier = Modifier.weight(1f)
                    )
                    IconButton(
                        onClick = onDismiss,
                        modifier = Modifier.minimumInteractiveComponentSize()
                    ) {
                        Icon(Icons.Filled.Close, contentDescription = strings.close)
                    }
                }
                Spacer(Modifier.height(8.dp))
                Row(
                    modifier = Modifier.fillMaxWidth(),
                    horizontalArrangement = Arrangement.spacedBy(8.dp)
                ) {
                    NeonPrimaryButton(
                        text = strings.savePdfToDevice,
                        icon = Icons.Filled.Download,
                        onClick = { saveLauncher.launch(fileName) },
                        modifier = Modifier.weight(1f)
                    )
                    GlassOutlinedButton(
                        text = strings.openInPdfApp,
                        icon = Icons.Filled.OpenInNew,
                        onClick = {
                            decodePdfToCacheFile(context, fileName, base64Content).onSuccess { file ->
                                openPdfExternally(context, file).onFailure {
                                    Toast.makeText(context, "No external PDF viewer installed", Toast.LENGTH_SHORT).show()
                                }
                            }
                        },
                        modifier = Modifier.weight(1f)
                    )
                }
                Spacer(Modifier.height(12.dp))
                Box(
                    modifier = Modifier
                        .weight(1f)
                        .fillMaxWidth()
                        .clip(MaterialTheme.shapes.medium)
                        .background(MaterialTheme.colorScheme.background),
                    contentAlignment = Alignment.Center
                ) {
                    when {
                        isLoading -> CircularProgressIndicator(color = vexora.neonCyan)
                        loadError != null -> Text(loadError!!, color = vexora.error, modifier = Modifier.padding(16.dp))
                        pages.isEmpty() -> Text("Empty PDF", color = vexora.mutedText)
                        else -> LazyColumn(
                            modifier = Modifier.fillMaxSize(),
                            verticalArrangement = Arrangement.spacedBy(12.dp),
                            contentPadding = PaddingValues(12.dp)
                        ) {
                            itemsIndexed(pages) { _, bitmap ->
                                Image(
                                    bitmap = bitmap.asImageBitmap(),
                                    contentDescription = fileName,
                                    contentScale = ContentScale.FillWidth,
                                    modifier = Modifier
                                        .fillMaxWidth()
                                        .clip(RoundedCornerShape(8.dp))
                                )
                            }
                        }
                    }
                }
            }
        }
    }
}
