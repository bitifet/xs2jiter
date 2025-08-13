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
const x2j = require("../lib/xs2jiter.js");
const defaultInspectionDeep = 5;
const defaultFilter = "pretty";


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
        .option("-p, --pretty", "Output prettyfied JSON chunks (default)")
        .option("-r, --raw", "Output raw JSON chunks")
        .option("-b, --base64", "Output base64-encoded JSON chunks")
        .option("-n, --noExtraNewline", "Don't output extra newline characters")
        .option("-a, --Array", "Generate valid JSON-Array output.")
        .option("-i, --inspect", "Inspect data structure")
        .option("-D, --iDeep <deep>", "Maximum sample values per item (default 5)", parseInt)
        .option("-A, --iPick <addresses>", "Adresses to pick whole distinct values (ie: foo.bar,foo.baz) on inspection", list)
        .parse(process.argv)
    ;

    var iFile = program.args[0] // Input file (default <STDIN>)
        ? Fs.createReadStream(program.args[0])
        : process.stdin
    ;

    var oFile = program.args[1] // Output file (default <STDOUT>)
        ? Fs.createWriteStream(program.args[1])
        : process.stdout
    ;

    var js = x2j(iFile); 

    var oFilters = {
        base64: function(data){
            var b64 = Buffer.from(JSON.stringify(data)).toString('base64');
            return program.Array
                ? '"' + b64 + '"'
                : b64
            ;
        },
        pretty: function(data){
            return JSON.stringify(data, null, 4);
        },
        raw: function(data){
            return JSON.stringify(data);
        },
    };


    if (program.inspect) {
        console.error("==================================================================");
        console.error("  ___ Analyzing data ___");
        console.error("  HINTS:");
        console.error("    * Use -D <deep> to set maximum sample values per item.");
        console.error("    * Use -A <address>[,<address>...] to get all distinct values");
        console.error("      of given items.");
        console.error("    * More info at https://www.npmjs.com/package/inspectorslack");
        console.error("  Please Wait...");
        console.error("==================================================================");
        console.error("");
        console.log(
            require("inspectorslack")(js
                , program.iPick || ""
                , program.iDeep || defaultInspectionDeep
            ).join("\n")
        );
    } else {
        let filter = oFilters[defaultFilter];
        for (let f in oFilters) {
            if (program[f]) {
                filter = oFilters[f];
                break;
            };
        };
        js = js.map(filter);

        if (program.Array) oFile.write("[");
        let addComma;
        for (var j of js) {
            if (addComma) oFile.write(",");
            if (addComma === undefined) {
                addComma = program.Array;
            } else if (! program.noExtraNewline) {
                oFile.write("\n");
            };
            oFile.write("\n");
            oFile.write(j);
        };
        oFile.write("\n");
        if (program.Array) oFile.write("]");
    };

};


