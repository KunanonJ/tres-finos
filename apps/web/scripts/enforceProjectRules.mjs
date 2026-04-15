import { promises as fs } from "node:fs";
import path from "node:path";
import ts from "typescript";

const projectRoot = process.cwd();
const sourceDirectories = ["app", "components", "hooks", "lib", "types"];
const sourceFileExtensions = new Set([".ts", ".tsx", ".mts", ".cts"]);
const appSegmentPattern =
  /^(?:[a-z0-9]+(?:-[a-z0-9]+)*|\[[^/\]]+\]|\[\[\.\.\.[^/\]]+\]\]|\[\.\.\.[^/\]]+\]|\([^)]+\)|@[^/]+)$/;
const pascalCaseFilePattern = /^[A-Z][A-Za-z0-9]*\.(?:ts|tsx)$/;
const camelCaseFilePattern = /^[a-z][A-Za-z0-9]*\.(?:ts|tsx|mjs)$/;

const violations = [];

const getLocation = (sourceFile, node) => {
  const { line, character } = sourceFile.getLineAndCharacterOfPosition(node.getStart(sourceFile));

  return `${path.relative(projectRoot, sourceFile.fileName)}:${line + 1}:${character + 1}`;
};

const hasModifier = (node, kind) => node.modifiers?.some((modifier) => modifier.kind === kind) ?? false;

const containsJsx = (node) => {
  let foundJsx = false;

  const visit = (currentNode) => {
    if (
      ts.isJsxElement(currentNode) ||
      ts.isJsxFragment(currentNode) ||
      ts.isJsxSelfClosingElement(currentNode)
    ) {
      foundJsx = true;
      return;
    }

    ts.forEachChild(currentNode, visit);
  };

  if (node) {
    visit(node);
  }

  return foundJsx;
};

const isComponentDeclaration = (filePath, node) => {
  if (!filePath.endsWith(".tsx")) {
    return false;
  }

  if (ts.isFunctionDeclaration(node)) {
    const hasComponentName = node.name ? /^[A-Z]/.test(node.name.text) : false;
    const exported = hasModifier(node, ts.SyntaxKind.ExportKeyword) || hasModifier(node, ts.SyntaxKind.DefaultKeyword);

    return (hasComponentName || exported) && containsJsx(node.body);
  }

  if (ts.isVariableDeclaration(node) && ts.isIdentifier(node.name) && /^[A-Z]/.test(node.name.text)) {
    return Boolean(
      node.initializer &&
        (ts.isArrowFunction(node.initializer) || ts.isFunctionExpression(node.initializer)) &&
        containsJsx(node.initializer.body),
    );
  }

  return false;
};

const collectFiles = async (directoryPath) => {
  const entries = await fs.readdir(directoryPath, { withFileTypes: true });
  const collected = [];

  for (const entry of entries) {
    const entryPath = path.join(directoryPath, entry.name);

    if (entry.isDirectory()) {
      collected.push(...(await collectFiles(entryPath)));
      continue;
    }

    if (sourceFileExtensions.has(path.extname(entry.name))) {
      collected.push(entryPath);
    }
  }

  return collected;
};

const checkAppFolders = async (directoryPath) => {
  const entries = await fs.readdir(directoryPath, { withFileTypes: true });

  for (const entry of entries) {
    if (!entry.isDirectory()) {
      continue;
    }

    if (!appSegmentPattern.test(entry.name)) {
      violations.push(`${path.relative(projectRoot, path.join(directoryPath, entry.name))}: app route folders must use kebab-case or Next.js segment syntax.`);
    }

    await checkAppFolders(path.join(directoryPath, entry.name));
  }
};

const checkFileNameConventions = (filePath) => {
  const relativePath = path.relative(projectRoot, filePath);
  const fileName = path.basename(filePath);

  if (relativePath.startsWith(`components${path.sep}ui${path.sep}`) || relativePath.startsWith(`components${path.sep}shared${path.sep}`)) {
    if (!pascalCaseFilePattern.test(fileName)) {
      violations.push(`${relativePath}: component files in components/ui and components/shared must use PascalCase.`);
    }
  }

  if (relativePath.startsWith(`hooks${path.sep}`) || relativePath.startsWith(`lib${path.sep}`)) {
    if (!camelCaseFilePattern.test(fileName) && !fileName.endsWith(".csv")) {
      violations.push(`${relativePath}: files in hooks and lib must use camelCase.`);
    }
  }
};

const inspectSourceFile = (filePath) => {
  const sourceText = ts.sys.readFile(filePath);

  if (!sourceText) {
    return;
  }

  const sourceFile = ts.createSourceFile(filePath, sourceText, ts.ScriptTarget.Latest, true, filePath.endsWith(".tsx") ? ts.ScriptKind.TSX : ts.ScriptKind.TS);

  const visit = (node) => {
    if (node.kind === ts.SyntaxKind.AnyKeyword) {
      violations.push(`${getLocation(sourceFile, node)}: explicit any is not allowed.`);
    }

    if (ts.isJsxAttribute(node) && node.name.text === "style") {
      violations.push(`${getLocation(sourceFile, node)}: inline style props are not allowed.`);
    }

    if (ts.isFunctionDeclaration(node) && isComponentDeclaration(filePath, node)) {
      violations.push(`${getLocation(sourceFile, node)}: React components must use arrow-function declarations.`);
    }

    if (
      ts.isVariableDeclaration(node) &&
      isComponentDeclaration(filePath, node) &&
      node.initializer &&
      ts.isFunctionExpression(node.initializer)
    ) {
      violations.push(`${getLocation(sourceFile, node)}: React components must use arrow-function declarations.`);
    }

    ts.forEachChild(node, visit);
  };

  visit(sourceFile);
};

await checkAppFolders(path.join(projectRoot, "app"));

for (const directoryName of sourceDirectories) {
  const directoryPath = path.join(projectRoot, directoryName);
  const files = await collectFiles(directoryPath);

  for (const filePath of files) {
    checkFileNameConventions(filePath);
    inspectSourceFile(filePath);
  }
}

if (violations.length > 0) {
  console.error("Project rule violations:");

  for (const violation of violations) {
    console.error(`- ${violation}`);
  }

  process.exit(1);
}
