import ReactDOM from 'react-dom';
import PoweredWheelBehavior from './PoweredWheelBehavior';
import { ControlBar, ControlButton } from './ControlBar';
import classnames from 'classnames';
import Swal from 'sweetalert2';
import withReactContent from 'sweetalert2-react-content'
import MagnetAttractor from './MagnetAttractor';
import BalloonBehavior from './BalloonBehavior';
 
const ReactSwal = withReactContent(Swal)

const REGULAR_OBJECT = 0;
const CONSTRAINT = 1;

const MAX_CONSTRAINED_DISTANCE = 550;

const GOAL_TILE_ID = 355;

const dangerousTileIds = [
    280
];

function baseName(str)
{
    if(typeof str == 'undefined' || str == null)
        return '';
    var base = new String(str).substring(str.lastIndexOf('/') + 1); 
    if(base.lastIndexOf(".") != -1)       
        base = base.substring(0, base.lastIndexOf("."));
    return base;
}

export default class MainScene extends Phaser.Scene {
    preload() {
        this.load.tilemapTiledJSON("map", `assets/tilemaps/maplevel${window.physicsLevelNumber}.json`);
        this.load.image(
            "kenney-tileset-64px-extruded",
            "assets/tilesets/kenney-tileset-64px-extruded.png"
        );

        // An atlas is a way to pack multiple images together into one texture. For more info see:
        //  https://labs.phaser.io/view.html?src=src/animation/texture%20atlas%20animation.js
        this.load.image("clockwisewheel", "sprites/clockwisewheel.png");
        this.load.image('mainwheel', "sprites/mainwheel.png");
        this.load.image('ccwwheel', "sprites/ccwwheel.png");
        this.load.image('wheel', "sprites/wheel.png");
        this.load.image('redmagnet', "sprites/redmagnet.png");
        this.load.image('bluemagnet', "sprites/bluemagnet.png");
        this.load.image('balloon', "sprites/balloon.png");
        var url = 'rexpinchplugin.min.js';
        this.load.plugin('rexpinchplugin', url, true);
    }
    recalculateScales(w, h) {
        
        const sizeVal = Math.min(w, h);
        const newScale = (sizeVal/600);
        const previousScaleValue = this.currentScaleValue || 1;
        this.currentScaleValue = newScale;
        this.groundLayer.setScale(newScale);
        
        this.resizeSprites.forEach(sprite => {
            sprite.setScale(newScale / 2);
            sprite.x = (sprite.x / previousScaleValue) * this.currentScaleValue;
            sprite.y = (sprite.y / previousScaleValue) * this.currentScaleValue;
        });

        this.oldSpritePositions.forEach(pos => {
            pos.x = (pos.x / previousScaleValue) * this.currentScaleValue;
            pos.y = (pos.y / previousScaleValue) * this.currentScaleValue;
        });
        

        // Get the layers registered with Matter. Any colliding tiles will be given a Matter body. We
        // haven't mapped out custom collision shapes in Tiled so each colliding tile will get a default
        // rectangle body (similar to AP).
        this.matter.world.convertTilemapLayer(this.groundLayer);

        this.goalTextObjects.forEach(object => object.destroy());
        this.goalTextObjects = [];
        this.groundLayer.filterTiles(tile => (tile.index == GOAL_TILE_ID || dangerousTileIds.indexOf(tile.index) != -1)).forEach(tile => {
            if(tile.index == GOAL_TILE_ID) {
                const text = this.add.text((tile.pixelX+14) * this.currentScaleValue, (tile.pixelY+15) * this.currentScaleValue, "Goal", { font: `${16*this.currentScaleValue}px Arial`, fill: '#ffffff' });
                this.goalTextObjects.push(text);
            }

            tile.physics.matterBody.setSensor(true);
            tile.physics.matterBody.gameObject = tile;
        });
        
        const extraDistance = (this.currentScaleValue*200);
        this.cameras.main.setBounds(0, -extraDistance, this.groundLayer.displayWidth, this.groundLayer.displayHeight + extraDistance);

    }
    createImage(spriteNum, x, y, behavior, behavConfig, extraConfig) {
        const image2 = this.matter.add.image(x || 300, y || 75, spriteNum, null);
        
        image2.setCircle(image2.width / 2, Object.assign({}, { restitution: 0, friction: 0.5, inertia: Infinity }, extraConfig));

        image2.isMagnet = spriteNum.endsWith("magnet");
        if(image2.isMagnet)
            image2.magnetPolarity = spriteNum.startsWith("red");
        /*
            plugin: {
                attractors: [
                    function (bodyA, bodyB) {
                        console.log("attract");
                        return {
                            x: (bodyA.position.x - bodyB.position.x) * 0.000001,
                            y: (bodyA.position.y - bodyB.position.y) * 0.000001
                        };
                    }
                ]
            }
        });
        */
        
        
       
        image2.setScale(this.currentScaleValue / 2);
        
        image2.setInteractive();

        this.setPhysicsOn(image2, !this.isPaused);
        
        this.resizeSprites.push(image2);
        this.children.bringToTop(this.outlineGraphics);
        this.children.bringToTop(this.constraintOverlayGraphics);
        if(behavior) behavior(behavConfig || {}, this, image2);
        return image2;
    }
    addConstraint(objA, objB) {
        let c = null;
        if(!this.isPaused) {
            c = this.matter.add.constraint(objA, objB);
        }
        this.constraints.push(c);
        this.constraintObjects.push([ objA, objB ]);
        return c;
    }
    useDebug() {
        /*
        this.matter.world.createDebugGraphic();
        this.matter.world.drawDebug = true;
        this.matter.world.debugGraphic.clear();
        */
    }
    removeConstraintsForObject(obj) {
        this.constraintObjects = this.constraintObjects.filter((objs, index) => {
            if(objs[0] == obj || objs[1] == obj) {
                if(this.constraints[index] != null)
                    this.matter.world.remove(this.constraints[index]);
                this.constraints.splice(index, 1);
                return false;
            }
            return true;
        });
    }
    setPhysicsOn(sprite, val = true) {
        sprite.body.enable = val;
        sprite.setCollisionCategory(val ? 1 : null);
        sprite.setIgnoreGravity(!val);
        if(!val) {
            sprite.setAngularVelocity(0);
            sprite.setVelocity(0, 0);
        }
    }
    setCursorOn(sprite) {
        sprite.input.cursor = (this.isPaused&&(this.lastSelectedConstraintItem != sprite)) ? "pointer" : "default";
        if(sprite.physIsHovering) {
            this.game.canvas.style.cursor = sprite.input.cursor;
        }
    }
    checkObjectCollision(gameObject, gameObjectBounds) {
        let failedDistanceCheck = gameObject != null && this.constraintObjects.some(objs => {
            if(objs[0] == gameObject || objs[1] == gameObject) {
                const notUsIndex = (objs[0] == gameObject) ? 1 : 0;
                const dist = Phaser.Math.Distance.Between(objs[notUsIndex].x, objs[notUsIndex].y, gameObjectBounds.x - gameObjectBounds.width / 2, gameObjectBounds.y - gameObjectBounds.height / 2)*this.currentScaleValue;
                if(dist > MAX_CONSTRAINED_DISTANCE)
                    return true;
            }
            return false;
        });
        if(gameObject != null)
            failedDistanceCheck = failedDistanceCheck || this.resizeSprites.some(sprite => {
                if(sprite == gameObject)
                    return false;
                const spriteBounds = sprite.getBounds();
                return Phaser.Geom.Intersects.RectangleToRectangle(gameObjectBounds, spriteBounds);
            });
        /*
        failedDistanceCheck = failedDistanceCheck || this.map.getTilesWithinWorldXY(gameObjectBounds.x, gameObjectBounds.y, gameObjectBounds.width, gameObjectBounds.height).some(tile => {
            if(tile.index == -1)
                return false;
            return true;
        });
        */
        return failedDistanceCheck;
    }
    setupEvents(sprite) {
        sprite.on("pointerover", () => sprite.physIsHovering = true);
        sprite.on("pointerout", () => sprite.physIsHovering = false);
        sprite.on("pointerdown", () => {
            sprite.pointerDownNormal = !this.forceDisableDrag;
        });
        sprite.on("pointerup", () => {
            
            if(this.isPaused && !this.forceDisableDrag && sprite.pointerDownNormal) {
                this.game.events.emit("show-sprite-info", sprite);
            }
        });
    }
    reachedGoal(e, b1, b2) {
        if(this.hasReachedGoal)
            return;
        this.hasReachedGoal = true;
        this.game.events.emit("goal-reached");
    }
    hitDangerousTile() {
        this.game.events.emit("hit-danger");
    }
    getRootBody(body) {
        while (body.parent !== body) body = body.parent;
        return body;
    }
    create() {

         /** @type {Array<Phaser.Physics.Matter.Image>} */
        this.resizeSprites = [];
        /** @type {Array<MatterJS.ConstraintType>} */
        this.constraints = [];
        /** @type {Array<Array<Phaser.Physics.Matter.Image>>} */
        this.constraintObjects = [];

        this.oldSpritePositions = [];

        this.goalTextObjects = [];

        this.lastSelectedConstraintItem = null;

        this.forceDisableDrag = false;

        this.cameras.main.roundPixels = true;

        // Create the 2-layer map
        const map = this.make.tilemap({ key: "map" });
        this.map = map;

        const startTile = this.map.getTileAt(5, this.map.height - 7, true);

        const tileset = map.addTilesetImage("kenney-tileset-64px-extruded");
        const groundLayer = map.createDynamicLayer("Ground", tileset, 0, 0);
        this.groundLayer = groundLayer;

        this.matter.enableAttractorPlugin();

        // Set colliding tiles before converting the layer to Matter bodies - same as we've done before
        // with AP. See post #1 for more on setCollisionByProperty.
        groundLayer.setCollisionByProperty({ collides: true });

        this.recalculateScales(this.scale.width, this.scale.height);

        //this.groundLayer.setTileIndexCallback(GOAL_TILE_ID, this.reachedGoal, this);

        this.matter.world.on("collisionstart", (e) => {
            e.pairs.forEach(({ bodyA: b1, bodyB: b2 }) => {
                b1 = this.getRootBody(b1);
                b2 = this.getRootBody(b2);
                if((b1.gameObject.tile?.index == GOAL_TILE_ID && b2.gameObject == this.baseWheelImage) || (b2.gameObject.tile?.index == GOAL_TILE_ID && b1.gameObject == this.baseWheelImage)) {
                    this.reachedGoal();
                } else if((dangerousTileIds.indexOf(b1.gameObject.tile?.index) != -1 && b2.gameObject == this.baseWheelImage) || (dangerousTileIds.indexOf(b2.gameObject.tile?.index) != -1 && b1.gameObject == this.baseWheelImage)) {
                    this.hitDangerousTile();
                }
            });
        });


        this.outlineGraphics = this.add.graphics();
        this.constraintOverlayGraphics = this.add.graphics();

        const image2 = this.createImage("mainwheel");


        this.baseWheelImage = image2;

        this.baseWheelImage.x = (startTile.pixelX*this.currentScaleValue);
        this.baseWheelImage.y = (this.currentScaleValue*startTile.pixelY) - this.baseWheelImage.displayHeight;

        this.baseWheelImage.name = "basewheel";

        this.setupEvents(this.baseWheelImage);

        const controlConfig = {
            camera: this.cameras.main,
            speed: 0.5
        };

        

        this.controls = new Phaser.Cameras.Controls.FixedKeyControl(controlConfig);

        this.scale.on('resize', (gameSize) => {
            this.recalculateScales(gameSize.width, gameSize.height);
        });
        
        this.dragInProgress = false;
        this.input.on('dragstart', (pointer, gameObject) => {
            if(!this.isPaused || this.forceDisableDrag)
                return;
            this.setPhysicsOn(gameObject, false);
        });
        this.input.on('drag', (pointer, gameObject, dragX, dragY) => {
            if(!this.isPaused || this.forceDisableDrag)
                return;
            
            /** @type {Phaser.Geom.Rectangle} */
            const gameObjectBounds = gameObject.getBounds();
            gameObjectBounds.x = dragX - (gameObjectBounds.width / 2);
            gameObjectBounds.y = dragY - (gameObjectBounds.height / 2);
            
            if(!this.checkObjectCollision(gameObject, gameObjectBounds)) {
                gameObject.x = dragX;
                gameObject.y = dragY;
            }
            this.setPhysicsOn(gameObject, false);
            this.game.canvas.style.cursor = (gameObject == this.lastSelectedConstraintItem) ? "default" : "pointer";
            this.game.events.emit("drag-move")
            gameObject.pointerDownNormal = false;
            this.dragInProgress = true;
        });

        this.input.on('dragend', (pointer, gameObject) => {
            this.setPhysicsOn(gameObject, !this.isPaused);
            this.dragInProgress = false;
        });

        this.input.on('wheel', (pointer) => {
            const deltaY = Math.sign(pointer.deltaY) * 3;
            this.cameras.main.zoom = Phaser.Math.Clamp(this.cameras.main.zoom + (-deltaY / 30), 0.1, 3);
        });

        var dragScale = this.plugins.get('rexpinchplugin').add(this);
        dragScale.on('pinch', (dragScale) => {
            var scaleFactor = dragScale.scaleFactor;
            this.cameras.main.zoom *= scaleFactor;
        }, this);
        const scene = this;
        window.gameLoadResolve();
        function ComponentImage(props) {
            return <img className="component-font" src={props.src}/>;
        }
        function PhysicsComponent(props) {
            const onClick = () => {
                props.setChosenElement(baseName(props.sprite), props.behavior, props.name, props.type, props.behavConfig, props.extraConfig);
            };
            const onHover = () => {
                props.onHover(props.name);
            }
            const onMouseOut = () => {
                props.onHoverOut(props.name);
            }
            return <li><button onMouseOver={onHover} onMouseOut={onMouseOut} onClick={onClick} className={classnames("hoverable-button", "physics-choice-button", props.activeName == props.name && "hoverable-button-active")}><div className="physics-choice-image-container"><img className="physics-choice-image" src={props.sprite}/></div><span>{props.name}</span></button></li>
        }
        function shortName(name) {
            const idx = name?.indexOf('(')-1;
            if(typeof idx != 'number' || idx < 0)
                return name;
            return name?.substr(0, idx);
        }
        function GameUI() {
            const [ isPaused, setPaused ] = React.useState(true);
            const [ addingComponent, setAddingComponent ] = React.useState(null);
            const [ wantsToRemove, setWantsToRemove ] = React.useState(false);
            const [ wantsToBreakConstraints, setWantsToBreakConstraints ] = React.useState(false);
            const [ constraintTargets, setConstraintTargets ] = React.useState([]);
            const [ wantsToAdd, setWantsToAdd ] = React.useState(false);
            const [ canvasPointerDown, setCanvasPointerDown ] = React.useState(false);
            const [ disableAllUI, setDisableAllUI ] = React.useState(false);
            const [ itemListShown, setItemListShown ] = React.useState(false);
            const [ hoveredItem, setHoveredItem ] = React.useState(null);
            const onItemRelease = (name) => {
                setHoveredItem(null);
            }
            const resetState = () => {
                setWantsToRemove(false);
                setAddingComponent(null);
                setItemListShown(false);
                setConstraintTargets([]);
            }
            const tryBreakConstraints = () => {
                if(!wantsToBreakConstraints) {
                    if(scene.constraintObjects.length < 1) {
                        Swal.fire({
                            title: 'Error',
                            text: 'There are no constraints to break.',
                            icon: 'error'
                        });
                        setCanvasPointerDown(false);
                        return;
                    }
                    resetState();
                    setWantsToBreakConstraints(true)
                } else {
                    setWantsToBreakConstraints(false)
                }
            }
            const setChosenElement = React.useCallback((bn, behavior, name, type, behavConfig, extraConfig) => {
                ReactSwal.close();
                if(addingComponent != null) {
                    resetState();
                    return;
                }
                if(type == CONSTRAINT && scene.resizeSprites.length < 2) {
                    Swal.fire({
                        title: 'Error',
                        text: 'You must have at least 2 objects on the map to use rods.',
                        icon: 'error'
                    });
                    setCanvasPointerDown(false);
                    return;
                }
                setConstraintTargets([]);
                setWantsToBreakConstraints(false);
                setAddingComponent({ bn, behavior, name, type, behavConfig, extraConfig });
            }, [ setConstraintTargets, setCanvasPointerDown,  setAddingComponent ]);
            
            const hintImg = React.useMemo(() => {
                if(window.physicsLevelNumber == 2) {
                    return "sprites/hint_spikes.png";
                } else if(window.physicsLevelNumber == 3)
                    return "sprites/hint_dropzone.png";
                else if(window.physicsLevelNumber == 4)
                    return "sprites/hint_underground.png";
                else if(window.physicsLevelNumber == 5)
                    return "sprites/hint_squarecliff.png";
                else if(window.physicsLevelNumber == 6)
                    return "sprites/hint_shadowvalley.png";
                return null;
            }, [ window.physicsLevelNumber ]);
            const showHint = () => {
                Swal.fire({
                    customClass: {
                        image: "swal2-hint-image"
                    },
                    grow: 'fullscreen',
                    imageUrl: hintImg
                });
            };
            const physicsOptions = React.useMemo(() => <>
                <PhysicsComponent activeName={addingComponent?.name} onHover={setHoveredItem} onHoverOut={onItemRelease} setChosenElement={setChosenElement} sprite="sprites/wheel.png" name="Unpowered wheel" type={REGULAR_OBJECT}/>
                <PhysicsComponent activeName={addingComponent?.name} onHover={setHoveredItem} onHoverOut={onItemRelease} extraConfig={{plugin: { attractors: [ MagnetAttractor.bind(void 0, scene, true) ] }}} setChosenElement={setChosenElement} sprite="sprites/redmagnet.png" name="Positive magnet (attracts negative magnets, repels positive magnets)" type={REGULAR_OBJECT}/>
                <PhysicsComponent activeName={addingComponent?.name} onHover={setHoveredItem} onHoverOut={onItemRelease} extraConfig={{plugin: { attractors: [ MagnetAttractor.bind(void 0, scene, false) ] }}} setChosenElement={setChosenElement} sprite="sprites/bluemagnet.png" name="Negative magnet (attracts positive magnets, repels negative magnets)" type={REGULAR_OBJECT}/>
                <PhysicsComponent activeName={addingComponent?.name} onHover={setHoveredItem} onHoverOut={onItemRelease} behavior={PoweredWheelBehavior} behavConfig={null} setChosenElement={setChosenElement} sprite="sprites/clockwisewheel.png" name="Powered wheel (clockwise)" type={REGULAR_OBJECT}/>
                <PhysicsComponent activeName={addingComponent?.name} onHover={setHoveredItem} onHoverOut={onItemRelease} behavior={PoweredWheelBehavior} behavConfig={{ reverse: true }} setChosenElement={setChosenElement} sprite="sprites/ccwwheel.png" name="Powered wheel (counter-clockwise)" type={REGULAR_OBJECT}/>
                <PhysicsComponent activeName={addingComponent?.name} onHover={setHoveredItem} onHoverOut={onItemRelease} behavior={BalloonBehavior} setChosenElement={setChosenElement} sprite="sprites/balloon.png" name="Balloon (lifts objects)" type={REGULAR_OBJECT}/>
                <PhysicsComponent activeName={addingComponent?.name} sprite="sprites/airrod.png" onHover={setHoveredItem} onHoverOut={onItemRelease} setChosenElement={setChosenElement} name="Air rod (links two objects together)" type={CONSTRAINT}/>
            </>, [ addingComponent, setChosenElement ]);
            const startAddElement = async() => {
                
                if(itemListShown) {
                    setItemListShown(false);
                    setAddingComponent(null);
                    return;
                }
                resetState();
                setItemListShown(true);
                /*
                setWantsToAdd(true);
                await ReactSwal.fire({
                    title: 'Add a new component',
                    html: <ul className="physics-choice-list">
                        {physicsOptions}
                    </ul>,
                    showCancelButton: true,
                    showConfirmButton: false
                });
                setWantsToAdd(false);
                */
            };
            const onPauseChange = () => {
                setPaused(!isPaused);
                if(hoveredItem == "Start simulation" && isPaused)
                    setHoveredItem("Stop simulation");
                else if(hoveredItem == "Stop simulation" && !isPaused)
                    setHoveredItem("Start simulation");
            };
            React.useEffect(() => {
                if(disableAllUI)
                    setHoveredItem(null);
            }, [ disableAllUI ]);
            React.useEffect(() => {
                const fn = () => {
                    setCanvasPointerDown(true);
                }
                const disfn = () => {
                    setCanvasPointerDown(false)
                }
                scene.game.events.on("drag-move", fn);
                scene.input.on("gameobjectup", disfn);
                scene.input.on("pointerup", disfn);
                scene.input.on("pointerout", disfn);
                const gr_fn = () => {
                    setDisableAllUI(true);
                    setHoveredItem(null);
                    setTimeout(async() => {
                        resetState();
                        scene.scene.pause();
                        const res = await Swal.fire({
                            title: 'Great job!',
                            text: 'You finished the level!',
                            icon: 'success',
                            allowOutsideClick: false,
                            allowEnterKey: false,
                            allowEscapeKey: false,
                            confirmButtonText: 'Choose another level',
                            cancelButtonText: 'Play again',
                            showCancelButton: true,
                            preConfirm: () => { window.location.reload(false); return false; }
                        });
                        if(res.dismiss == Swal.DismissReason.cancel) {
                            scene.scene.resume();
                            scene.hasReachedGoal = false;
                            setPaused(true);
                            setDisableAllUI(false);
                        }
                    }, 2000);
                };
                const info_fn = async(sprite) => {
                    if(sprite != scene.baseWheelImage) {
                        Swal.fire({
                            title: sprite.name,
                            icon: 'info',
                            allowOutsideClick: false
                        });
                    } else {
                        Swal.fire({
                            title: 'Main wheel',
                            text: 'This is the most important wheel in the game. You win the level by getting it to the goal sign on the map.',
                            icon: 'info',
                            allowOutsideClick: false
                        });
                    }
                    
                };
                const fail_fn = async() => {
                    setDisableAllUI(true);
                    scene.scene.pause();
                    setHoveredItem(null);
                    await Swal.fire({
                        title: 'Whoops...',
                        text: 'Your contraption can\'t touch those.',
                        icon: 'error'
                    });
                    scene.scene.resume();
                    setDisableAllUI(false);
                    setPaused(true);
                };
                if(window.physicsLevelNumber == 1) {
                    ReactSwal.fire({
                        title: 'Game instructions',
                        html: <>
                            Place objects using the <i className="fas fa-plus"></i> button. You can drag them anywhere on the map and
                            link them together using air rods. Air rods do have a limited range which you'll need to be aware of.
                            <p></p>
                            Need to remove objects? Use the <i className="fas fa-trash"></i> button. The <i className="fas fa-unlink"></i> button
                            is a shortcut for removing rods without having to delete and recreate the objects they're connected to.
                            <p></p>
                            The red object is special, and cannot be moved. You need to get it to touch the goal sign on the map. (You may need to
                            drag the map to see where the goal sign is.)
                            <p></p>
                            Once you're done building your contraption, press <i className="fas fa-play"></i> to start the physics
                            simulation and see if it works!
                            <p></p>
                            If you can't figure out how to make a contraption work, you can use the <i className="fas fa-lightbulb"></i> button
                            to look at a hint. Hints will show you part of the contraption you need to build (the missing components are marked with ?).
                            
                            In some cases, you may need to change up the distances between objects a bit in order to get it to behave. The *square cliff*
                            level is an example of this.
                            <p></p>
                            <h2>How to complete the tutorial level</h2>
                            The only obstacle you need to overcome in this level is a hill,
                            so you won't need any advanced components like magnets or unpowered
                            wheels.
                            <p></p>
                            Create a single powered wheel (<ComponentImage src="sprites/clockwisewheel.png"/>) and
                            attach it to the main wheel (<ComponentImage src="sprites/mainwheel.png"/>) with
                            an air rod (<ComponentImage src="sprites/airrod.png"/>).
                            (If you don't use the air rod, the wheel will just roll away on its own.)
                        </>
                    })
                }
                scene.game.events.on("goal-reached", gr_fn);
                scene.game.events.on("hit-danger", fail_fn);
                scene.game.events.on("show-sprite-info", info_fn);
                return () => {
                    scene.game.events.off("drag-move", fn);
                    scene.game.events.off("goal-reached", gr_fn);
                    scene.game.events.off("hit-danger", fail_fn);
                    scene.game.events.off("show-sprite-info", info_fn);
                    scene.input.off("gameobjectup", disfn);
                    scene.input.off("pointerup", disfn);
                    scene.input.off("pointerout", disfn);
                }
            }, [ ]);
            React.useEffect(() => {
                resetState();
                scene.isPaused = isPaused;
                scene.onUIUpdate();
            }, [ isPaused ]);
            React.useEffect(() => {
                if(addingComponent) {
                    const eventType = addingComponent.type == REGULAR_OBJECT ? "pointerdown" : "gameobjectdown";
                    const fn = (pointer, gameObject) => {
                        if(addingComponent.type == REGULAR_OBJECT) {
                            const tex = scene.textures.get(addingComponent.bn);
                            const img = tex.getSourceImage();
                            const spriteWidth = img.width * scene.currentScaleValue;
                            const spriteHeight = img.height * scene.currentScaleValue;
                            const bounds = new Phaser.Geom.Rectangle(pointer.worldX - spriteWidth / 2, pointer.worldY - spriteHeight / 2, spriteWidth, spriteHeight);
                            if(scene.checkObjectCollision(null, bounds)) {
                                Swal.fire({
                                    title: 'Error',
                                    text: "You can't add an object on top of something, or too close to another object.",
                                    icon: 'error'
                                });
                                setCanvasPointerDown(false);
                            } else {
                                const wheel = scene.createImage(addingComponent.bn, pointer.worldX, pointer.worldY, addingComponent.behavior,addingComponent.behavConfig, addingComponent.extraConfig);

                                wheel.name = addingComponent.name;

                                scene.input.setDraggable(wheel);
                                scene.setCursorOn(wheel);
                                scene.setupEvents(wheel);
                            }
                        } else if(addingComponent.type == CONSTRAINT) {
                            if(scene.resizeSprites.indexOf(gameObject) != -1) {
                                if(gameObject == constraintTargets[0]) {
                                    Swal.fire({
                                        title: 'Error',
                                        text: "An object cannot be linked to itself.",
                                        icon: 'error'
                                    });
                                    setCanvasPointerDown(false);
                                    scene.lastSelectedConstraintItem = null;
                                    return;
                                }
                                /* Valid object */
                                const newTargets = constraintTargets.slice();
                                
                                newTargets.push(gameObject);
                                setConstraintTargets(newTargets);
                            }
                        }
                    };
                    if(addingComponent.type == REGULAR_OBJECT)
                        scene.input.setDefaultCursor("crosshair");
                    scene.input.on(eventType, fn);
                    return () => {
                        scene.input.off(eventType, fn);
                        if(addingComponent.type == REGULAR_OBJECT)
                            scene.input.setDefaultCursor("default");
                    };
                }
            }, [ addingComponent, constraintTargets ]);
            React.useEffect(() => {
                if(wantsToBreakConstraints) {
                    const fn = (pointer, gameObject) => {
                        if(scene.resizeSprites.indexOf(gameObject) != -1) {
                            if(gameObject == constraintTargets[0]) {
                                Swal.fire({
                                    title: 'Error',
                                    text: "You can't choose the same object twice.",
                                    icon: 'error'
                                });
                                setCanvasPointerDown(false);
                                return;
                            }
                            /* Valid object */
                            const newTargets = constraintTargets.slice();
                            
                            newTargets.push(gameObject);
                            setConstraintTargets(newTargets);
                        }
                    };
                    scene.input.on("gameobjectdown", fn);
                    return () => scene.input.off("gameobjectdown", fn);
                }
            }, [ wantsToBreakConstraints, constraintTargets ]);
            React.useEffect(() => {
                if(scene.lastSelectedConstraintItem != null) {
                    const prevConstraintItem = scene.lastSelectedConstraintItem;
                    scene.lastSelectedConstraintItem = null;
                    scene.setCursorOn(prevConstraintItem);
                }
                scene.lastSelectedConstraintItem = constraintTargets[0];
                if(typeof scene.lastSelectedConstraintItem != 'undefined' && scene.lastSelectedConstraintItem != null) {
                    scene.setCursorOn(scene.lastSelectedConstraintItem);
                }
                if(constraintTargets.length == 2) {
                    const dist = Phaser.Math.Distance.Between(constraintTargets[0].x, constraintTargets[0].y, constraintTargets[1].x, constraintTargets[1].y)*scene.currentScaleValue;
                    if(dist > MAX_CONSTRAINED_DISTANCE) {
                        Swal.fire({
                            title: 'Error',
                            text: `Those objects are too far away to be linked (${Math.round(dist)} units, must be ${MAX_CONSTRAINED_DISTANCE} or less).`,
                            icon: 'error'
                        });
                        setCanvasPointerDown(false);
                    } else {
                        if(wantsToBreakConstraints) {
                            setConstraintTargets([]);
                            scene.constraintObjects = scene.constraintObjects.filter((constraint, index) => {
                                if((constraint[0] == constraintTargets[0] && constraint[1] == constraintTargets[1]) || (constraint[1] == constraintTargets[0] && constraint[0] == constraintTargets[1])) {
                                    if(scene.constraints[index] != null)
                                        scene.matter.world.remove(scene.constraints[index]);
                                    scene.constraints.splice(index, 1);
                                    return false;
                                }
                                return true;
                            });
                        } else {
                            const existing = scene.constraintObjects.some(objects => {
                                if((objects[0] == constraintTargets[0] && objects[1] == constraintTargets[1]) || (objects[1] == constraintTargets[0] && objects[0] == constraintTargets[1])) {
                                    return true;
                                }
                                return false;
                            });
                            if(existing) {
                                Swal.fire({
                                    title: 'Error',
                                    text: `Those two objects are already linked..`,
                                    icon: 'error'
                                });
                                setCanvasPointerDown(false);
                            } else {
                                scene.addConstraint(constraintTargets[0], constraintTargets[1]);
                                setConstraintTargets([]);
                            }
                        }
                    }
                    scene.lastSelectedConstraintItem = null;
                }
            }, [ constraintTargets, wantsToBreakConstraints ]);
            React.useEffect(() => {
                if(wantsToRemove) {
                    setAddingComponent(null);
                    setWantsToBreakConstraints(false);
                    const newSet = scene.resizeSprites.slice();
                    const fn = function() {
                        const gameObject = this;
                        if(scene.baseWheelImage == gameObject) {
                            Swal.fire({
                                title: 'Error',
                                text: "You can't delete the base wheel!",
                                icon: 'error'
                            });
                            setCanvasPointerDown(false);
                            return;
                        }
                        const i = scene.resizeSprites.indexOf(gameObject);
                        if(i != -1) {
                            scene.resizeSprites.splice(i, 1);
                            scene.oldSpritePositions.splice(i, 1);
                            scene.removeConstraintsForObject(gameObject);
                            gameObject.destroy();
                        }
                    };
                    newSet.forEach(sprite => sprite.on('pointerdown', fn, sprite));
                    return () => newSet.forEach(sprite => sprite.off('pointerdown', fn));;
                }
            }, [ wantsToRemove ]);
            React.useEffect(() => {
                scene.forceDisableDrag = (wantsToAdd || addingComponent != null || wantsToRemove || wantsToBreakConstraints);
            }, [ wantsToRemove, wantsToAdd, addingComponent, wantsToBreakConstraints ]);

            return <>
                {!disableAllUI && <ControlBar noShadow={itemListShown} translucent={canvasPointerDown}>
                    <ControlButton onMouseOver={() => setHoveredItem(isPaused ? "Start simulation" : "Stop simulation")} onMouseOut={onItemRelease} onClick={onPauseChange}><i className={classnames("fas", isPaused ? "fa-play" : "fa-stop")}></i></ControlButton>
                    <ControlButton onMouseOver={() => setHoveredItem("Add component")} onMouseOut={onItemRelease} disabled={!isPaused} active={itemListShown} onClick={startAddElement}><i className={classnames("fas", "fa-plus")}></i></ControlButton>
                    <ControlButton onMouseOver={() => setHoveredItem("Remove component")} onMouseOut={onItemRelease} active={wantsToRemove} disabled={!isPaused} onClick={() => { resetState(); setWantsToRemove(!wantsToRemove)}}><i className={classnames("fas", "fa-trash")}></i></ControlButton>
                    <ControlButton onMouseOver={() => setHoveredItem("Break constraints")} onMouseOut={onItemRelease} active={wantsToBreakConstraints} disabled={!isPaused} onClick={tryBreakConstraints}><i className={classnames("fas", "fa-unlink")}></i></ControlButton>
                    {hintImg && <ControlButton onMouseOver={() => setHoveredItem("Show hint")} onMouseOut={onItemRelease} disabled={!isPaused} onClick={showHint}><i className={classnames("fas", "fa-lightbulb")}></i></ControlButton>}
                </ControlBar>}
                <ul className={classnames("item-list", !itemListShown && "item-list-hidden", canvasPointerDown && "control-bar-translucent")}>
                    {physicsOptions}
                </ul>
                <div className={classnames("bottom-message", (hoveredItem!=null||wantsToBreakConstraints||addingComponent!=null) && "bottom-message-visible")}>
                    {hoveredItem != null ? hoveredItem : <>
                        {addingComponent?.type == REGULAR_OBJECT && `Choose a location for the new ${shortName(addingComponent?.name)?.toLowerCase()}.`}
                        {addingComponent?.type == CONSTRAINT && `Choose the ${constraintTargets.length == 1 ? "second" : "first"} object to link.`}
                        {wantsToBreakConstraints && `Choose the ${constraintTargets.length == 1 ? "second" : "first"} object to break constraints on.`}
                    </>}
                </div>
            </>;
        }
        ReactDOM.render(<GameUI/>, document.getElementById("game-overlay"));
    }
    onUIUpdate() {
        if(this.isPaused == false) {
            this.oldSpritePositions = [];    
            this.cameras.main.startFollow(this.baseWheelImage);
        }
        
        this.resizeSprites.forEach((sprite, index) => {
            this.setCursorOn(sprite);
            if(!this.isPaused) {
                this.oldSpritePositions[index] = { x: sprite.x, y: sprite.y, rotation: sprite.rotation };
                this.setPhysicsOn(sprite, true);
                sprite.setVelocity(0, 0);
                sprite.setAngularVelocity(0);
            } else {
                this.setPhysicsOn(sprite, false);
                sprite.setVelocity(0, 0);
                sprite.setAngularVelocity(0);
                if(typeof this.oldSpritePositions[index] != 'undefined') {
                    sprite.x = this.oldSpritePositions[index].x;
                    sprite.y = this.oldSpritePositions[index].y;
                    sprite.rotation = this.oldSpritePositions[index].rotation;
                }
            }
        });
        
        this.constraintObjects.forEach((objs, index) => {
            if(!this.isPaused && this.constraints[index] == null) {
                this.constraints[index] = this.matter.add.constraint(objs[0], objs[1]);
            } else if(this.isPaused && this.constraints[index] != null) {
                this.matter.world.remove(this.constraints[index]);
                this.constraints[index] = null;
            }
        });
    }
    getNumActivePointers() {
        let numPointers = 0;
        this.game.input.pointers.forEach(pointer => {
            if(pointer.active)
                numPointers++;
        });
        return numPointers;
    }
    update(time, delta) {
        this.outlineGraphics.clear();
        if(this.isPaused) {
            this.outlineGraphics.lineStyle(3*this.currentScaleValue, 0xFF0000);
            this.outlineGraphics.fillStyle(0xFF0000);
            if (this.game.input.activePointer.isDown && this.getNumActivePointers() < 3 && !this.dragInProgress) {
                if (this.game.origDragPoint) {
                    // move the camera by the amount the mouse has moved since last update
                    this.cameras.main.stopFollow();
                    this.cameras.main.scrollX +=
                        this.game.origDragPoint.x - this.game.input.activePointer.position.x;
                    this.cameras.main.scrollY +=
                        this.game.origDragPoint.y - this.game.input.activePointer.position.y;
                } // set new drag origin to current position
                this.game.origDragPoint = this.game.input.activePointer.position.clone();
            } else {
                this.game.origDragPoint = null;
            }
        }
        this.resizeSprites.forEach(sprite => {
            sprite.emit('behaviorUpdate', delta);
            if(this.isPaused) {
                sprite.setVelocity(0, 0);
                sprite.setAngularVelocity(0);
            }
            if(this.isPaused && sprite != this.lastSelectedConstraintItem && sprite.physIsHovering)
                this.outlineGraphics.strokeCircle(sprite.x, sprite.y, (sprite.displayWidth / 2) + (1*this.currentScaleValue));
        });

        this.constraintOverlayGraphics.clear();
        this.constraintOverlayGraphics.lineStyle(4*this.currentScaleValue, 0x0000FF);
        this.constraintOverlayGraphics.fillStyle(0x0000FF);
        this.constraintObjects.forEach(([ objA, objB ]) => {
            this.constraintOverlayGraphics.fillCircle(objA.x, objA.y, 2*this.currentScaleValue);
            this.constraintOverlayGraphics.fillCircle(objB.x, objB.y, 2*this.currentScaleValue);
            this.constraintOverlayGraphics.lineBetween(objA.x, objA.y, objB.x, objB.y);
        });
        const lastTile = this.map.getTileAt(this.map.width - 1, this.map.height - 1)?.getBounds();
        if(typeof lastTile == 'undefined')
            return;
        if(this.baseWheelImage.x > lastTile.right || this.baseWheelImage.y > lastTile.bottom) {
            console.error("Failed");
        }
    }
    render() {
        game.debug.text('FPS: ' + game.time.fps || 'FPS: --', 40, 40, "#00ff00");
    }
}
