// Copyright © Andreas Blixt 2011. MIT license.

/**
 * @fileoverview Code for getting the game world to show on screen.
 */

// JSLint declarations.
// The rationale behind allowing "for in" loops without hasOwnProperty is that
// all code used is contained in this project, and it is up to the developer to
// ensure that the prototype of objects used in "for in" loops are not changed.
/*jslint browser: true, forin: true */
/*global console, goog, inf */

goog.provide('inf.gfx');
goog.provide('inf.gfx.View');
goog.provide('inf.gfx.Viewport');

goog.require('inf');
goog.require('inf.logic.Region');

/**
 * Whether the browser is based on WebKit.
 * @const
 * @type {boolean}
 */
inf.gfx.IS_WEBKIT = navigator.userAgent.indexOf(' AppleWebKit/') !== -1;

/**
 * A view which is used to visualize part of a region. The graphics are
 * rendered to a canvas element.
 * @constructor
 * @param {!Element} container The element to put the canvas element in.
 * @see inf.gfx.Viewport
 */
inf.gfx.View = function(container) {
    var canvas = document.createElement('canvas');
    canvas.height = inf.gfx.View.SIZE;
    canvas.width = inf.gfx.View.SIZE;
    canvas.style.position = 'absolute';
    container.appendChild(canvas);

    /**
     * The canvas element.
     * @private
     * @type {!Element}
     */
    this.canvas_ = canvas;
};

/**
 * The color of the background in views. Should be specified as a CSS color.
 * @const
 * @type {string}
 */
inf.gfx.View.BACKGROUND_COLOR = 'rgb(200,220,255)';

/**
 * The number of blocks along one axis in a view. Views are square.
 * @const
 * @type {number}
 */
inf.gfx.View.BLOCKS = 32;

/**
 * The total number of blocks in a view.
 * @const
 * @type {number}
 */
inf.gfx.View.NUM_BLOCKS = inf.gfx.View.BLOCKS * inf.gfx.View.BLOCKS;

/**
 * The size, in pixels, along one axis of a single block in the view. Blocks are
 * square.
 * @const
 * @type {number}
 */
inf.gfx.View.BLOCK_SIZE = 16;

/**
 * The size of a view (for both dimensions).
 * @const
 * @type {number}
 */
inf.gfx.View.SIZE = inf.gfx.View.BLOCKS * inf.gfx.View.BLOCK_SIZE;

/**
 * The number of sections that are in a region along the X axis.
 * @const
 * @type {number}
 */
inf.gfx.View.SECTIONS_X = inf.logic.Region.BLOCKS_X / inf.gfx.View.BLOCKS;

/**
 * The number of sections that are in a region along the Y axis.
 * @const
 * @type {number}
 */
inf.gfx.View.SECTIONS_Y = inf.logic.Region.BLOCKS_Y / inf.gfx.View.BLOCKS;

/**
 * A reference to the region to render a section of.
 * @private
 * @type {inf.logic.Region}
 */
inf.gfx.View.prototype.region_ = null;

/**
 * The number of blocks that have been rendered so far.
 * @private
 * @type {number}
 */
inf.gfx.View.prototype.blocksRendered_ = 0;

/**
 * The X coordinate of the current column on the canvas.
 * @private
 * @type {number}
 */
inf.gfx.View.prototype.col_ = 0;

/**
 * The Y coordinate of the current row on the canvas.
 * @private
 * @type {number}
 */
inf.gfx.View.prototype.row_ = 0;

/**
 * The index of the next block that will be rendered in the region block list.
 * @private
 * @type {number}
 */
inf.gfx.View.prototype.pos_ = -1;

/**
 * The index of the first block that this view is responsible for rendering.
 * @private
 * @type {number}
 */
inf.gfx.View.prototype.start_ = -1;

/**
 * The id of the region that the view is rendering.
 * @type {string?}
 */
inf.gfx.View.prototype.regionId = null;

