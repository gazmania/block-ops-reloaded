# BLOCK OPS: Reloaded Documentation  

## Hytopia Game Jam – February 5, 2025  

### Overview  
The team behind **BLOCK OPS: Reloaded** consists of:  
- **Belcan** (Developer)  
- **Gazmania** (Senior Engineer)  
- **RHAIS** (3D Artist)  
- **NoneTaken** (Sound Design & Project Management Support)  
- **Nikz** (Quality Assurance)  
- **Sand** (Lead)  

We are building an **FPS-style Gun Game** for Hytopia. Gun Game is a fast-paced mode where each elimination upgrades your weapon, progressing through a set arsenal until the final challenge—**a baguette**—secures victory. Its simplicity, accessibility, and competitive nature make it a perfect showcase for **Hytopia’s SDK**.  

This document covers the **code design and architecture**, as well as how proven game modes like **Gun Game, Infected, and One in the Chamber** provide an intuitive experience while maximizing engagement. Our goal is **not to reinvent the wheel** but to **enhance gameplay**, leveraging Hytopia’s tools to go beyond what standard Minecraft modding can achieve.  

## Architecture  

*To be detailed as needed.*

## Codebase  

*To be detailed as needed.*

## Technical Difficulties  

Developing **BLOCK OPS: Reloaded** using the **Hytopia SDK** presented several challenges, particularly in **animation handling, projectile mechanics, and model performance**.  

### Key Issues:  

- **Animation Mixing Issues**  
  - Smooth gun animations were difficult to implement due to how Hytopia handles animation states.  
  - Blending between weapon states (e.g., a loaded vs. fired Rocket Launcher) caused unnatural transitions.  
  - This remains an area for future refinement.  

- **Projectile Behavior & Visual Feedback**  
  - Synchronizing **rocket velocity** with accuracy tracing was too complex to fully execute in time.  

- **Hitbox & Model Performance**  
  - Large models caused **inconsistent hitbox detection**, leading to inaccurate collisions.  
  - High-poly models contributed to **performance issues**, particularly lag in multiplayer.  

- **Builder Tool Limitations**  
  - The builder tool was still in early development, making **map creation difficult**.  
  - While updates have improved functionality, our map **does not fully reflect our vision** due to these constraints.  

- **General Bugs & Stability**  
  - Various bugs emerged affecting **movement mechanics, UI elements, and stability**.  
  - While many were addressed, **some persistent issues remain**.

Despite these challenges, we made significant progress and identified key areas for **future improvements**.  

## Future Outlook  

We have laid the groundwork for future updates to **enhance engagement and replayability** as the player base grows.  

### Planned Features:  

- **Gameplay & Mechanics**  
  - Gun attachments, scope-in mechanics, vehicle mechanics, med kits, smoother animations, and lag stability improvements.  

- **Maps & Environment**  
  - Upgraded maps, multi-level play (stairs), dynamic map rotation, and unique locations (e.g., zoo, restaurant).  

- **Audio & Interaction**  
  - Lobby/intro music, interactive soundtracks, and customizable player names.  

- **Competitive Features**  
  - Skill-based matchmaking, ranked play, leaderboards, and round-based play with **$TOPIA entry pots**.  

- **Customization & Community**  
  - Player-created maps and **hidden easter eggs** with fun weapons (e.g., a **bubble machine shooting rainbows**).  

These features are **not yet in the live build** but remain a priority for future iterations as the **community expands**.  

## Sources  

To ensure proper attribution, the following **texture packs** were used in development:  

- **[Faithless](https://www.curseforge.com/minecraft/texture-packs/faithless)**  
- **[Stay True](https://www.curseforge.com/minecraft/texture-packs/stay-true)**  

These resources were utilized in accordance with their respective **licenses**.  
