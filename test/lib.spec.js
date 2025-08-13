/* eslint-env mocha */
const { expect } = require('chai');
const fs = require('fs');
const path = require('path');

describe('Library: lib/xs2jiter', function () {
  this.timeout(10000);

  it('exports a function', () => {
    const x2j = require('../lib/xs2jiter.js');
    expect(x2j).to.be.a('function');
  });

  it('header returns [rootTagName, rootAttributes] synchronously', () => {
    const x2j = require('../lib/xs2jiter.js');
    const xmlPath = path.join(__dirname, 'fixtures', 'simple.xml');
    const rs = fs.createReadStream(xmlPath);
    const iter = x2j(rs);

    const header = iter.header;
    expect(header).to.be.an('array').with.lengthOf(2);
    expect(header[0]).to.equal('root');
    expect(header[1]).to.be.an('object');
    expect(header[1]).to.have.property('id', 'R');
  });
});