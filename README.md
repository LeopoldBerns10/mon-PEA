# Mon PEA

Tracker de portefeuille boursier personnel — mobile first, interface en français.

## Stack

- Vite + React
- TailwindCSS
- React Router
- Supabase (auth)

## Démarrage

1. **Cloner le repo**
   ```bash
   git clone https://github.com/LeopoldBerns10/mon-PEA.git
   cd mon-PEA
   ```

2. **Installer les dépendances**
   ```bash
   npm install
   ```

3. **Configurer les variables d'environnement**
   ```bash
   cp .env.example .env
   ```
   Remplir `.env` avec les clés Supabase (disponibles dans ton projet Supabase → Settings → API) :
   ```
   VITE_SUPABASE_URL=https://xxxx.supabase.co
   VITE_SUPABASE_ANON_KEY=eyJ...
   ```

4. **Lancer en développement**
   ```bash
   npm run dev
   ```
