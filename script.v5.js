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

// La încărcarea paginii: vedem dacă pagina curentă este un ARTICOL
(function(){
  // Încarcă lista de articole
  fetch('/data/articles/index.json', { cache:'no-store' })
    .then(function(r){ return r.json(); })
    .then(function(j){
      var arr = Array.isArray(j && j.articles) ? j.articles : (Array.isArray(j) ? j : []);
      if(!arr.length) return;

      var cur = location.pathname;
      // normalizăm pentru comparație: fără query/hash
      try { cur = new URL(location.href).pathname; } catch(e){}
      // Caută articolul din listă care are link == URL curent (ca path)
      var isArticle = arr.some(function(a){
        if(!a || !a.link) return false;
        try {
          var u = new URL(a.link, location.origin);
          return u.pathname === cur;
        } catch(e){
          // dacă link-ul e relativ simplu
          return a.link === cur || ("/"+a.link.replace(/^\/+/,'')) === cur;
        }
      });

      if(isArticle){
        var slug = vmMetaSlugFromUrl(cur);
        vmTrackViewOncePer12h(slug);
      }
    })
    .catch(function(){ /* dacă nu putem citi index.json, nu contorizăm */ });
})();
