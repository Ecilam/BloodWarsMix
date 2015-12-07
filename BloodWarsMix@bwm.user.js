(function(){
// coding: utf-8
// ==UserScript==
// @author		Ecilam
// @name		Blood Wars Mix
// @version		2015.12.07
// @namespace	BWM
// @description	Ce script permet de tester des synthèses dans le jeu Blood Wars.
// @copyright   2011-2015, Ecilam
// @license     GPL version 3 ou suivantes; http://www.gnu.org/copyleft/gpl.html
// @homepageURL https://github.com/Ecilam/BloodWarsMix
// @supportURL  https://github.com/Ecilam/BloodWarsMix/issues
// @include     /^http:\/\/r[0-9]*\.fr\.bloodwars\.net\/.*$/
// @grant       none
// ==/UserScript==
"use strict";

function _Type(v){
	var type = Object.prototype.toString.call(v);
	return type.slice(8,type.length-1);
	}
function _Exist(v){
	return _Type(v)!='Undefined';
	}
/******************************************************
* OBJET JSONS - JSON
* - stringification des données
******************************************************/
var JSONS = (function(){
	function reviver(key,v){
		if (_Type(v)=='String'){
			var a = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2}):(\d{2}(?:\.\d*)?)Z$/.exec(v);
			if (a!==null) return new Date(Date.UTC(+a[1],+a[2]-1,+a[3],+a[4],+a[5],+a[6]));
			}
		return v;
		}
	return {
		_Decode: function(v){
			var r = null;
			try	{
				r = JSON.parse(v,reviver);
				}
			catch(e){
				console.error('JSONS_Decode error :',v,e);
				}
			return r;
			},
		_Encode: function(v){
			return JSON.stringify(v);
			}
		};
	})();

/******************************************************
* OBJET LS - Datas Storage
* - basé sur localStorage
* Note : localStorage est lié au domaine
******************************************************/
var LS = (function(){
	var LS = window.localStorage;
	return {
		_GetVar: function(key,defaut){
			var v = LS.getItem(key); // if key does not exist return null 
			return ((v!==null)?JSONS._Decode(v):defaut);
			},
		_SetVar: function(key,v){
			LS.setItem(key,JSONS._Encode(v));
			return v;
			},
		_Delete: function(key){
			LS.removeItem(key);
			return key;
			},
		_Length: function(){
			return LS.length;
			},
		_Key: function(index){
			return LS.key(index);
			}
		};
	})();

/******************************************************
* OBJET DOM - Fonctions DOM & QueryString
* -  DOM : fonctions d'accès aux noeuds du document
* - _QueryString : accès aux arguments de l'URL
******************************************************/
var DOM = (function(){
	return {
		// méthodes Xpath
		_GetNodes: function(path,root){
			return (_Exist(root)&&root===null)?null:document.evaluate(path,(_Exist(root)?root:document), null,XPathResult.ORDERED_NODE_SNAPSHOT_TYPE, null);
			},
		_GetFirstNode: function(path,root){
			var r = this._GetNodes(path,root);
			return (r!==null&&r.snapshotLength>=1?r.snapshotItem(0):null);
			},
		_GetLastNode: function(path, root){
			var r = this._GetNodes(path,root);
			return (r!==null&&r.snapshotLength>=1?r.snapshotItem(r.snapshotLength-1):null);
			},
		_GetFirstNodeTextContent: function(path,defaultValue,root){
			var r = this._GetFirstNode(path,root);
			return (r!==null&&r.textContent!==null?r.textContent:defaultValue);
			},
		_GetFirstNodeInnerHTML: function(path,defaultValue,root){
			var r = this._GetFirstNode(path,root);
			return (r!==null&&r.innerHTML!==null?r.innerHTML:defaultValue);
			},
		_GetLastNodeInnerHTML: function(path,defaultValue,root){
			var r = this._GetLastNode(path,root);
			return (r!==null&&r.innerHTML!==null?r.innerHTML:defaultValue);
			},
		// méthodes DOM
		_$: function(a){
			return document.getElementById(a);
			},
		_CleanNode: function(node){
			while (node.hasChildNodes()){
				node.removeChild(node.firstChild);
				}
			},
		// retourne la valeur de la clé "key" trouvé dans l'url
		// null: n'existe pas, true: clé existe mais sans valeur, autres: valeur
		_QueryString: function(key){
			var url = window.location.search,
				reg = new RegExp("[?&]"+key+"(=([^&$]+)|)(&|$)","i"),
				offset = reg.exec(url);
			if (offset!==null){
				offset = _Exist(offset[2])?offset[2]:true;
				}
			return offset;
			}
		};
	})();

/******************************************************
* OBJET IU - Interface Utilsateur
******************************************************/
var IU = (function(){
	return {
		_CreateElements: function(list,oldList){
			var r = _Exist(oldList)?oldList:{};
			for (var key in list){
				if (list.hasOwnProperty(key)){
					var node = _Exist(r[list[key][4]])?r[list[key][4]]:list[key][4];
					r[key] = this._CreateElement(list[key][0],list[key][1],list[key][2],list[key][3],node);
					}
				}
			return r;
			},
		_CreateElement: function(type,attributes,content,events,node){
			var r = document.createElement(type);
			for (var key in attributes){
				if (attributes.hasOwnProperty(key)){
					if (_Type(attributes[key])!='Boolean') r.setAttribute(key,attributes[key]);
					else if (attributes[key]===true) r.setAttribute(key,key.toString());
					}
				}
			for (key in events){
				if (events.hasOwnProperty(key)){
					this._addEvent(r,key,events[key][0],events[key][1]);
					}
				}
			for (var i=0; i<content.length; i++){
				if (_Type(content[i])==='Object') r.appendChild(content[i]);
				else r.textContent+= content[i];
				}
			if (node!==null) node.appendChild(r);
			return r;
			},
		_addEvent: function(obj,type,fn,par){
			var funcName = function(event){return fn.call(obj,event,par);};
			obj.addEventListener(type,funcName,false);
			if (!obj.BWMListeners) {obj.BWMListeners = {};}
			if (!obj.BWMListeners[type]) obj.BWMListeners[type]={};
			obj.BWMListeners[type][fn.name]=funcName;
			},
		_removeEvent: function(obj,type,fn){
			if (obj.BWMListeners[type]&&obj.BWMListeners[type][fn.name]){
				obj.removeEventListener(type,obj.BWMListeners[type][fn.name],false);
				delete obj.BWMListeners[type][fn.name];
				}
			},
		_removeEvents: function(obj){
			if (obj.BWMListeners){
				for (var key in obj.BWMListeners){
					if (obj.BWMListeners.hasOwnProperty(key)){
						for (var key2 in obj.BWMListeners[key]){
							if (obj.BWMListeners[key].hasOwnProperty(key2)){
								obj.removeEventListener(key,obj.BWMListeners[key][key2],false);
								}
							}
						}
					}
				delete obj.BWMListeners;
				}
			}
		};
	})();

