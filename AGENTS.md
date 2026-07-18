# DH Prépa Permis Bénin — guide du projet

Ce dépôt contient une application universelle React Native / Expo, prioritairement Android, conçue pour fonctionner entièrement hors ligne. Avant toute modification liée à Expo, consulter la documentation correspondant exactement à Expo SDK 54 : <https://docs.expo.dev/versions/v54.0.0/>.

## Identité et versions

- Nom visible : `DH PREPA PERMIS BJ`
- Slug Expo : `dh-prepa-permis-benin`
- Package Android et bundle iOS : `com.dharvest.prepapermisbenin`
- Schéma d’URL : `dhprepapermisbenin`
- Version applicative : `1.0.0`
- Android `versionCode` : `1` (l’incrémenter avant chaque nouvelle publication Play Store)
- Expo SDK : 54
- React Native : 0.81.5
- React : 19.1.0
- Expo Router : 6
- Moteur JavaScript : Hermes
- Nouvelle architecture React Native : activée
- Projet EAS : `c22fe4c9-4078-41de-94b5-08f5ac4ab9fa`
- Propriétaire EAS : `ezechiel_def`
- Site/PWA : <https://permis.d-harvest.com>

La configuration publique se trouve dans `app.json`. Les profils de compilation EAS se trouvent dans `eas.json` : `apk` produit un APK installable et `production` produit un Android App Bundle pour Google Play.

## Fonctionnement de l’application

L’application embarque localement les cours, les illustrations, la base SQLite et les pistes audio. Elle propose notamment :

- des cours organisés en groupes et chapitres, avec suivi de lecture ;
- un dictionnaire contextuel affiché depuis les cours ;
- des sujets cohérents de 20 questions associés aux chapitres ;
- un examen blanc aléatoire de 20 questions ;
- les réponses simples et multiples, la correction détaillée et les questions ignorées ;
- un historique, les notes et la progression stockés sur l’appareil ;
- la lecture de pistes audio préenregistrées pour les cours, questions et options ;
- le fonctionnement sans connexion après installation.

Répertoires importants :

- `app/` : routes et écrans Expo Router ;
- `src/` : composants, services, logique métier, accès aux données et thème ;
- `assets/database/` : base SQLite embarquée ;
- `assets/course/` et `assets/questions/` : illustrations ;
- `assets/audio/courses/`, `assets/audio/questions/` et `assets/audio/options/` : audio embarqué ;
- `assets/images/` et `assets/branding/` : icônes, splash screen et identité visuelle ;
- `ForStore/` et `assets/play-store/` : éléments destinés à la fiche Google Play ;
- `scripts/` : génération audio, manifestes et paquet PWA ;
- `dist/` : artefacts locaux générés, à ne pas considérer comme sources ;
- `outputs/` dans le workspace Codex : copie finale livrable de l’APK.

Les couleurs globales doivent rester centralisées dans `src/theme/colors.cjs`. Ne pas introduire de couleurs de marque dispersées dans les écrans quand une variable de thème convient.

## Installation et développement

Prérequis locaux : Node.js/npm, Android Studio, Android SDK, JDK fourni par Android Studio et, pour les builds EAS, une session Expo authentifiée.

```bash
cd /Users/ezechiel/Projects/DHPrepaPermisBenin
npm install
npm start
```

Commandes courantes :

```bash
npm run android       # application Android de développement
npm run ios           # application iOS de développement
npm run web           # serveur web Expo
npm run check         # TypeScript + ESLint + tests
npm run doctor        # cohérence de l’environnement Expo
```

Toujours exécuter `npm run check` avant de produire un livrable Android.

## Générer un APK avec EAS

Cette commande utilise le profil `apk` de `eas.json` et produit un APK installable :

```bash
cd /Users/ezechiel/Projects/DHPrepaPermisBenin
npm run check
npx eas-cli build --platform android --profile apk
```

Équivalent déjà déclaré dans `package.json` :

```bash
npm run build:apk
```

Pour effectuer le même build EAS sur la machine locale :

```bash
npx eas-cli build --platform android --profile apk --local
```

## Générer un Android App Bundle (`.aab`)

Le format AAB est le livrable recommandé pour Google Play. Le profil `production` de `eas.json` définit `android.buildType: app-bundle` :

```bash
cd /Users/ezechiel/Projects/DHPrepaPermisBenin
npm run check
npx eas-cli build --platform android --profile production
```

Variante locale :

```bash
npx eas-cli build --platform android --profile production --local
```

Avant une nouvelle version Play Store, augmenter `expo.version` si nécessaire et obligatoirement `expo.android.versionCode` dans `app.json`. Ne jamais réutiliser un `versionCode` déjà envoyé à Google Play.

## Générer et signer manuellement l’APK local

Cette procédure reproduit le livrable local utilisé actuellement. Attention : `expo prebuild --clean` recrée entièrement `android/`. Toute modification native non représentée dans `app.json` ou dans un config plugin sera supprimée.

```bash
cd /Users/ezechiel/Projects/DHPrepaPermisBenin
npm run check
npx expo prebuild --platform android --clean --no-install

export JAVA_HOME='/Applications/Android Studio.app/Contents/jbr/Contents/Home'
export ANDROID_HOME='/Users/ezechiel/Library/Android/sdk'
export NODE_ENV=production

cd android
./gradlew assembleRelease --no-daemon
```

APK brut généré :

```text
/Users/ezechiel/Projects/DHPrepaPermisBenin/android/app/build/outputs/apk/release/app-release.apk
```

