class scene0 extends Phaser.Scene {
  constructor() {
    super("scene0");

    this.threshold = 0.1;
    this.speed = 400;
    this.direction = undefined;
    this.currentAnim = null;
    this.timer = 0;
    this.turboActive = false;
    this.shieldActive = false;
    this.turboReady = true;
    this.turboCooldownEndsAt = 0;
    this.turboTimer = null;
    this.shieldTimer = null;
    this.shieldSprite = null;
    this.shieldRadius = 80;
    this.isTurboPlayer = false;
    this.isShieldPlayer = false;
    this.margin = 200;
    this.gameOver = false;
  }

  create(asteroids) {
    this.gameOver = false;
    this.timer = 0; // Zerar o timer no início da cena

    this.worldWidth = 3200;
    this.worldHeight = 1925;

    this.add
      .tileSprite(0, 0, this.worldWidth, this.worldHeight, "mapa")
      .setOrigin(0)
      .setDepth(-1);

    this.physics.world.setBounds(0, 0, this.worldWidth, this.worldHeight);
    this.cameras.main.setBounds(0, 0, this.worldWidth, this.worldHeight);

    this.selectedShip = this.game.localPlayer || "navejogador1";
    this.isTurboPlayer = this.selectedShip === "navejogador2";
    this.isShieldPlayer = !this.isTurboPlayer;

    const ships = ["navejogador1", "navejogador2"];
    const directions = [
      { key: "walk-up", start: 0, end: 3 },
      { key: "walk-left", start: 4, end: 7 },
      { key: "walk-down", start: 8, end: 11 },
      { key: "walk-right", start: 12, end: 15 },
    ];

    ships.forEach((ship) => {
      directions.forEach((direction) => {
        this.anims.create({
          key: `${ship}-${direction.key}`,
          frames: this.anims.generateFrameNumbers(ship, {
            start: direction.start,
            end: direction.end,
          }),
          frameRate: 10,
          repeat: -1,
        });
      });
    });

    // Animações para o inimigo (policia)
    this.anims.create({
      key: "inimigo-walk-up",
      frames: this.anims.generateFrameNumbers("policia", { start: 0, end: 3 }),
      frameRate: 10,
      repeat: -1,
    });

    this.anims.create({
      key: "inimigo-walk-left",
      frames: this.anims.generateFrameNumbers("policia", { start: 4, end: 7 }),
      frameRate: 10,
      repeat: -1,
    });

    this.anims.create({
      key: "inimigo-walk-right",
      frames: this.anims.generateFrameNumbers("policia", {
        start: 12,
        end: 15,
      }),
      frameRate: 10,
      repeat: -1,
    });

    this.anims.create({
      key: "inimigo-walk-down",
      frames: this.anims.generateFrameNumbers("policia", { start: 8, end: 11 }),
      frameRate: 10,
      repeat: -1,
    });

    this.anims.create({
      key: "explosao",
      frames: this.anims.generateFrameNumbers("explosao", { start: 0, end: 4 }),
      frameRate: 12,
      repeat: 0,
    });

    this.music = this.sound.add("musica", { loop: true }).play();

    this.nave = this.physics.add.sprite(400, 225, this.selectedShip, 0);
    this.nave.setCollideWorldBounds(true);
    this.nave.setDrag(300); // Desaceleração natural
    this.nave.setMaxVelocity(400); // Velocidade máxima
    this.nave.body.setSize(32, 32); // Diminuir área de colisão
    this.nave.body.setOffset(16, 16); // Centralizar o body
    this.cameras.main.startFollow(this.nave, true, 0.1, 0.1);

    // Criar nave inimiga
    this.inimigo = this.physics.add.sprite(800, 300, "policia", 0);
    this.inimigo.setCollideWorldBounds(true);
    this.inimigo.speed = 20; // Velocidade do inimigo
    this.inimigo.body.setSize(32, 32); // Diminuir área de colisão
    this.inimigo.body.setOffset(16, 16); // Centralizar o body

    // Asteroides
    this.asteroides = this.physics.add.group();
    asteroids.forEach(({ x, y }) => {
      const xInMap = x * this.worldWidth;
      const yInMap = y * this.worldHeight;
      const asteroid = this.asteroides.create(xInMap, yInMap, "asteroid");
      asteroid.body.setSize(48, 48); // Diminuir hitbox dos asteroides
      asteroid.body.setOffset(24, 24); // Centralizar o body no sprite de 96x96
      asteroid.setCollideWorldBounds(true);
      asteroid.setBounce(1);
    });

    this.physics.add.collider(this.asteroides, this.asteroides);

    this.physics.add.collider(this.nave, this.asteroides, () => {
      // Colisão com asteroides: parar a nave
      this.nave.setVelocity(0, 0);
    });

    this.enemies = this.physics.add.group();

    this.physics.add.collider(
      this.enemies,
      this.asteroides,
      (inimigo, asteroide) => {
        // Colisão com asteroides: mostrar explosão, destruir a nave policial e gerar outra
        if (inimigo && inimigo.active) {
          const explosion = this.add
            .sprite(inimigo.x, inimigo.y, "explosao", 0)
            .setDepth(1);
          explosion.play("explosao");
          explosion.on("animationcomplete", () => {
            explosion.destroy();
          });

          this.enemies.remove(inimigo, true, true);

          let x = Phaser.Math.Between(
            0 + this.margin,
            this.physics.world.bounds.width - this.margin,
          );
          let y = Phaser.Math.Between(
            0 + this.margin,
            this.physics.world.bounds.height - this.margin,
          );

          if (this.game.isHost) this.spawnEnemy(x, y);
        }
      },
    );

    this.enemies.add(this.inimigo);
    this.physics.add.collider(
      this.nave,
      this.enemies,
      this.onCollision,
      null,
      this,
    );

    this.joystick = this.plugins.get("rexvirtualjoystickplugin").add(this, {
      x: 100,
      y: 420,
      radius: 50,
      base: this.add.circle(0, 0, 50, 0xcccccc),
      thumb: this.add.circle(0, 0, 25, 0x666666),
    });

    this.joystick.on("update", () => {
      const angle = Phaser.Math.DegToRad(this.joystick.angle);
      const force = this.joystick.force;

      // Lógica para movimentação dos asteroides
      if (force > this.threshold) {
        this.direction = new Phaser.Math.Vector2(
          Math.cos(angle),
          Math.sin(angle),
        ).normalize();

        const accel = this.turboActive ? 900 : 500; // Aceleração da nave
        this.nave.setMaxVelocity(this.turboActive ? 650 : 400);
        this.nave.setAcceleration(
          this.direction.x * accel,
          this.direction.y * accel,
        );

        let desiredAnim = null;
        if (this.joystick.angle >= -135 && this.joystick.angle < -45) {
          desiredAnim = `${this.selectedShip}-walk-up`;
        } else if (this.joystick.angle >= -45 && this.joystick.angle < 45) {
          desiredAnim = `${this.selectedShip}-walk-right`;
        } else if (this.joystick.angle >= 45 && this.joystick.angle < 135) {
          desiredAnim = `${this.selectedShip}-walk-down`;
        } else {
          desiredAnim = `${this.selectedShip}-walk-left`;
        }

        if (desiredAnim && this.currentAnim !== desiredAnim) {
          this.currentAnim = desiredAnim;
          this.nave.anims.play(desiredAnim, true);
        }
      } else {
        // Joystick não acionado: motor desligado
        this.nave.setAcceleration(0, 0);
        this.nave.anims.stop();
        this.currentAnim = null;
      }
    });
    // Botão de poder
    const powerIcon = this.isTurboPlayer ? "turbo" : "escudo";
    this.turboButton = this.add
      .image(
        this.cameras.main.width - 40,
        this.cameras.main.height - 40,
        powerIcon,
      )
      .setOrigin(1, 1)
      .setScale(2)
      .setScrollFactor(0)
      .setInteractive({ useHandCursor: true })
      .setAlpha(0.95);

    this.turboButton.on("pointerdown", this.handlePowerButton, this);

    this.turboCooldownText = this.add
      .text(
        this.cameras.main.width - 40,
        this.cameras.main.height - 110,
        "PRONTO",
        {
          fontSize: "18px",
          fill: "#ffffff",
          stroke: "#000000",
          strokeThickness: 3,
        },
      )
      .setOrigin(0.5)
      .setScrollFactor(0);

    this.updateTurboButtonState();

    this.textTime = this.add
      .text(16, 16, `Timer: ${this.timer}`, {
        fontSize: "32px",
        fill: "#fff",
      })
      .setScrollFactor(0);
    this.timerInterval = setInterval(() => {
      this.timer += 1;
      this.textTime.setText(`Time: ${this.timer}`);

      if (this.timer % 10 === 0 && this.game.isHost) {
        let x = Phaser.Math.Between(
          0 + this.margin,
          this.physics.world.bounds.width - this.margin,
        );
        let y = Phaser.Math.Between(
          0 + this.margin,
          this.physics.world.bounds.height - this.margin,
        );

        if (this.game.isHost) this.spawnEnemy(x, y);
      }
    }, 1000);

    this.remotePlayers = [];

    this.game.socket.on("scene0", (state) => {
      if (state.nave) {
        try {
          if (state.nave.id === this.game.socket.id) return;

          let remotePlayer = this.remotePlayers.find(
            (p) => p.id === state.nave.id,
          );

          const texture = state.nave.texture || "navejogador1";
          const animation = state.nave.animation || `${texture}-walk-up`;

          if (!remotePlayer) {
            remotePlayer = this.add.sprite(
              state.nave.x,
              state.nave.y,
              texture,
              state.nave.frame || 0,
            );
            this.remotePlayers.push({
              id: state.nave.id,
              sprite: remotePlayer,
            });
          }

          if (remotePlayer.sprite.texture.key !== texture) {
            remotePlayer.sprite.setTexture(texture);
          }

          remotePlayer.sprite.setPosition(state.nave.x, state.nave.y);

          if (remotePlayer.sprite.anims.currentAnim?.key !== animation) {
            remotePlayer.sprite.anims.play(animation, true);
          }
        } catch (e) {
          console.error("Error updating remote player:", e);
        }
      }

      if (state.enemy) {
        this.spawnEnemy(state.enemy.x, state.enemy.y);
      }
    });

    this.game.socket.on("scene0", (state) => {
      if (state.artifacts) {
        state.artifacts.forEach((artifact) => {
          let x = artifact.x * this.tilemap.widthInPixels;
          let y = artifact.y * this.tilemap.heightInPixels;
          this.artifacts.create(x, y, "projectiles");
        });

        this.artifacts.getChildren().forEach((artifact) => {
          artifact;
          artifact.body.setAllowGravity(false);
          artifact.anims.play("artifact-projectiles");
        });
      }

      if (state.artifactCollected) {
        let artifact = this.artifacts.getChildren()[state.artifactCollected];

        if (artifact) {
          artifact.disableBody(true, true);
        }
      }

      if (state.player) {
        try {
          if (state.player.id === this.game.socket.id) return;

          let remotePlayer = this.remotePlayers.find(
            (p) => p.id === state.player.id,
          );

          if (!remotePlayer) {
            remotePlayer = this.add.sprite(
              state.player.x,
              state.player.y,
              "character",
              0,
            );

            this.remotePlayers.push({
              id: state.player.id,
              sprite: remotePlayer,
            });
          }

          remotePlayer.sprite.setFlipX(state.player.flip.x);
          remotePlayer.sprite.setFlipY(state.player.flip.y);
          remotePlayer.sprite.setPosition(state.player.x, state.player.y);
          if (state.player.animation)
            remotePlayer.sprite.anims.play(state.player.animation, true);
          else if (state.player.texture)
            remotePlayer.sprite.setTexture(state.player.texture);
        } catch (e) {
          console.error("Error updating remote player:", e);
        }
      }
    });

    // Listener para quando o outro jogador sofrer colisão
    this.game.socket.on("collision-event", (data) => {
      console.log("Outro jogador colidiu! Game Over para ambos.", data);
      this.showGameOver();
    });

    this.game.socket.on("game-over", (data) => {
      console.log("Game Over recebido do outro jogador.", data);
      this.showGameOver();
    });
  }

