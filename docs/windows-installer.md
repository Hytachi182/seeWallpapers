# Installation Windows

La distribution Windows x64 est disponible dans `dist/installer/seeWallpaper-Setup-1.2.0-x64.exe`. Le fichier `.sha256` voisin contient son empreinte. Le runtime .NET 8 est embarqué : aucune installation séparée de .NET n'est nécessaire.

La page **À propos** affiche **Michael Ruffenach** comme créateur, ainsi que la version et les fonctionnalités disponibles. L'inscription Windows de l'application reprend ce nom comme éditeur. Une [version ZIP](windows-portable.md) est également disponible pour un lancement après extraction.

Validation 1.2.0 : 22 tests .NET réussis et 23 contrôles du cycle réel installation, changement d'options, mise à jour et désinstallation réussis. Le crédit éditeur Windows est inclus dans ces contrôles. Le ZIP passe 28 contrôles distincts ; les rapports figurent dans `build/visual-review`.

## Installation et intégration

L'installation française ou anglaise fonctionne pour l'utilisateur courant, sans demande de droits administrateur, dans `%LocalAppData%\Programs\seeWallpaper` par défaut. Le dossier cible peut être changé.

- Menu Démarrer : application, gestion des écrans et désinstallation.
- Raccourci Bureau, proposé par défaut.
- Menu contextuel du Bureau, proposé par défaut : **Personnaliser mes écrans avec seeWallpaper**, qui ouvre directement la vue **Écrans**.
- Association `.seewall`, proposée par défaut : double-clic pour importer un package. Les chemins contenant des espaces sont pris en charge. Une association préexistante n'est pas écrasée ; seeWallpaper est aussi enregistré dans **Ouvrir avec**.
- Démarrage à l'ouverture de session, facultatif et désactivé par défaut : restauration des choix enregistrés avec fenêtre minimisée.
- Entrée de désinstallation dans les applications Windows.