/******************************************************
* OBJET L - localisation des chaînes de caractères (STRING) et expressions régulières (RegExp)
******************************************************/
var L = (function(){
	var locStr = {
		"sDeconnecte": "Vous avez été déconnecté en raison d`une longue inactivité.",
		"sCourtePause": "Une courte pause est en court en raison de l`actualisation du classement général",
		"sUnknowID": "BloorWarsMix - Erreur :\n\nLe nom de ce vampire doit être lié à son ID. Merci de consulter la Salle du Trône pour rendre le script opérationnel.\nCe message est normal si vous utilisez ce script pour la première fois ou si vous avez changé le nom du vampire.",
		"listes":[
			// 0 - types
			['Casque','Armure','Pantalon','Amulette','Anneau','Arme à une main','Arme à deux mains','Arme à feu à une main','Arme à feu à deux mains','Arme à distance à deux mains'],
			// 1 - qualité
			[['-'],['S1'],['S2'],['S3'],['S4'],['S5'],['B0'],['B1'],['B2'],['B3'],['B4'],['B5'],['P0'],['P1'],['P2'],['P3'],['P4'],['P5']],
			[ // 2 - sous-types
				[['-'],['Casquette'],['Casque'],['Casque Militaire'],['Masque'],['Diadème'],['Cagoule'],['Chapeau'],['Fronteau'],['Bandana'],['Couronne']],
				[['-'],['T-shirt'],['Veste'],['Veston'],['Gilet'],['Corset'],['Cape'],['Smoking'],['Haubert'],['Armure En Plate'],['Pleine Armure']],
				[['-'],['Short'],['Pantalon'],['Jupe'],['Kilt']],
				[['-'],['Collier'],['Amulette'],['Chaîne'],['Foulard'],['Cravate']],
				[['-'],['Anneau'],['Bracelet'],['Chevalière']],
				[['-'],['Matraque'],['Couteau'],['Poignard'],['Poing Américain'],['Épée'],['Rapière'],['Kama'],['Hache'],['Wakizashi'],['Poing des Cieux']],
				[['-'],['Massue'],['Pince-monseigneur'],['Espadon'],['Hache Lourde'],['Morgenstern'],['Faux'],['Pique'],['Hallebarde'],['Katana'],['Tronçonneuse']],
				[['-'],['Glock'],['Beretta'],['Uzi'],['Magnum'],['Desert Eagle'],['Mp5k'],['Scorpion']],
				[['-'],['Carabine de Chasse'],['Semi-automatique de Sniper'],['Fusil de Sniper'],['AK-47'],['Fn-Fal'],['Fusil'],['Lance-flammes']],
				[['-'],['Arc Court'],['Arc'],['Shuriken'],['Arc Long'],['Arbalète'],['Couteau de lancer'],['Arc Reflex'],['Javelot'],['Pilum'],['Francisque'],['Lourde Arbalète']]
			],
			[ // 3 - Préfixes
				[['-'],['Endurci','Endurcie'],['Renforcé','Renforcée'],['Serviable'],['Chic'],['Élégant','Élégante'],['Cornu','Cornue'],['Malicieux','Malicieuse'],['Paresseux','Paresseuse'],['Mortel','Mortelle'],['Guerrier','Guerrière'],['Magnétique'],['Sanglant','Sanglante'],['Splendide'],['Pare-balles'],['Chamaniste'],['Tigre'],['D`Assaut'],['Runique'],['Rituel','Rituelle']],
				[['-'],['Renforcé','Renforcée'],['Clouté','Cloutée'],['Dominateur','Dominatrice'],['Léger','Légère'],['Écailleux','Écailleuses'],['En plate'],['Guerrier','Guerrière'],['Flexible'],['Sanglant','Sanglante'],['Chasseur'],['Chamaniste'],['Pare-balles'],['Tigre'],['Elfe'],['Runique'],['Mortel','Mortelle']],
				[['-'],['Court','Courte'],['Piqué','Piquée'],['Léger','Légère'],['Renforcé','Renforcée'],['Satiné','Satinée'],['Clouté','Cloutée'],['Pare-balles'],['Flexible'],['Épineux','Épineuse'],['Chamaniste'],['Sanglant','Sanglante'],['Elfe'],['Tigre'],['Blindé','Blindée'],['Composite'],['Runique'],['Mortel','Mortelle']],
				[['-'],['En Bronze'],['En Argent'],['Émeraude'],['En Or'],['En Platine'],['En Titane'],['Rubis'],['Distingué','Distinguée'],['Astucieux','Astucieuse'],['Ours'],['Dur','Dure'],['Astral','Astrale'],['Élastique'],['Cardinal','Cardinale'],['Nécromancien','Nécromancienne'],['Archaique'],['Hypnotique'],['Dansant','Dansante'],['Fauve'],['Diamant'],['Vindicatif','Vindicative'],['Faussé'],['En Plastique'],['Insidieux','Insidieuse'],['Solaire'],['Araignée'],['Faucon'],['Noir','Noire']],
				[['-'],['En Bronze'],['En Argent'],['Émeraude'],['En Or'],['En Platine'],['En Titane'],['Rubis'],['Distingué','Distinguée'],['Astucieux','Astucieuse'],['Ours'],['Dur','Dure'],['Astral','Astrale'],['Élastique'],['Cardinal','Cardinale'],['Nécromancien','Nécromancienne'],['Archaique'],['Hypnotique'],['Dansant','Dansante'],['Fauve'],['Diamant'],['Vindicatif','Vindicative'],['Faussé'],['En Plastique'],['Insidieux','Insidieuse'],['Solaire'],['Araignée'],['Faucon'],['Noir','Noire']],
				[['-'],['Sévère'],['Denté','Dentée'],['Osseux','Osseuse'],['Tonifiant','Tonifiante'],['Cristallin','Cristalline'],['Mystique'],['Léger','Légère'],['Cruel','Cruelle'],['Amical','Amicale'],['Piquant','Piquante'],['Protecteur','Protectrice'],['Lumineux','Lumineuse'],['Venimeux','Venimeuse'],['Meurtrier','Meurtrière'],['Empoisonné','Empoisonnée'],['Damné','Damnée'],['Agile'],['Antique'],['Rapide'],['Démoniaque']],
				[['-'],['Dispendieux','Dispendieuse'],['Sévère'],['Cristallin','Cristalline'],['Denté','Dentée'],['Large'],['Cruel','Cruelle'],['Mystique'],['Tonifiant','Tonifiante'],['Piquant','Piquante'],['Léger','Légère'],['Lourd','Lourde'],['Empoisonné','Empoisonnée'],['Irradié','Irradiée'],['Lumineux','Lumineuse'],['Protecteur','Protectrice'],['Venimeux','Venimeuse'],['Meurtrier','Meurtrière'],['Damné','Damnée'],['Agile'],['Antique'],['Démoniaque']],
				[['-']],
				[['-']],
				[['-']]
			],
			[ // 4 - suffixes
				[['-'],['Explorateur','De L`Explorateur'],['Précaution','De La Précaution'],['Endurance','D`Endurance'],['Berger','Du Berger'],['Toxicomane','Du Toxicomane'],['Protection','De La Protection'],['Sens','Des Sens'],['Prophète','Du Prophète'],['Punition','De La Punition'],['Gladiateur','Du Gladiateur'],['Sang','Du Sang'],['Carapace De Tortue','De Carapace De Tortue'],['Soleil','Du Soleil'],['Adrénaline','De l`Adrénaline'],['Précognition','De La Précognition'],['Écaille De Dragon','D`Écaille De Dragon'],['Puissance','De La Puissance'],['Magie','De La Magie']],
				[['-'],['Voleur','Du Voleur'],['Adepte','De L`Adepte'],['Garde','Du Garde'],['Athlète','De L`Athlète'],['Toxicomane','Du Toxicomane'],['Maître D`Epée','Du Maître D`Epée'],['Tueur','Du Tueur'],['Gardien','Du Gardien'],['Cobra','Du Cobra'],['Carapace De Tortue','De Carapace De Tortue'],['Esquive','D`Esquive'],['Pillard','Du Pillard'],['Maître','Du Maître'],['Adrénaline','De l`Adrénaline'],['Centurion','Du Centurion'],['Résistance','De La Résistance'],['Caligula','De Caligula'],['Semeur De La Mort','Du Semeur De La Mort'],['Vitesse','De La Vitesse'],['Orchidée','De L`Orchidée']],
				[['-'],['Brigand','Du Brigand'],['Contrebandier','Du Contrebandier'],['Toxicomane','Du Toxicomane'],['Athlète','De L`Athlète'],['Gestes Muets','Des Gestes Muets'],['Esquive','D`Esquive'],['Réserve','De La Réserve'],['Soleil','Du Soleil'],['Trafiquant D`Armes','Du Trafiquant D`Armes'],['Berger','Du Berger'],['Chasseur D`Ombres','Du Chasseur D`Ombres'],['Serpent','Du Serpent'],['Incas','Des Incas'],['Orienteur','De L`Orienteur'],['Nuit','De La Nuit']],
				[['-'],['Délit','Du Délit'],['Beauté','De La Beauté'],['Pouvoir','Du Pouvoir'],['Génie','Du Génie'],['Force','De La Force'],['Sagesse','De La Sagesse'],['Peau Dure','De La Peau Dure'],['Pèlerin','Du Pèlerin'],['Loup-garou','Du Loup-garou'],['Justesse','De La Justesse'],['Art','De L`Art'],['Jouvence','De La Jouvence'],['Chance','De La Chance'],['Sang','Du Sang'],['Habilité','De L`Habilité'],['Concentration','De La Concentration'],['Lévitation','De La Lévitation'],['Astuce','De L`Astuce'],['Dément','Du Dément'],['Facilitée','De La Facilitée']],
				[['-'],['Délit','Du Délit'],['Beauté','De La Beauté'],['Pouvoir','Du Pouvoir'],['Force','De La Force'],['Génie','Du Génie'],['Sagesse','De La Sagesse'],['Peau Dure','De La Peau Dure'],['Loup-garou','Du Loup-garou'],['Art','De L`Art'],['Justesse','De La Justesse'],['Jouvence','De La Jouvence'],['Renard','Du Renard'],['Chance','De La Chance'],['Sang','Du Sang'],['Chauve-souris','De La Chauve-souris'],['Concentration','De La Concentration'],['Lévitation','De La Lévitation'],['Astuce','De L`Astuce'],['Dément','Du Dément'],['Facilitée','De La Facilitée']],
				[['-'],['Commandant','Du Commandant'],['Secte','De La Secte'],['Douleur','De La Douleur'],['Pouvoir','Du Pouvoir'],['Agilité','De L`Agilité'],['Puissance','De La Puissance'],['Peste','De la Peste'],['Courage','Du Courage'],['Justesse','De La Justesse'],['Ancêtres','Des Ancêtres'],['Conquérant','Du Conquérant'],['Vengeance','De La Vengeance'],['Contusion','De La Contusion'],['Vertu','De La Vertu'],['Précision','De La Précision'],['Sang','Du Sang'],['Fer À Cheval','Du Fer À Cheval'],['Suicidé','Du Suicidé'],['Dracula','De Dracula'],['Vélocité','De La Vélocité'],['Clan','Du Clan'],['Empereur','De L`Empereur']],
				[['-'],['Trahison','De La Trahison'],['Ruse','De La Ruse'],['Douleur','De La Douleur'],['Hasardeux','Du Hasardeux'],['Plomb','De Plomb'],['Puissance','De La Puissance'],['Inquisiteur','De L`Inquisiteur'],['Buveur De Sang','Du Buveur De Sang'],['Conquérant','Du Conquérant'],['Pouvoir','Du Pouvoir'],['Vengeance','De La Vengeance'],['Peste','De la Peste'],['Fer À Cheval','Du Fer À Cheval'],['Autocrate','De L`Autocrate'],['Sang','Du Sang'],['Basilic','Du Basilic'],['Suicidé','Du Suicidé'],['Dracula','De Dracula']],
				[['-']],
				[['-']],
				[['-'],['Longue Portée','De Longue Portée'],['Perfection','De La Perfection'],['Précision','De La Précision'],['Vengeance','De La Vengeance'],['Réaction','De La Réaction'],['Dryades','Des Dryades'],['Mitraillage','De Mitraillage'],['Loups','Du Loups']]
			]]
			};
	return {
	//public stuff
		_Get: function(key){
			var r = locStr[key];
			if (!_Exist(r)) throw new Error("L::Error:: la clé n'existe pas : "+key);
			for (var i=arguments.length-1;i>=1;i--){
				var reg = new RegExp("\\$"+i,"g");
				r = r.replace(reg,arguments[i]);
				}
			return r;
			}
		};
	})();

/******************************************************
* OBJET DATAS - Fonctions d'accès aux données de la page
* Chaque fonction retourne 'null' en cas d'échec
******************************************************/
var DATAS = (function(){
	return {
	/* données du joueur */
		_PlayerName: function(){
			var playerName = DOM._GetFirstNodeTextContent("//div[@class='stats-player']/a[@class='me']", null);
			return playerName;
			},
	/* Données diverses	*/
		_GetPage: function(){
			var p = 'null',
			// message Serveur (à approfondir)
				r = DOM._GetFirstNode("//div[@class='komunikat']");
			if (r!==null){
				r = DOM._GetFirstNodeTextContent(".//u",r);
				if (r==L._Get('sDeconnecte')) p="pServerDeco";
				else if (r==L._Get('sCourtePause')) p="pServerUpdate";
				else p="pServerOther";
				}
			else{
				var qsA = DOM._QueryString("a"),
					qsDo = DOM._QueryString("do"),
					path = window.location.pathname;
				// page extérieur
				if (path!="/"){}
				// page interne
				// Salle du Trône
				else if (qsA===null||qsA=="main") p="pMain";
				// Le Puits des Âmes - Moria I
				else if (qsA=="mixer"){
					if (qsDo===null||qsDo=="mkstone") p="pMkstone";
					else if (qsDo=="upgitem") p="pUpgitem";
					else if (qsDo=="mixitem") p="pMixitem";
					else if (qsDo=="destitem") p="pDestitem";
					else if (qsDo=="tatoo") p="pTatoo";
					}
				}
			return p;
			}
		};
	})();

