import { WeaponConfig } from "./weapons";

const weaponConfigs = [
    {
        name: "pistol",
        damage: 20,
        fireRate: 500,
        range: 50,
        maxAmmo: 20,
        modelUri: 'models/pistol.gltf',
        modelScale: 1,
        offsetPosition: {x: 0, y: 0, z: 0},
        offsetRotation: {x: 0, y: 0, z: 0},
        reloadTime: 2200, // 2.2 seconds
        spread: 0.06,
        spreadRecoveryTime: 100, // 0.1 seconds
        requiredKills: 0,
        idleAnimation: "idle_pistol",
        walkAnimation: 'walk_pistol', // Анимация ходьбы
        fireAnimation: 'fire_pistol', // Анимация выстрела
        fireAudio: "audio/pistol-fire.mp3",
        reloadAnimation: "recharge_pistol",
        reloadAudio: "audio/pistol-reload.mp3",
        headDamage: 10, // Урон по голове
        bodyDamage: 5, // Урон по телу
        limbDamage: 3, // Урон по конечностям
        victory: false, // Не приводит к победе
    },
    {
        name: "ak47",
        damage: 15,
        fireRate: 100,
        range: 70,
        maxAmmo: 30,
        modelUri: 'models/ak47.gltf',
        modelScale: 1,
        offsetPosition: {x: 0, y: 0.0, z: 0.0},
        offsetRotation: {x: 0, y: 0, z: 0},
        reloadTime: 2500, // 2.5 seconds
        spread: 0.055,
        spreadRecoveryTime: 300, // 0.3 seconds
        requiredKills: 1,
        idleAnimation: "idle_ak",
        walkAnimation: 'walk_ak', // Анимация ходьбы
        fireAnimation: 'fire_ak', // Анимация выстрела
        fireAudio: "audio/ak-fire.mp3",
        reloadAnimation: "recharge_ak",
        reloadAudio: "audio/ak-reload.mp3",
        headDamage: 14, // Урон по голове
        bodyDamage: 7, // Урон по телу
        limbDamage: 3, // Урон по конечностям
        victory: false, //
    },
    {
        name: "shotgun",
        damage: 15,
        fireRate: 100,
        range: 70,
        maxAmmo: 30,
        modelUri: 'models/shotgun.gltf',
        modelScale: 1,
        offsetPosition: {x: 0, y: 0, z: 0},
        offsetRotation: {x: 0, y: 0, z: 0},
        reloadTime: 2500, // 2.5 seconds
        spread: 0.055,
        spreadRecoveryTime: 300,
        requiredKills: 2, // 0.3 seconds
        idleAnimation: "idle_shotgun",
        walkAnimation: 'walk_shotgun', // Анимация ходьбы
        fireAnimation: 'fire_shotgun', // Анимация выстрела
        fireAudio: "audio/shotgun-fire.mp3",
        reloadAnimation: "recharge_shotgun",
        reloadAudio: "audio/shotgun-reload.mp3",
        headDamage: 14, // Урон по голове
        bodyDamage: 7, // Урон по телу
        limbDamage: 3, // Урон по конечностям
        victory: false, //
    },
    {
        name: "awp",
        damage: 15,
        fireRate: 100,
        range: 70,
        maxAmmo: 30,
        modelUri: 'models/awp.gltf',
        modelScale: 1,
        offsetPosition: {x: 0, y: 0, z: 0},
        offsetRotation: {x: 0, y: 0, z: 0},
        reloadTime: 2500, // 2.5 seconds
        spread: 0.055,
        spreadRecoveryTime: 300,
        requiredKills: 3, // 0.3 seconds
        idleAnimation: "idle_awp",
        walkAnimation: 'walk_awp', // Анимация ходьбы
        fireAnimation: 'fire_awp', // Анимация выстрела
        fireAudio: "audio/awp-fire.mp3",
        reloadAnimation: "recharge_awp",
        reloadAudio: "audio/awp-reload.mp3",
        headDamage: 14, // Урон по голове
        bodyDamage: 7, // Урон по телу
        limbDamage: 3, // Урон по конечностям
        victory: false, //
    },
    {
        name: "rpg",
        damage: 15,
        fireRate: 100,
        range: 70,
        maxAmmo: 30,
        modelUri: 'models/rpg.gltf',
        modelScale: 1,
        offsetPosition: {x: 0, y: 0, z: 0},
        offsetRotation: {x: 0, y: 0, z: 0},
        reloadTime: 2500, // 2.5 seconds
        spread: 0.055,
        spreadRecoveryTime: 300,
        requiredKills: 4, 
        idleAnimation: "idle_rpg",
        walkAnimation: 'walk_rpg', // Анимация ходьбы
        fireAnimation: 'fire_rpg', // Анимация выстрела
        fireAudio: "audio/rpg-fire.mp3",
        reloadAnimation: "recharge_rpg",
        reloadAudio: "audio/rpg-reload.mp3",
        headDamage: 14, // Урон по голове
        bodyDamage: 7, // Урон по телу
        limbDamage: 3, // Урон по конечностям
        victory: false, //
    },
    {
        name: "baguette",
        damage: 15,
        fireRate: 100,
        range: 70,
        maxAmmo: 30,
        modelUri: 'models/baguette.gltf',
        modelScale: 1,
        offsetPosition: {x: 0, y: 0, z: 0},
        offsetRotation: {x: 0, y: 0, z: 0},
        reloadTime: 2500, // 2.5 seconds
        spread: 0.055,
        spreadRecoveryTime: 300,
        requiredKills: 5, // 0.3 seconds
        idleAnimation: "idle_baguette",
        walkAnimation: 'walk_baguette', // Анимация ходьбы
        fireAnimation: 'fire_baguette', // Анимация выстрела
        fireAudio: "audio/baguette-fire.mp3",
        reloadAnimation: "recharge_baguette",
        reloadAudio: "audio/pistol-reload.mp3",
        headDamage: 14, // Урон по голове
        bodyDamage: 7, // Урон по телу
        limbDamage: 3, // Урон по конечностям
        victory: true, //
    },
] satisfies WeaponConfig[];

export default weaponConfigs;