Le bloc `release` généré par Expo utilise actuellement la clé debug. Il faut donc réaligner et signer le fichier avec la clé de production avant de le distribuer. La clé est conservée ici :

```text
/Users/ezechiel/Projects/DHPrepaPermisBenin/credentials/android/dhp-prepa-permis-release.jks
```

- Alias : `dhp-prepa-permis`
- Mot de passe : trousseau macOS, service `DHPrepaPermisBenin Android keystore password`, compte `DHPrepaPermisBenin`
- Ne jamais écrire le mot de passe dans le dépôt, les scripts, les logs ou ce fichier.
- Ne jamais remplacer/perdre cette clé : une autre clé ne pourra pas mettre à jour l’application existante.

Commande complète de signature locale :

```bash
export JAVA_HOME='/Applications/Android Studio.app/Contents/jbr/Contents/Home'
BUILD_TOOLS='/Users/ezechiel/Library/Android/sdk/build-tools/36.0.0'
INPUT='/Users/ezechiel/Projects/DHPrepaPermisBenin/android/app/build/outputs/apk/release/app-release.apk'
KEYSTORE='/Users/ezechiel/Projects/DHPrepaPermisBenin/credentials/android/dhp-prepa-permis-release.jks'
FINAL='/Users/ezechiel/Projects/DHPrepaPermisBenin/dist/android/DHPrepaPermisBenin-1.0.0.apk'
STAMP=$(date +%Y%m%d%H%M%S)
ALIGNED="/tmp/dhprepa-${STAMP}-aligned.apk"
SIGNED="/tmp/dhprepa-${STAMP}-signed.apk"
PASS=$(security find-generic-password -a 'DHPrepaPermisBenin' -s 'DHPrepaPermisBenin Android keystore password' -w)

mkdir -p "$(dirname "$FINAL")"
"$BUILD_TOOLS/zipalign" -f -p 4 "$INPUT" "$ALIGNED"
"$BUILD_TOOLS/apksigner" sign \
  --ks "$KEYSTORE" \
  --ks-key-alias 'dhp-prepa-permis' \
  --ks-pass "pass:$PASS" \
  --key-pass "pass:$PASS" \
  --out "$SIGNED" "$ALIGNED"
cp -f "$SIGNED" "$FINAL"
"$BUILD_TOOLS/zipalign" -c -v 4 "$FINAL"
"$BUILD_TOOLS/apksigner" verify --verbose --print-certs "$FINAL"
shasum -a 256 "$FINAL"
unset PASS
```

La signature attendue utilise un certificat RSA 4096 bits ayant pour DN :

```text
CN=DH Prépa Permis Bénin, OU=Mobile, O=D-HARVEST, L=Cotonou, ST=Littoral, C=BJ
```

Son empreinte SHA-256 est :

```text
379beec2336be5f99bfe58e14ffa024d5c272bf3c086cad7c354a618934fa519
```

Une génération n’est terminée que si Gradle indique `BUILD SUCCESSFUL`, si `zipalign -c` réussit et si `apksigner verify` valide la signature v2/v3.

## PWA

La PWA et l’APK partagent le code, mais leurs livrables sont indépendants. La construction web prépare les manifestes audio et les fichiers nécessaires à SQLite/WASM :

```bash
npm run build:pwa
npm run serve:pwa
```

Le résultat de production se trouve dans `dist/`. Le serveur doit restituer les vrais fichiers `.wasm`, `.js`, SQLite et médias ; une réécriture générale de ces URLs vers `index.html` provoque notamment l’erreur WebAssembly « expected magic word … found <!DO » et une page blanche.

## Audio

Les pistes préenregistrées sont des ressources de l’application : elles augmentent fortement la taille du binaire, mais garantissent la disponibilité hors ligne. Commandes existantes :

```bash
npm run audio:manifest
npm run audio:openai:course
npm run audio:openai:quiz-sample
npm run audio:openai:quiz-all
```

La clé API OpenAI ne doit jamais être placée dans React Native, dans Git ou dans les assets. Les scripts de génération doivent la lire depuis l’environnement ou un stockage local sécurisé. Les pistes générées, elles, sont embarquées et ne nécessitent aucune API à l’exécution.

## Règles de modification et de vérification

- Préserver le fonctionnement entièrement hors ligne et ne pas ajouter de dépendance réseau au parcours principal.
- Préserver la compatibilité Android réelle : safe areas/barres système, bouton Retour, gestes tactiles et écrans de petite taille.
- Les boutons Retour et Fermer doivent utiliser Expo Router de façon sûre et prévoir une destination de repli quand l’historique est vide.
- Les réponses simples/multiples proviennent des données ; l’interface ne doit pas révéler inutilement le type attendu.
- Une option focalisée au clavier ne doit pas apparaître comme sélectionnée sur mobile.
- Après toute modification de la base ou des assets, vérifier leur inclusion dans le bundle natif et dans la PWA.
- Ne pas modifier ni supprimer les fichiers audio, SQLite ou illustrations en masse sans sauvegarde et contrôle des références.
- Ne jamais committer les secrets, mots de passe, clés API, keystores ou fichiers de credentials.
- Inspecter `git status` avant toute modification et préserver les changements utilisateur sans rapport avec la tâche.
- Pour un livrable : exécuter `npm run check`, construire, vérifier la signature, calculer le SHA-256 et communiquer le chemin, la taille et l’empreinte.
