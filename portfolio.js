// =========================================================
// PORTFOLIO PAGE — SCRIPTS
// =========================================================

// Navbar highlight: always mark "Our Works" as the active link on this page.
// This runs on every load so the navbar can't be left showing the wrong
// link active, regardless of what's hardcoded in the HTML.
document.addEventListener("DOMContentLoaded", () => {
  const navLinks = document.querySelectorAll(".nav-link");
  navLinks.forEach((link) => {
    if (link.getAttribute("href") === "portfolio.html") {
      link.classList.add("active");
    } else {
      link.classList.remove("active");
    }
  });
});

// Intersection Observer for reveal animations
const observerOptions = {
  threshold: 0.1,
  rootMargin: "0px 0px -50px 0px",
};

const observer = new IntersectionObserver((entries) => {
  entries.forEach((entry) => {
    if (entry.isIntersecting) {
      entry.target.classList.add("active");
    }
  });
}, observerOptions);

document
  .querySelectorAll(".reveal-on-scroll")
  .forEach((el) => observer.observe(el));

// Parallax effect for slider images on mouse move
const sliderItems = document.querySelectorAll(".slider-item");
sliderItems.forEach((item) => {
  item.addEventListener("mousemove", (e) => {
    const img = item.querySelector("img");
    const rect = item.getBoundingClientRect();
    const x = (e.clientX - rect.left) / rect.width;
    const y = (e.clientY - rect.top) / rect.height;

    // Subtle shift
    img.style.transform = `scale(1.1) translate(${(x - 0.5) * 20}px, ${(y - 0.5) * 20}px)`;
  });

  item.addEventListener("mouseleave", () => {
    const img = item.querySelector("img");
    img.style.transform = `scale(1) translate(0, 0)`;
  });
});

// Cinematic slider auto-play + progress bar + dots
(function () {
  const slider = document.querySelector(".cinematic-slider");
  const progressBar = document.getElementById("slider-progress-bar");
  const dots = document.querySelectorAll("#slider-dots button");
  const items = document.querySelectorAll(".slider-item");
  let currentIndex = 0;
  let progress = 0;
  const intervalTime = 5000;
  const stepTime = 50;
  const progressStep = (stepTime / intervalTime) * 100;
  let isUserScrolling = false;
  let scrollEndTimer;

  function updateSlider(index) {
    currentIndex = index;
    const itemWidth = items[0].offsetWidth + 24; // width + gap
    slider.scrollTo({
      left: currentIndex * itemWidth,
      behavior: "smooth",
    });

    dots.forEach((dot, i) => {
      dot.classList.toggle("dot-active", i === currentIndex);
    });

    progress = 0;
  }

  function autoSlide() {
    if (isUserScrolling) return;
    progress += progressStep;
    if (progress >= 100) {
      currentIndex = (currentIndex + 1) % items.length;
      updateSlider(currentIndex);
    }
    progressBar.style.width = `${progress}%`;
  }

  let slideInterval = setInterval(autoSlide, stepTime);

  dots.forEach((dot, index) => {
    dot.addEventListener("click", () => {
      updateSlider(index);
      clearInterval(slideInterval);
      slideInterval = setInterval(autoSlide, stepTime);
    });
  });

  // Keep dots/progress in sync when the person swipes or drags manually,
  // and stop autoplay from yanking the scroll position mid-swipe. This is
  // the same fix already used on the testimonial carousel below — without
  // it, autoplay never paused on touch devices (mouseenter/mouseleave
  // don't fire on tap), so it fought the user's swipe every 5 seconds.
  slider.addEventListener("scroll", () => {
    isUserScrolling = true;
    clearTimeout(scrollEndTimer);
    scrollEndTimer = setTimeout(() => {
      const itemWidth = items[0].offsetWidth + 24;
      const nearest = Math.round(slider.scrollLeft / itemWidth);
      const clamped = Math.max(0, Math.min(nearest, items.length - 1));
      currentIndex = clamped;
      dots.forEach((dot, i) => {
        dot.classList.toggle("dot-active", i === clamped);
      });
      progress = 0;
      isUserScrolling = false;
    }, 120);
  });

  slider.addEventListener("mouseenter", () => clearInterval(slideInterval));
  slider.addEventListener(
    "mouseleave",
    () => (slideInterval = setInterval(autoSlide, stepTime)),
  );

  // Initial state for first dot
  dots[0].classList.add("dot-active");
})();

