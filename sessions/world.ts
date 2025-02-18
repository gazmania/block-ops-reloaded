import { Player, PlayerCameraMode, PlayerEntity, World, Audio, Vector3Like } from "hytopia";
import MyEntityController from "../MyEntityController";

import mapData from '../assets/maps/map-final-fixed-cars-v2.json';

export interface GunWorldOptions {
    id: number;
    name: string;
    minPlayerCount: number;
    maxPlayerCount: number;
    maxWaitingTime: number;
}

enum GunWorldPlayState {
    WAITING,    // Waiting for players to join
    STARTING,   // Countdown to game start
    ACTIVE,     // Game is in progress
    ENDING,     // Game is ending (showing results)
    // RESTARTING  // Transitioning to new round
}

export interface GunWorldState {
    startTime: number;
    players: Player[];
    playState: GunWorldPlayState;
    roundNumber: number;
    roundStartTime?: number;
    roundEndTime?: number;
    roundDuration: number;  // in milliseconds
    scores: Map<string, number>;  // player username -> score
}

export class GunWorld extends World {
    private _lobby: World;
    private _backgroundMusic: Audio;

    private _minPlayerCount: number;
    private _maxPlayerCount: number;
    private _maxWaitingTime: number;

    private _worldState: GunWorldState;

    private readonly ROUND_DURATION = 10 * 60 * 1000; // 10 minutes per round
    private readonly ROUND_END_COUNTDOWN = 30 * 1000; // start counting down 30secs before end of round
    private readonly START_COUNTDOWN = 15 * 1000;  // 15 second countdown
    private readonly END_SCREEN_DURATION = 10 * 1000; // 10 seconds to show results

    private _lastLoggedPlayerCount: number = 0;
    private _lastCountdownTime: number = -1;

    private _spawnPoints: Vector3Like[] = [
        { x: -44, y: 2, z: 22 },
        { x: -13, y: 2, z: 35 },
        { x: 26, y: 2, z: 37 },
        { x: 36, y: 2, z: 19 },
        { x: 45, y: 2, z: -6 },
        { x: 13, y: 2, z: -39 },
        { x: -15, y: 2, z: -22 },
        { x: 0, y: 2, z: 18 },
        { x: -41, y: 2, z: -12 },
        { x: -33, y: 2, z: 18 },
        { x: -26, y: 2, z: -29 },
        { x: 4, y: 2, z: 12 },
    ];
    private _usedSpawnPoints: Vector3Like[] = [];

    public get maxPlayerCount(): number { return this._maxPlayerCount; }
    public get minPlayerCount(): number { return this._minPlayerCount; }
    public get playerCount(): number { return this._worldState.players.length; }

    public incrementScore(player: Player) {
        const score = this._worldState.scores.get(player.username);
        if (score) {
            this._worldState.scores.set(player.username, score + 1);
        }
    }

    public resetScore(player: Player) {
        const score = this._worldState.scores.get(player.username);
        if (score) {
            this._worldState.scores.set(player.username, 0);
        }
    }

    constructor(options: GunWorldOptions, lobby: World) {

        super({
            id: options.id,
            name: options.name,
            skyboxUri: "skyboxes/partly-cloudy",
            directionalLightPosition: { x: 100, y: 100, z: 100, },
            directionalLightColor: { r: 255, g: 200, b: 150, },
            directionalLightIntensity: 2,
            ambientLightColor: { r: 255, g: 200, b: 150, },
            ambientLightIntensity: 0.5

        });

        this._lobby = lobby;
        this._minPlayerCount = options.minPlayerCount;
        this._maxPlayerCount = options.maxPlayerCount;
        this._maxWaitingTime = options.maxWaitingTime;


        this._worldState = this.defaultState();

        // @ts-ignore
        this.loadMap(mapData);

        // Initialize game background music (not splash screen)
        this._backgroundMusic = new Audio({
            uri: 'audio/music-first-track.mp3',
            loop: true,
            volume: 1,
        });

        // Start playing as soon as world is created
        this._backgroundMusic.play(this);

        // Start the game loop
        setInterval(() => {
            this.tick();
        }, 1000); // Check game state every second

        // Only keep the leave command here
        this.chatManager.registerCommand("/leave", (player: Player, args: string[], message: string) => {
            // this should be done in the onPlayerLeave()
            this.entityManager.getPlayerEntitiesByPlayer(player).forEach(entity => {
                entity.despawn();
            });

            // this gives the despawn chance to run before leaving this world and joining back to the lobby
            // if despawning immediately the entity fails to despawn and is there the next time you enter the game
            setTimeout(() => {
                player.joinWorld(this._lobby);
            }, 500);
        });

        // Only keep the leave command here
        this.chatManager.registerCommand("/position", (player: Player, args: string[], message: string) => {
            this.entityManager.getPlayerEntitiesByPlayer(player).forEach(entity => {
                this.chatManager.sendPlayerMessage(player, `${JSON.stringify(entity.position)}`, "999999");
            });
        });
    }

