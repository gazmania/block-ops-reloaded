import { WeaponConfig } from "./weapons";

const weaponConfigs = [
    {
        name: "pistol",
        damage: 15,
        fireRate: 500,
        range: 25,
        maxAmmo: 6,
        modelUri: 'models/pistol.gltf',
        modelScale: 1,
        offsetPosition: {x: 0, y: 0, z: 0},
        offsetRotation: {x: 0, y: 0, z: 0},
        reloadTime: 1800,
        spread: 0.03,
        spreadRecoveryTime: 200,
        requiredKills: 0,
        idleAnimation: "idle_pistol",
        walkAnimation: 'walk_pistol', // Анимация ходьбы
        fireAnimation: 'fire_pistol', // Анимация выстрела
        fireAudio: "audio/pistol-fire.mp3",
        reloadAnimation: "recharge_pistol",
        reloadAudio: "audio/pistol-reload.mp3",
        headDamage: 35,
        bodyDamage: 20,
        limbDamage: 15,
        victory: false, // Не приводит к победе
        zoomLevel: 0, // Уровень зума для пистолета
    },
    {
        name: "baguette",
        damage: 100,
        fireRate: 2000,        // Slower swing speed (2 second between swings)
        range: 2,              // Very short range - need to be right next to player
        maxAmmo: Infinity,     // Infinite ammo since it's a melee weapon
        modelUri: 'models/baguette.gltf',
        modelScale: 1,
        offsetPosition: {x: 0, y: 0, z: 0},
        offsetRotation: {x: 0, y: 0, z: 0},
        reloadTime: 0,         // No reload needed
        spread: 0,             // No spread for melee
        spreadRecoveryTime: 0, // No spread recovery needed
        requiredKills: 1,
        idleAnimation: "idle_baguette",
        walkAnimation: 'walk_baguette',
        fireAnimation: 'fire_baguette',
        fireAudio: "audio/baguette-fire.mp3",
        reloadAnimation: "recharge_baguette",
        reloadAudio: "audio/pistol-reload.mp3",
        headDamage: 100,       // One-hit kill anywhere
        bodyDamage: 100,       // One-hit kill anywhere
        limbDamage: 100,       // One-hit kill anywhere
        victory: true,
        zoomLevel: 0,
    },
] satisfies WeaponConfig[];

export default weaponConfigs;