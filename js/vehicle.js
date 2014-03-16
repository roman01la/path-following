/**
 * Vehicle object
 *
 * @name Vehicle
 * @constructor
 *
 * @param {Array} location Location of the vehicle
 * @param {Number} mass Mass of the vehicle
 *
 * @property {Array} location Location of the vehicle
 * @property {Number} mass Mass of the vehicle
 * @property {Number} initMass Initial mass of the vehicle
 * @property {Number} maxspeed Maximum speed of the vehicle
 * @property {Number} maxforce Steering ability of the vehicle
 * @property {Number} radius The size of the vehicle
 * @property {Array} acceleration Acceleration of the vehicle
 * @property {Array} velocity Velocity of the vehicle
 * @property {Number} bouncesNum Number of times vehicle bounced from others
 * @property {Boolean} isBouncing Determine if vehicle is bouncing
 */
var Vehicle = function (location, mass) {
  'use strict';

  var predict, normalPoint, dir,
      a, b, ap, ab, clonea, predictLoc, followVec,
      accelerationVec, steerVec, diffVec;

  predict = SIMD.float32x4.zero();
  dir = SIMD.float32x4.zero();
  a = SIMD.float32x4.zero();
  b = SIMD.float32x4.zero();
  ap = SIMD.float32x4.zero();
  ab = SIMD.float32x4.zero();
  clonea = SIMD.float32x4.zero();
  predictLoc = SIMD.float32x4.zero();
  followVec = SIMD.float32x4.zero();
  accelerationVec = SIMD.float32x4.zero();
  steerVec = SIMD.float32x4.zero();
  diffVec = SIMD.float32x4.zero();

  this.location = location;
  this.initMass = mass;
  this.mass = mass;
  this.maxspeed = 4 * 1 / this.mass;
  this.maxforce = 1 / (this.mass * this.maxspeed);
  this.radius = this.mass * 2;
  this.acceleration = SIMD.float32x4.zero();
  this.velocity = SIMD.float32x4(this.maxspeed, 0, 0, 0);
  this.bouncesNum = 0;
  this.isBouncing = false;

  /**
   * Manage behaviors
   *
   * @function
   * @memberOf Vehicle
   *
   * @param {Array} vehicles A list of vehicles
   * @param {Object} path Instance of Path object including path points
   */
  this.applyBehaviors = function (vehicles, path) {
    var f = this.follow(path);
    var s = this.separate(vehicles);

    /** Increase vehicle's max speed, until it reached value of 3, if it bounced more than 300 times */
    if (this.bouncesNum >= 300 && this.bouncesNum % 100 === 0) {
      if (this.maxspeed < 3) {
        this.maxspeed += 0.1 / this.mass;
      }
    }

    /** Scale up forces to produce stronger impact */
    f = SIMD.float32x4.scale(f, 2);
    s = SIMD.float32x4.scale(s, 4);

    /** Calculate the average force */
    var forces = SIMD.float32x4.add(f, s);

    forces = SIMD.float32x4.scale(forces, 1 / this.mass);

    /** Apply force */
    this.applyForce(forces);
  };

  /**
   * Apply force on the vehicle
   *
   * @function
   * @memberOf Vehicle
   *
   * @param {Array} force A force or an average force to apply on the vehicle
   */
  this.applyForce = function (force) {
    this.acceleration = SIMD.float32x4.add(this.acceleration, force);
  };

  /**
   * Run Vehicle loop
   *
   * @function
   * @memberOf Vehicle
   */
  this.run = function() {
    this.update();
    this.borders();
    this.render();
  };

  /**
   * Implement Craig Reynolds' path following algorithm
   * http://www.red3d.com/cwr/steer/PathFollow.html
   *
   * @function
   * @memberOf Vehicle
   *
   * @param {Object} path Instance of Path object including path points
   *
   * @returns {Array} Path following behavior
   */
  this.follow = function (path) {

    /** Predict future location */
    predict = SIMD.float32x4.withX(predict, this.velocity.x);
    predict = SIMD.float32x4.withY(predict, this.velocity.y);

    predict = SIMD.float32x4.normalize(predict);
    predict = SIMD.float32x4.scale(predict, 25);

    predictLoc = SIMD.float32x4.zero();

    predictLoc = SIMD.float32x4.add(predictLoc, this.location);
    predictLoc = SIMD.float32x4.add(predictLoc, predict);

    /** Define things */
    var target = null;
    var worldRecord = 1000000; // Will be updated with shortest distance to path. Start with a very high value.

    /** Loop through each point of the path */
    for (var i = 0, len = path.points.length; i < len; i++) {
      var bpoint = path.points[(i + 1) % path.points.length];

      /** Get current and next point of the path */
      a = SIMD.float32x4.withX(a, path.points[i].x);
      a = SIMD.float32x4.withY(a, path.points[i].y);
      b = SIMD.float32x4.withX(b, bpoint.x);
      b = SIMD.float32x4.withY(b, bpoint.y);

      /** Calculate a normal point */
      var normalPoint = this.getNormalPoint(predictLoc, a, b);

      /** Calculate direction towards the next point */
      dir = SIMD.float32x4.withX(dir, b.x);
      dir = SIMD.float32x4.withY(dir, b.y);

      dir = SIMD.float32x4.sub(dir, a);

      /**
       * Set a normal point to the end of the current path segment and
       * recalculate direction if the vehicle is not within it
       */
      if (normalPoint.x < Math.min(a.x, b.x) || normalPoint.x > Math.max(a.x, b.x) ||
          normalPoint.y < Math.min(a.y, b.y) || normalPoint.y > Math.max(a.y, b.y)) {

        var apoint = path.points[(i + 1) % path.points.length],
            bpoint = path.points[(i + 2) % path.points.length];

        normalPoint = SIMD.float32x4.withX(normalPoint, b.x);
        normalPoint = SIMD.float32x4.withY(normalPoint, b.y);

        a = SIMD.float32x4.withX(a, apoint.x);
        a = SIMD.float32x4.withY(a, apoint.y);
        b = SIMD.float32x4.withX(b, bpoint.x);
        b = SIMD.float32x4.withY(b, bpoint.y);

        dir = SIMD.float32x4.withX(dir, b.x);
        dir = SIMD.float32x4.withY(dir, b.y);
        dir = SIMD.float32x4.sub(dir, a);
      }

      /** Get a distance between future location and normal point */
      var d = SIMD.float32x4.dist(predictLoc, normalPoint);

      /** Calculate steering target for current path segment if the vehicle is going in segment direction */
      if (d < worldRecord) {
        worldRecord = d;
        target = normalPoint;

        dir = SIMD.float32x4.normalize(dir);
        dir = SIMD.float32x4.scale(dir, 25);
        target = SIMD.float32x4.add(target, dir);
      }
    }

    /**
     * Steer if the vehicle is out of the 1/5 of the path's radius
     * Do not steer otherwise
     *
     * Using a part of path's radius creates kind of non-straightforward movement
     * Instead of "in tube" movement when object bounces from path edges
     */
    if (worldRecord > path.radius / 5) {
      return this.seek(target);
    } else {
      followVec = SIMD.float32x4.zero();

      return followVec;
    }
  };

  /**
   * Find normal point of the future location on current path segment
   *
   * @function
   * @memberOf Vehicle
   *
   * @param {Array} p Future location of the vehicle
   * @param {Array} a Start point of the path segment
   * @param {Array} b End point of the path segment
   *
   * @returns {Array} Normal point float32x4
   */
  this.getNormalPoint = function (p, a, b) {
    ap = SIMD.float32x4.withX(ap, p.x);
    ap = SIMD.float32x4.withY(ap, p.y);
    ab = SIMD.float32x4.withX(ab, b.x);
    ab = SIMD.float32x4.withY(ab, b.y);

    /** Perform scalar projection calculations */
    ap = SIMD.float32x4.sub(ap, a);
    ab = SIMD.float32x4.sub(ab, a);
    ab = SIMD.float32x4.normalize(ab);
    ab = SIMD.float32x4.scale(ab, SIMD.float32x4.dot(ap, ab));

    clonea = SIMD.float32x4.withX(clonea, a.x);
    clonea = SIMD.float32x4.withY(clonea, a.y);

    return SIMD.float32x4.add(clonea, ab);
  };

  /**
   * Update vehicle's location
   *
   * @function
   * @memberOf Vehicle
   */
  this.update = function() {

    /**
     * New location = current location + (velocity + acceleration) limited by maximum speed
     * Reset acceleration to avoid permanent increasing
     */
    this.velocity = SIMD.float32x4.add(this.velocity, this.acceleration);
    this.velocity = SIMD.float32x4.limit(this.velocity, this.maxspeed);
    this.location = SIMD.float32x4.add(this.location, this.velocity);

    accelerationVec = SIMD.float32x4.zero();

    this.acceleration = accelerationVec;
  };

  /**
   * Produce path following behavior
   *
   * @function
   * @memberOf Vehicle
   *
   * @param {Array} target Point on the path where vehicle is steering to
   *
   * @returns {Array} Path following behavior
   */
  this.seek = function (target) {
    target = SIMD.float32x4.sub(target, this.location);

    return this.steer(target);
  };

  /**
   * Check for nearby vehicles and produce steering away behavior
   *
   * @function
   * @memberOf Vehicle
   *
   * @param {Array} boids A list of vehicles
   *
   * @returns {Array} Steering away/bouncing off behavior
   */
  this.separate = function (boids) {
    var desiredSeparation = this.radius * 2 + 2,
        count = 0,
        steer;

    steerVec = SIMD.float32x4.zero();
    steer = steerVec;

    /** Loop through each vehicle */
    for (var i = 0, len = boids.length; i < len; i++) {
      var other = boids[i],
          d = this.location;

      /** Get distance between current and other vehicle */
      d = SIMD.float32x4.dist(d, other.location);

      /** Do stuff if the vehicle is not current one and the other one is within specified distance */
      if ((d > 0) && (d < desiredSeparation)) {
        var diff;

        diffVec = SIMD.float32x4.zero();

        diff = SIMD.float32x4.sub(this.location, other.location); // Point away from the vehicle

        diff = SIMD.float32x4.normalize(diff);
        diff = SIMD.float32x4.scale(diff, 1 / d); // The closer the other vehicle is, the more current one will flee and vice versa
        steer = SIMD.float32x4.add(steer, diff);

        count++;
      }
    }

    /** Get average steering vector */
    if (count > 0) {
      steer = SIMD.float32x4.scale(steer, 1 / count);
    }

    /** Bounce! Steer away and draw bounce effect */
    if (SIMD.float32x4.len(steer) > 0) {
      this.isBouncing = true;
      this.drawBounce();

      this.steer(steer);
    }

    /** Apply bouncing color */
    this.applyColor();

    return steer;
  };

  /**
   * Implement Craig Reynolds' steering algorithm
   *
   * @function
   * @memberOf Vehicle
   *
   * @param {Array} target Point on the path or vector where vehicle is steering to
   *
   * @returns {Array} Steering behavior
   */
  this.steer = function (target) {
    var steer;

    target = SIMD.float32x4.normalize(target);
    target = SIMD.float32x4.scale(target, this.maxspeed);

    steer = target;

    steer = SIMD.float32x4.sub(steer, this.velocity);
    steer = SIMD.float32x4.limit(steer, this.maxforce);

    return steer;
  };

  /**
   * Check if vehicle is going out of the scene
   *
   * @function
   * @memberOf Vehicle
   */
  this.borders = function() {
    if (this.location.x < -this.radius) {
      this.location.x = WIDTH + this.radius;
    }
    if (this.location.x > WIDTH + this.radius) {
      this.location.x = -this.radius;
    }
  };

  /**
   * Render vehicle to the scene
   *
   * @function
   * @memberOf Vehicle
   */
  this.render = function() {
    ctx.fillStyle = this.style || '#000';

    ctx.beginPath();
    ctx.arc(this.location.x, this.location.y, this.radius, 0, 2 * Math.PI, false);
    ctx.closePath();

    ctx.fill();
  };

  /**
   * Draw bounce effect
   *
   * @function
   * @memberOf Vehicle
   */
  this.drawBounce = function() {
    ctx.strokeStyle = '#ff0000';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.arc(this.location.x, this.location.y, this.radius + 5, 0, 2 * Math.PI, false);
    ctx.closePath();
    ctx.stroke();

    this.bouncesNum++;
  };

  /**
   * Apply different color when bouncing
   *
   * @function
   * @memberOf Vehicle
   */
  this.applyColor = function() {
    if (this.bouncesNum < 500 && this.isBouncing) {
      this.style = '#ff0000';
    } else if (this.bouncesNum >= 500) {
      this.style = '#00E1FF';
    } else {
      this.style = '#000';
    }

    this.isBouncing = false;
  };
};
