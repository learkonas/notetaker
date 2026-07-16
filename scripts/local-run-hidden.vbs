' Launches local-run.ps1 with no visible window.
' Used by the ObsidianNoteSyncDaily scheduled task; wscript.exe is a GUI
' process so no console window is ever created.
Dim shell
Set shell = CreateObject("WScript.Shell")
' 0 = hidden window, True = wait for exit so Task Scheduler tracks the real run
shell.Run "powershell -NoProfile -ExecutionPolicy Bypass -File ""C:\dev\obsidian_notetaker\scripts\local-run.ps1""", 0, True
