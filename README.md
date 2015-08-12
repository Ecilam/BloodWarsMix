###DESCRIPTION
Ensemble de Userscripts améliorant le jeu [Blood Wars](http://www.fr.bloodwars.net) où vous incarnez un vampire dans un monde post-apocalyptique :
* [BloodWarsEnchanced](https://github.com/Ecilam/BloodWarsEnhanced)
* [BloodWarsAnalyseRC](https://github.com/Ecilam/BloodWarsAnalyseRC)
* [BloodWarsSpyData](https://github.com/Ecilam/BloodWarsSpyData)
* [BloodWarsToolBox](https://github.com/Ecilam/BloodWarsToolBox) 
* [BloodWarsItemTest](https://github.com/Ecilam/BloodWarsItemTest)
* [BloodWarsMix](https://github.com/Ecilam/BloodWarsMix) (celui-ci)

Ce script est compatible avec les serveurs Français uniquement et les navigateurs Firefox, Chrome et Opéra.
Testé principalement avec Firefox v40.0 sur serveur R3FR v1.7.0b.

Pour tout contact passer par mon [topic](http://forum.fr.bloodwars.net/index.php?page=Thread&threadID=204323/) sur le forum BloodWars.
Pour les bugs, GitHub propose une section [Issues](https://github.com/Ecilam/BloodWarsToolBox/issues).

###INSTALLATION
* Firefox : installer préalablement le module [Greasemonkey](https://addons.mozilla.org/fr/firefox/addon/greasemonkey/) <strike>ou [Scriptish](https://addons.mozilla.org/en-US/firefox/addon/scriptish/)</strike>.
* Google Chrome : installer l'extension [Tampermonkey](https://chrome.google.com/webstore/detail/dhdgffkkebhmkfjojejmpbldmpobfkfo).
* Opera : installer [Chrome extension](https://addons.opera.com/fr/extensions/details/download-chrome-extension-9/?display=en) puis [Tampermonkey](https://chrome.google.com/webstore/detail/dhdgffkkebhmkfjojejmpbldmpobfkfo).
* Ensuite afficher la version [RAW](https://raw.githubusercontent.com/Ecilam/BloodWarsMix/master/BloodWarsMix%40bwm.user.js) du script pour que le module (ou l'extension) vous propose de l'installer.

###FONCTIONS
* Ajoute une interface dans le menu 'SYNTHÈSE D`OBJETS' (serveur type Moria) vous permettant de simuler des synthèses.

###AIDE
Ce script s'inspire des réflexions trouvées sur ce [topic](http://forum.fr.bloodwars.net/index.php?page=Thread&threadID=235942).

Cliquer sur le titre permet de masquer l'interface.

1. Choisir une Catégorie d'objet (légendaire ou non).
2. Le tableau de 'Sélection' permet de saisir l'objet. 2 modes sont proposés :
	- Liste : affiche l'ensemble des objets de votre armurerie correspondant à cette catégorie. Y ajoute par la suite le résultat des synthèses. Le tri est possible sur ce tableau.
	- Manuel : vous permet de sélectionner manuellement la qualité, l'objet, le préfixe et le suffixe.
3. Le tableau 'Simulations' permet de créer plusieurs ensembles de synthèses. le '+' ajoute une nouvelle simulation et le 'X' efface la simulation en cours.
	Sélectionnez une des lignes ci-dessous pour en modifier le contenu. La ligne '=' ne peut être modifié étant le résultat de la synthèse. 
	Plusieurs commandes apparaissent suivant la nature de la ligne : 
	- '+' : permet d'ajouter une ligne en dessous.
	- '<>' : ajoute un nouveau bloc permettant de débuter une nouvelle synthèse indépendante de la précédente.
	- Fléches bas ou haut (blanches) : fait descendre ou monter la ligne concernée.
	- Fléches gauche ou haut (rouges) : ne concerne que la ligne de résultat '='. Efface toutes les lignes précédentes soit du bloc (fléche gauche) soit de la simulation (flèche haut).
	- X : efface la ligne, le séparateur ou le bloc.

###INFORMATIONS
* **1ère utilisation:** un message vous rappellera de consulter la Salle du Trône pour que le script puisse récupérer l'IUD du personnage afin de pouvoir fonctionner.
* **Données:** les préférences sont stockées avec LOCALSTORAGE.
