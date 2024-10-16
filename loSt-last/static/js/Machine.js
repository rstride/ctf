$(document).ready(function() {
  // Canvas setup
  var c = document.getElementById("myCanvas");
  c.width = 800;
  c.height = 486;
  var ctx = c.getContext("2d");

  ctx.imageSmoothingEnabled = false;
  ctx.mozImageSmoothingEnabled = false;
  ctx.webkitImageSmoothingEnabled = false;
  ctx.msImageSmoothingEnabled = false;

  // Load images
  var image = new Image();
  image.src = '/static/images/background09.png';

  var tileset = new Image();
  tileset.src = '/static/images/Tileset2.png';
  
  var personnageImage = new Image();
  personnageImage.src = '/static/images/personnage.png';
  
  // Nouvelle image à afficher
  var newImage = new Image();
  newImage.src = '/static/images/flag.png'; // Assurez-vous que ce chemin est correct
  
  var limitY = 400; 
  // Fonction pour vérifier si l'image doit être affichée
  // 
  function shouldDisplayImage() {
    return personnage.y < 200;
  }

    // Game state
  var tilemapData;
  var top = 0;
  var left = 0;

  var personnage = {
    x: left,
    y: 380,
    width: 220,
    height: 220,
    
    // Nouvelle zone de collision, plus petite que l'image du personnage
    collisionBox: {
      xOffset: 20,   // Décalage horizontal par rapport au personnage
      yOffset: 20,   // Décalage vertical par rapport au personnage
      width: 32,     // Largeur de la zone de collision
      height: 32     // Hauteur de la zone de collision
    }
  };

  // Socket.IO setup
  const socket = io();

  socket.on('connect', () => {
    console.log('Connected to server');
    socket.emit('request_update');
  });

  socket.on('tilemap_update', (data) => {
    console.log('Received tilemap update:', data);
    updateTilemap(data);
  });

  // Tilemap functions
  function updateTilemap(data) {
    tilemapData = data;
    draw();  // Redraw the entire game state with the new tilemap data
  }

  function loadTilemapData() {
    return fetch('/static/data/tilemap.json')
      .then(response => {
        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }
        return response.json();
      })
      .then(data => {
        console.log('Parsed data:', data);
        updateTilemap(data);
        return data;
      })
      .catch(error => {
        console.error('Error loading tilemap:', error);
      });
  }

  function afficherTile(tileIndex, j, i) {
    var tilesetCols = 7;
    var tilesetX = (tileIndex % tilesetCols) * tilemapData.tileSize;
    var tilesetY = Math.floor(tileIndex / tilesetCols) * tilemapData.tileSize;

    ctx.drawImage(
      tileset, 
      tilesetX, tilesetY, tilemapData.tileSize, tilemapData.tileSize,
      left + j * (tilemapData.tileSize * tilemapData.tileScale + tilemapData.space), 
      top + i * (tilemapData.tileSize * tilemapData.tileScale + tilemapData.space),
      tilemapData.tileSize * tilemapData.tileScale, 
      tilemapData.tileSize * tilemapData.tileScale
    );
  }

  function drawMap() {
    for (var i = 0; i < tilemapData.map.length; i++) {
      for (var j = 0; j < tilemapData.map[i].length; j++) {
        var tileIndex = tilemapData.map[i][j];
        afficherTile(tileIndex, j, i);
      }
    }
  }

  // Character functions
  function afficherPersonnage() {
    // Dessiner le personnage
    ctx.drawImage(personnageImage, personnage.x, personnage.y, personnage.width, personnage.height);
    
    // Dessiner le rectangle de collision plus petit autour du personnage
    ctx.strokeStyle = "red";  // Couleur du rectangle de collision
    ctx.lineWidth = 2;  // Largeur de la ligne du rectangle
    
    // Dessiner la zone de collision en utilisant collisionBox
    //ctx.strokeRect(
    //  personnage.x + personnage.collisionBox.xOffset, 
    //  personnage.y + personnage.collisionBox.yOffset, 
    //  personnage.collisionBox.width, 
    //  personnage.collisionBox.height
    //);
  }

  // Collision detection function
  function peutBougerVers(nouvelleX, nouvelleY) {
    var tileSizeScaled = tilemapData.tileSize * tilemapData.tileScale + tilemapData.space;

    // Coordonnées de la zone de collision (rectangle plus petit)
    var collisionX = nouvelleX + personnage.collisionBox.xOffset;
    var collisionY = nouvelleY + personnage.collisionBox.yOffset;
    var collisionWidth = personnage.collisionBox.width;
    var collisionHeight = personnage.collisionBox.height;

    // Vérification des 4 coins de la zone de collision
    var coins = [
      { x: collisionX, y: collisionY },  // coin supérieur gauche
      { x: collisionX + collisionWidth, y: collisionY },  // coin supérieur droit
      { x: collisionX, y: collisionY + collisionHeight },  // coin inférieur gauche
      { x: collisionX + collisionWidth, y: collisionY + collisionHeight }  // coin inférieur droit
    ];

    for (var i = 0; i < coins.length; i++) {
      var col = Math.floor((coins[i].x - left) / tileSizeScaled);
      var row = Math.floor((coins[i].y - top) / tileSizeScaled);

      // Vérifie si la case correspond à une tuile non traversable
      if (!tilemapData.traversableTiles.includes(tilemapData.map[row][col])) {
        return false;  // Collision détectée
      }
    }
    return true;  // Aucun coin de la zone de collision n'est sur une tuile non traversable
  }

  // Main drawing function
  function draw() {
    ctx.clearRect(0, 0, c.width, c.height);
    ctx.drawImage(image, 0, 0);
    drawMap();
    afficherPersonnage();

    //newImage
    if (shouldDisplayImage()) {
      // Calculer les coordonnées pour centrer l'image
      var imageX = (c.width - newImage.width) / 2;
      var imageY = (c.height - newImage.height) / 2;
      ctx.drawImage(newImage, imageX, imageY);
    }

  }

  // Game initialization
  function initGame() {
    loadTilemapData().then(() => {
      tileset.onload = function() {
        personnageImage.onload = function() {
          draw();
        };
      };

      if (tileset.complete && personnageImage.complete) {
        draw();
      }

      // Keyboard controls
      window.addEventListener('keydown', function(event) {
        const key = event.key;
        const step = tilemapData.tileSize * tilemapData.tileScale + tilemapData.space;
        let nouvelleX = personnage.x;
        let nouvelleY = personnage.y;

        
        if (key === 'ArrowUp') {
          nouvelleY -= step;
        } else if (key === 'ArrowDown') {
          nouvelleY += step;
        } else if (key === 'ArrowLeft') {
          nouvelleX -= step;
        } else if (key === 'ArrowRight') {
          nouvelleX += step;
        }

        if (peutBougerVers(nouvelleX, nouvelleY)) {
          personnage.x = nouvelleX;
          personnage.y = nouvelleY;
        }

        draw();
      });

    });
  }

  // Start the game
  initGame();

  // Terminal WebSocket handling (if needed)
  var term = new Terminal();
  term.open(document.getElementById('terminal'));

  var ws = new WebSocket('ws://' + location.host + '/pty');
  ws.onopen = function() {
    console.log('WebSocket connection established');
  };

  ws.onmessage = function(event) {
    term.write(event.data);
  };

  term.onData(function(data) {
    ws.send(data);
  });
});