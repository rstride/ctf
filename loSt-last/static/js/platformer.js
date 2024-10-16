// Maximum time step in seconds.
var maxStep = 0.05;

/*
@ - Player start location
o - Coin
= - Lava moves horizontally
| - Lava moves vertically
v - Lava that only moves down
*/
var actorChars = {
  "@": Player,
  "o": Coin,
  "=": Lava,
  "|": Lava,
  "v": Lava
};

// Set the graphics scale. Defines the number of pixels that a single unit takes up on the screen
var scale = 20;

// Define coin wobble motion
var wobbleSpeed = 8, wobbleDist = 0.07;

// Define player horizontal speed.
var playerXSpeed = 7;
// Define player vertical jump parameters.
var gravity = 30;
var jumpSpeed = 17;

// Define game control keys.
var arrowCodes = {37: "left", 38: "up", 39: "right"};

// Fonction pour charger les niveaux depuis le fichier JSON
function loadLevelsFromJSON() {
  return fetch('/static/data/levels.json')
    .then(response => response.json())
    .then(data => {
      // Retourner les niveaux chargés du fichier JSON
      return data.levels;
    })
    .catch(error => {
      console.error('Erreur lors du chargement des niveaux:', error);
      return [];
    });
}

// Définir le niveau secret
const secretLevel = 
[
      "                                  ",
      "                                  ",
      "                                  ",
      "                                  ",
      "                                  ",
      "                                  ",
      "                                  ",
      "                                  ",
      "                                  ",
      "                                x ",
      "                                x ",
      "                                x ",
      "  xx                            x ",
      "  x                      o      x ",
      "  x                             x ",
      "  x          xxxx       o       x ",
      "  x  @       x  x             o x ",
      "  xxxxxxxxxxxx  xxxxxxxxxx   xxxx",
      "                         x   x    ",
      "                         x!!!x    ",
      "                         x!!!x    ",
      "                         xxxxx    ",
      "                                                                                ",      "                                                                                "
    ]
;

// Fonction pour initialiser le jeu une fois que tout est chargé
function initGame(loadedLevels) {
  if (loadedLevels.length === 0) {
    console.error("Aucun niveau n'a été chargé. Le jeu ne peut pas démarrer.");
    return;
  }

  runGame(loadedLevels, DOMDisplay);
}

// Fonction pour remplacer le niveau actuel par le niveau secret
function replaceWithSecretLevel(Display) {
  console.log("Code secret activé ! Passage au niveau secret.");

  // Supprimer l'ancien niveau du DOM
  let gameContainer = document.querySelector('.game');
  if (gameContainer) {
    gameContainer.remove();
  }

  // Charger le niveau secret
  runLevel(new Level(secretLevel), Display, function(status) {
    if (status == "lost") {
      replaceWithSecretLevel(Display);  // Recommencer le niveau secret si perdu
    } else {
      console.log("niveau charges");
    }
  });
}

// Fonction pour exécuter le jeu et surveiller le code secret
function runGame(plans, Display) {
  let secretCode = "";

  window.addEventListener('keypress', (e) => {
    secretCode += e.key;
    if (secretCode.length > 10) secretCode = secretCode.slice(1);
    if (secretCode === "42") {
      replaceWithSecretLevel(Display);  // Remplacer le niveau par le niveau secret
    }
  });

  function startLevel(n) {
    runLevel(new Level(plans[n]), Display, function(status) {
      if (status == "lost")
        startLevel(n);  // Rejouer le même niveau en cas de perte
      else if (n < plans.length - 1)
        startLevel(n + 1);  // Passer au niveau suivant si victoire
      else
        console.log("Tous les niveaux sont terminés !");
    });
  }

  // Commencer le jeu avec le premier niveau
  startLevel(0);
}

// Fonction pour s'assurer que le DOM est chargé et que les niveaux sont prêts
function domReady(fn) {
  if (document.readyState === "complete" || document.readyState === "interactive") {
    loadLevelsFromJSON().then(fn);
  } else {
    document.addEventListener("DOMContentLoaded", () => loadLevelsFromJSON().then(fn));
  }
}

// Initialiser le jeu lorsque le DOM est prêt
domReady(initGame);

function Level(plan) {
  this.width = plan[0].length;
  this.height = plan.length;
  this.grid = [];
  this.actors = [];

  for (var y = 0; y < this.height; y++) {
    var line = plan[y],
      gridLine = [];
    for (var x = 0; x < this.width; x++) {
      var ch = line[x],
        fieldType = null;
      var Actor = actorChars[ch];
      if (Actor)
        this.actors.push(new Actor(new Vector(x, y), ch));
      else if (ch == "x")
        fieldType = "wall";
      else if (ch == "!")
        fieldType = "lava";
      gridLine.push(fieldType);
    }
    this.grid.push(gridLine);
  }

  this.player = this.actors.filter(function(actor) {
    return actor.type == "player";
  })[0];
  this.status = this.finishDelay = null;
}

