/**
 * Completion Modal Controller
 * Displays "CONNECTION FOUND", steps taken, shortest path discovered,
 * drift score, and journey flow visualization.
 */

import { sound } from '../canvas/audio.js';

export class CompletionUI {
  constructor(options) {
    this.onRestart = options.onRestart;
    this.onInspect = options.onInspect;

    this.modal = document.getElementById('completion-modal');
    this.stepsNum = document.getElementById('metric-user-steps');
    this.shortestNum = document.getElementById('metric-shortest-steps');
    this.efficiencyNum = document.getElementById('metric-efficiency');
    this.pathFlow = document.getElementById('completion-path-flow');
    this.commentary = document.getElementById('drift-commentary');
    
    this.btnRestart = document.getElementById('btn-completion-restart');
    this.btnInspect = document.getElementById('btn-completion-inspect');

    this.initEvents();
  }

  initEvents() {
    this.btnRestart.addEventListener('click', () => {
      this.hide();
      this.onRestart();
    });

    this.btnInspect.addEventListener('click', () => {
      this.hide();
      if (this.onInspect) this.onInspect();
    });
  }

  show(data) {
    sound.playCompletionFanfare();

    this.stepsNum.textContent = String(data.userSteps);
    this.shortestNum.textContent = String(data.shortestSteps);
    this.efficiencyNum.textContent = `${data.efficiency}%`;
    this.commentary.textContent = data.summary || `You drifted ${data.driftDistance} steps further.`;

    // Render path steps flow
    this.pathFlow.innerHTML = '';
    const userPath = data.userPath || [];
    userPath.forEach((conceptName, index) => {
      const isStart = index === 0;
      const isDest = index === userPath.length - 1;

      const badge = document.createElement('span');
      badge.className = `path-step-badge ${isStart ? 'start' : ''} ${isDest ? 'dest' : ''}`;
      badge.textContent = conceptName;
      this.pathFlow.appendChild(badge);

      if (!isDest) {
        const arrow = document.createElement('span');
        arrow.className = 'path-step-arrow';
        arrow.textContent = '→';
        this.pathFlow.appendChild(arrow);
      }
    });

    this.modal.classList.add('active');
  }

  hide() {
    this.modal.classList.remove('active');
  }
}
