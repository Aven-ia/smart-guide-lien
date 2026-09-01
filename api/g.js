// Smart Guide — page publique d'un livret d'accueil.
//
// RÈGLE À NE PAS DÉFAIRE : ce fichier n'est pas un moteur de rendu.
// Le livret a déjà son rendu, dans `livretHTML` de l'application. Deux moteurs
// divergent toujours, et c'est le voyageur qui voit la différence. Ce qui est
// rendu ici est le strict nécessaire au partage : les balises Open Graph, qui
// doivent être dans le HTML servi parce que WhatsApp ne lit pas le JavaScript,
// et un aperçu lisible du logement. Le rendu complet viendra du moteur de
// l'application, jamais d'une deuxième implémentation écrite ici.
//
// Les champs viennent de `livret_public(slug)`, fonction Postgres en security
// definer, avec une LISTE D'INCLUSION de 32 champs. Jamais une liste
// d'exclusion : un champ oublié dans une liste d'exclusions devient public en
// silence. `notes`, `audit`, `geo`, `tone` et les champs techniques ne sortent pas.

const SUPABASE = 'https://hpmthjaebbgmbljoyfgx.supabase.co';
// Clé publiable : déjà publique, elle est dans le HTML de l'application.
// Elle ne donne accès qu'à ce que la RLS et les fonctions autorisent.
const CLE = 'sb_publishable_aW94eKqMkZF548HHwrhonw_Hrtq_n2j';

