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

      function reveal() {
        var reveals = document.querySelectorAll(".reveal");
        var windowHeight = window.innerHeight;
        for (var i = 0; i < reveals.length; i++) {
          var elementTop = reveals[i].getBoundingClientRect().top;
          var revealPoint = 100;
          if (elementTop < windowHeight - revealPoint) {
            reveals[i].classList.add("active");
          }
        }
      }
      window.addEventListener("scroll", reveal);
      window.addEventListener("load", reveal);

      (function () {
        var newsletterForm = document.querySelector(".newsletter-form");
        if (newsletterForm) {
          newsletterForm.addEventListener("submit", function (e) {
            e.preventDefault();
            var input = newsletterForm.querySelector(".newsletter-input");
            if (input) input.value = "";
          });
        }
      })();

      document.addEventListener("DOMContentLoaded", () => {
        const toggleButton = document.getElementById("mobileMenuButton");
        const navPill = document.getElementById("main-nav-pill");
        if (toggleButton && navPill) {
          toggleButton.addEventListener("click", (e) => {
            e.stopPropagation();
            toggleButton.classList.toggle("menu-is-open");
            navPill.classList.toggle("menu-is-open");
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
      });

      // Back-to-top button (canonical — shared across every page)
      document.addEventListener("DOMContentLoaded", () => {
        const backToTopBtn = document.getElementById("back-to-top");
        if (backToTopBtn) {
          backToTopBtn.addEventListener("click", () => {
            window.scrollTo({ top: 0, behavior: "smooth" });
          });
        }
      });
