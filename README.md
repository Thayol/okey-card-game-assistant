# Defeat the [Okey Card Game](https://en-wiki.metin2.gameforge.com/index.php/Okey_Card_Game)

The live version is hosted by GitHub: [okey-card-game-assistant](https://thayol.github.io/okey-card-game-assistant/)

Pull requests are welcome!

## The idea

There are existing tools for optimizing a game of Okey Cards, but most of them are outdated. 
One that works well is server-side and not open source, so I have made an open-source fully offline variation. 

The recommendation algorithm is not perfect, because there is no point in waiting hours for a single choice. 
Even if it is optimized for speed, it sometimes recommends the wrong choice. Double checking never hurts, 
and if you know a better algorithm, feel free to create a pull request or an issue.

## How to use

Open Metin2, enter the Okey Card Game event, then mirror your hand, discards, and cash outs to this program and it will tell you the next mathematically correct step.

If you need custom settings, clone the repository and modify the settings at the beginning of the [script.js](script.js) file.

## Playing without Metin2

You can play the game without having Metin2 open. Check the "auto-draw" checkbox and cash out with "auto advance."