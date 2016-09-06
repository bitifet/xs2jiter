#!/usr/bin/env node
// bin/xs2jiter.js
// ===============
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
var x2j = require("../lib/xs2jiter.js");


module.exports = x2j;

if(module.parent === null) main();


function main(){
    var pkg = require("../package.json");
    var Fs = require("fs");
    var program = require("commander");
    function list(val){return val.split(/\s*,\s*/);};

    program
        .version(pkg.version)
        .description(pkg.description)
        .usage("[options] [ inputFile ] [, outputFile ]")
        //.option('-i, --integer <n>', 'An integer argument', parseInt)
        .option("-i --inspect [addresses]", "Inspect data structure", list)
        .option("-I --inspectDeep <deep>", "Inspect maxVals (default 5)", parseInt)
        .option("-p, --pretty", "Output prettyfied JSON chunks (default)")
        .option("-r, --raw", "Output raw JSON chunks")
        .option("-b, --base64", "Output base64-encoded JSON chunks")
        .option("-n, --noExtraNewline", "Don't output extra newline characters")
        .parse(process.argv)
    ;

    var iFile = program.args[0] // Input file (default <STDIN>)
        ? Fs.createReadStream(program.args[0])
        : process.stdin
    ;

    var oFile = program.args[1] // Input file (default <STDIN>)
        ? Fs.createWriteStream(program.args[1])
        : process.stdout
    ;

    var js = x2j(iFile); 

    var oFilters = {
        base64: function(data){
            return new Buffer(JSON.stringify(data)).toString('base64');
        },
        pretty: function(data){
            return JSON.stringify(data, null, 4);
        },
        raw: function(data){
            return JSON.stringify(data);
        },
    };


    if (program.inspect) {
        console.error("Analyzing data");
        console.error("==============");
        console.error("  More info at https://www.npmjs.com/package/inspectorslack");
        console.error("  Please Wait...");
        console.log(
            require("inspectorslack")(js
                , program.inspect
                , program.inspectDeep
            ).join("\n")
        );
    } else {
        var filtered = false;
        for (let f in oFilters) {
            if (program[f]) {
                js = js.map(oFilters[f]);
                filtered = true;
            };
        };
        if(! filtered) js = js.map(oFilters.pretty);

        for (var j of js) {
            if (! program.noExtraNewline) oFile.write("\n");
            oFile.write(j+"\n");
        };
    };

};


