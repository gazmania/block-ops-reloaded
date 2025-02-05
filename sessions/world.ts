import { Entity, Player, PlayerCameraMode, PlayerEntity, RigidBodyType, World, WorldOptions, Audio } from "hytopia";
import MyEntityController from "../MyEntityController";
import { getStartingWeapon } from "../weapons/weapons";

import mapData from '../assets/maps/final-map.json';

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
    RESTARTING  // Transitioning to new round
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

    private readonly ROUND_DURATION = 300000; // 5 minutes per round
    private readonly START_COUNTDOWN = 5000;  // 5 second countdown
    private readonly END_SCREEN_DURATION = 5000; // 5 seconds to show results

    private _lastLoggedPlayerCount: number = 0;
    private _lastCountdownTime: number = -1;

    public get maxPlayerCount(): number { return this._maxPlayerCount; }
    public get playerCount(): number { return this._worldState.players.length; }

    public incrementScore(player:Player) {
        const score = this._worldState.scores.get(player.username);
        if (score) {
            this._worldState.scores.set(player.username, score + 1);
        }
    }

    public resetScore(player:Player) {
        const score = this._worldState.scores.get(player.username);
        if (score) {
            this._worldState.scores.set(player.username, 0);
        }
    }

    constructor(options: GunWorldOptions, lobby: World) {
        super({
            id: options.id,
            name: options.name,
            skyboxUri: "skyboxes/partly-cloudy"
        });
        this._lobby = lobby;
        this._minPlayerCount = options.minPlayerCount;
        this._maxPlayerCount = options.maxPlayerCount;
        this._maxWaitingTime = options.maxWaitingTime;

        this._worldState = {
            startTime: Date.now(),
            players: [],
            playState: GunWorldPlayState.WAITING,
            roundNumber: 0,
            roundDuration: this.ROUND_DURATION,
            scores: new Map()
        };

        this.loadMap(mapData);

        // Initialize game background music (not splash screen)
        this._backgroundMusic = new Audio({
            uri: 'audio/music-first-track.mp3',
            loop: true,
            volume: 0.15,
        });

        // Start playing as soon as world is created
        this._backgroundMusic.play(this);

        // Start the game loop
        setInterval(() => {
            this.tick();
        }, 1000); // Check game state every second

        // Only keep the leave command here
        this.chatManager.registerCommand("/leave", (player: Player, args: string[], message: string) => {
            this.entityManager.getPlayerEntitiesByPlayer(player).forEach(entity => {
                entity.despawn();
            });

            // this gives the despawn chance to run before leaving this world and joining back to the lobby
            // if despawning immediately the entity fails to despawn and is there the next time you enter the game
            setImmediate(() => {
                player.joinWorld(this._lobby);
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
            case GunWorldPlayState.RESTARTING:
                this.handleRestartingState();
                break;
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
    }

    private handleActiveState(): void {
        if (!this._worldState.roundStartTime) return;

        const timeElapsed = Date.now() - this._worldState.roundStartTime;
        const timeRemaining = this._worldState.roundDuration - timeElapsed;

        if (timeRemaining <= 0) {
            this.endRound();
        } else if (timeRemaining <= 10000) { // Last 10 seconds
            this.broadcastGameMessage(`Round ending in ${Math.ceil(timeRemaining / 1000)}...`);
        }
    }

    private handleEndingState(): void {
        if (!this._worldState.roundEndTime) return;

        const timeElapsed = Date.now() - this._worldState.roundEndTime;
        if (timeElapsed >= this.END_SCREEN_DURATION) {
            // TODO find out what this is meant to do, it doesn't exist
            // this.resetAndRestartGame();
        }
    }

    private handleRestartingState(): void {
        this._worldState.playState = GunWorldPlayState.WAITING;
        this.resetGame();
    }

    private startGame(): void {
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

        this.broadcastGameMessage("🎮 Game starting in 5 seconds! Get ready! 🎮");
    }

    private freezePlayer(playerEntity: PlayerEntity, freeze: boolean): void {
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
    }

    private beginRound(): void {
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
    }

    private endRound(): void {
        this._worldState.playState = GunWorldPlayState.ENDING;
        this._worldState.roundEndTime = Date.now();

        // Calculate and display scores
        const scores = this.calculateScores();
        this.broadcastGameMessage("Round Over!");
        this.displayScores(scores);
    }

    private restartGame(): void {
        this._worldState.playState = GunWorldPlayState.RESTARTING;
    }

    private resetGame(): void {
        this._worldState.scores.clear();
        this._worldState.roundNumber = 0;
        this._worldState.roundStartTime = undefined;
        this._worldState.roundEndTime = undefined;
    }

    private respawnPlayer(player: Player): void {
        console.log(`[GAME] Respawning player ${player.username}`);

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

        // Randomize spawn position
        const spawnRadius = 10;
        const randomAngle = Math.random() * Math.PI * 2;
        const spawnPos = {
            x: Math.cos(randomAngle) * spawnRadius * Math.random(),
            y: 4,
            z: Math.sin(randomAngle) * spawnRadius * Math.random()
        };

        // Spawn the entity
        playerEntity.spawn(this, spawnPos);
        console.log(`[GAME] Spawned new entity for ${player.username} at`, spawnPos);

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
    }

    private calculateScores(): Map<string, number> {
        // This should be implemented based on your scoring system
        return this._worldState.scores;
    }

    private displayScores(scores: Map<string, number>): void {
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
    }

    private broadcastGameMessage(message: string): void {
        this._worldState.players.forEach(player => {
            this.chatManager.sendPlayerMessage(player, message, "FFFF00");
            player.ui.sendData({
                type: 'game-message',
                message: message
            });
        });
    }

    public join(player: Player) {
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
            return null;
        } catch (err) {
            console.error(`[GAME JOIN] Error:`, err);
            return "Error joining game";
        }
    }

    /**
     * A function that is called when a player joins the world.
     */
    onPlayerJoin = (player: Player) => {
        console.log(`[GAME JOIN] Setting up player ${player.username} in ${this.name}`);

        try {
            const playerEntity = new PlayerEntity({
                player,
                name: 'Player',
                modelUri: 'models/players/PlayerModel.gltf',
                modelLoopedAnimations: ['idle'],
                modelScale: 0.5,
                controller: new MyEntityController(),
            });

            console.log(`[GAME JOIN] Created player entity for ${player.username}`);

            // Spawn the entity
            playerEntity.spawn(this, { x: Math.random() * 10 - 5, y: 4, z: Math.random() * 10 - 5 });
            console.log(`[GAME JOIN] Spawned entity for ${player.username}`);

            // Set up camera
            player.camera.setAttachedToEntity(playerEntity);
            player.camera.setMode(PlayerCameraMode.FIRST_PERSON);
            player.camera.setOffset({ x: 0, y: 0.4, z: 0 });
            player.camera.setModelHiddenNodes(['head', 'neck']);
            player.camera.setForwardOffset(0.3);

            // Load UI
            player.ui.load('ui/game.html');

            // Initialize player state
            if (!this._worldState.players.includes(player)) {
                this._worldState.players.push(player);
            }
            
            this._worldState.scores.set(player.username, 0);

            // Set initial freeze state
            if (playerEntity.controller instanceof MyEntityController) {
                const shouldFreeze = this._worldState.playState !== GunWorldPlayState.ACTIVE;
                playerEntity.controller.setFrozen(shouldFreeze);
                console.log(`[GAME JOIN] Player ${player.username} initial freeze state: ${shouldFreeze}`);
            }

            // Send welcome message and broadcast player count
            this.chatManager.sendBroadcastMessage(`[${player.username}] has joined the game.`);
            this.broadcastGameMessage(`Players: ${this.entityManager.getAllPlayerEntities().length}/${this._minPlayerCount} needed to start`);

            console.log(`[GAME JOIN] Player ${player.username} setup complete`);

            // Force check if we should start the game
            this.checkGameStart();
        } catch (err) {
            console.error(`[GAME JOIN] Error setting up player ${player.username}:`, err);
            throw err;
        }
    }

    /**
     * A function that is called when a player leaves the world.
     */
    onPlayerLeave = (player: Player) => {
        console.log(`[GAME LEAVE] ${player.username} leaving game`);
        this._worldState.players = this._worldState.players.filter(p => p !== player);
        console.log(`[GAME LEAVE] Players remaining: ${this._worldState.players.length}`);
        this.chatManager.sendBroadcastMessage(`[${player.username}] has left the game.`);

        // Update remaining players about the count
        this.broadcastGameMessage(`Players: ${this.entityManager.getAllPlayerEntities().length}/${this._minPlayerCount} needed to start`);
    }

    private getRoundTimeRemaining(): number {
        if (!this._worldState.roundStartTime) return 0;
        return Math.max(0, this._worldState.roundDuration - (Date.now() - this._worldState.roundStartTime));
    }

    public handleGameWin(winner: PlayerEntity): void {
        console.log(`[GAME] ${winner.player.username} won the game with baguette!`);

        // Announce the winner
        const winMessage = `🏆 ${winner.player.username} WON THE GAME! New game starting in 5 seconds... 🏆`;
        this.broadcastGameMessage(winMessage);

        // Schedule reset
        setTimeout(() => {
            console.log("[GAME] Victory period ended, resetting game...");
            // Reset game state
            this._worldState = {
                startTime: Date.now(),
                players: this._worldState.players,
                playState: GunWorldPlayState.WAITING,
                roundNumber: 0,
                roundDuration: this.ROUND_DURATION,
                scores: new Map()
            };

            // Reset and respawn all players

            // TODO - we've got confusion here around responsibilities here.
            const allPlayers = this.entityManager.getAllPlayerEntities();
            allPlayers.forEach(playerEntity => {
                if (playerEntity.controller instanceof MyEntityController) {
                    const controller = playerEntity.controller as MyEntityController;
                    controller.resetStats()
                    controller.switchWeapon(getStartingWeapon(), playerEntity);
                }
            });

            // Respawn all players in new positions
            this._worldState.players.forEach(player => {
                this.respawnPlayer(player);
            });

            // Start new game
            this.checkGameStart();
        }, 5000);
    }

    // Add this new method to check if we should start the game
    private checkGameStart(): void {
        if (this._worldState.playState !== GunWorldPlayState.WAITING) return;

        const currentPlayerCount = this.entityManager.getAllPlayerEntities().length;
        console.log(`[GAME CHECK] Current players: ${currentPlayerCount}/${this._minPlayerCount}`);

        if (currentPlayerCount >= this._minPlayerCount) {
            console.log(`[GAME CHECK] Starting game with ${currentPlayerCount} players`);
            this.startGame();
        }
    }
}

const worldConfigs: GunWorldOptions[] = [
    {
        id: 1,
        name: "Gun Game World",
        minPlayerCount: 2,
        maxPlayerCount: 4,
        maxWaitingTime: 10000,
    },
    {
        id: 2,
        name: "My Calm and Non-shooty World",
        minPlayerCount: 1,
        maxPlayerCount: 1,
        maxWaitingTime: 0,
    }
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