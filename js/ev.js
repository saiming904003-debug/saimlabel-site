/* SAIM Label — GA4 conversion events (2026-11-09, v2)
   Loaded site-wide via /js/ev.js?v=2. Requires the gtag snippet in <head>
   (G-HGP6LQBXEN).

   Events
     generate_lead  — /thanks/ or /quote/thank-you/ reached, i.e. a real submission
     whatsapp_click — any outbound wa.me link
     form_start     — first interaction with the quote form (which field)
     email_click    — any mailto: link
     file_download  — links to pdf/zip/ai/eps/svg/doc/xls/csv (none on site yet)

   Everything no-ops silently when gtag is blocked, so an adblocker never
   throws on this page. */
(function () {
  "use strict";

  function send(name, params) {
    if (typeof window.gtag === "function") {
      try { window.gtag("event", name, params || {}); } catch (e) {}
    }
  }

  function on(root, type, sel, fn, opts) {
    root.addEventListener(type, function (e) {
      var t = e.target;
      if (!t || !t.closest) return;
      var el = t.closest(sel);
      if (el) fn(el, e);
    }, opts || true);
  }

  /* 1) generate_lead -------------------------------------------------------
     Reachable only after the backend accepted the POST, so this counts real
     submissions rather than form views. */
  var path = (location.pathname || "").replace(/\/+$/, "").toLowerCase();
  if (path === "/thanks" || path === "/quote/thank-you") {
    send("generate_lead", {
      form_name: "quote",
      method: "formsubmit",
      page_path: location.pathname
    });
  }

  /* 2) whatsapp_click ------------------------------------------------------ */
  on(document, "click", 'a[href*="wa.me"]', function (a) {
    var href = a.getAttribute("href") || "";
    var m = href.match(/wa\.me\/(\d+)/);
    send("whatsapp_click", {
      link_url: href,
      phone: m ? m[1] : "",
      link_text: (a.textContent || "").replace(/\s+/g, " ").trim().slice(0, 80),
      page_path: location.pathname
    });
  });

  /* 3) email_click --------------------------------------------------------- */
  on(document, "click", 'a[href^="mailto:"]', function (a) {
    send("email_click", {
      link_url: a.getAttribute("href") || "",
      page_path: location.pathname
    });
  });

  /* 4) file_download -------------------------------------------------------
     No downloadable documents exist on the site yet; this stays at zero until
     a catalogue PDF or similar is published. */
  on(document, "click", "a[href]", function (a) {
    var href = a.getAttribute("href") || "";
    var m = href.match(/\.(pdf|zip|ai|eps|svg|docx?|xlsx?|csv)(\?|#|$)/i);
    if (!m) return;
    send("file_download", {
      file_name: href.split("/").pop().split("?")[0].split("#")[0],
      file_type: m[1].toLowerCase(),
      link_url: href,
      page_path: location.pathname
    });
  });

  /* 5) form_start ----------------------------------------------------------
     Fires once, on the first field the visitor actually touches. */
  var form = document.querySelector('form[action*="formsubmit"]');
  if (form) {
    var started = false;
    var mark = function (e) {
      if (started) return;
      started = true;
      var t = e.target || {};
      send("form_start", {
        form_name: "quote",
        first_field: (t.name || t.id || t.tagName || "").toString().slice(0, 40),
        page_path: location.pathname
      });
    };
    form.addEventListener("focusin", mark, true);
    form.addEventListener("input", mark, true);
    form.addEventListener("change", mark, true);
  }
})();
