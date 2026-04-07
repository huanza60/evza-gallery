/**
 * EVZA Gallery — Main Application Logic
 * Escola Primária e Secundária Vale do Zambeze
 */
(function () {
  "use strict";

  /* ===================================================================
     HELPERS
     =================================================================== */

  function extractDriveId(url) {
    if (!url) return "";
    var m;
    m = url.match(/\/d\/([^/]+)/);
    if (m && m[1]) return m[1];
    m = url.match(/[?&]id=([^&]+)/);
    if (m && m[1]) return m[1];
    m = url.match(/[-\w]{10,}/);
    if (m) return m[0];
    return "";
  }

  function directImageURL(id, imgEl, size) {
    if (!id) return "";
    size = size || "w1200";
    /* Use Google Drive thumbnail endpoint — more reliable than uc?export=view */
    var thumbUrl =
      "https://lh3.googleusercontent.com/d/" +
      encodeURIComponent(id) +
      "=" + size;
    if (imgEl) {
      imgEl.onerror = function () {
        this.onerror = null;
        this.src =
          "https://drive.google.com/uc?export=view&id=" +
          encodeURIComponent(id);
      };
    }
    return thumbUrl;
  }

  function directVideoURL(id) {
    if (!id) return "";
    return "https://drive.google.com/uc?export=download&id=" + encodeURIComponent(id);
  }

  function getCatalogById(id) {
    var all = getMergedData();
    for (var i = 0; i < all.length; i++) {
      if (all[i].id === id) return all[i];
    }
    return null;
  }

  function itemCounts(catalog) {
    var photos = 0,
      videos = 0;
    var items = catalog.items || [];
    for (var i = 0; i < items.length; i++) {
      if (!items[i].src || items[i].src === "") continue;
      if (items[i].type === "photo") photos++;
      else if (items[i].type === "video") videos++;
    }
    return { photos: photos, videos: videos, total: photos + videos };
  }

  function showToast(msg) {
    var t = document.getElementById("toast");
    if (!t) {
      t = document.createElement("div");
      t.id = "toast";
      t.className = "toast";
      t.setAttribute("role", "status");
      t.setAttribute("aria-live", "polite");
      document.body.appendChild(t);
    }
    t.textContent = msg;
    t.classList.add("visible");
    setTimeout(function () {
      t.classList.remove("visible");
    }, 2500);
  }

  /* Expose showToast globally for download-share.js */
  window.showToast = showToast;

  /* ===================================================================
     DATA MERGING (data.js + localStorage)
     =================================================================== */

  function loadAdminData() {
    try {
      var raw = localStorage.getItem("evza_admin_data");
      return raw ? JSON.parse(raw) : [];
    } catch (e) {
      return [];
    }
  }

  function getMergedData() {
    var base = typeof GALLERY_DATA !== "undefined" ? JSON.parse(JSON.stringify(GALLERY_DATA)) : [];
    var admin = loadAdminData();
    var ids = {};
    for (var i = 0; i < base.length; i++) ids[base[i].id] = true;

    for (var j = 0; j < admin.length; j++) {
      var found = false;
      for (var k = 0; k < base.length; k++) {
        if (base[k].id === admin[j].id) {
          /* Use admin items as authoritative (already contains merged data from syncAdminData) */
          base[k].items = admin[j].items || [];
          found = true;
          break;
        }
      }
      if (!found) {
        base.push(admin[j]);
      }
    }
    return base;
  }

  /* ===================================================================
     NAVBAR — mobile toggle & scroll state
     =================================================================== */

  function initNavbar() {
    var menuBtn = document.querySelector("#nav-menu-btn");
    var navLinks = document.querySelector("#nav-links");

    if (menuBtn && navLinks) {
      menuBtn.addEventListener("click", function () {
        navLinks.classList.toggle("open");
      });
      navLinks.querySelectorAll("a").forEach(function (a) {
        a.addEventListener("click", function () {
          navLinks.classList.remove("open");
        });
      });
    }

    var navbar = document.querySelector(".navbar");
    if (navbar) {
      var onScroll = function () {
        if (window.scrollY > 20) navbar.classList.add("scrolled");
        else navbar.classList.remove("scrolled");
      };
      onScroll();
      window.addEventListener("scroll", onScroll, { passive: true });
    }
  }

  /* ===================================================================
     CATALOG CARD (for index page)
     =================================================================== */

  function createCatalogCard(catalog) {
    var counts = itemCounts(catalog);
    var card = document.createElement("a");
    card.href = "catalog.html?catalog=" + encodeURIComponent(catalog.id);
    card.className = "catalog-card";

    var coverSrc = catalog.cover ? directImageURL(catalog.cover, null, "w500") : "";
    var coverTag = "";
    if (coverSrc) {
      coverTag =
        '<img src="' + coverSrc + '" alt="' + catalog.name + '" loading="lazy" />';
    } else {
      coverTag =
        '<div class="img-placeholder" style="display:flex;align-items:center;justify-content:center;">' +
        '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" style="width:48px;height:48px;opacity:0.25;color:#8B3A1E">' +
        '<rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/>' +
        '<polyline points="21 15 16 10 5 21"/></svg></div>';
    }

    card.innerHTML =
      '<div class="catalog-card-image">' +
      coverTag +
      '<div class="card-overlay"></div>' +
      '<span class="catalog-card-count">' +
      counts.total +
      " ficheiros</span>" +
      "</div>" +
      '<div class="catalog-card-body">' +
      '<h3>' + catalog.name + "</h3>" +
      '<p>' + (catalog.description || "") + "</p>" +
      '<div class="catalog-card-actions">' +
      '<span class="btn-view">Ver Catálogo &rarr;</span>' +
      '<button class="btn-share" data-catalog-id="' + catalog.id + '" title="Partilhar catálogo">' +
      '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 12v8a2 2 0 002 2h12a2 2 0 002-2v-8"/><polyline points="16 6 12 2 8 6"/><line x1="12" y1="2" x2="12" y2="15"/></svg>' +
      'Partilhar</button>' +
      "</div></div>";

    var shareBtn = card.querySelector(".btn-share");
    shareBtn.addEventListener("click", function (e) {
      e.preventDefault();
      e.stopPropagation();
      if (typeof EVZAShare !== "undefined") {
        EVZAShare.shareWhatsApp(catalog);
      }
    });

    return card;
  }

  /* ===================================================================
     MASONRY GRID (for catalog page)
     =================================================================== */

  function createMasonryItem(item, index) {
    var wrapper = document.createElement("div");
    wrapper.className = "masonry-item";
    wrapper.dataset.index = index;
    wrapper.dataset.type = item.type;

    if (item.type === "photo" && item.src) {
      var img = document.createElement("img");
      img.src = directImageURL(item.src, img, "w500");
      img.alt = item.caption || "";
      img.loading = "lazy";
      img.onload = function () {
        wrapper.classList.add("loaded");
      };
      img.onerror = function () {
        this.style.display = "none";
        var ph = document.createElement("div");
        ph.className = "skeleton";
        ph.innerHTML =
          '<div style="position:absolute;inset:0;display:flex;align-items:center;justify-content:center;">' +
          '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" style="width:32px;height:32px;opacity:0.3;color:#8B3A1E">' +
          '<rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/>' +
          '<polyline points="21 15 16 10 5 21"/></svg></div>';
        wrapper.appendChild(ph);
      };
      var overlay = document.createElement("div");
      overlay.className = "masonry-overlay";
      wrapper.appendChild(img);
      wrapper.appendChild(overlay);
      if (item.caption) {
        var caption = document.createElement("div");
        caption.className = "masonry-caption";
        caption.textContent = item.caption;
        wrapper.appendChild(caption);
      }
    } else if (item.type === "video" && item.src) {
      var vidWrapper = document.createElement("div");
      vidWrapper.style.position = "relative";
      vidWrapper.style.paddingTop = "56.25%";
      vidWrapper.style.background = "#1a1a1a";

      if (item.poster) {
        var posterImg = document.createElement("img");
        posterImg.src = directImageURL(item.poster, posterImg, "w500");
        posterImg.alt = item.caption || "";
        posterImg.loading = "lazy";
        posterImg.style.cssText = "position:absolute;inset:0;width:100%;height:100%;object-fit:cover;";
        vidWrapper.appendChild(posterImg);
        posterImg.onload = function () {
          wrapper.classList.add("loaded");
        };
      } else {
        var vidPh = document.createElement("div");
        vidPh.style.cssText = "position:absolute;inset:0;display:flex;align-items:center;justify-content:center;";
        vidPh.innerHTML =
          '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" style="width:40px;height:40px;opacity:0.3;color:#F2DEB3"><polygon points="5 3 19 12 5 21 5 3"/></svg>';
        vidWrapper.appendChild(vidPh);
        setTimeout(function () {
          wrapper.classList.add("loaded");
        }, 100);
      }

      var playIcon = document.createElement("div");
      playIcon.className = "masonry-video-icon";
      playIcon.innerHTML =
        '<svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor"><polygon points="5 3 19 12 5 21 5 3"/></svg>';
      vidWrapper.appendChild(playIcon);
      var videoOverlay = document.createElement("div");
      videoOverlay.className = "masonry-overlay";
      vidWrapper.appendChild(videoOverlay);

      if (item.caption) {
        var vidCaption = document.createElement("div");
        vidCaption.className = "masonry-caption";
        vidCaption.textContent = item.caption;
        vidWrapper.appendChild(vidCaption);
      }

      wrapper.appendChild(vidWrapper);
    } else {
      /* No src — skeleton placeholder */
      var skel = document.createElement("div");
      skel.className = "skeleton";
      skel.style.minHeight = "180px";
      wrapper.appendChild(skel);
      setTimeout(function () {
        wrapper.classList.add("loaded");
      }, 200);
    }

    return wrapper;
  }

  /* ===================================================================
     LIGHTBOX
     =================================================================== */

  var lightboxState = { items: [], currentIndex: 0, open: false };

  function openLightbox(items, index) {
    var lb = document.getElementById("lightbox");
    if (!lb) return;
    lightboxState.items = items;
    lightboxState.currentIndex = index;
    lightboxState.open = true;
    renderLightbox();
    lb.classList.add("active");
    document.body.style.overflow = "hidden";
    lb.setAttribute("aria-hidden", "false");
    var main = document.querySelector("main");
    if (main) main.setAttribute("aria-hidden", "true");
  }

  function closeLightbox() {
    lightboxState.open = false;
    var lb = document.getElementById("lightbox");
    if (lb) {
      lb.classList.remove("active");
      lb.setAttribute("aria-hidden", "true");
      /* Stop any playing video */
      var vid = lb.querySelector("video");
      if (vid) vid.pause();
    }
    document.body.style.overflow = "";
    var main = document.querySelector("main");
    if (main) main.removeAttribute("aria-hidden");
  }

  function navigateLightbox(dir) {
    if (lightboxState.items.length === 0) return;
    var vid = document.querySelector("#lightbox video");
    if (vid) vid.pause();
    lightboxState.currentIndex =
      (lightboxState.currentIndex + dir + lightboxState.items.length) %
      lightboxState.items.length;
    renderLightbox();
  }

  function renderLightbox() {
    var lb = document.getElementById("lightbox");
    if (!lb) return;
    var idx = lightboxState.currentIndex;
    var item = lightboxState.items[idx];
    var content = lb.querySelector("#lightbox-content");

    /* Remove old media */
    content.querySelectorAll("img, video, .skeleton").forEach(function (el) {
      el.remove();
    });

    if (!item || !item.src) {
      var skel = document.createElement("div");
      skel.className = "skeleton";
      skel.style.minHeight = "300px";
      skel.style.maxWidth = "80vw";
      skel.style.width = "600px";
      skel.style.display = "flex";
      skel.style.alignItems = "center";
      skel.style.justifyContent = "center";
      content.insertBefore(skel, content.firstChild);
    } else if (item.type === "photo") {
      var img = document.createElement("img");
      img.src = directImageURL(item.src, img);
      img.className = "lightbox-image";
      img.alt = item.caption || "";
      content.insertBefore(img, content.firstChild);
    } else if (item.type === "video") {
      var vid = document.createElement("video");
      vid.src = directVideoURL(item.src);
      vid.className = "lightbox-video";
      vid.controls = true;

      if (item.poster) {
        vid.poster = directImageURL(item.poster);
      }
      content.insertBefore(vid, content.firstChild);
    }

    var capEl = lb.querySelector("#lightbox-caption");
    if (capEl) capEl.textContent = item ? item.caption || "" : "";

    var cntEl = lb.querySelector("#lightbox-counter");
    if (cntEl) cntEl.textContent = (idx + 1) + " / " + lightboxState.items.length;
  }

  function initLightbox() {
    var lb = document.getElementById("lightbox");
    if (!lb) return;

    lb.addEventListener("click", function (e) {
      if (e.target === lb) closeLightbox();
    });

    var closeBtn = lb.querySelector("#lightbox-close");
    if (closeBtn) closeBtn.addEventListener("click", closeLightbox);

    var prevBtn = lb.querySelector("#lightbox-prev");
    if (prevBtn) prevBtn.addEventListener("click", function () { navigateLightbox(-1); });

    var nextBtn = lb.querySelector("#lightbox-next");
    if (nextBtn) nextBtn.addEventListener("click", function () { navigateLightbox(1); });

    document.addEventListener("keydown", function (e) {
      if (!lightboxState.open) return;
      if (e.key === "Escape") closeLightbox();
      if (e.key === "ArrowLeft") navigateLightbox(-1);
      if (e.key === "ArrowRight") navigateLightbox(1);
    });
  }

  /* ===================================================================
     INTERSECTION OBSERVER — fade-in items
     =================================================================== */

  function initScrollAnimations() {
    if (!("IntersectionObserver" in window)) {
      document.querySelectorAll(".masonry-item").forEach(function (item) {
        item.classList.add("loaded");
      });
      return;
    }

    var observer = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (entry.isIntersecting) {
          entry.target.classList.add("loaded");
          observer.unobserve(entry.target);
        }
      });
    }, { threshold: 0.1 });

    document.querySelectorAll(".masonry-item").forEach(function (item) {
      observer.observe(item);
    });
  }

  /* ===================================================================
     INIT ROUTING
     =================================================================== */

  function initIndexPage() {
    var grid = document.getElementById("catalogs-grid");
    if (!grid) return;

    var data = getMergedData();
    grid.innerHTML = "";

    if (data.length === 0) {
      grid.innerHTML =
        '<div class="empty-state">' +
        '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21 15 16 10 5 21"/></svg>' +
        '<h3>Nenhum catálogo disponível</h3>' +
        '<p>Ainda não há catálogos publicados.</p></div>';
      return;
    }

    for (var i = 0; i < data.length; i++) {
      grid.appendChild(createCatalogCard(data[i]));
    }
  }

  function initCatalogPage() {
    var params = new URLSearchParams(window.location.search);
    var catalogId = params.get("catalog");
    var catalog = catalogId ? getCatalogById(catalogId) : null;

    if (!catalog) {
      document.getElementById("catalog-title").textContent = "Catálogo não encontrado";
      document.getElementById("catalog-desc").textContent = "O catálogo que procura não existe ou foi removido.";
      document.getElementById("masonry-grid").innerHTML =
        '<div class="empty-state"><a href="index.html">&larr; Voltar ao Início</a></div>';
      return;
    }

    document.getElementById("catalog-title").textContent = catalog.name;
    document.getElementById("catalog-desc").textContent = catalog.description || "";

    var counts = itemCounts(catalog);
    document.getElementById("catalog-count").textContent =
      counts.photos + " fotos" + (counts.videos > 0 ? ", " + counts.videos + " vídeos" : "");

    document.title = catalog.name + " — EVZA Gallery";

    /* Update breadcrumb */
    var bcTitle = document.getElementById("breadcrumb-title");
    if (bcTitle) bcTitle.textContent = catalog.name;

    var grid = document.getElementById("masonry-grid");
    grid.innerHTML = "";
    var items = catalog.items || [];
    for (var i = 0; i < items.length; i++) {
      var mItem = createMasonryItem(items[i], i);
      grid.appendChild(mItem);
      mItem.addEventListener("click", function () {
        var idx = parseInt(this.dataset.index, 10);
        openLightbox(items, idx);
      });
    }

    setTimeout(initScrollAnimations, 50);

    /* Toolbar buttons */
    var shareBtnWA = document.getElementById("btn-share-wa");
    if (shareBtnWA) {
      shareBtnWA.addEventListener("click", function () {
        if (typeof EVZAShare !== "undefined") {
          EVZAShare.shareWhatsApp(catalog);
        }
      });
    }

    var downloadBtn = document.getElementById("btn-download");
    if (downloadBtn) {
      downloadBtn.addEventListener("click", function () {
        if (typeof EVZAShare !== "undefined") {
          EVZAShare.downloadCatalog(catalog);
        }
      });
    }
  }

  /* ===================================================================
     INIT ADMIN PAGE
     =================================================================== */

  /*
   * ⚠️ AVISO DE SEGURANÇA: Esta senha é visível no código-fonte.
   * Para uma solução mais segura, use autenticação no servidor (backend).
   */
  var ADMIN_PASSWORD = "evza2025";

  function initAdminPage() {
    var loginSection = document.getElementById("admin-login");
    var dashboardSection = document.getElementById("admin-dashboard");

    if (!localStorage.getItem("evza_admin_loggedin")) {
      loginSection.style.display = "flex";
      dashboardSection.style.display = "none";

      var loginForm = document.getElementById("login-form");
      var loginError = document.getElementById("login-error");

      loginForm.addEventListener("submit", function (e) {
        e.preventDefault();
        var pwd = document.getElementById("admin-password").value.trim();
        if (pwd === ADMIN_PASSWORD) {
          localStorage.setItem("evza_admin_loggedin", "1");
          loginSection.style.display = "none";
          dashboardSection.style.display = "block";
          initAdminDashboard();
        } else {
          loginError.style.display = "block";
          loginError.textContent = "Palavra-passe incorreta. Tente novamente.";
        }
      });
    } else {
      loginSection.style.display = "none";
      dashboardSection.style.display = "block";
      initAdminDashboard();
    }

    /* Logout */
    var logoutBtn = document.querySelector("#logout-btn");
    if (logoutBtn) {
      logoutBtn.addEventListener("click", function () {
        localStorage.removeItem("evza_admin_loggedin");
        window.location.reload();
      });
    }
  }

  function initAdminDashboard() {
    /* Tabs */
    var tabs = document.querySelectorAll(".admin-tab");
    var sections = document.querySelectorAll(".admin-panel-section");

    tabs.forEach(function (tab) {
      tab.addEventListener("click", function () {
        var tabId = this.dataset.tab;
        tabs.forEach(function (t) { t.classList.remove("active"); });
        sections.forEach(function (s) { s.classList.remove("active"); });
        this.classList.add("active");
        document.getElementById(tabId).classList.add("active");
      });
    });

    initAddCatalogTab();
    initAddMediaTab();
    initExportTab();
    initManageTab();
  }

  function initAddCatalogTab() {
    var form = document.getElementById("add-catalog-form");
    var msg = document.getElementById("add-catalog-msg");
    var err = document.getElementById("add-catalog-error");

    form.addEventListener("submit", function (e) {
      e.preventDefault();
      err.style.display = "none";
      msg.style.display = "none";

      var name = document.getElementById("catalog-name").value.trim();
      if (!name) {
        err.style.display = "block";
        err.textContent = "O nome do catálogo é obrigatório.";
        return;
      }

      var id = name
        .toLowerCase()
        .normalize("NFD").replace(/[\u0300-\u036f]/g, "")
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/^-|-$/g, "");

      if (!id || id.length < 2) {
        err.style.display = "block";
        err.textContent = "Nome inválido. Use um nome mais descritivo.";
        return;
      }

      var coverRaw = document.getElementById("catalog-cover").value.trim();
      var catalog = {
        id: id,
        name: name,
        description: document.getElementById("catalog-description").value.trim(),
        cover: extractDriveId(coverRaw),
        items: []
      };

      var data = loadAdminData();
      for (var i = 0; i < data.length; i++) {
        if (data[i].id === id) {
          err.style.display = "block";
          err.textContent = "Já existe um catálogo com este nome.";
          return;
        }
      }

      data.push(catalog);
      localStorage.setItem("evza_admin_data", JSON.stringify(data));

      msg.style.display = "block";
      msg.textContent = "Catálogo '" + name + "' adicionado com sucesso!";
      form.reset();
      populateCatalogSelect();
    });
  }

  function initAddMediaTab() {
    populateCatalogSelect();

    /* Toggle poster field for video type */
    var mediaType = document.getElementById("media-type");
    if (mediaType) {
      mediaType.addEventListener("change", function () {
        var posterGroup = document.getElementById("poster-group");
        if (posterGroup) {
          posterGroup.style.display = this.value === "video" ? "block" : "none";
        }
      });
    }

    var form = document.getElementById("add-media-form");
    var msg = document.getElementById("add-media-msg");
    var err = document.getElementById("add-media-error");

    form.addEventListener("submit", function (e) {
      e.preventDefault();
      err.style.display = "none";
      msg.style.display = "none";

      var catId = document.getElementById("media-catalog").value;
      var type = document.getElementById("media-type").value;
      var fileRaw = document.getElementById("media-file").value.trim();
      var caption = document.getElementById("media-caption").value.trim();

      if (!catId) {
        err.style.display = "block";
        err.textContent = "Selecione um catálogo.";
        return;
      }

      if (!fileRaw) {
        err.style.display = "block";
        err.textContent = "O link do ficheiro é obrigatório.";
        return;
      }

      var fileId = extractDriveId(fileRaw);
      if (!fileId) {
        err.style.display = "block";
        err.textContent = "Link não reconhecido. Certifique-se de que é um link válido do Google Drive.";
        return;
      }

      var item = {
        type: type,
        src: fileId,
        caption: caption || ""
      };

      if (type === "video") {
        var posterRaw = document.getElementById("media-poster").value.trim();
        item.poster = extractDriveId(posterRaw) || "";
      }

      /* Check if catalog already exists in admin data */
      var adminData = loadAdminData();
      var found = false;
      for (var i = 0; i < adminData.length; i++) {
        if (adminData[i].id === catId) {
          adminData[i].items.push(item);
          found = true;
          break;
        }
      }

      /* If catalog doesn't exist in admin yet, create it with this item */
      if (!found) {
        var allMerged = getMergedData();
        for (var j = 0; j < allMerged.length; j++) {
          if (allMerged[j].id === catId) {
            var adminEntry = {
              id: allMerged[j].id,
              name: allMerged[j].name,
              description: allMerged[j].description,
              cover: allMerged[j].cover,
              items: [item]
            };
            adminData.push(adminEntry);
            found = true;
            break;
          }
        }
      }

      if (found) {
        localStorage.setItem("evza_admin_data", JSON.stringify(adminData));
        msg.style.display = "block";
        msg.textContent = caption
          ? "Item adicionado: '" + caption + "'"
          : "Item adicionado ao catálogo!";
        form.reset();
        document.getElementById("poster-group").style.display = "none";
      } else {
        err.style.display = "block";
        err.textContent = "Catálogo não encontrado.";
      }
    });
  }

  function populateCatalogSelect() {
    var select = document.getElementById("media-catalog");
    if (!select) return;
    select.innerHTML = '<option value="">Selecione um catálogo…</option>';

    var data = getMergedData();
    for (var i = 0; i < data.length; i++) {
      var opt = document.createElement("option");
      opt.value = data[i].id;
      opt.textContent = data[i].name;
      select.appendChild(opt);
    }
  }

  function initExportTab() {
    var exportBtn = document.getElementById("export-btn");
    if (!exportBtn) return;

    exportBtn.addEventListener("click", function () {
      var data = getMergedData();
      var json = JSON.stringify(data, null, 2);
      var jsContent =
        "/**\n * EVZA Gallery — Data Configuration\n * Exported from Admin Panel — " +
        new Date().toISOString().split("T")[0] +
        "\n */\n\n" +
        "function driveLink(id) {\n" +
        "  return 'https://lh3.googleusercontent.com/d/' + id + '=w1200';\n" +
        "}\n\n" +
        "function driveDownload(id) {\n" +
        "  return 'https://drive.google.com/uc?export=download&id=' + id;\n" +
        "}\n\n" +
        "const GALLERY_DATA = " + JSON.stringify(data, null, 2) + ";\n";

      var blob = new Blob([jsContent], { type: "application/javascript" });
      var url = URL.createObjectURL(blob);
      var a = document.createElement("a");
      a.href = url;
      a.download = "data.js";
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    });
  }

  function initManageTab() {
    // Sync admin data so all catalogs from data.js are in localStorage
    syncAdminData();
    var list = document.getElementById("catalog-list");
    if (!list) return;
    renderCatalogList(list);
  }

  /* ---- Edit media modal ---- */
  function openEditMediaModal(catalogId, itemIdx) {
    // Ensure admin data is synced
    syncAdminData();

    /* Find the catalog from admin data */
    var adminData = loadAdminData();
    var catalog = null;
    for (var c = 0; c < adminData.length; c++) {
      if (adminData[c].id === catalogId) {
        catalog = adminData[c];
        break;
      }
    }
    if (!catalog) return;

    var item = catalog.items[itemIdx];
    if (!item) return;

    /* Build edit modal */
    var overlay = document.getElementById("edit-media-overlay");
    if (!overlay) {
      overlay = document.createElement("div");
      overlay.id = "edit-media-overlay";
      overlay.style.cssText = "display:none;position:fixed;inset:0;background:rgba(0,0,0,0.6);z-index:9000;align-items:center;justify-content:center;";
      document.body.appendChild(overlay);

      var modal = document.createElement("div");
      modal.id = "edit-media-modal";
      modal.style.cssText = "background:#fff;border-radius:12px;padding:1.5rem;width:90%;max-width:500px;max-height:85vh;overflow-y:auto;color:#222;";

      var title = document.createElement("h3");
      title.id = "edit-media-title";
      title.style.cssText = "margin:0 0 1rem;font-size:1.1rem;";
      modal.appendChild(title);

      /* Type */
      var typeLabel = document.createElement("label");
      typeLabel.style.cssText = "display:block;font-size:0.85rem;margin-bottom:0.25rem;font-weight:bold;color:#555;";
      typeLabel.textContent = "Tipo";
      modal.appendChild(typeLabel);
      var typeDisplay = document.createElement("input");
      typeDisplay.id = "edit-item-type";
      typeDisplay.readOnly = true;
      typeDisplay.style.cssText = "width:100%;padding:0.5rem;border:1px solid #ccc;border-radius:6px;margin-bottom:1rem;background:#f0f0f0;";
      modal.appendChild(typeDisplay);

      /* Link */
      var linkLabel = document.createElement("label");
      linkLabel.style.cssText = "display:block;font-size:0.85rem;margin-bottom:0.25rem;font-weight:bold;color:#555;";
      linkLabel.textContent = "Link do ficheiro (Google Drive)";
      modal.appendChild(linkLabel);
      var linkInput = document.createElement("input");
      linkInput.id = "edit-item-link";
      linkInput.type = "text";
      linkInput.style.cssText = "width:100%;padding:0.5rem;border:1px solid #ccc;border-radius:6px;margin-bottom:1rem;";
      modal.appendChild(linkInput);

      /* Poster (hidden for photos) */
      var posterLabel = document.createElement("label");
      posterLabel.id = "edit-poster-label";
      posterLabel.style.cssText = "display:none;font-size:0.85rem;margin-bottom:0.25rem;font-weight:bold;color:#555;";
      posterLabel.textContent = "Poster do vídeo (opcional)";
      modal.appendChild(posterLabel);
      var posterInput = document.createElement("input");
      posterInput.id = "edit-item-poster";
      posterInput.type = "text";
      posterInput.style.cssText = "display:none;width:100%;padding:0.5rem;border:1px solid #ccc;border-radius:6px;margin-bottom:1rem;";
      modal.appendChild(posterInput);

      /* Caption */
      var captionLabel = document.createElement("label");
      captionLabel.style.cssText = "display:block;font-size:0.85rem;margin-bottom:0.25rem;font-weight:bold;color:#555;";
      captionLabel.textContent = "Legenda";
      modal.appendChild(captionLabel);
      var captionInput = document.createElement("input");
      captionInput.id = "edit-item-caption";
      captionInput.type = "text";
      captionInput.style.cssText = "width:100%;padding:0.5rem;border:1px solid #ccc;border-radius:6px;margin-bottom:1.2rem;";
      modal.appendChild(captionInput);

      /* Buttons */
      var btnRow = document.createElement("div");
      btnRow.style.cssText = "display:flex;gap:0.5rem;justify-content:flex-end;";

      var cancelBtn = document.createElement("button");
      cancelBtn.textContent = "Cancelar";
      cancelBtn.style.cssText = "padding:0.5rem 1.2rem;border:1px solid #ccc;border-radius:6px;background:#f5f5f5;cursor:pointer;";
      cancelBtn.addEventListener("click", function () { closeEditModal(overlay); });
      btnRow.appendChild(cancelBtn);

      var saveBtn = document.createElement("button");
      saveBtn.textContent = "Guardar";
      saveBtn.style.cssText = "padding:0.5rem 1.2rem;border:none;border-radius:6px;color:#fff;cursor:pointer;font-weight:bold;";
      btnRow.appendChild(saveBtn);

      modal.appendChild(btnRow);
      overlay.appendChild(modal);

      overlay.addEventListener("click", function (e) {
        if (e.target === overlay) closeEditModal(overlay);
      });
    }

    /* Fill values */
    document.getElementById("edit-media-title").textContent = "Editar ficheiro — " + catalog.name;
    document.getElementById("edit-item-type").value = item.type === "video" ? "Vídeo" : "Fotografia";
    document.getElementById("edit-item-link").value = "https://drive.google.com/file/d/" + item.src + "/view";
    document.getElementById("edit-item-caption").value = item.caption || "";

    var posterLabelEl = document.getElementById("edit-poster-label");
    var posterInputEl = document.getElementById("edit-item-poster");
    if (item.type === "video") {
      posterLabelEl.style.display = "block";
      posterInputEl.style.display = "block";
      posterInputEl.value = item.poster ? "https://drive.google.com/file/d/" + item.poster + "/view" : "";
    } else {
      posterLabelEl.style.display = "none";
      posterInputEl.style.display = "none";
      posterInputEl.value = "";
    }

    overlay.style.display = "flex";

    /* Save logic */
    var saveBtnHandler = function () {
      var rawLink = document.getElementById("edit-item-link").value.trim();
      var newSrc = extractDriveId(rawLink);
      if (!newSrc) {
        alert("Link não reconhecido.");
        return;
      }

      var newCaption = document.getElementById("edit-item-caption").value.trim();
      var newPoster = "";
      if (item.type === "video") {
        var rawPoster = document.getElementById("edit-item-poster").value.trim();
        newPoster = extractDriveId(rawPoster) || "";
      }

      /* Update in admin data */
      var data = loadAdminData();
      for (var i = 0; i < data.length; i++) {
        if (data[i].id === catalogId) {
          data[i].items[itemIdx].src = newSrc;
          data[i].items[itemIdx].caption = newCaption;
          if (item.type === "video") {
            data[i].items[itemIdx].poster = newPoster;
          }
          break;
        }
      }
      localStorage.setItem("evza_admin_data", JSON.stringify(data));

      closeEditModal(overlay);

      /* Refresh the list */
      var catalogListEl = document.getElementById("catalog-list");
      if (catalogListEl) renderCatalogList(catalogListEl);
      populateCatalogSelect();
    };

    document.querySelector("#edit-media-modal button:last-child").removeEventListener("click", saveBtnHandler);
    var newSaveBtn = document.querySelector("#edit-media-modal button:last-child");
    newSaveBtn.textContent = "Guardar";
    newSaveBtn.style.background = "#2a7ae4";
    newSaveBtn.onclick = saveBtnHandler;
  }

  function closeEditModal(overlay) {
    if (overlay) overlay.style.display = "none";
  }

  /* Sync admin data with data.js: if a catalog from data.js has items with src, merge them
     into admin copy so edits/deletions work on the full set */
  function syncAdminData() {
    var adminData = loadAdminData();
    var galleryData = typeof GALLERY_DATA !== "undefined" ? GALLERY_DATA : [];

    for (var gi = 0; gi < galleryData.length; gi++) {
      var gCatalog = galleryData[gi];
      var adminIdx = -1;
      for (var ai = 0; ai < adminData.length; ai++) {
        if (adminData[ai].id === gCatalog.id) {
          adminIdx = ai;
          break;
        }
      }

      /* Check if original data.js catalog has items not in admin copy */
      if (adminIdx >= 0) {
        /* Merge missing items from data.js */
        var adminItemKeys = {};
        for (var ai2 = 0; ai2 < adminData[adminIdx].items.length; ai2++) {
          var item = adminData[adminIdx].items[ai2];
          if (item.src && item.src !== "") {
            adminItemKeys[item.type + "|" + item.src] = true;
          }
        }
        /* Only add items that actually exist in admin data (from user adding via admin) */
        var newItems = [];
        for (var di = 0; di < gCatalog.items.length; di++) {
          var key = gCatalog.items[di].type + "|" + gCatalog.items[di].src;
          if (!adminItemKeys[key] && gCatalog.items[di].src && gCatalog.items[di].src !== "") {
            newItems.push(gCatalog.items[di]);
          }
        }
        for (var add = 0; add < newItems.length; add++) {
          adminData[adminIdx].items.push(newItems[add]);
        }
      } else {
        /* Not in admin at all — create entry from data.js */
        var adminEntry = {
          id: gCatalog.id,
          name: gCatalog.name,
          description: gCatalog.description,
          cover: gCatalog.cover,
          items: []
        };
        /* Only create entry if catalog has items */
        for (var di2 = 0; di2 < gCatalog.items.length; di2++) {
          if (gCatalog.items[di2].src && gCatalog.items[di2].src !== "") {
            adminEntry.items.push(gCatalog.items[di2]);
          }
        }
        adminData.push(adminEntry);
      }
    }

    localStorage.setItem("evza_admin_data", JSON.stringify(adminData));
    return adminData;
  }

  function renderCatalogList(listEl) {
    syncAdminData();
    var data = loadAdminData();
    listEl.innerHTML = "";

    if (data.length === 0) {
      listEl.innerHTML =
        '<p style="color:var(--text-secondary);font-size:0.9rem;padding:1rem 0;">Nenhum catálogo disponvel.</p>';
      return;
    }

    for (var i = 0; i < data.length; i++) {
      (function (catalog, idx) {
        var counts = itemCounts(catalog);
        var section = document.createElement("div");
        section.style.cssText = "padding:0.75rem 0;border-bottom:1px solid var(--offwhite-dark);";

        /* Catalog header */
        var header = document.createElement("div");
        header.style.cssText = "display:flex;flex-wrap:wrap;align-items:center;justify-content:space-between;";
        header.innerHTML =
          '<div>' +
          '<strong>' + catalog.name + '</strong>' +
          '<span style="font-size:0.82rem;color:var(--text-secondary);margin-left:0.5rem;">' +
          counts.total + " ficheiros</span>" +
          "</div>";

        var delCatBtn = document.createElement("button");
        delCatBtn.className = "btn btn-sm btn-primary";
        delCatBtn.textContent = "Eliminar catlogo";
        delCatBtn.style.background = "#cc3333";
        delCatBtn.style.cursor = "pointer";
        delCatBtn.addEventListener("click", function () {
          if (confirm("Tem certeza que deseja eliminar o catlogo \u00ab" + catalog.name + "\u00bb?")) {
            var adminData = loadAdminData();
            adminData.splice(idx, 1);
            localStorage.setItem("evza_admin_data", JSON.stringify(adminData));
            renderCatalogList(listEl);
            populateCatalogSelect();
          }
        });
        header.appendChild(delCatBtn);
        section.appendChild(header);

        /* Media items list */
        var itemsList = document.createElement("div");
        itemsList.style.cssText = "margin-top:0.5rem;padding-left:0.5rem;";

        var items = catalog.items || [];
        if (items.length === 0) {
          itemsList.innerHTML = '<p style="font-size:0.82rem;color:var(--text-secondary);">Nenhum ficheiro adicionado.</p>';
        } else {
          for (var j = 0; j < items.length; j++) {
            (function (item, itemIdx) {
              var itemRow = document.createElement("div");
              itemRow.style.cssText = "display:flex;align-items:center;justify-content:space-between;padding:0.4rem 0;border-top:1px solid #eee;font-size:0.85rem;";

              var itemInfo = document.createElement("div");
              itemInfo.style.cssText = "flex:1;overflow:hidden;";
              var iconText = item.type === "video" ? "\uD83C\uDFAC" : "\uD83D\uDCF7";
              itemInfo.innerHTML = '<span>' + iconText + ' ' + (item.caption || "Sem legenda") + '</span>';

              var btnGroup = document.createElement("div");
              btnGroup.style.cssText = "display:flex;gap:0.4rem;align-items:center;flex-shrink:0;";

              /* Edit button */
              var editBtn = document.createElement("button");
              editBtn.textContent = "Editar";
              editBtn.style.cssText = "padding:0.25rem 0.6rem;border:1px solid #2a7ae4;background:#2a7ae4;color:#fff;font-size:0.75rem;border-radius:4px;cursor:pointer;font-weight:bold;";
              editBtn.title = "Editar ficheiro";
              editBtn.addEventListener("click", function () {
                openEditMediaModal(catalog.id, itemIdx);
              });

              /* Delete button */
              var itemDelBtn = document.createElement("button");
              itemDelBtn.textContent = "\u00D7";
              itemDelBtn.style.cssText = "width:28px;height:28px;border:none;background:#cc3333;color:#fff;font-size:1.1rem;border-radius:50%;cursor:pointer;";
              itemDelBtn.title = "Eliminar ficheiro";
              itemDelBtn.addEventListener("click", function () {
                if (confirm("Eliminar este ficheiro" + (item.caption ? ": \u00ab" + item.caption + "\u00bb" : "") + "?")) {
                  var a = loadAdminData();
                  for (var c = 0; c < a.length; c++) {
                    if (a[c].id === catalog.id) {
                      a[c].items.splice(itemIdx, 1);
                      break;
                    }
                  }
                  localStorage.setItem("evza_admin_data", JSON.stringify(a));
                  renderCatalogList(listEl);
                  populateCatalogSelect();
                }
              });

              btnGroup.appendChild(editBtn);
              btnGroup.appendChild(itemDelBtn);
              itemRow.appendChild(itemInfo);
              itemRow.appendChild(btnGroup);
              itemsList.appendChild(itemRow);
            })(items[j], j);
          }
        }

        section.appendChild(itemsList);
        listEl.appendChild(section);
      })(data[i], i);
    }
  }

  /* ===================================================================
     BOOTSTRAP
     =================================================================== */

  function init() {
    initNavbar();
    initLightbox();

    /* Dynamic footer year */
    document.querySelectorAll(".footer-year, #footer-year").forEach(function (el) {
      el.textContent = new Date().getFullYear();
    });

    if (document.getElementById("catalogs-grid")) initIndexPage();
    if (document.getElementById("masonry-grid")) initCatalogPage();
    if (document.getElementById("admin-login")) initAdminPage();
  }

  /* ===================================================================
     UPDATE NOTIFICATION — listens for SW messages
     =================================================================== */

  function initUpdateNotification() {
    if (!("serviceWorker" in navigator)) return;

    navigator.serviceWorker.ready.then(function (reg) {
      reg.active.postMessage({ type: "force_check" });
    }).catch(function () {});

    navigator.serviceWorker.addEventListener("message", function (e) {
      if (e.data && e.data.type === "new_version") {
        showUpdateBanner(e.data);
      }
    });

    /* Also check on load — store current version */
    fetch("version.json", { cache: "no-cache" })
      .then(function (res) {
        if (!res.ok) throw new Error("version.json not found");
        return res.json();
      })
      .then(function (data) {
        if (!data || !data.version) return;
        var stored = localStorage.getItem("evza_last_seen_version");
        var last = stored ? JSON.parse(stored) : {};
        if (last.version && last.version !== data.version) {
          showUpdateBanner(data);
        }
        localStorage.setItem("evza_last_seen_version", JSON.stringify(data));
      })
      .catch(function () {});
  }

  function showUpdateBanner(data) {
    var existing = document.getElementById("update-banner");
    if (existing) return;

    var catalogName = "";
    if (data.newCatalogs && data.newCatalogs.length > 0) {
      var catalog = getCatalogById(data.newCatalogs[0]);
      catalogName = catalog ? catalog.name : data.newCatalogs[0];
    }

    var msg = data.message || "Novo conteúdo disponível!";
    if (catalogName && catalogName !== data.message) {
      msg = "Novo catálogo: " + catalogName;
    }

    var banner = document.createElement("div");
    banner.id = "update-banner";
    banner.className = "update-banner";
    banner.innerHTML =
      '<div class="update-banner-inner">' +
        '<div class="update-banner-icon">' +
          '<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/><polyline points="10 9 9 9 8 9"/></svg>' +
        '</div>' +
        '<div class="update-banner-text">' +
          '<h4>' + msg + '</h4>' +
          '</div>' +
        '<button class="update-banner-close" aria-label="Fechar">&times;</button>' +
      '</div>' +
      '<div class="update-banner-date">📅 ' + (data.date || "Verificar atualizações") + '</div>';

    document.body.appendChild(banner);

    banner.querySelector(".update-banner-close").addEventListener("click", function () {
      banner.classList.remove("visible");
      setTimeout(function () { banner.remove(); }, 400);
      /* Mark this version as seen */
      fetch("version.json", { cache: "no-cache" })
        .then(function (res) { return res.json(); })
        .then(function (d) {
          localStorage.setItem("evza_last_seen_version", JSON.stringify(d));
        })
        .catch(function () {});
    });

    /* Auto-show after a tick */
    setTimeout(function () {
      banner.classList.add("visible");
    }, 100);

    /* Auto-hide after 15s */
    setTimeout(function () {
      if (banner.parentElement) {
        banner.classList.remove("visible");
        setTimeout(function () { banner.remove(); }, 400);
      }
    }, 15000);
  }

  document.addEventListener("DOMContentLoaded", init);
  document.addEventListener("DOMContentLoaded", initUpdateNotification);
})();
