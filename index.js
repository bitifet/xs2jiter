// x2ajs - index.js
// ================
// 
// XML to Asynchronous JSON Stream
//
// -- Convert XML to JSON in complete chunks.
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

var oextend = require("extend");
var expat = require('node-expat');
var parser = new expat.Parser('UTF-8');
var abuffer = require("abuffer");
var deasync = require("deasync");

function parseXml(xml, bufferMaxLength){

    bufferMaxLength || (bufferMaxLength = 50);
    var deep = 0; // Currenly parsing tag deep level:
        //        0 => Outside any tag.
        //        1 => Inside Document Container tag
        //        2 => Root level item tags.
        //      >=3 => Inner tags.
    var currElem; // Currently parsing tag data.
    var stack = []; // Tag data stack.

    // I/O Buffer (return value) initialization:
    // -----------------------------------------
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
    var buffer = new abuffer({ // Actual buffer initialization//{{{
        maxLength: bufferMaxLength,
        stop: function(){return parser.stop();},
        resume: function(){return parser.resume();},
    });//}}}
    Object.defineProperty(buffer, "header", { // Adds header property (getter)//{{{
        enumerable: false,
        configurable: false,
        get: function get_header() {//{{{
            var done = false;
            var data;
            var err;
            header.get.then(function(rcvData){
                data = rcvData;
                done = true;
            }).catch(function(rcvErr){
                err = rcvErr;
                done = true;
            });
            deasync.loopWhile(function(){return !done;});
            if (err) throw err;
            return data;
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
            // ...but let's create currElement instance to collect inner data.
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

            if (deep == 2) { // Label top element tag name as "@"//{{{
                buffer.unshift(
                    oextend({"@": currElem.name}, currElem.target)
                );
            };//}}}

            currElem = stack.pop();

        };

        if (! --deep) buffer.eof(true); // First level (document) tag closed.

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
    parser.write(xml);
    // ----------------------

    // Returns (iterable) buffer interface wiht header property:
    return buffer;

};

module.exports = parseXml;
