# ATMTL 2026 · Bénévoles

Application web statique (mobile-first, hors-ligne) pour les bénévoles de
l'**Agile Tour Montréal 2026** — mardi 24 novembre 2026, Palais des congrès.

Deux vues, un seul conteneur Nginx :

| Onglet | Contenu |
| --- | --- |
| 👤 **Mon Horaire** | Le planning personnel du bénévole sélectionné : créneau en cours, à suivre, timeline complète, récapitulatif des heures. |
| 📍 **Par Salle** | Qui est affecté où, heure par heure, pour chaque salle / poste de la journée. |

L'interface s'adapte automatiquement à la date du jour :

| Phase | Comportement |
| --- | --- |
| **Avant** le 24 nov. 2026 | Bannière « Événement à venir » + compte à rebours en jours + heure du premier créneau. Aucun créneau n'est grisé. |
| **Pendant** la journée | Suivi temps réel : « En ce moment », minutes restantes, « À suivre », créneaux passés estompés, créneau actif encadré. |
| **Après** | Bandeau « Événement terminé — merci ! » ; l'horaire reste consultable en archive, sans estompage. |

- **Hébergement** : Google Cloud Run, région `northamerica-northeast1` (Montréal)
- **Architecture** : `nginx:alpine` + une page statique. Aucun backend, aucune base de
  données, aucune étape de build.
- **Données** : Google Sheet exporté en CSV, mis en cache dans `localStorage`.
- **Thèmes** : sombre (défaut) et clair, bascule dans l'en-tête, choix mémorisé.

---

## 1. Charte graphique

L'identité visuelle provient du design Canva **« identité visuel »**
(`DAHSrEGxAo0`, 18ᵉ édition — *« Quand l'Agilité rencontre l'intelligence artificielle »*),
consulté **en lecture seule** : aucun élément du design n'a été modifié, renommé ou commenté.

### Palette appliquée

Les hex du design Canva sont conservés tels quels en **thème sombre** ; le **thème clair**
utilise des variantes assombries pour garder un contraste AA sur fond crème.

| Rôle | Sombre | Clair | Usage |
| --- | --- | --- | --- |
| Fond principal | `#071529` | `#F5F2EC` | Arrière-plan de l'application |
| Fond secondaire | `#0E2440` | `#FFFFFF` | Cartes, champs, feuilles |
| Bordure | `#1E3B5E` | `#DDD5C8` | Séparateurs et contours |
| Orange (accent principal) | `#F0824A` | `#E2672F` | CTA, onglet actif, « En ce moment », badges |
| Orange Canva (logo) | `#ED7C45` | `#C2551F` | Logos et accents de marque |
| Orange clair | `#FFA271` | `#B44E1B` | Textes d'accent |
| Cyan Canva (logo) | `#2385A6` | `#14647F` | Logos, accents secondaires |
| Cyan (UI) | `#4FC3DB` | `#0E6E8A` | Salle fixe / affectation |
| Violet | `#A78BFA` | `#6D4AC7` | Soutien mobile |
| Émeraude | `#34D399` | `#0B6B4B` | Pauses et dîners |
| Ardoise | `#94A3B8` | `#5A6B7C` | Réserve |
| Texte | `#F1F6FC` / `#B4C9DF` | `#0B1F3A` / `#3B5470` | Titres / textes secondaires |

Les couleurs de texte sur fond coloré ont été ajustées pour conserver des contrastes
conformes (WCAG AA) — par exemple l'orange `#F0824A` n'est jamais utilisé pour du texte
sur fond clair, et les badges orange utilisent un texte marine `#1C0D04`.

Toutes les couleurs passent par des variables CSS (`:root` pour le sombre,
`[data-theme="light"]` pour le clair) : fonds, cartes, modales, onglets, badges,
recherche et feuille de simulation basculent ensemble.

### Logos officiels

Deux variantes sont extraites des visuels Canva (export PNG 3840×2160, recadrage et
détourage alpha, 462×162) :

| Fichier | Usage |
| --- | --- |
| `logo-dark.png` | En-tête en thème sombre (orange `#ED7C45`, cyan `#2385A6`) |
| `logo-light.png` | En-tête en thème clair (orange `#C2551F`, cyan `#14647F`) |

La bascule se fait en CSS (`[data-theme="light"]`), sans JavaScript. Les icônes PWA
(`icon-192`, `icon-512`, `icon-maskable-512`, `apple-touch-icon`) reprennent le logo sur
un fond navy dégradé ; `icon.svg` embarque la version 512 en base64.

### Typographies (Google Fonts)

| Rôle | Police | Équivalent du design |
| --- | --- | --- |
| Titres & interface | **Barlow** (400 → 800) | Grotesque géométrique, proche du titre « Quand l'Agilité » |
| Libellés / eyebrows | **Barlow Condensed** (600 → 700) | Capitales condensées (« 18ᵉ ÉDITION », « BIENVENUE À ») |