    private tick(): void {
        switch (this._worldState.playState) {
            case GunWorldPlayState.WAITING:
                this.handleWaitingState();
                break;
            case GunWorldPlayState.STARTING:
                this.handleStartingState();
                break;
            case GunWorldPlayState.ACTIVE:
                this.handleActiveState();
                break;
            case GunWorldPlayState.ENDING:
                this.handleEndingState();
                break;
            // case GunWorldPlayState.RESTARTING:
            //     this.handleRestartingState();
            //     break;
        }
    }

    private handleWaitingState(): void {
        // Only log if player count changes
        if (this._lastLoggedPlayerCount !== this._worldState.players.length) {
            const entityCount = this.entityManager.getAllPlayerEntities().length;
            console.log(`[GAME STATE] Waiting state - Players in state: ${this._worldState.players.length}, Entities: ${entityCount}, Min needed: ${this._minPlayerCount}`);
            this._lastLoggedPlayerCount = this._worldState.players.length;
        }

        // Don't freeze players here, let startGame handle that
        const currentPlayerCount = this.entityManager.getAllPlayerEntities().length;
        if (currentPlayerCount >= this._minPlayerCount) {
            console.log(`[GAME STATE] Player threshold reached! Starting game with ${currentPlayerCount} players`);
            this.startGame();
        }
    }

    private handleStartingState(): void {
        // console.log(`[${new Date().toLocaleTimeString()}] ENTER handleStartingState()`);

        const timeElapsed = Date.now() - (this._worldState.startTime || 0);
        const remainingTime = Math.ceil((this.START_COUNTDOWN - timeElapsed) / 1000);

        // Only log on second changes
        if (remainingTime !== this._lastCountdownTime) {
            console.log(`[GAME STATE] Starting countdown: ${remainingTime}s`);
            this._lastCountdownTime = remainingTime;
            this.broadcastGameMessage(`Game starting in ${remainingTime}...`);
        }

        if (remainingTime <= 0) {
            console.log("[GAME STATE] Countdown finished, starting round!");
            this.beginRound();
        }

        // console.log(`[${new Date().toLocaleTimeString()}] EXIT handleStartingState()`);
    }

    private handleActiveState(): void {
        // console.log(`[${new Date().toLocaleTimeString()}] ENTER handleActiveState()`);

        if (!this._worldState.roundStartTime) return;

        const timeElapsed = Date.now() - this._worldState.roundStartTime;
        const timeRemaining = this._worldState.roundDuration - timeElapsed;

        if (timeRemaining <= 0) {
            this.endRound();
        } else if (timeRemaining <= this.ROUND_END_COUNTDOWN) { // Last 30 seconds
            this.broadcastGameMessage(`Round ending in ${Math.ceil(timeRemaining / 1000)}...`);
        }

        // console.log(`[${new Date().toLocaleTimeString()}] EXIT handleActiveState()`);
    }

    private kickPlayersToLobby() {
        console.log(`[${new Date().toLocaleTimeString()}] ENTER kickPlayersToLobby()`);

        for (const p of this.entityManager.getAllPlayerEntities()) {
            // give the eventloop/gameloop time to sort itself out
            // BUG - if the player moves worlds straight away, the despawn doesn't compete and leaves a zombie entitiy in the world
            setTimeout(() => {
                // kick the players to lobby
                p.player.joinWorld(this._lobby);
            }, 500);
        }

        // kick the players back to the lobby
        this.entityManager.getAllPlayerEntities().forEach((p) => {
            p.despawn();
        });

        console.log(`[${new Date().toLocaleTimeString()}] EXIT kickPlayersToLobby()`);
    }