// Testimonial carousel — swipeable, auto-play + progress bar + dots
(function () {
  const carousel = document.getElementById("testimonial-carousel");
  if (!carousel) return;

  const progressBar = document.getElementById("testimonial-progress-bar");
  const dots = document.querySelectorAll("#testimonial-dots button");
  const slides = document.querySelectorAll(".testimonial-slide");
  let currentIndex = 0;
  let progress = 0;
  const intervalTime = 6000;
  const stepTime = 50;
  const progressStep = (stepTime / intervalTime) * 100;
  let isUserScrolling = false;
  let scrollEndTimer;

  function setActive(index) {
    currentIndex = index;
    dots.forEach((dot, i) => {
      dot.classList.toggle("dot-active", i === currentIndex);
    });
    progress = 0;
  }

  function goToSlide(index) {
    const slideWidth = slides[0].offsetWidth + 24; // width + gap
    carousel.scrollTo({ left: index * slideWidth, behavior: "smooth" });
    setActive(index);
  }

  function autoSlide() {
    if (isUserScrolling) return;
    progress += progressStep;
    if (progress >= 100) {
      goToSlide((currentIndex + 1) % slides.length);
    }
    progressBar.style.width = `${progress}%`;
  }

  let slideInterval = setInterval(autoSlide, stepTime);

  dots.forEach((dot, index) => {
    dot.addEventListener("click", () => {
      goToSlide(index);
      clearInterval(slideInterval);
      slideInterval = setInterval(autoSlide, stepTime);
    });
  });

  // Keep dots/progress in sync when the person swipes or drags manually
  carousel.addEventListener("scroll", () => {
    isUserScrolling = true;
    clearTimeout(scrollEndTimer);
    scrollEndTimer = setTimeout(() => {
      const slideWidth = slides[0].offsetWidth + 24;
      const nearest = Math.round(carousel.scrollLeft / slideWidth);
      setActive(Math.max(0, Math.min(nearest, slides.length - 1)));
      isUserScrolling = false;
    }, 120);
  });

  carousel.addEventListener("mouseenter", () => clearInterval(slideInterval));
  carousel.addEventListener(
    "mouseleave",
    () => (slideInterval = setInterval(autoSlide, stepTime)),
  );

  dots[0].classList.add("dot-active");
})();

// Back-to-top button
document.addEventListener("DOMContentLoaded", () => {
  const backToTopBtn = document.getElementById("back-to-top");
  if (backToTopBtn) {
    backToTopBtn.addEventListener("click", () => {
      window.scrollTo({ top: 0, behavior: "smooth" });
    });
  }
});
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
   CAPABILITIES MODAL
   ========================================================= */
document.addEventListener("DOMContentLoaded", () => {
  const openBtn = document.getElementById("view-capabilities-btn");
  const closeBtn = document.getElementById("capabilities-modal-close");
  const overlay = document.getElementById("capabilities-modal");
  if (!openBtn || !closeBtn || !overlay) return;

  const setOpen = (isOpen) => {
    overlay.classList.toggle("modal-visible", isOpen);
    overlay.setAttribute("aria-hidden", String(!isOpen));
    openBtn.setAttribute("aria-expanded", String(isOpen));
    document.body.style.overflow = isOpen ? "hidden" : "";
  };

  openBtn.addEventListener("click", () => setOpen(true));
  closeBtn.addEventListener("click", () => setOpen(false));

  // Close when clicking the dark backdrop, but not the panel itself
  overlay.addEventListener("click", (e) => {
    if (e.target === overlay) setOpen(false);
  });

  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape" && overlay.classList.contains("modal-visible")) {
      setOpen(false);
    }
  });
});
