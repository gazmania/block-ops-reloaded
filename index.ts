import {
  PlayerCameraMode,
  startServer,
  PlayerEntity,
  Entity,
  WorldMap,
  RigidBodyType,
  Collider,
  BlockType
} from 'hytopia';


import mapData from './assets/maps/boilerplate.json';
import { GunWorld } from './sessions/world';

startServer(world => {
  // Включаем отладку физики, чтобы видеть коллайдеры
  //world.simulation.enableDebugRaycasting(true);
  //world.simulation.enableDebugRendering(true);

  // Загружаем базовую карту
  world.loadMap(mapData);

  // // Создаем и спавним машину с динамической физикой
  // const carEntity = new Entity({
  //   modelUri: 'models/environment/car.gltf',
  //   modelScale: 0.7,
  //   rigidBodyOptions: {
  //     type: 'dynamic' as RigidBodyType, // Динамическое тело, будет реагировать на физику
  //     position: { x: 10, y: 5, z: 10 },
  //     rotation: { x: 0, y: 0, z: 0, w: 1 }
  //   }
  // });
  // carEntity.spawn(world, { x: 10, y: 5, z: 10 }); // Спавним выше земли, чтобы увидеть падение

  // // Создаем и спавним здание
  // const buildingEntity = new Entity({
  //   modelUri: 'models/environment/build1.gltf',
  //   modelScale: 0.5,
  //   rigidBodyOptions: {
  //     type: 'fixed' as RigidBodyType, // Фиксированное тело, не будет двигаться
  //     position: { x: 0, y: 0, z: 0 },
  //     rotation: { x: 0, y: 0, z: 0, w: 1 }
  //   }
  // });
  // buildingEntity.spawn(world, { x: -10, y: 2, z: -10 });



  const worldRegistry: Record<string, GunWorld> = {
    "one-on-one": new GunWorld({
      id: 2,
      name: "One on One Action",
      skyboxUri: "./assets/skyboxes/partly-cloudy",
      minPlayerCount: 2,
      maxPlayerCount: 2,
      maxWaitingTime: 10 * 1000,
    })
  }

  Object.values(worldRegistry).forEach(world => {
    console.log(`Starting world ${world.name}`);
    world.start();
  });


  const oneOnOneGatewayEntity = new Entity({
    name: "one-on-one",
    blockHalfExtents: { x: 0.5, y: 0.5, z: 0.5 },
    blockTextureUri: "blocks/sand.png",
    rigidBodyOptions: {
      type: RigidBodyType.FIXED,
      colliders: [
        {
          ...Collider.optionsFromBlockHalfExtents({ x: 0.5, y: 0.5, z: 0.5 }),
          onCollision: (other: BlockType | Entity, started: boolean) => {
            if (!started) return;
            if (!(other instanceof PlayerEntity)) return;

            const playerEntity = other as PlayerEntity;

            const gameWorld = worldRegistry["one-on-one"];
            if (gameWorld.playerCount >= gameWorld.maxPlayerCount) {
              console.log(`[Player ${playerEntity.name}] can't get into game '${gameWorld.name}' as it's full; player count ${gameWorld.playerCount}`);
            }

            console.log(`[Player ${playerEntity.name}] is being sent to game '${gameWorld.name}' with ${gameWorld.playerCount} other players`)
            gameWorld.join(playerEntity.player);
          }
        }
      ],
    }
  });
  oneOnOneGatewayEntity.spawn(world, { x: 10, y: 1.5, z: 10 });

  world.onPlayerJoin = player => {
    const playerEntity = new PlayerEntity({
      player,
      name: 'Player',
      modelUri: 'models/players/PlayerModel.gltf',
      modelLoopedAnimations: ['idle'],
      modelScale: 0.5
    });

    player.camera.setMode(PlayerCameraMode.FIRST_PERSON);
    player.camera.setOffset({ x: 0, y: 0.4, z: 0 });
    player.camera.setModelHiddenNodes(['head', 'neck']);
    player.camera.setForwardOffset(0.3);

    playerEntity.spawn(world, { x: 0, y: 4, z: 0 });
  };

  world.onPlayerLeave = player => {
    console.log("Player Leavng WOerld")
    world.entityManager.getPlayerEntitiesByPlayer(player).forEach(entity => entity.despawn());
  };
});