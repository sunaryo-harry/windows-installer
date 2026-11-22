Set WshShell = CreateObject("WScript.Shell")
AppDir = CreateObject("Scripting.FileSystemObject").GetParentFolderName(WScript.ScriptFullName)
BatFile = AppDir & "\launch.bat"
WshShell.Run chr(34) & BatFile & chr(34), 0, False
Set WshShell = Nothing
