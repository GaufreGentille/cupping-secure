# Cupping sécurisé — déploiement Netlify

Outil de dégustation autonome avec **base partagée** (Netlify Blobs) et **accès protégé par mot de passe vérifié côté serveur**. Toi et l'équipe qualité partagez un seul mot de passe ; les fiches sont accessibles depuis n'importe quel appareil.

## Ce qu'il y a dans le projet

```
cupping-secure/
├── public/
│   └── index.html              ← l'outil (frontend)
├── netlify/functions/
│   ├── _auth.mjs               ← gestion de session signée (HMAC)
│   ├── login.mjs               ← POST /api/login (vérifie le mot de passe)
│   ├── session.mjs             ← GET /api/session (état) · POST (déconnexion)
│   └── cupping.mjs             ← GET/POST/DELETE /api/cupping (données, protégé)
├── netlify.toml
├── package.json
└── .gitignore
```

## Comment ça sécurise (en bref)

- Le mot de passe vit dans une **variable d'environnement Netlify**, jamais dans le code envoyé au navigateur.
- À la connexion, le serveur vérifie le mot de passe et pose un **cookie de session signé cryptographiquement** (HMAC-SHA256, `HttpOnly`, `Secure`, `SameSite=Strict`).
- Chaque accès aux données vérifie ce cookie côté serveur. Sans cookie valide → `401`, rien n'est lu ni écrit.
- Impossible à contourner en lisant le code source, contrairement à l'ancien verrou JavaScript.

---

## Déploiement — pas à pas

### 1. Mettre les fichiers sur GitHub

Crée un nouveau repo (ex. `cupping-secure`) et pousse tout le contenu du dossier. Si tu passes par l'interface GitHub, glisse simplement les fichiers en respectant l'arborescence ci-dessus.

### 2. Créer le site sur Netlify

Sur **app.netlify.com** → **Add new site** → **Import an existing project** → choisis ton repo. Netlify lit le `netlify.toml`, donc rien à configurer côté build.

### 3. Configurer les deux variables d'environnement

Dans **Site configuration → Environment variables**, ajoute :

| Variable | Valeur |
|---|---|
| `CUPPING_PASSWORD` | le mot de passe partagé que tu choisis (ex. `cafe-qualite-2026`) |
| `SESSION_SECRET` | une clé aléatoire de 32+ caractères (voir ci-dessous) |

Pour générer un `SESSION_SECRET` solide, lance dans un terminal :

```bash
node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"
```

> Exemple de sortie (génère **la tienne**, ne réutilise pas celle-ci) :
> `phNWMdm553xxIucKkddE6+Jt0Hc/13MDsvUBHFXDKAw=`

Le `SESSION_SECRET` sert à signer les cookies. Garde-le secret. Si tu le changes plus tard, tout le monde devra se reconnecter (sans perte de données).

### 4. Déployer

Lance le déploiement (ou re-déploie après avoir ajouté les variables, pour qu'elles soient prises en compte). Ton outil est en ligne à l'URL Netlify du site.

### 5. Utiliser

Ouvre l'URL sur ton PC ou ton téléphone, entre le mot de passe partagé. La session reste active ~30 jours par appareil (bouton 🔒 pour se déconnecter). Toutes les fiches sont communes : une fiche saisie sur le PC apparaît sur le téléphone après rechargement.

---

## Tester en local (optionnel)

Les fonctions et les Blobs nécessitent le runtime Netlify :

```bash
npm install
npx netlify dev
```

Définis les variables en local dans un fichier `.env` (déjà ignoré par git) :

```
CUPPING_PASSWORD=cafe-qualite-2026
SESSION_SECRET=une-cle-de-test-de-32-caracteres-minimum
```

En local, le store Blobs est un bac à sable séparé de la prod — tes fiches de test ne touchent pas la vraie base.

---

## Notes

- **Changer le mot de passe** : modifie `CUPPING_PASSWORD` dans les variables Netlify et redéploie. Aucune fiche n'est perdue.
- **Sauvegarde** : le bouton « Exporter Excel » reste ta sauvegarde hors-ligne. Exporte de temps en temps.
- **Sécurité du mot de passe partagé** : un seul secret pour toute l'équipe, sans comptes individuels. Si quelqu'un quitte l'équipe, change le mot de passe.
- **Migration depuis l'ancienne version** : les fiches stockées dans le `cupping.html` local (localStorage) ne sont pas reprises automatiquement. Dis-moi si tu veux un bouton d'import.
