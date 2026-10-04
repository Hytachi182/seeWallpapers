# Plan : choisir un screen différent sur chaque écran

Date : 4 octobre 2026
Statut : implémentation partielle livrée, dont le parcours simplifié de sélection des écrans. La recette physique et la réconciliation automatique des changements d'affichage restent à réaliser.

### Livraison du parcours simplifié — 4 octobre 2026

- Galerie : aperçu réel du screener, action principale **Installer sur mes écrans**, sélection de plusieurs moniteurs par cases à cocher et modes globaux sous **Options pour tous les écrans**.
- Vue **Écrans** : disposition physique, numéro propre à l'application, résolution, affectation active ou enregistrée, choix d'un screener, installation et retrait ciblés. Le retrait est désactivé en mode étendu, avec une indication pour revenir au mode indépendant.
- Identification : repères temporaires pendant trois secondes, placés avec les coordonnées natives des moniteurs. La correspondance visuelle sur des moniteurs à DPI différents reste à valider physiquement.
- Sauvegarde : correction des transitions clone → remplacement/retrait local pour conserver les affectations des autres écrans au redémarrage.
- Validation : build sans erreur ; 16 tests réussis, dont 4 tests du service d'affectation et 1 test WPF du choix des cibles. Rendus WPF vérifiés dans `build/visual-review/screen-*.png` ; aucune application réelle de screener sur les moniteurs n'a été exécutée pendant cette validation.
- Distribution Release : `dist/screen-selection/win-x64/SeeWallpaper.App.exe`. `dist/latest` était utilisé par l'application ouverte et n'a pas été remplacé.

Les états initiaux et les cases ci-dessous constituent le plan détaillé d'origine ; ils ne doivent pas être interprétés comme une validation de toutes les fonctions prévues. L'interface se rafraîchit lors des événements Windows, mais le moteur ne réconcilie pas encore automatiquement branchements, résolutions et DPI.

### Correction WorkerW — 4 octobre 2026

La machine expose `WorkerW` comme enfant de `Progman` sur Windows build 26300. La recherche initiale ne considérait que les fenêtres de premier niveau. Le moteur prend désormais en charge les deux dispositions, vérifie les appels Win32 et confirme l'attachement avant de signaler le succès. Les 17 tests passent avec la vérification native activée ; l'attachement et les dimensions sont vérifiés sur les trois moniteurs. Un processus WPF/WebView2 a également appliqué Digital Rain 3D sur le principal (3440 × 1440), puis retiré son instance temporaire sans modifier les affectations sauvegardées. La recette complète de la section 7 reste à effectuer.

## 1. Objectif

Permettre de choisir indépendamment le contenu animé (« screen », scène ou template) affiché sur chaque moniteur Windows, quel que soit le nombre d'écrans connectés.

Exemple attendu :

| Écran physique | Screen choisi |
| --- | --- |
| Écran 1, principal | Digital Rain 3D |
| Écran 2 | Sakura Night |
| Écran 3 | Operations Center |
| Écran 4 et suivants | Un autre screen au choix |

Changer le screen de l'écran 2 doit conserver les contenus et les instances des écrans 1 et 3. Le même screen peut aussi être choisi sur plusieurs écrans.

## 2. État actuel vérifié dans le code

- `src/SeeWallpaper.App/ApplyModeWindow.cs` propose déjà un écran cible et les modes `SingleDisplay`, `Clone` et `Span`. Les libellés actuels utilisent les noms techniques Windows.
- `MainWindow.xaml.cs`, dans `Apply_Click`, appelle déjà `ApplyAsync` pour l'écran sélectionné. Des affectations différentes sont donc possibles par applications successives pendant la session.
- `DesktopWallpaperHost` conserve les fenêtres dans un dictionnaire indexé par `DisplayId`. `ApplyAsync` remplace seulement la fenêtre correspondant à cet identifiant.
- `ApplyAssignmentsAsync` appelle cependant `StopCore()` avant de recréer les fenêtres : cette méthode ne convient pas à une modification indépendante d'un écran.
- Le mode étendu utilise la clé spéciale `span`. Appliquer ensuite un screen à un seul écran ne supprime actuellement pas cette instance étendue : la transition doit être définie et corrigée.
- `IWallpaperHost` n'expose ni l'état des affectations ni un arrêt par écran ; les opérations clone et étendu sont accessibles sur la classe concrète.
- `DisplayInfo` fournit identifiant, nom, résolution et statut principal. `WindowsDisplayManager` utilise actuellement `Screen.DeviceName`, sans identité matérielle persistante ni positions exposées dans ce contrat.
- Il n'existe pas de sauvegarde/restauration des affectations par écran. Les paramètres sont enregistrés par template via `TemplateSettingsStore`.
- `WebWallpaperWindow` initialise WebView2 dans un événement `Loaded` asynchrone. Le retour de `ApplyAsync` ne prouve pas que la navigation et l'attachement au bureau ont réussi.

