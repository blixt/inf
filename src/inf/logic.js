// Copyright © Andreas Blixt 2011. MIT license.

/**
 * @fileoverview Code that handles game logic.
 */

/*jslint browser: true */
/*global console, goog, inf */

goog.provide('inf.logic');
goog.provide('inf.logic.Entity');
goog.provide('inf.logic.Player');
goog.provide('inf.logic.Region');
goog.provide('inf.logic.World');

goog.require('goog.debug.ErrorHandler');
goog.require('goog.events');
goog.require('goog.events.EventHandler');
goog.require('goog.events.EventTarget');
goog.require('inf');

/**
 * An object in the world that can move around.
 * @constructor
 * @extends goog.events.EventTarget
 * @param {number} id The id of the entity.
 * @param {number} width The width of the entity, in blocks.
 * @param {number} height The height of the entity, in blocks.
 * @param {!inf.logic.Region} region The region that the entity should be
 *     placed in.
 * @param {number} x The X coordinate in the region that the entity should be
 *     placed at.
 * @param {number} y The Y coordinate in the region that the entity should be
 *     placed at.
 */
inf.logic.Entity = function(id, width, height, region, x, y) {
    goog.events.EventTarget.call(this);

    /**
     * The id of this entity.
     * @type {number}
     */
    this.id = id;

    /**
     * The width of the entity, in blocks.
     * @type {number}
     */
    this.width = width;

    /**
     * The height of the entity, in blocks.
     * @type {number}
     */
    this.height = height;

    /**
     * Whether the entity is colliding with something on a specific edge.
     * @type Object.<string, boolean>
     */
    this.colliding = {up: false, down: false, left: false, right: false};

    if (region) {
        this.changeRegion(region, x, y);
    }

    if (inf.DEBUG) {
        console.log('Loaded entity #' + id + '.');
    }
};
goog.inherits(inf.logic.Entity, goog.events.EventTarget);

/**
 * The region that the entity is currently located in.
 * @protected
 * @type {inf.logic.Region}
 */
inf.logic.Entity.prototype.region = null;

/**
 * The position of the left side of the entity, in number of blocks along the X
 * axis in the current region.
 * @type {number}
 */
inf.logic.Entity.prototype.x = NaN;

/**
 * The position of the base (bottom) of the entity, in number of blocks along
 * the Y axis.
 * @type {number}
 */
inf.logic.Entity.prototype.y = NaN;

/**
 * Changes the current region of the entity.
 * @protected
 * @param {!inf.logic.Region} newRegion The region to change to.
 * @param {number=} opt_x X coordinate to place the entity at in the new region.
 * @param {number=} opt_y Y coordinate to place the entity at in the new region.
 */
inf.logic.Entity.prototype.changeRegion = function(newRegion, opt_x, opt_y) {
    if (!this.dispatchEvent({
        type: 'regionchange',
        oldRegion: this.region,
        newRegion: newRegion,
        x: opt_x, y: opt_y}))
    {
        return false;
    }
    if (this.region) {
        this.region.removeEntity(this);
    }
    newRegion.addEntity(this);
    if (typeof opt_x !== 'undefined' && typeof opt_y !== 'undefined') {
        this.x = opt_x;
        this.y = opt_y;
    }
    return true;
};

/**
 * Move the entity by the specified amount. For now, entities can only move to
 * air blocks. The amount to move does not have to be whole numbers; the entity
 * can, for example, move 0.5 blocks to the right.
 * @param {number} dx Blocks to move along the horizontal axis.
 * @param {number} dy Blocks to move along the vertical axis.
 */
