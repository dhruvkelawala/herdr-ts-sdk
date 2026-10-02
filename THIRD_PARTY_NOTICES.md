# Third-party notices

This unofficial transport fork derives from Dillon Mulroy's Herdr TypeScript SDK.
The complete original MIT copyright and permission notice is in `LICENSE` and
accompanies every package tarball.

Runtime dependencies are external npm dependencies. No dependency implementation
is bundled. Effect, `@effect/platform-node-shared`, and Ajv use MIT and supply their own
notices in their respective npm distributions. Development tools and test
fixtures are excluded from this distribution.

The bundled protocol-20 schema and generated declarations derive from the
[Herdr native API at v0.8.2](https://github.com/herdrdev/herdr/tree/v0.8.2),
distributed under Apache-2.0. The complete, unchanged upstream license is included
at `licenses/HERDR-APACHE-2.0.txt`. Its upstream Git blob is
`261eeb9e9f8b2b4b0d119366dda99c6fd7d35c64`.

The upstream v0.8.2 tree contains no native `NOTICE` file, so no upstream notice
text is omitted or invented. No native executable or vendored native dependency
implementation is included.

SumoStudio reformats the captured schema and adds an attribution `$comment`;
native protocol schemas are unchanged. The TypeScript generator adapts the
method/result map to protocol 20 and emits SumoStudio modification and
Apache-2.0 notices on every generated declaration. Other SDK transport code
retains the original MIT licence. Package metadata records both licences as
`(MIT AND Apache-2.0)`.

No credential or private SumoStudio project data is included.
