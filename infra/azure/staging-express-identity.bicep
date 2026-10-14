targetScope = 'resourceGroup'

@allowed([
  'staging'
])
param environmentName string = 'staging'

@description('GitHub owner and repository, for example kingsmark16/Letterly.')
param githubRepository string

@description('Name of the already-created Express Container App.')
param containerAppName string = 'letterly-api-staging'

param location string = resourceGroup().location

var githubIdentityName = 'uai-letterly-staging-github'
var githubDeployerRoleDefinitionName = guid(resourceGroup().id, 'letterly-express-container-app-deployer')

resource api 'Microsoft.App/containerApps@2026-07-01' existing = {
  name: containerAppName
}

resource githubDeploymentIdentity 'Microsoft.ManagedIdentity/userAssignedIdentities@2023-01-31' = {
  name: githubIdentityName
  location: location
  tags: {
    application: 'letterly'
    environment: environmentName
  }
}

resource githubDeployerRoleDefinition 'Microsoft.Authorization/roleDefinitions@2022-04-01' = {
  name: githubDeployerRoleDefinitionName
  properties: {
    roleName: 'Letterly Express Container App Deployer ${environmentName}'
    description: 'Update and inspect the Letterly staging Express app without reading app secret values.'
    type: 'CustomRole'
    permissions: [
      {
        actions: [
          'Microsoft.App/containerApps/read'
          'Microsoft.App/containerApps/write'
        ]
        notActions: []
      }
    ]
    assignableScopes: [
      resourceGroup().id
    ]
  }
}

resource githubFederatedCredential 'Microsoft.ManagedIdentity/userAssignedIdentities/federatedIdentityCredentials@2023-01-31' = {
  parent: githubDeploymentIdentity
  name: 'github-${environmentName}'
  properties: {
    issuer: 'https://token.actions.githubusercontent.com'
    subject: 'repo:${githubRepository}:environment:${environmentName}'
    audiences: [
      'api://AzureADTokenExchange'
    ]
  }
}

module githubDeploymentRoleAssignment './modules/container-app-role-assignment.bicep' = {
  name: 'github-express-container-app-deployer-role'
  params: {
    containerAppName: api.name
    principalId: githubDeploymentIdentity.properties.principalId
    roleDefinitionId: githubDeployerRoleDefinition.id
  }
}

output resourceGroupName string = resourceGroup().name
output containerAppName string = api.name
output apiBaseUrl string = 'https://${api.properties.configuration.ingress.fqdn}'
output githubClientId string = githubDeploymentIdentity.properties.clientId
output githubTenantId string = subscription().tenantId
output githubPrincipalId string = githubDeploymentIdentity.properties.principalId