    private handleEndingState(): void {
        console.log(`[${new Date().toLocaleTimeString()}] ENTER handleEndingState()`);

        if (!this._worldState.roundEndTime) return;

        const timeElapsed = Date.now() - this._worldState.roundEndTime;
        if (timeElapsed >= 2) {
            this.kickPlayersToLobby();
            this.resetWorld();
        }

        console.log(`[${new Date().toLocaleTimeString()}] EXIT handleEndingState()`);
    }

    // private handleRestartingState(): void {
    //     this._worldState.playState = GunWorldPlayState.WAITING;
    //     this.resetGame();
    // }

    private startGame(): void {
        console.log(`[${new Date().toLocaleTimeString()}] ENTER startGame()`);

        if (this._worldState.playState !== GunWorldPlayState.WAITING) {
            console.log(`[GAME] Attempted to start game but state is ${this._worldState.playState}`);
            return;
        }

        console.log("[GAME] Starting game sequence...");
        this._worldState.playState = GunWorldPlayState.STARTING;
        this._worldState.startTime = Date.now();

        // Freeze all players for countdown
        const allPlayers = this.entityManager.getAllPlayerEntities();
        console.log(`[GAME] Freezing ${allPlayers.length} players for countdown`);

        allPlayers.forEach(playerEntity => {
            if (playerEntity.controller instanceof MyEntityController) {
                console.log(`[GAME] Freezing player ${playerEntity.player.username} for countdown`);
                playerEntity.controller.setFrozen(true);
            }
        });

        // this.broadcastGameMessage(`🎮 Game starting in ${this.START_COUNTDOWN / 1000} seconds! Get ready! 🎮`);

        console.log(`[${new Date().toLocaleTimeString()}] EXIT startGame()`);
    }

    private freezePlayer(playerEntity: PlayerEntity, freeze: boolean): void {
        console.log(`[${new Date().toLocaleTimeString()}] ENTER freezePlayer(player: ${playerEntity.player?.username}, freeze: ${freeze})`);

        if (!(playerEntity.controller instanceof MyEntityController)) return;

        const controller = playerEntity.controller as MyEntityController;
        console.log(`[GAME] ${freeze ? 'Freezing' : 'Unfreezing'} player ${playerEntity.player.username}`);

        // Set the controller state
        controller.setFrozen(freeze);

        // Also handle the entity state
        if (freeze) {
            playerEntity.setLinearVelocity({ x: 0, y: 0, z: 0 });
            playerEntity.setAngularVelocity({ x: 0, y: 0, z: 0 });
            // playerEntity.setActive(false);
        }
        // else {
        //     playerEntity.setActive(true);
        //     // Reset physics state
        //     playerEntity.resetPhysics?.();
        // }

        console.log(`[${new Date().toLocaleTimeString()}] EXIT freezePlayer(player: ${playerEntity.player?.username}, freeze: ${freeze})`);
    }

    private beginRound(): void {
        console.log(`[${new Date().toLocaleTimeString()}] ENTER beginRound()`);

        console.log("[GAME STATE] Beginning round...");
        this._worldState.playState = GunWorldPlayState.ACTIVE;
        this._worldState.roundStartTime = Date.now();
        this._worldState.roundNumber++;

        // Unfreeze all players
        const allPlayers = this.entityManager.getAllPlayerEntities();
        console.log(`[GAME] Unfreezing ${allPlayers.length} players to start round`);

        allPlayers.forEach(playerEntity => {
            if (playerEntity.controller instanceof MyEntityController) {
                console.log(`[GAME] Unfreezing player ${playerEntity.player.username}`);
                playerEntity.controller.setFrozen(false);
                // playerEntity.resetPhysics?.();
            }
        });

        this.broadcastGameMessage("🎮 Round Started! Fight! 🎮");

        console.log(`[${new Date().toLocaleTimeString()}] EXIT beginRound()`);
    }

    private endRound(): void {
        console.log(`[${new Date().toLocaleTimeString()}] ENTER endRound()`);

        this._worldState.playState = GunWorldPlayState.ENDING;
        this._worldState.roundEndTime = Date.now();

        // Calculate and display scores
        const scores = this.calculateScores();
        this.broadcastGameMessage("Round Over!");
        this.displayScores(scores);

        console.log(`[${new Date().toLocaleTimeString()}] EXIT endRound()`);
    }

