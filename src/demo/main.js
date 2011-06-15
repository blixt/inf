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
    var r1 = new inf.logic.Region('a', inf.logic.Region.generate(),
                                  [null, 'b', null, 'z']),
        r2 = new inf.logic.Region('b', inf.logic.Region.generate(),
                                  [null, 'c', null, 'a']),
        r3 = new inf.logic.Region('c', inf.logic.Region.generate(),
                                  [null, 'd', null, 'b']),
        r4 = new inf.logic.Region('d', inf.logic.Region.generate(),
                                  [null, 'e', null, 'c']),
        r5 = new inf.logic.Region('e', inf.logic.Region.generate(),
                                  [null, 'f', null, 'd']),
        r6 = new inf.logic.Region('f', inf.logic.Region.generate(),
                                  [null, 'g', null, 'e']);

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

    var player = new inf.logic.Player('a', r3, 12, 118);
    world.addEntity(player);

    var viewport = new inf.gfx.Viewport(480, 480, 'viewport');
    var ui = new inf.ui.KeyboardMouseInterface();

    var vx = 0, vy = 0.2;

    ui.listen('jump', function() {
        if (!player.colliding.down) { return; }
        vy = -0.8;
    });

    setInterval(function() {
        if (player.colliding.down && !(ui.state.left || ui.state.right)) {
            vx *= 0.8;
            if (Math.abs(vx) < 0.01) {
                vx = 0;
            }
        }

        if (ui.state.left && !player.colliding.left && vx > -0.15) {
            vx -= (player.colliding.down ? 0.05 : 0.01);
        }
        if (ui.state.right && !player.colliding.right && vx < 0.15) {
            vx += (player.colliding.down ? 0.05 : 0.01);
        }

        if (vy < 0.4) { vy += 0.05; } else { vy = 0.4; }

        player.move(vx, vy);

        viewport.center(player.region, player.x, player.y);
    }, 20);
}

window['main'] = main;
