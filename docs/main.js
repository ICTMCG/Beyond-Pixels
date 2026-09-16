/* Beyond Pixels — project page interactions */
(function () {
  "use strict";

  var reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  var $ = function (sel, root) { return (root || document).querySelector(sel); };
  var $$ = function (sel, root) { return Array.prototype.slice.call((root || document).querySelectorAll(sel)); };
  var el = function (tag, cls, html) {
    var n = document.createElement(tag);
    if (cls) n.className = cls;
    if (html !== undefined) n.innerHTML = html;
    return n;
  };
  var setImg = function (frame, img, src, alt) {
    frame.style.setProperty("--img", 'url("' + src + '")');
    img.src = src;
    if (alt) img.alt = alt;
  };
  var pad = function (n) { return (n < 10 ? "0" : "") + n; };

  /* ------------------------------------------------------------------ data */
  var DATA = window.SHOWCASE || { text: [], image: [] };
  var TEXT = DATA.text.map(function (c) {
    return {
      kind: "text", id: c.id, hero: !!c.hero, metaphor: c.metaphor || "",
      source: "static/show/text/" + c.id + "_src.jpg",
      results: c.results.map(function (r) { return { src: r.src, target: r.target || c.target }; })
    };
  });
  var IMAGE = DATA.image.map(function (c) {
    return {
      kind: "image", id: c.id, hero: !!c.hero, metaphor: c.metaphor || "",
      source: "static/show/image/" + c.id + "_src.jpg",
      targetImg: "static/show/image/" + c.id + "_tgt.jpg",
      results: [{ src: "static/show/image/" + c.id + "_res.jpg", target: c.target }]
    };
  });
  var LISTS = { text: TEXT, image: IMAGE };

  /* ------------------------------------------------------------- nav state */
  var nav = $("#nav");
  var onScroll = function () { nav.classList.toggle("scrolled", window.scrollY > 30); };
  window.addEventListener("scroll", onScroll, { passive: true });
  onScroll();

  /* ------------------------------------------------------------ card build */
  function buildFrame(src, alt, square) {
    var f = el("div", "fimg" + (square ? " square" : ""));
    var img = el("img");
    img.loading = "lazy";
    setImg(f, img, src, alt);
    f.appendChild(img);
    return f;
  }
  function buildChip(text, big) {
    var chip = el("div", "target-chip" + (big ? " big" : ""));
    chip.innerHTML = '<span class="chip-quote">“</span><span class="chip-text"></span><span class="chip-quote">”</span>';
    $(".chip-text", chip).textContent = text;
    return chip;
  }

  function buildCard(c, index) {
    var card = el("article", "case");
    card.dataset.kind = c.kind;
    card.dataset.index = index;
    card.appendChild(el("span", "case-num", "#" + pad(index + 1)));

    var eq = el("div", "eq " + (c.kind === "text" ? "two" : "three"));

    // reference
    var ref = el("div", "slot ref");
    ref.appendChild(buildFrame(c.source, "Reference image"));
    ref.appendChild(el("span", "tag", "Reference"));
    eq.appendChild(ref);
    eq.appendChild(el("div", "op", "+"));

    // target
    var tgt = el("div", "slot tgt");
    var chip = null;
    if (c.kind === "text") {
      chip = buildChip(c.results[0].target);
      tgt.appendChild(chip);
      tgt.appendChild(el("span", "tag", "Target · text"));
    } else {
      tgt.appendChild(buildFrame(c.targetImg, "Target image", true));
      tgt.appendChild(el("span", "tag", "Target · image"));
    }
    eq.appendChild(tgt);
    eq.appendChild(el("div", "op arrow", "<i></i><b>→</b>"));

    // result(s)
    var res = el("div", "slot res");
    var dots = null;
    if (c.results.length === 1) {
      res.appendChild(buildFrame(c.results[0].src, c.results[0].target));
    } else {
      var deck = el("div", "deck");
      var shots = c.results.map(function (r) {
        var s = el("div", "shot");
        s.appendChild(buildFrame(r.src, r.target));
        deck.appendChild(s);
        return s;
      });
      var badge = el("span", "deck-badge");
      deck.appendChild(badge);
      deck.appendChild(el("span", "deck-hint", "click to flip · " + c.results.length + " results"));
      dots = el("div", "dots");
      c.results.forEach(function () { dots.appendChild(el("i")); });

      var active = 0;
      var layout = function () {
        shots.forEach(function (s, i) {
          var d = (i - active + shots.length) % shots.length;
          s.className = "shot " + (d === 0 ? "active" : d === 1 ? "peek" : d === 2 ? "peek2" : "gone");
        });
        badge.textContent = (active + 1) + " / " + shots.length;
        $$("i", dots).forEach(function (d, i) { d.classList.toggle("active", i === active); });
        var t = c.results[active].target;
        if (chip && $(".chip-text", chip).textContent !== t) {
          var ct = $(".chip-text", chip);
          ct.textContent = t;
          chip.classList.remove("chip-swap"); void chip.offsetWidth; chip.classList.add("chip-swap");
        }
        card.dataset.variant = active;
      };
      layout();
      deck.addEventListener("click", function (e) {
        e.stopPropagation();
        active = (active + 1) % shots.length;
        layout();
      });
      res.appendChild(deck);
    }
    res.appendChild(el("span", "tag", "Result"));
    eq.appendChild(res);
    card.appendChild(eq);

    var foot = el("div", "case-foot");
    foot.appendChild(el("p", "metaphor", '<span class="stage-metaphor-label">shared logic</span>' + c.metaphor));
    if (dots) foot.appendChild(dots);
    card.appendChild(foot);

    card.addEventListener("click", function () {
      openViewer(c.kind, index, parseInt(card.dataset.variant || "0", 10));
    });
    return card;
  }

  var gridText = $("#grid-text"), gridImage = $("#grid-image");
  TEXT.forEach(function (c, i) { gridText.appendChild(buildCard(c, i)); });
  IMAGE.forEach(function (c, i) { gridImage.appendChild(buildCard(c, i)); });

  /* ---------------------------------------------------------- reveal anim */
  var revealObserver = new IntersectionObserver(function (entries) {
    entries.forEach(function (e) {
      if (e.isIntersecting) { e.target.classList.add("in"); revealObserver.unobserve(e.target); }
    });
  }, { threshold: 0.12, rootMargin: "0px 0px -40px 0px" });
  $$(".reveal, .case").forEach(function (n) { revealObserver.observe(n); });

  var chartObserver = new IntersectionObserver(function (entries) {
    entries.forEach(function (e) {
      if (e.isIntersecting) { e.target.classList.add("in-view"); chartObserver.unobserve(e.target); }
    });
  }, { threshold: 0.35 });
  $$(".chart").forEach(function (n) { chartObserver.observe(n); });

  /* ------------------------------------------------------------ live stage */
  var stage = $("#stage");
  var HERO = TEXT.filter(function (c) { return c.hero; }).concat(IMAGE.filter(function (c) { return c.hero; }));
  // interleave text / image cases so both kinds show up early
  (function interleave() {
    var t = HERO.filter(function (c) { return c.kind === "text"; }), im = HERO.filter(function (c) { return c.kind === "image"; }), out = [];
    while (t.length || im.length) { if (t.length) out.push(t.shift()); if (t.length) out.push(t.shift()); if (im.length) out.push(im.shift()); }
    HERO = out;
  })();

  if (stage && HERO.length) {
    var INTERVAL = 5600, SWAP = 420;
    var sSrc = $("#stage-src"), sTgt = $("#stage-tgt"), sRes = $("#stage-res"), sChip = $("#stage-chip"), sChipText = $("#stage-chip-text");
    var sMeta = $("#stage-metaphor"), sCounter = $("#stage-counter"), sDots = $("#stage-dots"), sProg = $("#stage-progress"), sTgtCap = $("#stage-target-cap");
    var cur = -1, elapsed = 0, paused = false, visible = true, last = null, typeTimer = null;

    HERO.forEach(function (c, i) {
      var b = el("button"); b.setAttribute("aria-label", "example " + (i + 1));
      b.addEventListener("click", function () { show(i); elapsed = 0; });
      sDots.appendChild(b);
    });
    // preload
    HERO.forEach(function (c) { [c.source, c.results[0].src, c.targetImg].forEach(function (s) { if (s) { var im = new Image(); im.src = s; } }); });

    function typeChip(text) {
      clearTimeout(typeTimer);
      sChipText.textContent = "";
      if (reduceMotion) { sChipText.textContent = text; return; }
      sChip.classList.add("typing");
      var i = 0;
      var tick = function () {
        sChipText.textContent = text.slice(0, ++i);
        if (i < text.length) typeTimer = setTimeout(tick, 42);
        else typeTimer = setTimeout(function () { sChip.classList.remove("typing"); }, 700);
      };
      typeTimer = setTimeout(tick, 120);
    }

    function show(i) {
      cur = i;
      var c = HERO[i];
      stage.classList.add("switching");
      $$("button", sDots).forEach(function (b, k) { b.classList.toggle("active", k === i); });
      sCounter.textContent = pad(i + 1) + " / " + pad(HERO.length);
      setTimeout(function () {
        stage.classList.toggle("is-image", c.kind === "image");
        setImg(sSrc.parentNode, sSrc, c.source, "Reference");
        setImg(sRes.parentNode, sRes, c.results[0].src, c.results[0].target);
        if (c.kind === "image") { setImg($("#stage-tgt-frame"), sTgt, c.targetImg, "Target"); sTgtCap.textContent = "Target · image"; }
        else { typeChip(c.results[0].target); sTgtCap.textContent = "Target · text"; }
        sMeta.textContent = c.metaphor;
        stage.classList.remove("switching");
      }, reduceMotion ? 0 : SWAP);
    }

    function frame(ts) {
      if (last === null) last = ts;
      var dt = ts - last; last = ts;
      if (!paused && visible && !document.hidden) {
        elapsed += dt;
        if (elapsed >= INTERVAL) { elapsed = 0; show((cur + 1) % HERO.length); }
      }
      sProg.style.width = Math.min(elapsed / INTERVAL * 100, 100) + "%";
      requestAnimationFrame(frame);
    }
    stage.addEventListener("mouseenter", function () { paused = true; });
    stage.addEventListener("mouseleave", function () { paused = false; });
    new IntersectionObserver(function (e) { visible = e[0].isIntersecting; }, { threshold: 0.2 }).observe(stage);
    stage.addEventListener("click", function (e) {
      if (e.target.closest("button")) return;
      var c = HERO[cur];
      openViewer(c.kind, LISTS[c.kind].indexOf(c), 0);
    });
    show(0);
    requestAnimationFrame(frame);
  }

  /* ------------------------------------------------------------ case viewer */
  var viewer = $("#viewer");
  var vSrc = $("#v-src"), vTgt = $("#v-tgt"), vRes = $("#v-res"), vChipText = $("#v-chip-text"), vMeta = $("#v-metaphor"), vVariants = $("#v-variants"), vResCap = $("#v-res-cap"), vTgtCap = $("#v-target-cap");
  var vKind = "text", vIndex = 0, vVariant = 0;

  function renderViewer(animate) {
    var c = LISTS[vKind][vIndex];
    var r = c.results[vVariant];
    var apply = function () {
      viewer.classList.toggle("is-image", c.kind === "image");
      setImg(vSrc.parentNode, vSrc, c.source, "Reference");
      setImg(vRes.parentNode, vRes, r.src, r.target);
      if (c.kind === "image") { setImg($("#v-tgt-frame"), vTgt, c.targetImg, "Target"); vTgtCap.textContent = "Target · image"; }
      else { vChipText.textContent = r.target; vTgtCap.textContent = "Target · text"; }
      vMeta.textContent = c.metaphor;
      vResCap.textContent = c.results.length > 1 ? "Result " + (vVariant + 1) + " / " + c.results.length : "Result";
      vVariants.innerHTML = "";
      if (c.results.length > 1) {
        c.results.forEach(function (rr, i) {
          var b = el("button", i === vVariant ? "active" : "");
          b.innerHTML = '<img src="' + rr.src + '" alt="' + rr.target + '">';
          b.addEventListener("click", function (e) { e.stopPropagation(); vVariant = i; renderViewer(true); });
          vVariants.appendChild(b);
        });
      }
      viewer.classList.remove("switching");
    };
    if (animate && !reduceMotion) { viewer.classList.add("switching"); setTimeout(apply, 240); } else apply();
  }
  function openViewer(kind, index, variant) {
    vKind = kind; vIndex = index; vVariant = variant || 0;
    renderViewer(false);
    viewer.classList.add("open");
    viewer.setAttribute("aria-hidden", "false");
    document.body.style.overflow = "hidden";
  }
  function closeViewer() {
    viewer.classList.remove("open");
    viewer.setAttribute("aria-hidden", "true");
    document.body.style.overflow = "";
  }
  function stepViewer(dir) {
    var list = LISTS[vKind];
    vIndex = (vIndex + dir + list.length) % list.length; vVariant = 0;
    renderViewer(true);
  }
  $("#viewer-close").addEventListener("click", closeViewer);
  $("#viewer-prev").addEventListener("click", function () { stepViewer(-1); });
  $("#viewer-next").addEventListener("click", function () { stepViewer(1); });
  viewer.addEventListener("click", function (e) { if (e.target === viewer) closeViewer(); });

  /* ------------------------------------------------------- figure lightbox */
  var lightbox = $("#lightbox"), lightboxImg = $("img", lightbox);
  $$("img[data-zoom]").forEach(function (img) {
    img.addEventListener("click", function (e) {
      e.stopPropagation();
      lightboxImg.src = img.src; lightboxImg.alt = img.alt;
      lightbox.classList.add("open"); lightbox.setAttribute("aria-hidden", "false");
      document.body.style.overflow = "hidden";
    });
  });
  var closeLightbox = function () {
    lightbox.classList.remove("open"); lightbox.setAttribute("aria-hidden", "true");
    if (!viewer.classList.contains("open")) document.body.style.overflow = "";
  };
  lightbox.addEventListener("click", closeLightbox);

  document.addEventListener("keydown", function (e) {
    if (e.key === "Escape") { closeLightbox(); closeViewer(); }
    if (viewer.classList.contains("open")) {
      if (e.key === "ArrowRight") stepViewer(1);
      if (e.key === "ArrowLeft") stepViewer(-1);
    }
  });

  /* ------------------------------------------------------------ copy btns */
  $$(".copy-btn").forEach(function (btn) {
    btn.addEventListener("click", function (e) {
      e.stopPropagation();
      var text = btn.getAttribute("data-copy");
      var targetId = btn.getAttribute("data-copy-target");
      if (targetId) text = $("#" + targetId).textContent;
      navigator.clipboard.writeText(text).then(function () {
        var original = btn.textContent;
        btn.textContent = "Copied ✓"; btn.classList.add("copied");
        setTimeout(function () { btn.textContent = original; btn.classList.remove("copied"); }, 1600);
      });
    });
  });

  /* ------------------------------------------------------- terminal typing */
  var typed = $("#typed");
  if (typed) {
    var phrase = "Transfer this image\u2019s metaphor to \u201CFRESH Rose Cream\u201D";
    if (reduceMotion) typed.textContent = phrase;
    else {
      var typeObserver = new IntersectionObserver(function (entries) {
        if (!entries[0].isIntersecting) return;
        typeObserver.disconnect();
        var i = 0;
        var tick = function () { typed.textContent = phrase.slice(0, i++); if (i <= phrase.length) setTimeout(tick, 34); };
        setTimeout(tick, 350);
      }, { threshold: 0.5 });
      typeObserver.observe(typed);
    }
  }

  /* ------------------------------------------------------------ star field */
  var canvas = $("#stars");
  if (canvas && !reduceMotion) {
    var ctx = canvas.getContext("2d"), stars = [];
    var resize = function () { canvas.width = window.innerWidth * devicePixelRatio; canvas.height = window.innerHeight * devicePixelRatio; };
    resize(); window.addEventListener("resize", resize);
    var COUNT = Math.min(140, Math.floor(window.innerWidth / 10));
    for (var i = 0; i < COUNT; i++) stars.push({ x: Math.random(), y: Math.random(), r: Math.random() * 1.3 + 0.3, s: Math.random() * 0.00012 + 0.00003, tw: Math.random() * Math.PI * 2 });
    var draw = function (t) {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      for (var j = 0; j < stars.length; j++) {
        var st = stars[j]; st.y -= st.s; if (st.y < 0) { st.y = 1; st.x = Math.random(); }
        ctx.beginPath(); ctx.arc(st.x * canvas.width, st.y * canvas.height, st.r * devicePixelRatio, 0, Math.PI * 2);
        ctx.fillStyle = "rgba(190,200,255," + (0.25 + 0.35 * Math.abs(Math.sin(t * 0.001 + st.tw))) + ")"; ctx.fill();
      }
      requestAnimationFrame(draw);
    };
    requestAnimationFrame(draw);
  }
})();
