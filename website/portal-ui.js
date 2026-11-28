// Vexora Studio — Modular Client Portal, Updates/Notifications Center, Portfolio Video & Admin Analytics Module
(function () {
  function safeVideoInfo(rawUrl) {
    const val = String(rawUrl || "").trim();
    if (!val || !/^https?:\/\//i.test(val)) return null;
    try {
      const u = new URL(val);
      const host = u.hostname.replace(/^www\./i, "").toLowerCase();
      let ytId = "";
      if (host === "youtu.be") {
        ytId = u.pathname.replace(/^\/+/, "").split("/")[0];
      } else if (host === "youtube.com" || host === "m.youtube.com" || host === "youtube-nocookie.com") {
        if (u.pathname.startsWith("/watch")) {
          ytId = u.searchParams.get("v") || "";
        } else if (u.pathname.startsWith("/embed/") || u.pathname.startsWith("/shorts/")) {
          ytId = u.pathname.split("/")[2] || "";
        }
      }
      if (ytId && /^[a-zA-Z0-9_-]{11}$/.test(ytId)) {
        return {
          type: "youtube",
          embedUrl: `https://www.youtube-nocookie.com/embed/${ytId}?rel=0`,
          rawUrl: val
        };
      }
      if (/\.(mp4|webm|ogg)(\?.*)?$/i.test(u.pathname + u.search)) {
        return { type: "video", srcUrl: val, rawUrl: val };
      }
      return { type: "external", rawUrl: val };
    } catch {
      return null;
    }
  }

  function renderVideoPlayerHtml(rawUrl, escapeHtml) {
    const info = safeVideoInfo(rawUrl);
    if (!info) return "";
    if (info.type === "youtube") {
      return `
        <div class="project-video-frame">
          <iframe
            src="${escapeHtml(info.embedUrl)}"
            title="Project Demo Video"
            loading="lazy"
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
            allowfullscreen
            referrerpolicy="strict-origin-when-cross-origin"
          ></iframe>
        </div>`;
    }
    if (info.type === "video") {
      return `
        <div class="project-video-frame">
          <video controls preload="metadata" playsinline src="${escapeHtml(info.srcUrl)}"></video>
        </div>`;
    }
    return `
      <a href="${escapeHtml(info.rawUrl)}" target="_blank" rel="noopener noreferrer" class="btn btn-outline btn-sm">
        🎬 ${escapeHtml(info.rawUrl)} ↗
      </a>`;
  }

  async function hashClientCredential(email, password) {
    const input = `vx_client_v1:${String(email || "").trim().toLowerCase()}:${String(password || "")}`;
    try {
      if (typeof crypto !== "undefined" && crypto.subtle && typeof TextEncoder !== "undefined") {
        const bytes = new TextEncoder().encode(input);
        const digest = await crypto.subtle.digest("SHA-256", bytes);
        return Array.from(new Uint8Array(digest))
          .map((b) => b.toString(16).padStart(2, "0"))
          .join("");
      }
    } catch {
      // Fallback below
    }
    let h1 = 2166136261;
    for (let i = 0; i < input.length; i++) {
      h1 ^= input.charCodeAt(i);
      h1 = Math.imul(h1, 16777619);
    }
    return `fnv_${(h1 >>> 0).toString(16)}_${input.length}`;
  }

  function requestStatusMeta(status, t) {
    switch (status) {
      case "reviewing":
        return { cls: "cyan", label: t("reqStatusReviewing"), step: 2 };
      case "in_progress":
        return { cls: "warning", label: t("reqStatusInProgress"), step: 3 };
      case "completed":
        return { cls: "success", label: t("reqStatusCompleted"), step: 4 };
      default:
        return { cls: "cyan", label: t("reqStatusSubmitted"), step: 1 };
    }
  }

  function renderClientScreen(root, ctx) {
    const {
      t,
      isArabic,
      escapeHtml,
      Backend,
      studioState,
      saveState,
      showToast,
      renderScreen,
      trackEvent,
      localClientStorage
    } = ctx;

    const cloudConfigured = Backend.isConfigured();
    const activeClient = ctx.getActiveClientSession();

    if (!activeClient) {
      const mode = ctx.getClientAuthTab();
      root.innerHTML = `
        <div>
          <h1 class="screen-title">👤 ${escapeHtml(t("clientHeadline"))}</h1>
          <p class="screen-subtitle">${escapeHtml(t("clientSubheadline"))}</p>
        </div>

        <div class="glass-card highlight-border stack-list">
          <div class="chips-scroll">
            <button type="button" class="chip-btn ${mode === "signin" ? "active" : ""}" data-client-auth-tab="signin">
              🔑 ${escapeHtml(t("clientTabSignIn"))}
            </button>
            <button type="button" class="chip-btn ${mode === "signup" ? "active" : ""}" data-client-auth-tab="signup">
              ✨ ${escapeHtml(t("clientTabSignUp"))}
            </button>
          </div>

          <div class="status-pill ${cloudConfigured ? "success" : "cyan"}">
            <span class="pill-dot"></span>
            ${escapeHtml(cloudConfigured ? t("clientCloudNotice") : t("clientLocalNotice"))}
          </div>

          ${
            mode === "signin"
              ? `
            <form id="clientSignInForm" class="stack-list" novalidate>
              <div class="field">
                <label for="clInEmail">${escapeHtml(t("clientEmailLabel"))}</label>
                <input id="clInEmail" type="email" autocomplete="email" required />
              </div>
              <div class="field">
                <label for="clInPass">${escapeHtml(t("clientPasswordLabel"))}</label>
                <input id="clInPass" type="password" autocomplete="current-password" minlength="6" required />
              </div>
              <div id="clAuthErr" class="error-text"></div>
              <button id="clInSubmit" type="submit" class="btn btn-primary btn-full">🔑 ${escapeHtml(t("clientSignInBtn"))}</button>
            </form>
          `
              : `
            <form id="clientSignUpForm" class="stack-list" novalidate>
              <div class="form-two-col">
                <div class="field">
                  <label for="clUpName">${escapeHtml(t("clientFullNameLabel"))}</label>
                  <input id="clUpName" type="text" required />
                </div>
                <div class="field">
                  <label for="clUpEmail">${escapeHtml(t("clientEmailLabel"))}</label>
                  <input id="clUpEmail" type="email" autocomplete="email" required />
                </div>
              </div>
              <div class="form-two-col">
                <div class="field">
                  <label for="clUpCompany">${escapeHtml(t("clientCompanyLabel"))}</label>
                  <input id="clUpCompany" type="text" />
                </div>
                <div class="field">
                  <label for="clUpPhone">${escapeHtml(t("clientPhoneLabel"))}</label>
                  <input id="clUpPhone" type="tel" />
                </div>
              </div>
              <div class="field">
                <label for="clUpPass">${escapeHtml(t("clientPasswordLabel"))}</label>
                <input id="clUpPass" type="password" autocomplete="new-password" minlength="6" required />
              </div>
              <div id="clAuthErr" class="error-text"></div>
              <button id="clUpSubmit" type="submit" class="btn btn-primary btn-full">✨ ${escapeHtml(t("clientSignUpBtn"))}</button>
            </form>
          `
          }
        </div>
      `;

      root.querySelectorAll("[data-client-auth-tab]").forEach((b) => {
        b.addEventListener("click", () => {
          ctx.setClientAuthTab(b.dataset.clientAuthTab);
          renderScreen();
        });
      });

      const signInForm = document.getElementById("clientSignInForm");
      if (signInForm) {
        signInForm.addEventListener("submit", async (e) => {
          e.preventDefault();
          const email = document.getElementById("clInEmail").value.trim().toLowerCase();
          const pass = document.getElementById("clInPass").value;
          const err = document.getElementById("clAuthErr");
          const btn = document.getElementById("clInSubmit");
          if (!email.includes("@") || pass.length < 6) {
            err.textContent = t("validationError");
            return;
          }
          err.textContent = "";
          btn.disabled = true;
          try {
            if (cloudConfigured) {
              await Backend.signInClient(email, pass);
              await ctx.syncClientCloudData();
            } else {
              const pwdHash = await hashClientCredential(email, pass);
              const matched = localClientStorage.verifyAccount(email, pwdHash);
              if (!matched) {
                throw new Error(t("adminInvalidAuth"));
              }
              localClientStorage.setSession(matched);
            }
            showToast("✓");
            renderScreen();
          } catch (authErr) {
            err.textContent = authErr?.message || t("adminInvalidAuth");
          } finally {
            btn.disabled = false;
          }
        });
      }

      const signUpForm = document.getElementById("clientSignUpForm");
      if (signUpForm) {
        signUpForm.addEventListener("submit", async (e) => {
          e.preventDefault();
          const fullName = document.getElementById("clUpName").value.trim();
          const email = document.getElementById("clUpEmail").value.trim().toLowerCase();
          const company = document.getElementById("clUpCompany").value.trim();
          const phone = document.getElementById("clUpPhone").value.trim();
          const pass = document.getElementById("clUpPass").value;
          const err = document.getElementById("clAuthErr");
          const btn = document.getElementById("clUpSubmit");
          if (fullName.length < 2 || !email.includes("@") || pass.length < 6) {
            err.textContent = t("validationError");
            return;
          }
          err.textContent = "";
          btn.disabled = true;
          try {
            if (cloudConfigured) {
              const res = await Backend.signUpClient(fullName, email, pass, company, phone);
              if (res.emailConfirmationRequired) {
                showToast(t("clientConfirmEmailMsg"));
                ctx.setClientAuthTab("signin");
                renderScreen();
                return;
              }
              await ctx.syncClientCloudData();
            } else {
              const pwdHash = await hashClientCredential(email, pass);
              const created = localClientStorage.createAccount({ fullName, email, company, phone, pwdHash });
              localClientStorage.setSession(created);
            }
            showToast("✓");
            renderScreen();
          } catch (upErr) {
            err.textContent = upErr?.message || t("validationError");
          } finally {
            btn.disabled = false;
          }
        });
      }
      return;
    }

    const portalTab = ctx.getClientPortalTab();
    const ce = activeClient.email.toLowerCase();
    const clientRequests = (studioState.projectRequests || []).filter(
      (r) => r.userId === activeClient.userId || (r.clientEmail || "").toLowerCase() === ce
    );
    const clientProjects = (studioState.projects || []).filter(
      (p) => (p.clientUserId && p.clientUserId === activeClient.userId) || (p.clientEmail || "").toLowerCase() === ce
    );
    const clientFiles = (studioState.projectFiles || []).filter(
      (f) => (f.clientUserId && f.clientUserId === activeClient.userId) || (f.clientEmail || "").toLowerCase() === ce
    );
    const clientInvoices = (studioState.financeInvoices || []).filter(
      (inv) => inv.status !== "draft" && ((inv.clientUserId && inv.clientUserId === activeClient.userId) || (inv.clientEmail || "").toLowerCase() === ce)
    );
    const clientMessages = (studioState.messages || []).filter(
      (m) => (m.userId && m.userId === activeClient.userId) || (m.email || "").toLowerCase() === ce
    );
    const clientNotifs = (studioState.updates || []).filter(
      (u) =>
        u.published !== false &&
        ((u.targetGroup === "specific_email" || u.targetGroup === "specific") && (u.targetEmail || "").toLowerCase() === ce)
    );
    const publishedServices = studioState.services.filter((s) => s.published);

    root.innerHTML = `
      <div class="row-between" style="flex-wrap:wrap;">
        <div>
          <h1 class="screen-title">👤 ${escapeHtml(t("clientHeadline"))}</h1>
          <p class="screen-subtitle">${escapeHtml(t("clientWelcomeLabel"))}: <strong style="color:var(--neon-cyan);">${escapeHtml(activeClient.fullName)}</strong> (${escapeHtml(activeClient.email)})</p>
        </div>
        <button id="clientSignOutBtn" type="button" class="btn btn-outline btn-sm">🔓 ${escapeHtml(t("clientSignOutBtn"))}</button>
      </div>

      ${
        clientNotifs.length > 0
          ? `<div class="glass-card highlight-border stack-list" style="padding:12px;">
              <strong style="color:var(--neon-cyan);font-size:0.88rem;">🔔 ${escapeHtml(t("clientPersonalNotifsTitle"))} (${clientNotifs.length})</strong>
              ${clientNotifs.slice(0, 3).map((n) => `
                <div style="font-size:0.84rem;border-top:1px solid var(--subtle-outline);padding-top:6px;">
                  <strong>${escapeHtml(isArabic() ? n.titleAr : n.titleEn)}</strong> — <span class="muted-text">${escapeHtml(isArabic() ? n.bodyAr : n.bodyEn)}</span>
                </div>
              `).join("")}
            </div>`
          : ""
      }

      <div class="chips-scroll">
        <button type="button" class="chip-btn ${portalTab === "my_projects" ? "active" : ""}" data-cl-tab="my_projects">
          🚀 ${escapeHtml(t("clientTabProjects"))} (${clientProjects.length})
        </button>
        <button type="button" class="chip-btn ${portalTab === "new_request" ? "active" : ""}" data-cl-tab="new_request">
          ➕ ${escapeHtml(t("clientTabNewRequest"))}
        </button>
        <button type="button" class="chip-btn ${portalTab === "my_requests" ? "active" : ""}" data-cl-tab="my_requests">
          📋 ${escapeHtml(t("clientTabMyRequests"))} (${clientRequests.length})
        </button>
        <button type="button" class="chip-btn ${portalTab === "files" ? "active" : ""}" data-cl-tab="files">
          📁 ${escapeHtml(t("clientTabFiles"))} (${clientFiles.length})
        </button>
        <button type="button" class="chip-btn ${portalTab === "invoices" ? "active" : ""}" data-cl-tab="invoices">
          🧾 ${escapeHtml(t("clientTabInvoices"))} (${clientInvoices.length})
        </button>
        <button type="button" class="chip-btn ${portalTab === "support" ? "active" : ""}" data-cl-tab="support">
          💬 ${escapeHtml(t("clientTabSupport"))} (${clientMessages.length})
        </button>
      </div>

      <div id="clientPortalBody" class="stack-list"></div>
    `;

    document.getElementById("clientSignOutBtn").addEventListener("click", () => {
      if (cloudConfigured) Backend.signOutClient();
      localClientStorage.setSession(null);
      renderScreen();
    });

    root.querySelectorAll("[data-cl-tab]").forEach((btn) => {
      btn.addEventListener("click", () => {
        ctx.setClientPortalTab(btn.dataset.clTab);
        renderScreen();
      });
    });

    const portalBody = document.getElementById("clientPortalBody");

    if (portalTab === "new_request") {
      portalBody.innerHTML = `
        <form id="clientRequestForm" class="glass-card highlight-border stack-list" novalidate>
          <h2 class="card-title" style="color:var(--neon-cyan);">🚀 ${escapeHtml(t("clientTabNewRequest"))}</h2>
          <div class="form-two-col">
            <div class="field">
              <label for="reqTitle">${escapeHtml(t("clientProjectTitleLabel"))}</label>
              <input id="reqTitle" type="text" required />
            </div>
            <div class="field">
              <label for="reqService">${escapeHtml(t("requestedServiceLabel"))}</label>
              <select id="reqService">
                <option value="">${escapeHtml(t("noSpecificServiceOption"))}</option>
                ${publishedServices
                  .map((s) => {
                    const label = isArabic() ? s.titleAr : s.titleEn;
                    return `<option value="${escapeHtml(label)}">${escapeHtml(label)}</option>`;
                  })
                  .join("")}
              </select>
            </div>
          </div>
          <div class="form-two-col">
            <div class="field">
              <label for="reqBudget">${escapeHtml(t("clientBudgetLabel"))}</label>
              <input id="reqBudget" type="text" />
            </div>
            <div class="field">
              <label for="reqTimeline">${escapeHtml(t("clientTimelineLabel"))}</label>
              <input id="reqTimeline" type="text" />
            </div>
          </div>
          <div class="field">
            <label for="reqDesc">${escapeHtml(t("clientDescLabel"))}</label>
            <textarea id="reqDesc" rows="4" required></textarea>
          </div>
          <div id="reqErr" class="error-text"></div>
          <button id="reqSubmitBtn" type="submit" class="btn btn-primary btn-full">🚀 ${escapeHtml(t("clientSubmitRequestBtn"))}</button>
        </form>
      `;

      document.getElementById("clientRequestForm").addEventListener("submit", async (e) => {
        e.preventDefault();
        const projectTitle = document.getElementById("reqTitle").value.trim();
        const serviceName = document.getElementById("reqService").value.trim();
        const budgetRange = document.getElementById("reqBudget").value.trim();
        const timeline = document.getElementById("reqTimeline").value.trim();
        const description = document.getElementById("reqDesc").value.trim();
        const err = document.getElementById("reqErr");
        const btn = document.getElementById("reqSubmitBtn");

        if (projectTitle.length < 2 || description.length < 10) {
          err.textContent = t("validationError");
          return;
        }
        err.textContent = "";
        btn.disabled = true;

        const now = new Date().toISOString();
        const reqObj = {
          id: `req_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
          userId: activeClient.userId,
          clientName: activeClient.fullName,
          clientEmail: activeClient.email,
          serviceName,
          projectTitle,
          description,
          budgetRange,
          timeline,
          status: "submitted",
          adminNote: "",
          createdAt: now,
          updatedAt: now
        };

        if (cloudConfigured && Backend.getStoredClientAuth()?.access_token) {
          try {
            await Backend.submitProjectRequest(reqObj);
          } catch (subErr) {
            err.textContent = subErr?.message || t("validationError");
            btn.disabled = false;
            return;
          }
        }

        if (!Array.isArray(studioState.projectRequests)) studioState.projectRequests = [];
        studioState.projectRequests.unshift(reqObj);
        trackEvent("client_request", "client");
        if (window.VexoraEcosystem?.runAutomationEvent) {
          await window.VexoraEcosystem.runAutomationEvent({ studioState, saveState, Backend }, "inbound_created", {
            kind: "Client Project Request",
            message: `${activeClient.fullName} (${activeClient.email}) requested "${projectTitle}"`
          });
        }
        saveState();
        btn.disabled = false;
        showToast(t("clientRequestSubmittedToast"));
        ctx.setClientPortalTab("my_requests");
        renderScreen();
      });
    } else if (portalTab === "my_projects") {
      const allTasks = studioState.projectTasks || [];
      portalBody.innerHTML = clientProjects.length === 0
        ? `<div class="glass-card stack-list"><p class="muted-text" style="margin:0;">${escapeHtml(t("clientNoProjectsYet"))}</p><button id="clGoReqBtn" type="button" class="btn btn-primary btn-sm" style="align-self:flex-start;">+ ${escapeHtml(t("clientTabNewRequest"))}</button></div>`
        : clientProjects.map((p) => {
            const pTasks = allTasks.filter((tk) => tk.projectId === p.id);
            const pct = Math.max(0, Math.min(100, Number(p.progressPct || 0)));
            return `
              <article class="glass-card highlight-border stack-list">
                <div class="row-between" style="flex-wrap:wrap;gap:8px;">
                  <div>
                    <h3 class="card-title">${escapeHtml(isArabic() ? p.nameAr : p.nameEn)}</h3>
                    <div class="muted-text" style="font-size:0.82rem;">${escapeHtml(p.category)} • ${escapeHtml(p.currentPhase || "In Progress")}${p.deadline ? ` • 📅 ${escapeHtml(p.deadline)}` : ""}</div>
                  </div>
                  <span class="status-pill cyan">${pct}%</span>
                </div>
                <div class="analytics-bar-track"><div class="analytics-bar-fill" style="width:${pct}%"></div></div>
                <p class="muted-text" style="margin:0;">${escapeHtml(isArabic() ? p.descriptionAr : p.descriptionEn)}</p>
                ${
                  pTasks.length > 0
                    ? `<div class="stack-list" style="gap:6px;">
                        <strong style="font-size:0.84rem;color:var(--neon-cyan);">${escapeHtml(t("projTasksTitle"))} (${pTasks.filter((x) => x.status === "done").length}/${pTasks.length})</strong>
                        ${pTasks.map((tk) => `
                          <div class="row-between" style="font-size:0.82rem;padding:6px 10px;border-radius:8px;background:rgba(15,23,42,0.55);">
                            <span>${escapeHtml(tk.title)}</span>
                            <span class="status-pill ${tk.status === "done" ? "success" : tk.status === "in_progress" ? "warning" : "cyan"}">${escapeHtml(tk.status)}</span>
                          </div>
                        `).join("")}
                      </div>`
                    : ""
                }
              </article>
            `;
          }).join("");
      document.getElementById("clGoReqBtn")?.addEventListener("click", () => {
        ctx.setClientPortalTab("new_request");
        renderScreen();
      });
    } else if (portalTab === "files") {
      portalBody.innerHTML = `
        <form id="clientFileUploadForm" class="glass-card highlight-border stack-list">
          <h2 class="card-title" style="color:var(--neon-cyan);">📁 ${escapeHtml(t("clientUploadFileTitle"))}</h2>
          <p class="muted-text" style="margin:0;font-size:0.84rem;">${escapeHtml(t("clientUploadFileSub"))}</p>
          <div class="form-two-col">
            <div class="field"><label>${escapeHtml(t("entNavProjects"))}</label>
              <select id="cfProj">
                <option value="">—</option>
                ${clientProjects.map((p) => `<option value="${escapeHtml(p.id)}">${escapeHtml(isArabic() ? p.nameAr : p.nameEn)}</option>`).join("")}
              </select>
            </div>
            <div class="field"><label>${escapeHtml(t("clientFileNotesLabel"))}</label><input id="cfNotes" /></div>
          </div>
          <div class="field"><input id="cfInput" type="file" accept=".pdf,.png,.jpg,.jpeg,.webp,.docx,.xlsx,.csv,.txt,.zip,.json" required /></div>
          <div id="cfErr" class="error-text"></div>
          <button id="cfSubmitBtn" type="submit" class="btn btn-primary btn-sm">⬆️ ${escapeHtml(t("clientUploadBtn"))}</button>
        </form>
        ${
          clientFiles.length === 0
            ? `<div class="glass-card"><p class="muted-text" style="margin:0;">${escapeHtml(t("clientNoFilesYet"))}</p></div>`
            : clientFiles.map((f) => `
              <div class="glass-card row-between" style="flex-wrap:wrap;gap:8px;">
                <div>
                  <strong>📄 ${escapeHtml(f.fileName)}</strong>
                  <div class="muted-text" style="font-size:0.78rem;">${Math.max(1, Math.round((f.sizeBytes || 0) / 1024))} KB • ${escapeHtml((f.createdAt || "").slice(0, 10))}${f.notes ? ` • ${escapeHtml(f.notes)}` : ""}</div>
                </div>
                <div class="btn-row">
                  ${/^https?:\/\//i.test(f.fileUrl || "") ? `<a href="${escapeHtml(f.fileUrl)}" target="_blank" rel="noopener noreferrer" class="btn btn-outline btn-sm">⬇️ Open</a>` : `<span class="tech-chip">Session File</span>`}
                </div>
              </div>
            `).join("")
        }
      `;
      document.getElementById("clientFileUploadForm").addEventListener("submit", async (e) => {
        e.preventDefault();
        const file = document.getElementById("cfInput").files?.[0];
        const err = document.getElementById("cfErr");
        const btn = document.getElementById("cfSubmitBtn");
        if (!file) { err.textContent = t("validationError"); return; }
        err.textContent = "";
        btn.disabled = true;
        try {
          const uploaded = await Backend.uploadClientFile(file);
          const rec = {
            id: `file_${Date.now()}_${Math.random().toString(36).slice(2, 5)}`,
            projectId: document.getElementById("cfProj").value,
            requestId: "",
            clientUserId: activeClient.userId,
            clientEmail: activeClient.email,
            fileName: uploaded.fileName,
            fileUrl: uploaded.fileUrl,
            mimeType: uploaded.mimeType,
            sizeBytes: uploaded.sizeBytes,
            uploadedBy: "client",
            notes: document.getElementById("cfNotes").value.trim(),
            createdAt: new Date().toISOString()
          };
          if (uploaded.synced) {
            await Backend.upsertProjectFileRecord(rec);
          }
          if (!Array.isArray(studioState.projectFiles)) studioState.projectFiles = [];
          studioState.projectFiles.unshift(rec);
          saveState();
          showToast("✓");
          renderScreen();
        } catch (upErr) {
          err.textContent = upErr?.message || "Upload failed";
        } finally {
          btn.disabled = false;
        }
      });
    } else if (portalTab === "invoices") {
      const fmt = window.VexoraEcosystem?.formatCurrency || ((amt, cur) => `${amt} ${cur || "EGP"}`);
      portalBody.innerHTML = clientInvoices.length === 0
        ? `<div class="glass-card"><p class="muted-text" style="margin:0;">${escapeHtml(t("clientNoInvoicesYet"))}</p></div>`
        : clientInvoices.map((inv) => `
          <div class="glass-card highlight-border stack-list">
            <div class="row-between">
              <div>
                <h3 class="card-title">🧾 ${escapeHtml(inv.invoiceNumber)}</h3>
                <div class="muted-text" style="font-size:0.8rem;">${escapeHtml(t("finDueDate"))}: ${escapeHtml(inv.dueDate || "—")}</div>
              </div>
              <span class="status-pill ${inv.status === "paid" ? "success" : inv.status === "overdue" ? "error" : "cyan"}">${escapeHtml(inv.status)}</span>
            </div>
            <div style="font-size:1.15rem;font-weight:700;color:var(--neon-cyan);">${escapeHtml(fmt(inv.total, inv.currency))}</div>
            ${(inv.items || []).map((it) => `<div class="muted-text" style="font-size:0.84rem;">• ${escapeHtml(it.desc)} — ${escapeHtml(fmt(it.price, inv.currency))}</div>`).join("")}
          </div>
        `).join("");
    } else if (portalTab === "my_requests") {
      portalBody.innerHTML =
        clientRequests.length === 0
          ? `<div class="glass-card"><p class="muted-text" style="margin:0;">${escapeHtml(t("clientNoRequestsYet"))}</p></div>`
          : clientRequests
              .map((req) => {
                const st = requestStatusMeta(req.status, t);
                return `
                  <article class="glass-card highlight-border stack-list">
                    <div class="row-between">
                      <div>
                        <h3 class="card-title">${escapeHtml(req.projectTitle)}</h3>
                        ${req.serviceName ? `<div style="font-size:0.82rem;color:var(--neon-cyan);font-weight:600;">${escapeHtml(req.serviceName)}</div>` : ""}
                      </div>
                      <span class="status-pill ${st.cls}"><span class="pill-dot"></span>${escapeHtml(st.label)}</span>
                    </div>
                    <div class="req-progress-bar">
                      ${["submitted", "reviewing", "in_progress", "completed"]
                        .map((code, idx) => {
                          const active = idx + 1 <= st.step;
                          const label = requestStatusMeta(code, t).label;
                          return `<div class="req-step ${active ? "active" : ""}"><span>${idx + 1}. ${escapeHtml(label)}</span></div>`;
                        })
                        .join("")}
                    </div>
                    <p class="muted-text" style="margin:0;white-space:pre-wrap;">${escapeHtml(req.description)}</p>
                    ${
                      req.budgetRange || req.timeline
                        ? `<div class="chips-wrap">
                            ${req.budgetRange ? `<span class="tech-chip">${escapeHtml(req.budgetRange)}</span>` : ""}
                            ${req.timeline ? `<span class="tech-chip">${escapeHtml(req.timeline)}</span>` : ""}
                          </div>`
                        : ""
                    }
                    ${
                      req.adminNote
                        ? `<div class="glass-card" style="padding:12px;background:rgba(0,212,255,0.06);border-color:rgba(0,212,255,0.35);">
                            <div style="font-size:0.78rem;color:var(--neon-cyan);font-weight:700;">${escapeHtml(t("clientAdminNoteLabel"))}</div>
                            <p style="margin:4px 0 0;font-size:0.9rem;white-space:pre-wrap;">${escapeHtml(req.adminNote)}</p>
                          </div>`
                        : ""
                    }
                  </article>
                `;
              })
              .join("");
    } else if (portalTab === "support") {
      portalBody.innerHTML = `
        <form id="clientSupportForm" class="glass-card highlight-border stack-list" novalidate>
          <h2 class="card-title" style="color:var(--neon-cyan);">💬 ${escapeHtml(t("clientSupportTitle"))}</h2>
          <p class="muted-text" style="margin:0;">${escapeHtml(t("clientSupportSub"))}</p>
          <div class="field">
            <label for="supSubject">${escapeHtml(t("subjectLabel"))}</label>
            <input id="supSubject" type="text" required />
          </div>
          <div class="field">
            <label for="supMessage">${escapeHtml(t("messageLabel"))}</label>
            <textarea id="supMessage" rows="3" required></textarea>
          </div>
          <div id="supErr" class="error-text"></div>
          <button id="supSubmitBtn" type="submit" class="btn btn-primary btn-full">✉️ ${escapeHtml(t("sendMessage"))}</button>
        </form>

        ${clientMessages
          .map(
            (m) => `
          <div class="glass-card stack-list">
            <div class="row-between">
              <h3 class="card-title">${escapeHtml(m.subject)}</h3>
              <span class="status-pill ${m.status === "replied" ? "success" : "cyan"}"><span class="pill-dot"></span>${escapeHtml(
                m.status === "replied" ? t("messageStatusReplied") : t("messageStatusNew")
              )}</span>
            </div>
            <p class="muted-text" style="margin:0;white-space:pre-wrap;">${escapeHtml(m.message)}</p>
            ${
              m.adminReply
                ? `<div class="glass-card" style="padding:12px;background:rgba(16,185,129,0.08);border-color:rgba(16,185,129,0.35);">
                    <div style="font-size:0.78rem;color:#34d399;font-weight:700;">${escapeHtml(t("clientReplyLabel"))}</div>
                    <p style="margin:4px 0 0;font-size:0.9rem;white-space:pre-wrap;">${escapeHtml(m.adminReply)}</p>
                  </div>`
                : ""
            }
          </div>
        `
          )
          .join("")}
      `;

      document.getElementById("clientSupportForm").addEventListener("submit", async (e) => {
        e.preventDefault();
        const subject = document.getElementById("supSubject").value.trim();
        const message = document.getElementById("supMessage").value.trim();
        const err = document.getElementById("supErr");
        const btn = document.getElementById("supSubmitBtn");
        if (subject.length < 2 || message.length < 5) {
          err.textContent = t("validationError");
          return;
        }
        err.textContent = "";
        btn.disabled = true;

        const msgObj = {
          id: `msg_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
          userId: activeClient.userId,
          senderName: activeClient.fullName,
          email: activeClient.email,
          subject,
          message,
          serviceRequested: "Client Support",
          adminReply: "",
          status: "new",
          createdAt: new Date().toISOString()
        };

        let savedToCloud = false;
        if (cloudConfigured) {
          try {
            const res = await Backend.submitContactMessage(msgObj);
            savedToCloud = Boolean(res.synced);
          } catch (subErr) {
            err.textContent = subErr?.message || "Failed";
            btn.disabled = false;
            return;
          }
        }
        studioState.messages.unshift(msgObj);
        saveState();
        btn.disabled = false;
        showToast(savedToCloud ? t("messageSentDb") : t("messageSentLocal"));
        renderScreen();
      });
    }
  }

  function renderUpdatesScreen(root, ctx) {
    const { t, isArabic, escapeHtml, studioState, navigate, showToast, renderAll } = ctx;
    const filter = ctx.getUpdatesFilter();
    const readIds = ctx.getReadUpdateIds();
    const clientEmail = ctx.getActiveClientSession?.()?.email?.toLowerCase?.() || "";
    const isAdmin = Boolean(ctx.isAdminAuthorized?.());
    const allPublished = (studioState.updates || [])
      .filter((u) => {
        if (u.published === false) return false;
        const grp = u.targetGroup || "all";
        if (grp === "admins") return isAdmin;
        if (grp === "specific_email" || grp === "specific") {
          return isAdmin || (clientEmail && (u.targetEmail || "").toLowerCase() === clientEmail);
        }
        return true;
      })
      .sort((a, b) => Number(Boolean(b.pinned)) - Number(Boolean(a.pinned)) || new Date(b.createdAt) - new Date(a.createdAt));

    const visible = filter === "all" ? allPublished : allPublished.filter((u) => u.kind === filter);
    const kindMeta = (k) => {
      if (k === "news") return { cls: "cyan", label: t("updatesKindNews"), icon: "📰" };
      if (k === "notification") return { cls: "warning", label: t("updatesKindNotif"), icon: "🔔" };
      return { cls: "success", label: t("updatesKindUpdate"), icon: "🚀" };
    };

    root.innerHTML = `
      <div class="row-between" style="flex-wrap:wrap;">
        <div>
          <h1 class="screen-title">🔔 ${escapeHtml(t("updatesHeadline"))}</h1>
          <p class="screen-subtitle">${escapeHtml(t("updatesSubheadline"))}</p>
        </div>
        ${
          allPublished.length > 0
            ? `<button id="markAllUpdatesReadBtn" type="button" class="btn btn-outline btn-sm">✓ ${escapeHtml(t("updatesMarkAllRead"))}</button>`
            : ""
        }
      </div>

      <div class="chips-scroll">
        <button type="button" class="chip-btn ${filter === "all" ? "active" : ""}" data-uf="all">${escapeHtml(t("updatesFilterAll"))} (${allPublished.length})</button>
        <button type="button" class="chip-btn ${filter === "update" ? "active" : ""}" data-uf="update">🚀 ${escapeHtml(t("updatesKindUpdate"))}</button>
        <button type="button" class="chip-btn ${filter === "news" ? "active" : ""}" data-uf="news">📰 ${escapeHtml(t("updatesKindNews"))}</button>
        <button type="button" class="chip-btn ${filter === "notification" ? "active" : ""}" data-uf="notification">🔔 ${escapeHtml(t("updatesKindNotif"))}</button>
      </div>

      <div class="stack-list">
        ${
          visible.length === 0
            ? `<div class="glass-card"><p class="muted-text" style="margin:0;">${escapeHtml(t("updatesEmpty"))}</p></div>`
            : visible
                .map((u) => {
                  const km = kindMeta(u.kind);
                  const isUnread = !readIds.includes(u.id);
                  return `
                    <article class="glass-card stack-list ${u.pinned || isUnread ? "highlight-border" : ""}" data-tilt-3d="subtle">
                      <div class="row-between">
                        <div style="display:flex;gap:8px;flex-wrap:wrap;align-items:center;">
                          <span class="status-pill ${km.cls}">${km.icon} ${escapeHtml(km.label)}</span>
                          ${u.pinned ? `<span class="status-pill cyan">📌 ${escapeHtml(t("updatesPinnedBadge"))}</span>` : ""}
                          ${isUnread ? `<span class="status-pill warning"><span class="pill-dot"></span>${escapeHtml(t("updatesUnreadBadge"))}</span>` : ""}
                        </div>
                        <span class="muted-text" style="font-size:0.78rem;">${escapeHtml((u.createdAt || "").slice(0, 10))}</span>
                      </div>
                      <h2 class="card-title">${escapeHtml(isArabic() ? u.titleAr : u.titleEn)}</h2>
                      <p class="muted-text" style="margin:0;white-space:pre-wrap;">${escapeHtml(isArabic() ? u.bodyAr : u.bodyEn)}</p>
                      ${
                        u.targetRoute && u.targetRoute !== "updates"
                          ? `<div class="btn-row">
                              <button type="button" class="btn btn-outline btn-sm" data-u-go="${escapeHtml(u.targetRoute)}" data-u-read="${escapeHtml(u.id)}">
                                ↗ ${escapeHtml(t("updatesOpenTargetBtn"))}
                              </button>
                            </div>`
                          : ""
                      }
                    </article>
                  `;
                })
                .join("")
        }
      </div>
    `;

    root.querySelectorAll("[data-uf]").forEach((btn) => {
      btn.addEventListener("click", () => {
        ctx.setUpdatesFilter(btn.dataset.uf);
        ctx.renderScreen();
      });
    });

    const markBtn = document.getElementById("markAllUpdatesReadBtn");
    if (markBtn) {
      markBtn.addEventListener("click", () => {
        ctx.markUpdatesRead(allPublished.map((u) => u.id));
        showToast(t("updatesAllReadToast"));
        renderAll();
      });
    }

    root.querySelectorAll("[data-u-go]").forEach((btn) => {
      btn.addEventListener("click", () => {
        if (btn.dataset.uRead) ctx.markUpdatesRead([btn.dataset.uRead]);
        navigate(btn.dataset.uGo);
      });
    });
  }

  function renderAdminRequestsSection(body, ctx) {
    const { t, escapeHtml, Backend, studioState, saveState, showToast, renderScreen } = ctx;
    const reqs = studioState.projectRequests || [];
    const statuses = ["submitted", "reviewing", "in_progress", "completed"];

    body.innerHTML = `
      <h2 class="card-title">📋 ${escapeHtml(t("adminRequestsTitle"))}</h2>
      ${
        reqs.length === 0
          ? `<div class="glass-card"><p class="muted-text" style="margin:0;">${escapeHtml(t("adminRequestsEmpty"))}</p></div>`
          : reqs
              .map((req) => {
                const st = requestStatusMeta(req.status, t);
                return `
                  <div class="glass-card stack-list highlight-border">
                    <div class="row-between">
                      <div>
                        <h3 class="card-title">${escapeHtml(req.projectTitle)}</h3>
                        <div style="color:var(--neon-cyan);font-size:0.86rem;">${escapeHtml(req.clientName)} • ${escapeHtml(req.clientEmail)}</div>
                        ${req.serviceName ? `<div class="muted-text" style="font-size:0.8rem;">${escapeHtml(req.serviceName)}</div>` : ""}
                      </div>
                      <span class="status-pill ${st.cls}"><span class="pill-dot"></span>${escapeHtml(st.label)}</span>
                    </div>
                    <p class="muted-text" style="margin:0;white-space:pre-wrap;">${escapeHtml(req.description)}</p>
                    <div class="form-two-col">
                      <div class="field">
                        <label>${escapeHtml(t("statusLabel"))}</label>
                        <select data-req-stat="${escapeHtml(req.id)}">
                          ${statuses
                            .map(
                              (code) =>
                                `<option value="${code}" ${req.status === code ? "selected" : ""}>${escapeHtml(
                                  requestStatusMeta(code, t).label
                                )}</option>`
                            )
                            .join("")}
                        </select>
                      </div>
                      <div class="field">
                        <label>${escapeHtml(t("clientAdminNoteLabel"))}</label>
                        <input type="text" data-req-note="${escapeHtml(req.id)}" value="${escapeHtml(req.adminNote || "")}" placeholder="${escapeHtml(
                          t("adminRequestNotePlaceholder")
                        )}" />
                      </div>
                    </div>
                    <div class="btn-row">
                      <button type="button" class="btn btn-primary btn-sm" data-save-req="${escapeHtml(req.id)}">✓ ${escapeHtml(
                        t("adminRequestSaveBtn")
                      )}</button>
                      <button type="button" class="icon-btn danger" data-del-req="${escapeHtml(req.id)}" aria-label="${escapeHtml(
                        t("delete")
                      )}">🗑️</button>
                    </div>
                  </div>
                `;
              })
              .join("")
      }
    `;

    body.querySelectorAll("[data-save-req]").forEach((btn) => {
      btn.addEventListener("click", async () => {
        const id = btn.dataset.saveReq;
        const item = (studioState.projectRequests || []).find((r) => r.id === id);
        if (!item) return;
        const prevStatus = item.status;
        const newStatus = body.querySelector(`[data-req-stat="${id}"]`)?.value || item.status;
        const newNote = body.querySelector(`[data-req-note="${id}"]`)?.value?.trim() || "";

        if (Backend.isConfigured() && Backend.getStoredAuth()?.access_token) {
          try {
            await Backend.updateProjectRequestAdmin(id, newStatus, newNote);
          } catch (err) {
            showToast(err.message);
            return;
          }
        }
        item.status = newStatus;
        item.adminNote = newNote;
        item.updatedAt = new Date().toISOString();

        if (window.VexoraEcosystem?.runAutomationEvent) {
          if (newStatus !== prevStatus || newNote) {
            await window.VexoraEcosystem.runAutomationEvent({ studioState, saveState, Backend }, "status_changed", {
              clientEmail: item.clientEmail,
              title: item.projectTitle,
              status: newStatus,
              note: newNote
            });
          }
          if (newStatus === "in_progress" && prevStatus !== "in_progress") {
            await window.VexoraEcosystem.runAutomationEvent({ studioState, saveState, Backend }, "request_accepted", {
              requestId: item.id,
              projectTitle: item.projectTitle,
              description: item.description,
              clientEmail: item.clientEmail,
              clientUserId: item.userId || ""
            });
          }
        }

        saveState();
        showToast(t("adminRequestSavedToast"));
        renderScreen();
      });
    });

    body.querySelectorAll("[data-del-req]").forEach((btn) => {
      btn.addEventListener("click", async () => {
        const id = btn.dataset.delReq;
        if (Backend.isConfigured() && Backend.getStoredAuth()?.access_token) {
          try {
            await Backend.deleteProjectRequest(id);
          } catch (err) {
            showToast(err.message);
            return;
          }
        }
        studioState.projectRequests = (studioState.projectRequests || []).filter((r) => r.id !== id);
        saveState();
        renderScreen();
      });
    });
  }

  function renderAdminUpdatesSection(body, ctx) {
    const { t, isArabic, escapeHtml, Backend, studioState, saveState, showToast, renderScreen, openUpdateEditor } = ctx;
    const list = (studioState.updates || []).sort(
      (a, b) => Number(Boolean(b.pinned)) - Number(Boolean(a.pinned)) || new Date(b.createdAt) - new Date(a.createdAt)
    );

    body.innerHTML = `
      <div class="glass-card highlight-border stack-list">
        <div class="row-between">
          <div>
            <h2 class="card-title">🔔 ${escapeHtml(t("adminUpdatesTitle"))}</h2>
            <p class="muted-text" style="margin:4px 0 0;font-size:0.86rem;">${escapeHtml(t("adminUpdatesDesc"))}</p>
          </div>
          <button id="addUpdateBtn" type="button" class="btn btn-primary btn-sm">+ ${escapeHtml(t("addNew"))}</button>
        </div>
        ${list
          .map(
            (u) => `
          <div class="glass-card row-between">
            <div style="min-width:0;">
              <h3 class="card-title">${u.pinned ? "📌 " : ""}${escapeHtml(isArabic() ? u.titleAr : u.titleEn)}</h3>
              <p class="muted-text" style="margin-top:4px;">${escapeHtml(u.kind)} • ${u.published !== false ? "Published" : "Draft"} • ${escapeHtml((u.createdAt || "").slice(0, 10))}</p>
            </div>
            <div style="display:flex;gap:4px;flex-shrink:0;">
              <button type="button" class="icon-btn" data-edit-upd="${escapeHtml(u.id)}" aria-label="${escapeHtml(t("edit"))}">✏️</button>
              <button type="button" class="icon-btn danger" data-del-upd="${escapeHtml(u.id)}" aria-label="${escapeHtml(t("delete"))}">🗑️</button>
            </div>
          </div>
        `
          )
          .join("")}
      </div>
    `;

    document.getElementById("addUpdateBtn").addEventListener("click", () => openUpdateEditor(null));
    body.querySelectorAll("[data-edit-upd]").forEach((b) =>
      b.addEventListener("click", () => openUpdateEditor((studioState.updates || []).find((x) => x.id === b.dataset.editUpd)))
    );
    body.querySelectorAll("[data-del-upd]").forEach((b) =>
      b.addEventListener("click", async () => {
        const id = b.dataset.delUpd;
        if (Backend.isConfigured() && Backend.getStoredAuth()?.access_token) {
          try {
            await Backend.deleteUpdateItem(id);
          } catch (err) {
            showToast(err.message);
            return;
          }
        }
        studioState.updates = (studioState.updates || []).filter((x) => x.id !== id);
        saveState();
        renderScreen();
      })
    );
  }

  function renderAdminAnalyticsSection(body, ctx) {
    const { t, escapeHtml, studioState, saveState, showToast, renderScreen, remoteAnalytics } = ctx;
    const localA = studioState.analytics || { totalViews: 0, aiQueries: 0, apkDownloads: 0, byRoute: {} };
    const summary = remoteAnalytics || {
      totalViews: localA.totalViews || 0,
      totalAi: localA.aiQueries || 0,
      totalApk: localA.apkDownloads || 0,
      totalReq: (studioState.projectRequests || []).length,
      byRoute: localA.byRoute || {}
    };

    const routeEntries = Object.entries(summary.byRoute || {}).sort((a, b) => b[1] - a[1]);
    const maxRouteHits = Math.max(1, ...routeEntries.map(([, count]) => Number(count || 0)));

    body.innerHTML = `
      <div class="glass-card highlight-border stack-list">
        <div class="row-between">
          <div>
            <h2 class="card-title">📊 ${escapeHtml(t("adminAnalyticsTitle"))}</h2>
            <p class="muted-text" style="margin:4px 0 0;font-size:0.86rem;">${escapeHtml(t("adminAnalyticsDesc"))}</p>
          </div>
          <button id="resetAnalyticsBtn" type="button" class="btn btn-outline btn-sm">🔄 ${escapeHtml(t("analyticsResetLocalBtn"))}</button>
        </div>

        <div class="stats-grid">
          <div class="glass-card">
            <div class="stat-value">${summary.totalViews}</div>
            <div class="stat-label">${escapeHtml(t("analyticsTotalViews"))}</div>
          </div>
          <div class="glass-card">
            <div class="stat-value">${summary.totalAi}</div>
            <div class="stat-label">${escapeHtml(t("analyticsAiQueries"))}</div>
          </div>
          <div class="glass-card">
            <div class="stat-value">${summary.totalApk}</div>
            <div class="stat-label">${escapeHtml(t("analyticsApkClicks"))}</div>
          </div>
          <div class="glass-card">
            <div class="stat-value">${summary.totalReq}</div>
            <div class="stat-label">${escapeHtml(t("analyticsRequestsCount"))}</div>
          </div>
        </div>
      </div>

      <div class="glass-card stack-list">
        <h3 class="card-title">${escapeHtml(t("analyticsTopRoutes"))}</h3>
        ${
          routeEntries.length === 0
            ? `<p class="muted-text" style="margin:0;">0</p>`
            : routeEntries
                .map(([rk, count]) => {
                  const pct = Math.max(6, Math.round((Number(count) / maxRouteHits) * 100));
                  return `
                    <div class="analytics-bar-row">
                      <div class="row-between" style="font-size:0.86rem;">
                        <strong style="color:var(--neon-cyan);">#${escapeHtml(rk)}</strong>
                        <span>${Number(count)}</span>
                      </div>
                      <div class="analytics-bar-track">
                        <div class="analytics-bar-fill" style="width:${pct}%"></div>
                      </div>
                    </div>
                  `;
                })
                .join("")
        }
      </div>
    `;

    document.getElementById("resetAnalyticsBtn").addEventListener("click", () => {
      studioState.analytics = { totalViews: 0, aiQueries: 0, apkDownloads: 0, byRoute: {} };
      saveState();
      showToast(t("analyticsResetToast"));
      renderScreen();
    });
  }

  window.VexoraPortal = {
    safeVideoInfo,
    renderVideoPlayerHtml,
    renderClientScreen,
    renderUpdatesScreen,
    renderAdminRequestsSection,
    renderAdminUpdatesSection,
    renderAdminAnalyticsSection
  };
})();
