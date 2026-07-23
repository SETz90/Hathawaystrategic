      // Reveal Animations Logic
      function reveal() {
        var reveals = document.querySelectorAll(".reveal");
        for (var i = 0; i < reveals.length; i++) {
          var windowHeight = window.innerHeight;
          var elementTop = reveals[i].getBoundingClientRect().top;
          var elementVisible = 120;
          if (elementTop < windowHeight - elementVisible) {
            reveals[i].classList.add("active");
          }
        }
      }
      window.addEventListener("scroll", reveal);
      reveal(); // Initial run on page load

      // Animated Metric Counters — counts each stat up from 0 to its
      // target value the first time it scrolls into view, then (for stats
      // marked data-live) nudges the number slightly every few seconds to
      // read as a live feed. NOTE: this is a simulated visual effect, not
      // a connection to real analytics — wire it to a real data source
      // before treating the numbers as accurate.
      function formatValue(value, decimals, prefix, suffix) {
        return prefix + value.toFixed(decimals) + suffix;
      }

      function startLiveJitter(el) {
        var target = parseFloat(el.dataset.target);
        var decimals = parseInt(el.dataset.decimals || "0", 10);
        var prefix = el.dataset.prefix || "";
        var suffix = el.dataset.suffix || "";
        var jitter = parseFloat(el.dataset.jitter || "0");
        var mode = el.dataset.jitterMode || "around"; // "around" or "under"

        if (!jitter) return;

        setInterval(
          function () {
            var value;
            if (mode === "under") {
              // stays under the target, e.g. "<400ms" fluctuating 340-400ms
              value = target - Math.random() * jitter;
            } else {
              value = target + (Math.random() * 2 - 1) * jitter;
            }
            el.textContent = formatValue(value, decimals, prefix, suffix);
          },
          2600 + Math.random() * 1200,
        );
      }

      function animateCounter(el) {
        var target = parseFloat(el.dataset.target);
        var decimals = parseInt(el.dataset.decimals || "0", 10);
        var prefix = el.dataset.prefix || "";
        var suffix = el.dataset.suffix || "";
        var duration = 1600;
        var startTime = null;

        function tick(now) {
          if (startTime === null) startTime = now;
          var progress = Math.min((now - startTime) / duration, 1);
          var eased = 1 - Math.pow(1 - progress, 3); // ease-out cubic
          var value = target * eased;
          el.textContent = formatValue(value, decimals, prefix, suffix);
          if (progress < 1) {
            requestAnimationFrame(tick);
          } else {
            el.textContent = formatValue(target, decimals, prefix, suffix);
            if (el.dataset.live === "true") {
              startLiveJitter(el);
            }
          }
        }
        requestAnimationFrame(tick);
      }

      var counterEls = document.querySelectorAll(".result-number[data-target]");
      if ("IntersectionObserver" in window) {
        var counterObserver = new IntersectionObserver(
          function (entries) {
            entries.forEach(function (entry) {
              if (entry.isIntersecting) {
                animateCounter(entry.target);
                counterObserver.unobserve(entry.target);
              }
            });
          },
          { threshold: 0.4 },
        );
        counterEls.forEach(function (el) {
          counterObserver.observe(el);
        });
      }

      // Mobile Nav Toggle (matches index.html / portfolio.html behavior)
      document.addEventListener("DOMContentLoaded", () => {
        const toggleButton = document.getElementById("mobileMenuButton");
        const navPill = document.getElementById("main-nav-pill");

        if (toggleButton && navPill) {
          toggleButton.addEventListener("click", (e) => {
            e.stopPropagation();
            toggleButton.classList.toggle("menu-is-open");
            navPill.classList.toggle("menu-is-open");
          });

          // Close dropdown when clicking anywhere outside the menu box
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
