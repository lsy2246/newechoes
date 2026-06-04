import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import ts from "typescript";

async function loadGooglePhotosModule(fetchAssetWithRelayFallback) {
  const sourcePath = "src/lib/google-photos/node.ts";
  const source = readFileSync(sourcePath, "utf8");
  const patchedSource = source
    .replace(
      'import { supportsGooglePhotosParsing } from "../../platform/runtime/index.js";',
      "const supportsGooglePhotosParsing = () => true;",
    )
    .replace(
      /import type \{ GooglePhotoAlbum, GooglePhotoItem \} from "\.\/shared\.js";\s*import \{ fetchSharedAlbumHtml, toAlbum, toPhotoItems \} from "\.\/shared\.js";/,
      `const fetchSharedAlbumHtml = globalThis.__googlePhotosTestFetchSharedAlbumHtml;
const toAlbum = (album) => ({
  id: typeof album?.[0] === "string" ? album[0] : null,
  title: typeof album?.[1] === "string" ? album[1] : null,
  coverUrl: null,
  fallbackCoverUrl: null,
});
const toPhotoItems = () => [];`,
    );

  assert.notEqual(patchedSource, source, "test module import shim was not applied");

  globalThis.__googlePhotosTestFetchSharedAlbumHtml = async (shareUrl) => {
    const response = await fetchAssetWithRelayFallback(shareUrl);
    return {
      html: await response.text(),
      resolvedUrl: response.url,
    };
  };

  const { outputText } = ts.transpileModule(patchedSource, {
    compilerOptions: {
      module: ts.ModuleKind.ESNext,
      target: ts.ScriptTarget.ES2022,
    },
    fileName: sourcePath,
  });

  const moduleUrl = `data:text/javascript;base64,${Buffer.from(outputText).toString("base64")}`;
  return import(moduleUrl);
}

function makeAlbumHtml({ shareKey = "share-key-from-html" } = {}) {
  const album = [];
  album[0] = "album-id";
  album[1] = "Album";
  album[19] = shareKey;

  const initData = [null, [], "next-page-token", album, [], 0];

  return `<!doctype html>
<script class="ds:1">AF_initDataCallback({key:"ds:1",data:${JSON.stringify(initData)}});</script>
<script>window.WIZ_global_data = {"FdrFJe":"fresh-fsid","cfb2h":"fresh-bl"};</script>`;
}

function decodeCursor(cursor) {
  return JSON.parse(Buffer.from(cursor, "base64url").toString("utf8"));
}

test("Google Photos pagination cursor keeps share key when initial HTML came through a relay", async () => {
  const html = makeAlbumHtml();
  const googlePhotos = await loadGooglePhotosModule(async () => ({
    ok: true,
    status: 200,
    statusText: "OK",
    url: "https://proxy.example/download?url=https%3A%2F%2Fphotos.app.goo.gl%2Falbum",
    text: async () => html,
  }));

  const page = await googlePhotos.fetchGooglePhotosPage({
    shareUrl: "https://photos.app.goo.gl/album",
  });

  assert.equal(decodeCursor(page.nextCursor).shareKey, "share-key-from-html");
});

test("Google Photos batch parser reports rejected pagination tokens clearly", async () => {
  const googlePhotos = await loadGooglePhotosModule(async () => {
    throw new Error("fetch should not be called");
  });

  const rejectedTokenResponse = `)]}'

103
[["wrb.fr","snAcKc",null,null,null,[5],"generic"],["di",61]]
25
[["e",4,null,null,139]]`;

  assert.throws(
    () => googlePhotos.parseBatchExecuteResponse(rejectedTokenResponse),
    /Google Photos pagination token was rejected/,
  );
});
