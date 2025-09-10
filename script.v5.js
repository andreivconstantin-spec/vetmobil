// =============================================================
// SCRIPT PRINCIPAL PENTRU VETMOBIL
// =============================================================
// Acest fișier JS controlează:
// 1. Includerea dinamică a meniului și footer-ului legal (din /includes/)
// 2. Actualizarea automată a anului în footer
// 3. Încărcarea și afișarea serviciilor din services.json
// 4. Funcționalitatea meniului hamburger (pe mobil)
// =============================================================


// === INCLUDE MENIU + LEGAL ===
// Funcție care încarcă dinamic fișierele "menu.html" și "legal.html"
// în containerele <div id="menu"></div> și <div id="legal"></div>
function normalizeImage(src) {
  if (!src) return '';
  if (typeof src === 'object') src = src.url || src.path || src.download_url || '';
  if (!src) return '';
  if (src.startsWith('http://') || src.startsWith('https://')) return src;
  return '/' + src.replace(/^\.?\//, ''); // forțează cale absolută
}
async function includePartials() {
  try {
    // --- MENIU ---
    const menuContainer = document.getElementById("menu");

    if (menuContainer) {
      // Preia fișierul includes/menu.html
      const resMenu = await fetch("includes/menu.html", { cache: "no-store" });
      menuContainer.innerHTML = await resMenu.text();

      // === Activează hamburger după ce meniul a fost încărcat ===
      const btn = document.getElementById('menuToggle'); // buton ☰
      const nav = document.getElementById('mainNav');    // container nav

      if (btn && nav) {
        // La click pe buton, adaugă/elimină clasa "open"
        btn.addEventListener('click', () => {
          nav.classList.toggle('open');
        });

        // La click pe un link din meniu, închide meniul
        const links = nav.querySelectorAll('a');
        links.forEach(link => {
          link.addEventListener('click', () => {
            nav.classList.remove('open');
          });
        });
      }
    }

    // --- LEGAL ---
    const legalContainer = document.getElementById("legal");

    if (legalContainer) {
      // Preia fișierul includes/legal.html
      const resLegal = await fetch("includes/legal.html", { cache: "no-store" });
      legalContainer.innerHTML = await resLegal.text();
    }

  } catch (err) {
    console.error("Eroare la includerea meniului sau footer-ului:", err);
  }
}

// Rulează imediat funcția de includere
includePartials();


// === UPDATE YEAR IN FOOTER ===
// Actualizează automat anul curent în footer (ex. "© 2025 VetMobil")
const y = document.getElementById('year');
if (y) {
  y.textContent = new Date().getFullYear();
}


// === LOAD SERVICES FROM JSON ===
// Funcție asincronă pentru a încărca și afișa serviciile din fișierul JSON
async function load() {
  try {
    // Preia fișierul JSON cu serviciile
    const res = await fetch('data/services.json', { cache: 'no-store' });
    const data = await res.json();

    // --- HELPERS ---
    const setText = (id, value) => {
      const el = document.getElementById(id);
      if (el) el.textContent = value;
    };
    const setHref = (id, value) => {
      const el = document.getElementById(id);
      if (el) el.href = value;
    };

    // --- POPULARE HEADER/FOOTER CU DATE DIN JSON ---
    setText('brand', data.site.brand || 'VetMobil');
    setText('brandFooter', data.site.brand || 'VetMobil');

    // Telefon
    const phone = data.site.phone || '+40 754 099 723';
    setText('phone', phone);
    setHref('phone', 'tel:' + phone.replace(/\s+/g, ''));
    setHref('whatsapp', 'https://wa.me/' + (data.site.whatsapp || '40754099723'));

    // Email
    setText('email', data.site.email || 'programari@vetmobil.ro');
    setHref('email', 'mailto:' + (data.site.email || 'programari@vetmobil.ro'));

    // Alte date
    setText('hours', data.site.hours || 'Luni–Duminică, 09:00–21:00');
    setText('coverage', data.site.coverage || 'București & Ilfov');
    setText('payments', data.site.payments || 'Cash, card, transfer');

// --- GRID DE SERVICII PE CATEGORII ---
(data.services || []).forEach(svc => {
  const card = document.createElement('div');
  card.className = 'card';

  // Dicționar categorii (pentru a evita dublarea titlurilor)
  const categoryTitles = {
    "deplasare": "Deplasare",
    "consultatie": "Consultație generală",
    "vaccinare": "Vaccinare câine/pisică",
    "administrativ": "Administrativ / Documente",
    "medicale": "Servicii medicale",
    "investigatii": "Investigații",
    "eutanasie": "Eutanasiere & Incinerare"
  };

  // === DESCRIERE + BUTON pe același rând ===
  if (svc.description) {
    const descRow = document.createElement('div');
    descRow.className = 'card-desc-row';

    const desc = document.createElement('p');
    desc.textContent = svc.description;

    const btn = document.createElement('a');
    btn.className = 'cta small';
    btn.href = "#contact";
    btn.textContent = "Programează o vizită";
    btn.addEventListener('click', function (e) {
  if (gtag_report_conversion(this.href) === false) e.preventDefault();
});


    descRow.appendChild(desc);
    descRow.appendChild(btn);
    card.appendChild(descRow);
  }

  // Titlu card (numai dacă nu e identic cu cel al categoriei și nu e „Investigații”)
  if (svc.name !== categoryTitles[svc.category] && svc.category !== "investigatii") {
    const title = document.createElement('h4');
    title.textContent = svc.name;
    card.appendChild(title);
  }

  // Preț simplu
  if (svc.price) {
    const p = document.createElement('p');
    p.className = 'price';
    p.textContent = svc.price;
    card.appendChild(p);
  }

  // === OPTIONS -> TABEL ===
  if (Array.isArray(svc.options) && svc.options.length > 0) {
    card.classList.add('has-table');
    const table = document.createElement('table');
    table.classList.add('price-table');

    const thead = document.createElement('thead');
    const tbody = document.createElement('tbody');

    const allHave = (keys) => svc.options.every(o => o && keys.every(k => k in o));
    const isWeightSchema = allHave(['weight', 'euthanasia', 'incineration']);
    const isNameList = svc.options.every(o => o && ('name' in o));

    if (isWeightSchema) {
      table.classList.add('price-table-3col');
      const trHead = document.createElement('tr');
      ['Greutate', 'Preț eutanasiere', 'Preț incinerare'].forEach(h => {
        const th = document.createElement('th');
        th.textContent = h;
        trHead.appendChild(th);
      });
      thead.appendChild(trHead);

      svc.options.forEach(opt => {
        const tr = document.createElement('tr');
        tr.innerHTML = `<td>${opt.weight}</td><td>${opt.euthanasia}</td><td>${opt.incineration}</td>`;
        tbody.appendChild(tr);
      });

    } else if (isNameList) {
      table.classList.add('price-table-2col');
      const trHead = document.createElement('tr');
      const headers = (Array.isArray(svc.columns) && svc.columns.length === 2)
        ? svc.columns
        : ['Serviciu', 'Preț'];
      headers.forEach(h => {
        const th = document.createElement('th');
        th.textContent = h;
        trHead.appendChild(th);
      });
      thead.appendChild(trHead);

      svc.options.forEach(opt => {
        const tr = document.createElement('tr');
        tr.innerHTML = `<td>${opt.name || ''}</td><td>${opt.price || 'la cerere'}</td>`;
        tbody.appendChild(tr);
      });
    }

    table.appendChild(thead);
    table.appendChild(tbody);
    card.appendChild(table);
  }

  // Note
  if (Array.isArray(svc.notes)) {
    const ul = document.createElement('ul');
    ul.className = 'card-notes';
    svc.notes.forEach(t => {
      const li = document.createElement('li');
      li.textContent = t;
      ul.appendChild(li);
    });
    card.appendChild(ul);
  }

  // === AȘEZARE ÎN CATEGORIA CORECTĂ ===
  const targetGrid = document.getElementById(svc.category);
  if (targetGrid) {
    targetGrid.appendChild(card);
  } else {
    console.warn("Categorie necunoscută pentru serviciu:", svc.name, svc.category);
  }
}); // <-- închide forEach

  } catch (e) {
    console.error(e);
  }
} // <-- închide funcția load

// Rulează funcția de încărcare servicii
load();
// === LOAD ARTICLES FROM FOLDER ===
async function loadArticles() {
  try {
    const container = document.getElementById('articles');
    if (!container) return;

    // Folosim PHP ca să obținem lista de fișiere JSON
    const res = await fetch('data/articles/index.php', { cache: 'no-store' });
    const files = await res.json();

    for (const file of files) {
      const articleRes = await fetch('data/articles/' + file, { cache: 'no-store' });
      const article = await articleRes.json();

      const card = document.createElement('div');
      card.className = 'card';

// Imaginea articolului
if (article.image) {
  const img = document.createElement('img');
  img.src = normalizeImage(article.image);
  img.alt = article.title || '';
  img.loading = 'lazy';
  img.style.maxWidth = "100%";
  img.style.borderRadius = "12px";
  card.appendChild(img);
}


    // Titlul
    const h4 = document.createElement('h4');
    const link = document.createElement('a');
    link.href = "articol.html?file=" + encodeURIComponent(file);
    link.textContent = article.title;
    h4.appendChild(link);
    card.appendChild(h4);

    // Data
    if (article.date) {
      const dateEl = document.createElement('p');
      dateEl.className = 'article-date';
      dateEl.textContent = new Date(article.date).toLocaleDateString('ro-RO', {
        day: 'numeric', month: 'long', year: 'numeric'
      });
      card.appendChild(dateEl);
    }

    // Descriere
    if (article.description) {
      const desc = document.createElement('p');
      desc.textContent = article.description;
      card.appendChild(desc);
    }

    // Buton
    const btn = document.createElement('a');
    btn.className = 'cta';
    btn.href = "articol.html?file=" + encodeURIComponent(file);
    btn.textContent = "Citește mai mult";
    card.appendChild(btn);


      container.appendChild(card);
    }
  } catch (err) {
    console.error("Eroare la încărcarea articolelor:", err);
  }
}

if (document.body.classList.contains('articole-page')) {
  loadArticles();
}
// === LOAD SINGLE ARTICLE ===
async function loadSingleArticle() {
  try {
    if (!document.body.classList.contains('articol-page')) return;

    // Citim parametru din URL: ?file=articol.json
    const params = new URLSearchParams(window.location.search);
    const file = params.get('file');
    if (!file) return;

    const res = await fetch('data/articles/' + file, { cache: 'no-store' });
    const article = await res.json();

    // Titlu
    document.title = article.title + " – VetMobil";
    document.getElementById('articleTitle').textContent = article.title;
    document.getElementById('articleTitleMain').textContent = article.title;

    // Dată
    if (article.date) {
      document.getElementById('articleDate').textContent =
        new Date(article.date).toLocaleDateString('ro-RO', {
          day: 'numeric', month: 'long', year: 'numeric'
        });
    }

// Imagine
if (article.image) {
  const img = document.getElementById('articleImage');
  const src = normalizeImage(article.image);
  if (src) {
    img.src = src;
    img.alt = article.title || '';
    img.style.display = 'block';
  } else {
    img.remove();
  }
}



    // Conținut
    if (article.content) {
      document.getElementById('articleContent').innerHTML = marked.parse(article.content);
    }
  } catch (err) {
    console.error("Eroare articol:", err);
  }
}
loadSingleArticle();
// ============== VM: TRACK VIEWS AUTOMAT ==============
// Regula canonică de slug pentru meta: "/" -> "_" , păstrăm ".html" dacă există
function vmMetaSlugFromUrl(urlOrPath) {
  var p;
  try {
    var u = new URL(urlOrPath || location.pathname, location.origin);
    p = u.pathname;
  } catch (e) {
    p = String(urlOrPath || location.pathname);
  }
  p = p.replace(/^\/+|\/+$/g, ''); // fără / la capete
  if (!p) p = 'home';
  return p.replace(/[\/\\]/g, '_'); // "/" -> "_"
}

// ID client (anti-spam light)
function vmGetClientId(){
  var k='vm_client_id';
  var id=localStorage.getItem(k);
  if(!id){
    id=(crypto && crypto.randomUUID ? crypto.randomUUID() : (Date.now()+"-"+Math.random()));
    localStorage.setItem(k,id);
  }
  return id;
}

// Trimite +1 view (max o dată / 12h)
function vmTrackViewOncePer12h(slug){
  var key  = 'vm_view_'+slug;
  var last = Number(localStorage.getItem(key) || 0);
  var now  = Date.now();
  if(now - last <= 12*60*60*1000) return; // în ultimele 12h am contorizat deja

  fetch('/cms-api/track_view.php', {
    method:'POST',
    headers:{'Content-Type':'application/json'},
    body: JSON.stringify({ slug: slug, clientId: vmGetClientId() })
  }).finally(function(){
    localStorage.setItem(key, String(now));
  });
}

// La încărcarea paginii: considerăm ARTICOL orice .html care nu e pagină de bază
(function(){
  var curPath;
  try { curPath = (new URL(location.href)).pathname.replace(/^\/+|\/+$/g,''); }
  catch(e){ curPath = String(location.pathname || '').replace(/^\/+|\/+$/g,''); }

  if(!curPath) return;                     // ex: homepage
  if(!/\.html?$/i.test(curPath)) return;   // doar .html/.htm

  // Excludem paginile de bază (completează lista după nevoi)
  var EXCLUDE = new Set([
    'index.html', 'articole.html', 'servicii.html',
    'contact.html', 'faq.html', 'privacy.html', 'terms.html'
  ]);
  if (EXCLUDE.has(curPath.toLowerCase())) return;

  // Dacă a trecut de filtre => contorizăm vizita ca ARTICOL
  var slug = vmMetaSlugFromUrl('/' + curPath); // păstrăm .html
  vmTrackViewOncePer12h(slug);
})();
// ============== VM: META pe pagina "articole.html" (liste) ==============
(function(){
  // Rulează doar pe pagina publică articole.html
  var isListaArticole = document.body.classList.contains('articole-page');
  if(!isListaArticole) return;

  // Folosim helperii EXISTENȚI din fișier:
  // - vmMetaSlugFromUrl(urlOrPath)
  // - vmGetClientId()

  function vmListSendVote(slug, vote){
    return fetch('/cms-api/vote.php', {
      method:'POST',
      headers:{'Content-Type':'application/json'},
      body: JSON.stringify({ slug: slug, vote: vote, clientId: vmGetClientId() })
    }).then(function(r){ return r.json(); });
  }

  function vmListAttachMetaToCards(){
    var root = document.getElementById('articles');
    if(!root) return;

    var cards = Array.from(root.querySelectorAll('.card'));
    if(!cards.length) return;

    // 1) setăm data-slug + injectăm UI dacă lipsește (o singură dată / card)
    cards.forEach(function(card){
      if(card.dataset.vmMetaInit === '1') return;

      // link către articol (la tine e "articol.html?file=...") → păstrăm doar .pathname
      var linkEl = card.querySelector('h4 a[href], a.cta[href], a[href$=".html"]');
      if(!linkEl) return;
      var href = linkEl.getAttribute('href');
      var url;
      try { url = new URL(href, location.origin); }
      catch(e){ url = { pathname: href }; }

      var slug = vmMetaSlugFromUrl(url.pathname); // ignoră query, păstrează .html
      card.dataset.slug = slug;

      // UI meta (👍 👎 · vizualizări)
      if(!card.querySelector('.article-meta')){
        var meta = document.createElement('div');
        meta.className = 'article-meta';
        meta.style.cssText = 'display:flex;gap:12px;align-items:center;margin-top:8px;';
        meta.innerHTML =
          '<button class="btn-up" type="button">👍 <span class="up">0</span></button>' +
          '<button class="btn-down" type="button" style="margin-left:8px;">👎 <span class="down">0</span></button>' +
          '<span style="margin:0 8px;">·</span>' +
          '<span class="views"><span class="v">0</span> vizualizări</span>';
        card.appendChild(meta);
      }

      // Vote handlers (o singură dată)
      var upBtn   = card.querySelector('.btn-up');
      var downBtn = card.querySelector('.btn-down');
      var upEl    = card.querySelector('.up');
      var downEl  = card.querySelector('.down');

      if(upBtn && !upBtn.dataset.bound){
        upBtn.dataset.bound = '1';
        upBtn.addEventListener('click', function(){
          vmListSendVote(slug, 'up').then(function(m){
            if(upEl)   upEl.textContent   = m.up   || 0;
            if(downEl) downEl.textContent = m.down || 0;
          }).catch(function(){});
        });
      }
      if(downBtn && !downBtn.dataset.bound){
        downBtn.dataset.bound = '1';
        downBtn.addEventListener('click', function(){
          vmListSendVote(slug, 'down').then(function(m){
            if(upEl)   upEl.textContent   = m.up   || 0;
            if(downEl) downEl.textContent = m.down || 0;
          }).catch(function(){});
        });
      }

      card.dataset.vmMetaInit = '1';
    });

    // 2) populăm cifrele din backend
    fetch('/cms-api/meta_list.php', {cache:'no-store'})
      .then(function(r){ return r.json(); })
      .then(function(list){
        var map = {};
        (list||[]).forEach(function(m){ map[m.slug] = m; });
        cards.forEach(function(card){
          var slug = card.dataset.slug;
          if(!slug) return;
          var m = map[slug] || {views:0, up:0, down:0};
          var upEl   = card.querySelector('.up');
          var downEl = card.querySelector('.down');
          var vEl    = card.querySelector('.v');
          if(upEl)   upEl.textContent   = m.up   || 0;
          if(downEl) downEl.textContent = m.down || 0;
          if(vEl)    vEl.textContent    = m.views|| 0;
        });
      }).catch(function(){});
  }

  // Rulăm după ce #articles a fost populat de loadArticles()
  function vmListInitMeta(){
    vmListAttachMetaToCards();
    var root = document.getElementById('articles');
    if(!root) return;

    // Dacă se adaugă carduri ulterior, reatașăm meta (evităm duplicate cu vmMetaInit)
    var mo = new MutationObserver(function(){
      vmListAttachMetaToCards();
    });
    mo.observe(root, { childList:true, subtree:true });
  }

  if(document.readyState === 'loading'){
    document.addEventListener('DOMContentLoaded', vmListInitMeta);
  }else{
    vmListInitMeta();
  }
})();

