Set WshShell = CreateObject("WScript.Shell")
WshShell.CurrentDirectory = CreateObject("Scripting.FileSystemObject").GetParentFolderName(WScript.ScriptFullName)
' 1 = tampilkan jendela; False = jangan tunggu (lepas dari pemanggil)
WshShell.Run "cmd /k start-localhost-3010.bat", 1, False
