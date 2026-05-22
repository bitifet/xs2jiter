// lib/xs2jiter - index.js
// =======================
// 
// XML Stream to JSON Iterator
// -- Convert XML to JSON and iterate over its // top-level elements.
//
// Expects structured data codified in xml:
//
//   * 0-Level: Single container (document) tag (tag name doesn't care).
//   * 1-Level: Array of tags:
//     - Tag name:
//        - Doesn't care (but usually will be the same).
//        - Can be read thought "@" property (only for 1-Level tags).
//
// Inspired in: 
// http://www.xml.com/pub/a/2006/05/31/converting-between-xml-and-json.html
//
// @author: Joan Miquel Torres <jmtorres@112ib.com>
// @company: GEIBSAU
// @license: GPL
//
// ////////////////////////////////////////////////////////////////////////
"use strict";

var expat = require('node-expat');
var Stream = require("stream");

// In-place replacement for abuffer@0.0.4 — no deasync, fully async
function AsyncBuffer(maxLength, stopCbk, resumeCbk) {
    this._stack = [];
    this._queue = [];
    this._maxLength = maxLength;
    this._stopCbk = stopCbk;
    this._resumeCbk = resumeCbk;
    this._stopped = false;
    this._eof = false;
}
AsyncBuffer.prototype.push = function(data) {
    if (this._eof) throw new Error("push after EOF");
    if (this._queue.length) {
        this._queue.shift().resolve(data);
    } else {
        this._stack.push(data);
        if (!this._stopped && this._maxLength && this._stack.length >= this._maxLength) {
            this._stopCbk();
            this._stopped = true;
        }
    }
};
AsyncBuffer.prototype.unshift = function(data) {
    if (this._eof) throw new Error("unshift after EOF");
    if (this._queue.length) {
        this._queue.pop().resolve(data);
    } else {
        this._stack.unshift(data);
        if (!this._stopped && this._maxLength && this._stack.length >= this._maxLength) {
            this._stopCbk();
            this._stopped = true;
        }
    }
};
AsyncBuffer.prototype.eof = function(set) {
    if (set !== undefined) {
        this._eof = true;
        for (var i = 0; i < this._queue.length; i++) this._queue[i].reject("EOF");
    }
    return this._eof;
};
AsyncBuffer.prototype.pop = function() {
    var self = this;
    if (self._stack.length) {
        var data = self._stack.pop();
        if (self._stopped && self._stack.length < self._maxLength) {
            self._resumeCbk();
            self._stopped = false;
        }
        return Promise.resolve(data);
    }
    if (self._eof) return Promise.reject("EOF");
    return new Promise(function(resolve, reject) {
        self._queue.push({ resolve: resolve, reject: reject });
    });
};
AsyncBuffer.prototype[Symbol.asyncIterator] = function() {
    var self = this;
    return {
        next: function() {
            return self.pop().then(function(data) {
                return { value: data, done: false };
            }, function(err) {
                if (err === "EOF") return { value: undefined, done: true };
                throw err;
            });
        }
    };
};
AsyncBuffer.prototype.map = function(cbk, thisArg) {
    var self = this;
    return _asyncIterable(function() {
        var it = self[Symbol.asyncIterator]();
        return {
            next: function() {
                return it.next().then(function(n) {
                    if (n.done) return n;
                    return { value: cbk.call(thisArg, n.value), done: false };
                });
            }
        };
    });
};
AsyncBuffer.prototype.filter = function(cbk, thisArg) {
    var self = this;
    return _asyncIterable(function() {
        var it = self[Symbol.asyncIterator]();
        return {
            next: function step() {
                return it.next().then(function(n) {
                    if (n.done) return n;
                    if (cbk.call(thisArg, n.value)) return n;
                    return it.next().then(step);
                });
            }
        };
    });
};
Object.defineProperty(AsyncBuffer.prototype, "length", {
    get: function() { return this._stack.length - this._queue.length; }
});
function _asyncIterable(factory) {
    var obj = {};
    obj[Symbol.asyncIterator] = factory;
    return obj;
}

