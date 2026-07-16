/* =============================================================
   HATHAWAY STRATEGIC — main.js
   All original features preserved + two new features added:
     • Feature 7: Cinematic Photo Reveal Slider
     • Feature 8: Interactive 3D Laptop
   ============================================================= */

/* =========================================================
   FEATURE 1: MOUSE-TRACKING AMBIENT GLOW + SCROLL PARALLAX
   ========================================================= */
document.addEventListener("DOMContentLoaded", () => {
  const glowEffect = document.getElementById("glow");
  const heroContent = document.querySelector(".hero-container");
  const bgVideo = document.querySelector(".bg-video");

  let mouseXOffset = 0;
  let mouseYOffset = 0;

  window.addEventListener("mousemove", (e) => {
    mouseXOffset = (e.clientX / window.innerWidth - 0.5) * 60;
    mouseYOffset = (e.clientY / window.innerHeight - 0.5) * 60;
    if (glowEffect) {
      glowEffect.style.transform = `translate(${mouseXOffset}px, calc(${mouseYOffset}px + ${window.scrollY * 0.3}px))`;
    }
  });

  window.addEventListener(
    "scroll",
    () => {
      const scrollY = window.scrollY;
      if (heroContent) {
        heroContent.style.opacity = Math.max(1 - scrollY / 500, 0);
        heroContent.style.transform = `translateY(${scrollY * 0.15}px)`;
      }
      if (bgVideo) {
        bgVideo.style.transform = `translate(-50%, calc(-50% + ${scrollY * 0.2}px))`;
      }
      if (glowEffect) {
        glowEffect.style.transform = `translate(${mouseXOffset}px, calc(${mouseYOffset}px + ${scrollY * 0.3}px))`;
      }
    },
    { passive: true },
  );
});

/* =========================================================
   FEATURE 3: UNIFIED MODAL CONTROLLER
   ========================================================= */
document.addEventListener("DOMContentLoaded", () => {
  const triggers = document.querySelectorAll(
    ".view-case-study-trigger, .card-link",
  );
  const modals = document.querySelectorAll(".modal-overlay");

  const openModal = (m) => {
    m.classList.add("is-active");
    document.body.style.overflow = "hidden";
  };
  const closeModal = (m) => {
    m.classList.remove("is-active");
    if (!Array.from(modals).some((x) => x.classList.contains("is-active")))
      document.body.style.overflow = "";
  };

  triggers.forEach((trigger) => {
    trigger.addEventListener("click", (e) => {
      const id = trigger.getAttribute("data-target");
      if (!id) return;
      const modal = document.getElementById(id);
      if (modal) {
        e.preventDefault();
        openModal(modal);
      }
    });
  });

  modals.forEach((modal) => {
    const btn = modal.querySelector(".modal-close-btn");
    if (btn) btn.addEventListener("click", () => closeModal(modal));
    modal.addEventListener("click", (e) => {
      if (e.target === modal) closeModal(modal);
    });
  });

  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape") {
      const active = document.querySelector(".modal-overlay.is-active");
      if (active) closeModal(active);
    }
  });
});

/* =========================================================
   FEATURE 4: SCROLL-REVEAL ANIMATIONS (.fade-up-trigger)
   ========================================================= */
document.addEventListener("DOMContentLoaded", () => {
  const items = document.querySelectorAll(".fade-up-trigger");

  if ("IntersectionObserver" in window) {
    const obs = new IntersectionObserver(
      (entries) => {
        entries.forEach((e) => {
          if (e.isIntersecting) {
            e.target.classList.add("motion-active");
            obs.unobserve(e.target);
          }
        });
      },
      { threshold: 0.12, rootMargin: "0px 0px -50px 0px" },
    );
    items.forEach((i) => obs.observe(i));
  } else {
    items.forEach((i) => i.classList.add("motion-active"));
  }

  /* Parallax on editorial-grid images */
  const parallaxContainers = document.querySelectorAll(".asymmetric-layout");
  window.addEventListener(
    "scroll",
    () => {
      const vh = window.innerHeight;
      parallaxContainers.forEach((c) => {
        const box = c.getBoundingClientRect();
        if (box.top <= vh && box.top + box.height >= 0) {
          const img = c.querySelector(".parallax-img");
          if (img) {
            const delta = (box.top / vh) * 100;
            img.style.transform = `translateY(${delta * 0.3 - 15}px)`;
          }
        }
      });
    },
    { passive: true },
  );
});