/******************************************************
* OBJET PREF - Gestion des préférences
******************************************************/
var PREF = (function(){
	// préfèrences par défaut
	var index = 'BWM:O:',
		defPrefs = {'set':[[true,true,true,true,true,true,true,true,true],0,[2,0],[0,''],0,-1,0,[0,0],['','','']]};
		//0:show (true/false)-> titre,position,aide,sim,search,res,saisie,armurerie,synthèse
		//1:mode,2:tri,3:cat,4:sim,5:search,6:result,7:saisie
		//8:options -> max rés,max écart,max fusion
	var ID = null, prefs = {};
	return {
		_Init: function(id){
			ID = id;
			prefs = LS._GetVar(index+ID,{});
			},
		_Get: function(key){
			if (_Exist(prefs[key])) return prefs[key];
			else if (_Exist(defPrefs[key]))return defPrefs[key];
			else return null;
			},
		_GetDef: function(key){
			if (_Exist(defPrefs[key])) return defPrefs[key];
			else return null;
			},
		_Set: function(key,v){
			if (ID!==null){
				prefs[key] = v;
				LS._SetVar(index+ID,prefs);
				return v;
				}
			else throw new Error("Erreur : les préférences n'ont pas été initialisées.");
			},
		_Raz: function(){
			prefs = {};
			if (ID!==null) LS._Delete(index+ID);
			else throw new Error("Erreur : les préférences n'ont pas été initialisées.");
			}
		};
	})();

/******************************************************
* CSS
******************************************************/
function getCssRules(selector,css){
    var sheets = _Exist(css)?[css]:document.styleSheets;
    for (var i = 0; i<sheets.length; i++){
        var sheet = sheets[i];
		try {
			if(!sheet.cssRules) return null;
			}
		catch(e) {
			if(e.name !== 'SecurityError') throw e;
			return null;
			}
        for (var j=0;j<sheet.cssRules.length;j++){
            var rule = sheet.cssRules[j];
            if (rule.selectorText&&rule.selectorText.split(',').indexOf(selector)!==-1) return rule.style;
			}
		}
    return null;
	}
function setCss(){
	var css = [
		".BWMbox{width: 100%;margin:0 auto;}",
		".BWMtitle,.BWMcut,.BWMselect{cursor: pointer}",
		".BWMselect:hover{text-decoration: underline;}",
		".BMWfield{margin: 0;padding: 1px;text-align: left;}",
		".BWMlegend{font-size: 11px;font-weight: bold;}",
		".BWMdiv1,.BWMchkbox{margin: 0px;padding: 0px;}",
		".BWMtab0{border-collapse: collapse;width: 100%;}",
		".BWMtab0 td{vertical-align: top;padding: 4px;}",
		".BWMtab1{border-collapse: collapse;width: 100%;text-align: center;}",
		".BWMtab1 td,.BWMtab1 th{vertical-align: middle;border: 1px solid black;margin: 0;padding: 2px;}",
		".BWMtab3{border-collapse: collapse;width: 100%;text-align: center;}",
		".BWMtab3 td,.BWMtab3 th{vertical-align: middle;border: 0px;margin: 0;padding: 2px;}",
		".BWMcut,.BWMcut2{text-align: left;max-width: 0;overflow: hidden;white-space: nowrap;text-overflow: ellipsis}",
		".BWMtriSelect{color:lime;}",
		".BWMtd5{width:5%;}",
		".BWMtd10{width:10%;}",
		".BWMtd15{width:15%;}",
		".BWMtd20{width:20%;}",
		".BWMtd25{width:25%;}",
		".BWMtd30{width:30%;}",
		".BWMtd40{width:40%;}",
		".BWMtd60{width:60%;}",
		".BWMtd65{width:65%;}",
		".BWMtd80{width:80%;}",
		".BWMtd90{width:90%;}",
		".BWMtd100{width:100%;}",
		".BWMa1{display: block;}",
		".BWMinput{width: 30px;height: 11px;text-align: right;font-weight: bold;}",
		".BWMerror{color:#FFF;background-color:red;}",
		// blink
		"@-moz-keyframes blinker {from {opacity:1;} 50% {opacity:0.1;} to {opacity:1;}}",
		"@-webkit-keyframes blinker {from {opacity:1;} to {opacity:0;}}",
		".BWMblink {-webkit-animation-name: blinker;-webkit-animation-iteration-count: infinite;-webkit-animation-timing-function: cubic-bezier(1.0,0,0,1.0);-webkit-animation-duration: 1s;",
		"-moz-animation-name: blinker;-moz-animation-iteration-count: infinite;-moz-animation-timing-function: cubic-bezier(1.0,0,0,1.0);-moz-animation-duration: 1s;}",
		],
		head = DOM._GetFirstNode("//head");
	if (head!==null){
		var even = getCssRules('.even'),
			selectedItem = getCssRules('.selectedItem');
		if (even!==null&&selectedItem!==null) css.push('.BWMeven{'+even.cssText+'}','.BWMTR:hover .BWMcut:hover,.BWMTR2:hover .BWMcut,.BWMTR2:hover .BWMselect:hover:not(.BWMcut){'+selectedItem.cssText+'}');
		IU._CreateElement('style',{'type':'text/css'},[css.join('')],{},head);
		}
	}
	
/******************************************************
* FUNCTIONS
******************************************************/

function show(e,i){
	set[0][i] = !set[0][i];
	PREF._Set('set',set);
	upTabs();
	}
function getListItem(){
	var list = DOM._GetNodes("//div[@id='content-mid']//ul[@class='inv-select']/li"),
		match = ["","",""],
		index = [{"":0,"Bon":6,"Bonne":6,"Parfait":12,"Parfaite":12},[],[],[]],
		result = {};
	// créé le pattern de recherche et l'index de correspondance
	for (var i=2; i<5; i++){
		for (var j=0; j<loc[i].length; j++){
			if (i!=2) index[i-1][j] = {};
			for (var k=1; k<loc[i][j].length; k++){
				for (var x=0; x<loc[i][j][k].length; x++){
					match[i-2] = match[i-2]+loc[i][j][k][x]+'(?:[ ]|$)|';
					if (i==2) index[1][loc[i][j][k][x]] = [j,k];
					else index[i-1][j][loc[i][j][k][x]] = k;
					}
				}
			}
		}
	// recherche
	for (var i=0; i<list.snapshotLength; i++){
		var col = DOM._GetFirstNodeTextContent("./div/span",'',list.snapshotItem(i)),
			itemMatch = "^(Légendaire |)(Bon |Bonne |Parfait |Parfaite |)("+match[0]+")("+match[1]+")("+match[2]+")(\\(\\+[0-5]\\)|)$",
			v = new RegExp(itemMatch).exec(col);
		if (v!==null){
			var niv = v[6]!==''?Number(v[6].replace(new RegExp('[()+]','g'),'')):0,
				grade = _Exist(index[0][v[2].trim()])?index[0][v[2].trim()]:-1,
				type = (v[3]!==''&&_Exist(index[1][v[3].trim()]))?index[1][v[3].trim()]:null,
				leg = v[1]!==''?'L':'',
				pre = v[4]!==''?_Exist(index[2][type[0]][v[4].trim()])?index[2][type[0]][v[4].trim()]:-1:0,
				suf = v[5]!==''?_Exist(index[3][type[0]][v[5].trim()])?index[3][type[0]][v[5].trim()]:-1:0;
			if (type!==null){
				if (!_Exist(result[type[0]+leg])) result[type[0]+leg] = [];
				result[type[0]+leg].push([(grade!=-1?grade+niv:-1),type[1],pre,suf]);
				}
			}
		}
	return result;
	}
function objCmp(a,b){ //a==b = 0, a>b = -1, a<b = 1
	for (var i=0;i<4 && a[i]==b[i];++i);
	return i===4?0:a[i]>b[i]? -1 : 1;
	}
function objDiff(a,b){
	var d=0;
	for (var i=0;i<4;i++){d+=(b[i]===0?0:a[i]===0?100:Math.abs(a[i]-b[i]));}
	return d;
	}
function fusion(a,b,c,i){ // a,b = x (a<=b), c = catégorie, i = 0:objet, 1:préfixe, 2:suffixe
	if (c===0&&i===0&&a==1&&b==2) return 4; // exception casquette+casque = masque
	else return a==b?a:(b==loc[i+2][c].length-1&&b-a<3)?b-a==1?b-2:b-1:b-a==1?b+1:b-Math.floor((b-a-2)/2);
	}
function objMix(a,b){
	var v = [],
		min = Math.min(a[0],b[0]);
	v[0] = min+((a[1]!==0&&a[1]==b[1]&&min<17)?1:0);
	for (var i=1;i<4;i++){
		if (a[i]===0||b[i]===0) v[i] = 0;
		else v[i] = mix[i-1][a[i]][b[i]];
		}
	return v;
	}
function tabTri(a,b){
	var x = [[0,2,3,1],[1,2,3,0],[2,3,1,0],[3,2,1,0]][set[2][0]],
		y = set[2][1]===0?1:-1;
	a = a[x[0]]*1000000+a[x[1]]*10000+a[x[2]]*100+a[x[3]];
	b = b[x[0]]*1000000+b[x[1]]*10000+b[x[2]]*100+b[x[3]];
	return (a<b)?y:(a>b)?0-y:0;
	}
function setT(e,i){
	set[3][0] = i; set[4] = 0; set[6] = 0; set[7] = [0,0];
	PREF._Set('set',set);
	upTabs();
	}
function setL(e,i){
	set[3][1] = i; set[4] = 0; set[6] = 0; set[7] = [0,0];
	PREF._Set('set',set);
	upTabs();
	}
function setS(e,i){
	set[4] = i; set[6] = 0; set[7] = [0,0];
	PREF._Set('set',set);
	upTabs();
	}
function addS(e,i){
	set[4] = c.length; set[6] = 0; set[7] = [0,0];
	PREF._Set('set',set);
	c.push({'b':[0,0,0,0],'e':[0,0,null,0],'o':['','','',true],'t':0,'s':[],'r':[[[0,0,0,0],[0,0,0,0],[0,0,0,0]]]});
	LS._SetVar('BWM:LIST:'+ID,list);
	upTabs();
	}
function moveS(e,i){
	if (_Exist(tasks.s[cat])){
		var v = tasks.s[cat];
		if (_Exist(v[set[4]])&&_Exist(v[set[4]+i])){
			tasks.k[v[set[4]]] = [cat,set[4]+i];
			tasks.k[v[set[4]+i]] = [cat,set[4]];
			v[set[4]] = [v[set[4]+i],v[set[4]+i]=v[set[4]]][0];//swap
			}
		else if (_Exist(v[set[4]])){
			tasks.k[v[set[4]]] = [cat,set[4]+i];
			v[set[4]+i] = v[set[4]];
			delete v[set[4]];
			}
		else if (_Exist(v[set[4]+i])){
			tasks.k[v[set[4]+i]] = [cat,set[4]];
			v[set[4]] = v[set[4]+i];
			delete v[set[4]+i];
			}
		}
	c[set[4]] = [c[set[4]+i],c[set[4]+i]=c[set[4]]][0];//swap
	set[4] = set[4]+i;
	PREF._Set('set',set);
	LS._SetVar('BWM:LIST:'+ID,list);
	upTabs();
	}
