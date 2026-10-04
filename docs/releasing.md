# Publier une version

Les binaires sont distribués via GitHub Releases ; `dist/` et les caches de build restent hors de l'historique Git.

1. Mettre à jour `Version` dans `src/SeeWallpaper.App/SeeWallpaper.App.csproj` et le changelog.
2. Ajouter les notes dans `docs/releases/vX.Y.Z.md`.
3. Construire et tester sur Windows, puis publier le commit sur le dépôt.
4. Créer et pousser un tag correspondant exactement à la version :

```powershell
git tag -a vX.Y.Z -m 'seeWallpaper X.Y.Z'
git push origin vX.Y.Z
```

Le workflow **Windows release** vérifie le tag, construit et teste l'app, produit l'installeur et le ZIP, exécute leurs contrôles puis publie la release. Le job de publication ne démarre qu'après réussite du packaging. Les noms d'assets restent fixes pour les liens du README :

- `seeWallpaper-Setup-x64.exe`
- `seeWallpaper-Portable-x64.zip`
- `SHA256SUMS.txt`

Les liens `releases/latest/download/...` suivent la dernière release stable. Ne pas publier une version de test comme stable. Un lancement manuel du workflow produit uniquement un artefact conservé 30 jours.

## Vérification locale

```powershell
dotnet test seeWallpaper.sln
.\build\build-installer.ps1
.\build\test-installer.ps1
.\build\build-portable.ps1
.\build\test-portable.ps1
.\build\prepare-release.ps1
```

Les scripts de test de l'installeur refusent de remplacer une installation ou une intégration personnelle existante. Les tests du bureau réel et des moniteurs demandent un poste interactif ; ils restent distincts des contrôles CI.

Les notes de release doivent indiquer les limites matérielles ou validations manquantes. La signature éditeur nécessite un certificat appartenant au propriétaire ; les fichiers actuels sont distribués sans cette signature.
