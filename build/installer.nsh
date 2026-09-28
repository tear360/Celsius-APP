; Integration Windows supplementaire pour Celsius.
; electron-builder injecte customInit (avant l'ecriture des raccourcis) et
; customUnInit (pendant la desinstallation).
;
; Le Store menu, le bureau, l'entree "Applications et fonctionnalites" et
; l'assistant de desinstallation sont generes nativement par electron-builder
; (NSIS) : rien a ajouter ici au-dela de ce bloc, volontairement minimal.

!macro customInit
!macroend

!macro customUnInit
!macroend
