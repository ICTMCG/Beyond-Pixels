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
  var DATA = window.SHOWCASE || { text: [], image: [], liveOrder: [] };
  var TEXT = DATA.text.map(function (c) {
    return {
      kind: "text", id: c.id, metaphor: c.metaphor || "",
      source: "static/show/text/" + c.id + "_src.jpg",
      results: c.results.map(function (r) { return { src: r.src, target: r.target || c.target, live: !!r.live }; })
    };
  });
  var IMAGE = DATA.image.map(function (c) {
    return {
      kind: "image", id: c.id, live: !!c.live, metaphor: c.metaphor || "",
      source: "static/show/image/" + c.id + "_src.jpg",
      targetImg: "static/show/image/" + c.id + "_tgt.jpg",
      results: [{ src: "static/show/image/" + c.id + "_res.jpg", target: c.target, live: !!c.live }]
    };
  });
  var byId = { text: {}, image: {} };
  TEXT.forEach(function (c) { byId.text[c.id] = c; });
  IMAGE.forEach(function (c) { byId.image[c.id] = c; });

  /* Viewer entries, one per card, in grid order. */
  var VIEW = { text: [], image: [] };

  /* ------------------------------------------------------------- nav state */
  var nav = $("#nav");
  var onScroll = function () { nav.classList.toggle("scrolled", window.scrollY > 30); };
  window.addEventListener("scroll", onScroll, { passive: true });
  onScroll();

  /* ------------------------------------------------------------ builders */
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
  var arrow = function () { return el("div", "op arrow", "<i></i><b></b>"); };

  /* one card = one equation:  [reference] + target -> [result] */
  function buildCard(c, r, num) {
    var card = el("article", "case");
    card.appendChild(el("span", "case-num", "#" + pad(num)));
    var eq = el("div", "eq " + (c.kind === "text" ? "two" : "three"));

    var ref = el("div", "slot ref");
    ref.appendChild(buildFrame(c.source, "Reference image"));
    ref.appendChild(el("span", "tag", "Reference"));
    eq.appendChild(ref);
    eq.appendChild(el("div", "op", "+"));

    var tgt = el("div", "slot tgt");
    if (c.kind === "text") {
      tgt.appendChild(buildChip(r.target));
      tgt.appendChild(el("span", "tag", "Target · text"));
    } else {
      tgt.appendChild(buildFrame(c.targetImg, "Target image", true));
      tgt.appendChild(el("span", "tag", "Target · image"));
    }
    eq.appendChild(tgt);
    eq.appendChild(arrow());

    var res = el("div", "slot res");
    res.appendChild(buildFrame(r.src, r.target));
    res.appendChild(el("span", "tag", "Result"));
    eq.appendChild(res);
    card.appendChild(eq);

    var foot = el("div", "case-foot");
    foot.appendChild(el("p", "metaphor", '<span class="stage-metaphor-label">shared logic</span>' + c.metaphor));
    card.appendChild(foot);

    var idx = VIEW[c.kind].push({ kind: c.kind, source: c.source, targetImg: c.targetImg, results: [r], metaphor: c.metaphor }) - 1;
    card.addEventListener("click", function () { openViewer(c.kind, idx); });
    return card;
  }

  /* ------------------------------------------------------------ grids */
  var gridText = $("#grid-text"), gridImage = $("#grid-image");
  var n = 0;
  TEXT.forEach(function (c) {
    c.results.forEach(function (r) {
      if (r.live) return;
      gridText.appendChild(buildCard(c, r, ++n));
    });
  });
  if (n % 2 === 1) gridText.lastElementChild.classList.add("lone");   // centre a card left alone on the last row

  n = 0;
  IMAGE.forEach(function (c) {
    if (c.live) return;
    gridImage.appendChild(buildCard(c, c.results[0], ++n));
  });

  /* ---------------------------------------------------------- reveal anim */
  var revealObserver = new IntersectionObserver(function (entries) {
    entries.forEach(function (e) {
      if (e.isIntersecting) { e.target.classList.add("in"); revealObserver.unobserve(e.target); }
    });
  }, { threshold: 0.1, rootMargin: "0px 0px -40px 0px" });
  $$(".reveal, .case").forEach(function (node) { revealObserver.observe(node); });

  var chartObserver = new IntersectionObserver(function (entries) {
    entries.forEach(function (e) {
      if (e.isIntersecting) { e.target.classList.add("in-view"); chartObserver.unobserve(e.target); }
    });
  }, { threshold: 0.35 });
  $$(".chart").forEach(function (node) { chartObserver.observe(node); });

  /* ------------------------------------------------------------ live stage */
  var stage = $("#stage");
  var HERO = (DATA.liveOrder || []).map(function (key) {
    var parts = key.split(":"), c = byId[parts[0]] && byId[parts[0]][parts[1]];
    if (!c) return null;
    var r = c.results.filter(function (x) { return x.live; })[0] || c.results[0];
    return { kind: c.kind, source: c.source, targetImg: c.targetImg, result: r, metaphor: c.metaphor };
  }).filter(Boolean);

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
    HERO.forEach(function (c) { [c.source, c.result.src, c.targetImg].forEach(function (s) { if (s) { var im = new Image(); im.src = s; } }); });

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
        setImg(sRes.parentNode, sRes, c.result.src, c.result.target);
        if (c.kind === "image") { setImg($("#stage-tgt-frame"), sTgt, c.targetImg, "Target"); sTgtCap.textContent = "Target · image"; }
        else { typeChip(c.result.target); sTgtCap.textContent = "Target · text"; }
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
      openViewerEntry({ kind: c.kind, source: c.source, targetImg: c.targetImg, results: [c.result], metaphor: c.metaphor });
    });
    show(0);
    requestAnimationFrame(frame);
  }

  /* ------------------------------------------------------------ case viewer */
  var viewer = $("#viewer");
  var vSrc = $("#v-src"), vTgt = $("#v-tgt"), vRes = $("#v-res"), vChipText = $("#v-chip-text"), vMeta = $("#v-metaphor"), vVariants = $("#v-variants"), vResCap = $("#v-res-cap"), vTgtCap = $("#v-target-cap");
  var vList = null, vIndex = 0, vEntry = null;

  function renderViewer(animate) {
    var c = vEntry, r = c.results[0];
    var apply = function () {
      viewer.classList.toggle("is-image", c.kind === "image");
      setImg(vSrc.parentNode, vSrc, c.source, "Reference");
      setImg(vRes.parentNode, vRes, r.src, r.target);
      if (c.kind === "image") { setImg($("#v-tgt-frame"), vTgt, c.targetImg, "Target"); vTgtCap.textContent = "Target · image"; }
      else { vChipText.textContent = r.target; vTgtCap.textContent = "Target · text"; }
      vMeta.textContent = c.metaphor;
      vResCap.textContent = "Result";
      vVariants.innerHTML = "";
      viewer.classList.remove("switching");
    };
    if (animate && !reduceMotion) { viewer.classList.add("switching"); setTimeout(apply, 240); } else apply();
  }
  function showViewer() {
    renderViewer(false);
    viewer.classList.add("open");
    viewer.setAttribute("aria-hidden", "false");
    document.body.style.overflow = "hidden";
  }
  function openViewer(kind, index) {
    vList = VIEW[kind]; vIndex = index; vEntry = vList[vIndex];
    viewer.classList.remove("no-nav");
    showViewer();
  }
  function openViewerEntry(entry) {          // hero stage: single entry, no prev/next
    vList = null; vEntry = entry;
    viewer.classList.add("no-nav");
    showViewer();
  }
  function closeViewer() {
    viewer.classList.remove("open");
    viewer.setAttribute("aria-hidden", "true");
    document.body.style.overflow = "";
  }
  function stepViewer(dir) {
    if (!vList) return;
    vIndex = (vIndex + dir + vList.length) % vList.length; vEntry = vList[vIndex];
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