/**
 * Which section along the X axis that the view is rendering.
 * @type {number}
 */
inf.gfx.View.prototype.sectionX = -1;

/**
 * Which section along the Y axis that the view is rendering.
 * @type {number}
 */
inf.gfx.View.prototype.sectionY = -1;

/**
 * Whether the view has completed rendering the current section.
 * @type {boolean}
 */
inf.gfx.View.prototype.done = false;

/**
 * Resets the state of the view so that it's ready to start rendering.
 */
inf.gfx.View.prototype.clear = function() {
    if (inf.DEBUG) {
        if (!this.region_) {
            throw Error('A section has not been set.');
        }
    }

    delete this.blocksRendered_;
    delete this.col_;
    delete this.row_;
    delete this.done;

    this.pos_ = this.start_;

    // Clear the whole canvas.
    var ctx = this.canvas_.getContext('2d');
    ctx.fillStyle = inf.gfx.View.BACKGROUND_COLOR;
    ctx.fillRect(0, 0, inf.gfx.View.SIZE, inf.gfx.View.SIZE);
};

/**
 * Hides the canvas of the view. The canvas will be shown again when
 * {@link inf.gfx.View#position} is called.
 */
inf.gfx.View.prototype.hide = function() {
    this.canvas_.style.display = 'none';
};

/**
 * Sets the position of the canvas element.
 * @param {number} x Top position.
 * @param {number} y Left position.
 */
inf.gfx.View.prototype.position = function(x, y) {
    var s = this.canvas_.style;
    s.display = 'block';

    // TODO: Explore optimal case for using translations vs. positioning.
    if (inf.gfx.IS_WEBKIT) {
        // This is used since it's a lot faster for iOS devices.
        s['webkitTransform'] = 'translate3d(' + x + 'px, ' + y + 'px, 0)';
    } else {
        s.left = x + 'px';
        s.top = y + 'px';
    }
};

/**
 * Renders the view. The number of blocks to render can be specified to split up
 * the render process in multiple calls.
 * @param {number=} opt_numBlocks The number of blocks to render. If not
 *     specified, all blocks will be rendered.
 * @return {boolean} True if all the blocks have been rendered; otherwise,
 *     false.
 */
inf.gfx.View.prototype.render = function(opt_numBlocks) {
    if (inf.DEBUG) {
        if (!this.region_) {
            throw Error('A section has not been set.');
        }
    }

    if (this.done) { return true; }

    var b = this.blocksRendered_,
        p = this.pos_,
        r = this.region_.data,
        x = this.col_,
        y = this.row_,
        ctx = this.canvas_.getContext('2d');

    // Default to render all blocks.
    if (!opt_numBlocks) {
        opt_numBlocks = inf.gfx.View.NUM_BLOCKS;
    }

    // Calculate the index of the last block to render.
    var endBlock = Math.min(b + opt_numBlocks, inf.gfx.View.NUM_BLOCKS);

    // Keep drawing until we hit the limit, which is either the end of the
    // section, or the max number of blocks to draw in this call.
    while (b < endBlock) {
        // Move the block index forward.
        if (y === inf.gfx.View.SIZE) {
            p += inf.logic.Region.BLOCKS_Y - inf.gfx.View.BLOCKS + 1;
            x += inf.gfx.View.BLOCK_SIZE;
            y = 0;
        } else {
            p++;
        }

        // TODO: Render with texture.
        switch (r[p]) {
            case inf.logic.Region.BlockType.DIRT:
                ctx.fillStyle = 'rgb(128,64,0)';
                ctx.fillRect(x, y, inf.gfx.View.BLOCK_SIZE,
                                   inf.gfx.View.BLOCK_SIZE);
                break;
            case inf.logic.Region.BlockType.STONE:
                ctx.fillStyle = 'rgb(160,160,160)';
                ctx.fillRect(x, y, inf.gfx.View.BLOCK_SIZE,
                                   inf.gfx.View.BLOCK_SIZE);
                break;
            case 3:
                ctx.fillStyle = 'rgb(100,100,100)';
                ctx.fillRect(x, y, inf.gfx.View.BLOCK_SIZE,
                                   inf.gfx.View.BLOCK_SIZE);
                break;
        }

        if (inf.DEBUG) {
            ctx.fillStyle = 'rgb(255,255,255)';
            ctx.fillText('X' + Math.floor(p / inf.logic.Region.BLOCKS_Y),
                x + 2, y + 10);
            ctx.fillText('Y' + (p % inf.logic.Region.BLOCKS_Y),
                x + 2, y + 20);
        }

        b++;
        y += inf.gfx.View.BLOCK_SIZE;
    }

    this.blocksRendered_ = b;
    this.pos_ = p;
    this.col_ = x;
    this.row_ = y;

    if (b === inf.gfx.View.NUM_BLOCKS) {
        this.done = true;
        if (inf.DEBUG) {
            console.log(
                'Rendered section "' + this.region_.id + '":' + this.sectionX +
                ':' + this.sectionY + '.');
        }
        return true;
    }

    return false;
};

