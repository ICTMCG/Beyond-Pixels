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
  var DATA = window.SHOWCASE || { text: [], image: [], groups: {}, liveOrder: [] };
  var TEXT = DATA.text.map(function (c) {
    return {
      kind: "text", id: c.id, metaphor: c.metaphor || "", related: c.related || [],
      source: "static/show/text/" + c.id + "_src.jpg",
      results: c.results.map(function (r) { return { src: r.src, target: r.target || c.target, live: !!r.live }; })
    };
  });
  var IMAGE = DATA.image.map(function (c) {
    return {
      kind: "image", id: c.id, live: !!c.live, group: c.group || null, refName: c.ref || "", metaphor: c.metaphor || "", related: c.related || [],
      source: "static/show/image/" + c.id + "_src.jpg",
      targetImg: "static/show/image/" + c.id + "_tgt.jpg",
      results: [{ src: "static/show/image/" + c.id + "_res.jpg", target: c.target, live: !!c.live }]
    };
  });
  var byId = { text: {}, image: {} };
  TEXT.forEach(function (c) { byId.text[c.id] = c; });
  IMAGE.forEach(function (c) { byId.image[c.id] = c; });
  var visibleResults = function (c) { return c.results.filter(function (r) { return !r.live; }); };

  /* Viewer entries: one per (case, visible results) for text; one per member for image. */
  var VIEW = { text: [], image: [] };
  var cardNumber = { text: {}, image: {} };   // case id -> card number (for cross links)
  var cardNode = { text: {}, image: {} };     // case id -> DOM node

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
  function buildFork(dir, rows) {
    var f = el("div", "fork fork-" + dir);
    f.dataset.rows = rows;
    f.innerHTML = '<svg preserveAspectRatio="none"><path class="fork-path" vector-effect="non-scaling-stroke"/></svg>';
    return f;
  }
  function relatedPills(list) {
    var wrap = el("div", "related");
    list.forEach(function (rel) {
      var a = el("a", "rel-pill");
      a.dataset.kind = rel.kind; a.dataset.id = rel.id;
      wrap.appendChild(a);
    });
    return wrap;
  }
  function foot(metaphorHtml, related) {
    var f = el("div", "case-foot");
    f.appendChild(el("p", "metaphor", '<span class="stage-metaphor-label">shared logic</span>' + metaphorHtml));
    if (related && related.length) f.appendChild(relatedPills(related));
    return f;
  }

  /* single text card:  [ref] + "target" -> [result] */
  function buildTextSingle(c, r, num) {
    var card = el("article", "case single");
    card.id = "case-text-" + c.id;
    card.appendChild(el("span", "case-num", "#" + pad(num)));
    var eq = el("div", "eq two");
    var ref = el("div", "slot ref"); ref.appendChild(buildFrame(c.source, "Reference image")); ref.appendChild(el("span", "tag", "Reference"));
    eq.appendChild(ref);
    eq.appendChild(el("div", "op", "+"));
    var tgt = el("div", "slot tgt"); tgt.appendChild(buildChip(r.target)); tgt.appendChild(el("span", "tag", "Target · text"));
    eq.appendChild(tgt);
    eq.appendChild(el("div", "op arrow", "<i></i><b>→</b>"));
    var res = el("div", "slot res"); res.appendChild(buildFrame(r.src, r.target)); res.appendChild(el("span", "tag", "Result"));
    eq.appendChild(res);
    card.appendChild(eq);
    card.appendChild(foot(c.metaphor, c.related));
    var entry = { kind: "text", source: c.source, results: [r], metaphor: c.metaphor };
    var idx = VIEW.text.push(entry) - 1;
    card.addEventListener("click", function () { openViewer("text", idx, 0); });
    return card;
  }

  /* fan-out text card:  [ref] ─┬─ + "target 1" -> [result 1]
                                └─ + "target 2" -> [result 2] */
  function buildTextFan(c, rs, num) {
    var card = el("article", "case fan fan-out-card");
    card.id = "case-text-" + c.id;
    card.style.setProperty("--rows", rs.length);
    card.appendChild(el("span", "case-num", "#" + pad(num)));
    card.appendChild(el("span", "group-pill", "1 reference · " + rs.length + " targets"));
    var eq = el("div", "eq fanout");
    var ref = el("div", "slot ref span-rows"); ref.style.gridColumn = 1;
    ref.appendChild(buildFrame(c.source, "Reference image")); ref.appendChild(el("span", "tag", "Reference"));
    eq.appendChild(ref);
    var fork = buildFork("out", rs.length); fork.style.gridColumn = 2;
    eq.appendChild(fork);
    var entry = { kind: "text", source: c.source, results: rs, metaphor: c.metaphor };
    var idx = VIEW.text.push(entry) - 1;
    rs.forEach(function (r, i) {
      var row = i + 1;
      var plus = el("div", "op row-op", "+"); plus.style.gridRow = row; plus.style.gridColumn = 3;
      var tgt = el("div", "slot tgt"); tgt.style.gridRow = row; tgt.style.gridColumn = 4; tgt.appendChild(buildChip(r.target)); tgt.appendChild(el("span", "tag", "Target · text"));
      var arrow = el("div", "op arrow", "<i></i><b>→</b>"); arrow.style.gridRow = row; arrow.style.gridColumn = 5;
      var res = el("div", "slot res fan-row"); res.style.gridRow = row; res.style.gridColumn = 6; res.appendChild(buildFrame(r.src, r.target)); res.appendChild(el("span", "tag", "Result"));
      res.addEventListener("click", function (e) { e.stopPropagation(); openViewer("text", idx, i); });
      eq.appendChild(plus); eq.appendChild(tgt); eq.appendChild(arrow); eq.appendChild(res);
    });
    card.appendChild(eq);
    card.appendChild(foot(c.metaphor, c.related));
    card.addEventListener("click", function () { openViewer("text", idx, 0); });
    return card;
  }

  /* single image card:  [ref] + [target image] -> [result] */
  function buildImageSingle(c, num) {
    var card = el("article", "case single");
    card.id = "case-image-" + c.id;
    card.appendChild(el("span", "case-num", "#" + pad(num)));
    var eq = el("div", "eq three");
    var ref = el("div", "slot ref"); ref.appendChild(buildFrame(c.source, "Reference image")); ref.appendChild(el("span", "tag", "Reference"));
    eq.appendChild(ref);
    eq.appendChild(el("div", "op", "+"));
    var tgt = el("div", "slot tgt"); tgt.appendChild(buildFrame(c.targetImg, "Target image", true)); tgt.appendChild(el("span", "tag", "Target · image"));
    eq.appendChild(tgt);
    eq.appendChild(el("div", "op arrow", "<i></i><b>→</b>"));
    var r = c.results[0];
    var res = el("div", "slot res"); res.appendChild(buildFrame(r.src, r.target)); res.appendChild(el("span", "tag", "Result"));
    eq.appendChild(res);
    card.appendChild(eq);
    card.appendChild(foot(c.metaphor, c.related));
    var idx = VIEW.image.push({ kind: "image", source: c.source, targetImg: c.targetImg, results: [r], metaphor: c.metaphor }) - 1;
    card.addEventListener("click", function () { openViewer("image", idx, 0); });
    return card;
  }

  /* fan-in image card:  [ref 1] ─┐            ┌─> [result 1]
                         [ref 2] ─┼ + [target] ┼─> [result 2]
                         [ref 3] ─┘            └─> [result 3] */
  function buildImageFan(members, group, num) {
    var card = el("article", "case fan fan-in-card");
    card.id = "case-image-" + members[0].group;
    card.style.setProperty("--rows", members.length);
    card.appendChild(el("span", "case-num", "#" + pad(num)));
    card.appendChild(el("span", "group-pill", members.length + " references · 1 target"));
    var eq = el("div", "eq fanin");
    var idxs = [];
    members.forEach(function (m, i) {
      var row = i + 1;
      var ref = el("div", "slot ref fan-row"); ref.style.gridRow = row; ref.style.gridColumn = 1;
      ref.appendChild(buildFrame(m.source, "Reference image"));
      ref.appendChild(el("span", "tag", m.refName ? "Reference · " + m.refName : "Reference"));
      eq.appendChild(ref);
      var r = m.results[0];
      var res = el("div", "slot res"); res.style.gridRow = row; res.style.gridColumn = 5; res.appendChild(buildFrame(r.src, r.target)); res.appendChild(el("span", "tag", "Result"));
      var idx = VIEW.image.push({ kind: "image", source: m.source, targetImg: m.targetImg, results: [r], metaphor: m.metaphor }) - 1;
      idxs.push(idx);
      res.addEventListener("click", function (e) { e.stopPropagation(); openViewer("image", idx, 0); });
      ref.addEventListener("click", function (e) { e.stopPropagation(); openViewer("image", idx, 0); });
      eq.appendChild(res);
    });
    var forkIn = buildFork("in", members.length); forkIn.style.gridColumn = 2;
    eq.appendChild(forkIn);
    var tgt = el("div", "slot tgt span-rows"); tgt.style.gridColumn = 3;
    tgt.appendChild(buildFrame(members[0].targetImg, "Target image", true)); tgt.appendChild(el("span", "tag", "Target · image"));
    eq.appendChild(tgt);
    var forkOut = buildFork("out", members.length); forkOut.style.gridColumn = 4;
    eq.appendChild(forkOut);
    card.appendChild(eq);

    var lines = members.map(function (m) { return "<b>" + (m.refName || m.id) + "</b> — " + m.metaphor; }).join('<span class="sep">·</span>');
    var related = [];
    members.forEach(function (m) { related = related.concat(m.related); });
    var f = foot(lines, related);
    if (group && group.note) f.insertBefore(el("p", "group-note", group.note), f.firstChild);
    card.appendChild(f);
    card.addEventListener("click", function () { openViewer("image", idxs[0], 0); });
    return card;
  }

  /* ------------------------------------------------------------ grids */
  var gridText = $("#grid-text"), gridImage = $("#grid-image");
  var n = 0;
  TEXT.forEach(function (c) {
    var rs = visibleResults(c);
    if (!rs.length) return;
    n += 1;
    var card = rs.length === 1 ? buildTextSingle(c, rs[0], n) : buildTextFan(c, rs, n);
    cardNumber.text[c.id] = n; cardNode.text[c.id] = card;
    gridText.appendChild(card);
  });
  // a single card left alone on the last row is centred
  (function () {
    var run = 0, last = null;
    $$(".case", gridText).forEach(function (card) {
      if (card.classList.contains("fan")) { run = 0; last = null; return; }
      run += 1; last = card;
    });
    if (run % 2 === 1 && last) last.classList.add("lone");
  })();

  n = 0;
  var doneGroups = {};
  IMAGE.forEach(function (c) {
    if (c.live) return;
    if (c.group) {
      if (doneGroups[c.group]) return;
      doneGroups[c.group] = true;
      var members = IMAGE.filter(function (m) { return m.group === c.group && !m.live; });
      n += 1;
      var card = buildImageFan(members, (DATA.groups || {})[c.group], n);
      members.forEach(function (m) { cardNumber.image[m.id] = n; cardNode.image[m.id] = card; });
      gridImage.appendChild(card);
      return;
    }
    n += 1;
    var single = buildImageSingle(c, n);
    cardNumber.image[c.id] = n; cardNode.image[c.id] = single;
    gridImage.appendChild(single);
  });

  // cross-section links (second pass, once both grids exist)
  $$(".rel-pill").forEach(function (a) {
    var kind = a.dataset.kind, id = a.dataset.id, num = cardNumber[kind][id], node = cardNode[kind][id];
    if (!num || !node) { a.remove(); return; }
    a.href = "#" + node.id;
    a.textContent = "↗ same reference · " + (kind === "text" ? "01" : "02") + " #" + pad(num) + (kind === "text" ? " (text target)" : " (image target)");
    a.addEventListener("click", function (e) { e.stopPropagation(); });
  });

  /* ---------------------------------------------------------- fork paths */
  function layoutForks() {
    $$(".fork").forEach(function (fork) {
      var eq = fork.parentNode, rect = fork.getBoundingClientRect();
      if (!rect.width || !rect.height) return;
      var dir = fork.classList.contains("fork-out") ? "out" : "in";
      var rows = parseInt(fork.dataset.rows, 10);
      // row centres, measured from the frames sitting in each grid row:
      // fork-in joins the reference rows, fork-out joins the result rows
      var frames = $$(dir === "in" ? ".slot.ref .fimg" : ".slot.res .fimg", eq);
      var ys = frames.slice(0, rows).map(function (f) { var r = f.getBoundingClientRect(); return r.top + r.height / 2 - rect.top; });
      if (ys.length !== rows) return;
      var W = rect.width, H = rect.height, mid = H / 2;
      var bar = dir === "out" ? W * 0.32 : W * 0.68;
      var d = "M" + bar + " " + ys[0] + " V" + ys[ys.length - 1];
      ys.forEach(function (y) {
        d += dir === "out" ? " M" + bar + " " + y + " H" + (W - 1) : " M1 " + y + " H" + bar;
        if (dir === "out") d += " M" + (W - 7) + " " + (y - 4) + " L" + (W - 1) + " " + y + " L" + (W - 7) + " " + (y + 4);
      });
      d += dir === "out" ? " M1 " + mid + " H" + bar : " M" + bar + " " + mid + " H" + (W - 1);
      var svg = $("svg", fork);
      svg.setAttribute("viewBox", "0 0 " + W + " " + H);
      $("path", svg).setAttribute("d", d);
    });
  }
  var forkTimer = null;
  var scheduleForks = function () { clearTimeout(forkTimer); forkTimer = setTimeout(layoutForks, 60); };
  window.addEventListener("resize", scheduleForks);
  window.addEventListener("load", scheduleForks);
  requestAnimationFrame(layoutForks);
  setTimeout(layoutForks, 400);

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
  var vList = null, vIndex = 0, vVariant = 0, vEntry = null;

  function renderViewer(animate) {
    var c = vEntry, r = c.results[vVariant];
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
  function showViewer() {
    renderViewer(false);
    viewer.classList.add("open");
    viewer.setAttribute("aria-hidden", "false");
    document.body.style.overflow = "hidden";
  }
  function openViewer(kind, index, variant) {
    vList = VIEW[kind]; vIndex = index; vVariant = variant || 0; vEntry = vList[vIndex];
    viewer.classList.remove("no-nav");
    showViewer();
  }
  function openViewerEntry(entry) {          // hero stage: single entry, no prev/next
    vList = null; vEntry = entry; vVariant = 0;
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
    vIndex = (vIndex + dir + vList.length) % vList.length; vVariant = 0; vEntry = vList[vIndex];
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