Chargées via Google Fonts avec `display=swap`, mises en cache par le service worker.
En cas d'absence de réseau, la pile système prend le relais sans bloquer l'affichage.

### Esprit graphique repris

- Fond **navy profond** avec halo orange diffus en haut de page (rappel des visuels).
- Accents **orange** pour tout ce qui est action ou « maintenant ».
- Cartes sombres, bordures fines, coins arrondis généreux.
- Hiérarchie typographique forte, capitales condensées pour les micro-libellés.
- Logo **Agile Tour Montréal** dans l'en-tête, décliné clair / sombre.
- Icône de l'application (écran d'accueil) : logo sur fond navy dégradé.

### Thème clair / sombre

- Bouton **soleil / lune** dans l'en-tête ; le libellé accessible décrit l'action.
- Au premier lancement : `prefers-color-scheme` du système. Ensuite, le choix est
  mémorisé dans `localStorage` (`atmtl26:theme:v1`).
- Un script inline dans `<head>` applique le thème **avant le premier rendu** pour éviter
  tout flash clair/sombre.
- Tailwind est configuré en `darkMode: 'class'` ; le CSS critique reste autonome.

---

## 2. Architecture

| Contrainte | Choix |
| --- | --- |
| Réseau instable / sous-sols du Palais | Données en `localStorage` + service worker pour la coquille |
| Déploiement en 1 commande | `gcloud run deploy --source .` (Dockerfile détecté) |
| Coût minimal | Scale-to-zero, image ~50 Mo, aucun serveur applicatif |
| Modifier le planning sans redéployer | Les données viennent d'un Google Sheet exporté en CSV |
| Zéro build / zéro `npm install` | `index.html` autonome (CSS + JS inline) |

Le seul point de défaillance est le Google Sheet : l'application conserve toujours la
dernière version téléchargée, donc une coupure réseau ou une feuille momentanément
inaccessible **ne bloque pas** les bénévoles sur place.

---

## 3. Arborescence

```
.
├── index.html               # Application complète (HTML + CSS + JS inline)
├── sw.js                    # Service worker (cache applicatif, CDN, polices)
├── manifest.webmanifest     # Manifeste PWA
├── logo-dark.png            # Logo Canva — thème sombre (462×162, alpha)
├── logo-light.png           # Logo Canva — thème clair (462×162, alpha)
├── icon.svg                 # Icône vectorielle (PNG 512 embarqué)
├── icon-192.png             # Icônes PWA
├── icon-512.png
├── icon-maskable-512.png
├── apple-touch-icon.png     # Icône iOS (écran d'accueil)
├── nginx.conf               # Port 8080, gzip, cache, en-têtes de sécurité
├── Dockerfile               # nginx:alpine, EXPOSE 8080, HEALTHCHECK
├── .dockerignore
└── .gitignore
```

---

## 4. Source de données (Google Sheet)

L'application lit l'onglet **`Affectations`** du Google Sheet
`1oqPrxKS2V5jXFb8wiQUV6f_yKNZSw7snih34VGW_qbA` via l'endpoint CSV public de Google
Visualization :

```
https://docs.google.com/spreadsheets/d/1oqPrxKS2V5jXFb8wiQUV6f_yKNZSw7snih34VGW_qbA/gviz/tq?tqx=out:csv&sheet=Affectations
```

### 4.1 Colonnes attendues

| Colonne | Contenu | Exemple |
| --- | --- | --- |
| `Bénévole` | Nom complet | `Anca Baban` |
| `Début` | Heure de début (`HH:MM`) | `06:30` |
| `Fin` | Heure de fin (`HH:MM`) | `09:15` |
| `Durée (min)` | Durée en minutes (recalculée si absente) | `165` |
| `Type` | `Affectation`, `Pause`, `Dîner`, `Réserve` | `Affectation` |
| `Salle / tâche` | Poste, salle ou tâche | `Foyer 517` |
| `Disponibilité retenue` | Plage de disponibilité | `6:30–17:00` |

Une ligne = une plage continue. Les lignes vides et les doublons sont ignorés.

> **Robustesse du parsing** : la ligne d'en-tête est détectée automatiquement
> (recherche stricte des colonnes `Bénévole` / `Début` / `Fin`). Le format fonctionne
> avec 0, 1, 3 ou 4 lignes de titre au-dessus, y compris si la description est
> fusionnée dans la cellule `A1` (cas actuel de la feuille).

### 4.2 ⚠️ Rendre la feuille lisible publiquement (obligatoire)

Sans ce réglage, Google renvoie une page de connexion HTML et l'application affiche
« Planning indisponible ».