function delS(e){
	if (_Exist(tasks.s[cat])){
		if (_Exist(tasks.s[cat][set[4]])) cmdSearch(null,[null,1]);
		for (var j in tasks.s[cat]){
			if (j>set[4]){
				tasks.k[tasks.s[cat][j]] = [cat,j-1];
				tasks.s[cat][j-1] = tasks.s[cat][j];
				delete tasks.s[cat][j];
				}
			}
		}
	c.splice(set[4],1);
	set[4] = set[4]<c.length? set[4]:c.length-1; set[6] = 0; set[7] = [0,0];
	PREF._Set('set',set);
	LS._SetVar('BWM:LIST:'+ID,list);
	upTabs();
	}
function resetS(e){
	while (_Exist(tasks.s[cat])){
		cmdSearch(null,[tasks.s[cat][Object.keys(tasks.s[cat])[Object.keys(tasks.s[cat]).length-1]],1]);
		}
	list[cat] = [];
	set[4] = 0; set[6] = 0; set[7] = [0,0];
	PREF._Set('set',set);
	LS._SetVar('BWM:LIST:'+ID,list);
	upTabs();
	}
function setO(e,i){
	set[5] = i;
	if (i==-3||(i==-2&&s.s.length===0)) set[7] = [0,0];
	else set[7] = [i,0];
	PREF._Set('set',set);
	upTabs();
	}
function setR(e,i){
	set[6] = i; set[7] = [i,0];
	PREF._Set('set',set);
	upTabs();
	}
function addR(e){
	set[6] = s.r.length; set[7] = [set[6],0];
	PREF._Set('set',set);
	s.r.push([[0,0,0,0],[0,0,0,0],[0,0,0,0]]);
	LS._SetVar('BWM:LIST:'+ID,list);
	upTabs();
	}
function moveR(e,i){
	s.r[set[6]] = [s.r[set[6]+i],s.r[set[6]+i]=s.r[set[6]]][0];//swap
	set[6] = set[6]+i;
	if (set[7][0]>=0) set[7] = [set[6],set[7][1]];
	PREF._Set('set',set);
	LS._SetVar('BWM:LIST:'+ID,list);
	upTabs();
	}
function delR(e){
	s.r.splice(set[6],1);
	set[6] = set[6]+(set[6]>0?-1:0);
	if (set[7][0]>=0) set[7] = [set[6],0];
	PREF._Set('set',set);
	LS._SetVar('BWM:LIST:'+ID,list);
	upTabs();
	}
function resetR(e){
	s.r = [];
	set[6] = 0;
	if (set[7][0]>=0) set[7] = [0,0];
	PREF._Set('set',set);
	LS._SetVar('BWM:LIST:'+ID,list);
	upTabs();
	}
function setI(e,i){
	set[7] = i;
	PREF._Set('set',set);
	upTabs();
	}
function addI(e,i){
	if (set[7][0]>=0) set[7][1] = i+1;
	PREF._Set('set',set);
	r.splice(i+1,0,[0,0,0,0],[0,0,0,0]);
	LS._SetVar('BWM:LIST:'+ID,list);
	upTabs();
	}
function moveI(e,i){
	r[i[0]] = [r[i[1]],r[i[1]]=r[i[0]]][0];//swap
	if (set[7][0]>=0) set[7][1] = set[7][1]==i[0]?i[1]:set[7][1]==i[1]?i[0]:set[7][1];
	PREF._Set('set',set);
	LS._SetVar('BWM:LIST:'+ID,list);
	upTabs();
	}
function delI(e,i){
	var v = set[7][1];
	if (r[i[0]]==-1){
		r.splice(i[0],2,r[i[1]],[0,0,0,0]);
		v = v==i[0]+1?i[0]:v;
		}
	else if (i[0]==i[1]){// ==root
		if (_Exist(r[i[0]+3])&&r[i[0]+3]!=-1){
			r.splice(i[0],3,r[i[0]+1]);
			v = (v<=i[0]?v:v>i[0]+1?v-2:i[0]);
			}
		else{
			r.splice(i[0],2,r[i[0]+1],[0,0,0,0]);
			v = (v<i[0]||v>i[0]?v:i[0]);
			}
		}
	else if (i[0]-1==i[1]&&(!_Exist(r[i[0]+2])||r[i[0]+2]==-1)){
		r.splice(i[0],2,[0,0,0,0],[0,0,0,0]);
		v = v!=i[0]?v:v-1;
		}
	else{
		r.splice(i[0],2);
		v = v<i[0]?v:v-2;
		}
	if (set[7][0]>=0){
		set[7][1] = v;
		}
	PREF._Set('set',set);
	LS._SetVar('BWM:LIST:'+ID,list);
	upTabs();
	}
function delB(e,i){
	var v = set[7][1],
		fin = false;
	while (!fin){
		if (!_Exist(r[i])) break;
		else if (r[i]==-1) fin = true;
		r.splice(i,1);
		v = v+(v>i?-1:0);
		}
	if (r[r.length-1]==-1){
		r.splice(r.length-1,1);
		v = v<i?v:1;
		}
	if (r.length===0){
		r.push([0,0,0,0],[0,0,0,0],[0,0,0,0]);
		v = 0;
		}
	if (set[7][0]>=0) set[7][1] = v;
	PREF._Set('set',set);
	LS._SetVar('BWM:LIST:'+ID,list);
	upTabs();
	}
function sepI(e,i){
	var v = set[7][1];
	if (!_Exist(r[i+1])){
		r.splice(i+1,0,-1,[0,0,0,0],[0,0,0,0],[0,0,0,0]);
		}
	else if (!_Exist(r[i+3])||(_Exist(r[i+3])&&r[i+3]==-1)){
		r.splice(i+1,2,-1,r[i+1],[0,0,0,0],[0,0,0,0]);
		v = v+(v>i?2:0);
		}
	else{
		r.splice(i+1,2,-1,r[i+1]);
		v = v+(v==i+1?1:0);
		}
	if (set[7][0]>=0) set[7][1] = v;
	PREF._Set('set',set);
	LS._SetVar('BWM:LIST:'+ID,list);
	upTabs();
	}
function firstI(e,i){
	var v = set[7][1];
	r.splice(i[1],i[0]-i[1]);
	if (r.length-i[1]<2||(_Exist(r[i[1]+1])&&r[i[1]+1]==-1)){
		r.splice(i[1]+1,0,[0,0,0,0],[0,0,0,0]);
		v = v<i[1]?v:v<i[0]?i[1]:v-(i[0]-i[1])+2;
		}
	else v = v<i[1]?v:v<i[0]?i[1]:v-(i[0]-i[1]);
	if (set[7][0]>=0) set[7][1] = v;
	PREF._Set('set',set);
	LS._SetVar('BWM:LIST:'+ID,list);
	upTabs();
	}
function setMode(e,i){
	set[1] = i;
	PREF._Set('set',set);
	upTabs();
	}
function addSel(e,i){
	cmdSearch(null,[null,1]);
	s.s.push(i);
	LS._SetVar('BWM:LIST:'+ID,list);
	upTabs();
	}
function selAll(e,i){
	cmdSearch(null,[null,1]);
	for (var j=0; j<i.length;j++){
		s.s.push(i[j]);
		}
	LS._SetVar('BWM:LIST:'+ID,list);
	upTabs();
	}
function addNewSel(e,i){
	cmdSearch(null,[null,1]);
	s.s.splice(i,0,[0,0,0,0]);
	if (set[7][0]==-2) set[7][1] = i;
	PREF._Set('set',set);
	LS._SetVar('BWM:LIST:'+ID,list);
	upTabs();
	}
function delSel(e,i){
	cmdSearch(null,[null,1]);
	s.s.splice(i,1);
	if (set[7][0]==-2){
		if (set[7][1]>=i) set[7][1]+= (set[7][1]>0?-1:0);
		PREF._Set('set',set);
		}
	LS._SetVar('BWM:LIST:'+ID,list);
	upTabs();
	}
function optSearch(e,i){
	var v = new RegExp("^(|[0-9]+)$").exec(e.target.value);
	if (v!=null){
		cmdSearch(null,[null,1]);
		e.target.classList.remove('BWMerror');
		v = v[1]===''?'':Number(v[1]);
		if (s.o[3]) set[8][i] = v;
		else s.o[i] = v;
		PREF._Set('set',set);
		LS._SetVar('BWM:LIST:'+ID,list);
		upTabs();
		}
	else e.target.classList.add('BWMerror');
	}
function chkGlobal(e){
	cmdSearch(null,[null,1]);
	s.o[3] = !s.o[3];
	LS._SetVar('BWM:LIST:'+ID,list);
	upTabs();
	}
function delSearch(e){
	cmdSearch(null,[null,1]);
	if (set[5]==-3){
		s.o = ['','','',true];
		set[8] = ['','',''];
		}
	else if (set[5]==-2){
		s.s = [];
		}
	else{
		s.b = [0,0,0,0];
		s.e = [0,0,null,0];
		s.t = 0;
		}
	PREF._Set('set',set);
	LS._SetVar('BWM:LIST:'+ID,list);
	upTabs();
	}
function razSearch(e){
	cmdSearch(null,[null,1]);
	s.o = ['','','',true];
	s.s = [];
	s.b = [0,0,0,0];
	s.e = [0,0,null,0];
	s.t = 0;
	PREF._Set('set',set);
	LS._SetVar('BWM:LIST:'+ID,list);
	upTabs();
	}
function setSelect(e,i){
	if (set[7][0]==-1){
		cmdSearch(null,[null,1]);
		but[i[0]] = i[1];
		}
	else if (set[7][0]==-2){
		cmdSearch(null,[null,1]);
		s.s[set[7][1]][i[0]] = i[1];
		}
	else r[set[7][1]][i[0]] = i[1];
	LS._SetVar('BWM:LIST:'+ID,list);
	upTabs();
	}
function setISelect(e,i){
	if (set[7][0]==-1){
		cmdSearch(null,[null,1]);
		s.b = [i[0],i[1],i[2],i[3]];
		}
	else if (set[7][0]==-2){
		cmdSearch(null,[null,1]);
		s.s[set[7][1]] = [i[0],i[1],i[2],i[3]];
		}
	else r[set[7][1]] = [i[0],i[1],i[2],i[3]];
	LS._SetVar('BWM:LIST:'+ID,list);
	upTabs();
	}