    // private restartGame(): void {
    //     this._worldState.playState = GunWorldPlayState.RESTARTING;
    // }

    private resetWorld() {
        console.log(`[${new Date().toLocaleTimeString()}] ENTER resetWorld()`);

        this._worldState = this.defaultState();

        console.log(`[${new Date().toLocaleTimeString()}] EXIT resetWorld()`);
    }

    private defaultState() {
        console.log(`[${new Date().toLocaleTimeString()}] ENTER defaultState()`);
        const state = {
            startTime: Date.now(),
            players: [],
            playState: GunWorldPlayState.WAITING,
            roundNumber: 0,
            roundDuration: this.ROUND_DURATION,
            scores: new Map()
        };
        console.log(`[${new Date().toLocaleTimeString()}] EXIT defaultState() -> ${JSON.stringify(state)}`);
        return state;
    }

    public generateSpawnPosition() {
        console.log(`[${new Date().toLocaleTimeString()}] ENTER generateSpawnPosition()`);

        if (this._spawnPoints.length == 0) {
            console.log(`[SPAWN] Refreshing spawn points`);
            this._spawnPoints = [...this._usedSpawnPoints];
            this._usedSpawnPoints = [];
        }


        const randomSpawnPointIndex = Math.floor(Math.random() * this._spawnPoints.length) % this._spawnPoints.length; // % incase we get a random 1.0
        const spawnPosition = this._spawnPoints[randomSpawnPointIndex];
        console.log(`[SPAWN] Selected spawn index ${randomSpawnPointIndex}, position: ${JSON.stringify(spawnPosition)}`);

        this._spawnPoints.splice(randomSpawnPointIndex, 1); // Remove the used spawn point
        // console.log("Remaining Spawn Points:", this._spawnPoints)
        this._usedSpawnPoints.push(spawnPosition); // record the used position
        // console.log("Used Spawn Points:", this._usedSpawnPoints)

        console.log(`[${new Date().toLocaleTimeString()}] EXIT generateSpawnPosition() -> {x: ${spawnPosition.x}, y: ${spawnPosition.y}, z: ${spawnPosition.z}}`);
        return spawnPosition;
    }

    private spawnPlayer(player: Player): void {
        console.log(`[${new Date().toLocaleTimeString()}] ENTER spawnPlayer(player: ${player.username})`);

        console.log(`[GAME] Spawning player ${player.username}`);

        // First check if player already has an entity
        const existingEntities = this.entityManager.getPlayerEntitiesByPlayer(player);
        existingEntities.forEach(entity => {
            console.log(`[GAME] Despawning existing entity for ${player.username}`);
            entity.despawn();
        });

        // Create new player entity
        const playerEntity = new PlayerEntity({
            player,
            name: 'Player',
            modelUri: 'models/players/PlayerModel.gltf',
            modelLoopedAnimations: ['idle'],
            modelScale: 0.5,
            controller: new MyEntityController(),
        });


        // Spawn the entity
        const spawnPosition = this.generateSpawnPosition();

        playerEntity.spawn(this, spawnPosition);
        console.log(`[GAME] Spawned new entity for ${player.username} at`, spawnPosition);

        // Set up camera
        player.camera.setAttachedToEntity(playerEntity);
        player.camera.setMode(PlayerCameraMode.FIRST_PERSON);
        player.camera.setOffset({ x: 0, y: 0.4, z: 0 });
        player.camera.setModelHiddenNodes(['head', 'neck']);
        player.camera.setForwardOffset(0.3);

        // Initialize player state
        if (playerEntity.controller instanceof MyEntityController) {
            const shouldFreeze = this._worldState.playState !== GunWorldPlayState.ACTIVE;
            playerEntity.controller.setFrozen(shouldFreeze);
            console.log(`[GAME] Player ${player.username} initial freeze state: ${shouldFreeze}`);
        }

        console.log(`[${new Date().toLocaleTimeString()}] EXIT spawnPlayer(player: ${player.username})`);
    }

    private calculateScores(): Map<string, number> {
        console.log(`[${new Date().toLocaleTimeString()}] ENTER calculateScores()`);

        // This should be implemented based on your scoring system
        console.log(`[${new Date().toLocaleTimeString()}] EXIT calculateScores() -> Map(${Array.from(this._worldState.scores.entries()).map(([k, v]) => `${k}:${v}`).join(', ')})`);
        return this._worldState.scores;
    }

