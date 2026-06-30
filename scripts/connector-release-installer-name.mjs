#!/usr/bin/env node
import { readCanonicalManifest, getWindowsInstallerFileName, resolveRepoRoot } from "./connector-release-lib.mjs";

const manifest = readCanonicalManifest(resolveRepoRoot());
process.stdout.write(getWindowsInstallerFileName(manifest));
