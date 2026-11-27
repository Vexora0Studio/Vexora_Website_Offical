// Vexora Studio — Lightweight Supabase REST, Auth, Storage & Edge Function Client
// Zero external bundler dependencies; works natively on GitHub Pages.

(function () {
  const OVERRIDE_KEY = "vexora_supabase_public_cfg";
  const AUTH_SESSION_KEY = "vexora_supabase_auth_session";

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
      supabaseUrl: String(override.supabaseUrl || base.supabaseUrl || "").replace(/\/+$/, ""),
      supabaseAnonKey: String(override.supabaseAnonKey || base.supabaseAnonKey || "").trim(),
      aiFunctionName: String(override.aiFunctionName || base.aiFunctionName || "vexora-ai").trim(),
      storageBucket: String(base.storageBucket || "vexora-media").trim()
    };
  }

  function savePublicConfigOverride(cfg) {
    try {
      localStorage.setItem(
        OVERRIDE_KEY,
        JSON.stringify({
          supabaseUrl: String(cfg.supabaseUrl || "").trim().replace(/\/+$/, ""),
          supabaseAnonKey: String(cfg.supabaseAnonKey || "").trim(),
          aiFunctionName: String(cfg.aiFunctionName || "vexora-ai").trim() || "vexora-ai"
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
    const [settingsRes, servicesRes, projectsRes, teamRes] = await Promise.all([
      fetch(`${base}/site_settings?id=eq.main&limit=1`, { headers }),
      fetch(`${base}/services?order=sort_order.asc`, { headers }),
      fetch(`${base}/projects?order=created_at.desc`, { headers }),
      fetch(`${base}/team_members?order=sort_order.asc`, { headers })
    ]);
    if (!servicesRes.ok || !projectsRes.ok || !teamRes.ok) {
      throw new Error("Failed to load Supabase catalog");
    }
    const [settingsRows, servicesRows, projectsRows, teamRows] = await Promise.all([
      settingsRes.ok ? settingsRes.json() : [],
      servicesRes.json(),
      projectsRes.json(),
      teamRes.json()
    ]);

    return {
      settings: settingsRows?.[0] ? mapSettingsFromDb(settingsRows[0]) : null,
      services: servicesRows.map(mapServiceFromDb),
      projects: projectsRows.map(mapProjectFromDb),
      team: teamRows.map(mapTeamFromDb)
    };
  }

  function mapSettingsFromDb(r) {
    return {
      companyName: r.company_name || "Vexora Studio",
      taglineEn: r.tagline_en || "Building The Future Through Code.",
      taglineAr: r.tagline_ar || "نبني المستقبل عبر البرمجة.",
      homeDescEn: r.home_desc_en || "",
      homeDescAr: r.home_desc_ar || "",
      officialEmail: r.official_email || "vexora0studio@gmail.com",
      githubUrl: r.github_url || "",
      linkedinUrl: r.linkedin_url || "",
      youtubeUrl: r.youtube_url || "",
      websiteUrl: r.website_url || "https://vexora0studio.github.io/Vexora_Website_Offical/"
    };
  }

  function mapSettingsToDb(s) {
    return {
      id: "main",
      company_name: s.companyName,
      tagline_en: s.taglineEn,
      tagline_ar: s.taglineAr,
      home_desc_en: s.homeDescEn,
      home_desc_ar: s.homeDescAr,
      official_email: s.officialEmail,
      github_url: s.githubUrl || "",
      linkedin_url: s.linkedinUrl || "",
      youtube_url: s.youtubeUrl || "",
      website_url: s.websiteUrl || "",
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
      status: r.status || "In Progress",
      technologies: Array.isArray(r.technologies) ? r.technologies : [],
      websiteUrl: r.website_url || "",
      imageUrl: r.image_url || "",
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
      status: p.status || "In Progress",
      technologies: p.technologies || [],
      website_url: p.websiteUrl || "",
      image_url: p.imageUrl || "",
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
      throw new Error(data?.error_description || data?.msg || "Invalid email or password");
    }
    // Verify admin_users RLS membership
    const adminCheck = await fetch(
      `${c.supabaseUrl}/rest/v1/admin_users?user_id=eq.${encodeURIComponent(data.user.id)}&select=user_id,role`,
      {
        headers: {
          apikey: c.supabaseAnonKey,
          Authorization: `Bearer ${data.access_token}`
        }
      }
    );
    const adminRows = adminCheck.ok ? await adminCheck.json() : [];
    if (!Array.isArray(adminRows) || adminRows.length === 0) {
      throw new Error("Account is authenticated but not authorized in admin_users.");
    }
    const session = {
      access_token: data.access_token,
      email: data.user?.email || email,
      userId: data.user?.id
    };
    setStoredAuth(session);
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

  async function submitContactMessage(msg) {
    const c = getConfig();
    if (!isConfigured()) return { synced: false };
    const res = await fetch(`${c.supabaseUrl}/rest/v1/contact_messages`, {
      method: "POST",
      headers: {
        ...authHeaders(false),
        Prefer: "return=minimal"
      },
      body: JSON.stringify({
        id: msg.id,
        sender_name: msg.senderName,
        email: msg.email,
        subject: msg.subject,
        message: msg.message,
        service_requested: msg.serviceRequested || "",
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

  async function fetchAdminMessages() {
    const c = getConfig();
    if (!isConfigured() || !getStoredAuth()?.access_token) return null;
    const res = await fetch(`${c.supabaseUrl}/rest/v1/contact_messages?order=created_at.desc`, {
      headers: authHeaders(true)
    });
    if (!res.ok) throw new Error(`Fetch messages failed (${res.status})`);
    const rows = await res.json();
    return rows.map((r) => ({
      id: r.id,
      senderName: r.sender_name,
      email: r.email,
      subject: r.subject,
      message: r.message,
      serviceRequested: r.service_requested || "",
      status: r.status || "new",
      createdAt: r.created_at
    }));
  }

  async function updateMessageStatus(id, status) {
    const c = getConfig();
    const res = await fetch(`${c.supabaseUrl}/rest/v1/contact_messages?id=eq.${encodeURIComponent(id)}`, {
      method: "PATCH",
      headers: authHeaders(true),
      body: JSON.stringify({ status })
    });
    if (!res.ok) throw new Error(`Update message failed (${res.status})`);
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

  async function askVexoraAI(message, lang, history, catalog) {
    const c = getConfig();
    if (!isConfigured()) {
      return { ok: false, configured: false, reason: "Backend not configured" };
    }
    try {
      const res = await fetch(`${c.supabaseUrl}/functions/v1/${c.aiFunctionName}`, {
        method: "POST",
        headers: authHeaders(false),
        body: JSON.stringify({ message, lang, history, catalog })
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok || !data?.reply) {
        return {
          ok: false,
          configured: true,
          reason: data?.error || `HTTP ${res.status}`
        };
      }
      return { ok: true, configured: true, reply: data.reply, provider: data.provider || "gemini" };
    } catch (err) {
      return { ok: false, configured: true, reason: err?.message || "Network error" };
    }
  }

  window.VexoraBackend = {
    getConfig,
    savePublicConfigOverride,
    clearPublicConfigOverride,
    isConfigured,
    getStoredAuth,
    testConnection,
    fetchPublicCatalog,
    signInAdmin,
    signOutAdmin,
    upsertService: (s) => upsertRow("services", mapServiceToDb(s)),
    deleteService: (id) => deleteRow("services", id),
    upsertProject: (p) => upsertRow("projects", mapProjectToDb(p)),
    deleteProject: (id) => deleteRow("projects", id),
    upsertTeamMember: (m) => upsertRow("team_members", mapTeamToDb(m)),
    deleteTeamMember: (id) => deleteRow("team_members", id),
    updateSiteSettings: (s) => upsertRow("site_settings", mapSettingsToDb(s)),
    submitContactMessage,
    fetchAdminMessages,
    updateMessageStatus,
    deleteMessage: (id) => deleteRow("contact_messages", id),
    uploadImageFile,
    askVexoraAI
  };
})();
