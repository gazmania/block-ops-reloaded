import { Player, PlayerCameraMode, PlayerEntity, World, WorldOptions } from "hytopia";
import MyEntityController from "../MyEntityController";
import mapData from '../assets/maps/boilerplate.json';

export interface GunWorldOptions extends WorldOptions {
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
    private _minPlayerCount: number;
    private _maxPlayerCount: number;
    private _maxWaitingTime: number;

    private _worldState: GunWorldState;

    public get maxPlayerCount(): number { return this._maxPlayerCount; }
    public get playerCount(): number { return this._worldState.players.length; }

    constructor(options: GunWorldOptions) {
        super(options)

        this._minPlayerCount = options.minPlayerCount;
        this._maxPlayerCount = options.maxPlayerCount;
        this._maxWaitingTime = options.maxWaitingTime;

        this._worldState = {
            startTime: Date.now(),
            players: [],
            playState: GunWorldPlayState.WAITING
        };

        this.loadMap(mapData);

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
        if (!player) return false;
        if (this.playerCount >= this.maxPlayerCount) return false;

        player.joinWorld(this);

        return true;
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

        player.camera.setMode(PlayerCameraMode.FIRST_PERSON);
        player.camera.setOffset({ x: 0, y: 0.4, z: 0 });
        player.camera.setModelHiddenNodes(['head', 'neck']);
        player.camera.setForwardOffset(0.3);

        playerEntity.spawn(this, { x: Math.random() * 10 - 5, y: 4, z: Math.random() * 10 - 5 });
        // console.log('Spawned player entity!');

        player.camera.setAttachedToEntity(playerEntity);

        console.log("number of assigned player entities",this.entityManager.getPlayerEntitiesByPlayer(player).length)
        // player.ui.load('ui/index.html');

        this._worldState.players.push(player);
    }

    /**
     * A function that is called when a player leaves the world.
     */
    onPlayerLeave = (player: Player) => {
        this._worldState.players = this._worldState.players.filter(p => p !== player);
        this.entityManager.getPlayerEntitiesByPlayer(player).forEach(entity => entity.despawn());
    }
}