inf.logic.Entity.prototype.move = function(dx, dy) {
    if (!dx && !dy) { return; }

    var nx = this.x,
        ny = this.y,
        heightAdjust = this.height - 1, // The height difference to consider.
        widthAdjust = this.width - 1, // The width difference to consider.
        minX = Math.floor(nx), // First X block that entity is in.
        maxX = Math.ceil(nx + widthAdjust), // Last X block that entity is in.
        r, // Reference to a region.
        endX, endY;

    // Move the entity along the Y axis.
    // Make sure the new Y coordinate is not out of bounds.
    if (dy) {
        var downCollision = false, upCollision = false;
        if (ny + dy < heightAdjust) {
            ny = heightAdjust;
            upCollision = true;
        } else if (ny + dy > inf.logic.Region.BLOCKS_Y - 1) {
            ny = inf.logic.Region.BLOCKS_Y - 1;
            downCollision = true;
        } else {
            // Collision detection along the Y axis.
            var my;
            r = this.region;
            endX = maxX;
            for (var x = minX; x <= endX; x++) {
                if (x >= inf.logic.Region.BLOCKS_X) {
                    // Tile to check is in next region.
                    r = r.getNext();
                    // Not much we can do about region not being loaded yet.
                    if (!r) { break; }
                    // Reassign X coordinate to wrap around.
                    x = 0;
                    endX -= inf.logic.Region.BLOCKS_X;
                }

                if (dy > 0) {
                    // Entity is moving down.
                    my = Math.ceil(ny);
                    // Iterate towards the destination, checking for obstacles.
                    for (var y = my; y < ny + 1 + dy; y++) {
                        if (r.getBlock(x, y) != inf.logic.Region.BlockType.AIR)
                        {
                            // Hit an obstacle; reduce delta.
                            dy = Math.min(y - ny - 1, dy);
                            downCollision = true;
                            break;
                        }
                    }
                } else {
                    // Entity is moving up.
                    my = Math.floor(ny - heightAdjust - 1);
                    endY = ny + dy - heightAdjust - 1;
                    // Iterate towards the destination, checking for obstacles.
                    for (var y = my; y > endY; y--) {
                        if (r.getBlock(x, y) != inf.logic.Region.BlockType.AIR)
                        {
                            // Hit an obstacle; reduce delta.
                            dy = Math.max(y + 1 + heightAdjust - ny, dy);
                            upCollision = true;
                            break;
                        }
                    }
                }

                if (y === my) {
                    // There was a block immediately above/below the entity.
                    // This means that the next X loop isn't needed. This case
                    // is common enough to quit early from.
                    // XXX: What about a block appearing in the position
                    //      that would have been checked by next loop?
                    break;
                }
            }

            ny += dy;
        }

        this.colliding.down = downCollision;
        this.colliding.up = upCollision;
        this.y = ny;
    }

    // Move entity along the X axis.
    // Also move it between regions if necessary.
    if (dx) {
        // FIXME: Temporary assertion.
        if (Math.abs(dx) > inf.logic.Region.BLOCKS_X) {
            throw Error('Cannot move entity across more than one region.');
        }

        var leftCollision = false, rightCollision = false;

        // Collision detection along the X axis.
        var mx, tx,
            minY = Math.floor(ny - heightAdjust),
            maxY = Math.ceil(ny);
        for (var y = minY; y <= maxY; y++) {
            r = this.region;
            // Temporary X coordinate to use in case of wrapping.
            tx = nx;

            if (dx > 0) {
                // Entity is moving to the right.
                mx = Math.ceil(nx + widthAdjust + 1);
                // Iterate towards the destination, checking for obstacles.
                endX = nx + widthAdjust + 1 + dx;
                for (var x = mx; x < endX; x++) {
                    if (x >= inf.logic.Region.BLOCKS_X) {
                        // Tile to check is in next region.
                        r = r.getNext();
                        // Not much we can do about region not being loaded yet.
                        if (!r) { break; }
                        // Reassign X coordinate to wrap around.
                        x = 0;
                        tx -= inf.logic.Region.BLOCKS_X;
                        endX -= inf.logic.Region.BLOCKS_X;
                    }

                    if (r.getBlock(x, y) != inf.logic.Region.BlockType.AIR)
                    {
                        // Hit an obstacle; reduce delta.
                        dx = Math.min(x - 1 - widthAdjust - tx, dx);
                        rightCollision = true;
                        break;
                    }
                }
            } else {
                // Entity is moving to the left.
                mx = Math.floor(nx - 1)
                // Iterate towards the destination, checking for obstacles.
                endX = nx + dx - 1;
                for (var x = mx; x > endX; x--) {
                    if (x < 0) {
                        // Tile to check is in previous region.
                        r = r.getPrev();
                        // Not much we can do about region not being loaded yet.
                        if (!r) { break; }
                        // Reassign X coordinate to wrap around.
                        x = inf.logic.Region.BLOCKS_X - 1;
                        tx += inf.logic.Region.BLOCKS_X;
                        endX += inf.logic.Region.BLOCKS_X;
                    }

                    if (r.getBlock(x, y) != inf.logic.Region.BlockType.AIR)
                    {
                        // Hit an obstacle; reduce delta.
                        dx = Math.max(x + 1 - tx, dx);
                        leftCollision = true;
                        break;
                    }
                }
            }

            if (x === mx) {
                // There was a block immediately next to the entity. This means
                // that the next Y loop isn't needed. This case is common
                // enough to quit early from.
                // XXX: What about a block appearing in the position
                //      that would have been checked by next loop?
                break;
            }
        }

        if (nx + dx < 0) {
            r = this.region.getPrev();
            if (r) {
                this.x = inf.logic.Region.BLOCKS_X + nx + dx;
                this.changeRegion(r);
            } else {
                this.x = 0;
                leftCollision = true;
            }
        } else if (nx + dx >= inf.logic.Region.BLOCKS_X) {
            r = this.region.getNext();
            if (r) {
                this.x = nx + dx - inf.logic.Region.BLOCKS_X;
                this.changeRegion(r);
            } else {
                this.x = inf.logic.Region.BLOCKS_X - 1;
                rightCollision = true;
            }
        } else {
            this.x += dx;
        }

        this.colliding.left = leftCollision;
        this.colliding.right = rightCollision;
    }
};

