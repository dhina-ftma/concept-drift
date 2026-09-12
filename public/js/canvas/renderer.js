/**
 * 2D Canvas Conceptual Web Renderer
 * Minimalist Aesthetic: Crisp White Canvas + Ultramarine Blue + Coral Accents
 * High-performance 60 FPS rendering of architectural network, nodes, and conduits.
 */

export class NetworkRenderer {
  constructor(canvas, camera, layout) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d', { alpha: false });
    this.camera = camera;
    this.layout = layout;

    this.dpr = window.devicePixelRatio || 1;
    this.width = 0;
    this.height = 0;

    // Latent background dust / architectural network points
    this.backgroundParticles = [];
    this.initBackgroundParticles(450);

    // Traveling photons along edges
    this.photons = [];
    this.initPhotons(25);

    // Hover state
    this.hoveredNode = null;
    this.userPath = []; // Array of node IDs along user journey
    this.completedPath = null; // Highlighted path when destination is reached

    this.isRunning = false;
    this.resize();
  }

  initBackgroundParticles(count) {
    this.backgroundParticles = [];
    for (let i = 0; i < count; i++) {
      this.backgroundParticles.push({
        x: (Math.random() - 0.5) * 4500,
        y: (Math.random() - 0.5) * 3500,
        radius: Math.random() * 1.4 + 0.6,
        baseAlpha: Math.random() * 0.2 + 0.08,
        speedX: (Math.random() - 0.5) * 0.12,
        speedY: (Math.random() - 0.5) * 0.12,
        pulseOffset: Math.random() * Math.PI * 2
      });
    }
  }

  initPhotons(count) {
    this.photons = [];
    for (let i = 0; i < count; i++) {
      this.photons.push({
        edgeIndex: 0,
        progress: Math.random(),
        speed: 0.005 + Math.random() * 0.007
      });
    }
  }

  resize() {
    const rect = this.canvas.parentElement.getBoundingClientRect();
    this.width = rect.width;
    this.height = rect.height;

    this.canvas.width = Math.floor(this.width * this.dpr);
    this.canvas.height = Math.floor(this.height * this.dpr);
    this.canvas.style.width = `${this.width}px`;
    this.canvas.style.height = `${this.height}px`;

    this.ctx.scale(this.dpr, this.dpr);
  }

  start() {
    if (this.isRunning) return;
    this.isRunning = true;
    const loop = (timestamp) => {
      if (!this.isRunning) return;
      this.render(timestamp);
      requestAnimationFrame(loop);
    };
    requestAnimationFrame(loop);
  }

  stop() {
    this.isRunning = false;
  }

  render(timestamp = performance.now()) {
    this.camera.update(timestamp);
    this.layout.tick();

    const ctx = this.ctx;
    const w = this.width;
    const h = this.height;

    // Reset transform & clear screen with crisp white canvas
    ctx.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);
    ctx.fillStyle = '#fafbfc';
    ctx.fillRect(0, 0, w, h);

    // Apply Camera Transform
    ctx.save();
    ctx.translate(w / 2, h / 2);
    ctx.scale(this.camera.zoom, this.camera.zoom);
    ctx.translate(-this.camera.x, -this.camera.y);

    // 1. Render Subtle Latent Background Grid / Floating Points
    this.renderBackgroundField(ctx, timestamp);

    // 2. Render Graph Edges
    this.renderEdges(ctx, timestamp);

    // 3. Render Traveling Photons
    this.renderPhotons(ctx);

    // 4. Render Nodes
    this.renderNodes(ctx, timestamp);

    ctx.restore();
  }

  renderBackgroundField(ctx, timestamp) {
    const time = timestamp * 0.001;
    ctx.fillStyle = 'rgba(100, 116, 139, 0.4)';

    for (const p of this.backgroundParticles) {
      p.x += p.speedX;
      p.y += p.speedY;

      // Wrap around large world boundaries
      if (p.x < -2250) p.x = 2250;
      if (p.x > 2250) p.x = -2250;
      if (p.y < -1750) p.y = 1750;
      if (p.y > 1750) p.y = -1750;

      const alpha = p.baseAlpha * (0.7 + 0.3 * Math.sin(time + p.pulseOffset));
      ctx.globalAlpha = alpha;
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.globalAlpha = 1.0;
  }

  renderEdges(ctx, timestamp) {
    const nodes = this.layout.nodes;
    const pathSet = new Set(this.userPath.map(id => id.toLowerCase()));

    for (let i = 0; i < this.layout.edges.length; i++) {
      const edge = this.layout.edges[i];
      const n1 = nodes.get(edge.sourceId);
      const n2 = nodes.get(edge.targetId);
      if (!n1 || !n2) continue;

      const isPathEdge = pathSet.has(n1.id) && pathSet.has(n2.id);
      const isCompleted = this.completedPath && this.completedPath.includes(n1.id) && this.completedPath.includes(n2.id);

      ctx.beginPath();
      ctx.moveTo(n1.x, n1.y);
      ctx.lineTo(n2.x, n2.y);

      if (isCompleted) {
        // Vibrant Coral celebration conduit
        ctx.strokeStyle = '#f43f5e';
        ctx.lineWidth = 3.0;
        ctx.shadowColor = 'rgba(244, 63, 94, 0.3)';
        ctx.shadowBlur = 8;
      } else if (isPathEdge) {
        // Active Ultramarine user journey conduit
        ctx.strokeStyle = '#2563eb';
        ctx.lineWidth = 2.4;
        ctx.shadowColor = 'rgba(37, 99, 235, 0.25)';
        ctx.shadowBlur = 6;
      } else {
        // Thin gossamer architectural ink line
        ctx.strokeStyle = `rgba(15, 23, 42, ${edge.alpha * 0.14})`;
        ctx.lineWidth = 1.0;
        ctx.shadowBlur = 0;
      }

      ctx.stroke();
      ctx.shadowBlur = 0; // reset
    }
  }

  renderPhotons(ctx) {
    if (this.layout.edges.length === 0) return;
    const nodes = this.layout.nodes;

    for (const photon of this.photons) {
      if (photon.edgeIndex >= this.layout.edges.length) {
        photon.edgeIndex = Math.floor(Math.random() * this.layout.edges.length);
      }

      const edge = this.layout.edges[photon.edgeIndex];
      if (!edge) continue;

      const n1 = nodes.get(edge.sourceId);
      const n2 = nodes.get(edge.targetId);
      if (!n1 || !n2) continue;

      photon.progress += photon.speed;
      if (photon.progress >= 1.0) {
        photon.progress = 0;
        photon.edgeIndex = Math.floor(Math.random() * this.layout.edges.length);
      }

      const px = n1.x + (n2.x - n1.x) * photon.progress;
      const py = n1.y + (n2.y - n1.y) * photon.progress;

      ctx.beginPath();
      ctx.arc(px, py, 2.0, 0, Math.PI * 2);
      ctx.fillStyle = '#2563eb';
      ctx.fill();
    }
  }

  renderNodes(ctx, timestamp) {
    const nodes = Array.from(this.layout.nodes.values());

    for (const node of nodes) {
      const isHovered = this.hoveredNode && this.hoveredNode.id === node.id;
      const isDestination = node.type === 'destination';
      const isStart = node.type === 'start';
      const isActive = node.state === 'active';
      const isExplored = node.state === 'explored';
      const isAvailable = node.state === 'available';

      ctx.save();
      ctx.globalAlpha = node.alpha;

      // 1. Destination Node (Electric Coral Beacon)
      if (isDestination) {
        const ripple = (Math.sin(timestamp * 0.003) + 1) * 0.5;
        const outerRadius = node.radius + 10 + ripple * 14;

        // Pulsing outer radar ring
        ctx.beginPath();
        ctx.arc(node.x, node.y, outerRadius, 0, Math.PI * 2);
        ctx.strokeStyle = `rgba(244, 63, 94, ${0.4 - ripple * 0.35})`;
        ctx.lineWidth = 1.5;
        ctx.stroke();

        // Secondary ring
        ctx.beginPath();
        ctx.arc(node.x, node.y, node.radius + 5, 0, Math.PI * 2);
        ctx.strokeStyle = 'rgba(244, 63, 94, 0.8)';
        ctx.lineWidth = 2.0;
        ctx.stroke();

        // Coral Core
        ctx.beginPath();
        ctx.arc(node.x, node.y, node.radius, 0, Math.PI * 2);
        ctx.fillStyle = '#f43f5e';
        ctx.shadowColor = 'rgba(244, 63, 94, 0.35)';
        ctx.shadowBlur = 12;
        ctx.fill();

      // 2. Currently Selected / Active Node
      } else if (isActive) {
        const pulse = Math.sin(node.pulse) * 4;
        
        // Aura ring
        ctx.beginPath();
        ctx.arc(node.x, node.y, node.radius + 6 + pulse, 0, Math.PI * 2);
        ctx.strokeStyle = 'rgba(37, 99, 235, 0.4)';
        ctx.lineWidth = 1.5;
        ctx.stroke();

        // White core with bold Ultramarine Blue border
        ctx.beginPath();
        ctx.arc(node.x, node.y, node.radius, 0, Math.PI * 2);
        ctx.fillStyle = '#ffffff';
        ctx.fill();
        ctx.lineWidth = 3.5;
        ctx.strokeStyle = '#2563eb';
        ctx.shadowColor = 'rgba(37, 99, 235, 0.3)';
        ctx.shadowBlur = 10;
        ctx.stroke();

      // 3. Start Node (Solid Ultramarine Anchor)
      } else if (isStart) {
        ctx.beginPath();
        ctx.arc(node.x, node.y, node.radius, 0, Math.PI * 2);
        ctx.fillStyle = '#2563eb';
        ctx.shadowColor = 'rgba(37, 99, 235, 0.3)';
        ctx.shadowBlur = 8;
        ctx.fill();

      // 4. Available Choice Node
      } else if (isAvailable) {
        const hoverBoost = isHovered ? 3 : 0;
        ctx.beginPath();
        ctx.arc(node.x, node.y, node.radius + hoverBoost, 0, Math.PI * 2);
        
        if (isHovered) {
          ctx.fillStyle = '#2563eb';
          ctx.shadowColor = 'rgba(37, 99, 235, 0.35)';
          ctx.shadowBlur = 10;
          ctx.fill();
        } else {
          ctx.fillStyle = '#ffffff';
          ctx.fill();
          ctx.lineWidth = 2.5;
          ctx.strokeStyle = '#2563eb';
          ctx.stroke();
        }

      // 5. Explored Node
      } else if (isExplored) {
        ctx.beginPath();
        ctx.arc(node.x, node.y, node.radius, 0, Math.PI * 2);
        ctx.fillStyle = '#eff6ff';
        ctx.fill();
        ctx.lineWidth = 2.0;
        ctx.strokeStyle = '#93c5fd';
        ctx.stroke();

      // 6. Inactive / Background Node
      } else {
        ctx.beginPath();
        ctx.arc(node.x, node.y, node.radius * 0.7, 0, Math.PI * 2);
        ctx.fillStyle = '#cbd5e1';
        ctx.fill();
      }

      ctx.shadowBlur = 0; // reset

      // Persistent Label Rendering for Important Nodes:
      // Start, Destination, Active, or Hovered
      const shouldShowLabel = isHovered || isActive || isStart || isDestination;
      if (shouldShowLabel) {
        this.renderNodeLabel(ctx, node, isDestination, isActive, isHovered);
      }

      ctx.restore();
    }
  }

  renderNodeLabel(ctx, node, isDestination, isActive, isHovered) {
    ctx.font = `600 13px 'Space Grotesk', sans-serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';

    const text = node.name;
    const metrics = ctx.measureText(text);
    const paddingX = 10;
    const paddingY = 5;
    const boxWidth = metrics.width + paddingX * 2;
    const boxHeight = 24;
    const labelY = node.y + node.radius + 18;

    // Clean white badge pill with subtle border
    ctx.beginPath();
    ctx.roundRect(node.x - boxWidth / 2, labelY - boxHeight / 2, boxWidth, boxHeight, 6);
    
    if (isDestination) {
      ctx.fillStyle = '#ffffff';
      ctx.strokeStyle = '#f43f5e';
      ctx.lineWidth = 1.5;
    } else if (isActive || isHovered) {
      ctx.fillStyle = '#ffffff';
      ctx.strokeStyle = '#2563eb';
      ctx.lineWidth = 1.5;
    } else {
      ctx.fillStyle = '#ffffff';
      ctx.strokeStyle = 'rgba(15, 23, 42, 0.12)';
      ctx.lineWidth = 1;
    }

    ctx.shadowColor = 'rgba(15, 23, 42, 0.08)';
    ctx.shadowBlur = 6;
    ctx.fill();
    ctx.stroke();
    ctx.shadowBlur = 0;

    // High-contrast ink text
    if (isDestination) {
      ctx.fillStyle = '#e11d48';
    } else if (isActive || isHovered) {
      ctx.fillStyle = '#1d4ed8';
    } else {
      ctx.fillStyle = '#0f172a';
    }
    ctx.fillText(text, node.x, labelY);
  }

  /**
   * Fast hit detection in world coordinates
   */
  getNodeAtScreenCoords(screenX, screenY) {
    const world = this.camera.screenToWorld(screenX, screenY);
    const nodes = Array.from(this.layout.nodes.values());

    for (let i = nodes.length - 1; i >= 0; i--) {
      const node = nodes[i];
      const dist = Math.hypot(node.x - world.x, node.y - world.y);
      const hitRadius = Math.max(22, node.radius * 1.6);
      if (dist <= hitRadius) {
        return node;
      }
    }
    return null;
  }
}
