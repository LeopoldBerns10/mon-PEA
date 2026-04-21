# Prompt V3 — Mon PEA · Refonte DA complète + Responsive Desktop/Mobile

## Objectif
Refonte visuelle complète de toute l'app + ajout d'un layout responsive desktop.
Le code fonctionnel (Supabase, calculs) ne change pas — uniquement le style et la mise en page.

---

## Nouveau Design System

### Palette de couleurs
```css
--bg-root: #060611;          /* fond page entière */
--bg-card: #0c0c24;          /* cartes standard */
--bg-hero: #0d1b3e;          /* carte principale / hero */
--bg-sidebar: #07071a;       /* sidebar desktop */
--border-default: #1a1a3a;   /* bordures standard */
--border-glow: #2a4a8a;      /* bordures carte hero */
--border-white: rgba(255,255,255,0.12); /* contours lumineux */
--accent: #3a7bd5;           /* bleu principal */
--accent-bright: #5a9aee;    /* bleu vif / liens */
--accent-yellow: #f0c040;    /* jaune — logo, icônes actives, accents */
--text-primary: #c8e0ff;     /* texte principal lumineux */
--text-muted: #3a5080;       /* texte secondaire */
--gain: #2a9a5a;             /* vert gain */
--loss: #a04a4a;             /* rouge perte */
```

### Règles visuelles strictes
- Fond root `#060611` sur toute la page toujours
- Cartes standard : `background: #0c0c24; border: 1px solid rgba(255,255,255,0.12)`
- Carte hero (valeur portefeuille) : `background: #0d1b3e; border: 1px solid #2a4a8a; box-shadow: 0 0 24px rgba(58,123,213,0.15)`
- Bordures : `rgba(255,255,255,0.12)` — effet lumineux subtil blanc
- Texte principal : `#c8e0ff` (plus lumineux que avant)
- Logo / icône active / badge spécial : `#f0c040` (jaune)
- Arrondis : `16px` cartes, `12px` éléments, `999px` badges/pills
- Typo : `font-weight: 800` pour les grands chiffres, `letter-spacing: -0.5px`
- Labels : `uppercase; letter-spacing: 2px; font-size: 9-10px; color: #3a5080; font-family: monospace`
- Zéro gradient sauf carte hero (`linear-gradient(135deg, #0d1b3e, #0c0c24)`)

---

## Layout Responsive — 2 modes

### Mobile (< 768px)
- Plein écran, max-width 430px centré
- **Bottom navigation** 4 onglets en bas
- Onglet actif : petite barre `#3a7bd5` au dessus + texte `#5a9aee`

### Desktop (≥ 768px)
- Layout 2 colonnes : **sidebar fixe 64px** à gauche + **contenu principal** à droite
- Sidebar : fond `#07071a`, bordure droite `rgba(255,255,255,0.06)`
- Sidebar contient : logo en haut, 4 icônes de nav au milieu, avatar user en bas
- Icône active : background `#1e3a6e`, icône couleur `#5a9aee`
- Icône inactive : icône couleur `#2a3a6a`
- Contenu max-width `900px`, padding `32px`
- Sur desktop les cartes s'organisent en grille : 3 cols pour les stats, pleine largeur pour les tableaux

---

## Logo
- Petit carré arrondi `background: #f0c040` avec une icône graphique simple (flèche montante ou graphique)
- Texte "Mon PEA" en `#c8e0ff` font-weight 800
- Sous-titre "Suivi de portefeuille" en `#3a5080`

---

## Page Dashboard (`/dashboard`)

### Mobile layout
- Header : "Bonjour [prénom]" + avatar rond initial
- Carte hero : "Valeur du portefeuille" grande
- 2 cartes côte à côte : "Total injecté" | "Liquidités"
- 1 carte : "Gain net" + gain %
- Section "Mes positions" : liste indices en portefeuille

