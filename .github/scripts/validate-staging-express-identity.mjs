import { readFileSync } from "node:fs";

const templatePath = process.argv[2];

if (!templatePath) {
  console.error("Pass the compiled identity-only Bicep template path.");
  process.exit(1);
}

const template = JSON.parse(readFileSync(templatePath, "utf8"));
const resources = template.resources;

function requireAssertion(condition, message) {
  if (!condition) {
    console.error(`Identity-only template validation failed: ${message}`);
    process.exit(1);
  }
}

requireAssertion(
  Array.isArray(resources),
  "the template must contain a resource list.",
);

const identityReference =
  "[reference(resourceId('Microsoft.ManagedIdentity/userAssignedIdentities', variables('githubIdentityName')), '2023-01-31').principalId]";
const roleDefinitionReference =
  "[resourceId('Microsoft.Authorization/roleDefinitions', variables('githubDeployerRoleDefinitionName'))]";
const containerAppScope =
  "[resourceId('Microsoft.App/containerApps', parameters('containerAppName'))]";

requireAssertion(
  resources.some(
    (resource) =>
      resource.type === "Microsoft.ManagedIdentity/userAssignedIdentities",
  ),
  "the GitHub deployment identity is missing.",
);

const federatedCredential = resources.find(
  (resource) =>
    resource.type ===
    "Microsoft.ManagedIdentity/userAssignedIdentities/federatedIdentityCredentials",
);

requireAssertion(
  federatedCredential,
  "the GitHub federated credential is missing.",
);
requireAssertion(
  federatedCredential.properties.issuer ===
    "https://token.actions.githubusercontent.com" &&
    federatedCredential.properties.subject ===
      "[format('repo:{0}:environment:{1}', parameters('githubRepository'), parameters('environmentName'))]" &&
    federatedCredential.properties.audiences.includes(
      "api://AzureADTokenExchange",
    ),
  "the federated credential must target the staging GitHub environment.",
);

const roleDefinition = resources.find(
  (resource) => resource.type === "Microsoft.Authorization/roleDefinitions",
);

requireAssertion(
  roleDefinition,
  "the Container Apps deployer role definition is missing.",
);
requireAssertion(
  roleDefinition.properties.permissions.length === 1 &&
    roleDefinition.properties.permissions[0].actions.length === 2 &&
    roleDefinition.properties.permissions[0].actions.includes(
      "Microsoft.App/containerApps/read",
    ) &&
    roleDefinition.properties.permissions[0].actions.includes(
      "Microsoft.App/containerApps/write",
    ) &&
    roleDefinition.properties.permissions[0].notActions.length === 0,
  "the deployer role must grant only Container Apps read and write actions.",
);

const roleAssignmentDeployment = resources.find(
  (resource) =>
    resource.type === "Microsoft.Resources/deployments" &&
    resource.name === "github-express-container-app-deployer-role",
);

requireAssertion(
  roleAssignmentDeployment,
  "the app-scoped role assignment module is missing.",
);
requireAssertion(
  roleAssignmentDeployment.properties.parameters.principalId.value ===
    identityReference &&
    roleAssignmentDeployment.properties.parameters.roleDefinitionId.value ===
      roleDefinitionReference,
  "the role assignment must use the generated GitHub identity and deployer role.",
);

const roleAssignment =
  roleAssignmentDeployment.properties.template.resources.find(
    (resource) => resource.type === "Microsoft.Authorization/roleAssignments",
  );

requireAssertion(roleAssignment, "the nested role assignment is missing.");
requireAssertion(
  roleAssignment.scope === containerAppScope &&
    roleAssignment.properties.roleDefinitionId ===
      "[parameters('roleDefinitionId')]" &&
    roleAssignment.properties.principalId === "[parameters('principalId')]" &&
    roleAssignment.properties.principalType === "ServicePrincipal",
  "the role assignment must grant the GitHub identity access only to the existing app.",
);

requireAssertion(
  !resources.some(
    (resource) =>
      resource.type === "Microsoft.App/containerApps" ||
      resource.type === "Microsoft.App/managedEnvironments",
  ),
  "the identity-only template must not create or update a Container App or environment.",
);

console.log(
  "Identity-only template role, federation, and app scope validated.",
);