    private displayScores(scores: Map<string, number>): void {
        console.log(`[${new Date().toLocaleTimeString()}] ENTER displayScores(scores: ${scores.size} entries)`);

        const scoreList = Array.from(scores.entries())
            .sort(([, a], [, b]) => b - a)
            .map(([name, score], index) => `${index + 1}. ${name}: ${score}`);

        const isGameEnd = this._worldState.playState === GunWorldPlayState.ENDING;

        this._worldState.players.forEach(player => {
            player.ui.sendData({
                type: isGameEnd ? 'game-end' : 'round-end',
                scores: scoreList,
                roundNumber: this._worldState.roundNumber,
                isGameOver: isGameEnd
            });
        });

        console.log(`[${new Date().toLocaleTimeString()}] EXIT displayScores(scores: ${scores.size} entries)`);
    }

    private broadcastGameMessage(message: string): void {
        // console.log(`[${new Date().toLocaleTimeString()}] ENTER broadcastGameMessage(message: ${message})`);

        this._worldState.players.forEach(player => {
            this.chatManager.sendPlayerMessage(player, message, "FFFF00");
            player.ui.sendData({
                type: 'game-message',
                message: message
            });
        });

        // console.log(`[${new Date().toLocaleTimeString()}] EXIT broadcastGameMessage(message: ${message})`);
    }

    private broadcastEndGameMessage(winner: Player): void {
        console.log("Broadcasting EndGameMessages messages")
        this._worldState.players.forEach(player => {
            player.ui.sendData({
                type: (player === winner) ? "player-won" : "player-lost",
            });

            this.chatManager.sendPlayerMessage(player, `🏆 ${winner.username} WON THE GAME! 🏆`, "FFFF00");
        });
    }

    public join(player: Player) {
        console.log(`[${new Date().toLocaleTimeString()}] ENTER join(player: ${player.username})`);

        try {
            console.log(`[GAME JOIN] ${player.username} joining ${this.name}`);

            // Add to world state first
            if (!this._worldState.players.includes(player)) {
                console.log(`[GAME JOIN] Added player to world state. Total players: ${this._worldState.players.length}`);
            }

            // Then join the world - this will trigger onPlayerJoin
            player.joinWorld(this);

            // Don't spawn here since onPlayerJoin will handle it
            console.log(`[GAME JOIN] ${player.username} successfully joined ${this.name}`);
            console.log(`[${new Date().toLocaleTimeString()}] EXIT join(player: ${player.username}) -> ${null}`);
            return null;
        } catch (err) {
            console.error(`[GAME JOIN] Error:`, err);
            console.log(`[${new Date().toLocaleTimeString()}] EXIT join(player: ${player.username}) -> ${err}`);
            return "Error joining game";
        }

        console.log(`[${new Date().toLocaleTimeString()}] EXIT join(player: ${player.username}) -> ${null}`);
        return null;
    }

    /**
     * A function that is called when a player joins the world.
     */
    onPlayerJoin = (player: Player) => {
        console.log(`[${new Date().toLocaleTimeString()}] ENTER onPlayerJoin(player: ${player.username})`);

        console.log(`[GAME JOIN] Setting up player ${player.username} in ${this.name}`);

        this.spawnPlayer(player);

        player.ui.load('ui/game.html');

        // Initialize player state
        if (!this._worldState.players.includes(player)) {
            this._worldState.players.push(player);
        }

        this._worldState.scores.set(player.username, 0);

        // Send welcome message and broadcast player count
        this.chatManager.sendBroadcastMessage(`[${player.username}] has joined the game.`);
        this.broadcastGameMessage(`Players: ${this.entityManager.getAllPlayerEntities().length}/${this._minPlayerCount} needed to start`);

        console.log(`[GAME JOIN] Player ${player.username} setup complete`);

        // Force check if we should start the game
        this.checkGameStart();

        console.log(`[${new Date().toLocaleTimeString()}] EXIT onPlayerJoin(player: ${player.username})`);
    }

