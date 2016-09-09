/*jslint browser: true*/
/*global Tangram, gui */
map = (function () {
    'use strict';

    var map_start_location = [41.4345, 2.1209, 12]; // Barcelona

    /*** URL parsing ***/

    // leaflet-style URL hash pattern:
    // #[zoom],[lat],[lng]
    var url_hash = window.location.hash.slice(1, window.location.hash.length).split('/');

    if (url_hash.length == 3) {
        map_start_location = [url_hash[1],url_hash[2], url_hash[0]];
        // convert from strings
        map_start_location = map_start_location.map(Number);
    }

    /*** Map ***/

    var map = L.map('map',
        {"keyboardZoomOffset" : .05,
        minZoom: 8,
        maxZoom: 16,
        maxBounds: new L.LatLngBounds(new L.LatLng(40.421087468828297,-0.097789200457408), new L.LatLng(42.929122686256072,3.458340585791309)),
        scrollWheelZoom: false
        }
    );

    L.control.zoomLabel().addTo(map);

    var layer = Tangram.leafletLayer({
        scene: 'scene.yaml',
        attribution: '<a href="https://mapzen.com/tangram" target="_blank">Tangram</a> | <a href="https://mapzen.com/" target="_blank">Mapzen</a>'
    });

    window.layer = layer;
    var scene = layer.scene;
    window.scene = scene;

    // setView expects format ([lat, long], zoom)
    map.setView(map_start_location.slice(0, 3), map_start_location[2]);

    var hash = new L.Hash(map);

    window.toponimia = L.tileLayer('http://betaserver.icgc.cat/tileserver2/tileserver.php?/toponimia_8-18/{z}/{x}/{y}.png', {
      renderer: L.canvas(),
      maxZoom : 13,
      minZoom : 8,
    });

    window.toponimia_14_18 = L.tileLayer('http://betaserver.icgc.cat/tileserver2/tileserver.php?/topon_reben_invers_12a18/{z}/{x}/{y}.png', {
      renderer: L.canvas(),
      maxZoom : 18,
      minZoom : 14
    });

    window.hibridatotal = L.tileLayer('http://betaserver.icgc.cat/tileserver2/tileserver.php?/Hibrida_total/{z}/{x}/{y}.png', {
      renderer: L.canvas(),
      attribution: 'Tiles and map data courtesy of <a href="http://www.icgc.cat/" target="_blank">Institut Cartogràfic i Geològic de Catalunya</a>'
    });

    window.vegetacio = L.tileLayer.wms('http://www.opengis.uab.es/cgi-bin/MCSC/MiraMon.cgi', {
        layers: 'mcsc-catalunya',
        format: 'image/png',
        transparent: true,
        opacity: 0.5,
        attribution: 'Tiles courtesy of <a href="http://www.creaf.cat/" target="_blank">CREAF</a>'
    });

    window.allaus = L.tileLayer.wms('http://siurana.icgc.cat/geoserver/nivoallaus/wms', {
        layers: 'enquestes,observacions',
        format: 'image/png',
        transparent: true,
        attribution: 'Tiles courtesy of <a href="http://www.icgc.cat/" target="_blank">Institut Cartogràfic i Geològic de Catalunya</a>'
    });

    /***** Render loop *****/

    window.addEventListener('load', function () {
        // Scene initialized
        layer.on('init', function() {
        });
        layer.addTo(map);
        window.hibridatotal.addTo(map);


        var style = {
        "clickable": true,
        "color": "#00D",
        "fillColor": "#00D",
        "weight": 1.0,
        "opacity": 0.3,
        "fillOpacity": 0.2
    };
    var hoverStyle = {
        "fillOpacity": 0.5
    };

    });

    return map;

}());

var canvas = document.getElementById('kcanvas');

canvas.onselectstart = function(){ return false; };
canvas.onselectend = function(){ console.log('done'); };
var x = 0;
var y = 0;
var lastX;
var lastY;
var colorHex = "ffffff";
var color = {r: 100, g: 100, b: 100};
var alpha = .02;


function updateColor(val) {
    valRGB = hexToRgb(val);
    color = {r: valRGB.r, g: valRGB.g, b: valRGB.b};
    document.getElementById("picker").value = val;
}
function setColor(val) {
    document.getElementById('picker').jscolor.fromString(val);
    updateColor(val);
}
function hexToRgb(hex) {
    var result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
    return result ? {
        r: parseInt(result[1], 16),
        g: parseInt(result[2], 16),
        b: parseInt(result[3], 16)
    } : null;
}

function draw(x,y,w,r,g,b,a){
        var gradient = ctx.createRadialGradient(x, y, 0, x, y, w);
        gradient.addColorStop(0, 'rgba('+r+', '+g+', '+b+', '+a+')');
        gradient.addColorStop(1, 'rgba('+r+', '+g+', '+b+', 0)');

        ctx.beginPath();
        ctx.arc(x, y, w, 0, 2 * Math.PI);
        ctx.fillStyle = gradient;
        ctx.fill();
        ctx.closePath();
};

