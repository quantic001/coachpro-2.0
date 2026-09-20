# CoachPro 2.0

Proposition **indépendante** CoachPro 2.0 — interface **fr-CA**, mobile-first, multi-clients, persistance locale immédiate + sync cloud optionnelle (Supabase free tier).

> Ce dépôt n’est **pas** CoachPro Lite et ne déploie **pas** vers l’application cliente existante (`coachpro-lite-…replit.app`).

## Fonctionnalités

- **Multi-clients** : menu déroulant pour sélectionner / créer / renommer / supprimer un client ; séances, mesures et photos sont scopées par client
- **Persistance locale immédiate** : chaque modification est écrite dans `localStorage` / IndexedDB (pas de bouton « Enregistrer » requis sur les formulaires)
- **Sync cloud Supabase** (optionnelle) : push/pull des clients, séances et mesures ; **photos locales uniquement** ; file d’attente (outbox) + sync quotidienne de sécurité ; conflits = last-write-wins (`updated_at`)
- **Mesures** : formulaire du jour, tableau « Données antérieures », et graphiques pour toutes les mesures numériques (poids, % graisse, cou, épaules, poitrine, taille, hanches, cuisses, bras) via un sélecteur
- **Export Excel (.xls) / CSV** par client ou tous les clients (CSV fr-CA avec `;`)
- **Export / import JSON** (backup complet, photos en data URL)
- **Hors ligne** : si `VITE_SUPABASE_*` absents → bandeau *« Cloud non configuré — données locales seules »* et app 100 % locale

## Démarrage local

```bash
npm i
cp .env.example .env.local   # optionnel — laisser vide pour mode local seul
npm run dev
```

Ouvrir l’URL Vite (souvent `http://localhost:5173`).

## Build

```bash
npm run build
npm run preview
```

## Configurer Supabase (gratuit)

1. Créer un projet sur [supabase.com](https://supabase.com) (plan Free).
2. **SQL Editor** → coller / exécuter le fichier  
   `supabase/migrations/20260320000001_init.sql`  
   (tables `clients`, `sessions`, `measurements`, `sync_meta` + politiques anon pour le prototype coach solo).
3. **Project Settings → API** : copier `Project URL` et `anon` `public` key.
4. Créer `.env.local` (jamais committer) :

```env
VITE_SUPABASE_URL=https://XXXX.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGciOi...
```

5. Relancer `npm run dev` / rebuild. L’app synchronise à la connexion réseau, au bouton **Synchroniser maintenant**, et au moins une fois par jour.

> Les politiques RLS « anon all » conviennent à une démo coach solo. Pour plusieurs utilisateurs, ajoutez Auth + politiques par `user_id`.

## Déploiement (statique Vite)

Build = dossier `dist/` (HTML/JS/CSS).

Options gratuites courantes :

- **Netlify / Cloudflare Pages / Vercel** : connecter le dépôt GitHub, build `npm run build`, publish `dist`, ajouter les variables `VITE_SUPABASE_*` dans le panneau d’env.
- **GitHub Pages** : build + publier `dist` (base path si besoin dans `vite.config.ts`).
- **Supabase Storage** ou tout hébergeur de fichiers statiques.

Sans variables d’env cloud, le site reste entièrement utilisable en local-only.

## Stack

- Vite + React + TypeScript
- React Router, Recharts, `@supabase/supabase-js`
- UI sombre, accent teal

## Limites

- Photos limitées au quota IndexedDB du navigateur (jamais sync cloud)
- RLS anon = prototype ; durcir avant usage multi-coach
- Pas de service worker offline complet (meta PWA seulement)

## Licence

Prototype de démonstration — usage selon les besoins du détenteur du dépôt.