  update() {
    if (this.gameOver) return; // Evitar atualizações se o jogo já acabou

    this.updateTurboButtonState();

    if (this.shieldSprite) {
      this.shieldSprite.setPosition(this.nave.x, this.nave.y);
    }

    if (this.shieldActive) {
      this.enemies.getChildren().forEach((inimigo) => {
        const distance = Phaser.Math.Distance.Between(
          inimigo.x,
          inimigo.y,
          this.nave.x,
          this.nave.y,
        );

        if (distance <= this.shieldRadius) {
          this.destroyEnemy(inimigo);
        }
      });
    }

    // Lógica de perseguição de todos inimigos do grupo
    this.enemies.getChildren().forEach((inimigo) => {
      const dx = this.nave.x - inimigo.x;
      const dy = this.nave.y - inimigo.y;
      const distance = Math.sqrt(dx * dx + dy * dy);

      if (distance > 10) {
        // Evitar movimento se muito próximo
        const direction = new Phaser.Math.Vector2(dx, dy).normalize();
        inimigo.setVelocity(
          direction.x * inimigo.speed,
          direction.y * inimigo.speed,
        );

        // Determinar a direção e tocar animação
        const angle = Phaser.Math.RadToDeg(Math.atan2(dy, dx));
        if (angle >= -135 && angle < -45) {
          inimigo.anims.play("inimigo-walk-up", true);
        } else if (angle >= -45 && angle < 45) {
          inimigo.anims.play("inimigo-walk-right", true);
        } else if (angle >= 45 && angle < 135) {
          inimigo.anims.play("inimigo-walk-down", true);
        } else {
          inimigo.anims.play("inimigo-walk-left", true);
        }
      } else {
        inimigo.setVelocity(0, 0);
        inimigo.anims.stop();
      }
    });

    try {
      this.game.socket.emit("scene0", this.game.room, {
        nave: {
          id: this.game.socket.id,
          x: this.nave.x,
          y: this.nave.y,
          texture: this.selectedShip,
          animation: this.nave.anims.currentAnim
            ? this.nave.anims.currentAnim.key
            : `${this.selectedShip}-walk-up`,
          frame: this.nave.anims.currentFrame
            ? this.nave.anims.currentFrame.index
            : 0,
        },
      });
    } catch (e) {
      console.error("Error updating player:", e);
    }
  }

