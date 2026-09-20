import path from "node:path";
import { fileURLToPath } from "node:url";

const repositoryRoot = fileURLToPath(new URL("../../../", import.meta.url));
const normalize = (/** @type {string} */ value) => value.replaceAll("\\", "/");

/** @param {string} filename */
function workspaceOf(filename) {
  const match =
    /^(packages\/(contracts|core|db|ai|ui|i18n|config)|apps\/(web|worker|concierge-prototype))(?:\/|$)/.exec(
      filename,
    );
  return match?.[2] ?? match?.[3] ?? null;
}

/** @param {string} filename @param {string} specifier */
function resolveTarget(filename, specifier) {
  if (/^@lilith\/concierge-prototype(?:\/|$)/.test(specifier)) {
    return path.posix.normalize(
      `apps/concierge-prototype${specifier.slice("@lilith/concierge-prototype".length)}`,
    );
  }
  if (specifier.startsWith("file:")) {
    try {
      return normalize(path.relative(repositoryRoot, fileURLToPath(specifier)));
    } catch {
      return "invalid-file-url";
    }
  }
  if (specifier.startsWith("@lilith/")) {
    return path.posix.normalize(
      `packages/${specifier.slice("@lilith/".length)}`,
    );
  }
  if (specifier.startsWith(".") || path.isAbsolute(specifier)) {
    return normalize(
      path.relative(
        repositoryRoot,
        path.resolve(path.dirname(filename), specifier),
      ),
    );
  }
  if (
    specifier.startsWith("@/") &&
    workspaceOf(normalize(path.relative(repositoryRoot, filename))) === "web"
  ) {
    return normalize(
      path.relative(
        repositoryRoot,
        path.resolve(repositoryRoot, "apps/web/src", specifier.slice(2)),
      ),
    );
  }
  return null;
}

/** @param {string} filename */
function isPureModule(filename) {
  return (
    /^packages\/core\/matching\/(score|dimensions|rules|types|explain)(?:\.[cm]?[jt]s)?$/.test(
      filename,
    ) ||
    /^packages\/core\/matching\/pure\//.test(filename) ||
    /^packages\/core\/shared\/(money|result|errors)(?:\.[cm]?[jt]s)?$/.test(
      filename,
    )
  );
}

/** @param {unknown} value @param {string} key @returns {unknown} */
function field(value, key) {
  return value && typeof value === "object"
    ? /** @type {Record<string, unknown>} */ (value)[key]
    : undefined;
}

/** @param {unknown} node @returns {string | null} */
function literalValue(node) {
  const value = field(node, "value");
  if (typeof value === "string") return value;
  const expressions = field(node, "expressions");
  const quasis = field(node, "quasis");
  if (
    field(node, "type") === "TemplateLiteral" &&
    Array.isArray(expressions) &&
    expressions.length === 0 &&
    Array.isArray(quasis)
  ) {
    const cooked = field(field(quasis[0], "value"), "cooked");
    if (typeof cooked === "string") return cooked;
  }
  return null;
}

/** @type {Record<string, readonly string[]>} */
const dependencies = {
  web: ["web", "contracts", "core", "ui", "i18n", "ai"],
  worker: ["worker", "contracts", "core", "db", "ai"],
  contracts: ["contracts"],
  core: ["core", "contracts", "db"],
  db: ["db", "contracts"],
  ai: ["ai", "contracts", "core", "db"],
  ui: ["ui", "contracts", "i18n"],
  i18n: ["i18n"],
  config: ["config"],
  "concierge-prototype": ["concierge-prototype"],
};

/** @param {string} filename */
function prototypeLayer(filename) {
  return (
    /^apps\/concierge-prototype\/src\/(server|client|shared)(?:\/|$)/.exec(
      filename,
    )?.[1] ?? null
  );
}

/** @param {string} filename */
function prototypeTooling(filename) {
  return /^apps\/concierge-prototype\/(?:scripts\/|(?:eslint|vitest|playwright)\.config\.[cm]?[jt]s$)/.test(
    filename,
  );
}

