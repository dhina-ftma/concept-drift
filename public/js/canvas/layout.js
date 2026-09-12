/**
 * Organic Graph Layout Engine
 * Positions newly expanded nodes in a directional arc towards the destination,
 * with subtle spring-repulsion relaxation.
 */

export class GraphLayout {
  constructor() {
    this.nodes = new Map(); // id -> node object
    this.edges = [];        // array of { sourceId, targetId }
  }

  clear() {
    this.nodes.clear();
    this.edges = [];
  }

  initStartAndDestination(startName, destName) {
    this.clear();

    const distance = 950; // Initial spatial separation

    const startNode = {
      id: startName.toLowerCase(),
      name: startName,
      x: -distance / 2,
      y: 0,
      vx: 0,
      vy: 0,
      radius: 18,
      type: 'start',
      state: 'active', // active, available, explored, target, inactive
      expanded: true,
      alpha: 1.0,
      pulse: 0
    };

    const destNode = {
      id: destName.toLowerCase(),
      name: destName,
      x: distance / 2,
      y: 0,
      vx: 0,
      vy: 0,
      radius: 20,
      type: 'destination',
      state: 'target',
      expanded: false,
      alpha: 1.0,
      pulse: 0
    };

    this.nodes.set(startNode.id, startNode);
    this.nodes.set(destNode.id, destNode);

    return { startNode, destNode };
  }

  /**
   * Positions 3-5 newly discovered candidate choices around a parent node
   */
  expandChoices(parentNode, choices, destinationNode) {
    const parentX = parentNode.x;
    const parentY = parentNode.y;
    const destX = destinationNode.x;
    const destY = destinationNode.y;

    // Vector towards destination
    const dx = destX - parentX;
    const dy = destY - parentY;
    const baseAngle = Math.atan2(dy, dx);

    const count = choices.length;
    const radius = 175 + Math.random() * 30; // Orbit distance from parent

    // Fan-out angle spread: approximately 100 degrees (~1.75 rad) centered along the target vector
    const totalSpread = Math.min(Math.PI * 0.9, 0.45 * count);
    const angleStep = count > 1 ? totalSpread / (count - 1) : 0;
    const startAngle = baseAngle - totalSpread / 2;

    const newNodes = [];

    choices.forEach((choice, index) => {
      const id = choice.name.toLowerCase();
      let node = this.nodes.get(id);

      if (!node) {
        // Compute position along directional arc
        const angle = startAngle + index * angleStep + (Math.random() - 0.5) * 0.2;
        const targetX = parentX + Math.cos(angle) * radius;
        const targetY = parentY + Math.sin(angle) * radius;

        node = {
          id: id,
          name: choice.name,
          x: parentX + Math.cos(angle) * 30, // Emerge outward from parent
          y: parentY + Math.sin(angle) * 30,
          targetX: targetX,
          targetY: targetY,
          vx: 0,
          vy: 0,
          radius: 12,
          type: id === destinationNode.id ? 'destination' : 'choice',
          state: id === destinationNode.id ? 'target' : 'available',
          strength: choice.relationship_strength || 0.8,
          rationale: choice.rationale || '',
          expanded: false,
          alpha: 0.1, // Fade in
          pulse: 0
        };

        this.nodes.set(id, node);
      } else {
        // If already existing, make sure state is active or available
        if (node.state !== 'explored' && node.state !== 'active') {
          node.state = 'available';
        }
      }

      newNodes.push(node);

      // Add edge if not present
      if (!this.edges.some(e => (e.sourceId === parentNode.id && e.targetId === id) || (e.sourceId === id && e.targetId === parentNode.id))) {
        this.edges.push({
          sourceId: parentNode.id,
          targetId: id,
          strength: choice.relationship_strength || 0.8,
          alpha: 0.2
        });
      }
    });

    return newNodes;
  }

  /**
   * Physics relaxation step
   */
  tick() {
    const nodeList = Array.from(this.nodes.values());

    // 1. Emerge / Lerp towards target position and fade in
    for (const node of nodeList) {
      if (node.targetX !== undefined) {
        node.x += (node.targetX - node.x) * 0.12;
        node.y += (node.targetY - node.y) * 0.12;
      }

      if (node.alpha < 1.0) {
        node.alpha = Math.min(1.0, node.alpha + 0.05);
      }

      node.pulse = (node.pulse + 0.035) % (Math.PI * 2);
    }

    // 2. Gentle Coulomb repulsion between close nodes
    for (let i = 0; i < nodeList.length; i++) {
      const n1 = nodeList[i];
      for (let j = i + 1; j < nodeList.length; j++) {
        const n2 = nodeList[j];
        const dx = n2.x - n1.x;
        const dy = n2.y - n1.y;
        const dist = Math.hypot(dx, dy) || 1;
        const minDist = (n1.radius + n2.radius) * 2.8;

        if (dist < minDist) {
          const force = (minDist - dist) / dist * 0.04;
          const fx = dx * force;
          const fy = dy * force;

          if (n1.type !== 'start' && n1.type !== 'destination') {
            n1.x -= fx;
            n1.y -= fy;
          }
          if (n2.type !== 'start' && n2.type !== 'destination') {
            n2.x += fx;
            n2.y += fy;
          }
        }
      }
    }

    // 3. Fade in edge alphas
    for (const edge of this.edges) {
      if (edge.alpha < 0.8) {
        edge.alpha = Math.min(0.8, edge.alpha + 0.04);
      }
    }
  }
}
