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