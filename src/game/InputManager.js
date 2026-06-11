export class InputManager {
  constructor(canvas) {
    this.keys = new Set();
    this.mouse = { x: 0, y: 0, down: false };
    this.canvas = canvas;

    window.addEventListener("keydown", (e) => {
      this.keys.add(e.code);
      if (e.code === "Space") e.preventDefault();
    });
    window.addEventListener("keyup", (e) => this.keys.delete(e.code));

    canvas.addEventListener("mousemove", (e) => {
      this.mouse.x = e.clientX;
      this.mouse.y = e.clientY;
    });
    const releaseMouse = () => {
      this.mouse.down = false;
    };
    canvas.addEventListener("mousedown", () => {
      this.mouse.down = true;
    });
    canvas.addEventListener("mouseup", releaseMouse);
    window.addEventListener("mouseup", releaseMouse);
    canvas.addEventListener("mouseleave", releaseMouse);
    window.addEventListener("blur", () => {
      this.keys.clear();
      releaseMouse();
    });
  }

  getMoveDirection() {
    let x = 0;
    let z = 0;
    if (this.keys.has("KeyW") || this.keys.has("ArrowUp")) z -= 1;
    if (this.keys.has("KeyS") || this.keys.has("ArrowDown")) z += 1;
    if (this.keys.has("KeyA") || this.keys.has("ArrowLeft")) x -= 1;
    if (this.keys.has("KeyD") || this.keys.has("ArrowRight")) x += 1;

    const len = Math.hypot(x, z);
    if (len > 0) return { x: x / len, z: z / len };
    return { x: 0, z: 0 };
  }

  isShooting() {
    return this.mouse.down || this.keys.has("Space");
  }
}
