-- ============================================================
-- V10 — Système d'autorisation admin
-- À exécuter dans Supabase SQL Editor
-- ============================================================

-- 1. TABLE PROFILES
CREATE TABLE IF NOT EXISTS profiles (
  id uuid REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
  email varchar(255) NOT NULL,
  nom varchar(100),
  photo_url text,
  statut varchar(20) DEFAULT 'pending', -- 'pending', 'approved', 'rejected'
  role varchar(20) DEFAULT 'user',      -- 'user', 'admin'
  created_at timestamp DEFAULT now(),
  approved_at timestamp
);

ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

-- L'utilisateur peut lire son propre profil
CREATE POLICY "read_own" ON profiles FOR SELECT USING (auth.uid() = id);

-- Seul l'admin peut tout voir et modifier
CREATE POLICY "admin_all" ON profiles FOR ALL USING (
  EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
);

-- ============================================================
-- 2. TRIGGER — Création automatique du profil à la connexion
-- ============================================================

CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS trigger AS $$
BEGIN
  INSERT INTO profiles (id, email, nom, photo_url, statut)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.email),
    NEW.raw_user_meta_data->>'avatar_url',
    'pending'
  )
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();

-- ============================================================
-- 3. INSERTION PROFIL ADMIN (Léopold)
-- Remplace YOUR_USER_ID par ton UUID Supabase
-- (visible dans Authentication > Users dans le dashboard Supabase)
-- ============================================================

INSERT INTO profiles (id, email, nom, statut, role)
VALUES ('YOUR_USER_ID', 'leopoldberns10@gmail.com', 'Léopold', 'approved', 'admin')
ON CONFLICT (id) DO UPDATE SET role = 'admin', statut = 'approved';
