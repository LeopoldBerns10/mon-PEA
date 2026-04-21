# Prompt V2 — Mon PEA · Pages principales

## Contexte
L'auth Google OAuth via Supabase est déjà en place et fonctionnelle.
Il faut maintenant construire les 4 pages principales de l'app.

---

## Design System — rappel strict

```css
--bg-primary: #08080f;
--bg-card: #0f0f1e;
--border: #1a1a35;
--accent: #3a7bd5;
--accent-light: #8bb8f0;
--text-primary: #e8f0ff;
--text-muted: #3a4a70;
--gain: #4a9a6a;
--loss: #a04a4a;
```

- Fond global `#08080f`, cartes `#0f0f1e`, bordures `#1a1a35`
- Zéro gradient, zéro ombre, épuré et futuriste sobre
- Max-width 430px centré, fond `#08080f` plein écran derrière
- Tous les textes interface en **français**
- Bottom nav avec 4 onglets : Accueil · Ordres · Injections · Ventes

---

## Base de données Supabase — crée ces tables

```sql
-- Injections de capital
CREATE TABLE injections (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  date date NOT NULL,
  montant numeric(10,2) NOT NULL,
  note text,
  created_at timestamp DEFAULT now()
);

-- Ordres d'achat
CREATE TABLE ordres (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  date date NOT NULL,
  indice varchar(20) NOT NULL,
  nb_parts numeric(10,4) NOT NULL,
  pru numeric(10,4) NOT NULL,
  frais numeric(10,2) DEFAULT 0,
  prix_ttc numeric(10,2) GENERATED ALWAYS AS (nb_parts * pru + frais) STORED,
  created_at timestamp DEFAULT now()
);

-- Ventes
CREATE TABLE ventes (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  date date NOT NULL,
  indice varchar(20) NOT NULL,
  nb_parts numeric(10,4) NOT NULL,
  prix_vente numeric(10,4) NOT NULL,
  frais numeric(10,2) DEFAULT 0,
  created_at timestamp DEFAULT now()
);
```

Active **Row Level Security** sur chaque table :
```sql
ALTER TABLE injections ENABLE ROW LEVEL SECURITY;
ALTER TABLE ordres ENABLE ROW LEVEL SECURITY;
ALTER TABLE ventes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "user_own" ON injections FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "user_own" ON ordres FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "user_own" ON ventes FOR ALL USING (auth.uid() = user_id);
```

---

## Page 1 — Dashboard (`/dashboard`)

### Données calculées
Toutes ces valeurs viennent de Supabase en temps réel :

```
Total injecté    = SUM(injections.montant)
Total investi    = SUM(ordres.prix_ttc) - SUM(ventes.nb_parts * ventes.prix_vente - ventes.frais)
Liquidités       = Total injecté - Total investi
Valeur PF        = Liquidités (pour l'instant, les prix live viendront plus tard)
Gain net         = Liquidités - Total injecté  →  négatif si on a encore investi
Gain %           = Gain net / Total injecté * 100
```

### Layout
- Header : "Bonjour [prénom Google]" + petite photo de profil ronde
- **Carte principale** grande : "Valeur du portefeuille" en grand `#e8f0ff`
- **2 cartes côte à côte** : "Total injecté" | "Liquidités dispo"
- **1 carte** : "Gain net" en vert `#4a9a6a` si positif, rouge `#a04a4a` si négatif + le % en dessous
- **Section "Mes positions"** : liste des indices encore en portefeuille (ordres non vendus) avec indice + nb parts + PRU moyen
- Bottom nav 4 onglets

---

## Page 2 — Mes Ordres (`/ordres`)

### Layout
- Bouton `+` flottant en bas à droite pour ajouter un ordre
- Liste de tous les ordres triés par date décroissante
- Chaque ligne : date · indice · nb parts · PRU · frais · prix TTC · % gain latent (calculé vs PRU)

### Formulaire d'ajout (modal ou page)
Champs :
- **Date** (date picker, défaut aujourd'hui)
- **Indice** (champ texte, ex: DCAM, WPEA)
- **Nombre de parts** (numérique)
- **PRU** (prix de revient unitaire, numérique)
- **Frais** (numérique, défaut 1.89)

Calculs auto affichés sous le formulaire avant validation :
- Prix TTC = (nb parts × PRU) + frais
- PRU TTC = Prix TTC / nb parts

Bouton "Enregistrer l'ordre" → INSERT dans Supabase → retour à la liste

---

## Page 3 — Injections (`/injections`)

### Layout
- Bouton `+` flottant pour ajouter
- Liste des injections triées par date décroissante
- Chaque ligne : date · montant en €
- Total en bas : "Total injecté : X €"

### Formulaire d'ajout
Champs :
- **Date** (date picker, défaut aujourd'hui)
- **Montant** (numérique, en €)
- **Note** (optionnel, texte libre)

Bouton "Enregistrer" → INSERT dans Supabase

---

## Page 4 — Ventes (`/ventes`)

### Layout
- Bouton `+` flottant pour ajouter
- Liste des ventes triées par date décroissante
- Chaque ligne : date · indice · nb parts vendues · prix de vente · frais · gain/perte en € et %

### Formulaire d'ajout
Champs :
- **Date** (date picker, défaut aujourd'hui)
- **Indice** (liste déroulante générée depuis les ordres existants en portefeuille)
- **Nombre de parts à vendre** (numérique, max = parts encore en portefeuille)
- **Prix de vente unitaire** (numérique)
- **Frais** (numérique, défaut 1.89)

Calculs auto affichés :
- Montant récupéré = (nb parts × prix vente) - frais
- PRU moyen d'achat de cet indice (calculé depuis les ordres)
- Gain/Perte = Montant récupéré - (nb parts × PRU moyen achat)
- Gain % = Gain / (nb parts × PRU moyen achat) × 100

Bouton "Enregistrer la vente" → INSERT dans Supabase

---

## Navigation (`BottomNav.jsx`)

Composant réutilisable avec 4 onglets :
- 🏠 Accueil → `/dashboard`
- 📋 Ordres → `/ordres`
- 💉 Injections → `/injections`
- 📤 Ventes → `/ventes`

Onglet actif : fond `#3a7bd5`, texte blanc
Onglet inactif : texte `#3a4a70`

---

## Routing — mise à jour `App.jsx`

```
/ → redirect /dashboard
/login → Login.jsx
/dashboard → Dashboard.jsx (protégée)
/ordres → Ordres.jsx (protégée)
/injections → Injections.jsx (protégée)
/ventes → Ventes.jsx (protégée)
```

Crée un composant `ProtectedRoute.jsx` qui vérifie la session Supabase.

---

## Ce que tu ne dois PAS faire
- Pas de prix live pour l'instant (viendra plus tard)
- Pas de graphiques pour l'instant
- Pas d'anglais dans l'interface
- Pas de mock data — tout vient de Supabase
- Push sur GitHub après chaque page terminée
