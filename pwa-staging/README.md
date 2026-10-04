# Préparation PWA hors ligne

Ce dossier est volontairement isolé du build Expo/Android. Il ne doit être intégré à l’export web qu’après validation de l’APK en cours.

## Contenu

- `manifest.webmanifest` : installation sur mobile et ordinateur.
- `service-worker.js` : shell hors ligne, cache dynamique et téléchargement de packs.
- `offline-packs.json` : catalogue généré des packs audio. Les packs d’illustrations sont ajoutés dans l’export final avec leurs URL Metro.
- `.htaccess` : routes React, MIME, compression et cache pour LWS/cPanel.

## Génération du catalogue

La commande légère ne lit que les tailles :

```bash
node scripts/generate-pwa-pack-catalog.mjs
```

Pour calculer ultérieurement les empreintes SHA-256 :

```bash
node scripts/generate-pwa-pack-catalog.mjs --hash
```

## Intégration après l’APK

1. Exporter la version web statique.
2. Préparer automatiquement l’export avec `node scripts/prepare-pwa-dist.mjs dist`.
3. Enregistrer le Service Worker uniquement sur Web.
4. Ajouter la page « Contenu hors ligne » et connecter ses actions aux messages `DOWNLOAD_PACK`, `DELETE_PACK` et `GET_PACK_STATUS`.
5. Demander `navigator.storage.persist()` après une action explicite de l’utilisateur.
6. Tester avec HTTPS, puis en mode avion.
7. Copier l’export final dans `public_html` sur LWS.

Le script de préparation copie aussi les fichiers audio originaux vers `dist/assets/audio`. Cette étape est nécessaire car Metro renomme normalement les assets, alors que le catalogue des packs utilise des URL stables et versionnables.

Ne jamais mettre l’APK dans le dépôt Git. Il doit être publié comme fichier de release GitHub ou dans un dossier de téléchargement LWS.

## Quiz et téléchargements hors ligne

Les mises à jour restent en attente jusqu’à une activation explicite depuis l’application. Le script d’enregistrement ne doit ni envoyer automatiquement `SKIP_WAITING`, ni recharger la page sur `controllerchange` : cela interrompait les quiz dont l’état était seulement en mémoire. La session Web est désormais enregistrée dans `sessionStorage` à chaque action (sujet, réponses, question courante, validations et résultat), puis restaurée avant d’afficher les écrans.

Le serveur de production compresse aussi certains audios avec Brotli : `Content-Length` indique alors la taille du transfert compressé, différente du fichier original. Les téléchargements vérifient la taille du corps décompressé et son SHA-256, y compris lors d’une reprise. Les erreurs peuvent être relancées avec le bouton Télécharger.

La préparation de l’export ajoute deux packs d’illustrations (`images-course` et `images-questions`). Leurs fichiers sont servis depuis le cache des packs. Le précache garde les ressources essentielles (code, polices, SQLite/WASM) ; les images et les audios sont installés à la demande. Les audios en cache répondent aux requêtes Range pour la lecture Safari.

Validation : `npm run check`, `npm run build:pwa`, puis vérifier une réponse cochée et une question déjà validée après rechargement, télécharger les deux packs d’illustrations et tester en mode avion sur iPhone. Un premier rechargement manuel après déploiement récupère le nouveau script d’enregistrement ; une page déjà ouverte avec l’ancien script conserve son ancien comportement jusqu’à son rechargement.
