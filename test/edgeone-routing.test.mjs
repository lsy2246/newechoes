import assert from "node:assert/strict";
import test from "node:test";

test("EdgeOne route patch excludes API and internal endpoints from clean-url slash rewrites", async () => {
  const { patchEdgeoneConfigText } = await import("../src/plugins/edgeone-routing-integration.js");

  const input = JSON.stringify({
    version: 3,
    conf: { redirects: [] },
    routes: [
      { src: "^/(.+)/$", headers: { Location: "/$1" }, status: 308 },
      { src: "^/([^.]+[^/.])$", dest: "/$1/", continue: true },
      { handle: "filesystem" },
      { src: "^/_server-islands/([^/]+?)$" },
      { src: "^/_image$" },
      { src: "^/api/google-photos$" },
      { src: "^/(.*)$" },
    ],
  });

  const output = patchEdgeoneConfigText(input);
  const parsed = JSON.parse(output);
  const slashRewriteRoute = parsed.routes.find(
    (route) => route.dest === "/$1/" && route.continue === true,
  );

  assert.ok(slashRewriteRoute);
  assert.equal(
    slashRewriteRoute.src,
    "^/(?!api(?:/|$)|_image$|_server-islands(?:/|$))([^.]+[^/.])$",
  );
});