Level.prototype.isFinished = function() {
  return this.status !== null && this.finishDelay < 0;
};

Level.prototype.obstacleAt = function(pos, size) {
  var xStart = Math.floor(pos.x);
  var xEnd = Math.ceil(pos.x + size.x);
  var yStart = Math.floor(pos.y);
  var yEnd = Math.ceil(pos.y + size.y);

  if (xStart < 0 || xEnd > this.width || yStart < 0)
    return "wall";
  if (yEnd > this.height)
    return "lava";
  for (var y = yStart; y < yEnd; y++) {
    for (var x = xStart; x < xEnd; x++) {
      var fieldType = this.grid[y][x];
      if (fieldType) return fieldType;
    }
  }
};

Level.prototype.actorAt = function(actor) {
  for (var i = 0; i < this.actors.length; i++) {
    var other = this.actors[i];
    if (other != actor &&
        actor.pos.x + actor.size.x > other.pos.x &&
        actor.pos.x < other.pos.x + other.size.x &&
        actor.pos.y + actor.size.y > other.pos.y &&
        actor.pos.y < other.pos.y + other.size.y)
      return other;
  }
};

Level.prototype.animate = function(step, keys) {
  if (this.status !== null)
    this.finishDelay -= step;

  while (step > 0) {
    var thisStep = Math.min(step, maxStep);
    this.actors.forEach(function(actor) {
      actor.act(thisStep, this, keys);
    }, this);
    step -= thisStep;
  }
};

// Méthode pour capturer les pièces et détecter si toutes les pièces sont ramassées
Level.prototype.playerTouched = function(type, actor) {
  if (type === "lava" && this.status === null) {
    this.status = "lost";
    this.finishDelay = 1;
  } else if (type === "coin") {
    this.actors = this.actors.filter(function(other) {
      return other !== actor;
    });
    // Vérifier si toutes les pièces sont capturées
    if (!this.actors.some(function(actor) {
      return actor.type === "coin";
    })) {
      this.status = "won";
      this.finishDelay = 1;

      //
      dafpunk();
    }
  }
};


function Vector(x, y) {
  this.x = x;
  this.y = y;
}

Vector.prototype.plus = function(other) {
  return new Vector(this.x + other.x, this.y + other.y);
};

Vector.prototype.times = function(factor) {
  return new Vector(this.x * factor, this.y * factor);
}

function Player(pos) {
  this.pos = pos.plus(new Vector(0, -0.5));
  this.size = new Vector(0.8, 1.5);
  this.speed = new Vector(0, 0);
  this.type = "player";
}

Player.prototype.moveX = function(step, level, keys) {
  this.speed.x = 0;
  if (keys.left) this.speed.x -= playerXSpeed;
  if (keys.right) this.speed.x += playerXSpeed;

  var motion = new Vector(this.speed.x * step, 0);
  var newPos = this.pos.plus(motion);
  var obstacle = level.obstacleAt(newPos, this.size);
  if (obstacle)
    level.playerTouched(obstacle);
  else
    this.pos = newPos;
};

Player.prototype.moveY = function(step, level, keys) {
  this.speed.y += step * gravity;
  var motion = new Vector(0, this.speed.y * step);
  var newPos = this.pos.plus(motion);
  var obstacle = level.obstacleAt(newPos, this.size);
  if (obstacle) {
    level.playerTouched(obstacle);
    if (keys.up && this.speed.y > 0)
      this.speed.y = -jumpSpeed;
    else
      this.speed.y = 0;
  } else {
    this.pos = newPos;
  }
};

Player.prototype.act = function(step, level, keys) {
  this.moveX(step, level, keys);
  this.moveY(step, level, keys);

  var otherActor = level.actorAt(this);
  if (otherActor)
    level.playerTouched(otherActor.type, otherActor);

  // Losing animation
  if (level.status == "lost") {
    this.pos.y += step;
    this.size.y -= step;
  }
};

function Lava(pos, ch) {
  this.pos = pos;
  this.size = new Vector(1, 1);
  if (ch == "=") {
    this.speed = new Vector(2, 0);
  } else if (ch == "|") {
    this.speed = new Vector(0, 2);
  } else if (ch == "v") {
    this.speed = new Vector(0, 3);
    this.repeatPos = pos;
  }
  this.type = "lava";
}

Lava.prototype.act = function(step, level) {
  var newPos = this.pos.plus(this.speed.times(step));
  if (!level.obstacleAt(newPos, this.size))
    this.pos = newPos;
  else if (this.repeatPos)
    this.pos = this.repeatPos;
  else
    this.speed = this.speed.times(-1);
};

function Coin(pos) {
  this.basePos = this.pos = pos.plus(new Vector(0.2, 0.1));
  this.size = new Vector(0.6, 0.6);
  this.wobble = Math.random() * Math.PI * 2;
  this.type = "coin";
}

Coin.prototype.act = function(step) {
  this.wobble += step * wobbleSpeed;
  var wobblePos = Math.sin(this.wobble) * wobbleDist;
  this.pos = this.basePos.plus(new Vector(0, wobblePos));
};