### Desktop layout
- Grille 3 colonnes pour les 3 stats principales
- Carte hero pleine largeur en premier
- Section positions en tableau avec colonnes : Indice · Parts · PRU · Valeur · Gain %

---

## Page Ordres (`/ordres`)

### Mobile
- Liste scrollable, bouton `+` flottant rond `#3a7bd5` bas droite
- Chaque item : date + indice en `#f0c040` + nb parts + PRU + gain %

### Desktop
- Tableau complet avec toutes les colonnes
- Bouton "Ajouter un ordre" en haut à droite (pas flottant)
- Colonnes : Date · Indice · Parts · PRU · Frais · Prix TTC · Gain %

### Modal d'ajout (identique mobile/desktop)
- Fond overlay `rgba(0,0,0,0.7)`
- Carte modale `#0c0c24` border `rgba(255,255,255,0.12)` border-radius `16px`
- Titre "Nouvel ordre" en `#c8e0ff`
- Champs : Date · Indice · Nombre de parts · PRU · Frais (défaut 1.89)
- Calcul auto affiché : Prix TTC et PRU TTC
- Bouton valider : `background: #3a7bd5` plein
- Bouton annuler : border `rgba(255,255,255,0.12)` transparent

---

## Page Injections (`/injections`)

### Mobile
- Liste + bouton `+` flottant
- Chaque item : date + montant en `#c8e0ff`
- Total en bas dans une carte : "Total injecté : X €"

### Desktop
- Tableau + bouton "Ajouter" en haut à droite
- Total affiché dans une carte stat en haut

---

## Page Ventes (`/ventes`)

### Mobile
- Liste + bouton `+` flottant
- Chaque item : date + indice en `#f0c040` + gain en vert/rouge

### Desktop
- Tableau complet
- Colonnes : Date · Indice · Parts · Prix vente · Frais · Montant récupéré · Gain € · Gain %

---

## Composants à créer / modifier

### `Logo.jsx`
```jsx
// Carré jaune + texte Mon PEA
// Utilisé dans sidebar desktop et header mobile login
```

### `BottomNav.jsx` (mobile only, caché sur desktop)
```jsx
// display: none sur ≥ 768px
// 4 onglets : Accueil · Ordres · Injections · Ventes
// Onglet actif : barre bleue + texte accent-bright
```

### `Sidebar.jsx` (desktop only, caché sur mobile)
```jsx
// display: none sur < 768px
// Logo en haut
// 4 NavLink avec icônes SVG
// Avatar user en bas
```

### `PageWrapper.jsx`
```jsx
// Gère le layout global
// Mobile : padding bottom 70px pour la bottom nav
// Desktop : margin left 64px pour la sidebar
```

---

## Détails UI supplémentaires

- **Badges indice** (ex: DCAM, WPEA) : `background: #0d2040; border: 1px solid #1e3a6e; color: #f0c040; border-radius: 6px; padding: 2px 8px; font-size: 11px; font-weight: 700`
- **Gain positif** : `color: #2a9a5a; font-weight: 700`
- **Gain négatif** : `color: #a04a4a; font-weight: 700`
- **Bouton primaire** : `background: #3a7bd5; color: white; border: none; border-radius: 10px; padding: 12px; font-weight: 700`
- **Bouton secondaire** : `background: transparent; border: 1px solid rgba(255,255,255,0.12); color: #5a9aee; border-radius: 10px; padding: 12px`
- **Inputs** : `background: #07071a; border: 1px solid rgba(255,255,255,0.1); color: #c8e0ff; border-radius: 10px; padding: 12px` focus: `border-color: #3a7bd5`
- **Séparateurs** : `border: none; border-top: 1px solid rgba(255,255,255,0.06)`

---

## Ce que tu ne touches PAS
- Logique Supabase (fetch, insert, calculs)
- Auth Google
- Routes

## Push
Push sur GitHub après chaque page refaite.
