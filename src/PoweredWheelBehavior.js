/**
 * 
 * @param {Phaser.Physics.Matter.Image} sprite 
 */

const MAX_VEL = 0.1;
export default function PoweredWheelBehavior(config, scene, sprite) {
    sprite.on('behaviorUpdate', (delta) => {
        if(!sprite.body.enable || scene.hasReachedGoal) return;
        if(!config.reverse && sprite.body.angularVelocity >= MAX_VEL) return;
        if(config.reverse && sprite.body.angularVelocity <= -MAX_VEL) return;
        let velocity = sprite.body.angularVelocity + ((config.reverse ? -1 : 1)*0.1*(delta/16.66)) * 10; // 0.05;
        velocity = config.reverse ? Math.max(-MAX_VEL, velocity) : Math.min(MAX_VEL, velocity);

        // set angular velocity to wheels
        sprite.setAngularVelocity(velocity);
    });
}