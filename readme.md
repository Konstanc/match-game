# Match three game prototype
This is a simple match three game prototype. Currently it supports only one field(level) at once.

# Game confing
Came config can be found in config.json (see config.2.json and config.3.json for more examples):

itemList - element list to spawn.
goals - what elements to collect. 
moves - maximum moves conunt
spawnLine - which verticals can spawn items
field - field definition. 1 for enabled, 0 for disabled. Letter for explicit element.



# TODO:
1. Add logic to test a player can solve the task. Spawn part by config or by math model which depends on board and difficulty level instead of random.
2. Scale to screen.
3. Add levels
4. Add tutorial.
5. Pack the game.
6. Sounds.
7. Design win/loose animations.