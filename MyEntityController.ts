import {
    Audio,
    BaseEntityController,
    ColliderShape,
    CoefficientCombineRule,
    CollisionGroup,
    Entity,
    World,
    PlayerEntity,
    Quaternion,
} from 'hytopia';

import type {
    PlayerInput,
    PlayerCameraOrientation,
    BlockType,
} from 'hytopia';
import { getStartingWeapon, getWeaponByKillCount, WeaponConfig } from './weapons/weapons';
import { GunWorld } from './sessions/world';

export default class MyEntityController extends BaseEntityController {
    /** @internal */
    private _stepAudio: Audio | undefined;
    private _groundContactCount: number = 0;
    private _platform: Entity | undefined;
    private _isDead: boolean = false;
    private _weaponEntity: Entity | undefined;
    private _isReloading: boolean = false;
    private _currentSpread: number = 0;
    private _lastShotTime: number = 0;
    private _recoilRecoveryTimeout: NodeJS.Timeout | null = null;
    private _currentRecoilY: number = 0;
    private _currentRecoilX: number = 0;
    private _lastEmptySoundTime: number = 0;

    private currentWeapon: WeaponConfig = getStartingWeapon();
    private currentAmmo: number = this.currentWeapon.maxAmmo;
    private lastFireTime: number = 0;
    private health: number = 100;
    private kills: number = 0;

    // Movement settings
    public jumpVelocity: number = 10;
    public runVelocity: number = 8;
    public walkVelocity: number = 4;

    public get isGrounded(): boolean { return this._groundContactCount > 0; }
    public get isOnPlatform(): boolean { return !!this._platform; }
    public get platform(): Entity | undefined { return this._platform; }

    private _lastWeaponBeforeDeath: WeaponConfig = this.currentWeapon;
    private _playerNames: Map<number, string> = new Map();

    private getPlayerIdentifier(entity: PlayerEntity): string {
        // Priority: custom name -> default name -> ID
        const customName = this._playerNames.get(entity.id!);
        if (customName) return customName;
        return `Player ${entity.id}`;
    }

    private broadcastKillFeed(world: World, killer: PlayerEntity, victim: PlayerEntity): void {
        const killFeedData = {
            type: 'kill-feed',
            killer: this.getPlayerIdentifier(killer),
            victim: this.getPlayerIdentifier(victim)
        };

        // Получаем всех игроков в мире
        const allPlayerEntities = world.entityManager.getAllPlayerEntities();
        allPlayerEntities.forEach((playerEntity: PlayerEntity) => {
            if (playerEntity.player?.ui) {
                playerEntity.player.ui.sendData(killFeedData); // Отправляем данные о убийстве
            }
        });
    }

    private updateWeaponModel(entity: PlayerEntity): void {
        if (!entity.world) return;

        console.log(`[${this.getPlayerIdentifier(entity)}] Updating weapon model. Current weapon: ${this.currentWeapon.name}`);

        // Удалите старое оружие, если оно существует
        if (this._weaponEntity) {
            console.log(`[${this.getPlayerIdentifier(entity)}] Removing old weapon entity`);
            this._weaponEntity.despawn();
            this._weaponEntity = undefined;
        }

        // Создайте новое оружие
        this._weaponEntity = new Entity({
            name: `weapon_${this.currentWeapon.name}`,
            modelUri: this.currentWeapon.modelUri,
            modelScale: this.currentWeapon.modelScale,
        });

        console.log(`[${this.getPlayerIdentifier(entity)}] Creating new weapon entity with model URI: ${this.currentWeapon.modelUri}`);

        // Спавн оружия и привязка к правой руке игрока
        this._weaponEntity.spawn(entity.world, { x: 0, y: 0, z: 0 });
        console.log(`[${this.getPlayerIdentifier(entity)}] Spawned new weapon entity: ${this.currentWeapon.name}`);

        // Use the correct anchor point and adjust position/rotation for each weapon
        this._weaponEntity.setParent(entity, 'hand_right_anchor',
            this.currentWeapon.offsetPosition,
            Quaternion.fromEuler(this.currentWeapon.offsetRotation.x, this.currentWeapon.offsetRotation.y, this.currentWeapon.offsetRotation.z)
        );
        console.log(`[${this.getPlayerIdentifier(entity)}] Weapon attached to player hand`);
    }

