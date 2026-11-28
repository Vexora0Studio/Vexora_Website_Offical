// Vexora Studio — Enterprise Ecosystem Module (CRM, Project Tasks, Finance EGP, HR Careers, Monitoring, Integrations & Automations)
(function () {
  const DEFAULT_INTEGRATIONS = [
    { key: "vexora_ai", nameEn: "Vexora AI Platform", nameAr: "منصة Vexora AI الذكية", category: "ai", enabled: true, status: "connected" },
    { key: "gemini_api", nameEn: "Gemini 3.8 Flash (Edge)", nameAr: "محرك Gemini 3.8 Flash (خادم آمن)", category: "ai", enabled: true, status: "connected" },
    { key: "admin_panel", nameEn: "Enterprise Admin Panel", nameAr: "لوحة الإدارة المؤسسية", category: "core", enabled: true, status: "connected" },
    { key: "customer_portal", nameEn: "Customer Portal & Vault", nameAr: "بوابة العملاء وملفات المشاريع", category: "core", enabled: true, status: "connected" },
    { key: "supabase_db", nameEn: "Supabase DB & Storage", nameAr: "قاعدة بيانات وتخزين Supabase", category: "infrastructure", enabled: true, status: "connected" },
    { key: "notifications", nameEn: "Notifications Hub", nameAr: "مركز الإشعارات والتحديثات", category: "messaging", enabled: true, status: "connected" },
    { key: "project_mgmt", nameEn: "Project & Task Orchestrator", nameAr: "منظومة المشاريع والمهام", category: "operations", enabled: true, status: "connected" }
  ];

  const DEFAULT_AUTOMATION_RULES = [
    {
      key: "notify_client_status",
      nameEn: "Notify Client on Status Change",
      nameAr: "إشعار العميل عند تغير حالة الطلب أو المشروع",
      triggerEvent: "status_changed",
      actionSummary: "Send targeted notification to client email",
      enabled: true,
      runCount: 0,
      lastRunAt: ""
    },
    {
      key: "alert_admin_inbound",
      nameEn: "Alert Admin on New Inbound Activity",
      nameAr: "تنبيه الإدارة عند وصول طلب أو عميل أو رسالة أو طلب توظيف",
      triggerEvent: "inbound_created",
      actionSummary: "Create high-priority admin alert in Updates & Monitoring",
      enabled: true,
      runCount: 0,
      lastRunAt: ""
    },
    {
      key: "auto_project_from_request",
      nameEn: "Auto-Create Project & Tasks on Request Accept",
      nameAr: "إنشاء مشروع ومهام أولية تلقائياً عند قبول طلب العميل",
      triggerEvent: "request_accepted",
      actionSummary: "Create linked project + 4 milestone tasks",
      enabled: true,
      runCount: 0,
      lastRunAt: ""
    },
    {
      key: "alert_system_error",
      nameEn: "Alert Admin on System / API Error",
      nameAr: "تنبيه الإدارة عند حدوث خطأ تقني أو انقطاع API",
      triggerEvent: "system_error",
      actionSummary: "Record alert in System Monitoring & Admin Alerts",
      enabled: true,
      runCount: 0,
      lastRunAt: ""
    },
    {
      key: "notify_on_release",
      nameEn: "Send Notification on New Release",
      nameAr: "إرسال إشعار للجميع عند نشر إصدار جديد",
      triggerEvent: "release_published",
      actionSummary: "Broadcast release announcement in Updates Center",
      enabled: true,
      runCount: 0,
      lastRunAt: ""
    }
  ];

  function ensureEcosystemState(studioState) {
    if (!Array.isArray(studioState.crmLeads)) studioState.crmLeads = [];
    if (!Array.isArray(studioState.projectTasks)) studioState.projectTasks = [];
    if (!Array.isArray(studioState.projectFiles)) studioState.projectFiles = [];
    if (!Array.isArray(studioState.financeInvoices)) studioState.financeInvoices = [];
    if (!Array.isArray(studioState.financeTransactions)) studioState.financeTransactions = [];
    if (!Array.isArray(studioState.jobApplications)) studioState.jobApplications = [];
    if (!Array.isArray(studioState.systemLogs)) studioState.systemLogs = [];
    if (!Array.isArray(studioState.integrationConfigs) || studioState.integrationConfigs.length === 0) {
      studioState.integrationConfigs = DEFAULT_INTEGRATIONS.map((x) => ({ ...x, lastCheckedAt: "" }));
    }
    if (!Array.isArray(studioState.automationRules) || studioState.automationRules.length === 0) {
      studioState.automationRules = DEFAULT_AUTOMATION_RULES.map((x) => ({ ...x }));
    }
    if (!Array.isArray(studioState.automationLogs)) studioState.automationLogs = [];
    return studioState;
  }

  function formatCurrency(amount, currency = "EGP") {
    const val = Number(amount || 0);
    try {
      return new Intl.NumberFormat("en-US", { maximumFractionDigits: 2 }).format(val) + " " + (currency || "EGP");
    } catch {
      return `${val} ${currency || "EGP"}`;
    }
  }

  function csvCell(v) {
    return `"${String(v ?? "").replaceAll('"', '""')}"`;
  }

  function downloadFile(filename, content, mime = "text/csv;charset=utf-8") {
    const blob = new Blob([content], { type: mime });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  }

  function recomputeProjectProgress(projectId, studioState, Backend) {
    const proj = (studioState.projects || []).find((p) => p.id === projectId);
    if (!proj) return;
    const tasks = (studioState.projectTasks || []).filter((t) => t.projectId === projectId);
    if (tasks.length === 0) return;
    const done = tasks.filter((t) => t.status === "done").length;
    const review = tasks.filter((t) => t.status === "review").length;
    const inProg = tasks.filter((t) => t.status === "in_progress").length;
    const weighted = Math.round(((done + review * 0.75 + inProg * 0.4) / tasks.length) * 100);
    proj.progressPct = Math.max(0, Math.min(100, weighted));
    if (done === tasks.length && proj.status !== "Completed") {
      proj.currentPhase = "Ready for Delivery";
    }
    if (Backend?.isConfigured?.() && Backend?.getStoredAuth?.()?.access_token) {
      Backend.upsertProject(proj).catch(() => {});
    }
  }

  async function logSystemIssue(ctx, entry) {
    const { studioState, saveState, Backend } = ctx;
    ensureEcosystemState(studioState);
    const row = {
      id: entry.id || `syslog_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
      source: entry.source || "frontend",
      severity: entry.severity || "info",
      message: String(entry.message || "").slice(0, 500),
      route: entry.route || "",
      details: entry.details || {},
      resolved: false,
      createdAt: new Date().toISOString()
    };
    studioState.systemLogs.unshift(row);
    if (studioState.systemLogs.length > 250) studioState.systemLogs = studioState.systemLogs.slice(0, 250);
    saveState?.();
    if (Backend?.logSystemEvent) Backend.logSystemEvent(row);
    if ((row.severity === "error" || row.severity === "critical") && !entry.skipAutomation) {
      await runAutomationEvent({ studioState, saveState, Backend }, "system_error", {
        source: row.source,
        message: row.message
      });
    }
    return row;
  }

  async function runAutomationEvent(ctx, triggerEvent, payload = {}) {
    const { studioState, saveState, Backend } = ctx;
    ensureEcosystemState(studioState);
    const rule = studioState.automationRules.find((r) => r.triggerEvent === triggerEvent);
    const now = new Date().toISOString();

    if (!rule || rule.enabled === false) {
      studioState.automationLogs.unshift({
        id: `autolog_${Date.now()}_${Math.random().toString(36).slice(2, 5)}`,
        ruleKey: rule?.key || triggerEvent,
        triggerEvent,
        status: "skipped",
        summary: `Rule disabled or missing (${triggerEvent})`,
        payload,
        createdAt: now
      });
      if (studioState.automationLogs.length > 200) studioState.automationLogs = studioState.automationLogs.slice(0, 200);
      saveState?.();
      return { executed: false, skipped: true };
    }

    let summary = "";
    let serverSynced = false;

    if (Backend?.isConfigured?.() && Backend?.getStoredAuth?.()?.access_token) {
      try {
        const res = await Backend.triggerAutomation(triggerEvent, payload);
        if (res?.ok && res?.executed) {
          serverSynced = true;
          summary = res.summary || triggerEvent;
          if (res.createdProject && Backend.mappers) {
            const p = {
              id: res.createdProject.id,
              nameEn: res.createdProject.name_en,
              nameAr: res.createdProject.name_ar,
              descriptionEn: res.createdProject.description_en,
              descriptionAr: res.createdProject.description_ar,
              category: res.createdProject.category,
              status: res.createdProject.status,
              progressPct: res.createdProject.progress_pct || 10,
              currentPhase: res.createdProject.current_phase || "Architecture & Setup",
              clientUserId: res.createdProject.client_user_id || "",
              clientEmail: res.createdProject.client_email || "",
              technologies: res.createdProject.technologies || [],
              assignedTeam: res.createdProject.assigned_team || [],
              featured: false,
              published: false
            };
            if (!studioState.projects.some((x) => x.id === p.id)) studioState.projects.unshift(p);
          }
          if (Array.isArray(res.createdTasks) && Backend.mappers?.mapTaskFromDb) {
            for (const rt of res.createdTasks) {
              const mt = Backend.mappers.mapTaskFromDb(rt);
              if (!studioState.projectTasks.some((x) => x.id === mt.id)) studioState.projectTasks.push(mt);
            }
          }
          if (res.createdUpdate) {
            const ru = res.createdUpdate;
            const u = {
              id: ru.id,
              kind: ru.kind,
              titleEn: ru.title_en,
              titleAr: ru.title_ar,
              bodyEn: ru.body_en,
              bodyAr: ru.body_ar,
              imageUrl: "",
              targetRoute: ru.target_route || "updates",
              targetGroup: ru.target_group || "all",
              targetEmail: ru.target_email || "",
              deliveryStatus: "published",
              pinned: Boolean(ru.pinned),
              published: true,
              createdAt: now
            };
            if (!studioState.updates.some((x) => x.id === u.id)) studioState.updates.unshift(u);
          }
        }
      } catch {
        serverSynced = false;
      }
    }

    if (!serverSynced) {
      const targetClientEmail = payload.clientEmail || payload.targetEmail || "";
      if (triggerEvent === "status_changed" && targetClientEmail) {
        const upd = {
          id: `upd_auto_${Date.now()}_${Math.random().toString(36).slice(2, 5)}`,
          kind: "notification",
          titleEn: `Status Update: ${payload.title || "Your Project"}`,
          titleAr: `تحديث الحالة: ${payload.title || "مشروعك"}`,
          bodyEn: `Status updated to "${payload.status || "updated"}". ${payload.note || ""}`.trim(),
          bodyAr: `تم تحديث الحالة إلى "${payload.status || "محدّث"}". ${payload.note || ""}`.trim(),
          imageUrl: "",
          targetRoute: "client",
          targetGroup: "specific_email",
          targetEmail: String(targetClientEmail).toLowerCase(),
          deliveryStatus: "published",
          pinned: false,
          published: true,
          createdAt: now
        };
        studioState.updates.unshift(upd);
        if (Backend?.isConfigured?.() && Backend?.getStoredAuth?.()?.access_token) {
          Backend.upsertUpdateItem(upd).catch(() => {});
        }
        summary = `Notified ${targetClientEmail} (${payload.status})`;
      } else if (triggerEvent === "request_accepted" && (payload.requestId || payload.request?.id)) {
        const reqData = payload.request || {};
        const reqIdVal = payload.requestId || reqData.id;
        const cleanReq = String(reqIdVal).replace(/[^a-zA-Z0-9_-]/g, "").slice(0, 24);
        const projId = `proj_req_${cleanReq}`;
        if (!studioState.projects.some((x) => x.id === projId)) {
          const title = String(payload.projectTitle || reqData.projectTitle || "Client Software Project");
          const proj = {
            id: projId,
            nameEn: title,
            nameAr: title,
            descriptionEn: payload.description || reqData.description || "Client project generated automatically upon request acceptance.",
            descriptionAr: payload.description || reqData.description || "مشروع برمجي تم إنشاؤه تلقائياً عند قبول طلب العميل.",
            category: payload.category || "Software Systems",
            status: "In Progress",
            progressPct: 10,
            deadline: "",
            currentPhase: "Architecture & Setup",
            clientUserId: payload.clientUserId || reqData.clientUserId || "",
            clientEmail: String(payload.clientEmail || reqData.clientEmail || "").toLowerCase(),
            budgetEgp: Number(payload.budgetEgp || 0),
            technologies: payload.technologies || ["Web", "Cloud", "API"],
            assignedTeam: [],
            changeHistory: [{ at: now, actor: "automation", summary: "Auto-created from accepted client request" }],
            websiteUrl: "",
            imageUrl: "",
            videoUrl: "",
            presetImageKey: "web",
            featured: false,
            published: false
          };
          studioState.projects.unshift(proj);
          const starter = [
            { title: "Discovery & Technical Architecture", phase: "Planning", status: "in_progress", priority: "high" },
            { title: "UI/UX Wireframes & System Design", phase: "Design", status: "todo", priority: "medium" },
            { title: "Core Engineering & API Integration", phase: "Development", status: "todo", priority: "high" },
            { title: "QA Testing & Client Review", phase: "QA", status: "todo", priority: "medium" }
          ];
          starter.forEach((st, idx) => {
            const tsk = {
              id: `tsk_${projId}_${idx + 1}`,
              projectId: projId,
              title: st.title,
              phase: st.phase,
              status: st.status,
              priority: st.priority,
              assignedTo: "",
              dueDate: "",
              notes: "",
              createdAt: now
            };
            studioState.projectTasks.push(tsk);
            if (Backend?.isConfigured?.() && Backend?.getStoredAuth?.()?.access_token) {
              Backend.upsertProjectTask(tsk).catch(() => {});
            }
          });
          if (Backend?.isConfigured?.() && Backend?.getStoredAuth?.()?.access_token) {
            Backend.upsertProject(proj).catch(() => {});
          }
          summary = `Auto-created project ${title} + 4 starter tasks`;
        } else {
          summary = `Project ${projId} already exists`;
        }
      } else if (triggerEvent === "release_published") {
        const ver = payload.version || "1.0.0";
        const upd = {
          id: `upd_rel_${Date.now()}`,
          kind: "update",
          titleEn: `New Release ${ver}: ${payload.titleEn || "Vexora Studio Update"}`,
          titleAr: `إصدار جديد ${ver}: ${payload.titleAr || "تحديث Vexora Studio"}`,
          bodyEn: payload.changelogEn || payload.descriptionEn || "New features and improvements are now live.",
          bodyAr: payload.changelogAr || payload.descriptionAr || "تم إطلاق تحديثات وتحسينات جديدة على المنصة.",
          imageUrl: "",
          targetRoute: "updates",
          targetGroup: "all",
          targetEmail: "",
          deliveryStatus: "published",
          pinned: true,
          published: true,
          createdAt: now
        };
        studioState.updates.unshift(upd);
        if (Backend?.isConfigured?.() && Backend?.getStoredAuth?.()?.access_token) {
          Backend.upsertUpdateItem(upd).catch(() => {});
        }
        summary = `Release notification broadcast for v${ver}`;
      } else if (triggerEvent === "inbound_created" || triggerEvent === "system_error") {
        const isErr = triggerEvent === "system_error";
        const upd = {
          id: `upd_adm_${Date.now()}_${Math.random().toString(36).slice(2, 5)}`,
          kind: "notification",
          titleEn: isErr ? `System Error Alert: ${payload.source || "Runtime"}` : `New Inbound: ${payload.kind || payload.source || "Lead/Request"}`,
          titleAr: isErr ? `تنبيه خطأ نظام: ${payload.source || "النظام"}` : `نشاط وارد جديد: ${payload.kind || payload.source || "طلب/عميل"}`,
          bodyEn: String(payload.message || payload.title || "Check Admin Panel for details."),
          bodyAr: String(payload.message || payload.title || "يرجى المراجعة من لوحة التحكم الإدارية."),
          imageUrl: "",
          targetRoute: "admin",
          targetGroup: "admins",
          targetEmail: "",
          deliveryStatus: "published",
          pinned: false,
          published: true,
          createdAt: now
        };
        studioState.updates.unshift(upd);
        summary = upd.titleEn;
      }
    }

    rule.runCount = Number(rule.runCount || 0) + 1;
    rule.lastRunAt = now;
    studioState.automationLogs.unshift({
      id: `autolog_${Date.now()}_${Math.random().toString(36).slice(2, 5)}`,
      ruleKey: rule.key,
      triggerEvent,
      status: "ok",
      summary: summary || `Triggered ${triggerEvent}`,
      payload,
      createdAt: now
    });
    if (studioState.automationLogs.length > 200) studioState.automationLogs = studioState.automationLogs.slice(0, 200);
    saveState?.();
    return { executed: true, summary };
  }

  /* =========================================================
     CRM SYSTEM MANAGER
     ========================================================= */
  let crmUi = { stageFilter: "all", search: "" };

  function renderCrmManager(body, ctx, session) {
    const { t, isArabic, escapeHtml, Backend, studioState, saveState, showToast } = ctx;
    ensureEcosystemState(studioState);
    const leads = studioState.crmLeads || [];
    const sq = crmUi.search.trim().toLowerCase();
    const filtered = leads
      .filter((l) => crmUi.stageFilter === "all" || l.stage === crmUi.stageFilter)
      .filter((l) => !sq || `${l.name} ${l.email} ${l.company} ${l.serviceInterest}`.toLowerCase().includes(sq));

    const stages = [
      { key: "new_lead", ar: "عميل محتمل جديد", en: "New Lead", cls: "cyan" },
      { key: "qualified", ar: "مؤهل", en: "Qualified", cls: "cyan" },
      { key: "proposal_sent", ar: "تم إرسال العرض", en: "Proposal Sent", cls: "warning" },
      { key: "negotiation", ar: "تفاوض", en: "Negotiation", cls: "warning" },
      { key: "won", ar: "تم التعاقد (Won)", en: "Won", cls: "success" },
      { key: "lost", ar: "خسارة (Lost)", en: "Lost", cls: "error" }
    ];

    const totalVal = leads.filter((l) => l.stage !== "lost").reduce((a, b) => a + Number(b.budgetEgp || 0), 0);
    const wonLeads = leads.filter((l) => l.stage === "won");
    const wonVal = wonLeads.reduce((a, b) => a + Number(b.budgetEgp || 0), 0);
    const convRate = leads.length ? Math.round((wonLeads.length / leads.length) * 100) : 0;
    const teamNames = (studioState.team || []).map((m) => (isArabic() ? m.nameAr : m.nameEn));

    body.innerHTML = `
      <div class="ent-kpi-grid">
        <div class="glass-card ent-kpi-card"><div class="stat-value">${leads.length}</div><div class="stat-label">${escapeHtml(t("crmTotalLeads"))}</div></div>
        <div class="glass-card ent-kpi-card"><div class="stat-value" style="font-size:1.15rem;">${escapeHtml(formatCurrency(totalVal, "EGP"))}</div><div class="stat-label">${escapeHtml(t("crmPipelineVal"))}</div></div>
        <div class="glass-card ent-kpi-card"><div class="stat-value" style="font-size:1.15rem;">${escapeHtml(formatCurrency(wonVal, "EGP"))}</div><div class="stat-label">${escapeHtml(t("crmWonVal"))}</div></div>
        <div class="glass-card ent-kpi-card"><div class="stat-value">${convRate}%</div><div class="stat-label">${escapeHtml(t("crmConvRate"))}</div></div>
      </div>

      <div class="glass-card highlight-border stack-list">
        <div class="row-between" style="flex-wrap:wrap;gap:8px;">
          <div>
            <h2 class="card-title">💼 ${escapeHtml(t("entNavCrm"))}</h2>
            <p class="muted-text" style="margin:2px 0 0;font-size:0.84rem;">${escapeHtml(t("crmDesc"))}</p>
          </div>
          <div class="btn-row">
            <button id="crmAddLeadBtn" type="button" class="btn btn-primary btn-sm">+ ${escapeHtml(t("crmAddLeadBtn"))}</button>
            <button id="crmExportBtn" type="button" class="btn btn-outline btn-sm">📥 ${escapeHtml(t("entExportCsv"))}</button>
          </div>
        </div>
        <div class="form-two-col">
          <input id="crmSearchInp" type="search" value="${escapeHtml(crmUi.search)}" placeholder="${escapeHtml(t("crmSearchPlaceholder"))}" />
          <select id="crmStageSel">
            <option value="all">${escapeHtml(t("statusAll"))}</option>
            ${stages.map((st) => `<option value="${st.key}" ${crmUi.stageFilter === st.key ? "selected" : ""}>${escapeHtml(isArabic() ? st.ar : st.en)}</option>`).join("")}
          </select>
        </div>
      </div>

      ${
        filtered.length === 0
          ? `<div class="glass-card"><p class="muted-text" style="margin:0;">${escapeHtml(t("crmNoLeads"))}</p></div>`
          : filtered
              .map((l) => {
                const stMeta = stages.find((s) => s.key === l.stage) || stages[0];
                return `
                  <div class="glass-card stack-list">
                    <div class="row-between" style="flex-wrap:wrap;gap:8px;">
                      <div>
                        <h3 class="card-title">${escapeHtml(l.name)} ${l.company ? `<span class="muted-text" style="font-size:0.82rem;">(${escapeHtml(l.company)})</span>` : ""}</h3>
                        <div style="color:var(--neon-cyan);font-size:0.84rem;">${escapeHtml(l.email)}${l.phone ? ` • ${escapeHtml(l.phone)}` : ""}</div>
                      </div>
                      <div style="display:flex;gap:6px;flex-wrap:wrap;align-items:center;">
                        <span class="tech-chip">${escapeHtml(formatCurrency(l.budgetEgp, l.currency || "EGP"))}</span>
                        <span class="status-pill ${stMeta.cls}"><span class="pill-dot"></span>${escapeHtml(isArabic() ? stMeta.ar : stMeta.en)}</span>
                      </div>
                    </div>
                    <div class="muted-text" style="font-size:0.86rem;">
                      ${l.serviceInterest ? `🧩 ${escapeHtml(l.serviceInterest)} • ` : ""}${l.assignedTo ? `👤 ${escapeHtml(l.assignedTo)} • ` : ""}📅 ${escapeHtml((l.createdAt || "").slice(0, 10))}
                    </div>
                    ${l.notes ? `<p class="muted-text" style="margin:0;white-space:pre-wrap;">${escapeHtml(l.notes)}</p>` : ""}
                    <div class="btn-row">
                      <button type="button" class="btn btn-outline btn-sm" data-crm-edit="${escapeHtml(l.id)}">✏️ ${escapeHtml(t("edit"))}</button>
                      <button type="button" class="btn btn-outline btn-sm" data-crm-log="${escapeHtml(l.id)}">💬 ${escapeHtml(t("crmActivityLogBtn"))} (${(l.activities || []).length})</button>
                      ${
                        !l.convertedProjectId
                          ? `<button type="button" class="btn btn-primary btn-sm" data-crm-convert="${escapeHtml(l.id)}">🚀 ${escapeHtml(t("crmConvertProjectBtn"))}</button>`
                          : `<span class="status-pill success">✓ ${escapeHtml(t("crmConvertedBadge"))}</span>`
                      }
                      <button type="button" class="icon-btn danger" data-crm-del="${escapeHtml(l.id)}">🗑️</button>
                    </div>
                  </div>
                `;
              })
              .join("")
      }
    `;

    document.getElementById("crmSearchInp").addEventListener("input", (e) => {
      crmUi.search = e.target.value;
      renderCrmManager(body, ctx, session);
    });
    document.getElementById("crmStageSel").addEventListener("change", (e) => {
      crmUi.stageFilter = e.target.value;
      renderCrmManager(body, ctx, session);
    });
    document.getElementById("crmExportBtn").addEventListener("click", () => {
      const hdr = ["ID", "Name", "Email", "Phone", "Company", "Service", "Budget", "Currency", "Stage", "Assigned", "Created"];
      const rows = filtered.map((l) => [l.id, l.name, l.email, l.phone, l.company, l.serviceInterest, l.budgetEgp, l.currency || "EGP", l.stage, l.assignedTo, l.createdAt].map(csvCell).join(","));
      downloadFile(`vexora-crm-leads-${new Date().toISOString().slice(0, 10)}.csv`, [hdr.join(","), ...rows].join("\n"));
      showToast(t("entExportedToast"));
    });

    function openLeadModal(initial) {
      const l = initial || {
        id: `lead_${Date.now()}`,
        name: "",
        email: "",
        phone: "",
        company: "",
        serviceInterest: "",
        budgetEgp: 0,
        currency: "EGP",
        stage: "new_lead",
        source: "admin",
        assignedTo: "",
        notes: "",
        activities: [],
        convertedProjectId: "",
        createdAt: new Date().toISOString()
      };
      ctx.openModal(
        initial ? t("edit") : t("crmAddLeadBtn"),
        `
        <form id="crmLeadForm" class="stack-list">
          <div class="form-two-col">
            <div class="field"><label>${escapeHtml(t("fullNameLabel"))}</label><input id="clName" value="${escapeHtml(l.name)}" required /></div>
            <div class="field"><label>${escapeHtml(t("emailLabel"))}</label><input id="clEmail" type="email" value="${escapeHtml(l.email)}" required /></div>
          </div>
          <div class="form-two-col">
            <div class="field"><label>${escapeHtml(t("clientPhoneLabel"))}</label><input id="clPhone" value="${escapeHtml(l.phone || "")}" /></div>
            <div class="field"><label>${escapeHtml(t("clientCompanyLabel"))}</label><input id="clComp" value="${escapeHtml(l.company || "")}" /></div>
          </div>
          <div class="form-two-col">
            <div class="field"><label>${escapeHtml(t("requestedServiceLabel"))}</label><input id="clSrv" value="${escapeHtml(l.serviceInterest || "")}" /></div>
            <div class="field"><label>${escapeHtml(t("entAssignedTo"))}</label>
              <select id="clAssign">
                <option value="">—</option>
                ${teamNames.map((nm) => `<option value="${escapeHtml(nm)}" ${l.assignedTo === nm ? "selected" : ""}>${escapeHtml(nm)}</option>`).join("")}
              </select>
            </div>
          </div>
          <div class="form-two-col">
            <div class="field"><label>${escapeHtml(t("crmQuoteAmount"))}</label><input id="clBudget" type="number" min="0" value="${Number(l.budgetEgp || 0)}" /></div>
            <div class="field"><label>${escapeHtml(t("finCurrencyLabel"))}</label>
              <select id="clCurr">
                ${["EGP", "USD", "SAR", "EUR"].map((cur) => `<option value="${cur}" ${(l.currency || "EGP") === cur ? "selected" : ""}>${cur}</option>`).join("")}
              </select>
            </div>
          </div>
          <div class="field"><label>${escapeHtml(t("crmStageLabel"))}</label>
            <select id="clStage">
              ${stages.map((st) => `<option value="${st.key}" ${l.stage === st.key ? "selected" : ""}>${escapeHtml(isArabic() ? st.ar : st.en)}</option>`).join("")}
            </select>
          </div>
          <div class="field"><label>${escapeHtml(t("crmNotesLabel"))}</label><textarea id="clNotes" rows="3">${escapeHtml(l.notes || "")}</textarea></div>
          <button type="submit" class="btn btn-primary btn-full">${escapeHtml(t("save"))}</button>
        </form>
      `
      );
      document.getElementById("crmLeadForm").addEventListener("submit", async (e) => {
        e.preventDefault();
        const updated = {
          ...l,
          name: document.getElementById("clName").value.trim(),
          email: document.getElementById("clEmail").value.trim().toLowerCase(),
          phone: document.getElementById("clPhone").value.trim(),
          company: document.getElementById("clComp").value.trim(),
          serviceInterest: document.getElementById("clSrv").value.trim(),
          assignedTo: document.getElementById("clAssign").value,
          budgetEgp: Number(document.getElementById("clBudget").value || 0),
          currency: document.getElementById("clCurr").value,
          stage: document.getElementById("clStage").value,
          notes: document.getElementById("clNotes").value.trim()
        };
        if (Backend.isConfigured() && Backend.getStoredAuth()?.access_token) {
          try { await Backend.upsertCrmLead(updated); } catch (err) { showToast(err.message); return; }
        }
        const idx = studioState.crmLeads.findIndex((x) => x.id === l.id);
        if (idx >= 0) studioState.crmLeads[idx] = updated;
        else studioState.crmLeads.unshift(updated);
        saveState();
        ctx.closeModal();
        showToast("✓");
        renderCrmManager(body, ctx, session);
      });
    }

    document.getElementById("crmAddLeadBtn").addEventListener("click", () => openLeadModal(null));
    body.querySelectorAll("[data-crm-edit]").forEach((b) =>
      b.addEventListener("click", () => openLeadModal(leads.find((x) => x.id === b.dataset.crmEdit)))
    );

    body.querySelectorAll("[data-crm-log]").forEach((b) =>
      b.addEventListener("click", () => {
        const l = leads.find((x) => x.id === b.dataset.crmLog);
        if (!l) return;
        const acts = Array.isArray(l.activities) ? l.activities : [];
        ctx.openModal(
          `${l.name} — ${t("crmActivityLogBtn")}`,
          `
          <form id="crmActForm" class="stack-list">
            <div class="field"><label>${escapeHtml(t("crmAddNoteLabel"))}</label><textarea id="crmActTxt" rows="2" required></textarea></div>
            <button type="submit" class="btn btn-primary btn-sm">+ ${escapeHtml(t("save"))}</button>
          </form>
          <div class="stack-list">
            ${acts.length === 0 ? `<p class="muted-text" style="margin:0;">${escapeHtml(t("entNoAuditLogs"))}</p>` : acts.map((a) => `
              <div class="glass-card" style="padding:10px;">
                <div style="font-size:0.78rem;color:var(--neon-cyan);">${escapeHtml(a.actor || "admin")} • ${escapeHtml((a.at || "").slice(0, 16).replace("T", " "))}</div>
                <div style="font-size:0.86rem;">${escapeHtml(a.note)}</div>
              </div>
            `).join("")}
          </div>
        `
        );
        document.getElementById("crmActForm").addEventListener("submit", async (e) => {
          e.preventDefault();
          const note = document.getElementById("crmActTxt").value.trim();
          if (!note) return;
          if (!Array.isArray(l.activities)) l.activities = [];
          l.activities.unshift({ at: new Date().toISOString(), actor: session.email, note });
          if (Backend.isConfigured() && Backend.getStoredAuth()?.access_token) {
            try { await Backend.upsertCrmLead(l); } catch (err) { showToast(err.message); return; }
          }
          saveState();
          ctx.closeModal();
          renderCrmManager(body, ctx, session);
        });
      })
    );

    body.querySelectorAll("[data-crm-convert]").forEach((b) =>
      b.addEventListener("click", async () => {
        const l = leads.find((x) => x.id === b.dataset.crmConvert);
        if (!l) return;
        const projId = `proj_crm_${Date.now()}`;
        const proj = {
          id: projId,
          nameEn: l.company ? `${l.company} — ${l.serviceInterest || "Software Project"}` : `${l.name} — ${l.serviceInterest || "Project"}`,
          nameAr: l.company ? `${l.company} — ${l.serviceInterest || "مشروع برمجي"}` : `${l.name} — ${l.serviceInterest || "مشروع"}`,
          descriptionEn: l.notes || `Converted from CRM Lead (${l.email}).`,
          descriptionAr: l.notes || `مشروع محول من نظام CRM (${l.email}).`,
          category: "Software Systems",
          status: "In Progress",
          progressPct: 10,
          deadline: "",
          currentPhase: "Architecture & Kickoff",
          clientUserId: "",
          clientEmail: l.email,
          budgetEgp: Number(l.budgetEgp || 0),
          technologies: ["Web", "Cloud", "API"],
          assignedTeam: l.assignedTo ? [l.assignedTo] : [],
          changeHistory: [{ at: new Date().toISOString(), actor: session.email, summary: `Converted from CRM lead ${l.id}` }],
          websiteUrl: "",
          imageUrl: "",
          videoUrl: "",
          presetImageKey: "web",
          featured: false,
          published: false
        };
        l.stage = "won";
        l.convertedProjectId = projId;
        if (Backend.isConfigured() && Backend.getStoredAuth()?.access_token) {
          try {
            await Backend.upsertProject(proj);
            await Backend.upsertCrmLead(l);
          } catch (err) {
            showToast(err.message);
            return;
          }
        }
        studioState.projects.unshift(proj);
        await runAutomationEvent(ctx, "status_changed", { clientEmail: l.email, title: proj.nameEn, status: "Project Kickoff", note: "Converted from CRM proposal to active engineering project." });
        saveState();
        showToast("✓");
        renderCrmManager(body, ctx, session);
      })
    );

    body.querySelectorAll("[data-crm-del]").forEach((b) =>
      b.addEventListener("click", async () => {
        const id = b.dataset.crmDel;
        if (Backend.isConfigured() && Backend.getStoredAuth()?.access_token) {
          try { await Backend.deleteCrmLead(id); } catch (err) { showToast(err.message); return; }
        }
        studioState.crmLeads = leads.filter((x) => x.id !== id);
        saveState();
        renderCrmManager(body, ctx, session);
      })
    );
  }

  /* =========================================================
     PROJECT TASKS & MILESTONES MODAL
     ========================================================= */
  function openProjectTasksModal(project, ctx, session, onDone) {
    const { t, isArabic, escapeHtml, Backend, studioState, saveState, showToast } = ctx;
    ensureEcosystemState(studioState);
    const teamNames = (studioState.team || []).map((m) => (isArabic() ? m.nameAr : m.nameEn));
    const tasks = (studioState.projectTasks || []).filter((tk) => tk.projectId === project.id);

    ctx.openModal(
      `${isArabic() ? project.nameAr : project.nameEn} — ${t("projTasksTitle")}`,
      `
      <div class="stack-list">
        <div class="row-between">
          <span class="status-pill cyan">${escapeHtml(t("projProgressLabel"))}: ${Number(project.progressPct || 0)}%</span>
          <span class="muted-text" style="font-size:0.82rem;">${tasks.filter((x) => x.status === "done").length} / ${tasks.length} ${escapeHtml(t("taskStatusDone"))}</span>
        </div>
        <form id="newTaskForm" class="glass-card stack-list" style="padding:12px;">
          <strong style="font-size:0.88rem;">+ ${escapeHtml(t("projAddTaskBtn"))}</strong>
          <div class="form-two-col">
            <input id="ntTitle" placeholder="${escapeHtml(t("taskTitleLabel"))}" required />
            <input id="ntPhase" value="Development" placeholder="${escapeHtml(t("taskPhaseLabel"))}" />
          </div>
          <div class="form-two-col">
            <select id="ntAssign">
              <option value="">${escapeHtml(t("entAssignedTo"))}</option>
              ${teamNames.map((nm) => `<option value="${escapeHtml(nm)}">${escapeHtml(nm)}</option>`).join("")}
            </select>
            <input id="ntDue" type="date" />
          </div>
          <button type="submit" class="btn btn-primary btn-sm">${escapeHtml(t("addNew"))}</button>
        </form>
        <div id="tasksModalList" class="stack-list">
          ${
            tasks.length === 0
              ? `<p class="muted-text" style="margin:0;">${escapeHtml(t("projNoTasks"))}</p>`
              : tasks
                  .map(
                    (tk) => `
                  <div class="glass-card stack-list" style="padding:10px 12px;">
                    <div class="row-between" style="flex-wrap:wrap;gap:6px;">
                      <div>
                        <strong>${escapeHtml(tk.title)}</strong>
                        <div class="muted-text" style="font-size:0.76rem;">${escapeHtml(tk.phase)} ${tk.assignedTo ? `• 👤 ${escapeHtml(tk.assignedTo)}` : ""} ${tk.dueDate ? `• 📅 ${escapeHtml(tk.dueDate)}` : ""}</div>
                      </div>
                      <div style="display:flex;gap:6px;align-items:center;">
                        <select data-task-stat="${escapeHtml(tk.id)}" style="width:auto;min-height:34px;padding:4px 8px;">
                          <option value="todo" ${tk.status === "todo" ? "selected" : ""}>To Do</option>
                          <option value="in_progress" ${tk.status === "in_progress" ? "selected" : ""}>In Progress</option>
                          <option value="review" ${tk.status === "review" ? "selected" : ""}>Review</option>
                          <option value="done" ${tk.status === "done" ? "selected" : ""}>Done</option>
                        </select>
                        <button type="button" class="icon-btn danger" data-task-del="${escapeHtml(tk.id)}">🗑️</button>
                      </div>
                    </div>
                  </div>
                `
                  )
                  .join("")
          }
        </div>
      </div>
    `
    );

    document.getElementById("newTaskForm").addEventListener("submit", async (e) => {
      e.preventDefault();
      const tk = {
        id: `tsk_${Date.now()}_${Math.random().toString(36).slice(2, 5)}`,
        projectId: project.id,
        title: document.getElementById("ntTitle").value.trim(),
        phase: document.getElementById("ntPhase").value.trim() || "Development",
        status: "todo",
        priority: "medium",
        assignedTo: document.getElementById("ntAssign").value,
        dueDate: document.getElementById("ntDue").value,
        notes: "",
        createdAt: new Date().toISOString()
      };
      if (Backend.isConfigured() && Backend.getStoredAuth()?.access_token) {
        try { await Backend.upsertProjectTask(tk); } catch (err) { showToast(err.message); return; }
      }
      studioState.projectTasks.push(tk);
      recomputeProjectProgress(project.id, studioState, Backend);
      saveState();
      openProjectTasksModal(project, ctx, session, onDone);
      onDone?.();
    });

    document.querySelectorAll("[data-task-stat]").forEach((sel) =>
      sel.addEventListener("change", async () => {
        const tk = studioState.projectTasks.find((x) => x.id === sel.dataset.taskStat);
        if (!tk) return;
        tk.status = sel.value;
        if (Backend.isConfigured() && Backend.getStoredAuth()?.access_token) {
          try { await Backend.upsertProjectTask(tk); } catch (err) { showToast(err.message); return; }
        }
        recomputeProjectProgress(project.id, studioState, Backend);
        saveState();
        openProjectTasksModal(project, ctx, session, onDone);
        onDone?.();
      })
    );

    document.querySelectorAll("[data-task-del]").forEach((btn) =>
      btn.addEventListener("click", async () => {
        const id = btn.dataset.taskDel;
        if (Backend.isConfigured() && Backend.getStoredAuth()?.access_token) {
          try { await Backend.deleteProjectTask(id); } catch (err) { showToast(err.message); return; }
        }
        studioState.projectTasks = studioState.projectTasks.filter((x) => x.id !== id);
        recomputeProjectProgress(project.id, studioState, Backend);
        saveState();
        openProjectTasksModal(project, ctx, session, onDone);
        onDone?.();
      })
    );
  }

  /* =========================================================
     FINANCE MANAGEMENT (Invoices & Ledger with EGP)
     ========================================================= */
  let finUi = { subTab: "invoices", currencyFilter: "EGP" };

  function renderFinanceManager(body, ctx, session) {
    const { t, isArabic, escapeHtml, Backend, studioState, saveState, showToast } = ctx;
    ensureEcosystemState(studioState);
    const invoices = studioState.financeInvoices || [];
    const txs = studioState.financeTransactions || [];

    const cur = finUi.currencyFilter;
    const sumTx = (type) => txs.filter((x) => x.txType === type && (cur === "ALL" || x.currency === cur)).reduce((a, b) => a + Number(b.amount || 0), 0);
    const paidInvSum = invoices.filter((i) => i.status === "paid" && (cur === "ALL" || i.currency === cur)).reduce((a, b) => a + Number(b.total || 0), 0);
    const pendingInvSum = invoices.filter((i) => (i.status === "sent" || i.status === "overdue") && (cur === "ALL" || i.currency === cur)).reduce((a, b) => a + Number(b.total || 0), 0);

    const incomeTotal = sumTx("income") || paidInvSum;
    const expenseTotal = sumTx("expense");
    const netProfit = incomeTotal - expenseTotal;
    const curLabel = cur === "ALL" ? "EGP" : cur;

    body.innerHTML = `
      <div class="ent-kpi-grid">
        <div class="glass-card ent-kpi-card"><div class="stat-value" style="font-size:1.12rem;color:var(--success);">${escapeHtml(formatCurrency(incomeTotal, curLabel))}</div><div class="stat-label">${escapeHtml(t("finTotalRevenue"))}</div></div>
        <div class="glass-card ent-kpi-card"><div class="stat-value" style="font-size:1.12rem;color:var(--error);">${escapeHtml(formatCurrency(expenseTotal, curLabel))}</div><div class="stat-label">${escapeHtml(t("finTotalExpenses"))}</div></div>
        <div class="glass-card ent-kpi-card"><div class="stat-value" style="font-size:1.12rem;color:var(--neon-cyan);">${escapeHtml(formatCurrency(netProfit, curLabel))}</div><div class="stat-label">${escapeHtml(t("finNetProfit"))}</div></div>
        <div class="glass-card ent-kpi-card"><div class="stat-value" style="font-size:1.12rem;color:var(--warning);">${escapeHtml(formatCurrency(pendingInvSum, curLabel))}</div><div class="stat-label">${escapeHtml(t("finPendingInvoices"))}</div></div>
      </div>

      <div class="glass-card highlight-border row-between" style="flex-wrap:wrap;gap:10px;">
        <div class="chips-scroll">
          <button type="button" class="chip-btn ${finUi.subTab === "invoices" ? "active" : ""}" data-fin-tab="invoices">🧾 ${escapeHtml(t("finInvoicesTab"))} (${invoices.length})</button>
          <button type="button" class="chip-btn ${finUi.subTab === "ledger" ? "active" : ""}" data-fin-tab="ledger">📒 ${escapeHtml(t("finLedgerTab"))} (${txs.length})</button>
          <button type="button" class="chip-btn ${finUi.subTab === "reports" ? "active" : ""}" data-fin-tab="reports">📊 ${escapeHtml(t("finReportsTab"))}</button>
        </div>
        <div class="btn-row">
          <select id="finCurrFilter" style="width:auto;min-height:38px;padding:6px 10px;">
            <option value="EGP" ${cur === "EGP" ? "selected" : ""}>EGP (ج.م)</option>
            <option value="USD" ${cur === "USD" ? "selected" : ""}>USD ($)</option>
            <option value="SAR" ${cur === "SAR" ? "selected" : ""}>SAR</option>
            <option value="ALL" ${cur === "ALL" ? "selected" : ""}>${escapeHtml(t("statusAll"))}</option>
          </select>
          <button id="finNewInvBtn" type="button" class="btn btn-primary btn-sm">+ ${escapeHtml(t("finNewInvoiceBtn"))}</button>
          <button id="finNewTxBtn" type="button" class="btn btn-outline btn-sm">+ ${escapeHtml(t("finNewTxBtn"))}</button>
        </div>
      </div>

      <div id="finSubBody" class="stack-list"></div>
    `;

    body.querySelectorAll("[data-fin-tab]").forEach((b) =>
      b.addEventListener("click", () => {
        finUi.subTab = b.dataset.finTab;
        renderFinanceManager(body, ctx, session);
      })
    );
    document.getElementById("finCurrFilter").addEventListener("change", (e) => {
      finUi.currencyFilter = e.target.value;
      renderFinanceManager(body, ctx, session);
    });

    function openInvoiceModal(initial) {
      const inv = initial || {
        id: `inv_${Date.now()}`,
        invoiceNumber: `VX-${new Date().getFullYear()}-${String(invoices.length + 1).padStart(3, "0")}`,
        clientUserId: "",
        clientName: "",
        clientEmail: "",
        projectId: "",
        currency: "EGP",
        items: [{ desc: "Software Development Milestone", qty: 1, price: 0 }],
        subtotal: 0,
        taxPct: 0,
        total: 0,
        paidAmount: 0,
        status: "sent",
        dueDate: new Date(Date.now() + 14 * 86400000).toISOString().slice(0, 10),
        notes: "",
        createdAt: new Date().toISOString()
      };
      const firstItem = inv.items?.[0] || { desc: "", qty: 1, price: inv.subtotal || 0 };
      ctx.openModal(
        initial ? inv.invoiceNumber : t("finNewInvoiceBtn"),
        `
        <form id="finInvForm" class="stack-list">
          <div class="form-two-col">
            <div class="field"><label>Invoice #</label><input id="fiNum" value="${escapeHtml(inv.invoiceNumber)}" required /></div>
            <div class="field"><label>${escapeHtml(t("finCurrencyLabel"))}</label>
              <select id="fiCurr">${["EGP", "USD", "SAR", "EUR"].map((c) => `<option value="${c}" ${inv.currency === c ? "selected" : ""}>${c}</option>`).join("")}</select>
            </div>
          </div>
          <div class="form-two-col">
            <div class="field"><label>${escapeHtml(t("clientFullNameLabel"))}</label><input id="fiClName" value="${escapeHtml(inv.clientName)}" required /></div>
            <div class="field"><label>${escapeHtml(t("clientEmailLabel"))}</label><input id="fiClEmail" type="email" value="${escapeHtml(inv.clientEmail)}" required /></div>
          </div>
          <div class="form-two-col">
            <div class="field"><label>${escapeHtml(t("entNavProjects"))}</label>
              <select id="fiProj">
                <option value="">—</option>
                ${(studioState.projects || []).map((p) => `<option value="${escapeHtml(p.id)}" ${inv.projectId === p.id ? "selected" : ""}>${escapeHtml(isArabic() ? p.nameAr : p.nameEn)}</option>`).join("")}
              </select>
            </div>
            <div class="field"><label>${escapeHtml(t("statusLabel"))}</label>
              <select id="fiStat">
                ${["draft", "sent", "paid", "overdue", "cancelled"].map((st) => `<option value="${st}" ${inv.status === st ? "selected" : ""}>${st}</option>`).join("")}
              </select>
            </div>
          </div>
          <div class="field"><label>${escapeHtml(t("finLineItemDesc"))}</label><input id="fiItemDesc" value="${escapeHtml(firstItem.desc || "")}" required /></div>
          <div class="form-two-col">
            <div class="field"><label>${escapeHtml(t("finAmountLabel"))}</label><input id="fiAmount" type="number" min="0" step="0.01" value="${Number(firstItem.price || inv.subtotal || 0)}" required /></div>
            <div class="field"><label>${escapeHtml(t("finTaxPct"))}</label><input id="fiTax" type="number" min="0" max="100" step="0.1" value="${Number(inv.taxPct || 0)}" /></div>
          </div>
          <div class="form-two-col">
            <div class="field"><label>${escapeHtml(t("finDueDate"))}</label><input id="fiDue" type="date" value="${escapeHtml(inv.dueDate || "")}" /></div>
            <div class="field"><label>${escapeHtml(t("finNotes"))}</label><input id="fiNotes" value="${escapeHtml(inv.notes || "")}" /></div>
          </div>
          <button type="submit" class="btn btn-primary btn-full">${escapeHtml(t("save"))}</button>
        </form>
      `
      );
      document.getElementById("finInvForm").addEventListener("submit", async (e) => {
        e.preventDefault();
        const amt = Number(document.getElementById("fiAmount").value || 0);
        const tax = Number(document.getElementById("fiTax").value || 0);
        const total = Math.round((amt + (amt * tax) / 100) * 100) / 100;
        const st = document.getElementById("fiStat").value;
        const updated = {
          ...inv,
          invoiceNumber: document.getElementById("fiNum").value.trim(),
          currency: document.getElementById("fiCurr").value,
          clientName: document.getElementById("fiClName").value.trim(),
          clientEmail: document.getElementById("fiClEmail").value.trim().toLowerCase(),
          projectId: document.getElementById("fiProj").value,
          status: st,
          items: [{ desc: document.getElementById("fiItemDesc").value.trim(), qty: 1, price: amt }],
          subtotal: amt,
          taxPct: tax,
          total,
          paidAmount: st === "paid" ? total : Number(inv.paidAmount || 0),
          dueDate: document.getElementById("fiDue").value,
          notes: document.getElementById("fiNotes").value.trim()
        };
        if (Backend.isConfigured() && Backend.getStoredAuth()?.access_token) {
          try { await Backend.upsertInvoice(updated); } catch (err) { showToast(err.message); return; }
        }
        const idx = studioState.financeInvoices.findIndex((x) => x.id === inv.id);
        if (idx >= 0) studioState.financeInvoices[idx] = updated;
        else studioState.financeInvoices.unshift(updated);

        if (st === "paid" && initial?.status !== "paid") {
          const tx = {
            id: `tx_inv_${inv.id}_${Date.now()}`,
            txType: "income",
            category: "invoice_payment",
            amount: total,
            currency: updated.currency,
            projectId: updated.projectId,
            invoiceId: updated.id,
            description: `Invoice ${updated.invoiceNumber} — ${updated.clientName}`,
            occurredOn: new Date().toISOString().slice(0, 10),
            createdBy: session.email,
            createdAt: new Date().toISOString()
          };
          studioState.financeTransactions.unshift(tx);
          if (Backend.isConfigured() && Backend.getStoredAuth()?.access_token) {
            Backend.upsertTransaction(tx).catch(() => {});
          }
        }
        saveState();
        ctx.closeModal();
        showToast("✓");
        renderFinanceManager(body, ctx, session);
      });
    }

    function openTxModal() {
      ctx.openModal(
        t("finNewTxBtn"),
        `
        <form id="finTxForm" class="stack-list">
          <div class="form-two-col">
            <div class="field"><label>${escapeHtml(t("finTxTypeLabel"))}</label>
              <select id="ftType">
                <option value="income">${escapeHtml(t("finIncome"))}</option>
                <option value="expense">${escapeHtml(t("finExpense"))}</option>
              </select>
            </div>
            <div class="field"><label>${escapeHtml(t("finCurrencyLabel"))}</label>
              <select id="ftCurr"><option value="EGP">EGP</option><option value="USD">USD</option><option value="SAR">SAR</option></select>
            </div>
          </div>
          <div class="form-two-col">
            <div class="field"><label>${escapeHtml(t("finAmountLabel"))}</label><input id="ftAmt" type="number" min="0" step="0.01" required /></div>
            <div class="field"><label>${escapeHtml(t("categoryLabel"))}</label><input id="ftCat" value="operations" required /></div>
          </div>
          <div class="form-two-col">
            <div class="field"><label>${escapeHtml(t("entNavProjects"))}</label>
              <select id="ftProj">
                <option value="">—</option>
                ${(studioState.projects || []).map((p) => `<option value="${escapeHtml(p.id)}">${escapeHtml(isArabic() ? p.nameAr : p.nameEn)}</option>`).join("")}
              </select>
            </div>
            <div class="field"><label>${escapeHtml(t("entColDate"))}</label><input id="ftDate" type="date" value="${new Date().toISOString().slice(0, 10)}" /></div>
          </div>
          <div class="field"><label>${escapeHtml(t("finNotes"))}</label><input id="ftDesc" required /></div>
          <button type="submit" class="btn btn-primary btn-full">${escapeHtml(t("save"))}</button>
        </form>
      `
      );
      document.getElementById("finTxForm").addEventListener("submit", async (e) => {
        e.preventDefault();
        const tx = {
          id: `tx_${Date.now()}_${Math.random().toString(36).slice(2, 5)}`,
          txType: document.getElementById("ftType").value,
          currency: document.getElementById("ftCurr").value,
          amount: Number(document.getElementById("ftAmt").value || 0),
          category: document.getElementById("ftCat").value.trim() || "general",
          projectId: document.getElementById("ftProj").value,
          invoiceId: "",
          description: document.getElementById("ftDesc").value.trim(),
          occurredOn: document.getElementById("ftDate").value,
          createdBy: session.email,
          createdAt: new Date().toISOString()
        };
        if (Backend.isConfigured() && Backend.getStoredAuth()?.access_token) {
          try { await Backend.upsertTransaction(tx); } catch (err) { showToast(err.message); return; }
        }
        studioState.financeTransactions.unshift(tx);
        saveState();
        ctx.closeModal();
        showToast("✓");
        renderFinanceManager(body, ctx, session);
      });
    }

    document.getElementById("finNewInvBtn").addEventListener("click", () => openInvoiceModal(null));
    document.getElementById("finNewTxBtn").addEventListener("click", () => openTxModal());

    const subBody = document.getElementById("finSubBody");
    if (finUi.subTab === "invoices") {
      const list = invoices.filter((i) => cur === "ALL" || i.currency === cur);
      subBody.innerHTML = list.length === 0
        ? `<div class="glass-card"><p class="muted-text" style="margin:0;">${escapeHtml(t("finNoInvoices"))}</p></div>`
        : `<div class="ent-table-wrap glass-card">
            <table class="ent-table">
              <thead><tr><th>#</th><th>${escapeHtml(t("clientFullNameLabel"))}</th><th>${escapeHtml(t("finAmountLabel"))}</th><th>${escapeHtml(t("statusLabel"))}</th><th>${escapeHtml(t("finDueDate"))}</th><th>${escapeHtml(t("entColActions"))}</th></tr></thead>
              <tbody>
                ${list.map((inv) => {
                  const cls = inv.status === "paid" ? "success" : inv.status === "overdue" ? "error" : inv.status === "sent" ? "cyan" : "warning";
                  return `
                    <tr>
                      <td><strong>${escapeHtml(inv.invoiceNumber)}</strong></td>
                      <td>${escapeHtml(inv.clientName)}<div class="muted-text" style="font-size:0.75rem;">${escapeHtml(inv.clientEmail)}</div></td>
                      <td><strong>${escapeHtml(formatCurrency(inv.total, inv.currency))}</strong></td>
                      <td><span class="status-pill ${cls}">${escapeHtml(inv.status)}</span></td>
                      <td class="muted-text">${escapeHtml(inv.dueDate || "—")}</td>
                      <td>
                        <div style="display:flex;gap:6px;">
                          <button type="button" class="icon-btn" data-inv-edit="${escapeHtml(inv.id)}">✏️</button>
                          <button type="button" class="icon-btn danger" data-inv-del="${escapeHtml(inv.id)}">🗑️</button>
                        </div>
                      </td>
                    </tr>
                  `;
                }).join("")}
              </tbody>
            </table>
          </div>`;

      subBody.querySelectorAll("[data-inv-edit]").forEach((b) =>
        b.addEventListener("click", () => openInvoiceModal(invoices.find((x) => x.id === b.dataset.invEdit)))
      );
      subBody.querySelectorAll("[data-inv-del]").forEach((b) =>
        b.addEventListener("click", async () => {
          const id = b.dataset.invDel;
          if (Backend.isConfigured() && Backend.getStoredAuth()?.access_token) {
            try { await Backend.deleteInvoice(id); } catch (err) { showToast(err.message); return; }
          }
          studioState.financeInvoices = invoices.filter((x) => x.id !== id);
          saveState();
          renderFinanceManager(body, ctx, session);
        })
      );
    } else if (finUi.subTab === "ledger") {
      const list = txs.filter((x) => cur === "ALL" || x.currency === cur);
      subBody.innerHTML = list.length === 0
        ? `<div class="glass-card"><p class="muted-text" style="margin:0;">${escapeHtml(t("finNoTransactions"))}</p></div>`
        : `<div class="ent-table-wrap glass-card">
            <table class="ent-table">
              <thead><tr><th>${escapeHtml(t("finTxTypeLabel"))}</th><th>${escapeHtml(t("categoryLabel"))}</th><th>${escapeHtml(t("finAmountLabel"))}</th><th>${escapeHtml(t("finNotes"))}</th><th>${escapeHtml(t("entColDate"))}</th><th>${escapeHtml(t("entColActions"))}</th></tr></thead>
              <tbody>
                ${list.map((tx) => `
                  <tr>
                    <td><span class="status-pill ${tx.txType === "income" ? "success" : "error"}">${escapeHtml(tx.txType)}</span></td>
                    <td>${escapeHtml(tx.category)}</td>
                    <td><strong>${escapeHtml(formatCurrency(tx.amount, tx.currency))}</strong></td>
                    <td>${escapeHtml(tx.description)}</td>
                    <td class="muted-text">${escapeHtml(tx.occurredOn || (tx.createdAt || "").slice(0, 10))}</td>
                    <td><button type="button" class="icon-btn danger" data-tx-del="${escapeHtml(tx.id)}">🗑️</button></td>
                  </tr>
                `).join("")}
              </tbody>
            </table>
          </div>`;

      subBody.querySelectorAll("[data-tx-del]").forEach((b) =>
        b.addEventListener("click", async () => {
          const id = b.dataset.txDel;
          if (Backend.isConfigured() && Backend.getStoredAuth()?.access_token) {
            try { await Backend.deleteTransaction(id); } catch (err) { showToast(err.message); return; }
          }
          studioState.financeTransactions = txs.filter((x) => x.id !== id);
          saveState();
          renderFinanceManager(body, ctx, session);
        })
      );
    } else {
      subBody.innerHTML = `
        <div class="glass-card stack-list">
          <h3 class="card-title">📊 ${escapeHtml(t("finReportsTab"))}</h3>
          <p class="muted-text" style="margin:0;">${escapeHtml(t("finReportSummary"))}</p>
          <div class="btn-row">
            <button id="finExportInvCsv" type="button" class="btn btn-outline btn-sm">📥 ${escapeHtml(t("finInvoicesTab"))} CSV</button>
            <button id="finExportTxCsv" type="button" class="btn btn-outline btn-sm">📥 ${escapeHtml(t("finLedgerTab"))} CSV</button>
            <button id="finPrintBtn" type="button" class="btn btn-primary btn-sm">🖨️ ${escapeHtml(t("entExportPdf"))}</button>
          </div>
        </div>
      `;
      document.getElementById("finExportInvCsv").addEventListener("click", () => {
        const hdr = ["InvoiceNumber", "Client", "Email", "Currency", "Total", "Status", "DueDate"];
        const rows = invoices.map((i) => [i.invoiceNumber, i.clientName, i.clientEmail, i.currency, i.total, i.status, i.dueDate].map(csvCell).join(","));
        downloadFile(`vexora-invoices-${new Date().toISOString().slice(0, 10)}.csv`, [hdr.join(","), ...rows].join("\n"));
        showToast(t("entExportedToast"));
      });
      document.getElementById("finExportTxCsv").addEventListener("click", () => {
        const hdr = ["ID", "Type", "Category", "Currency", "Amount", "Description", "Date"];
        const rows = txs.map((x) => [x.id, x.txType, x.category, x.currency, x.amount, x.description, x.occurredOn].map(csvCell).join(","));
        downloadFile(`vexora-ledger-${new Date().toISOString().slice(0, 10)}.csv`, [hdr.join(","), ...rows].join("\n"));
        showToast(t("entExportedToast"));
      });
      document.getElementById("finPrintBtn").addEventListener("click", () => window.print?.());
    }
  }

  /* =========================================================
     HR RECRUITMENT & WORKLOAD PANEL
     ========================================================= */
  function renderHrJobsPanel(container, ctx, session, onUpdate) {
    const { t, escapeHtml, Backend, studioState, saveState, showToast } = ctx;
    ensureEcosystemState(studioState);
    const apps = studioState.jobApplications || [];
    const statuses = ["new", "shortlisted", "interview", "hired", "rejected"];

    container.innerHTML = `
      <div class="glass-card stack-list">
        <div class="row-between">
          <div>
            <h3 class="card-title">💼 ${escapeHtml(t("hrJobAppsTitle"))} (${apps.length})</h3>
            <p class="muted-text" style="margin:2px 0 0;font-size:0.84rem;">${escapeHtml(t("hrJobAppsDesc"))}</p>
          </div>
        </div>
        ${
          apps.length === 0
            ? `<p class="muted-text" style="margin:0;">${escapeHtml(t("hrNoAppsYet"))}</p>`
            : apps
                .map(
                  (a) => `
              <div class="glass-card stack-list" style="padding:12px;">
                <div class="row-between" style="flex-wrap:wrap;gap:8px;">
                  <div>
                    <strong>${escapeHtml(a.applicantName)}</strong> — <span style="color:var(--neon-cyan);">${escapeHtml(a.roleApplied)}</span>
                    <div class="muted-text" style="font-size:0.8rem;">${escapeHtml(a.email)}${a.phone ? ` • ${escapeHtml(a.phone)}` : ""} • ${Number(a.experienceYears || 0)} yrs</div>
                  </div>
                  <div style="display:flex;gap:6px;align-items:center;flex-wrap:wrap;">
                    <select data-job-stat="${escapeHtml(a.id)}" style="width:auto;min-height:34px;padding:4px 8px;">
                      ${statuses.map((st) => `<option value="${st}" ${a.status === st ? "selected" : ""}>${st}</option>`).join("")}
                    </select>
                    ${a.status === "hired" ? `<button type="button" class="btn btn-primary btn-sm" data-job-promote="${escapeHtml(a.id)}">+ ${escapeHtml(t("hrPromoteBtn"))}</button>` : ""}
                    <button type="button" class="icon-btn danger" data-job-del="${escapeHtml(a.id)}">🗑️</button>
                  </div>
                </div>
                ${a.cvSummary ? `<p class="muted-text" style="margin:0;white-space:pre-wrap;font-size:0.84rem;">${escapeHtml(a.cvSummary)}</p>` : ""}
                ${ctx.safeHttpUrl(a.portfolioUrl) ? `<a href="${escapeHtml(ctx.safeHttpUrl(a.portfolioUrl))}" target="_blank" rel="noopener noreferrer" class="btn btn-outline btn-sm" style="align-self:flex-start;">Portfolio ↗</a>` : ""}
              </div>
            `
                )
                .join("")
        }
      </div>
    `;

    container.querySelectorAll("[data-job-stat]").forEach((sel) =>
      sel.addEventListener("change", async () => {
        const app = apps.find((x) => x.id === sel.dataset.jobStat);
        if (!app) return;
        app.status = sel.value;
        if (Backend.isConfigured() && Backend.getStoredAuth()?.access_token) {
          try { await Backend.upsertJobApplication(app); } catch (err) { showToast(err.message); return; }
        }
        saveState();
        showToast("✓");
        onUpdate?.();
      })
    );

    container.querySelectorAll("[data-job-promote]").forEach((btn) =>
      btn.addEventListener("click", async () => {
        const app = apps.find((x) => x.id === btn.dataset.jobPromote);
        if (!app) return;
        const member = {
          id: `tm_hr_${Date.now()}`,
          nameEn: app.applicantName,
          nameAr: app.applicantName,
          specializationEn: app.specialization || app.roleApplied,
          specializationAr: app.specialization || app.roleApplied,
          roleEn: app.roleApplied,
          roleAr: app.roleApplied,
          bioEn: app.cvSummary || `${app.roleApplied} at Vexora Studio.`,
          bioAr: app.cvSummary || `${app.roleApplied} في شركة Vexora Studio.`,
          email: app.email,
          employeeStatus: "active",
          systemRole: "editor",
          portfolioUrl: app.portfolioUrl || "",
          cvSummary: app.cvSummary || "",
          skills: (app.specialization || "").split(",").map((s) => s.trim()).filter(Boolean),
          experienceYears: Number(app.experienceYears || 0),
          avatarUrl: "",
          githubUrl: "",
          linkedinUrl: "",
          published: false,
          sortOrder: (studioState.team || []).length + 1
        };
        if (Backend.isConfigured() && Backend.getStoredAuth()?.access_token) {
          try { await Backend.upsertTeamMember(member); } catch (err) { showToast(err.message); return; }
        }
        studioState.team.push(member);
        saveState();
        showToast("✓");
        onUpdate?.();
      })
    );

    container.querySelectorAll("[data-job-del]").forEach((btn) =>
      btn.addEventListener("click", async () => {
        const id = btn.dataset.jobDel;
        if (Backend.isConfigured() && Backend.getStoredAuth()?.access_token) {
          try { await Backend.deleteJobApplication(id); } catch (err) { showToast(err.message); return; }
        }
        studioState.jobApplications = apps.filter((x) => x.id !== id);
        saveState();
        onUpdate?.();
      })
    );
  }

  /* =========================================================
     SYSTEM MONITORING CENTER
     ========================================================= */
  let monProbes = { websiteMs: 0, dbOk: null, dbMs: 0, aiOk: null, aiMs: 0, checkedAt: "" };

  function renderMonitoringCenter(body, ctx, session) {
    const { t, escapeHtml, Backend, studioState, saveState, showToast } = ctx;
    ensureEcosystemState(studioState);
    const logs = studioState.systemLogs || [];
    const unresolvedErrors = logs.filter((l) => !l.resolved && (l.severity === "error" || l.severity === "critical"));
    const aiLogs = studioState.aiLogs || [];
    const aiErrs = aiLogs.filter((l) => l.status === "error").length;

    body.innerHTML = `
      <div class="ent-kpi-grid">
        <div class="glass-card ent-kpi-card"><div class="stat-value" style="color:var(--success);">Online</div><div class="stat-label">${escapeHtml(t("monSiteStatus"))}</div></div>
        <div class="glass-card ent-kpi-card"><div class="stat-value">${monProbes.dbMs ? `${monProbes.dbMs}ms` : "—"}</div><div class="stat-label">${escapeHtml(t("monDbLatency"))}</div></div>
        <div class="glass-card ent-kpi-card"><div class="stat-value">${monProbes.aiMs ? `${monProbes.aiMs}ms` : "—"}</div><div class="stat-label">${escapeHtml(t("monAiLatency"))}</div></div>
        <div class="glass-card ent-kpi-card"><div class="stat-value" style="color:${unresolvedErrors.length ? "var(--error)" : "var(--success)"};">${unresolvedErrors.length}</div><div class="stat-label">${escapeHtml(t("monOpenErrors"))} (${aiErrs} AI)</div></div>
      </div>

      <div class="glass-card highlight-border stack-list">
        <div class="row-between" style="flex-wrap:wrap;gap:8px;">
          <div>
            <h2 class="card-title">🩺 ${escapeHtml(t("entNavMonitoring"))}</h2>
            <p class="muted-text" style="margin:2px 0 0;font-size:0.84rem;">${escapeHtml(t("monDesc"))}</p>
          </div>
          <div class="btn-row">
            <button id="monRunProbeBtn" type="button" class="btn btn-primary btn-sm">⚡ ${escapeHtml(t("monRunProbeBtn"))}</button>
            <button id="monAddTestErrBtn" type="button" class="btn btn-outline btn-sm">🧪 ${escapeHtml(t("monLogCheckBtn"))}</button>
          </div>
        </div>
        <div class="chips-wrap">
          <span class="status-pill success"><span class="pill-dot"></span>Website UI: Operational</span>
          <span class="status-pill ${Backend.isConfigured() ? (monProbes.dbOk === false ? "error" : "cyan") : "warning"}"><span class="pill-dot"></span>Supabase DB: ${Backend.isConfigured() ? (monProbes.dbOk === null ? "Ready" : monProbes.dbOk ? `OK (${monProbes.dbMs}ms)` : "Error") : "Local Preview"}</span>
          <span class="status-pill ${Backend.isAiConfigured() ? (monProbes.aiOk === false ? "error" : "cyan") : "warning"}"><span class="pill-dot"></span>Edge AI API: ${Backend.isAiConfigured() ? (monProbes.aiOk === null ? "Ready" : monProbes.aiOk ? `OK (${monProbes.aiMs}ms)` : "Error") : "Local Grounded"}</span>
        </div>
      </div>

      <div class="glass-card stack-list">
        <h3 class="card-title">📋 ${escapeHtml(t("monSystemLogsTitle"))} (${logs.length})</h3>
        ${
          logs.length === 0
            ? `<p class="muted-text" style="margin:0;">${escapeHtml(t("monNoLogs"))}</p>`
            : `<div class="ent-table-wrap">
                <table class="ent-table">
                  <thead><tr><th>Severity</th><th>Source</th><th>Message</th><th>Status</th><th>${escapeHtml(t("entColDate"))}</th><th>${escapeHtml(t("entColActions"))}</th></tr></thead>
                  <tbody>
                    ${logs.slice(0, 40).map((l) => `
                      <tr>
                        <td><span class="status-pill ${l.severity === "error" || l.severity === "critical" ? "error" : l.severity === "warn" ? "warning" : "cyan"}">${escapeHtml(l.severity)}</span></td>
                        <td>${escapeHtml(l.source)}</td>
                        <td style="max-width:340px;word-break:break-word;">${escapeHtml(l.message)}</td>
                        <td><span class="status-pill ${l.resolved ? "success" : "warning"}">${l.resolved ? "Resolved" : "Open"}</span></td>
                        <td class="muted-text">${escapeHtml((l.createdAt || "").slice(0, 16).replace("T", " "))}</td>
                        <td>${!l.resolved ? `<button type="button" class="btn btn-outline btn-sm" data-log-resolve="${escapeHtml(l.id)}">✓</button>` : "—"}</td>
                      </tr>
                    `).join("")}
                  </tbody>
                </table>
              </div>`
        }
      </div>
    `;

    document.getElementById("monRunProbeBtn").addEventListener("click", async () => {
      const dbRes = await Backend.testConnection();
      const aiRes = await Backend.testAiEndpoint();
      monProbes = {
        websiteMs: Math.round(performance?.now?.() ? 1 : 0),
        dbOk: dbRes.ok,
        dbMs: dbRes.latencyMs || 0,
        aiOk: aiRes.ok,
        aiMs: aiRes.latencyMs || 0,
        checkedAt: new Date().toISOString()
      };
      await logSystemIssue(ctx, {
        source: "health_probe",
        severity: (Backend.isConfigured() && !dbRes.ok) || (Backend.isAiConfigured() && !aiRes.ok) ? "error" : "info",
        message: `Probe — DB:${dbRes.ok ? "ok" : dbRes.reason} (${monProbes.dbMs}ms), AI:${aiRes.ok ? "ok" : aiRes.reason} (${monProbes.aiMs}ms)`,
        route: "monitoring"
      });
      showToast("✓");
      renderMonitoringCenter(body, ctx, session);
    });

    document.getElementById("monAddTestErrBtn").addEventListener("click", async () => {
      await logSystemIssue(ctx, { source: "diagnostic_check", severity: "info", message: `Diagnostic check run by ${session.email}`, route: "admin" });
      showToast("✓");
      renderMonitoringCenter(body, ctx, session);
    });

    body.querySelectorAll("[data-log-resolve]").forEach((btn) =>
      btn.addEventListener("click", async () => {
        const log = logs.find((x) => x.id === btn.dataset.logResolve);
        if (!log) return;
        log.resolved = true;
        if (Backend.isConfigured() && Backend.getStoredAuth()?.access_token) {
          Backend.resolveSystemLog(log.id, true).catch(() => {});
        }
        saveState();
        renderMonitoringCenter(body, ctx, session);
      })
    );
  }

  /* =========================================================
     INTEGRATION CENTER
     ========================================================= */
  function renderIntegrationCenter(body, ctx, session) {
    const { t, isArabic, escapeHtml, Backend, studioState, saveState, showToast } = ctx;
    ensureEcosystemState(studioState);
    const items = studioState.integrationConfigs || [];

    const routeMap = {
      vexora_ai: "ai_control",
      gemini_api: "ai_control",
      admin_panel: "security",
      customer_portal: "clients",
      supabase_db: "database",
      notifications: "notifications",
      project_mgmt: "projects"
    };

    body.innerHTML = `
      <div class="glass-card highlight-border stack-list">
        <div class="row-between" style="flex-wrap:wrap;gap:8px;">
          <div>
            <h2 class="card-title">🔗 ${escapeHtml(t("entNavIntegrations"))}</h2>
            <p class="muted-text" style="margin:2px 0 0;font-size:0.84rem;">${escapeHtml(t("intCenterDesc"))}</p>
          </div>
          <button id="intCheckAllBtn" type="button" class="btn btn-primary btn-sm">🩺 ${escapeHtml(t("intCheckAllBtn"))}</button>
        </div>
        <div class="status-pill success" style="align-self:flex-start;">🛡️ ${escapeHtml(t("intSecurityNote"))}</div>
      </div>

      <div class="two-col-grid">
        ${items
          .map((item) => {
            const targetSec = routeMap[item.key] || "overview";
            return `
            <div class="glass-card stack-list">
              <div class="row-between">
                <strong style="font-size:1rem;">${escapeHtml(isArabic() ? item.nameAr : item.nameEn)}</strong>
                <span class="status-pill ${item.enabled !== false ? "success" : "warning"}">${escapeHtml(item.enabled !== false ? item.status || "connected" : "paused")}</span>
              </div>
              <div class="muted-text" style="font-size:0.8rem;">Category: ${escapeHtml(item.category)}${item.lastCheckedAt ? ` • Checked ${(item.lastCheckedAt || "").slice(0, 16).replace("T", " ")}` : ""}</div>
              <div class="btn-row">
                <button type="button" class="btn btn-outline btn-sm" data-int-toggle="${escapeHtml(item.key)}">${escapeHtml(item.enabled !== false ? t("entDisableBtn") : t("entEnableBtn"))}</button>
                <button type="button" class="btn btn-primary btn-sm" data-int-open="${escapeHtml(targetSec)}">↗ ${escapeHtml(t("intOpenModuleBtn"))}</button>
              </div>
            </div>
          `;
          })
          .join("")}
      </div>
    `;

    document.getElementById("intCheckAllBtn").addEventListener("click", async () => {
      const dbOk = (await Backend.testConnection()).ok;
      const aiOk = (await Backend.testAiEndpoint()).ok;
      const now = new Date().toISOString();
      items.forEach((it) => {
        it.lastCheckedAt = now;
        if (it.key === "supabase_db") it.status = Backend.isConfigured() ? (dbOk ? "connected" : "error") : "local_preview";
        else if (it.key === "gemini_api" || it.key === "vexora_ai") it.status = Backend.isAiConfigured() ? (aiOk ? "connected" : "degraded") : "local_grounded";
        else it.status = it.enabled !== false ? "connected" : "paused";
        if (Backend.isConfigured() && Backend.getStoredAuth()?.access_token) {
          Backend.upsertIntegrationConfig(it).catch(() => {});
        }
      });
      saveState();
      showToast("✓");
      renderIntegrationCenter(body, ctx, session);
    });

    body.querySelectorAll("[data-int-toggle]").forEach((b) =>
      b.addEventListener("click", async () => {
        const it = items.find((x) => x.key === b.dataset.intToggle);
        if (!it) return;
        it.enabled = it.enabled === false;
        it.status = it.enabled ? "connected" : "paused";
        if (Backend.isConfigured() && Backend.getStoredAuth()?.access_token) {
          try { await Backend.upsertIntegrationConfig(it); } catch (err) { showToast(err.message); return; }
        }
        saveState();
        renderIntegrationCenter(body, ctx, session);
      })
    );

    body.querySelectorAll("[data-int-open]").forEach((b) =>
      b.addEventListener("click", () => {
        window.VexoraAdmin?.setActiveSection?.(b.dataset.intOpen);
        ctx.renderScreen();
      })
    );
  }

  /* =========================================================
     AUTOMATION ENGINE
     ========================================================= */
  function renderAutomationEngine(body, ctx, session) {
    const { t, isArabic, escapeHtml, Backend, studioState, saveState, showToast } = ctx;
    ensureEcosystemState(studioState);
    const rules = studioState.automationRules || [];
    const logs = studioState.automationLogs || [];

    body.innerHTML = `
      <div class="glass-card highlight-border stack-list">
        <h2 class="card-title">⚙️ ${escapeHtml(t("entNavAutomations"))}</h2>
        <p class="muted-text" style="margin:0;font-size:0.84rem;">${escapeHtml(t("autoDesc"))}</p>
      </div>

      <div class="stack-list">
        ${rules
          .map(
            (r) => `
          <div class="glass-card row-between" style="flex-wrap:wrap;gap:10px;">
            <div style="min-width:220px;flex:1;">
              <div style="display:flex;gap:8px;align-items:center;flex-wrap:wrap;">
                <strong>${escapeHtml(isArabic() ? r.nameAr : r.nameEn)}</strong>
                <span class="tech-chip">⚡ ${escapeHtml(r.triggerEvent)}</span>
                <span class="status-pill ${r.enabled !== false ? "success" : "warning"}">${r.enabled !== false ? t("entActiveLabel") : t("entDisabledLabel")}</span>
              </div>
              <div class="muted-text" style="font-size:0.8rem;margin-top:4px;">${escapeHtml(r.actionSummary)} • Runs: ${Number(r.runCount || 0)}${r.lastRunAt ? ` • Last: ${(r.lastRunAt || "").slice(0, 16).replace("T", " ")}` : ""}</div>
            </div>
            <div class="btn-row">
              <button type="button" class="btn btn-outline btn-sm" data-auto-toggle="${escapeHtml(r.key)}">${escapeHtml(r.enabled !== false ? t("entDisableBtn") : t("entEnableBtn"))}</button>
              <button type="button" class="btn btn-primary btn-sm" data-auto-test="${escapeHtml(r.triggerEvent)}">▶ ${escapeHtml(t("autoTestBtn"))}</button>
            </div>
          </div>
        `
          )
          .join("")}
      </div>

      <div class="glass-card stack-list">
        <h3 class="card-title">📜 ${escapeHtml(t("autoLogsTitle"))} (${logs.length})</h3>
        ${
          logs.length === 0
            ? `<p class="muted-text" style="margin:0;">${escapeHtml(t("entNoAuditLogs"))}</p>`
            : `<div class="ent-table-wrap">
                <table class="ent-table">
                  <thead><tr><th>Rule</th><th>Trigger</th><th>Status</th><th>Summary</th><th>${escapeHtml(t("entColDate"))}</th></tr></thead>
                  <tbody>
                    ${logs.slice(0, 30).map((l) => `
                      <tr>
                        <td>${escapeHtml(l.ruleKey)}</td>
                        <td><span class="tech-chip">${escapeHtml(l.triggerEvent)}</span></td>
                        <td><span class="status-pill ${l.status === "ok" ? "success" : l.status === "skipped" ? "warning" : "error"}">${escapeHtml(l.status)}</span></td>
                        <td>${escapeHtml(l.summary)}</td>
                        <td class="muted-text">${escapeHtml((l.createdAt || "").slice(0, 16).replace("T", " "))}</td>
                      </tr>
                    `).join("")}
                  </tbody>
                </table>
              </div>`
        }
      </div>
    `;

    body.querySelectorAll("[data-auto-toggle]").forEach((b) =>
      b.addEventListener("click", async () => {
        const rule = rules.find((x) => x.key === b.dataset.autoToggle);
        if (!rule) return;
        rule.enabled = rule.enabled === false;
        if (Backend.isConfigured() && Backend.getStoredAuth()?.access_token) {
          try { await Backend.upsertAutomationRule(rule); } catch (err) { showToast(err.message); return; }
        }
        saveState();
        renderAutomationEngine(body, ctx, session);
      })
    );

    body.querySelectorAll("[data-auto-test]").forEach((b) =>
      b.addEventListener("click", async () => {
        const trg = b.dataset.autoTest;
        const samplePayload =
          trg === "status_changed"
            ? { clientEmail: session.email, title: "Test Notification", status: "In Progress", note: "Automation verification" }
            : trg === "request_accepted"
            ? { requestId: `test_${Date.now()}`, projectTitle: "Demo Automated Project", clientEmail: session.email }
            : trg === "release_published"
            ? { version: "4.1.0-test", titleEn: "Test Release Broadcast", titleAr: "إشعار إصدار تجريبي" }
            : { kind: "Test Alert", source: "automation_test", message: "Automated trigger check verified." };
        const res = await runAutomationEvent(ctx, trg, samplePayload);
        showToast(res.executed ? "✓ Executed" : "Skipped (Rule Disabled)");
        renderAutomationEngine(body, ctx, session);
      })
    );
  }

  window.VexoraEcosystem = {
    DEFAULT_INTEGRATIONS,
    DEFAULT_AUTOMATION_RULES,
    ensureEcosystemState,
    formatCurrency,
    recomputeProjectProgress,
    logSystemIssue,
    runAutomationEvent,
    renderCrmManager,
    openProjectTasksModal,
    renderFinanceManager,
    renderHrJobsPanel,
    renderMonitoringCenter,
    renderIntegrationCenter,
    renderAutomationEngine
  };
})();
