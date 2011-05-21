// Copyright © Andreas Blixt 2011. MIT license.

/**
 * @fileoverview Code for starting up the game on a page.
 */

// JSLint declarations.
/*jslint browser: true */
/*global goog, inf */

goog.provide('demo.main');

goog.require('goog.events');
goog.require('inf.gfx');
goog.require('inf.logic');
goog.require('inf.ui');

function main() {
    // Create a looping world for infinity goodness!
    var r1 = new inf.logic.Region(1, inf.logic.Region.generate(), 8, 2),
        r2 = new inf.logic.Region(2, inf.logic.Region.generate(), 1, 3),
        r3 = new inf.logic.Region(3, inf.logic.Region.generate(), 2, 4),
        r4 = new inf.logic.Region(4, inf.logic.Region.generate(), 3, 5),
        r5 = new inf.logic.Region(5, inf.logic.Region.generate(), 4, 6),
        r6 = new inf.logic.Region(6, inf.logic.Region.generate(), 5, 7);

    var world = new inf.logic.World();

    goog.events.listen(world, ['regionavailable', 'regionrequired'], function (e) {
        console.log(e.type);
    });

    world.addRegion(r1);
    world.addRegion(r2);
    world.addRegion(r3);
    world.addRegion(r4);
    world.addRegion(r5);
    world.addRegion(r6);

    var player = new inf.logic.Player(1, r3, 12, 118);
    world.addEntity(player);
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