/* =========================================================
   FEATURE 6: CAPABILITIES SCRUBBER — CARD ↔ SLIDE SYNC
   ========================================================= */
document.addEventListener("DOMContentLoaded", () => {
  const cards = document.querySelectorAll(".concept-card-trigger");
  const slides = document.querySelectorAll(".media-canvas-slide");
  const mediaColumn = document.querySelector(".scrubber-media-column");
  const splitContainer = document.querySelector(".scrubber-content-split");

  if (window.innerWidth > 992 && cards.length && slides.length) {
    // Track the active index ourselves so followActiveCard can be called on
    // every scroll tick without needing a card element passed in.
    let activeIndex = Array.from(cards).findIndex((c) =>
      c.classList.contains("active"),
    );
    if (activeIndex < 0) activeIndex = 0;

    // Recomputes the photo's offset against the CURRENT live position of the
    // active card. Calling this on every scroll frame (not just when the
    // active card changes) is what makes the photo glide continuously
    // instead of hopping in discrete steps.
    const followActiveCard = () => {
      const card = cards[activeIndex];
      if (!mediaColumn || !splitContainer || !card) return;
      const containerRect = splitContainer.getBoundingClientRect();
      const cardRect = card.getBoundingClientRect();
      const mediaHeight = mediaColumn.offsetHeight;
      const containerHeight = splitContainer.offsetHeight;

      // How far down the card sits relative to the top of the split container
      let offset = cardRect.top - containerRect.top;

      // Clamp so the picture never overshoots past the bottom of the stacked cards
      const maxOffset = Math.max(containerHeight - mediaHeight, 0);
      offset = Math.min(Math.max(offset, 0), maxOffset);

      mediaColumn.style.transform = `translateY(${offset}px)`;
    };

    const activate = (i) => {
      if (i === activeIndex) return;
      cards.forEach((c) => c.classList.remove("active"));
      slides.forEach((s) => s.classList.remove("active"));
      cards[i].classList.add("active");
      slides[i].classList.add("active");
      activeIndex = i;
    };

    cards.forEach((c, i) => {
      c.addEventListener("mouseenter", () => {
        activate(i);
        followActiveCard();
      });
      c.addEventListener("click", () => {
        activate(i);
        followActiveCard();
      });
    });

    // Throttle to one calculation per animation frame with requestAnimationFrame
    // so the browser never gets flooded with scroll-handler work, and — the key
    // fix — re-run followActiveCard() on EVERY frame, not only when the active
    // card changes. That's what turns the old "step" motion into a smooth glide.
    let ticking = false;
    window.addEventListener(
      "scroll",
      () => {
        if (ticking) return;
        ticking = true;
        window.requestAnimationFrame(() => {
          const mid = window.innerHeight * 0.5;
          cards.forEach((c, i) => {
            const b = c.getBoundingClientRect();
            if (b.top <= mid && b.bottom >= mid) activate(i);
          });
          followActiveCard();
          ticking = false;
        });
      },
      { passive: true },
    );

    // Keep the photo aligned if the layout reflows (e.g. fonts loading,
    // window resize) without waiting for the next scroll event.
    window.addEventListener("resize", () => followActiveCard(), {
      passive: true,
    });

    // Align the picture with whichever card starts active on page load
    followActiveCard();
  }
});

/* =================================================================
   FEATURE 7: CINEMATIC PHOTO REVEAL SLIDER (LOOPING ENABLED)
   - Updated to support infinitely wrapping loop navigation
   ================================================================= */
