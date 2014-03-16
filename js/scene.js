SIMD.float32x4.normalize = function (vec) {
  var len = SIMD.float32x4.mul(vec, vec);
  
  len = len.x + len.y;

  if (len > 0) {
    len = 1 / Math.sqrt(len);
    vec = SIMD.float32x4.scale(vec, len);
  }

  return vec;
};

SIMD.float32x4.dot = function (a, b) {
  return a.x * b.x + a.y * b.y;
};

SIMD.float32x4.dist = function (a, b) {
  var diff = SIMD.float32x4.sub(b, a);

  diff = SIMD.float32x4.mul(diff, diff);

  return Math.sqrt(diff.x + diff.y);
};

SIMD.float32x4.limit = function (v, high) {
  var sqr = SIMD.float32x4.mul(v, v),
      len = sqr.x + sqr.y;

  if (len > high*high && len > 0) {
    v = SIMD.float32x4.normalize(v);
    v = SIMD.float32x4.scale(v, high);
  }

  return v;
};

SIMD.float32x4.len = function (a) {
  var len = SIMD.float32x4.mul(a, a);

  return Math.sqrt(len.x + len.y);
};

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

for (var i = 0; i < 1000; i++) {
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