/**
 * Sets which section (of which region) that this view visualizes. Calling this
 * function resets the view. Calling {@link inf.gfx.View#render} is necessary
 * before anything shows up.
 * @param {!inf.logic.Region} region A reference to the region that is being
 *     drawn.
 * @param {number} sectionX The X position of the section within the region to
 *     render.
 * @param {number} sectionY The Y position of the section within the region to
 *     render.
 * @return {boolean} True if the section changed; otherwise, false.
 */
inf.gfx.View.prototype.setSection = function(region, sectionX, sectionY) {
    // Do not clear if the parameters haven't changed.
    if (region === this.region_ && sectionX === this.sectionX &&
        sectionY === this.sectionY) { return false; }

    this.regionId = region.id;
    this.sectionX = sectionX;
    this.sectionY = sectionY;

    this.region_ = region;
    this.start_ = (sectionX * inf.logic.Region.BLOCKS_Y + sectionY) *
        inf.gfx.View.BLOCKS;
    this.clear();

    return true;
};

/**
 * A viewport for being able to visualize a world. Creates {@link inf.gfx.View}
 * instances to cover the specified width and height, which are then scrolled
 * in the viewport.
 * @constructor
 * @param {number} width The width of the viewport, in pixels.
 * @param {number} height The height of the viewport, in pixels.
 * @param {string=} opt_id An optional id for the viewport element.
 */
inf.gfx.Viewport = function(width, height, opt_id) {
    /**
     * The number of views in the horizontal direction.
     * @type {number}
     */
    this.viewsX = Math.ceil(width / inf.gfx.View.SIZE) + 1;

    /**
     * The number of views in the vertical direction.
     * @type {number}
     */
    this.viewsY = Math.ceil(height / inf.gfx.View.SIZE) + 1;

    /**
     * The width of this viewport.
     * @type {number}
     */
    this.width = width;

    /**
     * The height of this viewport.
     * @type {number}
     */
    this.height = height;

    /**
     * Half the number of blocks that fit in the viewport horizontally.
     * @private
     * @type {number}
     */
    this.halfBlocksX_ = this.width / inf.gfx.View.BLOCK_SIZE / 2;

    /**
     * Half the number of blocks that fit in the viewport vertically.
     * @private
     * @type {number}
     */
    this.halfBlocksY_ = this.height / inf.gfx.View.BLOCK_SIZE / 2;

    /**
     * The offset from the left edge of the viewport to the left edge of a
     * centered view.
     * @private
     * @type {number}
     */
    this.centerOffsetX_ = (this.width - inf.gfx.View.SIZE) / 2;

    /**
     * The offset from the top edge of the viewport to the top edge of a
     * centered view.
     * @private
     * @type {number}
     */
    this.centerOffsetY_ = (this.height - inf.gfx.View.SIZE) / 2;

    if (inf.DEBUG) {
        console.log(
            'Initializing ' + width + 'x' + height + ' viewport with ' +
            this.viewsX + 'x' + this.viewsY + ' views.');
    }

    // Create and set up a div element which will contain all the canvas
    // elements of the views.
    var div = document.createElement('div'), style = div.style;
    if (opt_id) { div.id = opt_id; }
    style.overflow = 'hidden';
    style.position = 'relative';
    style.width = width + 'px';
    style.height = height + 'px';
    document.body.appendChild(div);

    /**
     * The div element representing the viewport.
     * @private
     * @type {!Element}
     */
    this.div_ = div;

    /**
     * Sprites for entities to be rendered in this view.
     * @private
     * @type {Object.<number, !Element>}
     */
    this.sprites_ = {};

    /**
     * A list of views used by this viewport.
     * @type {Array.<!inf.gfx.View>}
     */
    this.views = [];

    // Populate list of views.
    for (var y = 0; y < this.viewsY; y++) {
        for (var x = 0; x < this.viewsX; x++) {
            this.views.push(new inf.gfx.View(div));
        }
    }

    /**
     * A queue for {@link inf.gfx.Viewport#use_} calls that have been deferred.
     * @private
     * @type {Array.<Array>}
     */
    this.deferred_ = [];
};

