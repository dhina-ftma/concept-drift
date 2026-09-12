/**
 * Concept Drift - Main Application Orchestrator
 * Glues together the 2D Canvas engine, user gestures, API communication,
 * session-isolated graph state, and HUD/Landing state machines.
 */

import { Camera } from './canvas/camera.js';
import { GraphLayout } from './canvas/layout.js';
import { NetworkRenderer } from './canvas/renderer.js';
import { sound } from './canvas/audio.js';
import { LandingUI } from './ui/landing.js';
import { HudUI } from './ui/hud.js';
import { CompletionUI } from './ui/completion.js';

// Global toast utility
window.showToast = function(message, type = 'info') {
  const container = document.getElementById('toast-container');
  if (!container) return;
  const toast = document.createElement('div');
  toast.className = `toast ${type}`;
  toast.textContent = message;
  container.appendChild(toast);
  setTimeout(() => {
    toast.style.opacity = '0';
    toast.style.transform = 'translateY(-10px)';
    toast.style.transition = 'all 0.3s ease';
    setTimeout(() => toast.remove(), 300);
  }, 3500);
};

class ConceptDriftApp {
  constructor() {
    this.canvas = document.getElementById('drift-canvas');
    this.tooltip = document.getElementById('node-tooltip');
    this.tooltipConcept = this.tooltip.querySelector('.tooltip-concept');
    this.tooltipMeta = this.tooltip.querySelector('.tooltip-meta');

    // Canvas Subsystems
    this.camera = new Camera(this.canvas);
    this.layout = new GraphLayout();
    this.renderer = new NetworkRenderer(this.canvas, this.camera, this.layout);

    // Journey State
    this.sessionId = this.createSessionId();
    this.apiKey = localStorage.getItem('concept_drift_api_key') || '';
    this.startConcept = '';
    this.destinationConcept = '';
    this.startNode = null;
    this.destinationNode = null;
    this.activeNode = null;
    this.pathNodes = [];
    this.stepCount = 0;
    this.isLoadingChoices = false;

    // Pointer Interaction State
    this.isPointerDown = false;
    this.pointerStartX = 0;
    this.pointerStartY = 0;
    this.dragDistance = 0;
    this.lastPointerX = 0;
    this.lastPointerY = 0;

    // Touch pinch state
    this.touchDistanceStart = 0;

    // UI Controllers
    this.landingUI = new LandingUI({
      onStartDrift: (start, dest) => this.startDrift(start, dest),
      onSaveApiKey: (key) => this.saveApiKey(key),
      getApiKey: () => this.apiKey
    });

    this.hudUI = new HudUI({
      onBacktrack: (node) => this.backtrackToNode(node),
      onRecenter: () => this.recenterOnActive(),
      onZoomIn: () => this.camera.zoomAt(this.canvas.width / 4, this.canvas.height / 4, 1.3),
      onZoomOut: () => this.camera.zoomAt(this.canvas.width / 4, this.canvas.height / 4, 0.77),
      onReset: () => this.resetToLanding()
    });

    this.completionUI = new CompletionUI({
      onRestart: () => this.resetToLanding(),
      onInspect: () => this.inspectGraph()
    });

    this.initCanvasEvents();
    this.renderer.start();

    window.addEventListener('resize', () => {
      this.renderer.resize();
    });
  }

