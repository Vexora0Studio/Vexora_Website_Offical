package com.example

import android.graphics.Color as AndroidColor
import android.os.Bundle
import androidx.activity.ComponentActivity
import androidx.activity.SystemBarStyle
import androidx.activity.compose.BackHandler
import androidx.activity.compose.setContent
import androidx.activity.enableEdgeToEdge
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.BoxWithConstraints
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.WindowInsets
import androidx.compose.foundation.layout.fillMaxHeight
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.safeDrawing
import androidx.compose.foundation.layout.width
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.filled.Logout
import androidx.compose.material.icons.filled.AdminPanelSettings
import androidx.compose.material.icons.filled.AutoAwesome
import androidx.compose.material.icons.filled.Build
import androidx.compose.material.icons.filled.Email
import androidx.compose.material.icons.filled.Groups
import androidx.compose.material.icons.filled.Home
import androidx.compose.material.icons.filled.Layers
import androidx.compose.material.icons.filled.Menu
import androidx.compose.material3.DrawerValue
import androidx.compose.material3.ExperimentalMaterial3Api
import androidx.compose.material3.HorizontalDivider
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.ModalDrawerSheet
import androidx.compose.material3.ModalNavigationDrawer
import androidx.compose.material3.NavigationBar
import androidx.compose.material3.NavigationBarItem
import androidx.compose.material3.NavigationBarItemDefaults
import androidx.compose.material3.NavigationDrawerItem
import androidx.compose.material3.NavigationRail
import androidx.compose.material3.NavigationRailItem
import androidx.compose.material3.Scaffold
import androidx.compose.material3.SnackbarHost
import androidx.compose.material3.SnackbarHostState
import androidx.compose.material3.Text
import androidx.compose.material3.TopAppBar
import androidx.compose.material3.TopAppBarDefaults
import androidx.compose.material3.minimumInteractiveComponentSize
import androidx.compose.material3.rememberDrawerState
import androidx.compose.runtime.Composable
import androidx.compose.runtime.CompositionLocalProvider
import androidx.compose.runtime.DisposableEffect
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.key
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.rememberCoroutineScope
import androidx.compose.runtime.saveable.rememberSaveable
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.vector.ImageVector
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.platform.LocalLayoutDirection
import androidx.compose.ui.platform.testTag
import androidx.compose.ui.unit.LayoutDirection
import androidx.compose.ui.unit.dp
import androidx.credentials.CredentialManager
import androidx.lifecycle.ViewModelProvider.AndroidViewModelFactory.Companion.APPLICATION_KEY
import androidx.lifecycle.compose.collectAsStateWithLifecycle
import androidx.lifecycle.viewmodel.compose.viewModel
import androidx.lifecycle.viewmodel.initializer
import androidx.lifecycle.viewmodel.viewModelFactory
import com.example.data.StudioRepository
import com.example.data.authStateFlow
import com.example.data.configureAppCheck
import com.example.data.signOutUser
import com.example.localization.AppLanguage
import com.example.localization.ArabicStrings
import com.example.localization.EnglishStrings
import com.example.localization.LocalAppLanguage
import com.example.localization.LocalStrings
import com.example.ui.components.LanguageToggleChip
import com.example.ui.components.VexoraBackground
import com.example.ui.components.VexoraLogo
import com.example.ui.screens.AdminDashboardScreen
import com.example.ui.screens.AiAssistantScreen
import com.example.ui.screens.AuthScreen
import com.example.ui.screens.ContactScreen
import com.example.ui.screens.HomeScreen
import com.example.ui.screens.ProjectsScreen
import com.example.ui.screens.ServicesScreen
import com.example.ui.screens.TeamAndCareersScreen
import com.example.ui.theme.LocalVexoraColors
import com.example.ui.theme.VexoraStudioTheme
import com.example.ui.viewmodel.AiAssistantViewModel
import com.example.ui.viewmodel.StudioViewModel
import com.google.firebase.Firebase
import com.google.firebase.auth.FirebaseAuth
import com.google.firebase.auth.FirebaseUser
import com.google.firebase.auth.auth
import com.google.firebase.firestore.FirebaseFirestore
import kotlinx.coroutines.launch

