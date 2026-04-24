Plusieurs corrections et une nouvelle fonctionnalité :

1. DATES plus visibles : color #8bb8f0 font-weight 600 
   (pas grisé comme maintenant)

2. TRI : trier toutes les lignes par date ASC 
   (plus ancienne en haut, plus récente en bas)
   Les séparateurs d'année dans le bon ordre aussi : 2024 → 2025 → 2026

3. BADGE VENDU : garder la ligne à la même opacité que les autres
   juste le badge "VENDU" suffit comme indicateur visuel

4. FIX INDICE TROP LONG : si le ticker fait plus de 6 caractères,
   tronquer avec ... ou réduire font-size à 9px dans le badge
   Ex: "TOTALENERGIES" → "TTE" (utiliser le ticker court)

5. DIVIDENDES : dans la page Injections, ajouter un champ 
   "Type" avec 2 options :
   - "Versement" (défaut)
   - "Dividende"
   Ajouter colonne type dans le tableau avec badge distinct :
   - Versement : badge bleu #3a7bd5
   - Dividende : badge jaune #f0c040
   
   SQL à exécuter dans Supabase :
   ALTER TABLE injections ADD COLUMN IF NOT EXISTS type varchar(20) DEFAULT 'versement';

Push sur main.