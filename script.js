(() => {
  const TOTAL_FRAMES = 300;
  const FRAME_PREFIX = 'frames/frame_';
  const FRAME_EXTENSION = '.png';
  const LERP_SPEED = 12; // Snappy yet silky smooth frame transition

  const canvas = document.getElementById('animation-canvas');
  const ctx = canvas.getContext('2d', { alpha: false });

  const images = new Array(TOTAL_FRAMES);
  let loadedCount = 0;
  let currentFrame = 0;
  let targetFrame = 0;
  let lastRenderedIndex = -1;
  let needsRedraw = true;
  let lastTime = performance.now();

  function getFrameUrl(index) {
    const frameNum = String(index + 1).padStart(4, '0');
    return `${FRAME_PREFIX}${frameNum}${FRAME_EXTENSION}`;
  }

  function resizeCanvas() {
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const width = window.innerWidth;
    const height = window.innerHeight;

    canvas.width = Math.round(width * dpr);
    canvas.height = Math.round(height * dpr);

    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = 'high';

    needsRedraw = true;
    drawFrame(Math.min(Math.max(Math.round(currentFrame), 0), TOTAL_FRAMES - 1));
  }

  function updateTargetFrame() {
    const scrollTop = window.pageYOffset || document.documentElement.scrollTop || document.body.scrollTop || 0;
    const scrollHeight = Math.max(document.documentElement.scrollHeight, document.body.scrollHeight);
    const clientHeight = window.innerHeight || document.documentElement.clientHeight;
    const maxScroll = scrollHeight - clientHeight;

    if (maxScroll > 0) {
      const scrollFraction = Math.min(Math.max(scrollTop / maxScroll, 0), 1);
      targetFrame = scrollFraction * (TOTAL_FRAMES - 1);
    }
  }

  function findNearestLoadedImage(targetIdx) {
    if (images[targetIdx] && images[targetIdx].complete && images[targetIdx].naturalWidth > 0) {
      return images[targetIdx];
    }

    let radius = 1;
    while (targetIdx - radius >= 0 || targetIdx + radius < TOTAL_FRAMES) {
      const left = targetIdx - radius;
      if (left >= 0 && images[left] && images[left].complete && images[left].naturalWidth > 0) {
        return images[left];
      }
      const right = targetIdx + radius;
      if (right < TOTAL_FRAMES && images[right] && images[right].complete && images[right].naturalWidth > 0) {
        return images[right];
      }
      radius++;
    }
    return null;
  }

  function drawFrame(frameIndex) {
    if (frameIndex === lastRenderedIndex && !needsRedraw) {
      return;
    }

    const img = findNearestLoadedImage(frameIndex);
    if (!img) return;

    const canvasWidth = canvas.width;
    const canvasHeight = canvas.height;
    const imgWidth = img.naturalWidth || 1920;
    const imgHeight = img.naturalHeight || 1080;

    const canvasRatio = canvasWidth / canvasHeight;
    const imgRatio = imgWidth / imgHeight;

    let drawWidth, drawHeight, offsetX, offsetY;

    // Cover mode: fill viewport while preserving 16:9 ratio and centered framing
    if (canvasRatio > imgRatio) {
      drawWidth = canvasWidth;
      drawHeight = canvasWidth / imgRatio;
      offsetX = 0;
      offsetY = (canvasHeight - drawHeight) / 2;
    } else {
      drawHeight = canvasHeight;
      drawWidth = canvasHeight * imgRatio;
      offsetX = (canvasWidth - drawWidth) / 2;
      offsetY = 0;
    }

    ctx.fillStyle = '#000000';
    ctx.fillRect(0, 0, canvasWidth, canvasHeight);
    ctx.drawImage(img, offsetX, offsetY, drawWidth, drawHeight);

    // Cover bottom-right watermark area seamlessly with black
    const scale = drawWidth / imgWidth;
    const patchX = offsetX + 1670 * scale;
    const patchY = offsetY + 830 * scale;
    const patchW = 140 * scale;
    const patchH = 140 * scale;
    ctx.fillStyle = '#000000';
    ctx.fillRect(patchX, patchY, patchW, patchH);

    lastRenderedIndex = frameIndex;
    needsRedraw = false;
  }

  function animationLoop(now) {
    const dt = Math.min((now - lastTime) / 1000, 0.1);
    lastTime = now;

    const diff = targetFrame - currentFrame;
    if (Math.abs(diff) > 0.0005) {
      const decay = 1 - Math.exp(-LERP_SPEED * dt);
      currentFrame += diff * decay;
    } else {
      currentFrame = targetFrame;
    }

    const frameToRender = Math.min(Math.max(Math.round(currentFrame), 0), TOTAL_FRAMES - 1);
    drawFrame(frameToRender);

    requestAnimationFrame(animationLoop);
  }

  function preloadImages() {
    // 1. Immediately load frame 0 for instant initial visual
    const firstImg = new Image();
    firstImg.src = getFrameUrl(0);
    firstImg.onload = () => {
      images[0] = firstImg;
      loadedCount++;
      needsRedraw = true;
      drawFrame(0);
    };
    firstImg.onerror = (e) => {
      console.error('Error loading initial frame 0:', e);
    };
    images[0] = firstImg;

    // 2. Preload remaining frames
    for (let i = 1; i < TOTAL_FRAMES; i++) {
      const img = new Image();
      img.src = getFrameUrl(i);
      img.onload = () => {
        images[i] = img;
        loadedCount++;
        if (Math.round(currentFrame) === i) {
          needsRedraw = true;
        }
        if (loadedCount % 50 === 0 || loadedCount === TOTAL_FRAMES) {
          console.log(`Frames loaded: ${loadedCount}/${TOTAL_FRAMES}`);
        }
      };
      img.onerror = () => {
        console.error(`Failed to load frame ${i + 1}`);
      };
      images[i] = img;
    }
  }

  // Active Navigation Link Highlighting on Scroll
  const sections = document.querySelectorAll('section[id]');
  const navLinks = document.querySelectorAll('.nav-link');

  function updateActiveNav() {
    const scrollY = window.pageYOffset || document.documentElement.scrollTop;
    
    sections.forEach(current => {
      const sectionHeight = current.offsetHeight;
      const sectionTop = current.offsetTop - 140;
      const sectionId = current.getAttribute('id');
      
      if (scrollY >= sectionTop && scrollY < sectionTop + sectionHeight) {
        navLinks.forEach(link => {
          link.classList.remove('active');
          if (link.getAttribute('href') === `#${sectionId}`) {
            link.classList.add('active');
          }
        });
      }
    });
  }

  // Event Listeners
  window.addEventListener('scroll', () => {
    updateTargetFrame();
    updateActiveNav();
  }, { passive: true });

  window.addEventListener('resize', resizeCanvas);

  // Smooth scroll for nav anchor clicks
  document.querySelectorAll('a[href^="#"]').forEach(anchor => {
    anchor.addEventListener('click', function(e) {
      const targetId = this.getAttribute('href');
      if (targetId === '#') return;
      const targetElement = document.querySelector(targetId);
      if (targetElement) {
        e.preventDefault();
        targetElement.scrollIntoView({
          behavior: 'smooth',
          block: 'start'
        });
      }
    });
  });

  // How It Works Pipeline Toggle
  const howItWorksBtn = document.getElementById('btn-how-it-works');
  const pipelineDrawer = document.getElementById('email-pipeline-drawer');
  if (howItWorksBtn && pipelineDrawer) {
    howItWorksBtn.addEventListener('click', () => {
      const isExpanded = howItWorksBtn.getAttribute('aria-expanded') === 'true';
      howItWorksBtn.setAttribute('aria-expanded', String(!isExpanded));
      pipelineDrawer.hidden = isExpanded;
    });
  }

  // DevPilot Image Switcher
  const devpilotImg = document.getElementById('devpilot-project-img');
  const switchBtns = document.querySelectorAll('.img-switch-btn');
  if (devpilotImg && switchBtns.length > 0) {
    switchBtns.forEach(btn => {
      btn.addEventListener('click', () => {
        const targetSrc = btn.getAttribute('data-img');
        if (!targetSrc || devpilotImg.getAttribute('src') === targetSrc) return;

        switchBtns.forEach(b => b.classList.remove('active'));
        btn.classList.add('active');

        devpilotImg.style.opacity = '0.15';
        setTimeout(() => {
          devpilotImg.src = targetSrc;
          devpilotImg.alt = btn.getAttribute('aria-label') || 'DevPilot Screenshot';
          devpilotImg.style.opacity = '1';
        }, 120);
      });
    });
  }

  // Initialize
  resizeCanvas();
  updateTargetFrame();
  updateActiveNav();
  preloadImages();
  requestAnimationFrame(animationLoop);
})();
