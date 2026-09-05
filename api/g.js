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

/* UNE ADRESSE PAR LANGUE. L'adresse française est le chemin nu — elle a déjà
   été envoyée à des voyageurs, elle ne bouge pas. Les autres langues sont un
   suffixe de deux lettres : /tilit-conciergerie/perret/zh.
   « fr » N'EST PAS DANS CETTE LISTE, exprès : sans quoi la même page aurait
   deux adresses, et deux adresses pour une page, c'est deux aperçus WhatsApp,
   deux entrées de cache et une page canonique à choisir.
   Elle doit rester le miroir de LANGS dans l'application. */
const LANGUES = {
  en: 'en_GB', es: 'es_ES', de: 'de_DE', it: 'it_IT', pt: 'pt_PT', nl: 'nl_NL',
  pl: 'pl_PL', ru: 'ru_RU', uk: 'uk_UA', tr: 'tr_TR', zh: 'zh_CN', ja: 'ja_JP',
  ko: 'ko_KR', ar: 'ar_AR', he: 'he_IL',
};
const RTL = { ar: 1, he: 1 };

/* CE QUE LE VOYAGEUR LIT AVANT MÊME D'OUVRIR LE LIEN. Le titre et la
   description sont l'aperçu que WhatsApp affiche dans la conversation : les
   servir en français sur une adresse chinoise viderait l'adresse chinoise de
   son sens. `hors` et `absent` sont les seuls textes que cette page écrit
   elle-même dans la page ; tout le reste vient du rendu de l'application. */