/**
 * A list of views that are not in use by the viewport.
 * @private
 * @type {Array.<inf.gfx.View>}
 */
inf.gfx.Viewport.prototype.unused_ = null;

/**
 * Centers the viewport on the specified block.
 * @param {!inf.logic.Region} region The region that the block is in.
 * @param {number} x The X position of the block in the region.
 * @param {number} y The Y position of the block in the region.
 */
inf.gfx.Viewport.prototype.center = function(region, x, y) {
    // FIXME: Clean up this mess.
    var px = Math.round(this.centerOffsetX_ - (x % inf.gfx.View.BLOCKS -
            inf.gfx.View.BLOCKS / 2 + 0.5) * inf.gfx.View.BLOCK_SIZE),
        py = Math.round(this.centerOffsetY_ - (y % inf.gfx.View.BLOCKS -
            inf.gfx.View.BLOCKS / 2 - 0.5) * inf.gfx.View.BLOCK_SIZE),
        // The section that the coordinates are in.
        sx = Math.floor(x / inf.gfx.View.BLOCKS),
        sy = Math.floor(y / inf.gfx.View.BLOCKS);

    // Calculate the sections visible vertically.
    var minSy, maxSy, numBlocks;
    if (py <= 0) {
        minSy = sy;
    } else {
        numBlocks = Math.ceil(py / inf.gfx.View.SIZE);
        minSy = Math.max(sy - numBlocks, 0);
    }

    if (py + inf.gfx.View.SIZE >= this.height) {
        maxSy = sy;
    } else {
        numBlocks = Math.ceil((this.height - py) / inf.gfx.View.SIZE) - 1;
        maxSy = Math.min(sy + numBlocks, inf.gfx.View.SECTIONS_Y - 1);
    }

    // Block boundaries for the current viewport.
    var minX = x - this.halfBlocksX_ - 1,
        maxX = x + this.halfBlocksX_,
        minY = y - this.halfBlocksY_ - 1,
        maxY = y + this.halfBlocksY_;

    // Render entities in current region.
    var sprite;
    for (var id in region.entities) {
        var e = region.entities[id];

        // Make sure entity will be on screen before rendering it.
        if (e.x < minX || e.x > maxX || e.y < minY ||
            e.y + e.height - 1 > maxY)
        {
            continue;
        }

        // Calculate coordinates of the entity relative to the viewport.
        var ex = (e.x - x - 0.5) * inf.gfx.View.BLOCK_SIZE + this.width / 2,
            ey = (e.y - e.height - y + 0.5) * inf.gfx.View.BLOCK_SIZE +
                 this.height / 2;

        // Make sure a sprite exists for the entity.
        sprite = this.sprites_[id];
        // TODO: Proper sprite handling.
        if (!sprite) {
            sprite = document.createElement('div');
            sprite.style.position = 'absolute';
            sprite.style.background = '#000';
            sprite.style.width = Math.ceil(e.width * inf.gfx.View.BLOCK_SIZE) + 'px';
            sprite.style.height = Math.ceil(e.height * inf.gfx.View.BLOCK_SIZE) + 'px';
            sprite.style.zIndex = '1';
            this.div_.appendChild(sprite);
            this.sprites_[id] = sprite;
        }
        sprite.style.left = ex + 'px';
        sprite.style.top = ey + 'px';
    }

    this.resetUnused_();

    // Traverse left.
    var curX = px, curY, curSx = sx, curSy, r = region;
    while (curX > -inf.gfx.View.SIZE) {
        if (curSx < 0) {
            r = r.getLeft();
            if (!r) { break; }
            curSx = inf.gfx.View.SECTIONS_X - 1;
        }

        for (curSy = minSy; curSy <= maxSy; curSy++) {
            curY = py + (curSy - sy) * inf.gfx.View.SIZE;
            this.use_(r, curSx, curSy, curX, curY);
        }

        curSx--;
        curX -= inf.gfx.View.SIZE;
    }

    // Traverse right.
    curX = px + inf.gfx.View.SIZE;
    curSx = sx + 1;
    r = region;
    while (curX < this.width) {
        if (curSx >= inf.gfx.View.SECTIONS_X) {
            r = r.getRight();
            if (!r) { break; }
            curSx = 0;
        }

        for (curSy = minSy; curSy <= maxSy; curSy++) {
            curY = py + (curSy - sy) * inf.gfx.View.SIZE;
            this.use_(r, curSx, curSy, curX, curY);
        }

        curSx++;
        curX += inf.gfx.View.SIZE;
    }

    this.useRest_();
};

