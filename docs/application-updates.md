# Application updates

The **Check update** button reads GitHub's latest stable published release rather than the version currently committed to `main`. A newer version is offered only when Windows assets and `SHA256SUMS.txt` are available.

For the installed edition, choose **Install and restart** to download the installer. The banner shows download progress and lets you cancel before installation. Downloads have a 15-minute deadline and are checked against the published SHA-256 checksum. Preparation or download failure leaves the running application intact and allows another attempt.

For portable and development builds, choose **Download on GitHub** to open the published portable ZIP directly in your browser (or the release page if no ZIP is available). Close the app before replacing its files manually. The banner offers this action immediately, without attempting an automatic installation or showing an official-edition error.

The application prepares an independent Windows PowerShell helper and waits for its readiness acknowledgement before quitting. The helper waits for the application process to exit, rechecks the package hash, installs the update and relaunches the app from the same directory. Existing wallpapers, assignments, rotation rules, language and settings remain in the separate user data directory.

- **Installed edition:** runs the official Inno Setup installer silently in the existing installation directory. The current Windows startup setting is passed explicitly; other installation tasks retain their previous selection. The helper uses `/NORESTART` so setup does not reboot Windows. See [Inno Setup command-line parameters](https://jrsoftware.org/ishelp/topic_setupcmdline.htm).
- **Portable edition:** the banner opens the official portable ZIP on GitHub for manual replacement. The internal portable update helper remains available and covered by integration tests, but the banner uses the browser download.
- **Development builds:** the banner also opens the GitHub portable download. It does not replace files in source build directories.

Preparation requires write access to the installation directory. The helper never forces termination of the running app; if it does not exit within two minutes, installation fails without replacing files. If installation fails after exit, a message points to the log and the helper attempts to reopen the application. Portable recovery is best effort when Windows keeps a destination locked; incomplete rollback is recorded in the log.

Logs and portable backups are retained under `%LocalAppData%\seeWallpaper\updates\<attempt-id>`. SHA-256 establishes consistency with the assets published in the official repository; it is not a publisher code-signing certificate. Enterprise policies may block the PowerShell helper, in which case the update reports failure rather than proceeding without it.

Validation commands:

```powershell
dotnet test tests/SeeWallpaper.App.Tests/SeeWallpaper.App.Tests.csproj --configuration Release --filter 'FullyQualifiedName~ApplicationUpdate'
./build/test-application-update.ps1
```

The helper integration tests use isolated temporary folders, synthetic portable files and a harmless executable that records installer arguments. Release acceptance must also exercise the full button-to-relaunch flow for an installed edition and an official portable edition, including restored wallpapers and startup preference preservation. Do not publish a claim of that live acceptance based only on unit or fixture tests.

Existing 1.5.0 and 1.6.0 binaries still have their original browser-based update button. Installing the first release containing this feature requires the existing manual installer or portable replacement once. Subsequent updates can use the new button.
