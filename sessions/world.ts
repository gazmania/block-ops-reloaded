import { Entity, Player, PlayerCameraMode, PlayerEntity, RigidBodyType, World, WorldOptions } from "hytopia";
import MyEntityController from "../MyEntityController";
import mapData from '../assets/maps/map_main.json';

export interface GunWorldOptions {
    id: number;
    name: string;
    minPlayerCount: number;
    maxPlayerCount: number;
    maxWaitingTime: number;
}

enum GunWorldPlayState {
    WAITING, ACTIVE, FINISHED
}

export interface GunWorldState {
    startTime: number;
    players: Player[];
    playState: GunWorldPlayState;
}

export class GunWorld extends World {
    private _lobby: World;

    private _minPlayerCount: number;
    private _maxPlayerCount: number;
    private _maxWaitingTime: number;

    private _worldState: GunWorldState;

    public get maxPlayerCount(): number { return this._maxPlayerCount; }
    public get playerCount(): number { return this._worldState.players.length; }

    constructor(options: GunWorldOptions, lobby: World) {
        super({
            id: options.id,
            name: options.name,
            skyboxUri: "skyboxes/partly-cloudy"
        })
        this._lobby = lobby;
        this._minPlayerCount = options.minPlayerCount;
        this._maxPlayerCount = options.maxPlayerCount;
        this._maxWaitingTime = options.maxWaitingTime;

        this._worldState = {
            startTime: Date.now(),
            players: [],
            playState: GunWorldPlayState.WAITING
        };

        this.loadMap(mapData);

        // this._dummy = new Entity({
        //     blockHalfExtents: { x: 0.01, y: 0.01, z: 0.01 },
        //     blockTextureUri: "blocks/sand.png",
        //     rigidBodyOptions: {
        //         type: RigidBodyType.FIXED,
        //     }
        // });
        // this._dummy.spawn(this, { x: 0, y: -25, z: 0 })
        // const cameraTarget = new Entity({
        //     blockHalfExtents: { x: 1, y: 1, z: 1 },
        //     blockTextureUri: "blocks/sand.png",
        //     rigidBodyOptions: {
        //       type: RigidBodyType.FIXED,
        //     }
        //   });
        //   cameraTarget.spawn(this, { x: 0, y: -50, z: 0 })

        this.chatManager.registerCommand("/leave", (player: Player, args: string[], message: string) => {

            this.entityManager.getPlayerEntitiesByPlayer(player).forEach(entity => {
                console.log(`despawning ${entity.id}`);
                entity.despawn();
            });

            // this gives the despawn chance to run before leaving this world and joining back to the lobby
            setImmediate(() => {
                player.joinWorld(this._lobby);
            });
        });



        // const waitingRoomInterval = setInterval(() => {
        //     if (this._worldState.playState == GunWorldPlayState.WAITING &&
        //         this._worldState.startTime - Date.now() < this._maxWaitingTime &&
        //         this._worldState.players.length < this._minPlayerCount) {
        //         return;
        //     }

        //     // if any of the above guards are false we'll get here
        //     // start the game
        //     this._worldState.playState = GunWorldPlayState.ACTIVE;

        //     clearInterval(waitingRoomInterval);

        // }, 1000);
    }

    public join(player: Player) {
        if (!player) return "No player specifid so can't join world";
        if (this.playerCount >= this.maxPlayerCount) return `Sorry, we're full (${this.playerCount}/${this.maxPlayerCount})`;

        player.joinWorld(this);
    }

    /**
     * A function that is called when a player joins the world.
     */
    onPlayerJoin = (player: Player) => {
        const playerEntity = new PlayerEntity({
            player,
            name: 'Player',
            modelUri: 'models/players/PlayerModel.gltf',
            modelLoopedAnimations: ['idle'],
            modelScale: 0.5,
            controller: new MyEntityController(),
        });

        playerEntity.spawn(this, { x: Math.random() * 10 - 5, y: 4, z: Math.random() * 10 - 5 });
        // console.log('Spawned player entity!');
        this.chatManager.sendBroadcastMessage(`[${player.username}] has joined the game.`)

        player.camera.setAttachedToEntity(playerEntity);
        player.camera.setMode(PlayerCameraMode.FIRST_PERSON);
        player.camera.setOffset({ x: 0, y: 0.4, z: 0 });
        player.camera.setModelHiddenNodes(['head', 'neck']);
        player.camera.setForwardOffset(0.3);

        player.ui.load('ui/game.html');

        this._worldState.players.push(player);

        this.eventRouter.on("GUNGAME.PLAYER_UPDATE", (payload: {
            player: string,
            weapon: string,
            health: number,
            ammo: number
        }) => {
            if (payload.player != player.username) return;
            console.log(`Sending ${JSON.stringify(payload)} to ${player.username} UI`);
            player.ui.sendData(payload);
        });

        this.chatManager.sendPlayerMessage(player, `[${player.username}] Welcome to ${this.name}, current player count ${this.playerCount}/${this.maxPlayerCount}`, "00ff00");
    }

    /**
     * A function that is called when a player leaves the world.
     */
    onPlayerLeave = (player: Player) => {
        this._worldState.players = this._worldState.players.filter(p => p !== player);

        // player.camera.setAttachedToPosition({x:0,y:10,z:0});
        this.chatManager.sendBroadcastMessage(`[${player.username}] has left the game.`)
    }
}

const worldRegistry: GunWorld[] = [];

const worldConfigs: GunWorldOptions[] = [
    {
        id: 1,
        name: "My Amazing World",
        minPlayerCount: 2,
        maxPlayerCount: 3,
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

export const startWorlds = (lobby: World) => {
    // instantiate and start the worlds
    worldConfigs.forEach(config => {
        const world = new GunWorld(config, lobby);
        world.start();
        worldRegistry.push(world);
    });
}

export const getWorld = (id: number) => {
    return worldRegistry.find(world => world.id === id);
}

export const listWorlds = () => {
    return Object.values(worldRegistry).sort((a, b) => a.id - b.id);
}