    private _freeze: boolean = false;
    private entity: PlayerEntity | null = null;

    public attach(entity: Entity): void {
        super.attach(entity);
        if (entity instanceof PlayerEntity) {
            this.entity = entity;
            console.log(`[CONTROLLER] Attached to ${entity.player?.username}`);
        }

        this._stepAudio = new Audio({
            uri: 'audio/sfx/step/stone/stone-step-04.mp3',
            loop: true,
            volume: 0.1,
            attachedToEntity: entity,
        });

        entity.lockAllRotations();
        this.health = 100;
        this._isDead = false;
        this.kills = 0;

        if (entity instanceof PlayerEntity) {
            this.updateWeaponModel(entity);
        }

        this.updateUI(entity);
    }

    private updateUI(entity: Entity): void {
        const playerEntity = entity as PlayerEntity;
        if (playerEntity.player && playerEntity.player.ui) {
            // Send general statistics
            playerEntity.player.ui.sendData({
                type: 'stats-update',
                weapon: this.currentWeapon.name,
                health: this.health.toFixed(1),
                ammo: this.currentAmmo
            });

            // Send update for bullet count
            playerEntity.player.ui.sendData({
                type: 'bullets-count',
                bullets: this.currentAmmo
            });
        }

        if (playerEntity.player) {
            entity.world?.eventRouter.emit("GUNGAME.PLAYER_UPDATE", {
                player: playerEntity.player.username,
                weapon: this.currentWeapon.name,
                health: this.health.toFixed(1),
                ammo: this.currentAmmo
            });
        }
    }

    private calculateDamage(weapon: WeaponConfig, hitLocation: 'head' | 'body' | 'limbs'): number {
        switch (hitLocation) {
            case 'head':
                return weapon.headDamage;
            case 'limbs':
                return weapon.limbDamage;
            default:
                return weapon.bodyDamage;
        }
    }

    private calculateDamageWithFalloff(weapon: WeaponConfig, hitLocation: 'head' | 'body' | 'limbs', distance: number): number {
        // Get base damage for hit location
        let baseDamage = this.calculateDamage(weapon, hitLocation);
        
        // Special handling for shotgun - more aggressive falloff
        if (weapon.name === "shotgun") {
            const falloffStart = weapon.range * 0.3;  // Start falloff earlier (at 30% of range)
            
            if (distance <= falloffStart) {
                // Full damage within close range
                return baseDamage;
            } else {
                // More aggressive falloff for shotgun
                const falloffPercentage = Math.max(0, 1 - ((distance - falloffStart) / (weapon.range - falloffStart)));
                // Minimum damage is 20% of base damage for shotgun
                return Math.max(baseDamage * (falloffPercentage * falloffPercentage), baseDamage * 0.2);
            }
        }
        
        // Normal falloff for other weapons
        const falloffStart = weapon.range * 0.5;
        if (distance <= falloffStart) {
            return baseDamage;
        } else {
            const falloffPercentage = Math.max(0, 1 - ((distance - falloffStart) / (weapon.range - falloffStart)));
            return Math.max(baseDamage * falloffPercentage, baseDamage * 0.3);
        }
    }

    private playDamageSound(entity: Entity): void {
        if (!entity.world) return;

        const audio = new Audio({
            uri: 'audio/player-damage.mp3',
            loop: false,
            volume: 0.5,
            attachedToEntity: entity,
        });

        audio.play(entity.world);
    }

    public takeDamage(damage: number, entity: PlayerEntity, attackerEntity: PlayerEntity): void {
        if (this._isDead) return;

        this.health = Math.round((Math.max(0, this.health - damage)) * 10) / 10;
        console.log(`[${this.getPlayerIdentifier(entity)}] Took ${damage.toFixed(1)} damage from ${this.getPlayerIdentifier(attackerEntity)}! Health: ${this.health.toFixed(1)}`);

        // Play damage sound when hit
        this.playDamageSound(entity);

        this.updateUI(entity);

        if (this.health <= 0 && !this._isDead) {
            this._isDead = true;
            entity.setPosition({ x: 0, y: -100, z: 0 });
            this.die(entity, attackerEntity);
        }
    }