1. Ouvrir le Google Sheet.
2. Bouton **Partager** (en haut à droite).
3. Section **Accès général** → passer de « Restreint » à **« Tout le monde disposant du lien »**.
4. Rôle : **Lecteur** (lecture seule — personne ne peut modifier les données).
5. Cliquer **Terminé**.

> L'onglet doit s'appeler exactement **`Affectations`** (sensible à la casse).
> Le partage public ne concerne que la lecture : l'équipe garde les droits d'édition.

### 4.3 Vérifier que l'endpoint fonctionne

```bash
curl -sS "https://docs.google.com/spreadsheets/d/1oqPrxKS2V5jXFb8wiQUV6f_yKNZSw7snih34VGW_qbA/gviz/tq?tqx=out:csv&sheet=Affectations" | head -3
```

Vous devez voir la ligne d'en-tête CSV. Si vous obtenez du HTML (`<!DOCTYPE html>`),
la feuille n'est pas partagée publiquement.

---

## 5. Lancer en local

Aucune dépendance, aucun build.

```bash
# Option 1 — serveur Python
python3 -m http.server 8080
# → http://localhost:8080

# Option 2 — image Docker identique à la production
docker build -t atmtl-2026 .
docker run --rm -p 8080:8080 atmtl-2026
# → http://localhost:8080
```

Le service worker ne s'active qu'en `https://` ou sur `localhost` (comportement normal
des navigateurs).

### Tester le planning avant / après l'événement

La feuille **« Affichage du planning »** (lien « Simuler le jour J » en bas de page, ou
bouton des bannières avant/après) propose deux modes :

- **Temps réel** : l'heure de Montréal, la phase (avant / pendant / après) et le suivi
  « En ce moment » sont calculés automatiquement.
- **Simuler le 24 nov.** : un curseur (00:00 → 23:59) et un champ d'heure exacte figent
  l'horloge sur le jour J. Les raccourcis 06:30, 08:00, 12:00, 15:00 et 17:00 couvrent la
  journée. Un bandeau ambre rappelle en permanence que l'heure est simulée ; « Temps
  réel » rétablit l'horloge.

Le choix simulé est mémorisé (`atmtl26:sim:v1`) mais reste toujours calé sur la date de
l'événement (`EVENT_DATE`).

---

## 6. Déploiement sur Cloud Run

### 6.1 Prérequis (une seule fois)

```bash
gcloud auth login
gcloud config set project <VOTRE_PROJECT_ID>

gcloud services enable \
  run.googleapis.com \
  cloudbuild.googleapis.com \
  artifactregistry.googleapis.com
```

### 6.2 Déploiement

```bash
gcloud run deploy atmtl-2026-benevoles \
  --source . \
  --region northamerica-northeast1 \
  --allow-unauthenticated \
  --port 8080 \
  --memory 256Mi \
  --cpu 1 \
  --min-instances 0 \
  --max-instances 5 \
  --timeout 30 \
  --set-env-vars TZ=America/Toronto
```

Cloud Build détecte le `Dockerfile`, construit l'image, la pousse dans Artifact Registry
et déploie. La commande affiche l'URL du service
(`https://atmtl-2026-benevoles-xxxxx-uc.a.run.app`).

**Le jour de l'événement**, pour supprimer le cold start (~1 s) :

```bash
gcloud run services update atmtl-2026-benevoles \
  --region northamerica-northeast1 \
  --min-instances 1
```

### 6.3 Déploiement manuel (build séparé, utile en CI)

```bash
PROJECT_ID=$(gcloud config get-value project)
REGION=northamerica-northeast1
IMAGE="$REGION-docker.pkg.dev/$PROJECT_ID/atmtl/atmtl-2026:$(git rev-parse --short HEAD)"

gcloud builds submit --tag "$IMAGE" .
gcloud run deploy atmtl-2026-benevoles \
  --image "$IMAGE" \
  --region "$REGION" \
  --allow-unauthenticated \
  --port 8080
```

### 6.4 Vérifications post-déploiement

```bash
URL=$(gcloud run services describe atmtl-2026-benevoles \
  --region northamerica-northeast1 --format='value(status.url)')

curl -sI "$URL"                    # 200 + content-encoding: gzip
curl -s  "$URL/healthz"            # ok
curl -sI "$URL/sw.js" | grep -i cache-control   # no-cache
```

---

## 7. Mettre à jour le planning (sans redéployer)

1. Modifier l'onglet `Affectations`.
2. Les bénévoles récupèrent les nouvelles données :
   - automatiquement à l'ouverture de l'app,
   - automatiquement au retour au premier plan si le cache a plus de 5 minutes,
   - immédiatement en touchant le bouton **Actualiser** (icône ↻).

Google met le CSV en cache quelques minutes ; le paramètre `_cb` ajouté à l'URL force
une requête fraîche. En cas d'échec, l'application continue d'afficher la dernière
version connue avec le badge **Hors-ligne**.

