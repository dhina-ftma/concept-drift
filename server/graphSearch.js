/**
 * Graph Search & Bidirectional Exploration Engine
 * Implements BFS shortest-path calculation and bidirectional graph expansion.
 */

import { normalizeConcept, formatConceptName } from './semanticEngine.js';

export class ConceptualGraph {
  constructor() {
    // Map of normalizedConcept -> Set of normalizedNeighbors
    this.adjacency = new Map();
    // Map of normalizedConcept -> Display Name
    this.displayNames = new Map();
  }

  addNode(concept) {
    const norm = normalizeConcept(concept);
    if (!this.adjacency.has(norm)) {
      this.adjacency.set(norm, new Set());
      this.displayNames.set(norm, formatConceptName(concept));
    }
    return norm;
  }

  addEdge(source, target) {
    const normA = this.addNode(source);
    const normB = this.addNode(target);
    if (normA !== normB) {
      this.adjacency.get(normA).add(normB);
      this.adjacency.get(normB).add(normA); // Undirected conceptual association
    }
  }

  getNeighbors(concept) {
    const norm = normalizeConcept(concept);
    if (!this.adjacency.has(norm)) return [];
    return Array.from(this.adjacency.get(norm)).map(n => this.displayNames.get(n) || n);
  }

  /**
   * Breadth-First Search to find the shortest conceptual path between start and target
   */
  findShortestPath(startConcept, targetConcept) {
    const start = normalizeConcept(startConcept);
    const target = normalizeConcept(targetConcept);

    if (start === target) {
      return {
        found: true,
        path: [this.displayNames.get(start) || formatConceptName(startConcept)],
        steps: 0
      };
    }

    if (!this.adjacency.has(start) || !this.adjacency.has(target)) {
      return { found: false, path: [], steps: -1 };
    }

    const queue = [[start]];
    const visited = new Set([start]);

    while (queue.length > 0) {
      const currentPath = queue.shift();
      const currentNode = currentPath[currentPath.length - 1];

      const neighbors = this.adjacency.get(currentNode) || new Set();
      for (const neighbor of neighbors) {
        if (neighbor === target) {
          const fullNormPath = [...currentPath, target];
          const displayPath = fullNormPath.map(n => this.displayNames.get(n) || formatConceptName(n));
          return {
            found: true,
            path: displayPath,
            steps: displayPath.length - 1
          };
        }

        if (!visited.has(neighbor)) {
          visited.add(neighbor);
          queue.push([...currentPath, neighbor]);
        }
      }
    }

    return { found: false, path: [], steps: -1 };
  }

  /**
   * Bidirectional BFS exploration to find any potential shortest bridge in the known universe
   */
  bidirectionalSearch(startConcept, targetConcept) {
    const start = normalizeConcept(startConcept);
    const target = normalizeConcept(targetConcept);

    if (start === target) return [start];
    if (!this.adjacency.has(start) || !this.adjacency.has(target)) return null;

    const forwardVisited = new Map([[start, null]]);
    const backwardVisited = new Map([[target, null]]);

    const forwardQueue = [start];
    const backwardQueue = [target];

    let intersection = null;

    while (forwardQueue.length > 0 && backwardQueue.length > 0) {
      // Forward step
      const fNode = forwardQueue.shift();
      const fNeighbors = this.adjacency.get(fNode) || new Set();

      for (const fn of fNeighbors) {
        if (!forwardVisited.has(fn)) {
          forwardVisited.set(fn, fNode);
          forwardQueue.push(fn);
          if (backwardVisited.has(fn)) {
            intersection = fn;
            break;
          }
        }
      }

      if (intersection) break;

      // Backward step
      const bNode = backwardQueue.shift();
      const bNeighbors = this.adjacency.get(bNode) || new Set();

      for (const bn of bNeighbors) {
        if (!backwardVisited.has(bn)) {
          backwardVisited.set(bn, bNode);
          backwardQueue.push(bn);
          if (forwardVisited.has(bn)) {
            intersection = bn;
            break;
          }
        }
      }

      if (intersection) break;
    }

    if (!intersection) return null;

    // Reconstruct full path
    const path = [];
    let curr = intersection;
    while (curr) {
      path.unshift(curr);
      curr = forwardVisited.get(curr);
    }
    curr = backwardVisited.get(intersection);
    while (curr) {
      path.push(curr);
      curr = backwardVisited.get(curr);
    }

    return path.map(n => this.displayNames.get(n) || formatConceptName(n));
  }

  /**
   * Computes drift scoring metrics
   */
  calculateDriftScore(userPathLength, shortestPathLength) {
    const driftDistance = Math.max(0, userPathLength - shortestPathLength);
    const efficiency = shortestPathLength > 0 
      ? Math.max(10, Math.min(100, Math.round((shortestPathLength / Math.max(1, userPathLength)) * 100))) 
      : 100;

    return {
      driftDistance,
      efficiency,
      summary: driftDistance === 0 
        ? "Optimal Conceptual Drift! You found the theoretical minimum path."
        : `You drifted ${driftDistance} step${driftDistance === 1 ? '' : 's'} further into the conceptual web.`
    };
  }
}