/**
 * A player entity.
 * @constructor
 * @extends inf.logic.Entity
 * @param {number} id The id of the entity.
 * @param {!inf.logic.Region} region The region that the entity should be
 *     placed in.
 * @param {number} x The X coordinate in the region that the entity should be
 *     placed at.
 * @param {number} y The Y coordinate in the region that the entity should be
 *     placed at.
 */
inf.logic.Player = function(id, region, x, y) {
    inf.logic.Entity.call(this, id, .7, 1.8, region, x, y);
};
goog.inherits(inf.logic.Player, inf.logic.Entity);

/**
 * A region that represents a chunk of blocks in the world.
 * @constructor
 * @param {number} id The id of the region.
 * @param {Array.<number>} data The data to initialize the region with.
 * @param {?number} prevId The id of the region before this one.
 * @param {?number} nextId The id of the region after this one.
 */
inf.logic.Region = function(id, data, prevId, nextId) {
    // Assert that the data has the correct length.
    if (data.length != inf.logic.Region.NUM_BLOCKS) {
        throw Error('Invalid data length.');
    }

    /**
     * A list of numbers that represents the blocks in this region.
     * @protected
     * @type {Array.<number>}
     */
    this.data = data;

    /**
     * An object with all loaded entities in this region. The key of every item
     * is the id of the entity.
     * @protected
     * @type {Object.<number, !inf.logic.Entity>}
     */
    this.entities = {};

    /**
     * The id of the previous region.
     * @protected
     * @type {?number}
     */
    this.prevId = prevId;

    /**
     * The id of the next region.
     * @protected
     * @type {?number}
     */
    this.nextId = nextId;

    /**
     * The id of this region.
     * @type {number}
     */
    this.id = id;

    if (inf.DEBUG) {
        console.log('Loaded region #' + id + '.');
    }
};

/**
 * The number of blocks along the X axis in a region.
 * @const
 * @type {number}
 */
inf.logic.Region.BLOCKS_X = 64;

/**
 * The number of blocks along the Y axis in a region.
 * @const
 * @type {number}
 */
inf.logic.Region.BLOCKS_Y = 256;

/**
 * Total number of blocks in a region.
 * @const
 * @type {number}
 */
