import MainScene from "./MainScene";
import 'core-js/features/object/assign';
import 'core-js/features/string/starts-with';
import 'core-js/features/string/ends-with';

Phaser.Physics.Matter.Matter.Common.isString = function(obj) {
  return Object.prototype.toString.call(obj) === '[object String]';
};

export default function(levelNum) {
    window.gameLoadPromise = new Promise((resolve, reject) => {
        window.gameLoadResolve = resolve;
        window.physicsLevelNumber = levelNum;
        /** @type {Phaser.Types.Core.GameConfig} */
        const config = {
            type: Phaser.AUTO,
            width: 800,
            height: 600,
            backgroundColor: "#000c1f",
            parent: "game-container",
            pixelArt: false,
            scale: {
                mode: Phaser.Scale.RESIZE,
                parent: 'game-container',
                autoCenter: Phaser.Scale.CENTER_BOTH
            },
            // Load our yet-to-be-created custom scene
            scene: MainScene,
            fps: {
                target: 30
            },

            // Load up Matter and optionally configure it
            physics: {
                default: "matter",
                matter: {
                    /*
                    debug: {
                    showBounds: true
                    },
                    */
                    plugins: {
                        attractors: true
                    },
                    gravity: { y: 1 } // This is the default value, so we could omit this
                }
            },
        };

        const game = new Phaser.Game(config);
    });
    
}