## 3. Parcours utilisateur prévu

### Depuis la galerie

1. Choisir un screen et cliquer sur **Apply**.
2. Afficher les écrans disponibles avec numéro, nom lisible, résolution, badge principal et screen actuellement affecté.
3. Sélectionner la cible : **Écran 1**, **Écran 2**, **Écran 3**, etc.
4. Cliquer sur **Appliquer à cet écran**.
5. Afficher le résultat précis, par exemple « Sakura Night appliqué à l'écran 2 », après confirmation du moteur.

### Depuis une vue de gestion des écrans

Ajouter une entrée dédiée dans la navigation, avec des libellés cohérents avec la langue actuelle de l'application.

- Une carte par écran, générée dynamiquement, sans limite codée à trois écrans.
- Une représentation de la disposition physique des moniteurs.
- Numéro, nom, résolution et indicateur principal.
- Aperçu et nom du screen actif, ou état « Aucun screen ».
- Actions **Choisir un screen**, **Remplacer** et **Retirer de cet écran**.
- Action **Identifier les écrans**, affichant brièvement leur numéro sur les moniteurs physiques.
- Accès aux modes existants **Même screen sur tous les écrans** et **Étendre sur tous les écrans**.
- Affichage d'un état en cours et d'une erreur sur la carte concernée ; conserver les actions utilisables sur les autres écrans.

La première version applique les changements écran par écran. Un bouton d'application groupée n'est pas nécessaire pour répondre à la demande.

## 4. Règles de fonctionnement

| Action | Comportement attendu |
| --- | --- |
| Appliquer A à l'écran 1, B au 2, C au 3 | Trois instances indépendantes et trois affectations enregistrées |
| Remplacer B par D sur l'écran 2 | Seule l'instance de l'écran 2 change |
| Retirer le screen de l'écran 2 | Fermer uniquement cette instance ; laisser apparaître le fond Windows sous-jacent |
| Appliquer le même screen à deux écrans | Deux instances distinctes autorisées |
| Passer au mode clone | Remplacer les affectations actives par le screen choisi sur tous les écrans connectés |
| Modifier un écran après un clone | Passer en mode indépendant en conservant le screen des autres écrans |
| Passer au mode étendu | Fermer les instances indépendantes après préparation réussie de l'instance couvrant le bureau virtuel |
| Appliquer à un écran depuis le mode étendu | Quitter l'étendu ; réutiliser son screen sur les autres écrans connectés et appliquer le nouveau screen à la cible |
| Redémarrer l'application | Restaurer les choix valides sur les écrans identifiés |
| Débrancher un écran | Arrêter son instance et conserver son affectation comme déconnectée |
| Rebrancher un écran reconnu | Restaurer son screen, avec les dimensions actuelles |
| Connecter un écran inconnu | En mode indépendant : aucune affectation automatique ; en clone/étendu : recalculer selon le mode actif |

Afficher clairement la conséquence d'une transition globale dans le dialogue. Les autres changements restent locaux à l'écran choisi.

Les paramètres de personnalisation restent partagés par template pour cette première version. Des réglages différents du même template selon l'écran constituent une évolution séparée. Une instance chargée reçoit les paramètres validés du template lors de son application.

## 5. Identité des écrans et stockage

Séparer trois notions : numéro affiché à l'utilisateur, identifiant Windows de la session et identité persistante du moniteur. Ne pas sauvegarder les choix uniquement selon l'ordre de `Screen.AllScreens`.

