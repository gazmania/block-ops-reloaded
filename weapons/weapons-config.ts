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
        name: "ak47",
        damage: 7.2,
        fireRate: 100,
        range: 35,
        maxAmmo: 30,
        modelUri: 'models/ak47.gltf',
        modelScale: 1,
        offsetPosition: {x: 0, y: 0.0, z: 0.0},
        offsetRotation: {x: 0, y: 0, z: 0},
        reloadTime: 2000,
        spread: 0.18,
        spreadRecoveryTime: 400,
        requiredKills: 1,
        idleAnimation: "idle_ak",
        walkAnimation: 'walk_ak', // Анимация ходьбы
        fireAnimation: 'fire_ak', // Анимация выстрела
        fireAudio: "audio/ak47-fire.mp3",
        reloadAnimation: "recharge_ak",
        reloadAudio: "audio/ak47-reload.mp3",
        headDamage: 22,
        bodyDamage: 13,
        limbDamage: 8,
        victory: false,
        zoomLevel: 0, // Уровень зума для AK-47
    },
    {
        name: "shotgun",
        damage: 80,
        fireRate: 1200,
        range: 10,
        maxAmmo: 2,
        modelUri: 'models/shotgun.gltf',
        modelScale: 1,
        offsetPosition: {x: 0, y: 0, z: 0},
        offsetRotation: {x: 0, y: 0, z: 0},
        reloadTime: 2000,
        spread: 0.35,
        spreadRecoveryTime: 800,
        requiredKills: 2,
        idleAnimation: "idle_shotgun",
        walkAnimation: 'walk_shotgun', // Анимация ходьбы
        fireAnimation: 'fire_shotgun', // Анимация выстрела
        fireAudio: "audio/shotgun-fire.mp3",
        reloadAnimation: "recharge_shotgun",
        reloadAudio: "audio/shotgun-reload.mp3",
        headDamage: 120,
        bodyDamage: 95,
        limbDamage: 70,
        victory: false,
        zoomLevel:0,
    },
    {
        name: "awp",
        damage: 100,
        fireRate: 1500,
        range: 60,
        maxAmmo: 5,
        modelUri: 'models/awp.gltf',
        modelScale: 1,
        offsetPosition: {x: 0, y: 0, z: 0},
        offsetRotation: {x: 0, y: 0, z: 0},
        reloadTime: 3000,
        spread: 0.01,
        spreadRecoveryTime: 1000,
        requiredKills: 3,
        idleAnimation: "idle_awp",
        walkAnimation: 'walk_awp', // Анимация ходьбы
        fireAnimation: 'fire_awp', // Анимация выстрела
        fireAudio: "audio/sniper-fire.mp3",
        reloadAnimation: "recharge_awp",
        reloadAudio: "audio/sniper-reload.mp3",
        headDamage: 120,
        bodyDamage: 90,
        limbDamage: 70,
        victory: false,
        zoomLevel: 2.5, // Уровень зума для снайперской винтовки
    },
    {
        name: "rpg",
        damage: 120,
        fireRate: 2000,
        range: 40,
        maxAmmo: 1,
        modelUri: 'models/rpg.gltf',
        modelScale: 1,
        offsetPosition: {x: 0, y: 0, z: 0},
        offsetRotation: {x: 0, y: 0, z: 0},
        reloadTime: 4000,
        spread: 0.02,
        spreadRecoveryTime: 1000,
        requiredKills: 4, 
        idleAnimation: "idle_rpg",
        walkAnimation: 'walk_rpg', // Анимация ходьбы
        fireAnimation: 'fire_rpg',
        fireAudio: "audio/rocket-fire.mp3",
        reloadAnimation: "recharge_rpg",
        reloadAudio: "audio/rocket-reload.mp3",
        headDamage: 120,
        bodyDamage: 120,
        limbDamage: 120,
        victory: false,
        zoomLevel: 0,
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
        requiredKills: 5,
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