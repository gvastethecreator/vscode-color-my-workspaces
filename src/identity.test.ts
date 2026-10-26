import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  canonicalizeWorkspaceUri,
  legacyFolderIdentity,
  legacyWorkspaceIdentity,
  projectDisplayName,
  truncateLabel,
  workspaceIdentity,
} from "./identity.ts";

describe("canonicalizeWorkspaceUri", () => {
  it("normalizes Windows file URI drive and path case", () => {
    assert.equal(
      canonicalizeWorkspaceUri(
        { scheme: "file", path: "/C:/Users/Ada/Work/Shop/" },
        "win32",
      ),
      "file:///c:/users/ada/work/shop",
    );
  });

  it("preserves remote authority and case-sensitive paths", () => {
    assert.equal(
      canonicalizeWorkspaceUri({
        scheme: "vscode-remote",
        authority: "ssh-remote+Prod",
        path: "/Home/Ada/Shop/",
      }),
      "vscode-remote://ssh-remote+Prod/Home/Ada/Shop",
    );
  });

  it("ignores untitled workspace URIs", () => {
    assert.equal(
      canonicalizeWorkspaceUri({ scheme: "untitled", path: "/Untitled-1" }),
      undefined,
    );
  });
});

describe("workspaceIdentity", () => {
  it("prefers the full saved workspace URI", () => {
    assert.equal(
      workspaceIdentity({
        workspaceFile: { scheme: "file", path: "/C:/work/shop.code-workspace" },
        folders: [
          { scheme: "file", path: "/C:/work/api" },
          { scheme: "file", path: "/C:/work/web" },
        ],
        platform: "win32",
      }),
      "v2:workspace:file:///c:/work/shop.code-workspace",
    );
  });

  it("sorts multi-root folders so reordering does not recolor", () => {
    const first = workspaceIdentity({
      folders: [
        { scheme: "vscode-remote", authority: "ssh-remote+dev", path: "/work/web" },
        { scheme: "vscode-remote", authority: "ssh-remote+dev", path: "/work/api" },
      ],
    });
    const second = workspaceIdentity({
      folders: [
        { scheme: "vscode-remote", authority: "ssh-remote+dev", path: "/work/api" },
        { scheme: "vscode-remote", authority: "ssh-remote+dev", path: "/work/web" },
      ],
    });
    assert.equal(first, second);
    assert.equal(
      first,
      "v2:folders:39:vscode-remote://ssh-remote+dev/work/api39:vscode-remote://ssh-remote+dev/work/web",
    );
  });

  it("length-prefixes folder URIs so delimiter characters cannot collide", () => {
    assert.notEqual(
      workspaceIdentity({
        folders: [
          { scheme: "mem", path: "/a|mem:///b" },
          { scheme: "mem", path: "/c" },
        ],
      }),
      workspaceIdentity({
        folders: [
          { scheme: "mem", path: "/a" },
          { scheme: "mem", path: "/b|mem:///c" },
        ],
      }),
    );
  });

  it("distinguishes equal basenames in different locations", () => {
    assert.notEqual(
      workspaceIdentity({ folders: [{ scheme: "file", path: "/work/one/shop" }] }),
      workspaceIdentity({ folders: [{ scheme: "file", path: "/work/two/shop" }] }),
    );
  });

  it("uses an explicit override before URI inputs", () => {
    assert.equal(
      workspaceIdentity({
        override: "shared-shop",
        folders: [{ scheme: "file", path: "/work/shop" }],
      }),
      "v2:override:shared-shop",
    );
  });

  it("returns nothing without a saved workspace or folder", () => {
    assert.equal(workspaceIdentity({ folders: [] }), undefined);
  });
});

describe("legacy identity", () => {
  it("retains the 0.0.x parent/name algorithm for migrations", () => {
    assert.equal(legacyFolderIdentity("C:\\Users\\ada\\projects\\shop"), "projects/shop");
    assert.equal(
      legacyWorkspaceIdentity({
        workspaceFile: "C:\\work\\shop.code-workspace",
        folders: ["C:\\work\\api"],
      }),
      "shop",
    );
  });
});

describe("projectDisplayName", () => {
  it("prefers a custom label", () => {
    assert.equal(
      projectDisplayName({
        customLabel: "Shop API",
        workspaceName: "shop",
        folders: [{ scheme: "file", path: "/work/api" }],
      }),
      "Shop API",
    );
  });

  it("falls back to a decoded URI folder name", () => {
    assert.equal(
      projectDisplayName({ folders: ["vscode-remote://ssh-remote+dev/work/Shop%20API"] }),
      "Shop API",
    );
  });
});

describe("truncateLabel", () => {
  it("clips long names", () => {
    const label = truncateLabel("abcdefghijklmnopqrstuvwxyz0123", 10);
    assert.equal(label.length, 10);
    assert.equal(label.endsWith("…"), true);
  });
});
