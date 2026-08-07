/* ============================================================
   UX Pack v1 — B2B 独立站通用交互/动效层（零依赖，渐进增强）
   已验证站点: luxopack.com (2026-07-01, 109 页)
   设计约束:
   - JS 挂掉页面必须完整可读(SEO/可用性安全)
   - 检测页面已有实现并让位(不劫持已有 reveal/FAQ 逻辑)
   - prefers-reduced-motion 全局尊重
   - 4s 兜底: IntersectionObserver 任何异常下内容绝不隐形
   接入: </body> 前 <script src="/js/ux.js" defer></script>
   ============================================================ */
(function () {
  'use strict';
  var reduceMotion = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  /* ---------- 1. 滚动入场(自动标注 + 同父级 stagger + LCP 安全) ---------- */
  function initReveal() {
    if (reduceMotion || !('IntersectionObserver' in window)) return;
    var candidates = document.querySelectorAll(
      'main section > *, body > section > *, section > .container > *, section > .wrap > *, ' +
      'section [class*="card"], section [class*="-grid"] > *, .faq-list > .faq-item, ' +
      'article > h2, article > p, article > table, article > ul, article > img'
    );
    var pool = [];
    candidates.forEach(function (el) {
      if (pool.indexOf(el) !== -1) return;
      if (el.classList.contains('reveal')) return; // 页面自带体系,让位
      if (el.closest('.reveal, nav, footer, header, .page-hero, [class*="hero"]')) return;
      var tag = el.tagName;
      if (tag === 'SCRIPT' || tag === 'STYLE' || tag === 'LINK' || tag === 'NAV' || tag === 'H1') return;
      pool.push(el);
    });
    // 只保留最内层候选:容器让位给自己的候选子元素(卡片逐个入场比整块淡入细腻)
    var targets = pool.filter(function (el) {
      return !pool.some(function (other) { return other !== el && el.contains(other); });
    });
    targets.forEach(function (el) { el.classList.add('ux-reveal'); });
    var counters = new (window.WeakMap ? WeakMap : function () { this.get = this.set = function () {}; })();
    targets.forEach(function (el) {
      var p = el.parentElement || document.body;
      var n = (counters.get && counters.get(p)) || 0;
      el.style.setProperty('--ux-d', Math.min(n * 70, 350) + 'ms');
      if (counters.set) counters.set(p, n + 1);
    });
    if (!targets.length) return;
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (e) {
        if (e.isIntersecting) { e.target.classList.add('ux-in'); io.unobserve(e.target); }
      });
    }, { rootMargin: '0px 0px -8% 0px', threshold: 0.06 });
    targets.forEach(function (t) { io.observe(t); });
    // 兜底:4s 后任何仍隐藏的元素强制显示(0 视口/observer 边缘情况实证需要)
    setTimeout(function () {
      targets.forEach(function (t) { t.classList.add('ux-in'); });
    }, 4000);
  }

  /* ---------- 2. FAQ 手风琴(跳过自带 onclick 的页面) ---------- */
  function initFaq() {
    document.querySelectorAll('.faq-item').forEach(function (item, idx) {
      var q = item.querySelector('.faq-q');
      var a = item.querySelector('.faq-a');
      if (!q || !a || item.dataset.uxFaq) return;
      if (q.hasAttribute('onclick') || item.hasAttribute('onclick')) return;
      item.dataset.uxFaq = '1';
      item.classList.add('ux-faq');
      q.setAttribute('role', 'button');
      q.setAttribute('tabindex', '0');
      var open = false;
      function set(state) {
        open = state;
        item.classList.toggle('ux-open', open);
        q.setAttribute('aria-expanded', open ? 'true' : 'false');
        a.style.maxHeight = open ? a.scrollHeight + 'px' : '0px';
      }
      function toggle() { set(!open); }
      set(idx === 0); // 首条默认展开
      q.addEventListener('click', toggle);
      q.addEventListener('keydown', function (e) {
        if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); toggle(); }
      });
      window.addEventListener('resize', function () { if (open) a.style.maxHeight = a.scrollHeight + 'px'; });
    });
  }

  /* ---------- 3. 内容图灯箱(排除链接/带点击的卡片内图片) ---------- */
  function initLightbox() {
    var imgs = document.querySelectorAll('main img, article img, section img');
    var eligible = [];
    imgs.forEach(function (img) {
      if (img.closest('a, .product-detail-trigger, .product-detail-dialog, nav, footer, header, [onclick], .prod-card, .wa-float, .logo')) return;
      var w = img.naturalWidth || img.width || 0;
      if (w > 0 && w < 180) return;
      eligible.push(img);
    });
    if (!eligible.length) return;
    var box = document.createElement('div');
    box.className = 'ux-lightbox';
    box.setAttribute('aria-hidden', 'true');
    box.innerHTML = '<button class="ux-lb-close" aria-label="Close image">&times;</button><img alt=""><div class="ux-lb-cap"></div>';
    document.body.appendChild(box);
    var lbImg = box.querySelector('img');
    var lbCap = box.querySelector('.ux-lb-cap');
    function openLb(src, alt) {
      lbImg.src = src; lbImg.alt = alt || ''; lbCap.textContent = alt || '';
      box.classList.add('ux-lb-on'); box.setAttribute('aria-hidden', 'false');
      document.body.style.overflow = 'hidden';
    }
    function closeLb() {
      box.classList.remove('ux-lb-on'); box.setAttribute('aria-hidden', 'true');
      document.body.style.overflow = '';
    }
    box.addEventListener('click', closeLb);
    document.addEventListener('keydown', function (e) { if (e.key === 'Escape') closeLb(); });
    eligible.forEach(function (img) {
      img.classList.add('ux-zoomable');
      img.addEventListener('click', function () { openLb(img.currentSrc || img.src, img.alt); });
    });
  }

  /* ---------- 4. 数字滚动(.stat-num[data-target],幂等) ---------- */
  function initCounters() {
    var nums = document.querySelectorAll('.stat-num[data-target]:not([data-ux-done])');
    if (!nums.length || !('IntersectionObserver' in window)) return;
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (e) {
        if (!e.isIntersecting) return;
        io.unobserve(e.target);
        var el = e.target;
        if (el.dataset.uxDone) return;
        el.dataset.uxDone = '1';
        var target = parseFloat(el.dataset.target);
        var suffix = el.dataset.suffix || '';
        if (isNaN(target)) return;
        if (reduceMotion) { el.textContent = target.toLocaleString() + suffix; return; }
        var dur = 1600, t0 = null;
        function stepFn(ts) {
          if (!t0) t0 = ts;
          var p = Math.min((ts - t0) / dur, 1);
          var eased = 1 - Math.pow(1 - p, 3);
          var val = Math.round(target * eased);
          el.textContent = (val >= 1000 ? val.toLocaleString() : val) + suffix;
          if (p < 1) requestAnimationFrame(stepFn);
        }
        requestAnimationFrame(stepFn);
      });
    }, { threshold: 0.4 });
    nums.forEach(function (n) { io.observe(n); });
  }

  /* ---------- 5. 返回顶部(桌面) ---------- */
  function initBackTop() {
    var btn = document.createElement('button');
    btn.className = 'ux-top';
    btn.setAttribute('aria-label', 'Back to top');
    btn.innerHTML = '&#8593;';
    document.body.appendChild(btn);
    var ticking = false;
    window.addEventListener('scroll', function () {
      if (ticking) return;
      ticking = true;
      requestAnimationFrame(function () {
        btn.classList.toggle('ux-top-on', window.scrollY > 900);
        ticking = false;
      });
    }, { passive: true });
    btn.addEventListener('click', function () {
      window.scrollTo({ top: 0, behavior: reduceMotion ? 'auto' : 'smooth' });
    });
  }

  /* ---------- 6. nav 滚动加深(幂等) ---------- */
  function initNavScroll() {
    var nav = document.querySelector('nav');
    if (!nav) return;
    var ticking = false;
    window.addEventListener('scroll', function () {
      if (ticking) return;
      ticking = true;
      requestAnimationFrame(function () {
        nav.classList.toggle('scrolled', window.scrollY > 40);
        ticking = false;
      });
    }, { passive: true });
  }

  /* ---------- 7. 表格横滑包装(移动端) ---------- */
  function initTables() {
    document.querySelectorAll('main table, section table, article table').forEach(function (t) {
      if (t.parentElement.classList.contains('ux-tscroll')) return;
      var wrap = document.createElement('div');
      wrap.className = 'ux-tscroll';
      t.parentNode.insertBefore(wrap, t);
      wrap.appendChild(t);
    });
  }

  function safe(fn) { try { fn(); } catch (e) { /* 单组件故障不拖垮其它 */ } }

  function boot() {
    safe(initFaq);
    safe(initReveal);
    safe(initLightbox);
    safe(initCounters);
    safe(initBackTop);
    safe(initNavScroll);
    safe(initTables);
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot);
  else boot();
})();
