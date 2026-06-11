import "./style.css";
import { Game } from "./game/Game.js";

const canvas = document.getElementById("game");
const overlay = document.getElementById("overlay");
const startBtn = document.getElementById("start-btn");

const game = new Game(canvas);

startBtn.addEventListener("click", () => {
  overlay.classList.add("hidden");
  game.start();
});