module.exports = function x2j(xml, bufferMaxLength){

    var parser = new expat.Parser('UTF-8');

    bufferMaxLength || (bufferMaxLength = 50);
    var deep = 0; // Currenly parsing tag deep level:
        //        0 => Outside any tag.
        //        1 => Inside Document Container tag
        //        2 => Root level item tags.
        //      >=3 => Inner tags.
    var currElem; // Currently parsing tag data.
    var stack = []; // Tag data stack.
    var stopped = false;

    // I/O Buffers initialization:
    // ---------------------------
    var header = (function(){ // Simple header async storage//{{{
        var setter;
        var getter = new Promise(function(resolve, reject){
            setter = resolve;
        });
        return {
            set: setter,
            get: getter,
        };
    })();//}}}
    var ibuffer = [];
    var obuffer = new AsyncBuffer( // Actual obuffer initialization//{{{
        bufferMaxLength
        , function(){
            xml.pause && xml.pause(); // Pause input if is stream.
            stopped = true;
            return parser.stop();
        }
        , function(){
            xml.resume && xml.resume(); // Resume input if is stream.
            ibuffer.map(parser.write.bind(parser));
            ibuffer = [];
            stopped = false;
            return parser.resume();
        }
    );//}}}
    Object.defineProperty(obuffer, "getHeader", { // Adds async header accessor//{{{
        enumerable: false,
        configurable: false,
        value: async function get_header() {//{{{
            return await header.get;
        },//}}}
    });//}}}
    // -----------------------------------------

    // Parser event handlers:
    // ----------------------
    parser.on('startElement', function (name, attrs) {//{{{

        var target = {}; // Create new fresh target.
        switch (++deep) {
        case 1: // Document container tag.
            // Just read header info.
            return header.set([name, attrs]);
        case 2:
            // Don't preserve top level elements.
            // ...but let's create currElem instance to collect inner data.
            break;
        default:
            if (
                // Current element hasn't yet any element with this tag name.
                currElem.target[name] === undefined
            ) {
                currElem.target[name] = target; // Assign target directly to that tag name.
            } else if (
                // Current element has element with this tag name and it's an array.
                currElem.target[name] instanceof Array
            ) {
                currElem.target[name].push(target); // Push new target to it.
            } else { // Current element has element with this tag name and it isn't an array.
                currElem.target[name] = [ // Migrate to an array structure.
                    currElem.target[name]
                    , target
                ];
            };
            // Push currElem to stack
            stack.push(currElem);
        };

        // Create new fresh element:
        currElem = {
            name: name,
            text: null,
            attrs: attrs,
            target: target,
        };

    });//}}}
    parser.on('endElement', function (name) {//{{{

        if (deep >= 2) {

            // Load attributes:
            for (var k in currElem.attrs) {
                currElem.target["@"+k] = currElem.attrs[k];
            };

            // Handle and load subtags and text chunks:
            if (! Object.keys(currElem.target).length) { // *** No child tags ***
                if (currElem.text === null) { // *** Empty tag => null ***//{{{
                    currElem.target = null;
                }//}}}
                else { // *** Only text tag => string ***//{{{
                    currElem.target = currElem.text;
                };//}}}
            } else if (currElem.text !== null) { // *** Tag with childs and text => #text ***//{{{
                currElem.target["#text"] = currElem.text;
            }//}}}
            else { // *** Single tag type and no attributes or text => (Become Array) ***//{{{
                var finalKeys = Object.keys(currElem.target);
                if (
                    finalKeys.length == 1 // *** All direct sons are same tag type ***
                    && (currElem.target[finalKeys[0]] instanceof Array) // *** ...and contents is an Array ***
                ) currElem.target = currElem.target[finalKeys[0]]; // Collapse (avoiding unnecessary sublevels.
            };//}}}

            if (deep == 2) { // Top elemnt tag:
                // Label tag name as "@" (except for arrays):
                if (! (currElem.target instanceof Array)) {
                    currElem.target = {"@": currElem.name, ...currElem.target};
                } else {
                    Object.defineProperty(currElem.target, "@", {
                        enumerable: false,
                        value: currElem.name,
                    });
                };
                // Output it:
                obuffer.unshift(currElem.target);
            } else if (stack.length > 0) {
                // Propagate collapsed value up to parent reference
                var parentElem = stack[stack.length - 1];
                if (parentElem.target[name] instanceof Array) {
                    parentElem.target[name][parentElem.target[name].length - 1] = currElem.target;
                } else {
                    parentElem.target[name] = currElem.target;
                }
            };

            currElem = stack.pop();

        };

        if (! --deep) obuffer.eof(true); // First level (document) tag closed.

    });//}}}
    parser.on('text', function (text) {//{{{
        if (deep <= 1) return;
        if (currElem.text === null) {
            if (! text.trim().length) return; // Reject trailing spaces.
            currElem.text = "";
        };
        currElem.text += text;
    })//}}}
    parser.on('error', function (error) {//{{{
        throw error;
    });//}}}
    // ----------------------

    // Start parsing process:
    // ----------------------
    if (xml instanceof Stream) {
        xml.on("data", function (data){
            if (stopped) {
                ibuffer.push(data);
            } else {
                parser.write(data);
            };
        });
        xml.on("error", function(err) {
            throw err;
        });
    } else {
        parser.write(String(xml));
    };
    // ----------------------

    // Returns (iterable) obuffer interface with getHeader() method:
    return obuffer;

};

