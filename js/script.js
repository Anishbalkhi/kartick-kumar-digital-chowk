(function(){
  var reduce = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  document.body.classList.add('anim');

  /* ---- Milestone galleries — premium pages (data-driven) ---- */
  (function(){
    var GAL={
      gold:{eyebrow:'Milestone 01',title:'Gold Medal · Radio Award',
        desc:'In 1957, at just twenty-two, Kartick Kumar entered the All India Radio national music competition and was declared the finest sitarist in the land. The gold medal was placed in his hands by Dr. Rajendra Prasad, the first President of India — the moment that announced a fourth-generation prodigy to the nation.',
        imgs:[['assets/gold-03.jpg','Receiving the gold medal from President Dr. Rajendra Prasad · October 1957'],
              ['assets/gold-01.jpg','The Times of India — Hindustani Music Competition winners’ list'],
              ['assets/gold-02.jpg','The handwritten note behind the framed photograph'],
              ['assets/gold-04.jpg','Hindusthan Standard, New Delhi · November 1958']]},
      lineage:{eyebrow:'Milestone 02',title:'Sitar Lineage · 4th Generation',
        desc:'The sitar ran in Kartick Kumar’s blood for four generations. Born in Dhaka in 1936, he took his first lessons from his father, Pandit Mangal Chandra Das, before the family’s art passed onward once more — to his own son, Niladri Kumar, a fifth-generation virtuoso.',
        imgs:[['assets/lineage-01.jpg','The family tree of the sitar lineage'],
              ['assets/lineage-05.jpg','Kartick Kumar in concert'],
              ['assets/lineage-02.jpg','At the microphone'],
              ['assets/lineage-03.jpg','An ancestor of the gharana'],
              ['assets/lineage-04.jpg','First Guru & Father — Pandit Mangal Das']]},
      guru:{eyebrow:'Milestone 03',title:'Guru Letters · Pandit Ravi Shankar',
        desc:'In 1958 Kartick Kumar met Pandit Ravi Shankar, who took him under his wing as one of his senior-most disciples. He followed his guru to Bombay, toured North America with Ravi Shankar and George Harrison in 1974, and kept the postcards his guru mailed home from Zürich, Hollywood and beyond for sixty years.',
        imgs:[['assets/guru-02.jpg','Ravi Shankar’s Music Festival from India — the ensemble that toured with George Harrison'],
              ['assets/guru-11.jpg','With his guru, Pandit Ravi Shankar'],
              ['assets/guru-13.jpg','A birthday celebration among friends'],
              ['assets/guru-09.jpg','A ceremony of garlands and blessings'],
              ['assets/guru-05.jpg','The guru’s blessing'],
              ['assets/guru-03.jpg','A moment of ritual'],
              ['assets/guru-10.jpg','Arriving abroad — through customs on tour'],
              ['assets/guru-04.jpg','Among fellow musicians'],
              ['assets/guru-01.jpg','A handwritten note from the years with his guru'],
              ['assets/guru-06.jpg','Postcard from Hollywood, sent to Kartick in Bombay · 1964'],
              ['assets/guru-07.jpg','The Dodge House Motel, Dubuque, Iowa'],
              ['assets/guru-12.jpg','Postcard from Zürich · 1963'],
              ['assets/guru-08.jpg','Postcard from HemisFair ’68, Texas']]},
      vinyl:{eyebrow:'Milestone 04',title:'Vinyls · The Discography',
        desc:'From Deutsche Grammophon’s ‘Sitar Music of India’ to his landmark ‘Ritu Samhaar’ — the first concerto in history to unite thirty-one sitars in perfect unison, drawn from the seasons of Sri Aurobindo’s Savitri — Kartick Kumar’s records carried his sitar across the world.',
        imgs:[['assets/vinyl-05.jpg','Deutsche Grammophon — Sitar Music of India'],
              ['assets/vinyl-06.jpg','Raag ‘n’ Moods — Evergreen Series'],
              ['assets/vinyl-07.jpg','Raag ‘n’ Moods — Aheer Bhairav & Abhogi Kanhara'],
              ['assets/vinyl-09.jpg','Kartick Kumar · Sitar — Polydor'],
              ['assets/vinyl-01.jpg','Ravi Shankar’s Music Festival from India'],
              ['assets/vinyl-02.jpg','Ritu Samhaar — About the Concerto, dedicated to Sri Aurobindo & The Mother'],
              ['assets/vinyl-03.jpg','Ritu Samhaar — the six seasonal ragas'],
              ['assets/vinyl-04.jpg','Ritu Samhaar — the concerto participants'],
              ['assets/vinyl-08.jpg','Indische Sitarmusik']]},
      news:{eyebrow:'Milestone 05',title:'Newspaper Articles · In the Press',
        desc:'For four decades the press followed Kartick Kumar across continents — from his ‘Om Ecstasy & Symphony’ concerto at Birla Hall to the Smithsonian’s tour of America and festivals in London. Critics called his playing “a cascade of gemlike, pure notes” and “an ecstasy that only a maestro can create.”',
        imgs:[['assets/news-07.jpg','“Eastern for a audience” — Midweek Recorder, London · 1974'],
              ['assets/news-03.jpg','31 Sitars — unparalleled in the history of music · 1979'],
              ['assets/news-05.jpg','Smithsonian on Tour: India — Chicago Tribune · 1976'],
              ['assets/news-06.jpg','“Superb Sitar Symphony” — Evening News of India · 1982'],
              ['assets/news-08.jpg','“Unusual Sitar Concerto” — Mid-Day · 1982'],
              ['assets/news-02.jpg','A gathering of the masters'],
              ['assets/news-01.jpg','“A Concerto in Ecstasy” — the 1982 reviews'],
              ['assets/news-10.jpg','Decades of acclaim · 1968–1972'],
              ['assets/news-04.jpg','31 Sitars — the Polydor concerto advertisement'],
              ['assets/news-09.jpg','“The future is with Music India” — the CD era']]},
      memory:{eyebrow:'Milestone 06',title:'Down Memory Lane',
        desc:'Beyond the stage was a life full of friendship and laughter — travels across the world, games of table tennis between the ragas, and the company of the greatest musicians of the age, from Ustad Ali Akbar Khan to the tabla maestros Samta Prasad and Kanai Dutta.',
        imgs:[['assets/memory-07.jpg','Among the masters — a festival montage'],
              ['assets/memory-01.jpg','On stage with tabla maestro Pandit Samta Prasad'],
              ['assets/memory-10.jpg','In concert with Pandit Kanai Dutta'],
              ['assets/memory-09.jpg','With Ustad Ali Akbar Khan'],
              ['assets/memory-06.jpg','At the All India Radio microphone'],
              ['assets/memory-05.jpg','Table tennis between the ragas'],
              ['assets/memory-03.jpg','Boarding the tour flight'],
              ['assets/memory-02.jpg','A quiet moment abroad'],
              ['assets/memory-04.jpg','On the road'],
              ['assets/memory-08.jpg','A young musician of the family']]}
    };
    var modal=document.getElementById('galModal'); if(!modal) return;
    var big=document.getElementById('gmImg'), count=document.getElementById('gmCount'),
        title=document.getElementById('gmTitle'), eyebrow=document.getElementById('gmEyebrow'),
        desc=document.getElementById('gmDesc'), cap=document.getElementById('gmCap'),
        thumbsBox=document.getElementById('gmThumbs');
    var items=[], i=0;
    function show(n){ i=(n+items.length)%items.length; big.src=items[i][0]; big.alt=items[i][1];
      count.textContent='Image '+(i+1)+' / '+items.length; cap.textContent=items[i][1];
      thumbsBox.querySelectorAll('.gm-thumb').forEach(function(t,k){ t.classList.toggle('on',k===i); });
      var act=thumbsBox.querySelector('.gm-thumb.on'); if(act&&act.scrollIntoView) act.scrollIntoView({block:'nearest',inline:'center'}); }
    function open(key){ var g=GAL[key]; if(!g) return; items=g.imgs;
      eyebrow.textContent=g.eyebrow; title.textContent=g.title; desc.textContent=g.desc;
      thumbsBox.innerHTML=items.map(function(it,k){return '<button class="gm-thumb" data-i="'+k+'"><img src="'+it[0]+'" alt=""></button>';}).join('');
      thumbsBox.querySelectorAll('.gm-thumb').forEach(function(t){ t.addEventListener('click',function(){ show(+t.getAttribute('data-i')); }); });
      show(0); modal.classList.add('on'); modal.setAttribute('aria-hidden','false'); document.body.style.overflow='hidden'; }
    function close(){ modal.classList.remove('on'); modal.setAttribute('aria-hidden','true'); document.body.style.overflow=''; }
    window.kkOpenGallery = open; // used by the Journey story viewer (js/journey.js)
    document.querySelectorAll('.mstone.has-gallery').forEach(function(m){
      var key=m.getAttribute('data-gallery');
      m.addEventListener('click', function(){ open(key); });
      m.addEventListener('keydown', function(e){ if(e.key==='Enter'||e.key===' '){ e.preventDefault(); open(key); } });
    });
    document.getElementById('gmClose').addEventListener('click', close);
    document.getElementById('gmPrev').addEventListener('click', function(){ show(i-1); });
    document.getElementById('gmNext').addEventListener('click', function(){ show(i+1); });
    modal.addEventListener('click', function(e){ if(e.target===modal) close(); });
    document.addEventListener('keydown', function(e){
      if(!modal.classList.contains('on')) return;
      if(e.key==='Escape') close(); else if(e.key==='ArrowLeft') show(i-1); else if(e.key==='ArrowRight') show(i+1);
    });
  })();

  /* ---- reveal on scroll ---- */
  var io = new IntersectionObserver(function(es){
    es.forEach(function(e){ if(e.isIntersecting){ e.target.classList.add('in'); io.unobserve(e.target);} });
  }, {threshold:.12, rootMargin:'0px 0px -8% 0px'});
  document.querySelectorAll('.reveal').forEach(function(el){ io.observe(el); });

  /* ---- timeline nodes light up + fill grows ---- */
  var mio = new IntersectionObserver(function(es){
    es.forEach(function(e){ if(e.isIntersecting) e.target.classList.add('lit'); });
  }, {threshold:.5});
  document.querySelectorAll('.ms').forEach(function(m){ mio.observe(m); });

  var tlLine=document.querySelector('.tl-line'), tlFill=document.getElementById('tlFill');
  function updFill(){
    if(!tlLine||!tlFill) return;
    var r=tlLine.getBoundingClientRect();
    var prog=(window.innerHeight*0.55 - r.top)/r.height;
    prog=Math.max(0,Math.min(1,prog));
    tlFill.style.height=(prog*100)+'%';
  }

  /* ---- nav solid + mobile menu ---- */
  var nav=document.getElementById('nav'), mb=document.getElementById('menuBtn');
  function onScroll(){ nav.classList.toggle('solid', window.pageYOffset>60); updFill(); heroParallax(); }
  mb && mb.addEventListener('click', function(){ nav.classList.toggle('open'); });
  var nl=document.getElementById('navlinks');
  nl && nl.addEventListener('click', function(e){ if(e.target.tagName==='A') nav.classList.remove('open'); });

  /* ---- language toggle ---- */
  var en=document.getElementById('l-en'), hi=document.getElementById('l-hi');
  function setLang(l){
    document.querySelectorAll('[data-en]').forEach(function(el){
      var v = l==='hi' ? el.getAttribute('data-hi') : el.getAttribute('data-en');
      if(v!=null) el.innerHTML=v;
    });
    en.classList.toggle('on', l==='en'); hi.classList.toggle('on', l==='hi');
    try{ localStorage.setItem('kk-lang', l);}catch(e){}
  }
  en && en.addEventListener('click', function(){ setLang('en'); });
  hi && hi.addEventListener('click', function(){ setLang('hi'); });
  try{ var saved=localStorage.getItem('kk-lang'); if(saved) setLang(saved);}catch(e){}

  /* ---- lightbox ---- */
  var lb=document.getElementById('lb'), lbi=document.getElementById('lbimg'), lbc=document.getElementById('lbcap');
  var gal=document.getElementById('gal');
  gal && gal.addEventListener('click', function(e){
    var fig=e.target.closest('.gframe'); if(!fig) return;
    lbi.src=fig.querySelector('img').src; lbi.alt=fig.querySelector('img').alt;
    lbc.textContent=fig.getAttribute('data-cap')||''; lb.classList.add('on');
  });
  function closeLb(){ if(!lb) return; lb.classList.remove('on'); lbi.src=''; }
  var lbx=document.getElementById('lbx'); lbx && lbx.addEventListener('click', closeLb);
  lb && lb.addEventListener('click', function(e){ if(e.target===lb) closeLb(); });
  document.addEventListener('keydown', function(e){ if(e.key==='Escape') closeLb(); });

  /* ---- hero background parallax ---- */
  var hbg=document.querySelector('.hero-bg');
  function heroParallax(){
    if(reduce||!hbg) return;
    // measured from the hero's own top, since the Chowk scene now sits above it
    var y=-hbg.parentNode.getBoundingClientRect().top;
    if(y>-window.innerHeight && y<window.innerHeight) hbg.style.transform='translateY('+(Math.max(0,y)*0.25)+'px) scale(1.05)';
  }

  window.addEventListener('scroll', onScroll, {passive:true});
  window.addEventListener('resize', updFill);
  onScroll();

  /* ---- hero sitar: mouse tilt (float handled in CSS) ---- */
  var sit=document.getElementById('heroSitar'), hero=document.querySelector('.hero');
  if(sit && hero && !reduce){
    hero.addEventListener('mousemove', function(e){
      var px=e.clientX/window.innerWidth-.5, py=e.clientY/window.innerHeight-.5;
      sit.style.transform='perspective(1100px) rotateY('+(px*11)+'deg) rotateX('+(-py*6)+'deg)';
    });
    hero.addEventListener('mouseleave', function(){ sit.style.transform='perspective(1100px)'; });
  }

  /* ---- 3D tilt on frames/cards ---- */
  if(!reduce){
    document.querySelectorAll('.tilt').forEach(function(el){
      el.addEventListener('mousemove', function(ev){
        var r=el.getBoundingClientRect();
        var px=(ev.clientX-r.left)/r.width-.5, py=(ev.clientY-r.top)/r.height-.5;
        el.style.transform='perspective(800px) rotateY('+(px*7)+'deg) rotateX('+(-py*7)+'deg) translateY(-6px)';
      });
      el.addEventListener('mouseleave', function(){ el.style.transform=''; });
    });
  }
})();