    private die(entity: PlayerEntity, attackerEntity: PlayerEntity): void {
        console.log(`[${this.getPlayerIdentifier(entity)}] Died!`);

        // Log the killer's name
        if (attackerEntity) {
            console.log(`${this.getPlayerIdentifier(attackerEntity)} killed ${this.getPlayerIdentifier(entity)}`);
        }

        // Save current weapon before death
        this._lastWeaponBeforeDeath = this.currentWeapon;

        // Remove weapon when dead
        if (this._weaponEntity) {
            this._weaponEntity.despawn();
            this._weaponEntity = undefined;
        }

        // Handle attacker logic - moved this block up and consolidated scoring
        if (attackerEntity && attackerEntity.controller instanceof MyEntityController) {
            const attackerController = attackerEntity.controller;
            
            // First check if this was a baguette kill
            if (attackerController.currentWeapon.name === 'baguette' && attackerController.currentWeapon.victory) {
                console.log(`[GAME] ${this.getPlayerIdentifier(attackerEntity)} got a kill with baguette! Triggering win condition...`);
                if (attackerEntity.world instanceof GunWorld) {
                    attackerEntity.world.handleGameWin(attackerEntity);
                    return; // Exit early as game is ending
                }
            }

            // If not a winning kill, proceed with normal kill logic
            attackerController.kills++;
            console.log(`[WEAPON] ${this.getPlayerIdentifier(attackerEntity)} now has ${attackerController.kills} kills`);
            
            // Update score
            if (attackerEntity.world instanceof GunWorld) {
                const world = attackerEntity.world;
                const currentScore = world._worldState.scores.get(attackerEntity.player.username) || 0;
                world._worldState.scores.set(attackerEntity.player.username, currentScore + 1);
            }

            // Handle weapon progression
            const newAttackerWeapon = getWeaponByKillCount(attackerController.kills);
            console.log(`[WEAPON] Selected new weapon: ${newAttackerWeapon.name}`);
            
            if (attackerController.currentWeapon.name !== newAttackerWeapon.name) {
                console.log(`[WEAPON] Switching from ${attackerController.currentWeapon.name} to ${newAttackerWeapon.name}`);
                attackerController.switchWeapon(newAttackerWeapon, attackerEntity);
            }
        }

        // Send death UI message
        if (entity.player && entity.player.ui) {
            entity.player.ui.sendData({
                type: 'player-died',
                respawnTime: 5
            });
        }

        // Send kill feed
        if (entity.world && attackerEntity) {
            this.broadcastKillFeed(entity.world, attackerEntity, entity);
        }

        // Handle respawn timer
        let respawnTime = 5;
        const countdownInterval = setInterval(() => {
            if (entity.player && entity.player.ui) {
                entity.player.ui.sendData({
                    type: 'respawn-countdown',
                    timeLeft: respawnTime
                });
            }
            console.log(`[${this.getPlayerIdentifier(entity)}] Respawning in ${respawnTime} seconds...`);
            respawnTime--;

            if (respawnTime < 0) {
                clearInterval(countdownInterval);
                this.respawn(entity);
            }
        }, 1000);
    }

    private respawn(entity: PlayerEntity): void {
        if (!entity.world) return;

        this.health = 100;
        this._isDead = false;
        // Make sure we're not frozen when respawning
        this._freeze = false;
        // Restore weapon from before death
        this.currentWeapon = this._lastWeaponBeforeDeath;
        this.currentAmmo = this.currentWeapon.maxAmmo;
        entity.setPosition({ x: 0, y: 2, z: 0 });

        console.log(`[${this.getPlayerIdentifier(entity)}] Respawning with ${this.currentWeapon.name}, freeze: ${this._freeze}`);
        this.updateWeaponModel(entity);
        this.updateUI(entity);
        console.log(`[${this.getPlayerIdentifier(entity)}] Respawned!`);
    }