/** @type {import("eslint").Rule.RuleModule} */
export const boundaries = {
  meta: {
    type: "problem",
    docs: {
      description:
        "Enforce Blueprint §19 workspace and pure matching boundaries",
    },
    schema: [],
    messages: {
      forbidden: "{{reason}} ({{specifier}})",
      computed:
        "Use a literal module specifier so the architecture boundary can be checked.",
      impure:
        "Pure matching/shared modules cannot use ambient I/O, time, randomness, or environment state ({{name}}).",
    },
  },
  create(context) {
    const filename = context.filename;
    const relative = normalize(path.relative(repositoryRoot, filename));
    const workspace = workspaceOf(relative);
    if (!workspace) return {};
    const prototype = workspace === "concierge-prototype";
    const layer = prototypeLayer(relative);
    const pure = isPureModule(relative);
    const clientComponent = context.sourceCode.ast.body.some(
      (node) =>
        node.type === "ExpressionStatement" &&
        literalValue(node.expression) === "use client",
    );

    /** @param {import("estree").Node} node @param {unknown} source @param {boolean} [typeOnly] */
    function check(node, source, typeOnly = false) {
      const specifier = literalValue(source);
      if (specifier === null) {
        context.report({ node, messageId: "computed" });
        return;
      }
      const cleanSpecifier = specifier.replace(/[?#].*$/, "");
      const target = resolveTarget(filename, cleanSpecifier);
      const targetWorkspace = target === null ? null : workspaceOf(target);
      const targetLayer = target === null ? null : prototypeLayer(target);
      const toolingConfig =
        prototype && prototypeTooling(relative) && targetWorkspace === "config";
      let reason = null;
      if (
        prototype &&
        layer &&
        target === null &&
        !(layer === "server" && cleanSpecifier.startsWith("node:"))
      ) {
        reason =
          "Prototype runtime uses only app-private modules and server Node built-ins";
      } else if (
        prototype &&
        layer &&
        targetWorkspace === "concierge-prototype" &&
        (targetLayer === null ||
          (layer === "shared" && targetLayer !== "shared") ||
          (layer === "client" && targetLayer === "server") ||
          (layer === "server" && targetLayer === "client"))
      ) {
        reason =
          "Prototype client/shared/server layers cannot import another layer's private code or tooling";
      } else if (
        workspace !== "db" &&
        /(^|\/)(@prisma\/[^/]+|\.prisma\/client|generated\/(prisma|client))(\/|$)/.test(
          cleanSpecifier,
        )
      ) {
        reason = "Only packages/db may import Prisma";
      } else if (
        /^packages\/core\/shared\//.test(relative) &&
        targetWorkspace === "core" &&
        !/^packages\/core\/shared(?:\/|$)/.test(target ?? "")
      ) {
        reason = "The shared kernel must not depend on business domains";
      } else if (
        workspace === "core" &&
        /^(next|react|react-dom)(\/|$)/.test(cleanSpecifier)
      ) {
        reason = "Core must stay framework-free";
      } else if (
        ["module", "node:module"].includes(cleanSpecifier) ||
        specifier.includes("!")
      ) {
        reason =
          "Custom module loaders bypass the statically checked import graph";
      } else if (
        clientComponent &&
        !typeOnly &&
        (targetWorkspace === "core" ||
          targetWorkspace === "ai" ||
          targetWorkspace === "db" ||
          /apps\/web\/(?:src\/)?lib\/server\//.test(target ?? ""))
      ) {
        reason =
          "Client components cannot import server composition or domain services";
      } else if (
        workspace === "web" &&
        targetWorkspace === "ai" &&
        !/^apps\/web\/(?:src\/)?(?:app\/api\/|lib\/server\/)/.test(relative)
      ) {
        reason =
          "Web AI calls must originate in API adapters or lib/server composition";
      } else if (
        target !== null &&
        (!targetWorkspace ||
          (!dependencies[workspace ?? ""]?.includes(targetWorkspace) &&
            !toolingConfig))
      ) {
        reason =
          "This workspace may not depend on that layer or on legacy root files";
      } else if (
        workspace === "ai" &&
        targetWorkspace === "core" &&
        !/^packages\/core\/shared(?:\/|$)/.test(target ?? "")
      ) {
        reason =
          "AI may consume only core/shared, never business domains or the core barrel";
      } else if (
        workspace === "core" &&
        targetWorkspace === "db" &&
        !/\/repository(?:\.[cm]?[jt]s)?$/.test(relative)
      ) {
        reason = "Core persistence must go through a domain repository adapter";
      } else if (
        pure &&
        !(target !== null && isPureModule(target)) &&
        !(typeOnly && targetWorkspace === "contracts")
      ) {
        reason =
          "Pure modules may import only approved pure helpers or type-only contracts";
      }
      if (reason)
        context.report({
          node,
          messageId: "forbidden",
          data: { reason, specifier },
        });
    }

    /** @param {import("estree").Node} node */
    function isTypeOnly(node) {
      return (
        ("importKind" in node && node.importKind === "type") ||
        ("exportKind" in node && node.exportKind === "type") ||
        ("specifiers" in node &&
          Array.isArray(node.specifiers) &&
          node.specifiers.length > 0 &&
          node.specifiers.every(
            (specifier) =>
              "importKind" in specifier && specifier.importKind === "type",
          ))
      );
    }

    return {
      ImportDeclaration(node) {
        check(node, node.source, isTypeOnly(node));
      },
      ExportNamedDeclaration(node) {
        if (node.source) check(node, node.source, isTypeOnly(node));
      },
      ExportAllDeclaration(node) {
        check(node, node.source, isTypeOnly(node));
      },
      ImportExpression(node) {
        check(node, node.source);
      },
      CallExpression(node) {
        if (node.callee.type === "Identifier" && node.callee.name === "require")
          check(node, node.arguments[0]);
        if (
          node.callee.type === "MemberExpression" &&
          node.callee.object.type === "Identifier" &&
          node.callee.object.name === "require"
        ) {
          check(node, node.arguments[0]);
        }
      },
      /** @param {import("estree").Node} node */
      TSImportEqualsDeclaration(node) {
        const reference = field(node, "moduleReference");
        if (field(reference, "type") === "TSExternalModuleReference")
          check(node, field(reference, "expression"));
      },
      /** @param {import("estree").Node} node */
      TSImportType(node) {
        check(node, field(node, "source"), true);
      },
      Identifier(node) {
        const parent = field(node, "parent");
        if (node.name === "require") {
          const directCall =
            field(parent, "type") === "CallExpression" &&
            field(parent, "callee") === node;
          const resolveCall =
            field(parent, "type") === "MemberExpression" &&
            field(parent, "object") === node &&
            (field(field(parent, "property"), "name") === "resolve" ||
              literalValue(field(parent, "property")) === "resolve") &&
            field(field(parent, "parent"), "type") === "CallExpression" &&
            field(field(parent, "parent"), "callee") === parent;
          if (!directCall && !resolveCall)
            context.report({ node, messageId: "computed" });
        }
        if (!pure) return;
        const ambient = [
          "fetch",
          "Date",
          "Math",
          "crypto",
          "process",
          "globalThis",
          "window",
          "document",
          "navigator",
          "performance",
          "console",
          "setTimeout",
          "setInterval",
          "setImmediate",
          "queueMicrotask",
          "eval",
          "Function",
          "XMLHttpRequest",
          "WebSocket",
        ];
        if (!ambient.includes(node.name)) return;
        // Math arithmetic remains useful to pure scoring; reject random even when aliased.
        if (
          node.name === "Math" &&
          parent &&
          typeof parent === "object" &&
          "type" in parent &&
          parent.type === "MemberExpression" &&
          "computed" in parent &&
          parent.computed === false &&
          "property" in parent &&
          parent.property &&
          typeof parent.property === "object" &&
          "name" in parent.property &&
          [
            "abs",
            "ceil",
            "floor",
            "round",
            "trunc",
            "min",
            "max",
            "pow",
            "sqrt",
            "cbrt",
            "sign",
            "hypot",
            "log",
            "log10",
            "log2",
            "exp",
            "expm1",
            "log1p",
            "imul",
            "clz32",
            "fround",
            "sin",
            "cos",
            "tan",
            "asin",
            "acos",
            "atan",
            "atan2",
            "sinh",
            "cosh",
            "tanh",
            "E",
            "LN2",
            "LN10",
            "LOG2E",
            "LOG10E",
            "PI",
            "SQRT1_2",
            "SQRT2",
          ].includes(String(parent.property.name))
        )
          return;
        context.report({
          node,
          messageId: "impure",
          data: { name: node.name },
        });
      },
    };
  },
};
