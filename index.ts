import {
  PlayerCameraMode,
  startServer,
  PlayerEntity,
  Entity,
  WorldMap,
  RigidBodyType,
  Collider,
  BlockType,
  ColliderShape,
  Player,
  PlayerUI
} from 'hytopia';


import mapData from './assets/maps/boilerplate.json';
import { getWorld, GunWorld, listWorlds, startWorlds } from './sessions/world';

startServer(world => {
  // Включаем отладку физики, чтобы видеть коллайдеры
  //world.simulation.enableDebugRaycasting(true);
  //world.simulation.enableDebugRendering(true);

  // Загружаем базовую карту
  // world.loadMap(mapData);

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




  // const worldRegistry: Record<string, GunWorld> = {
  //   "one-on-one": new GunWorld({
  //     id: 1,
  //     name: "One on One Action",
  //     minPlayerCount: 2,
  //     maxPlayerCount: 2,
  //     maxWaitingTime: 10 * 1000,
  //   })
  // }

  // Object.values(worldRegistry).forEach(world => {
  //   console.log(`Starting world ${world.name}`);
  //   world.start();
  // });

  startWorlds(world);

  // const cameraAnchor = new Entity({
  //   blockHalfExtents: { x: 1, y: 1, z: 1 },
  //   blockTextureUri: "blocks/sand.png",
  //   rigidBodyOptions: {
  //     type: RigidBodyType.FIXED,
  //   }
  // });
  // cameraAnchor.spawn(world, { x: 0, y: 25, z: 0 })
  // const cameraTarget = new Entity({
  //   blockHalfExtents: { x: 1, y: 1, z: 1 },
  //   blockTextureUri: "blocks/sand.png",
  //   rigidBodyOptions: {
  //     type: RigidBodyType.FIXED,
  //   }
  // });
  // cameraTarget.spawn(world, { x: 0, y: 50, z: 0 })


  // const oneOnOneGatewayEntity = new Entity({
  //   name: "one-on-one",
  //   blockHalfExtents: { x: 0.5, y: 0.5, z: 0.5 },
  //   blockTextureUri: "blocks/sand.png",
  //   rigidBodyOptions: {
  //     type: RigidBodyType.FIXED,
  //     // colliders: [
  //     //   {
  //     //     ...Collider.optionsFromBlockHalfExtents({ x: 0.5, y: 0.5, z: 0.5 }),
  //     //     onCollision: (other: BlockType | Entity, started: boolean) => {
  //     //       if (!started) return;
  //     //       if (!(other instanceof PlayerEntity)) return;

  //     //       const playerEntity = other as PlayerEntity;

  //     //       const gameWorld = worldRegistry["one-on-one"];
  //     //       if (gameWorld.playerCount >= gameWorld.maxPlayerCount) {
  //     //         console.log(`[Entity ${playerEntity.id}] can't get into game '${gameWorld.name}' as it's full; player count ${gameWorld.playerCount}`);
  //     //       }

  //     //       console.log(`[Entity ${playerEntity.id}] is being sent to game '${gameWorld.name}' with ${gameWorld.playerCount} other players, ${playerEntity.modelUri}`)
  //     //       gameWorld.join(playerEntity.player);
  //     //     }
  //     //   }
  //     // ],
  //   }
  // });
  // oneOnOneGatewayEntity.spawn(world, { x: 5, y: 1.5, z: 5 });

  // const oneOnOneGatewaySensor = new Collider({
  //   shape: ColliderShape.BLOCK,
  //   halfExtents: { x: 0.5, y: 0.5, z: 0.5 },
  //   isSensor: true,
  //   relativePosition: { x: 5, y: 1.5, z: 5 },
  //   onCollision: (other: BlockType | Entity, started: boolean) => {
  //     if (!started) return;
  //     if (!(other instanceof PlayerEntity)) return;

  //     const playerEntity = other as PlayerEntity;

  //     const gameWorld = worldRegistry["one-on-one"];
  //     if (gameWorld.playerCount >= gameWorld.maxPlayerCount) {
  //       console.log(`[Entity ${playerEntity.id}] can't get into game '${gameWorld.name}' as it's full; player count ${gameWorld.playerCount}`);
  //     }

  //     console.log(`[Entity ${playerEntity.id}] is being sent to game '${gameWorld.name}' with ${gameWorld.playerCount} other players, ${playerEntity.modelUri}`)
  //     gameWorld.join(playerEntity.player);
  //   }
  // });
  // oneOnOneGatewaySensor.addToSimulation(world.simulation);

  world.onPlayerJoin = player => {
    // const playerEntity = new PlayerEntity({
    //   player,
    //   name: 'Player',
    //   modelUri: 'models/players/PlayerModel.gltf',
    //   modelLoopedAnimations: ['idle'],
    //   modelScale: 0.5
    // });

    // player.camera.setAttachedToPosition({x:0, y: 0, z: 0});
    // player.camera.setMode(PlayerCameraMode.FIRST_PERSON);
    // player.camera.setOffset({ x: 0, y: 0.4, z: 0 });
    // player.camera.setModelHiddenNodes(['head', 'neck']);
    // player.camera.setForwardOffset(0.3);

    // playerEntity.spawn(world, { x: 0, y: 4, z: 0 });

    // player.camera.setMode(PlayerCameraMode.FIRST_PERSON);
    // player.camera.setAttachedToEntity(cameraAnchor);
    // player.camera.setTrackedEntity(cameraTarget);

    player.ui.load('ui/index.html');

    // player.ui.onData = ((playerUI, data) => { console.log(data); });

    world.chatManager.sendPlayerMessage(player, `Welcome to The Shooty Game`, "00FF00");

  };

  world.onPlayerLeave = player => {
    // console.log("Player Leavng World")
    world.entityManager.getPlayerEntitiesByPlayer(player).forEach(entity => { entity.despawn() });
  };

  world.chatManager.registerCommand("/ping", (player: Player, args: string[], message: string) => {
    console.log("sending ping to UI");
    world.entityManager.getAllPlayerEntities().forEach((p) => p.player.ui.sendData({ message: "test message" }));
    // player.ui.sendData({message:"test message"});
  });

  world.chatManager.registerCommand("/list", (player: Player, args: string[], message: string) => {
    // const pe = world.entityManager.getAllPlayerEntities()[0];
    const worlds = listWorlds(); // Object.values(worldRegistry).sort((a, b) => a.id - b.id);

    if (worlds.length == 0) {
      world.chatManager.sendPlayerMessage(player, `No games are available right now`, "FF0000");
      return;
    }

    world.chatManager.sendPlayerMessage(player, `Available Games:`, "FFFF00");
    for (let i = 0; i < worlds.length; i++) {
      world.chatManager.sendPlayerMessage(player, `${worlds[i].id}) ${worlds[i].name} (${worlds[i].playerCount}/${worlds[i].maxPlayerCount})`, (worlds[i].playerCount < worlds[i].maxPlayerCount) ? "FFFF00" : "909050");
    }
    world.chatManager.sendPlayerMessage(player, `To join a game type '/join <game_number>', e.g. /join 1`, "FFFF00");




    // const worldNames = Object.values(worldRegistry));
    // world.chatManager.sendPlayerMessage(player, `Open worlds:`, "FFFF00");
    // worldNames.forEach((worldName, i) => {
    //   world.chatManager.sendPlayerMessage(player, `${i}: ${worldName} (Max Players: ${worldRegistry[worldName].maxPlayerCount})`, "FFFF00");
    // });

  });

  world.chatManager.registerCommand("/join", (player: Player, args: string[], message: string) => {


    if (args.length != 1 || !/^\d+$/.test(args[0].trim())) {
      world.chatManager.sendPlayerMessage(player, `You need to specify a valid game number, '/join <game_number>'`, "FF0000");
      return;
    }

    const gameNumber = parseInt(args[0]); // -1 as the user will specific a 1-indexed
    const targetWorld = getWorld(gameNumber); // Object.values(worldRegistry).find((w) => w.id == gameNumber);

    if (!targetWorld) {
      world.chatManager.sendPlayerMessage(player, `You need to specify a valid game number, '/join <game_number>'.  The game ${gameNumber} doesn't exist.`, "FF0000");
      return;
    };

    const error = targetWorld.join(player);
    if (error) {
      world.chatManager.sendPlayerMessage(player, `${error}`, "FF0000");
    }
  });
});