inf.logic.Region.NUM_BLOCKS = inf.logic.Region.BLOCKS_X *
                              inf.logic.Region.BLOCKS_Y;

/**
 * Block types.
 * @enum {number}
 */
inf.logic.Region.BlockType = {
    AIR: 0x00,
    DIRT: 0x01,
    STONE: 0x02
};

/**
 * Generates random region data.
 * @return {Array.<number>} Region data.
 */
inf.logic.Region.generate = function() {
    var data = [];

    var i = 0;
    for (var x = 0; x < inf.logic.Region.BLOCKS_X; x++) {
        var treshold = 118 + Math.random() * 3;
        for (var y = 0; y < inf.logic.Region.BLOCKS_Y; y++, i++) {
            if (y >= treshold) {
                if (y - treshold < 3 + Math.random() * 3) {
                    data[i] = inf.logic.Region.BlockType.DIRT;
                } else {
                    if (Math.random() > 0.9) {
                        data[i] = 3;
                    } else {
                        data[i] = inf.logic.Region.BlockType.STONE;
                    }
                }
            } else {
                data[i] = 0;
            }
        }
    }

    return data;
};

/**
 * A reference to the next region.
 * @protected
 * @type {inf.logic.Region}
 */
inf.logic.Region.prototype.nextRegion = null;

/**
 * A reference to the previous region.
 * @protected
 * @type {inf.logic.Region}
 */
inf.logic.Region.prototype.prevRegion = null;

/**
 * A reference to the world that the region belongs in.
 * @type {inf.logic.World}
 */
inf.logic.Region.prototype.world = null;

/**
 * Adds an entity to the region.
 * @param {!inf.logic.Entity} entity The entity to add.
 */
inf.logic.Region.prototype.addEntity = function(entity) {
    if (inf.DEBUG) {
        if (entity.region) {
            throw Error(
                'Entity #' + entity.id + ' is already in another region (#' +
                entity.region.id + ').');
        }

        if (entity.id in this.entities) {
            throw Error(
                'Entity #' + entity.id + ' is already in region #' + this.id +
                '.');
        }

        console.log(
            'Added entity #' + entity.id + ' to region #' + this.id + '.');
    }

    this.entities[entity.id] = entity;
    entity.region = this;
};

/**
 * Fetches a block from the data using specified X and Y coordinates.
 * @param {number} x The X coordinate.
 * @param {number} y The Y coordinate.
 * @return {number} The block type at the specified coordinates.
 */
inf.logic.Region.prototype.getBlock = function(x, y) {
    return this.data[x * inf.logic.Region.BLOCKS_Y + y];
};

/**
 * Tries to get the next region in relation to this one.
 * @return {inf.logic.Region} The next region, if any.
 */
inf.logic.Region.prototype.getNext = function() {
    if (!this.nextRegion && this.nextId) {
        this.world.requestRegion(this.nextId);
    }
    return this.nextRegion;
};

/**
 * Tries to get the previous region in relation to this one.
 * @return {inf.logic.Region} The previous region, if any.
 */
inf.logic.Region.prototype.getPrev = function() {
    if (!this.prevRegion && this.prevId) {
        this.world.requestRegion(this.prevId);
    }
    return this.prevRegion;
};

/**
 * Removes an entity from the region.
 * @param {!inf.logic.Entity} entity The entity to remove.
 */
inf.logic.Region.prototype.removeEntity = function(entity) {
    if (inf.DEBUG) {
        if (!(entity.id in this.entities)) {
            throw Error(
                'Entity #' + entity.id + ' is not in this region (#' +
                this.id + ').');
        }
    }

    delete this.entities[entity.id];
    delete entity.region;

    if (inf.DEBUG) {
        console.log(
            'Removed entity #' + entity.id + ' from region #' + this.id + '.');
    }
};

/**
 * A world instance which is the container for the currently loaded regions.
 * @constructor
 * @extends goog.events.EventTarget
 */
