#!/usr/bin/env node
//
// http://www.xml.com/pub/a/2006/05/31/converting-between-xml-and-json.html
//
// ////////////////////////////////////////////////////////////////////////

"use strict";

var expat = require('node-expat')
var parser = new expat.Parser('UTF-8')

var Fs = require("fs");


var xml = String(Fs.readFileSync(__dirname+"/data.xml"));


var data = {
    master: {},
};

var stack = [];

var currElem = {
    name: null,
    text: null,
    attrs: {},
    target: data.master,
    targetAddr: [data, "master"],
};


parser.on('startElement', function (name, attrs) {

    var target = {};
    if (currElem.target[name] === undefined) {
        var targetAddr = [currElem.target, name];
        currElem.target[name] = target;
    } else if (currElem.target[name] instanceof Array) {
        var targetAddr = [currElem.target[name], currElem.target[name].length];
        currElem.target[name].push(target);
    } else {
        currElem.target[name] = [
            currElem.target[name]
            , target
        ];
        var targetAddr = [currElem.target[name], 1];
    }
    stack.push(currElem);

    currElem = {
        name: name,
        text: null,
        attrs: attrs,
        target: target,
        targetAddr: targetAddr,
    };
    ///console.log("startElement:", name, attrs)
})

parser.on('endElement', function (name) {

    var e = currElem;
    currElem = stack.pop();

    for (var k in e.attrs) {
        e.target["@"+k] = e.attrs[k];
    };

    if (! Object.keys(e.target).length) {
        if (e.text === null) {
            e.target = null; // FIXME This won't work!!
            e.targetAddr[0][e.targetAddr[1]] = null; // But this yes!
        } else {
            e.target = e.text; // FIXME This won't work!!
            e.targetAddr[0][e.targetAddr[1]] = e.text; // But this yes!
        };
    } else if (e.text !== null) {
        e.target["#text"] = e.text;
    };



    console.log("--------------------------");
    console.log(JSON.stringify(e, null, 4));
    console.log("--------------------------");



    ///console.log("endElement:", name)
})

parser.on('text', function (text) {
    if (currElem.text === null) {
        if (! text.trim().length) return; // Reject trailing spaces.
        currElem.text = "";
    };
    currElem.text += text;
    console.log(currElem.name+" - TEXT:", '"'+text+'"')
})

parser.on('error', function (error) {
    console.error("error:", error)
})

parser.write(xml)


console.log("==========================");
console.log(JSON.stringify(data.master, null, 4));