document.addEventListener("DOMContentLoaded", () => {
  const track = document.getElementById("sliderTrack");
  const stage = document.getElementById("sliderStage");
  const prevBtn = document.getElementById("sliderPrev");
  const nextBtn = document.getElementById("sliderNext");
  const dotsWrap = document.getElementById("sliderDots");
  const progress = document.getElementById("sliderProgress");

  if (!track || !stage) return;

  const slides = Array.from(track.querySelectorAll(".reveal-slide"));
  const TOTAL = slides.length;
  let current = 0;
  let autoTimer = null;
  let isAnimating = false;

  /* ----- Build dots ----- */
  const dots = slides.map((_, i) => {
    const d = document.createElement("button");
    d.className = "slider-dot" + (i === 0 ? " active" : "");
    d.setAttribute("aria-label", `Go to slide ${i + 1}`);
    d.addEventListener("click", () => goTo(i));
    dotsWrap.appendChild(d);
    return d;
  });

  const getSlideWidth = () => {
    if (!slides[0]) return 0;
    const style = window.getComputedStyle(track);
    const gap = parseFloat(style.gap) || 32;
    return slides[0].offsetWidth + gap;
  };

  const revealVisible = () => {
    const stageRect = stage.getBoundingClientRect();
    slides.forEach((slide) => {
      const r = slide.getBoundingClientRect();
      if (r.right > stageRect.left && r.left < stageRect.right) {
        const delay = Math.max(0, (r.left - stageRect.left) * 0.0006);
        slide.style.transitionDelay = `${delay}s`;
        slide.classList.add("is-visible");
      }
    });
  };

  /* ----- Move track with wrap-around looping logic ----- */
  const goTo = (index, skipAnim = false) => {
    if (isAnimating && !skipAnim) return;
    isAnimating = true;

    // Loop handling
    if (index < 0) {
      current = TOTAL - 1;
    } else if (index >= TOTAL) {
      current = 0;
    } else {
      current = index;
    }

    const offset = current * getSlideWidth();
    track.style.transition = skipAnim
      ? "none"
      : "transform 0.65s cubic-bezier(0.25, 1, 0.5, 1)";
    track.style.transform = `translateX(-${offset}px)`;

    dots.forEach((d, i) => d.classList.toggle("active", i === current));

    if (progress) progress.style.width = `${((current + 1) / TOTAL) * 100}%`;

    setTimeout(
      () => {
        revealVisible();
        isAnimating = false;
      },
      skipAnim ? 0 : 680,
    );
  };

  const sectionObs = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          slides.forEach((slide, i) => {
            setTimeout(() => {
              slide.style.transitionDelay = "0s";
              slide.classList.add("is-visible");
            }, i * 120);
          });
          sectionObs.disconnect();
        }
      });
    },
    { threshold: 0.15 },
  );

  const section = document.querySelector(".photo-reveal-section");
  if (section) sectionObs.observe(section);

  if (prevBtn)
    prevBtn.addEventListener("click", () => {
      resetAuto();
      goTo(current - 1);
    });
  if (nextBtn)
    nextBtn.addEventListener("click", () => {
      resetAuto();
      goTo(current + 1);
    });

  /* Swipe / Touch support */
  let touchStartX = 0;
  let touchStartTime = 0;
  track.addEventListener(
    "touchstart",
    (e) => {
      touchStartX = e.touches[0].clientX;
      touchStartTime = Date.now();
    },
    { passive: true },
  );
  track.addEventListener(
    "touchend",
    (e) => {
      const dx = touchStartX - e.changedTouches[0].clientX;
      const dt = Date.now() - touchStartTime;
      if (Math.abs(dx) > 50 && dt < 400) {
        resetAuto();
        goTo(current + (dx > 0 ? 1 : -1));
      }
    },
    { passive: true },
  );

  const startAuto = () => {
    autoTimer = setInterval(() => {
      goTo(current + 1);
    }, 4500);
  };
  const resetAuto = () => {
    clearInterval(autoTimer);
    startAuto();
  };
  startAuto();
  goTo(0, true);

  window.addEventListener("resize", () => goTo(current, true), {
    passive: true,
  });
});

/* =================================================================
   FEATURE 8b: LIVE LAPTOP PREVIEW IFRAME
   - Loads the real homepage inside the laptop screen
   - Guards against infinite self-nesting when this page is itself
     rendered inside that preview iframe
   - Scales the 1440x900 "virtual desktop" down to fit the screen
   ================================================================= */
