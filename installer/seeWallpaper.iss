#ifndef AppVersion
  #define AppVersion "1.4.0"
#endif
#ifndef PublishDir
  #define PublishDir "..\dist\installer-payload\win-x64"
#endif
#ifndef BootstrapperPath
  #define BootstrapperPath "..\build\cache\MicrosoftEdgeWebview2Setup.exe"
#endif

[Setup]
AppId={{385BAC45-067C-486E-A288-CC1BE0D4D072}
AppName=seeWallpaper
AppVersion={#AppVersion}
AppPublisher=Michael Ruffenach
DefaultDirName={localappdata}\Programs\seeWallpaper
DefaultGroupName=seeWallpaper
DisableProgramGroupPage=yes
PrivilegesRequired=lowest
ArchitecturesAllowed=x64compatible
ArchitecturesInstallIn64BitMode=x64compatible
MinVersion=10.0.19041
OutputDir=..\dist\installer
OutputBaseFilename=seeWallpaper-Setup-{#AppVersion}-x64
SetupIconFile=..\assets\seewallpaper.ico
UninstallDisplayIcon={app}\SeeWallpaper.App.exe
UninstallDisplayName=seeWallpaper
LicenseFile=..\LICENSE
Compression=lzma2
SolidCompression=yes
WizardStyle=modern
ChangesAssociations=yes
CloseApplications=yes
RestartApplications=no
VersionInfoVersion={#AppVersion}.0
VersionInfoDescription=seeWallpaper Windows installer

[Languages]
Name: "english"; MessagesFile: "compiler:Default.isl"

[CustomMessages]
english.DesktopIcon=Create a desktop shortcut
english.ContextMenu=Add seeWallpaper to the desktop context menu
english.FileAssociation=Open .seewall packages with seeWallpaper
english.Startup=Restore my live wallpapers when I sign in
english.Screens=Manage my displays
english.ContextLabel=Customize my displays with seeWallpaper
english.Launch=Launch seeWallpaper
english.Uninstall=Uninstall seeWallpaper
english.WebViewError=WebView2 could not be installed. Check your Internet connection and retry setup.

[Tasks]
Name: "desktopicon"; Description: "{cm:DesktopIcon}"
Name: "contextmenu"; Description: "{cm:ContextMenu}"
Name: "fileassociation"; Description: "{cm:FileAssociation}"
Name: "startup"; Description: "{cm:Startup}"; Flags: unchecked

[Files]
Source: "{#PublishDir}\*"; DestDir: "{app}"; Flags: ignoreversion recursesubdirs createallsubdirs
Source: "..\LICENSE"; DestDir: "{app}"; Flags: ignoreversion
Source: "{#BootstrapperPath}"; Flags: dontcopy

[Icons]
Name: "{autoprograms}\seeWallpaper\seeWallpaper"; Filename: "{app}\SeeWallpaper.App.exe"; AppUserModelID: "seeWallpaper.App"
Name: "{autoprograms}\seeWallpaper\{cm:Screens}"; Filename: "{app}\SeeWallpaper.App.exe"; Parameters: "--screens"; AppUserModelID: "seeWallpaper.App"
Name: "{autoprograms}\seeWallpaper\{cm:Uninstall}"; Filename: "{uninstallexe}"
Name: "{autodesktop}\seeWallpaper"; Filename: "{app}\SeeWallpaper.App.exe"; Tasks: desktopicon; AppUserModelID: "seeWallpaper.App"

[InstallDelete]
; Remove the previous French shortcut names when upgrading to the English edition.
Type: files; Name: "{autoprograms}\seeWallpaper\Gérer mes écrans.lnk"
Type: files; Name: "{autoprograms}\seeWallpaper\Désinstaller seeWallpaper.lnk"

[Registry]
Root: HKCU; Subkey: "Software\Classes\DesktopBackground\Shell\seeWallpaper"; ValueType: string; ValueName: ""; ValueData: "{cm:ContextLabel}"; Tasks: contextmenu; Flags: uninsdeletekey
Root: HKCU; Subkey: "Software\Classes\DesktopBackground\Shell\seeWallpaper"; ValueType: string; ValueName: "Icon"; ValueData: "{app}\SeeWallpaper.App.exe,0"; Tasks: contextmenu
Root: HKCU; Subkey: "Software\Classes\DesktopBackground\Shell\seeWallpaper\command"; ValueType: string; ValueName: ""; ValueData: """{app}\SeeWallpaper.App.exe"" --screens"; Tasks: contextmenu
Root: HKCU; Subkey: "Software\Classes\seeWallpaper.Template"; ValueType: string; ValueName: ""; ValueData: "seeWallpaper scene package"; Tasks: fileassociation; Flags: uninsdeletekey
Root: HKCU; Subkey: "Software\Classes\seeWallpaper.Template\DefaultIcon"; ValueType: string; ValueName: ""; ValueData: "{app}\SeeWallpaper.App.exe,0"; Tasks: fileassociation
Root: HKCU; Subkey: "Software\Classes\seeWallpaper.Template\shell\open\command"; ValueType: string; ValueName: ""; ValueData: """{app}\SeeWallpaper.App.exe"" --import ""%1"""; Tasks: fileassociation
Root: HKCU; Subkey: "Software\Classes\.seewall\OpenWithProgids"; ValueType: none; ValueName: "seeWallpaper.Template"; Tasks: fileassociation; Flags: uninsdeletevalue uninsdeletekeyifempty
Root: HKCU; Subkey: "Software\Classes\.seewall"; ValueType: string; ValueName: ""; ValueData: "seeWallpaper.Template"; Tasks: fileassociation; Flags: createvalueifdoesntexist
Root: HKCU; Subkey: "Software\Microsoft\Windows\CurrentVersion\Run"; ValueType: string; ValueName: "seeWallpaper"; ValueData: """{app}\SeeWallpaper.App.exe"" --minimized"; Tasks: startup; Flags: uninsdeletevalue

[Run]
Filename: "{app}\SeeWallpaper.App.exe"; Description: "{cm:Launch}"; Flags: nowait postinstall skipifsilent

[Code]
const
  WebViewKey = 'Software\Microsoft\EdgeUpdate\Clients\{F3017226-FE2A-4295-8BDF-00C3A9A7E4C5}';

function RuntimeVersionExists(Root: Integer): Boolean;
var
  Version: String;
begin
  Result := RegQueryStringValue(Root, WebViewKey, 'pv', Version) and (Version <> '') and (Version <> '0.0.0.0');
end;

function WebViewInstalled(): Boolean;
begin
  Result := RuntimeVersionExists(HKCU) or RuntimeVersionExists(HKLM32) or RuntimeVersionExists(HKLM64);
end;

function PrepareToInstall(var NeedsRestart: Boolean): String;
var
  ExitCode: Integer;
begin
  Result := '';
  if not WebViewInstalled() then begin
    ExtractTemporaryFile('MicrosoftEdgeWebview2Setup.exe');
    if not Exec(ExpandConstant('{tmp}\MicrosoftEdgeWebview2Setup.exe'), '/silent /install', '', SW_HIDE, ewWaitUntilTerminated, ExitCode) then begin
      Result := CustomMessage('WebViewError');
      Exit;
    end;
    if not WebViewInstalled() then Result := CustomMessage('WebViewError');
  end;
end;

procedure RemoveOwnAssociation();
var
  Association: String;
begin
  if RegQueryStringValue(HKCU, 'Software\Classes\.seewall', '', Association) and (Association = 'seeWallpaper.Template') then
    RegDeleteValue(HKCU, 'Software\Classes\.seewall', '');
  RegDeleteKeyIfEmpty(HKCU, 'Software\Classes\.seewall');
end;

var
  StartupWasEnabled: Boolean;
  StartupTaskSynced: Boolean;

{ The app can enable sign-in startup itself; keep that choice when updating. }
procedure InitializeWizard();
begin
  StartupWasEnabled := RegValueExists(HKCU, 'Software\Microsoft\Windows\CurrentVersion\Run', 'seeWallpaper');
end;

procedure CurPageChanged(CurPageID: Integer);
begin
  if (CurPageID = wpSelectTasks) and StartupWasEnabled and not StartupTaskSynced then begin
    WizardSelectTasks('startup');
    StartupTaskSynced := True;
  end;
end;

procedure CurStepChanged(CurStep: TSetupStep);
begin
  if CurStep = ssPostInstall then begin
    if not WizardIsTaskSelected('contextmenu') then
      RegDeleteKeyIncludingSubkeys(HKCU, 'Software\Classes\DesktopBackground\Shell\seeWallpaper');
    if not WizardIsTaskSelected('fileassociation') then begin
      RemoveOwnAssociation();
      RegDeleteValue(HKCU, 'Software\Classes\.seewall\OpenWithProgids', 'seeWallpaper.Template');
      RegDeleteKeyIfEmpty(HKCU, 'Software\Classes\.seewall\OpenWithProgids');
      RegDeleteKeyIfEmpty(HKCU, 'Software\Classes\.seewall');
      RegDeleteKeyIncludingSubkeys(HKCU, 'Software\Classes\seeWallpaper.Template');
    end;
    if not WizardIsTaskSelected('startup') and not (WizardSilent() and StartupWasEnabled) then
      RegDeleteValue(HKCU, 'Software\Microsoft\Windows\CurrentVersion\Run', 'seeWallpaper');
    if not WizardIsTaskSelected('desktopicon') then
      DeleteFile(ExpandConstant('{autodesktop}\seeWallpaper.lnk'));
  end;
end;

procedure CurUninstallStepChanged(CurUninstallStep: TUninstallStep);
begin
  if CurUninstallStep = usPostUninstall then RemoveOwnAssociation();
  { User scenes and settings are stored separately and preserved on uninstall. }
end;
