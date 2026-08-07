/* Hero FX: drifting warp threads on the homepage banner (canvas, homepage only).
   Brand thread palette, ~30fps, pauses offscreen/hidden, static frame under reduced motion. */
(function () {
  var hero = document.querySelector('.home-hero');
  if (!hero || !window.requestAnimationFrame) return;

  var canvas = document.createElement('canvas');
  canvas.id = 'heroThreads';
  canvas.setAttribute('aria-hidden', 'true');
  hero.appendChild(canvas);
  var ctx = canvas.getContext('2d');
  if (!ctx) { canvas.remove(); return; }

  var COLORS = ['#D9A84E', '#A67C24', '#D9C9A6', '#3E6B52', '#8C4A1B', '#D9A84E'];
  var reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var W = 0, H = 0, threads = [];

  function resize() {
    var dpr = Math.min(window.devicePixelRatio || 1, 2);
    W = hero.clientWidth;
    H = hero.clientHeight;
    canvas.width = W * dpr;
    canvas.height = H * dpr;
    canvas.style.width = W + 'px';
    canvas.style.height = H + 'px';
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    build();
    if (reduce) draw(0);
  }

  function build() {
    threads = [];
    var n = Math.max(10, Math.round(H / 48));
    for (var i = 0; i < n; i++) {
      threads.push({
        y: ((i + 0.5) / n) * H,
        amp: 8 + Math.random() * 18,
        freq: 0.004 + Math.random() * 0.005,
        speed: (0.25 + Math.random() * 0.45) * (i % 2 ? 1 : -1),
        phase: Math.random() * Math.PI * 2,
        color: COLORS[i % COLORS.length],
        alpha: 0.05 + Math.random() * 0.08,
        width: 0.8 + Math.random() * 1.3
      });
    }
  }

  function draw(t) {
    ctx.clearRect(0, 0, W, H);
    for (var i = 0; i < threads.length; i++) {
      var th = threads[i];
      ctx.beginPath();
      ctx.globalAlpha = th.alpha;
      ctx.strokeStyle = th.color;
      ctx.lineWidth = th.width;
      for (var x = -10; x <= W + 10; x += 14) {
        var y = th.y + Math.sin(x * th.freq + th.phase + t * th.speed) * th.amp;
        if (x === -10) ctx.moveTo(x, y); else ctx.lineTo(x, y);
      }
      ctx.stroke();
    }
    ctx.globalAlpha = 1;
  }

  var resizeTimer;
  window.addEventListener('resize', function () {
    clearTimeout(resizeTimer);
    resizeTimer = setTimeout(resize, 150);
  });
  resize();
  if (reduce) return;

  var running = false, inView = true, last = 0, elapsed = 0;
  function frame(now) {
    if (!running) return;
    requestAnimationFrame(frame);
    if (now - last < 33) return;
    elapsed += Math.min(now - last, 100) / 1000;
    last = now;
    draw(elapsed);
  }
  function setRunning(on) {
    if (on === running) return;
    running = on;
    if (on) { last = performance.now(); requestAnimationFrame(frame); }
  }
  if ('IntersectionObserver' in window) {
    new IntersectionObserver(function (entries) {
      inView = entries[0].isIntersecting;
      setRunning(inView && !document.hidden);
    }).observe(hero);
  }
  document.addEventListener('visibilitychange', function () {
    setRunning(inView && !document.hidden);
  });
  setRunning(true);
})();
