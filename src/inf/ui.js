// Copyright © Andreas Blixt 2010. MIT license.

/**
 * @fileoverview User interface implementations for handling user input for
 * different types of devices.
 */

// JSLint declarations.
/*jslint browser: true */
/*global console, goog, inf */

goog.provide('inf.ui');
goog.provide('inf.ui.Interface');
goog.provide('inf.ui.KeyboardMouseInterface');
//goog.provide('inf.ui.TouchInterface');

/**
 * An interface for the user to control the game.
 * @constructor
 */
inf.ui.Interface = function() {
    /**
     * A lookup of actions.
     * @private
     * @type {!Object.<string, Array.<function(boolean)>>}
     */
    this.actions_ = {
        jump: [],
        left: [],
        right: []
    };

    /**
     * The current state of different actions.
     * @type {!Object.<string, boolean>}
     */
    this.state = {};

    // Set up default state values.
    for (var action in this.actions_) {
        this.state[action] = false;
    }
};

/**
 * Sets up a handler for a certain action.
 * @param {string} action The action to listen for.
 * @param {function(boolean)} handler A handler function for the action. The
 *                                    first argument is the new state of the
 *                                    action.
 */
inf.ui.Interface.prototype.listen = function(action, handler) {
    this.actions_[action].push(handler);
};

/**
 * Triggers an action with a boolean state. If no state is specified, the
 * opposite of the current state will be used.
 * @param {string} action The action to trigger.
 * @param {boolean=} opt_state The new state of the action.
 */
inf.ui.Interface.prototype.toggle = function(action, opt_state) {
    var a = this.actions_[action],
        state = (typeof opt_state === 'undefined' ? !this.states[action] :
                 opt_state);
    this.state[action] = state;

    for (var i = 0; i < a.length; i++) {
        a[i](state);
    }
};

/**
 * Triggers an action.
 * @param {string} action The action to trigger.
 */
inf.ui.Interface.prototype.trigger = function(action) {
    var a = this.actions_[action];
    for (var i = 0; i < a.length; i++) {
        a[i](false);
    }
};

/**
 * An interface suitable for users with a keyboard and a mouse.
 * @constructor
 * @extends {inf.ui.Interface}
 */
inf.ui.KeyboardMouseInterface = function() {
    inf.ui.Interface.call(this);

    // Bind to the document.
    var el = document,
        self = this,
        boundHandler = function(e) { self.keyHandler(e); };

    if (el.addEventListener) {
        el.addEventListener('keydown', boundHandler, false);
        el.addEventListener('keyup', boundHandler, false);
    } else if (el.attachEvent) {
        el.attachEvent('onkeydown', boundHandler);
        el.attachEvent('onkeyup', boundHandler);
    }
};
goog.inherits(inf.ui.KeyboardMouseInterface, inf.ui.Interface);

inf.ui.KeyboardMouseInterface.prototype.keyHandler = function(e) {
    // Ye olde browser divide handling of events.
    if (!e) { e = window.event; }

    var which, pressed = (e.type === 'keydown');
    if (typeof e.which !== 'undefined') {
        which = e.which;
    } else {
        which = typeof e.charCode !== 'undefined' ? e.charCode : e.keyCode;
    }

    switch (which) {
        case 32:
            this.trigger('jump');
            break;
        case 37:
            this.toggle('left', pressed);
            break;
        case 39:
            this.toggle('right', pressed);
            break;
        default:
            return;
    }

    if (e.preventDefault) {
        e.preventDefault();
    } else {
        e.returnValue = false;
    }

    return false;
};
