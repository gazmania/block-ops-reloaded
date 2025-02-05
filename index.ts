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
  PlayerUI,
  World,
  Audio
} from 'hytopia';

import mapData from './assets/maps/map_main.json';
import { getWorld, GunWorld, listWorlds, startWorlds } from './sessions/world';
import { LobbyWorld } from './sessions/lobby';

startServer(world => {
  console.log("[SERVER] Starting server...");
  
  // Create lobby first but don't use it for spawning
  const lobby = new LobbyWorld();
  console.log("[SERVER] Lobby world created");
  
  // Start game worlds immediately
  console.log("[SERVER] Initializing game worlds...");
  startWorlds(lobby);

  // Handle new players joining the server - KEEP THEM IN THE VOID
  world.onPlayerJoin = player => {
    console.log(`[SERVER] Player ${player.username} joined server`);
    player.ui.load('ui/index.html');
    world.chatManager.sendPlayerMessage(player, `Welcome to BLOCK-OPS Reloaded! Type /list to see available games.`, "00FF00");
  };

  world.onPlayerLeave = player => {
    console.log(`[SERVER] Player ${player.username} left server`);
    world.entityManager.getPlayerEntitiesByPlayer(player).forEach(entity => { 
      entity.despawn();
    });
  };

  // Register commands in the initial world
  world.chatManager.registerCommand("/list", (player: Player, args: string[], message: string) => {
    const worlds = listWorlds();
    if (worlds.length == 0) {
      world.chatManager.sendPlayerMessage(player, `No games are available right now`, "FF0000");
      return;
    }
    
    world.chatManager.sendPlayerMessage(player, `Available Games:`, "FFFF00");
    for (let i = 0; i < worlds.length; i++) {
      world.chatManager.sendPlayerMessage(player, `${worlds[i].id}) ${worlds[i].name} (${worlds[i].playerCount}/${worlds[i].maxPlayerCount})`, (worlds[i].playerCount < worlds[i].maxPlayerCount) ? "FFFF00" : "909050");
    }
    world.chatManager.sendPlayerMessage(player, `Type '/join <game_number>' to join, e.g. '/join 1'`, "FFFF00");
  });

  world.chatManager.registerCommand("/join", (player: Player, args: string[], message: string) => {
    if (args.length != 1) {
      world.chatManager.sendPlayerMessage(player, `Type '/join <game_number>' to join, e.g. '/join 1'`, "FF0000");
      return;
    }
    const gameId = parseInt(args[0]);
    if (isNaN(gameId)) {
      world.chatManager.sendPlayerMessage(player, `Please provide a valid game number`, "FF0000");
      return;
    }
    
    const targetWorld = getWorld(gameId);
    if (!targetWorld) {
      world.chatManager.sendPlayerMessage(player, `Game is not available right now`, "FF0000");
      return;
    }

    try {
      // First send the message
      world.chatManager.sendPlayerMessage(player, `Joining game...`, "00FF00");
      
      // Then attempt to join
      setTimeout(() => {
        targetWorld.join(player);
      }, 100);
    } catch (err) {
      console.error(`[JOIN] Error:`, err);
      world.chatManager.sendPlayerMessage(player, `Error joining game. Please try again.`, "FF0000");
    }
  });

  world.chatManager.registerCommand("/debug", (player: Player, args: string[], message: string) => {
    const worlds = listWorlds();
    console.log("[DEBUG] Current worlds:", worlds.map(w => `${w.id}: ${w.name} (${w.playerCount}/${w.maxPlayerCount})`));
    world.chatManager.sendPlayerMessage(player, `Debug Info:`, "FFFF00");
    worlds.forEach(w => {
      world.chatManager.sendPlayerMessage(
        player,
        `World ${w.id}: ${w.name} - Players: ${w.playerCount}/${w.maxPlayerCount} - State: ${w._worldState.playState}`,
        "FFFF00"
      );
    });
  });
});