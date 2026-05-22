# xs2jiter – agent guide

## Commands

```sh
npm test                 # full suite (mocha + nyc coverage)
npx mocha "test/**/*.spec.js"                      # same without coverage
npx mocha "test/lib.spec.js"                       # library tests only
npx mocha "test/cli.spec.js"                       # CLI tests only
```

No linter, typechecker, formatter, or CI configured. No pre-commit hooks.

## Entrypoints

- **Library** – `lib/xs2jiter.js` → default export `x2j(xml, bufferMaxLength?)`  
  `xml` can be a string or a `Stream` (readable). Returns an async iterable with a `.getHeader()` method that resolves to `[rootTagName, rootAttrs]`.
- **CLI** – `bin/xs2jiter.js` → registered as `xs2jiter`. Spawn via `node bin/xs2jiter.js` or global install.

## XML format expected

```
<root attrs…>           ← 0-level container (attrs → iter.getHeader())
  <item attrs…>         ← 1-level items (iterated over)
    <field>…</field>    ← 2+ levels, free structure
  </item>
  <item>…</item>
</root>
```

Only the first top-level tag is used. Each item gets a non-enumerable `@` property with the tag name.

## CLI flags

| Flag | Effect |
|------|--------|
| `-p` / `--pretty` | Pretty-printed JSON (default) |
| `-r` / `--raw` | Compact JSON |
| `-b` / `--base64` | Base64-encoded JSON lines |
| `-n` / `--noExtraNewline` | Suppress blank-line separators |
| `-a` / `--Array` | Wrap output in `[…]` |
| `-i` / `--inspect` | Schema inspection mode |
| `-D` / `--iDeep` | Max samples per field in inspect mode (default 5) |
| `-A` / `--iPick` | Comma-separated field addresses for distinct-value inspection |

## Testing quirks

- Lib tests: `this.timeout(10000)`. CLI tests: `this.timeout(20000)`.
- CLI tests spawn node on `bin/xs2jiter.js` via `process.execPath`.
- Fixtures live in `test/fixtures/`.
- The CLI helper writes output to a temp file in the fixtures dir and cleans up.

## API changes from 1.x

- `.header` (sync, deasync-based) → use `await iter.getHeader()` (async, no deasync)
- `extend` dependency removed — uses spread operator instead
- `abuffer` dependency removed — buffer inlined, fully async (no deasync anywhere)
- Iteration is now async: use `for await (const item of iter)` instead of `for (const item of iter)`
- Leaf text nodes now correctly propagate to parent objects

## Dependencies note

Depends on `node-expat` (native C++ addon). Requires build tools (node-gyp/python) on `npm install`.
