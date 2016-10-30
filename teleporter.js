/*
  The function we're trying to analyze:
    function foo(r0, r1) {
      if (r0 === 0) {
        return (r1 + 1) % 32768
      } else if (r1 === 0) {
        return foo(r0 - 1, r7)
      } else {
        return foo(r0 - 1, foo(r0, r1 - 1))
      }
    }

  Depending on r7, every foo(n, m) "reduces" to an ungodly number of nested
  foo(n-1, foo(n-1, foo(n-1, ...))), which in turn "reduces" even further. It
  just isn't tenable to compute this directly for even small values.

  We approach this using dynamic programming instead. We know that foo(n, m)
  depends on all values foo(n, i) with i < m, and it may depend on arbitrary
  values from the previous row. As such, we perform a left-to-right,
  top-to-bottom sweep of the parameter space, caching every computed value in
  a table.
}
*/

function precompute(r7, rows) {
  const table = new Uint16Array(32768*5);
  for (let n = 0; n < 1; ++n) {
    for (let m = 0; m < 32768; ++m) {
      table[32768*n + m] = (m + 1) % 32768;
    }
  }

  for (let n = 1; n < rows; ++n) {
    table[32768*n + 0] = table[32768*(n-1) + r7];
    for (let m = 1; m < 32768; ++m) {
      table[32768*n + m] = table[32768*(n-1) + table[32768*n + (m-1)]];
    }
  }

  return (n, m) => table[32768*n + m];
}

function find_key(n, m, result) {
  for (let r7 = 0; r7 < 32768; ++r7) {
    if (precompute(r7, n+1)(n, m) === result) {
      return r7;
    }
  }

  return null;
}

let r7 = find_key(4, 1, 6);
console.log("r7 = " + r7);
