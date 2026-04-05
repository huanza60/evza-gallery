/**
 * EVZA Gallery — Download & Share Module
 * Handles catalog downloads (ZIP) and WhatsApp sharing
 */
function EVZA_Download() {
  "use strict";

  /* Helper: safe toast — uses globally exposed showToast from app.js */
  function toast(msg) {
    if (typeof window.showToast === "function") {
      window.showToast(msg);
    }
  }

  /* ===================================================================
     ZIP Download — Uses JSZip library (CDN)
     =================================================================== */

  function loadZipLibrary() {
    return new Promise(function (resolve, reject) {
      if (window.JSZip) { resolve(); return; }
      var script = document.createElement("script");
      script.src = "https://cdnjs.cloudflare.com/ajax/libs/jszip/3.10.1/jszip.min.js";
      script.onload = resolve;
      script.onerror = reject;
      document.head.appendChild(script);
    });
  }

  function downloadCatalog(catalog) {
    if (!catalog || !catalog.items || catalog.items.length === 0) return;

    var btn = document.querySelector("[data-download-catalog]");
    if (btn) {
      var originalText = btn.textContent;
      btn.textContent = "A preparar...";
      btn.disabled = true;
    }

    loadZipLibrary().then(function () {
      var zip = new JSZip();
      var folderName = catalog.name.replace(/[^a-zA-Z0-9àáâãéêíóôõúçÀÁÂÃÉÊÍÓÔÕÚÇ ]/g, "").replace(/\s+/g, "_");
      var photoFolder = zip.folder(folderName + "_fotos");
      var videoFolder = zip.folder(folderName + "_videos");

      var promises = [];
      for (var i = 0; i < catalog.items.length; i++) {
        (function (item, index) {
          var ext = item.type === "video" ? ".mp4" : ".jpg";
          var fileName = (index + 1) + "_" + (item.caption || "sem_nome").slice(0, 30).replace(/\s+/g, "_") + ext;
          var url = item.type === "video"
            ? "https://drive.google.com/uc?export=download&id=" + item.src
            : "https://drive.google.com/uc?export=view&id=" + item.src;

          var p = fetch(url, { mode: "cors" })
            .then(function (res) { return res.blob(); })
            .then(function (blob) {
              if (item.type === "video") videoFolder.file(fileName, blob);
              else photoFolder.file(fileName, blob);
            })
            .catch(function () {
              /* Fallback: add empty marker */
              var placeholder = "Link: " + url;
              if (item.type === "video") videoFolder.file(fileName, placeholder);
              else photoFolder.file(fileName, placeholder);
            });
          promises.push(p);
        })(catalog.items[i], i);
      }

      return Promise.all(promises).then(function () {
        return zip.generateAsync({ type: "blob" });
      }).then(function (content) {
        var a = document.createElement("a");
        a.href = URL.createObjectURL(content);
        a.download = folderName + "_EVZA.zip";
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(a.href);

        if (btn) {
          btn.textContent = originalText;
          btn.disabled = false;
        }
        toast("Catálogo baixado com sucesso!");
      });
    }).catch(function () {
      if (btn) {
        btn.textContent = originalText;
        btn.disabled = false;
      }
      toast("Erro ao preparar download. Tente novamente.");
    });
  }

  /* ===================================================================
     WhatsApp Share
     =================================================================== */

  function shareWhatsApp(catalog) {
    if (!catalog) return;

    /* Show share modal */
    showShareModal(catalog);
  }

  function showShareModal(catalog) {
    /* Check if existing modal exists */
    var existing = document.getElementById("share-modal");
    if (existing) existing.remove();

    var totalCount = (catalog.items || []).length;
    var photoCount = 0, videoCount = 0;
    for (var i = 0; i < totalCount; i++) {
      if (catalog.items[i].type === "photo") photoCount++;
      else videoCount++;
    }

    var modal = document.createElement("div");
    modal.id = "share-modal";
    modal.className = "share-modal-overlay";
    modal.innerHTML =
      '<div class="share-modal">' +
        '<button class="share-modal-close" aria-label="Fechar">&times;</button>' +
        '<h3>Partilhar ' + catalog.name + '</h3>' +
        '<p class="share-modal-count">' + totalCount + ' ficheiros (' + photoCount + ' fotos, ' + videoCount + ' vídeos)</p>' +

        '<div class="share-option-group">' +
          '<h4>Partilhar link</h4>' +
          '<button class="share-option-btn share-whatsapp-link" data-type="whatsapp-link">' +
            '<svg width="20" height="20" viewBox="0 0 24 24" fill="#25D366"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347z"/><path d="M12 0C5.373 0 0 5.373 0 12c0 2.625.846 5.059 2.284 7.034L.789 23.492a.5.5 0 00.611.611l4.458-1.495A11.952 11.952 0 0012 24c6.627 0 12-5.373 12-12S18.627 0 12 0zm0 22c-2.388 0-4.602-.786-6.396-2.116l-.446-.334-2.79.936.936-2.79-.334-.446A9.958 9.958 0 012 12C2 6.486 6.486 2 12 2s10 4.486 10 10-4.486 10-10 10z"/></svg>' +
            'WhatsApp (apenas link)' +
          '</button>' +
        '</div>' +

        '<div class="share-option-group">' +
          '<h4>Baixar e partilhar ficheiros</h4>' +
          '<button class="share-option-btn share-download-link" data-type="download">' +
            '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>' +
            'Baixar tudo em ZIP (' + totalCount + ' ficheiros)' +
          '</button>' +
          '<p class="share-hint">Ficheiros em qualidade original. Depois partilhe via WhatsApp manualmente.</p>' +
        '</div>' +
      '</div>';

    document.body.appendChild(modal);

    modal.querySelector(".share-modal-close").addEventListener("click", function () { modal.remove(); });
    modal.querySelector('[data-type="whatsapp-link"]').addEventListener("click", function () {
      shareLinkWhatsApp(catalog);
      modal.remove();
    });
    modal.querySelector('[data-type="download"]').addEventListener("click", function () {
      downloadCatalog(catalog);
      modal.remove();
    });

    /* Close on overlay click */
    modal.addEventListener("click", function (e) {
      if (e.target === modal) modal.remove();
    });
    /* Close on ESC */
    document.addEventListener("keydown", function handleClose(e) {
      if (e.key === "Escape") { modal.remove(); document.removeEventListener("keydown", handleClose); }
    });
  }

  function shareLinkWhatsApp(catalog) {
    var url = window.location.origin + window.location.pathname + "?catalog=" + catalog.id;
    var message = "Veja o catálogo \"" + catalog.name + "\" da EVZA Gallery!\n" +
      (catalog.description ? catalog.description + "\n" : "") +
      "\n" + url;
    window.open("https://wa.me/?text=" + encodeURIComponent(message), "_blank");
  }

  /* ===================================================================
     Export
     =================================================================== */

  return { downloadCatalog: downloadCatalog, shareWhatsApp: shareWhatsApp };
}

/* Initialize global so app.js can use it */
var EVZAShare = EVZA_Download();