    public spawn(entity: Entity): void {
        if (!entity.isSpawned) {
            throw new Error('MyEntityController.spawn(): Entity is not spawned!');
        }

        // Ground sensor
        entity.createAndAddChildCollider({
            shape: ColliderShape.CYLINDER,
            radius: 0.23,
            halfHeight: 0.125,
            collisionGroups: {
                belongsTo: [CollisionGroup.ENTITY_SENSOR],
                collidesWith: [CollisionGroup.BLOCK, CollisionGroup.ENTITY],
            },
            isSensor: true,
            relativePosition: { x: 0, y: -0.75, z: 0 },
            tag: 'groundSensor',
            onCollision: (other: BlockType | Entity, started: boolean) => {
                // Ground contact
                this._groundContactCount += started ? 1 : -1;
                if (!this._groundContactCount) {
                    entity.startModelOneshotAnimations(['jump_loop']);
                } else {
                    entity.stopModelAnimations(['jump_loop']);
                }

                // Platform contact
                if (!(other instanceof Entity) || !other.isKinematic) return;
                if (started) {
                    this._platform = other;
                } else if (other === this._platform && !started) {
                    this._platform = undefined;
                }
            },
        });

        // Wall collider
        entity.createAndAddChildCollider({
            shape: ColliderShape.CAPSULE,
            halfHeight: 0.30,
            radius: 0.37,
            collisionGroups: {
                belongsTo: [CollisionGroup.ENTITY_SENSOR],
                collidesWith: [CollisionGroup.BLOCK],
            },
            friction: 0,
            frictionCombineRule: CoefficientCombineRule.Min,
            tag: 'wallCollider',
        });

        // Spawn weapon if this is a player entity
        if (entity instanceof PlayerEntity) {
            this.updateWeaponModel(entity);
        }
    }

    public detach(entity: Entity): void {
        super.detach(entity);
        this._stepAudio = undefined;

        if (this._weaponEntity) {
            this._weaponEntity.despawn();
            this._weaponEntity = undefined;
        }

        // Очищаем имя при отключении
        if (entity instanceof PlayerEntity) {
            this._playerNames.delete(entity.id!);
        }
    }

    private startReload(entity: PlayerEntity): void {
        if (this._isReloading) return;

        if (this.currentAmmo >= this.currentWeapon.maxAmmo) {
            console.log(`[${this.getPlayerIdentifier(entity)}] Magazine is full!`);
            return;
        }

        this._isReloading = true;
        console.log(`[${this.getPlayerIdentifier(entity)}] Started reloading ${this.currentWeapon.name}...`);

        // Play reload animation based on weapon type
        entity.startModelOneshotAnimations([this.currentWeapon.reloadAnimation]);

        this.playWeaponSound(entity, this.currentWeapon, true);

        let remainingTime = this.currentWeapon.reloadTime / 1000;
        const updateInterval = setInterval(() => {
            console.log(`[${this.getPlayerIdentifier(entity)}] Reloading... ${remainingTime.toFixed(1)}s`);
            remainingTime -= 0.1;
        }, 100);

        setTimeout(() => {
            clearInterval(updateInterval);
            if (!this._isDead) {
                this.currentAmmo = this.currentWeapon.maxAmmo;
                this._isReloading = false;
                console.log(`[${this.getPlayerIdentifier(entity)}] Reload complete! Ammo: ${this.currentAmmo}`);
                this.updateUI(entity);
            }
        }, this.currentWeapon.reloadTime);
    }

    private updateSpread(currentTime: number): void {
        const timeSinceLastShot = currentTime - this._lastShotTime;

        // Update spread recovery
        if (timeSinceLastShot < this.currentWeapon.spreadRecoveryTime) {
            const recoveryProgress = timeSinceLastShot / this.currentWeapon.spreadRecoveryTime;
            this._currentSpread = this.currentWeapon.spread * (1 - recoveryProgress);
        } else {
            this._currentSpread = 0;
        }
    }

    private applyRecoil(entity: PlayerEntity): void {
        this._currentSpread = this.currentWeapon.spread;
    }

    private playWeaponSound(entity: Entity, weapon: WeaponConfig, isReload: boolean): void {
        if (!entity.world) return;

        const audio = new Audio({
            uri: isReload ? weapon.reloadAudio : weapon.fireAudio,
            loop: false,
            volume: isReload ? 0.8 : 0.35,
            attachedToEntity: entity,
        });

        audio.play(entity.world);
    }

    private getHitLocation(hitPoint: { y: number }, entityPosition: { y: number }): 'head' | 'body' | 'limbs' {
        const relativeHitHeight = hitPoint.y - entityPosition.y;

        // Определяем зоны попадания по высоте относительно центра игрока
        if (relativeHitHeight > 0.5) { // Выше 0.5 - голова
            return 'head';
        } else if (relativeHitHeight < -0.3) { // Ниже -0.3 - ноги
            return 'limbs';
        } else if (Math.abs(relativeHitHeight) <= 0.3) { // В пределах ±0.3 - тело
            return 'body';
        } else { // Остальное - руки
            return 'limbs';
        }
    }