document.addEventListener("DOMContentLoaded", () => {
  const previewIframe = document.querySelector(".laptop-live-preview-iframe");
  if (!previewIframe) return;

  // Only load the live preview at the top level. If this script is
  // running because we ARE the preview (embedded inside another
  // instance of this same page), skip loading another nested copy.
  if (window.self === window.top) {
    previewIframe.src = "index.html";
  } else {
    previewIframe.remove();
    return;
  }

  function sizeLivePreview() {
    const wrap = document.querySelector(".laptop-preview-frame-wrap");
    if (!wrap || !previewIframe.isConnected) return;
    // offsetWidth is a pure layout measurement and is NOT affected by the
    // CSS transform (scale/translateY/rotateX) applied to the ancestor
    // .laptop-2d-hardware-wrapper during its scroll-reveal animation.
    // getBoundingClientRect() WAS affected by that transform, so measuring
    // early (before the reveal animation settled) baked the wrong ratio
    // into the iframe and it stuck until something (like a browser zoom)
    // forced a fresh resize event.
    const wrapWidth = wrap.offsetWidth;
    if (!wrapWidth) return;
    const scale = wrapWidth / 1440;
    previewIframe.style.transform = `scale(${scale})`;
  }

  // Recalculate at every point layout could have shifted: right away,
  // once webfonts finish (can change intrinsic sizes), once everything
  // (video/images) has fully loaded, and once more shortly after via
  // rAF to catch any last-frame layout settling.
  sizeLivePreview();

  if (document.fonts && document.fonts.ready) {
    document.fonts.ready.then(sizeLivePreview);
  }

  window.addEventListener("load", () => {
    sizeLivePreview();
    requestAnimationFrame(() => requestAnimationFrame(sizeLivePreview));
  });

  previewIframe.addEventListener("load", sizeLivePreview);
  window.addEventListener("resize", sizeLivePreview);

  if ("ResizeObserver" in window) {
    const wrap = document.querySelector(".laptop-preview-frame-wrap");
    if (wrap) new ResizeObserver(sizeLivePreview).observe(wrap);
  }
});
/* =================================================================
   UNIFIED DYNAMIC MODAL CONTROLLER 
   - Handles standard portfolio cards and the unique laptop modal completely independently
   ================================================================= */
document.addEventListener("DOMContentLoaded", () => {
  const modalTriggers = document.querySelectorAll(".dynamic-modal-trigger");

  modalTriggers.forEach((trigger) => {
    trigger.addEventListener("click", (e) => {
      e.preventDefault();
      const modalId = trigger.getAttribute("data-modal-target");
      const targetModal = document.getElementById(modalId);

      if (targetModal) {
        targetModal.classList.add("modal-visible");
        targetModal.setAttribute("aria-hidden", "false");
        document.body.style.overflow = "hidden"; // Lock background scroll
      }
    });
  });

  // Global closing wireup for all modal instances
  const closeButtons = document.querySelectorAll("[data-close-modal]");
  closeButtons.forEach((btn) => {
    btn.addEventListener("click", () => {
      const activeModal = document.querySelector(
        ".custom-premium-modal.modal-visible",
      );
      if (activeModal) {
        activeModal.classList.remove("modal-visible");
        activeModal.setAttribute("aria-hidden", "true");
        document.body.style.overflow = "";
      }
    });
  });
});

/* =================================================================
   PATCHED CINEMATIC SLIDER: TRUE INFINITE SEAMLESS LOOP ENGINE
   - Clones boundary elements to safely wrap infinitely without showing blank spaces
   ================================================================= */
