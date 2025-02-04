import {
  PlayerCameraMode,
  startServer,
  PlayerEntity,
  Entity,
  WorldMap,
  RigidBodyType
} from 'hytopia';

import MyEntityController from './MyEntityController';

import mapData from './assets/maps/map_main.json';

// Класс для управления сессиями
class GameSession {
    private players: PlayerEntity[] = [];
    private maxPlayers: number = 2; // Максимум 2 игрока

    public addPlayer(player: PlayerEntity): boolean {
        if (this.players.length < this.maxPlayers) {
            this.players.push(player);
            return true; // Игрок успешно добавлен
        }
        return false; // Сессия полна
    }

    public removePlayer(player: PlayerEntity): void {
        this.players = this.players.filter(p => p !== player);
    }

    public isFull(): boolean {
        return this.players.length >= this.maxPlayers;
    }

    public getPlayers(): PlayerEntity[] {
        return this.players;
    }
}

const sessions: GameSession[] = [];

function findOrCreateSession(): GameSession {
    // Найти первую неполную сессию
    for (const session of sessions) {
        if (!session.isFull()) {
            return session;
        }
    }

    // Если все сессии полные, создайте новую
    const newSession = new GameSession();
    sessions.push(newSession);
    return newSession;
}

startServer(world => {
  // Включаем отладку физики, чтобы видеть коллайдеры
    //world.simulation.enableDebugRaycasting(true);
    //world.simulation.enableDebugRendering(true);

  // Загружаем базовую карту
  world.loadMap(mapData);

  // Создаем и спавним машину с динамической физикой
  const carEntity = new Entity({
    modelUri: 'models/environment/car.gltf',
    modelScale: 0.7,
    rigidBodyOptions: {
      type: 'dynamic' as RigidBodyType, // Динамическое тело, будет реагировать на физику
      position: { x: 10, y: 5, z: 10 },
      rotation: { x: 0, y: 0, z: 0, w: 1 }
    }
  });
  carEntity.spawn(world, { x: 10, y: 5, z: 10 }); // Спавним выше земли, чтобы увидеть падение

  // Создаем и спавним здание
  const buildingEntity = new Entity({
    modelUri: 'models/environment/build1.gltf',
    modelScale: 0.5,
    rigidBodyOptions: {
      type: 'fixed' as RigidBodyType, // Фиксированное тело, не будет двигаться
      position: { x: 0, y: 0, z: 0 },
      rotation: { x: 0, y: 0, z: 0, w: 1 }
    }
  });
  buildingEntity.spawn(world, { x: -10, y: 2, z: -10 });

  world.onPlayerJoin = player => {
    const playerEntity = new PlayerEntity({
      player,
      name: 'Player',
      modelUri: 'models/players/PlayerModel.gltf',
      modelLoopedAnimations: [ 'idle' ],
      modelScale: 0.5,
      controller: new MyEntityController(),
    });

    const session = findOrCreateSession();
    if (session.addPlayer(playerEntity)) {
        // Успешно добавлен в сессию
        console.log(`Player joined session. Total players: ${session.getPlayers().length}`);
        player.camera.setMode(PlayerCameraMode.FIRST_PERSON);
        player.camera.setOffset({ x: 0, y: 0.4, z: 0 });
        player.camera.setModelHiddenNodes([ 'head', 'neck' ]);
        player.camera.setForwardOffset(0.3);
        
        // Спавним игрока на безопасном расстоянии от объектов
        if (world) {
            playerEntity.spawn(world, { x: 0, y: 2, z: 0 });
            console.log('Spawned player entity!');
        } else {
            console.error('World is undefined!');
        }
        
        player.ui.load('ui/index.html');
    } else {
        // Сессия полна, отправьте сообщение игроку
    }
  };
  
  world.onPlayerLeave = player => {
    const playerEntity = world.entityManager.getPlayerEntitiesByPlayer(player)[0];
    if (playerEntity) {
        const session = sessions.find(s => s.getPlayers().includes(playerEntity));
        if (session) {
            session.removePlayer(playerEntity);
            console.log(`Player left session. Total players: ${session.getPlayers().length}`);
        }
        world.entityManager.getPlayerEntitiesByPlayer(player).forEach(entity => entity.despawn());
    }
  };
});