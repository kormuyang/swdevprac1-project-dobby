'use strict';

// Checks the planning files without starting a server or connecting to a database.
// This is not a complete OpenAPI validator or a runtime test suite.
const fs = require('node:fs');
const path = require('node:path');

const PROJECT_ROOT = path.resolve(__dirname, '..');
const HTTP_METHODS = new Set([
  'get',
  'post',
  'patch',
  'put',
  'delete',
  'options',
  'head',
  'trace',
]);
const ALLOWED_ROLES = new Set(['public', 'user', 'company', 'admin']);
const PARTNER_B_TAGS = new Set([
  'Discovery',
  'Company vehicles',
  'Bookings',
  'Company bookings',
]);

const specification = JSON.parse(readProjectFile('docs/contracts/openapi.json'));
const errors = [];

function main() {
  ensure(specification.openapi === '3.0.3', 'Expected OpenAPI 3.0.3');
  checkSchemaTree(specification, 'spec');

  const { endpointRows, coveredRequirements } = checkOperations();
  checkRequirementCoverage(coveredRequirements);
  checkEndpointInventory(endpointRows);

  const markdownFiles = [
    ...findMarkdownFiles(path.join(PROJECT_ROOT, 'docs')),
    path.join(PROJECT_ROOT, 'README.md'),
    path.join(PROJECT_ROOT, 'AGENTS.md'),
  ];

  for (const filePath of markdownFiles) {
    checkMarkdownFile(filePath);
  }

  checkAcceptanceCoverage();
  reportResults(endpointRows.length, markdownFiles.length);
}

function readProjectFile(relativePath) {
  return fs.readFileSync(path.join(PROJECT_ROOT, relativePath), 'utf8');
}

function ensure(condition, message) {
  if (!condition) {
    errors.push(message);
  }
}

function resolveLocalReference(reference) {
  if (!reference.startsWith('#/')) {
    return undefined;
  }

  const referenceParts = reference.slice(2).split('/');
  let currentValue = specification;

  for (const part of referenceParts) {
    // JSON Pointer escapes '/' as '~1' and '~' as '~0'.
    const propertyName = part.replace(/~1/g, '/').replace(/~0/g, '~');
    currentValue = currentValue?.[propertyName];
  }

  return currentValue;
}

function checkSchemaTree(value, location) {
  if (Array.isArray(value)) {
    value.forEach((item, index) => {
      checkSchemaTree(item, `${location}[${index}]`);
    });
    return;
  }

  if (!value || typeof value !== 'object') {
    return;
  }

  if (value.$ref) {
    ensure(
      resolveLocalReference(value.$ref) !== undefined,
      `Unresolved reference at ${location}: ${value.$ref}`,
    );
  }

  if (Array.isArray(value.required)) {
    checkRequiredFields(value, location);
  }

  if (value.nullable && value.enum) {
    ensure(
      value.enum.includes(null),
      `Nullable enum excludes null at ${location}`,
    );
  }

  if (value.type === 'object' && value.properties) {
    ensure(
      value.additionalProperties === false,
      `Object lacks closed field policy at ${location}`,
    );
  }

  for (const [propertyName, child] of Object.entries(value)) {
    checkSchemaTree(child, `${location}.${propertyName}`);
  }
}

function checkRequiredFields(schema, location) {
  ensure(schema.required.length > 0, `Empty required array at ${location}`);
  ensure(
    new Set(schema.required).size === schema.required.length,
    `Duplicate required field at ${location}`,
  );

  for (const fieldName of schema.required) {
    ensure(
      Object.hasOwn(schema.properties || {}, fieldName),
      `Unknown required field ${location}.${fieldName}`,
    );
  }
}

function checkOperations() {
  const operationIds = new Set();
  const coveredRequirements = new Set();
  const endpointRows = [];

  for (const [route, pathItem] of Object.entries(specification.paths || {})) {
    ensure(route.startsWith('/'), `Invalid route ${route}`);

    for (const [method, operation] of Object.entries(pathItem)) {
      if (!HTTP_METHODS.has(method)) {
        continue;
      }

      checkOperationDetails(route, method, operation, operationIds);
      checkOperationSecurity(operation);
      checkOperationParameters(route, operation);

      for (const requirementId of operation['x-requirements'] || []) {
        coveredRequirements.add(requirementId);
      }

      endpointRows.push(formatEndpointRow(route, method, operation));
    }
  }

  return { endpointRows, coveredRequirements };
}

function checkOperationDetails(route, method, operation, operationIds) {
  const operationId = operation.operationId;

  ensure(
    typeof operationId === 'string' && !operationIds.has(operationId),
    `Missing/duplicate operationId ${operationId}`,
  );
  operationIds.add(operationId);

  ensure(
    operation.summary && operation.description,
    `Missing explanation ${method} ${route}`,
  );
  ensure(
    operation.responses &&
      (operation.responses['200'] || operation.responses['201']),
    `Missing success response ${operationId}`,
  );
}

