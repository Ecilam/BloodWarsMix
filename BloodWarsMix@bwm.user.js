(function(){
// coding: utf-8
// ==UserScript==
// @author		Ecilam
// @name		Blood Wars Mix
// @version		2015.08.29
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
			if (a!=null) return new Date(Date.UTC(+a[1],+a[2]-1,+a[3],+a[4],+a[5],+a[6]));
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
			return ((v!=null)?JSONS._Decode(v):defaut);
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
		_GetNodes: function(path,root){
			return (_Exist(root)&&root==null)?null:document.evaluate(path,(_Exist(root)?root:document), null,XPathResult.ORDERED_NODE_SNAPSHOT_TYPE, null);
			},
		_GetFirstNode: function(path,root){
			var r = this._GetNodes(path,root);
			return (r!=null&&r.snapshotLength>=1?r.snapshotItem(0):null);
			},
		_GetLastNode: function(path, root){
			var r = this._GetNodes(path,root);
			return (r!=null&&r.snapshotLength>=1?r.snapshotItem(r.snapshotLength-1):null);
			},
		_GetFirstNodeTextContent: function(path,defaultValue,root){
			var r = this._GetFirstNode(path,root);
			return (r!=null&&r.textContent!=null?r.textContent:defaultValue);
			},
		_GetFirstNodeInnerHTML: function(path,defaultValue,root){
			var r = this._GetFirstNode(path,root);
			return (r!=null&&r.innerHTML!=null?r.innerHTML:defaultValue);
			},
		_GetLastNodeInnerHTML: function(path,defaultValue,root){
			var r = this._GetLastNode(path,root);
			return (r!=null&&r.innerHTML!=null?r.innerHTML:defaultValue);
			},
		// retourne la valeur de la clé "key" trouvé dans l'url
		// null: n'existe pas, true: clé existe mais sans valeur, autres: valeur
		_QueryString: function(key){
			var url = window.location.search,
				reg = new RegExp("[\?&]"+key+"(=([^&$]+)|)(&|$)","i"),
				offset = reg.exec(url);
			if (offset!=null){
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
		// reçoit une liste d'éléments pour créér l'interface
		// ex: {'name':['input',{'type':'checkbox','checked':true},['coucou'],{'click':[funcname,5]},body]
		_CreateElements: function(list){
			var r = {};
			for (var key in list){
				var type = _Exist(list[key][0])?list[key][0]:null,
					attributes = _Exist(list[key][1])?list[key][1]:{},
					content = _Exist(list[key][2])?list[key][2]:[],
					events = _Exist(list[key][3])?list[key][3]:{},
					node = _Exist(r[list[key][4]])?r[list[key][4]]:(_Exist(list[key][4])?list[key][4]:null);
				if (type!=null) r[key] = this._CreateElement(type,attributes,content,events,node);
				}
			return r;
			},
		_CreateElement: function(type,attributes,content,events,node){
			if (_Exist(type)&&type!=null){
				attributes = _Exist(attributes)?attributes:{};
				content = _Exist(content)?content:[];
				events = _Exist(events)?events:{};
				node = _Exist(node)?node:null;
				var r = document.createElement(type);
				for (var key in attributes){
					if (_Type(attributes[key])!='Boolean') r.setAttribute(key,attributes[key]);
					else if (attributes[key]==true) r.setAttribute(key,key.toString());
					}
				for (var key in events){
					this._addEvent(r,key,events[key][0],events[key][1]);
					}
				for (var i=0; i<content.length; i++){
					if (_Type(content[i])==='Object') r.appendChild(content[i]);
					else r.textContent+= content[i];
					}
				if (node!=null) node.appendChild(r);
				return r;
				}
			else return null;
			},
		// IU._addEvent(obj: objet,type: eventype,fn: function,par: parameter);
		// function fn(e,par) {alert('r : ' + this.value+e.type+par);}
		// this = obj, e = event
		// ex : IU._addEvent(r,'click',test,"2");
		_addEvent: function(obj,type,fn,par){
			var funcName = function(event){return fn.call(obj,event,par);};
			obj.addEventListener(type,funcName,false);
			if (!obj.BWEListeners) {obj.BWEListeners = {};}
			if (!obj.BWEListeners[type]) obj.BWEListeners[type]={};
			obj.BWEListeners[type][fn.name]=funcName;
			},
		// voir _addEvent pour les paramètres
		_removeEvent: function(obj,type,fn){
			if (obj.BWEListeners[type]&&obj.BWEListeners[type][fn.name]){
				obj.removeEventListener(type,obj.BWEListeners[type][fn.name],false);
				delete obj.BWEListeners[type][fn.name];
				}
			},
		// voir _addEvent pour les paramètres
		_removeEvents: function(obj){
			if (obj.BWEListeners){
				for (var key in obj.BWEListeners){
					for (var key2 in obj.BWEListeners[key]){
						obj.removeEventListener(key,obj.BWEListeners[key][key2],false);
						}
					}
				delete obj.BWEListeners;
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
				[['-'],['De L`Explorateur'],['De La Précaution'],['D`Endurance'],['Du Berger'],['Du Toxicomane'],['De La Protection'],['Des Sens'],['Du Prophète'],['De La Punition'],['Du Gladiateur'],['Du Sang'],['De Carapace De Tortue'],['Du Soleil'],['De l`Adrénaline'],['De La Précognition'],['D`Écaille De Dragon'],['De La Puissance'],['De La Magie']],
				[['-'],['Du Voleur'],['De L`Adepte'],['Du Garde'],['De L`Athlète'],['Du Toxicomane'],['Du Maître D`Epée'],['Du Tueur'],['Du Gardien'],['Du Cobra'],['De Carapace De Tortue'],['D`Esquive'],['Du Pillard'],['Du Maître'],['De l`Adrénaline'],['Du Centurion'],['De La Résistance'],['De Caligula'],['Du Semeur De La Mort'],['De La Vitesse'],['De L`Orchidée']],
				[['-'],['Du Brigand'],['Du Contrebandier'],['Du Toxicomane'],['De L`Athlète'],['Des Gestes Muets'],['D`Esquive'],['De La Réserve'],['Du Soleil'],['Du Trafiquant D`Armes'],['Du Berger'],['Du Chasseur D`Ombres'],['Du Serpent'],['Des Incas'],['De L`Orienteur'],['De La Nuit']],
				[['-'],['Du Délit'],['De La Beauté'],['Du Pouvoir'],['Du Génie'],['De La Force'],['De La Sagesse'],['De La Peau Dure'],['Du Pèlerin'],['Du Loup-garou'],['De La Justesse'],['De L`Art'],['De La Jouvence'],['De La Chance'],['Du Sang'],['De L`Habilité'],['De La Concentration'],['De La Lévitation'],['De L`Astuce'],['Du Dément'],['De La Facilitée']],
				[['-'],['Du Délit'],['De La Beauté'],['Du Pouvoir'],['De La Force'],['Du Génie'],['De La Sagesse'],['De La Peau Dure'],['Du Loup-garou'],['De L`Art'],['De La Justesse'],['De La Jouvence'],['Du Renard'],['De La Chance'],['Du Sang'],['De La Chauve-souris'],['De La Concentration'],['De La Lévitation'],['De L`Astuce'],['Du Dément'],['De La Facilitée']],
				[['-'],['Du Commandant'],['De La Secte'],['De La Douleur'],['Du Pouvoir'],['De L`Agilité'],['De La Puissance'],['De la Peste'],['Du Courage'],['De La Justesse'],['Des Ancêtres'],['Du Conquérant'],['De La Vengeance'],['De La Contusion'],['De La Vertu'],['De La Précision'],['Du Sang'],['Du Fer À Cheval'],['Du Suicidé'],['De Dracula'],['De La Vélocité'],['Du Clan'],['De L`Empereur']],
				[['-'],['De La Trahison'],['De La Ruse'],['De La Douleur'],['Du Hasardeux'],['De Plomb'],['De La Puissance'],['De L`Inquisiteur'],['Du Buveur De Sang'],['Du Conquérant'],['Du Pouvoir'],['De La Vengeance'],['De la Peste'],['Du Fer À Cheval'],['De L`Autocrate'],['Du Sang'],['Du Basilic'],['Du Suicidé'],['De Dracula']],
				[['-']],
				[['-']],
				[['-'],['De Longue Portée'],['De La Perfection'],['De La Précision'],['De La Vengeance'],['De La Réaction'],['Des Dryades'],['De Mitraillage'],['Du Loups']]
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
			if (r!=null){
				var r = DOM._GetFirstNodeTextContent(".//u",r);
				if (r == L._Get('sDeconnecte')) p="pServerDeco";
				else if (r == L._Get('sCourtePause')) p="pServerUpdate";
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
				else if (qsA==null||qsA=="main") p="pMain";
				// Le Puits des Âmes - Moria I
				else if (qsA=="mixer"){
					if (qsDo==null||qsDo=="mkstone") p="pMkstone";
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
	const index = 'BWM:O:',
		defPrefs = {'show':1,'mode':0,'tri':[2,0],'last':{'c':0,'l':'','n':0,'i':0}};
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
		_Set: function(key,v){
			if (ID!=null){
				prefs[key] = v;
				LS._SetVar(index+ID,prefs);
				}
			return v;
			},
		};
	})();

/******************************************************
* CSS
******************************************************/
function getCssRules(selector,sheet){
    var sheets = _Exist(sheet)?[sheet]:document.styleSheets;
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
function SetCSS(){
	const css = [".BWMbox{width: 100%;margin:0 auto;}",
		".BWMtitle,.BWMselect{cursor: pointer}",
		".BWMselect:hover{text-decoration: underline;}",
		".BMWfield{margin: 0;padding: 1px;text-align: left;}",
		".BWMlegend{font-size: 11px;font-weight: bold;}",
		".BWMdiv1{margin: 0px;padding: 2px;}",
		".BWMtable0{border-collapse: collapse;width: 100%;}",
		".BWMtable0 td{vertical-align: top;padding: 4px;}",
		".BWMtable1{border-collapse: collapse;width: 100%;text-align: center;}",
		".BWMtable1 td,.BWMtable1 th{vertical-align: middle;border: 1px solid black;margin: 0;padding: 2px;}",
		".BWMcut{text-align: left;max-width: 0;overflow: hidden;white-space: nowrap;text-overflow: ellipsis}",
		".BWMtriSelect{color:lime;}",
		".BWMtd2{width:2%;}",
		".BWMtd5{width:5%;}",
		".BWMtd10{width:10%;}",
		".BWMtd15{width:15%;}",
		".BWMtd20{width:20%;}",
		".BWMtd25{width:25%;}",
		".BWMtd40{width:40%;}",
		".BWMtd60{width:60%;}",
		".BWMa1{display: block;}",
		],
		head = DOM._GetFirstNode("//head");
	if (head!=null){
		var even = getCssRules('.even'),
			selectedItem = getCssRules('.selectedItem');
		if (even!=null&&selectedItem!=null) css.push('.BWMeven{'+even.cssText+'}','.BWMTR:hover .BWMcut:hover,.BWMTR2:hover .BWMcut,.BWMTR2:hover .BWMselect:hover:not(.BWMcut){'+selectedItem.cssText+'}');
		IU._CreateElement('style',{'type':'text/css'},[css.join('')],{},head);
		}
	}
	
/******************************************************
* FUNCTIONS
******************************************************/
function GetListItem(){
	var list = DOM._GetNodes("//div[@id='content-mid']//ul[@class='inv-select']/li"),
		match = ["","",""],
		index = [{"":0,"Bon":6,"Bonne":6,"Parfait":12,"Parfaite":12},[],[],[]],
		result = {};
	// créé le pattern de recherche et l'index de correspondance
	for (var i=2; i<5; i++){
		for (var j=0; j<l[i].length; j++){
			if (i!=2) index[i-1][j] = {};
			for (var k=1; k<l[i][j].length; k++){
				for (var x=0; x<l[i][j][k].length; x++){
					match[i-2] = match[i-2]+l[i][j][k][x]+'(?:[ ]|$)|';
					if (i==2) index[1][l[i][j][k][x]] = [j,k];
					else index[i-1][j][l[i][j][k][x]] = k;
					}
				}
			}
		}
	// recherche
	for (var i=0; i<list.snapshotLength; i++){
		var col = DOM._GetFirstNodeTextContent("./div/span",'',list.snapshotItem(i)),
			itemMatch = "^(Légendaire |)(Bon |Bonne |Parfait |Parfaite |)("+match[0]+")("+match[1]+")("+match[2]+")(\\(\\+[0-5]\\)|)$",
			r = new RegExp(itemMatch).exec(col);
		if (r!=null){
			var niv = r[6]!=''?Number(r[6].replace(new RegExp('[()+]','g'),'')):0,
				grade = _Exist(index[0][r[2].trim()])?index[0][r[2].trim()]:-1,
				type = (r[3]!=''&&_Exist(index[1][r[3].trim()]))?index[1][r[3].trim()]:null,
				leg = r[1]!=''?'L':'',
				pré = r[4]!=''?_Exist(index[2][type[0]][r[4].trim()])?index[2][type[0]][r[4].trim()]:-1:0,
				suf = r[5]!=''?_Exist(index[3][type[0]][r[5].trim()])?index[3][type[0]][r[5].trim()]:-1:0;
			if (type!=null){
				if (!_Exist(result[type[0]+leg])) result[type[0]+leg] = [];
				result[type[0]+leg].push([(grade!=-1?grade+niv:-1),type[1],pré,suf]);
				}
			}
		}
	return result;
	}
function Mix(a,b){
	var r = [];
	for (var i=0;i<4;i++){
		if (a[i]>0&&b[i]>0){
			var max = Math.max(a[i],b[i]),
				min = Math.min(a[i],b[i]);
			if (i==0) r[0] = min+((a[1]!=0&&a[1]==b[1]&&(min+1)<l[1].length)?1:0);
			else if (last['c']==0&&i==1&&min==1&&max==2) r[1] = 4; // exception casquette+casque = masque
			else r[i] = a[i]==b[i]?a[i]:(max==l[i+1][last['c']].length-1&&max-min<3)?max-min==1?max-2:max-1:max-min==1?max+1:max-Math.floor((max-min-2)/2);
			}
		else r[i] = 0; 
		}
	return r;
	}
function show(e){
	var show = PREF._Get('show')==1?0:1;
	PREF._Set('show',show);
	nodesIU['span1'].className = 'BWMtitle '+(show==1?'enabled':'disabled');
	nodesIU['box'].setAttribute('style','display:'+(show==1?'block;':'none;'));
	}
function SetTObj(e,i){
	last = PREF._Set('last',{'c':i,'l':last['l'],'n':0,'i':0});
	Update();
	}
function UpdateTObj(){
	nodesIU['td110'].innerHTML = '';
	for (var j=0;j<l[0].length;j++){
		if (j!=0) IU._CreateElement('span',{},[', '],{},nodesIU['td110']);
		IU._CreateElement('span',{'class':'BWMselect'+(j==last['c']?' atkHit':'')},[l[0][j]],{'click':[SetTObj,j]},nodesIU['td110']);
		}
	}
function SetLObj(e,i){
	last = PREF._Set('last',{'c':last['c'],'l':i,'n':0,'i':0});
	Update();
	}
function UpdateLObj(){
	nodesIU['span1110'].className = 'BWMselect'+(last['l']==''?' atkHit':'');
	nodesIU['span1112'].className = 'BWMselect'+(last['l']=='L'?' atkHit':'');
	}
function SetMode(e,i){
	PREF._Set('mode',i);
	Update();
	}
function SetSelect(e,i){
	list[last['c']+last['l']][last['n']][last['i']][i[0]] = i[1];
	LS._SetVar('BWM:LIST:'+ID,list);
	Update();
	}
function SetISelect(e,i){
	list[last['c']+last['l']][last['n']][last['i']] = i;
	LS._SetVar('BWM:LIST:'+ID,list);
	Update();
	}
function SetTri(e,i){
	var tri = PREF._Get('tri');
	tri[1] = (i==tri[0]&&tri[1]==1)?0:1;
	tri[0] = i;
	PREF._Set('tri',tri);
	Update();
	}
function UpdateSelect(){
	nodesIU['table2'].innerHTML = '';
	var max = Math.max(l[1].length,l[2][last['c']].length,l[3][last['c']].length,l[4][last['c']].length),
		mode = PREF._Get('mode'),
		newIU = {
		'tr0':['tr',{'class':'tblheader'},,,nodesIU['table2']],
		'th01':['th',{'colspan':'4'},['Sélection : '],,'tr0'],
		'span010':['span',{'class':'BWMselect'+(mode==0?' atkHit':'')},['Liste'],{'click':[SetMode,0]},'th01'],
		'span011':['span',,[', '],{},'th01'],
		'span012':['span',{'class':'BWMselect'+(mode==1?' atkHit':'')},['Manuel'],{'click':[SetMode,1]},'th01'],
		'tr1':['tr',{'class':'tblheader'},,,nodesIU['table2']],
		'th10':['th',{'class':'BWMtd5'},,,'tr1'],
		'th11':['th',{'class':'BWMtd20'},['Objets'],,'tr1'],
		'th12':['th',{'class':'BWMtd20'},['Préfixes'],,'tr1'],
		'th13':['th',{'class':'BWMtd20'},['Suffixes'],,'tr1']
		},
		r = IU._CreateElements(newIU);
	if (mode==0){
		var tri = PREF._Get('tri'),
			x = {'Armurerie':_Exist(Items[(last['c']+last['l'])])?Items[(last['c']+last['l'])]:[],'Synthèse(s)':_Exist(Items['result'])?Items['result']:[]};
		x['Armurerie'].sort(function(a,b){return a[tri[0]]<b[tri[0]]?-1:a[tri[0]]==b[tri[0]]?0:1;});
		x['Synthèse(s)'].sort(function(a,b){return a[tri[0]]<b[tri[0]]?-1:a[tri[0]]==b[tri[0]]?0:1;});
		if (tri[1]==0){ x['Armurerie'].reverse(); x['Synthèse(s)'].reverse()};
		for (var i=0;i<4;i++){
			IU._addEvent(r['th1'+i],'click',SetTri,i);
			r['th1'+i].classList.add('BWMtitle');
			if (i==tri[0]) IU._CreateElement('span',{'class':'BWMtriSelect'},[(tri[1]==1?"▲":"▼")],{},r['th1'+i]);
			}
		for (var k in x){
			if (x[k].length!=0){
				var newIU = {
					'tr0':['tr',{'class':'tblheader'},,,nodesIU['table2']],
					'th01':['th',{'colspan':'4'},[k],,'tr0']
					};
				IU._CreateElements(newIU);
				for (var i=0;i<x[k].length;i++){
					var tr = IU._CreateElement('tr',{'class':'BWMTR2'+(i%2==0?'':' BWMeven')},[],{'click':[SetISelect,x[k][i]]},nodesIU['table2']),
						v = x[k][i];
					for (var j=0;j<4;j++){
						var t = j==0?l[j+1]:l[j+1][last['c']];
						if (v[j]==-1) IU._CreateElement('td',{'class':'BWMcut atkHit'},['Inconnu !'],{},tr);
						else IU._CreateElement('td',{'class':'BWMcut'+(JSONS._Encode(v)==JSONS._Encode(list[last['c']+last['l']][last['n']][last['i']])?' atkHit':'')},[(v[j]==0?'-':(j==0?'':v[j]+':')+t[v[j]][0])],{},tr);
						}
					}
				}
			}
		}
	else {
		for (var i=0;i<max;i++){
			var tr = IU._CreateElement('tr',{'class':'BWMTR'},[],{},nodesIU['table2']);
			for (var j=0;j<4;j++){
				var v = j==0?l[j+1]:l[j+1][last['c']];
				if (i<v.length)	IU._CreateElement('td',{'class':'BWMcut BWMselect'+(i==list[last['c']+last['l']][last['n']][last['i']][j]?' atkHit':'')},[(i==0?'-':(j==0?'':i+':')+v[i][0])],{'click':[SetSelect,[j,i]]},tr);
				else IU._CreateElement('td',{},[],{},tr);
				}
			}
		}
	}
function SetML(e,i){
	last = PREF._Set('last',{'c':last['c'],'l':last['l'],'n':i,'i':0});
	Update();
	}
function AddML(e,i){
	last = PREF._Set('last',{'c':last['c'],'l':last['l'],'n':list[last['c']+last['l']].length,'i':0});
	list[last['c']+last['l']].push([[0,0,0,0],[0,0,0,0],[0,0,0,0]]);
	LS._SetVar('BWM:LIST:'+ID,list);
	Update();
	}
function DelML(e){
	list[last['c']+last['l']].splice(last['n'],1);
	last = PREF._Set('last',{'c':last['c'],'l':last['l'],'n':0,'i':0});
	LS._SetVar('BWM:LIST:'+ID,list);
	Update();
	}
function UpdateML(){
	nodesIU['table3'].innerHTML = '';
	var newIU = {
		'tr0':['tr',{'class':'tblheader'},,,nodesIU['table3']],
		'td01':['th',{'colspan':'5'},,,'tr0'],
		'span010':['span',,['Simulations : '],,'td01'],
		'td02':['th',{'colspan':'5','class':'BWMselect atkHit'},['X'],{'click':[DelML]},'tr0'],
		'tr1':['tr',{'class':'tblheader'},,,nodesIU['table3']],
		'th10':['th',{'colspan':'2','class':'BWMtd10'},,,'tr1'],
		'th11':['th',{'class':'BWMtd20'},['Objets'],,'tr1'],
		'th12':['th',{'class':'BWMtd25'},['Préfixes'],,'tr1'],
		'th13':['th',{'class':'BWMtd25'},['Suffixes'],,'tr1'],
		'td14':['th',{'colspan':'5'},['Actions'],,'tr1']
		},
		r = IU._CreateElements(newIU);
	if (!_Exist(list[last['c']+last['l']])) list[last['c']+last['l']] = [];
	if (list[last['c']+last['l']].length==0){
		list[last['c']+last['l']].push([[0,0,0,0],[0,0,0,0],[0,0,0,0]]);
		LS._SetVar('BWM:LIST:'+ID,list);
		last = PREF._Set('last',{'c':last['c'],'l':last['l'],'n':0,'i':0});
		}
	for (var j=0;j<list[last['c']+last['l']].length;j++){
		IU._CreateElement('span',{'class':'BWMselect'+(j==last['n']?' atkHit':'')},[j],{'click':[SetML,j]},r['td01']);
		IU._CreateElement('span',{},[', '],{},r['td01']);
		}
	IU._CreateElement('span',{'class':'BWMselect heal'},['+'],{'click':[AddML,j]},r['td01']);
	}
function SetL(e,i){
	last = PREF._Set('last',{'c':last['c'],'l':last['l'],'n':last['n'],'i':i});
	Update();
	}
function AddL(e,i){
	var s = last['i'];
	last = PREF._Set('last',{'c':last['c'],'l':last['l'],'n':last['n'],'i':s+(s>i?2:0)});
	list[last['c']+last['l']][last['n']].splice(i+1,0,[0,0,0,0],[0,0,0,0]);
	LS._SetVar('BWM:LIST:'+ID,list);
	Update();
	}
function MoveL(e,i){
	var v = list[last['c']+last['l']][last['n']],
		s = last['i'];
	v[i[0]] = [v[i[1]],v[i[1]]=v[i[0]]][0];//swap
	last = PREF._Set('last',{'c':last['c'],'l':last['l'],'n':last['n'],'i':(s==i[0]?i[1]:s==i[1]?i[0]:s)});
	LS._SetVar('BWM:LIST:'+ID,list);
	Update();
	}
function DelL(e,i){
	var v = list[last['c']+last['l']][last['n']],
		s = last['i'];
	if (v[i[0]]==-1){
		v.splice(i[0],2,v[i[1]],[0,0,0,0]);
		s = s==i[0]+1?i[0]:s;
		}
	else if (i[0]==i[1]){
		if (_Exist(v[i[0]+3])&&v[i[0]+3]!=-1){
			v.splice(i[0],3,v[i[0]+1]);
			s = (s<=i[0]?s:s>i[0]+1?s-2:i[0]);
			}
		else{
			v.splice(i[0],2,v[i[0]+1],[0,0,0,0]);
			s = (s<i[0]||s>i[0]+1?s:i[0]);
			}
		}
	else {
		v.splice(i[0],2);
		s = s+(i[0]>s?0:-2);
		}
	last = PREF._Set('last',{'c':last['c'],'l':last['l'],'n':last['n'],'i':s});
	LS._SetVar('BWM:LIST:'+ID,list);
	Update();
	}
function DelB(e,i){
	var v = list[last['c']+last['l']][last['n']],
		s = last['i'],
		fin = false;
	while (!fin){
		if (!_Exist(v[i])) break;
		else if (v[i]==-1) fin = true;
		v.splice(i,1);
		s = s+(s>i?-1:0);
		}
	if (v[v.length-1]==-1){
		v.splice(v.length-1,1);
		s = s<i?s:0;
		}
	if (v.length==0){
		v.push([0,0,0,0],[0,0,0,0],[0,0,0,0]);
		s = 0;
		}
	last = PREF._Set('last',{'c':last['c'],'l':last['l'],'n':last['n'],'i':s});
	LS._SetVar('BWM:LIST:'+ID,list);
	Update();
	}
function SepL(e,i){
	var v = list[last['c']+last['l']][last['n']],
		s = last['i'];
	if (!_Exist(v[i+1])){
		v.splice(i+1,0,-1,[0,0,0,0],[0,0,0,0],[0,0,0,0]);
		}
	else if (!_Exist(v[i+3])||(_Exist(v[i+3])&&v[i+3]==-1)){
		v.splice(i+1,2,-1,v[i+1],[0,0,0,0],[0,0,0,0]);
		s = s+(s>i?2:0);
		}
	else{
		v.splice(i+1,2,-1,v[i+1]);
		s = s+(s==i+1?1:0);
		}
	last = PREF._Set('last',{'c':last['c'],'l':last['l'],'n':last['n'],'i':s});
	LS._SetVar('BWM:LIST:'+ID,list);
	Update();
	}
function First(e,i){
	var v = list[last['c']+last['l']][last['n']],
		s = last['i'];
	v.splice(i[1],i[0]-i[1]);
	if (v.length-i[1]<2||(_Exist(v[i[1]+1])&&v[i[1]+1]==-1)){
		v.splice(i[1]+1,0,[0,0,0,0],[0,0,0,0]);
		s = s<i[1]?s:s<i[0]?i[1]:s-(i[0]-i[1])+2;
		}
	else s = s<i[1]?s:s<i[0]?i[1]:s-(i[0]-i[1]);
	last = PREF._Set('last',{'c':last['c'],'l':last['l'],'n':last['n'],'i':s});
	LS._SetVar('BWM:LIST:'+ID,list);
	Update();
	}
function UpdateL(){
	var v = list[last['c']+last['l']][last['n']],
		root = 0,
		lroot;
	Items['result'] = [];
	for (var j=0;j<v.length;j++){
		if (v[j]==-1){
			if (_Exist(lroot)) lroot.setAttribute('rowspan',j-root);
			root = j+1;
			var newIU = {
				'tr':['tr',{'class':'BWMTR2'},,,nodesIU['table3']],
				'td0':['td',{'colspan':'5'},,,'tr'],
				'div00':['div',{'align':'center'},['***************************'],,'td0'],
				'td1':['td',{'class':'BWMselect atkHit','colspan':'5'},['X'],{'click':[DelL,[j,root]]},'tr']
				};
			IU._CreateElements(newIU);
			}
		else if (j-root>1&&((j-root)%2==0)){
			v[j] = Mix(v[j-2],v[j-1]);
			if (JSONS._Encode(v[j])!=JSONS._Encode([0,0,0,0])) Items['result'].push(v[j]);
			LS._SetVar('BWM:LIST:'+ID,list);
			var newIU = {
				'tr':['tr',{'class':'BWMTR2 BWMeven'},,,nodesIU['table3']],
				'td0':['td',{'class':'BWMtd5 heal'},['='],,'tr'],
				'td1':['td',{'class':'BWMcut BWMtd5 heal'},[v[j][0]<=0?'-':l[1][v[j][0]]],,'tr'],
				'td2':['td',{'class':'BWMcut BWMtd20 heal'},[v[j][1]<=0?'-':v[j][1]+':'+l[2][last['c']][v[j][1]][0]+" "],,'tr'],
				'td3':['td',{'class':'BWMcut BWMtd25 heal'},[v[j][2]<=0?'-':v[j][2]+':'+l[3][last['c']][v[j][2]][0]+" "],,'tr'],
				'td4':['td',{'class':'BWMcut BWMtd25 heal'},[v[j][3]<=0?'-':v[j][3]+':'+l[4][last['c']][v[j][3]][0]],,'tr'],
				'td5':['td',{'class':'BWMtd5 BWMselect heal'},["+"],{'click':[AddL,j]},'tr'],
				'td6':['td',{'class':'BWMtd5'},,,'tr'],
				'td7':['td',{'class':'BWMtd5 BWMselect atkHit'},["◄"],{'click':[First,[j,root]]},'tr'],
				'td8':['td',{'class':'BWMtd5 BWMselect atkHit'},["▲"],{'click':[First,[j,0]]},'tr']
				};
			if (!(_Exist(v[j+1])&&v[j+1]==-1)) newIU['td6'] = ['td',{'class':'BWMtd5 BWMselect'},["<>"],{'click':[SepL,j]},'tr'];
			if (_Exist(lroot)) lroot.setAttribute('rowspan',j-root+1);
			IU._CreateElements(newIU);
			}
		else {
			var newIU = {
				'tr':['tr',{'class':'BWMTR2'},,,nodesIU['table3']],
				'td0':['td',{'class':'BWMtd5'},[(j-root==0?'':'+')],{'click':[SetL,j]},'tr'],
				'td1':['td',{'class':'BWMcut BWMtd5'+(last['i']==j?' disabled':'')},[v[j][0]<=0?'-':l[1][v[j][0]]+" "],{'click':[SetL,j]},'tr'],
				'td2':['td',{'class':'BWMcut BWMtd25'+(last['i']==j?' disabled':'')},[v[j][1]<=0?'-':v[j][1]+':'+l[2][last['c']][v[j][1]][0]+" "],{'click':[SetL,j]},'tr'],
				'td3':['td',{'class':'BWMcut BWMtd25'+(last['i']==j?' disabled':'')},[v[j][2]<=0?'-':v[j][2]+':'+l[3][last['c']][v[j][2]][0]+" "],{'click':[SetL,j]},'tr'],
				'td4':['td',{'class':'BWMcut BWMtd25'+(last['i']==j?' disabled':'')},[v[j][3]<=0?'-':v[j][3]+':'+l[4][last['c']][v[j][3]][0]],{'click':[SetL,j]},'tr'],
				'td5':['td',{'class':'BWMtd5 BWMselect heal'},["+"],{'click':[AddL,j]},'tr'],
				'td6':['td',{'class':'BWMtd5'},,,'tr'],
				'td7':['td',{'class':'BWMtd5'},,,'tr'],
				'td8':['td',{'class':'BWMtd5'},,,'tr']
				};
			if (_Exist(v[j+2])&&v[j+2]!=-1) newIU['td6'] = ['td',{'class':'BWMselect'},["▼"],{'click':[MoveL,[j,(j==root?j+1:j+2)]]},'tr'];
			if (j-root>0) newIU['td7'] = ['td',{'class':'BWMtd5 BWMselect'},["▲"],{'click':[MoveL,[j,(j-root>2?j-2:j-1)]]},'tr'];
			if ((!_Exist(v[j+2])&&v.length-root>3)||(_Exist(v[j+2])&&(v[j+2]!=-1||(v[j+2]==-1&&j+1-root>3)))) newIU['td8'] = ['td',{'class':'BWMselect atkHit'},['X'],{'click':[DelL,[j,root]]},'tr'];
			var r = IU._CreateElements(newIU);
			if (j==root) lroot = IU._CreateElement('td',{'class':'BWMtd5 BWMselect atkHit'},['X'],{'click':[DelB,root]},r['tr']);			
			}
		}
	}
function Update(){
	UpdateTObj();
	UpdateLObj();
	UpdateML();
	UpdateL();
	UpdateSelect();
	}

/******************************************************
* START
*
******************************************************/
// vérification des services
var MutationObserver = window.MutationObserver || window.WebKitMutationObserver || window.MozMutationObserver;
if (!JSON) throw new Error("Erreur : le service JSON n\'est pas disponible.");
else if (!MutationObserver) throw new Error("Erreur : le service MutationObserver n\'est pas disponible.");
else if (!window.localStorage) throw new Error("Erreur : le service localStorage n\'est pas disponible.");
//else if (!window.Worker) throw new Error("Erreur : le service Worker n\'est pas disponible.");
else{
	var p = DATAS._GetPage(),
		player = DATAS._PlayerName(),
		IDs = LS._GetVar('BWM:IDS',{});
console.debug('BWMpage :',p);
	// Pages gérées par le script
	if (['null','pServerDeco','pServerUpdate','pServerOther'].indexOf(p)==-1&&player!=null){
console.debug('BWMstart: %o %o',player,IDs);
		if (p=='pMain'){
			var r = DOM._GetFirstNodeTextContent("//div[@class='throne-maindiv']/div/span[@class='reflink']",null);
			if (r!=null){
				var r2 = /r\.php\?r=([0-9]+)/.exec(r),
					ID = _Exist(r2[1])?r2[1]:null;
				if (ID!=null){
					for (var i in IDs) if (IDs[i]==ID) delete IDs[i]; // en cas de changement de nom
					IDs[player] = ID;
					LS._SetVar('BWM:IDS',IDs);
					}
				}
			}
		// Autre pages nécessitant l'ID
		else if (_Exist(IDs[player])){
			var ID = IDs[player];
			PREF._Init(ID);
			SetCSS();
			if (p=='pMixitem'){
				var r = DOM._GetFirstNode("//div[@id='content-mid']");
				if (r!=null){
					var l = L._Get("listes"),
						Items = GetListItem(),
						list = LS._GetVar('BWM:LIST:'+ID,{}),
						last = PREF._Get('last');
					var	newIU = {
							'div':['div',{'id':'BWMroot','align':'center'}],
							'hr1':['div',{'class':'hr720'},,,'div'],
							'title':['div',,,,'div'],
							'span1':['span',{'class':'BWMtitle '+(PREF._Get('show')==1?'enabled':'disabled')},[((typeof(GM_info)=='object')?GM_info.script.name:'?')+' : '],{'click':[show]},'title'],
							'a1':['a',{'href':'https://github.com/Ecilam/BloodWarsMix','TARGET':'_blank'},[((typeof(GM_info)=='object')?GM_info.script.version:'?')],,'title'],
							'box':['div',{'class':'BWMbox','style':'display:'+(PREF._Get('show')==1?'block;':'none;')},,,'div'],
							'table0':['table',{'class':'BWMtable0'},,,'box'],
							'tr00':['tr',,,,'table0'],
							'td000':['td',{'class':'BWMtd40','colspan':'3'},,,'tr00'],
							'table1':['table',{'class':'BWMtable1'},,,'td000'],
							'tr10':['tr',{'class':'tblheader'},,,'table1'],
							'th100':['th',,['Catégories'],,'tr10'],
							'th101':['th',,['Légendaire'],,'tr10'],
							'tr11':['tr',,,,'table1'],
							'td110':['td',,,,'tr11'],
							'td111':['td',,,,'tr11'],
							'span1110':['span',,['Non'],{'click':[SetLObj,'']},'td111'],
							'span1111':['span',,[', '],,'td111'],
							'span1112':['span',,['Oui'],{'click':[SetLObj,'L']},'td111'],
							'tr01':['tr',,,,'table0'],
							'td010':['td',{'class':'BWMtd40'},,,'tr01'],
							'table2':['table',{'class':'BWMtable1'},,,'td010'],
							'td011':['td',{'class':'BWMtd60'},,,'tr01'],
							'table3':['table',{'class':'BWMtable1'},,,'td011'],
							'hr2':['div',{'class':'hr720'},,,'div']},

						nodesIU = IU._CreateElements(newIU);
					Update();
					r.insertBefore(nodesIU['div'],null);
					}
				}
			}
		else alert(L._Get("sUnknowID"));
		}
	}
console.debug('BWMend');
})();
