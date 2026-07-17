# DHP Prépa Permis Bénin

Application mobile React Native / Expo totalement hors ligne pour apprendre le Code de la route et préparer le permis au Bénin.

## Fonctionnalités

- cours illustré avec lecture vocale française ;
- 929 questions et 230 illustrations embarquées dans SQLite ;
- sujets par catégorie, par lots de 20 questions ;
- simulation d’examen aléatoire de 20 questions ;
- correction détaillée, historique et progression locale ;
- thème global dans `src/theme/colors.cjs`, partagé avec NativeWind ;
- aucune API distante et aucun compte nécessaire.

## Démarrage

```bash
npm install
npm start
```

Puis utiliser Expo Go ou lancer `npm run android`, `npm run ios` ou `npm run web`.

## Vérifications

```bash
npm run check
```

La première version utilise les voix françaises installées sur l’appareil grâce à `expo-speech`. Le service est isolé dans `src/services/tts.ts` pour permettre une future intégration native de Kokoro ONNX sans modifier les écrans.