/**
 * Resets the pool of unused views, as well as checks the queue of required
 * views.
 * @private
 */
inf.gfx.Viewport.prototype.resetUnused_ = function() {
    this.unused_ = this.views.slice(0);
    if (inf.DEBUG) {
        if (this.deferred_.length) {
            throw Error('There were left-over deferred views.');
        }
    }
};

/**
 * Attempts to find an already rendered view for the specified region and
 * section, then moves it to the specified position. If no view was found, the
 * request will be deferred until all unused views are known and can be used
 * for rendering.
 * @private
 * @param {!inf.logic.Region} region A reference to the region that the section
 *     to be rendered is in.
 * @param {number} sx The X position of the section in the region.
 * @param {number} sy The Y position of the section in the region.
 * @param {number} px The X position of the view in the viewport.
 * @param {number} py The Y position of the view in the viewport.
 */
inf.gfx.Viewport.prototype.use_ = function(region, sx, sy, px, py) {
    var unused = this.unused_;

    // Try to find a view that that already has the section we want to render
    // rendered.
    for (var i = 0; i < unused.length; i++) {
        var view = unused[i];
        if (view.regionId === region.id && view.sectionX === sx &&
            view.sectionY === sy)
        {
            unused.splice(i, 1);
            view.position(px, py);
            return;
        }
    }

    this.deferred_.push(arguments);
};

/**
 * Spends the remaining unused views to empty the queue of required views.
 * @private
 */
inf.gfx.Viewport.prototype.useRest_ = function() {
    var deferred = this.deferred_, unused = this.unused_;

    while (deferred.length) {
        var values = deferred.pop(), view = unused.shift();
        if (inf.DEBUG) {
            if (!view) {
                throw Error('View pool was empty.');
            }
        }
        view.setSection(values[0], values[1], values[2]);
        view.render();
        view.position(values[3], values[4]);
    }

    // Hide any remaining unused views.
    while (unused.length) {
        unused.pop().hide();
    }
};