    public tickWithPlayerInput(entity: PlayerEntity, input: PlayerInput, cameraOrientation: PlayerCameraOrientation, deltaTimeMs: number): void {
        if (!entity.isSpawned || !entity.world) return;
        
        // Check freeze state
        if (this._freeze) {
            // When frozen, only allow camera movement
            this.handleCameraOnly(entity, input, cameraOrientation);
            return;
        }

        // Normal input handling
        super.tickWithPlayerInput(entity, input, cameraOrientation, deltaTimeMs);

        const { w, a, s, d, sp, sh, ml, r, mr } = input;
        const { yaw } = cameraOrientation;
        const currentVelocity = entity.linearVelocity;
        const targetVelocities = { x: 0, y: 0, z: 0 };
        const isRunning = sh;

        // Handle reload
        if (r && !this._isReloading) {
            this.startReload(entity);
        }

        // Handle movement animations
        if (this.isGrounded && (w || a || s || d)) {
            if (isRunning) {
                const runAnimations = ['run_upper', 'run_lower'];
                entity.stopModelAnimations(Array.from(entity.modelLoopedAnimations).filter(v => !runAnimations.includes(v)));
                entity.startModelLoopedAnimations(runAnimations);
                this._stepAudio?.setPlaybackRate(0.81);
            } else {
                // Choose walk animation based on current weapon
                const walkAnimation = this.currentWeapon.walkAnimation;
                entity.stopModelAnimations(Array.from(entity.modelLoopedAnimations).filter(v => !walkAnimation.includes(v)));
                entity.startModelLoopedAnimations([walkAnimation]);
                this._stepAudio?.setPlaybackRate(0.55);
            }
            this._stepAudio?.play(entity.world, !this._stepAudio?.isPlaying);
        } else {
            this._stepAudio?.pause();
            const idleAnimation = this.currentWeapon.idleAnimation;
            entity.stopModelAnimations(Array.from(entity.modelLoopedAnimations).filter(v => !idleAnimation.includes(v)));
            entity.startModelLoopedAnimations([idleAnimation]);
        }

        // Calculate movement velocities
        const velocity = isRunning ? this.runVelocity : this.walkVelocity;

        if (w) {
            targetVelocities.x -= velocity * Math.sin(yaw);
            targetVelocities.z -= velocity * Math.cos(yaw);
        }
        if (s) {
            targetVelocities.x += velocity * Math.sin(yaw);
            targetVelocities.z += velocity * Math.cos(yaw);
        }
        if (a) {
            targetVelocities.x -= velocity * Math.cos(yaw);
            targetVelocities.z += velocity * Math.sin(yaw);
        }
        if (d) {
            targetVelocities.x += velocity * Math.cos(yaw);
            targetVelocities.z -= velocity * Math.sin(yaw);
        }

        // Normalize diagonal movement
        const length = Math.sqrt(targetVelocities.x * targetVelocities.x + targetVelocities.z * targetVelocities.z);
        if (length > velocity) {
            const factor = velocity / length;
            targetVelocities.x *= factor;
            targetVelocities.z *= factor;
        }

        // Handle jumping
        if (sp && this.isGrounded && currentVelocity.y > -0.001 && currentVelocity.y <= 3) {
            targetVelocities.y = this.jumpVelocity;
        }

        // Apply movement
        const platformVelocity = this._platform ? this._platform.linearVelocity : { x: 0, y: 0, z: 0 };
        const deltaVelocities = {
            x: targetVelocities.x - currentVelocity.x + platformVelocity.x,
            y: targetVelocities.y + platformVelocity.y,
            z: targetVelocities.z - currentVelocity.z + platformVelocity.z,
        };

        // Apply velocities if not externally affected
        const hasExternalVelocity =
            Math.abs(currentVelocity.x) > this.runVelocity ||
            Math.abs(currentVelocity.y) > this.jumpVelocity ||
            Math.abs(currentVelocity.z) > this.runVelocity;

        if (!hasExternalVelocity) {
            const mass = entity.mass;
            entity.applyImpulse({
                x: deltaVelocities.x * mass,
                y: deltaVelocities.y * mass,
                z: deltaVelocities.z * mass,
            });
        }

        // Apply rotation
        if (yaw !== undefined) {
            const halfYaw = yaw / 2;
            entity.setRotation({
                x: 0,
                y: Math.fround(Math.sin(halfYaw)),
                z: 0,
                w: Math.fround(Math.cos(halfYaw)),
            });
        }

        // Handle weapon firing
        const currentTime = Date.now();
        this.updateSpread(currentTime);

        if (ml && !this._isDead) {
            const currentTime = Date.now();
            
            if (this.currentAmmo <= 0) {
                // Only play empty sound if enough time has passed (use same rate as weapon's fire rate)
                if (currentTime - this._lastEmptySoundTime >= this.currentWeapon.fireRate) {
                    this.playEmptyWeaponSound(entity, this.currentWeapon);
                    this._lastEmptySoundTime = currentTime;
                }
                return;
            }

            if (this._isReloading) {
                return;
            }

            if (currentTime - this.lastFireTime >= this.currentWeapon.fireRate) {
                console.log(`[${this.getPlayerIdentifier(entity)}] Firing ${this.currentWeapon.name}!`);
                this.playWeaponSound(entity, this.currentWeapon, false);

                // Fire weapon
                const rayStart = {
                    x: entity.position.x,
                    y: entity.position.y + 0.7,
                    z: entity.position.z
                };

                const facingDir = { ...entity.player.camera.facingDirection };

                const ray = entity.world.simulation.raycast(
                    rayStart,
                    facingDir,
                    this.currentWeapon.range,
                    { 
                        filterExcludeRigidBody: entity.rawRigidBody
                    },
                );

                if (this.currentWeapon.name === 'rpg' && ray?.hitPoint) {
                    // Урон по площади
                    const explosionRadius = 5; // Установите радиус взрыва
                    const damage = this.currentWeapon.damage; // Урон от RPG

                    // Наносим урон всем игрокам в радиусе
                    const allPlayerEntities = entity.world.entityManager.getAllPlayerEntities();
                    allPlayerEntities.forEach((player) => {
                        const distance = this.calculateDistance(ray.hitPoint, player.position);
                        if (distance <= explosionRadius) {
                            const controller = player.controller;
                            if (controller instanceof MyEntityController) {
                                controller.takeDamage(damage, player, entity); // Наносим урон
                                console.log(`[${this.getPlayerIdentifier(player)}] Hit by RPG explosion! Damage: ${damage}`);
                            }
                        }
                    });
                } else if (ray?.hitEntity) {
                    const hitEntity = ray.hitEntity;
                    if (hitEntity instanceof PlayerEntity) {
                        const controller = hitEntity.controller;
                        if (controller instanceof MyEntityController) {
                            const hitLocation = this.getHitLocation(ray.hitPoint, hitEntity.position);
                            const distance = this.getDistanceToPlayer(entity, hitEntity);
                            const damage = this.calculateDamageWithFalloff(this.currentWeapon, hitLocation, distance);
                            controller.takeDamage(damage, hitEntity, entity);
                            console.log(`[${this.getPlayerIdentifier(entity)}] Hit ${this.getPlayerIdentifier(hitEntity)} in ${hitLocation} at ${distance.toFixed(1)}m! Damage: ${damage.toFixed(1)}, Their remaining health: ${controller.health.toFixed(1)}`);
                        }
                    }
                }

                // Update ammo and UI
                this.currentAmmo--;
                this.updateUI(entity);

                // Play firing animation
                const fireAnimation = `fire_${this.currentWeapon.name}`;
                console.log(`Attempting to play ${fireAnimation} animation.`);
                entity.startModelOneshotAnimations([fireAnimation]);

                // Update last fire times
                this.lastFireTime = currentTime;
            }
        }

        // Example usage in tickWithPlayerInput:
        const nearbyPlayers = entity.world.entityManager.getAllPlayerEntities().filter(other => {
            if (other === entity) return false;
            const distance = this.getDistanceToPlayer(entity, other);
            return distance < 10; // Returns players within 10 units
        });
    }

