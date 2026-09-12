/**
 * Landing Page Controller
 * Handles concept input, preset chips, dynamic random pairs, AI Key configuration, and start transition.
 */

export class LandingUI {
  constructor(options) {
    this.onStartDrift = options.onStartDrift;
    this.onSaveApiKey = options.onSaveApiKey;
    this.getApiKey = options.getApiKey;
    
    this.screen = document.getElementById('landing-screen');
    this.startInput = document.getElementById('start-concept');
    this.destInput = document.getElementById('dest-concept');
    this.driftBtn = document.getElementById('btn-drift');
    this.randomBtn = document.getElementById('btn-random');
    this.presetChips = document.querySelectorAll('.preset-chip');

    // Settings / API key modal elements
    this.settingsBtn = document.getElementById('btn-api-settings');
    this.settingsModal = document.getElementById('api-settings-modal');
    this.apiKeyInput = document.getElementById('input-api-key');
    this.saveKeyBtn = document.getElementById('btn-save-key');
    this.closeKeyBtn = document.getElementById('btn-close-key');

    this.initEvents();
  }

  initEvents() {
    this.driftBtn.addEventListener('click', () => this.handleDriftClick());

    // Enter key triggers drift
    [this.startInput, this.destInput].forEach(input => {
      input.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') {
          this.handleDriftClick();
        }
      });
    });

    // Random Drift button
    this.randomBtn.addEventListener('click', async () => {
      try {
        const res = await fetch('/api/random');
        if (res.ok) {
          const data = await res.json();
          this.startInput.value = data.start;
          this.destInput.value = data.destination;
          this.flashInputs();
        }
      } catch (e) {
        const fallbacks = [
          ['Guitar', 'Mars'],
          ['Cat', 'Moon'],
          ['Pizza', 'Quantum Mechanics'],
          ['Dinosaurs', 'TikTok'],
          ['Coffee', 'Black Holes']
        ];
        const choice = fallbacks[Math.floor(Math.random() * fallbacks.length)];
        this.startInput.value = choice[0];
        this.destInput.value = choice[1];
        this.flashInputs();
      }
    });

    // Preset chip clicks
    this.presetChips.forEach(chip => {
      chip.addEventListener('click', () => {
        const start = chip.getAttribute('data-start');
        const dest = chip.getAttribute('data-dest');
        if (start && dest) {
          this.startInput.value = start;
          this.destInput.value = dest;
          this.handleDriftClick();
        }
      });
    });

    // Settings Modal
    if (this.settingsBtn && this.settingsModal) {
      this.settingsBtn.addEventListener('click', () => {
        if (this.apiKeyInput && this.getApiKey) {
          this.apiKeyInput.value = this.getApiKey();
        }
        this.settingsModal.classList.add('active');
      });

      this.closeKeyBtn?.addEventListener('click', () => {
        this.settingsModal.classList.remove('active');
      });

      this.saveKeyBtn?.addEventListener('click', () => {
        const key = this.apiKeyInput.value.trim();
        if (this.onSaveApiKey) {
          this.onSaveApiKey(key);
        }
        this.settingsModal.classList.remove('active');
      });
    }
  }

  handleDriftClick() {
    const start = this.startInput.value.trim();
    const dest = this.destInput.value.trim();

    if (!start || !dest) {
      window.showToast?.('Please enter both a start concept and a destination.', 'error');
      return;
    }

    if (start.toLowerCase() === dest.toLowerCase()) {
      window.showToast?.('Start and destination concepts must be different.', 'error');
      return;
    }

    this.onStartDrift(start, dest);
  }

  flashInputs() {
    [this.startInput, this.destInput].forEach(el => {
      el.style.borderColor = 'var(--accent-blue)';
      setTimeout(() => {
        el.style.borderColor = '';
      }, 400);
    });
  }

  hide() {
    this.screen.classList.add('hidden');
  }

  show() {
    this.screen.classList.remove('hidden');
  }
}