  handlePowerButton() {
    if (!this.turboReady || this.turboActive || this.shieldActive) {
      return;
    }

    if (this.isTurboPlayer) {
      this.activateTurbo();
      return;
    }

    if (this.isShieldPlayer) {
      this.activateShield();
    }
  }

  activateTurbo() {
    this.turboActive = true;
    this.turboReady = false;
    this.turboCooldownEndsAt = this.time.now + 12000;

    if (this.turboTimer) {
      this.turboTimer.remove();
    }

    this.turboTimer = this.time.delayedCall(
      2000,
      () => {
        this.turboActive = false;
        this.updateTurboButtonState();
        this.turboTimer = null;
      },
      null,
      this,
    );

    this.updateTurboButtonState();
  }

  activateShield() {
    this.shieldActive = true;
    this.turboReady = false;
    this.turboCooldownEndsAt = this.time.now + 12000;

    this.ensureShieldSprite();
    this.shieldSprite.setVisible(true);
    this.shieldSprite.setAlpha(0.9);

    if (this.shieldTimer) {
      this.shieldTimer.remove();
    }

    this.shieldTimer = this.time.delayedCall(
      4000,
      () => {
        this.shieldActive = false;
        this.shieldSprite.setVisible(false);
        this.updateTurboButtonState();
        this.shieldTimer = null;
      },
      null,
      this,
    );

    this.updateTurboButtonState();
  }

