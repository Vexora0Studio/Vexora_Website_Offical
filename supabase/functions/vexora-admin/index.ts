// Vexora Studio — Enterprise Admin Gateway (Supabase Edge Function)
// Enforces server-side JWT verification, RBAC permissions (Owner / Super Admin / Admin / Editor / Support),
// login/audit logging, database health/metrics, admin account management, and optional CI/CD deploy webhook.

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS"
};

const VALID_ROLES = ["owner", "super_admin", "admin", "editor", "support"];

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }
  if (req.method !== "POST") {
    return jsonRes({ error: "Method not allowed" }, 405);
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL") || "";
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "";
    if (!supabaseUrl || !serviceRoleKey) {
      return jsonRes({ error: "Server secrets SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY missing.", errorCode: "unconfigured" }, 503);
    }

    const authHeader = req.headers.get("Authorization") || "";
    const token = authHeader.replace(/^Bearer\s+/i, "").trim();
    if (!token) {
      return jsonRes({ error: "Missing bearer token.", errorCode: "unauthorized" }, 401);
    }

    const adminSb = createClient(supabaseUrl, serviceRoleKey);
    const { data: userData, error: userErr } = await adminSb.auth.getUser(token);
    if (userErr || !userData?.user) {
      return jsonRes({ error: "Invalid or expired session.", errorCode: "unauthorized" }, 401);
    }

    const caller = userData.user;
    const { data: adminRow } = await adminSb
      .from("admin_users")
      .select("user_id, email, full_name, role, is_active")
      .eq("user_id", caller.id)
      .maybeSingle();

    if (!adminRow || !adminRow.is_active) {
      await adminSb.from("login_logs").insert({
        id: `login_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
        email: caller.email || "",
        user_id: caller.id,
        role: adminRow?.role || "none",
        status: "blocked",
        reason: "Account inactive or not listed in admin_users",
        user_agent: (req.headers.get("user-agent") || "").slice(0, 180)
      });
      return jsonRes({ error: "Access denied: inactive or unauthorized admin account.", errorCode: "forbidden" }, 403);
    }

    const callerRole = String(adminRow.role);
    const body = await req.json().catch(() => ({}));
    const action = String(body?.action || "").trim();

    async function writeAudit(act: string, resourceType: string, resourceId: string, details: Record<string, unknown> = {}) {
      await adminSb.from("audit_logs").insert({
        id: `audit_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
        actor_user_id: caller.id,
        actor_email: adminRow?.email || caller.email || "",
        actor_role: callerRole,
        action: act,
        resource_type: resourceType,
        resource_id: resourceId,
        details
      });
    }

    if (action === "get_overview_metrics") {
      const canFinanceAndHr = ["owner", "super_admin", "admin"].includes(callerRole);
      const canCrm = ["owner", "super_admin", "admin", "support"].includes(callerRole);
      const [
        usersRes,
        clientsRes,
        projectsRes,
        reqsRes,
        msgsRes,
        analyticsRes,
        aiRes,
        auditRes,
        loginRes,
        adminsRes,
        crmRes,
        tasksRes,
        filesRes,
        invRes,
        txRes,
        jobsRes,
        sysLogsRes,
        intRes,
        autoRulesRes,
        autoLogsRes
      ] = await Promise.all([
        adminSb.from("client_profiles").select("*", { count: "exact", head: true }),
        adminSb.from("client_profiles").select("user_id,full_name,email,company,phone,status,internal_notes,created_at").order("created_at", { ascending: false }).limit(500),
        adminSb.from("projects").select("*").order("created_at", { ascending: false }),
        adminSb.from("project_requests").select("*").order("created_at", { ascending: false }),
        adminSb.from("contact_messages").select("*").order("created_at", { ascending: false }),
        adminSb.from("analytics_events").select("event_type,route,referrer_source,created_at").order("created_at", { ascending: false }).limit(2000),
        adminSb.from("ai_logs").select("id,user_lang,agent,mode,status,latency_ms,tokens_input,tokens_output,tokens_estimated,model,tools_used,feedback,error_code,error_message,prompt_preview,created_at").order("created_at", { ascending: false }).limit(500),
        adminSb.from("audit_logs").select("*").order("created_at", { ascending: false }).limit(200),
        adminSb.from("login_logs").select("*").order("created_at", { ascending: false }).limit(200),
        adminSb.from("admin_users").select("user_id,email,full_name,role,is_active,last_login_at,created_at").order("created_at", { ascending: true }),
        canCrm ? adminSb.from("crm_leads").select("*").order("created_at", { ascending: false }).limit(500) : Promise.resolve({ data: [] }),
        adminSb.from("project_tasks").select("*").order("created_at", { ascending: false }).limit(1000),
        adminSb.from("project_files").select("*").order("created_at", { ascending: false }).limit(500),
        canFinanceAndHr ? adminSb.from("finance_invoices").select("*").order("created_at", { ascending: false }).limit(500) : Promise.resolve({ data: [] }),
        canFinanceAndHr ? adminSb.from("finance_transactions").select("*").order("created_at", { ascending: false }).limit(500) : Promise.resolve({ data: [] }),
        canFinanceAndHr ? adminSb.from("job_applications").select("*").order("created_at", { ascending: false }).limit(500) : Promise.resolve({ data: [] }),
        canFinanceAndHr ? adminSb.from("system_logs").select("*").order("created_at", { ascending: false }).limit(500) : Promise.resolve({ data: [] }),
        canFinanceAndHr ? adminSb.from("integration_configs").select("*").order("key", { ascending: true }) : Promise.resolve({ data: [] }),
        canFinanceAndHr ? adminSb.from("automation_rules").select("*").order("key", { ascending: true }) : Promise.resolve({ data: [] }),
        canFinanceAndHr ? adminSb.from("automation_logs").select("*").order("created_at", { ascending: false }).limit(200) : Promise.resolve({ data: [] })
      ]);

      return jsonRes({
        ok: true,
        caller: adminRow,
        counts: {
          registeredClients: usersRes.count || 0,
          projectsTotal: projectsRes.data?.length || 0,
          requestsTotal: reqsRes.data?.length || 0,
          messagesTotal: msgsRes.data?.length || 0,
          crmLeadsTotal: crmRes.data?.length || 0,
          invoicesTotal: invRes.data?.length || 0,
          openErrorsTotal: (sysLogsRes.data || []).filter((l: Record<string, unknown>) => !l.resolved && (l.severity === "error" || l.severity === "critical")).length
        },
        clients: clientsRes.data || [],
        analyticsEvents: analyticsRes.data || [],
        aiLogs: aiRes.data || [],
        auditLogs: auditRes.data || [],
        loginLogs: loginRes.data || [],
        adminUsers: adminsRes.data || [],
        crmLeads: crmRes.data || [],
        projectTasks: tasksRes.data || [],
        projectFiles: filesRes.data || [],
        financeInvoices: invRes.data || [],
        financeTransactions: txRes.data || [],
        jobApplications: jobsRes.data || [],
        systemLogs: sysLogsRes.data || [],
        integrationConfigs: intRes.data || [],
        automationRules: autoRulesRes.data || [],
        automationLogs: autoLogsRes.data || []
      });
    }

    if (action === "upsert_admin_user") {
      if (!["owner", "super_admin"].includes(callerRole)) {
        return jsonRes({ error: "Requires Owner or Super Admin role.", errorCode: "forbidden" }, 403);
      }
      const targetEmail = String(body?.email || "").trim().toLowerCase();
      const targetRole = String(body?.role || "editor").trim();
      const targetName = String(body?.fullName || "").trim();
      const isActive = body?.isActive !== false;
      if (!targetEmail.includes("@") || !VALID_ROLES.includes(targetRole)) {
        return jsonRes({ error: "Invalid email or role." }, 400);
      }
      if (targetRole === "owner" && callerRole !== "owner") {
        return jsonRes({ error: "Only the Owner can assign Owner role." }, 403);
      }

      const { data: listed } = await adminSb.auth.admin.listUsers({ page: 1, perPage: 1000 });
      const matchedUser = (listed?.users || []).find((u) => (u.email || "").toLowerCase() === targetEmail);
      if (!matchedUser) {
        return jsonRes({ error: "User must first register in Auth / Client Portal before receiving admin permissions." }, 404);
      }

      if (matchedUser.id === caller.id && callerRole === "owner" && (!isActive || targetRole !== "owner")) {
        return jsonRes({ error: "Cannot demote or disable the active Owner account." }, 400);
      }

      const { error: upErr } = await adminSb.from("admin_users").upsert({
        user_id: matchedUser.id,
        email: targetEmail,
        full_name: targetName || matchedUser.user_metadata?.full_name || targetEmail.split("@")[0],
        role: targetRole,
        is_active: isActive,
        created_by: caller.id
      });
      if (upErr) return jsonRes({ error: upErr.message }, 500);

      await writeAudit("upsert_admin_user", "admin_users", matchedUser.id, { targetEmail, targetRole, isActive });
      return jsonRes({ ok: true });
    }

    if (action === "toggle_client_status") {
      if (!["owner", "super_admin", "admin", "support"].includes(callerRole)) {
        return jsonRes({ error: "Insufficient role.", errorCode: "forbidden" }, 403);
      }
      const targetUserId = String(body?.userId || "").trim();
      const status = body?.status === "disabled" ? "disabled" : "active";
      const internalNotes = typeof body?.internalNotes === "string" ? body.internalNotes : undefined;
      if (!targetUserId) return jsonRes({ error: "Missing userId" }, 400);

      const patch: Record<string, unknown> = { status, updated_at: new Date().toISOString() };
      if (internalNotes !== undefined) patch.internal_notes = internalNotes;

      const { error: clErr } = await adminSb.from("client_profiles").update(patch).eq("user_id", targetUserId);
      if (clErr) return jsonRes({ error: clErr.message }, 500);

      await writeAudit("update_client_profile", "client_profiles", targetUserId, { status });
      return jsonRes({ ok: true });
    }

    if (action === "run_automation_event") {
      if (!["owner", "super_admin", "admin", "editor", "support"].includes(callerRole)) {
        return jsonRes({ error: "Insufficient role.", errorCode: "forbidden" }, 403);
      }
      const trigger = String(body?.triggerEvent || "").trim();
      const payload = (body?.payload && typeof body.payload === "object") ? body.payload as Record<string, unknown> : {};
      const nowIso = new Date().toISOString();

      const { data: rules } = await adminSb.from("automation_rules").select("*").eq("trigger_event", trigger);
      const rule = (rules || [])[0];
      if (!rule || rule.enabled === false) {
        await adminSb.from("automation_logs").insert({
          id: `autolog_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
          rule_key: rule?.key || trigger,
          trigger_event: trigger,
          status: "skipped",
          summary: `Automation skipped (rule disabled or not found for ${trigger})`,
          payload
        });
        return jsonRes({ ok: true, executed: false, skipped: true });
      }

      let summary = "";
      let createdProject: Record<string, unknown> | null = null;
      let createdTasks: Record<string, unknown>[] = [];
      let createdUpdate: Record<string, unknown> | null = null;

      if (trigger === "status_changed" && payload.clientEmail) {
        const updRow = {
          id: `upd_auto_${Date.now()}_${Math.random().toString(36).slice(2, 5)}`,
          kind: "notification",
          title_en: `Status Update: ${String(payload.title || "Your Project")}`,
          title_ar: `تحديث الحالة: ${String(payload.title || "مشروعك")}`,
          body_en: `Your request/project status changed to "${String(payload.status || "updated")}". ${String(payload.note || "")}`.trim(),
          body_ar: `تم تحديث حالة طلبك/مشروعك إلى "${String(payload.status || "محدّث")}". ${String(payload.note || "")}`.trim(),
          image_url: "",
          target_route: "client",
          target_group: "specific_email",
          target_email: String(payload.clientEmail).toLowerCase(),
          delivery_status: "published",
          pinned: false,
          published: true
        };
        await adminSb.from("updates_feed").insert(updRow);
        createdUpdate = updRow;
        summary = `Notified client ${payload.clientEmail} on status -> ${payload.status}`;
      } else if (trigger === "request_accepted" && payload.requestId) {
        const reqTitle = String(payload.projectTitle || "Client Software Project").trim();
        const projId = `proj_req_${String(payload.requestId).replace(/[^a-zA-Z0-9_-]/g, "").slice(0, 24)}`;
        const projRow = {
          id: projId,
          name_en: reqTitle,
          name_ar: reqTitle,
          description_en: String(payload.description || "Client software delivery project created automatically from accepted request."),
          description_ar: String(payload.description || "مشروع برمجي تم إنشاؤه تلقائياً عند قبول طلب العميل."),
          category: String(payload.category || "Software Systems"),
          status: "In Progress",
          progress_pct: 10,
          current_phase: "Architecture & Setup",
          client_user_id: payload.clientUserId || null,
          client_email: String(payload.clientEmail || "").toLowerCase(),
          technologies: Array.isArray(payload.technologies) ? payload.technologies : ["Web", "Cloud", "API"],
          assigned_team: Array.isArray(payload.assignedTeam) ? payload.assignedTeam : [],
          featured: false,
          published: false
        };
        await adminSb.from("projects").upsert(projRow);
        const starterTitles = [
          { title: "Discovery & Technical Architecture", phase: "Planning", status: "in_progress", priority: "high" },
          { title: "UI/UX Wireframes & System Design", phase: "Design", status: "todo", priority: "medium" },
          { title: "Core Engineering & API Integration", phase: "Development", status: "todo", priority: "high" },
          { title: "QA Testing & Client Review", phase: "QA", status: "todo", priority: "medium" }
        ];
        const taskRows = starterTitles.map((st, idx) => ({
          id: `tsk_${projId}_${idx + 1}`,
          project_id: projId,
          title: st.title,
          phase: st.phase,
          status: st.status,
          priority: st.priority
        }));
        await adminSb.from("project_tasks").upsert(taskRows);
        createdProject = projRow;
        createdTasks = taskRows;
        summary = `Created project ${projId} with ${taskRows.length} starter tasks`;
      } else if (trigger === "release_published") {
        const ver = String(payload.version || "1.0.0");
        const updRow = {
          id: `upd_rel_${Date.now()}`,
          kind: "update",
          title_en: `New Release ${ver}: ${String(payload.titleEn || "Vexora Platform Update")}`,
          title_ar: `إصدار جديد ${ver}: ${String(payload.titleAr || "تحديث منصة Vexora")}`,
          body_en: String(payload.changelogEn || "Platform improvements deployed."),
          body_ar: String(payload.changelogAr || "تم نشر تحسينات جديدة على المنصة."),
          image_url: "",
          target_route: "updates",
          target_group: "all",
          target_email: "",
          delivery_status: "published",
          pinned: true,
          published: true
        };
        await adminSb.from("updates_feed").insert(updRow);
        createdUpdate = updRow;
        summary = `Published release notification for v${ver}`;
      } else if (trigger === "inbound_created" || trigger === "system_error") {
        const isErr = trigger === "system_error";
        const updRow = {
          id: `upd_adm_${Date.now()}_${Math.random().toString(36).slice(2, 5)}`,
          kind: "notification",
          title_en: isErr ? `System Error Alert: ${String(payload.source || "API")}` : `New Inbound ${String(payload.kind || "Lead/Request")}`,
          title_ar: isErr ? `تنبيه خطأ نظام: ${String(payload.source || "API")}` : `نشاط وارد جديد: ${String(payload.kind || "طلب/عميل")}`,
          body_en: String(payload.message || "Please review in Admin Dashboard."),
          body_ar: String(payload.message || "يرجى المراجعة من لوحة التحكم الإدارية."),
          image_url: "",
          target_route: "admin",
          target_group: "admins",
          target_email: "",
          delivery_status: "published",
          pinned: false,
          published: true
        };
        await adminSb.from("updates_feed").insert(updRow);
        createdUpdate = updRow;
        summary = updRow.title_en;
      }

      await adminSb.from("automation_rules").update({
        run_count: Number(rule.run_count || 0) + 1,
        last_run_at: nowIso,
        updated_at: nowIso
      }).eq("key", rule.key);

      await adminSb.from("automation_logs").insert({
        id: `autolog_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
        rule_key: rule.key,
        trigger_event: trigger,
        status: "ok",
        summary,
        payload
      });
      await writeAudit("run_automation_event", "automation_rules", rule.key, { trigger, summary });
      return jsonRes({ ok: true, executed: true, summary, createdProject, createdTasks, createdUpdate });
    }

    if (action === "get_db_health") {
      if (!["owner", "super_admin", "admin"].includes(callerRole)) {
        return jsonRes({ error: "Insufficient role.", errorCode: "forbidden" }, 403);
      }
      const tables = [
        "site_settings",
        "services",
        "projects",
        "project_tasks",
        "project_files",
        "team_members",
        "job_applications",
        "knowledge_base",
        "faqs",
        "client_profiles",
        "project_requests",
        "crm_leads",
        "finance_invoices",
        "finance_transactions",
        "contact_messages",
        "updates_feed",
        "site_releases",
        "analytics_events",
        "system_logs",
        "integration_configs",
        "automation_rules",
        "automation_logs",
        "audit_logs",
        "login_logs",
        "ai_logs",
        "ai_conversations",
        "ai_memories",
        "ai_knowledge_docs",
        "ai_knowledge_chunks",
        "admin_users"
      ];
      const counts = await Promise.all(
        tables.map(async (tbl) => {
          const { count, error } = await adminSb.from(tbl).select("*", { count: "exact", head: true });
          return { table: tbl, rows: error ? null : (count || 0), ok: !error, error: error?.message || "" };
        })
      );
      return jsonRes({ ok: true, tables: counts, checkedAt: new Date().toISOString() });
    }

    if (action === "purge_telemetry_logs") {
      if (callerRole !== "owner" || body?.confirmPhrase !== "OWNER_CONFIRM_PURGE") {
        return jsonRes({ error: "Only Owner with explicit confirmation can purge telemetry logs.", errorCode: "forbidden" }, 403);
      }
      const targetTable = String(body?.table || "");
      if (!["analytics_events", "ai_logs", "system_logs", "automation_logs"].includes(targetTable)) {
        return jsonRes({ error: "Invalid log table." }, 400);
      }
      const { error } = await adminSb.from(targetTable).delete().neq("id", "");
      if (error) return jsonRes({ error: error.message }, 500);

      await writeAudit("purge_telemetry_logs", targetTable, "all", {});
      return jsonRes({ ok: true });
    }

    if (action === "trigger_release_webhook") {
      if (!["owner", "super_admin"].includes(callerRole)) {
        return jsonRes({ error: "Only Owner or Super Admin can trigger deployment webhooks.", errorCode: "forbidden" }, 403);
      }
      const webhookUrl = Deno.env.get("GITHUB_DEPLOY_HOOK_URL") || "";
      const webhookToken = Deno.env.get("GITHUB_DEPLOY_TOKEN") || "";
      if (!webhookUrl) {
        return jsonRes({
          ok: false,
          configured: false,
          message: "No server-side GITHUB_DEPLOY_HOOK_URL secret configured. Release saved in database changelog."
        }, 200);
      }
      const hookRes = await fetch(webhookUrl, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(webhookToken ? { Authorization: `Bearer ${webhookToken}` } : {})
        },
        body: JSON.stringify({
          event_type: "vexora_release",
          version: String(body?.version || ""),
          deploy_target: String(body?.deployTarget || "github_pages"),
          triggered_by: adminRow.email
        })
      });
      await writeAudit("trigger_release_webhook", "site_releases", String(body?.version || ""), { status: hookRes.status });
      return jsonRes({ ok: hookRes.ok, configured: true, status: hookRes.status });
    }

    return jsonRes({ error: "Unknown admin action." }, 400);
  } catch (err) {
    return jsonRes({ error: String(err), errorCode: "server" }, 500);
  }
});

function jsonRes(payload: Record<string, unknown>, status = 200) {
  return new Response(JSON.stringify(payload), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" }
  });
}
