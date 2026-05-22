/* eslint-env mocha */
const { expect } = require('chai');
const fs = require('fs');
const path = require('path');

const fixturesDir = path.join(__dirname, 'fixtures');
const simpleXML = path.join(fixturesDir, 'simple.xml');
const malformedXML = path.join(fixturesDir, 'malformed.xml');

describe('Library: lib/xs2jiter', function () {
  this.timeout(10000);

  it('exports a function', () => {
    const x2j = require('../lib/xs2jiter.js');
    expect(x2j).to.be.a('function');
  });

  describe('getHeader()', function () {
    it('resolves header asynchronously with stream input', async () => {
      const x2j = require('../lib/xs2jiter.js');
      const rs = fs.createReadStream(simpleXML);
      const iter = x2j(rs);

      const header = await iter.getHeader();
      expect(header).to.be.an('array').with.lengthOf(2);
      expect(header[0]).to.equal('root');
      expect(header[1]).to.be.an('object');
      expect(header[1]).to.have.property('id', 'R');
    });

    it('resolves header asynchronously with string input', async () => {
      const x2j = require('../lib/xs2jiter.js');
      const xml = fs.readFileSync(simpleXML, 'utf8');
      const iter = x2j(xml);

      const header = await iter.getHeader();
      expect(header).to.be.an('array').with.lengthOf(2);
      expect(header[0]).to.equal('root');
      expect(header[1]).to.have.property('id', 'R');
    });
  });

  describe('iteration', function () {
    it('iterates over all items with string input', async () => {
      const x2j = require('../lib/xs2jiter.js');
      const xml = fs.readFileSync(simpleXML, 'utf8');
      const iter = x2j(xml);

      const items = [];
      for await (const item of iter) {
        items.push(item);
      }
      expect(items).to.have.lengthOf(3);
      items.forEach((item, i) => {
        expect(item).to.have.property('@', 'item');
        expect(item).to.have.property('@a', String(i + 1));
        expect(item.name).to.equal(['One', 'Two', 'Three'][i]);
        expect(item.value).to.equal(String(i + 1));
      });
    });

    it('iterates over all items with stream input', async () => {
      const x2j = require('../lib/xs2jiter.js');
      const rs = fs.createReadStream(simpleXML);
      const iter = x2j(rs);

      const items = [];
      for await (const item of iter) {
        items.push(item);
      }
      expect(items).to.have.lengthOf(3);
      items.forEach((item, i) => {
        expect(item).to.have.property('@', 'item');
        expect(item.name).to.equal(['One', 'Two', 'Three'][i]);
      });
    });

    it('supports array-like .map() and .filter() methods', () => {
      const x2j = require('../lib/xs2jiter.js');
      const xml = fs.readFileSync(simpleXML, 'utf8');
      const iter = x2j(xml);

      expect(iter.map).to.be.a('function');
      expect(iter.filter).to.be.a('function');
    });
  });
});
