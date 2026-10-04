<p align="center">
  <img src="seewallpaper.png" alt="Logo seeWallpaper" width="112" />
</p>
<h1 align="center">seeWallpaper</h1>
<p align="center"><strong>Des scènes animées. Vos écrans. Votre ambiance.</strong><br />Une application Windows créée par <strong>Michael Ruffenach</strong>.</p>
<p align="center">
  <a href="https://github.com/Hytachi182/seeWallpapers/actions/workflows/ci.yml"><img src="https://github.com/Hytachi182/seeWallpapers/actions/workflows/ci.yml/badge.svg" alt="Tests Windows" /></a>
  <a href="https://github.com/Hytachi182/seeWallpapers/releases/latest"><img src="https://img.shields.io/github/v/release/Hytachi182/seeWallpapers?style=flat-square&amp;color=8b7cff" alt="Dernière version" /></a>
  <a href="https://github.com/Hytachi182/seeWallpapers/releases"><img src="https://img.shields.io/github/downloads/Hytachi182/seeWallpapers/total?style=flat-square&amp;color=38bdf8" alt="Téléchargements" /></a>
  <a href="LICENSE"><img src="https://img.shields.io/badge/licence-MIT-22c55e?style=flat-square" alt="Licence MIT" /></a>
  <img src="https://img.shields.io/badge/Windows-10%20%2F%2011-0078d4?style=flat-square" alt="Windows 10 et 11" />
  <a href="https://github.com/Hytachi182/seeWallpapers/stargazers"><img src="https://img.shields.io/github/stars/Hytachi182/seeWallpapers?style=flat-square" alt="Étoiles GitHub" /></a>
</p>
<p align="center">
  <a href="https://github.com/Hytachi182/seeWallpapers/releases/latest/download/seeWallpaper-Setup-x64.exe"><img src="https://img.shields.io/badge/Télécharger-Installeur%20Windows-8b7cff?style=for-the-badge&amp;logo=windows" alt="Télécharger l'installeur Windows" /></a>
  <a href="https://github.com/Hytachi182/seeWallpapers/releases/latest/download/seeWallpaper-Portable-x64.zip"><img src="https://img.shields.io/badge/Télécharger-ZIP%20portable-292e40?style=for-the-badge" alt="Télécharger le ZIP portable" /></a>
</p>
<p align="center">
  <a href="#démarrer">Démarrer</a> · <a href="#fonctionnalités">Fonctionnalités</a> · <a href="#les-scènes">Aperçus</a> · <a href="docs/template-format.md">SDK</a> · <a href="CHANGELOG.md">Changelog</a> · <a href="https://github.com/Hytachi182/seeWallpapers/issues/new/choose">Signaler un problème</a>
</p>

![Galerie seeWallpaper avec aperçus et installation par écran](docs/images/gallery.png)

## Démarrer

