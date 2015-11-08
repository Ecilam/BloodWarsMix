###DESCRIPTION
Ensemble de Userscripts améliorant le jeu [Blood Wars](http://www.fr.bloodwars.net) où vous incarnez un vampire dans un monde post-apocalyptique :
* [BloodWarsEnchanced](https://github.com/Ecilam/BloodWarsEnhanced)
* [BloodWarsAnalyseRC](https://github.com/Ecilam/BloodWarsAnalyseRC)
* [BloodWarsSpyData](https://github.com/Ecilam/BloodWarsSpyData)
* [BloodWarsToolBox](https://github.com/Ecilam/BloodWarsToolBox) 
* [BloodWarsItemTest](https://github.com/Ecilam/BloodWarsItemTest)
* [BloodWarsMix](https://github.com/Ecilam/BloodWarsMix) (celui-ci)

Ce script est compatible uniquement avec les serveurs Français et les navigateurs Firefox, Chrome et Opéra.
Testé pincipalement avec Firefox v40.0 sur serveur R3FR v1.7.3b.

Pour tout contact passer par mon [topic](http://forum.fr.bloodwars.net/index.php?page=Thread&threadID=204323/) sur le forum BloodWars.
Pour les bugs, GitHub propose une section [Issues](https://github.com/Ecilam/BloodWarsToolBox/issues).

###INSTALLATION
* **Firefox** : installer préalablement le module [Greasemonkey](https://addons.mozilla.org/fr/firefox/addon/greasemonkey/) <strike>ou [Scriptish](https://addons.mozilla.org/en-US/firefox/addon/scriptish/)</strike>.
* **Google Chrome** : installer l'extension [Tampermonkey](https://chrome.google.com/webstore/detail/dhdgffkkebhmkfjojejmpbldmpobfkfo).
* **Opera** : installer [Chrome extension](https://addons.opera.com/fr/extensions/details/download-chrome-extension-9/?display=en) puis [Tampermonkey](https://chrome.google.com/webstore/detail/dhdgffkkebhmkfjojejmpbldmpobfkfo).
* Ensuite afficher la version [RAW](https://raw.githubusercontent.com/Ecilam/BloodWarsMix/master/BloodWarsMix%40bwm.user.js) du script pour que le module (ou l'extension) vous propose de l'installer.

###FONCTIONS
Ajoute une interface dans le menu **SYNTHÈSE D`OBJETS** (serveur type Moria) vous permettant de simuler des synthèses. Il s'inspire des réflexions trouvées sur ce [topic](http://forum.fr.bloodwars.net/index.php?page=Thread&threadID=235942).

###AIDE
Cliquer sur le titre permet de masquer/afficher l'interface.

L'interface est décomposée en plusieurs zones :

1. **Catégorie** permet de choisir un type d'objet (légendaire ou non).  

2. **Sélection** permet de saisir les objets via 2 modes :
	* **Liste** : affiche l'ensemble des objets de votre armurerie correspondant à cette catégorie et le résultat des synthèses.  
		- All : ajoute la totalité des objets de l'armurerie à la **Sélection** (voir Recherche).
		- ► : ajoute l'objet à la **Sélection**.
	* **Manuel** : permet une saisie manuelle de l'objet.

3. **Simulations** permet de créer plusieurs ensembles de synthèses. Chaque simulation est décomposée en une partie **Recherche** et **Résultats**.  
	+ \+ : permet d'ajouter une simulation.
	+ ◄ ou ► : déplace la simulation dans le sens indiqué.
	+ X : efface l'élément sélectionné.  

	1. **Recherche** permet de chercher des solutions automatiquement. Il comprend une **Sélection** d'objets et un **Objectif** à atteindre.  
		- ►► : lance une recherche (désactivée si la **Sélection** est insuffisante).
		- X : annule la recherche sans sauvegarder les résultats trouvés.
		- ▼ : stop la recherche et ajoute les résultats déjà trouvés.  

	2. **Résultats** permet aussi bien d'afficher les solutions trouvées par la **Recherche** que de chercher manuellement vos propres synthèses.  

		+ Commandes des résultats :  
			- \+ : permet d'ajouter un résultat.
			- ◄ ou ► : déplace le résultat dans le sens indiqué.
			- X : efface le résultat sélectionné.  

		+ Commandes des objets :  
			- \+ : permet d'ajouter une ligne.
			- '<>' : ajoute un nouveau bloc indépendant du précédent. 
			- ▼ ou ▲ (blanches) : déplace la ligne sélectionnée dans le sens indiqué.
			- ◄ (rouges) : efface tous les objets précédents du bloc concerné.
			- ▲ (rouges) : efface tous les objets précédents.
			- X : efface l'élément sélectionné ou le bloc.
	
Le script cherche et garde les solutions les plus proches. La valeur **Ecart** apparaisant dans la ligne d'état indique l'écart de points entre les solutions trouvées et l'objectif, 0 étant la solution recherchée.
La ligne '=', étant le résultat de la synthèse de 2 objets, ne peut être modifiée.
	
###INFORMATIONS
* **1ère utilisation:** un message vous rappellera de consulter la Salle du Trône pour que le script puisse récupérer l'IUD du personnage afin de pouvoir fonctionner.
* **Données:** les préférences sont stockées avec LOCALSTORAGE.
