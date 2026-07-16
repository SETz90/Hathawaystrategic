// =========================================================
// OUR SOLUTION PAGE — SCRIPTS
// =========================================================

// Navbar highlight: always mark "Our Solution" as the active link on this
// page, regardless of what's hardcoded in the HTML.
document.addEventListener("DOMContentLoaded", () => {
  const navLinks = document.querySelectorAll(".nav-link");
  navLinks.forEach((link) => {
    if (link.getAttribute("href") === "solutions.html") {
      link.classList.add("active");
    } else {
      link.classList.remove("active");
    }
  });
});

// Intersection Observer for scroll-reveal animations
document.addEventListener("DOMContentLoaded", () => {
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
});

// Accessible mobile nav toggle (same pattern as consultation.html/portfolio.js)
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

    window.addEventListener(
      "resize",
      () => {
        if (window.innerWidth > 768) setOpen(false);
      },
      { passive: true },
    );
  }
});

// Back-to-top button
document.addEventListener("DOMContentLoaded", () => {
  const backToTopBtn = document.getElementById("back-to-top");
  if (backToTopBtn) {
    backToTopBtn.addEventListener("click", () => {
      window.scrollTo({ top: 0, behavior: "smooth" });
    });
  }
});

// Footer newsletter form
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
