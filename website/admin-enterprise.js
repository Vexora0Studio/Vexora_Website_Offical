// Vexora Studio — Enterprise Admin Panel Module (RBAC, Analytics, AI Control, Support, Releases & DB)
(function () {
  const LOCAL_OWNER_HASH_KEY = "vexora_local_owner_hash_v1";
  const LOCAL_OWNER_META_KEY = "vexora_local_owner_meta_v1";
  const LOCAL_STAFF_KEY = "vexora_local_staff_v1";
  const LOCAL_ADMIN_SESS_KEY = "vexora_local_admin_session_v1";

  const ROLES = ["owner", "super_admin", "admin", "editor", "support"];

  const SECTION_DEFS = [
    { key: "overview", icon: "📊", labelKey: "entNavOverview", roles: ["owner", "super_admin", "admin", "editor", "support"] },
    { key: "website", icon: "🌐", labelKey: "entNavWebsite", roles: ["owner", "super_admin", "admin", "editor"] },
    { key: "projects", icon: "🚀", labelKey: "entNavProjects", roles: ["owner", "super_admin", "admin", "editor"] },
    { key: "clients", icon: "👥", labelKey: "entNavClients", roles: ["owner", "super_admin", "admin", "support"] },
    { key: "employees", icon: "🧑‍💻", labelKey: "entNavEmployees", roles: ["owner", "super_admin", "admin"] },
    { key: "ai_control", icon: "🤖", labelKey: "entNavAi", roles: ["owner", "super_admin", "admin"] },
    { key: "notifications", icon: "🔔", labelKey: "entNavNotifications", roles: ["owner", "super_admin", "admin", "editor"] },
    { key: "support", icon: "🎫", labelKey: "entNavSupport", roles: ["owner", "super_admin", "admin", "editor", "support"] },
    { key: "releases", icon: "📦", labelKey: "entNavReleases", roles: ["owner", "super_admin", "admin"] },
    { key: "database", icon: "🗄️", labelKey: "entNavDatabase", roles: ["owner", "super_admin"] },
    { key: "analytics", icon: "📈", labelKey: "entNavAnalytics", roles: ["owner", "super_admin", "admin", "editor"] },
    { key: "security", icon: "🔐", labelKey: "entNavSecurity", roles: ["owner", "super_admin"] },
    { key: "settings", icon: "⚙️", labelKey: "entNavSettings", roles: ["owner", "super_admin", "admin"] }
  ];

  let uiState = {
    section: "overview",
    sidebarCollapsed: false,
    chartWindow: "7d",
    projSearch: "",
    projCat: "all",
    projStatus: "all",
    clientSearch: "",
    clientStatus: "all",
    supportSearch: "",
    supportStatus: "all",
    supportType: "all",
    supportPriority: "all",
    websiteSubTab: "identity",
    cloudMetrics: null,
    cloudDbHealth: null
  };

  async function hashAdminSecret(email, password) {
    const clean = `vx_ent_admin_v1:${String(email || "").trim().toLowerCase()}:${String(password || "")}`;
    try {
      if (typeof crypto !== "undefined" && crypto.subtle && typeof TextEncoder !== "undefined") {
        const bytes = new TextEncoder().encode(clean);
        const digest = await crypto.subtle.digest("SHA-256", bytes);
        return Array.from(new Uint8Array(digest))
          .map((b) => b.toString(16).padStart(2, "0"))
          .join("");
      }
    } catch {
      // Deterministic fallback for headless/non-TLS test harnesses
    }
    let h1 = 2166136261;
    for (let i = 0; i < clean.length; i++) {
      h1 ^= clean.charCodeAt(i);
      h1 = Math.imul(h1, 16777619);
    }
    return `fnv_${(h1 >>> 0).toString(16)}_${clean.length}`;
  }

  function readJson(storage, key, fallback) {
    try {
      const raw = storage.getItem(key);
      return raw ? JSON.parse(raw) : fallback;
    } catch {
      return fallback;
    }
  }

  function writeJson(storage, key, val) {
    try {
      if (val === null || val === undefined) storage.removeItem(key);
      else storage.setItem(key, JSON.stringify(val));
    } catch {
      // Ignore storage quota errors
    }
  }

  function getLocalOwnerMeta() {
    return readJson(localStorage, LOCAL_OWNER_META_KEY, null);
  }

  function hasLocalOwnerClaimed() {
    return Boolean(localStorage.getItem(LOCAL_OWNER_HASH_KEY) && getLocalOwnerMeta()?.email);
  }

  function getLocalStaffList() {
    const arr = readJson(localStorage, LOCAL_STAFF_KEY, []);
    return Array.isArray(arr) ? arr : [];
  }

  function saveLocalStaffList(list) {
    writeJson(localStorage, LOCAL_STAFF_KEY, list);
  }

  function getActiveAdminSession(Backend) {
    if (Backend.isConfigured()) {
      const cloudSess = Backend.getStoredAuth();
      if (!cloudSess?.access_token) return null;
      return {
        mode: "cloud",
        userId: cloudSess.userId || "",
        email: cloudSess.email || "",
        fullName: cloudSess.fullName || cloudSess.email || "Admin",
        role: ROLES.includes(cloudSess.role) ? cloudSess.role : "admin"
      };
    }
    const localSess = readJson(sessionStorage, LOCAL_ADMIN_SESS_KEY, null);
    if (!localSess?.email) return null;
    // Re-check disabled flag if staff account
    if (localSess.userId && localSess.userId !== "local_owner") {
      const staff = getLocalStaffList().find((s) => s.userId === localSess.userId);
      if (!staff || staff.isActive === false) {
        writeJson(sessionStorage, LOCAL_ADMIN_SESS_KEY, null);
        return null;
      }
      localSess.role = staff.role;
      localSess.fullName = staff.fullName;
    }
    return { ...localSess, mode: "local" };
  }

  function canAccessSection(role, sectionKey) {
    const def = SECTION_DEFS.find((s) => s.key === sectionKey);
    if (!def) return false;
    return def.roles.includes(role);
  }

  function roleBadgeClass(role) {
    switch (role) {
      case "owner": return "success";
      case "super_admin": return "cyan";
      case "admin": return "cyan";
      case "editor": return "warning";
      default: return "neutral";
    }
  }

  function roleLabel(role, t) {
    const map = {
      owner: t("roleOwner"),
      super_admin: t("roleSuperAdmin"),
      admin: t("roleAdmin"),
      editor: t("roleEditor"),
      support: t("roleSupport")
    };
    return map[role] || role;
  }

  function logLoginEvent(ctx, { email, userId = "", role = "", status = "failed", reason = "" }) {
    const { studioState, saveState, Backend } = ctx;
    if (!Array.isArray(studioState.loginLogs)) studioState.loginLogs = [];
    studioState.loginLogs.unshift({
      id: `login_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
      email: String(email || ""),
      userId,
      role,
      status,
      reason,
      createdAt: new Date().toISOString()
    });
    studioState.loginLogs = studioState.loginLogs.slice(0, 120);
    saveState();
    if (Backend.isConfigured() && Backend.recordLoginAttempt) {
      Backend.recordLoginAttempt({ email, userId: userId || null, role, status, reason });
    }
  }

  function logAudit(ctx, session, action, resourceType, resourceId = "", details = {}) {
    const { studioState, saveState, Backend } = ctx;
    if (!Array.isArray(studioState.auditLogs)) studioState.auditLogs = [];
    studioState.auditLogs.unshift({
      id: `audit_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
      actorEmail: session?.email || "system",
      actorRole: session?.role || "admin",
      action,
      resourceType,
      resourceId: String(resourceId || ""),
      details,
      createdAt: new Date().toISOString()
    });
    studioState.auditLogs = studioState.auditLogs.slice(0, 200);
    saveState();
    if (Backend.isConfigured() && Backend.recordAuditLog) {
      Backend.recordAuditLog(action, resourceType, resourceId, details);
    }
  }

  function openConfirmDialog(ctx, title, message, onConfirm, danger = true) {
    const { t, escapeHtml, openModal, closeModal } = ctx;
    openModal(
      title,
      `
      <p class="muted-text" style="margin:0;">${escapeHtml(message)}</p>
      <div class="btn-row" style="margin-top:8px;">
        <button id="entConfirmYesBtn" type="button" class="btn ${danger ? "btn-danger" : "btn-primary"}" style="flex:1;">${escapeHtml(t("entConfirmProceed"))}</button>
        <button id="entConfirmNoBtn" type="button" class="btn btn-outline" style="flex:1;">${escapeHtml(t("cancel"))}</button>
      </div>
    `
    );
    document.getElementById("entConfirmNoBtn").addEventListener("click", closeModal);
    document.getElementById("entConfirmYesBtn").addEventListener("click", async () => {
      closeModal();
      await onConfirm();
    });
  }

  function downloadTextFile(filename, content, mimeType) {
    const blob = new Blob([content], { type: mimeType });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = filename;
    a.click();
    if (typeof URL.revokeObjectURL === "function") {
      URL.revokeObjectURL(a.href);
    }
  }

  function csvCell(val) {
    const s = String(val ?? "").replaceAll('"', '""');
    return `"${s}"`;
  }

  function computeChartBuckets(studioState, windowKey, t, isArabic) {
    const now = Date.now();
    const events = Array.isArray(studioState.analytics?.events) ? studioState.analytics.events : [];
    const reqs = Array.isArray(studioState.projectRequests) ? studioState.projectRequests : [];
    const msgs = Array.isArray(studioState.messages) ? studioState.messages : [];
    const aiLogs = Array.isArray(studioState.aiLogs) ? studioState.aiLogs : [];

    const allPoints = [
      ...events.map((e) => ({ at: e.createdAt, kind: e.eventType === "ai_query" ? "ai" : "view" })),
      ...reqs.map((r) => ({ at: r.createdAt, kind: "req" })),
      ...msgs.map((m) => ({ at: m.createdAt, kind: "msg" })),
      ...aiLogs.map((a) => ({ at: a.createdAt, kind: "ai" }))
    ].filter((x) => x.at);

    const buckets = [];
    if (windowKey === "today") {
      for (let i = 5; i >= 0; i--) {
        const end = now - i * 4 * 3600 * 1000;
        const start = end - 4 * 3600 * 1000;
        const label = `${new Date(start).getHours()}:00`;
        buckets.push({ label, start, end, count: 0 });
      }
    } else if (windowKey === "30d") {
      for (let i = 5; i >= 0; i--) {
        const end = now - i * 5 * 86400 * 1000;
        const start = end - 5 * 86400 * 1000;
        const d = new Date(end);
        buckets.push({ label: `${d.getMonth() + 1}/${d.getDate()}`, start, end, count: 0 });
      }
    } else if (windowKey === "12m") {
      for (let i = 11; i >= 0; i--) {
        const d = new Date();
        d.setDate(1);
        d.setHours(0, 0, 0, 0);
        d.setMonth(d.getMonth() - i);
        const start = d.getTime();
        const next = new Date(d);
        next.setMonth(next.getMonth() + 1);
        const label = d.toLocaleDateString(isArabic() ? "ar" : "en", { month: "short" });
        buckets.push({ label, start, end: next.getTime(), count: 0 });
      }
    } else {
      // 7d default
      for (let i = 6; i >= 0; i--) {
        const d = new Date(now - i * 86400 * 1000);
        d.setHours(0, 0, 0, 0);
        const start = d.getTime();
        const end = start + 86400 * 1000;
        const label = d.toLocaleDateString(isArabic() ? "ar" : "en", { weekday: "short" });
        buckets.push({ label, start, end, count: 0 });
      }
    }

    for (const pt of allPoints) {
      const ts = new Date(pt.at).getTime();
      if (!Number.isFinite(ts)) continue;
      const b = buckets.find((x) => ts >= x.start && ts < x.end);
      if (b) b.count += 1;
    }

    const max = Math.max(1, ...buckets.map((b) => b.count));
    return {
      buckets: buckets.map((b) => ({
        ...b,
        pct: b.count === 0 ? 4 : Math.max(10, Math.round((b.count / max) * 100))
      })),
      totalInWindow: buckets.reduce((acc, b) => acc + b.count, 0),
      windowLabel: t(`entWindow_${windowKey}`)
    };
  }

  /* =========================================================
     AUTH SCREEN (Cloud JWT+RBAC OR Local First-Run Owner Claim)
     ========================================================= */
  function renderAuthGate(root, ctx) {
    const { t, escapeHtml, Backend, showToast, renderScreen } = ctx;
    const cloudConfigured = Backend.isConfigured();

    if (cloudConfigured) {
      root.innerHTML = `
        <div class="ent-auth-wrap">
          <form id="entCloudLoginForm" class="glass-card highlight-border stack-list" novalidate>
            <div class="row-between">
              <span class="status-pill cyan"><span class="pill-dot"></span>Supabase RBAC + Edge Auth</span>
              <span style="font-size:1.5rem;">🛡️</span>
            </div>
            <h1 class="screen-title">${escapeHtml(t("entAuthTitle"))}</h1>
            <p class="muted-text" style="margin:0;">${escapeHtml(t("adminAuthCloudDesc"))}</p>
            <div class="field">
              <label for="entCloudEmail">${escapeHtml(t("adminEmailLabel"))}</label>
              <input id="entCloudEmail" type="email" autocomplete="email" required />
            </div>
            <div class="field">
              <label for="entCloudPass">${escapeHtml(t("adminPasswordLabel"))}</label>
              <input id="entCloudPass" type="password" autocomplete="current-password" required />
            </div>
            <div id="entAuthErr" class="error-text"></div>
            <button id="entCloudSubmitBtn" type="submit" class="btn btn-primary btn-full">🔐 ${escapeHtml(t("adminSignInBtn"))}</button>
            <button id="entResetOverrideBtn" type="button" class="btn btn-text btn-sm">⚙️ ${escapeHtml(t("entResetBackendCfg"))}</button>
          </form>
        </div>
      `;

      document.getElementById("entCloudLoginForm").addEventListener("submit", async (e) => {
        e.preventDefault();
        const email = document.getElementById("entCloudEmail").value.trim().toLowerCase();
        const pass = document.getElementById("entCloudPass").value;
        const err = document.getElementById("entAuthErr");
        const btn = document.getElementById("entCloudSubmitBtn");
        err.textContent = "";
        btn.disabled = true;
        try {
          const sess = await Backend.signInAdmin(email, pass);
          logLoginEvent(ctx, { email: sess.email, userId: sess.userId, role: sess.role, status: "success", reason: "Cloud admin sign-in" });
          const [msgs, reqs, metrics, health] = await Promise.all([
            Backend.fetchAdminMessages().catch(() => null),
            Backend.fetchAllRequestsAdmin().catch(() => null),
            Backend.callAdminGateway("get_overview_metrics").catch(() => null),
            Backend.callAdminGateway("get_db_health").catch(() => null)
          ]);
          if (Array.isArray(msgs)) ctx.studioState.messages = msgs;
          if (Array.isArray(reqs)) ctx.studioState.projectRequests = reqs;
          if (metrics) uiState.cloudMetrics = metrics;
          if (health) uiState.cloudDbHealth = health;
          ctx.saveState();
          showToast(t("adminUnlockedToast"));
          renderScreen();
        } catch (authErr) {
          logLoginEvent(ctx, { email, status: "failed", reason: authErr?.message || "Invalid credentials" });
          err.textContent = authErr?.message || t("adminInvalidAuth");
        } finally {
          btn.disabled = false;
        }
      });

      document.getElementById("entResetOverrideBtn").addEventListener("click", () => {
        Backend.clearPublicConfigOverride();
        Backend.signOutAdmin();
        renderScreen();
      });
      return;
    }

    // Local Preview Mode — Zero hardcoded passwords! First-Run Owner Setup or Sign-In
    const claimed = hasLocalOwnerClaimed();
    if (!claimed) {
      root.innerHTML = `
        <div class="ent-auth-wrap">
          <form id="entOwnerClaimForm" class="glass-card highlight-border stack-list" novalidate>
            <div class="row-between">
              <span class="status-pill warning"><span class="pill-dot"></span>${escapeHtml(t("entLocalPreviewBadge"))}</span>
              <span style="font-size:1.5rem;">👑</span>
            </div>
            <h1 class="screen-title">${escapeHtml(t("entOwnerClaimTitle"))}</h1>
            <p class="muted-text" style="margin:0;">${escapeHtml(t("entOwnerClaimDesc"))}</p>
            <div class="field">
              <label for="claimName">${escapeHtml(t("clientFullNameLabel"))}</label>
              <input id="claimName" type="text" value="Omar Moataz" required />
            </div>
            <div class="field">
              <label for="claimEmail">${escapeHtml(t("adminEmailLabel"))}</label>
              <input id="claimEmail" type="email" value="${escapeHtml(ctx.studioState.settings.officialEmail || "vexora0studio@gmail.com")}" required />
            </div>
            <div class="form-two-col">
              <div class="field">
                <label for="claimPass">${escapeHtml(t("entCreatePasswordLabel"))}</label>
                <input id="claimPass" type="password" minlength="8" autocomplete="new-password" required />
              </div>
              <div class="field">
                <label for="claimPass2">${escapeHtml(t("entConfirmPasswordLabel"))}</label>
                <input id="claimPass2" type="password" minlength="8" autocomplete="new-password" required />
              </div>
            </div>
            <div id="entAuthErr" class="error-text"></div>
            <button type="submit" class="btn btn-primary btn-full">👑 ${escapeHtml(t("entOwnerClaimBtn"))}</button>
          </form>
        </div>
      `;

      document.getElementById("entOwnerClaimForm").addEventListener("submit", async (e) => {
        e.preventDefault();
        const fullName = document.getElementById("claimName").value.trim();
        const email = document.getElementById("claimEmail").value.trim().toLowerCase();
        const pass = document.getElementById("claimPass").value;
        const pass2 = document.getElementById("claimPass2").value;
        const err = document.getElementById("entAuthErr");

        if (fullName.length < 2 || !email.includes("@") || pass.length < 8) {
          err.textContent = t("entPasswordMin8Error");
          return;
        }
        if (pass !== pass2) {
          err.textContent = t("entPasswordMismatchError");
          return;
        }
        const digest = await hashAdminSecret(email, pass);
        localStorage.setItem(LOCAL_OWNER_HASH_KEY, digest);
        writeJson(localStorage, LOCAL_OWNER_META_KEY, {
          userId: "local_owner",
          fullName,
          email,
          role: "owner",
          isActive: true,
          createdAt: new Date().toISOString()
        });
        const session = { userId: "local_owner", fullName, email, role: "owner", mode: "local" };
        writeJson(sessionStorage, LOCAL_ADMIN_SESS_KEY, session);
        logLoginEvent(ctx, { email, userId: "local_owner", role: "owner", status: "success", reason: "Owner account initialized" });
        logAudit(ctx, session, "claim_owner", "admin_users", "local_owner", { email });
        showToast(t("adminUnlockedToast"));
        renderScreen();
      });
      return;
    }

    const ownerMeta = getLocalOwnerMeta();
    root.innerHTML = `
      <div class="ent-auth-wrap">
        <form id="entLocalLoginForm" class="glass-card highlight-border stack-list" novalidate>
          <div class="row-between">
            <span class="status-pill warning"><span class="pill-dot"></span>${escapeHtml(t("entLocalPreviewBadge"))}</span>
            <span style="font-size:1.5rem;">🔐</span>
          </div>
          <h1 class="screen-title">${escapeHtml(t("entAuthTitle"))}</h1>
          <p class="muted-text" style="margin:0;">${escapeHtml(t("entLocalSignInDesc"))}</p>
          <div class="field">
            <label for="entLocEmail">${escapeHtml(t("adminEmailLabel"))}</label>
            <input id="entLocEmail" type="email" value="${escapeHtml(ownerMeta?.email || "")}" required />
          </div>
          <div class="field">
            <label for="entLocPass">${escapeHtml(t("adminPasswordLabel"))}</label>
            <input id="entLocPass" type="password" autocomplete="current-password" required />
          </div>
          <div id="entAuthErr" class="error-text"></div>
          <button type="submit" class="btn btn-primary btn-full">🔓 ${escapeHtml(t("adminUnlockBtn"))}</button>
        </form>
      </div>
    `;

    document.getElementById("entLocalLoginForm").addEventListener("submit", async (e) => {
      e.preventDefault();
      const email = document.getElementById("entLocEmail").value.trim().toLowerCase();
      const pass = document.getElementById("entLocPass").value;
      const err = document.getElementById("entAuthErr");
      const digest = await hashAdminSecret(email, pass);

      if (ownerMeta && email === ownerMeta.email.toLowerCase() && digest === localStorage.getItem(LOCAL_OWNER_HASH_KEY)) {
        const session = { userId: "local_owner", fullName: ownerMeta.fullName, email: ownerMeta.email, role: "owner", mode: "local" };
        writeJson(sessionStorage, LOCAL_ADMIN_SESS_KEY, session);
        logLoginEvent(ctx, { email, userId: "local_owner", role: "owner", status: "success", reason: "Local Owner login" });
        showToast(t("adminUnlockedToast"));
        renderScreen();
        return;
      }

      const staff = getLocalStaffList().find((s) => s.email.toLowerCase() === email && s.pwdHash === digest);
      if (staff) {
        if (staff.isActive === false) {
          logLoginEvent(ctx, { email, userId: staff.userId, role: staff.role, status: "blocked", reason: "Disabled staff account" });
          err.textContent = t("entAccountDisabledError");
          return;
        }
        const session = { userId: staff.userId, fullName: staff.fullName, email: staff.email, role: staff.role, mode: "local" };
        writeJson(sessionStorage, LOCAL_ADMIN_SESS_KEY, session);
        logLoginEvent(ctx, { email, userId: staff.userId, role: staff.role, status: "success", reason: "Local RBAC staff login" });
        showToast(t("adminUnlockedToast"));
        renderScreen();
        return;
      }

      logLoginEvent(ctx, { email, status: "failed", reason: "Invalid email or password" });
      err.textContent = t("adminInvalidAuth");
    });
  }

  /* =========================================================
     MAIN ENTERPRISE SHELL
     ========================================================= */
  function render(root, ctx) {
    const { t, escapeHtml, Backend, studioState } = ctx;
    const session = getActiveAdminSession(Backend);
    if (!session) {
      renderAuthGate(root, ctx);
      return;
    }

    const allowedSections = SECTION_DEFS.filter((s) => s.roles.includes(session.role));
    if (!allowedSections.some((s) => s.key === uiState.section)) {
      uiState.section = allowedSections[0]?.key || "overview";
    }

    const unreadMsgs = (studioState.messages || []).filter((m) => m.status === "new").length;
    const pendingReqs = (studioState.projectRequests || []).filter((r) => r.status === "submitted" || r.status === "reviewing").length;
    const activeTheme = studioState.settings?.themeMode === "light" ? "light" : "dark";

    root.innerHTML = `
      <div class="ent-shell ${uiState.sidebarCollapsed ? "collapsed" : ""}">
        <aside class="ent-sidebar glass-card no-pad" aria-label="Admin Navigation">
          <div class="ent-sidebar-head">
            <div style="min-width:0;">
              <div class="ent-brand-title">VEXORA ADMIN</div>
              <div class="muted-text" style="font-size:0.74rem;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">
                ${escapeHtml(session.fullName)}
              </div>
            </div>
            <button id="entCollapseBtn" type="button" class="icon-btn" aria-label="Toggle Sidebar">
              ${uiState.sidebarCollapsed ? "»" : "«"}
            </button>
          </div>
          <nav class="ent-nav-list">
            ${allowedSections
              .map((sec) => {
                let badge = "";
                if (sec.key === "support" && unreadMsgs > 0) badge = `<span class="ent-nav-badge">${unreadMsgs}</span>`;
                if (sec.key === "clients" && pendingReqs > 0) badge = `<span class="ent-nav-badge">${pendingReqs}</span>`;
                return `
                  <button type="button" class="ent-nav-item ${uiState.section === sec.key ? "active" : ""}" data-ent-sec="${sec.key}">
                    <span class="ent-nav-icon">${sec.icon}</span>
                    <span class="ent-nav-label">${escapeHtml(t(sec.labelKey))}</span>
                    ${badge}
                  </button>
                `;
              })
              .join("")}
          </nav>
        </aside>

        <section class="ent-workspace">
          <header class="ent-topbar glass-card">
            <div style="display:flex;align-items:center;gap:10px;flex-wrap:wrap;">
              <h1 class="card-title" style="font-size:1.15rem;margin:0;">
                ${escapeHtml(t(SECTION_DEFS.find((s) => s.key === uiState.section)?.labelKey || "entNavOverview"))}
              </h1>
              <span class="status-pill ${roleBadgeClass(session.role)}">
                <span class="pill-dot"></span>${escapeHtml(roleLabel(session.role, t))}
              </span>
              <span class="status-pill ${session.mode === "cloud" ? "success" : "warning"}">
                ${escapeHtml(session.mode === "cloud" ? "Cloud DB + RLS" : t("entLocalPreviewBadge"))}
              </span>
            </div>
            <div class="btn-row">
              <button id="entThemeBtn" type="button" class="btn btn-outline btn-sm">
                ${activeTheme === "dark" ? "☀️ " + escapeHtml(t("entThemeLight")) : "🌙 " + escapeHtml(t("entThemeDark"))}
              </button>
              <button id="entBackSiteBtn" type="button" class="btn btn-outline btn-sm">🌐 ${escapeHtml(t("entBackToSite"))}</button>
              <button id="entLogoutBtn" type="button" class="btn btn-outline btn-sm">🔒 ${escapeHtml(t("adminLogoutBtn"))}</button>
            </div>
          </header>

          <div id="entSectionBody" class="stack-list"></div>
        </section>
      </div>
    `;

    document.getElementById("entCollapseBtn").addEventListener("click", () => {
      uiState.sidebarCollapsed = !uiState.sidebarCollapsed;
      render(root, ctx);
    });

    document.getElementById("entThemeBtn").addEventListener("click", async () => {
      const next = studioState.settings.themeMode === "light" ? "dark" : "light";
      studioState.settings.themeMode = next;
      ctx.applyThemeMode(next);
      ctx.saveState();
      logAudit(ctx, session, "update_theme", "site_settings", "main", { themeMode: next });
      if (Backend.isConfigured() && Backend.getStoredAuth()?.access_token) {
        try { await Backend.updateSiteSettings(studioState.settings); } catch {}
      }
      render(root, ctx);
    });

    document.getElementById("entBackSiteBtn").addEventListener("click", () => ctx.navigate("home"));

    document.getElementById("entLogoutBtn").addEventListener("click", () => {
      logAudit(ctx, session, "admin_logout", "session", session.email, {});
      writeJson(sessionStorage, LOCAL_ADMIN_SESS_KEY, null);
      Backend.signOutAdmin();
      ctx.renderScreen();
    });

    root.querySelectorAll("[data-ent-sec]").forEach((btn) => {
      btn.addEventListener("click", async () => {
        const target = btn.dataset.entSec;
        if (!canAccessSection(session.role, target)) return;
        uiState.section = target;
        if (Backend.isConfigured() && Backend.getStoredAuth()?.access_token) {
          try {
            if (target === "support") {
              const msgs = await Backend.fetchAdminMessages();
              if (Array.isArray(msgs)) { studioState.messages = msgs; ctx.saveState(); }
            } else if (target === "clients" || target === "overview") {
              const [reqs, metrics] = await Promise.all([
                Backend.fetchAllRequestsAdmin().catch(() => null),
                Backend.callAdminGateway("get_overview_metrics").catch(() => null)
              ]);
              if (Array.isArray(reqs)) { studioState.projectRequests = reqs; ctx.saveState(); }
              if (metrics) uiState.cloudMetrics = metrics;
            } else if (target === "analytics") {
              ctx.setRemoteAnalyticsCache(await Backend.fetchAnalyticsSummary());
            } else if (target === "database") {
              uiState.cloudDbHealth = await Backend.callAdminGateway("get_db_health");
            }
          } catch {
            // Keep cached values smoothly
          }
        }
        render(root, ctx);
      });
    });

    const body = document.getElementById("entSectionBody");
    switch (uiState.section) {
      case "overview":
        renderOverview(body, ctx, session);
        break;
      case "website":
        renderWebsiteManager(body, ctx, session);
        break;
      case "projects":
        renderProjectsManager(body, ctx, session);
        break;
      case "clients":
        renderClientsManager(body, ctx, session);
        break;
      case "employees":
        renderEmployeesManager(body, ctx, session);
        break;
      case "ai_control":
        renderAiControl(body, ctx, session);
        break;
      case "notifications":
        renderNotificationsManager(body, ctx, session);
        break;
      case "support":
        renderSupportCenter(body, ctx, session);
        break;
      case "releases":
        renderReleasesManager(body, ctx, session);
        break;
      case "database":
        renderDatabaseManager(body, ctx, session);
        break;
      case "analytics":
        renderAnalyticsSection(body, ctx, session);
        break;
      case "security":
        renderSecuritySection(body, ctx, session);
        break;
      case "settings":
        renderSettingsSection(body, ctx, session);
        break;
      default:
        renderOverview(body, ctx, session);
    }
  }

  /* =========================================================
     1. MAIN DASHBOARD OVERVIEW
     ========================================================= */
  function renderOverview(body, ctx, session) {
    const { t, isArabic, escapeHtml, Backend, studioState } = ctx;
    const cm = uiState.cloudMetrics?.counts;
    const projects = studioState.projects || [];
    const inProgProjects = projects.filter((p) => ctx.normalizeProjectStatus(p.status) === "In Progress").length;
    const compProjects = projects.filter((p) => ctx.normalizeProjectStatus(p.status) === "Completed").length;
    const localClients = ctx.localClientStorage.getAccounts();
    const totalVisitors = cm ? cm.totalViews : (studioState.analytics?.totalViews || 0);
    const totalClientsCount = cm ? cm.clientsCount : localClients.length;
    const openMsgs = (studioState.messages || []).filter((m) => m.status === "new" || m.status === "in_progress").length;
    const newReqs = (studioState.projectRequests || []).filter((r) => r.status === "submitted").length;

    const chart = computeChartBuckets(studioState, uiState.chartWindow, t, isArabic);
    const dbStatusText = !Backend.isConfigured()
      ? t("entHealthLocalOnly")
      : ctx.getDbSyncStatus().tested && ctx.getDbSyncStatus().ok
      ? `${t("dbConnectedMsg")} (${ctx.getDbSyncStatus().latencyMs}ms)`
      : t("entHealthReady");
    const aiPaused = studioState.settings?.aiEnabled === false;
    const aiHealthText = aiPaused
      ? t("entAiPausedBadge")
      : ctx.getAiSyncStatus().tested && ctx.getAiSyncStatus().ok
      ? `${t("aiEndpointOkMsg")} (${ctx.getAiSyncStatus().latencyMs}ms)`
      : Backend.isAiConfigured()
      ? t("entHealthReady")
      : t("aiStatusLocal");

    const recentAudit = (uiState.cloudMetrics?.recentAuditLogs || studioState.auditLogs || []).slice(0, 8);

    body.innerHTML = `
      <div class="ent-kpi-grid">
        <div class="glass-card ent-kpi-card"><div class="stat-value">${totalVisitors}</div><div class="stat-label">${escapeHtml(t("entKpiVisitors"))}</div></div>
        <div class="glass-card ent-kpi-card"><div class="stat-value">${totalClientsCount}</div><div class="stat-label">${escapeHtml(t("entKpiClients"))}</div></div>
        <div class="glass-card ent-kpi-card"><div class="stat-value">${projects.length}</div><div class="stat-label">${escapeHtml(t("entKpiProjects"))}</div></div>
        <div class="glass-card ent-kpi-card"><div class="stat-value">${inProgProjects}</div><div class="stat-label">${escapeHtml(t("entKpiInProgress"))}</div></div>
        <div class="glass-card ent-kpi-card"><div class="stat-value">${compProjects}</div><div class="stat-label">${escapeHtml(t("entKpiCompleted"))}</div></div>
        <div class="glass-card ent-kpi-card"><div class="stat-value">${newReqs}</div><div class="stat-label">${escapeHtml(t("entKpiNewRequests"))}</div></div>
        <div class="glass-card ent-kpi-card"><div class="stat-value">${openMsgs}</div><div class="stat-label">${escapeHtml(t("entKpiOpenMessages"))}</div></div>
        <div class="glass-card ent-kpi-card"><div class="stat-value">${studioState.analytics?.aiQueries || 0}</div><div class="stat-label">${escapeHtml(t("analyticsAiQueries"))}</div></div>
      </div>

      <div class="glass-card highlight-border stack-list">
        <div class="row-between">
          <h2 class="card-title">🩺 ${escapeHtml(t("entServiceHealthTitle"))}</h2>
          <div class="btn-row">
            <button id="entTestDbBtn" type="button" class="btn btn-primary btn-sm">🔌 ${escapeHtml(t("testDbBtn"))}</button>
            <button id="entTestAiBtn" type="button" class="btn btn-outline btn-sm">🤖 ${escapeHtml(t("testAiBtn"))}</button>
          </div>
        </div>
        <div class="chips-wrap">
          <span class="status-pill success"><span class="pill-dot"></span>Website: Online</span>
          <span class="status-pill ${Backend.isConfigured() ? (ctx.getDbSyncStatus().ok || !ctx.getDbSyncStatus().tested ? "success" : "error") : "cyan"}">
            <span class="pill-dot"></span>DB: ${escapeHtml(dbStatusText)}
          </span>
          <span class="status-pill ${aiPaused ? "warning" : "cyan"}">
            <span class="pill-dot"></span>Gemini 3.8 Flash: ${escapeHtml(aiHealthText)}
          </span>
        </div>
      </div>

      <div class="glass-card stack-list">
        <div class="row-between">
          <div>
            <h2 class="card-title">📈 ${escapeHtml(t("entActivityChartTitle"))}</h2>
            <p class="muted-text" style="margin:2px 0 0;font-size:0.84rem;">${escapeHtml(chart.windowLabel)}: <strong>${chart.totalInWindow}</strong></p>
          </div>
          <div class="chips-scroll">
            ${["today", "7d", "30d", "12m"]
              .map(
                (wk) => `<button type="button" class="chip-btn ${uiState.chartWindow === wk ? "active" : ""}" data-cwin="${wk}">${escapeHtml(t(`entWindow_${wk}`))}</button>`
              )
              .join("")}
          </div>
        </div>
        <div class="ent-chart-bars">
          ${chart.buckets
            .map(
              (b) => `
            <div class="ent-chart-col" title="${escapeHtml(b.label)}: ${b.count}">
              <div class="ent-chart-val">${b.count}</div>
              <div class="ent-chart-bar-wrap">
                <div class="ent-chart-bar" style="height:${b.pct}%;"></div>
              </div>
              <div class="ent-chart-lbl">${escapeHtml(b.label)}</div>
            </div>
          `
            )
            .join("")}
        </div>
      </div>

      <div class="glass-card stack-list">
        <h2 class="card-title">📜 ${escapeHtml(t("entRecentAuditTitle"))}</h2>
        ${
          recentAudit.length === 0
            ? `<p class="muted-text" style="margin:0;">${escapeHtml(t("entNoAuditLogs"))}</p>`
            : `<div class="ent-table-wrap">
                <table class="ent-table">
                  <thead>
                    <tr>
                      <th>${escapeHtml(t("entColActor"))}</th>
                      <th>${escapeHtml(t("entColAction"))}</th>
                      <th>${escapeHtml(t("entColResource"))}</th>
                      <th>${escapeHtml(t("entColDate"))}</th>
                    </tr>
                  </thead>
                  <tbody>
                    ${recentAudit
                      .map(
                        (a) => `
                      <tr>
                        <td>${escapeHtml(a.actorEmail || a.actor_email || "")} <span class="muted-text">(${escapeHtml(a.actorRole || a.actor_role || "")})</span></td>
                        <td><span class="status-pill cyan">${escapeHtml(a.action)}</span></td>
                        <td>${escapeHtml(a.resourceType || a.resource_type || "")}</td>
                        <td class="muted-text">${escapeHtml((a.createdAt || a.created_at || "").slice(0, 16).replace("T", " "))}</td>
                      </tr>
                    `
                      )
                      .join("")}
                  </tbody>
                </table>
              </div>`
        }
      </div>
    `;

    body.querySelectorAll("[data-cwin]").forEach((b) => {
      b.addEventListener("click", () => {
        uiState.chartWindow = b.dataset.cwin;
        renderOverview(body, ctx, session);
      });
    });

    document.getElementById("entTestDbBtn").addEventListener("click", async () => {
      const res = await Backend.testConnection();
      ctx.setDbSyncStatus({ tested: true, ok: res.ok, latencyMs: res.latencyMs || null, message: res.reason || "" });
      logAudit(ctx, session, "test_db_connection", "database", "supabase", { ok: res.ok });
      ctx.showToast(res.ok ? `${t("dbConnectedMsg")} (${res.latencyMs}ms)` : res.reason || t("dbNotConfiguredMsg"));
      renderOverview(body, ctx, session);
    });

    document.getElementById("entTestAiBtn").addEventListener("click", async () => {
      const res = await Backend.testAiEndpoint();
      ctx.setAiSyncStatus({ tested: true, ok: res.ok, latencyMs: res.latencyMs || null, mode: res.mode || "", message: res.reason || "" });
      logAudit(ctx, session, "test_ai_endpoint", "ai", "vexora-ai", { ok: res.ok });
      ctx.showToast(res.ok ? `${t("aiEndpointOkMsg")} (${res.latencyMs}ms)` : res.reason || t("aiEndpointErrorMsg"));
      renderOverview(body, ctx, session);
    });
  }

  /* =========================================================
     2. WEBSITE MANAGEMENT (Identity, Visibility, Services, FAQ, KB)
     ========================================================= */
  function renderWebsiteManager(body, ctx, session) {
    const { t, isArabic, escapeHtml, Backend, studioState, saveState, showToast } = ctx;
    const subTabs = [
      { key: "identity", label: t("entWebIdentityTab") },
      { key: "visibility", label: t("entWebVisibilityTab") },
      { key: "services", label: `${t("adminTabServices")} (${studioState.services.length})` },
      { key: "knowledge", label: `${t("adminTabKnowledge")} (${(studioState.knowledgeBase || []).length + (studioState.faqs || []).length})` }
    ];

    body.innerHTML = `
      <div class="chips-scroll">
        ${subTabs
          .map((st) => `<button type="button" class="chip-btn ${uiState.websiteSubTab === st.key ? "active" : ""}" data-wtab="${st.key}">${escapeHtml(st.label)}</button>`)
          .join("")}
      </div>
      <div id="entWebBody" class="stack-list"></div>
    `;

    body.querySelectorAll("[data-wtab]").forEach((b) => {
      b.addEventListener("click", () => {
        uiState.websiteSubTab = b.dataset.wtab;
        renderWebsiteManager(body, ctx, session);
      });
    });

    const wBody = document.getElementById("entWebBody");

    if (uiState.websiteSubTab === "identity") {
      const s = studioState.settings;
      wBody.innerHTML = `
        <form id="entWebIdentityForm" class="glass-card highlight-border stack-list">
          <div class="row-between">
            <h2 class="card-title">${escapeHtml(t("settingsCompanyTitle"))}</h2>
            <button id="entPreviewSiteBtn" type="button" class="btn btn-outline btn-sm">👁️ ${escapeHtml(t("entPreviewBeforePublish"))}</button>
          </div>
          <div class="form-two-col">
            <div class="field"><label>Tagline (EN)</label><input id="wTagEn" value="${escapeHtml(s.taglineEn)}" required /></div>
            <div class="field"><label>Tagline (AR)</label><input id="wTagAr" value="${escapeHtml(s.taglineAr)}" required /></div>
          </div>
          <div class="field"><label>Home Intro (EN)</label><textarea id="wDescEn" rows="2">${escapeHtml(s.homeDescEn)}</textarea></div>
          <div class="field"><label>Home Intro (AR)</label><textarea id="wDescAr" rows="2">${escapeHtml(s.homeDescAr)}</textarea></div>
          <div class="form-two-col">
            <div class="field"><label>GitHub URL</label><input id="wGh" value="${escapeHtml(s.githubUrl || "")}" /></div>
            <div class="field"><label>LinkedIn URL</label><input id="wLi" value="${escapeHtml(s.linkedinUrl || "")}" /></div>
          </div>
          <div class="form-two-col">
            <div class="field"><label>YouTube URL</label><input id="wYt" value="${escapeHtml(s.youtubeUrl || "")}" /></div>
            <div class="field"><label>Website URL</label><input id="wWeb" value="${escapeHtml(s.websiteUrl || "")}" /></div>
          </div>
          <button type="submit" class="btn btn-primary btn-full">${escapeHtml(t("saveSettingsBtn"))}</button>
        </form>
      `;

      document.getElementById("entPreviewSiteBtn").addEventListener("click", () => {
        const tag = isArabic() ? document.getElementById("wTagAr").value : document.getElementById("wTagEn").value;
        const desc = isArabic() ? document.getElementById("wDescAr").value : document.getElementById("wDescEn").value;
        ctx.openModal(
          t("entPreviewBeforePublish"),
          `
          <div class="glass-card highlight-border stack-list">
            <span class="status-pill cyan">${escapeHtml(studioState.settings.companyName)}</span>
            <h2 class="card-title" style="font-size:1.3rem;">${escapeHtml(tag)}</h2>
            <p class="muted-text" style="margin:0;">${escapeHtml(desc)}</p>
          </div>
        `
        );
      });

      document.getElementById("entWebIdentityForm").addEventListener("submit", async (e) => {
        e.preventDefault();
        const updated = {
          ...studioState.settings,
          taglineEn: document.getElementById("wTagEn").value.trim(),
          taglineAr: document.getElementById("wTagAr").value.trim(),
          homeDescEn: document.getElementById("wDescEn").value.trim(),
          homeDescAr: document.getElementById("wDescAr").value.trim(),
          githubUrl: document.getElementById("wGh").value.trim(),
          linkedinUrl: document.getElementById("wLi").value.trim(),
          youtubeUrl: document.getElementById("wYt").value.trim(),
          websiteUrl: document.getElementById("wWeb").value.trim()
        };
        if (Backend.isConfigured() && Backend.getStoredAuth()?.access_token) {
          try { await Backend.updateSiteSettings(updated); } catch (err) { showToast(err.message); return; }
        }
        studioState.settings = updated;
        saveState();
        logAudit(ctx, session, "update_site_identity", "site_settings", "main", {});
        showToast(t("settingsSavedToast"));
        ctx.renderAll();
      });
    } else if (uiState.websiteSubTab === "visibility") {
      const vis = studioState.settings.visibleSections || {};
      const sectionKeys = [
        { key: "services", label: t("navServices") },
        { key: "projects", label: t("navProjects") },
        { key: "technologies", label: t("navTechnologies") },
        { key: "team", label: t("navTeam") },
        { key: "ai", label: t("navAi") },
        { key: "client", label: t("navClient") },
        { key: "updates", label: t("navUpdates") },
        { key: "download", label: t("navDownload") },
        { key: "faq", label: "FAQ" }
      ];
      wBody.innerHTML = `
        <form id="entVisibilityForm" class="glass-card highlight-border stack-list">
          <h2 class="card-title">${escapeHtml(t("entWebVisibilityTitle"))}</h2>
          <p class="muted-text" style="margin:0;">${escapeHtml(t("entWebVisibilityDesc"))}</p>
          <div class="two-col-grid">
            ${sectionKeys
              .map(
                (sk) => `
              <label class="checkbox-row glass-card" style="padding:12px;">
                <input type="checkbox" data-vis-key="${sk.key}" ${vis[sk.key] !== false ? "checked" : ""} />
                <span>${escapeHtml(sk.label)}</span>
              </label>
            `
              )
              .join("")}
          </div>
          <button type="submit" class="btn btn-primary btn-full">${escapeHtml(t("save"))}</button>
        </form>
      `;

      document.getElementById("entVisibilityForm").addEventListener("submit", async (e) => {
        e.preventDefault();
        const nextVis = {};
        wBody.querySelectorAll("[data-vis-key]").forEach((cb) => {
          nextVis[cb.dataset.visKey] = cb.checked;
        });
        const updated = { ...studioState.settings, visibleSections: nextVis };
        if (Backend.isConfigured() && Backend.getStoredAuth()?.access_token) {
          try { await Backend.updateSiteSettings(updated); } catch (err) { showToast(err.message); return; }
        }
        studioState.settings = updated;
        saveState();
        logAudit(ctx, session, "update_section_visibility", "site_settings", "main", nextVis);
        showToast(t("settingsSavedToast"));
        ctx.renderAll();
      });
    } else if (uiState.websiteSubTab === "services") {
      const sorted = [...studioState.services].sort((a, b) => (a.sortOrder || 0) - (b.sortOrder || 0));
      wBody.innerHTML = `
        <button id="entAddSrvBtn" type="button" class="btn btn-primary btn-full">+ ${escapeHtml(t("addNew"))} — ${escapeHtml(t("adminTabServices"))}</button>
        ${sorted
          .map(
            (s) => `
          <div class="glass-card row-between">
            <div style="min-width:0;">
              <h3 class="card-title">${ctx.serviceIconGlyph(s.iconKey)} ${escapeHtml(isArabic() ? s.titleAr : s.titleEn)}</h3>
              <p class="muted-text" style="margin:4px 0 0;">${escapeHtml(s.category)} • ${s.published ? "Published" : "Draft"}</p>
            </div>
            <div style="display:flex;gap:6px;flex-shrink:0;">
              <button type="button" class="btn btn-outline btn-sm" data-pub-srv="${escapeHtml(s.id)}">${escapeHtml(s.published ? t("unpublishToggleBtn") : t("publishToggleBtn"))}</button>
              <button type="button" class="icon-btn" data-edit-srv="${escapeHtml(s.id)}" aria-label="${escapeHtml(t("edit"))}">✏️</button>
              <button type="button" class="icon-btn danger" data-del-srv="${escapeHtml(s.id)}" aria-label="${escapeHtml(t("delete"))}">🗑️</button>
            </div>
          </div>
        `
          )
          .join("")}
      `;
      document.getElementById("entAddSrvBtn").addEventListener("click", () => ctx.openServiceEditor(null));
      wBody.querySelectorAll("[data-pub-srv]").forEach((b) =>
        b.addEventListener("click", async () => {
          const item = studioState.services.find((x) => x.id === b.dataset.pubSrv);
          if (!item) return;
          item.published = !item.published;
          if (Backend.isConfigured() && Backend.getStoredAuth()?.access_token) {
            try { await Backend.upsertService(item); } catch (err) { showToast(err.message); return; }
          }
          saveState();
          logAudit(ctx, session, "toggle_service_publish", "services", item.id, { published: item.published });
          renderWebsiteManager(body, ctx, session);
        })
      );
      wBody.querySelectorAll("[data-edit-srv]").forEach((b) =>
        b.addEventListener("click", () => ctx.openServiceEditor(studioState.services.find((x) => x.id === b.dataset.editSrv)))
      );
      wBody.querySelectorAll("[data-del-srv]").forEach((b) =>
        b.addEventListener("click", () => {
          const id = b.dataset.delSrv;
          openConfirmDialog(ctx, t("delete"), t("entDeleteConfirmMsg"), async () => {
            if (Backend.isConfigured() && Backend.getStoredAuth()?.access_token) {
              try { await Backend.deleteService(id); } catch (err) { showToast(err.message); return; }
            }
            studioState.services = studioState.services.filter((x) => x.id !== id);
            saveState();
            logAudit(ctx, session, "delete_service", "services", id, {});
            renderWebsiteManager(body, ctx, session);
          });
        })
      );
    } else if (uiState.websiteSubTab === "knowledge") {
      const kbItems = [...(studioState.knowledgeBase || [])].sort((a, b) => (a.sortOrder || 0) - (b.sortOrder || 0));
      const faqItems = [...(studioState.faqs || [])].sort((a, b) => (a.sortOrder || 0) - (b.sortOrder || 0));
      wBody.innerHTML = `
        <div class="glass-card highlight-border stack-list">
          <div class="row-between">
            <div>
              <h2 class="card-title">📚 ${escapeHtml(t("adminKbTitle"))}</h2>
              <p class="muted-text" style="margin:4px 0 0;font-size:0.84rem;">${escapeHtml(t("adminKbDesc"))}</p>
            </div>
            <button id="entAddKbBtn" type="button" class="btn btn-primary btn-sm">+ ${escapeHtml(t("addNew"))}</button>
          </div>
          ${kbItems
            .map(
              (k) => `
            <div class="glass-card row-between">
              <div style="min-width:0;">
                <h3 class="card-title">${escapeHtml(isArabic() ? k.titleAr : k.titleEn)}</h3>
                <p class="muted-text" style="margin:4px 0 0;">${escapeHtml(k.topic)} • ${k.published !== false ? "Published" : "Draft"}</p>
              </div>
              <div style="display:flex;gap:4px;">
                <button type="button" class="icon-btn" data-edit-kb="${escapeHtml(k.id)}">✏️</button>
                <button type="button" class="icon-btn danger" data-del-kb="${escapeHtml(k.id)}">🗑️</button>
              </div>
            </div>
          `
            )
            .join("")}
        </div>
        <div class="glass-card stack-list">
          <div class="row-between">
            <h2 class="card-title">❓ ${escapeHtml(t("adminFaqTitle"))}</h2>
            <button id="entAddFaqBtn" type="button" class="btn btn-outline btn-sm">+ ${escapeHtml(t("addNew"))}</button>
          </div>
          ${faqItems
            .map(
              (f) => `
            <div class="glass-card row-between">
              <div style="min-width:0;">
                <h3 class="card-title">${escapeHtml(isArabic() ? f.questionAr : f.questionEn)}</h3>
                <p class="muted-text" style="margin:4px 0 0;">${escapeHtml(f.category || "general")} • ${f.published !== false ? "Published" : "Draft"}</p>
              </div>
              <div style="display:flex;gap:4px;">
                <button type="button" class="icon-btn" data-edit-faq="${escapeHtml(f.id)}">✏️</button>
                <button type="button" class="icon-btn danger" data-del-faq="${escapeHtml(f.id)}">🗑️</button>
              </div>
            </div>
          `
            )
            .join("")}
        </div>
      `;
      document.getElementById("entAddKbBtn").addEventListener("click", () => ctx.openKbEditor(null));
      wBody.querySelectorAll("[data-edit-kb]").forEach((b) =>
        b.addEventListener("click", () => ctx.openKbEditor((studioState.knowledgeBase || []).find((x) => x.id === b.dataset.editKb)))
      );
      wBody.querySelectorAll("[data-del-kb]").forEach((b) =>
        b.addEventListener("click", () => {
          const id = b.dataset.delKb;
          openConfirmDialog(ctx, t("delete"), t("entDeleteConfirmMsg"), async () => {
            if (Backend.isConfigured() && Backend.getStoredAuth()?.access_token) {
              try { await Backend.deleteKnowledgeItem(id); } catch (err) { showToast(err.message); return; }
            }
            studioState.knowledgeBase = (studioState.knowledgeBase || []).filter((x) => x.id !== id);
            saveState();
            logAudit(ctx, session, "delete_kb", "knowledge_base", id, {});
            renderWebsiteManager(body, ctx, session);
          });
        })
      );
      document.getElementById("entAddFaqBtn").addEventListener("click", () => ctx.openFaqEditor(null));
      wBody.querySelectorAll("[data-edit-faq]").forEach((b) =>
        b.addEventListener("click", () => ctx.openFaqEditor((studioState.faqs || []).find((x) => x.id === b.dataset.editFaq)))
      );
      wBody.querySelectorAll("[data-del-faq]").forEach((b) =>
        b.addEventListener("click", () => {
          const id = b.dataset.delFaq;
          openConfirmDialog(ctx, t("delete"), t("entDeleteConfirmMsg"), async () => {
            if (Backend.isConfigured() && Backend.getStoredAuth()?.access_token) {
              try { await Backend.deleteFaq(id); } catch (err) { showToast(err.message); return; }
            }
            studioState.faqs = (studioState.faqs || []).filter((x) => x.id !== id);
            saveState();
            logAudit(ctx, session, "delete_faq", "faqs", id, {});
            renderWebsiteManager(body, ctx, session);
          });
        })
      );
    }
  }

  /* =========================================================
     3. PROJECTS MANAGEMENT (Full CRUD + Search/Filter + History)
     ========================================================= */
  function renderProjectsManager(body, ctx, session) {
    const { t, isArabic, escapeHtml, Backend, studioState, saveState, showToast } = ctx;
    const pq = uiState.projSearch.trim().toLowerCase();
    const list = (studioState.projects || [])
      .filter((p) => uiState.projCat === "all" || p.category === uiState.projCat)
      .filter((p) => uiState.projStatus === "all" || ctx.normalizeProjectStatus(p.status) === uiState.projStatus)
      .filter((p) => {
        if (!pq) return true;
        return `${p.nameEn} ${p.nameAr} ${p.category} ${(p.technologies || []).join(" ")}`.toLowerCase().includes(pq);
      });

    body.innerHTML = `
      <div class="glass-card stack-list">
        <div class="row-between">
          <button id="entAddProjBtn" type="button" class="btn btn-primary btn-sm">+ ${escapeHtml(t("addNew"))} — ${escapeHtml(t("adminTabProjects"))}</button>
          <span class="muted-text" style="font-size:0.84rem;">${list.length} / ${studioState.projects.length}</span>
        </div>
        <div class="form-two-col">
          <div class="field">
            <input id="entProjSearch" type="search" value="${escapeHtml(uiState.projSearch)}" placeholder="${escapeHtml(t("searchProjectsPlaceholder"))}" />
          </div>
          <div class="form-two-col">
            <select id="entProjCat">
              <option value="all">${escapeHtml(t("projectTypeAll"))}</option>
              ${ctx.PROJECT_CATEGORIES.map((c) => `<option value="${escapeHtml(c)}" ${uiState.projCat === c ? "selected" : ""}>${escapeHtml(c)}</option>`).join("")}
            </select>
            <select id="entProjStat">
              <option value="all">${escapeHtml(t("statusAll"))}</option>
              ${ctx.PROJECT_STATUSES.map((s) => `<option value="${escapeHtml(s)}" ${uiState.projStatus === s ? "selected" : ""}>${escapeHtml(s)}</option>`).join("")}
            </select>
          </div>
        </div>
      </div>

      ${
        list.length === 0
          ? `<div class="glass-card"><p class="muted-text" style="margin:0;">${escapeHtml(t("noProjectsYet"))}</p></div>`
          : list
              .map((p) => {
                const st = ctx.statusMeta(p.status);
                return `
                  <div class="glass-card row-between" style="flex-wrap:wrap;gap:12px;">
                    <div style="min-width:220px;flex:1;">
                      <div style="display:flex;align-items:center;gap:8px;flex-wrap:wrap;">
                        <h3 class="card-title">${escapeHtml(isArabic() ? p.nameAr : p.nameEn)}</h3>
                        <span class="status-pill ${st.cls}"><span class="pill-dot"></span>${escapeHtml(st.label)}</span>
                        ${p.featured ? `<span class="status-pill cyan">★ Featured</span>` : ""}
                      </div>
                      <p class="muted-text" style="margin:4px 0;">${escapeHtml(p.category)} • ${p.published ? "Published" : "Draft"} • ${(p.technologies || []).join(", ")}</p>
                      ${
                        Array.isArray(p.assignedTeam) && p.assignedTeam.length
                          ? `<div style="font-size:0.78rem;color:var(--neon-cyan);">👥 ${escapeHtml(p.assignedTeam.join(", "))}</div>`
                          : ""
                      }
                    </div>
                    <div style="display:flex;gap:6px;flex-wrap:wrap;align-items:center;">
                      <button type="button" class="btn btn-outline btn-sm" data-hist-proj="${escapeHtml(p.id)}">🕒 ${escapeHtml(t("entHistoryBtn"))}</button>
                      <button type="button" class="btn btn-outline btn-sm" data-pub-proj="${escapeHtml(p.id)}">${escapeHtml(p.published ? t("unpublishToggleBtn") : t("publishToggleBtn"))}</button>
                      <button type="button" class="icon-btn" data-edit-proj="${escapeHtml(p.id)}" aria-label="${escapeHtml(t("edit"))}">✏️</button>
                      <button type="button" class="icon-btn danger" data-del-proj="${escapeHtml(p.id)}" aria-label="${escapeHtml(t("delete"))}">🗑️</button>
                    </div>
                  </div>
                `;
              })
              .join("")
      }
    `;

    document.getElementById("entAddProjBtn").addEventListener("click", () => ctx.openProjectEditor(null));
    document.getElementById("entProjSearch").addEventListener("input", (e) => {
      uiState.projSearch = e.target.value;
      renderProjectsManager(body, ctx, session);
    });
    document.getElementById("entProjCat").addEventListener("change", (e) => {
      uiState.projCat = e.target.value;
      renderProjectsManager(body, ctx, session);
    });
    document.getElementById("entProjStat").addEventListener("change", (e) => {
      uiState.projStatus = e.target.value;
      renderProjectsManager(body, ctx, session);
    });

    body.querySelectorAll("[data-hist-proj]").forEach((b) =>
      b.addEventListener("click", () => {
        const p = studioState.projects.find((x) => x.id === b.dataset.histProj);
        if (!p) return;
        const hist = Array.isArray(p.changeHistory) ? p.changeHistory : [];
        ctx.openModal(
          `${isArabic() ? p.nameAr : p.nameEn} — ${t("entHistoryBtn")}`,
          hist.length === 0
            ? `<p class="muted-text" style="margin:0;">${escapeHtml(t("entNoAuditLogs"))}</p>`
            : hist
                .map(
                  (h) => `
                <div class="glass-card" style="padding:10px;">
                  <div style="font-size:0.8rem;color:var(--neon-cyan);">${escapeHtml(h.actor || "admin")} • ${escapeHtml((h.at || "").slice(0, 16).replace("T", " "))}</div>
                  <div style="font-size:0.86rem;">${escapeHtml(h.summary || h.status || "Updated")}</div>
                </div>
              `
                )
                .join("")
        );
      })
    );

    body.querySelectorAll("[data-pub-proj]").forEach((b) =>
      b.addEventListener("click", async () => {
        const item = studioState.projects.find((x) => x.id === b.dataset.pubProj);
        if (!item) return;
        item.published = !item.published;
        if (!Array.isArray(item.changeHistory)) item.changeHistory = [];
        item.changeHistory.unshift({ at: new Date().toISOString(), actor: session.email, summary: item.published ? "Published" : "Unpublished" });
        if (Backend.isConfigured() && Backend.getStoredAuth()?.access_token) {
          try { await Backend.upsertProject(item); } catch (err) { showToast(err.message); return; }
        }
        saveState();
        logAudit(ctx, session, "toggle_project_publish", "projects", item.id, { published: item.published });
        renderProjectsManager(body, ctx, session);
      })
    );

    body.querySelectorAll("[data-edit-proj]").forEach((b) =>
      b.addEventListener("click", () => ctx.openProjectEditor(studioState.projects.find((x) => x.id === b.dataset.editProj)))
    );

    body.querySelectorAll("[data-del-proj]").forEach((b) =>
      b.addEventListener("click", () => {
        const id = b.dataset.delProj;
        openConfirmDialog(ctx, t("delete"), t("entDeleteConfirmMsg"), async () => {
          if (Backend.isConfigured() && Backend.getStoredAuth()?.access_token) {
            try { await Backend.deleteProject(id); } catch (err) { showToast(err.message); return; }
          }
          studioState.projects = studioState.projects.filter((x) => x.id !== id);
          saveState();
          logAudit(ctx, session, "delete_project", "projects", id, {});
          renderProjectsManager(body, ctx, session);
        });
      })
    );
  }

  /* =========================================================
     4. CLIENTS & USERS MANAGEMENT
     ========================================================= */
  function buildMergedClientsList(ctx) {
    const cloudClients = Array.isArray(uiState.cloudMetrics?.clients) ? uiState.cloudMetrics.clients : [];
    const localClients = ctx.localClientStorage.getAccounts();
    const map = new Map();

    for (const c of cloudClients) {
      map.set((c.email || c.user_id || "").toLowerCase(), {
        userId: c.user_id,
        fullName: c.full_name || c.email,
        email: c.email || "",
        company: c.company || "",
        phone: c.phone || "",
        status: c.status || "active",
        internalNotes: c.internal_notes || "",
        createdAt: c.created_at || "",
        source: "cloud"
      });
    }
    for (const lc of localClients) {
      const k = (lc.email || lc.userId || "").toLowerCase();
      if (!map.has(k)) {
        map.set(k, {
          userId: lc.userId,
          fullName: lc.fullName,
          email: lc.email,
          company: lc.company || "",
          phone: lc.phone || "",
          status: lc.status || "active",
          internalNotes: lc.internalNotes || "",
          createdAt: lc.createdAt || "",
          source: "local"
        });
      }
    }
    for (const req of ctx.studioState.projectRequests || []) {
      const k = (req.clientEmail || "").toLowerCase();
      if (k && !map.has(k)) {
        map.set(k, {
          userId: req.userId || k,
          fullName: req.clientName || k,
          email: req.clientEmail,
          company: "",
          phone: "",
          status: "active",
          internalNotes: "",
          createdAt: req.createdAt || "",
          source: "request"
        });
      }
    }
    return [...map.values()];
  }

  function renderClientsManager(body, ctx, session) {
    const { t, escapeHtml, Backend, studioState, saveState, showToast } = ctx;
    const cq = uiState.clientSearch.trim().toLowerCase();
    const clients = buildMergedClientsList(ctx)
      .filter((c) => uiState.clientStatus === "all" || c.status === uiState.clientStatus)
      .filter((c) => !cq || `${c.fullName} ${c.email} ${c.company}`.toLowerCase().includes(cq));

    const requests = studioState.projectRequests || [];

    body.innerHTML = `
      <div class="glass-card stack-list">
        <div class="row-between">
          <div>
            <h2 class="card-title">👥 ${escapeHtml(t("entNavClients"))} (${clients.length})</h2>
            <p class="muted-text" style="margin:2px 0 0;font-size:0.84rem;">${escapeHtml(t("entClientsSubtitle"))}</p>
          </div>
          <div class="btn-row">
            <button id="entExportClientsCsv" type="button" class="btn btn-outline btn-sm">📥 ${escapeHtml(t("entExportCsv"))}</button>
            <button id="entPrintClientsPdf" type="button" class="btn btn-outline btn-sm">🖨️ ${escapeHtml(t("entExportPdf"))}</button>
          </div>
        </div>
        <div class="form-two-col">
          <input id="entClientSearch" type="search" value="${escapeHtml(uiState.clientSearch)}" placeholder="${escapeHtml(t("entSearchClientsPlaceholder"))}" />
          <select id="entClientStatFilter">
            <option value="all">${escapeHtml(t("statusAll"))}</option>
            <option value="active" ${uiState.clientStatus === "active" ? "selected" : ""}>${escapeHtml(t("entActiveLabel"))}</option>
            <option value="disabled" ${uiState.clientStatus === "disabled" ? "selected" : ""}>${escapeHtml(t("entDisabledLabel"))}</option>
          </select>
        </div>
      </div>

      ${
        clients.length === 0
          ? `<div class="glass-card"><p class="muted-text" style="margin:0;">${escapeHtml(t("entNoClientsFound"))}</p></div>`
          : `<div class="ent-table-wrap glass-card">
              <table class="ent-table">
                <thead>
                  <tr>
                    <th>${escapeHtml(t("clientFullNameLabel"))}</th>
                    <th>${escapeHtml(t("clientEmailLabel"))}</th>
                    <th>${escapeHtml(t("statusLabel"))}</th>
                    <th>${escapeHtml(t("entColRequests"))}</th>
                    <th>${escapeHtml(t("entColDate"))}</th>
                    <th>${escapeHtml(t("entColActions"))}</th>
                  </tr>
                </thead>
                <tbody>
                  ${clients
                    .map((cl) => {
                      const clReqs = requests.filter(
                        (r) => (cl.userId && r.userId === cl.userId) || (r.clientEmail || "").toLowerCase() === (cl.email || "").toLowerCase()
                      );
                      const disabled = cl.status === "disabled";
                      return `
                        <tr>
                          <td><strong>${escapeHtml(cl.fullName)}</strong>${cl.company ? `<div class="muted-text" style="font-size:0.76rem;">${escapeHtml(cl.company)}</div>` : ""}</td>
                          <td>${escapeHtml(cl.email)}</td>
                          <td><span class="status-pill ${disabled ? "error" : "success"}"><span class="pill-dot"></span>${escapeHtml(disabled ? t("entDisabledLabel") : t("entActiveLabel"))}</span></td>
                          <td>${clReqs.length}</td>
                          <td class="muted-text">${escapeHtml((cl.createdAt || "").slice(0, 10) || "—")}</td>
                          <td>
                            <div style="display:flex;gap:6px;flex-wrap:wrap;">
                              <button type="button" class="btn btn-outline btn-sm" data-cl-inspect="${escapeHtml(cl.email)}">👁️ ${escapeHtml(t("viewDetails"))}</button>
                              <button type="button" class="btn btn-outline btn-sm" data-cl-toggle="${escapeHtml(cl.userId)}" data-cl-cur="${escapeHtml(cl.status)}">${escapeHtml(disabled ? t("entEnableBtn") : t("entDisableBtn"))}</button>
                            </div>
                          </td>
                        </tr>
                      `;
                    })
                    .join("")}
                </tbody>
              </table>
            </div>`
      }

      <div class="glass-card stack-list">
        <h2 class="card-title">📋 ${escapeHtml(t("adminRequestsTitle"))} (${requests.length})</h2>
        <div id="entRequestsWrap" class="stack-list"></div>
      </div>
    `;

    if (window.VexoraPortal?.renderAdminRequestsSection) {
      window.VexoraPortal.renderAdminRequestsSection(document.getElementById("entRequestsWrap"), {
        t,
        escapeHtml,
        Backend,
        studioState,
        saveState,
        showToast,
        renderScreen: () => renderClientsManager(body, ctx, session)
      });
    }

    document.getElementById("entClientSearch").addEventListener("input", (e) => {
      uiState.clientSearch = e.target.value;
      renderClientsManager(body, ctx, session);
    });
    document.getElementById("entClientStatFilter").addEventListener("change", (e) => {
      uiState.clientStatus = e.target.value;
      renderClientsManager(body, ctx, session);
    });

    document.getElementById("entExportClientsCsv").addEventListener("click", () => {
      const headers = ["Name", "Email", "Company", "Status", "Requests", "Registered"];
      const rows = clients.map((cl) => {
        const rc = requests.filter((r) => (r.clientEmail || "").toLowerCase() === (cl.email || "").toLowerCase()).length;
        return [cl.fullName, cl.email, cl.company, cl.status, rc, (cl.createdAt || "").slice(0, 10)].map(csvCell).join(",");
      });
      downloadTextFile(`vexora-clients-${new Date().toISOString().slice(0, 10)}.csv`, [headers.join(","), ...rows].join("\n"), "text/csv;charset=utf-8");
      logAudit(ctx, session, "export_clients_csv", "clients", "all", { count: clients.length });
      showToast(t("entExportedToast"));
    });

    document.getElementById("entPrintClientsPdf").addEventListener("click", () => {
      if (typeof window.print === "function") window.print();
    });

    body.querySelectorAll("[data-cl-toggle]").forEach((btn) => {
      btn.addEventListener("click", async () => {
        const uid = btn.dataset.clToggle;
        const nextStatus = btn.dataset.clCur === "disabled" ? "active" : "disabled";
        if (Backend.isConfigured() && Backend.getStoredAuth()?.access_token) {
          try {
            await Backend.callAdminGateway("toggle_client_status", { userId: uid, status: nextStatus });
            if (uiState.cloudMetrics?.clients) {
              const target = uiState.cloudMetrics.clients.find((x) => x.user_id === uid);
              if (target) target.status = nextStatus;
            }
          } catch (err) {
            showToast(err.message);
            return;
          }
        }
        ctx.localClientStorage.updateAccountStatus(uid, nextStatus);
        logAudit(ctx, session, "toggle_client_status", "client_profiles", uid, { status: nextStatus });
        showToast("✓");
        renderClientsManager(body, ctx, session);
      });
    });

    body.querySelectorAll("[data-cl-inspect]").forEach((btn) => {
      btn.addEventListener("click", () => {
        const email = btn.dataset.clInspect;
        const cl = clients.find((x) => x.email.toLowerCase() === email.toLowerCase());
        if (!cl) return;
        const clReqs = requests.filter((r) => (r.clientEmail || "").toLowerCase() === email.toLowerCase());
        ctx.openModal(
          cl.fullName,
          `
          <div style="color:var(--neon-cyan);font-size:0.9rem;">${escapeHtml(cl.email)} ${cl.phone ? `• ${escapeHtml(cl.phone)}` : ""}</div>
          <div class="muted-text" style="font-size:0.84rem;">${escapeHtml(cl.company || "—")} • ${escapeHtml(cl.status)}</div>
          <form id="entClientNoteForm" class="stack-list">
            <div class="field">
              <label>${escapeHtml(t("entInternalNotesLabel"))}</label>
              <textarea id="entClNoteInp" rows="2">${escapeHtml(cl.internalNotes || "")}</textarea>
            </div>
            <button type="submit" class="btn btn-primary btn-sm">${escapeHtml(t("save"))}</button>
          </form>
          <div class="stack-list">
            <strong style="font-size:0.86rem;">${escapeHtml(t("entColRequests"))} (${clReqs.length})</strong>
            ${
              clReqs.length === 0
                ? `<p class="muted-text" style="margin:0;">${escapeHtml(t("clientNoRequestsYet"))}</p>`
                : clReqs
                    .map(
                      (r) => `<div class="glass-card" style="padding:10px;">
                        <strong>${escapeHtml(r.projectTitle)}</strong>
                        <div class="muted-text" style="font-size:0.8rem;">${escapeHtml(r.status)} • ${escapeHtml((r.createdAt || "").slice(0, 10))}</div>
                      </div>`
                    )
                    .join("")
            }
          </div>
        `
        );
        document.getElementById("entClientNoteForm").addEventListener("submit", async (e) => {
          e.preventDefault();
          const note = document.getElementById("entClNoteInp").value.trim();
          if (Backend.isConfigured() && Backend.getStoredAuth()?.access_token) {
            try {
              await Backend.callAdminGateway("toggle_client_status", { userId: cl.userId, status: cl.status, internalNotes: note });
              if (uiState.cloudMetrics?.clients) {
                const target = uiState.cloudMetrics.clients.find((x) => x.user_id === cl.userId);
                if (target) target.internal_notes = note;
              }
            } catch (err) {
              showToast(err.message);
              return;
            }
          }
          ctx.localClientStorage.updateAccountStatus(cl.userId, cl.status, note);
          logAudit(ctx, session, "update_client_notes", "client_profiles", cl.userId, {});
          ctx.closeModal();
          renderClientsManager(body, ctx, session);
        });
      });
    });
  }

  /* =========================================================
     5. EMPLOYEES & INTERNAL TEAM MANAGEMENT
     ========================================================= */
  function renderEmployeesManager(body, ctx, session) {
    const { t, isArabic, escapeHtml, Backend, studioState, saveState, showToast } = ctx;
    const team = [...(studioState.team || [])].sort((a, b) => (a.sortOrder || 0) - (b.sortOrder || 0));

    body.innerHTML = `
      <div class="glass-card row-between">
        <div>
          <h2 class="card-title">🧑‍💻 ${escapeHtml(t("entNavEmployees"))} (${team.length})</h2>
          <p class="muted-text" style="margin:2px 0 0;font-size:0.84rem;">${escapeHtml(t("entEmployeesSubtitle"))}</p>
        </div>
        <button id="entAddEmpBtn" type="button" class="btn btn-primary btn-sm">+ ${escapeHtml(t("addNew"))}</button>
      </div>
      ${team
        .map((m) => {
          const empStat = m.employeeStatus || "active";
          const assignedCount = (studioState.projects || []).filter((p) => (p.assignedTeam || []).includes(m.nameEn) || (p.assignedTeam || []).includes(m.id)).length;
          return `
            <div class="glass-card row-between" style="flex-wrap:wrap;gap:12px;">
              <div style="min-width:220px;flex:1;">
                <div style="display:flex;align-items:center;gap:8px;flex-wrap:wrap;">
                  <h3 class="card-title">${escapeHtml(isArabic() ? m.nameAr : m.nameEn)}</h3>
                  <span class="status-pill ${empStat === "active" ? "success" : empStat === "on_leave" ? "warning" : "error"}">${escapeHtml(empStat)}</span>
                  ${m.systemRole && m.systemRole !== "none" ? `<span class="status-pill cyan">${escapeHtml(roleLabel(m.systemRole, t))}</span>` : ""}
                </div>
                <div class="muted-text" style="font-size:0.86rem;">
                  ${escapeHtml(isArabic() ? m.roleAr : m.roleEn)}${m.email ? ` • ${escapeHtml(m.email)}` : ""}
                </div>
                <div style="font-size:0.78rem;color:var(--neon-cyan);margin-top:4px;">
                  ${(m.skills || []).slice(0, 6).map((sk) => escapeHtml(sk)).join(" · ")} • ${assignedCount} ${escapeHtml(t("entAssignedProjectsCount"))}
                </div>
              </div>
              <div style="display:flex;gap:6px;align-items:center;">
                ${m.cvSummary || m.portfolioUrl ? `<button type="button" class="btn btn-outline btn-sm" data-emp-cv="${escapeHtml(m.id)}">📄 CV</button>` : ""}
                <button type="button" class="btn btn-outline btn-sm" data-pub-tm="${escapeHtml(m.id)}">${escapeHtml(m.published ? t("unpublishToggleBtn") : t("publishToggleBtn"))}</button>
                <button type="button" class="icon-btn" data-edit-tm="${escapeHtml(m.id)}" aria-label="${escapeHtml(t("edit"))}">✏️</button>
                <button type="button" class="icon-btn danger" data-del-tm="${escapeHtml(m.id)}" aria-label="${escapeHtml(t("delete"))}">🗑️</button>
              </div>
            </div>
          `;
        })
        .join("")}
    `;

    document.getElementById("entAddEmpBtn").addEventListener("click", () => ctx.openTeamEditor(null));
    body.querySelectorAll("[data-emp-cv]").forEach((b) =>
      b.addEventListener("click", () => {
        const m = studioState.team.find((x) => x.id === b.dataset.empCv);
        if (!m) return;
        const pUrl = ctx.safeHttpUrl(m.portfolioUrl || "");
        ctx.openModal(
          `${isArabic() ? m.nameAr : m.nameEn} — CV / Portfolio`,
          `
          <p class="muted-text" style="margin:0;white-space:pre-wrap;">${escapeHtml(m.cvSummary || "—")}</p>
          ${pUrl ? `<a href="${escapeHtml(pUrl)}" target="_blank" rel="noopener noreferrer" class="btn btn-primary btn-sm">Portfolio ↗</a>` : ""}
        `
        );
      })
    );
    body.querySelectorAll("[data-pub-tm]").forEach((b) =>
      b.addEventListener("click", async () => {
        const item = studioState.team.find((x) => x.id === b.dataset.pubTm);
        if (!item) return;
        item.published = !item.published;
        if (Backend.isConfigured() && Backend.getStoredAuth()?.access_token) {
          try { await Backend.upsertTeamMember(item); } catch (err) { showToast(err.message); return; }
        }
        saveState();
        logAudit(ctx, session, "toggle_employee_publish", "team_members", item.id, { published: item.published });
        renderEmployeesManager(body, ctx, session);
      })
    );
    body.querySelectorAll("[data-edit-tm]").forEach((b) =>
      b.addEventListener("click", () => ctx.openTeamEditor(studioState.team.find((x) => x.id === b.dataset.editTm)))
    );
    body.querySelectorAll("[data-del-tm]").forEach((b) =>
      b.addEventListener("click", () => {
        const id = b.dataset.delTm;
        openConfirmDialog(ctx, t("delete"), t("entDeleteConfirmMsg"), async () => {
          if (Backend.isConfigured() && Backend.getStoredAuth()?.access_token) {
            try { await Backend.deleteTeamMember(id); } catch (err) { showToast(err.message); return; }
          }
          studioState.team = studioState.team.filter((x) => x.id !== id);
          saveState();
          logAudit(ctx, session, "delete_employee", "team_members", id, {});
          renderEmployeesManager(body, ctx, session);
        });
      })
    );
  }

  /* =========================================================
     6. VEXORA AI CONTROL CENTER
     ========================================================= */
  function renderAiControl(body, ctx, session) {
    const { t, isArabic, escapeHtml, Backend, studioState, saveState, showToast } = ctx;
    const ar = isArabic();
    const s = studioState.settings;
    const logs = Array.isArray(uiState.cloudMetrics?.recentAiLogs) && uiState.cloudMetrics.recentAiLogs.length
      ? uiState.cloudMetrics.recentAiLogs
      : (studioState.aiLogs || []);
    const errCount = logs.filter((l) => l.status === "error" || l.status === "paused").length;
    const avgLatency = logs.length
      ? Math.round(logs.reduce((acc, l) => acc + Number(l.latencyMs || l.latency_ms || 0), 0) / logs.length)
      : 0;
    const totalTokens = logs.reduce(
      (acc, l) => acc + Number(l.tokensEstimated || 0) + Number(l.tokens_input || 0) + Number(l.tokens_output || 0),
      0
    );
    const ratedLogs = logs.filter((l) => l.feedback === "up" || l.feedback === "down");
    const upLogs = ratedLogs.filter((l) => l.feedback === "up").length;
    const satisfactionPct = ratedLogs.length ? `${Math.round((upLogs / ratedLogs.length) * 100)}%` : "—";
    const aiHealth = ctx.getAiSyncStatus();

    const enabledTools = s.aiEnabledTools || {
      web_search: true,
      url_reader: true,
      file_search: true,
      code_sandbox: true,
      calculator: true,
      document_analyzer: true,
      data_analyzer: true,
      database_tools: true
    };
    const toolKeys = [
      "web_search",
      "url_reader",
      "file_search",
      "code_sandbox",
      "calculator",
      "document_analyzer",
      "data_analyzer",
      "database_tools"
    ];
    const agentConfigs = s.aiAgentConfigs || {};
    const agentDefs = (window.VexoraAIPlatform?.AGENTS || [
      { key: "research", ar: "وكيل البحث", en: "Research Agent" },
      { key: "coding", ar: "وكيل البرمجة", en: "Coding Agent" },
      { key: "writing", ar: "وكيل الكتابة", en: "Writing Agent" },
      { key: "education", ar: "وكيل التعليم", en: "Education Agent" },
      { key: "data", ar: "وكيل البيانات", en: "Data Agent" },
      { key: "business", ar: "وكيل الأعمال", en: "Business Agent" },
      { key: "general", ar: "المساعد العام", en: "General Agent" }
    ]).filter((a) => a.key !== "auto");

    const allDocs = window.VexoraAIPlatform?.loadRagDocs ? window.VexoraAIPlatform.loadRagDocs("studio", true) : [];
    const studioDocs = allDocs.filter((d) => d.scope === "studio");

    body.innerHTML = `
      <div class="ent-kpi-grid">
        <div class="glass-card ent-kpi-card"><div class="stat-value" style="font-size:1.18rem;">${escapeHtml(s.aiModel || "gemini-3.8-flash")}</div><div class="stat-label">${escapeHtml(t("entAiModelLabel"))}</div></div>
        <div class="glass-card ent-kpi-card"><div class="stat-value">${studioState.analytics?.aiQueries || logs.length}</div><div class="stat-label">${escapeHtml(t("analyticsAiQueries"))}</div></div>
        <div class="glass-card ent-kpi-card"><div class="stat-value">${totalTokens.toLocaleString()}</div><div class="stat-label">${escapeHtml(t("entAiTokensLabel"))}</div></div>
        <div class="glass-card ent-kpi-card"><div class="stat-value">${satisfactionPct}</div><div class="stat-label">${escapeHtml(t("entAiSatisfactionLabel"))}</div></div>
        <div class="glass-card ent-kpi-card"><div class="stat-value">${errCount}</div><div class="stat-label">${escapeHtml(t("entAiErrorCount"))}</div></div>
        <div class="glass-card ent-kpi-card"><div class="stat-value">${aiHealth.latencyMs || avgLatency || 0}ms</div><div class="stat-label">${escapeHtml(t("entAiLatencyLabel"))}</div></div>
      </div>

      <form id="entAiConfigForm" class="glass-card highlight-border stack-list">
        <div class="row-between" style="flex-wrap:wrap;gap:8px;">
          <div>
            <h2 class="card-title">🤖 ${escapeHtml(t("entNavAi"))}</h2>
            <p class="muted-text" style="margin:2px 0 0;font-size:0.84rem;">${escapeHtml(t("entAiControlDesc"))}</p>
          </div>
          <div class="btn-row" style="gap:8px;">
            <button id="entExportAiCsvBtn" type="button" class="btn btn-outline btn-sm">📥 ${escapeHtml(t("entExportCsv"))}</button>
            <button id="entPingAiBtn" type="button" class="btn btn-outline btn-sm">⚡ ${escapeHtml(t("testAiBtn"))}</button>
          </div>
        </div>

        <label class="checkbox-row glass-card" style="padding:12px;">
          <input id="aiEnabledChk" type="checkbox" ${s.aiEnabled !== false ? "checked" : ""} />
          <span><strong>${escapeHtml(t("entAiMasterToggle"))}</strong></span>
        </label>

        <div class="form-two-col">
          <div class="field">
            <label for="aiModelSel">${escapeHtml(t("entAiModelSelectLabel"))}</label>
            <select id="aiModelSel">
              <option value="gemini-3.8-flash" ${(s.aiModel || "gemini-3.8-flash") === "gemini-3.8-flash" ? "selected" : ""}>gemini-3.8-flash (Primary)</option>
              <option value="gemini-2.5-flash" ${s.aiModel === "gemini-2.5-flash" ? "selected" : ""}>gemini-2.5-flash</option>
              <option value="gemini-2.5-pro" ${s.aiModel === "gemini-2.5-pro" ? "selected" : ""}>gemini-2.5-pro</option>
            </select>
          </div>
          <div class="field">
            <label for="aiRpmInp">${escapeHtml(t("entAiRpmLimitLabel"))}</label>
            <input id="aiRpmInp" type="number" min="1" max="500" value="${Number(s.aiRateLimitRpm || 20)}" />
          </div>
        </div>

        <div class="form-two-col">
          <div class="field">
            <label for="aiPersonaInp">${escapeHtml(t("entAiPersonaLabel"))}</label>
            <input id="aiPersonaInp" value="${escapeHtml(s.aiPersona || "")}" />
          </div>
          <div class="field">
            <label for="aiLangsSel">${escapeHtml(t("entAiLangsLabel"))}</label>
            <select id="aiLangsSel">
              <option value="both" ${s.aiAllowedLangs === "both" ? "selected" : ""}>Arabic + English</option>
              <option value="ar" ${s.aiAllowedLangs === "ar" ? "selected" : ""}>Arabic Only</option>
              <option value="en" ${s.aiAllowedLangs === "en" ? "selected" : ""}>English Only</option>
            </select>
          </div>
        </div>

        <div class="form-two-col">
          <div class="field">
            <label for="aiLimitInp">${escapeHtml(t("entAiDailyLimitLabel"))}</label>
            <input id="aiLimitInp" type="number" min="10" max="50000" value="${Number(s.aiDailyLimit || 500)}" />
          </div>
          <div class="field">
            <label>${escapeHtml(t("entAiKnowledgeSources"))}</label>
            <div class="muted-text" style="padding-top:10px;font-size:0.86rem;">
              ${studioState.services.length} Services • ${studioState.projects.length} Projects • ${(studioState.knowledgeBase || []).length} KB • ${(studioState.faqs || []).length} FAQs • ${studioDocs.length} RAG Docs
            </div>
          </div>
        </div>

        <div class="field">
          <label>${escapeHtml(t("entAiToolsLabel"))}</label>
          <div class="chips-wrap">
            ${toolKeys
              .map(
                (tk) => `
              <label class="tech-chip" style="display:inline-flex;align-items:center;gap:6px;cursor:pointer;">
                <input type="checkbox" data-ai-tool="${tk}" ${enabledTools[tk] !== false ? "checked" : ""} />
                <span>${escapeHtml(tk)}</span>
              </label>
            `
              )
              .join("")}
          </div>
        </div>

        <div class="field">
          <label>${escapeHtml(t("entAiAgentsLabel"))}</label>
          <div class="two-col-grid">
            ${agentDefs
              .map((ag) => {
                const cfg = agentConfigs[ag.key] || { enabled: true, prompt: "" };
                return `
                <div class="glass-card stack-list" style="padding:10px 12px;gap:6px;">
                  <label class="checkbox-row" style="margin:0;">
                    <input type="checkbox" data-agent-enable="${ag.key}" ${cfg.enabled !== false ? "checked" : ""} />
                    <strong>${escapeHtml(ar ? ag.ar : ag.en)}</strong>
                  </label>
                  <input type="text" data-agent-prompt="${ag.key}" value="${escapeHtml(cfg.prompt || "")}" placeholder="${escapeHtml(t("entAiSystemPromptPlaceholder"))}" />
                </div>
              `;
              })
              .join("")}
          </div>
        </div>

        <div class="field">
          <label for="aiSysPromptInp">${escapeHtml(t("entAiSystemPromptLabel"))}</label>
          <textarea id="aiSysPromptInp" rows="3" placeholder="${escapeHtml(t("entAiSystemPromptPlaceholder"))}">${escapeHtml(s.aiSystemPrompt || "")}</textarea>
        </div>

        <button type="submit" class="btn btn-primary btn-full">${escapeHtml(t("saveSettingsBtn"))}</button>
      </form>

      <!-- Studio-Scoped RAG Knowledge Uploader -->
      <div class="glass-card stack-list">
        <h3 class="card-title">📚 ${escapeHtml(t("entAiStudioRagTitle"))}</h3>
        <p class="muted-text" style="margin:0;font-size:0.84rem;">${escapeHtml(t("entAiStudioRagDesc"))}</p>
        <div class="form-two-col">
          <div class="field"><label>${escapeHtml(t("aiRagPasteTitleLabel"))}</label><input id="entRagTitleInp" placeholder="Vexora Service Playbook" /></div>
          <div class="field"><label>${escapeHtml(t("uploadImageLabel").replace("صورة", "ملف"))}</label><input id="entRagFileInp" type="file" accept=".txt,.md,.csv,.json,.pdf,.docx,.xlsx" /></div>
        </div>
        <div class="field"><label>${escapeHtml(t("aiRagPasteTextLabel"))}</label><textarea id="entRagTextInp" rows="3"></textarea></div>
        <button id="entRagSaveBtn" type="button" class="btn btn-outline btn-sm">+ ${escapeHtml(t("aiRagIndexBtn"))}</button>
        <div class="stack-list">
          ${
            studioDocs.length === 0
              ? `<p class="muted-text" style="margin:0;">${escapeHtml(t("aiNoRagDocs"))}</p>`
              : studioDocs
                  .map(
                    (d) => `
                  <div class="glass-card row-between" style="padding:10px 12px;">
                    <div>
                      <strong>${escapeHtml(d.title)}</strong>
                      <div class="muted-text" style="font-size:0.75rem;">${d.chunkCount} chunks • ${escapeHtml(d.embeddingModel || "local")}</div>
                    </div>
                    <button type="button" class="icon-btn danger" data-del-studio-rag="${escapeHtml(d.id)}">🗑️</button>
                  </div>
                `
                  )
                  .join("")
          }
        </div>
      </div>

      <div class="glass-card stack-list">
        <h3 class="card-title">📋 ${escapeHtml(t("entAiLogsTitle"))}</h3>
        ${
          logs.length === 0
            ? `<p class="muted-text" style="margin:0;">${escapeHtml(t("entNoAiLogs"))}</p>`
            : `<div class="ent-table-wrap">
                <table class="ent-table">
                  <thead>
                    <tr>
                      <th>${escapeHtml(t("entColQuery"))}</th>
                      <th>Agent / Mode</th>
                      <th>Lang</th>
                      <th>Source / Status</th>
                      <th>ms</th>
                      <th>${escapeHtml(t("entColDate"))}</th>
                    </tr>
                  </thead>
                  <tbody>
                    ${logs
                      .slice(0, 30)
                      .map(
                        (l) => `
                      <tr>
                        <td>${escapeHtml(String(l.questionPreview || l.question_preview || "").slice(0, 80))}</td>
                        <td><span class="tech-chip">${escapeHtml(l.agent || "general")} • ${escapeHtml(l.mode || "fast")}</span></td>
                        <td>${escapeHtml(l.lang || "ar")}</td>
                        <td><span class="status-pill ${l.status === "error" ? "error" : l.status === "paused" ? "warning" : "cyan"}">${escapeHtml(l.source || "local")} (${escapeHtml(l.status || "ok")})</span></td>
                        <td>${Number(l.latencyMs || l.latency_ms || 0)}</td>
                        <td class="muted-text">${escapeHtml((l.createdAt || l.created_at || "").slice(0, 16).replace("T", " "))}</td>
                      </tr>
                    `
                      )
                      .join("")}
                  </tbody>
                </table>
              </div>`
        }
      </div>
    `;

    document.getElementById("entPingAiBtn").addEventListener("click", async () => {
      const res = await Backend.testAiEndpoint();
      ctx.setAiSyncStatus({ tested: true, ok: res.ok, latencyMs: res.latencyMs || null, mode: res.mode || "", message: res.reason || "" });
      showToast(res.ok ? `${t("aiEndpointOkMsg")} (${res.latencyMs}ms)` : res.reason || t("aiEndpointErrorMsg"));
      renderAiControl(body, ctx, session);
    });

    document.getElementById("entExportAiCsvBtn").addEventListener("click", () => {
      const header = ["question", "agent", "mode", "lang", "source", "status", "tokens", "latency_ms", "created_at"];
      const rows = [
        header.map(csvCell).join(","),
        ...logs.map((l) =>
          [
            l.questionPreview || l.question_preview || "",
            l.agent || "",
            l.mode || "",
            l.lang || "ar",
            l.source || "",
            l.status || "",
            Number(l.tokensEstimated || 0) + Number(l.tokens_input || 0) + Number(l.tokens_output || 0),
            Number(l.latencyMs || l.latency_ms || 0),
            l.createdAt || l.created_at || ""
          ]
            .map(csvCell)
            .join(",")
        )
      ].join("\n");
      downloadTextFile("vexora-ai-telemetry.csv", rows, "text/csv;charset=utf-8");
      showToast(t("entExportedToast"));
    });

    document.getElementById("entRagFileInp")?.addEventListener("change", async (e) => {
      const f = e.target.files?.[0];
      if (!f || !window.VexoraAIPlatform) return;
      try {
        const parsed = await window.VexoraAIPlatform.parseUploadedFile(f);
        await window.VexoraAIPlatform.indexRagDocument("studio", parsed.name, parsed.mimeType, parsed.textContent || "", Backend, true);
        logAudit(ctx, session, "index_studio_rag_doc", "ai_knowledge_docs", parsed.name, {});
        showToast("✓");
        renderAiControl(body, ctx, session);
      } catch (err) {
        showToast(err?.message || "RAG indexing failed");
      }
    });

    document.getElementById("entRagSaveBtn")?.addEventListener("click", async () => {
      if (!window.VexoraAIPlatform) return;
      const title = document.getElementById("entRagTitleInp").value.trim() || "Studio Knowledge Doc";
      const txt = document.getElementById("entRagTextInp").value.trim();
      if (txt.length < 10) {
        showToast(t("validationError"));
        return;
      }
      await window.VexoraAIPlatform.indexRagDocument("studio", title, "text/plain", txt, Backend, true);
      logAudit(ctx, session, "index_studio_rag_doc", "ai_knowledge_docs", title, {});
      showToast("✓");
      renderAiControl(body, ctx, session);
    });

    body.querySelectorAll("[data-del-studio-rag]").forEach((btn) => {
      btn.addEventListener("click", async () => {
        if (!window.VexoraAIPlatform) return;
        const docs = window.VexoraAIPlatform.loadRagDocs("studio", true).filter((d) => d.scope === "studio" && d.id !== btn.dataset.delStudioRag);
        window.VexoraAIPlatform.saveRagDocsForScope("studio", docs);
        await Backend.deleteRagDocumentCloud?.(btn.dataset.delStudioRag, true);
        logAudit(ctx, session, "delete_studio_rag_doc", "ai_knowledge_docs", btn.dataset.delStudioRag, {});
        renderAiControl(body, ctx, session);
      });
    });

    document.getElementById("entAiConfigForm").addEventListener("submit", async (e) => {
      e.preventDefault();
      const nextTools = {};
      body.querySelectorAll("[data-ai-tool]").forEach((chk) => {
        nextTools[chk.dataset.aiTool] = chk.checked;
      });
      const nextAgents = {};
      agentDefs.forEach((ag) => {
        const chk = body.querySelector(`[data-agent-enable="${ag.key}"]`);
        const inp = body.querySelector(`[data-agent-prompt="${ag.key}"]`);
        nextAgents[ag.key] = {
          enabled: chk ? chk.checked : true,
          prompt: inp ? inp.value.trim() : ""
        };
      });

      const updated = {
        ...studioState.settings,
        aiEnabled: document.getElementById("aiEnabledChk").checked,
        aiModel: document.getElementById("aiModelSel").value,
        aiRateLimitRpm: Math.max(1, Number(document.getElementById("aiRpmInp").value || 20)),
        aiPersona: document.getElementById("aiPersonaInp").value.trim(),
        aiAllowedLangs: document.getElementById("aiLangsSel").value,
        aiDailyLimit: Number(document.getElementById("aiLimitInp").value || 500),
        aiSystemPrompt: document.getElementById("aiSysPromptInp").value.trim(),
        aiEnabledTools: nextTools,
        aiAgentConfigs: nextAgents
      };
      if (Backend.isConfigured() && Backend.getStoredAuth()?.access_token) {
        try { await Backend.updateSiteSettings(updated); } catch (err) { showToast(err.message); return; }
      }
      studioState.settings = updated;
      saveState();
      logAudit(ctx, session, "update_ai_settings", "site_settings", "ai", {
        aiEnabled: updated.aiEnabled,
        aiModel: updated.aiModel,
        aiRateLimitRpm: updated.aiRateLimitRpm
      });
      showToast(t("settingsSavedToast"));
      renderAiControl(body, ctx, session);
    });
  }

  /* =========================================================
     7. NOTIFICATIONS & ANNOUNCEMENTS
     ========================================================= */
  function renderNotificationsManager(body, ctx, session) {
    const { t, isArabic, escapeHtml, Backend, studioState, saveState, showToast } = ctx;
    const list = [...(studioState.updates || [])].sort(
      (a, b) => Number(Boolean(b.pinned)) - Number(Boolean(a.pinned)) || new Date(b.createdAt) - new Date(a.createdAt)
    );

    body.innerHTML = `
      <div class="glass-card row-between">
        <div>
          <h2 class="card-title">🔔 ${escapeHtml(t("adminUpdatesTitle"))}</h2>
          <p class="muted-text" style="margin:2px 0 0;font-size:0.84rem;">${escapeHtml(t("adminUpdatesDesc"))}</p>
        </div>
        <button id="entAddNotifBtn" type="button" class="btn btn-primary btn-sm">+ ${escapeHtml(t("addNew"))}</button>
      </div>
      ${list
        .map(
          (u) => `
        <div class="glass-card row-between" style="flex-wrap:wrap;gap:10px;">
          <div style="min-width:220px;flex:1;">
            <div style="display:flex;gap:6px;flex-wrap:wrap;align-items:center;">
              <h3 class="card-title">${u.pinned ? "📌 " : ""}${escapeHtml(isArabic() ? u.titleAr : u.titleEn)}</h3>
              <span class="status-pill cyan">${escapeHtml(u.deliveryStatus || "published")}</span>
              <span class="tech-chip">🎯 ${escapeHtml(u.targetGroup || "all")}${u.targetEmail ? `: ${escapeHtml(u.targetEmail)}` : ""}</span>
            </div>
            <p class="muted-text" style="margin:4px 0 0;">${escapeHtml(u.kind)} • ${(u.scheduledAt || u.createdAt || "").slice(0, 16).replace("T", " ")}</p>
          </div>
          <div style="display:flex;gap:4px;">
            <button type="button" class="icon-btn" data-edit-upd="${escapeHtml(u.id)}">✏️</button>
            <button type="button" class="icon-btn danger" data-del-upd="${escapeHtml(u.id)}">🗑️</button>
          </div>
        </div>
      `
        )
        .join("")}
    `;

    document.getElementById("entAddNotifBtn").addEventListener("click", () => ctx.openUpdateEditor(null));
    body.querySelectorAll("[data-edit-upd]").forEach((b) =>
      b.addEventListener("click", () => ctx.openUpdateEditor((studioState.updates || []).find((x) => x.id === b.dataset.editUpd)))
    );
    body.querySelectorAll("[data-del-upd]").forEach((b) =>
      b.addEventListener("click", () => {
        const id = b.dataset.delUpd;
        openConfirmDialog(ctx, t("delete"), t("entDeleteConfirmMsg"), async () => {
          if (Backend.isConfigured() && Backend.getStoredAuth()?.access_token) {
            try { await Backend.deleteUpdateItem(id); } catch (err) { showToast(err.message); return; }
          }
          studioState.updates = (studioState.updates || []).filter((x) => x.id !== id);
          saveState();
          logAudit(ctx, session, "delete_notification", "updates_feed", id, {});
          renderNotificationsManager(body, ctx, session);
        });
      })
    );
  }

  /* =========================================================
     8. SUPPORT & CONTACT CENTER
     ========================================================= */
  function normalizeMsgStatus(raw) {
    if (raw === "replied") return "resolved";
    return ["new", "in_progress", "resolved", "closed"].includes(raw) ? raw : "new";
  }

  function renderSupportCenter(body, ctx, session) {
    const { t, isArabic, escapeHtml, Backend, studioState, saveState, showToast } = ctx;
    const sq = uiState.supportSearch.trim().toLowerCase();
    const msgs = (studioState.messages || [])
      .map((m) => ({ ...m, status: normalizeMsgStatus(m.status), priority: m.priority || "medium", ticketType: m.ticketType || (m.serviceRequested === "Client Support" ? "support" : "contact") }))
      .filter((m) => uiState.supportStatus === "all" || m.status === uiState.supportStatus)
      .filter((m) => uiState.supportType === "all" || m.ticketType === uiState.supportType)
      .filter((m) => uiState.supportPriority === "all" || m.priority === uiState.supportPriority)
      .filter((m) => !sq || `${m.senderName} ${m.email} ${m.subject} ${m.message}`.toLowerCase().includes(sq));

    const teamNames = (studioState.team || []).map((m) => isArabic() ? m.nameAr : m.nameEn);

    body.innerHTML = `
      <div class="glass-card stack-list">
        <div class="row-between">
          <h2 class="card-title">🎫 ${escapeHtml(t("entNavSupport"))} (${msgs.length})</h2>
          ${
            (studioState.messages || []).length > 0
              ? `<button id="entExportTicketsBtn" type="button" class="btn btn-outline btn-sm">📥 ${escapeHtml(t("entExportCsv"))}</button>`
              : ""
          }
        </div>
        <div class="form-two-col">
          <input id="entSupSearch" type="search" value="${escapeHtml(uiState.supportSearch)}" placeholder="${escapeHtml(t("msgSearchPlaceholder"))}" />
          <div style="display:grid;grid-template-columns:repeat(3,1fr);gap:8px;">
            <select id="entSupStatus">
              <option value="all">${escapeHtml(t("statusAll"))}</option>
              <option value="new" ${uiState.supportStatus === "new" ? "selected" : ""}>New</option>
              <option value="in_progress" ${uiState.supportStatus === "in_progress" ? "selected" : ""}>In Progress</option>
              <option value="resolved" ${uiState.supportStatus === "resolved" ? "selected" : ""}>Resolved</option>
              <option value="closed" ${uiState.supportStatus === "closed" ? "selected" : ""}>Closed</option>
            </select>
            <select id="entSupType">
              <option value="all">${escapeHtml(t("projectTypeAll"))}</option>
              <option value="contact" ${uiState.supportType === "contact" ? "selected" : ""}>Contact</option>
              <option value="support" ${uiState.supportType === "support" ? "selected" : ""}>Support</option>
            </select>
            <select id="entSupPrio">
              <option value="all">${escapeHtml(t("entAllPriorities"))}</option>
              <option value="urgent" ${uiState.supportPriority === "urgent" ? "selected" : ""}>Urgent</option>
              <option value="high" ${uiState.supportPriority === "high" ? "selected" : ""}>High</option>
              <option value="medium" ${uiState.supportPriority === "medium" ? "selected" : ""}>Medium</option>
              <option value="low" ${uiState.supportPriority === "low" ? "selected" : ""}>Low</option>
            </select>
          </div>
        </div>
      </div>

      ${
        msgs.length === 0
          ? `<div class="glass-card"><p class="muted-text" style="margin:0;">${escapeHtml(t("noReceivedMessages"))}</p></div>`
          : msgs
              .map((m) => {
                const mailtoHref = `mailto:${encodeURIComponent(m.email)}?subject=${encodeURIComponent(`Re: ${m.subject}`)}`;
                const stCls = m.status === "resolved" || m.status === "closed" ? "success" : m.status === "in_progress" ? "cyan" : "warning";
                const prCls = m.priority === "urgent" || m.priority === "high" ? "error" : "cyan";
                return `
                  <div class="glass-card stack-list ${m.status === "new" ? "highlight-border" : ""}">
                    <div class="row-between">
                      <div>
                        <h3 class="card-title">${escapeHtml(m.subject)}</h3>
                        <div style="color:var(--neon-cyan);font-size:0.84rem;">${escapeHtml(m.senderName)} • ${escapeHtml(m.email)}</div>
                      </div>
                      <div style="display:flex;gap:6px;flex-wrap:wrap;">
                        <span class="status-pill ${prCls}">${escapeHtml(m.priority)}</span>
                        <span class="status-pill ${stCls}"><span class="pill-dot"></span>${escapeHtml(m.status)}</span>
                      </div>
                    </div>
                    <p class="muted-text" style="margin:0;white-space:pre-wrap;">${escapeHtml(m.message)}</p>
                    ${m.assignedTo ? `<div style="font-size:0.8rem;color:var(--neon-cyan);">👤 ${escapeHtml(t("entAssignedTo"))}: ${escapeHtml(m.assignedTo)}</div>` : ""}
                    <div class="btn-row">
                      <button type="button" class="btn btn-primary btn-sm" data-manage-ticket="${escapeHtml(m.id)}">🛠️ ${escapeHtml(t("entManageTicketBtn"))}</button>
                      <a href="${mailtoHref}" class="btn btn-outline btn-sm">✉️ ${escapeHtml(t("replyToClient"))}</a>
                      <button type="button" class="icon-btn danger" data-del-ticket="${escapeHtml(m.id)}" aria-label="${escapeHtml(t("delete"))}">🗑️</button>
                    </div>
                  </div>
                `;
              })
              .join("")
      }
    `;

    document.getElementById("entSupSearch").addEventListener("input", (e) => {
      uiState.supportSearch = e.target.value;
      renderSupportCenter(body, ctx, session);
    });
    document.getElementById("entSupStatus").addEventListener("change", (e) => {
      uiState.supportStatus = e.target.value;
      renderSupportCenter(body, ctx, session);
    });
    document.getElementById("entSupType").addEventListener("change", (e) => {
      uiState.supportType = e.target.value;
      renderSupportCenter(body, ctx, session);
    });
    document.getElementById("entSupPrio").addEventListener("change", (e) => {
      uiState.supportPriority = e.target.value;
      renderSupportCenter(body, ctx, session);
    });

    const expBtn = document.getElementById("entExportTicketsBtn");
    if (expBtn) {
      expBtn.addEventListener("click", () => {
        const headers = ["ID", "Type", "Status", "Priority", "Assigned", "Sender", "Email", "Subject", "Created"];
        const rows = msgs.map((m) => [m.id, m.ticketType, m.status, m.priority, m.assignedTo || "", m.senderName, m.email, m.subject, m.createdAt].map(csvCell).join(","));
        downloadTextFile(`vexora-tickets-${new Date().toISOString().slice(0, 10)}.csv`, [headers.join(","), ...rows].join("\n"), "text/csv;charset=utf-8");
        showToast(t("entExportedToast"));
      });
    }

    body.querySelectorAll("[data-manage-ticket]").forEach((b) =>
      b.addEventListener("click", () => {
        const m = studioState.messages.find((x) => x.id === b.dataset.manageTicket);
        if (!m) return;
        const normSt = normalizeMsgStatus(m.status);
        ctx.openModal(
          m.subject,
          `
          <div style="color:var(--neon-cyan);font-size:0.88rem;">${escapeHtml(m.senderName)} • ${escapeHtml(m.email)}</div>
          <p class="muted-text" style="margin:0;white-space:pre-wrap;">${escapeHtml(m.message)}</p>
          <form id="entTicketForm" class="stack-list">
            <div class="form-two-col">
              <div class="field">
                <label>${escapeHtml(t("statusLabel"))}</label>
                <select id="tkStatus">
                  <option value="new" ${normSt === "new" ? "selected" : ""}>New</option>
                  <option value="in_progress" ${normSt === "in_progress" ? "selected" : ""}>In Progress</option>
                  <option value="resolved" ${normSt === "resolved" ? "selected" : ""}>Resolved</option>
                  <option value="closed" ${normSt === "closed" ? "selected" : ""}>Closed</option>
                </select>
              </div>
              <div class="field">
                <label>${escapeHtml(t("entPriorityLabel"))}</label>
                <select id="tkPriority">
                  <option value="low" ${m.priority === "low" ? "selected" : ""}>Low</option>
                  <option value="medium" ${(m.priority || "medium") === "medium" ? "selected" : ""}>Medium</option>
                  <option value="high" ${m.priority === "high" ? "selected" : ""}>High</option>
                  <option value="urgent" ${m.priority === "urgent" ? "selected" : ""}>Urgent</option>
                </select>
              </div>
            </div>
            <div class="field">
              <label>${escapeHtml(t("entAssignedTo"))}</label>
              <select id="tkAssignee">
                <option value="">—</option>
                ${teamNames.map((nm) => `<option value="${escapeHtml(nm)}" ${m.assignedTo === nm ? "selected" : ""}>${escapeHtml(nm)}</option>`).join("")}
              </select>
            </div>
            <div class="field">
              <label>${escapeHtml(t("clientReplyLabel"))}</label>
              <textarea id="tkReply" rows="3">${escapeHtml(m.adminReply || "")}</textarea>
            </div>
            <div class="field">
              <label>${escapeHtml(t("entInternalNotesLabel"))}</label>
              <textarea id="tkInternal" rows="2">${escapeHtml(m.internalNote || "")}</textarea>
            </div>
            <button type="submit" class="btn btn-primary btn-full">${escapeHtml(t("save"))}</button>
          </form>
        `
        );

        document.getElementById("entTicketForm").addEventListener("submit", async (e) => {
          e.preventDefault();
          const newStatus = document.getElementById("tkStatus").value;
          const newPrio = document.getElementById("tkPriority").value;
          const newAssignee = document.getElementById("tkAssignee").value;
          const newReply = document.getElementById("tkReply").value.trim();
          const newInternal = document.getElementById("tkInternal").value.trim();
          const hist = Array.isArray(m.history) ? [...m.history] : [];
          hist.unshift({ at: new Date().toISOString(), actor: session.email, action: `status:${newStatus}, priority:${newPrio}` });

          if (Backend.isConfigured() && Backend.getStoredAuth()?.access_token) {
            try {
              await Backend.updateMessageStatus(m.id, newStatus, newReply, {
                priority: newPrio,
                assignedTo: newAssignee,
                internalNote: newInternal,
                history: hist
              });
            } catch (err) {
              showToast(err.message);
              return;
            }
          }
          m.status = newStatus;
          m.priority = newPrio;
          m.assignedTo = newAssignee;
          m.adminReply = newReply;
          m.internalNote = newInternal;
          m.history = hist;
          saveState();
          logAudit(ctx, session, "update_support_ticket", "contact_messages", m.id, { status: newStatus, priority: newPrio });
          ctx.closeModal();
          showToast("✓");
          renderSupportCenter(body, ctx, session);
        });
      })
    );

    body.querySelectorAll("[data-del-ticket]").forEach((b) =>
      b.addEventListener("click", () => {
        const id = b.dataset.delTicket;
        openConfirmDialog(ctx, t("delete"), t("entDeleteConfirmMsg"), async () => {
          if (Backend.isConfigured() && Backend.getStoredAuth()?.access_token) {
            try { await Backend.deleteMessage(id); } catch (err) { showToast(err.message); return; }
          }
          studioState.messages = studioState.messages.filter((x) => x.id !== id);
          saveState();
          logAudit(ctx, session, "delete_ticket", "contact_messages", id, {});
          renderSupportCenter(body, ctx, session);
        });
      })
    );
  }

  /* =========================================================
     9. WEBSITE UPDATES & VERSION CONTROL
     ========================================================= */
  function renderReleasesManager(body, ctx, session) {
    const { t, isArabic, escapeHtml, Backend, studioState, saveState, showToast } = ctx;
    const releases = studioState.releases || [];

    body.innerHTML = `
      <div class="glass-card highlight-border stack-list">
        <div class="row-between">
          <div>
            <h2 class="card-title">📦 ${escapeHtml(t("entNavReleases"))}</h2>
            <p class="muted-text" style="margin:2px 0 0;font-size:0.84rem;">${escapeHtml(t("entReleasesDesc"))}</p>
          </div>
          <button id="entAddRelBtn" type="button" class="btn btn-primary btn-sm">+ ${escapeHtml(t("addNew"))}</button>
        </div>
        <div class="status-pill cyan">ℹ️ ${escapeHtml(t("entReleasesHonestNote"))}</div>
      </div>

      ${releases
        .map((rel) => {
          const stCls = rel.status === "released" ? "success" : rel.status === "rolled_back" ? "error" : "warning";
          return `
            <div class="glass-card stack-list">
              <div class="row-between">
                <div>
                  <div style="display:flex;align-items:center;gap:8px;flex-wrap:wrap;">
                    <span class="tech-chip" style="color:var(--neon-cyan);font-weight:700;">${escapeHtml(rel.version)}</span>
                    <h3 class="card-title">${escapeHtml(isArabic() ? rel.titleAr : rel.titleEn)}</h3>
                  </div>
                  <div class="muted-text" style="font-size:0.8rem;margin-top:4px;">${escapeHtml(rel.deployTarget)} • ${escapeHtml(rel.releaseDate)}</div>
                </div>
                <span class="status-pill ${stCls}"><span class="pill-dot"></span>${escapeHtml(rel.status)}</span>
              </div>
              <p class="muted-text" style="margin:0;white-space:pre-wrap;">${escapeHtml(isArabic() ? rel.descriptionAr : rel.descriptionEn)}</p>
              ${rel.changelog ? `<pre class="ent-changelog-pre">${escapeHtml(rel.changelog)}</pre>` : ""}
              <div class="btn-row">
                <button type="button" class="btn btn-outline btn-sm" data-edit-rel="${escapeHtml(rel.id)}">✏️ ${escapeHtml(t("edit"))}</button>
                ${
                  Backend.isConfigured() && Backend.getStoredAuth()?.access_token
                    ? `<button type="button" class="btn btn-outline btn-sm" data-deploy-rel="${escapeHtml(rel.id)}">🚀 ${escapeHtml(t("entTriggerWebhookBtn"))}</button>`
                    : ""
                }
                <button type="button" class="icon-btn danger" data-del-rel="${escapeHtml(rel.id)}" aria-label="${escapeHtml(t("delete"))}">🗑️</button>
              </div>
            </div>
          `;
        })
        .join("")}
    `;

    const openRelEditor = (initial) => {
      const item = initial || {
        id: `rel_${Date.now()}`,
        version: "v2.6.1",
        titleEn: "",
        titleAr: "",
        descriptionEn: "",
        descriptionAr: "",
        changelog: "",
        releaseDate: new Date().toISOString().slice(0, 10),
        status: "released",
        deployTarget: "github_pages",
        createdAt: new Date().toISOString()
      };
      ctx.openModal(
        t("entNavReleases"),
        `
        <form id="relEditorForm" class="stack-list">
          <div class="form-two-col">
            <div class="field"><label>Version</label><input id="relVer" value="${escapeHtml(item.version)}" required /></div>
            <div class="field"><label>Release Date</label><input id="relDate" type="date" value="${escapeHtml(item.releaseDate)}" required /></div>
          </div>
          <div class="form-two-col">
            <div class="field"><label>Status</label>
              <select id="relStat">
                <option value="planned" ${item.status === "planned" ? "selected" : ""}>Planned</option>
                <option value="released" ${item.status === "released" ? "selected" : ""}>Released</option>
                <option value="rolled_back" ${item.status === "rolled_back" ? "selected" : ""}>Rolled Back</option>
              </select>
            </div>
            <div class="field"><label>Deploy Target</label>
              <select id="relTarget">
                <option value="github_pages" ${item.deployTarget === "github_pages" ? "selected" : ""}>GitHub Pages (Web)</option>
                <option value="android_apk" ${item.deployTarget === "android_apk" ? "selected" : ""}>Android APK</option>
                <option value="edge_functions" ${item.deployTarget === "edge_functions" ? "selected" : ""}>Supabase Edge Functions</option>
              </select>
            </div>
          </div>
          <div class="field"><label>Title (EN)</label><input id="relTitleEn" value="${escapeHtml(item.titleEn)}" required /></div>
          <div class="field"><label>Title (AR)</label><input id="relTitleAr" value="${escapeHtml(item.titleAr)}" required /></div>
          <div class="field"><label>Description (EN)</label><textarea id="relDescEn" rows="2">${escapeHtml(item.descriptionEn)}</textarea></div>
          <div class="field"><label>Description (AR)</label><textarea id="relDescAr" rows="2">${escapeHtml(item.descriptionAr)}</textarea></div>
          <div class="field"><label>Changelog</label><textarea id="relLog" rows="3">${escapeHtml(item.changelog || "")}</textarea></div>
          <button type="submit" class="btn btn-primary btn-full">${escapeHtml(t("save"))}</button>
        </form>
      `
      );
      document.getElementById("relEditorForm").addEventListener("submit", async (e) => {
        e.preventDefault();
        const updated = {
          ...item,
          version: document.getElementById("relVer").value.trim(),
          releaseDate: document.getElementById("relDate").value,
          status: document.getElementById("relStat").value,
          deployTarget: document.getElementById("relTarget").value,
          titleEn: document.getElementById("relTitleEn").value.trim(),
          titleAr: document.getElementById("relTitleAr").value.trim(),
          descriptionEn: document.getElementById("relDescEn").value.trim(),
          descriptionAr: document.getElementById("relDescAr").value.trim(),
          changelog: document.getElementById("relLog").value.trim()
        };
        if (Backend.isConfigured() && Backend.getStoredAuth()?.access_token) {
          try { await Backend.upsertRelease(updated); } catch (err) { showToast(err.message); return; }
        }
        if (!Array.isArray(studioState.releases)) studioState.releases = [];
        const idx = studioState.releases.findIndex((x) => x.id === item.id);
        if (idx >= 0) studioState.releases[idx] = updated;
        else studioState.releases.unshift(updated);
        saveState();
        logAudit(ctx, session, "upsert_release", "site_releases", updated.id, { version: updated.version, status: updated.status });
        ctx.closeModal();
        renderReleasesManager(body, ctx, session);
      });
    };

    document.getElementById("entAddRelBtn").addEventListener("click", () => openRelEditor(null));
    body.querySelectorAll("[data-edit-rel]").forEach((b) =>
      b.addEventListener("click", () => openRelEditor((studioState.releases || []).find((x) => x.id === b.dataset.editRel)))
    );
    body.querySelectorAll("[data-deploy-rel]").forEach((b) =>
      b.addEventListener("click", async () => {
        try {
          const res = await Backend.callAdminGateway("trigger_release_webhook", { releaseId: b.dataset.deployRel });
          logAudit(ctx, session, "trigger_release_webhook", "site_releases", b.dataset.deployRel, res);
          showToast(res.triggered ? "✓ Deployment webhook triggered" : res.message || "Recorded");
        } catch (err) {
          showToast(err.message);
        }
      })
    );
    body.querySelectorAll("[data-del-rel]").forEach((b) =>
      b.addEventListener("click", () => {
        const id = b.dataset.delRel;
        openConfirmDialog(ctx, t("delete"), t("entDeleteConfirmMsg"), async () => {
          if (Backend.isConfigured() && Backend.getStoredAuth()?.access_token) {
            try { await Backend.deleteRelease(id); } catch (err) { showToast(err.message); return; }
          }
          studioState.releases = (studioState.releases || []).filter((x) => x.id !== id);
          saveState();
          logAudit(ctx, session, "delete_release", "site_releases", id, {});
          renderReleasesManager(body, ctx, session);
        });
      })
    );
  }

  /* =========================================================
     10. DATABASE MANAGEMENT
     ========================================================= */
  function renderDatabaseManager(body, ctx, session) {
    const { t, escapeHtml, Backend, studioState, saveState, showToast } = ctx;
    const isOwner = session.role === "owner";

    const localCounts = {
      services: (studioState.services || []).length,
      projects: (studioState.projects || []).length,
      team_members: (studioState.team || []).length,
      knowledge_base: (studioState.knowledgeBase || []).length,
      faqs: (studioState.faqs || []).length,
      updates_feed: (studioState.updates || []).length,
      site_releases: (studioState.releases || []).length,
      contact_messages: (studioState.messages || []).length,
      project_requests: (studioState.projectRequests || []).length,
      analytics_events: (studioState.analytics?.events || []).length,
      ai_logs: (studioState.aiLogs || []).length,
      login_logs: (studioState.loginLogs || []).length,
      audit_logs: (studioState.auditLogs || []).length
    };
    const counts = uiState.cloudDbHealth?.tables || localCounts;

    body.innerHTML = `
      <div class="glass-card highlight-border stack-list">
        <div class="row-between">
          <div>
            <h2 class="card-title">🗄️ ${escapeHtml(t("entNavDatabase"))}</h2>
            <p class="muted-text" style="margin:2px 0 0;font-size:0.84rem;">${escapeHtml(t("entDbDesc"))}</p>
          </div>
          <div class="btn-row">
            <button id="entDbCheckBtn" type="button" class="btn btn-primary btn-sm">🔌 ${escapeHtml(t("testDbBtn"))}</button>
            <button id="entDbBackupBtn" type="button" class="btn btn-outline btn-sm">💾 ${escapeHtml(t("entBackupJsonBtn"))}</button>
          </div>
        </div>
        <div class="chips-wrap">
          <span class="status-pill ${Backend.isConfigured() ? "success" : "cyan"}">
            ${escapeHtml(Backend.isConfigured() ? "PostgreSQL (Supabase + RLS)" : "Browser LocalStorage Sandbox")}
          </span>
        </div>
      </div>

      <div class="glass-card stack-list">
        <h3 class="card-title">📊 ${escapeHtml(t("entDbTablesTitle"))}</h3>
        <div class="ent-table-wrap">
          <table class="ent-table">
            <thead>
              <tr>
                <th>Table</th>
                <th>Rows</th>
                <th>RLS Policy</th>
              </tr>
            </thead>
            <tbody>
              ${Object.entries(counts)
                .map(
                  ([tbl, cnt]) => `
                <tr>
                  <td><code>${escapeHtml(tbl)}</code></td>
                  <td><strong>${Number(cnt || 0)}</strong></td>
                  <td><span class="status-pill success">Active</span></td>
                </tr>
              `
                )
                .join("")}
            </tbody>
          </table>
        </div>
      </div>

      ${
        isOwner
          ? `<div class="glass-card stack-list" style="border-color:rgba(244,63,94,0.4);">
              <h3 class="card-title" style="color:var(--error);">⚠️ ${escapeHtml(t("entOwnerOnlyZone"))}</h3>
              <p class="muted-text" style="margin:0;">${escapeHtml(t("entPurgeTelemetryDesc"))}</p>
              <div class="btn-row">
                <button id="entPurgeAnalyticsBtn" type="button" class="btn btn-danger btn-sm">🗑️ ${escapeHtml(t("entPurgeAnalyticsBtn"))}</button>
                <button id="entPurgeAiLogsBtn" type="button" class="btn btn-danger btn-sm">🗑️ ${escapeHtml(t("entPurgeAiLogsBtn"))}</button>
              </div>
            </div>`
          : ""
      }
    `;

    document.getElementById("entDbCheckBtn").addEventListener("click", async () => {
      const res = await Backend.testConnection();
      ctx.setDbSyncStatus({ tested: true, ok: res.ok, latencyMs: res.latencyMs || null, message: res.reason || "" });
      if (Backend.isConfigured() && Backend.getStoredAuth()?.access_token) {
        try { uiState.cloudDbHealth = await Backend.callAdminGateway("get_db_health"); } catch {}
      }
      showToast(res.ok ? `${t("dbConnectedMsg")} (${res.latencyMs}ms)` : res.reason || t("dbNotConfiguredMsg"));
      renderDatabaseManager(body, ctx, session);
    });

    document.getElementById("entDbBackupBtn").addEventListener("click", () => {
      const snapshot = {
        exportedAt: new Date().toISOString(),
        exportedBy: session.email,
        data: { ...studioState }
      };
      downloadTextFile(`vexora-backup-${new Date().toISOString().slice(0, 10)}.json`, JSON.stringify(snapshot, null, 2), "application/json;charset=utf-8");
      logAudit(ctx, session, "export_backup_json", "database", "snapshot", {});
      showToast(t("entExportedToast"));
    });

    if (isOwner) {
      document.getElementById("entPurgeAnalyticsBtn").addEventListener("click", () => {
        openConfirmDialog(ctx, t("entOwnerOnlyZone"), t("entDeleteConfirmMsg"), async () => {
          if (Backend.isConfigured() && Backend.getStoredAuth()?.access_token) {
            try { await Backend.callAdminGateway("purge_telemetry_logs", { target: "analytics_events" }); } catch (err) { showToast(err.message); return; }
          }
          studioState.analytics = { totalViews: 0, aiQueries: 0, apkDownloads: 0, byRoute: {}, bySource: {}, events: [] };
          saveState();
          logAudit(ctx, session, "purge_telemetry", "analytics_events", "all", {});
          renderDatabaseManager(body, ctx, session);
        });
      });

      document.getElementById("entPurgeAiLogsBtn").addEventListener("click", () => {
        openConfirmDialog(ctx, t("entOwnerOnlyZone"), t("entDeleteConfirmMsg"), async () => {
          if (Backend.isConfigured() && Backend.getStoredAuth()?.access_token) {
            try { await Backend.callAdminGateway("purge_telemetry_logs", { target: "ai_logs" }); } catch (err) { showToast(err.message); return; }
          }
          studioState.aiLogs = [];
          saveState();
          logAudit(ctx, session, "purge_telemetry", "ai_logs", "all", {});
          renderDatabaseManager(body, ctx, session);
        });
      });
    }
  }

  /* =========================================================
     11. ANALYTICS & REPORTS
     ========================================================= */
  function renderAnalyticsSection(body, ctx, session) {
    const { t, escapeHtml, studioState, showToast } = ctx;
    const remote = ctx.getRemoteAnalyticsCache();
    const localA = studioState.analytics || { totalViews: 0, aiQueries: 0, apkDownloads: 0, byRoute: {}, bySource: {} };
    const summary = remote || {
      totalViews: localA.totalViews || 0,
      totalAi: localA.aiQueries || 0,
      totalApk: localA.apkDownloads || 0,
      totalReq: (studioState.projectRequests || []).length,
      byRoute: localA.byRoute || {},
      bySource: localA.bySource || {}
    };

    const routeEntries = Object.entries(summary.byRoute || {}).sort((a, b) => b[1] - a[1]);
    const maxRoute = Math.max(1, ...routeEntries.map(([, c]) => Number(c || 0)));
    const sourceEntries = Object.entries(summary.bySource || {}).sort((a, b) => b[1] - a[1]);

    body.innerHTML = `
      <div class="glass-card highlight-border stack-list">
        <div class="row-between">
          <div>
            <h2 class="card-title">📈 ${escapeHtml(t("adminAnalyticsTitle"))}</h2>
            <p class="muted-text" style="margin:2px 0 0;font-size:0.84rem;">${escapeHtml(t("adminAnalyticsDesc"))}</p>
          </div>
          <div class="btn-row">
            <button id="entAnalyticsCsvBtn" type="button" class="btn btn-outline btn-sm">📥 ${escapeHtml(t("entExportCsv"))}</button>
            <button id="entAnalyticsPdfBtn" type="button" class="btn btn-outline btn-sm">🖨️ ${escapeHtml(t("entExportPdf"))}</button>
          </div>
        </div>
        <div class="ent-kpi-grid">
          <div class="glass-card ent-kpi-card"><div class="stat-value">${summary.totalViews}</div><div class="stat-label">${escapeHtml(t("analyticsTotalViews"))}</div></div>
          <div class="glass-card ent-kpi-card"><div class="stat-value">${summary.totalAi}</div><div class="stat-label">${escapeHtml(t("analyticsAiQueries"))}</div></div>
          <div class="glass-card ent-kpi-card"><div class="stat-value">${summary.totalApk}</div><div class="stat-label">${escapeHtml(t("analyticsApkClicks"))}</div></div>
          <div class="glass-card ent-kpi-card"><div class="stat-value">${summary.totalReq}</div><div class="stat-label">${escapeHtml(t("analyticsRequestsCount"))}</div></div>
        </div>
      </div>

      <div class="two-col-grid">
        <div class="glass-card stack-list">
          <h3 class="card-title">${escapeHtml(t("analyticsTopRoutes"))}</h3>
          ${
            routeEntries.length === 0
              ? `<p class="muted-text" style="margin:0;">0</p>`
              : routeEntries
                  .map(([rk, cnt]) => {
                    const pct = Math.max(6, Math.round((Number(cnt) / maxRoute) * 100));
                    return `
                      <div class="analytics-bar-row">
                        <div class="row-between" style="font-size:0.84rem;"><strong style="color:var(--neon-cyan);">#${escapeHtml(rk)}</strong><span>${Number(cnt)}</span></div>
                        <div class="analytics-bar-track"><div class="analytics-bar-fill" style="width:${pct}%"></div></div>
                      </div>
                    `;
                  })
                  .join("")
          }
        </div>

        <div class="glass-card stack-list">
          <h3 class="card-title">${escapeHtml(t("entTrafficSourcesTitle"))}</h3>
          ${
            sourceEntries.length === 0
              ? `<p class="muted-text" style="margin:0;">Direct (0)</p>`
              : sourceEntries
                  .map(([src, cnt]) => `<div class="row-between" style="font-size:0.86rem;"><span>${escapeHtml(src)}</span><strong style="color:var(--neon-cyan);">${Number(cnt)}</strong></div>`)
                  .join("")
          }
        </div>
      </div>
    `;

    document.getElementById("entAnalyticsCsvBtn").addEventListener("click", () => {
      const lines = ["Metric,Value", `Total Page Views,${summary.totalViews}`, `Vexora AI Queries,${summary.totalAi}`, `APK Downloads,${summary.totalApk}`, `Project Requests,${summary.totalReq}`];
      routeEntries.forEach(([rk, cnt]) => lines.push(`${csvCell("Route #" + rk)},${cnt}`));
      sourceEntries.forEach(([src, cnt]) => lines.push(`${csvCell("Source " + src)},${cnt}`));
      downloadTextFile(`vexora-analytics-${new Date().toISOString().slice(0, 10)}.csv`, lines.join("\n"), "text/csv;charset=utf-8");
      logAudit(ctx, session, "export_analytics_csv", "analytics", "report", {});
      showToast(t("entExportedToast"));
    });

    document.getElementById("entAnalyticsPdfBtn").addEventListener("click", () => {
      if (typeof window.print === "function") window.print();
    });
  }

  /* =========================================================
     12. SECURITY, RBAC & AUDIT LOGS
     ========================================================= */
  function renderSecuritySection(body, ctx, session) {
    const { t, escapeHtml, Backend, studioState, showToast } = ctx;
    const isOwner = session.role === "owner";
    const ownerMeta = getLocalOwnerMeta();
    const staffList = Backend.isConfigured()
      ? (uiState.cloudMetrics?.admins || [])
      : [
          ...(ownerMeta ? [{ user_id: "local_owner", full_name: ownerMeta.fullName, email: ownerMeta.email, role: "owner", is_active: true }] : []),
          ...getLocalStaffList().map((s) => ({ user_id: s.userId, full_name: s.fullName, email: s.email, role: s.role, is_active: s.isActive }))
        ];

    const loginLogs = studioState.loginLogs || [];
    const auditLogs = (uiState.cloudMetrics?.recentAuditLogs || studioState.auditLogs || []).slice(0, 30);

    body.innerHTML = `
      <div class="glass-card highlight-border stack-list">
        <div class="row-between">
          <div>
            <h2 class="card-title">🔐 ${escapeHtml(t("entNavSecurity"))}</h2>
            <p class="muted-text" style="margin:2px 0 0;font-size:0.84rem;">${escapeHtml(t("entSecurityDesc"))}</p>
          </div>
          <button id="entAddAdminBtn" type="button" class="btn btn-primary btn-sm">+ ${escapeHtml(t("entAddAdminBtn"))}</button>
        </div>

        <div class="ent-table-wrap">
          <table class="ent-table">
            <thead>
              <tr>
                <th>${escapeHtml(t("clientFullNameLabel"))}</th>
                <th>${escapeHtml(t("clientEmailLabel"))}</th>
                <th>${escapeHtml(t("entRoleLabel"))}</th>
                <th>${escapeHtml(t("statusLabel"))}</th>
                <th>${escapeHtml(t("entColActions"))}</th>
              </tr>
            </thead>
            <tbody>
              ${staffList
                .map((adm) => {
                  const active = adm.is_active !== false;
                  const canEditTarget = isOwner || (adm.role !== "owner" && adm.role !== "super_admin");
                  return `
                    <tr>
                      <td>${escapeHtml(adm.full_name || adm.email || "")}</td>
                      <td>${escapeHtml(adm.email || "")}</td>
                      <td><span class="status-pill ${roleBadgeClass(adm.role)}">${escapeHtml(roleLabel(adm.role, t))}</span></td>
                      <td><span class="status-pill ${active ? "success" : "error"}">${escapeHtml(active ? t("entActiveLabel") : t("entDisabledLabel"))}</span></td>
                      <td>
                        ${
                          canEditTarget && adm.user_id !== "local_owner"
                            ? `<button type="button" class="btn btn-outline btn-sm" data-adm-toggle="${escapeHtml(adm.user_id)}" data-adm-active="${active ? "1" : "0"}" data-adm-role="${escapeHtml(adm.role)}" data-adm-email="${escapeHtml(adm.email)}" data-adm-name="${escapeHtml(adm.full_name)}">${escapeHtml(active ? t("entDisableBtn") : t("entEnableBtn"))}</button>`
                            : `<span class="muted-text">—</span>`
                        }
                      </td>
                    </tr>
                  `;
                })
                .join("")}
            </tbody>
          </table>
        </div>
      </div>

      <div class="glass-card stack-list">
        <h3 class="card-title">🔑 ${escapeHtml(t("entLoginLogsTitle"))}</h3>
        ${
          loginLogs.length === 0
            ? `<p class="muted-text" style="margin:0;">${escapeHtml(t("entNoAuditLogs"))}</p>`
            : `<div class="ent-table-wrap">
                <table class="ent-table">
                  <thead><tr><th>Email</th><th>Role</th><th>Status</th><th>Reason</th><th>${escapeHtml(t("entColDate"))}</th></tr></thead>
                  <tbody>
                    ${loginLogs
                      .slice(0, 20)
                      .map(
                        (l) => `
                      <tr>
                        <td>${escapeHtml(l.email)}</td>
                        <td>${escapeHtml(l.role || "—")}</td>
                        <td><span class="status-pill ${l.status === "success" ? "success" : l.status === "blocked" ? "warning" : "error"}">${escapeHtml(l.status)}</span></td>
                        <td class="muted-text">${escapeHtml(l.reason || "")}</td>
                        <td class="muted-text">${escapeHtml((l.createdAt || "").slice(0, 16).replace("T", " "))}</td>
                      </tr>
                    `
                      )
                      .join("")}
                  </tbody>
                </table>
              </div>`
        }
      </div>

      <div class="glass-card stack-list">
        <h3 class="card-title">📜 ${escapeHtml(t("entRecentAuditTitle"))}</h3>
        ${
          auditLogs.length === 0
            ? `<p class="muted-text" style="margin:0;">${escapeHtml(t("entNoAuditLogs"))}</p>`
            : `<div class="ent-table-wrap">
                <table class="ent-table">
                  <thead><tr><th>${escapeHtml(t("entColActor"))}</th><th>${escapeHtml(t("entColAction"))}</th><th>${escapeHtml(t("entColResource"))}</th><th>${escapeHtml(t("entColDate"))}</th></tr></thead>
                  <tbody>
                    ${auditLogs
                      .map(
                        (a) => `
                      <tr>
                        <td>${escapeHtml(a.actorEmail || a.actor_email || "")}</td>
                        <td><span class="status-pill cyan">${escapeHtml(a.action)}</span></td>
                        <td>${escapeHtml(a.resourceType || a.resource_type || "")}</td>
                        <td class="muted-text">${escapeHtml((a.createdAt || a.created_at || "").slice(0, 16).replace("T", " "))}</td>
                      </tr>
                    `
                      )
                      .join("")}
                  </tbody>
                </table>
              </div>`
        }
      </div>
    `;

    document.getElementById("entAddAdminBtn").addEventListener("click", () => {
      const assignableRoles = isOwner ? ROLES : ["admin", "editor", "support"];
      ctx.openModal(
        t("entAddAdminBtn"),
        `
        <form id="entAddAdminForm" class="stack-list">
          <div class="field"><label>${escapeHtml(t("clientFullNameLabel"))}</label><input id="admNewName" required /></div>
          <div class="field"><label>${escapeHtml(t("clientEmailLabel"))}</label><input id="admNewEmail" type="email" required /></div>
          <div class="field"><label>${escapeHtml(t("entRoleLabel"))}</label>
            <select id="admNewRole">
              ${assignableRoles.map((r) => `<option value="${r}">${escapeHtml(roleLabel(r, t))}</option>`).join("")}
            </select>
          </div>
          ${
            Backend.isConfigured()
              ? `<div class="field"><label>Supabase Auth User UUID</label><input id="admNewUid" placeholder="uuid-from-supabase-auth" required /></div>`
              : `<div class="field"><label>${escapeHtml(t("entCreatePasswordLabel"))}</label><input id="admNewPass" type="password" minlength="8" required /></div>`
          }
          <button type="submit" class="btn btn-primary btn-full">${escapeHtml(t("save"))}</button>
        </form>
      `
      );
      document.getElementById("entAddAdminForm").addEventListener("submit", async (e) => {
        e.preventDefault();
        const fullName = document.getElementById("admNewName").value.trim();
        const email = document.getElementById("admNewEmail").value.trim().toLowerCase();
        const role = document.getElementById("admNewRole").value;
        if (Backend.isConfigured() && Backend.getStoredAuth()?.access_token) {
          const userId = document.getElementById("admNewUid").value.trim();
          try {
            await Backend.callAdminGateway("upsert_admin_user", { userId, email, fullName, role, isActive: true });
            uiState.cloudMetrics = await Backend.callAdminGateway("get_overview_metrics").catch(() => uiState.cloudMetrics);
          } catch (err) {
            showToast(err.message);
            return;
          }
        } else {
          const pass = document.getElementById("admNewPass").value;
          if (pass.length < 8) { showToast(t("entPasswordMin8Error")); return; }
          const pwdHash = await hashAdminSecret(email, pass);
          const list = getLocalStaffList().filter((x) => x.email.toLowerCase() !== email);
          list.push({ userId: `staff_${Date.now()}`, fullName, email, role, isActive: true, pwdHash });
          saveLocalStaffList(list);
        }
        logAudit(ctx, session, "upsert_admin_user", "admin_users", email, { role });
        ctx.closeModal();
        showToast("✓");
        renderSecuritySection(body, ctx, session);
      });
    });

    body.querySelectorAll("[data-adm-toggle]").forEach((btn) =>
      btn.addEventListener("click", async () => {
        const uid = btn.dataset.admToggle;
        const nextActive = btn.dataset.admActive !== "1";
        if (Backend.isConfigured() && Backend.getStoredAuth()?.access_token) {
          try {
            await Backend.callAdminGateway("upsert_admin_user", {
              userId: uid,
              email: btn.dataset.admEmail,
              fullName: btn.dataset.admName,
              role: btn.dataset.admRole,
              isActive: nextActive
            });
            uiState.cloudMetrics = await Backend.callAdminGateway("get_overview_metrics").catch(() => uiState.cloudMetrics);
          } catch (err) {
            showToast(err.message);
            return;
          }
        } else {
          const list = getLocalStaffList().map((x) => (x.userId === uid ? { ...x, isActive: nextActive } : x));
          saveLocalStaffList(list);
        }
        logAudit(ctx, session, "toggle_admin_status", "admin_users", uid, { isActive: nextActive });
        showToast("✓");
        renderSecuritySection(body, ctx, session);
      })
    );
  }

  /* =========================================================
     13. ADMIN SETTINGS
     ========================================================= */
  function renderSettingsSection(body, ctx, session) {
    const { t, escapeHtml, Backend, studioState, saveState, showToast } = ctx;
    const s = studioState.settings;
    const cfg = Backend.getConfig();
    const timezones = ["Africa/Cairo", "UTC", "Asia/Riyadh", "Asia/Dubai", "Europe/London", "America/New_York"];

    body.innerHTML = `
      <form id="entSettingsForm" class="glass-card highlight-border stack-list">
        <h2 class="card-title">⚙️ ${escapeHtml(t("entNavSettings"))}</h2>
        <div class="form-two-col">
          <div class="field"><label>Company Name</label><input id="esCompany" value="${escapeHtml(s.companyName)}" required /></div>
          <div class="field"><label>Official Email</label><input id="esEmail" type="email" value="${escapeHtml(s.officialEmail)}" /></div>
        </div>
        <div class="form-two-col">
          <div class="field"><label>Logo URL</label><input id="esLogo" value="${escapeHtml(s.logoUrl || "website/vexora-logo.png")}" /></div>
          <div class="field"><label>${escapeHtml(t("entDefaultLangLabel"))}</label>
            <select id="esLang">
              <option value="ar" ${s.defaultLang === "ar" ? "selected" : ""}>العربية (RTL)</option>
              <option value="en" ${s.defaultLang === "en" ? "selected" : ""}>English (LTR)</option>
            </select>
          </div>
        </div>
        <div class="form-two-col">
          <div class="field"><label>${escapeHtml(t("entTimezoneLabel"))}</label>
            <select id="esTz">
              ${timezones.map((tz) => `<option value="${tz}" ${s.timezone === tz ? "selected" : ""}>${tz}</option>`).join("")}
            </select>
          </div>
          <div class="field"><label>${escapeHtml(t("entThemeLabel"))}</label>
            <select id="esTheme">
              <option value="dark" ${s.themeMode !== "light" ? "selected" : ""}>${escapeHtml(t("entThemeDark"))}</option>
              <option value="light" ${s.themeMode === "light" ? "selected" : ""}>${escapeHtml(t("entThemeLight"))}</option>
            </select>
          </div>
        </div>
        <button type="submit" class="btn btn-primary btn-full">${escapeHtml(t("saveSettingsBtn"))}</button>
      </form>

      <form id="entBackendCfgForm" class="glass-card stack-list">
        <h2 class="card-title">${escapeHtml(t("settingsBackendTitle"))}</h2>
        <p class="muted-text" style="font-size:0.84rem;">${escapeHtml(t("settingsBackendHint"))}</p>
        <div class="field"><label>Supabase Project URL</label><input id="eCfgSbUrl" placeholder="https://xxxx.supabase.co" value="${escapeHtml(cfg.supabaseUrl)}" /></div>
        <div class="field"><label>Supabase Public Anon Key</label><input id="eCfgSbKey" placeholder="eyJ..." value="${escapeHtml(cfg.supabaseAnonKey)}" /></div>
        <div class="field"><label>AI Edge Function Name</label><input id="eCfgAiFn" value="${escapeHtml(cfg.aiFunctionName)}" /></div>
        <div class="field"><label>${escapeHtml(t("aiEndpointUrlLabel"))}</label><input id="eCfgAiUrl" placeholder="https://your-secure-proxy.workers.dev/vexora-ai" value="${escapeHtml(cfg.aiEndpointUrl || "")}" /></div>
        <div class="btn-row">
          <button type="submit" class="btn btn-outline">💾 Save Backend Config</button>
          <button id="eCfgResetBtn" type="button" class="btn btn-text">Reset</button>
        </div>
      </form>
    `;

    document.getElementById("entSettingsForm").addEventListener("submit", async (e) => {
      e.preventDefault();
      const updated = {
        ...studioState.settings,
        companyName: document.getElementById("esCompany").value.trim() || "Vexora Studio",
        officialEmail: document.getElementById("esEmail").value.trim(),
        logoUrl: document.getElementById("esLogo").value.trim() || "website/vexora-logo.png",
        defaultLang: document.getElementById("esLang").value,
        timezone: document.getElementById("esTz").value,
        themeMode: document.getElementById("esTheme").value
      };
      if (Backend.isConfigured() && Backend.getStoredAuth()?.access_token) {
        try { await Backend.updateSiteSettings(updated); } catch (err) { showToast(err.message); return; }
      }
      studioState.settings = updated;
      ctx.applyThemeMode(updated.themeMode);
      saveState();
      logAudit(ctx, session, "update_admin_settings", "site_settings", "main", { themeMode: updated.themeMode, timezone: updated.timezone });
      showToast(t("settingsSavedToast"));
      ctx.renderAll();
    });

    document.getElementById("entBackendCfgForm").addEventListener("submit", async (e) => {
      e.preventDefault();
      Backend.savePublicConfigOverride({
        supabaseUrl: document.getElementById("eCfgSbUrl").value,
        supabaseAnonKey: document.getElementById("eCfgSbKey").value,
        aiFunctionName: document.getElementById("eCfgAiFn").value,
        aiEndpointUrl: document.getElementById("eCfgAiUrl").value
      });
      const check = await Backend.testConnection();
      ctx.setDbSyncStatus({ tested: true, ok: check.ok, latencyMs: check.latencyMs || null, message: check.reason || "" });
      showToast(check.ok ? `${t("dbConnectedMsg")} (${check.latencyMs}ms)` : check.reason || t("settingsSavedToast"));
      ctx.renderScreen();
    });

    document.getElementById("eCfgResetBtn").addEventListener("click", () => {
      Backend.clearPublicConfigOverride();
      Backend.signOutAdmin();
      ctx.renderScreen();
    });
  }

  window.VexoraAdmin = {
    render,
    isAdminAuthorized: (Backend) => Boolean(getActiveAdminSession(Backend)),
    getActiveAdminSession,
    getActiveSection: () => uiState.section,
    setActiveSection: (s) => { uiState.section = s; }
  };
})();
