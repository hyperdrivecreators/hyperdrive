class GameOver extends Phaser.Scene {
  constructor() {
    super({ key: "Gameover" });
  }

  init(data) {
    this.elapsedTime = data?.elapsedTime ?? 0;
    this.currentScore = data?.score ?? 0;
    this.totalTijolinhos =
      data?.totalTijolinhos ?? this.game.totalTijolinhos ?? 0;

    let room = new URLSearchParams(window.location.search).get("room");
    if (room) {
      this.game.setRoom(room);
      this.game.socket.emit("join-room", this.game.room);
    }
  }

  create() {
    // Adicionar imagem de game over como fundo cobrindo toda a tela
    const gameOverImage = this.add.image(
      this.cameras.main.width / 2,
      this.cameras.main.height / 2,
      "gameover",
    );
    gameOverImage.setScrollFactor(0);
    gameOverImage.setDisplaySize(
      this.cameras.main.width,
      this.cameras.main.height,
    );

    const minutes = Math.floor(this.elapsedTime / 60);
    const seconds = this.elapsedTime % 60;
    const formattedTime = `${String(minutes).padStart(2, "0")}:${String(
      seconds,
    ).padStart(2, "0")}`;

    this.add
      .text(
        this.cameras.main.width / 2,
        this.cameras.main.height / 2 + 60,
        `Tempo jogado: ${formattedTime}`,
        {
          fontSize: "32px",
          fill: "#ffffff",
          stroke: "#000000",
          strokeThickness: 4,
        },
      )
      .setOrigin(0.5)
      .setScrollFactor(0);

    this.add
      .text(
        this.cameras.main.width / 2,
        this.cameras.main.height / 2 + 90,
        `Tijolinhos desta partida: ${this.currentScore}`,
        {
          fontSize: "30px",
          fill: "#ffd700",
          stroke: "#000000",
          strokeThickness: 4,
        },
      )
      .setOrigin(0.5)
      .setScrollFactor(0);

    this.add
      .text(
        this.cameras.main.width / 2,
        this.cameras.main.height / 2 + 130,
        `Tijolinhos totais: ${this.totalTijolinhos}`,
        {
          fontSize: "28px",
          fill: "#ffd700",
          stroke: "#000000",
          strokeThickness: 4,
        },
      )
      .setOrigin(0.5)
      .setScrollFactor(0);

    if (this.game.isHost) {
      const restartButton = this.add
        .text(
          this.cameras.main.width / 2 - 160,
          this.cameras.main.height / 2 + 210,
          "Reiniciar jogo",
          {
            fontSize: "28px",
            fill: "#00ff00",
            stroke: "#000000",
            strokeThickness: 5,
            backgroundColor: "#222222",
            padding: { x: 20, y: 10 },
          },
        )
        .setOrigin(0.5)
        .setScrollFactor(0)
        .setInteractive({ useHandCursor: true })
        .on("pointerdown", () => this.restartGame());

      restartButton.on("pointerover", () =>
        restartButton.setStyle({ fill: "#ffff00" }),
      );
      restartButton.on("pointerout", () =>
        restartButton.setStyle({ fill: "#00ff00" }),
      );

      const depositButton = this.add
        .text(
          this.cameras.main.width / 2 + 160,
          this.cameras.main.height / 2 + 210,
          "Depositar tijolinhos",
          {
            fontSize: "28px",
            fill: "#00bfff",
            stroke: "#000000",
            strokeThickness: 5,
            backgroundColor: "#222222",
            padding: { x: 20, y: 10 },
          },
        )
        .setOrigin(0.5)
        .setScrollFactor(0)
        .setInteractive({ useHandCursor: true })
        .on("pointerdown", () => this.scene.start("finalFeliz"));

      depositButton.on("pointerover", () =>
        depositButton.setStyle({ fill: "#ffffff" }),
      );
      depositButton.on("pointerout", () =>
        depositButton.setStyle({ fill: "#00bfff" }),
      );
    } else {
      this.add
        .text(
          this.cameras.main.width / 2,
          this.cameras.main.height / 2 + 210,
          "Aguardando jogador 1 reiniciar...",
          {
            fontSize: "24px",
            fill: "#ffffff",
            stroke: "#000000",
            strokeThickness: 4,
          },
        )
        .setOrigin(0.5)
        .setScrollFactor(0);
    }

    this.game.socket.once("game-started", ({ player, asteroids }) => {
      if (player === "navejogador1") this.game.localPlayer = "navejogador2";
      else this.game.localPlayer = "navejogador1";

      this.scene.stop("Gameover");
      this.scene.start("scene0", asteroids);
    });

    this.game.socket.on("restart-game", () => {
      this.scene.stop("Gameover");
      this.scene.start("player");
    });
  }

  restartGame() {
    // Envia pedido de reinício apenas — não muda de cena localmente.
    // O emissor (jogador 1 / host) deve permanecer na tela Game Over.
    this.game.socket.emit("restart-game", this.game.room);
  }
}

export default GameOver;