    /**
     * A function that is called when a player leaves the world.
     */
    onPlayerLeave = (player: Player) => {
        console.log(`[${new Date().toLocaleTimeString()}] ENTER onPlayerLeave(player: ${player.username})`);

        console.log(`[GAME LEAVE] ${player.username} leaving game`);
        this._worldState.players = this._worldState.players.filter(p => p !== player);
        console.log(`[GAME LEAVE] Players remaining: ${this._worldState.players.length}`);

        this.entityManager.getPlayerEntitiesByPlayer(player).forEach(entity => {
            entity.despawn();
        });

        this.chatManager.sendBroadcastMessage(`[${player.username}] has left the game.`);

        // Update remaining players about the count
        // this.broadcastGameMessage(`Players: ${this.entityManager.getAllPlayerEntities().length}/${this._minPlayerCount} needed to start`);

        console.log(`[${new Date().toLocaleTimeString()}] EXIT onPlayerLeave(player: ${player.username})`);
    }

    private getRoundTimeRemaining(): number {
        if (!this._worldState.roundStartTime) return 0;
        return Math.max(0, this._worldState.roundDuration - (Date.now() - this._worldState.roundStartTime));
    }

    public handleGameWin(winner: PlayerEntity): void {
        console.log(`[${new Date().toLocaleTimeString()}] ENTER handleGameWin(winner: ${winner.player?.username})`);

        console.log(`[GAME] ${winner.player.username} won the game with baguette!`);

        // Announce the winner
        // const winMessage = `🏆 ${winner.player.username} WON THE GAME! 🏆`;
        // this.broadcastGameMessage(winMessage);
        this.broadcastEndGameMessage(winner.player);

        // Schedule reset
        let backToLobbyTime = this.END_SCREEN_DURATION / 1000;
        const lobbyCountdownInterval = setInterval(() => {

            this._worldState.players.forEach(player => {
                player.ui.sendData({
                    type: 'lobby-countdown',
                    timeLeft: backToLobbyTime
                });
            });
            backToLobbyTime--;

            if (backToLobbyTime < 0) {
                console.log("[GAME] Victory period ended, kicking to lobby...");
                clearInterval(lobbyCountdownInterval);
                this.kickPlayersToLobby();
                this.resetWorld();
            }
        }, 1000);

        console.log(`[${new Date().toLocaleTimeString()}] EXIT handleGameWin(winner: ${winner.player?.username})`);
    }

    // Add this new method to check if we should start the game
    private checkGameStart(): void {
        console.log(`[${new Date().toLocaleTimeString()}] ENTER checkGameStart()`);

        if (this._worldState.playState !== GunWorldPlayState.WAITING) return;

        const currentPlayerCount = this.entityManager.getAllPlayerEntities().length;
        console.log(`[GAME CHECK] Current players: ${currentPlayerCount}/${this._minPlayerCount}`);

        if (currentPlayerCount >= this._minPlayerCount) {
            console.log(`[GAME CHECK] Starting game with ${currentPlayerCount} players`);
            this.startGame();
        }

        console.log(`[${new Date().toLocaleTimeString()}] EXIT checkGameStart()`);
    }
}


const worldConfigs: GunWorldOptions[] = [
    {
        id: 1,
        name: "Crimson Crossfire",
        minPlayerCount: 2,
        maxPlayerCount: 12,
        maxWaitingTime: 10000,
    },
    // REMOVED EXTRA WORLDS AS COULDN"T TEST FOR PERFORMANCE BUT ONLY INDIVIDUALLY
    // {
    //     id: 2,
    //     name: "Crimson Crossfire",
    //     minPlayerCount: 4,
    //     maxPlayerCount: 12,
    //     maxWaitingTime: 10000,
    // },
    // {
    //     id: 3,
    //     name: "Grimshot Grounds",
    //     minPlayerCount: 6,
    //     maxPlayerCount: 16,
    //     maxWaitingTime: 10000,
    // }
];

const worldRegistry: GunWorld[] = [];

export const startWorlds = (lobby: World) => {
    console.log("[WORLDS] Starting to initialize worlds...");
    worldConfigs.forEach(config => {
        console.log(`[WORLDS] Creating world: ${config.name} (ID: ${config.id})`);
        const world = new GunWorld(config, lobby);
        world.start();
        worldRegistry.push(world);
        console.log(`[WORLDS] World ${config.name} started and added to registry. Registry size: ${worldRegistry.length}`);
    });
}

export const getWorld = (id: number) => {
    return worldRegistry.find(world => world.id === id);
}

export const listWorlds = () => {
    return worldRegistry.sort((a, b) => a.id - b.id);
}