function checkOperationSecurity(operation) {
  const operationId = operation.operationId;
  const roles = operation['x-roles'];
  const hasValidRoles =
    Array.isArray(roles) && roles.every((role) => ALLOWED_ROLES.has(role));

  ensure(hasValidRoles, `Missing/invalid roles ${operationId}`);
  ensure(
    Array.isArray(operation.security),
    `Missing explicit security ${operationId}`,
  );

  const isPublicOperation = roles?.includes('public');
  let securityMatchesRoles;

  if (isPublicOperation) {
    securityMatchesRoles = operation.security?.length === 0;
  } else {
    securityMatchesRoles = operation.security?.some(
      (securityScheme) => securityScheme.bearerAuth,
    );
  }

  ensure(securityMatchesRoles, `Security/role mismatch ${operationId}`);
}

function checkOperationParameters(route, operation) {
  const operationId = operation.operationId;

  for (const match of route.matchAll(/\{([^}]+)\}/g)) {
    const parameterName = match[1];
    const hasRequiredPathParameter = operation.parameters?.some((parameter) => {
      return (
        parameter.in === 'path' &&
        parameter.name === parameterName &&
        parameter.required === true
      );
    });

    ensure(
      hasRequiredPathParameter,
      `Unbound path parameter ${operationId}:${parameterName}`,
    );
  }

  const parameterKeys = (operation.parameters || []).map((parameter) => {
    return `${parameter.in}:${parameter.name}`;
  });

  ensure(
    new Set(parameterKeys).size === parameterKeys.length,
    `Duplicate parameters ${operationId}`,
  );
}

function formatEndpointRow(route, method, operation) {
  let owner = 'A';

  if (PARTNER_B_TAGS.has(operation.tags[0])) {
    owner = 'B';
  }

  const columns = [
    method.toUpperCase(),
    `\`${route}\``,
    `\`${operation.operationId}\``,
    operation['x-roles'].join(', '),
    owner,
  ];

  return `| ${columns.join(' | ')} |`;
}

function checkRequirementCoverage(coveredRequirements) {
  for (let number = 1; number <= 14; number++) {
    const requirementId = `FR-${String(number).padStart(2, '0')}`;

    ensure(
      coveredRequirements.has(requirementId),
      `Missing operation coverage for FR-${number}`,
    );
  }
}

function checkEndpointInventory(endpointRows) {
  const inventory = readProjectFile('docs/api-endpoints.md');

  for (const row of endpointRows) {
    ensure(inventory.includes(row), `Endpoint inventory differs: ${row}`);
  }

  const endpointRowPattern =
    /^\| (?:GET|POST|PATCH|PUT|DELETE|OPTIONS|HEAD|TRACE) \|/gm;
  const inventoryRows = inventory.match(endpointRowPattern) || [];

  ensure(
    inventoryRows.length === endpointRows.length,
    'Stale/extra endpoint inventory row',
  );
}

function findMarkdownFiles(directoryPath) {
  const markdownFiles = [];
  const entries = fs.readdirSync(directoryPath, { withFileTypes: true });

  for (const entry of entries) {
    const entryPath = path.join(directoryPath, entry.name);

    if (entry.isDirectory()) {
      markdownFiles.push(...findMarkdownFiles(entryPath));
    } else if (entry.name.endsWith('.md')) {
      markdownFiles.push(entryPath);
    }
  }

  return markdownFiles;
}

function checkMarkdownFile(filePath) {
  const text = fs.readFileSync(filePath, 'utf8');
  const relativePath = path.relative(PROJECT_ROOT, filePath);
  const codeFences = text.match(/^```/gm) || [];

  ensure(
    codeFences.length % 2 === 0,
    `Unbalanced code fences: ${relativePath}`,
  );

  for (const match of text.matchAll(/\]\(([^)]+)\)/g)) {
    const target = match[1];

    if (/^(https?:|#)/.test(target)) {
      continue;
    }

    const localTarget = target.split('#')[0];
    const resolvedTarget = path.resolve(path.dirname(filePath), localTarget);
    const requiresLocalExample = /^\/?example\//i.test(localTarget);
    const requiresDownloads = localTarget.includes('/Downloads/');

    ensure(
      fs.existsSync(resolvedTarget),
      `Broken local link: ${relativePath} -> ${target}`,
    );
    ensure(
      !requiresLocalExample && !requiresDownloads,
      `Nonportable required link: ${filePath} -> ${target}`,
    );
  }
}

function checkAcceptanceCoverage() {
  const checklist = readProjectFile('docs/acceptance-checklist.md');

  for (let number = 1; number <= 42; number++) {
    const acceptanceId = `T${String(number).padStart(2, '0')}`;

    ensure(
      checklist.includes(`| ${acceptanceId} |`),
      `Missing acceptance case T${number}`,
    );
  }
}

function reportResults(operationCount, markdownFileCount) {
  if (errors.length > 0) {
    for (const error of errors) {
      console.error(`FAIL: ${error}`);
    }

    process.exitCode = 1;
    return;
  }

  const schemaCount = Object.keys(specification.components.schemas).length;

  console.log(
    `PASS: ${operationCount} operations, ${schemaCount} schemas, ` +
      'FR-01–FR-14, T01–T42, endpoint inventory and ' +
      `${markdownFileCount} Markdown files.`,
  );
  console.log(
    'Checked JSON structure, local references and planning consistency; ' +
      'no runtime/API/DB tests performed.',
  );
}

main();
