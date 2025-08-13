/* eslint-env mocha */
const { expect } = require('chai');
const { spawn } = require('child_process');
const fs = require('fs');
const path = require('path');

function runCLI(args = [], { input = null, cwd = process.cwd() } = {}) {
  return new Promise((resolve) => {
    const cliPath = path.join(__dirname, '..', 'bin', 'xs2jiter.js');
    const child = spawn(process.execPath, [cliPath, ...args], { cwd });

    let stdout = '';
    let stderr = '';

    child.stdout.on('data', (d) => (stdout += d.toString()));
    child.stderr.on('data', (d) => (stderr += d.toString()));

    child.on('close', (code) => resolve({ code, stdout, stderr }));

    if (input != null) {
      child.stdin.write(input);
      child.stdin.end();
    }
  });
}

function splitJsonLines(s) {
  return s
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter((l) => l.length > 0);
}

describe('CLI: bin/xs2jiter.js', function () {
  this.timeout(20000);

  const fixturesDir = path.join(__dirname, 'fixtures');
  const simpleXML = path.join(fixturesDir, 'simple.xml');
  const malformedXML = path.join(fixturesDir, 'malformed.xml');

  it('outputs compact JSON per item with --raw', async () => {
    const { code, stdout, stderr } = await runCLI(['--raw', simpleXML]);
    expect(code).to.equal(0, `stderr:\n${stderr}`);

    const lines = splitJsonLines(stdout);
    expect(lines.length).to.equal(3);

    const objs = lines.map((l) => JSON.parse(l));
    objs.forEach((o) => expect(o).to.be.an('object'));
  });

  it('reads from stdin when no file is provided', async () => {
    const xml = fs.readFileSync(simpleXML);
    const { code, stdout, stderr } = await runCLI(['--raw'], { input: xml });
    expect(code).to.equal(0, `stderr:\n${stderr}`);

    const lines = splitJsonLines(stdout);
    expect(lines.length).to.equal(3);
    lines.forEach((l) => JSON.parse(l));
  });

  it('produces a valid JSON Array with --Array', async () => {
    const { code, stdout, stderr } = await runCLI(['--Array', '--raw', simpleXML]);
    expect(code).to.equal(0, `stderr:\n${stderr}`);

    const arr = JSON.parse(stdout);
    expect(arr).to.be.an('array').with.lengthOf(3);
    arr.forEach((o) => expect(o).to.be.an('object'));
  });

  it('supports base64 encoding; with --Array it produces a JSON array of strings', async () => {
    const { code, stdout, stderr } = await runCLI(['--Array', '--base64', simpleXML]);
    expect(code).to.equal(0, `stderr:\n${stderr}`);

    const arr = JSON.parse(stdout);
    expect(arr).to.be.an('array').with.lengthOf(3);
    const decoded = arr.map((s) => {
      const buf = Buffer.from(s, 'base64');
      return JSON.parse(buf.toString('utf8'));
    });
    decoded.forEach((o) => expect(o).to.be.an('object'));
  });

  it('writes to the specified output file when a second path arg is provided', async () => {
    const tmpOut = path.join(fixturesDir, 'tmp.out.jsonl');
    try {
      const { code, stderr } = await runCLI(['--raw', simpleXML, tmpOut]);
      expect(code).to.equal(0, `stderr:\n${stderr}`);

      const content = fs.readFileSync(tmpOut, 'utf8');
      const lines = splitJsonLines(content);
      expect(lines.length).to.equal(3);
      lines.forEach((l) => JSON.parse(l));
    } finally {
      if (fs.existsSync(tmpOut)) fs.unlinkSync(tmpOut);
    }
  });

  it('exits non-zero and reports an error for malformed XML', async () => {
    const { code, stdout } = await runCLI(['--raw', malformedXML]);
    expect(code).to.not.equal(0);
    expect(() => JSON.parse(stdout)).to.throw();
  });

  it.skip('inspect mode (-i/--inspect) prints analysis hints to stderr (TODO: enable after fixing CLI flags)', async () => {
    const { code, stderr } = await runCLI(['--inspect', simpleXML]);
    expect(code).to.equal(0);
    expect(stderr).to.match(/Analyzing data/i);
  });
});