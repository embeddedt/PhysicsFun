/**
 * 
 * @param {Phaser.Physics.Matter.Image} sprite 
 */
export default function PoweredWheelBehavior(config, scene, sprite) {
    sprite.on('behaviorUpdate', (delta) => {
        if(!sprite.body.enable || scene.hasReachedGoal) return;
        if(!config.reverse && sprite.body.angularVelocity >= 0.1) return;
        if(config.reverse && sprite.body.angularVelocity <= -0.1) return;
        let velocity = sprite.body.angularVelocity + ((config.reverse ? -1 : 1)*0.1*(delta/16.66)); // 0.05;
        velocity = config.reverse ? Math.max(-0.1, velocity) : Math.min(0.1, velocity);

        // set angular velocity to wheels
        sprite.setAngularVelocity(velocity);
    });
}