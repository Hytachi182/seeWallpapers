# Version ZIP Windows

Créateur : **Michael Ruffenach**. La page **À propos** de l'app affiche ce crédit, la version issue de l'assembly et les fonctionnalités disponibles.

Livrable : `dist/portable/seeWallpaper-1.2.0-Portable-x64.zip`, accompagné de son empreinte SHA-256.

## Démarrage

1. Extraire tout le ZIP dans un dossier accessible en écriture.
2. Ouvrir le dossier `seeWallpaper-1.2.0-x64` extrait.
3. Double-cliquer sur **Lancer seeWallpaper.cmd**.

Le lanceur vérifie le runtime Microsoft WebView2 dans les vues du registre 32 et 64 bits, pour l'utilisateur et la machine. S'il manque, il vérifie la signature Microsoft du bootstrapper embarqué, puis l'exécute. Ce premier démarrage nécessite alors Internet. Avec WebView2 présent, `SeeWallpaper.App.exe` peut aussi être lancé directement.

Le runtime .NET est inclus. Les fichiers de l'archive doivent rester ensemble. La version ZIP ne crée pas d'intégrations Windows : pour les raccourcis, le menu contextuel, les associations et la désinstallation, utiliser [l'installeur](windows-installer.md).

## Réglages, mise à jour et retrait

Les réglages et scènes personnels restent dans `%LocalAppData%\seeWallpaper`, partagés avec la version installée. Ils ne suivent pas automatiquement le ZIP sur un autre compte Windows ou une clé USB. Fermer l'ancienne version avant de lancer la nouvelle ; le contrôle d'instance unique transmet sinon la commande au processus déjà ouvert.

Pour une mise à jour, extraire la nouvelle archive dans un nouveau dossier. Pour retirer la version ZIP, fermer l'app puis supprimer son dossier extrait. Les réglages et le runtime Microsoft partagé restent conservés.

## Construire et vérifier

```powershell
.\build\build-portable.ps1
.\build\test-portable.ps1
```

Le build publie Windows x64 autonome, embarque les treize templates, l'icône, la licence, le guide et le lanceur, puis produit l'archive avec un dossier racine et son empreinte. Le test extrait le ZIP dans un chemin contenant des espaces, vérifie les fichiers, templates, version, signature Microsoft et détection du runtime. Il n'ouvre pas l'app et ne modifie pas les intégrations Windows.

Validation locale de la version 1.2.0 : 28 contrôles ZIP réussis et 22 tests .NET réussis. La page À propos a été rendue aux dimensions 1240 × 750 et 980 × 600 ; son crédit, sa version, son défilement et le retour vers la galerie ont été vérifiés. Rapports et captures dans `build/visual-review`.

La branche d'installation de WebView2 sur une machine dépourvue du runtime reste à vérifier sur un Windows propre. L'exécutable seeWallpaper n'est pas signé avec un certificat éditeur.