  ensureShieldSprite() {
    if (this.shieldSprite) {
      return;
    }

    this.shieldSprite = this.add
      .image(this.nave.x, this.nave.y, "barreira")
      .setDepth(5)
      .setScale(0.25)
      .setAlpha(0.9);
  }

  destroyEnemy(inimigo) {
    if (!inimigo || !inimigo.active) {
      return;
    }

    const explosion = this.add
      .sprite(inimigo.x, inimigo.y, "explosao", 0)
      .setDepth(1);
    explosion.play("explosao");
    explosion.on("animationcomplete", () => {
      explosion.destroy();
    });

    this.enemies.remove(inimigo, true, true);

    let x = Phaser.Math.Between(
      0 + this.margin,
      this.physics.world.bounds.width - this.margin,
    );
    let y = Phaser.Math.Between(
      0 + this.margin,
      this.physics.world.bounds.height - this.margin,
    );
    if (this.game.isHost) this.spawnEnemy(x, y);
  }

  updateTurboButtonState() {
    if (this.turboActive) {
      this.turboButton.setTint(0xffd700);
      this.turboButton.setAlpha(1);
      this.turboCooldownText.setText("ATIVO");
      return;
    }

    if (this.shieldActive) {
      this.turboButton.setTint(0x87cefa);
      this.turboButton.setAlpha(1);
      this.turboCooldownText.setText("ATIVO");
      return;
    }

    if (!this.turboReady && this.turboCooldownEndsAt > this.time.now) {
      const remainingSeconds = Math.max(
        1,
        Math.ceil((this.turboCooldownEndsAt - this.time.now) / 1000),
      );

      this.turboButton.setTint(0x8c8c8c);
      this.turboButton.setAlpha(0.45);
      this.turboCooldownText.setText(`CD ${remainingSeconds}s`);
      return;
    }

    if (!this.turboReady) {
      this.turboReady = true;
      this.turboCooldownEndsAt = 0;
    }

    this.turboButton.setTint(0x7cff7c);
    this.turboButton.setAlpha(1);
    this.turboCooldownText.setText("PRONTO");
  }