document.addEventListener("DOMContentLoaded", () => {
  const track = document.getElementById("sliderTrack");
  const stage = document.getElementById("sliderStage");
  if (!track || !stage) return;

  const originalSlides = Array.from(track.querySelectorAll(".reveal-slide"));
  const TOTAL_ORIGINAL = originalSlides.length;
  if (TOTAL_ORIGINAL === 0) return;

  // Clone first and last slides for flawless illusion transition wrapping
  const firstClone = originalSlides[0].cloneNode(true);
  const lastClone = originalSlides[TOTAL_ORIGINAL - 1].cloneNode(true);

  track.appendChild(firstClone);
  track.insertBefore(lastClone, originalSlides[0]);

  const allSlides = track.querySelectorAll(".reveal-slide");
  let currentIdx = 1; // Start at index 1 because index 0 is the cloned last slide
  let isTransitioning = false;

  const prevBtn = document.getElementById("sliderPrev");
  const nextBtn = document.getElementById("sliderNext");
  const dotsWrap = document.getElementById("sliderDots");
  const progress = document.getElementById("sliderProgress");

  // Build functional navigation tracking dots
  const dots = originalSlides.map((_, i) => {
    const d = document.createElement("button");
    d.className = "slider-dot" + (i === 0 ? " active" : "");
    d.setAttribute("aria-label", `Go to slide ${i + 1}`);
    d.addEventListener("click", () => {
      if (isTransitioning) return;
      goToIndex(i + 1);
    });
    dotsWrap.appendChild(d);
    return d;
  });

  // Quick checklist for your main.js width calculator rule:
  const updateSliderMetrics = () => {
    const slideWidth = originalSlides[0].getBoundingClientRect().width;
    // This inline rule ensures layout scales exactly regardless of parent window padding
    const gap = parseFloat(window.getComputedStyle(track).gap) || 32;
    return slideWidth + gap;
  };

  const goToIndex = (targetIdx, instant = false) => {
    if (isTransitioning && !instant) return;

    isTransitioning = !instant;
    currentIdx = targetIdx;

    const stepSize = updateSliderMetrics();
    track.style.transition = instant
      ? "none"
      : "transform 0.7s cubic-bezier(0.25, 1, 0.5, 1)";
    track.style.transform = `translateX(-${currentIdx * stepSize}px)`;

    // Update indicators map matching true real elements index
    let activeDotIndex = currentIdx - 1;
    if (currentIdx === 0) activeDotIndex = TOTAL_ORIGINAL - 1;
    if (currentIdx === TOTAL_ORIGINAL + 1) activeDotIndex = 0;

    dots.forEach((dot, idx) =>
      dot.classList.toggle("active", idx === activeDotIndex),
    );
    if (progress) {
      progress.style.width = `${((activeDotIndex + 1) / TOTAL_ORIGINAL) * 100}%`;
    }
  };

  // Listen for transition end to instantly snap coordinates without visuals jumping
  track.addEventListener("transitionend", () => {
    isTransitioning = false;
    if (currentIdx === 0) {
      goToIndex(TOTAL_ORIGINAL, true);
    } else if (currentIdx === TOTAL_ORIGINAL + 1) {
      goToIndex(1, true);
    }

    // Handle image dynamic visibility updates
    allSlides.forEach((slide, idx) => {
      if (idx === currentIdx) slide.classList.add("is-visible");
    });
  });

  if (nextBtn)
    nextBtn.addEventListener("click", () => {
      if (!isTransitioning) goToIndex(currentIdx + 1);
    });
  if (prevBtn)
    prevBtn.addEventListener("click", () => {
      if (!isTransitioning) goToIndex(currentIdx - 1);
    });

  // Global layout initialization positioning
  window.addEventListener("resize", () => goToIndex(currentIdx, true), {
    passive: true,
  });

  // Position slider correctly at item index 1 instantly on initialization
  setTimeout(() => {
    goToIndex(1, true);
    allSlides.forEach((s) => s.classList.add("is-visible"));
  }, 50);
});
// --- FEATURE 4: BULLETPROOF NAVBAR SCROLL SPY ---
document.addEventListener("DOMContentLoaded", () => {
  const navLinks = document.querySelectorAll(".nav-link");
  const isPortfolioPage = window.location.pathname.includes("portfolio.html");

  if (isPortfolioPage) {
    // Explicitly lock highlight on Creative Portfolio when viewing portfolio.html
    navLinks.forEach((link) => {
      if (link.getAttribute("href").includes("portfolio.html")) {
        link.classList.add("active");
      } else {
        link.classList.remove("active");
      }
    });
    return;
  }

  if (navLinks.length === 0) return;

  // Only watch the sections that a nav link actually points to (e.g. #home,
  // #solutions) — NOT every div/section/header with an id on the page.
  // Watching everything was the bug: whenever an unrelated element (modals,
  // sliders, counters, etc.) crossed the trigger band, the old code cleared
  // "active" off every link and had nothing to replace it with, so the
  // navbar would go dark until a real section scrolled back through.
  const sectionIds = Array.from(navLinks)
    .map((link) => {
      const href = link.getAttribute("href") || "";
      const hashIndex = href.indexOf("#");
      return hashIndex === -1 ? null : href.slice(hashIndex + 1);
    })
    .filter(Boolean);

  const sections = sectionIds
    .map((id) => document.getElementById(id))
    .filter(Boolean);

  const setActiveById = (id) => {
    navLinks.forEach((link) => {
      const href = link.getAttribute("href") || "";
      const anchorMatch = href.slice(href.indexOf("#") + 1);
      link.classList.toggle("active", anchorMatch === id);
    });
  };

  if (sections.length > 0) {
    const observerOptions = {
      root: null,
      rootMargin: "-20% 0px -60% 0px", // Triggers cleanly when section hits upper-mid display area
      threshold: 0,
    };

    const observer = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          setActiveById(entry.target.getAttribute("id"));
        }
      });
    }, observerOptions);

    sections.forEach((section) => observer.observe(section));
  }

  // Fail-safe: force "Home" to highlight anytime the user is at the top of
  // index.html (covers page load, arriving from another page, and scrolling
  // back up before the observer's next intersection fires).
  const checkTopScroll = () => {
    if (window.scrollY < 100) {
      setActiveById("home");
    }
  };

  window.addEventListener("scroll", checkTopScroll, { passive: true });
  // Run immediately on page load to catch arriving from another page
  checkTopScroll();
});

