/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Tobias Koppers @sokra
*/

"use strict";

/**
 * @typedef PlatformTargetProperties
 * @property {boolean} web web platform, importing of http(s) and std: is available
 * @property {boolean} node node platform, require of node built-in modules is available
 * @property {boolean} nwjs nwjs platform, require of legacy nw.gui is available
 * @property {boolean} electronMain electron platform in main context, require of electrong built-in modules is available
 * @property {boolean} electronPreload electron platform in preload script, require of electrong built-in modules is available
 */

/**
 * @typedef {Object} ApiTargetProperties
 * @property {boolean} require has require function available
 * @property {boolean} document has document available (allows script tags)
 * @property {boolean} importScripts has importScripts available
 * @property {boolean} importScriptsInWorker has importScripts available when creating a worker
 * @property {boolean} fetchWasm has fetch function available for WebAssembly
 * @property {boolean} global has global variable available
 */

/**
 * @typedef {Object} EcmaTargetProperties
 * @property {boolean} globalThis has globalThis variable available
 * @property {boolean} bigInitLiteral big int literal syntax is available
 * @property {boolean} const const and let variable declarations are available
 * @property {boolean} arrowFunctions arrow functions are available
 * @property {boolean} forOf for of iteration is available
 * @property {boolean} destructuring destructuring is available
 * @property {boolean} import async import() is available
 * @property {boolean} module ESM syntax is available (when in module)
 */

///** @typedef {PlatformTargetProperties | ApiTargetProperties | EcmaTargetProperties | PlatformTargetProperties & ApiTargetProperties | PlatformTargetProperties & EcmaTargetProperties | ApiTargetProperties & EcmaTargetProperties} TargetProperties */
/** @template T @typedef {{ [P in keyof T]?: never }} Never<T> */
/** @template A @template B @typedef {(A & Never<B>) | (Never<A> & B) | (A & B)} Mix<A,B> */
/** @typedef {Mix<PlatformTargetProperties, Mix<ApiTargetProperties, EcmaTargetProperties>>} TargetProperties */

const versionDependent = (major, minor) => {
	if (!major) return () => /** @type {undefined} */ (undefined);
	major = +major;
	minor = minor ? +minor : 0;
	return (vMajor, vMinor = 0) => {
		return major > vMajor || (major === vMajor && minor >= vMinor);
	};
};