var ctx = canvas.getContext('2d');
var w = 20;
var radius = w/2;
var drawing = false;

canvas.addEventListener("mousedown", function(e){
    drawing = true;
    lastX = e.offsetX;
    lastY = e.offsetY;
    draw(lastX, lastY,w,color.r,color.g,color.b, alpha);
});
canvas.addEventListener("mouseup", function(){
    drawing = false;
    scene.loadTextures();
    saveCanvas();
});

function saveCanvas() {
    // save current state in case of undo
    URL.revokeObjectURL(lastCanvas.url);
    canvas.toBlob(function(blob) {
        lastCanvas.blob = blob;
        lastCanvas.url = URL.createObjectURL(blob);
    });
}
// based on http://stackoverflow.com/a/17359298/738675
canvas.addEventListener("mousemove", function(e){
    if(drawing == true){
        x = e.offsetX;
        y = e.offsetY;
        // the distance the mouse has moved since last mousemove event
        var dis = Math.sqrt(Math.pow(lastX-x, 2)+Math.pow(lastY-y, 2));

        // for each pixel distance, draw a circle on the line connecting the two points
        // to get a continous line.
        for (i=0;i<dis;i+=1) {
            var s = i/dis;
            draw(lastX*s + x*(1-s), lastY*s + y*(1-s),w,color.r,color.g,color.b, alpha);
        }
        lastX = x;
        lastY = y;
        scene.loadTextures();
    };
});

updateColor(document.getElementById("picker").value);

// fill canvas with white
function clearCanvas() {
    ctx.beginPath();
    ctx.rect(0, 0, canvas.width, canvas.height);
    ctx.fillStyle = "white";
    ctx.fill();
}
clearCanvas();
var lastCanvas = {url: null};

function updateMap(){
    scene.loadTextures();
}

function clearMap(){
  document.getElementById('toponimia').checked = true;
  document.getElementById('hibrida').checked = true;
  document.getElementById('allaus').checked = false;
  document.getElementById('vegetacio').checked = false;
}

window.onload = function() {
        // subscribe to Tangram's published view_complete event
    scene.subscribe({
        // trigger promise resolution
        view_complete: function () {
                // console.log('frame1 view_complete triggered');
                // viewCompleteResolve();
            },
        warning: function(e) {
            // console.log('frame1 scene warning:', e);
            }
    });
    // init first undo
    saveCanvas();

    clearMap();

    //para activar la toponimia de inicio
    toggleToponimia();


    var inputImg = document.getElementById('imgsphere');
    inputImg.onchange = function(){
      loadCanvas(this);
    }

    var inputToponimia = document.getElementById('toponimia');
    inputToponimia.addEventListener("click", function(e){
      toggleToponimia();
    });

    var inputHibrida = document.getElementById('hibrida');
    inputHibrida.addEventListener("click", function(e){
      toggleHibrida(e, this);
    });

    var inputAllaus = document.getElementById('allaus');
    inputAllaus.addEventListener("click", function(e){
      toggleAllaus();
    });

    var inputVegetacio = document.getElementById('vegetacio');
    inputVegetacio.addEventListener("click", function(e){
      toggleVegetacio();
    });

    document.getElementById('default_style').click();
}

function exportCanvas() {
  saveAs(lastCanvas.blob, 'mapa_llums.png');
  /*
    window.open(
      lastCanvas.url,
      '_blank' // <- This is what makes it open in a new window.
    );
    */
}

function updateWidth(val) {
    w = val;
    document.getElementById("width").value = val;
}

function updateAlpha(val) {
    alpha = val;
    document.getElementById("alpha").value = val;
}

function loadCanvas(input){
  if (input.files && input.files[0]) {
    var reader = new FileReader();
    reader.onload = function (e) {
      loadImage(e.target.result);
    }
    reader.readAsDataURL(input.files[0]);
  }
}

function loadImage(src){
  clearCanvas();
  var img = new Image();
  img.onload = function(){
    ctx.drawImage(img, 0, 0, 256, 256);
    updateMap();
  }
  img.src = src;
  saveCanvas();
}

function toggleHibrida(evt, input){
  if(map.hasLayer( hibridatotal ) ){
      map.removeLayer(hibridatotal);
  }else{
    map.addLayer(hibridatotal);
  }
}

function toggleToponimia(){
  if(map.hasLayer( toponimia ) ){
    map.removeLayer(toponimia);
    map.removeLayer(toponimia_14_18);
  }else{
    map.addLayer(toponimia);
    map.addLayer(toponimia_14_18);
  }
}

function toggleAllaus(){
  if(map.hasLayer( allaus ) ){
      map.removeLayer(allaus);
  }else{
    map.addLayer(allaus);
  }
}

function toggleVegetacio(){
  if(map.hasLayer( vegetacio ) ){
      map.removeLayer(vegetacio);
  }else{
    map.addLayer(vegetacio);
  }
}

function captureMap(){
  scene.screenshot().then(function(screenshot) {
    saveAs(screenshot.blob, 'captura_mapa.png');
  });
}