/* =========================================================
   MOBILE NAV PILL TOGGLE (header injected markup)
   ========================================================= */
document.addEventListener("DOMContentLoaded", () => {
  const toggleButton = document.getElementById("mobileMenuButton");
  const navPill = document.getElementById("main-nav-pill");

  if (toggleButton && navPill) {
    const setOpen = (isOpen) => {
      toggleButton.classList.toggle("menu-is-open", isOpen);
      navPill.classList.toggle("menu-is-open", isOpen);
      toggleButton.setAttribute("aria-expanded", String(isOpen));
    };

    toggleButton.addEventListener("click", (e) => {
      e.stopPropagation();
      const willOpen = !navPill.classList.contains("menu-is-open");
      setOpen(willOpen);
    });

    navPill.querySelectorAll(".nav-link").forEach((link) => {
      link.addEventListener("click", () => setOpen(false));
    });

    // Close dropdown when clicking anywhere outside the menu box
    document.addEventListener("click", (e) => {
      if (
        navPill.classList.contains("menu-is-open") &&
        !navPill.contains(e.target) &&
        !toggleButton.contains(e.target)
      ) {
        setOpen(false);
      }
    });

    document.addEventListener("keydown", (e) => {
      if (e.key === "Escape") setOpen(false);
    });

    // Reset the mobile menu if the viewport grows back to desktop size
    window.addEventListener(
      "resize",
      () => {
        if (window.innerWidth > 768) setOpen(false);
      },
      { passive: true },
    );
  }
});

/* =========================================================
   BACK-TO-TOP BUTTON
   ========================================================= */
document.addEventListener("DOMContentLoaded", () => {
  const backToTopBtn = document.getElementById("back-to-top");
  if (backToTopBtn) {
    backToTopBtn.addEventListener("click", () => {
      window.scrollTo({ top: 0, behavior: "smooth" });
    });
  }
});

/* =========================================================
   FOOTER NEWSLETTER FORM
   ========================================================= */
document.addEventListener("DOMContentLoaded", () => {
  const newsletterForm = document.querySelector(".newsletter-form");
  if (newsletterForm) {
    newsletterForm.addEventListener("submit", (e) => {
      e.preventDefault();
      const input = newsletterForm.querySelector(".newsletter-input");
      if (input) input.value = "";
    });
  }
});

/* =========================================================
   COOKIE CONSENT NOTICE
   ========================================================= */
document.addEventListener("DOMContentLoaded", () => {
  const consent = document.getElementById("cookieConsent");
  if (!consent) return;

  const acceptBtn = document.getElementById("cookieAccept");
  const declineBtn = document.getElementById("cookieDecline");
  const STORAGE_KEY = "hathaway_cookie_consent";

  const storedChoice = (() => {
    try {
      return localStorage.getItem(STORAGE_KEY);
    } catch (err) {
      // Storage can be unavailable (private browsing, disabled cookies, etc.)
      return null;
    }
  })();

  const saveChoice = (value) => {
    try {
      localStorage.setItem(STORAGE_KEY, value);
    } catch (err) {
      // If storage isn't available, the notice will simply reappear on the
      // next visit — not ideal, but never blocks the person from choosing.
    }
  };

  const hideBanner = () => {
    consent.classList.remove("is-visible");
  };

  if (!storedChoice) {
    // Small delay so the notice doesn't compete with the page's own
    // entrance animations on first paint.
    setTimeout(() => consent.classList.add("is-visible"), 600);
  }

  if (acceptBtn) {
    acceptBtn.addEventListener("click", () => {
      saveChoice("accepted");
      hideBanner();
    });
  }

  if (declineBtn) {
    declineBtn.addEventListener("click", () => {
      saveChoice("declined");
      hideBanner();
    });
  }
});
