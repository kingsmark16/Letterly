targetScope = 'resourceGroup'

@allowed([
  'staging'
])
param environmentName string = 'staging'

param location string = resourceGroup().location

@description('GitHub owner and repository, for example kingsmark16/Letterly.')
param githubRepository string

@description('Stable HTTPS origin of the separate staging Vercel project.')
param webOrigin string

@description('Public Linux/amd64 GHCR API image pinned by digest.')
param image string

@description('Non-secret API settings, such as R2 endpoint, bucket, sender, and support URL.')
param runtimeEnvironment object = {}

var resourceSuffix = uniqueString(subscription().id, resourceGroup().id)
var workspaceName = 'law-letterly-staging-${resourceSuffix}'
var managedEnvironmentName = 'cae-letterly-staging-${resourceSuffix}'
var apiName = 'letterly-api-staging'
var githubIdentityName = 'uai-letterly-staging-github'
var runtimeEnvironmentEntries = [
  for entry in items(runtimeEnvironment): {
    name: entry.key
    value: string(entry.value)
  }
]
var githubDeployerRoleDefinitionName = guid(resourceGroup().id, 'letterly-express-container-app-deployer')

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

resource managedEnvironment 'Microsoft.App/managedEnvironments@2026-07-01' = {
  name: managedEnvironmentName
  location: location
  tags: {
    application: 'letterly'
    environment: environmentName
  }
  properties: {
    environmentMode: 'Express'
    appLogsConfiguration: {
      destination: 'log-analytics'
      logAnalyticsConfiguration: {
        customerId: logWorkspace.properties.customerId
        sharedKey: logWorkspace.listKeys().primarySharedKey
      }
    }
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

resource api 'Microsoft.App/containerApps@2026-07-01' = {
  name: apiName
  location: location
  tags: {
    application: 'letterly'
    environment: environmentName
  }
  properties: {
    environmentId: managedEnvironment.id
    configuration: {
      activeRevisionsMode: 'Single'
      ingress: {
        external: true
        targetPort: 3001
        transport: 'http'
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
            runtimeEnvironmentEntries
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
output managedEnvironmentName string = managedEnvironment.name
output logWorkspaceName string = logWorkspace.name
output githubClientId string = githubDeploymentIdentity.properties.clientId
output githubTenantId string = subscription().tenantId
output githubPrincipalId string = githubDeploymentIdentity.properties.principalId
