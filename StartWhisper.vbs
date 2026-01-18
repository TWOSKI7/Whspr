Set WshShell = CreateObject("WScript.Shell")
Set FSO = CreateObject("Scripting.FileSystemObject")

' Get script directory
scriptDir = FSO.GetParentFolderName(WScript.ScriptFullName)

' Change to script directory and pull latest
WshShell.CurrentDirectory = scriptDir
WshShell.Run "cmd /c git pull && Whisper.bat", 1, False