enum class VexoraRoute(val routeTag: String) {
    HOME("home"),
    SERVICES("services"),
    PROJECTS("projects"),
    TEAM_CAREERS("team_careers"),
    AI("ai"),
    CONTACT("contact"),
    ADMIN("admin")
}

class MainActivity : ComponentActivity() {
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)

        // STEP 1: Configure App Check with launch intent before any UI or Firebase operations
        configureAppCheck(this, intent)

        enableEdgeToEdge(
            statusBarStyle = SystemBarStyle.dark(AndroidColor.TRANSPARENT),
            navigationBarStyle = SystemBarStyle.dark(AndroidColor.TRANSPARENT)
        )

        setContent {
            var language by rememberSaveable { mutableStateOf(AppLanguage.AR) }
            val strings = if (language == AppLanguage.AR) ArabicStrings else EnglishStrings
            val layoutDir = if (language == AppLanguage.AR) LayoutDirection.Rtl else LayoutDirection.Ltr

            CompositionLocalProvider(
                LocalAppLanguage provides language,
                LocalStrings provides strings,
                LocalLayoutDirection provides layoutDir
            ) {
                VexoraStudioTheme(isArabic = language == AppLanguage.AR) {
                    VexoraRoot(
                        onToggleLanguage = {
                            language = if (language == AppLanguage.AR) AppLanguage.EN else AppLanguage.AR
                        }
                    )
                }
            }
        }
    }
}

@Composable
private fun VexoraRoot(onToggleLanguage: () -> Unit) {
    var currentUser by remember { mutableStateOf<FirebaseUser?>(Firebase.auth.currentUser) }

    DisposableEffect(Unit) {
        val listener = FirebaseAuth.AuthStateListener { auth ->
            currentUser = auth.currentUser
        }
        Firebase.auth.addAuthStateListener(listener)
        onDispose { Firebase.auth.removeAuthStateListener(listener) }
    }

    val user = currentUser
    if (user == null) {
        AuthScreen(
            onToggleLanguage = onToggleLanguage,
            onAuthSuccess = { currentUser = Firebase.auth.currentUser }
        )
    } else {
        key(user.uid) {
            VexoraMainShell(
                user = user,
                onToggleLanguage = onToggleLanguage
            )
        }
    }
}