function setTri(e,i){
	set[2][1] = (i==set[2][0]&&set[2][1]==1)?0:1;
	set[2][0] = i;
	PREF._Set('set',set);
	upTabs();
	}
function actSearch(e,i){
	cmdSearch(null,[null,i]);
	if (i>1){
		set[6] = s.r.length-1;
		set[7] = [set[6],0];
		PREF._Set('set',set);
		}
	upTabs();
	}
function cmdSearch(e,i){ // i[0]= key ou null, i[1] = mode (stop 1|stop + res 2|fin 3|res 4)
	var keyA = (_Exist(tasks.s[cat])&&_Exist(tasks.s[cat][set[4]]))?tasks.s[cat][set[4]]:null,
		key = i[0]===null?keyA:i[0];
	if (key!==null){
		var v = tasks.w[key],
			x = list[tasks.k[key][0]][tasks.k[key][1]];
		if (i[1]>1){
			if (v.r.length>0){
				for (var j=0;j<v.r.length;j++){
					x.r.push([]);
					for (var k=0,y=v.r[j];k<y.length;k=k+3){
						var a = y[k], b = y[k+1], c = y[k+2];
						if (k===0) x.r[x.r.length-1].push(a,b,c);
						else if (a==y[k-1]) x.r[x.r.length-1].push(b,c);
						else if (b==y[k-1]) x.r[x.r.length-1].push(a,c);
						else x.r[x.r.length-1].push(-1,a,b,c);
						}
					}
				}
			}
		if (i[1]<4){
			v.id.terminate();
			x.e = [i[1],v.r.length,v.d,v.r.length>0?v.r[0].length/3:0];
			x.t = Date.now()-key;
			delete tasks.w[key];
			delete tasks.s[tasks.k[key][0]][tasks.k[key][1]];
			if (Object.keys(tasks.s[tasks.k[key][0]]).length===0) delete tasks.s[tasks.k[key][0]];
			delete tasks.k[key];
			}
		LS._SetVar('BWM:LIST:'+ID,list);
		}
	}
function upSearch(){
	var keyA = (_Exist(tasks.s[cat])&&_Exist(tasks.s[cat][set[4]]))?tasks.s[cat][set[4]]:null;
	if (keyA!==null&&tasks.t===null) tasks.t = setInterval(upSearch,500);
	else if (keyA===null&&tasks.t!==null){
		clearInterval(tasks.t);
		tasks.t = null;
		}
	if (set[0][3]&&set[0][4]){
		searchIU.td05.style.display = (keyA===null)?'table-cell':'none';
		searchIU.td06.style.display = (keyA===null)?'none':'table-cell';
		searchIU.td07.style.display = (keyA===null)?'none':'table-cell';
		searchIU.td08.style.display = (keyA===null)?'none':'table-cell';
		if (keyA===null) searchIU.td10.textContent = s.e[0]===0?'-':'Recherche '+(s.e[0]==1?'annulée':(s.e[0]==2?'stoppée : ':'terminée : ')+(s.e[0]>0?s.e[1]+' résultat'+(s.e[1]>1?'s':'')+(s.e[1]>0?' (écart '+s.e[2]+' en '+(s.e[3])+' fusion'+(s.e[3]>1?'s':'')+')':''):''));
		else searchIU.td10.textContent = 'Recherche en cours... '+tasks.w[keyA].r.length+' résultat'+(tasks.w[keyA].r.length>1?'s':'')+(tasks.w[keyA].r.length>0?' (écart '+tasks.w[keyA].d+' en '+(tasks.w[keyA].r[0].length/3)+' fusion'+(tasks.w[keyA].r[0].length/3>1?'s':'')+')':'');
		var t = (new Date(keyA===null?s.t===0?0:s.t:Date.now()-keyA)).getTime(),
			sec = t/1000,
			d = Math.floor(sec/86400),
			hh = ('0'+Math.floor(sec/3600)%24).slice(-2),
			mm = ('0'+Math.floor(sec/60)%60).slice(-2),
			ss = ('0'+Math.floor(sec)%60).slice(-2);
		searchIU.td11.textContent = (d>0?d+'j. ':'')+hh+':'+mm+':'+ss;
		}
	}
// adapté de http://codes-sources.commentcamarche.net/source/100582-c-le-compte-est-bon-ou-presque
function workSearch(data,tmp){
	var n1=data.length,n2=n1-2;
	for (var i=0,a=data[i];i<n1;a=data[++i]){
		var nb=data.concat();
		nb.splice(i,1);
		for (var j=0,b=nb[j];j<=n2;b=nb[++j]){
			if (objCmp(b,a)===1){
				var v=objMix(a,b),d=objDiff(v,but);
				if (d===0){
					if (n2>niv){niv=n2;self.postMessage({'cmd':'new','key':key,'diff':0});}
					self.postMessage({'cmd':'add','key':key,'fusion':tmp.concat([b,a,v])});
					}
				else if (n2>niv){
					if ((niv<0)&&(d<=diff)){
						if ((d<diff)||(n2>nid)){diff=d;nid=n2;self.postMessage({'cmd':'new','key':key,'diff':d});}
						if (n2===nid){self.postMessage({'cmd':'add','key':key,'fusion':tmp.concat([b,a,v])});}
						}
					if (tmp.length<f){nb[j]=v;workSearch(nb,(tmp.concat([b,a,v])));nb[j]=b};
					}
				}
			}
		}
	}
function search(){
	var k = Date.now();
	if (!_Exist(tasks.s[cat])) tasks.s[cat] = {};
	if (_Exist(tasks.s[cat][set[4]])) cmdSearch(null,[null,1]);
	tasks.s[cat][set[4]] = k;
	tasks.k[k] = [cat,set[4]];
	tasks.w[k] = {'r':[],'d':'-'};
	tasks.w[k].id = new window.Worker(URL.createObjectURL(new Blob([
		"self.onmessage = function(e){",
			objCmp.toString(),
			objDiff.toString(),
			objMix.toString(),
			workSearch.toString(),
		"	var d = e.data, key = d.k, f = d.o[2]===''?1000:(d.o[2]-1)*3, mix = d.m, but = d.b,",
		"		nid = -1, niv = -1, diff = d.o[1]===''?1000:d.o[1];",
		"	workSearch(d.d,[]);",
		"	self.postMessage({'cmd':'end','key':key});",
		"	};"],
		{'type': 'text/javascript'})));
	tasks.w[k].id.onmessage = function(e){
		var w = tasks.w[e.data.key];
		switch (e.data.cmd){
			case 'new':
				w.r = [];
				w.d = e.data.diff;
				break;
			case 'add':
				var x = list[tasks.k[e.data.key][0]][tasks.k[e.data.key][1]],
					y = x.o[3]?set[8][0]:x.o[0];
				if (y===''||w.r.length<y) w.r.push(e.data.fusion);
				break;
			case 'end':
				cmdSearch(null,[e.data.key,3]);
				upTabs();
				break;
			}
		};
	tasks.w[k].id.onerror = function(e){
		console.debug('Worker error: %o %o',cat,JSONS._Encode(e.data));
		};
	tasks.w[k].id.postMessage({'k':k,'d':s.s,'o':(s.o[3]?set[8]:s.o),'m':mix,'b':but});
	s.e = [0,0,null,0];
	s.t = 0;
	upTabs();
	}
function itemAddClass(node,v){
	for (var j=1;j<5;j++){
		node['td0'+j].classList.add(v);
		}
	}
function itemDelClass(node,v){
	for (var j=1;j<5;j++){
		node['td0'+j].classList.remove(v);
		}
	}
function selectSameItem(e,i){
	for (var j=0;j<i.length;j++){itemAddClass(i[j],'selectedItem');}
	}
function unselectSameItem(e,i){
	for (var j=0;j<i.length;j++){itemDelClass(i[j],'selectedItem');}
	}
