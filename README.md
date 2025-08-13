xs2jIter
========

> XML Stream to JSON Iterator


> Convert XML to JSON and iterate over its top-level elements.


Índex
-----

<!-- vim-markdown-toc GitLab -->

* [Abstract](#abstract)
* [Usage](#usage)
    * [As a command-line tool](#as-a-command-line-tool)
        * [Install](#install)
        * [Console Usage](#console-usage)
        * [Usage from other languages](#usage-from-other-languages)
    * [As a library](#as-a-library)
        * [Install](#install-1)
        * [Syntax](#syntax)
            * [Parameters:](#parameters)
            * [Return value](#return-value)
                * [header](#header)
            * [Array-Like methods:](#array-like-methods)
        * [Example](#example)
* [Contributing](#contributing)

<!-- vim-markdown-toc -->


Abstract
--------

XML is a polymorphic data format able to mix multiple kinds of data with
different structures in a single file (or stream). But, in fact, it is often
used to share simple arrays of objects with the same or similar structure which
are more easily handled in simpler formats like JSON.

Converting XML into JSON directly is almost impossible because XML is actually
a document format and has too many intrincated semantics (attributes, text
chunks...) which doesn't fit fine in simpler formats like JSON.

There are many approaches to do that over the net, bust most of them are
structure-agnostic so they doesn't return any data until the whole XML document
is fully parsed.

Despite the annoying delay, that can also be a problem while parsing huge files
of abovementioned array-like files due to its rapidly increase of memory
requirements or even, in worst cases, ending up in out of memory issues when,
in fact, you only were trying to convert long list of items to JSON array.

> With *xs2jIter* you can stream those array-like files and igerate over each
> asynchronously JSON encoded item not bothering on memory issues bacause
> conversion is done asynchronously.

To do that, xs2jIter expects an XML as its only parameter which can be provided
both as string or thought a stream and returns an iterable object you can
simply iterate (in a synchronous-like way) while input data is actually parsed
asynchronously.

Parsing is done though [node-expat](https://www.npmjs.com/package/node-expat)
and is expected to have an optional DTD and a single top-level tag containing
the array of tags (with fully free structure) over which we will iterate.

That is:

  * 0-Level: Single container (document) tag.
    - Tag name doesn't care.
    - Tag attributes are threated as heading information and can be accessed
      tought *header* attribute of the returned iterable.
    - If there are more top-level elements, they will be ignored.
  * 1-Level: Array of tags:
    - Tag name:
       - Doesn't care (but usually will be the same).
       - Can be read thought "@" property (only for 1-Level tags).

Conversion to JSON is done following the specification of
[converting-between-xml-and-json.html](http://www.xml.com/pub/a/2006/05/31/converting-between-xml-and-json.html)


> **NOTE:** The only change done to that specification was adding a "@"
> attribute at top level of each object with the tag name. This way, even XMLs
> with mixed tag types can be parsed distinguishing each tag type. In case of
> arrays, it is created as non enumerable property to not broke its behaviour.


Usage
-----

### As a command-line tool

Even designed as a javascript library to handle large XML files asynchronously
(see [usage as a library](#asalibrary)) xs2jiter can also be used as command
line tool for data analysis and inspection purposes or as input for non
javascript languages.

#### Install

    npm install -g xs2jiter


#### Console Usage


```sh
$ xs2jiter.js -h

  Usage: xs2jiter [options] [ inputFile ] [, outputFile ]

  XML Stream to JSON Iterator - Convert XML to JSON and iterate over its top-level elements.

  Options:

    -h, --help              output usage information
    -V, --version           output the version number
    -p, --pretty            Output prettyfied JSON chunks (default)
    -r, --raw               Output raw JSON chunks
    -b, --base64            Output base64-encoded JSON chunks
    -n, --noExtraNewline    Don't output extra newline characters
    -a, --Array             Generate valid JSON-Array output.
    -i, --inspect            Inspect data structure
    -D, --iDeep <deep>       Maximum sample values per item (default 5)
    -A, --iPick <addresses>  Adresses to pick whole distinct values (ie: foo.bar,foo.baz) on inspection
```


#### Usage from other languages

As you can figure out, to take advantage of xs2jiter from other languages, you
can simply invoke its cli tool and parse its output.

But... How do you handle asincrony?

You actually don't need to do that: xs2jiter console tool outputs a blank line
after each item to make easier to visually detect boundarys. For automated
parsing you can disable it with *-n* modifier and to avoid fake positives
because of possible newlines in json data, use *base64* output to ensure the
only newlines are actual register separators.

**Example written in PHP:**

    <?php
    $p = popen('xs2jiter -bn /path/to/file.xml', 'r');
    while (false !== $str = fgets($p)) {
        $data = json_decode(base64_decode($str), true);
        // Do something with $data
    };
    ?>


### As a library

#### Install

    npm install --save xs2jiter


#### Syntax

    var x2j = require("xs2jiter");
    var data = x2j(xml [, maxBufferLength]);
        // data        -> Iterable (once) over the whole items.
        // data.header -> Header information (container tag attributes).


##### Parameters:

  * *xml:* XML stream or string.
  * *maxBufferLength:* Specify the internal elements buffer length (Default is 50).

> **NOTE:** Default value for *maxBufferLength* will be usually fine. But lower
> values may help to limit memory usage when having big objects.
> 
> On the other hand, greater values may increase speed if your parsing time
> varies (typically because too different object lengths)


##### Return value

Singleton iterable with *header* property.

    for (var j of data) {...};

...but it has also additional interesting properties and methods:


###### header

Header information (attributes of the document container tag).


##### Array-Like methods:

Following array-like methods are also supprted. They work like its Array
equivalents but returns an iterator instead of an array. For more information
see [abuffer](https://www.npmjs.com/package/abuffer#array-like-methods)
documentation.

  * buff.map(cbk [, thisArg])

  * buff.filter(cbk [,thisArg])



#### Example

    var x2j = require("xs2jiter");
    var Fs = require("fs");
    var xml = Fs.createReadStream("path/to/file.xml");

    var data = x2j(xml);

    console.log("=================================");
    console.log(data.header);
    console.log("=================================");

    for (var j of data) {
        console.log("---------------------------------");
        console.log(JSON.stringify(j, null, 4));
    };




Contributing
------------

If you are interested in contributing with this project, you can do it in many ways:

  * Creating and/or mantainig documentation.

  * Implementing new features or improving code implementation.

  * Reporting bugs and/or fixing it.
  
  * Sending me any other feedback.

  * Whatever you like...
    
Please, contact-me, open issues or send pull-requests thought [this project GIT repository](https://github.com/bitifet/xs2jiter)