Les téléchargements ci-dessus pointent toujours vers la **dernière release stable**, sans compte GitHub. Retrouvez toutes les versions et leurs empreintes dans les [Releases](https://github.com/Hytachi182/seeWallpapers/releases).

| Distribution | Pour qui ? | Démarrage |
| --- | --- | --- |
| **[Installeur Windows](https://github.com/Hytachi182/seeWallpapers/releases/latest/download/seeWallpaper-Setup-x64.exe)** | Une installation avec raccourcis et intégration Windows | Ouvrir l'EXE, choisir les options et lancer l'app. |
| **[ZIP portable](https://github.com/Hytachi182/seeWallpapers/releases/latest/download/seeWallpaper-Portable-x64.zip)** | Un lancement après extraction | **Extraire tout**, puis ouvrir **Lancer seeWallpaper.cmd** dans le dossier extrait. |
| **[Empreintes SHA-256](https://github.com/Hytachi182/seeWallpapers/releases/latest/download/SHA256SUMS.txt)** | Vérifier les fichiers téléchargés | Comparer l'empreinte avec `Get-FileHash -Algorithm SHA256`. |

**Configuration :** Windows 10 version 2004 ou ultérieure, ou Windows 11, en 64 bits. .NET est inclus. Le lanceur ZIP et l'installeur vérifient WebView2 ; son installation initiale nécessite Internet s'il est absent. Les scènes intégrées fonctionnent ensuite hors ligne.

**Mise à jour :** fermer l'ancienne application avant d'installer ou d'extraire la nouvelle version. Les scènes personnelles et réglages restent dans `%LocalAppData%\seeWallpaper`, partagés entre les versions ZIP et installée.

> L'application et l'installeur ne sont pas encore signés avec un certificat éditeur. Téléchargez les fichiers depuis les Releases de ce dépôt. Le bootstrapper WebView2 inclus possède une signature Microsoft vérifiée lors du build.

[Guide de l'installeur](docs/windows-installer.md) · [Guide du ZIP](docs/windows-portable.md)

## Fonctionnalités

| | Disponible aujourd'hui |
| --- | --- |
| **Votre scène, votre écran** | Installer sur un ou plusieurs moniteurs, avec une scène différente par écran. |
| **Repères visuels** | Voir la disposition des moniteurs et identifier les écrans avant d'appliquer. |
| **Dupliquer ou étendre** | Utiliser le même screener partout ou l'étendre sur l'ensemble du bureau. |
| **Personnaliser** | Prévisualiser les scènes, adapter leurs réglages et conserver ses favoris. |
| **Partager** | Importer, exporter et dupliquer les packages `.seewall`. |
| **Régler les performances** | Choisir un profil et configurer la pause en plein écran ou sur batterie ; pause lors du verrouillage de session. |
| **Retrouver son bureau** | Restaurer les affectations sauvegardées au lancement. |
| **Intégration Windows** | Raccourcis, menu contextuel du Bureau, ouverture `.seewall`, démarrage à la connexion en option et désinstallation. |

<details>
<summary><strong>Voir la gestion des écrans</strong></summary>

![Gestion des écrans avec choix indépendant des scènes](docs/images/screens.png)

Choisir **Installer sur mes écrans**, cocher les moniteurs souhaités et cliquer sur **Installer**. La page **Écrans** permet aussi de choisir, remplacer ou retirer le screener d'un seul moniteur.

Les numéros sont ceux des repères affichés par l'application. Les modes **Dupliquer** et **Étendre** remplacent l'ensemble des instances. Installer sur un écran après une extension rétablit des affectations indépendantes.

</details>

## Les scènes

Treize screeners procéduraux sont inclus. Les images ci-dessous proviennent des scènes elles-mêmes.

| Aurora Borealis | Ocean Dusk |
| --- | --- |
| ![Aurores boréales et montagnes](templates/aurora-borealis/preview.jpg) | ![Vagues et lumière du soleil couchant](templates/ocean-dusk/preview.jpg) |
| Sakura Night | Event Horizon |
| ![Cerisiers et pétales sous la lune](templates/sakura-night/preview.jpg) | ![Trou noir et disque d'accrétion](templates/event-horizon/preview.jpg) |

Également inclus : **Moonlit Dunes**, **Firefly Grove**, **Spectral Forge**, **Digital Rain 3D**, **Data Tunnel**, **Rainy Window**, **AI Core**, **Neural Network** et **Operations Center**. Ce dernier affiche les mesures CPU, mémoire, batterie et temps de fonctionnement reçues du système.

[Découvrir les scènes et leurs outils de rendu](docs/template-artwork.md)

## Créer un screener

Une scène est un dossier autonome avec un `manifest.json`, une page HTML, ses ressources et un aperçu. Le SDK expose les réglages, les informations système documentées, la pause/reprise et le profil de performance. Les imports valident le manifeste, les chemins et les limites du package.

- [Format des templates et SDK](docs/template-format.md)
- [Moteur et intégration au bureau Windows](docs/wallpaper-engine.md)
- [Import, export et exemples](templates)

L'éditeur visuel de templates est prévu ; la création s'effectue actuellement à partir du SDK et des fichiers d'une scène.

## Développer

Prérequis : Windows et le SDK .NET 8. Inno Setup 6 est nécessaire pour construire l'installeur. Node.js et Playwright servent uniquement aux outils de génération/capture des scènes.

```powershell
git clone https://github.com/Hytachi182/seeWallpapers.git
cd seeWallpapers
dotnet restore seeWallpaper.sln
dotnet build seeWallpaper.sln
dotnet test seeWallpaper.sln
dotnet run --project src/SeeWallpaper.App
```

Pour produire les distributions :

```powershell
.\build\build-installer.ps1
.\build\build-portable.ps1
.\build\prepare-release.ps1
```

Le workflow **CI** construit et teste chaque push et pull request. **Windows release** construit et vérifie les deux distributions ; un tag `vX.Y.Z` correspondant à la version de l'app publie automatiquement les assets. Un lancement manuel produit des artefacts de build sans publication. [Procédure de release](docs/releasing.md).

<details>
<summary><strong>Architecture et validation</strong></summary>

| Projet | Rôle |
| --- | --- |
| `SeeWallpaper.App` | Interface WPF et composition de l'application |
| `SeeWallpaper.Core` | Contrats et modèles |
| `SeeWallpaper.TemplateEngine` | Catalogue, validation, bibliothèque et packages |
| `SeeWallpaper.Engine` | WebView2, fenêtres et cycle de vie des fonds |
| `SeeWallpaper.System` | Écrans et mesures système |
| `SeeWallpaper.Infrastructure` | Configuration locale et journaux |

La version 1.2.0 a passé localement **22 tests .NET**, **23 contrôles de l'installeur** et **28 contrôles du ZIP**. Le chargement réel a aussi été vérifié sur trois moniteurs, avec remplacement, duplication, extension et changement de contexte DPI. Les contrôles interactifs du bureau nécessitent `SEEWALLPAPER_DESKTOP_TEST=1` et ne s'exécutent pas sur les runners CI.

Limites connues : réconciliation automatique après déconnexion d'un écran encore prévue ; installation de WebView2 sur un Windows complètement dépourvu du runtime à valider sur une machine propre. Les performances GPU dépendent du matériel et du nombre de scènes actives.

</details>

## Participer

Une idée de scène ou une amélioration ? [Proposer une fonctionnalité](https://github.com/Hytachi182/seeWallpapers/issues/new/choose), [signaler un bug](https://github.com/Hytachi182/seeWallpapers/issues/new/choose) ou lire le [guide de contribution](CONTRIBUTING.md).

Si seeWallpaper vous plaît, une [étoile sur GitHub](https://github.com/Hytachi182/seeWallpapers/stargazers) aide à faire connaître le projet.

## Créateur et licence

**Conception et création : Michael Ruffenach.** Le crédit est également visible dans la page **À propos** de l'application.

Distribué sous [licence MIT](LICENSE). Les contributions sont les bienvenues dans le respect du [code de conduite](CODE_OF_CONDUCT.md). Pour une vulnérabilité, utiliser le [signalement privé](https://github.com/Hytachi182/seeWallpapers/security/advisories/new) et consulter la [politique de sécurité](SECURITY.md).
