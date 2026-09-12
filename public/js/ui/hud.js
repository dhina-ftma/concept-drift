/**
 * HUD Controller
 * Manages in-game step tracking, path history breadcrumbs with backtracking,
 * camera zoom/recenter controls, and sound toggle.
 */

import { sound } from '../canvas/audio.js';

export class HudUI {
  constructor(options) {
    this.onBacktrack = options.onBacktrack;
    this.onRecenter = options.onRecenter;
    this.onZoomIn = options.onZoomIn;
    this.onZoomOut = options.onZoomOut;
    this.onReset = options.onReset;

    this.hudElement = document.getElementById('hud');
    this.originLabel = document.getElementById('hud-origin');
    this.destLabel = document.getElementById('hud-destination');
    this.stepsValue = document.getElementById('hud-steps');
    this.historyChain = document.getElementById('history-chain');
    
    this.btnZoomIn = document.getElementById('btn-zoom-in');
    this.btnZoomOut = document.getElementById('btn-zoom-out');
    this.btnRecenter = document.getElementById('btn-recenter');
    this.btnMute = document.getElementById('btn-mute');
    this.btnReset = document.getElementById('btn-reset');

    this.initEvents();
  }

  initEvents() {
    this.btnZoomIn.addEventListener('click', () => this.onZoomIn());
    this.btnZoomOut.addEventListener('click', () => this.onZoomOut());
    this.btnRecenter.addEventListener('click', () => this.onRecenter());
    this.btnReset.addEventListener('click', () => this.onReset());

    this.btnMute.addEventListener('click', () => {
      const isMuted = sound.toggleMute();
      this.btnMute.innerHTML = isMuted 
        ? `<svg width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path d="M11 5L6 9H2v6h4l5 4V5z"></path><line x1="23" y1="9" x2="17" y2="15"></line><line x1="17" y1="9" x2="23" y2="15"></line></svg>`
        : `<svg width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"></polygon><path d="M19.07 4.93a10 10 0 0 1 0 14.14M15.54 8.46a5 5 0 0 1 0 7.07"></path></svg>`;
    });
  }

  show(startName, destName) {
    this.originLabel.textContent = startName;
    this.destLabel.textContent = destName;
    this.stepsValue.textContent = '0';
    this.historyChain.innerHTML = '';
    this.hudElement.classList.add('active');
  }

  hide() {
    this.hudElement.classList.remove('active');
  }

  updateSteps(count) {
    this.stepsValue.textContent = String(count);
  }

  updatePathHistory(pathNodes, activeNodeId) {
    this.historyChain.innerHTML = '';

    pathNodes.forEach((node, index) => {
      const isLast = index === pathNodes.length - 1;
      const isActive = node.id === activeNodeId;

      const nodeBtn = document.createElement('button');
      nodeBtn.className = `history-node ${isActive ? 'active' : ''}`;
      nodeBtn.textContent = node.name;
      nodeBtn.title = 'Click to backtrack to this concept';
      nodeBtn.addEventListener('click', () => {
        this.onBacktrack(node);
      });

      this.historyChain.appendChild(nodeBtn);

      if (!isLast) {
        const sep = document.createElement('span');
        sep.className = 'history-separator';
        sep.textContent = '→';
        this.historyChain.appendChild(sep);
      }
    });

    // Auto-scroll history container to latest
    this.historyChain.parentElement.scrollLeft = this.historyChain.parentElement.scrollWidth;
  }
}