  spawnEnemy(x, y) {
    if (this.game.isHost)
      this.game.socket.emit("scene0", this.game.room, { enemy: { x, y } });

    if (
      Phaser.Math.Distance.Between(x, y, this.nave.x, this.nave.y) <
      this.activateShieldmargin
    ) {
      x = Phaser.Math.Between(
        0 + this.margin,
        this.physics.world.bounds.width - this.margin,
      );
      y = Phaser.Math.Between(
        0 + this.margin,
        this.physics.world.bounds.height - this.margin,
      );
    }

    const novoInimigo = this.physics.add.sprite(x, y, "policia", 0);
    novoInimigo.setCollideWorldBounds(true);
    novoInimigo.speed = 20;
    novoInimigo.body.setSize(32, 32);
    novoInimigo.body.setOffset(16, 16);
    this.enemies.add(novoInimigo);
    this.physics.add.collider(
      this.nave,
      novoInimigo,
      this.onCollision,
      null,
      this,
    );
  }

  onCollision(player, enemy) {
    if (this.shieldActive && player === this.nave) {
      return;
    }

    // Quando colidir, emitir evento para o outro jogador também
    try {
      this.game.socket.emit("collision-event", this.game.room, {
        playerId: this.game.socket.id,
      });
    } catch (e) {
      console.error("Erro ao emitir evento de colisão:", e);
    }

    // Mostrar Game Over localmente
    this.showGameOver();
  }

  showGameOver() {
    if (!this.gameOver) {
      this.gameOver = true;

      if (this.timerInterval) {
        clearInterval(this.timerInterval);
        this.timerInterval = null;
      }

      // Cancelar timers de turbo e shield
      if (this.turboTimer) {
        this.turboTimer.remove();
        this.turboTimer = null;
      }

      if (this.shieldTimer) {
        this.shieldTimer.remove();
        this.shieldTimer = null;
      }

      this.game.socket.emit("game-over", this.game.room, {
        playerId: this.game.socket.id,
      });

      this.scene.stop("scene0");
      this.scene.start("Gameover", {
        elapsedTime: this.timer,
      });
    }
  }
}

export default scene0;
