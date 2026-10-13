# Review, feat/m12-bicep-validation, 2026-10-13

**Reviewed by**: GPT-5.6 Terra (author on GPT-6 Luna)
**Scope**: 6 files, feat/m12-bicep-validation vs origin/feat/milestone-12-deployment-workflow
**Scope tracking**: Ticked `Review it` for deployment feature 21 in `docs/scope/scope.md`.
**Verdict**: Approve

## Summary

This change adds an Azure Bicep compilation and generated-template validation gate before Prisma work, restructures `main.bicep` so it compiles, and records the completed independent review in the deployment scope. The two nested role-assignment modules derive their GUIDs from scope, principal ID, and role definition ID, resolving the identity replacement recovery risk. CI verifies the fractional CPU expression, both outer managed-identity mappings, and the two inner role-assignment principal invariants.

## Strengths

- The nested role-assignment modules use the correct principal IDs for both the GUID and assignee, preventing Azure RBAC name reuse after an identity replacement.
- The workflow validates compilation, the fractional CPU expression, module count, identity mapping, and the inner role-assignment contract before Prisma setup.

## Test coverage

The added CI command and this review confirmed that Bicep compilation succeeds, the generated CPU value is the ARM expression `[json('0.5')]`, and exactly two inner role assignments use the shared principal parameter in their GUIDs and properties. The CI assertion also confirms the Key Vault module receives the runtime identity and the Container App module receives the GitHub deployment identity.
