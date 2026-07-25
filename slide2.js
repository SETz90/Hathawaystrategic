// Navbar highlight: always mark "Our Works" as the active link on this
// page, regardless of what's hardcoded in the HTML. Runs on every load so
// the navbar can never be left showing the wrong (or no) link active.
//
// IMPORTANT: hosts like Netlify rewrite hrefs (e.g. "portfolio.html" becomes
// "/portfolio") via "Pretty URLs" post-processing, so a strict === match on
// href only ever worked on localhost. We strip query/hash, slashes, and the
// .html/.htm extension before comparing so this works everywhere.
const isLinkTo = (href, pageKey) => {
  const clean = (href || "").split(/[?#]/)[0].replace(/^\/+|\/+$/g, "");
  const base = clean.split("/").pop() || "";
  return base.replace(/\.html?$/i, "").toLowerCase() === pageKey;
};

document.addEventListener("DOMContentLoaded", () => {
  document.querySelectorAll(".nav-link").forEach((link) => {
    link.classList.toggle("active", isLinkTo(link.getAttribute("href"), "portfolio"));
  });
});

      // ==========================================================================
      // Specs Modal logic
      // ==========================================================================
      var modal = document.getElementById("specsModal");
      var modalContent = document.getElementById("specsModalContent");

      function openModal() {
        modal.classList.add("flex");
        setTimeout(function () {
          modalContent.classList.add("is-visible");
        }, 10);
        document.body.style.overflow = "hidden";
      }

      function closeModal() {
        modalContent.classList.remove("is-visible");
        setTimeout(function () {
          modal.classList.remove("flex");
          document.body.style.overflow = "";
        }, 300);
      }

      // ==========================================================================
      // Inquiry Modal logic
      // ==========================================================================
      var inquiryModal = document.getElementById("inquiryModal");
      var inquiryModalContent = document.getElementById("inquiryModalContent");

      function openInquiryModal() {
        inquiryModal.classList.add("flex");
        setTimeout(function () {
          inquiryModalContent.classList.add("is-visible");
        }, 10);
        document.body.style.overflow = "hidden";
      }

      function closeInquiryModal() {
        inquiryModalContent.classList.remove("is-visible");
        setTimeout(function () {
          inquiryModal.classList.remove("flex");
          document.body.style.overflow = "";
        }, 300);
      }

      // Close modals when clicking the dark backdrop
      [modal, inquiryModal].forEach(function (overlay) {
        overlay.addEventListener("click", function (e) {
          if (e.target === overlay) {
            if (overlay === modal) closeModal();
            else closeInquiryModal();
          }
        });
      });

      // Close modals with Escape
      document.addEventListener("keydown", function (e) {
        if (e.key === "Escape") {
          closeModal();
          closeInquiryModal();
        }
      });

      // ==========================================================================
      // Reveal animations on scroll
      // ==========================================================================
      var observerOptions = {
        threshold: 0.15,
        rootMargin: "0px 0px -50px 0px",
      };

      var observer = new IntersectionObserver(function (entries) {
        entries.forEach(function (entry) {
          if (entry.isIntersecting) {
            entry.target.classList.add("active");
          }
        });
      }, observerOptions);

      document.querySelectorAll(".reveal").forEach(function (el) {
        observer.observe(el);
      });

      // Mobile Nav Toggle (canonical — shared across every page)
      document.addEventListener("DOMContentLoaded", () => {
        const toggleButton = document.getElementById("mobileMenuButton");
        const navPill = document.getElementById("main-nav-pill");

        if (toggleButton && navPill) {
          toggleButton.addEventListener("click", (e) => {
            e.stopPropagation();
            toggleButton.classList.toggle("menu-is-open");
            navPill.classList.toggle("menu-is-open");
          });

          navPill.querySelectorAll(".nav-link").forEach((link) => {
            link.addEventListener("click", () => {
              toggleButton.classList.remove("menu-is-open");
              navPill.classList.remove("menu-is-open");
            });
          });

          document.addEventListener("click", (e) => {
            if (
              !navPill.contains(e.target) &&
              !toggleButton.contains(e.target)
            ) {
              toggleButton.classList.remove("menu-is-open");
              navPill.classList.remove("menu-is-open");
            }
          });
        }

        const backToTopBtn = document.getElementById("back-to-top");
        if (backToTopBtn) {
          backToTopBtn.addEventListener("click", () => {
            window.scrollTo({ top: 0, behavior: "smooth" });
          });
        }
      });