    private handleCameraOnly(entity: PlayerEntity, input: PlayerInput, cameraOrientation: PlayerCameraOrientation): void {
        // Allow only camera movement when frozen
        const { mr } = input;
        
        // Handle aiming with right mouse button
        if (mr && entity.player) {
            const zoomLevel = this.currentWeapon.zoomLevel || 1;
            entity.player.camera.setFov(60 / zoomLevel);
        } else if (entity.player) {
            entity.player.camera.setFov(60);
        }
    }

    // Метод для расчета расстояния
    private calculateDistance(pointA: { x: number, y: number, z: number }, pointB: { x: number, y: number, z: number }): number {
        const dx = pointA.x - pointB.x;
        const dy = pointA.y - pointB.y;
        const dz = pointA.z - pointB.z;
        return Math.sqrt(dx * dx + dy * dy + dz * dz);
    }

    public switchWeapon(newWeapon: WeaponConfig, entity: PlayerEntity): void {
        this.currentWeapon = newWeapon;
        this.currentAmmo = newWeapon.maxAmmo;
        this.updateWeaponModel(entity);
        this.updateUI(entity);

        // Play different sounds based on weapon
        const soundUri = newWeapon.name === 'baguette' 
            ? 'audio/engage-baguette.mp3'  // Special baguette sound
            : 'audio/level-up.mp3';        // Normal level up sound

        const levelUpSound = new Audio({
            uri: soundUri,
            loop: false,
            volume: 0.4,
            // spatialSound: false,
            attachedToEntity: entity
        });        
        if (entity.world) {
            levelUpSound.play(entity.world);
        }

        console.log(`Available animations for ${newWeapon.name}:`, entity.modelAnimationNames);
    }

