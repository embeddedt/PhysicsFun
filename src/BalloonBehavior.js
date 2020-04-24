/**
 * 
 * @param {Phaser.Physics.Matter.Image} sprite 
 */
export default function BalloonBehavior(config, scene, sprite) {
    sprite.on('behaviorUpdate', (delta) => {
        if(!sprite.body.enable) return;
        sprite.applyForce(new Phaser.Math.Vector2(0, -0.006));
        /*
        let velocity = sprite.body.angularVelocity + ((config.reverse ? -1 : 1)*0.1*(delta/16.66)); // 0.05;
        velocity = config.reverse ? Math.max(-0.1, velocity) : Math.min(0.1, velocity);

        // set angular velocity to wheels
        sprite.setAngularVelocity(velocity);
        */
    });
}