@OptIn(ExperimentalMaterial3Api::class)
@Composable
private fun VexoraMainShell(
    user: FirebaseUser,
    onToggleLanguage: () -> Unit
) {
    val context = LocalContext.current
    val scope = rememberCoroutineScope()
    val credentialManager = remember(context) { CredentialManager.create(context) }
    val strings = LocalStrings.current
    val vexora = LocalVexoraColors.current
    val drawerState = rememberDrawerState(DrawerValue.Closed)
    val snackbarHostState = remember { SnackbarHostState() }

    val studioViewModel: StudioViewModel = viewModel(
        key = user.uid,
        factory = viewModelFactory {
            initializer {
                val app = checkNotNull(this[APPLICATION_KEY])
                val dbId = app.getString(R.string.firestore_database_id)
                val db = FirebaseFirestore.getInstance(dbId)
                StudioViewModel(
                    repository = StudioRepository(db),
                    currentUserId = user.uid,
                    userEmail = user.email,
                    isEmailVerified = user.isEmailVerified
                )
            }
        }
    )
    val aiViewModel: AiAssistantViewModel = viewModel(key = "ai_${user.uid}")

    val isAdmin by studioViewModel.isAdmin.collectAsStateWithLifecycle()
    val servicesState by studioViewModel.servicesState.collectAsStateWithLifecycle()
    val projectsState by studioViewModel.projectsState.collectAsStateWithLifecycle()
    val teamState by studioViewModel.teamState.collectAsStateWithLifecycle()
    val jobsState by studioViewModel.jobsState.collectAsStateWithLifecycle()
    val statsState by studioViewModel.statsState.collectAsStateWithLifecycle()
    val applicationsState by studioViewModel.applicationsState.collectAsStateWithLifecycle()
    val messagesState by studioViewModel.messagesState.collectAsStateWithLifecycle()
    val liveAiContext by studioViewModel.liveAiContext.collectAsStateWithLifecycle()
    val isSubmitting by studioViewModel.isSubmitting.collectAsStateWithLifecycle()
    val actionMessage by studioViewModel.actionMessage.collectAsStateWithLifecycle()
    val actionError by studioViewModel.actionError.collectAsStateWithLifecycle()

    val aiMessages by aiViewModel.messages.collectAsStateWithLifecycle()
    val aiStatus by aiViewModel.status.collectAsStateWithLifecycle()

    var currentRoute by rememberSaveable { mutableStateOf(VexoraRoute.HOME) }

    BackHandler(enabled = currentRoute != VexoraRoute.HOME) {
        currentRoute = VexoraRoute.HOME
    }

    LaunchedEffect(actionMessage, actionError) {
        val msg = actionError ?: actionMessage
        if (!msg.isNullOrBlank()) {
            snackbarHostState.showSnackbar(msg)
            studioViewModel.clearFeedback()
        }
    }

    val navItems = listOf(
        Triple(VexoraRoute.HOME, strings.navHome, Icons.Filled.Home),
        Triple(VexoraRoute.SERVICES, strings.navServices, Icons.Filled.Build),
        Triple(VexoraRoute.PROJECTS, strings.navProjects, Icons.Filled.Layers),
        Triple(VexoraRoute.TEAM_CAREERS, strings.navTeamCareers, Icons.Filled.Groups),
        Triple(VexoraRoute.AI, strings.navAi, Icons.Filled.AutoAwesome),
        Triple(VexoraRoute.CONTACT, strings.navContact, Icons.Filled.Email),
        Triple(VexoraRoute.ADMIN, strings.navAdmin, Icons.Filled.AdminPanelSettings)
    )

    val bottomPrimaryRoutes = listOf(
        Triple(VexoraRoute.HOME, strings.navHome, Icons.Filled.Home),
        Triple(VexoraRoute.SERVICES, strings.navServices, Icons.Filled.Build),
        Triple(VexoraRoute.PROJECTS, strings.navProjects, Icons.Filled.Layers),
        Triple(VexoraRoute.TEAM_CAREERS, strings.navTeamCareers, Icons.Filled.Groups),
        Triple(VexoraRoute.AI, strings.navAi, Icons.Filled.AutoAwesome)
    )

    ModalNavigationDrawer(
        drawerState = drawerState,
        drawerContent = {
            ModalDrawerSheet(
                drawerContainerColor = MaterialTheme.colorScheme.surface
            ) {
                Column(modifier = Modifier.padding(16.dp), verticalArrangement = Arrangement.spacedBy(6.dp)) {
                    VexoraLogo(iconSize = 36.dp, showSubtitle = true)
                    Spacer(Modifier.padding(4.dp))
                    Text(
                        text = user.email ?: user.displayName ?: "",
                        style = MaterialTheme.typography.labelMedium,
                        color = vexora.neonCyan
                    )
                    HorizontalDivider(modifier = Modifier.padding(vertical = 8.dp), color = vexora.glassWhiteBorder)
                }
                navItems.forEach { (route, label, icon) ->
                    NavigationDrawerItem(
                        label = { Text(label) },
                        selected = currentRoute == route,
                        onClick = {
                            currentRoute = route
                            scope.launch { drawerState.close() }
                        },
                        icon = { Icon(icon, contentDescription = null) },
                        modifier = Modifier.padding(horizontal = 12.dp, vertical = 2.dp)
                    )
                }
                Spacer(Modifier.weight(1f))
                HorizontalDivider(color = vexora.glassWhiteBorder)
                NavigationDrawerItem(
                    label = { Text(strings.signOut, color = vexora.error) },
                    selected = false,
                    onClick = {
                        scope.launch { drawerState.close() }
                        signOutUser(credentialManager, scope)
                    },
                    icon = { Icon(Icons.AutoMirrored.Filled.Logout, contentDescription = null, tint = vexora.error) },
                    modifier = Modifier.padding(12.dp)
                )
            }
        }
    ) {
        BoxWithConstraints(modifier = Modifier.fillMaxSize()) {
            val isWideScreen = maxWidth >= 700.dp

            Scaffold(
                containerColor = MaterialTheme.colorScheme.background,
                contentWindowInsets = WindowInsets.safeDrawing,
                snackbarHost = { SnackbarHost(snackbarHostState) },
                topBar = {
                    TopAppBar(
                        colors = TopAppBarDefaults.topAppBarColors(
                            containerColor = MaterialTheme.colorScheme.surface.copy(alpha = 0.94f)
                        ),
                        navigationIcon = {
                            if (!isWideScreen) {
                                IconButton(
                                    onClick = { scope.launch { drawerState.open() } },
                                    modifier = Modifier.minimumInteractiveComponentSize().testTag("mobile_menu_btn")
                                ) {
                                    Icon(Icons.Filled.Menu, contentDescription = "Menu", tint = vexora.neonCyan)
                                }
                            }
                        },
                        title = {
                            VexoraLogo(iconSize = 30.dp, showSubtitle = false)
                        },
                        actions = {
                            LanguageToggleChip(
                                label = strings.langToggleLabel,
                                onToggle = onToggleLanguage
                            )
                            Spacer(Modifier.width(8.dp))
                        }
                    )
                },
                bottomBar = {
                    if (!isWideScreen) {
                        NavigationBar(
                            containerColor = MaterialTheme.colorScheme.surface.copy(alpha = 0.96f)
                        ) {
                            bottomPrimaryRoutes.forEach { (route, label, icon) ->
                                NavigationBarItem(
                                    selected = currentRoute == route,
                                    onClick = { currentRoute = route },
                                    icon = { Icon(icon, contentDescription = label) },
                                    label = { Text(label, maxLines = 1) },
                                    colors = NavigationBarItemDefaults.colors(
                                        selectedIconColor = vexora.neonCyan,
                                        selectedTextColor = vexora.neonCyan,
                                        indicatorColor = vexora.neonCyan.copy(alpha = 0.16f)
                                    ),
                                    modifier = Modifier.testTag("nav_${route.routeTag}")
                                )
                            }
                        }
                    }
                }
            ) { innerPadding ->
                VexoraBackground(modifier = Modifier.padding(innerPadding)) {
                    Row(modifier = Modifier.fillMaxSize()) {
                        if (isWideScreen) {
                            NavigationRail(
                                containerColor = MaterialTheme.colorScheme.surface.copy(alpha = 0.92f),
                                modifier = Modifier.fillMaxHeight()
                            ) {
                                navItems.forEach { (route, label, icon) ->
                                    NavigationRailItem(
                                        selected = currentRoute == route,
                                        onClick = { currentRoute = route },
                                        icon = { Icon(icon, contentDescription = label) },
                                        label = { Text(label, maxLines = 1) }
                                    )
                                }
                            }
                        }

                        Box(
                            modifier = Modifier.weight(1f).fillMaxSize(),
                            contentAlignment = Alignment.TopCenter
                        ) {
                            when (currentRoute) {
                                VexoraRoute.HOME -> HomeScreen(
                                    statsState = statsState,
                                    servicesState = servicesState,
                                    projectsState = projectsState,
                                    onExploreServices = { currentRoute = VexoraRoute.SERVICES },
                                    onNavigateProjects = { currentRoute = VexoraRoute.PROJECTS },
                                    onNavigateContact = { currentRoute = VexoraRoute.CONTACT },
                                    onNavigateAi = { currentRoute = VexoraRoute.AI }
                                )
                                VexoraRoute.SERVICES -> ServicesScreen(
                                    servicesState = servicesState,
                                    onRequestQuote = { currentRoute = VexoraRoute.CONTACT }
                                )
                                VexoraRoute.PROJECTS -> ProjectsScreen(
                                    projectsState = projectsState
                                )
                                VexoraRoute.TEAM_CAREERS -> TeamAndCareersScreen(
                                    teamState = teamState,
                                    jobsState = jobsState,
                                    applicationsState = applicationsState,
                                    isSubmitting = isSubmitting,
                                    defaultUserName = user.displayName ?: "",
                                    defaultUserEmail = user.email ?: "",
                                    onSubmitApplication = { jobId, name, email, phone, role, exp, skills, cvName, cvB64, cvSize ->
                                        studioViewModel.submitJobApplication(
                                            jobId = jobId,
                                            fullName = name,
                                            email = email,
                                            phone = phone,
                                            desiredRole = role,
                                            experienceYears = exp,
                                            skills = skills,
                                            cvFileName = cvName,
                                            cvPdfBase64 = cvB64,
                                            cvSizeBytes = cvSize,
                                            successMsg = strings.applicationSubmitted
                                        )
                                    }
                                )
                                VexoraRoute.AI -> AiAssistantScreen(
                                    messages = aiMessages,
                                    status = aiStatus,
                                    liveContext = liveAiContext,
                                    onSendQuestion = { q, ctx, ar -> aiViewModel.sendQuestion(q, ctx, ar) },
                                    onClearChat = { aiViewModel.clearChat() }
                                )
                                VexoraRoute.CONTACT -> ContactScreen(
                                    messagesState = messagesState,
                                    isSubmitting = isSubmitting,
                                    defaultUserName = user.displayName ?: "",
                                    defaultUserEmail = user.email ?: "",
                                    onSendMessage = { name, email, subject, msg ->
                                        studioViewModel.submitContactMessage(
                                            senderName = name,
                                            email = email,
                                            subject = subject,
                                            message = msg,
                                            successMsg = strings.messageSent
                                        )
                                    }
                                )
                                VexoraRoute.ADMIN -> AdminDashboardScreen(
                                    isAdmin = isAdmin,
                                    userEmail = user.email,
                                    statsState = statsState,
                                    servicesState = servicesState,
                                    projectsState = projectsState,
                                    teamState = teamState,
                                    jobsState = jobsState,
                                    applicationsState = applicationsState,
                                    messagesState = messagesState,
                                    onSwitchAccount = { signOutUser(credentialManager, scope) },
                                    onSeedDefaultData = { studioViewModel.seedDefaultStudioData() },
                                    onSaveStats = { studioViewModel.saveSiteStats(it) },
                                    onSaveService = { studioViewModel.saveService(it) },
                                    onDeleteService = { studioViewModel.deleteService(it) },
                                    onSaveProject = { studioViewModel.saveProject(it) },
                                    onDeleteProject = { studioViewModel.deleteProject(it) },
                                    onSaveTeamMember = { studioViewModel.saveTeamMember(it) },
                                    onDeleteTeamMember = { studioViewModel.deleteTeamMember(it) },
                                    onSaveJob = { studioViewModel.saveJob(it) },
                                    onDeleteJob = { studioViewModel.deleteJob(it) },
                                    onUpdateApplication = { id, st, note -> studioViewModel.updateApplicationStatus(id, st, note) },
                                    onDeleteApplication = { studioViewModel.deleteApplication(it) },
                                    onUpdateMessageStatus = { id, st -> studioViewModel.updateMessageStatus(id, st) },
                                    onDeleteMessage = { studioViewModel.deleteMessage(it) }
                                )
                            }
                        }
                    }
                }
            }
        }
    }
}