- Enrichir `DisplayInfo` avec position, informations nécessaires à l'identification et clé persistante lorsqu'elle est disponible.
- Étudier l'identité fournie par Windows et son comportement avec stations d'accueil, écrans identiques et changements de port. Ne pas promettre que `DeviceName` reste stable.
- Employer une correspondance prudente : identité persistante fiable, puis correspondance non ambiguë documentée. En cas d'ambiguïté, demander une nouvelle affectation au lieu d'appliquer sur un autre écran.
- Le numéro montré dans la vue doit correspondre au numéro montré par l'action d'identification. Si la numérotation Windows ne peut pas être reproduite, annoncer explicitement une numérotation propre à l'application.
- Recalculer les coordonnées et dimensions au moment d'appliquer ; les anciennes coordonnées ne sont pas une référence persistante.

Ajouter un `WallpaperAssignmentsStore` dans Infrastructure, avec un fichier versionné :

`%LocalAppData%\seeWallpaper\configuration\wallpaper-assignments.json`

Le contrat persistant contiendra : version du schéma, mode global (`Independent`, `Clone`, `Span`), référence du template global pour clone/étendu et liste des associations identité d'écran → identifiant de template pour le mode indépendant. Les écrans déconnectés restent dans cette liste. Les états « chargement », « actif » et « erreur » appartiennent au runtime.

Résoudre les templates via le catalogue installé, sans enregistrer un objet `InstalledTemplate`, une fenêtre ou un chemin absolu comme référence métier. Prévoir écriture atomique, sérialisation des sauvegardes concurrentes et récupération explicite d'un fichier invalide sans bloquer la galerie.

Enregistrer une nouvelle affectation après succès confirmé du moteur. En cas d'échec de sauvegarde après application, indiquer que le screen est actif mais que le choix n'a pas pu être sauvegardé, avec possibilité de réessayer.

## 6. Étapes d'implémentation

### Étape 1 — Contrats et détection

- [ ] Définir le modèle d'affectation persistante et l'état runtime par écran.
- [ ] Enrichir `DisplayInfo` et `WindowsDisplayManager` avec disposition et identité.
- [ ] Centraliser la correspondance entre écran physique, clé persistante et identifiant runtime.
- [ ] Exposer un service de détection remplaçable en test.

### Étape 2 — Moteur indépendant et transitions

- [ ] Étendre `IWallpaperHost` avec opérations par écran, lecture des états et modes globaux.
- [ ] Ajouter un arrêt ciblé, sans appeler `StopCore()`.
- [ ] Réserver explicitement `ApplyAssignmentsAsync` aux remplacements globaux, ou refactorer en réconciliation des seules affectations modifiées.
- [ ] Exposer depuis `WebWallpaperWindow` un résultat asynchrone couvrant initialisation WebView2, navigation réussie et attachement au bureau.
- [ ] Préparer un nouveau contenu avant de retirer l'ancien ; en cas d'échec, fermer la nouvelle fenêtre et préserver le contenu précédent autant que possible.
- [ ] Faire remonter les erreurs au service/UI ; supprimer les entrées runtime des fenêtres fermées.
- [ ] Sérialiser les changements concurrents et gérer fermeture/annulation pendant un chargement.
- [ ] Implémenter toutes les transitions du tableau, y compris la suppression de l'instance `span`.
- [ ] Conserver pause de session, politiques batterie/plein écran et profil FPS pour chaque nouvelle instance.
- [ ] Journaliser écran, template, mode, résultat et erreur.

### Étape 3 — Sauvegarde et restauration

- [ ] Créer `WallpaperAssignmentsStore` et le service orchestrant validation, application et sauvegarde.
- [ ] Au chargement de `MainWindow`, restaurer après découverte des templates et application du profil de performance/pause.
- [ ] Sans fichier existant, démarrer sans affectation sauvegardée : aucune migration manuelle requise.
- [ ] Isoler les erreurs par écran ; un template absent ne doit pas empêcher les autres restaurations.
- [ ] Afficher les références manquantes et proposer de choisir un remplacement.
- [ ] Lors de la désinstallation d'un template affecté, montrer les écrans concernés et nettoyer ses références après confirmation de désinstallation.