> Pour modifier le **code** (design, logique), il faut redéployer (`gcloud run deploy`).
> Pensez alors à incrémenter `VERSION` dans `sw.js` si vous changez un fichier mis en
> cache (icônes, manifeste, polices).

---

## 8. Comportement hors-ligne

| Élément | Stratégie |
| --- | --- |
| Données du planning | `localStorage` (`atmtl26:schedule:v1`), écrit à chaque synchro réussie |
| Coquille de l'app (`index.html`) | Service worker, **network-first** + repli cache |
| Icônes / manifeste / logos / polices | Service worker, **cache-first** |
| Tailwind, PapaParse, Google Fonts | Service worker, **cache-first** (précachés à l'installation) |
| Google Sheets | Jamais intercepté par le SW (géré par l'app) |

Résultat : après une première ouverture réussie, l'application démarre et affiche le
planning **même sans réseau**. Le CSV est re-téléchargé dès qu'une connexion revient.

**Détail important** : le CSS critique est embarqué dans `index.html`. Tailwind CDN est
chargé comme demandé, mais l'interface ne dépend pas de lui — si le CDN est
inaccessible lors d'une toute première visite hors-ligne, la page reste lisible et
utilisable.

---

## 9. Installation sur l'écran d'accueil (PWA)

- **iOS / Safari** : Partager → « Sur l'écran d'accueil ».
- **Android / Chrome** : menu ⋮ → « Installer l'application » (ou « Ajouter à l'écran d'accueil »).

L'app s'ouvre en plein écran (`display: standalone`), avec le logo Agile Tour Montréal
sur fond navy et la couleur de thème `#071529`.

---

## 10. Dépannage

| Symptôme | Cause probable | Solution |
| --- | --- | --- |
| « Planning indisponible » + `Feuille non partagée publiquement` | Accès restreint | Partager « Tout le monde disposant du lien · Lecteur » (§4.2) |
| « Planning indisponible » + `HTTP 404` | Mauvais ID de feuille ou onglet renommé | Vérifier `SHEET_ID` et le nom exact `Affectations` |
| Aucun bénévole affiché | Colonnes renommées | Garder les en-têtes `Bénévole`, `Début`, `Fin`, `Type`, `Salle / tâche` |
| La vue « Par Salle » est vide | Aucune ligne `Affectation` / `Réserve` | Vérifier la colonne `Type` |
| Les horaires semblent décalés | Fuseau de l'appareil | L'app calcule toujours en `America/Toronto`, indépendamment de l'appareil |
| Anciennes données après déploiement | Cache du service worker | Incrémenter `VERSION` dans `sw.js`, redéployer, recharger 2 fois |
| `403` au déploiement | Compte sans droits Cloud Run | Vérifier IAM (`roles/run.admin`, `roles/cloudbuild.builds.editor`) |

Logs du service :

```bash
gcloud run services logs read atmtl-2026-benevoles --region northamerica-northeast1 --limit 50
```

---

## 11. Coût

Avec `--min-instances 0`, le service ne coûte rien lorsqu'il n'y a pas de trafic.
Pendant l'événement (quelques centaines de requêtes sur une journée), le coût reste
de l'ordre de quelques centimes. Passer à `--min-instances 1` pour la journée ajoute
un coût négligeable (instance 256 Mi / 1 vCPU).

---

## 12. Notes techniques

- **Aucune donnée sensible** n'est exposée : le Sheet est en lecture seule et ne contient
  que des noms et des horaires.
- **Accessibilité** : contrastes vérifiés, cibles tactiles ≥ 44 px, onglets `role="tab"`
  avec `aria-selected`, `aria-live` sur le statut de synchro, couleurs doublées par des
  libellés et des icônes, respect de `prefers-reduced-motion`.
- **Zéro débordement horizontal** : conteneur `max-width: 34rem`, `min-width: 0` sur les
  grilles et `word-break` sur les libellés longs.
- **Vue Par Salle** : les bornes horaires sont calculées à partir de toutes les arrivées
  et départs de la salle, puis chaque intervalle liste les bénévoles présents. Les
  intervalles sans affectation restent visibles (pointillés) pour garder la continuité
  06:30 → 17:00.
- **Sécurité HTTP** : `X-Content-Type-Options`, `X-Frame-Options`, `Referrer-Policy`,
  `Permissions-Policy`, `server_tokens off`.
- **Canva** : accès strictement en lecture (`read-design`, `get-design-pages`,
  `get-export-formats`, `export-design`) ; aucune opération d'écriture n'a été effectuée
  sur le design « identité visuel » (`DAHSrEGxAo0`).
- **Thème** : les deux palettes sont définies en variables CSS ; le logo et les icônes
  d'en-tête basculent uniquement par CSS.