function upTabs(){
	var link = {}, target = [null,null], results = [], root = 0, lroot = null;
	if (_Exist(list['0'])&&Array.isArray(list['0'][0])){ // patch 2015.08.29 -> 2015.11.05
		for (var i in list){
			if (list.hasOwnProperty(i)){
				for (var j=0; j<list[i].length; j++){list[i].splice(j,1,{'b':[0,0,0,0],'e':[0,0,null,0],'o':['','','',true],'t':0,'s':[],'r':[list[i][j]]});}
				}
			}
		LS._SetVar('BWM:LIST:'+ID,list);
		PREF._Raz();
		set = PREF._Get('set');
		}
	cat = set[3][0]+set[3][1];
	arm = _Exist(items[cat])?items[cat]:[];
	if (!_Exist(list[cat])||(_Exist(list[cat])&&list[cat].length===0)){
		list[cat] = [{'b':[0,0,0,0],'e':[0,0,null,0],'o':['','','',true],'t':0,'s':[],'r':[[[0,0,0,0],[0,0,0,0],[0,0,0,0]]]}];
		}
	else if (_Exist(list[cat][set[4]])){
		if (list[cat][set[4]].r.length===0){list[cat][set[4]].r = [[[0,0,0,0],[0,0,0,0],[0,0,0,0]]];}
		if (!_Exist(list[cat][set[4]].o)){list[cat][set[4]].o = ['','','',true]} // patch 2015.12.05 -> 2015.12.07
		}
	if (!_Exist(list[cat][set[4]])){
		set[4] = 0;	set[6] = 0;	set[7] = [0,0];
		PREF._Set('set',set);
		}
	else if (!_Exist(list[cat][set[4]].r[set[6]])){
		set[6] = 0;
		if (set[7][0]>=0) set[7] = [0,0];
		PREF._Set('set',set);
		}
	if (list[cat][set[4]].s.length===0){list[cat][set[4]].s = [[0,0,0,0]];}
	c = list[cat]; s = c[set[4]]; r = s.r[set[6]]; but = s.b;
	// pré-calcule les fusions pour cette catégorie (hors qualité)
	for (var i=0; i<3; i++){
		var t = loc[i+2][set[3][0]], len = t.length;
		mix[i] = [];
		for (var j=0;j<len;j++){
			mix[i][j]=[];
			for (var k=0;k<len;k++){
				mix[i][j][k] = fusion(Math.min(j,k),Math.max(j,k),set[3][0],i);
				}
			}
		}
//console.debug('upTabs',JSON.stringify(s),JSON.stringify(set));
	// reconstruit l'interface
	DOM._CleanNode(rootIU.root);
	if (set[0][1]) bwIU.appendChild(rootIU.root.parentNode.removeChild(rootIU.root));
	else bwTop.parentNode.insertBefore(rootIU.root.parentNode.removeChild(rootIU.root),bwTop.nextSibling);
	IU._CreateElements({
		'hr':['div',{'class':'hr720'},[],{},'root'],
		't1':['table',{'class':'BWMtab3'},[],{},'root'],
		't1_tr':['tr',{},[],{},'t1'],
		't1_td0':['td',{'class':'BWMtd10 BWMtitle'},['Interface '+(set[0][1]?'▲':'▼')],{'click':[show,1]},'t1_tr'],
		't1_td1':['td',{'class':'BWMtd80 BWMtitle '+(set[0][0]?'enabled':'disabled')},[((typeof(GM_info)=='object')?GM_info.script.name:'?')+' : '],{'click':[show,0]},'t1_tr'],
		't1_a':['a',{'href':'https://github.com/Ecilam/BloodWarsMix','TARGET':'_blank'},[((typeof(GM_info)=='object')?GM_info.script.version:'?')],{},'t1_td1'],
//		't1_td2':['td',{'class':'BWMtd10 BWMtitle '+(set[0][2]?'enabled':'disabled')},['Bulles d\'aide'],{'click':[show,2]},'t1_tr'],
		'box':['div',{'class':'BWMbox','style':'display:'+(set[0][0]?'block;':'none;')},[],{},'root'],
		't2':['table',{'class':'BWMtab0'},[],{},'box'],
		't2_tr0':['tr',{},[],{},'t2'],
		't2_td0':['td',{'colspan':'3','class':'BWMtd100'},[],{},'t2_tr0'],
		't3':['table',{'class':'BWMtab1'},[],{},'t2_td0'], // Catégorie et Légendaire
		't3_tr0':['tr',{'class':'tblheader'},[],{},'t3'],
		't3_th0':['th',{},[],{},'t3_tr0'],
		't3_span0':['span',{},['Catégories - Légendaire : '],{},'t3_th0'],
		't3_span1':['span',{'class':'BWMselect'+(set[3][1]===''?' disabled':'')},['non'],{'click':[setL,'']},'t3_th0'],
		't3_span2':['span',{},[', '],{},'t3_th0'],
		't3_span3':['span',{'class':'BWMselect'+(set[3][1]=='L'?' disabled':'')},['oui'],{'click':[setL,'L']},'t3_th0'],
		't3_tr1':['tr',{},[],{},'t3'],
		't3_td0':['td',{'colspan':'2'},[],{},'t3_tr1'],
		't2_tr1':['tr',{},[],{},'t2'],
		't2_td10':['td',{'class':'BWMtd40'},[],{},'t2_tr1'],
		't4':['table',{'class':'BWMtab1'},[],{},'t2_td10'],
		't2_td11':['td',{'class':'BWMtd60'},[],{},'t2_tr1'],
		't5':['table',{'class':'BWMtab1'},[],{},'t2_td11'], // simulations
		't5_tr0':['tr',{'class':'tblheader'},[],{},'t5'],
		't5_th0':['th',{'colspan':'2','class':'BWMtd10 BWMselect '+(set[0][3]?'enabled':'disabled')},['['+(set[0][3]?'-':'+')+']'],{'click':[show,3]},'t5_tr0'],
		't5_th1':['th',{'colspan':'3','class':'BWMtd65'},[],{},'t5_tr0'],
		't5_span0':['span',{},['Simulations : '],{},'t5_th1'],
		't5_th2':['th',{'class':'BWMtd5 BWMselect heal'},['+'],{'click':[addS]},'t5_tr0'],
		't5_th3':(set[4]>0?['th',{'class':'BWMtd5 BWMselect'},['◄'],{'click':[moveS,-1]},'t5_tr0']:['th',{'class':'BWMtd5'},[],{},'t5_tr0']),
		't5_th4':(set[4]<c.length-1?['th',{'class':'BWMtd5 BWMselect'},['►'],{'click':[moveS,+1]},'t5_tr0']:['th',{'class':'BWMtd5'},[],{},'t5_tr0']),
		't5_th5':['th',{'class':'BWMtd5 BWMselect atkHit'},['X'],{'click':[delS]},'t5_tr0'],
		't5_th6':['th',{'class':'BWMtd5 BWMselect atkHit','onmouseout':'nd();','onmouseover':"return overlib('Efface toutes les simulations.',HAUTO,WRAP);"},['R'],{'click':[resetS]},'t5_tr0']},rootIU);
	// Catégorie
	for (var j=0;j<loc[0].length;j++){
		if (_Exist(tasks.s[j])) rootIU.t3_span1.classList.add('BWMblink');
		if (_Exist(tasks.s[j+'L'])) rootIU.t3_span3.classList.add('BWMblink');
		if (j!==0) rootIU['t3_span'+j+'a'] = IU._CreateElement('span',{},[', '],{},rootIU.t3_td0);
		rootIU['t3_span'+j+set[3][1]] = IU._CreateElement('span',{'class':'BWMselect'+(j==set[3][0]?' disabled':'')+(_Exist(tasks.s[j+set[3][1]])?' BWMblink':'')},[loc[0][j]],{'click':[setT,j]},rootIU.t3_td0);
		}
	// simulations
	for (var j=0;j<c.length;j++){
		if (j!==0) rootIU['t5_span1'+j+'a'] = IU._CreateElement('span',{},[', '],{},rootIU.t5_th1);
		rootIU['t5_span1'+j] = IU._CreateElement('span',{'class':'BWMselect'+(j==set[4]?' disabled':'')+(_Exist(tasks.s[cat])&&_Exist(tasks.s[cat][j])?' BWMblink':'')},[j],{'click':[setS,j]},rootIU.t5_th1);
		}
	// Recherche si Worker valide
	if (!!window.Worker){
		// affiche les recherches terminées
		for (var i in list){
			if (list.hasOwnProperty(i)){
				for (var j in list[i]){
					if (list[i].hasOwnProperty(j)&&list[i][j].e[0]==3){
						if (i.indexOf('L')==-1) rootIU.t3_span1.textContent += '*';
						else rootIU.t3_span3.textContent += '*';
						if ((i.indexOf('L')!=-1)==(set[3][1]=='L')){
							rootIU['t3_span'+i].textContent += '*';
							if (i==cat) rootIU['t5_span1'+j].textContent += '*';
							}
						}
					}
				}
			}
		if (set[0][3]){ // Recherche
			var v = s.o[3]?set[8]:s.o;
			IU._CreateElements({
				'tr0':['tr',{'class':'tblheader'},[],{},rootIU.t5],
				'th00':['th',{'colspan':'2','class':'BWMtd10 BWMselect '+(set[0][4]?'enabled':'disabled')},['['+(set[0][4]?'-':'+')+']'],{'click':[show,4]},'tr0'],
				'th01':['th',{'colspan':'6','class':'BWMtd80'},['Recherche : '],{},'tr0'],
				'span10':['span',{'class':'BWMselect'+(set[5]==-3?' disabled':'')},['Options ('+(v[0]===''?'∞':v[0])+','+(v[1]===''?'∞':v[1])+','+(v[2]===''?'∞':v[2])+(s.o[3]?',G':'')+')'],{'click':[setO,-3]},'th01'],
				'span11':['span',{},[', '],{},'th01'],
				'span12':['span',{'class':'BWMselect'+(set[5]==-2?' disabled':'')},['Index ('+s.s.length+')'],{'click':[setO,-2]},'th01'],
				'span13':['span',{},[', '],{},'th01'],
				'span14':['span',{'class':'BWMselect'+(set[5]==-1?' disabled':'')},['Cible ('+(but[0]+but[1]+but[2]+but[3])+')'],{'click':[setO,-1]},'th01'],
				'th02':['th',{'class':'BWMtd5 BWMselect atkHit'},['X'],{'click':[delSearch]},'tr0'],
				'th03':['th',{'class':'BWMtd5 BWMselect atkHit','onmouseout':'nd();','onmouseover':"return overlib('Efface tous les éléments de la recherche<br>et reprend les valeurs globales.',HAUTO,WRAP);"},['R'],{'click':[razSearch]},'tr0']});
			if (set[0][4]){
				if (set[5]==-3){ // bloc Option
					IU._CreateElements({
						'tr2':['tr',{'class':'BWMTR2'},[],{},rootIU.t5],
						'td2':['td',{'colspan':'10'},[],{},'tr2'],
						'tab2':['table',{'class':'BWMtab3'},[],{},'td2'],
						'tr20':['tr',{},[],{},'tab2'],
						'td20':['td',{},[],{},'tr20'],
						'span20':['span',{'onmouseout':'nd();','onmouseover':"return overlib('Limite le nombre de résultats.<br>Cette valeur ne réduit pas le temps de recherche.',HAUTO,WRAP);"},['Résultats max : '],{},'td20'],
						'res':['input',{'class':'inputbox BWMinput','type':'text','value':(s.o[3]?set[8][0]:s.o[0]),'onfocus':"this.select();"},[],{'change':[optSearch,0]},'td20'],
						'td21':['td',{},[],{},'tr20'],
						'span21':['span',{'onmouseout':'nd();','onmouseover':"return overlib('Limite la différence de points entre le résultat et la cible.<br>Cette valeur ne réduit pas le temps de recherche.',HAUTO,WRAP);"},['Ecart max : '],{},'td21'],
						'ecart':['input',{'class':'inputbox BWMinput','type':'text','value':(s.o[3]?set[8][1]:s.o[1]),'onfocus':"this.select();"},[],{'change':[optSearch,1]},'td21'],
						'td22':['td',{},[],{},'tr20'],
						'span22':['span',{'onmouseout':'nd();','onmouseover':"return overlib('Limite le nombre de fusions.<br>Cette valeur diminue le temps de recherche !',HAUTO,WRAP);"},['Fusions max : '],{},'td22'],
						'fusion':['input',{'class':'inputbox BWMinput','type':'text','value':(s.o[3]?set[8][2]:s.o[2]),'onfocus':"this.select();"},[],{'change':[optSearch,2]},'td22'],
						'td23':['td',{},[],{},'tr20'],
						//'td23':['td',{},[],{},'td23'],
						'labelG':['label',{'for':'BWMglobal','onmouseout':'nd();','onmouseover':"return overlib('Si actif, utilise les valeurs globales<br>à toutes les recherches.',HAUTO,WRAP);"},['Global : '],{},'td23'],
						'td24':['td',{},[],{},'tr20'],
						'global':['input',{'class':'BWMchkbox','type':'checkbox','id':'BWMglobal','checked':s.o[3]},[],{'click':[chkGlobal]},'td24']});
					}
				else if (set[5]==-2){ // bloc Sélection
					for (var j=0;j<s.s.length;j++){
						var tr = IU._CreateElements({
							'tr0':['tr',{'class':'BWMTR2'},[],{},rootIU.t5],
							'td00':['td',{'class':'BWMtd5'},[],{},'tr0'],
							'td01':['td',{'class':'BWMtd5 BWMcut'},[s.s[j][0]<1?'-':loc[1][s.s[j][0]]+" "],{'click':[setI,[-2,j]]},'tr0'],
							'td02':['td',{'class':'BWMtd20 BWMcut'},[s.s[j][1]<1?'-':s.s[j][1]+':'+loc[2][set[3][0]][s.s[j][1]][0]+" "],{'click':[setI,[-2,j]]},'tr0'],
							'td03':['td',{'class':'BWMtd20 BWMcut'},[s.s[j][2]<1?'-':s.s[j][2]+':'+loc[3][set[3][0]][s.s[j][2]][0]+" "],{'click':[setI,[-2,j]]},'tr0'],
							'td04':['td',{'class':'BWMtd25 BWMcut'},[s.s[j][3]<1?'-':s.s[j][3]+':'+loc[4][set[3][0]][s.s[j][3]][0]],{'click':[setI,[-2,j]]},'tr0'],
							'td05':['td',{'colspan':'3','class':'BWMtd15 BWMselect heal'},['+'],{'click':[addNewSel,j]},'tr0'],
							'td06':['td',{'colspan':'2','class':'BWMtd10 BWMselect atkHit'},['X'],{'click':[delSel,j]},'tr0']});
						var v = JSONS._Encode(s.s[j]);
						if (!_Exist(link[v])) link[v] = {};
						if (!_Exist(link[v]['sel'])) link[v]['sel'] = [tr];
						else link[v]['sel'].push(tr);
						if (set[7][0]==-2&&set[7][1]==j){target = [v,link[v]['sel'].length-1];}
						}
					}
				else { // bloc Recherche
					searchIU = IU._CreateElements({
						'tr0':['tr',{'class':'BWMTR2'},[],{},rootIU.t5],
						'td00':['td',{'class':'BWMtd5'},[],{'click':[setI,[-1,0]]},'tr0'],
						'td01':['td',{'class':'BWMtd5 BWMcut'},[but[0]<=0?'-':loc[1][but[0]]+" "],{'click':[setI,[-1,0]]},'tr0'],
						'td02':['td',{'class':'BWMtd20 BWMcut'},[but[1]<=0?'-':but[1]+':'+loc[2][set[3][0]][but[1]][0]+" "],{'click':[setI,[-1,0]]},'tr0'],
						'td03':['td',{'class':'BWMtd20 BWMcut'},[but[2]<=0?'-':but[2]+':'+loc[3][set[3][0]][but[2]][0]+" "],{'click':[setI,[-1,0]]},'tr0'],
						'td04':['td',{'class':'BWMtd25 BWMcut'},[but[3]<=0?'-':but[3]+':'+loc[4][set[3][0]][but[3]][0]],{'click':[setI,[-1,0]]},'tr0'],
						'td05':['td',{'colspan':'5','class':'BWMtd25 '+(s.s.length<2?'atkHit':'BWMselect heal')},['►►'],(s.s.length<2?{}:{'click':[search]}),'tr0'],
						'td06':['td',{'colspan':'1','class':'BWMtd5 BWMselect atkHit','onmouseout':'nd();','onmouseover':"return overlib('Stop la recherche',HAUTO,WRAP);"},['X'],{'click':[actSearch,1]},'tr0'],
						'td07':['td',{'colspan':'2','class':'BWMtd10 BWMselect atkHit','onmouseout':'nd();','onmouseover':"return overlib('Stop la recherche et affiche les résultats intermédiaires',HAUTO,WRAP);"},['X▼'],{'click':[actSearch,2]},'tr0'],
						'td08':['td',{'colspan':'2','class':'BWMtd10 BWMselect','onmouseout':'nd();','onmouseover':"return overlib('Affiche les résultats en cours',HAUTO,WRAP);"},['▼'],{'click':[actSearch,4]},'tr0'],
						'tr1':['tr',{'class':'BWMTR2'},[],{},rootIU.t5],
						'td10':['td',{'colspan':'5'},[],{},'tr1'],
						'td11':['td',{'colspan':'5'},[],{},'tr1']});
					var v = JSONS._Encode(but);
					if (!_Exist(link[v])) link[v] = {};
					link[v]['but'] = [searchIU];
					if (set[7][0]==-1){target = [v,0];}
					upSearch();
					}
				}
			}
		}
	if (set[0][3]){
		var newIU = {
			'tr0':['tr',{'class':'tblheader'},[],{},rootIU.t5],
			'th00':['th',{'colspan':'2','class':'BWMtd10 BWMselect '+(set[0][5]?'enabled':'disabled')},['['+(set[0][5]?'-':'+')+']'],{'click':[show,5]},'tr0'],
			'th01':['th',{'colspan':'3','class':'BWMtd65'},[],{},'tr0'],
			'span010':['span',{},['Résultats : '],{},'th01'],
			'th02':['th',{'class':'BWMtd5 BWMselect heal'},['+'],{'click':[addR]},'tr0'],
			'th03':(set[6]>0?['th',{'class':'BWMtd5 BWMselect'},['◄'],{'click':[moveR,-1]},'tr0']:['th',{'class':'BWMtd5'},[],{},'tr0']),
			'th04':(set[6]<s.r.length-1?['th',{'class':'BWMtd5 BWMselect'},['►'],{'click':[moveR,+1]},'tr0']:['th',{'class':'BWMtd5'},[],{},'tr0']),
			'th05':['th',{'class':'BWMtd5 BWMselect atkHit'},['X'],{'click':[delR]},'tr0'],
			'th06':['th',{'class':'BWMtd5 BWMselect atkHit','onmouseout':'nd();','onmouseover':"return overlib('Efface tous les résultats.',HAUTO,WRAP);"},['R'],{'click':[resetR]},'tr0']};
		for (var j=0;j<s.r.length;j++){
			newIU['span010'+j] = ['span',{'class':'BWMselect'+(j==set[6]?' disabled':'')},[j],{'click':[setR,j]},'th01'];
			if (j<s.r.length-1) newIU['span011'+j] = ['span',{},[', '],{},'th01'];
			}
		IU._CreateElements(newIU);
		if (set[0][5]){
			// update Résultats
			IU._CreateElements({
				'tr1':['tr',{'class':'tblheader'},[],{},rootIU.t5],
				'th10':['th',{'colspan':'2','class':'BWMtd10'},[],{},'tr1'],
				'th11':['th',{'class':'BWMtd20'},['Objet'],{},'tr1'],
				'th12':['th',{'class':'BWMtd20'},['Préfixe'],{},'tr1'],
				'th13':['th',{'class':'BWMtd25'},['Suffixe'],{},'tr1'],
				'td14':['th',{'colspan':'5','class':'BWMtd25'},['Actions'],{},'tr1']});
			for (var j=0;j<r.length;j++){
				if (r[j]==-1){
					if (lroot!==null) lroot.setAttribute('rowspan',j-root);
					root = j+1;
					IU._CreateElements({
						'tr':['tr',{'class':'BWMTR2'},[],{},rootIU.t5],
						'td0':['td',{'colspan':'5'},[],{},'tr'],
						'span00':['span',{'align':'center'},['---------------------------------'],{},'td0'],
						'td1':['td',{'class':'BWMselect atkHit','colspan':'5'},['X'],{'click':[delI,[j,root]]},'tr']});
					}
				else if (j-root>0&&((j-root)%2===0)){
					r[j] = objMix(r[j-2],r[j-1]);
					var tr = IU._CreateElements({
						'tr0':['tr',{'class':'BWMTR2 BWMeven'},[],{},rootIU.t5],
						'td00':['td',{'class':'BWMtd5 heal'},['='],{},'tr0'],
						'td01':['td',{'class':'BWMcut2 BWMtd5 heal'},[r[j][0]<=0?'-':loc[1][r[j][0]]],{},'tr0'],
						'td02':['td',{'class':'BWMcut2 BWMtd20 heal'},[r[j][1]<=0?'-':r[j][1]+':'+loc[2][set[3][0]][r[j][1]][0]+" "],{},'tr0'],
						'td03':['td',{'class':'BWMcut2 BWMtd20 heal'},[r[j][2]<=0?'-':r[j][2]+':'+loc[3][set[3][0]][r[j][2]][0]+" "],{},'tr0'],
						'td04':['td',{'class':'BWMcut2 BWMtd25 heal'},[r[j][3]<=0?'-':r[j][3]+':'+loc[4][set[3][0]][r[j][3]][0]],{},'tr0'],
						'td05':['td',{'class':'BWMtd5 BWMselect heal'},["+"],{'click':[addI,j]},'tr0'],
						'td06':(!(_Exist(r[j+1])&&r[j+1]==-1))?['td',{'class':'BWMtd5 BWMselect'},["<>"],{'click':[sepI,j]},'tr0']:['td',{'class':'BWMtd5'},[],{},'tr0'],
						'td07':['td',{'class':'BWMtd5 BWMselect atkHit','onmouseout':'nd();','onmouseover':"return overlib('Efface les lignes précédentes du bloc',HAUTO,WRAP);"},["◄"],{'click':[firstI,[j,root]]},'tr0'],
						'td08':['td',{'class':'BWMtd5 BWMselect atkHit','onmouseout':'nd();','onmouseover':"return overlib('Efface toutes les lignes précédentes',HAUTO,WRAP);"},["▲"],{'click':[firstI,[j,0]]},'tr0']});
					if (lroot!==null) lroot.setAttribute('rowspan',j-root+1);
					if (objCmp(r[j],[0,0,0,0])!==0){
						results.push(r[j]);
						var v = JSONS._Encode(r[j]);
						if (!_Exist(link[v])) link[v] = {};
						if (!_Exist(link[v]['fus'])) link[v]['fus'] = [tr];
						else link[v]['fus'].push(tr);
						}
					}
				else {
					var tr = IU._CreateElements({
						'tr0':['tr',{'class':'BWMTR2'},[],{},rootIU.t5],
						'td00':['td',{'class':'BWMtd5'},[(j-root===0?'':'+')],{'click':[setI,[set[6],j]]},'tr0'],
						'td01':['td',{'class':'BWMcut BWMtd5'},[r[j][0]<=0?'-':loc[1][r[j][0]]+" "],{'click':[setI,[set[6],j]]},'tr0'],
						'td02':['td',{'class':'BWMcut BWMtd20'},[r[j][1]<=0?'-':r[j][1]+':'+loc[2][set[3][0]][r[j][1]][0]+" "],{'click':[setI,[set[6],j]]},'tr0'],
						'td03':['td',{'class':'BWMcut BWMtd20'},[r[j][2]<=0?'-':r[j][2]+':'+loc[3][set[3][0]][r[j][2]][0]+" "],{'click':[setI,[set[6],j]]},'tr0'],
						'td04':['td',{'class':'BWMcut BWMtd25'},[r[j][3]<=0?'-':r[j][3]+':'+loc[4][set[3][0]][r[j][3]][0]],{'click':[setI,[set[6],j]]},'tr0'],
						'td05':(j-root===0)?['td',{'class':'BWMtd5 BWMselect heal'},["+"],{'click':[addI,j]},'tr0']:['td',{'class':'BWMtd5'},[],{},'tr0'],
						'td06':(j-root>0)?['td',{'class':'BWMtd5 BWMselect'},["▲"],{'click':[moveI,[j,(j-root>2?j-2:j-1)]]},'tr0']:['td',{'class':'BWMtd5'},[],{},'tr0'],
						'td07':(_Exist(r[j+2])&&r[j+2]!=-1)?['td',{'class':'BWMtd5 BWMselect'},["▼"],{'click':[moveI,[j,(j==root?j+1:j+2)]]},'tr0']:['td',{'class':'BWMtd5'},[],{},'tr0'],
						'td08':['td',{'class':'BWMtd5 BWMselect atkHit'},['X'],{'click':[delI,[j,root]]},'tr0']});
					if (j==root) lroot = IU._CreateElement('td',{'class':'BWMtd5 BWMselect atkHit'},['X'],{'click':[delB,root]},tr.tr0);
					var v = JSONS._Encode(r[j]);
					if (!_Exist(link[v])) link[v] = {};
					if (!_Exist(link[v]['res'])) link[v]['res'] = [tr];
					else link[v]['res'].push(tr);
					if (set[7][0]>=0&&set[7][1]==j){target = [v,link[v]['res'].length-1];}
					}
				}
			}
		}
	// update Saisie
	IU._CreateElements({
		'tr0':['tr',{'class':'tblheader'},[],{},rootIU.t4],
		'th00':['th',{'colspan':'1','class':'BWMtd10 BWMselect '+(set[0][6]?'enabled':'disabled')},['['+(set[0][6]?'-':'+')+']'],{'click':[show,6]},'tr0'],
		'th01':['th',{'colspan':'4','class':'BWMtd90'},['Saisie : '],{},'tr0'],
		'span010':['span',{'class':'BWMselect'+(set[1]===0?' disabled':'')},['listes ('+arm.length+'+'+results.length+')'],{'click':[setMode,0]},'th01'],
		'span011':['span',{},[', '],{},'th01'],
		'span012':['span',{'class':'BWMselect'+(set[1]==1?' disabled':'')},['manuelle'],{'click':[setMode,1]},'th01']});
	if (set[0][6]){
		if (set[1]===0){ // saisie par liste
			var sel = [arm,results];
			for (var k=0;k<sel.length;k++){
				if (sel[k].length>0){
					sel[k].sort(tabTri);
					IU._CreateElements({
						'tr0':['tr',{'class':'tblheader'},[],{},rootIU.t4],
						'th00':['th',{'colspan':'1','class':'BWMtd10 BWMselect '+(set[0][7+k]?'enabled':'disabled')},['['+(set[0][7+k]?'-':'+')+']'],{'click':[show,7+k]},'tr0'],
						'th01':['th',{'colspan':'4','class':'BWMtd90'},[(k===0?'Armurerie':'Synthèses')+' ('+sel[k].length+')'],{},'tr0']});
					if (set[0][7+k]){
						IU._CreateElements({
							'tr1':['tr',{'class':'tblheader'},[],{},rootIU.t4],
							'th10':['th',{'class':'BWMtd10 BWMtitle'},[],{'click':[setTri,0]},'tr1'],
							'th11':['th',{'class':'BWMtd25 BWMtitle'},['Objet'],{'click':[setTri,1]},'tr1'],
							'th12':['th',{'class':'BWMtd25 BWMtitle'},['Préfixe'],{'click':[setTri,2]},'tr1'],
							'th13':['th',{'class':'BWMtd30 BWMtitle'},['Suffixe'],{'click':[setTri,3]},'tr1'],
							'th14':['th',{'class':'BWMtd10 BWMselect'},['All'],{'click':[selAll,sel[k]]},'tr1'],
							'span':['span',{'class':'BWMtriSelect'},[(set[2][1]==1?'▲':'▼')],{},'th1'+(set[2][0])]});
						for (var i=0;i<sel[k].length;i++){
							var x = sel[k][i],
								tr = IU._CreateElements({'tr0':['tr',{'class':'BWMTR2'+(i%2===0?'':' BWMeven')},[],{},rootIU.t4]});
							for (var j=0;j<4;j++){
								var t = j===0?loc[j+1]:loc[j+1][set[3][0]];
								tr['td0'+(j+1)] = (x[j]==-1)?IU._CreateElement('td',{'class':'BWMcut disabled'},['Inconnu !'],{'click':[setISelect,x]},tr.tr0)
								:IU._CreateElement('td',{'class':'BWMcut'},[(x[j]===0?'-':(j===0?'':x[j]+':')+t[x[j]][0])],{'click':[setISelect,x]},tr.tr0);
								}
							tr.td5 = IU._CreateElement('td',{'class':'BWMselect'},['►'],{'click':[addSel,x]},tr.tr0);
							var v = JSONS._Encode(x);
							if (!_Exist(link[v])) link[v] = {};
							if (!_Exist(link[v]['s'+k])) link[v]['s'+k] = [tr];
							else link[v]['s'+k].push(tr);
							}
						}
					}
				}
			}
		else { // saisie manuelle
			var max = Math.max(loc[1].length,loc[2][set[3][0]].length,loc[3][set[3][0]].length,loc[4][set[3][0]].length);
			IU._CreateElements({
				'tr0':['tr',{'class':'tblheader'},[],{},rootIU.t4],
				'th0':['th',{'class':'BWMtd10'},[],{},'tr0'],
				'th1':['th',{},['Objet'],{},'tr0'],
				'th2':['th',{},['Préfixe'],{},'tr0'],
				'th3':['th',{},['Suffixe'],{},'tr0']});
			for (var i=0;i<max;i++){
				var newIU = {'tr0':['tr',{'class':'BWMTR'},[],{},rootIU.t4]};
				for (var j=0;j<4;j++){
					var x = j===0?loc[j+1]:loc[j+1][set[3][0]];
					if (i<x.length) newIU['td'+j] = ['td',{'class':'BWMcut BWMselect'+((set[7][0]==-1?but[j]:set[7][0]==-2?s.s[set[7][1]][j]:r[set[7][1]][j])==i?' disabled':'')},[(i===0?'-':(j===0?'':i+':')+x[i][0])],{'click':[setSelect,[j,i]]},'tr0'];
					else newIU['td'+j] = ['td',{},[],{},'tr0'];
					}
				IU._CreateElements(newIU);
				}
			}
		}
	// colorisation des objets sélectionnés/identiques
	for (var key in link){
		if (link.hasOwnProperty(key)){
			var v = set[7][0]==-1?'but':set[7][0]==-2?'sel':'res';
			if (_Exist(link[key][v])){
				v = link[key][v];
				for (var i=0;i<v.length;i++){
					var saisie = _Exist(link[key].s0)&&_Exist(link[key].s0[i])?link[key].s0[i]:null;
					if (target[0]==key&&target[1]==i){
						itemAddClass(v[i],'disabled');//spyinprogress disabled lnk
						if (saisie!==null) itemAddClass(saisie,'disabled');
						}
					else if (saisie!==null){
						itemAddClass(v[i],'item-link');
						itemAddClass(saisie,'item-link');
						}
					}
				}
			if (key!="[0,0,0,0]"){
				var all = Object.keys(link[key]).map(function(v){return link[key][v];}).reduce(function(pre,cur){return pre.concat(cur);});
				for (var i=0;i<all.length;i++){
					for (var j=1;j<5;j++){
						IU._addEvent(all[i]['td0'+j],'mouseover',selectSameItem,all);
						IU._addEvent(all[i]['td0'+j],'mouseout',unselectSameItem,all);
						}
					}
				}
			}
		}
	}