  createSessionId() {
    return `session_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;
  }

  saveApiKey(key) {
    this.apiKey = key.trim();
    if (this.apiKey) {
      localStorage.setItem('concept_drift_api_key', this.apiKey);
      window.showToast?.('AI API Key configured successfully!', 'info');
    } else {
      localStorage.removeItem('concept_drift_api_key');
      window.showToast?.('Using built-in dynamic semantic engine.', 'info');
    }
  }

  initCanvasEvents() {
    const c = this.canvas;

    c.addEventListener('pointerdown', (e) => {
      sound.init();
      this.isPointerDown = true;
      this.pointerStartX = e.clientX;
      this.pointerStartY = e.clientY;
      this.lastPointerX = e.clientX;
      this.lastPointerY = e.clientY;
      this.dragDistance = 0;
      c.setPointerCapture(e.pointerId);
    });

    c.addEventListener('pointermove', (e) => {
      const dx = e.clientX - this.lastPointerX;
      const dy = e.clientY - this.lastPointerY;
      this.lastPointerX = e.clientX;
      this.lastPointerY = e.clientY;

      if (this.isPointerDown) {
        this.dragDistance += Math.hypot(dx, dy);
        this.camera.panBy(dx, dy);
        this.hideTooltip();
      } else {
        this.handlePointerHover(e.clientX, e.clientY);
      }
    });

    c.addEventListener('pointerup', (e) => {
      if (this.isPointerDown) {
        c.releasePointerCapture(e.pointerId);
        this.isPointerDown = false;

        if (this.dragDistance < 8) {
          this.handleNodeClick(e.clientX, e.clientY);
        }
      }
    });

    c.addEventListener('pointercancel', () => {
      this.isPointerDown = false;
    });

    c.addEventListener('wheel', (e) => {
      e.preventDefault();
      const factor = e.deltaY < 0 ? 1.15 : 0.87;
      this.camera.zoomAt(e.clientX, e.clientY, factor);
      this.handlePointerHover(e.clientX, e.clientY);
    }, { passive: false });

    c.addEventListener('touchstart', (e) => {
      if (e.touches.length === 2) {
        this.touchDistanceStart = Math.hypot(
          e.touches[0].clientX - e.touches[1].clientX,
          e.touches[0].clientY - e.touches[1].clientY
        );
      }
    });

    c.addEventListener('touchmove', (e) => {
      if (e.touches.length === 2) {
        const dist = Math.hypot(
          e.touches[0].clientX - e.touches[1].clientX,
          e.touches[0].clientY - e.touches[1].clientY
        );
        if (this.touchDistanceStart > 0) {
          const factor = dist / this.touchDistanceStart;
          const midX = (e.touches[0].clientX + e.touches[1].clientX) / 2;
          const midY = (e.touches[0].clientY + e.touches[1].clientY) / 2;
          this.camera.zoomAt(midX, midY, factor);
          this.touchDistanceStart = dist;
        }
      }
    });
  }

  handlePointerHover(screenX, screenY) {
    const node = this.renderer.getNodeAtScreenCoords(screenX, screenY);
    if (node !== this.renderer.hoveredNode) {
      this.renderer.hoveredNode = node;
      if (node) {
        sound.playHoverChime(node.type === 'destination' ? 1.5 : 1.0);
        this.showTooltip(node, screenX, screenY);
      } else {
        this.hideTooltip();
      }
    } else if (node) {
      this.updateTooltipPosition(screenX, screenY);
    }
  }

  showTooltip(node, screenX, screenY) {
    this.tooltipConcept.textContent = node.name;

    if (node.type === 'destination') {
      this.tooltipMeta.textContent = 'FINAL DESTINATION';
    } else if (node.type === 'start') {
      this.tooltipMeta.textContent = 'STARTING CONCEPT';
    } else if (node.state === 'active') {
      this.tooltipMeta.textContent = 'CURRENT CONCEPT';
    } else if (node.state === 'available') {
      const pct = Math.round((node.strength || 0.8) * 100);
      this.tooltipMeta.textContent = `RELEVANCE: ${pct}% • CLICK TO DRIFT`;
    } else if (node.state === 'explored') {
      this.tooltipMeta.textContent = 'EXPLORED CONCEPT';
    } else {
      this.tooltipMeta.textContent = 'CONCEPT NODE';
    }

    this.updateTooltipPosition(screenX, screenY);
    this.tooltip.classList.add('visible');
  }

  updateTooltipPosition(screenX, screenY) {
    this.tooltip.style.left = `${screenX}px`;
    this.tooltip.style.top = `${screenY}px`;
  }

  hideTooltip() {
    this.tooltip.classList.remove('visible');
    this.renderer.hoveredNode = null;
  }

  async handleNodeClick(screenX, screenY) {
    const clicked = this.renderer.getNodeAtScreenCoords(screenX, screenY);
    if (!clicked || this.isLoadingChoices) return;

    if (clicked.state === 'available' || (clicked.type === 'destination' && this.isAdjacentTo(clicked))) {
      await this.driftToNode(clicked);
    } else if (clicked.state === 'explored') {
      this.backtrackToNode(clicked);
    }
  }

  isAdjacentTo(targetNode) {
    if (!this.activeNode) return false;
    return this.layout.edges.some(e => 
      (e.sourceId === this.activeNode.id && e.targetId === targetNode.id) ||
      (e.sourceId === targetNode.id && e.targetId === this.activeNode.id)
    );
  }

  async startDrift(startName, destName) {
    // Generate fresh session ID for complete graph isolation
    this.sessionId = this.createSessionId();
    this.startConcept = startName;
    this.destinationConcept = destName;
    this.stepCount = 0;
    this.pathNodes = [];
    this.renderer.completedPath = null;

    // Transition UI
    this.landingUI.hide();
    this.hudUI.show(startName, destName);

    // Initialize layout with start & destination far apart
    const { startNode, destNode } = this.layout.initStartAndDestination(startName, destName);
    this.startNode = startNode;
    this.destinationNode = destNode;
    this.activeNode = startNode;

    this.pathNodes.push(startNode);
    this.renderer.userPath = [startNode.id];
    this.hudUI.updatePathHistory(this.pathNodes, startNode.id);

    // Center camera on start node
    this.camera.targetX = startNode.x;
    this.camera.targetY = startNode.y;
    this.camera.x = startNode.x;
    this.camera.y = startNode.y;
    this.camera.targetZoom = 1.0;
    this.camera.zoom = 0.8;
    this.camera.driftTo(startNode.x, startNode.y, 1.0, 950);

    // Fetch initial concept choices strictly around start node
    this.isLoadingChoices = true;
    try {
      const response = await fetch('/api/init', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(this.apiKey ? { 'x-api-key': this.apiKey } : {})
        },
        body: JSON.stringify({
          sessionId: this.sessionId,
          start: startName,
          destination: destName,
          apiKey: this.apiKey
        })
      });

      if (!response.ok) {
        const err = await response.json();
        throw new Error(err.error || 'Failed to initialize conceptual graph');
      }

      const data = await response.json();
      this.layout.expandChoices(startNode, data.choices, destNode);
    } catch (err) {
      console.error(err);
      window.showToast?.(err.message, 'error');
    } finally {
      this.isLoadingChoices = false;
    }
  }

  async driftToNode(node) {
    sound.playSelectPulse();

    if (this.activeNode) {
      this.activeNode.state = 'explored';
    }

    this.activeNode = node;
    node.state = 'active';
    node.expanded = true;

    this.pathNodes.push(node);
    this.renderer.userPath.push(node.id);
    this.stepCount++;
    this.hudUI.updateSteps(this.stepCount);
    this.hudUI.updatePathHistory(this.pathNodes, node.id);

    // Smooth camera drift
    this.camera.driftTo(node.x, node.y, 1.25, 800);

    // Reached destination?
    if (node.id === this.destinationNode.id) {
      await this.handleDestinationReached();
      return;
    }

    // Expand next conceptual choices around this node
    this.isLoadingChoices = true;
    try {
      const response = await fetch('/api/expand', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(this.apiKey ? { 'x-api-key': this.apiKey } : {})
        },
        body: JSON.stringify({
          sessionId: this.sessionId,
          concept: node.name,
          destination: this.destinationConcept,
          visited: this.pathNodes.map(n => n.name),
          apiKey: this.apiKey
        })
      });

      if (response.ok) {
        const data = await response.json();
        this.layout.expandChoices(node, data.choices, this.destinationNode);
      }
    } catch (err) {
      console.error(err);
    } finally {
      this.isLoadingChoices = false;
    }
  }

  async handleDestinationReached() {
    this.isLoadingChoices = true;
    try {
      const userNames = this.pathNodes.map(n => n.name);
      const res = await fetch('/api/shortest-path', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sessionId: this.sessionId,
          start: this.startConcept,
          destination: this.destinationConcept,
          userPath: userNames
        })
      });

      let summaryData = null;
      if (res.ok) {
        summaryData = await res.json();
      } else {
        summaryData = {
          userPath: userNames,
          userSteps: this.stepCount,
          shortestSteps: this.stepCount,
          driftDistance: 0,
          efficiency: 100,
          summary: "Journey complete!"
        };
      }

      this.renderer.completedPath = this.pathNodes.map(n => n.id);
      this.frameEntireJourney();

      setTimeout(() => {
        this.completionUI.show(summaryData);
      }, 700);

    } catch (e) {
      console.error(e);
    } finally {
      this.isLoadingChoices = false;
    }
  }

  frameEntireJourney() {
    if (this.pathNodes.length === 0) return;
    let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;
    for (const node of this.pathNodes) {
      minX = Math.min(minX, node.x);
      maxX = Math.max(maxX, node.x);
      minY = Math.min(minY, node.y);
      maxY = Math.max(maxY, node.y);
    }

    const midX = (minX + maxX) / 2;
    const midY = (minY + maxY) / 2;
    const spanX = Math.max(400, maxX - minX + 250);
    const spanY = Math.max(300, maxY - minY + 250);

    const zoomX = this.canvas.width / spanX;
    const zoomY = this.canvas.height / spanY;
    const targetZoom = Math.max(0.4, Math.min(1.1, Math.min(zoomX, zoomY)));

    this.camera.driftTo(midX, midY, targetZoom, 1100);
  }

  backtrackToNode(node) {
    if (this.activeNode && this.activeNode.id === node.id) return;

    sound.playHoverChime(0.85);

    const index = this.pathNodes.findIndex(n => n.id === node.id);
    if (index >= 0) {
      this.pathNodes = this.pathNodes.slice(0, index + 1);
      this.renderer.userPath = this.pathNodes.map(n => n.id);
      this.stepCount = Math.max(0, this.pathNodes.length - 1);
      this.hudUI.updateSteps(this.stepCount);
      this.hudUI.updatePathHistory(this.pathNodes, node.id);

      if (this.activeNode) {
        this.activeNode.state = 'explored';
      }
      this.activeNode = node;
      node.state = 'active';

      for (const edge of this.layout.edges) {
        if (edge.sourceId === node.id) {
          const child = this.layout.nodes.get(edge.targetId);
          if (child && child.state !== 'explored' && child.id !== this.destinationNode.id) {
            child.state = 'available';
          }
        }
      }

      this.camera.driftTo(node.x, node.y, 1.25, 750);
    }
  }

  recenterOnActive() {
    if (this.activeNode) {
      this.camera.driftTo(this.activeNode.x, this.activeNode.y, 1.25, 750);
    }
  }

  inspectGraph() {
    this.frameEntireJourney();
  }

  resetToLanding() {
    this.hudUI.hide();
    this.completionUI.hide();
    this.landingUI.show();
    this.layout.clear();
    this.renderer.userPath = [];
    this.renderer.completedPath = null;
    this.activeNode = null;
    this.camera.driftTo(0, 0, 1.0, 750);
  }
}

window.addEventListener('DOMContentLoaded', () => {
  window.conceptDriftApp = new ConceptDriftApp();
});
