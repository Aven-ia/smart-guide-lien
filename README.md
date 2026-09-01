# smart-guide-lien

Page publique des livrets Smart Guide, servie par Vercel sur `guide.aven-ia.com`.

## Ce dépôt ne contient PAS l'application

Trois dépôts, trois rôles. Ne jamais les confondre.

| Dépôt | Contenu | Rôle |
|---|---|---|
| `smart-guide` (public) | `index.html` + icônes | sert GitHub Pages — **l'URL ne doit jamais changer** |
| `smart-guide-source` (privé) | l'arbre complet | le dépôt de travail |
| `smart-guide-lien` (ici) | `vercel.json` + `api/` | la page publique du livret |

**Ne jamais poser de domaine personnalisé sur `smart-guide`.** GitHub Pages remplacerait
l'URL du dépôt, l'origine changerait, et IndexedDB étant cloisonné par origine, tous les
gérants sans compte perdraient leurs livrets locaux.

**Ne jamais ajouter d'`index.html` ici.** Ce dépôt sert une fonction, pas un site statique.

## Ce que fait `api/g.js`

Une seule fonction, appelée pour toutes les adresses via la réécriture de `vercel.json`.

- `/<conciergerie>/<logement>` — la page du livret, **rendue côté serveur**. C'est
  indispensable : WhatsApp lit les balises Open Graph sans exécuter le JavaScript.
- `/<conciergerie>/<logement>/apercu.jpg` — la première photo, décodée depuis le JSON.
  Une `data:` URI ne peut pas servir d'`og:image`, il faut une vraie adresse.

Les données viennent de `livret_public(slug)`, fonction Postgres en `security definer`,
avec une **liste d'inclusion** de 32 champs. Jamais une liste d'exclusion : un champ
oublié dans une liste d'exclusions devient public en silence. `notes`, `audit`, `geo` et
les champs techniques ne sortent pas.

## La règle à ne pas défaire

**Ce fichier n'est pas un moteur de rendu.** Le livret a déjà le sien, dans `livretHTML`
de l'application. Deux moteurs divergent toujours, et c'est le voyageur qui voit la
différence.

## Un lien envoyé est une promesse

Le slug est figé à la première publication. Renommer un logement ne casse pas la promesse.

## Pourquoi `"regions": ["dub1"]`

La fonction s'exécutait à `iad1` — Washington, la région par défaut de Vercel que
personne n'avait changée — pendant que Postgres est à `eu-west-1`, Dublin. Chaque
affichage de page faisait Paris → Washington → Dublin → Washington → Paris : deux
traversées de l'Atlantique pour rendre 6 ko de HTML. Mesuré sur `x-vercel-id`,
10 requêtes froides sans exception : `cdg1::iad1`.

`dub1` met la fonction à côté de la base. Le gain est pour le voyageur ; pour un
robot d'aperçu qui crawle depuis les États-Unis c'est à peu près neutre, et c'est
le voyageur qui compte.

**`vercel.json` n'accepte aucune clé hors schéma** — pas même un commentaire. Un
`_lisez_moi` y a fait échouer un déploiement entier avec
« should NOT have additional property ». Le pourquoi se documente ici.
