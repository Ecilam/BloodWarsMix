(function(){
// coding: utf-8
// ==UserScript==
// @author		Ecilam
// @name		Blood Wars Mix
// @version		2015.12.22
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
function clone(o){
	if(typeof o!='object'||o==null) return o;
	var newObjet = o.constructor();
	for(var i in o)	newObjet[i] = clone(o[i]);
	return newObjet;
	}
/******************************************************
* Debug
******************************************************/
var debug_time = Date.now();
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
		_CreateElements: function(list,oldIU){
			var r = _Exist(oldIU)?oldIU:{};
			for (var i=0;i<list.length;i++){
				var node = _Exist(r[list[i][5]])?r[list[i][5]]:list[i][5];
				r[list[i][0]] = this._CreateElement(list[i][1],list[i][2],list[i][3],list[i][4],node);
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
		defPrefs = {'set':[[true,true,true,true,true,true,true,true,true],0,[2,0],[0,''],0,-1,0,[0,0],['','','',true]]};
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
		".BWMdiv1{margin: 0px;padding: 0px;}",
		".BWMtab0{border-collapse: collapse;width: 100%;}",
		".BWMtab0 td{vertical-align: top;padding: 4px;}",
		".BWMtab1{border-collapse: collapse;width: 100%;text-align: center;}",
		".BWMtab1 td,.BWMtab1 th{border: 1px solid black;margin: 0;padding: 0px;}",
		".BWMtab3{border-collapse: collapse;width: 100%;text-align: center;}",
		".BWMtab3 td,.BWMtab3 th{border: 0px;margin: 0;padding: 0px;}",
		".BWMtab1 th,.BWMtab3 th{vertical-align: top;}",
		".BWMtab1 td,.BWMtab3 td,.BWMtab3 span, .BWMinput{vertical-align: middle;}",
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
		".BWMinput{width: 20px;height: 11px;margin: 0px 0px 0px 5px;text-align: right;font-weight: bold;}",
		".BWMerror{color:#FFF;background-color:red;}",
		".BWMoverlib{margin: 2px;padding: 5px;text-align: left;}",
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
	for (var i=0;i<4;i++){d+=(b[i]===0?0:a[i]===0?Infinity:Math.abs(a[i]-b[i]));}
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
function tabTri(c){ // c : [élément, sens]
   return function(a, b){
	   var v, x, y = c[1]===0?1:-1;
	   if (c[0]==5){ // index, tri sur diff
			v = objCmp([objDiff(a,but),a[2],a[3],a[1]],[objDiff(b,but),b[2],b[3],b[1]]);
		   }
	   else{
			x = [[0,2,3,1],[1,2,3,0],[2,3,1,0],[3,2,1,0]][c[0]];
			v = objCmp([a[x[0]],a[x[1]],a[x[2]],a[x[3]]],[b[x[0]],b[x[1]],b[x[2]],b[x[3]]]);
			}
		return (v===0)?0:(v==1)?y:0-y;
		}
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
	c.push({'b':[0,0,0,0],'e':[0,0,null,0],'o':clone(set[8]),'t':0,'s':[],'r':[[[0,0,0,0],[0,0,0,0],[0,0,0,0]]]});
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
	if (!_Exist(tasks.s[cat])||(_Exist(tasks.s[cat])&&!_Exist(tasks.s[cat][set[4]]))){
		s.s.push(i);
		LS._SetVar('BWM:LIST:'+ID,list);
		upTabs();
		}
	}
function selAll(e,i){
	if (!_Exist(tasks.s[cat])||(_Exist(tasks.s[cat])&&!_Exist(tasks.s[cat][set[4]]))){
		for (var j=0; j<i.length;j++){
			s.s.push(i[j]);
			}
		LS._SetVar('BWM:LIST:'+ID,list);
		upTabs();
		}
	}
function triSel(e,i){
	s.s.sort(tabTri(i));
	PREF._Set('set',set);
	LS._SetVar('BWM:LIST:'+ID,list);
	upTabs();
	}
function addNewSel(e,i){
	s.s.splice(i+1,0,[0,0,0,0]);
	if (set[7][0]==-2) set[7][1] = i+1;
	PREF._Set('set',set);
	LS._SetVar('BWM:LIST:'+ID,list);
	upTabs();
	}
function moveSel(e,i){
	s.s[i[0]] = [s.s[i[1]],s.s[i[1]]=s.s[i[0]]][0];//swap
	if (set[7][0]==-2) set[7][1] = set[7][1]==i[0]?i[1]:set[7][1]==i[1]?i[0]:set[7][1];
	PREF._Set('set',set);
	LS._SetVar('BWM:LIST:'+ID,list);
	upTabs();
	}
function delSel(e,i){
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
		e.target.classList.remove('BWMerror');
		v = v[1]===''?'':Number(v[1]);
		s.o[i] = v;
		LS._SetVar('BWM:LIST:'+ID,list);
		}
	else e.target.classList.add('BWMerror');
	}
function optPost(e){
	s.o[3] = !s.o[3];
	LS._SetVar('BWM:LIST:'+ID,list);
	}
function getOpt(e){
	s.o = clone(set[8]);
	LS._SetVar('BWM:LIST:'+ID,list);
	upTabs();
	}
function setOpt(e){
	set[8] = clone(s.o);
	PREF._Set('set',set);
	}
function delSearch(e){
	if (set[5]==-3){
		s.o = ['','',''];
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
	s.o = clone(set[8]);
	s.s = [];
	s.b = [0,0,0,0];
	s.e = [0,0,null,0];
	s.t = 0;
	PREF._Set('set',set);
	LS._SetVar('BWM:LIST:'+ID,list);
	upTabs();
	}
function setSelect(e,i){
	if (!_Exist(tasks.s[cat])||(_Exist(tasks.s[cat])&&!_Exist(tasks.s[cat][set[4]]))){
		if (set[7][0]==-1){
			but[i[0]] = i[1];
			}
		else if (set[7][0]==-2){
			s.s[set[7][1]][i[0]] = i[1];
			}
		}
	if (set[7][0]>=0) r[set[7][1]][i[0]] = i[1];
	LS._SetVar('BWM:LIST:'+ID,list);
	upTabs();
	}
function setISelect(e,i){
	if (!_Exist(tasks.s[cat])||(_Exist(tasks.s[cat])&&!_Exist(tasks.s[cat][set[4]]))){
		if (set[7][0]==-1){
			s.b = [i[0],i[1],i[2],i[3]];
			}
		else if (set[7][0]==-2){
			s.s[set[7][1]] = [i[0],i[1],i[2],i[3]];
			}
		}
	if (set[7][0]>=0) r[set[7][1]] = [i[0],i[1],i[2],i[3]];
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
		// sauve les résultats
		if (i[1]>1){
			for (var j=0;j<v.r.length;j++){
				x.r.push([]);
				for (var k=0,y=v.r[j];k<y.length;k=k+3){
					var a = y[k].slice(0,4), b = y[k+1].slice(0,4), c = y[k+2].slice(0,4);
					if (k===0) x.r[x.r.length-1].push(a,b,c);
					else if (objCmp(a,y[k-1].slice(0,4))==0) x.r[x.r.length-1].push(b,c);
					else if (objCmp(b,y[k-1].slice(0,4))==0) x.r[x.r.length-1].push(a,c);
					else x.r[x.r.length-1].push(-1,a,b,c);
					}
				}
			}
		// supprime le worker
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
	function upTime(t){
		var sec = t/1000,
			d = Math.floor(sec/86400),
			hh = ('0'+Math.floor(sec/3600)%24).slice(-2),
			mm = ('0'+Math.floor(sec/60)%60).slice(-2),
			ss = ('0'+Math.floor(sec)%60).slice(-2);
		return (d>0?d+'j. ':'')+hh+':'+mm+':'+ss;
		}
	var keyA = (_Exist(tasks.s[cat])&&_Exist(tasks.s[cat][set[4]]))?tasks.s[cat][set[4]]:null,
		cible = set[0][3]&&set[0][4]&&set[5]==-1;
	if (keyA!==null&&cible){
		if (tasks.t===null) tasks.t = setInterval(upSearch,500);
		}
	else if (tasks.t!==null){
		clearInterval(tasks.t);
		tasks.t = null;
		}
	if (cible){
		if (keyA===null){
			rootIU.t5_td35.style.display = 'table-cell';
			rootIU.t5_td36.style.display = 'none';
			rootIU.t5_td37.style.display = 'none';
			rootIU.t5_td38.style.display = 'none';
			rootIU.t5_td40.textContent = s.e[0]===0?'-':'Recherche '+(s.e[0]==1?'annulée':(s.e[0]==2?'stoppée : ':'terminée : ')+(s.e[0]>0?s.e[1]+' résultat'+(s.e[1]>1?'s':'')+(s.e[1]>0?' (écart '+s.e[2]+' en '+(s.e[3])+' fusion'+(s.e[3]>1?'s':'')+')':''):''));
			rootIU.t5_td41.textContent = upTime(new Date(s.t).getTime());
			}
		else{
			rootIU.t5_td35.style.display = 'none';
			rootIU.t5_td36.style.display = 'table-cell';
			rootIU.t5_td37.style.display = 'table-cell';
			rootIU.t5_td38.style.display = 'table-cell';
			rootIU.t5_td40.textContent = 'Recherche '+tasks.w[keyA].e+'% : '+tasks.w[keyA].r.length+' résultat'+(tasks.w[keyA].r.length>1?'s':'')+(tasks.w[keyA].r.length>0?' (écart '+tasks.w[keyA].d+' en '+(tasks.w[keyA].r[0].length/3)+' fusion'+(tasks.w[keyA].r[0].length/3>1?'s':'')+')':'');
			rootIU.t5_td41.textContent = upTime(new Date(Date.now()-keyA).getTime());
			}
		}
	}
// adapté de http://codes-sources.commentcamarche.net/source/100582-c-le-compte-est-bon-ou-presque
/*function workSearch(data,tmp){
	var n1=data.length,n2=n1-2;
	for (var i=0,a=data[i];i<n1;a=data[++i]){
		var nb=data.concat();
		nb.splice(i,1);
		for (var j=0,b=nb[j];j<=n2;b=nb[++j]){
			if (objCmp(b,a)===1){
				var v=objMix(a,b),d=objDiff(v,but);
				if (d===0){
					if (n2>niv){niv=n2;self.postMessage({'cmd':'new','key':key,'diff':0});}
					self.postMessage({'cmd':'add','key':key,'fusion':tmp[0].concat([b,a,v])});
					}
				else if (n2>niv){
					if ((niv<0)&&(d<=diff)){
						if ((d<diff)||(n2>nid)){diff=d;nid=n2;self.postMessage({'cmd':'new','key':key,'diff':d});}
						if (n2===nid){self.postMessage({'cmd':'add','key':key,'fusion':tmp[0].concat([b,a,v])});}
						}
					if (tmp[0].length<f){nb[j]=v;workSearch(nb,[tmp[0].concat([b,a,v]),0]);nb[j]=b};
					}
				}
			}
		}
	}*/

function workSearch(data,tmp){
	var n1=data.length,n2=n1-2;
	for (var i=0,a=data[i];i<n1;a=data[++i]){
		var nb=data.concat();
		nb.splice(i,1);
		for (var j=0,b=nb[j];j<=n2;b=nb[++j]){
			if (tmp[1]===0) self.postMessage({'cmd':'adv','key':key,'e':Math.floor((100/n1)*i+((100/n1)/(n2+1))*j)});
			if (objCmp(b,a)===1){
				var v=objMix(a,b).concat(0),d=objDiff(v,but),p=tmp[1]+a[4]+b[4];
				if (d<=diff){
					if (d<diff||p<niv){diff=d;niv=p;self.postMessage({'cmd':'new','key':key,'diff':d});}
					if (p==niv) self.postMessage({'cmd':'add','key':key,'fusion':tmp[0].concat([b,a,v])});
					}
				if (d>0&&tmp[0].length<f){nb[j]=v;workSearch(nb,[tmp[0].concat([b,a,v]),p]);nb[j]=b;}
				}
			}
		}
	}
function postSearch(data){
	function dataReduce(p,c,i,t){
		var j = 0, k = c.length-1;//k = 1;//
		while (j<c.length){
			if (k==j){p.push(data[c[j][0]]);j++; k=c.length;}
			else if (c[j][1]==c[k][1]){c.splice(k,1);}
			k--;
			}
		return p;
		}
	var tmp = {}, post = [];
	for (var i=0;i<data.length;i++){
		var v = JSON.stringify(data[i][data[i].length-1]);
		if (!_Exist(tmp[v])) tmp[v] = [];
		tmp[v].push([i,JSON.stringify(data[i].reduce(function(p,c){if (c[4]!==0) p.push(c); return p;},[]).sort(tabTri([0,0])))]);
		}
	post = Object.keys(tmp).map(function(v){return tmp[v];}).reduce(dataReduce,[]);
	return post;
	}
function search(){
	var k = Date.now(),
		datas = [];
	// prépare les données
	for (var i=0; i<s.s.length; i++){
		if (objDiff(s.s[i],but)===0){
			rootIU.t5_td40.textContent = "Recherche annulée. Cible présente dans l'index.";
			return;
			}
		else if (objDiff(s.s[i],but)!=Infinity&&objCmp(s.s[i],[0,0,0,0])!==0) datas.push(s.s[i].concat(s.s[i][1]+s.s[i][2]+s.s[i][3]));
		}
	// prépare le worker
	if (!_Exist(tasks.s[cat])) tasks.s[cat] = {};
	if (_Exist(tasks.s[cat][set[4]])) cmdSearch(null,[null,1]);
	tasks.s[cat][set[4]] = k;
	tasks.k[k] = [cat,set[4]];
	tasks.w[k] = {'r':[],'d':'-','e':0};
	tasks.w[k].id = new window.Worker(URL.createObjectURL(new Blob([
		"self.onmessage = function(e){",
			_Type.toString(),
			_Exist.toString(),
			objCmp.toString(),
			objDiff.toString(),
			objMix.toString(),
			tabTri.toString(),
			workSearch.toString(),
			postSearch.toString(),
		"	var d = e.data, key = d.k;",
		"	if (d.cmd=='start'){",
		"		var f = d.o[2]===''?Infinity:(d.o[2]-1)*3, mix = d.m, but = d.b, nid = -1, niv = -1, diff = d.o[1]===''?Infinity:d.o[1];",
		"		workSearch(d.d,[[],0]);",
		"		self.postMessage({'cmd':'end1','key':key});}",
		"	else if (d.cmd=='post'){",
		"		self.postMessage({'cmd':'end2','key':key,'d':postSearch(d.d)});",
		"		}",
		"	};"],
		{'type': 'text/javascript'})));
	tasks.w[k].id.onmessage = function(e){
		var d = e.data,
			w = tasks.w[d.key];
		switch (d.cmd){
			case 'adv':
				w.e = d.e;
				break;
			case 'new':
				w.r = [];
				w.d = d.diff;
				break;
			case 'add':
				var x = list[tasks.k[d.key][0]][tasks.k[d.key][1]].o[0];
				if (x===''||w.r.length<x) w.r.push(d.fusion);
				break;
			case 'end1':
				if (list[tasks.k[d.key][0]][tasks.k[d.key][1]].o[3]) w.id.postMessage({'cmd':'post','k':d.key,'d':w.r});
				else{
					cmdSearch(null,[d.key,3]);
					upTabs();
					}
				break;
			case 'end2':
				w.r = d.d;
				cmdSearch(null,[d.key,3]);
				upTabs();
				break;
			}
		};
	tasks.w[k].id.onerror = function(e){
		console.debug('Worker error: %o %o',cat,JSONS._Encode(e.data));
		};
	tasks.w[k].id.postMessage({'cmd':'start','k':k,'d':datas,'o':s.o,'m':mix,'b':but});
	s.e = [0,0,null,0];
	s.t = 0;
	upTabs();
	}
function itemAddClass(node,v){
	for (var j=1;j<5;j++){
		rootIU[node+'_'+j].classList.add(v);
		}
	}
function itemDelClass(node,v){
	for (var j=1;j<5;j++){
		rootIU[node+'_'+j].classList.remove(v);
		}
	}
function selectSameItem(e,i){
	for (var j=0;j<i.length;j++){
		itemAddClass(i[j],'selectedItem');
		}
	}
function unselectSameItem(e,i){
	for (var j=0;j<i.length;j++){
		itemDelClass(i[j],'selectedItem');
		}
	}
function addslashes(str){
	return (str + '').replace(/[\\"']/g,'\\$&').replace(/\u0000/g,'\\0');
	}
function upTabs(){
	var link = {}, target = [null,null], results = [], root = 0, lroot = null;
	if (_Exist(list['0'])&&Array.isArray(list['0'][0])){ // patch 2015.08.29 -> 2015.11.05
		for (var i in list){
			if (list.hasOwnProperty(i)){
				for (var j=0; j<list[i].length; j++){list[i].splice(j,1,{'b':[0,0,0,0],'e':[0,0,null,0],'o':clone(set[8]),'t':0,'s':[],'r':[list[i][j]]});}
				}
			}
		LS._SetVar('BWM:LIST:'+ID,list);
		PREF._Raz();
		set = PREF._Get('set');
		}
	cat = set[3][0]+set[3][1];
	arm = _Exist(items[cat])?items[cat]:[];
	if (!_Exist(list[cat])||(_Exist(list[cat])&&list[cat].length===0)){
		list[cat] = [{'b':[0,0,0,0],'e':[0,0,null,0],'o':clone(set[8]),'t':0,'s':[],'r':[[[0,0,0,0],[0,0,0,0],[0,0,0,0]]]}];
		}
	else if (_Exist(list[cat][set[4]])){
		if (list[cat][set[4]].r.length===0){list[cat][set[4]].r = [[[0,0,0,0],[0,0,0,0],[0,0,0,0]]];}
		if (!_Exist(list[cat][set[4]].o)){list[cat][set[4]].o = clone(set[8]);} // patch 2015.12.05 -> 2015.12.07
		else if (!_Exist(list[cat][set[4]].o[3])){list[cat][set[4]].o[3] = !!set[8][3];} // patch -> 2015.12.20
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
	if (_Exist(rootIU.root)) rootIU.root.parentNode.removeChild(rootIU.root); 
	rootIU.root = IU._CreateElement('div',{'align':'center'},[],{},null);
	if (set[0][1]) bwIU.appendChild(rootIU.root);
	else bwTop.parentNode.insertBefore(rootIU.root,bwTop.nextSibling);
	nd();
	IU._CreateElements([
		['hr','div',{'class':'hr720'},[],{},'root'],
		['t1','table',{'class':'BWMtab3'},[],{},'root'],
		['t1_tr','tr',{},[],{},'t1'],
		['t1_td0','td',{'class':'BWMtd10 BWMtitle'},['Interface '+(set[0][1]?'▲':'▼')],{'click':[show,1]},'t1_tr'],
		['t1_td1','td',{'class':'BWMtd80'},[],{},'t1_tr'],
		['t1_span0','span',{'class':'BWMtitle '+(set[0][0]?'enabled':'disabled')},[((typeof(GM_info)=='object')?GM_info.script.name:'?')+' : '],{'click':[show,0]},'t1_td1'],
		['t1_a','a',{'href':'https://github.com/Ecilam/BloodWarsMix','TARGET':'_blank'},[((typeof(GM_info)=='object')?GM_info.script.version:'?')],{},'t1_td1'],
		['t1_td2','td',{'class':'BWMtd10 BWMtitle '+(set[0][2]?'enabled':'disabled')},['Aide'],{'click':[show,2]},'t1_tr'],
		['box','div',{'class':'BWMbox','style':'display:'+(set[0][0]?'block;':'none;')},[],{},'root'],
		['t2','table',{'class':'BWMtab0'},[],{},'box'],
		['t2_tr0','tr',{},[],{},'t2'],
		['t2_td0','td',{'colspan':'3','class':'BWMtd100'},[],{},'t2_tr0'],
		['t3','table',{'class':'BWMtab1'},[],{},'t2_td0'], // Catégorie et Légendaire
		['t3_tr0','tr',{'class':'tblheader'},[],{},'t3'],
		['t3_th0','th',{},[],{},'t3_tr0'],
		['t3_span0','span',{},['Catégories - Légendaire : '],{},'t3_th0'],
		['t3_span1','span',{'class':'BWMselect'+(set[3][1]===''?' disabled':'')},['non'],{'click':[setL,'']},'t3_th0'],
		['t3_span2','span',{},[', '],{},'t3_th0'],
		['t3_span3','span',{'class':'BWMselect'+(set[3][1]=='L'?' disabled':'')},['oui'],{'click':[setL,'L']},'t3_th0'],
		['t3_tr1','tr',{},[],{},'t3'],
		['t3_td0','td',{'colspan':'2'},[],{},'t3_tr1'],
		['t2_tr1','tr',{},[],{},'t2'],
		['t2_td10','td',{'class':'BWMtd40'},[],{},'t2_tr1'],
		['t4','table',{'class':'BWMtab1'},[],{},'t2_td10'],
		['t2_td11','td',{'class':'BWMtd60'},[],{},'t2_tr1'],
		['t5','table',{'class':'BWMtab1'},[],{},'t2_td11'], // simulations
		['t5_tr0','tr',{'class':'tblheader'},[],{},'t5'],
		['t5_th0','th',{'colspan':'2','class':'BWMtd10 BWMselect '+(set[0][3]?'enabled':'disabled')},['['+(set[0][3]?'-':'+')+']'],{'click':[show,3]},'t5_tr0'],
		['t5_th1','th',{'colspan':'3','class':'BWMtd65'},[],{},'t5_tr0'],
		['t5_span0','span',{},['Simulations : '],{},'t5_th1'],
		['t5_th2','th',{'class':'BWMtd5 BWMselect heal'},['+'],{'click':[addS]},'t5_tr0'],
		(set[4]>0?['t5_th3','th',{'class':'BWMtd5 BWMselect'},['◄'],{'click':[moveS,-1]},'t5_tr0']:['t5_th3a','th',{'class':'BWMtd5'},[],{},'t5_tr0']),
		(set[4]<c.length-1?['t5_th4','th',{'class':'BWMtd5 BWMselect'},['►'],{'click':[moveS,+1]},'t5_tr0']:['t5_th4a','th',{'class':'BWMtd5'},[],{},'t5_tr0']),
		['t5_th5','th',{'class':'BWMtd5 BWMselect atkHit'},['X'],{'click':[delS]},'t5_tr0'],
		['t5_th6','th',{'class':'BWMtd5 BWMselect atkHit'},['R'],{'click':[resetS]},'t5_tr0']],rootIU);
	// Catégorie
	for (var j=0;j<loc[0].length;j++){
		if (_Exist(tasks.s[j])) rootIU.t3_span1.classList.add('BWMblink');
		if (_Exist(tasks.s[j+'L'])) rootIU.t3_span3.classList.add('BWMblink');
		if (j!==0) IU._CreateElements([['t3_span0a'+j,'span',{},[', '],{},'t3_td0']],rootIU);
		IU._CreateElements([['t3_span0b'+j+set[3][1],'span',{'class':'BWMselect'+(j==set[3][0]?' disabled':'')+(_Exist(tasks.s[j+set[3][1]])?' BWMblink':'')},[loc[0][j]],{'click':[setT,j]},'t3_td0']],rootIU);
		}
	// simulations
	for (var j=0;j<c.length;j++){
		if (j!==0) IU._CreateElements([['t5_span1a'+j,'span',{},[', '],{},'t5_th1']],rootIU);
		IU._CreateElements([['t5_span1b'+j,'span',{'class':'BWMselect'+(j==set[4]?' disabled':'')+(_Exist(tasks.s[cat])&&_Exist(tasks.s[cat][j])?' BWMblink':'')},[j],{'click':[setS,j]},'t5_th1']],rootIU);
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
							rootIU['t3_span0b'+i].textContent += '*';
							if (i==cat) rootIU['t5_span1b'+j].textContent += '*';
							}
						}
					}
				}
			}
		if (set[0][3]){ // Recherche
			var isGo = _Exist(tasks.s[cat])&&_Exist(tasks.s[cat][set[4]]);
			IU._CreateElements([
				['t5_tr1','tr',{'class':'tblheader'},[],{},'t5'],
				['t5_th10','th',{'colspan':'2','class':'BWMtd10 BWMselect '+(set[0][4]?'enabled':'disabled')},['['+(set[0][4]?'-':'+')+']'],{'click':[show,4]},'t5_tr1'],
				['t5_th11','th',{'colspan':'3','class':'BWMtd65'},[],{},'t5_tr1'],
				['t5_span110','span',{},['Recherche : '],{},'t5_th11'],
				['t5_span111','span',{'class':'BWMselect'+(set[5]==-2?' disabled':'')},['Index ('+s.s.length+')'],{'click':[setO,-2]},'t5_th11'],
				['t5_span112','span',{},[', '],{},'t5_th11'],
				['t5_span113','span',{'class':'BWMselect'+(set[5]==-1?' disabled':'')},['Cible'],{'click':[setO,-1]},'t5_th11'],
				['t5_th12','th',{'colspan':'3','class':'BWMtd15'},[],{},'t5_tr1'],
				(isGo?['t5_th13a','th',{'class':'BWMtd5'},[],{},'t5_tr1']:['t5_th13','th',{'class':'BWMtd5 BWMselect atkHit'},['X'],{'click':[delSearch]},'t5_tr1']),
				['t5_th14','th',{'class':'BWMtd5 BWMselect atkHit'},['R'],{'click':[razSearch]},'t5_tr1']],rootIU);
			if (set[0][4]){
				if (set[5]==-2){ // bloc Index
					IU._CreateElements([
						['t5_tr2','tr',{'class':'tblheader'},[],{},'t5'],
						['t5_td20','th',{'class':'BWMtd5'},[],{},'t5_tr2'],
						['t5_td21','th',{'class':'BWMtd5'},[],{},'t5_tr2'],
						['t5_span21a','span',{},[],{},'t5_td21'],
						['t5_td22','th',{'class':'BWMtd20'},[],{},'t5_tr2'],
						['t5_span22a','span',{},['Objet'],{},'t5_td22'],
						['t5_td23','th',{'class':'BWMtd20'},[],{},'t5_tr2'],
						['t5_span23a','span',{},['Préfixe'],{},'t5_td23'],
						['t5_td24','th',{'class':'BWMtd25'},[],{},'t5_tr2'],
						['t5_span24a','span',{},['Suffixe'],{},'t5_td24'],
						['t5_td25a','th',{'colspan':'5','class':'BWMtd25'},['Actions'],{},'t5_tr2']],rootIU);
					if (!isGo){
						IU._CreateElements([
							['t5_span20b','span',{'class':'BWMselect'},['▼'],{'click':[triSel,[5,0]]},'t5_td20'],
							['t5_span20c','span',{'class':'BWMselect'},['▲'],{'click':[triSel,[5,1]]},'t5_td20'],
							['t5_span21b','span',{'class':'BWMselect'},['▼'],{'click':[triSel,[0,0]]},'t5_td21'],
							['t5_span21c','span',{'class':'BWMselect'},['▲'],{'click':[triSel,[0,1]]},'t5_td21'],
							['t5_span22b','span',{'class':'BWMselect'},['▼'],{'click':[triSel,[1,0]]},'t5_td22'],
							['t5_span22c','span',{'class':'BWMselect'},['▲'],{'click':[triSel,[1,1]]},'t5_td22'],
							['t5_span23b','span',{'class':'BWMselect'},['▼'],{'click':[triSel,[2,0]]},'t5_td23'],
							['t5_span23c','span',{'class':'BWMselect'},['▲'],{'click':[triSel,[2,1]]},'t5_td23'],
							['t5_span24b','span',{'class':'BWMselect'},['▼'],{'click':[triSel,[3,0]]},'t5_td24'],
							['t5_span24c','span',{'class':'BWMselect'},['▲'],{'click':[triSel,[3,1]]},'t5_td24']],rootIU);
						}
					for (var j=0;j<s.s.length;j++){
						var v = JSONS._Encode(s.s[j]);
						if (!_Exist(link[v])) link[v] = {};
						if (!_Exist(link[v]['sel'])) link[v]['sel'] = [];
						link[v]['sel'].push('t5_td3'+j);
						if (set[7][0]==-2&&set[7][1]==j){target = [v,link[v]['sel'].length-1];}
						v = objDiff(s.s[j],but);
						IU._CreateElements([
							['t5_tr3'+j,'tr',{'class':'BWMTR2'+(j%2===0?'':' BWMeven')},[],{},'t5'],
							['t5_td3'+j+'_0','td',{'class':'BWMtd5 BWMcut'},[v==Infinity?'∞':v],{'click':[setI,[-2,j]]},'t5_tr3'+j],
							['t5_td3'+j+'_1','td',{'class':'BWMtd5 BWMcut'},[s.s[j][0]<1?'-':loc[1][s.s[j][0]]],{'click':[setI,[-2,j]]},'t5_tr3'+j],
							['t5_td3'+j+'_2','td',{'class':'BWMtd20 BWMcut'},[s.s[j][1]<1?'-':s.s[j][1]+':'+loc[2][set[3][0]][s.s[j][1]][0]],{'click':[setI,[-2,j]]},'t5_tr3'+j],
							['t5_td3'+j+'_3','td',{'class':'BWMtd20 BWMcut'},[s.s[j][2]<1?'-':s.s[j][2]+':'+loc[3][set[3][0]][s.s[j][2]][0]],{'click':[setI,[-2,j]]},'t5_tr3'+j],
							['t5_td3'+j+'_4','td',{'class':'BWMtd25 BWMcut'},[s.s[j][3]<1?'-':s.s[j][3]+':'+loc[4][set[3][0]][s.s[j][3]][0]],{'click':[setI,[-2,j]]},'t5_tr3'+j]],rootIU);
						if (isGo){
							IU._CreateElements([
								['t5_td3'+j+'_5','td',{'class':'BWMtd5'},[],{},'t5_tr3'+j],
								['t5_td3'+j+'_5','th',{'class':'BWMtd5'},[],{},'t5_tr3'+j],
								['t5_td3'+j+'_5','th',{'class':'BWMtd5'},[],{},'t5_tr3'+j],
								['t5_td3'+j+'_6','td',{'colspan':'2','class':'BWMtd10'},[],{},'t5_tr3'+j]],rootIU);
							}
						else{
							IU._CreateElements([
								['t5_td3'+j+'_5','td',{'class':'BWMtd5 BWMselect heal'},['+'],{'click':[addNewSel,j]},'t5_tr3'+j],
								(j<s.s.length-1?['t5_td3'+j+'_6','th',{'class':'BWMtd5 BWMselect'},['▼'],{'click':[moveSel,[j,j+1]]},'t5_tr3'+j]:['t5_td3'+j+'_6','th',{'class':'BWMtd5 BWMselect'},[],{},'t5_tr3'+j]),
								(j>0?['t5_td3'+j+'_7','th',{'class':'BWMtd5 BWMselect'},['▲'],{'click':[moveSel,[j,j-1]]},'t5_tr3'+j]:['t5_td3'+j+'_7','th',{'class':'BWMtd5 BWMselect'},[],{},'t5_tr3'+j]),
								['t5_td3'+j+'_8','td',{'colspan':'2','class':'BWMtd10 BWMselect atkHit'},['X'],{'click':[delSel,j]},'t5_tr3'+j]],rootIU);
							}
						}
					}
				else { // bloc Cible
					var v = JSONS._Encode(but);
					if (!_Exist(link[v])) link[v] = {};
					link[v]['but'] = ['t5_td3'];
					if (set[7][0]==-1){target = [v,0];}
					IU._CreateElements([
						['t5_tr2','tr',{'class':'BWMTR2'},[],{},'t5'],
						['t5_td20','td',{'colspan':'5','class':'BWMtd65'},[],{},'t5_tr2'],
						['t6','table',{'class':'BWMtab3'},[],{},'t5_td20'],
						['t6_tr0','tr',{},[],{},'t6'],
						['t6_td00','td',{},[],{},'t6_tr0'],
						['t6_span00','span',{},['Rés. max'],{},'t6_td00'],
						['t6_td01','td',{},[],{},'t6_tr0'],
						['t6_span01','span',{},['Ecart max'],{},'t6_td01'],
						['t6_td02','td',{},[],{},'t6_tr0'],
						['t6_span02','span',{},['Fus. max'],{},'t6_td02'],
						['t6_td03','td',{},[],{},'t6_tr0'],
						['t6_span03','span',{},['Post'],{},'t6_td03'],
						['t5_tr3','tr',{'class':'BWMTR2'},[],{},'t5'],
						['t5_td3_0','td',{'class':'BWMtd5 BWMcut'},[],{'click':[setI,[-1,0]]},'t5_tr3'],
						['t5_td3_1','td',{'class':'BWMtd5 BWMcut'},[but[0]<=0?'-':loc[1][but[0]]+" "],{'click':[setI,[-1,0]]},'t5_tr3'],
						['t5_td3_2','td',{'class':'BWMtd20 BWMcut'},[but[1]<=0?'-':but[1]+':'+loc[2][set[3][0]][but[1]][0]+" "],{'click':[setI,[-1,0]]},'t5_tr3'],
						['t5_td3_3','td',{'class':'BWMtd20 BWMcut'},[but[2]<=0?'-':but[2]+':'+loc[3][set[3][0]][but[2]][0]+" "],{'click':[setI,[-1,0]]},'t5_tr3'],
						['t5_td3_4','td',{'class':'BWMtd25 BWMcut'},[but[3]<=0?'-':but[3]+':'+loc[4][set[3][0]][but[3]][0]],{'click':[setI,[-1,0]]},'t5_tr3'],
						['t5_td35','td',{'colspan':'5','class':'BWMtd25 '+(s.s.length<2?'atkHit':'BWMselect heal')},['►►'],(s.s.length<2?{}:{'click':[search]}),'t5_tr3'],
						['t5_td36','td',{'colspan':'1','class':'BWMtd5 BWMselect atkHit'},['X'],{'click':[actSearch,1]},'t5_tr3'],
						['t5_td37','td',{'colspan':'2','class':'BWMtd10 BWMselect atkHit'},['X▼'],{'click':[actSearch,2]},'t5_tr3'],
						['t5_td38','td',{'colspan':'2','class':'BWMtd10 BWMselect'},['▼'],{'click':[actSearch,4]},'t5_tr3'],
						['t5_tr4','tr',{'class':'BWMTR2'},[],{},'t5'],
						['t5_td40','td',{'colspan':'5'},[],{},'t5_tr4'],
						['t5_td41','td',{'colspan':'5'},[],{},'t5_tr4']],rootIU);
					if (isGo){
						IU._CreateElements([
							['t6_res','input',{'class':'inputbox BWMinput','type':'text','disabled':true,'value':s.o[0]},[],{},'t6_td00'],
							['t6_ecart','input',{'class':'inputbox BWMinput','type':'text','disabled':true,'value':s.o[1]},[],{},'t6_td01'],
							['t6_fusion','input',{'class':'inputbox BWMinput','type':'text','disabled':true,'value':s.o[2]},[],{},'t6_td02'],
							['t6_post','input',{'class':'BWMinput','type':'checkbox','disabled':true,'checked':s.o[3]},[],{},'t6_td03'],
							['t5_td21','td',{'colspan':'3','class':'BWMtd15'},[],{},'t5_tr2']],rootIU);
						}
					else{
						IU._CreateElements([
							['t6_res','input',{'class':'inputbox BWMinput','type':'text','value':s.o[0],'onfocus':"this.select();"},[],{'change':[optSearch,0],'keyup':[optSearch,0]},'t6_td00'],
							['t6_ecart','input',{'class':'inputbox BWMinput','type':'text','value':s.o[1],'onfocus':"this.select();"},[],{'change':[optSearch,1],'keyup':[optSearch,1]},'t6_td01'],
							['t6_fusion','input',{'class':'inputbox BWMinput','type':'text','value':s.o[2],'onfocus':"this.select();"},[],{'change':[optSearch,2],'keyup':[optSearch,2]},'t6_td02'],
							['t6_post','input',{'class':'BWMinput','type':'checkbox','checked':s.o[3]},[],{'change':[optPost]},'t6_td03'],
							['t5_td21a','td',{'colspan':'3','class':'BWMtd15 BWMselect heal'},['▼'],{'click':[getOpt]},'t5_tr2']],rootIU);
						}
					IU._CreateElements([['t5_td22a','td',{'colspan':'2','class':'BWMtd10 BWMselect atkHit'},['▲'],{'click':[setOpt]},'t5_tr2']],rootIU);
					upSearch();
					}
				}
			}
		}
	if (set[0][3]){ // Résultats
		IU._CreateElements([
			['t5_tr5','tr',{'class':'tblheader'},[],{},'t5'],
			['t5_th50','th',{'colspan':'2','class':'BWMtd10 BWMselect '+(set[0][5]?'enabled':'disabled')},['['+(set[0][5]?'-':'+')+']'],{'click':[show,5]},'t5_tr5'],
			['t5_th51','th',{'colspan':'3','class':'BWMtd65'},[],{},'t5_tr5'],
			['t5_span510','span',{},['Résultats : '],{},'t5_th51'],
			['t5_th52','th',{'class':'BWMtd5 BWMselect heal'},['+'],{'click':[addR]},'t5_tr5'],
			(set[6]>0?['t5_th53','th',{'class':'BWMtd5 BWMselect'},['◄'],{'click':[moveR,-1]},'t5_tr5']:['t5_th53a','th',{'class':'BWMtd5'},[],{},'t5_tr5']),
			(set[6]<s.r.length-1?['t5_th54','th',{'class':'BWMtd5 BWMselect'},['►'],{'click':[moveR,+1]},'t5_tr5']:['t5_th54a','th',{'class':'BWMtd5'},[],{},'t5_tr5']),
			['t5_th55','th',{'class':'BWMtd5 BWMselect atkHit'},['X'],{'click':[delR]},'t5_tr5'],
			['t5_th56','th',{'class':'BWMtd5 BWMselect atkHit'},['R'],{'click':[resetR]},'t5_tr5']],rootIU);
		for (var j=0;j<s.r.length;j++){
			IU._CreateElements([['t5_span41a'+j,'span',{'class':'BWMselect'+(j==set[6]?' disabled':'')},[j],{'click':[setR,j]},'t5_th51']],rootIU);
			if (j<s.r.length-1) IU._CreateElements([['t5_span41b'+j,'span',{},[', '],{},'t5_th51']],rootIU);
			}
		if (set[0][5]){
			IU._CreateElements([
				['t5_tr6','tr',{'class':'tblheader'},[],{},'t5'],
				['t5_th60','th',{'colspan':'2','class':'BWMtd10'},[],{},'t5_tr6'],
				['t5_th61','th',{'class':'BWMtd20'},['Objet'],{},'t5_tr6'],
				['t5_th62','th',{'class':'BWMtd20'},['Préfixe'],{},'t5_tr6'],
				['t5_th63','th',{'class':'BWMtd25'},['Suffixe'],{},'t5_tr6'],
				['t5_th64','th',{'colspan':'5','class':'BWMtd25'},['Actions'],{},'t5_tr6']],rootIU);
			for (var j=0;j<r.length;j++){
				if (r[j]==-1){ // séparateur
					if (lroot!==null) lroot.setAttribute('rowspan',j-root);
					root = j+1;
					IU._CreateElements([
						['t5_tr6'+j,'tr',{'class':'BWMTR2'},[],{},'t5'],
						['t5_td6'+j+'_0','td',{'colspan':'5'},[],{},'t5_tr6'+j],
						['t5_span6'+j+'_0','span',{'align':'center'},['---------------------------------'],{},'t5_td6'+j+'_0'],
						['t5_td6'+j+'_1','td',{'class':'BWMselect atkHit','colspan':'5'},['X'],{'click':[delI,[j,root]]},'t5_tr6'+j]],rootIU);
					}
				else if (j-root>0&&((j-root)%2===0)){ // fusions
					r[j] = objMix(r[j-2],r[j-1]);
					if (objCmp(r[j],[0,0,0,0])!==0){
						results.push(r[j]);
						var v = JSONS._Encode(r[j]);
						if (!_Exist(link[v])) link[v] = {};
						if (!_Exist(link[v]['fus'])) link[v]['fus'] = [];
						link[v]['fus'].push('t5_td6'+j);
						}
					IU._CreateElements([
						['t5_tr6'+j,'tr',{'class':'BWMTR2 BWMeven'},[],{},'t5'],
						['t5_td6'+j+'_0','td',{'class':'BWMcut2 BWMtd5 heal'},['='],{},'t5_tr6'+j],
						['t5_td6'+j+'_1','td',{'class':'BWMcut2 BWMtd5 heal'},[r[j][0]<=0?'-':loc[1][r[j][0]]],{},'t5_tr6'+j],
						['t5_td6'+j+'_2','td',{'class':'BWMcut2 BWMtd20 heal'},[r[j][1]<=0?'-':r[j][1]+':'+loc[2][set[3][0]][r[j][1]][0]+" "],{},'t5_tr6'+j],
						['t5_td6'+j+'_3','td',{'class':'BWMcut2 BWMtd20 heal'},[r[j][2]<=0?'-':r[j][2]+':'+loc[3][set[3][0]][r[j][2]][0]+" "],{},'t5_tr6'+j],
						['t5_td6'+j+'_4','td',{'class':'BWMcut2 BWMtd25 heal'},[r[j][3]<=0?'-':r[j][3]+':'+loc[4][set[3][0]][r[j][3]][0]],{},'t5_tr6'+j],
						['t5_td6'+j+'_5','td',{'class':'BWMtd5 BWMselect heal'},['+'],{'click':[addI,j]},'t5_tr6'+j],
						(!(_Exist(r[j+1])&&r[j+1]==-1))?['t5_td6'+j+'_6','td',{'class':'BWMtd5 BWMselect'},["<>"],{'click':[sepI,j]},'t5_tr6'+j]:['t5_td6'+j+'_6','td',{'class':'BWMtd5'},[],{},'t5_tr6'+j],
						['t5_td6'+j+'_7','td',{'class':'BWMtd5 BWMselect atkHit'},['◄'],{'click':[firstI,[j,root]]},'t5_tr6'+j],
						['t5_td6'+j+'_8','td',{'class':'BWMtd5 BWMselect atkHit'},['▲'],{'click':[firstI,[j,0]]},'t5_tr6'+j]],rootIU);
					if (lroot!==null) lroot.setAttribute('rowspan',j-root+1);
					}
				else { // objets
					var v = JSONS._Encode(r[j]);
					if (!_Exist(link[v])) link[v] = {};
					if (!_Exist(link[v]['res'])) link[v]['res'] = [];
					link[v]['res'].push('t5_td6'+j);
					if (set[7][0]>=0&&set[7][1]==j){target = [v,link[v]['res'].length-1];}
					IU._CreateElements([
						['t5_tr6'+j,'tr',{'class':'BWMTR2'},[],{},'t5'],
						['t5_td6'+j+'_0','td',{'class':'BWMcut BWMtd5'},[(j-root===0?'':'+')],{'click':[setI,[set[6],j]]},'t5_tr6'+j],
						['t5_td6'+j+'_1','td',{'class':'BWMcut BWMtd5'},[r[j][0]<=0?'-':loc[1][r[j][0]]+" "],{'click':[setI,[set[6],j]]},'t5_tr6'+j],
						['t5_td6'+j+'_2','td',{'class':'BWMcut BWMtd20'},[r[j][1]<=0?'-':r[j][1]+':'+loc[2][set[3][0]][r[j][1]][0]+" "],{'click':[setI,[set[6],j]]},'t5_tr6'+j],
						['t5_td6'+j+'_3','td',{'class':'BWMcut BWMtd20'},[r[j][2]<=0?'-':r[j][2]+':'+loc[3][set[3][0]][r[j][2]][0]+" "],{'click':[setI,[set[6],j]]},'t5_tr6'+j],
						['t5_td6'+j+'_4','td',{'class':'BWMcut BWMtd25'},[r[j][3]<=0?'-':r[j][3]+':'+loc[4][set[3][0]][r[j][3]][0]],{'click':[setI,[set[6],j]]},'t5_tr6'+j],
						(j-root===0)?['t5_td6'+j+'_5','td',{'class':'BWMtd5 BWMselect heal'},["+"],{'click':[addI,j]},'t5_tr6'+j]:['t5_td6'+j+'_5','td',{'class':'BWMtd5'},[],{},'t5_tr6'+j],
						(_Exist(r[j+2])&&r[j+2]!=-1)?['t5_td6'+j+'_7','td',{'class':'BWMtd5 BWMselect'},['▼'],{'click':[moveI,[j,(j==root?j+1:j+2)]]},'t5_tr6'+j]:['t5_td6'+j+'_7','td',{'class':'BWMtd5'},[],{},'t5_tr6'+j],
						(j-root>0)?['t5_td6'+j+'_6','td',{'class':'BWMtd5 BWMselect'},['▲'],{'click':[moveI,[j,(j-root>2?j-2:j-1)]]},'t5_tr6'+j]:['t5_td6'+j+'_6','td',{'class':'BWMtd5'},[],{},'t5_tr6'+j],
						['t5_td6'+j+'_8','td',{'class':'BWMtd5 BWMselect atkHit'},['X'],{'click':[delI,[j,root]]},'t5_tr6'+j]],rootIU);
					if (j==root) lroot = IU._CreateElement('td',{'class':'BWMtd5 BWMselect atkHit'},['B'],{'click':[delB,root]},rootIU['t5_tr6'+j]);
					}
				}
			}
		}
	// Saisie
	IU._CreateElements([
		['t4_tr','tr',{'class':'tblheader'},[],{},'t4'],
		['t4_th0','th',{'colspan':'1','class':'BWMtd10 BWMselect '+(set[0][6]?'enabled':'disabled')},['['+(set[0][6]?'-':'+')+']'],{'click':[show,6]},'t4_tr'],
		['t4_th1','th',{'colspan':'4','class':'BWMtd90'},[],{},'t4_tr'],
		['t4_span10','span',{},['Saisie : '],{},'t4_th1'],
		['t4_span11','span',{'class':'BWMselect'+(set[1]===0?' disabled':'')},['listes ('+arm.length+'+'+results.length+')'],{'click':[setMode,0]},'t4_th1'],
		['t4_span12','span',{},[', '],{},'t4_th1'],
		['t4_span13','span',{'class':'BWMselect'+(set[1]==1?' disabled':'')},['manuelle'],{'click':[setMode,1]},'t4_th1']],rootIU);
	if (set[0][6]){
		if (set[1]===0){ // saisie par liste
			var sel = [arm,results];
			for (var k=0;k<sel.length;k++){
				if (sel[k].length>0){
					sel[k].sort(tabTri(set[2]));
					IU._CreateElements([
						['t4_tr0'+k,'tr',{'class':'tblheader'},[],{},'t4'],
						['t4_th0'+k+'_0','th',{'colspan':'1','class':'BWMtd10 BWMselect '+(set[0][7+k]?'enabled':'disabled')},['['+(set[0][7+k]?'-':'+')+']'],{'click':[show,7+k]},'t4_tr0'+k],
						['t4_th0'+k+'_1','th',{'colspan':'4','class':'BWMtd90'},[(k===0?'Armurerie':'Synthèses')+' ('+sel[k].length+')'],{},'t4_tr0'+k]],rootIU);
					if (set[0][7+k]){
						IU._CreateElements([
							['t4_tr1'+k,'tr',{'class':'tblheader'},[],{},'t4'],
							['t4_th1'+k+'_0','th',{'class':'BWMtd10 BWMtitle'},[],{'click':[setTri,0]},'t4_tr1'+k],
							['t4_th1'+k+'_1','th',{'class':'BWMtd25 BWMtitle'},['Objet'],{'click':[setTri,1]},'t4_tr1'+k],
							['t4_th1'+k+'_2','th',{'class':'BWMtd25 BWMtitle'},['Préfixe'],{'click':[setTri,2]},'t4_tr1'+k],
							['t4_th1'+k+'_3','th',{'class':'BWMtd30 BWMtitle'},['Suffixe'],{'click':[setTri,3]},'t4_tr1'+k],
							['t4_th1'+k+'_4','th',{'class':'BWMtd10 BWMselect'},['All'],{'click':[selAll,sel[k]]},'t4_tr1'+k],
							['t4_span11'+k,'span',{'class':'BWMtriSelect'},[(set[2][1]==1?'▲':'▼')],{},'t4_th1'+k+'_'+(set[2][0])]],rootIU);
						for (var i=0;i<sel[k].length;i++){
							var x = sel[k][i],
								v = JSONS._Encode(x);
							if (!_Exist(link[v])) link[v] = {};
							if (!_Exist(link[v]['s'+k])) link[v]['s'+k] = [];
							link[v]['s'+k].push('t4_td2'+k+'_'+i);							
							IU._CreateElements([['t4_tr2'+k+'_'+i,'tr',{'class':'BWMTR2'+(i%2===0?'':' BWMeven')},[],{},'t4']],rootIU);
							for (var j=0;j<4;j++){
								var t = j===0?loc[j+1]:loc[j+1][set[3][0]];
								if (x[j]==-1) IU._CreateElements([['t4_td2'+k+'_'+i+'_'+(j+1),'td',{'class':'BWMcut disabled'},['Inconnu !'],{'click':[setISelect,x]},'t4_tr2'+k+'_'+i]],rootIU);
								else IU._CreateElements([['t4_td2'+k+'_'+i+'_'+(j+1),'td',{'class':'BWMcut'},[(x[j]===0?'-':(j===0?'':x[j]+':')+t[x[j]][0])],{'click':[setISelect,x]},'t4_tr2'+k+'_'+i]],rootIU);
								}
							IU._CreateElements([['t4_td2'+k+'_'+i+'_5','td',{'class':'BWMselect'},['►'],{'click':[addSel,x]},'t4_tr2'+k+'_'+i]],rootIU);
							}
						}
					}
				}
			}
		else { // saisie manuelle
			var max = Math.max(loc[1].length,loc[2][set[3][0]].length,loc[3][set[3][0]].length,loc[4][set[3][0]].length);
			IU._CreateElements([
				['t4_tr0','tr',{'class':'tblheader'},[],{},'t4'],
				['t4_th00','th',{'class':'BWMtd10'},[],{},'t4_tr0'],
				['t4_th01','th',{},['Objet'],{},'t4_tr0'],
				['t4_th02','th',{},['Préfixe'],{},'t4_tr0'],
				['t4_th03','th',{},['Suffixe'],{},'t4_tr0']],rootIU);
			for (var i=0;i<max;i++){
				IU._CreateElements([['t4_tr1'+i,'tr',{'class':'BWMTR'},[],{},'t4']],rootIU);
				for (var j=0;j<4;j++){
					var x = j===0?loc[j+1]:loc[j+1][set[3][0]];
					if (i<x.length) IU._CreateElements([['t4_td1'+i+'_'+j,'td',{'class':'BWMcut BWMselect'+((set[7][0]==-1?but[j]:set[7][0]==-2?s.s[set[7][1]][j]:r[set[7][1]][j])==i?' disabled':'')},[(i===0?'-':(j===0?'':i+':')+x[i][0])],{'click':[setSelect,[j,i]]},'t4_tr1'+i]],rootIU);
					else IU._CreateElements([['t4_td1'+i+'_'+j,'td',{},[],{},'t4_tr1'+i]],rootIU);
					}
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
					var x = _Exist(link[key].s0)&&_Exist(link[key].s0[i])?link[key].s0[i]:null;
					if (target[0]==key&&target[1]==i){
						itemAddClass(v[i],'disabled');
						if (x!==null) itemAddClass(x,'disabled');
						}
					else if (x!==null){
						itemAddClass(v[i],'item-link');
						itemAddClass(x,'item-link');
						}
					}
				}
			if (key!="[0,0,0,0]"){
				var all = Object.keys(link[key]).map(function(v){return link[key][v];}).reduce(function(pre,cur){return pre.concat(cur);});
				for (var i=0;i<all.length;i++){
					for (var j=1;j<5;j++){//all[i]['td0'+j]
						IU._addEvent(rootIU[all[i]+'_'+j],'mouseover',selectSameItem,all);
						IU._addEvent(rootIU[all[i]+'_'+j],'mouseout',unselectSameItem,all);
						}
					}
				}
			}
		}
	// Bulles d'aide
	if (set[0][2]){
		var aides = {
			't5_th0':['Commande',"<tr><td>Affiche/masque cette zone.</td></tr>"],
			't5_th10':['Commande',"<tr><td>Affiche/masque cette zone.</td></tr>"],
			't5_th50':['Commande',"<tr><td>Affiche/masque cette zone.</td></tr>"],
			't4_th0':['Commande',"<tr><td>Affiche/masque cette zone.</td></tr>"],
			't4_th00_0':['Commande',"<tr><td>Affiche/masque cette zone.</td></tr>"],
			't4_th01_0':['Commande',"<tr><td>Affiche/masque cette zone.</td></tr>"],
			't1_td2':['Aide',
				"<tr><td>Ce script est basé sur les réflexions d'un post sur le forum. Le lien est disponible sur la page Github de ce script.</td></tr>"
				+"<tr><td>Chaque élément est classé par ordre de rareté/valeur dont on se sert pour connaitre les résultats.</td></tr>"
				+"<tr><td><hr></hr></td></tr>"
				+"<tr><td>Partant du principe que X est un élément et X-1 l'élément juste en dessous etc... il se dégage les relations suivantes:</td></tr>"
				+"<tr><td>X + (X-1) = X+1 (bonus)</td></tr>"
				+"<tr><td>X + (X-2) = X (neutre)</td></tr>"
				+"<tr><td>X + (X-3) = X (neutre)</td></tr>"
				+"<tr><td>X + (X-4) = X-1 (malus 1)</td></tr>"
				+"<tr><td>X + (X-5)= X-1</td></tr>"
				+"<tr><td>X + (X-6) = X-2 (malus 2)</td></tr>"
				+"<tr><td>etc...</td></tr>"
				+"<tr><td>Exception : casquette + casque militaire = masque</td></tr>"
				+"<tr><td><hr></hr></td></tr>"
				+"<tr><td>Passer la souris sur un titre affiche l'aide correspondante.</td></tr>"
				+"<tr><td><hr></hr></td></tr>"
				+"<tr><td>Cliquer ici pour activer/désactiver l'affichage des bulles d'aides.</td></tr>"],
			't1_td0':['Interface',
				"<tr><td>Cliquer ici pour déplacer l'interface dans zone haute ou basse du jeu.</td></tr>"],
			't1_span0':['Titre',
				"<tr><td>Cliquer ici permet de masquer/afficher l'interface.</td></tr>"],
			't4_span10':['Saisie',
				"<tr><td>Cette zone permet la saisie des objets. Vous devez dans un premier temps sélectionner l'objet (la ligne) que vous souhaitez modifier dans l'une des zones de droite.</td></tr>"
				+"<tr><td>Vous pouvez choisir entre une saisie par listes ou manuelle.</td></tr>"],
			't4_span11':['Saisie par listes',
				"<tr><td>Vous pouvez trier le tableau en cliquant sur l'en-tête.</td></tr>"
				+"<tr><td><b>Armurerie</b> affiche la liste de vos objets correspondant à la Catégorie sélectionnée.</td></tr>"
				+"<tr><td><b>Synthèses</b> reprend les fusions apparaissant dans le Résultat de droite.</td></tr>"
				+"<tr><td><hr></hr></td></tr>"
				+"<tr><td><b>All</b> : transfert tous les éléments dans l'Index de recherche.</td></tr>"
				+"<tr><td>► : transfert l'objet dans l'Index de recherche.</td></tr>"],
			't4_span13':['Saisie manuelle',
				"<tr><td>Dans cette partie vous saisissez librement chaque élément de l'objet.</td></tr>"],
			't5_span0':['Simulations',
				"<tr><td>Une simulation est décomposée en deux parties :</td></tr>"
				+"<tr><td>- la Recheche laissant le soin au script de chercher la ou les meilleurs solutions.</td></tr>"
				+"<tr><td>- les Résultats reprenant les solutions ci-dessus mais permettant aussi de saisir manuellement vos solutions.</td></tr>"],
			't5_th2':['Commande',"<tr><td>Ajoute une simulation.</td></tr>"],
			't5_th3':['Commande',"<tr><td>Déplace la simulation.</td></tr>"],
			't5_th4':['Commande',"<tr><td>Déplace la simulation.</td></tr>"],
			't5_th5':['Commande',"<tr><td>Supprime la simulation.</td></tr>"],
			't5_th6':['Commande',"<tr><td>Supprime toutes les simulations.</td></tr>"],
			't5_span110':['Recherche',
				"<tr><td>Permet de chercher automatiquement une Cible.</td></tr>"
				+"<tr><td>Vous devez saisir une liste d`objets dans l`Index et une Cible qui servira de base de recherche.</td></tr>"
				+"<tr><td>Les Options permettent de limiter soit le nombre de résultats soit le temps de recherche.</td></tr>"
				+"<tr><td>L'écart représente la différence de points entre le résultat et la cible.</td></tr>"],
			't5_th13':['Commande',"<tr><td>Supprime les éléments de la zone sélectionnée.</td></tr>"],
			't5_th14':['Commande',"<tr><td>Supprime l`ensemble des éléments de la Recherche.</td></tr>"],
			't6_span00':['Résultats max',"<tr><td>Limite le nombre de résultats. Cette valeur ne réduit pas le temps de recherche.</td></tr>"],
			't6_span01':['Ecart max',"<tr><td>Limite la différence de points entre le résultat et la cible. Cette valeur ne réduit pas le temps de recherche.</td></tr>"],
			't6_span02':['Fusions max',"<tr><td>Limite le nombre de fusions. Cette valeur diminue le temps de recherche !</td></tr>"],
			't6_span03':['Post-traitement',"<tr><td>Supprime en fin de recherche les solutions ayant un même résultat avec un ensemble d'objets identique mais des permutations différentes.</td></tr>"],
			't5_td21a':['Commande',"<tr><td>Charge les valeurs par défaut.</td></tr>"],
			't5_td22a':['Commande',"<tr><td>Sauvegarde en tant que valeurs par défaut.</td></tr>"],
			't5_span111':['Index',
				"<tr><td>L'Index reprend la liste des objets utilisés dans le cadre de la recherche. Tri manuel possible sur les colonnes. L'ordre des objets peut avoir une influence sur le temps de recherche.</td></tr>"
				+"<tr><td>A noter une colonne supplémentaire à gauche indiquant la différence de points entre l'objet et la cible. Un objet n'ayant pas un des éléments de la cible, n'étant pas élligible pour la recherche, indique une valeur infinie, .</td></tr>"],
			't5_td25a':['Commandes',"<tr><td><span class='heal'>+</span><span> : ajoute une ligne d`objet vide.</span></td></tr>"
				+"<tr><td>▼ ou ▲ : déplace la ligne.</td></tr>"
				+"<tr><td><span class='atkHit'>X</span><span> : supprime la ligne.</span></td></tr>"],
			't5_span113':['Cible',"<tr><td>Ici vous indiquez la cible recherchée. Un élément vide n'est pas pris en compte pour la recherche.</td></tr>"],
			't5_td35':['Commande',"<tr><td>Lance la recherche. Au moins deux objets doivent être saisie dans l'Index.</td></tr>"],
			't5_td36':['Commande',"<tr><td>Stop la recherche.</td></tr>"],
			't5_td37':['Commande',"<tr><td>Stop la recherche et ajoute les résultats trouvés.</td></tr>"],
			't5_td38':['Commande',"<tr><td>Ajoute les résultats trouvés.</td></tr>"],
			't5_span510':['Résultats',"<tr><td>Ajoute ici les solutions trouvées par la Recherche et permet aussi une saisie manuelle.</td></tr>"],
			't5_th52':['Commande',"<tr><td>Ajoute un résultat.</td></tr>"],
			't5_th53':['Commande',"<tr><td>Déplace le résultat.</td></tr>"],
			't5_th54':['Commande',"<tr><td>Déplace le résultat.</td></tr>"],
			't5_th55':['Commande',"<tr><td>Supprime le résultat.</td></tr>"],
			't5_th56':['Commande',"<tr><td>Supprime tous les résultats.</td></tr>"],
			't5_th64':['Commandes',
				"<tr><td><span class='heal'>+</span><span> : ajoute une ligne.</span></td></tr>"
				+"<tr><td>▼ ou ▲ : déplace la ligne.</td></tr>"
				+"<tr><td><> : ajoute un nouveau bloc indépendant du précédent.</td></tr>"
				+"<tr><td><span class='atkHit'>X</span><span> : supprime la ligne.</span></td></tr>"
				+"<tr><td><span class='atkHit'>◄</span><span> : supprime tous les éléments précédents du bloc.</span></td></tr>"
				+"<tr><td><span class='atkHit'>▲</span><span> : supprime tous les éléments précédents.</span></td></tr>"
				+"<tr><td><span class='atkHit'>B</span><span> : supprime le bloc.</span></td></tr>"],
			};
		for (var key in aides){
			if (_Exist(rootIU[key])){
				rootIU[key].setAttribute('onmouseout','nd();');
				rootIU[key].setAttribute('onmouseover',"return overlib('<table class=\"BWMoverlib\">"+addslashes(aides[key][1])+"</table>',CAPTION,'"+aides[key][0]+"',CAPTIONFONTCLASS,'action-caption',WIDTH,300,HAUTO,VAUTO);");
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
						rootIU = {};
					if (!Array.isArray(set[0])){ // patch 2015.12.05 -> 2015.12.07
						set[0] = PREF._GetDef('set')[0];
						set[8] = PREF._GetDef('set')[8];
						}
					if (!_Exist(set[8][3])) set[8][3] = PREF._GetDef('set')[8][3]; // patch 2015.12.20
					upTabs();
					}
				}
			}
		else alert(L._Get("sUnknowID"));
		}
	}
console.debug('BWMend - time %oms',Date.now()-debug_time);
})();
