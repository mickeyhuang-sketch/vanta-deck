/* ============================================
   GoWarehouse Vanta Keynote — Navigation
   ============================================ */

(function () {
  const pages = Array.from(document.querySelectorAll('.page'));
  const totalPages = pages.length;
  let current = 0;

  const pageCounter = document.querySelector('#page-counter');
  const progressBar = document.querySelector('#progress-bar');

  let autoTimer = null;
  let autoMode = false;

  function clearAuto() {
    if (autoTimer) { clearTimeout(autoTimer); autoTimer = null; }
  }

  function goTo(idx, opts = {}) {
    if (idx < 0 || idx >= totalPages) return;
    clearAuto();
    pages[current].classList.remove('active');
    current = idx;
    pages[current].classList.add('active');
    if (pageCounter) {
      pageCounter.textContent = `${String(current + 1).padStart(2, '0')} / ${String(totalPages).padStart(2, '0')}`;
    }
    if (progressBar) {
      progressBar.style.width = `${((current + 1) / totalPages) * 100}%`;
    }
    // Trigger any in-page videos
    const videos = pages[current].querySelectorAll('video');
    videos.forEach(v => {
      v.currentTime = 0;
      const p = v.play();
      if (p && p.catch) p.catch(() => {});
    });
    // Pause videos on other pages
    pages.forEach((p, i) => {
      if (i !== current) p.querySelectorAll('video').forEach(v => v.pause());
    });

    // Auto-advance support: page has data-auto-advance="ms" → schedule next
    if (autoMode || opts.forceAuto) {
      const dur = parseInt(pages[current].dataset.autoAdvance, 10);
      if (dur > 0) {
        autoTimer = setTimeout(() => goTo(current + 1), dur);
      } else {
        // No auto duration on this page → auto mode ends, hand back to presenter
        autoMode = false;
      }
    }

    // BGM 控制：離開 P1 封面後 BGM 暫停（影片頁有自己的音軌）
    const bgm = document.querySelector('#bgm-sizzle');
    if (bgm && current >= 1) {
      bgm.pause();
    }

    // Page 3「10」counter animation: 從 1 跑到 10
    if (current === 2) { // HTML page 3 (0-indexed)
      const el = document.querySelector('#counter-10');
      if (el) {
        const duration = 600; // 0.6 秒（更快）
        const start = performance.now();
        const animate = (now) => {
          const elapsed = now - start;
          const progress = Math.min(elapsed / duration, 1);
          const value = Math.round(1 + (10 - 1) * progress); // linear
          el.textContent = value;
          if (progress < 1) requestAnimationFrame(animate);
        };
        el.textContent = '1';
        requestAnimationFrame(animate);
      }
    }
  }

  function startIntroVideo() {
    autoMode = true;
    const startHint = document.querySelector('#start-hint');
    if (startHint) startHint.style.display = 'none';
    // From P1 cover → P2 intro video (auto-advances to P3 reveal after 15.5s)
    if (current === 0) {
      goTo(1, { forceAuto: true });
    } else {
      goTo(0);
      setTimeout(() => goTo(1, { forceAuto: true }), 100);
    }
  }

  // Keyboard navigation
  document.addEventListener('keydown', (e) => {
    // P1 → SPACE / ENTER 啟動 sizzle 開場（特例）
    if (current === 0 && (e.key === ' ' || e.key === 'Enter')) {
      e.preventDefault();
      startIntroVideo();
      // 開始播 BGM（如有檔案）
      const bgm = document.querySelector('#bgm-sizzle');
      if (bgm) {
        bgm.volume = 0;
        bgm.play().then(() => {
          // 淡入到 0.6
          let v = 0;
          const fadeIn = setInterval(() => {
            v += 0.02;
            bgm.volume = Math.min(0.6, v);
            if (v >= 0.6) clearInterval(fadeIn);
          }, 100);
        }).catch(() => {});
      }
      return;
    }
    if (e.key === 'ArrowRight' || e.key === 'PageDown' || e.key === ' ') {
      e.preventDefault();
      goTo(current + 1);
    } else if (e.key === 'ArrowLeft' || e.key === 'PageUp') {
      e.preventDefault();
      goTo(current - 1);
    } else if (e.key === 'Home') {
      goTo(0);
    } else if (e.key === 'End') {
      goTo(totalPages - 1);
    } else if (e.key === 'f' || e.key === 'F') {
      // Toggle fullscreen
      if (!document.fullscreenElement) {
        document.documentElement.requestFullscreen();
      } else {
        document.exitFullscreen();
      }
    } else if (e.key === 'p' || e.key === 'P') {
      // Open presenter mode in new window
      window.open('presenter-mode/index.html?page=' + current, 'presenter', 'width=900,height=700');
    }
  });

  // Click navigation buttons
  document.querySelector('#nav-prev')?.addEventListener('click', () => goTo(current - 1));
  document.querySelector('#nav-next')?.addEventListener('click', () => goTo(current + 1));

  // Responsive scaling — keep 1600x900 canvas inside viewport
  const canvas = document.querySelector('.canvas');
  function resize() {
    const sx = window.innerWidth / 1600;
    const sy = window.innerHeight / 900;
    const s = Math.min(sx, sy);
    canvas.style.transform = `scale(${s})`;
  }
  window.addEventListener('resize', resize);
  resize();

  // P6 粒子層動態生成 60 顆粒子
  function spawnParticles() {
    const container = document.querySelector('#p6-particles');
    if (!container || container.dataset.spawned === '1') return;
    const N = 60;
    for (let i = 0; i < N; i++) {
      const p = document.createElement('div');
      p.className = 'particle';
      const angle = (Math.PI * 2 * i) / N + (Math.random() - 0.5) * 0.4;
      const distance = 400 + Math.random() * 480;
      const dx = Math.cos(angle) * distance;
      const dy = Math.sin(angle) * distance;
      p.style.setProperty('--p-end', `translate(${dx}px, ${dy}px)`);
      p.style.animationDelay = (Math.random() * 0.4 + 1.8) + 's';
      const size = 2 + Math.random() * 4;
      p.style.width = size + 'px';
      p.style.height = size + 'px';
      container.appendChild(p);
    }
    container.dataset.spawned = '1';
  }
  spawnParticles();

  // P34 主 Demo：在影片某時間點觸發鏡頭聚焦框 + 字幕逐字打字
  const demoVideo = document.querySelector('#demo-video');
  const demoFocus = document.querySelector('#demo-focus');
  const demoCaption = document.querySelector('#demo-caption');
  const captionLine = demoCaption ? demoCaption.querySelector('.caption-line') : null;

  // 影片時間軸事件表（針對 placeholder vanta-x-claude-demo.mp4，37 秒，後續正式錄製時調整）
  const demoEvents = [
    { t: 2.0,  caption: '「這個月損耗率多少？」' },
    { t: 8.0,  focus: { top: '30%', left: '10%', width: '40%', height: '24%' } },
    { t: 12.0, captionClear: true, focusClear: true },
    { t: 14.0, caption: 'Claude 透過 MCP 直接讀 Vanta 資料' },
    { t: 22.0, focus: { top: '20%', left: '30%', width: '50%', height: '30%' } },
    { t: 30.0, captionClear: true, focusClear: true },
    { t: 32.0, caption: '一句話，掌握全倉狀態。' },
  ];

  function typeCaption(text) {
    if (!captionLine || !demoCaption) return;
    demoCaption.classList.add('visible');
    captionLine.textContent = '';
    let i = 0;
    const interval = setInterval(() => {
      if (i >= text.length) { clearInterval(interval); return; }
      captionLine.textContent += text.charAt(i);
      i++;
    }, 60);
    captionLine.dataset.typingInterval = interval;
  }

  function clearCaption() {
    if (!demoCaption) return;
    demoCaption.classList.remove('visible');
  }

  function showFocus(box) {
    if (!demoFocus) return;
    Object.assign(demoFocus.style, box);
    demoFocus.classList.add('visible');
  }

  function clearFocus() {
    if (!demoFocus) return;
    demoFocus.classList.remove('visible');
  }

  if (demoVideo) {
    let firedEvents = new Set();
    demoVideo.addEventListener('timeupdate', () => {
      const t = demoVideo.currentTime;
      demoEvents.forEach((ev, i) => {
        if (t >= ev.t && !firedEvents.has(i)) {
          firedEvents.add(i);
          if (ev.caption) typeCaption(ev.caption);
          if (ev.captionClear) clearCaption();
          if (ev.focus) showFocus(ev.focus);
          if (ev.focusClear) clearFocus();
        }
      });
    });
    demoVideo.addEventListener('seeking', () => { firedEvents.clear(); clearCaption(); clearFocus(); });
    demoVideo.addEventListener('play', () => { firedEvents.clear(); });
  }

  // P9 字幕已移除（2026-05-20 米奇指示拿掉，非她要求的功能，勿再加回）

  // Initial page
  goTo(0);

  // Expose for debugging
  window.keynote = { goTo, current: () => current, total: totalPages };

  // URL hash sync — open with #p=12 to jump
  const hashMatch = window.location.hash.match(/p=(\d+)/);
  if (hashMatch) {
    const idx = parseInt(hashMatch[1], 10) - 1;
    if (idx >= 0 && idx < totalPages) goTo(idx);
  }
})();
