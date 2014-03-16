/** Init scene */
var canvas = document.querySelector('.viewport'),
    ctx = canvas.getContext('2d');

var WIDTH = window.innerWidth,
    HEIGHT = window.innerHeight;

canvas.width = WIDTH;
canvas.height = HEIGHT;

/** Create an instance of Path object */
var path = new Path();

/** Set path radius */
path.radius = 30;

/** Set path offset */
var offset = 60;

/** Define path points */
function setPoints() {
  'use strict';

  path.addPoint(offset, offset);
  path.addPoint(offset + 100, offset);
  path.addPoint(offset + 100, offset + 100);
  path.addPoint(WIDTH - offset - 100, offset + 100);
  path.addPoint(WIDTH - offset - 100, offset);
  path.addPoint(WIDTH - offset, offset);
  path.addPoint(WIDTH - offset, offset + 200);
  path.addPoint(WIDTH - offset - 500, offset + 200);
  path.addPoint(WIDTH - offset - 500, offset + 300);
  path.addPoint(WIDTH - offset, offset + 300);
  path.addPoint(WIDTH - offset, HEIGHT - offset);
  path.addPoint(offset, HEIGHT - offset);
  path.addPoint(offset, offset);
}

/** Add points to the path */
setPoints();

/** Define vehicles list and push number of Vehicle object instances passing random location and mass */
var vehicles = [];

for (var i = 0; i < 100; i++) {
  var mass = Math.random() * (5 - 1) + 1;

  var vehicle = new Vehicle(SIMD.float32x4(WIDTH * Math.random(), HEIGHT * Math.random(), 0, 0), mass);

  vehicles.push(vehicle);
}

/** Specify what to draw */
function draw() {
  'use strict';

  /** Clear canvas */
  ctx.fillStyle = '#eee';
  ctx.fillRect(0, 0, WIDTH, HEIGHT);

  /** Render the path */
  path.display();

  /**
   * Loop through each vehicle passing vehicles list and path to calculate things
   * Update and render vehicle
   */
  for (var i = 0; i < vehicles.length; i++) {
    vehicles[i].applyBehaviors(vehicles, path);
    vehicles[i].run();
  }

  requestAnimationFrame(draw);
}

/** Start simulation */
draw();

/** Handle things appropriately onresize */
function onResize() {
  'use strict';

  WIDTH = window.innerWidth;
  HEIGHT = window.innerHeight;

  canvas.width = WIDTH;
  canvas.height = HEIGHT;

  path.points = [];
  setPoints();
}

window.addEventListener('resize', onResize, false);
