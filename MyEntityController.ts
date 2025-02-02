import {
    Audio,
    BaseEntityController,
    ColliderShape,
    CoefficientCombineRule,
    CollisionGroup,
    Entity,
    World,
    PlayerEntity,
    PlayerCameraMode,
  } from 'hytopia';
  
  import type {
    PlayerInput,
    PlayerCameraOrientation,
    BlockType,
  } from 'hytopia';
  
interface WeaponConfig {
    damage: number;
    fireRate: number;
    range: number;
    maxAmmo: number;
    modelUri: string;
    reloadTime: number;
    spread: number;
    spreadRecoveryTime: number;
    walkAnimation: string;
    fireAnimation: string;
    headDamage: number;
    bodyDamage: number;
    limbDamage: number;
    killsRequired: number;
    victory: boolean;
}

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
    
    private currentWeapon: string = 'pistol';
    private lastFireTime: number = 0;
    private health: number = 100;
    private kills: number = 0;
    private currentAmmo: number = 20;
    private weaponConfigs: { [key: string]: WeaponConfig } = {
        pistol: {
            damage: 20,
            fireRate: 500,
            range: 50,
            maxAmmo: 20,
            modelUri: 'models/pistol.gltf',
            reloadTime: 2200, // 2.2 seconds
            spread: 0.06,
            spreadRecoveryTime: 100, // 0.1 seconds
            walkAnimation: 'walk', // Анимация ходьбы
            fireAnimation: 'fire', // Анимация выстрела
            headDamage: 10, // Урон по голове
            bodyDamage: 5, // Урон по телу
            limbDamage: 3, // Урон по конечностям
            killsRequired: 1, // Количество убийств для смены на AK-47
            victory: false, // Не приводит к победе
        },
        ak47: {
            damage: 15,
            fireRate: 100,
            range: 70,
            maxAmmo: 30,
            modelUri: 'models/ak47.gltf',
            reloadTime: 2500, // 2.5 seconds
            spread: 0.055,
            spreadRecoveryTime: 300, // 0.3 seconds
            walkAnimation: 'walk_ak', // Анимация ходьбы для AK-47
            fireAnimation: 'fire_ak', // Анимация выстрела для AK-47
            headDamage: 14, // Урон по голове
            bodyDamage: 7, // Урон по телу
            limbDamage: 3, // Урон по конечностям
            killsRequired: 0, // AK-47 доступен сразу
            victory: true, // Приводит к победе
        }
    };

    // Movement settings
    public jumpVelocity: number = 10;
    public runVelocity: number = 8;
    public walkVelocity: number = 4;

    public get isGrounded(): boolean { return this._groundContactCount > 0; }
    public get isOnPlatform(): boolean { return !!this._platform; }
    public get platform(): Entity | undefined { return this._platform; }
  
    private _lastWeaponBeforeDeath: string = 'pistol';
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

        console.log(`[${this.getPlayerIdentifier(entity)}] Updating weapon model. Current weapon: ${this.currentWeapon}`);

        // Удалите старое оружие, если оно существует
        if (this._weaponEntity) {
            console.log(`[${this.getPlayerIdentifier(entity)}] Removing old weapon entity`);
            this._weaponEntity.despawn();
            this._weaponEntity = undefined;
        }

        // Создайте новое оружие
        const weaponConfig = this.weaponConfigs[this.currentWeapon];
        this._weaponEntity = new Entity({
            name: `weapon_${this.currentWeapon}`,
            modelUri: weaponConfig.modelUri,
            modelScale: 1,
        });

        console.log(`[${this.getPlayerIdentifier(entity)}] Creating new weapon entity with model URI: ${weaponConfig.modelUri}`);

        // Спавн оружия и привязка к правой руке игрока
        this._weaponEntity.spawn(entity.world, { x: 0, y: 0, z: 0 });
        console.log(`[${this.getPlayerIdentifier(entity)}] Spawned new weapon entity: ${this.currentWeapon}`);
        
        // Используйте правильную точку привязки и настройте позицию/ориентацию для каждого оружия
        if (this.currentWeapon === 'pistol') {
            this._weaponEntity.setParent(entity, 'hand_right_anchor', 
                { x: 0.08, y: 0.02, z: 0.15 },
                { x: -0.383, y: 0.0, z: 0.0, w: 0.924 }
            );
        } else if (this.currentWeapon === 'ak47') {
            this._weaponEntity.setParent(entity, 'hand_right_anchor',
                { x: 0, y: 0, z: 0 },
                { x: 0, y: 0, z: 0, w: 1 } // Убедитесь, что ориентация правильная
            );
        }
        console.log(`[${this.getPlayerIdentifier(entity)}] Weapon attached to player hand`);
    }

    public attach(entity: Entity): void {
        super.attach(entity);
        
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
        this.currentWeapon = 'pistol';
        this.currentAmmo = this.weaponConfigs[this.currentWeapon].maxAmmo;
        
        if (entity instanceof PlayerEntity) {
            this.updateWeaponModel(entity);
        }
        
        this.updateUI(entity);
    }

    private updateUI(entity: Entity): void {
        const playerEntity = entity as PlayerEntity;
        if (playerEntity.player && playerEntity.player.ui) {
            // Отправляем общую статистику
            playerEntity.player.ui.sendData({
                type: 'stats-update',
                weapon: this.currentWeapon,
                health: this.health.toFixed(1),
                ammo: this.currentAmmo
            });

            // Отправляем обновление количества патронов для bullets-count
            playerEntity.player.ui.sendData({
                type: 'bullets-count',
                bullets: this.currentAmmo
            });
        }
    }

    private calculateDamage(weapon: string, hitLocation: 'head' | 'body' | 'limbs'): number {
        const config = this.weaponConfigs[weapon];
        switch (hitLocation) {
            case 'head':
                return config.headDamage;
            case 'limbs':
                return config.limbDamage;
            default:
                return config.bodyDamage;
        }
    }

    public takeDamage(damage: number, entity: PlayerEntity, attackerEntity: PlayerEntity): void {
        if (this._isDead) return;

        this.health = Math.round((Math.max(0, this.health - damage)) * 10) / 10;
        console.log(`[${this.getPlayerIdentifier(entity)}] Took ${damage.toFixed(1)} damage from ${this.getPlayerIdentifier(attackerEntity)}! Health: ${this.health.toFixed(1)}`);
        
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
        
        // Сохраните текущее оружие перед смертью
        this._lastWeaponBeforeDeath = this.currentWeapon;
        
        // Отправляем сообщение о смерти с отсчетом
        if (entity.player && entity.player.ui) {
            entity.player.ui.sendData({
                type: 'player-died',
                respawnTime: 5
            });
        }
        
        // Отправляем информацию об убийстве всем игрокам
        if (entity.world) {
            this.broadcastKillFeed(entity.world, attackerEntity, entity);
        }
        
        // Удалите старое оружие, когда игрок мертв
        if (this._weaponEntity) {
            this._weaponEntity.despawn();
            this._weaponEntity = undefined;
        }
        
        // Проверка на смену оружия
        if (attackerEntity && attackerEntity.controller instanceof MyEntityController) {
            const attackerController = attackerEntity.controller;
            attackerController.kills++;

            // Смена оружия
            if (attackerController.kills >= this.weaponConfigs[attackerController.currentWeapon].killsRequired) {
                attackerController.switchWeapon('ak47', attackerEntity); // Смена на AK-47 для убийцы
                console.log(`[${this.getPlayerIdentifier(attackerEntity)}] Upgraded to AK-47!`);
            }

            // Проверка на победу
            if (this.weaponConfigs[attackerController.currentWeapon].victory) {
                // Отправляем сообщение о победе
                if (attackerEntity.player && attackerEntity.player.ui) {
                    attackerEntity.player.ui.sendData({
                        type: 'victory-screen',
                        message: 'You Win!',
                    });
                }
            }
        }
        
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
        // Restore weapon from before death
        this.currentWeapon = this._lastWeaponBeforeDeath;
        this.currentAmmo = this.weaponConfigs[this.currentWeapon].maxAmmo;
        entity.setPosition({ x: 0, y: 2, z: 0 });
        
        console.log(`[${this.getPlayerIdentifier(entity)}] Respawning with ${this.currentWeapon}`);
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
          belongsTo: [ CollisionGroup.ENTITY_SENSOR ],
          collidesWith: [ CollisionGroup.BLOCK, CollisionGroup.ENTITY ],
        },
        isSensor: true,
        relativePosition: { x: 0, y: -0.75, z: 0 },
        tag: 'groundSensor',
            onCollision: (other: BlockType | Entity, started: boolean) => {
          // Ground contact
          this._groundContactCount += started ? 1 : -1;
          if (!this._groundContactCount) {
            entity.startModelOneshotAnimations([ 'jump_loop' ]);
          } else {
            entity.stopModelAnimations([ 'jump_loop' ]);
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
          belongsTo: [ CollisionGroup.ENTITY_SENSOR ],
          collidesWith: [ CollisionGroup.BLOCK ],
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
        
        const weaponConfig = this.weaponConfigs[this.currentWeapon];
        if (this.currentAmmo >= weaponConfig.maxAmmo) {
            console.log(`[${this.getPlayerIdentifier(entity)}] Magazine is full!`);
            return;
        }

        this._isReloading = true;
        console.log(`[${this.getPlayerIdentifier(entity)}] Started reloading ${this.currentWeapon}...`);

        // Play reload animation based on weapon type
        if (this.currentWeapon === 'ak47') {
            entity.startModelOneshotAnimations(['recharge_ak']);
        } else {
            entity.startModelOneshotAnimations(['simple_interact']);
        }

        let remainingTime = weaponConfig.reloadTime / 1000;
        const updateInterval = setInterval(() => {
            console.log(`[${this.getPlayerIdentifier(entity)}] Reloading... ${remainingTime.toFixed(1)}s`);
            remainingTime -= 0.1;
        }, 100);

        setTimeout(() => {
            clearInterval(updateInterval);
            if (!this._isDead) {
                this.currentAmmo = weaponConfig.maxAmmo;
                this._isReloading = false;
                console.log(`[${this.getPlayerIdentifier(entity)}] Reload complete! Ammo: ${this.currentAmmo}`);
                this.updateUI(entity);
            }
        }, weaponConfig.reloadTime);
    }

    private updateSpread(currentTime: number): void {
        const weaponConfig = this.weaponConfigs[this.currentWeapon];
        const timeSinceLastShot = currentTime - this._lastShotTime;
        
        // Update spread recovery
        if (timeSinceLastShot < weaponConfig.spreadRecoveryTime) {
            const recoveryProgress = timeSinceLastShot / weaponConfig.spreadRecoveryTime;
            this._currentSpread = weaponConfig.spread * (1 - recoveryProgress);
        } else {
            this._currentSpread = 0;
        }
    }

    private applyRecoil(entity: PlayerEntity): void {
        const weaponConfig = this.weaponConfigs[this.currentWeapon];
        this._currentSpread = weaponConfig.spread;
    }

    private playWeaponSound(entity: Entity, isReload: boolean): void {
        if (!entity.world) return;

        const audio = new Audio({
            uri: isReload ? 'audio/pistol-reload.mp3' : 'audio/pistol-fire.mp3',
            loop: false,
            volume: isReload ? 0.8 : 0.6,
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
        if (!entity.isSpawned || !entity.world || this._isDead) return;
  
      super.tickWithPlayerInput(entity, input, cameraOrientation, deltaTimeMs);
  
        const { w, a, s, d, sp, sh, ml, r } = input;
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
                const walkAnimation = this.weaponConfigs[this.currentWeapon].walkAnimation;
          entity.stopModelAnimations(Array.from(entity.modelLoopedAnimations).filter(v => !walkAnimation.includes(v)));
          entity.startModelLoopedAnimations([walkAnimation]);
          this._stepAudio?.setPlaybackRate(0.55);
        }
        this._stepAudio?.play(entity.world, !this._stepAudio?.isPlaying);
      } else {
        this._stepAudio?.pause();
            const idleAnimation = this.currentWeapon === 'ak47' ? 'idle_ak' : 'idle';
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

        if (ml && !this._isDead && this.currentAmmo > 0 && !this._isReloading) {
            const weaponConfig = this.weaponConfigs[this.currentWeapon];
            if (currentTime - this.lastFireTime >= weaponConfig.fireRate) {
                const isFirstShot = currentTime - this._lastShotTime > weaponConfig.spreadRecoveryTime;
                console.log(`[${this.getPlayerIdentifier(entity)}] Firing ${this.currentWeapon}!`);
                
                // Play fire sound
                this.playWeaponSound(entity, false);
                
                // Fire weapon
                const rayStart = {
                    x: entity.position.x,
                    y: entity.position.y + 0.7,
                    z: entity.position.z
                };
                
                // Apply spread to the facing direction
                const facingDir = { ...entity.player.camera.facingDirection };
                if (!isFirstShot) {
                    const spread = this._currentSpread;
                    facingDir.x += (Math.random() - 0.5) * spread;
                    facingDir.y += (Math.random() - 0.5) * spread;
                    facingDir.z += (Math.random() - 0.5) * spread;
                    
                    // Normalize the direction vector
                    const length = Math.sqrt(facingDir.x * facingDir.x + facingDir.y * facingDir.y + facingDir.z * facingDir.z);
                    facingDir.x /= length;
                    facingDir.y /= length;
                    facingDir.z /= length;
                }
                
                // Apply recoil (updates spread)
                this.applyRecoil(entity);
                
                const ray = entity.world.simulation.raycast(
                    rayStart,
                    facingDir,
                    weaponConfig.range,
                    { 
                        filterExcludeRigidBody: entity.rawRigidBody
                    },
                );

                if (ray?.hitEntity) {
                    const hitEntity = ray.hitEntity;
                    if (hitEntity instanceof PlayerEntity) {
                        const controller = hitEntity.controller;
                        if (controller instanceof MyEntityController) {
                            const hitLocation = this.getHitLocation(ray.hitPoint, hitEntity.position);
                            const damage = this.calculateDamage(this.currentWeapon, hitLocation);
                            controller.takeDamage(damage, hitEntity, entity);
                            console.log(`[${this.getPlayerIdentifier(entity)}] Hit ${this.getPlayerIdentifier(hitEntity)} in ${hitLocation}! Damage: ${damage.toFixed(1)}, Their remaining health: ${controller.health.toFixed(1)}`);
                        }
                    }
                }

                // Update ammo and UI
                this.currentAmmo--;
                this.updateUI(entity);

                // Play firing animation
                const fireAnimation = this.weaponConfigs[this.currentWeapon].fireAnimation;
                entity.startModelOneshotAnimations([fireAnimation]);
                
                // Update last fire times
                this.lastFireTime = currentTime;
                this._lastShotTime = currentTime;
            }
        }
    }


    public switchWeapon(newWeapon: string, entity: PlayerEntity): void {
        this.currentWeapon = newWeapon;
        this.currentAmmo = this.weaponConfigs[newWeapon].maxAmmo; // Установите максимальное количество патронов для нового оружия
        this.updateWeaponModel(entity); // Обновите модель оружия
        this.updateUI(entity); // Обновите интерфейс пользователя
    }
  }