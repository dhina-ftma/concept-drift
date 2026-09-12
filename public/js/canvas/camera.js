/**
 * Camera System for 2D Conceptual Canvas
 * Handles pan, zoom, inertia, touch gestures, and smooth target tweening.
 */

export class Camera {
  constructor(canvas) {
    this.canvas = canvas;
    
    // Current state in world coordinates
    this.x = 0;
    this.y = 0;
    this.zoom = 1.0;

    // Target state for smooth interpolation
    this.targetX = 0;
    this.targetY = 0;
    this.targetZoom = 1.0;

    // Inertia & velocity
    this.vx = 0;
    this.vy = 0;
    this.friction = 0.92;

    // Zoom limits
    this.minZoom = 0.25;
    this.maxZoom = 3.5;

    // Tweening animation
    this.isTweening = false;
    this.tweenStartTime = 0;
    this.tweenDuration = 800; // ms
    this.tweenStartX = 0;
    this.tweenStartY = 0;
    this.tweenStartZoom = 1;
  }

  screenToWorld(screenX, screenY) {
    const rect = this.canvas.getBoundingClientRect();
    const cx = rect.width / 2;
    const cy = rect.height / 2;
    return {
      x: (screenX - cx) / this.zoom + this.x,
      y: (screenY - cy) / this.zoom + this.y
    };
  }

  worldToScreen(worldX, worldY) {
    const rect = this.canvas.getBoundingClientRect();
    const cx = rect.width / 2;
    const cy = rect.height / 2;
    return {
      x: (worldX - this.x) * this.zoom + cx,
      y: (worldY - this.y) * this.zoom + cy
    };
  }

  panBy(dx, dy) {
    this.isTweening = false;
    this.targetX -= dx / this.zoom;
    this.targetY -= dy / this.zoom;
    this.x = this.targetX;
    this.y = this.targetY;
    this.vx = -dx / this.zoom;
    this.vy = -dy / this.zoom;
  }

  zoomAt(screenX, screenY, factor) {
    this.isTweening = false;
    const worldBefore = this.screenToWorld(screenX, screenY);
    
    this.targetZoom = Math.max(this.minZoom, Math.min(this.maxZoom, this.targetZoom * factor));
    this.zoom = this.targetZoom;

    const worldAfter = this.screenToWorld(screenX, screenY);
    this.targetX += (worldBefore.x - worldAfter.x);
    this.targetY += (worldBefore.y - worldAfter.y);
    this.x = this.targetX;
    this.y = this.targetY;
  }

  /**
   * Smoothly animates the camera to center on a world coordinate
   */
  driftTo(targetWorldX, targetWorldY, targetZoom = null, duration = 900) {
    this.isTweening = true;
    this.tweenStartTime = performance.now();
    this.tweenDuration = duration;
    
    this.tweenStartX = this.x;
    this.tweenStartY = this.y;
    this.tweenStartZoom = this.zoom;

    this.targetX = targetWorldX;
    this.targetY = targetWorldY;
    if (targetZoom !== null) {
      this.targetZoom = Math.max(this.minZoom, Math.min(this.maxZoom, targetZoom));
    }
  }

  update(timestamp = performance.now()) {
    if (this.isTweening) {
      const elapsed = timestamp - this.tweenStartTime;
      const progress = Math.min(1.0, elapsed / this.tweenDuration);
      
      // Smooth cubic ease out
      const ease = 1 - Math.pow(1 - progress, 3);

      this.x = this.tweenStartX + (this.targetX - this.tweenStartX) * ease;
      this.y = this.tweenStartY + (this.targetY - this.tweenStartY) * ease;
      this.zoom = this.tweenStartZoom + (this.targetZoom - this.tweenStartZoom) * ease;

      if (progress >= 1.0) {
        this.isTweening = false;
      }
    } else {
      // Apply momentum / inertia
      if (Math.abs(this.vx) > 0.01 || Math.abs(this.vy) > 0.01) {
        this.x += this.vx;
        this.y += this.vy;
        this.targetX = this.x;
        this.targetY = this.y;
        this.vx *= this.friction;
        this.vy *= this.friction;
      } else {
        this.vx = 0;
        this.vy = 0;
      }
    }
  }
}
