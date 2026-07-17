# Préparation PWA hors ligne

Ce dossier est volontairement isolé du build Expo/Android. Il ne doit être intégré à l’export web qu’après validation de l’APK en cours.

## Contenu

- `manifest.webmanifest` : installation sur mobile et ordinateur.
- `service-worker.js` : shell hors ligne, cache dynamique et téléchargement de packs.
- `offline-packs.json` : catalogue généré des packs audio.
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
