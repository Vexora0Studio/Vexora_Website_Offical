package com.example.ui.theme

import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Shapes
import androidx.compose.material3.darkColorScheme
import androidx.compose.runtime.Composable
import androidx.compose.runtime.CompositionLocalProvider
import androidx.compose.runtime.staticCompositionLocalOf
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.unit.dp

data class VexoraExtendedColors(
    val obsidianBg: Color = ObsidianBlack,
    val glassFill: Color = GlassFill,
    val glassBorder: Color = GlassBorder,
    val glassWhiteBorder: Color = GlassWhiteBorder,
    val neonCyan: Color = NeonCyan,
    val neonGlow: Color = NeonCyanGlow,
    val electricBlue: Color = ElectricBlue,
    val success: Color = EmeraldSuccess,
    val warning: Color = AmberWarning,
    val error: Color = RoseError,
    val mutedText: Color = SlateMuted
)

val LocalVexoraColors = staticCompositionLocalOf { VexoraExtendedColors() }

private val VexoraDarkColorScheme = darkColorScheme(
    primary = NeonCyan,
    onPrimary = ObsidianBlack,
    primaryContainer = DeepCobalt,
    onPrimaryContainer = NeonCyan,
    secondary = ElectricBlue,
    onSecondary = PureWhite,
    secondaryContainer = ObsidianElevated,
    onSecondaryContainer = SoftWhite,
    tertiary = PureWhite,
    onTertiary = ObsidianBlack,
    background = ObsidianBlack,
    onBackground = PureWhite,
    surface = ObsidianSurface,
    onSurface = PureWhite,
    surfaceVariant = ObsidianElevated,
    onSurfaceVariant = SlateMuted,
    outline = SubtleOutline,
    outlineVariant = GlassWhiteBorder,
    error = RoseError,
    onError = PureWhite
)

private val VexoraShapes = Shapes(
    small = RoundedCornerShape(10.dp),
    medium = RoundedCornerShape(16.dp),
    large = RoundedCornerShape(22.dp),
    extraLarge = RoundedCornerShape(28.dp)
)

@Composable
fun VexoraStudioTheme(
    isArabic: Boolean = true,
    content: @Composable () -> Unit
) {
    CompositionLocalProvider(LocalVexoraColors provides VexoraExtendedColors()) {
        MaterialTheme(
            colorScheme = VexoraDarkColorScheme,
            typography = buildVexoraTypography(isArabic = isArabic),
            shapes = VexoraShapes,
            content = content
        )
    }
}
