#!/usr/bin/env node

// >> $ ./index.js --url https://github.com/kokiito0926/hypernode.git

import { $, chalk, argv, echo } from "zx";
import { Volume, createFsFromVolume } from "memfs";
import git from "isomorphic-git";
import http from "isomorphic-git/http/node";
import * as path from "path";
import { create as createXml } from "xmlbuilder2";
import { glob } from "glob";

function normalizeArgs(arg) {
	if (!arg) return [];
	const list = Array.isArray(arg) ? arg : [arg];
	return list.flatMap((item) => item.split(",")).map((item) => item.trim());
}

const repoUrl = argv.url;

if (!repoUrl) {
	process.exit(1);
}

const includePatterns = normalizeArgs(argv.patterns);
if (includePatterns.length === 0) includePatterns.push("**/*");

const ignorePatterns = normalizeArgs(argv.ignore);
ignorePatterns.push("**/.git/**");

const vol = new Volume();
const memfs = createFsFromVolume(vol);
const repoName = path.basename(repoUrl, ".git");
const worktreeDir = `/${repoName}`;

const githubToken = process.env.GITHUB_TOKEN;

await git.clone({
	fs: memfs,
	http,
	dir: worktreeDir,
	url: repoUrl,
	singleBranch: true,
	depth: 1,
	onAuth: () => (githubToken ? { username: githubToken } : {}),
});

const files = await glob(includePatterns, {
	cwd: worktreeDir,
	fs: memfs,
	nodir: true,
	ignore: ignorePatterns,
});

if (files.length === 0) {
	process.exit(1);
}

const root = createXml({ version: "1.0", encoding: "UTF-8" }).ele("repository", {
	name: repoName,
	url: repoUrl,
});

for (const filePath of files) {
	const fullPath = path.join(worktreeDir, filePath);
	const content = await memfs.promises.readFile(fullPath, "utf8");

	root.ele("file", { path: filePath }).ele("content").dat(content).up().up();
}

const xmlString = root.end({ prettyPrint: true });

console.log(xmlString);
