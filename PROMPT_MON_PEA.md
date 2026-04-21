# Prompt — Mon PEA · Démarrage du projet

## Contexte
Crée une web app mobile first appelée **"Mon PEA"** — un tracker de portefeuille boursier personnel en français. Stack : Vite + React, TailwindCSS, React Router, Supabase pour l'auth.

Pas de backend pour l'instant. Tout passe par Supabase directement depuis le frontend.

---

## Design System — à respecter absolument

### Palette de couleurs
```css
--bg-primary: #08080f;       /* fond principal */
--bg-card: #0f0f1e;          /* cartes */
--bg-input: #0f0f1e;         /* champs */
--border: #1a1a35;           /* bordures */
--accent: #3a7bd5;           /* bleu principal */
--accent-light: #8bb8f0;     /* bleu pastel */
--text-primary: #e8f0ff;     /* texte principal */
--text-muted: #3a4a70;       /* texte secondaire */
--gain: #4a9a6a;             /* vert gain */
--loss: #a04a4a;             /* rouge perte */
```

### Règles visuelles
- Fond global très sombre `#08080f`, jamais blanc
- Cartes avec `background: #0f0f1e` et `border: 1px solid #1a1a35`
- Arrondis : `border-radius: 12px` pour les cartes, `8px` pour les inputs/boutons
- Typographie : sans-serif, labels en `uppercase letter-spacing: 1-2px font-size: 10-11px color: #3a4a70`
- Valeurs importantes : `font-size: 20-24px font-weight: 700 color: #e8f0ff`
- Bouton principal : `background: #3a7bd5` plein, texte blanc, pas de border
- Bouton secondaire : transparent, `border: 1px solid #1a1a35`, texte `#5a7aaa`
- Zéro gradient, zéro ombre portée, zéro bruit de fond
- Épuré, aéré, futuriste sobre

---

## Ce que tu dois créer

### 1. Init projet
```bash
npm create vite@latest mon-pea -- --template react
cd mon-pea
npm install
npm install -D tailwindcss postcss autoprefixer
npx tailwindcss init -p
npm install react-router-dom @supabase/supabase-js
```

Configure Tailwind pour accepter les couleurs custom ci-dessus dans `tailwind.config.js`.

---

### 2. Fichier `.env.example`
```
VITE_SUPABASE_URL=
VITE_SUPABASE_ANON_KEY=
```

### 3. `src/lib/supabase.js`
Initialise le client Supabase avec les variables d'environnement.

---

### 4. Page Login — `src/pages/Login.jsx`

**Layout :**
- Fond `#08080f` plein écran
- En haut : logo (petit carré bleu `#3a7bd5` avec icône simple) + nom "Mon PEA" + sous-titre "Suivi de portefeuille"
- Formulaire centré verticalement :
  - Label uppercase "ADRESSE EMAIL" + input email
  - Label uppercase "MOT DE PASSE" + input password
  - Bouton plein "Connexion"
  - Bouton ghost "Créer un compte"
- Bascule entre mode connexion / mode inscription (pas de nouvelle page, juste toggle)
- Gestion des erreurs Supabase affichées en rouge sous le formulaire
- Si déjà connecté → redirect `/dashboard`

---

### 5. Page Dashboard — `src/pages/Dashboard.jsx`

**Layout :**
- Header : "Bonjour [prénom ou email]" + avatar rond initiales en haut à droite
- Carte principale : "Valeur du portefeuille" → affiche `0,00 €` pour l'instant
- 2 petites cartes côte à côte : "Investi" et "Gain net"
- 1 carte : "Liquidités disponibles"
- Bottom nav : 3 onglets — Accueil · Ordres · Conseils (non fonctionnels pour l'instant, juste visuels)
- Bouton déconnexion discret en haut à droite (icône ou texte petit)
- Si non connecté → redirect `/login`

---

### 6. Routing — `src/App.jsx`
- `/` → redirect `/login`
- `/login` → `Login.jsx`
- `/dashboard` → `Dashboard.jsx` (route protégée, vérifie session Supabase)

---

### 7. `.gitignore`
Inclure : `node_modules`, `.env`, `dist`, `.DS_Store`

---

### 8. `README.md`
Instructions claires :
1. Cloner le repo
2. `npm install`
3. Copier `.env.example` → `.env` et remplir les clés Supabase
4. `npm run dev`

---

## Ce que tu ne dois PAS faire
- Pas de backend / serveur Express
- Pas de base de données pour l'instant (juste l'auth Supabase)
- Pas de données mockées complexes
- Pas d'anglais dans l'interface utilisateur
- Pas de mode clair / dark toggle