inf.logic.World = function() {
    goog.events.EventTarget.call(this);

    /**
     * An object with all loaded entities in this world. The key of every item
     * is the id of the entity.
     * @protected
     * @type {Object.<number, !inf.logic.Entity>}
     */
    this.entities = {};

    /**
     * A lookup of regions that are referenced but not loaded.
     * @private
     * @type {Object.<number, {next: inf.logic.Region, prev: inf.logic.Region}>}
     */
    this.pending_ = {};

    /**
     * An object with all loaded regions in this world. The key of every
     * item is the id of the region.
     * @protected
     * @type {Object.<number, !inf.logic.Region>}
     */
    this.regions = {};

    /**
     * A lookup table for what regions have been requested.
     * @private
     * @type {Object.<number, boolean>}
     */
    this.requested_ = {};
};
goog.inherits(inf.logic.World, goog.events.EventTarget);

/**
 * Adds an entity to the world.
 * @param {!inf.logic.Entity} entity The entity to add.
 */
inf.logic.World.prototype.addEntity = function(entity) {
    if (inf.DEBUG) {
        if (entity.id in this.entities) {
            throw Error(
                'Entity #' + entity.id + ' is already in this world.');
        }

        console.log(
            'Added entity #' + entity.id + ' to world.');
    }

    this.entities[entity.id] = entity;
};

/**
 * Adds a region to the world.
 * @param {!inf.logic.Region} region The region to add.
 */
inf.logic.World.prototype.addRegion = function(region) {
    if (inf.DEBUG) {
        if (region.world || region.id in this.regions) {
            throw Error('Region #' + region.id + ' has already been loaded.');
        }
    }

    // Check if region is linked to by other regions already in the world.
    if (region.id in this.pending_) {
        var r = this.pending_[region.id];

        if (r.next) {
            region.nextRegion = r.next;
            r.next.prevRegion = region;
        }

        if (r.prev) {
            region.prevRegion = r.prev;
            r.prev.nextRegion = region;
        }

        delete this.pending_[region.id];
    }

    // Once a region has been loaded, remove it from the requested list.
    if (region.id in this.requested_) {
        delete this.requested_[region.id];
    }

    // Add references to neighboring regions to the region being added.
    // Basically, this is a doubly linked list. If the next/previous region has
    // not been loaded yet, the link will be added to a pending queue and
    // completed once the neighboring region has been loaded.
    var nextId = region.nextId, prevId = region.prevId;

    if (nextId in this.regions) {
        region.nextRegion = this.regions[nextId];
    } else if (nextId) {
        if (!(nextId in this.pending_)) {
            this.pending_[nextId] = {next: null, prev: null};
        }
        this.pending_[nextId].prev = region;
    }

    if (prevId in this.regions) {
        region.prevRegion = this.regions[prevId];
    } else if (prevId) {
        if (!(prevId in this.pending_)) {
            this.pending_[prevId] = {next: null, prev: null};
        }
        this.pending_[prevId].next = region;
    }

    region.world = this;
    this.regions[region.id] = region;

    this.dispatchEvent({type: 'regionavailable', region: region});
};

/**
 * Removes an entity from the world.
 * @param {!inf.logic.Entity} entity The entity to remove.
 */
inf.logic.World.prototype.removeEntity = function(entity) {
    if (inf.DEBUG) {
        if (!(entity.id in this.entities)) {
            throw Error(
                'Entity #' + entity.id + ' is not in this world.');
        }
    }

    delete this.entities[entity.id];

    if (inf.DEBUG) {
        console.log(
            'Removed entity #' + entity.id + '.');
    }
};

/**
 * Indicates that a region that is not available is required. The result of
 * calling this method depends on the implementation. A server implementation
 * would load/generate the region, while a client implementation would request
 * it from the server.
 * @param {number} id The id of the region that is required.
 */
inf.logic.World.prototype.requestRegion = function(id) {
    if (id in this.regions || id in this.requested_) {
        // Region was already requested, or it has already been loaded, so no
        // need to request it again.
        return;
    }
    this.requested_[id] = true;
    this.dispatchEvent({type: 'regionrequired', regionId: id});
};
