/* SAIM Label — GA4 conversion events (2026-11-09)
   Loaded site-wide. Requires the gtag snippet in <head> (G-HGP6LQBXEN).
   Events:
     generate_lead  — fires on the thank-you page, i.e. a quote form was accepted
     whatsapp_click — any outbound wa.me link anywhere on the site
   No-ops silently if gtag is blocked (adblockers, offline). */
(function () {
  "use strict";

  function send(name, params) {
    if (typeof window.gtag === "function") {
      try { window.gtag("event", name, params || {}); } catch (e) {}
    }
  }

  /* 1) generate_lead -------------------------------------------------------
     /quote/ redirects here only after the form backend accepted the POST,
     so reaching this path is a real submission, not a form view. */
  var path = (location.pathname || "").replace(/\/+$/, "").toLowerCase();
  if (path === "/thanks" || path === "/quote/thank-you") {
    send("generate_lead", {
      form_name: "quote",
      method: "formsubmit",
      page_path: location.pathname
    });
  }

  /* 2) whatsapp_click ------------------------------------------------------ */
  document.addEventListener(
    "click",
    function (e) {
      var t = e.target;
      if (!t || !t.closest) return;
      var a = t.closest('a[href*="wa.me"]');
      if (!a) return;
      var href = a.getAttribute("href") || "";
      var m = href.match(/wa\.me\/(\d+)/);
      send("whatsapp_click", {
        link_url: href,
        phone: m ? m[1] : "",
        link_text: (a.textContent || "").replace(/\s+/g, " ").trim().slice(0, 80),
        page_path: location.pathname
      });
    },
    true
  );
})();
