/* =====================================================================
   The Journey — a winding, lantern-lit street of ten stories.
   Draws the cobbled road through the stops, places street lamps along
   it, lights the road as you scroll ("walk the street"), and opens each
   full story card in a viewer with prev/next, keyboard and swipe.
   ===================================================================== */
(function () {
  var sec = document.getElementById('journey');
  if (!sec || !sec.classList.contains('jr')) return;
  var reduce = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  /* Full text of each story card (also used as the card image's alt text).
     `gallery` links a story to its archive photo gallery in js/script.js. */
  var STORIES = [
    { title: 'From Hawker to Maestro',
      text: 'From a hawker to a national name. From poverty to global applause. Self-made, self-taught — the incredible journey of sitar guru Pandit Kartick Kumar.' },
    { title: 'The Streets of Kolkata',
      text: 'Displaced by the Partition, a 14-year-old Kartick Chandra Das takes to hawkery on the streets of Kolkata in the 1950s. In 1956 he hears of the All India Radio competition — 13 provinces, one national winner. Too poor to buy a sitar, he makes his own and takes part.' },
    { title: 'The AIR Gold Medal', gallery: 'gold',
      text: 'At 21, Kartick emerges as the All India Radio national winner and is awarded the President’s gold medal by Dr. Rajendra Prasad in 1957. From the footpath to front-page headlines — he becomes a sitar sensation.' },
    { title: 'Blessed by Saraswati',
      text: 'One of the renowned judges of the competition, Pandit Pannalal Ghosh, told the young Kartick: “At this age it is not possible to play Raag Ahir Bhairav like this. It’s as though Maa Saraswati came and played through you.”' },
    { title: 'Meeting Ravi Shankar', gallery: 'guru',
      text: 'In 1958 Kartick, the national sitar winner, is taken to meet Pandit Ravi Shankar. After hearing him play, Pandit Ravi Shankar was silent, then said, “What do I teach you? Tumne dono (styles) baja liya.” And Kartick said, “I’ll start from Sa Re Ga Ma.”' },
    { title: 'The Mumbai Chapter',
      text: '1960: the Mumbai chapter began. Kartick Chandra Das changed his name to Kartick Kumar. Memorable hits from his film music include Piya Tose Naina Lage Re, Mehbooba, Gori Teri Paijaniya and more.' },
    { title: 'America, 1974', gallery: 'memory',
      text: 'In 1974 Kartick Kumar sets off on the famous Beatles & Ravi Shankar tour of America: 45 concerts in 36 cities.' },
    { title: 'Concertos of Sitars', gallery: 'vinyl',
      text: 'In 1978 Kartick Kumar creates Ritu Samhar, a concerto for 31 sitars in 6 raags, released on vinyl by Polydor. In 1986 he creates Om Ecstasy & Symphony, a 10-sitar concerto spanning everything from dhrupad and dhamaar to ghazals. He also taught sitar at Shanmukhananda for over 30 years.' },
    { title: 'The Legacy Continues', gallery: 'lineage',
      text: 'Today his son and disciple, the celebrated maverick maestro Niladri Kumar, carries the path-breaking legacy forward, with his own distinct voice and style through the sitar and his own invention, the Zitar (electric sitar).' },
    { title: 'A Life of Honours', gallery: 'news',
      text: 'From the 1957 All India Radio President’s award to the 2016 Sangeet Natak Akademi Award conferred by the President, his is a journey of honesty, sincerity, devotion and the sheer will of ‘kuch kar dikhana hai’ — not for oneself, but for the nation’s culture to shine before the world. Today, 89 and counting, he continues to inspire many through his story.' }
  ];

  var street = sec.querySelector('.jr-street');
  var grid = sec.querySelector('.jr-grid');
  var road = sec.querySelector('.jr-road');
  var litSvg = sec.querySelector('.jr-lit');
  var roadPaths = road.querySelectorAll('path');
  var lit = litSvg.querySelector('.lit');
  var walker = litSvg.querySelector('.walker');
  var stops = [].slice.call(sec.querySelectorAll('.jr-stop'));
  var roadLen = 0, lamps = [];

  /* ---------- the road ---------- */
  function build() {
    var W = street.clientWidth, H = street.clientHeight;
    if (!W || !H) return;
    var mobile = window.matchMedia('(max-width: 860px)').matches;
    if (!mobile) {   // desktop: the street is the photograph behind the stops
      lamps.forEach(function (l) { l.remove(); });
      lamps = [];
      roadLen = 0;
      return;
    }
    var sr = street.getBoundingClientRect();
    var pts = [], roadW;

    if (mobile) {
      var x = parseFloat(getComputedStyle(street).paddingLeft) + 20;
      roadW = 24;
      pts.push([x, 0]);
      stops.forEach(function (s, i) {
        var r = s.getBoundingClientRect();
        pts.push([x + (i % 2 ? 7 : -7), r.top - sr.top + r.height * 0.4]);
      });
      pts.push([x, H]);
    } else {
      var cols = getComputedStyle(grid).gridTemplateColumns.split(' ').map(parseFloat);
      var gr = grid.getBoundingClientRect();
      var cx = gr.left - sr.left + cols[0] + cols[1] / 2;
      var swing = cols[1] / 2 + 18;
      roadW = Math.max(64, Math.min(116, cols[1] * 0.72));
      pts.push([cx, 0]);
      stops.forEach(function (s) {
        var r = s.getBoundingClientRect();
        var side = s.classList.contains('r') ? 1 : -1;
        pts.push([cx + side * swing, r.top - sr.top + r.height / 2]);
      });
      pts.push([cx, H]);
    }

    var d = 'M' + pts[0][0].toFixed(1) + ' ' + pts[0][1].toFixed(1);
    for (var i = 1; i < pts.length; i++) {
      var a = pts[i - 1], b = pts[i], dy = (b[1] - a[1]) / 2;
      d += ' C' + a[0].toFixed(1) + ' ' + (a[1] + dy).toFixed(1) + ' ' + b[0].toFixed(1) + ' ' + (b[1] - dy).toFixed(1) +
        ' ' + b[0].toFixed(1) + ' ' + b[1].toFixed(1);
    }
    var widths = { halo: roadW + 46, edge: roadW + 9, bed: roadW, shade: roadW * 0.42 };
    [road, litSvg].forEach(function (svg) { svg.setAttribute('viewBox', '0 0 ' + W + ' ' + H); });
    [].forEach.call(roadPaths, function (p) {
      p.setAttribute('d', d);
      p.setAttribute('stroke-width', widths[p.getAttribute('class')]);
    });
    lit.setAttribute('d', d);
    lit.setAttribute('stroke-width', roadW);
    roadLen = lit.getTotalLength();
    lit.style.strokeDasharray = roadLen + ' ' + roadLen;

    // street lamps, alternating sides of the road
    lamps.forEach(function (l) { l.remove(); });
    lamps = [];
    var n = mobile ? 6 : 11;
    for (var k = 0; k < n; k++) {
      var t = (0.05 + k * (0.9 / (n - 1))) * roadLen;
      var p1 = lit.getPointAtLength(t), p2 = lit.getPointAtLength(Math.min(roadLen, t + 2));
      var dx = p2.x - p1.x, dyy = p2.y - p1.y, len = Math.hypot(dx, dyy) || 1;
      var nx = -dyy / len, ny = dx / len, side = mobile ? 1 : (k % 2 ? 1 : -1);
      var off = roadW / 2 + (mobile ? 10 : 16);
      var lamp = document.createElement('span');
      lamp.className = 'jr-lamp';
      lamp.style.left = (p1.x + nx * off * side) + 'px';
      lamp.style.top = (p1.y + ny * off * side) + 'px';
      street.insertBefore(lamp, grid);
      lamps.push(lamp);
    }
    update();
  }

  /* ---------- walking: light the road up to where you are ---------- */
  var ticking = false;
  function update() {
    ticking = false;
    if (!roadLen) return;
    var r = street.getBoundingClientRect();
    var prog = reduce ? 1 : Math.max(0, Math.min(1, (window.innerHeight * 0.62 - r.top) / r.height));
    lit.style.strokeDashoffset = roadLen * (1 - prog);
    var pt = lit.getPointAtLength(roadLen * prog);
    walker.setAttribute('cx', pt.x);
    walker.setAttribute('cy', pt.y);
    walker.style.opacity = prog > 0.002 && prog < 0.998 ? 1 : 0;
  }
  window.addEventListener('scroll', function () {
    if (!ticking) { ticking = true; requestAnimationFrame(update); }
  }, { passive: true });
  if (window.ResizeObserver) new ResizeObserver(function () { build(); }).observe(street);
  else window.addEventListener('resize', build);
  window.addEventListener('load', build);
  build();

  /* ---------- stops rise in as you reach them ---------- */
  if (!reduce && 'IntersectionObserver' in window) {
    sec.classList.add('anim');
    var io = new IntersectionObserver(function (es) {
      es.forEach(function (e) {
        if (!e.isIntersecting) return;
        // reveal this stop and any earlier ones a fast scroll or jump skipped past
        for (var k = 0; k <= stops.indexOf(e.target); k++) {
          if (!stops[k].classList.contains('in')) { stops[k].classList.add('in'); io.unobserve(stops[k]); }
        }
      });
    }, { threshold: 0.18, rootMargin: '0px 0px -6% 0px' });
    stops.forEach(function (s) { io.observe(s); });
  }

  /* ---------- story viewer ---------- */
  var modal = document.getElementById('storyModal');
  if (!modal) return;
  var img = document.getElementById('smImg'), eyebrow = document.getElementById('smEyebrow'),
      title = document.getElementById('smTitle'), text = document.getElementById('smText'),
      archive = document.getElementById('smArchive'), dots = document.getElementById('smDots'),
      closeBtn = document.getElementById('smClose');
  var cur = 0, opener = null;
  var src = function (i) { return 'assets/story-' + String(i + 1).padStart(2, '0') + '.jpg'; };

  STORIES.forEach(function (s, i) {
    var b = document.createElement('button');
    b.type = 'button'; b.className = 'sm-dot'; b.textContent = String(i + 1).padStart(2, '0');
    b.setAttribute('aria-label', 'Story ' + (i + 1) + ': ' + s.title);
    b.addEventListener('click', function () { show(i); });
    dots.appendChild(b);
  });

  function show(i) {
    cur = (i + STORIES.length) % STORIES.length;
    var s = STORIES[cur];
    img.src = src(cur);
    img.alt = 'Story ' + (cur + 1) + ' card: ' + s.text;
    eyebrow.textContent = 'Story ' + String(cur + 1).padStart(2, '0') + ' of ' + STORIES.length;
    title.textContent = s.title;
    text.textContent = s.text;
    archive.hidden = !(s.gallery && window.kkOpenGallery);
    [].forEach.call(dots.children, function (d, k) {
      d.classList.toggle('on', k === cur);
      d.setAttribute('aria-current', k === cur ? 'true' : 'false');
    });
    [cur + 1, cur - 1].forEach(function (k) { new Image().src = src((k + STORIES.length) % STORIES.length); });
  }
  function open(i) {
    opener = document.activeElement;
    show(i);
    modal.classList.add('on');
    modal.setAttribute('aria-hidden', 'false');
    document.body.style.overflow = 'hidden';
    closeBtn.focus();
  }
  function close() {
    modal.classList.remove('on');
    modal.setAttribute('aria-hidden', 'true');
    document.body.style.overflow = '';
    if (opener && opener.focus) opener.focus();
  }

  sec.querySelectorAll('.jr-card').forEach(function (a) {
    a.addEventListener('click', function (e) {
      e.preventDefault();
      open(parseInt(a.getAttribute('data-story'), 10) || 0);
    });
  });
  closeBtn.addEventListener('click', close);
  document.getElementById('smPrev').addEventListener('click', function () { show(cur - 1); });
  document.getElementById('smNext').addEventListener('click', function () { show(cur + 1); });
  archive.addEventListener('click', function () {
    var key = STORIES[cur].gallery;
    close();
    if (key && window.kkOpenGallery) window.kkOpenGallery(key);
  });
  modal.addEventListener('click', function (e) { if (e.target === modal) close(); });
  document.addEventListener('keydown', function (e) {
    if (!modal.classList.contains('on')) return;
    if (e.key === 'Escape') close();
    else if (e.key === 'ArrowLeft') show(cur - 1);
    else if (e.key === 'ArrowRight') show(cur + 1);
  });
  // swipe between stories on touch screens
  var sx = null;
  img.addEventListener('pointerdown', function (e) { sx = e.clientX; });
  img.addEventListener('pointerup', function (e) {
    if (sx === null) return;
    var dx = e.clientX - sx; sx = null;
    if (Math.abs(dx) > 50) show(cur + (dx < 0 ? 1 : -1));
  });
})();
