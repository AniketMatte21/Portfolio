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
  const mobileNavLinks = document.querySelectorAll('.mobile-nav-link');

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
        mobileNavLinks.forEach(link => {
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

  // Mobile Navigation Menu Toggle
  const header = document.querySelector('.header');
  const mobileMenuBtn = document.getElementById('mobile-menu-btn');
  const mobileNavMenu = document.getElementById('mobile-nav-menu');
  const mobileLinks = document.querySelectorAll('.mobile-nav-link, .btn-mobile-cta');

  function closeMobileMenu() {
    if (!mobileMenuBtn || !mobileNavMenu) return;
    mobileMenuBtn.setAttribute('aria-expanded', 'false');
    mobileNavMenu.classList.remove('is-open');
    setTimeout(() => {
      if (!mobileNavMenu.classList.contains('is-open')) {
        mobileNavMenu.hidden = true;
      }
    }, 250);
  }

  function openMobileMenu() {
    if (!mobileMenuBtn || !mobileNavMenu) return;
    mobileNavMenu.hidden = false;
    void mobileNavMenu.offsetWidth;
    mobileNavMenu.classList.add('is-open');
    mobileMenuBtn.setAttribute('aria-expanded', 'true');
  }

  if (mobileMenuBtn && mobileNavMenu) {
    mobileMenuBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      const isExpanded = mobileMenuBtn.getAttribute('aria-expanded') === 'true';
      if (isExpanded) {
        closeMobileMenu();
      } else {
        openMobileMenu();
      }
    });

    mobileLinks.forEach(link => {
      link.addEventListener('click', () => {
        closeMobileMenu();
      });
    });

    document.addEventListener('click', (e) => {
      if (header && !header.contains(e.target)) {
        closeMobileMenu();
      }
    });

    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') {
        closeMobileMenu();
      }
    });
  }

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

  // BookMySeat 7-Step Flow Gallery & Lightbox
  const bmsScreenshots = [
    {
      src: 'images/bookmyseat-events.png',
      step: '1/7',
      title: 'Event Discovery',
      label: '1/7 \u2022 Event Discovery',
      desc: 'Live experiences & feature films discovery catalog with real-time event status.'
    },
    {
      src: 'images/bookmyseat-details.png',
      step: '2/7',
      title: 'Movie Details',
      label: '2/7 \u2022 Movie Details',
      desc: 'Feature film synopsis, trailer preview modal, metadata, and instant booking CTA.'
    },
    {
      src: 'images/bookmyseat-showtimes.png',
      step: '3/7',
      title: 'Showtime Selection',
      label: '3/7 \u2022 Showtime Selection',
      desc: 'Cinema theater scheduling, date selector, and multi-format screens (IMAX, Dolby Atmos, ICE).'
    },
    {
      src: 'images/bookmyseat-seats.png',
      step: '4/7',
      title: 'Interactive Seat Map',
      label: '4/7 \u2022 Interactive Seat Map',
      desc: 'Dynamic cinema seating matrix with real-time tier classification (Recliner, Gold, Silver) and Redis lock.'
    },
    {
      src: 'images/bookmyseat-checkout.png',
      step: '5/7',
      title: 'Ticket Hold & Summary',
      label: '5/7 \u2022 Ticket Hold & Summary',
      desc: 'Confirmed reservation hold with itemized seat breakdown, taxes, convenience fees, and countdown timer.'
    },
    {
      src: 'images/bookmyseat-payment.png',
      step: '6/7',
      title: 'Stripe Payment Processing',
      label: '6/7 \u2022 Stripe Payment Checkout',
      desc: 'Secure payment gateway integration with credit card validation, webhooks, and sandbox processing.'
    },
    {
      src: 'images/bookmyseat-confirmed.png',
      step: '7/7',
      title: 'Booking Confirmed & Digital Pass',
      label: '7/7 \u2022 Booking Confirmed',
      desc: 'Official admission pass with verified booking reference, seat identifiers, email confirmation, and print pass.'
    }
  ];

  let currentBmsIndex = 0;
  const bmsImg = document.getElementById('bms-project-img');
  const bmsStepLabel = document.getElementById('bms-step-label');
  const bmsStepBtns = document.querySelectorAll('.bms-step-btn');
  const bmsPrevBtn = document.getElementById('bms-prev-btn');
  const bmsNextBtn = document.getElementById('bms-next-btn');
  const bmsZoomBtn = document.getElementById('bms-zoom-btn');
  const bmsGalleryContainer = document.getElementById('bms-gallery-container');

  // Lightbox elements
  const lightboxModal = document.getElementById('lightbox-modal');
  const lightboxBackdrop = document.getElementById('lightbox-backdrop');
  const lightboxImg = document.getElementById('lightbox-img');
  const lightboxCloseBtn = document.getElementById('lightbox-close-btn');
  const lightboxPrevBtn = document.getElementById('lightbox-prev');
  const lightboxNextBtn = document.getElementById('lightbox-next');
  const lightboxTitle = document.getElementById('lightbox-title');
  const lightboxStepPill = document.getElementById('lightbox-step-pill');
  const lightboxCaption = document.getElementById('lightbox-caption');

  function updateBmsGallery(index) {
    if (index < 0) index = bmsScreenshots.length - 1;
    if (index >= bmsScreenshots.length) index = 0;
    currentBmsIndex = index;

    const data = bmsScreenshots[currentBmsIndex];
    if (bmsImg) {
      bmsImg.style.opacity = '0.2';
      setTimeout(() => {
        bmsImg.src = data.src;
        bmsImg.alt = `BookMySeat - ${data.title}`;
        bmsImg.style.opacity = '1';
      }, 120);
    }

    if (bmsStepLabel) {
      bmsStepLabel.textContent = data.label;
    }

    bmsStepBtns.forEach((btn, i) => {
      const isActive = i === currentBmsIndex;
      btn.classList.toggle('active', isActive);
      if (isActive && typeof btn.scrollIntoView === 'function') {
        btn.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'nearest' });
      }
    });

    if (lightboxModal && !lightboxModal.hidden && lightboxImg) {
      lightboxImg.style.opacity = '0.2';
      setTimeout(() => {
        lightboxImg.src = data.src;
        lightboxImg.alt = data.title;
        lightboxImg.style.opacity = '1';
      }, 120);
      if (lightboxTitle) lightboxTitle.textContent = data.title;
      if (lightboxStepPill) lightboxStepPill.textContent = data.step;
      if (lightboxCaption) lightboxCaption.textContent = data.desc;
    }
  }

  if (bmsStepBtns.length > 0) {
    bmsStepBtns.forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const idx = parseInt(btn.getAttribute('data-index'), 10);
        if (!isNaN(idx)) updateBmsGallery(idx);
      });
    });
  }

  if (bmsPrevBtn) {
    bmsPrevBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      updateBmsGallery(currentBmsIndex - 1);
    });
  }

  if (bmsNextBtn) {
    bmsNextBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      updateBmsGallery(currentBmsIndex + 1);
    });
  }

  function openLightbox(index) {
    if (!lightboxModal) return;
    updateBmsGallery(index);
    lightboxModal.hidden = false;
    void lightboxModal.offsetWidth;
    lightboxModal.classList.add('is-open');
    lightboxModal.setAttribute('aria-hidden', 'false');
    document.body.style.overflow = 'hidden';
  }

  function closeLightbox() {
    if (!lightboxModal) return;
    lightboxModal.classList.remove('is-open');
    lightboxModal.setAttribute('aria-hidden', 'true');
    setTimeout(() => {
      if (!lightboxModal.classList.contains('is-open')) {
        lightboxModal.hidden = true;
      }
    }, 250);
    document.body.style.overflow = '';
  }

  if (bmsZoomBtn) {
    bmsZoomBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      openLightbox(currentBmsIndex);
    });
  }

  if (bmsGalleryContainer) {
    bmsGalleryContainer.addEventListener('click', (e) => {
      if (e.target.closest('.bms-nav-arrow') || e.target.closest('.bms-zoom-btn')) return;
      openLightbox(currentBmsIndex);
    });

    bmsGalleryContainer.addEventListener('keydown', (e) => {
      if (e.key === 'ArrowLeft') {
        e.preventDefault();
        updateBmsGallery(currentBmsIndex - 1);
      } else if (e.key === 'ArrowRight') {
        e.preventDefault();
        updateBmsGallery(currentBmsIndex + 1);
      } else if (e.key === 'Enter') {
        openLightbox(currentBmsIndex);
      }
    });
  }

  if (lightboxCloseBtn) lightboxCloseBtn.addEventListener('click', closeLightbox);
  if (lightboxBackdrop) lightboxBackdrop.addEventListener('click', closeLightbox);
  if (lightboxPrevBtn) lightboxPrevBtn.addEventListener('click', () => updateBmsGallery(currentBmsIndex - 1));
  if (lightboxNextBtn) lightboxNextBtn.addEventListener('click', () => updateBmsGallery(currentBmsIndex + 1));

  document.addEventListener('keydown', (e) => {
    if (lightboxModal && !lightboxModal.hidden && lightboxModal.classList.contains('is-open')) {
      if (e.key === 'Escape') closeLightbox();
      if (e.key === 'ArrowLeft') updateBmsGallery(currentBmsIndex - 1);
      if (e.key === 'ArrowRight') updateBmsGallery(currentBmsIndex + 1);
    }
  });

  // Preload BookMySeat images for instantaneous switching
  bmsScreenshots.forEach(shot => {
    const preImg = new Image();
    preImg.src = shot.src;
  });

  // Initialize
  resizeCanvas();
  updateTargetFrame();
  updateActiveNav();
  preloadImages();
  requestAnimationFrame(animationLoop);
})();
