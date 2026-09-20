# CoachPro 2.0

Démo **indépendante** d’une proposition CoachPro 2.0 — interface **fr-CA**, mobile-first, données **100 % locales** (navigateur).

> Ce dépôt n’est **pas** CoachPro Lite et ne déploie **pas** vers l’application cliente existante. Il s’agit d’un prototype / proposition de démonstration.

## Fonctionnalités

- **Tableau de bord** : résumé + graphiques (poids, % graisse, tour de taille)
- **Séances** : titre optionnel + texte libre ; titre auto = date + extrait si vide
- **Mesures** : poids (lb), graisse (%), circonférences en pouces (cou, épaules, poitrine, taille, hanches, cuisses G/D, bras G/D), notes ; date = aujourd’hui par défaut ; lb/% optionnels
- **Photos** : galerie **locale uniquement** (IndexedDB) — jamais d’envoi serveur
- **Sauvegarde** : export / import JSON (séances, mesures, photos)
- **PWA-friendly** : meta theme-color, manifest, apple-mobile-web-app

Persistance : `localStorage` (séances / mesures / métadonnées) + **IndexedDB** (blobs photos).

## Démarrage

```bash
npm i
npm run dev
```

Ouvrir l’URL affichée par Vite (souvent `http://localhost:5173`).

## Build de production

```bash
npm run build
npm run preview
```

## Stack

- Vite + React + TypeScript
- React Router
- Recharts
- UI sombre, accent teal — branding distinct de « Lite »

## Limites (démo)

- Pas de compte / sync cloud
- Photos limitées par le quota navigateur IndexedDB
- Pas de service worker offline complet (meta PWA seulement)
- Données effacées si le stockage du site est vidé

## Licence

Prototype de démonstration — usage selon les besoins du détenteur du dépôt.
