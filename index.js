#!/usr/bin/env node

// >> $ ./index.js https://github.com/kokiito0926/hypernode.git
// >> $ ./index.js https://github.com/kokiito0926/hypernode.git --pattern "**/*.js"

import { argv } from "zx";
import { Volume, createFsFromVolume } from "memfs";
import git from "isomorphic-git";
import http from "isomorphic-git/http/node";
import * as path from "path";
import { glob } from "glob";
import xml2js from "xml2js";

function normalizeArgs(arg) {
	if (!arg) return [];
	const list = Array.isArray(arg) ? arg : [arg];
	return list.flatMap((item) => item.split(",")).map((item) => item.trim());
}

function isBinary(buffer) {
	for (let i = 0; i < Math.min(buffer.length, 4096); i++) {
		if (buffer[i] === 0) return true;
	}
	return false;
}

const repoUrl = argv._[0];
if (!repoUrl) {
	process.exit(1);
}

const includePattern = argv.pattern || "**/*";
// const includePatterns = normalizeArgs(argv.patterns);
// if (includePatterns.length === 0) includePatterns.push("**/*");

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

const files = await glob(includePattern, {
	cwd: worktreeDir,
	fs: memfs,
	nodir: true,
	ignore: ignorePatterns,
});

if (files.length === 0) {
	process.exit(1);
}

const builder = new xml2js.Builder({
	cdata: true,
	xmldec: { version: "1.0", encoding: "UTF-8" },
	renderOpts: { pretty: true },
});

const allFiles = [];
for (const file of files) {
	const fullPath = path.join(worktreeDir, file);

	const buffer = await memfs.promises.readFile(fullPath);
	if (isBinary(buffer)) {
		continue;
	}

	const content = buffer.toString("utf8");
	if (!content) continue;

	/*
	const content = await memfs.promises.readFile(fullPath, "utf8");
	*/

	allFiles.push({
		name: path.basename(file),
		path: file,
		content: content
	});
}
if (!allFiles.length) {
	process.exit(1);
}

const xmlObject = {
	repository: {
		name: repoName,
		url: repoUrl,
	},
	files: {
		file: allFiles.map((f) => ({
			name: f.name,
			path: f.path,
			content: f.content,
		})),
	},
};

const xmlOutput = builder.buildObject(xmlObject);
console.log(xmlOutput);
