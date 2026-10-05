# SVG des panneaux de questions

146 images inspectées et **146 SVG disponibles** : 126 fichiers récupérés précédemment, 18 compositions et 2 variantes simples adaptées. **Tous les fichiers ont été approuvés par vérification humaine le 5 octobre 2026 et intégrés.** Les 146 anciens WebP remplacés ont été supprimés ; les 84 autres illustrations WebP sont conservées.

Chaque `qNNNN.svg` correspond au `qNNNN.webp` du dossier `assets/questions`. Les 84 images présentes dans l’ancien dossier de tri des images sans panneau restent exclues. La typographie, les proportions et les nuances de couleur peuvent différer des anciennes images raster ; les panneaux, pictogrammes, sens des flèches et inscriptions sont comparés aux originaux.

## Vérification humaine

Ouvrir `../comparaison.html` dans un navigateur : les 146 paires sont disponibles ; les 20 nouvelles entrées sont marquées « nouveau » dans le sélecteur.

Les 18 compositions sont : `q0023`, `q0024`, `q0053`, `q0059`, `q0060`, `q0063`, `q0122`, `q0127`, `q0145`, `q0160`, `q0167`, `q0179`, `q0183`, `q0190`, `q0671`, `q0672`, `q0722`, `q0724`.

Deux variantes simples ont également été adaptées : `q0129` (balise J3, sans cotes techniques, couleurs plates et contours) et `q0725` (inscription 2,5t sur le panneau de charge maximale par essieu).

Après la première vérification humaine, un miroir horizontal avait été appliqué à `q0030`, `q0119` et `q0670` ; `q0057` avait été corrigé avec le B9g (cyclomoteurs) au lieu du B9h (motos). Ces corrections sont conservées.

Pour `q0167`, le panonceau visible dans le WebP est un carré noir avec deux fenêtres blanches : cette apparence a été reproduite par assemblage de rectangles issus d'un SVG téléchargé. Pour `q0179`, le panonceau sous l'interdiction de tourner à droite contient seulement « 6t » : aucun pictogramme de camion n'a été ajouté.

## Sources, licences et adaptations

`SOURCES.json` contient toutes les correspondances, les empreintes SHA-256 et les adaptations. `COMPOSITIONS.json` détaille les 20 assemblages/adaptations. Les SVG téléchargés utilisés comme éléments sont conservés **sans modification** dans `_composition_sources/`, avec leurs auteurs, leurs liens d'origine et leurs licences dans `_composition_sources/SOURCES.json`.

- [SIG974 — Des panneaux routiers pour QGIS](http://sig974.free.fr/?p=1520) : collection de Bertrand Bouteilles et Roulex_45, CC BY-SA 3.0. README original conservé dans `LICENSE-SIG974.txt`.
- Wikimedia Commons : auteur et licence propres à chaque élément indiqués dans les manifestes.
- Les nouvelles compositions/adaptations sont distribuées sous [CC BY-SA 4.0](https://creativecommons.org/licenses/by-sa/4.0/), en conservant les crédits et licences de leurs éléments. Les trois adaptations par miroir restent sous CC BY-SA 3.0.

Les panneaux et pictogrammes proviennent de SVG téléchargés. Les adaptations portent sur leur assemblage, les inscriptions, les dimensions des plaques, le recadrage de la balise et les couleurs de cette dernière ; aucun pictogramme complexe n'a été dessiné ou généré par IA. Les nouveaux textes utilisent Arial/Helvetica/sans-serif.

Pour reproduire les 20 compositions/adaptations, sans réseau ni accès à la base :

```sh
python3 assets/questions/_composition_sources/compose.py
```

Les références de la base SQLite embarquée et du manifeste des images ont été remplacées. Une migration applique également ces chemins aux bases déjà installées, sans effacer les données utilisateur. Les SVG sont désormais utilisés par l’application et inclus dans les exports natifs et le catalogue d’images hors ligne PWA. Le fichier de comparaison conserve les anciens WebP encodés dans la page ; ils ne sont plus des assets de l’application.