/******************************************************
* START
*
******************************************************/
// vérification des services
if (!JSON) throw new Error("Erreur : le service JSON n\'est pas disponible.");
else if (!window.localStorage) throw new Error("Erreur : le service localStorage n\'est pas disponible.");
else{
	var p = DATAS._GetPage(),
		player = DATAS._PlayerName(),
		IDs = LS._GetVar('BWM:IDS',{}),
        ID = null;
console.debug('BWMpage :',p);
	// Pages gérées par le script
	if (['null','pServerDeco','pServerUpdate','pServerOther'].indexOf(p)==-1&&player!==null){
console.debug('BWMstart: %o %o',player,IDs);
		if (p=='pMain'){
			var node = DOM._GetFirstNodeTextContent("//div[@class='throne-maindiv']/div/span[@class='reflink']",null);
			if (node!==null){
				var r2 = /r\.php\?r=([0-9]+)/.exec(node);
                if (_Exist(r2[1])){ ID = r2[1];}
				if (ID!==null){
					for (var i in IDs) if (IDs[i]==ID) delete IDs[i]; // en cas de changement de nom
					IDs[player] = ID;
					LS._SetVar('BWM:IDS',IDs);
					}
				}
			}
		// Autre pages nécessitant l'ID
		else if (_Exist(IDs[player])){
			ID = IDs[player];
			PREF._Init(ID);
			setCss();
			if (p=='pMixitem'){
				var bwIU = DOM._GetFirstNode("//div[@id='content-mid']"),
					bwTop = DOM._GetFirstNode("./div[@class='top-options']",bwIU);
				if (bwIU!==null&&bwTop!==null){
					var loc = L._Get("listes"),
						set = PREF._Get('set'),
						list = LS._GetVar('BWM:LIST:'+ID,{}),
						items = getListItem(),
						tasks = {'t':null,'k':{},'s':{},'w':{}},
						mix = [], cat, arm, but, c, s, r,
						searchIU,
						rootIU = IU._CreateElements({'root':['div',{'align':'center'},[],{},bwIU]});
					if (!Array.isArray(set[0])){ // patch 2015.12.05 -> 2015.12.07
						set[0] = PREF._GetDef('set')[0];
						set[8] = PREF._GetDef('set')[8];
						}
					upTabs();
					}
				}
			}
		else alert(L._Get("sUnknowID"));
		}
	}
console.debug('BWMend');
})();
