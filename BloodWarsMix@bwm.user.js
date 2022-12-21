// coding: utf-8 (sans BOM)
// ==UserScript==
// @name        Blood Wars Mix
// @author      Ecilam
// @version     2022.12.21
// @namespace   BWM
// @description Ce script permet de tester des synthèses dans le jeu Blood Wars.
// @license     GPL version 3 ou suivantes http://www.gnu.org/copyleft/gpl.html
// @homepageURL https://github.com/Ecilam/BloodWarsMix
// @supportURL  https://github.com/Ecilam/BloodWarsMix/issues
// @match       https://r3.fr.bloodwars.net/*
// @match       https://r8.fr.bloodwars.net/*
// @grant       none
// ==/UserScript==

// Include remplacé par Match suite préconisation
// @include     /^https:\/\/r[0-9]*\.fr\.bloodwars\.net\/.*$/

/* TODO
- Vérifier les fusions sur serveur Moria S
- workers multiples ?
- adaptation Greasemonkey ?
- fusionner 2 objets dont un épique :
      Legendaire Parfait +5
   +  Epique quelque soit le niveau
   =  objet épique ayant des affixes de l’objet Légendaire parfait +5 avec le niveau de l’objet Epique
- affichage du score des objets.
- choix de la couleur de sélection (moche pour certains thèmes)
*/
(function () {
  "use strict";
  var debugTime = Date.now();
  var debug = false;
  /**
   * @method exist
   * Test l'existence d'une valeur
   * @param {*} v la valeur à tester
   * @return {Boolean} faux si 'undefined'
   */
  function exist(v) {
    return (v !== undefined && typeof v !== 'undefined');
  }
  /**
   * @method isNull
   * Test si une valeur est Null
   * @param {*} v la valeur à tester
   * @return {Boolean} vrai si Null
   */
  function isNull(v) {
    return (v === null && typeof v === 'object');
  }
  /**
   * @method clone
   * Créé une copie de l'objet
   * @param {Object} obj
   * @return {Object} newObjet
   */
  function clone(obj) {
    if (typeof obj !== 'object' || obj === null) {
      return obj;
    }
    var newObjet = obj.constructor();
    for (var i in obj) {
      if (obj.hasOwnProperty(i)) {
        newObjet[i] = clone(obj[i]);
      }
    }
    return newObjet;
  }
  /******************************************************
   * OBJET Jsons - JSON
   * Stringification des données
   ******************************************************/
  var Jsons = (function () {
    function reviver(key, v) {
      if (typeof v === 'string') {
        var a = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2}):(\d{2}(?:\.\d*)?)Z$/.exec(v);
        if (!isNull(a)) return new Date(Date.UTC(Number(a[1]), Number(a[2]) - 1, Number(a[3]), Number(a[4]), Number(a[5]), Number(a[6])));
      }
      return v;
    }
    return {
      init: function () {
        if (!JSON) throw new Error("Erreur : le service JSON n\'est pas disponible.");
        else return this;
      },
      /**
       * @method decode
       * Désérialise une chaîne JSON.
       * @param {JSON} v - chaîne JSON à décoder.
       * @return {?*} r la valeur décodée sinon null.
       */
      decode: function (v) {
        var r = null;
        try {
          r = JSON.parse(v, reviver);
        } catch (e) {
          console.error('Jsons.decode error :', v, e);
        }
        return r;
      },
      /**
       * @method encode
       * Sérialise un objet au format JSON.
       * @param {*} v - la valeur à encoder.
       * @return {JSON} une chaîne au format JSON.
       */
      encode: function (v) {
        return JSON.stringify(v);
      }
    };
  })().init();
  /******************************************************
   * OBJET LS - Local Storage - basé sur localStorage
   * Note : localStorage est lié au domaine
   ******************************************************/
  var LS = (function () {
    return {
      init: function () {
        if (!window.localStorage) throw new Error("Erreur : le service localStorage n\'est pas disponible.");
        else return this;
      },
      /**
       * @method get
       * Retourne la valeur de key ou sinon la valeur par défaut.
       * @param {String} key - la clé recherchée.
       * @param {*} defVal - valeur par défaut.
       * @return {*} val|defVal
       */
      get: function (key, defVal) {
        var val = window.localStorage.getItem(key); // return null if no key
        return (!isNull(val) ? Jsons.decode(val) : defVal);
      },
      /**
       * @method set
       * Ajoute/remplace la valeur de la clé concernée.
       * @param {String} key - la clé.
       * @param {*} val
       * @return {*} val
       */
      set: function (key, val) {
        window.localStorage.setItem(key, Jsons.encode(val));
        return val;
      },
      /**
       * @method del
       * Efface la clé.
       * @param {String} key - la clé.
       * @return {String} key
       */
      del: function (key) {
        window.localStorage.removeItem(key);
        return key;
      },
      /**
       * @method size
       * Taille des données.
       * @return {Number}
       */
      size: function () {
        return window.localStorage.length;
      },
      /**
       * @method key
       * Nom de la valeur.
       * @param {number} index - entier représentant le numéro de la clé voulue (0 à length).
       * @return {String}
       */
      key: function (index) {
        return window.localStorage.key(index);
      }
    };
  })().init();
  /******************************************************
   * OBJET DOM - Fonctions DOM & QueryString
   * - fonctions d'accès aux noeuds basées sur Xpath
   * - fonctions de création de noeuds et event
   * - queryString : accès aux arguments de l'URL
   ******************************************************/
  var DOM = (function () {
    return {
      /**
       * @method getNodes
       * Cherche un ensemble de noeuds correspondant à la recherche
       * @param {xpathExpression} path - chemin au format Xpath
       * @param {contextNode} [root=document] - noeud servant de base à la recherche
       * @return {?XPathResult} null si aucun noeud trouvé ou root incorrect
       */
      getNodes: function (path, root) {
        return (exist(root) && isNull(root)) ? null : document.evaluate(path, (exist(root) ? root :
          document), null, XPathResult.ORDERED_NODE_SNAPSHOT_TYPE, null);
      },
      /**
       * @method getFirstNode
       * Retourne le 1er noeud correspondant à la recherche
       * @param {xpathExpression} path - chemin au format Xpath
       * @param {contextNode} [root=document] - noeud servant de base à la recherche
       * @return {?Element=null} noeud ou null si aucun résultat
       */
      getFirstNode: function (path, root) {
        var r = this.getNodes(path, root);
        return (!isNull(r) && r.snapshotLength >= 1 ? r.snapshotItem(0) : null);
      },
      /**
       * @method getFirstNodeTextContent
       * Retourne et modifie le textContent du 1er noeud correspondant à la recherche
       * @param {xpathExpression} path - chemin au format Xpath
       * @param {String} defVal - valeur par défaut
       * @param {contextNode} [root=document] - noeud servant de base à la recherche
       * @return {textContent=defVal}
       */
      getFirstNodeTextContent: function (path, defVal, root) {
        var r = this.getFirstNode(path, root);
        return (!isNull(r) && !isNull(r.textContent) ? r.textContent : defVal);
      },
      /**
       * @method addEvent
       * Assigne un gestionnaire d'évènement à un noeud
       * @example call
       * DOM.addEvent(result,'click',fn,'2');
       * @example listener
       * // this = node, e = event
       * function fn(e,par) {alert('Event : ' + this.value + e.type + par);}
       * @param {contextNode} node - noeud utilisé
       * @param {String} type - type d'évènement à enregistrer
       * @param {Function} fn - fonction recevant la notification
       * @param {*} par - paramètres à passer
       */
      addEvent: function (node, type, fn, par) {
        var funcName = function (e) {
          return fn.call(node, e, par);
        };
        node.addEventListener(type, funcName, false);
        if (!node.BWMListeners) {
          node.BWMListeners = {};
        }
        if (!node.BWMListeners[type]) node.BWMListeners[type] = {};
        node.BWMListeners[type][fn.name] = funcName;
      },
      /**
       * @method newNode
       * Créé un noeud à partir d'une description
       * @example
       * DOM.newNode('input', { 'type': 'checkbox', 'checked': true }, ['texte'], {'click': [funcname, param]}, parentNode);
       * @param {String} type - balise html
       * @param {{...Objet}} attributes - liste des attributs
       * @param {String[]} content - texte
       * @param {{...[funcname, param]}} events - événements attachés à ce noeud
       * @param {Node} parent - noeud parent
       * @return {Node} node
       */
      newNode: function (type, attributes, content, events, parent) {
        var node = document.createElement(type);
        for (var key in attributes) {
          if (attributes.hasOwnProperty(key)) {
            if (typeof attributes[key] !== 'boolean') node.setAttribute(key, attributes[key]);
            else if (attributes[key] === true) node.setAttribute(key, key.toString());
          }
        }
        for (key in events) {
          if (events.hasOwnProperty(key)) {
            this.addEvent(node, key, events[key][0], events[key][1]);
          }
        }
        for (var i = 0; i < content.length; i++) {
          node.textContent += content[i];
        }
        if (!isNull(parent)) parent.appendChild(node);
        return node;
      },
      /**
       * @method newNodes
       * Créé en ensemble de noeuds à partir d'une liste descriptive
       * @param {[...Array]} list - décrit un ensemble de noeuds (cf newNode)
       * @param {{...Objet}} [base] - précédent ensemble
       * @return {{...Objet}} nodes - liste des noeuds
       */
      newNodes: function (list, base) {
        var nodes = exist(base) ? base : {};
        for (var i = 0; i < list.length; i++) {
          var node = exist(nodes[list[i][5]]) ? nodes[list[i][5]] : list[i][5];
          nodes[list[i][0]] = this.newNode(list[i][1], list[i][2], list[i][3], list[i][4], node);
        }
        return nodes;
      },
      /**
       * @method queryString
       * retourne la valeur de la clé "key" trouvé dans l'url
       * null: n'existe pas, true: clé existe mais sans valeur, autres: valeur
       * @param {String} key
       * @return {String} offset
       */
      queryString: function (key) {
        var url = window.location.search,
          reg = new RegExp('[?&]' + key + '(=([^&$]+)|)(&|$)', 'i'),
          offset = reg.exec(url);
        if (!isNull(offset)) {
          offset = exist(offset[2]) ? offset[2] : true;
        }
        return offset;
      }
    };
  })();
  /******************************************************
   * OBJET L - localisation des chaînes de caractères et
   * des expressions régulières.
   ******************************************************/
  var L = (function () {
    var locStr = {
      "sDeconnecte": "Vous avez été déconnecté en raison d’une longue inactivité.",
      "sCourtePause": "Une courte pause est en court en raison de l’actualisation du classement général",
      "sUnknowID": "Blood Wars Mix - Erreur :\n\nLe nom de ce vampire doit être lié à son ID. Merci de consulter la Salle du Trône pour rendre le script opérationnel.\nCe message est normal si vous utilisez ce script pour la première fois ou si vous avez changé le nom du vampire.",
      "moria": [
        // 0 - types
        ['Casque', 'Armure', 'Pantalon', 'Amulette', 'Anneau', 'Arme à une main',
          'Arme à deux mains', 'Arme à feu à une main', 'Arme à feu à deux mains',
          'Arme à distance à deux mains'
        ],
        // 1 - qualité
        [
          ['-'],
          ['S1'],
          ['S2'],
          ['S3'],
          ['S4'],
          ['S5'],
          ['B0'],
          ['B1'],
          ['B2'],
          ['B3'],
          ['B4'],
          ['B5'],
          ['P0'],
          ['P1'],
          ['P2'],
          ['P3'],
          ['P4'],
          ['P5']
        ],
        [ // 2 - sous-types (true si objet féminin)
          [
            ['-'],
            ['Casquette', true],
            ['Casque'],
            ['Casque Militaire'],
            ['Masque'],
            ['Diadème'],
            ['Cagoule', true],
            ['Chapeau'],
            ['Fronteau'],
            ['Bandana'],
            ['Couronne', true]
          ],
          [
            ['-'],
            ['T-shirt'],
            ['Veste', 'Cadeau', true],
            ['Veston'],
            ['Gilet'],
            ['Corset'],
            ['Cape', true],
            ['Smoking'],
            ['Haubert'],
            ['Armure En Plate', true],
            ['Pleine Armure', true]
          ],
          [
            ['-'],
            ['Short'],
            ['Pantalon'],
            ['Jupe', true],
            ['Kilt']
          ],
          [
            ['-'],
            ['Collier'],
            ['Amulette', true],
            ['Chaîne', true],
            ['Foulard'],
            ['Cravate', true]
          ],
          [
            ['-'],
            ['Anneau'],
            ['Bracelet'],
            ['Chevalière', true]
          ],
          [
            ['-'],
            ['Matraque', true],
            ['Couteau'],
            ['Poignard'],
            ['Poing Américain'],
            ['Épée', true],
            ['Rapière', true],
            ['Kama'],
            ['Hache', true],
            ['Wakizashi'],
            ['Poing des Cieux', 'Boule de neige']
          ],
          [
            ['-'],
            ['Massue'],
            ['Pince-monseigneur', true],
            ['Espadon'],
            ['Hache Lourde', true],
            ['Morgenstern', true],
            ['Faux', 'Luge', true],
            ['Pique'],
            ['Hallebarde', true],
            ['Katana'],
            ['Tronçonneuse', true]
          ],
          [
            ['-'],
            ['Glock'],
            ['Beretta'],
            ['Uzi', 'Lanceur de boule de neige'],
            ['Magnum'],
            ['Desert Eagle'],
            ['Mp5k'],
            ['Scorpion']
          ],
          [
            ['-'],
            ['Carabine de Chasse'],
            ['Semi-automatique de Sniper'],
            ['Fusil de Sniper'],
            ['AK-47'],
            ['Fn-Fal'],
            ['Fusil'],
            ['Lance-flammes']
          ],
          [
            ['-'],
            ['Arc Court'],
            ['Arc'],
            ['Shuriken', 'Foie gras'],
            ['Arc Long'],
            ['Arbalète'],
            ['Couteau de lancer'],
            ['Arc Reflex'],
            ['Javelot'],
            ['Pilum'],
            ['Francisque'],
            ['Lourde Arbalète']
          ]
        ],
        [ // 3 - Préfixes
          [
            ['-'],
            ['Endurci', 'Endurcie'],
            ['Renforcé', 'Renforcée'],
            ['Serviable'],
            ['Chic'],
            ['Élégant', 'Élégante'],
            ['Cornu', 'Cornue'],
            ['Malicieux', 'Malicieuse'],
            ['Paresseux', 'Paresseuse'],
            ['Mortel', 'Mortelle'],
            ['Guerrier', 'Guerrière'],
            ['Magnétique'],
            ['Sanglant', 'Sanglante'],
            ['Splendide'],
            ['Pare-balles'],
            ['Chamaniste'],
            ['Tigre'],
            ['D’Assaut'],
            ['Runique'],
            ['Rituel', 'Rituelle']
          ],
          [
            ['-'],
            ['Renforcé', 'Renforcée'],
            ['Clouté', 'Cloutée'],
            ['Dominateur', 'Dominatrice'],
            ['Léger', 'Légère'],
            ['Écailleux', 'Écailleuses'],
            ['En Plate'],
            ['Guerrier', 'Guerrière'],
            ['Flexible'],
            ['Sanglant', 'Sanglante'],
            ['Chasseur'],
            ['Chamaniste'],
            ['Pare-balles'],
            ['Tigre'],
            ['Elfe'],
            ['Runique'],
            ['Mortel', 'Mortelle']
          ],
          [
            ['-'],
            ['Court', 'Courte'],
            ['Piqué', 'Piquée'],
            ['Léger', 'Légère'],
            ['Renforcé', 'Renforcée'],
            ['Satiné', 'Satinée'],
            ['Clouté', 'Cloutée'],
            ['Pare-balles'],
            ['Flexible'],
            ['Épineux', 'Épineuse'],
            ['Chamaniste'],
            ['Sanglant', 'Sanglante'],
            ['Elfe'],
            ['Tigre'],
            ['Blindé', 'Blindée'],
            ['Composite'],
            ['Runique'],
            ['Mortel', 'Mortelle']
          ],
          [
            ['-'],
            ['En Bronze'],
            ['En Argent'],
            ['Émeraude'],
            ['En Or'],
            ['En Platine'],
            ['En Titane'],
            ['Rubis'],
            ['Distingué', 'Distinguée'],
            ['Astucieux', 'Astucieuse'],
            ['Ours'],
            ['Dur', 'Dure'],
            ['Astral', 'Astrale'],
            ['Élastique'],
            ['Cardinal', 'Cardinale'],
            ['Nécromancien', 'Nécromancienne'],
            ['Archaique'],
            ['Hypnotique'],
            ['Dansant', 'Dansante'],
            ['Fauve'],
            ['Diamant'],
            ['Vindicatif', 'Vindicative'],
            ['Faussé', 'Faussée'],
            ['En Plastique'],
            ['Insidieux', 'Insidieuse'],
            ['Solaire'],
            ['Araignée'],
            ['Faucon'],
            ['Noir', 'Noire']
          ],
          [
            ['-'],
            ['En Bronze'],
            ['En Argent'],
            ['Émeraude'],
            ['En Or'],
            ['En Platine'],
            ['En Titane'],
            ['Rubis'],
            ['Distingué', 'Distinguée'],
            ['Astucieux', 'Astucieuse'],
            ['Ours'],
            ['Dur', 'Dure'],
            ['Astral', 'Astrale'],
            ['Élastique'],
            ['Cardinal', 'Cardinale'],
            ['Nécromancien', 'Nécromancienne'],
            ['Archaique'],
            ['Hypnotique'],
            ['Dansant', 'Dansante'],
            ['Fauve'],
            ['Diamant'],
            ['Vindicatif', 'Vindicative'],
            ['Faussé', 'Faussée'],
            ['En Plastique'],
            ['Insidieux', 'Insidieuse'],
            ['Solaire'],
            ['Araignée'],
            ['Faucon'],
            ['Noir', 'Noire']
          ],
          [
            ['-'],
            ['Sévère'],
            ['Denté', 'Dentée'],
            ['Osseux', 'Osseuse'],
            ['Tonifiant', 'Tonifiante'],
            ['Cristallin', 'Cristalline'],
            ['Mystique'],
            ['Léger', 'Légère'],
            ['Cruel', 'Cruelle'],
            ['Amical', 'Amicale'],
            ['Piquant', 'Piquante'],
            ['Protecteur', 'Protectrice'],
            ['Lumineux', 'Lumineuse'],
            ['Venimeux', 'Venimeuse'],
            ['Meurtrier', 'Meurtrière'],
            ['Empoisonné', 'Empoisonnée'],
            ['Damné', 'Damnée'],
            ['Agile'],
            ['Antique'],
            ['Rapide'],
            ['Démoniaque']
          ],
          [
            ['-'],
            ['Dispendieux', 'Dispendieuse'],
            ['Sévère'],
            ['Cristallin', 'Cristalline'],
            ['Denté', 'Dentée'],
            ['Large'],
            ['Cruel', 'Cruelle'],
            ['Mystique'],
            ['Tonifiant', 'Tonifiante'],
            ['Piquant', 'Piquante'],
            ['Léger', 'Légère'],
            ['Lourd', 'Lourde'],
            ['Empoisonné', 'Empoisonnée'],
            ['Irradié', 'Irradiée'],
            ['Lumineux', 'Lumineuse'],
            ['Protecteur', 'Protectrice'],
            ['Venimeux', 'Venimeuse'],
            ['Meurtrier', 'Meurtrière'],
            ['Damné', 'Damnée'],
            ['Agile'],
            ['Antique'],
            ['Démoniaque']
          ],
          [
            ['-']
          ],
          [
            ['-']
          ],
          [
            ['-']
          ]
        ],
        [ // 4 - suffixes
          [
            ['-'],
            ['Explorateur', 'De L’Explorateur'],
            ['Précaution', 'De La Précaution'],
            ['Endurance', 'D’Endurance'],
            ['Berger', 'Du Berger'],
            ['Toxicomane', 'Du Toxicomane'],
            ['Protection', 'De La Protection'],
            ['Sens', 'Des Sens'],
            ['Prophète', 'Du Prophète'],
            ['Punition', 'De La Punition'],
            ['Gladiateur', 'Du Gladiateur'],
            ['Sang', 'Du Sang'],
            ['Carapace De Tortue', 'De Carapace De Tortue'],
            ['Soleil', 'Du Soleil'],
            ['Adrénaline', 'De l’Adrénaline'],
            ['Précognition', 'De La Précognition'],
            ['Écaille De Dragon', 'D’Écaille De Dragon'],
            ['Puissance', 'De La Puissance'],
            ['Magie', 'De La Magie']
          ],
          [
            ['-'],
            ['Voleur', 'Du Voleur'],
            ['Adepte', 'De L’Adepte'],
            ['Garde', 'Du Garde'],
            ['Athlète', 'De L’Athlète'],
            ['Toxicomane', 'Du Toxicomane'],
            ['Maître D’Epée', 'Du Maître D’Epée'],
            ['Tueur', 'Du Tueur'],
            ['Gardien', 'Du Gardien'],
            ['Cobra', 'Du Cobra'],
            ['Carapace De Tortue', 'De Carapace De Tortue'],
            ['Esquive', 'D’Esquive'],
            ['Pillard', 'Du Pillard'],
            ['Maître', 'Du Maître'],
            ['Adrénaline', 'De l’Adrénaline'],
            ['Centurion', 'Du Centurion'],
            ['Résistance', 'De La Résistance'],
            ['Caligula', 'De Caligula'],
            ['Semeur De La Mort', 'Du Semeur De La Mort'],
            ['Vitesse', 'De La Vitesse'],
            ['Orchidée', 'De L’Orchidée']
          ],
          [
            ['-'],
            ['Brigand', 'Du Brigand'],
            ['Contrebandier', 'Du Contrebandier'],
            ['Toxicomane', 'Du Toxicomane'],
            ['Athlète', 'De L’Athlète'],
            ['Gestes Muets', 'Des Gestes Muets'],
            ['Esquive', 'D’Esquive'],
            ['Réserve', 'De La Réserve'],
            ['Soleil', 'Du Soleil'],
            ['Trafiquant D’Armes', 'Du Trafiquant D’Armes'],
            ['Berger', 'Du Berger'],
            ['Chasseur D’Ombres', 'Du Chasseur D’Ombres'],
            ['Serpent', 'Du Serpent'],
            ['Incas', 'Des Incas'],
            ['Orienteur', 'De L’Orienteur'],
            ['Nuit', 'De La Nuit']
          ],
          [
            ['-'],
            ['Délit', 'Du Délit'],
            ['Beauté', 'De La Beauté'],
            ['Pouvoir', 'Du Pouvoir'],
            ['Génie', 'Du Génie'],
            ['Force', 'De La Force'],
            ['Sagesse', 'De La Sagesse'],
            ['Peau Dure', 'De La Peau Dure'],
            ['Pèlerin', 'Du Pèlerin'],
            ['Loup-garou', 'Du Loup-garou'],
            ['Justesse', 'De La Justesse'],
            ['Art', 'De L’Art'],
            ['Jouvence', 'De La Jouvence'],
            ['Chance', 'De La Chance'],
            ['Sang', 'Du Sang'],
            ['Habilité', 'De L’Habilité'],
            ['Concentration', 'De La Concentration'],
            ['Lévitation', 'De La Lévitation'],
            ['Astuce', 'De L’Astuce'],
            ['Dément', 'Du Dément'],
            ['Facilitée', 'De La Facilitée']
          ],
          [
            ['-'],
            ['Délit', 'Du Délit'],
            ['Beauté', 'De La Beauté'],
            ['Pouvoir', 'Du Pouvoir'],
            ['Force', 'De La Force'],
            ['Génie', 'Du Génie'],
            ['Sagesse', 'De La Sagesse'],
            ['Peau Dure', 'De La Peau Dure'],
            ['Loup-garou', 'Du Loup-garou'],
            ['Art', 'De L’Art'],
            ['Justesse', 'De La Justesse'],
            ['Jouvence', 'De La Jouvence'],
            ['Renard', 'Du Renard'],
            ['Chance', 'De La Chance'],
            ['Sang', 'Du Sang'],
            ['Chauve-souris', 'De La Chauve-souris'],
            ['Concentration', 'De La Concentration'],
            ['Lévitation', 'De La Lévitation'],
            ['Astuce', 'De L’Astuce'],
            ['Dément', 'Du Dément'],
            ['Facilitée', 'De La Facilitée']
          ],
          [
            ['-'],
            ['Commandant', 'Du Commandant'],
            ['Secte', 'De La Secte'],
            ['Douleur', 'De La Douleur'],
            ['Pouvoir', 'Du Pouvoir'],
            ['Agilité', 'De L’Agilité'],
            ['Puissance', 'De La Puissance'],
            ['Peste', 'De la Peste'],
            ['Courage', 'Du Courage'],
            ['Justesse', 'De La Justesse'],
            ['Ancêtres', 'Des Ancêtres'],
            ['Conquérant', 'Du Conquérant'],
            ['Vengeance', 'De La Vengeance'],
            ['Contusion', 'De La Contusion'],
            ['Vertu', 'De La Vertu'],
            ['Précision', 'De La Précision'],
            ['Sang', 'Du Sang'],
            ['Fer À Cheval', 'Du Fer À Cheval'],
            ['Suicidé', 'Du Suicidé'],
            ['Dracula', 'De Dracula'],
            ['Vélocité', 'De La Vélocité'],
            ['Clan', 'Du Clan'],
            ['Empereur', 'De L’Empereur']
          ],
          [
            ['-'],
            ['Trahison', 'De La Trahison'],
            ['Ruse', 'De La Ruse'],
            ['Douleur', 'De La Douleur'],
            ['Hasardeux', 'Du Hasardeux'],
            ['Plomb', 'De Plomb'],
            ['Puissance', 'De La Puissance'],
            ['Inquisiteur', 'De L’Inquisiteur'],
            ['Buveur De Sang', 'Du Buveur De Sang'],
            ['Conquérant', 'Du Conquérant'],
            ['Pouvoir', 'Du Pouvoir'],
            ['Vengeance', 'De La Vengeance'],
            ['Peste', 'De la Peste'],
            ['Fer À Cheval', 'Du Fer À Cheval'],
            ['Autocrate', 'De L’Autocrate'],
            ['Sang', 'Du Sang'],
            ['Basilic', 'Du Basilic'],
            ['Suicidé', 'Du Suicidé'],
            ['Dracula', 'De Dracula']
          ],
          [
            ['-']
          ],
          [
            ['-']
          ],
          [
            ['-'],
            ['Longue Portée', 'De Longue Portée'],
            ['Perfection', 'De La Perfection'],
            ['Précision', 'De La Précision'],
            ['Vengeance', 'De La Vengeance'],
            ['Réaction', 'De La Réaction'],
            ['Dryades', 'Des Dryades'],
            ['Mitraillage', 'De Mitraillage'],
            ['Loups', 'Du Loups']
          ]
        ]
      ],
      "moriaS": [
        // 0 - types
        ['Casque', 'Armure', 'Pantalon', 'Amulette', 'Anneau', 'Arme à une main',
          'Arme à deux mains', 'Arme à feu à une main', 'Arme à feu à deux mains',
          'Arme à distance à deux mains'
        ],
        // 1 - qualité
        [
          ['-'],
          ['S1'],
          ['S2'],
          ['S3'],
          ['S4'],
          ['S5'],
          ['B0'],
          ['B1'],
          ['B2'],
          ['B3'],
          ['B4'],
          ['B5'],
          ['P0'],
          ['P1'],
          ['P2'],
          ['P3'],
          ['P4'],
          ['P5']
        ],
        [ // 2 - sous-types (true si objet féminin)
          [
            ['-'],
            ['Casquette', true],
            ['Casque'],
            ['Casque Militaire'],
            ['Masque'],
            ['Diadème'],
            ['Cagoule', true],
            ['Chapeau'],
            ['Fronteau'],
            ['Bandana'],
            ['Couronne', true]
          ],
          [ // ok
            ['-'],
            ['T-shirt'],
            ['Veste', 'Cadeau', true],
            ['Veston'],
            ['Gilet'],
            ['Corset'],
            ['Cape', true],
            ['Smoking'],
            ['Haubert'],
            ['Armure En Plate', true],
            ['Pleine Armure', true]
          ],
          [ // ok
            ['-'],
            ['Short'],
            ['Pantalon'],
            ['Jupe', true],
            ['Kilt']
          ],
          [
            ['-'],
            ['Collier'],
            ['Amulette', true],
            ['Chaîne', true],
            ['Foulard'],
            ['Cravate', true]
          ],
          [ // ok
            ['-'],
            ['Anneau'],
            ['Bracelet'],
            ['Chevalière', true]
          ],
          [ // ok
            ['-'],
            ['Matraque', true],
            ['Couteau'],
            ['Poignard'],
            ['Poing Américain'],
            ['Épée', true],
            ['Rapière', true],
            ['Kama'],
            ['Hache', true],
            ['Wakizashi'],
            ['Poing des Cieux', 'Boule de neige']
          ],
          [
            ['-'],
            ['Massue'],
            ['Pince-monseigneur', true],
            ['Espadon'],
            ['Hache Lourde', true],
            ['Morgenstern', true],
            ['Faux', 'Luge', true],
            ['Pique'],
            ['Hallebarde', true],
            ['Katana'],
            ['Tronçonneuse', true]
          ],
          [
            ['-'],
            ['Glock'],
            ['Beretta'],
            ['Uzi', 'Lanceur de boule de neige'],
            ['Magnum'],
            ['Desert Eagle'],
            ['Mp5k'],
            ['Scorpion']
          ],
          [
            ['-'],
            ['Carabine de Chasse'],
            ['Semi-automatique de Sniper'],
            ['Fusil de Sniper'],
            ['AK-47'],
            ['Fn-Fal'],
            ['Fusil'],
            ['Lance-flammes']
          ],
          [
            ['-'],
            ['Arc Court'],
            ['Arc'],
            ['Shuriken', 'Foie gras'],
            ['Arc Long'],
            ['Arbalète'],
            ['Couteau de lancer'],
            ['Arc Reflex'],
            ['Javelot'],
            ['Pilum'],
            ['Francisque'],
            ['Lourde Arbalète']
          ]
        ],
        [ // 3 - Préfixes
          [
            ['-'],
            ['Endurci', 'Endurcie'],
            ['Renforcé', 'Renforcée'],
            ['Serviable'],
            ['Chic'],
            ['Élégant', 'Élégante'],
            ['Cornu', 'Cornue'],
            ['Malicieux', 'Malicieuse'],
            ['Paresseux', 'Paresseuse'],
            ['Mortel', 'Mortelle'],
            ['Guerrier', 'Guerrière'],
            ['Magnétique'],
            ['Sanglant', 'Sanglante'],
            ['Splendide'],
            ['Pare-balles'],
            ['Chamaniste'],
            ['Tigre'],
            ['D’Assaut'],
            ['Runique'],
            ['Rituel', 'Rituelle']
          ],
          [ // ok
            ['-'],
            ['Renforcé', 'Renforcée'],
            ['Clouté', 'Cloutée'],
            ['Dominateur', 'Dominatrice'],
            ['Léger', 'Légère'],
            ['Écailleux', 'Écailleuses'],
            ['Guerrier', 'Guerrière'],
            ['En Plate'],
            ['Flexible'],
            ['Sanglant', 'Sanglante'],
            ['Chasseur'],
            ['Chamaniste'],
            ['Pare-balles'],
            ['Tigre'],
            ['Elfe'],
            ['Runique'],
            ['Mortel', 'Mortelle']
          ],
          [ // ok
            ['-'],
            ['Court', 'Courte'],
            ['Piqué', 'Piquée'],
            ['Léger', 'Légère'],
            ['Renforcé', 'Renforcée'],
            ['Satiné', 'Satinée'],
            ['Clouté', 'Cloutée'],
            ['Pare-balles'],
            ['Flexible'],
            ['Épineux', 'Épineuse'],
            ['Chamaniste'],
            ['Sanglant', 'Sanglante'],
            ['Elfe'],
            ['Tigre'],
            ['Blindé', 'Blindée'],
            ['Runique'],
            ['Composite'],
            ['Mortel', 'Mortelle']
          ],
          [
            ['-'],
            ['En Bronze'],
            ['En Argent'],
            ['Émeraude'],
            ['En Or'],
            ['En Platine'],
            ['Rubis'],
            ['Distingué', 'Distinguée'],
            ['Astucieux', 'Astucieuse'],
            ['Cardinal', 'Cardinale'],
            ['Élastique'],
            ['Nécromancien', 'Nécromancienne'],
            ['Astral', 'Astrale'],
            ['Ours'],
            ['Dur', 'Dure'],
            ['Diamant'],
            ['Vindicatif', 'Vindicative'],
            ['Archaique'],
            ['Dansant', 'Dansante'],
            ['Hypnotique'],
            ['Fauve'],
            ['Faussé', 'Faussée'],
            ['En Plastique'],
            ['Insidieux', 'Insidieuse'],
            ['En Titane'],
            ['Solaire'],
            ['Araignée'],
            ['Faucon'],
            ['Noir', 'Noire']
          ],
          [ // ok
            ['-'],
            ['En Bronze'],
            ['En Argent'],
            ['Émeraude'],
            ['En Or'],
            ['En Platine'],
            ['Rubis'],
            ['Distingué', 'Distinguée'],
            ['Astucieux', 'Astucieuse'],
            ['Cardinal', 'Cardinale'],
            ['Élastique'],
            ['Nécromancien', 'Nécromancienne'],
            ['Astral', 'Astrale'],
            ['Ours'],
            ['Dur', 'Dure'],
            ['Fauve'],
            ['Dansant', 'Dansante'],
            ['Archaique'],
            ['Hypnotique'],
            ['Diamant'],
            ['Vindicatif', 'Vindicative'],
            ['Faussé', 'Faussée'],
            ['En Plastique'],
            ['Insidieux', 'Insidieuse'],
            ['En Titane'],
            ['Solaire'],
            ['Araignée'],
            ['Faucon'],
            ['Noir', 'Noire']
          ],
          [ // ok
            ['-'],
            ['Sévère'],
            ['Denté', 'Dentée'],
            ['Osseux', 'Osseuse'],
            ['Tonifiant', 'Tonifiante'],
            ['Cristallin', 'Cristalline'],
            ['Mystique'],
            ['Léger', 'Légère'],
            ['Cruel', 'Cruelle'],
            ['Amical', 'Amicale'],
            ['Piquant', 'Piquante'],
            ['Protecteur', 'Protectrice'],
            ['Lumineux', 'Lumineuse'],
            ['Venimeux', 'Venimeuse'],
            ['Meurtrier', 'Meurtrière'],
            ['Empoisonné', 'Empoisonnée'],
            ['Damné', 'Damnée'],
            ['Agile'],
            ['Antique'],
            ['Rapide'],
            ['Démoniaque']
          ],
          [
            ['-'],
            ['Dispendieux', 'Dispendieuse'],
            ['Sévère'],
            ['Cristallin', 'Cristalline'],
            ['Denté', 'Dentée'],
            ['Large'],
            ['Cruel', 'Cruelle'],
            ['Mystique'],
            ['Tonifiant', 'Tonifiante'],
            ['Piquant', 'Piquante'],
            ['Léger', 'Légère'],
            ['Lourd', 'Lourde'],
            ['Empoisonné', 'Empoisonnée'],
            ['Irradié', 'Irradiée'],
            ['Lumineux', 'Lumineuse'],
            ['Protecteur', 'Protectrice'],
            ['Venimeux', 'Venimeuse'],
            ['Meurtrier', 'Meurtrière'],
            ['Damné', 'Damnée'],
            ['Agile'],
            ['Antique'],
            ['Démoniaque']
          ],
          [
            ['-']
          ],
          [
            ['-']
          ],
          [
            ['-']
          ]
        ],
        [ // 4 - suffixes
          [
            ['-'],
            ['Explorateur', 'De L’Explorateur'],
            ['Précaution', 'De La Précaution'],
            ['Endurance', 'D’Endurance'],
            ['Berger', 'Du Berger'],
            ['Toxicomane', 'Du Toxicomane'],
            ['Protection', 'De La Protection'],
            ['Sens', 'Des Sens'],
            ['Prophète', 'Du Prophète'],
            ['Punition', 'De La Punition'],
            ['Gladiateur', 'Du Gladiateur'],
            ['Sang', 'Du Sang'],
            ['Carapace De Tortue', 'De Carapace De Tortue'],
            ['Soleil', 'Du Soleil'],
            ['Adrénaline', 'De l’Adrénaline'],
            ['Précognition', 'De La Précognition'],
            ['Écaille De Dragon', 'D’Écaille De Dragon'],
            ['Puissance', 'De La Puissance'],
            ['Magie', 'De La Magie']
          ],
          [ // ok
            ['-'],
            ['Adepte', 'De L’Adepte'],
            ['Garde', 'Du Garde'],
            ['Voleur', 'Du Voleur'],
            ['Athlète', 'De L’Athlète'],
            ['Toxicomane', 'Du Toxicomane'],
            ['Maître D’Epée', 'Du Maître D’Epée'],
            ['Tueur', 'Du Tueur'],
            ['Gardien', 'Du Gardien'],
            ['Cobra', 'Du Cobra'],
            ['Carapace De Tortue', 'De Carapace De Tortue'],
            ['Esquive', 'D’Esquive'],
            ['Pillard', 'Du Pillard'],
            ['Maître', 'Du Maître'],
            ['Adrénaline', 'De l’Adrénaline'],
            ['Centurion', 'Du Centurion'],
            ['Résistance', 'De La Résistance'],
            ['Caligula', 'De Caligula'],
            ['Semeur De La Mort', 'Du Semeur De La Mort'],
            ['Vitesse', 'De La Vitesse'],
            ['Orchidée', 'De L’Orchidée']
          ],
          [ // ok
            ['-'],
            ['Brigand', 'Du Brigand'],
            ['Contrebandier', 'Du Contrebandier'],
            ['Toxicomane', 'Du Toxicomane'],
            ['Athlète', 'De L’Athlète'],
            ['Gestes Muets', 'Des Gestes Muets'],
            ['Esquive', 'D’Esquive'],
            ['Réserve', 'De La Réserve'],
            ['Soleil', 'Du Soleil'],
            ['Trafiquant D’Armes', 'Du Trafiquant D’Armes'],
            ['Berger', 'Du Berger'],
            ['Chasseur D’Ombres', 'Du Chasseur D’Ombres'],
            ['Serpent', 'Du Serpent'],
            ['Incas', 'Des Incas'],
            ['Orienteur', 'De L’Orienteur'],
            ['Nuit', 'De La Nuit']
          ],
          [
            ['-'],
            ['Délit', 'Du Délit'],
            ['Beauté', 'De La Beauté'],
            ['Pouvoir', 'Du Pouvoir'],
            ['Génie', 'Du Génie'],
            ['Force', 'De La Force'],
            ['Sagesse', 'De La Sagesse'],
            ['Peau Dure', 'De La Peau Dure'],
            ['Pèlerin', 'Du Pèlerin'],
            ['Loup-garou', 'Du Loup-garou'],
            ['Justesse', 'De La Justesse'],
            ['Art', 'De L’Art'],
            ['Jouvence', 'De La Jouvence'],
            ['Chance', 'De La Chance'],
            ['Sang', 'Du Sang'],
            ['Habilité', 'De L’Habilité'],
            ['Concentration', 'De La Concentration'],
            ['Lévitation', 'De La Lévitation'],
            ['Astuce', 'De L’Astuce'],
            ['Dément', 'Du Dément'],
            ['Facilitée', 'De La Facilitée']
          ],
          [ // ok
            ['-'],
            ['Délit', 'Du Délit'],
            ['Beauté', 'De La Beauté'],
            ['Pouvoir', 'Du Pouvoir'],
            ['Force', 'De La Force'],
            ['Génie', 'Du Génie'],
            ['Sagesse', 'De La Sagesse'],
            ['Peau Dure', 'De La Peau Dure'],
            ['Loup-garou', 'Du Loup-garou'],
            ['Art', 'De L’Art'],
            ['Justesse', 'De La Justesse'],
            ['Jouvence', 'De La Jouvence'],
            ['Renard', 'Du Renard'],
            ['Chance', 'De La Chance'],
            ['Sang', 'Du Sang'],
            ['Chauve-souris', 'De La Chauve-souris'],
            ['Concentration', 'De La Concentration'],
            ['Lévitation', 'De La Lévitation'],
            ['Astuce', 'De L’Astuce'],
            ['Dément', 'Du Dément'],
            ['Facilitée', 'De La Facilitée']
          ],
          [ // ok
            ['-'],
            ['Commandant', 'Du Commandant'],
            ['Secte', 'De La Secte'],
            ['Douleur', 'De La Douleur'],
            ['Pouvoir', 'Du Pouvoir'],
            ['Agilité', 'De L’Agilité'],
            ['Puissance', 'De La Puissance'],
            ['Peste', 'De la Peste'],
            ['Courage', 'Du Courage'],
            ['Justesse', 'De La Justesse'],
            ['Ancêtres', 'Des Ancêtres'],
            ['Conquérant', 'Du Conquérant'],
            ['Contusion', 'De La Contusion'],
            ['Vertu', 'De La Vertu'],
            ['Précision', 'De La Précision'],
            ['Sang', 'Du Sang'],
            ['Vengeance', 'De La Vengeance'],
            ['Fer À Cheval', 'Du Fer À Cheval'],
            ['Dracula', 'De Dracula'],
            ['Vélocité', 'De La Vélocité'],
            ['Clan', 'Du Clan'],
            ['Empereur', 'De L’Empereur'],
            ['Suicidé', 'Du Suicidé']
          ],
          [
            ['-'],
            ['Trahison', 'De La Trahison'],
            ['Ruse', 'De La Ruse'],
            ['Douleur', 'De La Douleur'],
            ['Hasardeux', 'Du Hasardeux'],
            ['Plomb', 'De Plomb'],
            ['Puissance', 'De La Puissance'],
            ['Inquisiteur', 'De L’Inquisiteur'],
            ['Buveur De Sang', 'Du Buveur De Sang'],
            ['Conquérant', 'Du Conquérant'],
            ['Pouvoir', 'Du Pouvoir'],
            ['Vengeance', 'De La Vengeance'],
            ['Peste', 'De la Peste'],
            ['Fer À Cheval', 'Du Fer À Cheval'],
            ['Autocrate', 'De L’Autocrate'],
            ['Sang', 'Du Sang'],
            ['Basilic', 'Du Basilic'],
            ['Suicidé', 'Du Suicidé'],
            ['Dracula', 'De Dracula']
          ],
          [
            ['-']
          ],
          [
            ['-']
          ],
          [
            ['-'],
            ['Longue Portée', 'De Longue Portée'],
            ['Perfection', 'De La Perfection'],
            ['Précision', 'De La Précision'],
            ['Vengeance', 'De La Vengeance'],
            ['Réaction', 'De La Réaction'],
            ['Dryades', 'Des Dryades'],
            ['Mitraillage', 'De Mitraillage'],
            ['Loups', 'Du Loups']
          ]
        ]
      ]
    };
    return {
      /**
       * @method get
       * Retourne la chaine ou l'expression traduite
       * Remplace les éléments $1,$2... par les arguments transmis en complément.
       * Le caractère d'échappement '\' doit être doublé pour être pris en compte dans une expression régulière
       * @example "test": ["<b>$2<\/b> a tué $1 avec $3.",]
       * L.get('test','Dr Moutarde','Mlle Rose','le chandelier');
       * => "<b>Mlle Rose<\/b> a tué le Dr Moutarde avec le chandelier."
       * @param {String} key
       * @param {...String} [arguments]
       * @return {String} offset
       */
      get: function (key) {
        var r = locStr[key];
        if (!exist(r)) throw new Error("L::Error:: la clé n'existe pas : " + key);
        for (var i = arguments.length - 1; i >= 1; i--) {
          var reg = new RegExp("\\$" + i, "g");
          r = r.replace(reg, arguments[i]);
        }
        return r;
      }
    };
  })();
  /******************************************************
   * OBJET G - Fonctions d'accès aux données du jeu.
   * Chaque fonction retourne Null en cas d'échec.
   ******************************************************/
  var G = (function () {
    return {
      /**
       * @method playerName
       * retourne le nom du joueur
       * @return {String|null}
       */
      playerName: function () {
        return DOM.getFirstNodeTextContent("//div[@class='stats-player']/a[@class='me'] | //div[@class='character']/a[@class='nickNameStats']", null);
      },
      royaume: function () {
        var a = DOM.getFirstNodeTextContent("//div[@class='gameStats']/div[1]/b | //div[@class='realmName']", null);
        if (!isNull(a)) a = a.replace(/\n|\r/g,'').trim();
        return a;
      },
      /**
       * @method id
       * retourne l'ID du joueur (disponible uniquement sur la Salle du trône)
       * @return {String|null}
       */
      id: function () {
        var refLink = DOM.getFirstNodeTextContent(
              "//div[@id='content-mid']/div[@id='reflink']/span[@class='reflink'] | //div[@class='throneHall_refLink']/span[@class='textToCopy']", null);
        var ref = !isNull(refLink) ? /r\.php\?r=([0-9]+)/.exec(refLink) : null;
        return  !isNull(ref) ? ref[1] : null;
      },
      /**
       * @method page
       * Identifie la page et retourne son id
       * @return {String|null} p
       */
      page: function () {
        var p = null;
        // ni un message Serveur ni une page extérieur
        if (isNull(DOM.getFirstNode("//div[@class='komunikat']")) && window.location.pathname == '/') {
          var qsA = DOM.queryString("a"),
            qsDo = DOM.queryString("do");
          if (isNull(qsA) || qsA == "main") p = "pMain"; // Salle du Trône
          else if (qsA == "mixer") { // Le Puits des Âmes - Moria
            if (isNull(qsDo) || qsDo == "mkstone") p = "pMkstone";
            else if (qsDo == "upgitem") p = "pUpgitem";
            else if (qsDo == "mixitem") p = "pMixitem";
            else if (qsDo == "destitem") p = "pDestitem";
            else if (qsDo == "tatoo") p = "pTatoo";
          }
        }
        return p;
      }
    };
  })();
  /******************************************************
   * OBJET U - fonctions d'accès aux données utilisateur.
   *
   ******************************************************/
  var U = (function () {
    var defPref = {
      'shTitle': true,
      'shPos': true,
      'shHelp': true,
      'shGet': true,
      'shLArm': true,
      'shLInd': true,
      'shLSyn': true,
      'shSim': true,
      'shSchI': true,
      'shSchO': true,
      'shSchT': true,
      'shRes': true,
      'mode': 0, // 1:mode = 0
      'triCol': 2, // 2:tri = [2, 0]
      'triOrder': 0,
      'cat': 0, // 3:cat = [0, '']
      'leg': '',
      'sim': 0, // 4:sim = 0
      'result': 0, // 6:result = 0
      'setZone': 0, // 7:zone de saisie = [0, 0]
      'setIndex': 0,
      'defOpt': {
        'oMaxfusion': '',
        'oMaxEcart': '',
        'oMaxRes': '',
        'oCoef': 1,
        'oBest': true,
        'oPost': true,
        'oFQua': 1,
        'oFObj': 2,
        'oFPre': 3,
        'oFSuf': 3,
        'oODelta': ''
      }
    };
    var pref = {};
    var ids = LS.get('BWM:IDS', {});
    var id = null;
    var name = null;
    return {
      /**
       * @method init
       * Fonction d'initialisation de l'objet User.
       * Identifie l'utilisateur et ses paramètres (name, id, pref).
       * @return {Objet}
       */
      init: function () {
        var player = G.playerName();
        var page = G.page();
if (debug) console.debug('BWARC U init => player, page :', player, page);
        if (page == 'pMain' && !isNull(player)) {
          var ref = G.id();
          if (!isNull(ref))
          {
if (debug) console.debug('BWARC U init => ref :', ref);
            id = ref;
            for (var i in ids) {
              if (ids.hasOwnProperty(i) && ids[i] == id) delete ids[i]; // en cas de changement de nom
            }
            ids[player] = ref;
            LS.set('BWM:IDS', ids);
          }
        }
        if (!isNull(player) && exist(ids[player])) {
          name = player;
          id = ids[player];
          var prefTmp = LS.get('BWM:O:' + id, {});
          for (var i in defPref) {
            if (defPref.hasOwnProperty(i)) {
              pref[i] = exist(prefTmp[i]) ? prefTmp[i] : clone(defPref[i]);
            }
          }
        }
        return this;
      },
      /**
       * @method id
       * Retourne l'id de l'utilisateur.
       * @return {integer|null}
       */
      id: function () {
        return id;
      },
      /**
       * @method name
       * Retourne le nom de l'utilisateur.
       * @return {string|null}
       */
      name: function () {
        return name;
      },
      /**
       * @method getP
       * Retourne la valeur d'une préférence utilisateur.
       * @param {String} key
       * @return {*} val
       */
      getP: function (key) {
        if (exist(pref[key])) {
          return clone(pref[key]);
        } else {
          throw new Error("Erreur : clé de préférence inconnue.");
        }
      },
      /**
       * @method getDefP
       * Retourne la valeur par défaut d'une préférence utilisateur.
       * @param {String} key
       * @return {*} val
       */
      getDefP: function (key) {
        if (exist(defPref[key])) {
          return clone(defPref[key]);
        } else {
          throw new Error("Erreur : clé de préférence inconnue.");
        }
      },
      /**
       * @method setP
       * Sauvegarde la valeur d'une préférence utilisateur.
       * @param {String} key
       * @param {*} val
       * @return {*} val
       */
      setP: function (key, val) {
        if (exist(pref[key])) {
          pref[key] = clone(val);
          LS.set('BWM:O:' + id, pref);
          return val;
        } else {
          throw new Error("Erreur : clé de préférence inconnue.");
        }
      },
      /**
       * @method razP
       * Reset la valeur d'une préférence utilisateur.
       * @param {String} key
       * @return {*} val
       */
      razP: function (key) {
        if (exist(pref[key])) {
          pref[key] = defPref[key];
          LS.set('BWM:O:' + id, pref);
          return clone(pref[key]);
        } else {
          throw new Error("Erreur : clé de préférence inconnue.");
        }
      },
      /**
       * @method razAllP
       * Reset des préférences utilisateur.
       * @return {*} val
       */
      razAllP: function () {
        pref = defPref;
        LS.set('BWM:O:' + id, pref);
      },
      /**
       * @method getD
       * Retourne les données liées à l'utilisateur.
       * @param {String} key
       * @param {*} defVal - valeur par défaut
       * @return {*} val|defVal
       */
      getD: function (key, defVal) {
        return LS.get('BWM:' + key + ':' + id, defVal);
      },
      /**
       * @method setD
       * Sauvegarde des données liées à l'utilisateur.
       * @param {String} key
       * @param {*} val
       * @return {*} val
       */
      setD: function (key, val) {
        return LS.set('BWM:' + key + ':' + id, val);
      }
    };
  })().init();
  /******************************************************
   * CSS - Initialisation des styles propre à ce script.
   * Note : la commande init est appelée automatiquement.
   ******************************************************/
  var CSS = (function () {
    function getCssRules(selector, css) {
      var sheets = exist(css) ? [css] : document.styleSheets;
      for (var i = 0; i < sheets.length; i++) {
        var sheet = sheets[i];
        try {
          if (!sheet.cssRules) return null;
        } catch (e) {
          if (e.name !== 'SecurityError') throw e;
          return null;
        }
        for (var j = 0; j < sheet.cssRules.length; j++) {
          var rule = sheet.cssRules[j];
          if (rule.selectorText && rule.selectorText.split(',').indexOf(selector) !== -1) return rule.style;
        }
      }
      return null;
    }
    var css = [
      ".BWMbox{width: 100%;margin:0 auto;}",
      ".BWMtitle,.BWMcut,.BWMselect{cursor: pointer;}",
      ".BWMcut2{cursor: text;}",
      ".BWMselect:hover{text-decoration: underline;}",
      ".BMWfield{margin: 0;padding: 1px;text-align: left;}",
      ".BWMlegend{font-size: 11px;font-weight: bold;}",
      ".BWMdiv1{margin: 0px;padding: 0px;}",
      ".BWMtab0,.BWMtab1,.BWMtab3{border-collapse: collapse;width: 100%; table-layout: fixed;}",
      ".BWMtab2{border-collapse: collapse;width: 100%}",
      ".BWMtab1,.BWMtab2,.BWMtab3{text-align: center;}",
      ".BWMtab0 td{vertical-align: top;padding: 4px;}",
      ".BWMtab1 td,.BWMtab1 th{border: 1px solid black;margin: 0px;padding: 0px 0px 0px 2px; word-wrap: break-word;}",
      ".BWMtab3 td,.BWMtab3 th{border: 0px;margin: 0px;padding: 0px; word-wrap: break-word;}",
      ".BWMtab2 td{border: 0px;margin: 0px;padding: 2px;}",
      ".BWMtab1 th,.BWMtab3 th{vertical-align: top;padding-top: 2px;}",
      ".BWMtab1 td,.BWMtab3 td,.BWMtab3 span{vertical-align: middle;}",
      ".BWMinput{vertical-align: middle;width: 30px;height: 11px;margin: 0px;text-align: right;font-weight: bold;}",
      ".BWMcutth,.BWMcut,.BWMcut2{max-width: 0;overflow: hidden; white-space: nowrap;text-overflow: ellipsis}",
      ".BWMcut,.BWMcut2{text-align: left;}",
      ".BWMtriSelect{color:lime;}",
      ".BWMdivarea{width: 100%; resize:none; overflow-y: hidden; white-space: pre; height: auto; min-height: 2em;",
      "   padding: 0px; text-align: left; border: 0px;}",
      ".BWM5{width:5%;}",
      ".BWM7{width:7%;}",
      ".BWM8{width:8%;}",
      ".BWM10{width:10%;}",
      ".BWM20{width:20%;}",
      ".BWM25{width:25%;}",
      ".BWM30{width:30%;}",
      ".BWM40{width:40%;}",
      ".BWM60{width:60%;}",
      ".BWM80{width:80%;}",
      ".BWM100{width:100%;}",
      ".BWMa1{display: block;}",
      ".BWMerror, .BWMerror:hover{color:#FFF;background-color:red;}",
      ".BWMoverlib{margin: 2px;padding: 5px;text-align: left;}",
      // bord animé
      "@keyframes border-dance {  0% { background-position: 0 0, 100% 100%, 0 100%, 100% 0;} 100% {background-position: 100% 0, 0 100%, 0 0, 100% 100%;}}",
      ".BWMborder {width: max-content; background: linear-gradient(90deg, red 50%, transparent 50%), linear-gradient(90deg, red 50%, transparent 50%), linear-gradient(0deg, red 50%, transparent 50%), linear-gradient(0deg, red 50%, transparent 50%); background-repeat: repeat-x, repeat-x, repeat-y, repeat-y;  background-size: 5px 1px, 5px 1px, 1px 5px, 1px 5px; animation: border-dance 4s infinite linear;}",
      // blink
      "@keyframes blinker {from{opacity:1;}to{opacity:0;}}",
      ".BWMblink {animation: 1s blinker cubic-bezier(1.0,0,0,1.0) infinite;}",
    ];
    return {
      /**
       * @method init
       * Fonction d'initialisation du CSS.
       */
      init: function () {
        var head = DOM.getFirstNode("//head");
        if (head !== null) {
          var even = getCssRules('.even');
          var selectedItem = getCssRules('.selectedItem');
          if (even !== null && selectedItem !== null) css.push('.BWMeven{' + even.cssText + '}',
            '.BWMTR:hover .BWMcut:hover,.BWMTR2:hover .BWMcut,.BWMTR2:hover .BWMselect:hover:not(.BWMcut),' +
            '.BWMTR:hover .BWMcut2:hover,.BWMTR2:hover .BWMcut2{' + selectedItem.cssText + '}');
          DOM.newNode('style', {
            'type': 'text/css'
          }, [css.join('')], {}, head);
        }
      }
    };
  })().init();
  /******************************************************
   * FUNCTIONS
   *
   ******************************************************/
  function updateItems() {
    items = {};
    var itemsList = DOM.getNodes("./li[@id]/div/span", itemsNode);
    for (var i = 0; i < itemsList.snapshotLength; i++) {
      var obj = itemsList.snapshotItem(i).textContent;
      var v = new RegExp('^' + pat + '$').exec(obj);
if (debug) console.debug('BWM updateItems : ', obj, v);
      if (v !== null && v[0] !== '') {
        v = v.reduce(function (a, b) {
          if (exist(b)) {
            a.push(b);
          }
          return a;
        }, []);
        var leg = v[1] !== '' ? 'L' : '';
        var grade = v[2] !== '' ? indexPat[0][v[2].trim()] : 0;
        var type = indexPat[1][v[3].trim()];
        var pre = v[4] !== '' ? indexPat[2][type[0]][v[4].trim()] : 0;
        var suf = v[5] !== '' ? indexPat[3][type[0]][v[5].trim()] : 0;
        var niv = v[6] !== '' ? Number(v[6].replace(new RegExp('[()+]', 'g'), '')) : 0;
        if (!exist(items[type[0] + leg])) items[type[0] + leg] = [];
        items[type[0] + leg].push([grade + niv, type[1], pre, suf]);
        //if (debug) console.debug('BWM test4 : ', obj, leg, grade, type, pre, suf, niv, exist(type[0]) ? (exist(loc[0][type[0]]) ? loc[0][type[0]] : 'loc[0][type[0]] error') : 'type[0] error', exist(loc[1][grade + niv]) ? (exist(loc[1][grade + niv][0]) ? loc[1][grade + niv][0] : 'loc[1][grade + niv][0] error') : 'loc[1][grade + niv] error', exist(type[0]) ? (exist(type[1]) ? (exist(loc[2][type[0]]) ? (exist(loc[2][type[0]][type[1]]) ? (exist(loc[2][type[0]][type[1]][0]) ? loc[2][type[0]][type[1]][0] : 'loc[2][type[0]][type[1]][0] error') : 'loc[2][type[0]][type[1]] error') : 'loc[2][type[0]] error') : 'type[1] error') : 'type[0] error', exist(type[0]) ? (exist(pre) ? (exist(loc[3][type[0]]) ? (exist(loc[3][type[0]][pre]) ? (exist(loc[3][type[0]][pre][0]) ? loc[3][type[0]][pre][0] : 'loc[3][type[0]][pre][0] error') : 'loc[3][type[0]][pre] error') : 'loc[3][type[0]] error') : 'pre error') : 'type[0] error', exist(type[0]) ? (exist(suf) ? (exist(loc[4][type[0]]) ? (exist(loc[4][type[0]][suf]) ? (exist(loc[4][type[0]][suf][0]) ? loc[4][type[0]][suf][0] : 'loc[4][type[0]][suf][0] error') : 'loc[4][type[0]][suf] error') : 'loc[4][type[0]] error') : 'suf error') : 'type[0] error');
      } else console.debug('BWM - Objet inconnu :', obj);
    }
  }

  function addslashes(str) {
    return (str + '').replace(/[\\"']/g, '\\$&').replace(/\u0000/g, '\\0');
  }

  function objCmp(a, b) { //a==b = 0, a>b = -1, a<b = 1
    for (var i = 0; i < 4 && a[i] == b[i]; ++i);
    return i === 4 ? 0 : a[i] > b[i] ? -1 : 1;
  }

  function objDiff(a, b) {
    var d = 0;
    for (var i = 0; i < 4; i++) {
      d += (b[i] === 0 ? 0 : a[i] === 0 ? Infinity : Math.abs(a[i] - b[i]));
    }
    return d;
  }

  function eltMix(a, b, c, i) { // a,b = x, c = catégorie, i = 0:objet, 1:préfixe, 2:suffixe
    var min = a < b ? a : b;
    var max = a < b ? b : a;
    if (c === 0 && i === 0 && min === 1 && max === 3) { // exception casquette+Casque Militaire = masque
      return 4;
    } else {
      return min === max ? min : (max === loc[i + 2][c].length - 1 && max - min < 3) ? max - min === 1 ? max - 2 : max - 1 : max - min === 1 ? max + 1 : max - Math.floor((max - min - 2) / 2);
    }
  }

  function preMix(c) { // c = catégorie objet
    allMix[c] = [
      [],
      [],
      []
    ];
    for (var i = 0; i < 3; i++) {
      var t = loc[i + 2][c].length;
      //    catMix[i] = [];
      for (var j = 0; j < t; j++) {
        allMix[c][i][j] = [];
        for (var k = 0; k < t; k++) {
          allMix[c][i][j][k] = eltMix(j, k, c, i);
        }
      }
    }
    //if (debug) console.debug('BWM - preMix : ', JSON.stringify(allMix));
    return allMix[c];
  }

  function objMix(a, b) { // utilise le tableau catMix
    var v = [];
    for (var i = 0; i < 4; i++) {
      if (a[i] === 0 || b[i] === 0) {
        v[i] = 0;
      } else if (i === 0) {
        var min = a[0] > b[0] ? b[0] : a[0];
        v[0] = min + ((a[1] !== 0 && a[1] === b[1] && min < 17) ? 1 : 0);
      } else {
        v[i] = catMix[i - 1][a[i]][b[i]];
      }
    }
    return v;
  }

  function tabTri(i) { // i : [élément, sens]
    return function (a, b) {
      var v, x, y = i[1] === 0 ? 1 : -1;
      if (i[0] == 5) { // index, tri sur diff
        v = objCmp([objDiff(a, but), a[2], a[3], a[1]], [objDiff(b, but), b[2], b[3], b[1]]);
      } else {
        x = [
          [0, 2, 3, 1],
          [1, 2, 3, 0],
          [2, 3, 1, 0],
          [3, 2, 1, 0]
        ][i[0]];
        v = objCmp([a[x[0]], a[x[1]], a[x[2]], a[x[3]]], [b[x[0]], b[x[1]], b[x[2]], b[x[3]]]);
      }
      return (v === 0) ? 0 : (v == 1) ? y : 0 - y;
    };
  }
  // commandes d'interface
  function show(e, i) {
    U.setP(i, !U.getP(i));
    upTabs();
  }

  function setT(e, i) {
    cat = U.setP('cat', i).toString() + U.getP('leg');
    U.razP('sim');
    U.razP('result');
    U.razP('setZone');
    U.razP('setIndex');
    upTabs();
  }

  function setL(e, i) {
    cat = U.getP('cat').toString() + U.setP('leg', i);
    U.razP('sim');
    U.razP('result');
    U.razP('setZone');
    U.razP('setIndex');
    upTabs();
  }
  // commandes Saisie
  function selectMode(e, i) {
    U.setP('mode', i);
    upTabs();
  }

  function selectTri(e, i) {
    if (U.getP('triCol') === i) {
      U.setP('triOrder', U.getP('triOrder') === 1 ? 0 : 1);
    } else {
      U.setP('triCol', i);
    }
    upTabs();
  }

  function selectSet(e, i) {
    var v = clone(i);
    if (U.getP('setZone') === -1) {
      s.b = v;
    } else if (U.getP('setZone') === -2) {
      s.s[U.getP('setIndex')] = v;
    } else r[U.getP('setIndex')] = v;
    U.setD('LIST', list);
    upTabs();
  }

  function selectMSet(e, i) {
    if (U.getP('setZone') === -1) {
      but[i[0]] = i[1];
    } else if (U.getP('setZone') === -2) {
      s.s[U.getP('setIndex')][i[0]] = i[1];
    } else r[U.getP('setIndex')][i[0]] = i[1];
    U.setD('LIST', list);
    upTabs();
  }

  function selectAdd(e, i) {
    var v = clone(i);
    if (U.getP('setZone') === -2) {
      U.setP('setIndex', U.getP('setIndex') + 1);
      s.s.splice(U.getP('setIndex'), 0, v);
    } else if (U.getP('setZone') >= 0) {
      if (U.getP('setIndex') === 0 || U.getP('setIndex') > 0 && r[U.getP('setIndex') - 1] == -1) {
        U.setP('setIndex', U.getP('setIndex') + 1);
        r.splice(U.getP('setIndex'), 0, v, [0, 0, 0, 0]);
      } else {
        U.setP('setIndex', U.getP('setIndex') + 2);
        r.splice(U.getP('setIndex'), 0, v, [0, 0, 0, 0]);
      }
    }
    U.setD('LIST', list);
    upTabs();
  }

  function selectAll(e, i) {
    for (var j = 0; j < i.length; j++) {
      var v = clone(i[j]);
      if (U.getP('setZone') === -2) {
        U.setP('setIndex', U.getP('setIndex') + 1);
        s.s.splice(U.getP('setIndex'), 0, v);
      } else if (U.getP('setZone') >= 0) {
        if (U.getP('setIndex') === 0 || U.getP('setIndex') > 0 && r[U.getP('setIndex') - 1] == -1) {
          U.setP('setIndex', U.getP('setIndex') + 1);
          r.splice(U.getP('setIndex'), 0, v, [0, 0, 0, 0]);
        } else {
          U.setP('setIndex', U.getP('setIndex') + 2);
          r.splice(U.getP('setIndex'), 0, v, [0, 0, 0, 0]);
        }
      }
    }
    U.setD('LIST', list);
    upTabs();
  }
  // commandes Copie
  function chgArea(e, cmd) {
    var area0 = rootIU.get_area0;
    var area1 = rootIU.get_area1;
    var linesOk = [];
    var linesBad = [];
    area0.value = "";
    if (cmd == 'init') {
      area1.value = exist(copieTmp[cat]) ? copieTmp[cat] : '';
    } else if (cmd == 'clean') {
      area1.value = "";
    } else if (cmd == 'copy') {
      var v = U.getP('setZone') === -1 ? [but] : U.getP('setZone') === -2 ? s.s : r;
      var root = 0;
      var text = '';
      for (var j = 0; j < v.length; j++) {
        if (v[j] == -1) {
          text += '-';
          root = j + 1;
        } else {
          if (U.getP('setZone') >= 0) text += j - root > 0 && (j - root) % 2 === 0 ? '= ' : j - root === 0 ? '' : '+ ';
          if (objCmp(v[j], [0, 0, 0, 0]) !== 0) {
            var genre = loc[2][U.getP('cat')][v[j][1]].slice(-1)[0] === true;
            var grade = {
              0: ['', ''],
              1: ['Bon ', 'Bonne '],
              2: ['Parfait ', 'Parfaite ']
            };
            text += U.getP('leg') === 'L' ? 'Légendaire ' : '';
            text += v[j][0] > 0 ? grade[Math.floor(v[j][0] / 6)][genre ? 1 : 0] : '';
            text += v[j][1] > 0 ? loc[2][U.getP('cat')][v[j][1]][0] + ' ' : '';
            text += v[j][2] > 0 ? loc[3][U.getP('cat')][v[j][2]][genre && exist(loc[3][U.getP('cat')][v[j][2]][1]) ? 1 : 0] + ' ' : '';
            text += v[j][3] > 0 ? loc[4][U.getP('cat')][v[j][3]][exist(loc[4][U.getP('cat')][v[j][3]][1]) ? 1 : 0] + ' ' : '';
            text += v[j][0] > 0 && v[j][0] % 6 > 0 ? '(+' + v[j][0] % 6 + ')' : '';
          }
        }
        text += (j < v.length - 1 ? '\n' : '');
      }
      area1.value += (area1.value !== "" ? '\n' : '') + text;
      area1.focus();
      area1.select();
    }
    copieTmp[cat] = area1.value;
    var v = area1.value.split(/[\r\n]/g);
    var lines = '';
    // analyse objets
    for (var j = 0; j < v.length; j++) {
      var w = new RegExp('^(?:(\\+|=|)(?:[ ]?|$)' + pat + ')$').exec(v[j]);
      if (v[j] === '-') {
        v[j] = ['-', -1];
      } else if (w !== null) {
        w = w.reduce(function (a, b) {
          if (exist(b)) {
            a.push(b);
          }
          return a;
        }, []);
        var op = w[1] !== '' ? w[1].trim() : -1;
        var leg = w[2] !== '' && U.getP('leg') !== 'L' ? -1 : 0;
        var grade = w[3] !== '' ? indexPat[0][w[3].trim()] : 0;
        var type = w[4] !== '' ? indexPat[1][w[4].trim()][0] == U.getP('cat') ? indexPat[1][w[4].trim()] : -1 : [U.getP('cat'), 0];
        var pre = w[5] !== '' ? exist(indexPat[2][U.getP('cat')][w[5].trim()]) ? indexPat[2][U.getP('cat')][w[5].trim()] : -1 : 0;
        var suf = w[6] !== '' ? exist(indexPat[3][U.getP('cat')][w[6].trim()]) ? indexPat[3][U.getP('cat')][w[6].trim()] : -1 : 0;
        var niv = w[7] !== '' ? Number(w[7].replace(new RegExp('[()+]', 'g'), '')) : 0;
        if (leg !== -1 && type !== -1 && pre !== -1 && suf !== -1) {
          v[j] = [op, [grade + niv, type[1], pre, suf]];
        } else {
          v[j] = false;
        }
      } else {
        v[j] = false;
      }
      lines += (j + 1) + (j < v.length - 1 ? '\n' : '');
    }
    area0.value = lines;
    area0.setAttribute('style', 'height:auto');
    area1.setAttribute('style', 'height:auto');
    area0.setAttribute('style', 'height:' + (area1.scrollHeight + area1.offsetHeight - area1.clientHeight + area1.scrollTop + 1) + 'px');
    area1.setAttribute('style', 'height:' + (area1.scrollHeight + area1.offsetHeight - area1.clientHeight + area1.scrollTop + 1) + 'px');
    // analyse du format
    var root = 0;
    for (var j = 0; j < v.length; j++) {
      if (v[j] !== false) {
        if (v[j][0] === '-' && j > 2 && v[j - 1][0] === '=') {
          root = j + 1;
        } else if (v[j][0] === -1 && (j - root === 0 || (root === 0 && j > 0 && v[j - 1][0] === -1))) {} else if (v[j][0] === '+' && ((j - root === 1 && v[j - 1][0] === -1) || (j - root > 1 && v[j - 1][0] === '='))) {} else if (v[j][0] === '=' && j - root > 1 && v[j - 1][0] === '+') {} else {
          v[j] = false;
        }
      }
      if (v[j] === false) linesBad.push(j + 1);
      else linesOk.push(j + 1);
    }
    rootIU.get_td00.textContent = 'Lignes valides : ' + (linesOk.length > 0 ? linesOk.toString() : '-');
    rootIU.get_td10.textContent = 'Lignes invalides : ' + (linesBad.length > 0 ? linesBad.toString() : '-');
    if (v.indexOf(false) == -1 && (v.length == 1 || (v.length > 1 && ((U.getP('setZone') === -2 && v[1][0] == -1) || (U.getP('setZone') >= 0 && v[1][0] == '+'))))) {
      rootIU.get_div220.style.display = 'block';
      if (cmd == 'paste') {
        if (U.getP('setZone') === -1) s.b = v[0][1];
        else {
          if (U.getP('setZone') >= 0) {
            r.push(-1);
            if (v[v.length - 1][0] == '-') v.splice(v.length - 1, 1);
            else if (v[v.length - 1][0] == -1) v.push(['+', [0, 0, 0, 0]], ['=', [0, 0, 0, 0]]);
            else if (v[v.length - 1][0] == '+') v.push(['=', [0, 0, 0, 0]]);
          }
          for (var j = 0; j < v.length; j++) {
            if (U.getP('setZone') === -2) s.s.push(v[j][1]);
            else r.push(v[j][1]);
          }
        }
        U.setD('LIST', list);
        upTabs();
      }
    } else {
      rootIU.get_div220.style.display = 'none';
    }
  }
  // commandes Simulations
  function setS(e, i) {
    U.setP('sim', i);
    U.razP('result');
    U.razP('setZone');
    U.razP('setIndex');
    upTabs();
  }

  function addS(e) {
    U.setP('sim', c.length);
    U.razP('result');
    U.razP('setZone');
    U.razP('setIndex');
    c.push({
      'b': [0, 0, 0, 0],
      'e': [0, 0, [],
        []
      ],
      'o': U.getP('defOpt'),
      'r': [
        [
          [0, 0, 0, 0],
          [0, 0, 0, 0],
          [0, 0, 0, 0]
        ]
      ],
      's': [
        [0, 0, 0, 0]
      ],
      't': 0
    });
    U.setD('LIST', list);
    upTabs();
  }

  function moveS(e, i) {
    if (exist(tasks.s[cat])) {
      var v = tasks.s[cat];
      if (exist(v[U.getP('sim')]) && exist(v[U.getP('sim') + i])) {
        tasks.k[v[U.getP('sim')]] = [cat, U.getP('sim') + i];
        tasks.k[v[U.getP('sim') + i]] = [cat, U.getP('sim')];
        v[U.getP('sim')] = [v[U.getP('sim') + i], v[U.getP('sim') + i] = v[U.getP('sim')]][0]; //swap
      } else if (exist(v[U.getP('sim')])) {
        tasks.k[v[U.getP('sim')]] = [cat, U.getP('sim') + i];
        v[U.getP('sim') + i] = v[U.getP('sim')];
        delete v[U.getP('sim')];
      } else if (exist(v[U.getP('sim') + i])) {
        tasks.k[v[U.getP('sim') + i]] = [cat, U.getP('sim')];
        v[U.getP('sim')] = v[U.getP('sim') + i];
        delete v[U.getP('sim') + i];
      }
    }
    c[U.getP('sim')] = [c[U.getP('sim') + i], c[U.getP('sim') + i] = c[U.getP('sim')]][0]; //swap
    U.setP('sim', U.getP('sim') + i);
    U.setD('LIST', list);
    upTabs();
  }

  function delS(e) {
    if (exist(tasks.s[cat])) {
      if (exist(tasks.s[cat][U.getP('sim')])) cmdSearch(null, [null, 1]);
      for (var j in tasks.s[cat]) {
        if (tasks.s[cat].hasOwnProperty(j)) {
          if (j > U.getP('sim')) {
            tasks.k[tasks.s[cat][j]] = [cat, j - 1];
            tasks.s[cat][j - 1] = tasks.s[cat][j];
            delete tasks.s[cat][j];
          }
        }
      }
    }
    c.splice(U.getP('sim'), 1);
    U.setP('sim', U.getP('sim') < c.length ? U.getP('sim') : c.length - 1);
    U.razP('result');
    U.razP('setZone');
    U.razP('setIndex');
    U.setD('LIST', list);
    upTabs();
  }

  function resetS(e) {
    while (exist(tasks.s[cat])) {
      cmdSearch(null, [tasks.s[cat][Object.keys(tasks.s[cat])[Object.keys(tasks.s[cat]).length - 1]], 1]);
    }
    list[cat] = [];
    U.razP('sim');
    U.razP('result');
    U.razP('setZone');
    U.razP('setIndex');
    U.setD('LIST', list);
    upTabs();
  }
  // commandes Recherche
  function triSel(e, i) {
    s.s.sort(tabTri(i));
    U.setD('LIST', list);
    upTabs();
  }

  function addNewSel(e, i) {
    s.s.splice(i + 1, 0, [0, 0, 0, 0]);
    if (U.getP('setZone') === -2) {
      U.setP('setIndex', i + 1);
    }
    U.setD('LIST', list);
    upTabs();
  }

  function moveSel(e, i) {
    s.s[i[0]] = [s.s[i[1]], s.s[i[1]] = s.s[i[0]]][0]; //swap
    if (U.getP('setZone') === -2) {
      U.setP('setIndex', U.getP('setIndex') === i[0] ? i[1] : U.getP('setIndex') === i[1] ? i[0] : U.getP('setIndex'));
    }
    U.setD('LIST', list);
    upTabs();
  }

  function delSel(e, i) {
    s.s.splice(i, 1);
    if (U.getP('setZone') === -2 && U.getP('setIndex') >= i && U.getP('setIndex') > 0) {
      U.setP('setIndex', U.getP('setIndex') - 1);
    }
    U.setD('LIST', list);
    upTabs();
  }

  function razIndex(e) {
    cmdSearch(null, [null, 1]);
    s.s = [];
    U.setD('LIST', list);
    upTabs();
  }

  function razTarget(e) {
    cmdSearch(null, [null, 1]);
    s.b = [0, 0, 0, 0];
    s.e = [0, 0, [],
      []
    ];
    s.t = 0;
    U.setD('LIST', list);
    upTabs();
  }

  function optSearch(e, i) {
    var v = new RegExp(i[1]).exec(e.target.value);
    if (v !== null) {
      e.target.classList.remove('BWMerror');
      v = v[1] === '' ? '' : Number(v[1]);
      s.o[i[0]] = v;
      U.setD('LIST', list);
    } else {
      e.target.classList.add('BWMerror');
    }
  }

  function optCheck(e, i) {
    s.o[i] = !s.o[i];
    U.setD('LIST', list);
  }

  function getOpt(e) {
    s.o = U.getP('defOpt');
    U.setD('LIST', list);
    upTabs();
  }

  function setOpt(e) {
    U.setP('defOpt', s.o);
  }

  function resetOpt(e) {
    cmdSearch(null, [null, 1]);
    s.o = U.getDefP('defOpt');
    U.setD('LIST', list);
    upTabs();
  }

  function actSearch(e, i) {
    cmdSearch(null, [null, i]);
    if (i > 1) {
      U.setP('result', s.r.length - 1);
      U.setP('setZone', U.getP('result'));
      U.razP('setIndex');
    }
    upTabs();
  }
  // commandes Résultats
  function setR(e, i) {
    U.setP('result', i);
    U.setP('setZone', i);
    U.razP('setIndex');
    upTabs();
  }

  function addR(e) {
    U.setP('result', s.r.length);
    U.setP('setZone', U.getP('result'));
    U.razP('setIndex');
    s.r.push([
      [0, 0, 0, 0],
      [0, 0, 0, 0],
      [0, 0, 0, 0]
    ]);
    U.setD('LIST', list);
    upTabs();
  }

  function moveR(e, i) {
    s.r[U.getP('result')] = [s.r[U.getP('result') + i], s.r[U.getP('result') + i] = s.r[U.getP('result')]][0]; //swap
    U.setP('result', U.getP('result') + i);
    if (U.getP('setZone') >= 0) {
      U.setP('setZone', U.getP('result'));
    }
    U.setD('LIST', list);
    upTabs();
  }

  function delR(e) {
    s.r.splice(U.getP('result'), 1);
    U.setP('result', U.getP('result') + (U.getP('result') > 0 ? -1 : 0));
    if (U.getP('setZone') >= 0) {
      U.setP('setZone', U.getP('result'));
      U.razP('setIndex');
    }
    U.setD('LIST', list);
    upTabs();
  }

  function resetR(e) {
    s.r = [];
    U.razP('result');
    if (U.getP('setZone') >= 0) {
      U.razP('setZone');
      U.razP('setIndex');
    }
    U.setD('LIST', list);
    upTabs();
  }

  function setI(e, i) {
    U.setP('setZone', i[0]);
    U.setP('setIndex', i[1]);
    upTabs();
  }

  function addI(e, i) {
    if (U.getP('setZone') >= 0) {
      U.setP('setIndex', i + 1);
    }
    r.splice(i + 1, 0, [0, 0, 0, 0], [0, 0, 0, 0]);
    U.setD('LIST', list);
    upTabs();
  }

  function moveI(e, i) {
    r[i[0]] = [r[i[1]], r[i[1]] = r[i[0]]][0]; //swap
    if (U.getP('setZone') >= 0) {
      U.setP('setIndex', U.getP('setIndex') == i[0] ? i[1] : U.getP('setIndex') == i[1] ? i[0] : U.getP('setIndex'));
    }
    U.setD('LIST', list);
    upTabs();
  }

  function delI(e, i) {
    var v = U.getP('setIndex');
    if (r[i[0]] == -1) {
      r.splice(i[0], 2, r[i[1]], [0, 0, 0, 0]);
      v = v == i[0] + 1 ? i[0] : v;
    } else if (i[0] == i[1]) { // ==root
      if (exist(r[i[0] + 3]) && r[i[0] + 3] != -1) {
        r.splice(i[0], 3, r[i[0] + 1]);
        v = (v <= i[0] ? v : v > i[0] + 1 ? v - 2 : i[0]);
      } else {
        r.splice(i[0], 2, r[i[0] + 1], [0, 0, 0, 0]);
        v = (v < i[0] || v > i[0] ? v : i[0]);
      }
    } else if (i[0] - 1 == i[1] && (!exist(r[i[0] + 2]) || r[i[0] + 2] == -1)) {
      r.splice(i[0], 2, [0, 0, 0, 0], [0, 0, 0, 0]);
      v = v != i[0] ? v : v - 1;
    } else {
      r.splice(i[0], 2);
      v = v < i[0] ? v : v - 2;
    }
    if (U.getP('setZone') >= 0) {
      U.setP('setIndex', v);
    }
    U.setD('LIST', list);
    upTabs();
  }

  function delB(e, i) {
    var v = U.getP('setIndex');
    var fin = false;
    while (!fin) {
      if (!exist(r[i])) break;
      else if (r[i] == -1) fin = true;
      r.splice(i, 1);
      v = v + (v > i ? -1 : 0);
    }
    if (r[r.length - 1] == -1) {
      r.splice(r.length - 1, 1);
      v = v < i ? v : 1;
    }
    if (r.length === 0) {
      r.push([0, 0, 0, 0], [0, 0, 0, 0], [0, 0, 0, 0]);
      v = 0;
    }
    if (U.getP('setZone') >= 0) {
      U.setP('setIndex', v);
    }
    U.setD('LIST', list);
    upTabs();
  }

  function sepI(e, i) {
    var v = U.getP('setIndex');
    if (!exist(r[i + 1])) {
      r.splice(i + 1, 0, -1, [0, 0, 0, 0], [0, 0, 0, 0], [0, 0, 0, 0]);
    } else if (!exist(r[i + 3]) || (exist(r[i + 3]) && r[i + 3] == -1)) {
      r.splice(i + 1, 2, -1, r[i + 1], [0, 0, 0, 0], [0, 0, 0, 0]);
      v = v + (v > i ? 2 : 0);
    } else {
      r.splice(i + 1, 2, -1, r[i + 1]);
      v = v + (v == i + 1 ? 1 : 0);
    }
    if (U.getP('setZone') >= 0) {
      U.setP('setIndex', v);
    }
    U.setD('LIST', list);
    upTabs();
  }

  function firstI(e, i) {
    var v = U.getP('setIndex');
    r.splice(i[1], i[0] - i[1]);
    if (r.length - i[1] < 2 || (exist(r[i[1] + 1]) && r[i[1] + 1] == -1)) {
      r.splice(i[1] + 1, 0, [0, 0, 0, 0], [0, 0, 0, 0]);
      v = v < i[1] ? v : v < i[0] ? i[1] : v - (i[0] - i[1]) + 2;
    } else v = v < i[1] ? v : v < i[0] ? i[1] : v - (i[0] - i[1]);
    if (U.getP('setZone') >= 0) {
      U.setP('setIndex', v);
    }
    U.setD('LIST', list);
    upTabs();
  }
  // fonctions de recherche
  function cmdSearch(e, i) { // i[0]= key ou null, i[1] = mode (stop 1|stop + res 2|fin 3|res 4)
    var keyA = isGo ? tasks.s[cat][U.getP('sim')] : null;
    var key = i[0] === null ? keyA : i[0];
    if (key !== null) {
      var v = tasks.w[key];
      var x = list[tasks.k[key][0]][tasks.k[key][1]];
      // sauve les résultats
      if (i[1] > 1) {
        for (var j = x.r.length - 1; j >= 0; j--) {
          if (JSON.stringify(x.r[j]) === JSON.stringify([
              [0, 0, 0, 0],
              [0, 0, 0, 0],
              [0, 0, 0, 0]
            ])) {
            x.r.splice(j, 1);
          }
        }
        for (var j = 0; j < v.r.length; j++) {
          x.r.push([]);
          for (var k = 0, y = v.r[j]; k < y.length; k = k + 3) {
            var a = y[k].slice(0, 4),
              b = y[k + 1].slice(0, 4),
              c = y[k + 2].slice(0, 4);
            if (k === 0) x.r[x.r.length - 1].push(a, b, c);
            else if (objCmp(a, y[k - 1].slice(0, 4)) === 0) x.r[x.r.length - 1].push(b, c);
            else if (objCmp(b, y[k - 1].slice(0, 4)) === 0) x.r[x.r.length - 1].push(a, c);
            else x.r[x.r.length - 1].push(-1, a, b, c);
          }
        }
      }
      // supprime le worker
      if (i[1] < 4) {
        v.id.terminate();
        x.e = [i[1], v.r.length, v.d, v.f];
        x.t = Date.now() - key;
        delete tasks.w[key];
        delete tasks.s[tasks.k[key][0]][tasks.k[key][1]];
        if (Object.keys(tasks.s[tasks.k[key][0]]).length === 0) delete tasks.s[tasks.k[key][0]];
        delete tasks.k[key];
      }
      U.setD('LIST', list);
    }
  }

  function upSearch() {
    function upTime(t) {
      var sec = t / 1000,
        d = Math.floor(sec / 86400),
        hh = ('0' + Math.floor(sec / 3600) % 24).slice(-2),
        mm = ('0' + Math.floor(sec / 60) % 60).slice(-2),
        ss = ('0' + Math.floor(sec) % 60).slice(-2);
      return (d > 0 ? d + 'j. ' : '') + hh + ':' + mm + ':' + ss;
    }
    var keyA = isGo ? tasks.s[cat][U.getP('sim')] : null,
      cible = U.getP('shSim') && U.getP('shSchT');
    if (keyA !== null && cible) {
      if (tasks.t === null) tasks.t = window.setInterval(upSearch, 500);
    } else if (tasks.t !== null) {
      window.clearInterval(tasks.t);
      tasks.t = null;
    }
    if (cible) {
      if (keyA === null) {
        rootIU.target_td35.style.display = 'table-cell';
        rootIU.target_td36.style.display = 'none';
        rootIU.target_td37.style.display = 'none';
        rootIU.target_td38.style.display = 'none';
        rootIU.target_td40.textContent = s.e[0] === 0 ? '-' : (s.e[0] == 1 ? 'Annulée' : (s.e[0] == 2 ?
          'Stoppée : ' : 'Terminée : ') + (s.e[0] > 0 ? s.e[1] + ' résultat' + (s.e[1] > 1 ? 's' : '') +
          (s.e[1] > 0 ? ' (écart ' + s.e[2][0] + (s.e[2][1] > s.e[2][0] ? '-' + s.e[2][1] : '') +
            ' en ' + s.e[3][0] / 3 + (s.e[3][1] > s.e[3][0] ? '-' + s.e[3][1] / 3 : '') + ' fusion' + (
              s.e[3][0] > 3 || s.e[3][1] > 3 ? 's' : '') + ')' : '') : ''));
        rootIU.target_td41.textContent = upTime(new Date(s.t).getTime());
      } else {
        var v = tasks.w[keyA];
        rootIU.target_td35.style.display = 'none';
        rootIU.target_td36.style.display = 'table-cell';
        rootIU.target_td37.style.display = 'table-cell';
        rootIU.target_td38.style.display = 'table-cell';
        rootIU.target_td40.textContent = 'En cours ' + v.e + '% : ' + v.r.length + ' résultat' + (v.r.length >
          1 ? 's' : '') + (v.r.length > 0 ? ' (écart ' + v.d[0] + (v.d[1] > v.d[0] ? '-' + v.d[1] : '') +
          ' en ' + v.f[0] / 3 + (v.f[1] > v.f[0] ? '-' + v.f[1] / 3 : '') + ' fusion' + (v.f[0] > 3 || v.f[
            1] > 3 ? 's' : '') + ')' : '');
        rootIU.target_td41.textContent = upTime(new Date(Date.now() - keyA).getTime());
      }
    }
  }
  /********************************************
   * Algo de parcours en profondeur (DFS)
   * data = liste d'objets
   * d = écart entre l'objet v et l'objet but
   * p = poids de l'ensemble
   * diff = meilleur écart trouvé
   * niv = meilleur poids d'ensemble trouvé
   * Version originale
   *********************************************/
  function workDfs(data, tmp, tmpd) {
    var n1 = data.length;
    var n2 = n1 - 2;
    for (var i = 0, a = data[i]; i < n1; a = data[++i]) {
      var nb = data.concat();
      nb.splice(i, 1);
      for (var j = 0, b = nb[j]; j <= n2; b = nb[++j]) {
        if (res === max && !bcout && !becart) {
          return;
        }
        if (tmp[1] === 0) {
          self.postMessage({
            'cmd': 'adv',
            'key': key,
            'e': [n1, n2, i, j]
          });
        }
        if (objCmp(b, a) >= 0 || !becart) {
          var v = objMix(a, b).concat(0);
          var d = objDiff(v, but);
          var p = tmp[1] + a[4] + b[4];
          if (d <= diff) {
            if ((d < diff && becart) || (p < niv && bcout)) {
              if (becart) {
                diff = d;
              }
              if (bcout) {
                niv = p;
              }
              res = 0;
              self.postMessage({
                'cmd': 'new',
                'key': key,
                'diff': d
              });
            }
            if ((((p === niv && bcout) || (!bcout && becart)) && res < max) || (!bcout && !becart)) {
              res++;
              self.postMessage({
                'cmd': 'add',
                'key': key,
                'diff': d,
                'fusion': tmp[0].concat([b, a, v])
              });
            }
          }
          if (d > 0 && d <= (tmpd + delta) && tmp[0].length < fus) {
            nb[j] = v;
            workDfs(nb, [tmp[0].concat([b, a, v]), p], d);
            nb[j] = b;
          }
        }
      }
    }
  }
  /********************************************
   * Elimine les solutions identiques (même ensemble avec même résultat mais permutations différentes).
   *********************************************/
  function postSearch(data) {
    function dataReduce(p, c, i, t) {
      var j = 0,
        k = c.length - 1; //k = 1;//
      while (j < c.length) {
        if (k == j) {
          p.push(data[c[j][0]]);
          j++;
          k = c.length;
        } else if (c[j][1] == c[k][1]) {
          c.splice(k, 1);
        }
        k--;
      }
      return p;
    }
    var tmp = {},
      post = [];
    for (var i = 0; i < data.length; i++) {
      var v = JSON.stringify(data[i][data[i].length - 1]);
      if (!exist(tmp[v])) tmp[v] = [];
      tmp[v].push([i, JSON.stringify(data[i].reduce(function (p, c) {
        if (c[4] !== 0) p.push(c);
        return p;
      }, []).sort(tabTri([0, 0])))]);
    }
    post = Object.keys(tmp).map(function (v) {
      return tmp[v];
    }).reduce(dataReduce, []);
    return post;
  }

  function search() {
    var k = Date.now(),
      datas = [];
    // prépare les données
    for (var i = 0; i < s.s.length; i++) {
      if (objDiff(s.s[i], but) === 0 && !!s.o.oBest) {
        rootIU.target_td40.textContent = "Recherche annulée. Cible présente dans l'index.";
        return;
      } else if (objDiff(s.s[i], but) != Infinity && objCmp(s.s[i], [0, 0, 0, 0]) !== 0) {
        if (s.o.oCoef !== '' && s.o.oCoef > 1) datas.push(s.s[i].concat(Math.pow(s.o.oCoef, s.s[i][0]) * s.o.oFQua + Math.pow(s.o.oCoef, s.s[i][1]) * s.o.oFObj + Math.pow(s.o.oCoef, s.s[i][2]) * s.o.oFPre + Math.pow(s.o.oCoef, s.s[i][3]) * s.o.oFSuf));
        else datas.push(s.s[i].concat(s.s[i][0] * s.o.oFQua + s.s[i][1] * s.o.oFObj + s.s[i][2] * s.o.oFPre + s.s[i][3] * s.o.oFSuf));
      }
    }
    // prépare le worker
    if (!exist(tasks.s[cat])) tasks.s[cat] = {};
    if (exist(tasks.s[cat][U.getP('sim')])) cmdSearch(null, [null, 1]);
    tasks.s[cat][U.getP('sim')] = k;
    tasks.k[k] = [cat, U.getP('sim')];
    tasks.w[k] = {
      'r': [],
      'd': [Infinity, -1],
      'f': [Infinity, 0],
      'e': 0
    };
    tasks.w[k].id = new window.Worker(URL.createObjectURL(new Blob([
      "self.onmessage = function(e){",
      exist.toString(),
      objCmp.toString(),
      objDiff.toString(),
      objMix.toString(),
      tabTri.toString(),
      workDfs.toString(),
      //      workBfs.toString(),
      postSearch.toString(),
      " var d = e.data, key = d.k;",
      " if (d.cmd=='start') {",
      "		var fus = d.o.oMaxfusion === '' ? Infinity : (d.o.oMaxfusion - 1)*3;",
      "		var	becart = !!d.o.oBest;",
      "		var	diff = d.o.oMaxEcart === '' ? Infinity : d.o.oMaxEcart;",
      "		var	max = d.o.oMaxRes === '' ? Infinity : d.o.oMaxRes, res = 0;",
      "		var	bcout = d.o.oCoef !== '' && d.o.oCoef > 0, niv = Infinity;",
      "		var	delta = d.o.oODelta === '' ? Infinity : d.o.oODelta;",
      "		var	catMix = d.m, but = d.b;",
      "   workDfs(d.d, [[], 0], Infinity);",
      //      "   workBfs(d.d);",
      "		self.postMessage({ 'cmd': 'end1', 'key': key });",
      " }",
      "	else if (d.cmd=='post') {",
      "		self.postMessage({ 'cmd': 'end2', 'key': key, 'd': postSearch(d.d) });",
      "	}",
      "};"
    ], {
      'type': 'text/javascript'
    })));
    tasks.w[k].id.onmessage = function (e) {
      var d = e.data,
        w = tasks.w[d.key];
      switch (d.cmd) {
        case 'adv':
          w.e = Math.floor((100 / d.e[0]) * d.e[2] + ((100 / d.e[0]) / (d.e[1] + 1)) * d.e[3]);
          break;
        case 'new':
          w.r = [];
          w.d = [Infinity, -1];
          w.f = [Infinity, 0];
          break;
        case 'add':
          w.r.push(d.fusion);
          w.d[0] = d.diff < w.d[0] ? d.diff : w.d[0];
          w.d[1] = d.diff > w.d[1] ? d.diff : w.d[1];
          w.f[0] = d.fusion.length < w.f[0] ? d.fusion.length : w.f[0];
          w.f[1] = d.fusion.length > w.f[1] ? d.fusion.length : w.f[1];
          break;
        case 'end1':
          if (list[tasks.k[d.key][0]][tasks.k[d.key][1]].o.oPost) {
            w.id.postMessage({
              'cmd': 'post',
              'k': d.key,
              'd': w.r
            });
          } else {
            cmdSearch(null, [d.key, 3]);
            upTabs();
          }
          break;
        case 'end2':
          w.r = d.d;
          cmdSearch(null, [d.key, 3]);
          upTabs();
          break;
      }
    };
    tasks.w[k].id.onerror = function (e) {
      console.debug('Worker error: %o %o', cat, Jsons.encode(e.data));
    };
    tasks.w[k].id.postMessage({
      'cmd': 'start',
      'k': k,
      'd': datas,
      'o': clone(s.o),
      'm': catMix,
      'b': but
    });
    s.e = [0, 0, null, 0];
    s.t = 0;
    upTabs();
  }
  // fonctions de colorisation
  function itemAddClass(node, v) {
    for (var j = 1; j < 5; j++) {
      rootIU[node + '_' + j].classList.add(v);
    }
  }

  function itemDelClass(node, v) {
    for (var j = 1; j < 5; j++) {
      rootIU[node + '_' + j].classList.remove(v);
    }
  }

  function selectSameItem(e, i) {
    for (var j = 0; j < i.length; j++) {
      itemAddClass(i[j], 'selectedItem');
    }
  }

  function unselectSameItem(e, i) {
    for (var j = 0; j < i.length; j++) {
      itemDelClass(i[j], 'selectedItem');
    }
  }
  // création de l'interface
  function upTabs() {
    var link = {};
    var target = [null, null];
    var results = [];
    var root = 0;
    var lroot = null;
    var arm = exist(items[cat]) ? items[cat] : [];
    if (!exist(list[cat]) || (exist(list[cat]) && list[cat].length === 0)) {
      list[cat] = [{
        'b': [0, 0, 0, 0],
        'e': [0, 0, [],
          []
        ],
        'o': U.getP('defOpt'),
        'r': [
          [
            [0, 0, 0, 0],
            [0, 0, 0, 0],
            [0, 0, 0, 0]
          ]
        ],
        's': [
          [0, 0, 0, 0]
        ],
        't': 0
      }];
    } else if (exist(list[cat][U.getP('sim')])) {
      // vérification options de recherche
      var prefOpt = U.getP('defOpt');
      var defOpt = U.getDefP('defOpt');
      var optTmp = exist(list[cat][U.getP('sim')].o) ? clone(list[cat][U.getP('sim')].o) : {};
      if (!Array.isArray(optTmp)) {
        list[cat][U.getP('sim')].o = {};
        for (var i in defOpt) {
          if (defOpt.hasOwnProperty(i)) {
            list[cat][U.getP('sim')].o[i] = exist(optTmp[i]) ? optTmp[i] : exist(prefOpt[i]) ? prefOpt[i] : defOpt[i];
          }
        }
      } else {
        list[cat][U.getP('sim')].o = prefOpt;
      }
      // vérification résultats
      if (list[cat][U.getP('sim')].r.length === 0) {
        list[cat][U.getP('sim')].r = [
          [
            [0, 0, 0, 0],
            [0, 0, 0, 0],
            [0, 0, 0, 0]
          ]
        ];
      }
      // vérification Index
      if (list[cat][U.getP('sim')].s.length === 0) {
        list[cat][U.getP('sim')].s = [
          [0, 0, 0, 0]
        ];
        if (U.getP('setZone') === -2) {
          U.razP('setIndex');
        }
      }
    }
    if (!exist(list[cat][U.getP('sim')])) {
      U.razP('sim');
      U.razP('result');
      U.razP('setZone');
      U.razP('setIndex');
    } else if (!exist(list[cat][U.getP('sim')].r[U.getP('result')])) {
      U.razP('result');
      if (U.getP('setZone') >= 0) {
        U.razP('setZone');
        U.razP('setIndex');
      }
    }
    c = list[cat];
    s = c[U.getP('sim')];
    r = s.r[U.getP('result')];
    but = s.b;
    isGo = exist(tasks.s[cat]) && exist(tasks.s[cat][U.getP('sim')]);
    // pré-calcule si besoin les fusions pour cette catégorie (hors qualité)
    catMix = exist(allMix[U.getP('cat')]) ? allMix[U.getP('cat')] : preMix(U.getP('cat'));
    // reconstruit l'interface
    if (exist(rootIU.root)) {
      rootIU.root.parentNode.removeChild(rootIU.root);
      rootIU = {};
    }
    rootIU.root = DOM.newNode('div', {
      'align': 'center'
    }, [], {}, null);
    if (U.getP('shPos')) {
      bwIU.appendChild(rootIU.root);
    } else {
      bwTop.parentNode.insertBefore(rootIU.root, bwTop.nextSibling);
    }
    window.nd();
    DOM.newNodes([
      ['hr', 'div', {
          'class': 'hr720'
        },
        [], {}, 'root'
      ],
      ['head', 'table', {
          'class': 'BWMtab3'
        },
        [], {}, 'root'
      ],
      ['head_tr', 'tr', {},
        [], {}, 'head'
      ],
      ['head_td0', 'td', {
          'class': 'BWM20 BWMtitle'
        },
        ['Haut/bas ' + (U.getP('shPos') ? '▲' : '▼')], {
          'click': [show, 'shPos']
        }, 'head_tr'
      ],
      ['head_td1', 'td', {
          'class': 'BWM60'
        },
        [], {}, 'head_tr'
      ],
      ['head_span10', 'span', {
          'class': 'BWMtitle ' + (U.getP('shTitle') ? 'enabled' : 'disabled')
        },
        [((typeof (GM_info) === 'object') ? GM_info.script.name : '?') + ' : '],
        {
          'click': [show, 'shTitle']
        }, 'head_td1'
      ],
      ['head_span11', 'span', {
          'class': 'BWMtitle'
        },
        [], {}, 'head_td1'
      ],
      ['head_a110', 'a', {
          'href': 'https://github.com/Ecilam/BloodWarsMix',
          'TARGET': '_blank'
        },
        [((typeof (GM_info) === 'object') ? GM_info.script.version : '?')], {}, 'head_span11'
      ],
      ['head_td2', 'td', {
          'class': 'BWM20'
        },
        [], {}, 'head_tr'
      ],
      ['head_span20', 'span', {
          'class': 'BWMtitle ' + (U.getP('shHelp') ? 'enabled' : 'disabled')
        },
        ['Aide '], {
          'click': [show, 'shHelp']
        }, 'head_td2'
      ],
      ['head_span21', 'span', {},
        [' - '], {}, 'head_td2'
      ],
      ['head_span22', 'span', {
          'class': 'BWMtitle'
        },
        [], {}, 'head_td2'
      ],
      ['head_a210', 'a',
        {
          'href': 'https://forum.fr.bloodwars.net/index.php?page=Thread&threadID=235942',
          'TARGET': '_blank'
        },
        ['Sujet'], {}, 'head_span22'
      ],
      ['box', 'div', {
          'class': 'BWMbox',
          'style': 'display:' + (U.getP('shTitle') ? 'block;' : 'none;')
        },
        [], {}, 'root'
      ],
      ['main', 'table', {
          'class': 'BWMtab0'
        },
        [], {}, 'box'
      ],
      ['main_colgrp', 'colgroup', {},
        [], {}, 'main'
      ],
      ['main_col0', 'col', {
          'class': 'BWM40'
        },
        [], {}, 'main_colgrp'
      ],
      ['main_col1', 'col', {
          'class': 'BWM60'
        },
        [], {}, 'main_colgrp'
      ],
      ['main_tr0', 'tr', {},
        [], {}, 'main'
      ],
      ['main_td0', 'td', {
          'colspan': '2'
        },
        [], {}, 'main_tr0'
      ],
      // Catégorie et Légendaire
      ['cat', 'table', {
          'class': 'BWMtab1'
        },
        [], {}, 'main_td0'
      ],
      ['cat_tr0', 'tr', {
          'class': 'tblheader'
        },
        [], {}, 'cat'
      ],
      ['cat_th0', 'th', {},
        [], {}, 'cat_tr0'
      ],
      ['cat_span0', 'span', {},
        ['Catégories - Légendaire : '], {}, 'cat_th0'
      ],
      ['cat_span1', 'span', {
          'class': 'BWMselect' + (U.getP('leg') === '' ? ' disabled' : '')
        },
        ['non'], {
          'click': [setL, '']
        }, 'cat_th0'
      ],
      ['cat_span2', 'span', {},
        [', '], {}, 'cat_th0'
      ],
      ['cat_span3', 'span', {
          'class': 'BWMselect' + (U.getP('leg') === 'L' ? ' disabled' : '')
        },
        ['oui'], {
          'click': [setL, 'L']
        }, 'cat_th0'
      ],
      ['cat_tr1', 'tr', {},
        [], {}, 'cat'
      ],
      ['cat_td0', 'td', {},
        [], {}, 'cat_tr1'
      ],
      ['main_tr1', 'tr', {},
        [], {}, 'main'
      ],
      ['main_td10', 'td', {},
        [], {}, 'main_tr1'
      ],
      // saisie
      ['get', 'table', {
          'class': 'BWMtab1'
        },
        [], {}, 'main_td10'
      ],
      ['get_colgrp', 'colgroup', {},
        [], {}, 'get'
      ],
      ['get_col0', 'col', {
          'class': 'BWM10'
        },
        [], {}, 'get_colgrp'
      ],
      ['get_col1', 'col', {
          'class': 'BWM25'
        },
        [], {}, 'get_colgrp'
      ],
      ['get_col2', 'col', {
          'class': 'BWM25'
        },
        [], {}, 'get_colgrp'
      ],
      ['get_col3', 'col', {
          'class': 'BWM30'
        },
        [], {}, 'get_colgrp'
      ],
      ['get_col4', 'col', {
          'class': 'BWM10'
        },
        [], {}, 'get_colgrp'
      ],
      ['main_td11', 'td', {},
        [], {}, 'main_tr1'
      ],
      // simulations
      ['sim', 'table', {
          'class': 'BWMtab1'
        },
        [], {}, 'main_td11'
      ],
      ['sim_colgrp', 'colgroup', {},
        [], {}, 'sim'
      ],
      ['sim_col0', 'col', {
          'class': 'BWM7'
        },
        [], {}, 'sim_colgrp'
      ],
      ['sim_col1', 'col', {
          'class': 'BWM8'
        },
        [], {}, 'sim_colgrp'
      ],
      ['sim_col2', 'col', {
          'class': 'BWM20'
        },
        [], {}, 'sim_colgrp'
      ],
      ['sim_col3', 'col', {
          'class': 'BWM20'
        },
        [], {}, 'sim_colgrp'
      ],
      ['sim_col4', 'col', {
          'class': 'BWM20'
        },
        [], {}, 'sim_colgrp'
      ],
      ['sim_col5', 'col', {
          'class': 'BWM5'
        },
        [], {}, 'sim_colgrp'
      ],
      ['sim_col6', 'col', {
          'class': 'BWM5'
        },
        [], {}, 'sim_colgrp'
      ],
      ['sim_col7', 'col', {
          'class': 'BWM5'
        },
        [], {}, 'sim_colgrp'
      ],
      ['sim_col8', 'col', {
          'class': 'BWM5'
        },
        [], {}, 'sim_colgrp'
      ],
      ['sim_col9', 'col', {
          'class': 'BWM5'
        },
        [], {}, 'sim_colgrp'
      ],
      ['sim_tr0', 'tr', {
          'class': 'tblheader'
        },
        [], {}, 'sim'
      ],
      ['sim_th0', 'th',
        {
          'colspan': '2',
          'class': 'BWMselect ' + (U.getP('shSim') ? 'enabled' : 'BWMcutth disabled')
        },
        ['[' + (U.getP('shSim') ? '-' : '+') + ']'], {
          'click': [show, 'shSim']
        }, 'sim_tr0'
      ],
      ['sim_th1', 'th', {
          'colspan': '3',
          'class': (U.getP('shSim') ? '' : 'BWMcutth')
        },
        [], {}, 'sim_tr0'
      ],
      ['sim_span0', 'span', {},
        ['Simulations : '], {}, 'sim_th1'
      ],
      ['sim_th2', 'th', {
          'class': 'BWMselect heal'
        },
        ['+'], {
          'click': [addS]
        }, 'sim_tr0'
      ],
      (U.getP('sim') > 0 ? ['sim_th3', 'th', {
          'class': 'BWMselect'
        },
        ['◄'], {
          'click': [moveS, -1]
        }, 'sim_tr0'
      ] : ['sim_th3a', 'th', {},
        [], {}, 'sim_tr0'
      ]),
      (U.getP('sim') < c.length - 1 ? ['sim_th4', 'th', {
          'class': 'BWMselect'
        },
        ['►'], {
          'click': [moveS, +1]
        }, 'sim_tr0'
      ] : ['sim_th4a', 'th', {},
        [], {}, 'sim_tr0'
      ]),
      ['sim_th5', 'th', {
          'class': 'BWMselect atkHit'
        },
        ['X'], {
          'click': [delS]
        }, 'sim_tr0'
      ],
      ['sim_th6', 'th', {
          'class': 'BWMselect atkHit'
        },
        ['R'], {
          'click': [resetS]
        }, 'sim_tr0'
      ]
    ], rootIU);
    // Catégorie
    for (var j = 0; j < loc[0].length; j++) {
      if (exist(tasks.s[j])) {
        rootIU.cat_span1.classList.add('BWMblink');
      }
      if (exist(tasks.s[j + 'L'])) {
        rootIU.cat_span3.classList.add('BWMblink');
      }
      if (j !== 0) {
        DOM.newNodes([
          ['cat_span0a' + j, 'span', {},
            [', '], {}, 'cat_td0'
          ]
        ], rootIU);
      }
      DOM.newNodes([
        ['cat_span0b' + j + U.getP('leg'), 'span',
          {
            'class': 'BWMselect' + (j === U.getP('cat') ? ' disabled' :
              '') + (exist(tasks.s[j + U.getP('leg')]) ? ' BWMblink' : '')
          },
          [loc[0][j]], {
            'click': [setT, j]
          }, 'cat_td0'
        ]
      ], rootIU);
    }
    // simulations
    for (var j = 0; j < c.length; j++) {
      if (j !== 0) {
        DOM.newNodes([
          ['sim_span1a' + j, 'span', {},
            [', '], {}, 'sim_th1'
          ]
        ], rootIU);
      }
      DOM.newNodes([
        ['sim_span1b' + j, 'span',
          {
            'class': 'BWMselect' + (j == U.getP('sim') ? ' disabled' : '') + (exist(
              tasks.s[cat]) && exist(tasks.s[cat][j]) ? ' BWMblink' : '')
          },
          [j], {
            'click': [setS, j]
          }, 'sim_th1'
        ]
      ], rootIU);
    }
    // affiche les recherches terminées
    for (var i in list) {
      if (list.hasOwnProperty(i)) {
        for (var j in list[i]) {
          if (list[i].hasOwnProperty(j) && list[i][j].e[0] === 3) {
            if (i.indexOf('L') === -1) {
              rootIU.cat_span1.textContent += '*';
            } else {
              rootIU.cat_span3.textContent += '*';
            }
            if ((i.indexOf('L') !== -1) === (U.getP('leg') === 'L')) {
              rootIU['cat_span0b' + i].textContent += '*';
              if (i === cat) {
                rootIU['sim_span1b' + j].textContent += '*';
              }
            }
          }
        }
      }
    }
    if (U.getP('shSim')) {
      // bloc Recherche - Index
      DOM.newNodes([
        ['idx_tr1', 'tr', {
            'class': 'tblheader'
          },
          [], {}, 'sim'
        ],
        ['idx_th10', 'th',
          {
            'colspan': '2',
            'class': 'BWMselect ' + (U.getP('shSchI') ? 'enabled' : 'disabled')
          },
          ['[' + (U.getP('shSchI') ? '-' : '+') + ']'], {
            'click': [show, 'shSchI']
          }, 'idx_tr1'
        ],
        ['idx_th11', 'th', {
            'colspan': '3'
          },
          ['Recherche - Index (' + s.s.length + ')'], {}, 'idx_tr1'
        ],
        ['idx_th12', 'th', {
            'colspan': '4'
          },
          [], {}, 'idx_tr1'
        ],
        ['idx_th13', 'th', {
            'class': 'BWMselect atkHit'
          },
          ['R'], {
            'click': [razIndex]
          }, 'idx_tr1'
        ]
      ], rootIU);
      if (U.getP('shSchI')) {
        DOM.newNodes([
          ['idx_tr2', 'tr', {
              'class': 'BWMTR2'
            },
            [], {}, 'sim'
          ],
          ['idx_td20', 'th', {},
            [], {}, 'idx_tr2'
          ],
          ['idx_td21', 'th', {},
            [], {}, 'idx_tr2'
          ],
          ['idx_span21a', 'span', {},
            [], {}, 'idx_td21'
          ],
          ['idx_td22', 'th', {},
            [], {}, 'idx_tr2'
          ],
          ['idx_span22a', 'span', {},
            ['Objet'], {}, 'idx_td22'
          ],
          ['idx_td23', 'th', {},
            [], {}, 'idx_tr2'
          ],
          ['idx_span23a', 'span', {},
            ['Préfixe'], {}, 'idx_td23'
          ],
          ['idx_td24', 'th', {},
            [], {}, 'idx_tr2'
          ],
          ['idx_span24a', 'span', {},
            ['Suffixe'], {}, 'idx_td24'
          ],
          ['idx_td25a', 'th', {
              'colspan': '5'
            },
            ['Actions'], {}, 'idx_tr2'
          ]
        ], rootIU);
        if (!isGo) {
          DOM.newNodes([
            ['idx_span20b', 'span', {
                'class': 'BWMselect'
              },
              ['▼'], {
                'click': [triSel, [5, 0]]
              }, 'idx_td20'
            ],
            ['idx_span20c', 'span', {
                'class': 'BWMselect'
              },
              ['▲'], {
                'click': [triSel, [5, 1]]
              }, 'idx_td20'
            ],
            ['idx_span21b', 'span', {
                'class': 'BWMselect'
              },
              ['▼'], {
                'click': [triSel, [0, 0]]
              }, 'idx_td21'
            ],
            ['idx_span21c', 'span', {
                'class': 'BWMselect'
              },
              ['▲'], {
                'click': [triSel, [0, 1]]
              }, 'idx_td21'
            ],
            ['idx_span22b', 'span', {
                'class': 'BWMselect'
              },
              ['▼'], {
                'click': [triSel, [1, 0]]
              }, 'idx_td22'
            ],
            ['idx_span22c', 'span', {
                'class': 'BWMselect'
              },
              ['▲'], {
                'click': [triSel, [1, 1]]
              }, 'idx_td22'
            ],
            ['idx_span23b', 'span', {
                'class': 'BWMselect'
              },
              ['▼'], {
                'click': [triSel, [2, 0]]
              }, 'idx_td23'
            ],
            ['idx_span23c', 'span', {
                'class': 'BWMselect'
              },
              ['▲'], {
                'click': [triSel, [2, 1]]
              }, 'idx_td23'
            ],
            ['idx_span24b', 'span', {
                'class': 'BWMselect'
              },
              ['▼'], {
                'click': [triSel, [3, 0]]
              }, 'idx_td24'
            ],
            ['idx_span24c', 'span', {
                'class': 'BWMselect'
              },
              ['▲'], {
                'click': [triSel, [3, 1]]
              }, 'idx_td24'
            ]
          ], rootIU);
        }
        for (var j = 0; j < s.s.length; j++) {
          var v = Jsons.encode(s.s[j]);
          if (!exist(link[v])) link[v] = {};
          if (!exist(link[v].sel)) link[v].sel = [];
          link[v].sel.push('idx_td3' + j);
          if (U.getP('setZone') === -2 && U.getP('setIndex') === j) {
            target = [v, link[v].sel.length - 1];
          }
          v = objDiff(s.s[j], but);
          DOM.newNodes([
            ['idx_tr3' + j, 'tr', {
                'class': 'BWMTR2' + (j % 2 === 0 ? '' : ' BWMeven')
              },
              [], {}, 'sim'
            ],
            ['idx_td3' + j + '_0', 'td', {
                'class': 'BWMcut'
              },
              [v == Infinity ? '∞' : v], {
                'click': [setI, [-2, j]]
              }, 'idx_tr3' + j
            ],
            ['idx_td3' + j + '_1', 'td', {
                'class': 'BWMcut'
              },
              [loc[1][s.s[j][0]][0]], {
                'click': [setI, [-2, j]]
              }, 'idx_tr3' + j
            ],
            ['idx_td3' + j + '_2', 'td', {
                'class': 'BWMcut'
              },
              [(s.s[j][1] > 0 ? s.s[j][1] + ':' : '') + loc[2][U.getP('cat')][s.s[j][1]][0]], {
                'click': [setI, [-2, j]]
              }, 'idx_tr3' + j
            ],
            ['idx_td3' + j + '_3', 'td', {
                'class': 'BWMcut'
              },
              [(s.s[j][2] > 0 ? s.s[j][2] + ':' : '') + loc[3][U.getP('cat')][s.s[j][2]][loc[2][U.getP('cat')][s.s[j][1]].slice(-1)[0] === true && exist(loc[3][U.getP('cat')][s.s[j][2]][1]) ? 1 : 0]], {
                'click': [setI, [-2, j]]
              }, 'idx_tr3' + j
            ],
            ['idx_td3' + j + '_4', 'td', {
                'class': 'BWMcut'
              },
              [(s.s[j][3] > 0 ? s.s[j][3] + ':' : '') + loc[4][U.getP('cat')][s.s[j][3]][0]], {
                'click': [setI, [-2, j]]
              }, 'idx_tr3' + j
            ]
          ], rootIU);
          if (isGo) {
            DOM.newNodes([
              ['idx_td3' + j + '_5', 'td', {
                  'colspan': '5'
                },
                [], {}, 'idx_tr3' + j
              ]
            ], rootIU);
          } else {
            DOM.newNodes([
              ['idx_td3' + j + '_5', 'td', {
                  'class': 'BWMselect heal'
                },
                ['+'], {
                  'click': [addNewSel, j]
                }, 'idx_tr3' + j
              ],
              (j < s.s.length - 1 ? ['idx_td3' + j + '_6', 'td', {
                  'class': 'BWMselect'
                },
                ['▼'], {
                  'click': [moveSel, [j, j + 1]]
                }, 'idx_tr3' + j
              ] : ['idx_td3' + j + '_6', 'td', {
                  'class': 'BWMselect'
                },
                [], {}, 'idx_tr3' + j
              ]),
              (j > 0 ? ['idx_td3' + j + '_7', 'td', {
                  'class': 'BWMselect'
                },
                ['▲'], {
                  'click': [moveSel, [j, j - 1]]
                }, 'idx_tr3' + j
              ] : ['idx_td3' + j + '_7', 'td', {
                  'class': 'BWMselect'
                },
                [], {}, 'idx_tr3' + j
              ]),
              ['idx_td3' + j + '_8', 'td', {
                  'colspan': '2',
                  'class': 'BWMselect atkHit'
                },
                ['X'], {
                  'click': [delSel, j]
                }, 'idx_tr3' + j
              ]
            ], rootIU);
          }
        }
      }
      if (!!window.Worker) {
        // bloc Options
        DOM.newNodes([
          ['opt_tr1', 'tr', {
              'class': 'tblheader'
            },
            [], {}, 'sim'
          ],
          ['opt_th10', 'th',
            {
              'colspan': '2',
              'class': 'BWMselect ' + (U.getP('shSchO') ? 'enabled' : 'disabled')
            },
            ['[' + (U.getP('shSchO') ? '-' : '+') + ']'], {
              'click': [show, 'shSchO']
            }, 'opt_tr1'
          ],
          ['opt_th11', 'th', {
              'colspan': '3'
            },
            ['Recherche - Options'], {}, 'opt_tr1'
          ],
          ['opt_th12', 'th', {
              'colspan': '5'
            },
            ['Actions'], {}, 'opt_tr1'
          ]
        ], rootIU);
        if (U.getP('shSchO')) {
          DOM.newNodes([
            ['opt_tr2', 'tr', {
                'class': 'BWMTR2'
              },
              [], {}, 'sim'
            ],
            ['opt_td20', 'td', {
                'colspan': '5'
              },
              [], {}, 'opt_tr2'
            ],
            ['opt2', 'table', {
                'class': 'BWMtab2'
              },
              [], {}, 'opt_td20'
            ],
            ['opt2_tr0', 'tr', {},
              [], {}, 'opt2'
            ],
            ['opt2_td00', 'td', {},
              ['Max : '], {}, 'opt2_tr0'
            ],
            ['opt2_td01', 'td', {},
              ['Fusions'], {}, 'opt2_tr0'
            ],
            ['opt2_td02', 'td', {},
              [], {}, 'opt2_tr0'
            ],
            ['opt2_td03', 'td', {},
              ['Ecart'], {}, 'opt2_tr0'
            ],
            ['opt2_td04', 'td', {},
              [], {}, 'opt2_tr0'
            ],
            ['opt2_td05', 'td', {},
              ['Résultats'], {}, 'opt2_tr0'
            ],
            ['opt2_td06', 'td', {},
              [], {}, 'opt2_tr0'
            ],
            ['opt2_tr1', 'tr', {},
              [], {}, 'opt2'
            ],
            ['opt2_td10', 'td', {},
              ['Filtres :'], {}, 'opt2_tr1'
            ],
            ['opt2_td11', 'td', {
                'class': 'atkHit'
              },
              ['Coef.'], {}, 'opt2_tr1'
            ],
            ['opt2_td12', 'td', {},
              [], {}, 'opt2_tr1'
            ],
            ['opt2_td13', 'td', {
                'class': 'atkHit'
              },
              ['Ecart'], {}, 'opt2_tr1'
            ],
            ['opt2_td14', 'td', {},
              [], {}, 'opt2_tr1'
            ],
            ['opt2_td15', 'td', {},
              ['Doublons'], {}, 'opt2_tr1'
            ],
            ['opt2_td16', 'td', {},
              [], {}, 'opt2_tr1'
            ],
            ['opt2_tr2', 'tr', {},
              [], {}, 'opt2'
            ],
            ['opt2_td20', 'td', {},
              ['Facteurs : '], {}, 'opt2_tr2'
            ],
            ['opt2_td21', 'td', {},
              [], {}, 'opt2_tr2'
            ],
            ['opt2_td22', 'td', {},
              [], {}, 'opt2_tr2'
            ],
            ['opt2_td23', 'td', {},
              [], {}, 'opt2_tr2'
            ],
            ['opt2_td24', 'td', {},
              [], {}, 'opt2_tr2'
            ],
            ['opt2_tr3', 'tr', {},
              [], {}, 'opt2'
            ],
            ['opt2_td30', 'td', {},
              ['Opti : '], {}, 'opt2_tr3'
            ],
            ['opt2_td31', 'td', {
                'class': 'atkHit'
              },
              ['Delta'], {}, 'opt2_tr3'
            ],
            ['opt2_td32', 'td', {},
              [], {}, 'opt2_tr3'
            ]
          ], rootIU);
          if (isGo) {
            DOM.newNodes([
              ['opt2_mfusion', 'input', {
                  'class': 'inputbox BWMinput',
                  'type': 'text',
                  'disabled': true,
                  'value': s.o.oMaxfusion
                },
                [], {}, 'opt2_td02'
              ],
              ['opt2_mecart', 'input', {
                  'class': 'inputbox BWMinput',
                  'type': 'text',
                  'disabled': true,
                  'value': s.o.oMaxEcart
                },
                [], {}, 'opt2_td04'
              ],
              ['opt2_mres', 'input', {
                  'class': 'inputbox BWMinput',
                  'type': 'text',
                  'disabled': true,
                  'value': s.o.oMaxRes
                },
                [], {}, 'opt2_td06'
              ],
              ['opt2_fcout', 'input', {
                  'class': 'inputbox BWMinput',
                  'type': 'text',
                  'disabled': true,
                  'value': s.o.oCoef
                },
                [], {}, 'opt2_td12'
              ],
              ['opt2_fecart', 'input', {
                  'class': 'BWMinput',
                  'type': 'checkbox',
                  'disabled': true,
                  'checked': !!s.o.oBest
                },
                [], {}, 'opt2_td14'
              ],
              ['opt2_fpost', 'input', {
                  'class': 'BWMinput',
                  'type': 'checkbox',
                  'disabled': true,
                  'checked': !!s.o.oPost
                },
                [], {}, 'opt2_td16'
              ],
              ['opt2_fqua', 'input', {
                  'class': 'inputbox BWMinput',
                  'type': 'text',
                  'disabled': true,
                  'value': s.o.oFQua
                },
                [], {}, 'opt2_td21'
              ],
              ['opt2_fobj', 'input', {
                  'class': 'inputbox BWMinput',
                  'type': 'text',
                  'disabled': true,
                  'value': s.o.oFObj
                },
                [], {}, 'opt2_td22'
              ],
              ['opt2_fpre', 'input', {
                  'class': 'inputbox BWMinput',
                  'type': 'text',
                  'disabled': true,
                  'value': s.o.oFPre
                },
                [], {}, 'opt2_td23'
              ],
              ['opt2_fsuf', 'input', {
                  'class': 'inputbox BWMinput',
                  'type': 'text',
                  'disabled': true,
                  'value': s.o.oFSuf
                },
                [], {}, 'opt2_td24'
              ],
              ['opt2_delta', 'input', {
                  'class': 'inputbox BWMinput',
                  'type': 'text',
                  'disabled': true,
                  'value': s.o.oODelta
                },
                [], {}, 'opt2_td32'
              ],
              ['opt_td21a', 'td', {
                  'colspan': '2'
                },
                [], {}, 'opt_tr2'
              ]
            ], rootIU);
          } else {
            DOM.newNodes([
              ['opt2_mres', 'input', {
                  'class': 'inputbox BWMinput',
                  'type': 'text',
                  'value': s.o.oMaxfusion,
                  'onfocus': "this.select();"
                },
                [], {
                  'change': [optSearch, ['oMaxfusion', '^(|[0-9]+)$']],
                  'keyup': [optSearch, ['oMaxfusion', '^(|[0-9]+)$']]
                }, 'opt2_td02'
              ],
              ['opt2_mecart', 'input', {
                  'class': 'inputbox BWMinput',
                  'type': 'text',
                  'value': s.o.oMaxEcart,
                  'onfocus': "this.select();"
                },
                [], {
                  'change': [optSearch, ['oMaxEcart', '^(|[0-9]+)$']],
                  'keyup': [optSearch, ['oMaxEcart', '^(|[0-9]+)$']]
                }, 'opt2_td04'
              ],
              ['opt2_mfusion', 'input', {
                  'class': 'inputbox BWMinput',
                  'type': 'text',
                  'value': s.o.oMaxRes,
                  'onfocus': "this.select();"
                },
                [], {
                  'change': [optSearch, ['oMaxRes', '^(|[0-9]+)$']],
                  'keyup': [optSearch, ['oMaxRes', '^(|[0-9]+)$']]
                }, 'opt2_td06'
              ],
              ['opt2_fcout', 'input', {
                  'class': 'inputbox BWMinput',
                  'type': 'text',
                  'value': s.o.oCoef,
                  'onfocus': "this.select();"
                },
                [], {
                  'change': [optSearch, ['oCoef', '^(|[0-9]+)$']],
                  'keyup': [optSearch, ['oCoef', '^(|[0-9]+)$']]
                }, 'opt2_td12'
              ],
              ['opt2_fecart', 'input', {
                  'class': 'BWMinput',
                  'type': 'checkbox',
                  'checked': !!s.o.oBest
                },
                [], {
                  'change': [optCheck, 'oBest']
                }, 'opt2_td14'
              ],
              ['opt2_fpost', 'input', {
                  'class': 'BWMinput',
                  'type': 'checkbox',
                  'checked': !!s.o.oPost
                },
                [], {
                  'change': [optCheck, 'oPost']
                }, 'opt2_td16'
              ],
              ['opt2_fqua', 'input', {
                  'class': 'inputbox BWMinput',
                  'type': 'text',
                  'value': s.o.oFQua,
                  'onfocus': "this.select();"
                },
                [], {
                  'change': [optSearch, ['oFQua', '^([1-9][0-9]*)$']],
                  'keyup': [optSearch, ['oFQua', '^([1-9][0-9]*)$']]
                }, 'opt2_td21'
              ],
              ['opt2_fobj', 'input', {
                  'class': 'inputbox BWMinput',
                  'type': 'text',
                  'value': s.o.oFObj,
                  'onfocus': "this.select();"
                },
                [], {
                  'change': [optSearch, ['oFObj', '^([1-9][0-9]*)$']],
                  'keyup': [optSearch, ['oFObj', '^([1-9][0-9]*)$']]
                }, 'opt2_td22'
              ],
              ['opt2_fpre', 'input', {
                  'class': 'inputbox BWMinput',
                  'type': 'text',
                  'value': s.o.oFPre,
                  'onfocus': "this.select();"
                },
                [], {
                  'change': [optSearch, ['oFPre', '^([1-9][0-9]*)$']],
                  'keyup': [optSearch, ['oFPre', '^([1-9][0-9]*)$']]
                }, 'opt2_td23'
              ],
              ['opt2_fsuf', 'input', {
                  'class': 'inputbox BWMinput',
                  'type': 'text',
                  'value': s.o.oFSuf,
                  'onfocus': "this.select();"
                },
                [], {
                  'change': [optSearch, ['oFSuf', '^([1-9][0-9]*)$']],
                  'keyup': [optSearch, ['oFSuf', '^([1-9][0-9]*)$']]
                }, 'opt2_td24'
              ],
              ['opt2_delta', 'input', {
                  'class': 'inputbox BWMinput',
                  'type': 'text',
                  'value': s.o.oODelta,
                  'onfocus': "this.select();"
                },
                [], {
                  'change': [optSearch, ['oODelta', '^(|[+-]?[0-9]+)$']],
                  'keyup': [optSearch, ['oODelta', '^(|[+-]?[0-9]+)$']]
                }, 'opt2_td32'
              ],
              ['opt_td21', 'td', {
                  'colspan': '2',
                  'class': 'BWMselect heal'
                },
                ['▲'], {
                  'click': [getOpt]
                }, 'opt_tr2'
              ]
            ], rootIU);
          }
          DOM.newNodes([
            ['opt_td22', 'td', {
                'colspan': '2',
                'class': 'BWMselect atkHit'
              },
              ['▼'], {
                'click': [setOpt]
              }, 'opt_tr2'
            ],
            ['opt_td23', 'td', {
                'class': 'BWMselect atkHit'
              },
              ['R'], {
                'click': [resetOpt]
              }, 'opt_tr2'
            ],
          ], rootIU);
        }
        // bloc Cible
        DOM.newNodes([
          ['target_tr1', 'tr', {
              'class': 'tblheader'
            },
            [], {}, 'sim'
          ],
          ['target_th10', 'th',
            {
              'colspan': '2',
              'class': 'BWMselect ' + (U.getP('shSchT') ? 'enabled' : 'disabled')
            },
            ['[' + (U.getP('shSchT') ? '-' : '+') + ']'], {
              'click': [show, 'shSchT']
            }, 'target_tr1'
          ],
          ['target_th11', 'th', {
              'colspan': '3'
            },
            ['Recherche - Cible'], {}, 'target_tr1'
          ],
          ['target_th12', 'th', {
              'colspan': '4'
            },
            [], {}, 'target_tr1'
          ],
          ['target_th13', 'th', {
              'class': 'BWMselect atkHit'
            },
            ['R'], {
              'click': [razTarget]
            }, 'target_tr1'
          ]
        ], rootIU);
        if (U.getP('shSchT')) {
          var v = Jsons.encode(but);
          if (!exist(link[v])) link[v] = {};
          link[v].but = ['target_td3'];
          if (U.getP('setZone') === -1) {
            target = [v, 0];
          }
          DOM.newNodes([
            ['target_tr2', 'tr', {
                'class': 'BWMTR2'
              },
              [], {}, 'sim'
            ],
            ['target_td20', 'th', {
                'colspan': '2'
              },
              [], {}, 'target_tr2'
            ],
            ['target_td21', 'th', {},
              ['Objet'], {}, 'target_tr2'
            ],
            ['target_td22', 'th', {},
              ['Préfixe'], {}, 'target_tr2'
            ],
            ['target_td23', 'th', {},
              ['Suffixe'], {}, 'target_tr2'
            ],
            ['target_td24', 'th', {
                'colspan': '5'
              },
              ['Actions'], {}, 'target_tr2'
            ],
            ['target_tr3', 'tr', {
                'class': 'BWMTR2'
              },
              [], {}, 'sim'
            ],
            ['target_td3_0', 'td', {
                'class': 'BWMcut'
              },
              [], {
                'click': [setI, [-1, 0]]
              }, 'target_tr3'
            ],
            ['target_td3_1', 'td', {
                'class': 'BWMcut'
              },
              [loc[1][but[0]][0]], {
                'click': [setI, [-1, 0]]
              }, 'target_tr3'
            ],
            ['target_td3_2', 'td', {
                'class': 'BWMcut'
              },
              [(but[1] > 0 ? but[1] + ':' : '') + loc[2][U.getP('cat')][but[1]][0]],
              {
                'click': [setI, [-1, 0]]
              }, 'target_tr3'
            ],
            ['target_td3_3', 'td', {
                'class': 'BWMcut'
              },
              [(but[2] > 0 ? but[2] + ':' : '') +
                loc[3][U.getP('cat')][but[2]][loc[2][U.getP('cat')][but[1]].slice(-1)[0] === true &&
                  exist(loc[3][U.getP('cat')][but[2]][1]) ? 1 : 0
                ]
              ], {
                'click': [setI, [-1, 0]]
              },
              'target_tr3'
            ],
            ['target_td3_4', 'td', {
                'class': 'BWMcut'
              },
              [(but[3] > 0 ? but[3] + ':' : '') + loc[4][U.getP('cat')][but[3]][0]],
              {
                'click': [setI, [-1, 0]]
              }, 'target_tr3'
            ],
            ['target_td35', 'td',
              {
                'colspan': '5',
                'class': (s.s.length < 2 ? 'atkHit' :
                  'BWMselect heal')
              },
              ['►►'], (s.s.length < 2 ? {} : {
                'click': [search]
              }), 'target_tr3'
            ],
            ['target_td36', 'td', {
                'colspan': '1',
                'class': 'BWMselect atkHit'
              },
              ['X'], {
                'click': [actSearch, 1]
              }, 'target_tr3'
            ],
            ['target_td37', 'td', {
                'colspan': '2',
                'class': 'BWMselect atkHit'
              },
              ['X▼'], {
                'click': [actSearch, 2]
              }, 'target_tr3'
            ],
            ['target_td38', 'td', {
                'colspan': '2',
                'class': 'BWMselect'
              },
              ['▼'], {
                'click': [actSearch, 4]
              }, 'target_tr3'
            ],
            ['target_tr4', 'tr', {
                'class': 'BWMTR2'
              },
              [], {}, 'sim'
            ],
            ['target_td40', 'td', {
                'colspan': '5'
              },
              [], {}, 'target_tr4'
            ],
            ['target_td41', 'td', {
                'colspan': '5'
              },
              [], {}, 'target_tr4'
            ],
          ], rootIU);
          upSearch();
        }
      }
      DOM.newNodes([ // Résultats
        ['res_tr5', 'tr', {
            'class': 'tblheader'
          },
          [], {}, 'sim'
        ],
        ['res_th50', 'th', {
            'colspan': '2',
            'class': 'BWMselect ' + (U.getP('shRes') ? 'enabled' : 'disabled')
          },
          ['[' + (U.getP('shRes') ? '-' : '+') + ']'], {
            'click': [show, 'shRes']
          }, 'res_tr5'
        ],
        ['res_th51', 'th', {
            'colspan': '3',
            'class': (U.getP('shRes') ? '' : 'BWMcutth')
          },
          [], {}, 'res_tr5'
        ],
        ['res_span510', 'span', {},
          ['Résultats : '], {}, 'res_th51'
        ],
        ['res_th52', 'th', {
            'class': 'BWMselect heal'
          },
          ['+'], {
            'click': [addR]
          }, 'res_tr5'
        ],
        (U.getP('result') > 0 ? ['res_th53', 'th', {
            'class': 'BWMselect'
          },
          ['◄'], {
            'click': [moveR, -1]
          }, 'res_tr5'
        ] : ['res_th53a', 'th', {},
          [], {}, 'res_tr5'
        ]),
        (U.getP('result') < s.r.length - 1 ? ['res_th54', 'th', {
            'class': 'BWMselect'
          },
          ['►'], {
            'click': [moveR, +1]
          }, 'res_tr5'
        ] : ['res_th54a', 'th', {},
          [], {}, 'res_tr5'
        ]), ['res_th55', 'th', {
            'class': 'BWMselect atkHit'
          },
          ['X'], {
            'click': [delR]
          }, 'res_tr5'
        ],
        ['res_th56', 'th', {
            'class': 'BWMselect atkHit'
          },
          ['R'], {
            'click': [resetR]
          }, 'res_tr5'
        ]
      ], rootIU);
      for (var j = 0; j < s.r.length; j++) {
        DOM.newNodes([
          ['res_span41a' + j, 'span', {
              'class': 'BWMselect' + (j === U.getP('result') ? ' disabled' : '')
            },
            [j], {
              'click': [setR, j]
            }, 'res_th51'
          ]
        ], rootIU);
        if (j < s.r.length - 1) DOM.newNodes([
          ['res_span41b' + j, 'span', {},
            [', '], {}, 'res_th51'
          ]
        ], rootIU);
      }
      if (U.getP('shRes')) {
        DOM.newNodes([
          ['res_tr6', 'tr', {
              'class': 'BWMTR2'
            },
            [], {}, 'sim'
          ],
          ['res_th60', 'th', {
              'colspan': '2'
            },
            [], {}, 'res_tr6'
          ],
          ['res_th61', 'th', {},
            ['Objet'], {}, 'res_tr6'
          ],
          ['res_th62', 'th', {},
            ['Préfixe'], {}, 'res_tr6'
          ],
          ['res_th63', 'th', {},
            ['Suffixe'], {}, 'res_tr6'
          ],
          ['res_th64', 'th', {
              'colspan': '5'
            },
            ['Actions'], {}, 'res_tr6'
          ]
        ], rootIU);
        for (var j = 0; j < r.length; j++) {
          if (r[j] == -1) { // séparateur
            if (lroot !== null) lroot.setAttribute('rowspan', j - root);
            root = j + 1;
            DOM.newNodes([
              ['res_tr6' + j, 'tr', {
                  'class': 'BWMTR2'
                },
                [], {}, 'sim'
              ],
              ['res_td6' + j + '_0', 'td', {
                  'colspan': '5'
                },
                [], {}, 'res_tr6' + j
              ],
              ['res_span6' + j + '_0', 'span', {
                  'align': 'center'
                },
                ['---------------------------------'], {}, 'res_td6' + j + '_0'
              ],
              ['res_td6' + j + '_1', 'td', {
                  'class': 'BWMselect atkHit',
                  'colspan': '5'
                },
                ['X'], {
                  'click': [delI, [j, root]]
                }, 'res_tr6' + j
              ]
            ], rootIU);
          } else if (j - root > 0 && ((j - root) % 2 === 0)) { // fusions
            r[j] = objMix(r[j - 2], r[j - 1]);
            if (objCmp(r[j], [0, 0, 0, 0]) !== 0) {
              results.push(r[j]);
              var v = Jsons.encode(r[j]);
              if (!exist(link[v])) link[v] = {};
              if (!exist(link[v].fus)) link[v].fus = [];
              link[v].fus.push('res_td6' + j);
            }
            DOM.newNodes([
              ['res_tr6' + j, 'tr', {
                  'class': 'BWMTR2 BWMeven'
                },
                [], {}, 'sim'
              ],
              ['res_td6' + j + '_0', 'td', {
                  'class': 'BWMcut2 heal'
                },
                ['='], {}, 'res_tr6' + j
              ],
              ['res_td6' + j + '_1', 'td', {
                  'class': 'BWMcut2 heal'
                },
                [loc[1][r[j][0]][0]], {}, 'res_tr6' + j
              ],
              ['res_td6' + j + '_2', 'td', {
                  'class': 'BWMcut2 heal'
                },
                [(r[j][1] > 0 ? r[j][1] + ':' : '') + loc[2][U.getP('cat')][r[j][1]][0]], {}, 'res_tr6' + j
              ],
              ['res_td6' + j + '_3', 'td', {
                  'class': 'BWMcut2 heal'
                },
                [(r[j][2] > 0 ? r[j][2] + ':' : '') + loc[3][U.getP('cat')][r[j][2]][loc[2][U.getP('cat')]
                  [r[j][1]].slice(-1)[0] === true && exist(loc[3][U.getP('cat')][r[j][2]][1]) ? 1 : 0
                ]], {}, 'res_tr6' + j
              ],
              ['res_td6' + j + '_4', 'td', {
                  'class': 'BWMcut2 heal'
                },
                [(r[j][3] > 0 ? r[j][3] + ':' : '') + loc[4][U.getP('cat')][r[j][3]][0]], {}, 'res_tr6' + j
              ],
              ['res_td6' + j + '_5', 'td', {
                  'class': 'BWMselect heal'
                },
                ['+'], {
                  'click': [addI, j]
                }, 'res_tr6' + j
              ],
              (!(exist(r[j + 1]) && r[j + 1] == -1)) ? ['res_td6' + j + '_6', 'td', {
                  'class': 'BWMselect'
                },
                ["<>"], {
                  'click': [sepI, j]
                }, 'res_tr6' + j
              ] : ['res_td6' + j + '_6', 'td', {},
                [], {}, 'res_tr6' + j
              ],
              ['res_td6' + j + '_7', 'td', {
                  'class': 'BWMselect atkHit'
                },
                ['◄'], {
                  'click': [firstI, [j, root]]
                }, 'res_tr6' + j
              ],
              ['res_td6' + j + '_8', 'td', {
                  'class': 'BWMselect atkHit'
                },
                ['▲'], {
                  'click': [firstI, [j, 0]]
                }, 'res_tr6' + j
              ]
            ], rootIU);
            if (lroot !== null) lroot.setAttribute('rowspan', j - root + 1);
          } else { // objets
            var v = Jsons.encode(r[j]);
            if (!exist(link[v])) link[v] = {};
            if (!exist(link[v].res)) link[v].res = [];
            link[v].res.push('res_td6' + j);
            if (U.getP('setZone') >= 0 && U.getP('setIndex') == j) {
              target = [v, link[v].res.length - 1];
            }
            DOM.newNodes([
              ['res_tr6' + j, 'tr', {
                  'class': 'BWMTR2'
                },
                [], {}, 'sim'
              ],
              ['res_td6' + j + '_0', 'td', {
                  'class': 'BWMcut'
                },
                [(j - root === 0 ? '' : '+')], {
                  'click': [setI, [U.getP('result'), j]]
                }, 'res_tr6' + j
              ],
              ['res_td6' + j + '_1', 'td', {
                  'class': 'BWMcut'
                },
                [loc[1][r[j][0]][0]], {
                  'click': [setI, [U.getP('result'), j]]
                }, 'res_tr6' + j
              ],
              ['res_td6' + j + '_2', 'td', {
                  'class': 'BWMcut'
                },
                [(r[j][1] > 0 ? r[j][1] + ':' : '') + loc[2][U.getP('cat')][r[j][1]][0]],
                {
                  'click': [setI, [U.getP('result'), j]]
                }, 'res_tr6' + j
              ],
              ['res_td6' + j + '_3', 'td', {
                  'class': 'BWMcut'
                },
                [(r[j][2] > 0 ? r[j][2] + ':' : '') + loc[3][U.getP('cat')][r[j][2]][loc[2][U.getP('cat')]
                  [r[j][1]].slice(-1)[0] === true && exist(loc[3][U.getP('cat')][r[j][2]][1]) ? 1 : 0
                ]],
                {
                  'click': [setI, [
                    U.getP('result'), j
                  ]]
                }, 'res_tr6' + j
              ],
              ['res_td6' + j + '_4', 'td', {
                  'class': 'BWMcut'
                },
                [(r[j][3] > 0 ? r[j][3] + ':' : '') + loc[4][U.getP('cat')][r[j][3]][0]],
                {
                  'click': [setI, [
                    U.getP('result'), j
                  ]]
                }, 'res_tr6' + j
              ],
              (j - root === 0) ? ['res_td6' + j + '_5', 'td', {
                  'class': 'BWMselect heal'
                },
                ["+"], {
                  'click': [addI, j]
                }, 'res_tr6' + j
              ] : ['res_td6' + j + '_5', 'td', {},
                [], {}, 'res_tr6' + j
              ],
              (exist(r[j + 2]) && r[j + 2] != -1) ? ['res_td6' + j + '_7', 'td', {
                  'class': 'BWMselect'
                },
                ['▼'], {
                  'click': [moveI, [j, (j == root ? j + 1 : j + 2)]]
                }, 'res_tr6' + j
              ] : ['res_td6' + j + '_7', 'td', {},
                [], {}, 'res_tr6' + j
              ],
              (j - root > 0) ? ['res_td6' + j + '_6', 'td', {
                  'class': 'BWMselect'
                },
                ['▲'], {
                  'click': [moveI, [j, (j - root > 2 ? j - 2 : j - 1)]]
                }, 'res_tr6' + j
              ] : ['res_td6' + j + '_6', 'td', {},
                [], {}, 'res_tr6' + j
              ],
              ['res_td6' + j + '_8', 'td', {
                  'class': 'BWMselect atkHit'
                },
                ['X'], {
                  'click': [delI, [j, root]]
                }, 'res_tr6' + j
              ]
            ], rootIU);
            if (j == root) lroot = DOM.newNode('td', {
              'class': 'BWMselect atkHit'
            }, ['B'], {
              'click': [
                delB, root
              ]
            }, rootIU['res_tr6' + j]);
          }
        }
        if (results.length > 0) {
          var v = objDiff(results[results.length - 1], but);
          DOM.newNodes([
            ['res_tr6' + (j + 1), 'tr', {
                'class': 'BWMTR2'
              },
              [], {}, 'sim'
            ],
            ['res_td6' + (j + 1) + '_0', 'td', {
                'colspan': '5'
              },
              ['Ecart ' + (v == Infinity ? '∞' : v) + ' en ' + results.length + ' fusion' + (results.length >
                1 ? 's' : '')], {}, 'res_tr6' + (j + 1)
            ],
            ['res_td6' + (j + 1) + '_1', 'td', {
                'class': 'BWMselect atkHit',
                'colspan': '5'
              },
              [], {}, 'res_tr6' + (j + 1)
            ]
          ], rootIU);
        }
      }
    }
    // Saisie
    DOM.newNodes([
      ['get_tr', 'tr', {
          'class': 'tblheader'
        },
        [], {}, 'get'
      ],
      ['get_th0', 'th', {
          'class': 'BWMselect ' + (U.getP('shGet') ? 'enabled' : 'disabled')
        },
        ['[' + (U.getP('shGet') ? '-' : '+') + ']'], {
          'click': [show, 'shGet']
        }, 'get_tr'
      ],
      ['get_th1', 'th', {
          'colspan': '4'
        },
        [], {}, 'get_tr'
      ],
      ['get_span10', 'span', {},
        ['Saisie : '], {}, 'get_th1'
      ],
      ['get_span11', 'span', {
          'class': 'BWMselect' + (U.getP('mode') === 0 ? ' disabled' : '')
        },
        ['listes (' + arm.length + '+' + results.length + ')!!'], {
          'click': [selectMode, 0]
        }, 'get_th1'
      ],
      ['get_span12', 'span', {},
        [', '], {}, 'get_th1'
      ],
      ['get_span13', 'span', {
          'class': 'BWMselect' + (U.getP('mode') === 1 ? ' disabled' : '')
        },
        ['copie'], {
          'click': [selectMode, 1]
        }, 'get_th1'
      ],
      ['get_span14', 'span', {},
        [', '], {}, 'get_th1'
      ],
      ['get_span15', 'span', {
          'class': 'BWMselect' + (U.getP('mode') === 2 ? ' disabled' : '')
        },
        ['libre'], {
          'click': [selectMode, 2]
        }, 'get_th1'
      ]
    ], rootIU);
    if (U.getP('shGet')) {
      if (U.getP('mode') === 0) { // saisie par liste
        var sel = [
          [arm, 'Armurerie', 'shLArm'],
          [clone(s.s), 'Copie Index', 'shLInd'],
          [results, 'Synthèses', 'shLSyn']
        ];
        for (var k = 0; k < sel.length; k++) {
          if (sel[k][0].length > 0) {
            sel[k][0].sort(tabTri([U.getP('triCol'), U.getP('triOrder')]));
            DOM.newNodes([
              ['get_tr0' + k, 'tr', {
                  'class': 'tblheader'
                },
                [], {}, 'get'
              ],
              ['get_th0' + k + '_0', 'th', {
                  'class': 'BWMselect ' + (!!U.getP(sel[k][2]) ? 'enabled' : 'disabled')
                },
                ['[' + (!!U.getP(sel[k][2]) ? '-' : '+') + ']'], {
                  'click': [show, sel[k][2]]
                }, 'get_tr0' + k
              ],
              ['get_th0' + k + '_1', 'th', {
                  'colspan': '4'
                },
                [sel[k][1] + ' (' + sel[k][0].length + ')'], {}, 'get_tr0' + k
              ]
            ], rootIU);
            if (!!U.getP(sel[k][2])) {
              DOM.newNodes([
                ['get_tr1' + k, 'tr', {
                    'class': 'BWMTR2'
                  },
                  [], {}, 'get'
                ],
                ['get_th1' + k + '_0', 'th', {
                    'class': 'BWMtitle'
                  },
                  [], {
                    'click': [selectTri, 0]
                  }, 'get_tr1' + k
                ],
                ['get_th1' + k + '_1', 'th', {
                    'class': 'BWMtitle'
                  },
                  ['Objet'], {
                    'click': [selectTri, 1]
                  }, 'get_tr1' + k
                ],
                ['get_th1' + k + '_2', 'th', {
                    'class': 'BWMtitle'
                  },
                  ['Préfixe'], {
                    'click': [selectTri, 2]
                  }, 'get_tr1' + k
                ],
                ['get_th1' + k + '_3', 'th', {
                    'class': 'BWMtitle'
                  },
                  ['Suffixe'], {
                    'click': [selectTri, 3]
                  }, 'get_tr1' + k
                ],
                (U.getP('setZone') == -1 || (isGo && U.getP('setZone') < 0)) ? ['get_th1' + k + '_4', 'th', {},
                  [], {}, 'get_tr1' + k
                ] : ['get_th1' + k + '_4', 'th', {
                    'class': 'BWMselect heal'
                  },
                  ['►►'], {
                    'click': [selectAll, sel[k][0]]
                  }, 'get_tr1' + k
                ],
                ['get_span11' + k, 'span', {
                    'class': 'BWMtriSelect'
                  },
                  [(U.getP('triOrder') === 1 ? '▲' : '▼')], {}, 'get_th1' + k + '_' + U.getP('triCol').toString()
                ]
              ], rootIU);
              for (var i = 0; i < sel[k][0].length; i++) {
                var x = sel[k][0][i];
                var v = Jsons.encode(x);
                if (!exist(link[v])) link[v] = {};
                if (!exist(link[v]['s' + k])) link[v]['s' + k] = [];
                link[v]['s' + k].push('get_td2' + k + '_' + i);
                DOM.newNodes([
                  ['get_tr2' + k + '_' + i, 'tr', {
                      'class': 'BWMTR2' + (i % 2 === 0 ? '' : ' BWMeven')
                    },
                    [], {}, 'get'
                  ]
                ], rootIU);
                if (isGo && U.getP('setZone') < 0) {
                  DOM.newNodes([
                    ['get_td2' + k + '_' + i + '_1', 'td', {
                        'class': 'BWMcut2'
                      },
                      [loc[1][x[0]][0]], {}, 'get_tr2' + k + '_' + i
                    ],
                    ['get_td2' + k + '_' + i + '_2', 'td', {
                        'class': 'BWMcut2'
                      },
                      [(x[1] > 0 ? x[1] + ':' : '') + loc[2][U.getP('cat')][x[1]][0]], {}, 'get_tr2' + k + '_' + i
                    ],
                    ['get_td2' + k + '_' + i + '_3', 'td', {
                        'class': 'BWMcut2'
                      },
                      [(x[2] > 0 ? x[2] + ':' : '') + loc[3][U.getP('cat')][x[2]][loc[2][U.getP('cat')][x[1]].slice(-1)[0] === true && exist(loc[3][U.getP('cat')][x[2]][1]) ? 1 : 0]], {}, 'get_tr2' + k + '_' + i
                    ],
                    ['get_td2' + k + '_' + i + '_4', 'td', {
                        'class': 'BWMcut2'
                      },
                      [(x[3] > 0 ? x[3] + ':' : '') + loc[4][U.getP('cat')][x[3]][0]], {}, 'get_tr2' + k + '_' + i
                    ],
                    ['get_td2' + k + '_' + i + '_5', 'td', {},
                      [], {}, 'get_tr2' + k + '_' + i
                    ],
                  ], rootIU);
                } else {
                  DOM.newNodes([
                    ['get_td2' + k + '_' + i + '_1', 'td', {
                        'class': 'BWMcut'
                      },
                      [loc[1][x[0]][0]], {
                        'click': [selectSet, x]
                      }, 'get_tr2' + k + '_' + i
                    ],
                    ['get_td2' + k + '_' + i + '_2', 'td', {
                        'class': 'BWMcut'
                      },
                      [(x[1] > 0 ? x[1] + ':' : '') + loc[2][U.getP('cat')][x[1]][0]], {
                        'click': [selectSet, x]
                      }, 'get_tr2' + k + '_' + i
                    ],
                    ['get_td2' + k + '_' + i + '_3', 'td', {
                        'class': 'BWMcut'
                      },
                      [(x[2] > 0 ? x[2] + ':' : '') + loc[3][U.getP('cat')][x[2]][loc[2][U.getP('cat')][x[1]].slice(-1)[0] === true && exist(loc[3][U.getP('cat')][x[2]][1]) ? 1 : 0]], {
                        'click': [selectSet, x]
                      }, 'get_tr2' + k + '_' + i
                    ],
                    ['get_td2' + k + '_' + i + '_4', 'td', {
                        'class': 'BWMcut'
                      },
                      [(x[3] > 0 ? x[3] + ':' : '') + loc[4][U.getP('cat')][x[3]][0]], {
                        'click': [selectSet, x]
                      }, 'get_tr2' + k + '_' + i
                    ],
                    (U.getP('setZone') == -1) ? ['get_td2' + k + '_' + i + '_5', 'td', {},
                      [], {}, 'get_tr2' + k + '_' + i
                    ] : ['get_td2' + k + '_' + i + '_5', 'td', {
                        'class': 'BWMselect heal'
                      },
                      ['►'], {
                        'click': [selectAdd, x]
                      }, 'get_tr2' + k + '_' + i
                    ],
                  ], rootIU);
                }
              }
            }
          }
        }
      } else if (U.getP('mode') == 1) { // copier/coller
        DOM.newNodes([
          ['get_tr0', 'tr', {},
            [], {}, 'get'
          ],
          ['get_td00', 'td', {
              'colspan': '5'
            },
            [], {}, 'get_tr0'
          ],
          ['get_tr1', 'tr', {},
            [], {}, 'get'
          ],
          ['get_td10', 'td', {
              'colspan': '5'
            },
            [], {}, 'get_tr1'
          ],
          ['get_tr2', 'tr', {},
            [], {}, 'get'
          ],
          ['get_td20', 'td', {
              'class': 'BWMselect atkHit'
            },
            ['X'], {
              'click': [chgArea, 'clean']
            }, 'get_tr2'
          ],
          ['get_td21', 'td', {
              'colspan': '2',
              'class': 'BWMselect heal'
            },
            ['◄◄'], {
              'click': [chgArea, 'copy']
            }, 'get_tr2'
          ],
          ['get_td22', 'td', {
              'colspan': '2'
            },
            [], {}, 'get_tr2'
          ],
          ['get_div220', 'div', {
              'class': 'BWM100 BWMselect heal'
            },
            ['►►'], {
              'click': [chgArea, 'paste']
            }, 'get_td22'
          ],
          ['get_tr3', 'tr', {},
            [], {}, 'get'
          ],
          ['get_td30', 'td', {
              'colspan': '1',
              'class': 'BWMcut2 BWMeven'
            },
            [], {}, 'get_tr3'
          ],
          ['get_area0', 'textarea', {
              'class': 'textarea BWMdivarea',
              'readonly': 'readonly',
              'spellcheck': 'false'
            },
            [], {}, 'get_td30'
          ],
          ['get_td31', 'td', {
              'colspan': '4',
              'class': 'BWMcut2 BWMeven'
            },
            [], {}, 'get_tr3'
          ],
          ['get_area1', 'textarea', {
              'class': 'textarea BWMdivarea',
              'spellcheck': 'false'
            },
            [], {
              'input': [chgArea, 'update']
            }, 'get_td31'
          ],
        ], rootIU);
        chgArea(null, 'init');
      } else { // saisie manuelle
        var max = Math.max(loc[1].length, loc[2][U.getP('cat')].length, loc[3][U.getP('cat')].length, loc[4][U.getP('cat')].length);
        DOM.newNodes([
          ['get_tr0', 'tr', {
              'class': 'BWMTR2'
            },
            [], {}, 'get'
          ],
          ['get_th00', 'th', {},
            [], {}, 'get_tr0'
          ],
          ['get_th01', 'th', {},
            ['Objet'], {}, 'get_tr0'
          ],
          ['get_th02', 'th', {},
            ['Préfixe'], {}, 'get_tr0'
          ],
          ['get_th03', 'th', {},
            ['Suffixe'], {}, 'get_tr0'
          ],
          ['get_th04', 'th', {},
            [], {}, 'get_tr0'
          ]
        ], rootIU);
        for (var i = 0; i < max; i++) {
          DOM.newNodes([
            ['get_tr1' + i, 'tr', {
                'class': 'BWMTR'
              },
              [], {}, 'get'
            ]
          ], rootIU);
          for (var j = 0; j < 4; j++) {
            var x = j === 0 ? loc[j + 1] : loc[j + 1][U.getP('cat')];
            if (i < x.length) {
              DOM.newNodes([
                ['get_td1' + i + '_' + j, 'td',
                  {
                    'class': (isGo && U.getP('setZone') < 0 ? 'BWMcut2' : 'BWMcut') +
                      ((U.getP('setZone') == -1 ? but[j] : U.getP('setZone') == -2 ? s.s[U.getP('setIndex')][j] : r[U.getP('setIndex')][j]) ==
                        i ? ' disabled' : '')
                  },
                  [(j > 0 && i > 0 ? i + ':' : '') + x[i][0]], (isGo && U.getP('setZone') < 0 ? {} : {
                    'click': [selectMSet, [j, i]]
                  }), 'get_tr1' + i
                ]
              ], rootIU);
            } else DOM.newNodes([
              ['get_td1' + i + '_' + j, 'td', {},
                [], {}, 'get_tr1' + i
              ]
            ], rootIU);
          }
          DOM.newNodes([
            ['get_td15' + i + '_5', 'td', {},
              [], {}, 'get_tr1' + i
            ]
          ], rootIU);
        }
      }
    }
    // coloration des objets sélectionnés/identiques
    for (var key in link) {
      if (link.hasOwnProperty(key)) {
        var v = U.getP('setZone') == -1 ? 'but' : U.getP('setZone') == -2 ? 'sel' : 'res';
        if (exist(link[key][v])) {
          for (var i = 0; i < link[key][v].length; i++) {
            var x = exist(link[key].s0) && exist(link[key].s0[i]) ? link[key].s0[i] : null;
            var y = exist(link[key].s1) && exist(link[key].s1[i]) ? link[key].s1[i] : null;
            var z = exist(link[key].s2) && exist(link[key].s2[i]) ? link[key].s2[i] : null;
            if (target[0] == key && target[1] == i) {
              itemAddClass(link[key][v][i], 'disabled');
              itemAddClass(link[key][v][i], 'BWMborder');
              if (x !== null) itemAddClass(x, 'disabled');
              if (y !== null) itemAddClass(y, 'disabled');
              if (z !== null) itemAddClass(z, 'disabled');
            } else if (x !== null || y !== null || z !== null) {
              itemAddClass(link[key][v][i], 'item-link');
              if (x !== null) itemAddClass(x, 'item-link');
              if (y !== null) itemAddClass(y, 'item-link');
              if (z !== null) itemAddClass(z, 'item-link');
            }
          }
        }
        if (key != "[0,0,0,0]") {
          var all = Object.keys(link[key]).map(function (v) {
            return link[key][v];
          }).reduce(function (pre, cur) {
            return pre.concat(cur);
          });
          for (var i = 0; i < all.length; i++) {
            for (var j = 0; j < 10; j++) { //all[i]['td0'+j]
              if (exist(rootIU[all[i] + '_' + j])) {
                DOM.addEvent(rootIU[all[i] + '_' + j], 'mouseover', selectSameItem, all);
                DOM.addEvent(rootIU[all[i] + '_' + j], 'mouseout', unselectSameItem, all);
              }
            }
          }
        }
      }
    }
    // Bulles d'aide
    if (!!U.getP('shHelp')) {
      var aides = {
        'head_td0': ['Position',
          "<tr><td>Clic : déplace l'interface en zone haute/basse.</td></tr>"
        ],
        'head_span10': ['Titre',
          "<tr><td>Clic : affiche/masque l'interface.</td></tr>"
        ],
        'head_span20': ['Aide',
          "<tr><td>Clic : active/désactive l'affichage des bulles d'aides.</td></tr>" +
          "<tr><td><hr></hr></td></tr>" +
          "<tr><td>Passer la souris sur les titres/commandes pour plus de détails.</td></tr>"
        ],
        'head_span22': ['Lien du forum',
          "<tr><td>Ce script est basé sur les réflexions d'un sujet sur le forum.</td></tr>"
        ],
        'get_th0': ['Saisie',
          "<tr><td><span class='atkHit'>[+]</span><span class='heal'>[-]</span><span> : affiche/masque la zone de saisie.</span></td></tr>"
        ],
        'get_span10': ['Saisie',
          "<tr><td>La zone de saisie permet de modifier les objets dans la zone de droite.</td></tr>" +
          "<tr><td>Sélectionner la ligne/zone de droite que vous souhaitez modifier avant d'utiliser la zone de saisie.</td></tr>"
        ],
        'get_span11': ['Listes',
          "<tr><td><b>- Armurerie :</b> Liste des objets de votre armurerie correspondant à la Catégorie sélectionnée.</td></tr>" +
          "<tr><td><span class='disabled'><b>!! Important : pour prendre en compte la totalité de l'armurerie il faut faire défiler la liste complète des objets de cette page !!</b></span></td></tr>" +
          "<tr><td><b>- Index :</b> Copie de l'Index de recherche utilisable en saisie.</td></tr>" +
          "<tr><td><b>- Synthèses :</b> Copie des fusions obtenues dans le Résultat de droite.</td></tr>" +
          "<tr><td><hr></hr></td></tr>" +
          "<tr><td><b>Commandes En-têtes :</b></td></tr>" +
          "<tr><td>- Clic : tri le tableau suivant cette colonne.</td></tr>" +
          "<tr><td>- <span class='heal'><b>►►</b></span> : ajoute tous les objets à la zone sélectionnée. Le dernier objet ajouté devient la sélection en cours.</td></tr>" +
          "<tr><td><hr></hr></td></tr>" +
          "<tr><td><b>Commandes par objets :</b></td></tr>" +
          "<tr><td>- Clic : remplace l'objet sélectionné dans la zone de droite par cet objet.</td></tr>" +
          "<tr><td>- <span class='heal'>►</span> : ajoute l'objet à la zone sélectionnée qui devient la sélection en cours.</td></tr>"
        ],
        'get_th00_0': ['Armurerie',
          "<tr><td><span class='atkHit'>[+]</span><span class='heal'>[-]</span><span> : affiche/masque cette liste.</span></td></tr>"
        ],
        'get_th01_0': ['Index',
          "<tr><td><span class='atkHit'>[+]</span><span class='heal'>[-]</span><span> : affiche/masque cette liste.</span></td></tr>"
        ],
        'get_th02_0': ['Synthèses',
          "<tr><td><span class='atkHit'>[+]</span><span class='heal'>[-]</span><span> : affiche/masque cette liste.</span></td></tr>"
        ],
        'get_span13': ['Copie',
          "<tr><td>Cette zone permet l'échange d'une liste d'objets que ce soit entre résultats ou avec d'autres joueurs.</td></tr>" +
          "<tr><td>Elle permet la saisie manuelle et le copier/coller.</td></tr>" +
          "<tr><td><hr></hr></td></tr>" +
          "<tr><td><b>Lignes valides</b> et <b>invalides</b> vous indiquent si les lignes sont correctement formatées.</td></tr>" +
          "<tr><td><hr></hr></td></tr>" +
          "<tr><td>La zone reconnait les objets au format du jeu. Vous pouvez ne pas saisir certains éléments qui seront considérés comme vide.</td></tr>" +
          "<tr><td>Les objets peuvent être précédés des opérateurs '+','=' ou du séparateur '-' pour une copie dans la zone résultat.</td></tr>" +
          "<tr><td>Lors de l'import la ligne '=' sera automatiquement recalculée et peut donc être laissé à vide ou erronée.</td></tr>" +
          "<tr><td><hr></hr></td></tr>" +
          "<tr><td><b>Exemple :</b></td></tr>" +
          "<tr><td>Short Renforcé De L’Athlète (+1)</td></tr>" +
          "<tr><td>+ Short Satiné De L’Athlète (+1)</td></tr>" +
          "<tr><td>= Short Clouté De L’Athlète (+2)</td></tr>" +
          "<tr><td>-</td></tr>" +
          "<tr><td>Flexible Du Brigand</td></tr>" +
          "<tr><td>+ Parfaite Jupe Satinée Du Trafiquant D’Armes (+1)</td></tr>" +
          "<tr><td>=</td></tr>"
        ],
        'get_td20': ['Reset',
          "<tr><td>Supprime le contenu de cette zone.</td></tr>"
        ],
        'get_td21': ['Export',
          "<tr><td>Copie la sélection de droite dans cette zone.</td></tr>" +
          "<tr><td>Cette liste est pré-sélectionnée pour permettre une copie à usage externe.</td></tr>"
        ],
        'get_td22': ['Import',
          "<tr><td>Ajoute la liste à la sélection de droite.</td></tr>" +
          "<tr><td>Ce bouton n'apparaîtra que si cette liste est compatible avec la zone concernée.</td></tr>"
        ],
        'get_span15': ['Saisie libre',
          "<tr><td>Permet de saisir indépendamment chaque élément de la sélection.</td></tr>" +
          "<tr><td><hr></hr></td></tr>" +
          "<tr><td><b>Commandes :</b></td></tr>" +
          "<tr><td>- Clic élément : remplace l'élément dans la sélection de droite par cet élément.</td></tr>"
        ],
        'sim_th0': ['Simulations',
          "<tr><td><span class='atkHit'>[+]</span><span class='heal'>[-]</span><span> : affiche/masque la zone des simulations.</span></td></tr>"
        ],
        'sim_span0': ['Simulations',
          "<tr><td>Une simulation comprend l'ensemble des éléments permettant de chercher une solution.</td></tr>"
        ],
        'sim_th2': ['Ajout',
          "<tr><td>Ajoute une simulation.</td></tr>"
        ],
        'sim_th3': ['Déplacement',
          "<tr><td>Déplace la simulation à gauche.</td></tr>"
        ],
        'sim_th4': ['Déplacement',
          "<tr><td>Déplace la simulation à droite.</td></tr>"
        ],
        'sim_th5': ['Suppression',
          "<tr><td>Supprime la simulation.</td></tr>"
        ],
        'sim_th6': ['Reset',
          "<tr><td>Supprime toutes les simulations.</td></tr>"
        ],
        'idx_th10': ['Index',
          "<tr><td><span class='atkHit'>[+]</span><span class='heal'>[-]</span><span> : affiche/masque la zone Index.</span></td></tr>"
        ],
        'idx_th11': ['Index',
          "<tr><td>Liste des objets utilisés dans le cadre de la recherche (minimun 2) ou" +
          " pouvant servir pour constituer une liste perso.</td></tr>" +
          "<tr><td>Tri manuel possible sur les colonnes.</td></tr>" +
          "<tr><td>La colonne de gauche indique la différence de points entre l'objet et la cible." +
          "Un objet n'ayant pas un des éléments de la cible indique une valeur infinie.</td></tr>" +
          "<tr><td><hr></hr></td></tr>" +
          "<tr><td><b>Commandes par objets :</b></td></tr>" +
          "<tr><td>- <span class='heal'>+</span><span> : ajoute une ligne d’objet vide.</span></td></tr>" +
          "<tr><td>- ▼ ▲ : déplace la ligne.</td></tr>" +
          "<tr><td>- <span class='atkHit'>X</span><span> : supprime la ligne.</span></td></tr>" +
          "<tr><td>- ► : ajoute cet objet après l'objet sélectionné du résultat en cours ou sinon en fin du résultat.</span></td></tr>"
        ],
        'idx_th13': ['Reset',
          "<tr><td>Supprime les éléments de l'Index.</td></tr>"
        ],
        'opt_th10': ['Options',
          "<tr><td><span class='atkHit'>[+]</span><span class='heal'>[-]</span><span> : affiche/masque la zone Options.</span></td></tr>"
        ],
        'opt_th11': ['Options',
          "<tr><td>Ensemble d'options permettant de modifier le comportement de la recherche.</td></tr>" +
          "<tr><td>Pour plus de détails passer la souris sur l'option concernée.</td></tr>"
        ],
        'opt2_td01': ['Max - Fusions',
          "<tr><td>Limite le nombre de fusions utilisées pour cette recherche. Cette valeur permet de diminuer grandement le temps de recherche.</td></tr>"
        ],
        'opt2_td03': ['Max - Ecart',
          "<tr><td>Ne retient que les solutions ayant un écart avec la cible inférieur à cette valeur.</td></tr>"
        ],
        'opt2_td05': ['Max - Résultats',
          "<tr><td>Limite le nombre de résultats retenus pendant la recherche.</td></tr>"
        ],
        'opt2_td11': ['Filtres - Coef',
          "<tr><td>Certains objets ayant plus de valeur que d'autres, ce filtre permet de chercher en priorité les solutions plus ou moins coûteuses.</td></tr>" +
          "<tr><td><hr></hr></td></tr>" +
          "<tr><td>Ce filtre applique un coefficient à chaque élément :</td></tr>" +
          "<tr><td>- 0 ou vide : désactive le filtre.</td></tr>" +
          "<tr><td>- 1 : élément = élément (par défaut).</td></tr>" +
          "<tr><td>- 2 et + : élément = coef^élément.</td></tr>" +
          "<tr><td>Un coefficient élevé tendra a chercher des solutions moins coûteuses mais avec plus de fusions.</td></tr>" +
          "<tr><td><hr></hr></td></tr>" +
          "<tr><td><span class='atkHit'>Désactiver cette option engendre énormément de résultats et par conséquent il est conseillé de limiter le nombre de résultats.</span></td></tr>"
        ],
        'opt2_td13': ['Filtres - Ecart',
          "<tr><td>Cherche les solutions au plus proche de la cible." +
          "<tr><td>Consigne de sécurité identique à l'option Coef.</td></tr>"
        ],
        'opt2_td15': ['Filtres - Doublons',
          "<tr><td>Supprime les doublons en fin de recherche (résultats utilisant les mêmes objets mais avec des permutations différentes).</td></tr>"
        ],
        'opt2_td20': ['Facteur multiplicateur',
          "<tr><td>La valeur d'un objet est basé sur le total de ses éléments. Chaque élément se voit appliquer un facteur multiplicateur permettant de prioriser certains élements :</td></tr>" +
          "<tr><td><i>Valeur par défaut = Qualité*1 + Objet*2 + Préfixe*3 + Suffixe*3</i></td></tr>" +
          "<tr><td><hr></hr></td></tr>" +
          "<tr><td>Par défaut Préfixe et Suffixe sont prioritaires mais vous pouvez changer ces valeurs suivant vos besoins.</td></tr>"
        ],
        'opt2_td31': ['Optimisation Delta',
          "<tr><td>Cette option permet de réduire le temps de recherche en stoppant un arbre de recherche si l'écart entre la fusion actuelle et la cible est supérieur à l'écart de la précédente fusion majoré d'une valeur delta.</td></tr>" +
          "<tr><td><hr></hr></td></tr>" +
          "<tr><td>- vide : recherche sans limite (la plus lente - par défaut).</td></tr>" +
          "<tr><td>- nombre : stop l'arbre de recherche suivant le delta saisi (-1 plus rapide que 2).</td></tr>" +
          "<tr><td><hr></hr></td></tr>" +
          "<tr><td>Saisir un delta induit l'exclusion de certaines recherches. Exemple :</td></tr>" +
          "<tr><td>   - 1:Anneau 21:Vindicatif 9:Art</td></tr>" +
          "<tr><td>+  - 1:Anneau 22:Faussé 10:Justesse</td></tr>" +
          "<tr><td>=  - 1:Anneau 23:En Plastique 11:Jouvence => écart 6</td></tr>" +
          "<tr><td>+  - 1:Anneau 28:Noir 6:Sagesse</td></tr>" +
          "<tr><td>=  - 1:Anneau 27:Faucon 10:Justesse => écart 7, avec un delta inférieur à 1 le script n'ira pas plus loin</td></tr>" +
          "<tr><td>+  - 1:Anneau 20:Diamant 17:Lévitation</td></tr>" +
          "<tr><td>=  - 1:Anneau 25:Solaire 15:Chauve-souris</td></tr>"
        ],
        'opt_td21': ['Chargement des options',
          "<tr><td>Charge les valeurs par défaut.</td></tr>"
        ],
        'opt_td22': ['Sauvegarde des options',
          "<tr><td>Sauvegarde les options en tant que valeurs par défaut.</td></tr>"
        ],
        'opt_td23': ['Reset',
          "<tr><td>Charge les valeurs d'usine.</td></tr>"
        ],
        'target_th10': ['Cible',
          "<tr><td><span class='atkHit'>[+]</span><span class='heal'>[-]</span><span> : affiche/masque la zone Cible.</span></td></tr>"
        ],
        'target_th11': ['Cible',
          "<tr><td>Permet d'indiquer la cible recherchée.</td></tr>" +
          "<tr><td>Un élément vide n'est pas pris en compte.</td></tr>"
        ],
        'target_th13': ['Reset',
          "<tr><td>Efface la zone Cible.</td></tr>"
        ],
        'target_td35': ['Lancement',
          "<tr><td>Lance la recherche. Au moins deux objets doivent être saisie dans l'Index.</td></tr>"
        ],
        'target_td36': ['Stop',
          "<tr><td>Stop la recherche sans afficher les résultats trouvés.</td></tr>"
        ],
        'target_td37': ['Stop + résultats',
          "<tr><td>Stop la recherche et affiche les résultats trouvés.</td></tr>"
        ],
        'target_td38': ['Affiche les résultats',
          "<tr><td>Affiche les résultats trouvés sans stopper la recherche.</td></tr>"
        ],
        'res_th50': ['Résultats',
          "<tr><td><span class='atkHit'>[+]</span><span class='heal'>[-]</span><span> : affiche/masque la zone des résultats.</span></td></tr>"
        ],
        'res_span510': ['Résultats',
          "<tr><td>Affiche les solutions trouvées par la Recherche. Permet aussi de saisir manuellement vos solutions.</td></tr>" +
          "<tr><td><hr></hr></td></tr>" +
          "<tr><td><b>Commandes par objets :</b></td></tr>" +
          "<tr><td>- <span class='heal'>+</span><span> : ajoute une ligne.</span></td></tr>" +
          "<tr><td>- ▼ ▲ : déplace la ligne.</td></tr>" +
          "<tr><td>- <> : ajoute un nouveau bloc indépendant du précédent.</td></tr>" +
          "<tr><td>- <span class='atkHit'>X</span><span> : supprime la ligne.</span></td></tr>" +
          "<tr><td>- <span class='atkHit'>◄</span><span> : supprime tous les éléments précédents du bloc.</span></td></tr>" +
          "<tr><td>- <span class='atkHit'>▲</span><span> : supprime tous les éléments précédents.</span></td></tr>" +
          "<tr><td>- <span class='atkHit'>B</span><span> : supprime le bloc.</span></td></tr>"
        ],
        'res_th52': ['Ajout',
          "<tr><td>Ajoute un résultat.</td></tr>"
        ],
        'res_th53': ['Déplacement',
          "<tr><td>Déplace le résultat à gauche.</td></tr>"
        ],
        'res_th54': ['Déplacement',
          "<tr><td>Déplace le résultat à droite.</td></tr>"
        ],
        'res_th55': ['Suppression',
          "<tr><td>Supprime le résultat.</td></tr>"
        ],
        'res_th56': ['Reset',
          "<tr><td>Supprime tous les résultats.</td></tr>"
        ],
      };
      for (var key in aides) {
        if (aides.hasOwnProperty(key)) {
          if (exist(rootIU[key])) {
            rootIU[key].setAttribute('onmouseout', 'nd();');
            rootIU[key].setAttribute('onmouseover', "return overlib('<table class=\"BWMoverlib\">" +
              addslashes(aides[key][1]) + "</table>',CAPTION,'" + aides[key][0] +
              "',CAPTIONFONTCLASS,'action-caption',WIDTH,300,VAUTO,HAUTO);");
          }
        }
      }
    }
  }
  /******************************************************
   * START
   *
   ******************************************************/
  var page = G.page();
  if (debug) console.debug('BWMstart: page, U.id(), U.name()', page, U.id(), U.name(), window.location.hostname);
  if (page == 'pMixitem') {
    if (!isNull(U.id())) {
      var bwIU = DOM.getFirstNode("//div[@id='content-mid']");
      var bwTop = DOM.getFirstNode("./div[@class='top-options']", bwIU);
      if (bwIU !== null && bwTop !== null) {
        // datas
        var loc = L.get((window.location.hostname === 'r8.fr.bloodwars.net' ? 'moriaS' : 'moria'));
// @match       https://r3.fr.bloodwars.net/*
// @match       https://r8.fr.bloodwars.net/*
  if (debug) console.debug('BWMstart: loc', loc);
        var list = U.getD('LIST', {});
        var tasks = {
          't': null,
          'k': {},
          's': {},
          'w': {}
        };
        var allMix = {};
        var cat = U.getP('cat').toString() + U.getP('leg');
        var copieTmp = {};
        var but, c, s, r, isGo, catMix;
        var rootIU = {};
        // création du pattern de recherche
        var indexPat = [{
            "": 0,
            "Bon": 6,
            "Bonne": 6,
            "Parfait": 12,
            "Parfaite": 12
          }, {},
          [],
          []
        ];
        var pat = "(Légendaire|)(?:[ ]?|$)(Bon|Bonne|Parfait|Parfaite|)(?:[ ]?|$)(?:";
        for (var j = 0; j < loc[2].length; j++) {
          if (j > 0) {
            pat += '|';
          }
          pat += '(?:(' + loc[2][j].reduce((a, b, c, d) => c > 0 ? b.reduce(function (w, x, y, z) {
            if (x !== true) {
              indexPat[1][x] = [j, c];
              return w + x + '|';
            }
            return w;
          }, a) : '', '') + ')(?:[ ]?|$)';
          indexPat[2][j] = {};
          pat += '(' + loc[3][j].reduce((a, b, c, d) => c > 0 ? b.reduce(function (w, x, y, z) {
            indexPat[2][j][x] = c;
            return w + x + '|';
          }, a) : '', '') + ')(?:[ ]?|$)';
          indexPat[3][j] = {};
          pat += '(' + loc[4][j].reduce((a, b, c, d) => c > 0 ? b.reduce(function (w, x, y, z) {
            indexPat[3][j][x] = c;
            return w + x + '|';
          }, a) : '', '') + ')(?:[ ]?|$))';
        }
        pat += ")(\\(\\+[0-5]\\)|)";
        //if (debug) console.debug('BWM test1 : ', pat, indexPat);
        // analyse des objets de l'armurerie
        var items = {};
        var itemsNode = DOM.getFirstNode("//div[@id='content-mid']//ul[@id='itemListContainer']");
        if (!isNull(itemsNode)) {
          var observer = new MutationObserver(function () {
            updateItems();
            upTabs();
          });
          observer.observe(itemsNode, {
            childList: true,
            attributes: true,
            subtree: true
          });
          updateItems();
        }
        // Création de l'interface
        upTabs();
      }
    } else {
      alert(L.get("sUnknowID"));
    }
  }
  if (debug) console.debug('BWMend - time %oms', Date.now() - debugTime);
})();
