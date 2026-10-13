targetScope = 'resourceGroup'

@allowed([
  'staging'
  'production'
])
param environmentName string

param location string = resourceGroup().location

@description('GitHub owner and repository, for example owner/letterly.')
param githubRepository string

@minLength(3)
@maxLength(24)
@description('Globally unique, lowercase Key Vault name for this environment.')
param keyVaultName string

@description('Stable HTTPS origin of this environment’s separate Vercel project.')
param webOrigin string

@description('Public GHCR API image pinned by digest, for example ghcr.io/owner/letterly-api@sha256:...')
param image string

@secure()
@description('Map of API environment variable names to versionless Key Vault secret URIs. Never pass secret values here.')
param runtimeSecretUris object

@description('Non-secret API settings, such as RESEND_FROM_EMAIL and PUBLIC_SUPPORT_CONTACT_URL.')
param runtimeEnvironment object = {}

var resourceSuffix = uniqueString(subscription().id, resourceGroup().id)
var workspaceName = 'law-letterly-${environmentName}-${resourceSuffix}'
var managedEnvironmentName = 'cae-letterly-${environmentName}-${resourceSuffix}'
var apiName = 'letterly-api-${environmentName}'
var runtimeIdentityName = 'uai-letterly-${environmentName}-runtime'
var githubIdentityName = 'uai-letterly-${environmentName}-github'
var runtimeEnvironmentEntries = [
  for entry in items(runtimeEnvironment): {
    name: entry.key
    value: string(entry.value)
  }
]
var runtimeSecretEnvironmentEntries = [
  for entry in items(runtimeSecretUris): {
    name: entry.key
    secretRef: replace(toLower(entry.key), '_', '-')
  }
]
var keyVaultSecretsUserRoleId = subscriptionResourceId(
  'Microsoft.Authorization/roleDefinitions',
  '4633458b-17de-408a-b874-0445c86b69e6'
)
var githubDeployerRoleDefinitionName = guid(resourceGroup().id, 'letterly-container-app-deployer')

resource logWorkspace 'Microsoft.OperationalInsights/workspaces@2022-10-01' = {
  name: workspaceName
  location: location
  tags: {
    application: 'letterly'
    environment: environmentName
  }
  properties: {
    features: {
      enableLogAccessUsingOnlyResourcePermissions: true
    }
    retentionInDays: 31
    sku: {
      name: 'PerGB2018'
    }
  }
}

resource keyVault 'Microsoft.KeyVault/vaults@2023-07-01' = {
  name: keyVaultName
  location: location
  tags: {
    application: 'letterly'
    environment: environmentName
  }
  properties: {
    tenantId: subscription().tenantId
    sku: {
      family: 'A'
      name: 'standard'
    }
    enableRbacAuthorization: true
    enablePurgeProtection: true
    softDeleteRetentionInDays: 7
    publicNetworkAccess: 'Enabled'
  }
}

resource runtimeIdentity 'Microsoft.ManagedIdentity/userAssignedIdentities@2023-01-31' = {
  name: runtimeIdentityName
  location: location
  tags: {
    application: 'letterly'
    environment: environmentName
  }
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
    roleName: 'Letterly Container App Deployer ${environmentName}'
    description: 'Update and inspect the Letterly API Container App without reading Container Apps secret values.'
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

resource managedEnvironment 'Microsoft.App/managedEnvironments@2024-03-01' = {
  name: managedEnvironmentName
  location: location
  tags: {
    application: 'letterly'
    environment: environmentName
  }
  properties: {
    appLogsConfiguration: {
      destination: 'log-analytics'
      logAnalyticsConfiguration: {
        customerId: logWorkspace.properties.customerId
        sharedKey: logWorkspace.listKeys().primarySharedKey
      }
    }
    workloadProfiles: [
      {
        name: 'Consumption'
        workloadProfileType: 'Consumption'
      }
    ]
    zoneRedundant: false
  }
}

module runtimeSecretsRoleAssignment './modules/key-vault-role-assignment.bicep' = {
  name: 'runtime-key-vault-secrets-role'
  params: {
    keyVaultName: keyVault.name
    principalId: runtimeIdentity.properties.principalId
    roleDefinitionId: keyVaultSecretsUserRoleId
  }
}

resource api 'Microsoft.App/containerApps@2024-03-01' = {
  name: apiName
  location: location
  tags: {
    application: 'letterly'
    environment: environmentName
  }
  identity: {
    type: 'UserAssigned'
    userAssignedIdentities: {
      '${runtimeIdentity.id}': {}
    }
  }
  properties: {
    managedEnvironmentId: managedEnvironment.id
    configuration: {
      activeRevisionsMode: 'Single'
      secrets: [
        for entry in items(runtimeSecretUris): {
          name: replace(toLower(entry.key), '_', '-')
          keyVaultUrl: string(entry.value)
          identity: runtimeIdentity.id
        }
      ]
      ingress: {
        external: true
        targetPort: 3001
        transport: 'auto'
        allowInsecure: false
      }
    }
    template: {
      containers: [
        {
          name: 'api'
          image: image
          resources: {
            cpu: json('0.5')
            memory: '1Gi'
          }
          env: concat(
            [
              {
                name: 'NODE_ENV'
                value: 'production'
              }
              {
                name: 'PORT'
                value: '3001'
              }
              {
                name: 'APP_ORIGIN'
                value: webOrigin
              }
              {
                name: 'BETTER_AUTH_URL'
                value: webOrigin
              }
              {
                name: 'SENTRY_ENVIRONMENT'
                value: environmentName
              }
            ],
            runtimeEnvironmentEntries,
            runtimeSecretEnvironmentEntries
          )
          probes: [
            {
              type: 'Startup'
              httpGet: {
                path: '/health'
                port: 3001
                scheme: 'HTTP'
              }
              periodSeconds: 5
              failureThreshold: 60
              timeoutSeconds: 5
            }
            {
              type: 'Liveness'
              httpGet: {
                path: '/health'
                port: 3001
                scheme: 'HTTP'
              }
              initialDelaySeconds: 10
              periodSeconds: 30
              failureThreshold: 3
              timeoutSeconds: 5
            }
            {
              type: 'Readiness'
              httpGet: {
                path: '/ready'
                port: 3001
                scheme: 'HTTP'
              }
              initialDelaySeconds: 5
              periodSeconds: 10
              failureThreshold: 3
              timeoutSeconds: 8
            }
          ]
        }
      ]
      scale: {
        minReplicas: 0
        maxReplicas: 2
      }
    }
  }
  dependsOn: [
    runtimeSecretsRoleAssignment
  ]
}

module githubDeploymentRoleAssignment './modules/container-app-role-assignment.bicep' = {
  name: 'github-container-app-deployer-role'
  params: {
    containerAppName: api.name
    principalId: githubDeploymentIdentity.properties.principalId
    roleDefinitionId: githubDeployerRoleDefinition.id
  }
}

output resourceGroupName string = resourceGroup().name
output containerAppName string = api.name
output apiBaseUrl string = 'https://${api.properties.configuration.ingress.fqdn}'
output keyVaultName string = keyVault.name
output githubClientId string = githubDeploymentIdentity.properties.clientId
output githubTenantId string = subscription().tenantId
output githubPrincipalId string = githubDeploymentIdentity.properties.principalId
