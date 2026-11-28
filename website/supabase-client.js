// Vexora Studio — Lightweight Supabase REST, Auth, Storage & Edge Function Client
// Zero external bundler dependencies; works natively on GitHub Pages.

(function () {
  const OVERRIDE_KEY = "vexora_supabase_public_cfg";
  const AUTH_SESSION_KEY = "vexora_supabase_auth_session";
  const CLIENT_SESSION_KEY = "vexora_supabase_client_session";

  function cleanEndpointUrl(url) {
    const raw = String(url || "").trim();
    if (!raw) return "";
    if (/^https?:\/\//i.test(raw) || raw.startsWith("/")) return raw.replace(/\/+$/, "");
    return "";
  }

  function getConfig() {
    const base = window.VEXORA_CONFIG || {};
    let override = {};
    try {
      const raw = localStorage.getItem(OVERRIDE_KEY);
      if (raw) override = JSON.parse(raw);
    } catch {
      override = {};
    }
    return {
      supabaseUrl: cleanEndpointUrl(override.supabaseUrl || base.supabaseUrl || ""),
      supabaseAnonKey: String(override.supabaseAnonKey || base.supabaseAnonKey || "").trim(),
      aiFunctionName: String(override.aiFunctionName || base.aiFunctionName || "vexora-ai").trim(),
      aiEndpointUrl: cleanEndpointUrl(override.aiEndpointUrl || base.aiEndpointUrl || ""),
      storageBucket: String(base.storageBucket || "vexora-media").trim()
    };
  }

  function savePublicConfigOverride(cfg) {
    try {
      localStorage.setItem(
        OVERRIDE_KEY,
        JSON.stringify({
          supabaseUrl: cleanEndpointUrl(cfg.supabaseUrl || ""),
          supabaseAnonKey: String(cfg.supabaseAnonKey || "").trim(),
          aiFunctionName: String(cfg.aiFunctionName || "vexora-ai").trim() || "vexora-ai",
          aiEndpointUrl: cleanEndpointUrl(cfg.aiEndpointUrl || "")
        })
      );
    } catch {
      // Ignore storage quota errors
    }
  }

  function clearPublicConfigOverride() {
    try {
      localStorage.removeItem(OVERRIDE_KEY);
    } catch {
      // Ignore
    }
  }

  function isConfigured() {
    const c = getConfig();
    return Boolean(c.supabaseUrl && c.supabaseAnonKey);
  }

  function isAiConfigured() {
    const c = getConfig();
    return Boolean(c.aiEndpointUrl || (c.supabaseUrl && c.supabaseAnonKey));
  }

  function getStoredAuth() {
    try {
      const raw = sessionStorage.getItem(AUTH_SESSION_KEY);
      return raw ? JSON.parse(raw) : null;
    } catch {
      return null;
    }
  }

  function setStoredAuth(session) {
    try {
      if (!session) sessionStorage.removeItem(AUTH_SESSION_KEY);
      else sessionStorage.setItem(AUTH_SESSION_KEY, JSON.stringify(session));
    } catch {
      // Ignore
    }
  }

  function getStoredClientAuth() {
    try {
      const raw = sessionStorage.getItem(CLIENT_SESSION_KEY);
      return raw ? JSON.parse(raw) : null;
    } catch {
      return null;
    }
  }

  function setStoredClientAuth(session) {
    try {
      if (!session) sessionStorage.removeItem(CLIENT_SESSION_KEY);
      else sessionStorage.setItem(CLIENT_SESSION_KEY, JSON.stringify(session));
    } catch {
      // Ignore
    }
  }

  function authHeaders(useUserToken = false) {
    const c = getConfig();
    const auth = getStoredAuth();
    const token = useUserToken && auth?.access_token ? auth.access_token : c.supabaseAnonKey;
    return {
      apikey: c.supabaseAnonKey,
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json"
    };
  }

  function clientAuthHeaders() {
    const c = getConfig();
    const client = getStoredClientAuth();
    const token = client?.access_token || c.supabaseAnonKey;
    return {
      apikey: c.supabaseAnonKey,
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json"
    };
  }

  async function testConnection() {
    const c = getConfig();
    if (!c.supabaseUrl || !c.supabaseAnonKey) {
      return { ok: false, configured: false, reason: "Supabase URL or Anon Key not configured" };
    }
    const start = performance.now();
    try {
      const res = await fetch(`${c.supabaseUrl}/rest/v1/site_settings?select=id&limit=1`, {
        headers: authHeaders(false)
      });
      const ms = Math.round(performance.now() - start);
      if (!res.ok) {
        return { ok: false, configured: true, status: res.status, latencyMs: ms, reason: `HTTP ${res.status}` };
      }
      return { ok: true, configured: true, latencyMs: ms };
    } catch (err) {
      return { ok: false, configured: true, reason: err?.message || "Network error" };
    }
  }

  async function fetchPublicCatalog() {
    const c = getConfig();
    if (!isConfigured()) return null;
    const base = `${c.supabaseUrl}/rest/v1`;
    const headers = authHeaders(Boolean(getStoredAuth()?.access_token));
    const [settingsRes, servicesRes, projectsRes, teamRes, kbRes, faqRes, updatesRes, releasesRes] = await Promise.all([
      fetch(`${base}/site_settings?id=eq.main&limit=1`, { headers }),
      fetch(`${base}/services?order=sort_order.asc`, { headers }),
      fetch(`${base}/projects?order=created_at.desc`, { headers }),
      fetch(`${base}/team_members?order=sort_order.asc`, { headers }),
      fetch(`${base}/knowledge_base?order=sort_order.asc`, { headers }).catch(() => null),
      fetch(`${base}/faqs?order=sort_order.asc`, { headers }).catch(() => null),
      fetch(`${base}/updates_feed?order=pinned.desc,created_at.desc`, { headers }).catch(() => null),
      fetch(`${base}/site_releases?order=release_date.desc`, { headers }).catch(() => null)
    ]);
    if (!servicesRes.ok || !projectsRes.ok || !teamRes.ok) {
      throw new Error("Failed to load Supabase catalog");
    }
    const [settingsRows, servicesRows, projectsRows, teamRows, kbRows, faqRows, updateRows, releaseRows] = await Promise.all([
      settingsRes.ok ? settingsRes.json() : [],
      servicesRes.json(),
      projectsRes.json(),
      teamRes.json(),
      kbRes && kbRes.ok ? kbRes.json() : null,
      faqRes && faqRes.ok ? faqRes.json() : null,
      updatesRes && updatesRes.ok ? updatesRes.json() : null,
      releasesRes && releasesRes.ok ? releasesRes.json() : null
    ]);

    return {
      settings: settingsRows?.[0] ? mapSettingsFromDb(settingsRows[0]) : null,
      services: servicesRows.map(mapServiceFromDb),
      projects: projectsRows.map(mapProjectFromDb),
      team: teamRows.map(mapTeamFromDb),
      knowledgeBase: Array.isArray(kbRows) ? kbRows.map(mapKbFromDb) : null,
      faqs: Array.isArray(faqRows) ? faqRows.map(mapFaqFromDb) : null,
      updates: Array.isArray(updateRows) ? updateRows.map(mapUpdateFromDb) : null,
      releases: Array.isArray(releaseRows) ? releaseRows.map(mapReleaseFromDb) : null
    };
  }

  function mapSettingsFromDb(r) {
    return {
      companyName: r.company_name || "Vexora Studio",
      logoUrl: r.logo_url || "website/vexora-logo.png",
      taglineEn: r.tagline_en || "Building The Future Through Code.",
      taglineAr: r.tagline_ar || "نبني المستقبل عبر البرمجة.",
      homeDescEn: r.home_desc_en || "",
      homeDescAr: r.home_desc_ar || "",
      officialEmail: r.official_email || "vexora0studio@gmail.com",
      githubUrl: r.github_url || "",
      linkedinUrl: r.linkedin_url || "",
      youtubeUrl: r.youtube_url || "",
      websiteUrl: r.website_url || "https://vexora0studio.github.io/Vexora_Website_Offical/",
      defaultLang: r.default_lang || "ar",
      timezone: r.timezone || "Africa/Cairo",
      themeMode: r.theme_mode || "dark",
      visibleSections: r.visible_sections && typeof r.visible_sections === "object"
        ? r.visible_sections
        : { services: true, projects: true, technologies: true, team: true, ai: true, client: true, updates: true, download: true, faq: true },
      aiEnabled: r.ai_enabled !== false,
      aiModel: r.ai_model || "gemini-3.8-flash",
      aiSystemPrompt: r.ai_system_prompt || "",
      aiPersona: r.ai_persona || "Senior Software Architect & Solutions Advisor",
      aiAllowedLangs: r.ai_allowed_langs || "both",
      aiDailyLimit: Number(r.ai_daily_limit || 500),
      aiRateLimitRpm: Number(r.ai_rate_limit_rpm || 20),
      aiEnabledTools: r.ai_enabled_tools && typeof r.ai_enabled_tools === "object"
        ? r.ai_enabled_tools
        : { web_search: true, url_reader: true, file_search: true, code_sandbox: true, calculator: true, document_analyzer: true, data_analyzer: true, database_tools: true },
      aiAgentConfigs: r.ai_agent_configs && typeof r.ai_agent_configs === "object" ? r.ai_agent_configs : {}
    };
  }

  function mapSettingsToDb(s) {
    return {
      id: "main",
      company_name: s.companyName,
      logo_url: s.logoUrl || "website/vexora-logo.png",
      tagline_en: s.taglineEn,
      tagline_ar: s.taglineAr,
      home_desc_en: s.homeDescEn,
      home_desc_ar: s.homeDescAr,
      official_email: s.officialEmail,
      github_url: s.githubUrl || "",
      linkedin_url: s.linkedinUrl || "",
      youtube_url: s.youtubeUrl || "",
      website_url: s.websiteUrl || "",
      default_lang: s.defaultLang || "ar",
      timezone: s.timezone || "Africa/Cairo",
      theme_mode: s.themeMode === "light" ? "light" : "dark",
      visible_sections: s.visibleSections || { services: true, projects: true, technologies: true, team: true, ai: true, client: true, updates: true, download: true, faq: true },
      ai_enabled: s.aiEnabled !== false,
      ai_model: s.aiModel || "gemini-3.8-flash",
      ai_system_prompt: s.aiSystemPrompt || "",
      ai_persona: s.aiPersona || "Senior Software Architect & Solutions Advisor",
      ai_allowed_langs: s.aiAllowedLangs || "both",
      ai_daily_limit: Number(s.aiDailyLimit || 500),
      ai_rate_limit_rpm: Number(s.aiRateLimitRpm || 20),
      ai_enabled_tools: s.aiEnabledTools || { web_search: true, url_reader: true, file_search: true, code_sandbox: true, calculator: true, document_analyzer: true, data_analyzer: true, database_tools: true },
      ai_agent_configs: s.aiAgentConfigs || {},
      updated_at: new Date().toISOString()
    };
  }

  function mapServiceFromDb(r) {
    return {
      id: r.id,
      titleEn: r.title_en,
      titleAr: r.title_ar,
      descriptionEn: r.description_en,
      descriptionAr: r.description_ar,
      detailsEn: r.details_en || "",
      detailsAr: r.details_ar || "",
      technologies: Array.isArray(r.technologies) ? r.technologies : [],
      iconKey: r.icon_key || "code",
      category: r.category || "engineering",
      sortOrder: Number(r.sort_order || 1),
      published: r.published !== false
    };
  }

  function mapServiceToDb(s) {
    return {
      id: s.id,
      title_en: s.titleEn,
      title_ar: s.titleAr,
      description_en: s.descriptionEn,
      description_ar: s.descriptionAr,
      details_en: s.detailsEn || "",
      details_ar: s.detailsAr || "",
      technologies: s.technologies || [],
      icon_key: s.iconKey || "code",
      category: s.category || "engineering",
      sort_order: Number(s.sortOrder || 1),
      published: Boolean(s.published),
      updated_at: new Date().toISOString()
    };
  }

  function mapProjectFromDb(r) {
    return {
      id: r.id,
      nameEn: r.name_en,
      nameAr: r.name_ar,
      descriptionEn: r.description_en,
      descriptionAr: r.description_ar,
      category: r.category || "Websites",
      status: r.status === "Coming Soon" ? "Planning" : (r.status || "In Progress"),
      progressPct: Number(r.progress_pct ?? 0),
      deadline: r.deadline || "",
      currentPhase: r.current_phase || "Planning",
      clientUserId: r.client_user_id || "",
      clientEmail: r.client_email || "",
      budgetEgp: Number(r.budget_egp ?? 0),
      technologies: Array.isArray(r.technologies) ? r.technologies : [],
      assignedTeam: Array.isArray(r.assigned_team) ? r.assigned_team : [],
      changeHistory: Array.isArray(r.change_history) ? r.change_history : [],
      websiteUrl: r.website_url || "",
      imageUrl: r.image_url || "",
      videoUrl: r.video_url || "",
      presetImageKey: r.preset_image_key || "web",
      featured: Boolean(r.featured),
      published: r.published !== false
    };
  }

  function mapProjectToDb(p) {
    return {
      id: p.id,
      name_en: p.nameEn,
      name_ar: p.nameAr,
      description_en: p.descriptionEn,
      description_ar: p.descriptionAr,
      category: p.category || "Websites",
      status: p.status === "Coming Soon" ? "Planning" : (p.status || "In Progress"),
      progress_pct: Math.max(0, Math.min(100, Number(p.progressPct ?? 0))),
      deadline: p.deadline || "",
      current_phase: p.currentPhase || "Planning",
      client_user_id: p.clientUserId || null,
      client_email: p.clientEmail || "",
      budget_egp: Number(p.budgetEgp ?? 0),
      technologies: p.technologies || [],
      assigned_team: p.assignedTeam || [],
      change_history: Array.isArray(p.changeHistory) ? p.changeHistory : [],
      website_url: p.websiteUrl || "",
      image_url: p.imageUrl || "",
      video_url: p.videoUrl || "",
      preset_image_key: p.presetImageKey || "web",
      featured: Boolean(p.featured),
      published: Boolean(p.published),
      updated_at: new Date().toISOString()
    };
  }

  function mapTeamFromDb(r) {
    return {
      id: r.id,
      nameEn: r.name_en,
      nameAr: r.name_ar,
      specializationEn: r.specialization_en || "",
      specializationAr: r.specialization_ar || "",
      roleEn: r.role_en,
      roleAr: r.role_ar,
      bioEn: r.bio_en,
      bioAr: r.bio_ar,
      email: r.email || "",
      employeeStatus: r.employee_status || "active",
      systemRole: r.system_role || "none",
      portfolioUrl: r.portfolio_url || "",
      cvSummary: r.cv_summary || "",
      skills: Array.isArray(r.skills) ? r.skills : [],
      experienceYears: r.experience_years ?? null,
      avatarUrl: r.avatar_url || "",
      githubUrl: r.github_url || "",
      linkedinUrl: r.linkedin_url || "",
      published: r.published !== false,
      sortOrder: Number(r.sort_order || 1)
    };
  }

  function mapTeamToDb(m) {
    return {
      id: m.id,
      name_en: m.nameEn,
      name_ar: m.nameAr,
      specialization_en: m.specializationEn || "",
      specialization_ar: m.specializationAr || "",
      role_en: m.roleEn,
      role_ar: m.roleAr,
      bio_en: m.bioEn,
      bio_ar: m.bioAr,
      email: m.email || "",
      employee_status: m.employeeStatus || "active",
      system_role: m.systemRole || "none",
      portfolio_url: m.portfolioUrl || "",
      cv_summary: m.cvSummary || "",
      skills: m.skills || [],
      experience_years: m.experienceYears !== "" && m.experienceYears !== null && m.experienceYears !== undefined
        ? Number(m.experienceYears)
        : null,
      avatar_url: m.avatarUrl || "",
      github_url: m.githubUrl || "",
      linkedin_url: m.linkedinUrl || "",
      published: Boolean(m.published),
      sort_order: Number(m.sortOrder || 1),
      updated_at: new Date().toISOString()
    };
  }

  function mapKbFromDb(r) {
    return {
      id: r.id,
      topic: r.topic || "general",
      titleEn: r.title_en,
      titleAr: r.title_ar,
      contentEn: r.content_en,
      contentAr: r.content_ar,
      keywords: Array.isArray(r.keywords) ? r.keywords : [],
      sortOrder: Number(r.sort_order || 1),
      published: r.published !== false
    };
  }

  function mapKbToDb(k) {
    return {
      id: k.id,
      topic: k.topic || "general",
      title_en: k.titleEn,
      title_ar: k.titleAr,
      content_en: k.contentEn,
      content_ar: k.contentAr,
      keywords: k.keywords || [],
      sort_order: Number(k.sortOrder || 1),
      published: Boolean(k.published),
      updated_at: new Date().toISOString()
    };
  }

  function mapFaqFromDb(r) {
    return {
      id: r.id,
      questionEn: r.question_en,
      questionAr: r.question_ar,
      answerEn: r.answer_en,
      answerAr: r.answer_ar,
      category: r.category || "general",
      sortOrder: Number(r.sort_order || 1),
      published: r.published !== false
    };
  }

  function mapFaqToDb(f) {
    return {
      id: f.id,
      question_en: f.questionEn,
      question_ar: f.questionAr,
      answer_en: f.answerEn,
      answer_ar: f.answerAr,
      category: f.category || "general",
      sort_order: Number(f.sortOrder || 1),
      published: Boolean(f.published),
      updated_at: new Date().toISOString()
    };
  }

  function mapUpdateFromDb(r) {
    return {
      id: r.id,
      kind: r.kind || "update",
      titleEn: r.title_en,
      titleAr: r.title_ar,
      bodyEn: r.body_en,
      bodyAr: r.body_ar,
      imageUrl: r.image_url || "",
      targetRoute: r.target_route || "home",
      targetGroup: r.target_group || "all",
      targetEmail: r.target_email || "",
      scheduledAt: r.scheduled_at || "",
      deliveryStatus: r.delivery_status || "published",
      pinned: Boolean(r.pinned),
      published: r.published !== false,
      createdAt: r.created_at || new Date().toISOString()
    };
  }

  function mapUpdateToDb(u) {
    return {
      id: u.id,
      kind: u.kind || "update",
      title_en: u.titleEn,
      title_ar: u.titleAr,
      body_en: u.bodyEn,
      body_ar: u.bodyAr,
      image_url: u.imageUrl || "",
      target_route: u.targetRoute || "home",
      target_group: u.targetGroup || "all",
      target_email: u.targetEmail || "",
      scheduled_at: u.scheduledAt ? u.scheduledAt : null,
      delivery_status: u.deliveryStatus || "published",
      pinned: Boolean(u.pinned),
      published: Boolean(u.published),
      created_at: u.createdAt || new Date().toISOString()
    };
  }

  function mapReleaseFromDb(r) {
    return {
      id: r.id,
      version: r.version,
      titleEn: r.title_en,
      titleAr: r.title_ar,
      descriptionEn: r.description_en || "",
      descriptionAr: r.description_ar || "",
      changelog: r.changelog || "",
      releaseDate: r.release_date || new Date().toISOString().slice(0, 10),
      status: r.status || "released",
      deployTarget: r.deploy_target || "github_pages",
      createdAt: r.created_at || new Date().toISOString()
    };
  }

  function mapReleaseToDb(rel) {
    return {
      id: rel.id,
      version: rel.version,
      title_en: rel.titleEn,
      title_ar: rel.titleAr,
      description_en: rel.descriptionEn || "",
      description_ar: rel.descriptionAr || "",
      changelog: rel.changelog || "",
      release_date: rel.releaseDate || new Date().toISOString().slice(0, 10),
      status: rel.status || "released",
      deploy_target: rel.deployTarget || "github_pages",
      created_at: rel.createdAt || new Date().toISOString()
    };
  }

  function mapRequestFromDb(r) {
    return {
      id: r.id,
      userId: r.user_id,
      clientName: r.client_name,
      clientEmail: r.client_email,
      serviceName: r.service_name || "",
      projectTitle: r.project_title,
      description: r.description,
      budgetRange: r.budget_range || "",
      timeline: r.timeline || "",
      status: r.status || "submitted",
      adminNote: r.admin_note || "",
      createdAt: r.created_at,
      updatedAt: r.updated_at || r.created_at
    };
  }

  async function recordLoginAttempt({ email, userId = null, role = "", status = "failed", reason = "" }) {
    const c = getConfig();
    if (!isConfigured()) return;
    try {
      await fetch(`${c.supabaseUrl}/rest/v1/login_logs`, {
        method: "POST",
        headers: { ...authHeaders(false), Prefer: "return=minimal" },
        body: JSON.stringify({
          id: `login_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
          email: String(email || "").slice(0, 180),
          user_id: userId,
          role: String(role || ""),
          status,
          reason: String(reason || "").slice(0, 240),
          user_agent: (typeof navigator !== "undefined" ? navigator.userAgent : "").slice(0, 180),
          created_at: new Date().toISOString()
        })
      });
    } catch {
      // Never block UI flow on telemetry write failure
    }
  }

  async function recordAuditLog(action, resourceType, resourceId = "", details = {}) {
    const c = getConfig();
    const auth = getStoredAuth();
    if (!isConfigured() || !auth?.access_token) return;
    try {
      await fetch(`${c.supabaseUrl}/rest/v1/audit_logs`, {
        method: "POST",
        headers: { ...authHeaders(true), Prefer: "return=minimal" },
        body: JSON.stringify({
          id: `audit_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
          actor_user_id: auth.userId || null,
          actor_email: auth.email || "",
          actor_role: auth.role || "admin",
          action,
          resource_type: resourceType,
          resource_id: String(resourceId || ""),
          details,
          created_at: new Date().toISOString()
        })
      });
    } catch {
      // Ignore
    }
  }

  async function signInAdmin(email, password) {
    const c = getConfig();
    if (!isConfigured()) throw new Error("Supabase not configured");
    const res = await fetch(`${c.supabaseUrl}/auth/v1/token?grant_type=password`, {
      method: "POST",
      headers: {
        apikey: c.supabaseAnonKey,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({ email, password })
    });
    const data = await res.json();
    if (!res.ok || !data?.access_token) {
      const msg = data?.error_description || data?.msg || "Invalid email or password";
      await recordLoginAttempt({ email, status: "failed", reason: msg });
      throw new Error(msg);
    }
    const adminCheck = await fetch(
      `${c.supabaseUrl}/rest/v1/admin_users?user_id=eq.${encodeURIComponent(data.user.id)}&select=user_id,role,full_name,is_active`,
      {
        headers: {
          apikey: c.supabaseAnonKey,
          Authorization: `Bearer ${data.access_token}`
        }
      }
    );
    const adminRows = adminCheck.ok ? await adminCheck.json() : [];
    const adminRow = Array.isArray(adminRows) ? adminRows[0] : null;
    if (!adminRow) {
      await recordLoginAttempt({ email, userId: data.user?.id, status: "blocked", reason: "Not authorized in admin_users" });
      throw new Error("Account is authenticated but not authorized in admin_users.");
    }
    if (adminRow.is_active === false) {
      await recordLoginAttempt({ email, userId: data.user?.id, role: adminRow.role, status: "blocked", reason: "Admin account disabled" });
      throw new Error("This admin account has been disabled by the Owner.");
    }
    const session = {
      access_token: data.access_token,
      email: data.user?.email || email,
      userId: data.user?.id,
      role: adminRow.role || "admin",
      fullName: adminRow.full_name || (data.user?.email || email).split("@")[0]
    };
    setStoredAuth(session);
    await recordLoginAttempt({ email: session.email, userId: session.userId, role: session.role, status: "success", reason: "Cloud admin login" });
    return session;
  }

  function signOutAdmin() {
    setStoredAuth(null);
  }

  async function upsertRow(table, row) {
    const c = getConfig();
    const res = await fetch(`${c.supabaseUrl}/rest/v1/${table}`, {
      method: "POST",
      headers: {
        ...authHeaders(true),
        Prefer: "resolution=merge-duplicates,return=minimal"
      },
      body: JSON.stringify(row)
    });
    if (!res.ok) {
      const txt = await res.text();
      throw new Error(`Save ${table} failed (${res.status}): ${txt}`);
    }
  }

  async function deleteRow(table, id) {
    const c = getConfig();
    const res = await fetch(`${c.supabaseUrl}/rest/v1/${table}?id=eq.${encodeURIComponent(id)}`, {
      method: "DELETE",
      headers: authHeaders(true)
    });
    if (!res.ok) {
      throw new Error(`Delete ${table} failed (${res.status})`);
    }
  }

  async function signUpClient(fullName, email, password, company = "", phone = "") {
    const c = getConfig();
    if (!isConfigured()) throw new Error("Supabase not configured");
    const res = await fetch(`${c.supabaseUrl}/auth/v1/signup`, {
      method: "POST",
      headers: {
        apikey: c.supabaseAnonKey,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        email,
        password,
        data: { full_name: fullName, company, phone }
      })
    });
    const data = await res.json();
    if (!res.ok) {
      throw new Error(data?.msg || data?.error_description || "Sign up failed");
    }
    const token = data?.access_token || "";
    const userId = data?.user?.id || "";
    if (token && userId) {
      const session = {
        access_token: token,
        userId,
        email: data.user?.email || email,
        fullName,
        company,
        phone
      };
      setStoredClientAuth(session);
      await fetch(`${c.supabaseUrl}/rest/v1/client_profiles`, {
        method: "POST",
        headers: {
          apikey: c.supabaseAnonKey,
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
          Prefer: "resolution=merge-duplicates,return=minimal"
        },
        body: JSON.stringify({
          user_id: userId,
          full_name: fullName,
          email,
          company,
          phone,
          updated_at: new Date().toISOString()
        })
      }).catch(() => {});
      return { session, emailConfirmationRequired: false };
    }
    return { session: null, emailConfirmationRequired: true };
  }

  async function signInClient(email, password) {
    const c = getConfig();
    if (!isConfigured()) throw new Error("Supabase not configured");
    const res = await fetch(`${c.supabaseUrl}/auth/v1/token?grant_type=password`, {
      method: "POST",
      headers: {
        apikey: c.supabaseAnonKey,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({ email, password })
    });
    const data = await res.json();
    if (!res.ok || !data?.access_token) {
      throw new Error(data?.error_description || data?.msg || "Invalid email or password");
    }
    const userId = data.user?.id;
    let profile = null;
    try {
      const profRes = await fetch(
        `${c.supabaseUrl}/rest/v1/client_profiles?user_id=eq.${encodeURIComponent(userId)}&limit=1`,
        {
          headers: {
            apikey: c.supabaseAnonKey,
            Authorization: `Bearer ${data.access_token}`
          }
        }
      );
      if (profRes.ok) {
        const rows = await profRes.json();
        profile = rows?.[0] || null;
      }
    } catch {
      profile = null;
    }
    if (profile?.status === "disabled") {
      throw new Error("Your client account has been disabled. Please contact studio support.");
    }
    const meta = data.user?.user_metadata || {};
    const session = {
      access_token: data.access_token,
      userId,
      email: data.user?.email || email,
      fullName: profile?.full_name || meta.full_name || email.split("@")[0],
      company: profile?.company || meta.company || "",
      phone: profile?.phone || meta.phone || ""
    };
    setStoredClientAuth(session);
    return session;
  }

  function signOutClient() {
    setStoredClientAuth(null);
  }

  async function submitProjectRequest(reqItem) {
    const c = getConfig();
    const client = getStoredClientAuth();
    if (!isConfigured() || !client?.access_token) return { synced: false };
    const res = await fetch(`${c.supabaseUrl}/rest/v1/project_requests`, {
      method: "POST",
      headers: {
        ...clientAuthHeaders(),
        Prefer: "return=minimal"
      },
      body: JSON.stringify({
        id: reqItem.id,
        user_id: client.userId,
        client_name: reqItem.clientName,
        client_email: reqItem.clientEmail,
        service_name: reqItem.serviceName || "",
        project_title: reqItem.projectTitle,
        description: reqItem.description,
        budget_range: reqItem.budgetRange || "",
        timeline: reqItem.timeline || "",
        status: "submitted",
        admin_note: "",
        created_at: reqItem.createdAt,
        updated_at: reqItem.createdAt
      })
    });
    if (!res.ok) {
      const txt = await res.text();
      throw new Error(`Project request failed (${res.status}): ${txt}`);
    }
    return { synced: true };
  }

  async function fetchClientRequests() {
    const c = getConfig();
    const client = getStoredClientAuth();
    if (!isConfigured() || !client?.access_token) return null;
    const res = await fetch(
      `${c.supabaseUrl}/rest/v1/project_requests?user_id=eq.${encodeURIComponent(client.userId)}&order=created_at.desc`,
      { headers: clientAuthHeaders() }
    );
    if (!res.ok) throw new Error(`Fetch requests failed (${res.status})`);
    const rows = await res.json();
    return rows.map(mapRequestFromDb);
  }

  async function fetchAllRequestsAdmin() {
    const c = getConfig();
    if (!isConfigured() || !getStoredAuth()?.access_token) return null;
    const res = await fetch(`${c.supabaseUrl}/rest/v1/project_requests?order=created_at.desc`, {
      headers: authHeaders(true)
    });
    if (!res.ok) throw new Error(`Fetch all requests failed (${res.status})`);
    const rows = await res.json();
    return rows.map(mapRequestFromDb);
  }

  async function updateProjectRequestAdmin(id, status, adminNote) {
    const c = getConfig();
    const res = await fetch(`${c.supabaseUrl}/rest/v1/project_requests?id=eq.${encodeURIComponent(id)}`, {
      method: "PATCH",
      headers: authHeaders(true),
      body: JSON.stringify({
        status,
        admin_note: adminNote || "",
        updated_at: new Date().toISOString()
      })
    });
    if (!res.ok) throw new Error(`Update request failed (${res.status})`);
  }

  async function submitContactMessage(msg) {
    const c = getConfig();
    if (!isConfigured()) return { synced: false };
    const client = getStoredClientAuth();
    const headers = client?.access_token ? clientAuthHeaders() : authHeaders(false);
    const res = await fetch(`${c.supabaseUrl}/rest/v1/contact_messages`, {
      method: "POST",
      headers: {
        ...headers,
        Prefer: "return=minimal"
      },
      body: JSON.stringify({
        id: msg.id,
        user_id: client?.userId || null,
        sender_name: msg.senderName,
        email: msg.email,
        subject: msg.subject,
        message: msg.message,
        service_requested: msg.serviceRequested || "",
        ticket_type: msg.ticketType || (msg.serviceRequested === "Client Support" ? "support" : "contact"),
        priority: msg.priority || "medium",
        assigned_to: "",
        admin_reply: "",
        internal_note: "",
        history: msg.history || [{ at: msg.createdAt, actor: msg.senderName, action: "submitted" }],
        status: "new",
        created_at: msg.createdAt
      })
    });
    if (!res.ok) {
      const txt = await res.text();
      throw new Error(`Contact submit failed (${res.status}): ${txt}`);
    }
    return { synced: true };
  }

  function mapMessageFromDb(r) {
    return {
      id: r.id,
      userId: r.user_id || "",
      senderName: r.sender_name,
      email: r.email,
      subject: r.subject,
      message: r.message,
      serviceRequested: r.service_requested || "",
      ticketType: r.ticket_type || "contact",
      priority: r.priority || "medium",
      assignedTo: r.assigned_to || "",
      adminReply: r.admin_reply || "",
      internalNote: r.internal_note || "",
      history: Array.isArray(r.history) ? r.history : [],
      status: r.status === "replied" ? "resolved" : (r.status || "new"),
      createdAt: r.created_at
    };
  }

  async function fetchClientMessages() {
    const c = getConfig();
    const client = getStoredClientAuth();
    if (!isConfigured() || !client?.access_token) return null;
    const res = await fetch(
      `${c.supabaseUrl}/rest/v1/contact_messages?user_id=eq.${encodeURIComponent(client.userId)}&order=created_at.desc`,
      { headers: clientAuthHeaders() }
    );
    if (!res.ok) return null;
    const rows = await res.json();
    return rows.map(mapMessageFromDb);
  }

  async function fetchAdminMessages() {
    const c = getConfig();
    if (!isConfigured() || !getStoredAuth()?.access_token) return null;
    const res = await fetch(`${c.supabaseUrl}/rest/v1/contact_messages?order=created_at.desc`, {
      headers: authHeaders(true)
    });
    if (!res.ok) throw new Error(`Fetch messages failed (${res.status})`);
    const rows = await res.json();
    return rows.map(mapMessageFromDb);
  }

  async function updateMessageStatus(id, status, adminReply, extras = {}) {
    const c = getConfig();
    const payload = { status };
    if (typeof adminReply === "string") payload.admin_reply = adminReply;
    if (typeof extras.priority === "string") payload.priority = extras.priority;
    if (typeof extras.assignedTo === "string") payload.assigned_to = extras.assignedTo;
    if (typeof extras.internalNote === "string") payload.internal_note = extras.internalNote;
    if (typeof extras.ticketType === "string") payload.ticket_type = extras.ticketType;
    if (Array.isArray(extras.history)) payload.history = extras.history;
    const res = await fetch(`${c.supabaseUrl}/rest/v1/contact_messages?id=eq.${encodeURIComponent(id)}`, {
      method: "PATCH",
      headers: authHeaders(true),
      body: JSON.stringify(payload)
    });
    if (!res.ok) throw new Error(`Update message failed (${res.status})`);
  }

  async function trackAnalyticsEvent(eventType, route = "home", referrerSource = "") {
    const c = getConfig();
    if (!isConfigured()) return;
    let ref = String(referrerSource || "").trim();
    if (!ref && typeof document !== "undefined") {
      try {
        ref = document.referrer ? new URL(document.referrer).hostname : "direct";
      } catch {
        ref = "direct";
      }
    }
    try {
      await fetch(`${c.supabaseUrl}/rest/v1/analytics_events`, {
        method: "POST",
        headers: {
          ...authHeaders(false),
          Prefer: "return=minimal"
        },
        body: JSON.stringify({
          id: `evt_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
          event_type: eventType,
          route: String(route || "home").slice(0, 40),
          referrer_source: (ref || "direct").slice(0, 120),
          created_at: new Date().toISOString()
        })
      });
    } catch {
      // Telemetry failures must never disrupt UX
    }
  }

  async function fetchAnalyticsSummary() {
    const c = getConfig();
    if (!isConfigured() || !getStoredAuth()?.access_token) return null;
    const res = await fetch(
      `${c.supabaseUrl}/rest/v1/analytics_events?select=event_type,route,referrer_source,created_at&order=created_at.desc&limit=2000`,
      { headers: authHeaders(true) }
    );
    if (!res.ok) return null;
    const rows = await res.json();
    const byRoute = {};
    const bySource = {};
    let totalViews = 0;
    let totalAi = 0;
    let totalApk = 0;
    let totalReq = 0;
    for (const r of rows) {
      if (r.event_type === "page_view") {
        totalViews += 1;
        byRoute[r.route] = (byRoute[r.route] || 0) + 1;
        const src = r.referrer_source || "direct";
        bySource[src] = (bySource[src] || 0) + 1;
      } else if (r.event_type === "ai_query") {
        totalAi += 1;
      } else if (r.event_type === "apk_download") {
        totalApk += 1;
      } else if (r.event_type === "client_request") {
        totalReq += 1;
      }
    }
    return { totalViews, totalAi, totalApk, totalReq, byRoute, bySource, events: rows };
  }

  async function callAdminGateway(action, payload = {}) {
    const c = getConfig();
    const auth = getStoredAuth();
    if (!isConfigured() || !auth?.access_token) {
      throw new Error("Cloud admin authentication required.");
    }
    const res = await fetch(`${c.supabaseUrl}/functions/v1/vexora-admin`, {
      method: "POST",
      headers: authHeaders(true),
      body: JSON.stringify({ action, ...payload })
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      throw new Error(data?.error || `Admin gateway failed (${res.status})`);
    }
    return data;
  }

  async function uploadImageFile(file, folder = "uploads") {
    if (!file || !file.type.startsWith("image/")) {
      throw new Error("Please select a valid image file.");
    }
    const c = getConfig();
    const auth = getStoredAuth();

    // If Supabase Storage & Admin Auth are active, upload directly to Supabase Storage bucket
    if (isConfigured() && auth?.access_token) {
      const safeExt = (file.name.split(".").pop() || "png").replace(/[^a-zA-Z0-9]/g, "").toLowerCase() || "png";
      const filePath = `${folder}/${Date.now()}_${Math.random().toString(36).slice(2, 8)}.${safeExt}`;
      const res = await fetch(`${c.supabaseUrl}/storage/v1/object/${c.storageBucket}/${filePath}`, {
        method: "POST",
        headers: {
          apikey: c.supabaseAnonKey,
          Authorization: `Bearer ${auth.access_token}`,
          "Content-Type": file.type,
          "x-upsert": "true"
        },
        body: file
      });
      if (!res.ok) {
        const txt = await res.text();
        throw new Error(`Storage upload failed (${res.status}): ${txt}`);
      }
      return `${c.supabaseUrl}/storage/v1/object/public/${c.storageBucket}/${filePath}`;
    }

    // Local preview fallback: resize & compress safely via canvas
    return await compressImageToDataUrl(file, 900, 0.84);
  }

  function compressImageToDataUrl(file, maxDim = 900, quality = 0.84) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onerror = () => reject(new Error("Could not read image file"));
      reader.onload = () => {
        const img = new Image();
        img.onerror = () => reject(new Error("Invalid image data"));
        img.onload = () => {
          let { width, height } = img;
          if (width > maxDim || height > maxDim) {
            if (width >= height) {
              height = Math.round((height * maxDim) / width);
              width = maxDim;
            } else {
              width = Math.round((width * maxDim) / height);
              height = maxDim;
            }
          }
          const canvas = document.createElement("canvas");
          canvas.width = width;
          canvas.height = height;
          const ctx = canvas.getContext("2d");
          ctx.drawImage(img, 0, 0, width, height);
          resolve(canvas.toDataURL("image/webp", quality));
        };
        img.src = reader.result;
      };
      reader.readAsDataURL(file);
    });
  }

  function resolveAiTarget() {
    const c = getConfig();
    if (c.aiEndpointUrl) {
      return {
        url: c.aiEndpointUrl,
        headers: { "Content-Type": "application/json" },
        mode: "custom-proxy"
      };
    }
    if (isConfigured()) {
      const adminToken = getStoredAuth()?.access_token;
      const clientToken = getStoredClientAuth()?.access_token;
      const bearer = adminToken || clientToken || c.supabaseAnonKey;
      return {
        url: `${c.supabaseUrl}/functions/v1/${c.aiFunctionName}`,
        headers: {
          apikey: c.supabaseAnonKey,
          Authorization: `Bearer ${bearer}`,
          "Content-Type": "application/json"
        },
        mode: "supabase-edge"
      };
    }
    return null;
  }

  async function readJsonSafe(res) {
    try {
      if (typeof res.json === "function") {
        return await res.json().catch(() => ({}));
      }
      if (typeof res.text === "function") {
        const raw = await res.text().catch(() => "");
        return raw ? JSON.parse(raw) : {};
      }
    } catch {
      return {};
    }
    return {};
  }

  function mapHttpErrorType(status, errCode) {
    if (errCode) return errCode;
    if (status === 429) return "rate_limited";
    if (status === 401 || status === 403) return "invalid_key";
    if (status === 408 || status === 504) return "timeout";
    if (status === 502 || status === 503) return "upstream";
    return "server";
  }

  async function testAiEndpoint() {
    const target = resolveAiTarget();
    if (!target) {
      return { ok: false, configured: false, errorType: "unconfigured", reason: "No Supabase or AI Proxy URL configured" };
    }
    const start = performance.now();
    const controller = typeof AbortController !== "undefined" ? new AbortController() : null;
    const timer = controller ? setTimeout(() => controller.abort(), 15000) : null;
    try {
      const res = await fetch(target.url, {
        method: "POST",
        headers: target.headers,
        signal: controller ? controller.signal : undefined,
        body: JSON.stringify({ ping: true })
      });
      if (timer) clearTimeout(timer);
      const ms = Math.round(performance.now() - start);
      const data = await readJsonSafe(res);
      if (!res.ok) {
        return {
          ok: false,
          configured: true,
          mode: target.mode,
          latencyMs: ms,
          errorType: mapHttpErrorType(res.status, data?.errorCode),
          reason: data?.error || `HTTP ${res.status}`
        };
      }
      return {
        ok: Boolean(data?.ok !== false),
        configured: true,
        mode: target.mode,
        latencyMs: ms,
        supportedModels: data?.supportedModels || ["gemini-3.8-flash"],
        provider: data?.model || data?.provider || "gemini-3.8-flash"
      };
    } catch (err) {
      if (timer) clearTimeout(timer);
      const isTimeout = err?.name === "AbortError";
      return {
        ok: false,
        configured: true,
        mode: target.mode,
        errorType: isTimeout ? "timeout" : "network",
        reason: isTimeout ? "Request timed out" : (err?.message || "Network error")
      };
    }
  }

  async function askVexoraAI(message, lang, history, catalog, extras = {}) {
    const target = resolveAiTarget();
    if (!target) {
      return { ok: false, configured: false, errorType: "unconfigured", reason: "Backend not configured" };
    }
    const controller = typeof AbortController !== "undefined" ? new AbortController() : null;
    const timer = controller ? setTimeout(() => controller.abort(), 32000) : null;
    if (extras.signal && controller) {
      extras.signal.addEventListener("abort", () => controller.abort(), { once: true });
    }
    try {
      const res = await fetch(target.url, {
        method: "POST",
        headers: target.headers,
        signal: controller ? controller.signal : undefined,
        body: JSON.stringify({
          message,
          lang,
          history,
          catalog,
          stream: false,
          agent: extras.agent || "auto",
          mode: extras.mode || "fast",
          model: extras.model || undefined,
          attachments: extras.attachments || [],
          memories: extras.memories || [],
          ragSnippets: extras.ragSnippets || [],
          personalization: extras.personalization || {}
        })
      });
      if (timer) clearTimeout(timer);
      const data = await readJsonSafe(res);
      if (!res.ok || !data?.reply) {
        return {
          ok: false,
          configured: true,
          errorType: mapHttpErrorType(res.status, data?.errorCode),
          reason: data?.error || `HTTP ${res.status}`
        };
      }
      return {
        ok: true,
        configured: true,
        reply: data.reply,
        provider: data.model || data.provider || "gemini-3.8-flash",
        agent: data.agent || "general",
        mode: data.mode || "fast",
        thinkingSummary: data.thinkingSummary || "",
        sources: Array.isArray(data.sources) ? data.sources : [],
        toolsUsed: Array.isArray(data.toolsUsed) ? data.toolsUsed : [],
        tokensInput: Number(data.tokensInput || 0),
        tokensOutput: Number(data.tokensOutput || 0),
        tokensEstimated: Number(data.tokensEstimated || 0),
        latencyMs: Number(data.latencyMs || 0),
        logId: data.logId || ""
      };
    } catch (err) {
      if (timer) clearTimeout(timer);
      if (err?.name === "AbortError" && extras.signal?.aborted) {
        return { ok: false, configured: true, aborted: true, errorType: "aborted", reason: "Generation stopped by user" };
      }
      const isTimeout = err?.name === "AbortError";
      return {
        ok: false,
        configured: true,
        errorType: isTimeout ? "timeout" : "network",
        reason: isTimeout ? "AI request timed out" : (err?.message || "Network error")
      };
    }
  }

  async function askVexoraAIStream(payload, callbacks = {}, abortSignal = null) {
    const target = resolveAiTarget();
    if (!target) {
      return { ok: false, configured: false, errorType: "unconfigured", reason: "Backend not configured" };
    }
    const controller = typeof AbortController !== "undefined" ? new AbortController() : null;
    const timer = controller ? setTimeout(() => controller.abort(), 50000) : null;
    if (abortSignal && controller) {
      abortSignal.addEventListener("abort", () => controller.abort(), { once: true });
    }
    try {
      const res = await fetch(target.url, {
        method: "POST",
        headers: target.headers,
        signal: controller ? controller.signal : undefined,
        body: JSON.stringify({ ...payload, stream: true })
      });
      if (timer) clearTimeout(timer);
      const ctype = (res.headers?.get?.("content-type") || "").toLowerCase();

      if (!res.ok) {
        const errData = await readJsonSafe(res);
        return {
          ok: false,
          configured: true,
          errorType: mapHttpErrorType(res.status, errData?.errorCode),
          reason: errData?.error || `HTTP ${res.status}`
        };
      }

      if (!ctype.includes("text/event-stream") || !res.body?.getReader) {
        const data = await readJsonSafe(res);
        if (!data?.reply) {
          return { ok: false, configured: true, errorType: "server", reason: data?.error || "Empty AI response" };
        }
        callbacks.onDone?.(data);
        return { ok: true, configured: true, ...data };
      }

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";
      let finalPayload = null;
      let accText = "";
      let accThought = "";

      while (true) {
        const { value, done } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        const frames = buffer.split("\n\n");
        buffer = frames.pop() || "";

        for (const frame of frames) {
          const lines = frame.split("\n");
          let evName = "message";
          let dataStr = "";
          for (const line of lines) {
            if (line.startsWith("event:")) evName = line.slice(6).trim();
            else if (line.startsWith("data:")) dataStr += line.slice(5).trim();
          }
          if (!dataStr) continue;
          let parsed = null;
          try { parsed = JSON.parse(dataStr); } catch { continue; }
          if (evName === "meta") callbacks.onMeta?.(parsed);
          else if (evName === "tools") callbacks.onTools?.(parsed);
          else if (evName === "thought" && parsed.delta) {
            accThought += parsed.delta;
            callbacks.onThought?.(parsed.delta, accThought);
          } else if (evName === "delta" && parsed.delta) {
            accText += parsed.delta;
            callbacks.onDelta?.(parsed.delta, accText);
          } else if (evName === "done") {
            finalPayload = parsed;
            callbacks.onDone?.(parsed);
          } else if (evName === "error") {
            return { ok: false, configured: true, errorType: parsed.errorCode || "upstream", reason: parsed.error || "Stream failed" };
          }
        }
      }

      if (finalPayload) return { ok: true, configured: true, ...finalPayload };
      if (accText) return { ok: true, configured: true, reply: accText, thinkingSummary: accThought };
      return { ok: false, configured: true, errorType: "server", reason: "Stream closed without reply" };
    } catch (err) {
      if (timer) clearTimeout(timer);
      if (err?.name === "AbortError" && abortSignal?.aborted) {
        return { ok: false, configured: true, aborted: true, errorType: "aborted", reason: "Stopped by user" };
      }
      const isTimeout = err?.name === "AbortError";
      return {
        ok: false,
        configured: true,
        errorType: isTimeout ? "timeout" : "network",
        reason: isTimeout ? "AI stream timed out" : (err?.message || "Network error")
      };
    }
  }

  async function sendAiFeedback(logId, feedback) {
    const target = resolveAiTarget();
    if (!target || !logId) return;
    try {
      await fetch(target.url, {
        method: "POST",
        headers: target.headers,
        body: JSON.stringify({ action: "feedback", logId, feedback })
      });
    } catch {
      // Ignore
    }
  }

  async function embedRagChunks(chunks) {
    const target = resolveAiTarget();
    if (!target || !Array.isArray(chunks) || !chunks.length) return null;
    try {
      const res = await fetch(target.url, {
        method: "POST",
        headers: target.headers,
        body: JSON.stringify({ action: "embed_document", chunks })
      });
      if (!res.ok) return null;
      return await res.json();
    } catch {
      return null;
    }
  }

  async function upsertRagDocumentCloud(doc, chunks, isStudioScope = false) {
    const c = getConfig();
    if (!isConfigured()) return false;
    const headers = isStudioScope ? authHeaders(true) : clientAuthHeaders();
    const userId = isStudioScope ? getStoredAuth()?.userId : getStoredClientAuth()?.userId;
    if (!userId && !isStudioScope) return false;

    const docRes = await fetch(`${c.supabaseUrl}/rest/v1/ai_knowledge_docs`, {
      method: "POST",
      headers: { ...headers, Prefer: "resolution=merge-duplicates,return=minimal" },
      body: JSON.stringify({
        id: doc.id,
        scope: isStudioScope ? "studio" : "user",
        owner_user_id: userId || null,
        title: doc.title,
        mime_type: doc.mimeType || "text/plain",
        chunk_count: chunks.length,
        char_count: doc.charCount || 0,
        embedding_model: doc.embeddingModel || "",
        created_at: doc.createdAt || new Date().toISOString()
      })
    });
    if (!docRes.ok) return false;

    const chunkRows = chunks.map((ch, idx) => ({
      id: `${doc.id}_c${idx}`,
      doc_id: doc.id,
      scope: isStudioScope ? "studio" : "user",
      owner_user_id: userId || null,
      chunk_index: idx,
      content: ch.content,
      embedding: Array.isArray(ch.embedding) ? ch.embedding : null
    }));
    const chunkRes = await fetch(`${c.supabaseUrl}/rest/v1/ai_knowledge_chunks`, {
      method: "POST",
      headers: { ...headers, Prefer: "resolution=merge-duplicates,return=minimal" },
      body: JSON.stringify(chunkRows)
    });
    return chunkRes.ok;
  }

  async function deleteRagDocumentCloud(docId, isStudioScope = false) {
    const c = getConfig();
    if (!isConfigured()) return;
    const headers = isStudioScope ? authHeaders(true) : clientAuthHeaders();
    await fetch(`${c.supabaseUrl}/rest/v1/ai_knowledge_docs?id=eq.${encodeURIComponent(docId)}`, {
      method: "DELETE",
      headers
    }).catch(() => {});
  }

  /* =========================================================
     ECOSYSTEM EXTENSIONS (CRM, Tasks, Files, Finance, HR, Monitoring, Integrations, Automations)
     ========================================================= */
  const ALLOWED_CLIENT_FILE_EXT = new Set(["pdf", "png", "jpg", "jpeg", "webp", "docx", "xlsx", "csv", "txt", "zip", "json"]);

  async function uploadClientFile(file) {
    if (!file) throw new Error("No file selected.");
    if (file.size > 12 * 1024 * 1024) throw new Error("Max file size is 12 MB.");
    const ext = (file.name.split(".").pop() || "bin").replace(/[^a-zA-Z0-9]/g, "").toLowerCase();
    if (!ALLOWED_CLIENT_FILE_EXT.has(ext)) {
      throw new Error("Unsupported file type. Allowed: PDF, Images, DOCX, XLSX, CSV, TXT, ZIP, JSON.");
    }
    const c = getConfig();
    const client = getStoredClientAuth();
    const admin = getStoredAuth();
    const token = client?.access_token || admin?.access_token;
    const uid = client?.userId || admin?.userId || "anon";

    if (isConfigured() && token) {
      const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, "_").slice(0, 80);
      const filePath = `client-files/${uid}/${Date.now()}_${safeName}`;
      const res = await fetch(`${c.supabaseUrl}/storage/v1/object/${c.storageBucket}/${filePath}`, {
        method: "POST",
        headers: {
          apikey: c.supabaseAnonKey,
          Authorization: `Bearer ${token}`,
          "Content-Type": file.type || "application/octet-stream",
          "x-upsert": "true"
        },
        body: file
      });
      if (!res.ok) {
        const txt = await res.text();
        throw new Error(`Client file upload failed (${res.status}): ${txt}`);
      }
      return {
        fileName: file.name,
        fileUrl: `${c.supabaseUrl}/storage/v1/object/public/${c.storageBucket}/${filePath}`,
        mimeType: file.type || "application/octet-stream",
        sizeBytes: file.size,
        synced: true
      };
    }

    return {
      fileName: file.name,
      fileUrl: `session-file://${encodeURIComponent(file.name)}`,
      mimeType: file.type || "application/octet-stream",
      sizeBytes: file.size,
      synced: false
    };
  }

  function mapTaskFromDb(r) {
    return {
      id: r.id,
      projectId: r.project_id,
      title: r.title,
      phase: r.phase || "Development",
      status: r.status || "todo",
      priority: r.priority || "medium",
      assignedTo: r.assigned_to || "",
      dueDate: r.due_date || "",
      notes: r.notes || "",
      createdAt: r.created_at
    };
  }

  function mapTaskToDb(t) {
    return {
      id: t.id,
      project_id: t.projectId,
      title: t.title,
      phase: t.phase || "Development",
      status: t.status || "todo",
      priority: t.priority || "medium",
      assigned_to: t.assignedTo || "",
      due_date: t.dueDate || "",
      notes: t.notes || "",
      updated_at: new Date().toISOString()
    };
  }

  function mapCrmFromDb(r) {
    return {
      id: r.id,
      name: r.name,
      email: r.email,
      phone: r.phone || "",
      company: r.company || "",
      serviceInterest: r.service_interest || "",
      budgetEgp: Number(r.budget_egp || 0),
      currency: r.currency || "EGP",
      stage: r.stage || "new_lead",
      source: r.source || "website",
      assignedTo: r.assigned_to || "",
      notes: r.notes || "",
      activities: Array.isArray(r.activities) ? r.activities : [],
      convertedProjectId: r.converted_project_id || "",
      createdAt: r.created_at
    };
  }

  function mapCrmToDb(l) {
    return {
      id: l.id,
      name: l.name,
      email: l.email,
      phone: l.phone || "",
      company: l.company || "",
      service_interest: l.serviceInterest || "",
      budget_egp: Number(l.budgetEgp || 0),
      currency: l.currency || "EGP",
      stage: l.stage || "new_lead",
      source: l.source || "website",
      assigned_to: l.assignedTo || "",
      notes: l.notes || "",
      activities: Array.isArray(l.activities) ? l.activities : [],
      converted_project_id: l.convertedProjectId || "",
      updated_at: new Date().toISOString()
    };
  }

  function mapInvoiceFromDb(r) {
    return {
      id: r.id,
      invoiceNumber: r.invoice_number,
      clientUserId: r.client_user_id || "",
      clientName: r.client_name || "",
      clientEmail: r.client_email || "",
      projectId: r.project_id || "",
      currency: r.currency || "EGP",
      items: Array.isArray(r.items) ? r.items : [],
      subtotal: Number(r.subtotal || 0),
      taxPct: Number(r.tax_pct || 0),
      total: Number(r.total || 0),
      paidAmount: Number(r.paid_amount || 0),
      status: r.status || "draft",
      dueDate: r.due_date || "",
      notes: r.notes || "",
      createdAt: r.created_at
    };
  }

  function mapInvoiceToDb(inv) {
    return {
      id: inv.id,
      invoice_number: inv.invoiceNumber,
      client_user_id: inv.clientUserId || null,
      client_name: inv.clientName || "",
      client_email: inv.clientEmail || "",
      project_id: inv.projectId || "",
      currency: inv.currency || "EGP",
      items: Array.isArray(inv.items) ? inv.items : [],
      subtotal: Number(inv.subtotal || 0),
      tax_pct: Number(inv.taxPct || 0),
      total: Number(inv.total || 0),
      paid_amount: Number(inv.paidAmount || 0),
      status: inv.status || "draft",
      due_date: inv.dueDate || "",
      notes: inv.notes || "",
      updated_at: new Date().toISOString()
    };
  }

  function mapTransactionFromDb(r) {
    return {
      id: r.id,
      txType: r.tx_type,
      category: r.category || "project_payment",
      amount: Number(r.amount || 0),
      currency: r.currency || "EGP",
      projectId: r.project_id || "",
      invoiceId: r.invoice_id || "",
      description: r.description || "",
      occurredOn: r.occurred_on || "",
      createdBy: r.created_by || "",
      createdAt: r.created_at
    };
  }

  function mapTransactionToDb(tx) {
    return {
      id: tx.id,
      tx_type: tx.txType,
      category: tx.category || "project_payment",
      amount: Number(tx.amount || 0),
      currency: tx.currency || "EGP",
      project_id: tx.projectId || "",
      invoice_id: tx.invoiceId || "",
      description: tx.description || "",
      occurred_on: tx.occurredOn || new Date().toISOString().slice(0, 10),
      created_by: tx.createdBy || ""
    };
  }

  function mapJobAppFromDb(r) {
    return {
      id: r.id,
      applicantName: r.applicant_name,
      email: r.email,
      phone: r.phone || "",
      roleApplied: r.role_applied,
      specialization: r.specialization || "",
      experienceYears: Number(r.experience_years || 0),
      portfolioUrl: r.portfolio_url || "",
      cvSummary: r.cv_summary || "",
      status: r.status || "new",
      internalNotes: r.internal_notes || "",
      createdAt: r.created_at
    };
  }

  function mapJobAppToDb(a) {
    return {
      id: a.id,
      applicant_name: a.applicantName,
      email: a.email,
      phone: a.phone || "",
      role_applied: a.roleApplied,
      specialization: a.specialization || "",
      experience_years: Number(a.experienceYears || 0),
      portfolio_url: a.portfolioUrl || "",
      cv_summary: a.cvSummary || "",
      status: a.status || "new",
      internal_notes: a.internalNotes || "",
      updated_at: new Date().toISOString()
    };
  }

  function mapProjectFileFromDb(r) {
    return {
      id: r.id,
      projectId: r.project_id || "",
      requestId: r.request_id || "",
      clientUserId: r.client_user_id || "",
      clientEmail: r.client_email || "",
      fileName: r.file_name,
      fileUrl: r.file_url,
      mimeType: r.mime_type || "application/octet-stream",
      sizeBytes: Number(r.size_bytes || 0),
      uploadedBy: r.uploaded_by || "client",
      notes: r.notes || "",
      createdAt: r.created_at
    };
  }

  async function submitCrmLead(lead) {
    const c = getConfig();
    if (!isConfigured()) return { synced: false };
    const res = await fetch(`${c.supabaseUrl}/rest/v1/crm_leads`, {
      method: "POST",
      headers: { ...authHeaders(false), Prefer: "return=minimal" },
      body: JSON.stringify({ ...mapCrmToDb({ ...lead, stage: "new_lead" }), created_at: lead.createdAt || new Date().toISOString() })
    });
    if (!res.ok) throw new Error(`CRM submit failed (${res.status})`);
    return { synced: true };
  }

  async function submitJobApplication(app) {
    const c = getConfig();
    if (!isConfigured()) return { synced: false };
    const res = await fetch(`${c.supabaseUrl}/rest/v1/job_applications`, {
      method: "POST",
      headers: { ...authHeaders(false), Prefer: "return=minimal" },
      body: JSON.stringify({ ...mapJobAppToDb({ ...app, status: "new" }), created_at: app.createdAt || new Date().toISOString() })
    });
    if (!res.ok) throw new Error(`Job application submit failed (${res.status})`);
    return { synced: true };
  }

  async function fetchClientProjects() {
    const c = getConfig();
    const client = getStoredClientAuth();
    if (!isConfigured() || !client?.access_token) return null;
    const res = await fetch(`${c.supabaseUrl}/rest/v1/projects?published=eq.false&order=created_at.desc`, { headers: clientAuthHeaders() });
    if (!res.ok) return null;
    const rows = await res.json();
    return rows.map(mapProjectFromDb);
  }

  async function fetchClientProjectTasks() {
    const c = getConfig();
    const client = getStoredClientAuth();
    if (!isConfigured() || !client?.access_token) return null;
    const res = await fetch(`${c.supabaseUrl}/rest/v1/project_tasks?order=created_at.asc`, { headers: clientAuthHeaders() });
    if (!res.ok) return null;
    const rows = await res.json();
    return rows.map(mapTaskFromDb);
  }

  async function fetchClientFiles() {
    const c = getConfig();
    const client = getStoredClientAuth();
    if (!isConfigured() || !client?.access_token) return null;
    const res = await fetch(`${c.supabaseUrl}/rest/v1/project_files?order=created_at.desc`, { headers: clientAuthHeaders() });
    if (!res.ok) return null;
    const rows = await res.json();
    return rows.map(mapProjectFileFromDb);
  }

  async function upsertProjectFileRecord(rec) {
    const c = getConfig();
    const client = getStoredClientAuth();
    const admin = getStoredAuth();
    if (!isConfigured() || (!client?.access_token && !admin?.access_token)) return { synced: false };
    const headers = admin?.access_token ? authHeaders(true) : clientAuthHeaders();
    const res = await fetch(`${c.supabaseUrl}/rest/v1/project_files`, {
      method: "POST",
      headers: { ...headers, Prefer: "resolution=merge-duplicates,return=minimal" },
      body: JSON.stringify({
        id: rec.id,
        project_id: rec.projectId || "",
        request_id: rec.requestId || "",
        client_user_id: rec.clientUserId || client?.userId || null,
        client_email: rec.clientEmail || client?.email || "",
        file_name: rec.fileName,
        file_url: rec.fileUrl,
        mime_type: rec.mimeType || "application/octet-stream",
        size_bytes: Number(rec.sizeBytes || 0),
        uploaded_by: rec.uploadedBy || (admin?.access_token ? "admin" : "client"),
        notes: rec.notes || "",
        created_at: rec.createdAt || new Date().toISOString()
      })
    });
    if (!res.ok) throw new Error(`Save file metadata failed (${res.status})`);
    return { synced: true };
  }

  async function fetchClientInvoices() {
    const c = getConfig();
    const client = getStoredClientAuth();
    if (!isConfigured() || !client?.access_token) return null;
    const res = await fetch(`${c.supabaseUrl}/rest/v1/finance_invoices?order=created_at.desc`, { headers: clientAuthHeaders() });
    if (!res.ok) return null;
    const rows = await res.json();
    return rows.map(mapInvoiceFromDb);
  }

  async function fetchClientUpdates() {
    const c = getConfig();
    const client = getStoredClientAuth();
    if (!isConfigured() || !client?.access_token) return null;
    const res = await fetch(`${c.supabaseUrl}/rest/v1/updates_feed?order=pinned.desc,created_at.desc`, { headers: clientAuthHeaders() });
    if (!res.ok) return null;
    const rows = await res.json();
    return rows.map(mapUpdateFromDb);
  }

  async function logSystemEvent(entry) {
    const c = getConfig();
    if (!isConfigured()) return;
    try {
      await fetch(`${c.supabaseUrl}/rest/v1/system_logs`, {
        method: "POST",
        headers: { ...authHeaders(false), Prefer: "return=minimal" },
        body: JSON.stringify({
          id: entry.id || `syslog_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
          source: String(entry.source || "frontend").slice(0, 60),
          severity: ["info", "warn", "error", "critical"].includes(entry.severity) ? entry.severity : "info",
          message: String(entry.message || "").slice(0, 500),
          route: String(entry.route || "").slice(0, 60),
          details: entry.details || {},
          resolved: false,
          created_at: entry.createdAt || new Date().toISOString()
        })
      });
    } catch {
      // Never cascade monitoring errors
    }
  }

  async function triggerAutomation(triggerEvent, payload = {}) {
    if (!isConfigured() || !getStoredAuth()?.access_token) {
      return { ok: false, localOnly: true };
    }
    return await callAdminGateway("run_automation_event", { triggerEvent, payload });
  }

  window.VexoraBackend = {
    getConfig,
    savePublicConfigOverride,
    clearPublicConfigOverride,
    isConfigured,
    isAiConfigured,
    getStoredAuth,
    getStoredClientAuth,
    testConnection,
    testAiEndpoint,
    fetchPublicCatalog,
    signInAdmin,
    signOutAdmin,
    signUpClient,
    signInClient,
    signOutClient,
    upsertService: (s) => upsertRow("services", mapServiceToDb(s)),
    deleteService: (id) => deleteRow("services", id),
    upsertProject: (p) => upsertRow("projects", mapProjectToDb(p)),
    deleteProject: (id) => deleteRow("projects", id),
    upsertProjectTask: (t) => upsertRow("project_tasks", mapTaskToDb(t)),
    deleteProjectTask: (id) => deleteRow("project_tasks", id),
    upsertTeamMember: (m) => upsertRow("team_members", mapTeamToDb(m)),
    deleteTeamMember: (id) => deleteRow("team_members", id),
    upsertKnowledgeItem: (k) => upsertRow("knowledge_base", mapKbToDb(k)),
    deleteKnowledgeItem: (id) => deleteRow("knowledge_base", id),
    upsertFaq: (f) => upsertRow("faqs", mapFaqToDb(f)),
    deleteFaq: (id) => deleteRow("faqs", id),
    upsertUpdateItem: (u) => upsertRow("updates_feed", mapUpdateToDb(u)),
    deleteUpdateItem: (id) => deleteRow("updates_feed", id),
    upsertRelease: (rel) => upsertRow("site_releases", mapReleaseToDb(rel)),
    deleteRelease: (id) => deleteRow("site_releases", id),
    updateSiteSettings: (s) => upsertRow("site_settings", mapSettingsToDb(s)),
    submitCrmLead,
    upsertCrmLead: (l) => upsertRow("crm_leads", mapCrmToDb(l)),
    deleteCrmLead: (id) => deleteRow("crm_leads", id),
    upsertInvoice: (inv) => upsertRow("finance_invoices", mapInvoiceToDb(inv)),
    deleteInvoice: (id) => deleteRow("finance_invoices", id),
    upsertTransaction: (tx) => upsertRow("finance_transactions", mapTransactionToDb(tx)),
    deleteTransaction: (id) => deleteRow("finance_transactions", id),
    submitJobApplication,
    upsertJobApplication: (a) => upsertRow("job_applications", mapJobAppToDb(a)),
    deleteJobApplication: (id) => deleteRow("job_applications", id),
    upsertProjectFileRecord,
    deleteProjectFileRecord: (id) => deleteRow("project_files", id),
    uploadClientFile,
    fetchClientProjects,
    fetchClientProjectTasks,
    fetchClientFiles,
    fetchClientInvoices,
    fetchClientUpdates,
    logSystemEvent,
    resolveSystemLog: (id, resolved) => upsertRow("system_logs", { id, resolved: Boolean(resolved) }),
    upsertIntegrationConfig: (cfg) => upsertRow("integration_configs", {
      key: cfg.key,
      name_en: cfg.nameEn,
      name_ar: cfg.nameAr,
      category: cfg.category || "core",
      enabled: cfg.enabled !== false,
      status: cfg.status || "connected",
      config: cfg.config || {},
      last_checked_at: cfg.lastCheckedAt || new Date().toISOString(),
      updated_at: new Date().toISOString()
    }),
    upsertAutomationRule: (rule) => upsertRow("automation_rules", {
      key: rule.key,
      name_en: rule.nameEn,
      name_ar: rule.nameAr,
      trigger_event: rule.triggerEvent,
      action_summary: rule.actionSummary || "",
      enabled: rule.enabled !== false,
      run_count: Number(rule.runCount || 0),
      last_run_at: rule.lastRunAt || null,
      updated_at: new Date().toISOString()
    }),
    triggerAutomation,
    submitProjectRequest,
    fetchClientRequests,
    fetchAllRequestsAdmin,
    updateProjectRequestAdmin,
    deleteProjectRequest: (id) => deleteRow("project_requests", id),
    submitContactMessage,
    fetchClientMessages,
    fetchAdminMessages,
    updateMessageStatus,
    deleteMessage: (id) => deleteRow("contact_messages", id),
    trackAnalyticsEvent,
    fetchAnalyticsSummary,
    recordLoginAttempt,
    recordAuditLog,
    callAdminGateway,
    uploadImageFile,
    askVexoraAI,
    askVexoraAIStream,
    sendAiFeedback,
    embedRagChunks,
    upsertRagDocumentCloud,
    deleteRagDocumentCloud,
    mappers: {
      mapTaskFromDb,
      mapCrmFromDb,
      mapInvoiceFromDb,
      mapTransactionFromDb,
      mapJobAppFromDb,
      mapProjectFileFromDb
    }
  };
})();