Le menu contextuel utilise l'intégration classique du shell. Sur Windows 11, les extensions classiques sont accessibles par **Afficher plus d'options**. L'intégration au premier niveau du nouveau menu via `IExplorerCommand` et identité de package n'est pas incluse. Voir la [documentation Microsoft](https://learn.microsoft.com/fr-fr/windows/apps/desktop/modernize/integrate-packaged-app-with-file-explorer).

L'image fournie `seewallpaper.png` est embarquée dans les fenêtres et l'en-tête. `build/generate-icon.ps1` en produit une icône Windows avec sept tailles, de 16 à 256 pixels, utilisée par l'exécutable, les raccourcis et l'installeur.

## WebView2

L'installeur vérifie le runtime Evergreen WebView2 dans les clés documentées pour l'utilisateur et la machine. S'il manque, il exécute le bootstrapper Microsoft signé inclus dans l'installeur. Ce cas nécessite Internet. Un échec bloque l'installation avec une indication pour réessayer ; un runtime déjà présent est conservé.

Le build vérifie la signature Microsoft du bootstrapper. La désinstallation de seeWallpaper ne retire pas ce runtime partagé. Voir la [documentation Microsoft de distribution WebView2](https://learn.microsoft.com/en-us/microsoft-edge/webview2/concepts/distribution).

## Mise à jour et désinstallation

L'identifiant d'application est stable entre versions. Un nouvel installeur met à jour l'installation existante ; Windows peut demander de fermer l'app pour remplacer les fichiers en cours d'utilisation. Désélectionner une option lors d'une mise à jour retire son intégration ou son raccourci.

La désinstallation retire fichiers du programme, raccourcis, menu contextuel, ProgID `.seewall`, démarrage automatique et entrée des applications Windows. Elle conserve `%LocalAppData%\seeWallpaper` : scènes personnelles, favoris, réglages et affectations. Une association `.seewall` qui ne désigne plus seeWallpaper est préservée.

Les commandes du shell utilisent une seule instance par utilisateur et session Windows. Une deuxième ouverture transmet sa commande à la fenêtre existante par un canal local réservé à l'utilisateur courant. Les packages sont importés après initialisation du catalogue, avec les mêmes validations que depuis l'interface.

## Construire et vérifier

Prérequis de développement : SDK .NET 8 et compilateur Inno Setup 6.

```powershell
.\build\build-installer.ps1
```

Le script génère l'icône, publie l'app autonome Windows x64 avec tous les templates, compile l'installeur et écrit son empreinte. Il lit la version depuis `SeeWallpaper.App.csproj`. Les outils peuvent être fournis explicitement :

```powershell
.\build\build-installer.ps1 -IsccPath 'C:\tools\Inno Setup 6\ISCC.exe' -WebViewBootstrapper 'C:\tools\MicrosoftEdgeWebview2Setup.exe'
```

Le test suivant vérifie installation, mises à jour avec options activées/désactivées et désinstallation dans un dossier temporaire contenant des espaces. Il crée temporairement les vrais raccourcis et clés utilisateur, puis les retire. Il refuse de remplacer une installation ou une intégration seeWallpaper déjà présente.

```powershell
.\build\test-installer.ps1
```

Le rapport est écrit dans `build/visual-review/installer-validation.txt`. Les journaux détaillés restent dans le dossier temporaire indiqué par le script.

Validation du 4 octobre 2026 : 22 tests .NET réussis avec le test natif du bureau activé ; les quatre nouvelles scènes passent les contrôles de rendu desktop/portrait, réglages et pause/reprise. Le cycle réel install ? options désactivées ? options réactivées ? désinstallation passe 22 contrôles, dont raccourcis, commandes citées, runtime embarqué et nettoyage des intégrations. L'extraction de l'icône native de l'exécutable réussit aussi.

Le lancement réel de l'exécutable autonome avec `--screens` atteint la vue **Mes écrans**. Un deuxième lancement transmet sa commande, sort avec le code 0 et laisse une seule instance de cette version. Le processus de test est ensuite fermé. Le rapport figure dans `build/visual-review/app-launch-validation.txt`.

Le workflow **Windows release** compile et teste l'app, construit et vérifie l'installeur et le ZIP, puis publie les téléchargements pour un tag de version. Un lancement manuel fournit des artefacts sans publication. Voir la [procédure de release](releasing.md).

## Distribution publique

### Correctif multi-écrans 1.1.1

L'erreur `0x8007139F` a été reproduite lors de la création du contrôleur WebView2 avec un profil déjà utilisé. Les processus locaux montraient des navigateurs démarrés avec des modes DPI différents. Le moteur utilise désormais un environnement partagé par template et mode DPI, dans `webview-v2`, et libère explicitement chaque contrôle WebView2 à la fermeture. Les réglages et affectations sauvegardés ne sont pas effacés.

Validation réelle : Sakura Night chargé simultanément sur les trois moniteurs, changement de contexte DPI système vers DPI par écran, remplacement sur un seul écran, duplication, extension puis duplication à nouveau. Tous les chargements et nombres d'instances attendus passent ; rapport `build/visual-review/multi-screen-validation.txt`.

Pour reproduire sur un poste Windows interactif avec au moins deux moniteurs (affiche temporairement les scènes puis ferme ses propres fenêtres, sans écrire les affectations) :

```powershell
dotnet build build/desktop-check/DesktopCheck.csproj
dotnet build/desktop-check/bin/Debug/net8.0-windows/DesktopCheck.dll sakura-night --dpi-transition
```

L'installeur et l'application ne sont pas signés avec un certificat éditeur. La signature reste à effectuer avec le certificat du propriétaire pour une publication signée. L'empreinte SHA-256 ne remplace pas une signature éditeur.

La branche d'installation sur une machine dépourvue de WebView2 reste à vérifier sur une machine Windows propre. La validation locale utilise le runtime existant ; aucun composant partagé n'a été supprimé pour simuler son absence.
