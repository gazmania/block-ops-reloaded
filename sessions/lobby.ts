import { World, Audio } from "hytopia";

export class LobbyWorld extends World {
    private _lobbyMusic: Audio;

    constructor() {
        super({
            id: 0,
            name: "Lobby",
            skyboxUri: "skyboxes/partly-cloudy"
        });

        // Initialize lobby music
        this._lobbyMusic = new Audio({
            uri: 'audio/game-splash-screen-music.mp3',
            loop: true,
            volume: 0.05,
            // spatialSound: false
        });

        this._lobbyMusic.play(this);
    }
} 