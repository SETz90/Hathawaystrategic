      // ==========================================================================
      // Reveal-on-scroll
      // ==========================================================================
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

      // ==========================================================================
      // Approach modal
      // ==========================================================================
      (function () {
        var modal = document.getElementById("methodology-modal");
        var modalContent = document.getElementById("modal-content");
        var newsletterForm = document.querySelector(".newsletter-form");
        if (newsletterForm) {
          newsletterForm.addEventListener("submit", function (e) {
            e.preventDefault();
            var input = newsletterForm.querySelector(".newsletter-input");
            if (input) input.value = "";
          });
        }

        var openBtn = document.getElementById("methodology-btn");
        var closeBtn = document.getElementById("close-modal");

        function openModal() {
          modal.classList.add("active");
          modalContent.classList.add("active");
          document.body.style.overflow = "hidden";
        }
        function closeModal() {
          modal.classList.remove("active");
          modalContent.classList.remove("active");
          document.body.style.overflow = "";
        }
        if (openBtn) openBtn.addEventListener("click", openModal);
        if (closeBtn) closeBtn.addEventListener("click", closeModal);
        if (modal) {
          modal.addEventListener("click", function (e) {
            if (e.target === modal) closeModal();
          });
        }
        document.addEventListener("keydown", function (e) {
          if (e.key === "Escape") closeModal();
        });
      })();

      // ==========================================================================
      // Mobile nav toggle
      // ==========================================================================
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

      // ==========================================================================
      // Count-up numbers
      // ==========================================================================
      (function () {
        var counters = document.querySelectorAll("[data-count]");
        var animated = new WeakSet();

        function animateCount(el) {
          var target = parseInt(el.getAttribute("data-count"), 10) || 0;
          var duration = 1400;
          var start = null;

          function step(timestamp) {
            if (!start) start = timestamp;
            var progress = Math.min((timestamp - start) / duration, 1);
            var eased = 1 - Math.pow(1 - progress, 3);
            el.textContent = Math.floor(eased * target);
            if (progress < 1) {
              requestAnimationFrame(step);
            } else {
              el.textContent = target;
            }
          }
          requestAnimationFrame(step);
        }

        if ("IntersectionObserver" in window) {
          var observer = new IntersectionObserver(
            function (entries) {
              entries.forEach(function (entry) {
                if (entry.isIntersecting && !animated.has(entry.target)) {
                  animated.add(entry.target);
                  animateCount(entry.target);
                }
              });
            },
            { threshold: 0.4 },
          );
          counters.forEach(function (el) {
            observer.observe(el);
          });
        } else {
          counters.forEach(function (el) {
            el.textContent = el.getAttribute("data-count");
          });
        }
      })();

      // Back-to-top button (canonical — shared across every page)
      document.addEventListener("DOMContentLoaded", () => {
        const backToTopBtn = document.getElementById("back-to-top");
        if (backToTopBtn) {
          backToTopBtn.addEventListener("click", () => {
            window.scrollTo({ top: 0, behavior: "smooth" });
          });
        }
      });
