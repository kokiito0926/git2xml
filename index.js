#!/usr/bin/env node

// >> $ ./index.js https://github.com/kokiito0926/hypernode.git
// >> $ ./index.js https://github.com/kokiito0926/hypernode.git --pattern "**/*.js"
// >> $ ./index.js https://github.com/kokiito0926/hypernode.git --ignore "./package*.json"

import { argv } from "zx";
import { Volume, createFsFromVolume } from "memfs";
import git from "isomorphic-git";
import http from "isomorphic-git/http/node";
import * as path from "path";
import { glob } from "glob";
import xml2js from "xml2js";

function isBinary(buffer) {
	for (let i = 0; i < Math.min(buffer.length, 4096); i++) {
		if (buffer[i] === 0) return true;
	}
	return false;
}

const parseBool = (val, defaultVal) => {
	if (val === undefined || val === null) return defaultVal;
	if (typeof val === "boolean") return val;
	if (val === "true") return true;
	if (val === "false") return false;
	return !!val;
};

const repoUrl = argv._[0];
if (!repoUrl) {
	process.exit(1);
}

const dot = parseBool(argv?.dot, false);

const includePattern = argv.pattern || "**/*";

const ignorePattern = ["**/.git/**"];
if (argv.ignore) {
	ignorePattern.push(...(Array.isArray(argv.ignore) ? argv.ignore : argv.ignore.split(",")));
}

const vol = new Volume();
const memfs = createFsFromVolume(vol);
const repoName = path.posix.basename(new URL(repoUrl).pathname, ".git");
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
	dot: dot,
	ignore: ignorePattern,
});

if (files.length === 0) {
	process.exit(1);
}

const allFiles = [];
for (const file of files) {
	const fullPath = path.posix.join(worktreeDir, file);

	const buffer = await memfs.promises.readFile(fullPath);
	if (isBinary(buffer)) {
		continue;
	}

	let content = buffer.toString("utf8");
	if (!content) continue;

	// Filter invalid XML 1.0 characters: #x9, #xA, #xD, [#x20-#xD7FF], [#xE000-#xFFFD], [#x10000-#x10FFFF]
	content = content.replace(/[^\x09\x0A\x0D\x20-\uD7FF\uE000-\uFFFD\u{10000}-\u{10FFFF}]/gu, "");
	if (!content) continue;

	allFiles.push({
		name: path.posix.basename(file),
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
			content: { _: f.content },
		})),
	},
};

const builder = new xml2js.Builder({
	cdata: true,
	xmldec: { version: "1.0", encoding: "UTF-8" },
	renderOpts: { pretty: true },
});

const xmlOutput = builder.buildObject(xmlObject);
console.log(xmlOutput);
