/*
  Vault layout
    ( * ) ( 8 ) ( - ) ( 1 )
    ( 4 ) ( * ) ( 11) ( * )
    ( + ) ( 4 ) ( - ) ( 18)
    ( 22) ( - ) ( 9 ) ( * )

  We treat numbered rooms as nodes, and operator rooms as edges.

  Naming scheme:
    * E * H
    B * F *
    * C * G
    A * D *
*/

// e.g. calc(10, "+5") = 15
function calc(x, func) {
  const op = func.substr(0, 1);
  const arg = +func.substr(1);
  switch (op) {
    case "+": return x + arg;
    case "-": return x - arg;
    case "*": return x * arg;
    default: throw new Error("wat");
  }
}

function find_path(graph, initial, goal) {
  const visited = {};
  for (let label in graph) {
    visited[label] = [];
  }

  const queue = [initial];

  while (queue.length > 0) {
    const path = queue.splice(0, 1)[0];
    if (path.pos === goal.pos && path.weight === goal.weight) {
      return path;
    }

    const edges = graph[path.pos];
    for (let operator in edges) {
      for (let destination of edges[operator]) {
        const weight = calc(path.weight, operator);

        if (weight < 0 || weight > 32767) {
          // The orb shatters
          continue;
        } else if (visited[destination].includes(weight)) {
          // Don't follow redundant paths
          continue;
        }

        visited[destination].push(weight);
        queue.push({
          trace: path.trace + operator,
          pos: destination,
          weight: weight,
        });
      }
    }
  }

  return null;
}


// Some shorthand to reduce noise
A = "A"
B = "B"
C = "C"
D = "D"
E = "E"
F = "F"
G = "G"
H = "H"

// The transition graph for the vault puzzle
const graph = {
  A: {"+4": [B, C], "-4": [C], "-9": [D]},
  B: {"*8": [E], "*11": [F], "*4": [B, C], "+4": [B, C]},
  C: {"*8": [E], "*4": [B, C], "*11": [F], "+4": [B, C], "-11": [F], "-18": [G], "-9": [D], "-4": [C]},
  D: {"-11": [F], "-4": [C], "-18": [G], "*18": [G], "-9": [D], "*9": [D]},
  E: {"-1": [H], "*4": [B, C], "-11": [F], "*11": [F], "*8": [E], "-8": [E]},
  F: {"-8": [E], "-1": [H], "*8": [E], "*1": [H], "*4": [B, C], "*18": [G], "-4": [C], "-18": [G], "-9": [D], "-11": [F], "*11": [F], "-11": [F]},
  G: {"*1": [H], "*11": [F], "-11": [F], "-4": [C], "-9": [D], "*9": [D], "*18": [G], "-18": [G]},
  H: {},
};

const initial = {trace: "22", pos: A, weight: 22};
const goal = {pos: H, weight: 30};
const result = find_path(graph, initial, goal);
if (result) {
  console.log("Success!");
  console.log(result.trace);
} else {
  console.log("No solution");
}