    private getDistanceToPlayer(entity: PlayerEntity, otherPlayer: PlayerEntity): number {
        const dx = entity.position.x - otherPlayer.position.x;
        const dy = entity.position.y - otherPlayer.position.y;
        const dz = entity.position.z - otherPlayer.position.z;
        
        return Math.sqrt(dx * dx + dy * dy + dz * dz);
    }

    private playEmptyWeaponSound(entity: Entity, weapon: WeaponConfig): void {
        if (!entity.world) return;

        // Map weapon names to their empty sound files
        const emptySoundMap: { [key: string]: string } = {
            'pistol': 'audio/pistol-empty.mp3',
            'ak47': 'audio/ak47-empty.mp3',
            'shotgun': 'audio/shotgun-empty.mp3',
            'rpg': 'audio/rocket-empty.mp3',
            'awp': 'audio/sniper-empty.mp3',
        };

        const audio = new Audio({
            uri: emptySoundMap[weapon.name] || 'audio/pistol-empty.mp3', // Default to pistol if no match
            loop: false,
            volume: 0.6,
            attachedToEntity: entity,
        });

        audio.play(entity.world);
    }

    public forceUpdate(): void {
        console.log(`[CONTROLLER] Force updating controller state, freeze: ${this._freeze}`);
        // Force a state update by triggering a small position change
        if (this.entity) {
            const currentPos = this.entity.position;
            this.entity.setPosition({ 
                x: currentPos.x + 0.0001, 
                y: currentPos.y, 
                z: currentPos.z 
            });
            this.entity.setPosition(currentPos);
        }
    }

    public setFrozen(value: boolean): void {
        const oldValue = this._freeze;
        this._freeze = value;
        
        if (!this.entity) return;
        
        console.log(`[CONTROLLER] ${this.entity.player?.username} freeze state changing from ${oldValue} to ${value}`);
        
        if (!value) {
            // When unfreezing, reset all movement and physics
            console.log(`[CONTROLLER] Resetting physics for ${this.entity.player?.username}`);
            this.entity.setLinearVelocity({ x: 0, y: 0, z: 0 });
            this.entity.setAngularVelocity({ x: 0, y: 0, z: 0 });
            
            // Reset the entity's physics state
            // this.entity.resetPhysics?.();
        } else {
            // When freezing, stop all movement
            this.entity.setLinearVelocity({ x: 0, y: 0, z: 0 });
            this.entity.setAngularVelocity({ x: 0, y: 0, z: 0 });
        }
    }

    public isFrozen(): boolean {
        const frozen = this._freeze;
        console.log(`[CONTROLLER] ${this.entity?.player?.username} freeze state checked: ${frozen}`);
        return frozen;
    }
}