/** @type {[string, string, RegExp, (...args: string[]) => TargetProperties][]} */
const TARGETS = [
	[
		"[async-]node[X[.Y]]",
		"Node.js in version X.Y. The 'async-' prefix will load chunks asynchronously via 'fs' and 'vm' instead of 'require()'. Examples: node14.5, async-node10.",
		/^(async-)node(\d+(?:\.(\d+))?)$/,
		(asyncFlag, major, minor) => {
			const v = versionDependent(major, minor);
			// see https://node.green/
			return {
				node: true,
				electronMain: false,
				electronPreload: false,
				nwjs: false,
				web: false,

				require: !asyncFlag,
				global: true,
				document: false,
				fetchWasm: false,
				importScripts: false,
				importScriptsInWorker: false,

				globalThis: v(12),
				const: v(6),
				arrowFunctions: v(6),
				forOf: v(5),
				destructuring: v(6),
				bigInitLiteral: v(10, 4),
				import: v(12, 17),
				module: v(12, 17)
			};
		}
	],
	[
		"web",
		"Web browser.",
		/^web$/,
		() => {
			return {
				web: true,
				node: false,
				electronMain: false,
				electronPreload: false,
				nwjs: false,

				document: true,
				importScriptsInWorker: true,
				fetchWasm: true,
				importScripts: false,
				require: false,
				global: false
			};
		}
	],
	[
		"webworker",
		"Web Worker, SharedWorker or Service Worker.",
		/^webworker$/,
		() => {
			return {
				web: true,
				node: false,
				electronMain: false,
				electronPreload: false,
				nwjs: false,

				importScripts: true,
				importScriptsInWorker: true,
				fetchWasm: true,
				require: false,
				document: false,
				global: false
			};
		}
	],
	[
		"electron[X[.Y]]-main",
		"Electron in version X.Y. Script is running in main context.",
		/^electron(\d+(?:\.(\d+))?)-main$/,
		(major, minor) => {
			const v = versionDependent(major, minor);
			// see https://node.green/ + https://github.com/electron/releases
			return {
				node: true,
				electronMain: true,
				electronPreload: false,
				web: false,
				nwjs: false,

				global: true,
				document: false,
				fetchWasm: false,
				importScripts: false,
				importScriptsInWorker: false,
				require: false,

				globalThis: v(5),
				const: v(1, 1),
				arrowFunctions: v(1, 1),
				forOf: v(0, 36),
				destructuring: v(1, 1),
				bigInitLiteral: v(4),
				import: v(11),
				module: v(11)
			};
		}
	],
	[
		"electron[X[.Y]]-preload / electron[X[.Y]]-renderer",
		"Electron in version X.Y. Script is running in preload or renderer context.",
		/^electron(\d+(?:\.(\d+))?)-(?:preload|renderer)$/,
		(major, minor) => {
			const v = versionDependent(major, minor);
			// see https://node.green/ + https://github.com/electron/releases
			return {
				node: true,
				web: true,
				electronPreload: true,
				electronMain: false,
				nwjs: false,

				global: true,
				require: false,
				importScriptsInWorker: false,
				importScripts: false,
				fetchWasm: false,
				document: false,

				globalThis: v(5),
				const: v(1, 1),
				arrowFunctions: v(1, 1),
				forOf: v(0, 36),
				destructuring: v(1, 1),
				bigInitLiteral: v(4),
				import: v(11),
				module: v(11)
			};
		}
	],
	[
		"nwjs[X[.Y]] / node-webkit[X[.Y]]",
		"NW.js in version X.Y.",
		/^(?:nwjs|node-webkit)(\d+(?:\.(\d+))?)$/,
		(major, minor) => {
			const v = versionDependent(major, minor);
			// see https://node.green/ + https://github.com/nwjs/nw.js/blob/nw48/CHANGELOG.md
			return {
				node: true,
				web: true,
				nwjs: true,
				electronMain: false,
				electronPreload: false,

				global: true,
				document: false,
				importScriptsInWorker: false,
				fetchWasm: false,
				importScripts: false,
				require: false,

				globalThis: v(0, 43),
				const: v(0, 15),
				arrowFunctions: v(0, 15),
				forOf: v(0, 13),
				destructuring: v(0, 15),
				bigInitLiteral: v(0, 32),
				import: v(0, 43),
				module: v(0, 43)
			};
		}
	],
	[
		"esX",
		"EcmaScript in this version. Examples: es5, es2020.",
		/^es(\d+)$/,
		version => {
			let v = +version;
			if (v > 1000) v = v - 2009;
			return {
				globalThis: v >= 6,
				const: v >= 6,
				arrowFunctions: v >= 6,
				forOf: v >= 6,
				destructuring: v >= 6,
				bigInitLiteral: v >= 6,
				import: v >= 6,
				module: v >= 6
			};
		}
	]
];

/**
 * @param {string} target the target
 * @returns {TargetProperties} target properties
 */
const getTargetProperties = target => {
	for (const [, , regExp, handler] of TARGETS) {
		const match = regExp.exec(target);
		if (match) {
			const [, ...args] = match;
			const result = handler(...args);
			if (result) return result;
		}
	}
	throw new Error(
		`Unknown target '${target}'. The following targets are supported:\n${TARGETS.map(
			([name, description]) => `* ${name}: ${description}`
		).join("\n")}`
	);
};

const mergeTargetProperties = (targetProperties, any = false) => {
	const keys = new Set();
	for (const tp of targetProperties) {
		for (const key of Object.keys(tp)) {
			keys.add(key);
		}
	}
	const result = {};
	for (const key of keys) {
		let merged = !any;
		for (const tp of targetProperties) {
			const value = tp[key];
			if (any) {
				if (value === true) {
					merged = true;
					break;
				}
			} else {
				if (value === false) {
					merged = false;
					break;
				}
				if (value === undefined && value) {
					merged = undefined;
				}
			}
		}
		result[key] = merged;
	}
	return result;
};

/**
 * @param {string[]} targets the targets
 * @returns {TargetProperties} target properties
 */
const getTargetsProperties = targets => {
	return mergeTargetProperties(targets.map(getTargetProperties));
};

exports.getTargetProperties = getTargetProperties;
exports.getTargetsProperties = getTargetsProperties;