const echapper = (s) =>
  String(s == null ? '' : s).replace(/[&<>"']/g, (c) =>
    ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

// Le slug est figé à la première publication : un lien envoyé est une promesse,
// et renommer un logement ne casse pas la promesse.
function lireChemin(url) {
  const brut = String(url || '/').split('?')[0];
  const chemin = decodeURIComponent(brut).replace(/^\/+|\/+$/g, '');
  if (!chemin) return { slug: null, image: false };
  if (/\/apercu\.jpg$/i.test(chemin)) {
    return { slug: chemin.replace(/\/apercu\.jpg$/i, ''), image: true };
  }
  return { slug: chemin, image: false };
}

async function lireLivret(slug) {
  if (!slug || slug.length > 120 || !/^[a-z0-9à-ÿ/-]+$/i.test(slug)) return null;
  const r = await fetch(`${SUPABASE}/rest/v1/rpc/livret_public`, {
    method: 'POST',
    headers: { apikey: CLE, Authorization: `Bearer ${CLE}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ p_slug: slug }),
  });
  if (!r.ok) return null;
  const d = await r.json();
  return d && typeof d === 'object' ? d : null;
}

// L'encre se dérive du fond, elle ne se choisit pas : c'est la règle du livret.
function encreLisible(fond) {
  const m = String(fond || '').match(/^#?([0-9a-f]{6})$/i);
  if (!m) return '#23261F';
  const n = parseInt(m[1], 16);
  const c = [(n >> 16) & 255, (n >> 8) & 255, n & 255].map((v) => {
    v /= 255;
    return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4);
  });
  const L = 0.2126 * c[0] + 0.7152 * c[1] + 0.0722 * c[2];
  return (L + 0.05) / 0.05 > 1.05 / (L + 0.05) ? '#1A1D17' : '#FFFFFF';
}

/* « VOTRE SÉJOUR À LE HAVRE » : un lien envoyé à un voyageur se lit, et cette
   faute-là se voit. Les villes à article défini contractent la préposition —
   « au Havre », « au Mans », « aux Sables », « à la Rochelle ». Le nom garde sa
   majuscule d'origine partout ailleurs ; on ne touche qu'à l'article de tête. */
function aVille(ville) {
  const v = String(ville || '').trim();
  if (!v) return '';
  // « les » AVANT « le » : l'alternance est ordonnée, et « Les Sables » attrapé
  // par « le » donnait « au s Sables ». Vérifié sur la liste, pas déduit.
  const m = v.match(/^(les|le)\s+(.+)$/i);
  if (!m) return ' à ' + v;                     // « à Paris », et « à La Rochelle »,
  // « à L’Isle-Adam » : l'article féminin ne se contracte pas et garde sa
  // majuscule — il fait partie du nom propre.
  return (m[1].toLowerCase() === 'les' ? ' aux ' : ' au ') + m[2];
}
/* « GARDER HORS LIGNE » : le voyageur n'a pas toujours de réseau en arrivant —
   c'est même le moment où il en a le moins, et précisément celui où il cherche
   le code de la porte. Le bouton enregistre la page qu'il a sous les yeux.
   La photo est la SEULE ressource distante de cette page : elle est incorporée
   en data: URI dans la copie, sinon le fichier « hors ligne » afficherait un
   cadre vide au premier passage sans réseau — c'est-à-dire toujours.
   Si l'incorporation échoue, on enregistre quand même : un livret sans sa
   photo reste un livret, un livret absent n'est rien. */
const BOUTON_HORS_LIGNE = `<div class="hl">
  <button type="button" id="hl-btn">Garder hors ligne</button>
  <p>Enregistre ce livret sur votre appareil. Il s’ouvrira sans connexion.</p>
</div>
<script>
(function(){
  var b=document.getElementById('hl-btn');
  if(!b || !window.Blob || !URL.createObjectURL){ if(b) b.parentNode.style.display='none'; return; }
  b.addEventListener('click', function(){
    var initial=b.textContent;
    b.disabled=true; b.textContent='Enregistrement…';
    var img=document.querySelector('img.photo');
    var pret = (img && img.src && img.src.indexOf('data:')!==0)
      ? fetch(img.src).then(function(r){ return r.blob(); }).then(function(bl){
          return new Promise(function(ok){ var f=new FileReader(); f.onload=function(){ ok(f.result); }; f.onerror=function(){ ok(null); }; f.readAsDataURL(bl); });
        }).catch(function(){ return null; })
      : Promise.resolve(null);
    pret.then(function(donnees){
      var copie=document.documentElement.cloneNode(true);
      var zone=copie.querySelector('.hl'); if(zone) zone.remove();
      copie.querySelectorAll('script').forEach(function(s){ s.remove(); });
      var ci=copie.querySelector('img.photo');
      if(ci){ if(donnees) ci.setAttribute('src', donnees); else ci.remove(); }
      var html='<!doctype html>\\n'+copie.outerHTML;
      var nom=(document.title||'Livret').replace(/[\\\\/:*?"<>|]/g,'-').slice(0,80)+'.html';
      var a=document.createElement('a');
      a.href=URL.createObjectURL(new Blob([html],{type:'text/html;charset=utf-8'}));
      a.download=nom; document.body.appendChild(a); a.click();
      setTimeout(function(){ URL.revokeObjectURL(a.href); a.remove(); }, 4000);
      b.disabled=false; b.textContent=initial;
    });
  });
})();
<\/script>`;

function coquille({ titre, description, url, image, corps, fond, encre, horsLigne }) {
  return `<!doctype html>
<html lang="fr">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${echapper(titre)}</title>
<meta name="description" content="${echapper(description)}">
<meta property="og:type" content="website">
<meta property="og:site_name" content="Smart Guide">
<meta property="og:locale" content="fr_FR">
<meta property="og:title" content="${echapper(titre)}">
<meta property="og:description" content="${echapper(description)}">
<meta property="og:url" content="${echapper(url)}">
${image ? `<meta property="og:image" content="${echapper(image)}">
<meta property="og:image:alt" content="${echapper(titre)}">` : ''}
<meta name="twitter:card" content="${image ? 'summary_large_image' : 'summary'}">
<link rel="canonical" href="${echapper(url)}">
<style>
  :root{--fond:${fond || '#F6F4EF'};--encre:${encre || '#23261F'}}
  *{margin:0;padding:0;box-sizing:border-box}
  body{background:var(--fond);color:var(--encre);
       font:16px/1.6 -apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;
       min-height:100vh;padding:26px 20px 40px}
  .page{max-width:560px;margin:0 auto}
  .sur{font-size:11px;letter-spacing:.15em;text-transform:uppercase;opacity:.62}
  h1{font-size:30px;line-height:1.18;margin:8px 0 6px;font-weight:600;letter-spacing:-.01em}
  .lieu{font-size:15px;opacity:.66}
  .photo{width:100%;border-radius:14px;margin:22px 0 4px;display:block}
  .mot{margin-top:22px;font-size:16px;line-height:1.65}
  section{margin-top:26px}
  h2{font-size:11px;letter-spacing:.15em;text-transform:uppercase;opacity:.55;
     margin-bottom:9px;font-weight:600}
  .bloc{border-radius:11px;padding:14px 16px;margin-bottom:9px}
  .lig{display:flex;justify-content:space-between;gap:14px;align-items:baseline}
  .lig+.lig{margin-top:9px}
  .cle{font-size:12px;opacity:.72}
  .val{font-size:16px;font-weight:600}
  ul{list-style:none}
  li{padding-left:16px;position:relative;margin-bottom:5px;font-size:15px}
  li:before{content:'—';position:absolute;left:0;opacity:.55}
  .pied{margin-top:38px;padding-top:18px;font-size:11px;letter-spacing:.1em;
        text-transform:uppercase;opacity:.5;text-align:center}
  .note{margin-top:24px;font-size:13px;opacity:.66;line-height:1.55}
  .hl{margin-top:34px;text-align:center}
  .hl button{font:inherit;font-size:13px;color:inherit;background:transparent;cursor:pointer;
    border:1px solid currentColor;border-radius:9px;padding:9px 15px;opacity:.62}
  .hl button:hover{opacity:1}
  .hl p{font-size:12px;opacity:.5;margin-top:7px;line-height:1.5}
</style>
</head>
<body><div class="page">${corps}
${horsLigne ? BOUTON_HORS_LIGNE : ''}
<p class="pied">Smart Guide · Aven IA</p>
</div></body>
</html>`;
}

function bloc(fondBloc, encreBloc, contenu) {
  return `<div class="bloc" style="background:${fondBloc};color:${encreBloc}">${contenu}</div>`;
}

function corpsLivret(l, urlImage) {
  const fondBloc = /^#[0-9a-f]{6}$/i.test(l.couleurBlocs || '') ? l.couleurBlocs : '#FFFFFF';
  const encreBloc = encreLisible(fondBloc);
  const p = [];

  p.push(`<p class="sur">${echapper((l.contacts && l.contacts.hote) || 'Livret d’accueil')}</p>`);
  p.push(`<h1>${echapper(l.nom || 'Votre logement')}</h1>`);

  const lieu = [l.adresse, [l.codePostal, l.ville].filter(Boolean).join(' ')]
    .filter(Boolean).join(', ');
  if (lieu) p.push(`<p class="lieu">${echapper(lieu)}${l.etage ? ' · ' + echapper(l.etage) : ''}</p>`);
  if (urlImage) p.push(`<img class="photo" src="${echapper(urlImage)}" alt="">`);

  const mot = l.bienvenue || l.accroche;
  if (mot) p.push(`<p class="mot">${echapper(mot)}</p>`);

  const a = l.arrivee || {}, d = l.depart || {};
  if (a.heure || d.heure) {
    p.push(`<section><h2>Horaires</h2>${bloc(fondBloc, encreBloc,
      `<div class="lig"><span class="cle">Arrivée à partir de</span><span class="val">${echapper(a.heure || '—')}</span></div>
       <div class="lig"><span class="cle">Départ avant</span><span class="val">${echapper(d.heure || '—')}</span></div>`)}</section>`);
  }

  const w = l.wifi || {};
  if (w.ssid) {
    p.push(`<section><h2>Wifi</h2>${bloc(fondBloc, encreBloc,
      `<div class="lig"><span class="cle">Réseau</span><span class="val">${echapper(w.ssid)}</span></div>
       ${w.mdp ? `<div class="lig"><span class="cle">Mot de passe</span><span class="val">${echapper(w.mdp)}</span></div>` : ''}`)}</section>`);
  }

  if (Array.isArray(l.reglement) && l.reglement.length) {
    p.push(`<section><h2>Règlement</h2>${bloc(fondBloc, encreBloc,
      '<ul>' + l.reglement.slice(0, 8).map((r) =>
        `<li>${echapper(typeof r === 'string' ? r : r && r.texte)}</li>`).join('') + '</ul>')}</section>`);
  }

  const c = l.contacts || {};
  if (c.hote || c.tel || c.email) {
    p.push(`<section><h2>Nous contacter</h2>${bloc(fondBloc, encreBloc,
      `${c.hote ? `<div class="val">${echapper(c.hote)}</div>` : ''}
       ${c.tel ? `<div class="lig"><span class="cle">Téléphone</span><span class="val">${echapper(c.tel)}</span></div>` : ''}
       ${c.email ? `<div class="lig"><span class="cle">Email</span><span class="val">${echapper(c.email)}</span></div>` : ''}`)}</section>`);
  }

  const n = Array.isArray(l.recos) ? l.recos.length : 0;
  const e = Array.isArray(l.equipements) ? l.equipements.length : 0;
  p.push(`<p class="note"><strong>Temps 2 — les données réelles.</strong> Cette page lit
  le livret publié par <code>livret_public(slug)</code>. Le rendu complet viendra du
  moteur de l’application, jamais d’une deuxième implémentation.
  ${n ? `Ce livret contient ${n} recommandation${n > 1 ? 's' : ''}` : ''}${n && e ? ' et ' : ''}${e ? `${e} équipement${e > 1 ? 's' : ''}` : ''}${n || e ? ', pas encore affichés ici.' : ''}</p>`);

  return { corps: p.join('\n'), fondBloc };
}

module.exports = async (req, res) => {
  const hote = req.headers['x-forwarded-host'] || req.headers.host || 'guide.aven-ia.com';
  const { slug, image } = lireChemin(req.url);

  if (!slug) {
    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    res.setHeader('Cache-Control', 'public, max-age=300');
    return res.status(200).end(coquille({
      titre: 'Smart Guide — livrets d’accueil',
      description: 'Les livrets d’accueil Smart Guide, accessibles par un lien.',
      url: `https://${hote}/`,
      corps: `<p class="sur">Smart Guide</p><h1>Livrets d’accueil</h1>
      <p class="lieu">Chaque logement a son adresse.</p>`,
    }));
  }

  const l = await lireLivret(slug);

  // Un livret dépublié n'est pas une erreur technique : c'est une décision du gérant.
  if (!l) {
    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    res.setHeader('Cache-Control', 'no-store');
    res.setHeader('X-Robots-Tag', 'noindex');
    if (image) return res.status(404).end('');
    return res.status(404).end(coquille({
      titre: 'Ce livret n’est pas partagé',
      description: 'Ce lien ne mène à aucun livret publié.',
      url: `https://${hote}/${slug}`,
      corps: `<p class="sur">Smart Guide</p><h1>Ce livret n’est pas partagé</h1>
      <p class="lieu">Le lien est peut-être ancien, ou le logement a été dépublié.
      Demandez-en un nouveau à votre hôte.</p>`,
    }));
  }

  // L'aperçu : première photo du logement, décodée depuis le JSON.
  // Une data: URI ne peut pas servir d'og:image, il faut une vraie adresse.
  if (image) {
    const ph = Array.isArray(l.photos) ? l.photos[0] : null;
    const url = ph && (typeof ph === 'string' ? ph : ph.dataUrl);
    const m = String(url || '').match(/^data:(image\/[a-z+]+);base64,(.+)$/i);
    if (!m) return res.status(404).end('');
    const buf = Buffer.from(m[2], 'base64');
    res.setHeader('Content-Type', m[1]);
    res.setHeader('Cache-Control', 'public, max-age=3600');
    return res.status(200).end(buf);
  }

  const aUnePhoto = Array.isArray(l.photos) && l.photos.length > 0;
  /* UNE SEULE ADRESSE POUR LA PAGE, UNE SEULE POUR SON IMAGE. L'aperçu partait
     du chemin DEMANDÉ pendant que la page se déclarait canonique sur un autre :
     la page disait « mon adresse est X » et pointait son image vers Y. Rien
     n'était cassé — la fonction résout aussi les anciens slugs pour
     /apercu.jpg — mais ça faisait trois entrées de cache CDN pour une seule
     photo, et le jour où les anciennes adresses expireront, l'aperçu casserait
     sur les liens déjà partagés pendant que la page, elle, répondrait encore. */
  const slugCanon = l.slugCanonique || slug;
  const urlImage = aUnePhoto ? `https://${hote}/${slugCanon}/apercu.jpg` : null;
  const fond = /^#[0-9a-f]{6}$/i.test(l.couleurFond || '') ? l.couleurFond : '#F6F4EF';
  const { corps } = corpsLivret(l, urlImage);
  const hote_ = (l.contacts && l.contacts.hote) || 'votre hôte';

  res.setHeader('Content-Type', 'text/html; charset=utf-8');
  res.setHeader('Cache-Control', 'public, max-age=120');
  // Le livret porte le nom, l'adresse et le téléphone du gérant : il est partagé,
  // il n'est pas publié au monde. Pas d'indexation tant que le gérant ne l'a pas
  // explicitement demandé.
  res.setHeader('X-Robots-Tag', 'noindex, nofollow');
  res.status(200).end(coquille({
    titre: `${l.nom || 'Votre logement'} — Livret d’accueil`,
    description: `Tout ce qu’il faut savoir pour votre séjour${aVille(l.ville)}, par ${hote_}.`,
    // L'ADRESSE CANONIQUE EST LA NOUVELLE, PAS CELLE QUI A ÉTÉ DEMANDÉE.
    // Le voyageur reste sur SON lien — pas de redirection, sa promesse tient —
    // mais ce que la page déclare d'elle-même, aux robots comme aux aperçus de
    // messagerie, c'est l'adresse courante. Sans ça, chaque ancienne adresse se
    // présente comme une page distincte, et un aperçu WhatsApp figé sur une
    // adresse abandonnée survit à toutes les corrections du gérant.
    url: `https://${hote}/${slugCanon}`,
    image: urlImage,
    fond, encre: encreLisible(fond), corps, horsLigne: true,
  }));
};
