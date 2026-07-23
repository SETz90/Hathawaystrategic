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

      (function () {
        var canvas = document.getElementById("rfParticles");
        if (!canvas) return;
        var prefersReduced = window.matchMedia(
          "(prefers-reduced-motion: reduce)",
        ).matches;
        if (prefersReduced) return;

        var ctx = canvas.getContext("2d");
        var hero = canvas.closest(".hero");
        var particles = [];
        var particleCount = 46;

        function resize() {
          canvas.width = hero.offsetWidth;
          canvas.height = hero.offsetHeight;
        }

        function makeParticle() {
          return {
            x: Math.random() * canvas.width,
            y: Math.random() * canvas.height,
            r: Math.random() * 1.6 + 0.4,
            speedY: Math.random() * 0.25 + 0.05,
            drift: Math.random() * 0.4 - 0.2,
            alpha: Math.random() * 0.5 + 0.15,
          };
        }

        function init() {
          resize();
          particles = [];
          for (var i = 0; i < particleCount; i++) {
            particles.push(makeParticle());
          }
        }

        function tick() {
          ctx.clearRect(0, 0, canvas.width, canvas.height);
          for (var i = 0; i < particles.length; i++) {
            var p = particles[i];
            p.y -= p.speedY;
            p.x += p.drift;
            if (p.y < -5) {
              p.y = canvas.height + 5;
              p.x = Math.random() * canvas.width;
            }
            ctx.beginPath();
            ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
            ctx.fillStyle = "rgba(238, 193, 75, " + p.alpha + ")";
            ctx.fill();
          }
          requestAnimationFrame(tick);
        }

        window.addEventListener("resize", resize);
        init();
        requestAnimationFrame(tick);
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
