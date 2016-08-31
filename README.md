xs2jIter
========

> XML Stream to JSON Iterator


> Convert XML to JSON and iterate over its top-level elements.


XML is a polymorphic data format able to mix multiple kinds of data with
different structures in a single file (or stream). But, in fact, it is often
used to share simple arrays of objects with the same or similar structure which
are more easily handled in simpler formats like JSON.

Converting XML into JSON directly is almost impossible because XML is actually
a document format and has too many intrincated semantics (attributes, text
chunks...) which doesn't fit fine in simpler formats like JSON.

There are many approaches to do that over the net, bust most of them are
structure-agnostic so they doesn't return any data after the whole XML document
is fully parsed.

That can be a problem when parsing huge files of abovementioned array-like
files ending up in out of memory issues when trying to convert to JSON array.


> *xs2jIter* let you to parse iterate those files by chunks of JSON encoded
> elements.

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


> **NOTE:** The only change I did was adding a "@" attribute at tot level of
> each object with the tag name. This way, even XMLs with mixed tag types can
> be parsed distinguishing each tag type. In case of arrays, it is created as
> non enumerable property to not broke its behaviour.



Usage
-----

### Install

    npm install --save xs2jiter


### Syntax

    var x2j = require("xs2jiter");
    var data = x2j(xml [, maxBufferLength]);
        // data        -> Iterable (once) over the whole items.
        // data.header -> Header information (container tag attributes).


**Parameters:**

  * *xml:* XML stream or string.
  * *maxBufferLength:* Specify the internal elements buffer length (Default is 50).

> **NOTE:** Default value for *maxBufferLength* will be usually fine. But lower
> values may help to limit memory usage when having big objects.
> 
> On the other hand, greater values may increase speed if your parsing time
> varies (typically because too different object lengths)


**Return value:** Singleton iterable with *header* property.


### Example

    var x2j = require("xs2jiter");
    var xml = Fs.createReadStream("path/to/file.xml");

    var data = x2j(xml);

    console.log("=================================");
    console.log(data.header);
    console.log("=================================");

    for (var j of data) {
        console.log("---------------------------------");
        console.log(JSON.stringify(j, null, 4));
    };



