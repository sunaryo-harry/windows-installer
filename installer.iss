; =============================================================================
; Inno Setup 6 Script - Days WinInstaller Setup
; Compiles into: DaysWinInstaller-Setup.exe
; =============================================================================

#define MyAppName "Days WinInstaller"
#define MyAppVersion "1.0.0"
#define MyAppPublisher "sunaryo-harry"
#define MyAppURL "https://github.com/sunaryo-harry/windows-installer"

[Setup]
AppId={{D4A15B72-8C90-4F2E-9B11-7E4A6D2C9F01}
AppName={#MyAppName}
AppVersion={#MyAppVersion}
AppPublisher={#MyAppPublisher}
AppPublisherURL={#MyAppURL}
AppSupportURL={#MyAppURL}
AppUpdatesURL={#MyAppURL}
DefaultDirName={localappdata}\Programs\DaysWinInstaller
DefaultGroupName={#MyAppName}
AllowNoIcons=yes
OutputDir=dist-installer
OutputBaseFilename=DaysWinInstaller-Setup
Compression=lzma2/ultra64
SolidCompression=yes
WizardStyle=modern
PrivilegesRequired=lowest
DisableProgramGroupPage=yes

[Languages]
Name: "english"; MessagesFile: "compiler:Default.isl"

[Tasks]
Name: "desktopicon"; Description: "{cm:CreateDesktopIcon}"; GroupDescription: "{cm:AdditionalIcons}"

[Files]
Source: "dist\*"; DestDir: "{app}\dist"; Flags: ignoreversion recursesubdirs createallsubdirs
Source: "installer\server.ps1"; DestDir: "{app}"; Flags: ignoreversion
Source: "installer\launch.bat"; DestDir: "{app}"; Flags: ignoreversion
Source: "installer\launch.vbs"; DestDir: "{app}"; Flags: ignoreversion
Source: "public\icon.svg"; DestDir: "{app}"; Flags: ignoreversion

[Icons]
Name: "{group}\{#MyAppName}"; Filename: "wscript.exe"; Parameters: """{app}\launch.vbs"""; WorkingDir: "{app}"; Comment: "{#MyAppName}"
Name: "{autodesktop}\{#MyAppName}"; Filename: "wscript.exe"; Parameters: """{app}\launch.vbs"""; WorkingDir: "{app}"; Tasks: desktopicon; Comment: "{#MyAppName}"

[Run]
Filename: "wscript.exe"; Parameters: """{app}\launch.vbs"""; Description: "{cm:LaunchProgram,{#StringChange(MyAppName, '&', '&&')}}"; Flags: shellexec postinstall skipifsilent nowait
