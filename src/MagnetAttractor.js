
const MAGNET_STRENGTH = 0.000005;

export default function(scene, positive, bodyA, bodyB) {
    if(scene.isPaused)
        return;

    if(!bodyA.gameObject.isMagnet || !bodyB.gameObject.isMagnet)
        return;

    const repelling = bodyA.gameObject.magnetPolarity == bodyB.gameObject.magnetPolarity;

    let repelMultiplier = repelling ? -1 : 1;
    /*
    var force = new Phaser.Math.Vector2((bodyA.position.x - bodyB.position.x) * 1e-6, (bodyA.position.y - bodyB.position.y) * 1e-6);

    
    // apply force to both bodies
    
    scene.matter.applyForceFromPosition(bodyA, bodyA.position, force.clone().negate());
    scene.matter.applyForceFromPosition(bodyB, bodyB.position, force);
    */
    bodyA.gameObject.applyForce({
        x: (bodyA.position.x - bodyB.position.x) * -MAGNET_STRENGTH * repelMultiplier,
        y: (bodyA.position.y - bodyB.position.y) * -MAGNET_STRENGTH * repelMultiplier
    });
    return {
        x: (bodyA.position.x - bodyB.position.x) * MAGNET_STRENGTH * repelMultiplier,
        y: (bodyA.position.y - bodyB.position.y) * MAGNET_STRENGTH * repelMultiplier
    };
}