const T = {
  fr: { livret:"Livret d’accueil", hote:'votre hôte',
        avec:'Tout ce qu’il faut savoir pour votre séjour{ville}, par {hote}.',
        sans:'Tout ce qu’il faut savoir pour votre séjour, par {hote}.',
        hors:'Garder hors ligne', horsNote:'Enregistre ce livret sur votre appareil. Il s’ouvrira sans connexion.', horsCours:'Enregistrement…',
        absentT:'Ce livret n’est pas partagé',
        absentP:'Le lien est peut-être ancien, ou le logement a été dépublié. Demandez-en un nouveau à votre hôte.' },
  en: { livret:'Welcome book', hote:'your host',
        avec:'Everything you need for your stay in {ville}, from {hote}.',
        sans:'Everything you need for your stay, from {hote}.',
        hors:'Keep offline', horsNote:'Saves this booklet on your device. It will open without a connection.', horsCours:'Saving…',
        absentT:'This booklet is not shared',
        absentP:'The link may be old, or the property is no longer published. Ask your host for a new one.' },
  es: { livret:'Guía de bienvenida', hote:'su anfitrión',
        avec:'Todo lo que necesita para su estancia en {ville}, de parte de {hote}.',
        sans:'Todo lo que necesita para su estancia, de parte de {hote}.',
        hors:'Guardar sin conexión', horsNote:'Guarda esta guía en su dispositivo. Se abrirá sin conexión.', horsCours:'Guardando…',
        absentT:'Esta guía no está compartida',
        absentP:'El enlace puede ser antiguo o el alojamiento ya no está publicado. Pida uno nuevo a su anfitrión.' },
  de: { livret:'Willkommensmappe', hote:'Ihrem Gastgeber',
        avec:'Alles Wichtige für Ihren Aufenthalt in {ville}, von {hote}.',
        sans:'Alles Wichtige für Ihren Aufenthalt, von {hote}.',
        hors:'Offline behalten', horsNote:'Speichert diese Mappe auf Ihrem Gerät. Sie öffnet sich auch ohne Verbindung.', horsCours:'Wird gespeichert…',
        absentT:'Diese Mappe wird nicht geteilt',
        absentP:'Der Link ist möglicherweise veraltet oder die Unterkunft ist nicht mehr veröffentlicht. Bitten Sie Ihren Gastgeber um einen neuen.' },
  it: { livret:'Guida di benvenuto', hote:'il tuo host',
        avec:'Tutto quello che serve per il vostro soggiorno a {ville}, da {hote}.',
        sans:'Tutto quello che serve per il vostro soggiorno, da {hote}.',
        hors:'Tieni offline', horsNote:'Salva questa guida sul tuo dispositivo. Si aprirà senza connessione.', horsCours:'Salvataggio…',
        absentT:'Questa guida non è condivisa',
        absentP:'Il link potrebbe essere vecchio o l’alloggio non è più pubblicato. Chiedine uno nuovo al tuo host.' },
  pt: { livret:'Guia de boas-vindas', hote:'o seu anfitrião',
        avec:'Tudo o que precisa para a sua estadia em {ville}, por {hote}.',
        sans:'Tudo o que precisa para a sua estadia, por {hote}.',
        hors:'Guardar offline', horsNote:'Guarda este guia no seu dispositivo. Abrirá sem ligação.', horsCours:'A guardar…',
        absentT:'Este guia não está partilhado',
        absentP:'O link pode ser antigo ou o alojamento já não está publicado. Peça um novo ao seu anfitrião.' },
  nl: { livret:'Welkomstgids', hote:'uw gastheer',
        avec:'Alles wat u nodig hebt voor uw verblijf in {ville}, van {hote}.',
        sans:'Alles wat u nodig hebt voor uw verblijf, van {hote}.',
        hors:'Offline bewaren', horsNote:'Bewaart deze gids op uw apparaat. Hij opent zonder verbinding.', horsCours:'Opslaan…',
        absentT:'Deze gids wordt niet gedeeld',
        absentP:'De link is mogelijk verouderd of de accommodatie is niet meer gepubliceerd. Vraag uw gastheer om een nieuwe.' },
  pl: { livret:'Przewodnik powitalny', hote:'gospodarza',
        avec:'Wszystko, czego potrzebujesz na pobyt w {ville}, od {hote}.',
        sans:'Wszystko, czego potrzebujesz na pobyt, od {hote}.',
        hors:'Zachowaj offline', horsNote:'Zapisuje ten przewodnik na Twoim urządzeniu. Otworzy się bez połączenia.', horsCours:'Zapisywanie…',
        absentT:'Ten przewodnik nie jest udostępniony',
        absentP:'Link może być nieaktualny lub obiekt nie jest już opublikowany. Poproś gospodarza o nowy.' },
  ru: { livret:'Путеводитель для гостей', hote:'вашего хозяина',
        avec:'Всё, что нужно знать о вашем пребывании в {ville}, от {hote}.',
        sans:'Всё, что нужно знать о вашем пребывании, от {hote}.',
        hors:'Сохранить офлайн', horsNote:'Сохраняет этот путеводитель на ваше устройство. Он откроется без интернета.', horsCours:'Сохранение…',
        absentT:'Этот путеводитель не опубликован',
        absentP:'Возможно, ссылка устарела или жильё больше не опубликовано. Попросите у хозяина новую ссылку.' },
  uk: { livret:'Путівник для гостей', hote:'вашого господаря',
        avec:'Усе, що потрібно знати про ваше перебування в {ville}, від {hote}.',
        sans:'Усе, що потрібно знати про ваше перебування, від {hote}.',
        hors:'Зберегти офлайн', horsNote:'Зберігає цей путівник на вашому пристрої. Він відкриється без інтернету.', horsCours:'Збереження…',
        absentT:'Цей путівник не опубліковано',
        absentP:'Можливо, посилання застаріле або житло більше не опубліковане. Попросіть у господаря нове.' },
  tr: { livret:'Karşılama rehberi', hote:'ev sahibiniz',
        avec:'{ville} konaklamanız için bilmeniz gereken her şey — {hote}.',
        sans:'Konaklamanız için bilmeniz gereken her şey — {hote}.',
        hors:'Çevrimdışı sakla', horsNote:'Bu rehberi cihazınıza kaydeder. Bağlantı olmadan açılır.', horsCours:'Kaydediliyor…',
        absentT:'Bu rehber paylaşılmıyor',
        absentP:'Bağlantı eski olabilir veya konaklama artık yayında değil. Ev sahibinizden yenisini isteyin.' },
  zh: { livret:'入住指南', hote:'您的房东',
        avec:'您在{ville}住宿所需的全部信息，由{hote}提供。',
        sans:'您住宿所需的全部信息，由{hote}提供。',
        hors:'离线保存', horsNote:'将本指南保存到您的设备，无需联网即可打开。', horsCours:'保存中…',
        absentT:'该指南未共享',
        absentP:'链接可能已过期，或房源已取消发布。请向房东索取新链接。' },
  ja: { livret:'ご滞在ガイド', hote:'ホスト',
        avec:'{ville}でのご滞在に必要な情報のすべて。{hote}より。',
        sans:'ご滞在に必要な情報のすべて。{hote}より。',
        hors:'オフラインで保存', horsNote:'このガイドを端末に保存します。通信なしで開けます。', horsCours:'保存中…',
        absentT:'このガイドは共有されていません',
        absentP:'リンクが古いか、宿泊先の公開が終了しています。ホストに新しいリンクをお尋ねください。' },
  ko: { livret:'이용 안내서', hote:'호스트',
        avec:'{ville} 숙박에 필요한 모든 정보입니다. {hote} 드림.',
        sans:'숙박에 필요한 모든 정보입니다. {hote} 드림.',
        hors:'오프라인 저장', horsNote:'이 안내서를 기기에 저장합니다. 인터넷 없이 열 수 있습니다.', horsCours:'저장 중…',
        absentT:'이 안내서는 공유되지 않았습니다',
        absentP:'링크가 오래되었거나 숙소 공개가 종료되었습니다. 호스트에게 새 링크를 요청하세요.' },
  ar: { livret:'دليل الاستقبال', hote:'مضيفك',
        avec:'كل ما تحتاج معرفته عن إقامتك في {ville}، من {hote}.',
        sans:'كل ما تحتاج معرفته عن إقامتك، من {hote}.',
        hors:'الحفظ دون اتصال', horsNote:'يحفظ هذا الدليل على جهازك. سيُفتح دون اتصال بالإنترنت.', horsCours:'جارٍ الحفظ…',
        absentT:'هذا الدليل غير متاح',
        absentP:'قد يكون الرابط قديمًا أو لم يعد السكن منشورًا. اطلب رابطًا جديدًا من مضيفك.' },
  he: { livret:'מדריך אירוח', hote:'המארח',
        avec:'כל מה שצריך לדעת על השהות שלכם ב{ville}, מאת {hote}.',
        sans:'כל מה שצריך לדעת על השהות שלכם, מאת {hote}.',
        hors:'שמירה לא מקוונת', horsNote:'שומר את המדריך במכשיר שלכם. הוא ייפתח גם ללא חיבור.', horsCours:'שומר…',
        absentT:'המדריך הזה אינו משותף',
        absentP:'ייתכן שהקישור ישן, או שהנכס אינו מפורסם עוד. בקשו קישור חדש מהמארח.' },
};
const textes = (lang) => T[lang] || T.fr;

