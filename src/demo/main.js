// Copyright © Andreas Blixt 2011. MIT license.

/**
 * @fileoverview Code for starting up the game on a page.
 */

// JSLint declarations.
/*jslint browser: true */
/*global goog, inf */

goog.provide('demo.main');

goog.require('inf.gfx');
goog.require('inf.logic');
goog.require('inf.ui');

function genRegionData() {
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
}

function main() {
    var r1 = new inf.logic.Region(1, genRegionData()),
        r2 = new inf.logic.Region(2, genRegionData()),
        r3 = new inf.logic.Region(3, genRegionData()),
        r4 = new inf.logic.Region(4, genRegionData()),
        r5 = new inf.logic.Region(5, genRegionData()),
        r6 = new inf.logic.Region(6, genRegionData());

    // Create a looping world for infinity goodness!
    var world = new inf.logic.World();
    world.addRegion(r1, 6, 2);
    world.addRegion(r2, 1, 3);
    world.addRegion(r3, 2, 4);
    world.addRegion(r4, 3, 5);
    world.addRegion(r5, 4, 6);
    world.addRegion(r6, 5, 1);

    var player = new inf.logic.Entity(1, r3, 12, 118, 0.9, 1.9);
    var viewport = new inf.gfx.Viewport(480, 480, 'viewport');
    var ui = new inf.ui.KeyboardMouseInterface();

    var vy = 0.2;

    ui.listen('jump', function() {
        if (!player.colliding.down) { return; }
        vy = -0.5;
    });

    setInterval(function() {
        var vx = 0;
        if (ui.state.left) vx -= 0.1;
        if (ui.state.right) vx += 0.1;
        if (vy < 0.4) { vy += 0.05; } else { vy = 0.4; }
        player.move(vx, vy);
        viewport.center(player.region, player.x, player.y);
    }, 20);
}

window['main'] = main;
