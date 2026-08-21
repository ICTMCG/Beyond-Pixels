/* Beyond Pixels — project page interactions */
(function () {
  "use strict";

  var reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  /* ---------------- nav scrolled state ---------------- */
  var nav = document.getElementById("nav");
  var onScroll = function () {
    nav.classList.toggle("scrolled", window.scrollY > 30);
  };
  window.addEventListener("scroll", onScroll, { passive: true });
  onScroll();

  /* ---------------- reveal on scroll ---------------- */
  var revealObserver = new IntersectionObserver(
    function (entries) {
      entries.forEach(function (e) {
        if (e.isIntersecting) {
          e.target.classList.add("in");
          revealObserver.unobserve(e.target);
        }
      });
    },
    { threshold: 0.12 }
  );
  document.querySelectorAll(".reveal").forEach(function (el) {
    revealObserver.observe(el);
  });

  /* ---------------- stat count-up ---------------- */
  var countObserver = new IntersectionObserver(
    function (entries) {
      entries.forEach(function (e) {
        if (!e.isIntersecting) return;
        var el = e.target;
        var target = parseInt(el.getAttribute("data-count"), 10);
        countObserver.unobserve(el);
        if (reduceMotion) {
          el.textContent = target;
          return;
        }
        var start = null;
        var step = function (ts) {
          if (!start) start = ts;
          var p = Math.min((ts - start) / 900, 1);
          el.textContent = Math.round(target * (1 - Math.pow(1 - p, 3)));
          if (p < 1) requestAnimationFrame(step);
        };
        requestAnimationFrame(step);
      });
    },
    { threshold: 0.6 }
  );
  document.querySelectorAll(".num[data-count]").forEach(function (el) {
    countObserver.observe(el);
  });

  /* ---------------- bar chart animation ---------------- */
  var chartObserver = new IntersectionObserver(
    function (entries) {
      entries.forEach(function (e) {
        if (e.isIntersecting) {
          e.target.classList.add("in-view");
          chartObserver.unobserve(e.target);
        }
      });
    },
    { threshold: 0.35 }
  );
  document.querySelectorAll(".chart").forEach(function (el) {
    chartObserver.observe(el);
  });

  /* ---------------- results tabs ---------------- */
  var tabs = document.querySelectorAll(".tab");
  tabs.forEach(function (tab) {
    tab.addEventListener("click", function () {
      tabs.forEach(function (t) { t.classList.remove("active"); });
      document.querySelectorAll(".pane").forEach(function (p) { p.classList.remove("active"); });
      tab.classList.add("active");
      document.getElementById(tab.getAttribute("data-target")).classList.add("active");
    });
  });

  /* ---------------- lightbox ---------------- */
  var lightbox = document.getElementById("lightbox");
  var lightboxImg = lightbox.querySelector("img");
  document.querySelectorAll("img[data-zoom]").forEach(function (img) {
    img.addEventListener("click", function () {
      lightboxImg.src = img.src;
      lightboxImg.alt = img.alt;
      lightbox.classList.add("open");
      lightbox.setAttribute("aria-hidden", "false");
      document.body.style.overflow = "hidden";
    });
  });
  var closeLightbox = function () {
    lightbox.classList.remove("open");
    lightbox.setAttribute("aria-hidden", "true");
    document.body.style.overflow = "";
  };
  lightbox.addEventListener("click", closeLightbox);
  document.addEventListener("keydown", function (e) {
    if (e.key === "Escape") closeLightbox();
  });

  /* ---------------- hero teaser tilt ---------------- */
  var tilt = document.getElementById("tilt");
  var supportsHover = window.matchMedia("(hover: hover)").matches;
  if (tilt && supportsHover && !reduceMotion) {
    var damp = 42;
    tilt.addEventListener("mousemove", function (e) {
      var r = tilt.getBoundingClientRect();
      var rx = ((e.clientY - r.top) / r.height - 0.5) * -damp * 0.14;
      var ry = ((e.clientX - r.left) / r.width - 0.5) * damp * 0.14;
      tilt.style.transform = "perspective(1100px) rotateX(" + rx + "deg) rotateY(" + ry + "deg)";
    });
    tilt.addEventListener("mouseleave", function () {
      tilt.style.transform = "perspective(1100px) rotateX(0deg) rotateY(0deg)";
    });
  }

  /* ---------------- copy buttons ---------------- */
  document.querySelectorAll(".copy-btn").forEach(function (btn) {
    btn.addEventListener("click", function (e) {
      e.stopPropagation();
      var text = btn.getAttribute("data-copy");
      var targetId = btn.getAttribute("data-copy-target");
      if (targetId) text = document.getElementById(targetId).textContent;
      navigator.clipboard.writeText(text).then(function () {
        var original = btn.textContent;
        btn.textContent = "Copied ✓";
        btn.classList.add("copied");
        setTimeout(function () {
          btn.textContent = original;
          btn.classList.remove("copied");
        }, 1600);
      });
    });
  });

  /* ---------------- terminal typing ---------------- */
  var typed = document.getElementById("typed");
  if (typed) {
    var phrase = 'Transfer this image\u2019s metaphor to \u201CFRESH Rose Cream\u201D';
    if (reduceMotion) {
      typed.textContent = phrase;
    } else {
      var typeObserver = new IntersectionObserver(
        function (entries) {
          if (!entries[0].isIntersecting) return;
          typeObserver.disconnect();
          var i = 0;
          var tick = function () {
            typed.textContent = phrase.slice(0, i++);
            if (i <= phrase.length) setTimeout(tick, 34);
          };
          setTimeout(tick, 350);
        },
        { threshold: 0.5 }
      );
      typeObserver.observe(typed);
    }
  }

  /* ---------------- star field ---------------- */
  var canvas = document.getElementById("stars");
  if (canvas && !reduceMotion) {
    var ctx = canvas.getContext("2d");
    var stars = [];
    var resize = function () {
      canvas.width = window.innerWidth * devicePixelRatio;
      canvas.height = window.innerHeight * devicePixelRatio;
    };
    resize();
    window.addEventListener("resize", resize);
    var COUNT = Math.min(140, Math.floor(window.innerWidth / 10));
    for (var i = 0; i < COUNT; i++) {
      stars.push({
        x: Math.random(),
        y: Math.random(),
        r: Math.random() * 1.3 + 0.3,
        s: Math.random() * 0.00012 + 0.00003,
        tw: Math.random() * Math.PI * 2,
      });
    }
    var frame = function (t) {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      for (var j = 0; j < stars.length; j++) {
        var st = stars[j];
        st.y -= st.s;
        if (st.y < 0) { st.y = 1; st.x = Math.random(); }
        var alpha = 0.25 + 0.35 * Math.abs(Math.sin(t * 0.001 + st.tw));
        ctx.beginPath();
        ctx.arc(st.x * canvas.width, st.y * canvas.height, st.r * devicePixelRatio, 0, Math.PI * 2);
        ctx.fillStyle = "rgba(190, 200, 255," + alpha + ")";
        ctx.fill();
      }
      requestAnimationFrame(frame);
    };
    requestAnimationFrame(frame);
  }
})();
