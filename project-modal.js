/* ============================================================
   PROJECT CASE STUDY MODAL — data + behavior
   Renders into the existing #modal-laptop-preview shell.
   Reuses the site-wide open/close mechanics already wired up in
   main.js (triggers with data-target="modal-laptop-preview",
   the .modal-overlay open/close, focus trap, ESC-to-close, and
   the data-src lazy-load pass that runs the moment the modal opens).
   This file only owns: populating content, the gallery lightbox,
   the "more projects" switcher, and in-modal scroll reveals.

   TO ADD OR EDIT A CASE STUDY: edit the PM_PROJECTS array below.
   Every field is plain text/URLs — no markup required.
   ============================================================ */

(function () {
  "use strict";

  const PM_PROJECTS = [
    {
      id: "roland-frasier",
      title: "Roland Frasier",
      category: "Social Strategy",
      status: "live", // "live" | "completed"
      heroImg:
        "https://res.cloudinary.com/gmriwzco/image/upload/v1784275536/Roland-Frasier-4.png_c6cbjq.jpg",
      summary:
        "A repeatable content engine for a serial entrepreneur and podcast host — turning every Business Lunch episode into a multi-platform release, not a single upload.",
      overview:
        "Roland Frasier has founded, scaled, or exited over two dozen companies and hosts the Business Lunch podcast. He needed a digital presence and content pipeline that matched the caliber of his guest list.",
      challenge:
        "Every episode was a one-off upload — no repeatable system for turning a single recording into content that could travel across Instagram, YouTube, and email inside its first 48 hours.",
      solution:
        "We built a production pipeline that treats every episode like a launch: a vertical cutdown for Reels, a long-form YouTube upload, and a screenshot-ready quote graphic, all under one consistent visual system.",
      outcome:
        "A 48-hour turnaround from recording to publish, consistent branding across feed, stories, email, and paid social, and a show that now reads as one polished product instead of scattered clips.",
      info: {
        industry: "Personal Brand & Media",
        services: "Social Strategy, Podcast Production",
        role: "Full-Service Content Partner",
        timeline: "Ongoing Retainer",
        year: "2024",
        client: "Roland Frasier — Business Lunch",
      },
      tech: ["Instagram", "YouTube", "Riverside.fm", "Premiere Pro", "Canva", "Metricool"],
      gallery: [
        {
          src: "https://res.cloudinary.com/gmriwzco/image/upload/v1784278319/roland-stage_hxkag3.jpg",
          alt: "Roland Frasier speaking on a live keynote stage",
          caption: "Live Keynote",
        },
        {
          src: "https://res.cloudinary.com/gmriwzco/image/upload/v1784278318/roland-podcast-card_oytmx7.jpg",
          alt: "Beyond 8 Figures podcast feature card with Roland Frasier",
          caption: "Featured Placement — Beyond 8 Figures",
        },
        {
          src: "https://res.cloudinary.com/gmriwzco/image/upload/v1784278319/roland-portrait_icbguk.png",
          alt: "Portrait of Roland Frasier",
          caption: "Host, Business Lunch",
        },
      ],
      results: [
        "48-Hour Publish Turnaround",
        "Multi-Platform Distribution",
        "Consistent Visual Branding",
        "Screenshot-Ready Quote Graphics",
        "24+ Ventures, One Cohesive Story",
      ],
      ctaHref: "roland-frasier.html",
      ctaLabel: "Visit Live Page →",
    },
    {
      id: "terra-carbon",
      title: "Terra Carbon",
      category: "Sustainability",
      status: "completed",
      heroImg:
        "https://res.cloudinary.com/gmriwzco/image/upload/v1784275536/Terra-Carbon_vzgt3q.jpg",
      summary:
        "Brand and website strategy for a deep-tech company decarbonizing the steel industry with its Carbon Refinery™ technology.",
      overview:
        "Terra Carbon Development Inc. is a sustainable technology leader focused on decarbonizing the steel industry using its proprietary Carbon Refinery™ technology, already proven at TRL 9.",
      challenge:
        "Deep-tech industrial credibility is hard to convey online — the site needed to speak to investors and industrial partners without drowning the story in jargon.",
      solution:
        "We designed a brand and website framework built around the facility itself: real renderings, plain-language process explanations, and a visual language borrowed from industrial engineering rather than generic startup templates.",
      outcome:
        "A site that positions Terra Carbon as a credible, near-market industrial partner — built to hold up in front of investors and refinery operators alike.",
      info: {
        industry: "Clean & Industrial Technology",
        services: "Brand Strategy, Website Design",
        role: "Brand & Web Design Partner",
        timeline: "8 Week Engagement",
        year: "2024",
        client: "Terra Carbon Development Inc.",
      },
      tech: ["HTML", "CSS", "JavaScript", "GSAP", "Netlify"],
      gallery: [
        {
          src: "https://res.cloudinary.com/gmriwzco/image/upload/v1784278830/terracarbonimage1_nwhdnd.png",
          alt: "Terra Carbon Refinery facility rendering",
          caption: "The First Carbon Refinery™",
        },
        {
          src: "https://res.cloudinary.com/gmriwzco/image/upload/v1784278830/terracarbonimage2_env8jp.png",
          alt: "Terra Carbon eco-friendly fuel output",
          caption: "Eco-Friendly Fuel Output",
        },
        {
          src: "https://res.cloudinary.com/gmriwzco/image/upload/v1784278832/terracarbonimage4_kzuxkv.png",
          alt: "Terra Carbon brand detail",
          caption: "Brand System",
        },
      ],
      results: [
        "Investor-Ready Web Presence",
        "Carbon Refinery™ at TRL 9",
        "Clear Technical Storytelling",
        "Mobile Responsive",
        "Fast Load Performance",
      ],
      ctaHref: "terra-carbon-development.html",
      ctaLabel: "Visit Live Page →",
    },
    {
      id: "candy-valentino",
      title: "Candy Valentino",
      category: "Content Creator",
      status: "live",
      heroImg:
        "https://res.cloudinary.com/gmriwzco/image/upload/v1784275375/handheld-scaled_u4dmgd.jpg",
      summary:
        "A personal-brand rebuild for a bestselling author and founder — five companies, two exits — told through a unified content and web system.",
      overview:
        "Candy Valentino is a serial entrepreneur, bestselling author of 9% Edge, and founder of the Founders Organization, with five companies built and two exits to date.",
      challenge:
        "Her story was spread across a book launch, a founders' community, and years of media appearances — with no single site or content system tying it together.",
      solution:
        "We redesigned her website and social presence around one consistent voice, and built a long- and short-form content calendar that connects every appearance back to her core brand.",
      outcome:
        "A cohesive personal brand across web and social — one story, consistently told, whether someone finds her through the book, the podcast, or the feed.",
      info: {
        industry: "Personal Brand & Publishing",
        services: "Web Redesign, Social Rebrand",
        role: "Brand & Content Partner",
        timeline: "Ongoing Retainer",
        year: "2024",
        client: "Candy Valentino — Founders Organization",
      },
      tech: ["Instagram", "Website Redesign", "Content Calendar", "Canva", "Email"],
      gallery: [
        {
          src: "https://res.cloudinary.com/gmriwzco/image/upload/v1784284804/cv-image4_uve8p2.jpg",
          alt: "Candy Valentino Wealth Habits feature",
          caption: "Entrepreneurial — Wealth Habits",
        },
        {
          src: "https://res.cloudinary.com/gmriwzco/image/upload/v1784284804/cv-image5_hjd8px.jpg",
          alt: "Candy Valentino 9% Edge bestselling book",
          caption: "Bestselling Book — 9% Edge",
        },
        {
          src: "https://res.cloudinary.com/gmriwzco/image/upload/v1784284804/cv-profile_nnlras.jpg",
          alt: "Portrait of Candy Valentino",
          caption: "Founder, Founders Organization",
        },
      ],
      results: [
        "Unified Brand Across Platforms",
        "5 Companies, 2 Exits, One Story",
        "Consistent Content Calendar",
        "Mobile Responsive Site",
        "Modern Editorial UI",
      ],
      ctaHref: "candy-valentino.html",
      ctaLabel: "Visit Live Page →",
    },
    {
      id: "coign",
      title: "Coign",
      category: "Conservative-aligned",
      status: "completed",
      heroImg:
        "https://res.cloudinary.com/gmriwzco/image/upload/v1784275374/coign_fakcpq.jpg",
      summary:
        "America's first conservative-focused Visa credit card — 1% cash back on every swipe, with a portion routed to aligned causes.",
      overview:
        "Coign is America's first conservative-focused Visa credit card, offering 1% cash back while directing a portion of every dollar spent toward aligned causes.",
      challenge:
        "A values-driven fintech product needed a content engine that could build a community around a card, not just sell one — without feeling like a typical bank marketing push.",
      solution:
        "We built a social and short-form video system around real cardholders and causes, paired with an email newsletter that keeps the community engaged between campaigns.",
      outcome:
        "A steady content rhythm that turned a card launch into an ongoing community — including national press placements like Fox & Friends.",
      info: {
        industry: "Fintech & Community Commerce",
        services: "Social Management, Short-Form Video",
        role: "Content & Social Partner",
        timeline: "Ongoing Retainer",
        year: "2023",
        client: "Coign",
      },
      tech: ["Short-Form Video", "Instagram", "Email Newsletter", "Canva"],
      gallery: [
        {
          src: "https://res.cloudinary.com/gmriwzco/image/upload/v1784284967/coign-image2_lajeuv.png",
          alt: "Coign branded merchandise",
          caption: "Merchandise — American Heritage",
        },
        {
          src: "https://res.cloudinary.com/gmriwzco/image/upload/v1784284967/coign-image3_cbonrv.png",
          alt: "The Coign card cardholder digest",
          caption: "The Cardholder Digest",
        },
        {
          src: "https://res.cloudinary.com/gmriwzco/image/upload/v1784284967/coign-image1_h8yo23.png",
          alt: "Coign card detail",
          caption: "The Coign Card",
        },
      ],
      results: [
        "National Press Placement",
        "1% Cash Back, Cause-Aligned",
        "Consistent Publishing Cadence",
        "Community-Driven Content",
        "Modern UI/UX",
      ],
      ctaHref: "coign.html",
      ctaLabel: "Visit Live Page →",
    },
  ];

  document.addEventListener("DOMContentLoaded", () => {
    const overlay = document.getElementById("modal-laptop-preview");
    if (!overlay) return;

    const el = {
      heroImg: document.getElementById("pmHeroImg"),
      badge: document.getElementById("pmBadge"),
      title: document.getElementById("pmTitle"),
      category: document.getElementById("pmCategory"),
      summary: document.getElementById("pmSummary"),
      narrative: document.getElementById("pmNarrative"),
      infoGrid: document.getElementById("pmInfoGrid"),
      chips: document.getElementById("pmChips"),
      gallery: document.getElementById("pmGallery"),
      results: document.getElementById("pmResults"),
      switcher: document.getElementById("pmSwitcher"),
      ctaPrimary: document.getElementById("pmCtaPrimary"),
      scroll: document.getElementById("pmScroll"),
      lightbox: document.getElementById("pmLightbox"),
      lightboxImg: document.getElementById("pmLightboxImg"),
      lightboxCaption: document.getElementById("pmLightboxCaption"),
      lightboxClose: document.getElementById("pmLightboxClose"),
      lightboxPrev: document.getElementById("pmLightboxPrev"),
      lightboxNext: document.getElementById("pmLightboxNext"),
    };
    if (!el.title) return; // markup not present on this page

    let currentGallery = [];
    let lightboxIndex = 0;

    const infoLabels = {
      industry: "Industry",
      services: "Services",
      role: "Role",
      timeline: "Timeline",
      year: "Year",
      client: "Client",
    };

    function render(project) {
      // Preserve the site-wide lazy-load pattern: only assign the real
      // `src` once the modal is actually open (main.js already swaps
      // data-src -> src the moment the modal opens for the very first
      // project, so on first render before the modal is opened we just
      // keep data-src in sync instead of forcing an eager image load).
      if (overlay.classList.contains("is-active")) {
        el.heroImg.src = project.heroImg;
      } else {
        el.heroImg.removeAttribute("src");
        el.heroImg.dataset.src = project.heroImg;
      }
      el.heroImg.alt = `${project.title} project preview`;

      el.badge.className = `pm-badge${
        project.status === "completed" ? " pm-badge-completed" : ""
      }`;
      el.badge.innerHTML = `<span class="status-dot"></span>${
        project.status === "completed" ? "Completed" : "Live"
      }`;

      el.title.textContent = project.title;
      el.category.textContent = project.category;
      el.summary.textContent = project.summary;

      const narrativeParts = [
        ["Overview", project.overview],
        ["Challenge", project.challenge],
        ["Solution", project.solution],
        ["Outcome", project.outcome],
      ];
      el.narrative.innerHTML = narrativeParts
        .map(
          ([label, text]) =>
            `<div class="pm-narrative-card pm-reveal"><h3>${label}</h3><p>${text}</p></div>`
        )
        .join("");

      el.infoGrid.innerHTML = Object.keys(infoLabels)
        .map(
          (key) =>
            `<div class="pm-info-card pm-reveal"><span>${infoLabels[key]}</span><strong>${project.info[key]}</strong></div>`
        )
        .join("");

      el.chips.innerHTML = project.tech
        .map((t) => `<span class="pm-chip">${t}</span>`)
        .join("");

      currentGallery = project.gallery;
      el.gallery.innerHTML = project.gallery
        .map(
          (g, i) => `
        <button type="button" class="pm-gallery-item" data-index="${i}" aria-label="View larger image: ${g.caption}">
          <img src="${g.src}" alt="${g.alt}" loading="lazy" decoding="async" />
          <span class="pm-gallery-item-caption">${g.caption}</span>
        </button>`
        )
        .join("");

      el.results.innerHTML = project.results
        .map(
          (r) =>
            `<li><span class="pm-check" aria-hidden="true">&#10003;</span>${r}</li>`
        )
        .join("");

      el.ctaPrimary.href = project.ctaHref;
      el.ctaPrimary.textContent = project.ctaLabel;

      // switcher active state
      el.switcher.querySelectorAll(".pm-switcher-thumb").forEach((btn) => {
        btn.classList.toggle("active", btn.dataset.id === project.id);
      });

      if (el.scroll) el.scroll.scrollTop = 0;
      triggerReveal();
    }

    function buildSwitcher() {
      el.switcher.innerHTML = PM_PROJECTS.map(
        (p) => `
        <button type="button" class="pm-switcher-thumb" data-id="${p.id}" role="tab" aria-selected="false">
          <img src="${p.heroImg}" alt="" loading="lazy" decoding="async" />
          <span>${p.title}</span>
        </button>`
      ).join("");

      el.switcher.querySelectorAll(".pm-switcher-thumb").forEach((btn) => {
        btn.addEventListener("click", () => {
          const project = PM_PROJECTS.find((p) => p.id === btn.dataset.id);
          if (project) render(project);
        });
      });
    }

    function triggerReveal() {
      const cards = overlay.querySelectorAll(".pm-reveal");
      cards.forEach((card, i) => {
        card.classList.remove("pm-reveal-active");
        // stagger slightly for a premium, orchestrated feel
        setTimeout(() => card.classList.add("pm-reveal-active"), 40 + i * 35);
      });
    }

    // ---- Lightbox -------------------------------------------------
    function openLightbox(index) {
      lightboxIndex = index;
      const item = currentGallery[lightboxIndex];
      if (!item || !el.lightbox) return;
      el.lightboxImg.src = item.src;
      el.lightboxImg.alt = item.alt;
      el.lightboxCaption.textContent = item.caption;
      el.lightbox.hidden = false;
      requestAnimationFrame(() => el.lightbox.classList.add("pm-lightbox-visible"));
      el.lightboxClose.focus();
    }

    function closeLightbox() {
      if (!el.lightbox) return;
      el.lightbox.classList.remove("pm-lightbox-visible");
      setTimeout(() => {
        el.lightbox.hidden = true;
      }, 300);
    }

    function stepLightbox(delta) {
      if (!currentGallery.length) return;
      lightboxIndex = (lightboxIndex + delta + currentGallery.length) % currentGallery.length;
      const item = currentGallery[lightboxIndex];
      el.lightboxImg.src = item.src;
      el.lightboxImg.alt = item.alt;
      el.lightboxCaption.textContent = item.caption;
    }

    if (el.gallery) {
      el.gallery.addEventListener("click", (e) => {
        const btn = e.target.closest(".pm-gallery-item");
        if (!btn) return;
        openLightbox(Number(btn.dataset.index));
      });
    }
    if (el.lightboxClose) el.lightboxClose.addEventListener("click", closeLightbox);
    if (el.lightboxPrev) el.lightboxPrev.addEventListener("click", () => stepLightbox(-1));
    if (el.lightboxNext) el.lightboxNext.addEventListener("click", () => stepLightbox(1));
    if (el.lightbox) {
      el.lightbox.addEventListener("click", (e) => {
        if (e.target === el.lightbox) closeLightbox();
      });
    }

    // Capture-phase so ESC closes the lightbox first, not the parent modal
    document.addEventListener(
      "keydown",
      (e) => {
        if (!el.lightbox || el.lightbox.hidden) return;
        if (e.key === "Escape") {
          e.stopPropagation();
          closeLightbox();
        } else if (e.key === "ArrowLeft") {
          stepLightbox(-1);
        } else if (e.key === "ArrowRight") {
          stepLightbox(1);
        }
      },
      true
    );

    buildSwitcher();
    render(PM_PROJECTS[0]);

    // Re-run the reveal animation each time the modal is opened
    const revealObserver = new MutationObserver((mutations) => {
      mutations.forEach((m) => {
        if (m.attributeName === "class" && overlay.classList.contains("is-active")) {
          triggerReveal();
        }
      });
    });
    revealObserver.observe(overlay, { attributes: true });
  });
})();