### Étape 4 — Interface d'affectation

- [ ] Ajouter la vue des écrans à `MainWindow.xaml` et un modèle de carte dédié.
- [ ] Faire évoluer `ApplyModeWindow` pour afficher les cibles et leurs affectations.
- [ ] Ajouter identification temporaire, sélection de template et retrait ciblé.
- [ ] Montrer les modes globaux et leurs conséquences avec des noms lisibles.
- [ ] Rafraîchir les cartes après succès, échec et changement de topologie.
- [ ] Préserver navigation clavier, focus visible et défilement pour un grand nombre d'écrans.

### Étape 5 — Changements de configuration Windows

- [ ] Écouter les changements d'affichage ; regrouper les événements rapprochés et traiter sur le Dispatcher WPF.
- [ ] Réconcilier branchements, débranchements, changement d'écran principal, résolution, rotation et mise à l'échelle.
- [ ] Repositionner les fenêtres affectées ; traiter les coordonnées négatives du bureau virtuel.
- [ ] Conserver une référence déconnectée sans la réattribuer à un moniteur inconnu.
- [ ] Désabonner les événements et libérer proprement les fenêtres à la fermeture.

### Étape 6 — Validation et documentation

- [ ] Tester stockage, correspondance d'écrans et service d'affectation avec catalogue/détection/hôte simulés.
- [ ] Tester que remplacer ou retirer sur l'écran 2 ne déclenche aucun arrêt ni rechargement des écrans 1 et 3.
- [ ] Tester transitions clone/indépendant/étendu, restauration partielle, doublons d'identité et écran disparu pendant une application.
- [ ] Tester échec de chargement, échec de sauvegarde, fichier invalide et fermeture pendant chargement.
- [ ] Exécuter `dotnet build seeWallpaper.sln` et `dotnet test seeWallpaper.sln`.
- [ ] Effectuer la recette physique ci-dessous ; les tests simulés ne valident pas l'attachement Windows/WebView2.
- [ ] Mettre à jour `README.md` et `docs/wallpaper-engine.md` avec les fonctionnalités effectivement livrées.
- [ ] Régénérer `dist/latest` avec `build/publish-latest.ps1` après validation de l'implémentation.

## 7. Recette sur plusieurs écrans physiques

1. Avec trois écrans, utiliser **Identifier** et vérifier la correspondance des cartes.
2. Affecter Digital Rain 3D au 1, Sakura Night au 2 et Operations Center au 3.
3. Remplacer uniquement le 2 par Rainy Window ; vérifier que les animations des 1 et 3 continuent sans redémarrage.
4. Retirer le screen du 2 ; vérifier que les 1 et 3 restent actifs.
5. Affecter le même screen aux 1 et 2 ; vérifier les deux instances.
6. Relancer l'application ; vérifier la restauration des choix, puis tester un template devenu indisponible.
7. Débrancher/rebrancher le 3 ; vérifier qu'aucun autre écran ne récupère son contenu.
8. Tester un quatrième écran, un moniteur portrait, des DPI différents et un écran placé à gauche du principal.
9. Tester clone → indépendant, indépendant → étendu et étendu → écran unique selon les règles prévues.
10. Verrouiller/déverrouiller la session et changer le profil FPS ; vérifier chaque instance.
11. Provoquer un échec de chargement sur une cible ; vérifier l'erreur et la conservation des autres contenus.

## 8. Critères de fin

- [ ] L'utilisateur peut choisir A sur l'écran 1, B sur le 2, C sur le 3 et continuer pour N écrans.
- [ ] Une modification locale conserve les instances des autres écrans.
- [ ] La vue indique les affectations actives, les erreurs et les écrans déconnectés.
- [ ] Les choix sont restaurés sans dépendre de l'ordre d'énumération des moniteurs.
- [ ] Les modes clone et étendu restent utilisables sans chevauchement résiduel.
- [ ] Le succès affiché correspond à un chargement et un attachement réussis.
- [ ] Build, tests et recette multi-écrans sont documentés avec leurs résultats réels.

La livraison devra distinguer explicitement : code implémenté, tests automatisés réussis, recette Windows effectuée et distribution régénérée. La création de ce plan ne coche aucune de ces validations.
