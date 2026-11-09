/* SAIM Label — GA4 conversion events (2026-11-09, v3)
   Loaded site-wide via /js/ev.js?v=3. Requires the gtag snippet in <head>
   (G-HGP6LQBXEN).

   v3 removes the custom form_start and file_download handlers: GA4 Enhanced
   Measurement already emits both names automatically, and the duplicates made
   one interaction count twice (verified: one real form_start produced 2 events).
   GA4's own versions also carry form_destination / first_field_position and
   form_submit, which is strictly more useful.

   Only events GA4 does NOT provide are sent from here:
     generate_lead  — /thanks/ or /quote/thank-you/ reached, i.e. accepted submission
     whatsapp_click — any outbound wa.me link (247 on the site)
     email_click    — any mailto: link (GA4 does not track mailto)

   Everything no-ops silently when gtag is blocked, so an adblocker never
   throws on this page. */
(function () {
  "use strict";

  function send(name, params) {
    if (typeof window.gtag === "function") {
      try { window.gtag("event", name, params || {}); } catch (e) {}
    }
  }

  function on(type, sel, fn) {
    document.addEventListener(type, function (e) {
      var t = e.target;
      if (!t || !t.closest) return;
      var el = t.closest(sel);
      if (el) fn(el);
    }, true);
  }

  /* 1) generate_lead -------------------------------------------------------
     This path is reached only after the form backend accepted the POST, so it
     counts real submissions, not form views. Pairs with GA4's native
     form_submit to reveal how many attempts fail. */
  var path = (location.pathname || "").replace(/\/+$/, "").toLowerCase();
  if (path === "/thanks" || path === "/quote/thank-you") {
    send("generate_lead", {
      form_name: "quote",
      method: "formsubmit",
      page_path: location.pathname
    });
  }

  /* 2) whatsapp_click ------------------------------------------------------ */
  on("click", 'a[href*="wa.me"]', function (a) {
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
  on("click", 'a[href^="mailto:"]', function (a) {
    send("email_click", {
      link_url: a.getAttribute("href") || "",
      page_path: location.pathname
    });
  });
})();
