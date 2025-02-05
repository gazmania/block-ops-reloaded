export interface WeaponConfig {
    name: string;
    damage: number;
    fireRate: number;
    range: number;
    maxAmmo: number;
    modelUri: string;
    modelScale: number;
    offsetPosition: Vector3Like;
    offsetRotation: Vector3Like;
    reloadTime: number;
    spread: number;
    spreadRecoveryTime: number;
    requiredKills: number;
    idleAnimation: string;
    walkAnimation: string;
    fireAnimation: string;
    fireAudio: string;
    reloadAnimation: string;
    reloadAudio: string;
    headDamage: number;
    bodyDamage: number;
    limbDamage: number;
    victory: boolean;
    zoomLevel: number;
}

import { Vector3Like } from "hytopia";
import weaponConfigs from "./weapons-config";

// no longer needed
// type WeaponKeys = typeof weaponConfigs[number]['name'];

export const getStartingWeapon = () => {
    return Object.values(weaponConfigs).find(weapon => weapon.requiredKills == 0)!;
}

export const getWeaponByKillCount = (killCount: number) => {
    return Object.values(weaponConfigs)
        .sort((a,b) => b.requiredKills - a.requiredKills)
        .find(weapon => killCount >= weapon.requiredKills) ?? getStartingWeapon();
}

