import config from "./config.js";
import scene0 from "./scene0.js";
import TelaInicial from "./tela.js";
import Preloader from "./preloader.js";
import room from "./room.js";
import player from "./player.js";
import GameOver from "./gameover.js";
import finalfeliz from "./final-feliz.js";

class Game extends Phaser.Game {
  constructor() {
    super(config);

    this.room = null;
    this.totalTijolinhos = 0;

    this.scene.add("Preloader", Preloader);
    this.scene.add("TelaInicial", TelaInicial);
    this.scene.add("scene0", scene0);
    this.scene.add("room", room);
    this.scene.add("player", player);
    this.scene.add("Gameover", GameOver);
    this.scene.add("finalFeliz", finalfeliz);
    this.scene.start("TelaInicial"); // Inicia com a tela inicial

    if (location.hostname.match(/localhost|127\.0\.0\.1/)) {
      this.socket = io("http://localhost:3000");
    } else if (location.hostname.match(/github\.dev/)) {
      this.socket = io(location.hostname.replace("8080", "3000"));
    } else {
      this.socket = io();
    }

    this.socket.on("connect", () => {
      console.log("Socket ID:", this.socket.id);

      this.socket.on("change-scene", (scene) => {
        let currentScene = this.scene.scenes.find((s) => s.scene.isActive())
          .scene.key;

        if (currentScene !== scene) {
          console.log("Changing scene to:", scene);
          this.scene.stop(currentScene);
          this.scene.start(scene);
        }
      });
    });
  }

  getRoomScoreKey(room) {
    return `totalTijolinhos_${room}`;
  }

  loadRoomScore(room) {
    if (!room) return 0;
    const savedTotal = parseInt(
      localStorage.getItem(this.getRoomScoreKey(room)) || "0",
      10,
    );
    return Number.isNaN(savedTotal) ? 0 : savedTotal;
  }

  saveRoomScore() {
    if (!this.room) return;
    localStorage.setItem(this.getRoomScoreKey(this.room), this.totalTijolinhos);
  }

  setRoom(room) {
    this.room = room;
    this.totalTijolinhos = this.loadRoomScore(room);
  }
}

window.onload = () => {
  window.game = new Game();
};