/* AUCUNE POLICE N'EST TÉLÉCHARGÉE. Une fonte chinoise pèse plusieurs
   mégaoctets, et le voyageur la paierait pour lire deux écrans. On nomme les
   polices SYSTÈME, déjà présentes : PingFang et Hiragino sur Apple, YaHei et
   Malgun sur Windows, Noto ailleurs. Le repli agit caractère par caractère. */
const REPLI_CJK = "'PingFang SC','Hiragino Sans','Hiragino Kaku Gothic ProN','Yu Gothic','Meiryo','Microsoft YaHei','Malgun Gothic','Apple SD Gothic Neo','Noto Sans CJK SC','Noto Sans SC','Noto Sans JP','Noto Sans KR'";
const REPLI_RTL = "'SF Arabic','Geeza Pro','Noto Sans Arabic','Noto Sans Hebrew','Tahoma','Arial'";

const echapper = (s) =>
  String(s == null ? '' : s).replace(/[&<>"']/g, (c) =>
    ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

// Le slug est figé à la première publication : un lien envoyé est une promesse,
// et renommer un logement ne casse pas la promesse.
function lireChemin(url) {
  const brut = String(url || '/').split('?')[0];
  let chemin = decodeURIComponent(brut).replace(/^\/+|\/+$/g, '');
  if (!chemin) return { slug: null, image: false, lang: null };
  const image = /\/apercu\.jpg$/i.test(chemin);
  if (image) chemin = chemin.replace(/\/apercu\.jpg$/i, '');
  /* La langue est un suffixe de deux lettres pris dans une LISTE FERMÉE. Un
     livret dont le nom finirait par ces deux lettres-là serait mal lu : c'est
     le seul cas, il est rattrapé côté requête — si le slug amputé ne répond
     pas, on redemande le chemin entier. Un lien envoyé est une promesse. */
  const m = chemin.match(/^(.+)\/([a-z]{2})$/i);
  const lang = m && LANGUES[m[2].toLowerCase()] ? m[2].toLowerCase() : null;
  /* L'IMAGE N'A PAS DE LANGUE : une seule adresse pour la photo, quelle que
     soit celle de la page. Sinon le CDN garderait la même image seize fois. */
  return { slug: lang ? m[1] : chemin, image, lang: image ? null : lang };
}

const slugValide = (slug) => !!slug && slug.length <= 120 && /^[a-z0-9à-ÿ/-]+$/i.test(slug);

async function rpc(nom, slug, lang) {
  if (!slugValide(slug)) return null;
  const r = await fetch(`${SUPABASE}/rest/v1/rpc/${nom}`, {
    method: 'POST',
    headers: { apikey: CLE, Authorization: `Bearer ${CLE}`, 'Content-Type': 'application/json' },
    body: JSON.stringify(lang ? { p_slug: slug, p_lang: lang } : { p_slug: slug }),
  });
  if (!r.ok) return null;
  return r.json();
}

/* La fonction rend le HTML de la langue demandée, et le français quand cette
   traduction n'existe pas — `renduLangue` dit lequel des deux est arrivé.
   Le repli n'est pas un détail : un lien chinois déjà envoyé doit continuer
   d'ouvrir un livret le jour où le gérant retire sa traduction chinoise. */
async function lireLivret(slug, lang) {
  const d = await rpc('livret_public', slug, lang);
  return d && typeof d === 'object' ? d : null;
}

/* LE HTML DE LA PAGE NE CONTIENT AUCUNE PHOTO, il n'a donc aucune raison de les
   rapatrier : la charge utile faisait 242 ko dont 96 % de photos pour produire
   6 ko de HTML. La page reçoit l'entête de la première photo — de quoi savoir
   qu'elle existe et y lire ses dimensions — et l'image entière ne se demande
   qu'ici, pour /apercu.jpg. La copie hors ligne du voyageur passe par cette
   même adresse, en requête distincte : elle n'a jamais tiré son image de la
   charge utile de la page. Vérifié avant de la retirer. */
async function lireApercu(slug) {
  const d = await rpc('livret_public_apercu', slug);
  return typeof d === 'string' ? d : null;
}

/* Les dimensions se lisent dans l'entête de l'image, sans la décoder ni la
   ré-encoder. On PARCOURT les segments au lieu de chercher les deux octets du
   marqueur : ces deux octets-là existent aussi au milieu des données, et une
   recherche naïve tomberait un jour sur l'un d'eux. Marqueur SOF mesuré à
   l'octet 157 à 159 sur les 30 photos de la base — 4 000 caractères de base64
   en couvrent largement le pire cas.
   Les clients d'aperçu s'en servent pour réserver la place avant de télécharger
   l'image ; sans elles, certains affichent une vignette carrée puis se ravisent. */
function dimensionsImage(entete) {
  const m = String(entete || '').match(/^data:image\/[a-z+]+;base64,(.*)$/i);
  if (!m) return null;
  let b = Buffer.from(m[1], 'base64');
  if (b.length < 24) return null;
  // PNG : IHDR, largeur et hauteur en big-endian aux octets 16 et 20
  if (b[0] === 0x89 && b[1] === 0x50) {
    return { l: b.readUInt32BE(16), h: b.readUInt32BE(20) };
  }
  if (b[0] !== 0xff || b[1] !== 0xd8) return null;      // pas un JPEG
  let i = 2;
  while (i + 9 < b.length) {
    if (b[i] !== 0xff) { i++; continue; }
    const marqueur = b[i + 1];
    if (marqueur === 0xff || marqueur === 0x01 || (marqueur >= 0xd0 && marqueur <= 0xd9)) { i += 2; continue; }
    const taille = b.readUInt16BE(i + 2);
    // SOF0..SOF15, sauf C4 (Huffman), C8 (extension JPEG) et CC (arithmétique)
    const estSOF = marqueur >= 0xc0 && marqueur <= 0xcf
      && marqueur !== 0xc4 && marqueur !== 0xc8 && marqueur !== 0xcc;
    if (estSOF) return { h: b.readUInt16BE(i + 5), l: b.readUInt16BE(i + 7) };
    if (taille < 2) return null;
    i += 2 + taille;
  }
  return null;                                          // entête tronquée : on n'annonce rien
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
const boutonHorsLigne = (t) => `<div class="hl">
  <button type="button" id="hl-btn">${echapper(t.hors)}</button>
  <p>${echapper(t.horsNote)}</p>
</div>
<script>
(function(){
  var b=document.getElementById('hl-btn');
  if(!b || !window.Blob || !URL.createObjectURL){ if(b) b.parentNode.style.display='none'; return; }
  b.addEventListener('click', function(){
    var initial=b.textContent;
    b.disabled=true; b.textContent=${JSON.stringify(t.horsCours)};
    /* ON INCORPORE TOUTE IMAGE DISTANTE, PAS « CELLE QUI PORTE LA CLASSE PHOTO ».
       Le corps de la page vient maintenant du moteur de l'application : ses
       classes ne sont pas les nôtres, et « img.photo » n'y existe plus. Un
       sélecteur qui nomme une classe est un pari sur un balisage qu'on
       n'écrit pas. Mesuré : le bouton n'incorporait plus rien du tout. */
    var distantes=[].slice.call(document.images).filter(function(i){
      return i.getAttribute('src') && i.src.indexOf('data:')!==0; });
    var pret = Promise.all(distantes.map(function(img){
      return fetch(img.src).then(function(r){ return r.blob(); }).then(function(bl){
        return new Promise(function(ok){ var f=new FileReader(); f.onload=function(){ ok(f.result); }; f.onerror=function(){ ok(null); }; f.readAsDataURL(bl); });
      }).catch(function(){ return null; });
    }));
    pret.then(function(donnees){
      var copie=document.documentElement.cloneNode(true);
      var zone=copie.querySelector('.hl'); if(zone) zone.remove();
      copie.querySelectorAll('script').forEach(function(s){ s.remove(); });
      var cibles=[].slice.call(copie.querySelectorAll('img')).filter(function(i){
        return i.getAttribute('src') && i.getAttribute('src').indexOf('data:')!==0; });
      cibles.forEach(function(ci,k){
        if(donnees[k]) ci.setAttribute('src', donnees[k]); else ci.remove();
      });
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

/* LA PAGE DÉCLARE SA LANGUE, ET SON SENS D'ÉCRITURE. Ce n'est pas de la
   cosmétique : `lang` choisit la coupure des mots, la police que le système
   substitue et la voix qui lit la page à haute voix ; `dir` retourne toute la
   mise en page pour l'arabe et l'hébreu, où l'écriture va de droite à gauche.
   Le rendu de l'application porte déjà les siens sur sa propre racine — les
   poser ici les étend à ce que cette page ajoute : le bouton hors ligne, le
   pied, et la page « livret non partagé ». */
function coquille({ titre, description, url, image, dim, corps, fond, encre, horsLigne, lang }) {
  const t = textes(lang);
  const code = LANGUES[lang] ? lang : 'fr';
  const sens = RTL[code] ? ' dir="rtl"' : '';
  return `<!doctype html>
<html lang="${code}"${sens}>
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${echapper(titre)}</title>
<meta name="description" content="${echapper(description)}">
<meta property="og:type" content="website">
<meta property="og:site_name" content="Smart Guide">
<meta property="og:locale" content="${LANGUES[code] || 'fr_FR'}">
<meta property="og:title" content="${echapper(titre)}">
<meta property="og:description" content="${echapper(description)}">
<meta property="og:url" content="${echapper(url)}">
${image ? `<meta property="og:image" content="${echapper(image)}">
<meta property="og:image:alt" content="${echapper(titre)}">` : ''}${image && dim ? `
<meta property="og:image:width" content="${dim.l}">
<meta property="og:image:height" content="${dim.h}">` : ''}
<meta name="twitter:card" content="${image ? 'summary_large_image' : 'summary'}">
<link rel="canonical" href="${echapper(url)}">
<style>
  :root{--fond:${fond || '#F6F4EF'};--encre:${encre || '#23261F'}}
  *{margin:0;padding:0;box-sizing:border-box}
  body{background:var(--fond);color:var(--encre);
       font:16px/1.6 -apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,${REPLI_CJK},${REPLI_RTL},sans-serif;
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
${horsLigne ? boutonHorsLigne(t) : ''}
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

  /* UNE NOTE DE DÉVELOPPEUR N'A RIEN À FAIRE SOUS LES YEUX D'UN VOYAGEUR.
     Il y avait ici un paragraphe intitulé « Temps 2 — les données réelles »,
     avec un nom de fonction Postgres dedans, qui annonçait aux clients de TILIT
     ce que la page ne savait pas encore afficher. Il a été servi en production.
     On ne le remplace par rien : une page qui ne montre pas encore tout n'a pas
     à s'en expliquer au voyageur. C'est à nous de le dire au gérant. */

  return { corps: p.join('\n'), fondBloc };
}

module.exports = async (req, res) => {
  const hote = req.headers['x-forwarded-host'] || req.headers.host || 'guide.aven-ia.com';
  let { slug, image, lang } = lireChemin(req.url);

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

  let l = await lireLivret(slug, lang);

  /* LE DERNIER SEGMENT N'ÉTAIT PEUT-ÊTRE PAS UNE LANGUE. Un livret nommé « ko »
     ou « it » donnerait un slug amputé qui ne répond pas — alors on redemande
     le chemin entier avant de conclure à l'absence. Une requête de plus, et
     seulement dans ce cas-là : un lien envoyé est une promesse, il vaut mieux
     la tenir un aller-retour plus tard que pas du tout. */
  if (!l && lang) {
    const entier = await lireLivret(`${slug}/${lang}`, null);
    if (entier) { l = entier; slug = `${slug}/${lang}`; lang = null; }
  }

  // Un livret dépublié n'est pas une erreur technique : c'est une décision du gérant.
  if (!l) {
    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    res.setHeader('Cache-Control', 'no-store');
    res.setHeader('X-Robots-Tag', 'noindex');
    if (image) return res.status(404).end('');
    /* La page « pas de livret ici » est dans la langue de l'adresse demandée :
       le voyageur qui a reçu un lien coréen ne lit pas forcément le français,
       et c'est précisément au moment où quelque chose ne va pas qu'il doit
       comprendre quoi faire — demander un nouveau lien à son hôte. */
    const t = textes(lang);
    return res.status(404).end(coquille({
      lang,
      titre: t.absentT,
      description: t.absentP,
      url: `https://${hote}/${slug}${lang ? '/' + lang : ''}`,
      corps: `<p class="sur">Smart Guide</p><h1>${echapper(t.absentT)}</h1>
      <p class="lieu">${echapper(t.absentP)}</p>`,
    }));
  }

  // L'aperçu : première photo du logement, décodée depuis le JSON.
  // Une data: URI ne peut pas servir d'og:image, il faut une vraie adresse.
  if (image) {
    const url = await lireApercu(slug);
    const m = String(url || '').match(/^data:(image\/[a-z+]+);base64,(.+)$/i);
    if (!m) return res.status(404).end('');
    const buf = Buffer.from(m[2], 'base64');
    res.setHeader('Content-Type', m[1]);
    res.setHeader('Cache-Control', 'public, max-age=3600');
    return res.status(200).end(buf);
  }

  const aUnePhoto = !!l.apercuEntete;
  const dim = aUnePhoto ? dimensionsImage(l.apercuEntete) : null;
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
  /* API/G.JS N'EST PLUS UN MOTEUR DE RENDU — sa règle en tête devient vraie par
     construction au lieu d'être une promesse. Le corps de la page est le HTML
     que l'application a produit avec livretHTML, le seul moteur, et rangé au
     moment de l'enregistrement du livret.
     Le repli ne disparaît pas : les livrets publiés AVANT cette version n'ont
     pas encore de rendu rangé — ils en recevront un à la prochaine
     sauvegarde du gérant. D'ici là ils gardent l'ancien affichage, incomplet
     mais servi, plutôt qu'une page vide. */
  const { corps: corpsReconstruit } = corpsLivret(l, urlImage);
  const corps = typeof l.rendu === 'string' && l.rendu.length > 200 ? l.rendu : corpsReconstruit;
  const servi = corps === corpsReconstruit ? 'repli' : 'application';
  /* LA LANGUE RÉELLEMENT SERVIE, pas celle demandée. Une adresse chinoise sur
     un livret que le gérant n'a pas traduit sert le français : la page doit le
     dire — dans sa balise `lang`, dans son aperçu, et dans son adresse
     canonique — plutôt que d'annoncer un chinois qu'elle n'a pas. */
  const langServie = LANGUES[l.renduLangue] ? l.renduLangue : null;
  const t = textes(langServie);
  const hote_ = (l.contacts && l.contacts.hote) || t.hote;
  /* Seul le français contracte l'article de la ville — « au Havre », « aux
     Sables ». Ailleurs la préposition est dans le gabarit de la langue, et la
     ville n'est que son nom. */
  const ville = langServie ? String(l.ville || '') : aVille(l.ville);
  const description = (l.ville ? t.avec : t.sans)
    .replace('{ville}', ville).replace('{hote}', hote_);

  res.setHeader('Content-Type', 'text/html; charset=utf-8');
  res.setHeader('Cache-Control', 'public, max-age=120');
  // Le livret porte le nom, l'adresse et le téléphone du gérant : il est partagé,
  // il n'est pas publié au monde. Pas d'indexation tant que le gérant ne l'a pas
  // explicitement demandé.
  res.setHeader('X-Robots-Tag', 'noindex, nofollow');
  /* Dit lequel des deux chemins a servi, sans avoir à lire la page : « repli »
     signale un livret publié qui n'a pas encore été réenregistré. */
  res.setHeader('X-Rendu', servi);
  /* Dit dans quelle langue la page a répondu, sans avoir à la lire : « fr » sur
     une adresse /zh signale un livret dont la traduction n'est pas montée. */
  res.setHeader('X-Langue', langServie || 'fr');
  res.status(200).end(coquille({
    lang: langServie,
    titre: `${l.nom || 'Votre logement'} — ${t.livret}`,
    description,
    // L'ADRESSE CANONIQUE EST LA NOUVELLE, PAS CELLE QUI A ÉTÉ DEMANDÉE.
    // Le voyageur reste sur SON lien — pas de redirection, sa promesse tient —
    // mais ce que la page déclare d'elle-même, aux robots comme aux aperçus de
    // messagerie, c'est l'adresse courante. Sans ça, chaque ancienne adresse se
    // présente comme une page distincte, et un aperçu WhatsApp figé sur une
    // adresse abandonnée survit à toutes les corrections du gérant.
    url: `https://${hote}/${slugCanon}${langServie ? '/' + langServie : ''}`,
    image: urlImage, dim,
    fond, encre: encreLisible(fond), corps, horsLigne: true,
  }));
};