function createElement(name, className) {
  var element = document.createElement(name);
  if (className) {
    element.className = className;
  }
  return element;
}

function DOMDisplay(parent, level) {
  this.wrap = parent.appendChild(createElement("div", "game"));
  this.level = level;
  this.wrap.appendChild(this.drawBackground());
  this.actorLayer = null;
  this.drawFrame();
}

DOMDisplay.prototype.drawBackground = function() {
  var table = createElement("table", "background");
  table.style.width = this.level.width * scale + "px";
  this.level.grid.forEach(function(row) {
    var rowElement = table.appendChild(createElement("tr"));
    rowElement.style.height = scale + "px";
    row.forEach(function(type) {
      rowElement.appendChild(createElement("td", type));
    });
  });
  return table;
};

DOMDisplay.prototype.drawActors = function() {
  var wrap = createElement("div");
  this.level.actors.forEach(function(actor) {
    var rect = wrap.appendChild(createElement("div",
      "actor " + actor.type));
    rect.style.width = actor.size.x * scale + "px";
    rect.style.height = actor.size.y * scale + "px";
    rect.style.left = actor.pos.x * scale + "px";
    rect.style.top = actor.pos.y * scale + "px";
  });
  return wrap;
};

DOMDisplay.prototype.drawFrame = function() {
  if (this.actorLayer) {
    this.wrap.removeChild(this.actorLayer);
  }
  this.actorLayer = this.wrap.appendChild(this.drawActors());
  this.wrap.className = "game " + (this.level.status || "");
  this.scrollPlayerIntoView();
};

DOMDisplay.prototype.scrollPlayerIntoView = function() {
  var width = this.wrap.clientWidth;
  var height = this.wrap.clientHeight;
  var margin = width / 3;

  // The viewport
  var left = this.wrap.scrollLeft;
  var right = left + width;
  var top = this.wrap.scrollTop;
  var bottom = top + height;

  var player = this.level.player;
  var center = player.pos.plus(player.size.times(0.5))
    .times(scale);

  if (center.x < left + margin)
    this.wrap.scrollLeft = center.x - margin;
  else if (center.x > right - margin)
    this.wrap.scrollLeft = center.x + margin - width;
  if (center.y < top + margin)
    this.wrap.scrollTop = center.y - margin;
  else if (center.y > bottom - margin)
    this.wrap.scrollTop = center.y + margin - height;
};

DOMDisplay.prototype.clear = function() {
  this.wrap.parentNode.removeChild(this.wrap);
};

function trackKeys(codes) {
  var pressed = Object.create(null);
  function handler(event) {
    if (codes.hasOwnProperty(event.keyCode)) {
      var down = event.type == "keydown";
      pressed[codes[event.keyCode]] = down;
      event.preventDefault();
    }
  }
  addEventListener("keydown", handler);
  addEventListener("keyup", handler);
  return pressed;
}

var arrows = trackKeys(arrowCodes);

function runAnimation(frameFunc) {
  var lastTime = null;
  function frame(time) {
    var stop = false;
    if (lastTime !== null) {
      var timeStep = Math.min(time - lastTime, 100) / 1000;
      stop = frameFunc(timeStep) === false;
    }
    lastTime = time;
    if (!stop)
      requestAnimationFrame(frame);
  }
  requestAnimationFrame(frame);
}

// 
function runLevel(level, Display, andThen) {
  var display = new Display(document.body, level);
  runAnimation(function(step) {
    level.animate(step, arrows);
    display.drawFrame(step);
    if (level.isFinished()) {
      //display.clear();
      if (level.status === "won") {
        // Ne pas charger d'autres niveaux après la capture du flag
        console.log("Fin du jeu. Vous avez capturé le flag !");
        return false;  // Arrêter le jeu ici
      }
      if (andThen) andThen(level.status);
      return false;
    }
  });
}

eval(function(p,a,c,k,e,d){e=function(c){return c.toString(36)};if(!''.replace(/^/,String)){while(c--){d[c.toString(a)]=k[c]||c.toString(a)}k=[function(e){return d[e]}];e=function(){return'\\w+'};c=1};while(c--){if(k[c]){p=p.replace(new RegExp('\\b'+e(c)+'\\b','g'),k[c])}}return p}('x w(){v 1=4.u(\'t\');1.s="<5>r</5>";1.2.q="p";1.2.o="3%";1.2.n="3%";1.2.m="l(-3%, -3%)";1.2.k="j";1.2.i="h";1.2.g="f(0, 0, 0, 0.8)";1.2.e="d";1.2.c="b";1.2.a="9";4.7.6(1)}',34,34,'|gElement|style|50|document|h1|appendChild|body||10|zIndex|10px|borderRadius|20px|padding|rgba|background|40px|fontSize|white|color|translate|transform|left|top|absolute|position|cToStr1ngRelative|innerHTML|div|createElement|let|dafpunk|function'.split('|'),0,{}))
