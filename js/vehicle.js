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

  predict = vec2.create();
  dir = vec2.create();
  a = vec2.create();
  b = vec2.create();
  ap = vec2.create();
  ab = vec2.create();
  clonea = vec2.create();
  predictLoc = vec2.create();
  followVec = vec2.create();
  accelerationVec = vec2.create();
  steerVec = vec2.create();
  diffVec = vec2.create();

  this.location = location;
  this.initMass = mass;
  this.mass = mass;
  this.maxspeed = 4 * 1 / this.mass;
  this.maxforce = 1 / (this.mass * this.maxspeed);
  this.radius = this.mass * 2;
  this.acceleration = vec2.create();
  this.velocity = vec2.fromValues(this.maxspeed, 0);
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
    vec2.scale(f, f, 2);
    vec2.scale(s, s, 4);

    /** Calculate the average force */
    var forces = vec2.add(vec2.create(), f, s);

    vec2.scale(forces, forces, 1/this.mass);

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
    vec2.add(this.acceleration, this.acceleration, force);
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
    predict.set(this.velocity);

    vec2.normalize(predict, predict);
    vec2.scale(predict, predict, 25);

    predictLoc.set([0, 0]);

    vec2.add(predictLoc, predictLoc, this.location);
    vec2.add(predictLoc, predictLoc, predict);

    /** Define things */
    var target = null;
    var worldRecord = 1000000; // Will be updated with shortest distance to path. Start with a very high value.

    /** Loop through each point of the path */
    for (var i = 0, len = path.points.length; i < len; i++) {

      /** Get current and next point of the path */
      a.set(path.points[i]);
      b.set(path.points[(i + 1) % path.points.length]);

      /** Calculate a normal point */
      var normalPoint = this.getNormalPoint(predictLoc, a, b);

      /** Calculate direction towards the next point */
      dir.set(b);

      vec2.sub(dir, dir, a);

      /**
       * Set a normal point to the end of the current path segment and
       * recalculate direction if the vehicle is not within it
       */
      if (normalPoint[0] < Math.min(a[0], b[0]) || normalPoint[0] > Math.max(a[0], b[0]) ||
          normalPoint[1] < Math.min(a[1], b[1]) || normalPoint[1] > Math.max(a[1], b[1])) {

        normalPoint.set(b);

        a.set(path.points[(i + 1) % path.points.length]);
        b.set(path.points[(i + 2) % path.points.length]);

        dir.set(b);
        vec2.sub(dir, dir, a);
      }

      /** Get a distance between future location and normal point */
      var d = vec2.dist(predictLoc, normalPoint);

      /** Calculate steering target for current path segment if the vehicle is going in segment direction */
      if (d < worldRecord) {
        worldRecord = d;
        target = normalPoint;

        vec2.normalize(dir, dir);
        vec2.scale(dir, dir, 25);
        vec2.add(target, target, dir);
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
      followVec.set([0, 0]);

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
   * @returns {Array} Normal point vec2
   */
  this.getNormalPoint = function (p, a, b) {
    ap.set(p);
    ab.set(b);

    /** Perform scalar projection calculations */
    vec2.sub(ap, ap, a);
    vec2.sub(ab, ab, a);
    vec2.normalize(ab, ab);
    vec2.scale(ab, ab, vec2.dot(ap, ab));

    clonea.set(a)

    return vec2.add(vec2.create(), clonea, ab);
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
    vec2.add(this.velocity, this.velocity, this.acceleration);
    vec2.limit(this.velocity, this.velocity, this.maxspeed);
    vec2.add(this.location, this.location, this.velocity);

    accelerationVec.set([0, 0]);

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
    vec2.sub(target, target, this.location);

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

    steerVec.set([0, 0]);
    steer = steerVec;

    /** Loop through each vehicle */
    for (var i = 0, len = boids.length; i < len; i++) {
      var other = boids[i],
          d = this.location;

      /** Get distance between current and other vehicle */
      d = vec2.dist(d, other.location);

      /** Do stuff if the vehicle is not current one and the other one is within specified distance */
      if ((d > 0) && (d < desiredSeparation)) {
        var diff;

        diffVec.set([0, 0]);

        diff = vec2.sub(diffVec, this.location, other.location); // Point away from the vehicle

        vec2.normalize(diff, diff);
        vec2.scale(diff, diff, 1 / d); // The closer the other vehicle is, the more current one will flee and vice versa
        vec2.add(steer, steer, diff);

        count++;
      }
    }

    /** Get average steering vector */
    if (count > 0) {
      vec2.scale(steer, steer, 1 / count);
    }

    /** Bounce! Steer away and draw bounce effect */
    if (vec2.len(steer) > 0) {
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

    vec2.normalize(target, target);
    vec2.scale(target, target, this.maxspeed);

    steer = target;

    vec2.sub(steer, steer, this.velocity);
    vec2.limit(steer, steer, this.maxforce);

    return steer;
  };

  /**
   * Check if vehicle is going out of the scene
   *
   * @function
   * @memberOf Vehicle
   */
  this.borders = function() {
    if (this.location[0] < -this.radius) {
      this.location[0] = WIDTH + this.radius;
    }
    if (this.location[0] > WIDTH + this.radius) {
      this.location[0] = -this.radius;
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
    ctx.arc(this.location[0], this.location[1], this.radius, 0, 2 * Math.PI, false);
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
    ctx.arc(this.location[0], this.location[1], this.radius+5, 0, 2 * Math.PI, false);
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
