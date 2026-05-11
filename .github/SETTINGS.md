<!-- GitHub branch protection and settings file reference -->
<!-- This file documents recommended GitHub repository settings -->

# GitHub Repository Configuration Guide

## Recommended Settings

### Branch Protection Rules

Protect `main` and `develop` branches to ensure code quality:

**Settings → Branches → Add rule**

#### For Main Branch

```
Branch name pattern: main

☑ Require a pull request before merging
  ☑ Require approvals (1 or more)
  ☑ Dismiss stale pull request approvals when new commits are pushed
  ☑ Require code review from code owners

☑ Require status checks to pass before merging
  ☑ Require branches to be up to date before merging

  Status checks that must pass:
  ✓ test (18.x)
  ✓ test (20.x)
  ✓ test (22.x)
  ✓ build
  ✓ lint

☑ Require signed commits

☑ Require branches to be up to date before merging

✗ Allow force pushes
✗ Allow deletions
```

#### For Develop Branch

```
Branch name pattern: develop

☑ Require a pull request before merging
  ☑ Require approvals (1 or more)

☑ Require status checks to pass before merging
  Require branches to be up to date before merging

  Status checks that must pass:
  ✓ test (20.x)
  ✓ build
  ✓ lint

✗ Allow force pushes
✗ Allow deletions
```

---

## Required Secrets

**Settings → Secrets and variables → Actions**

### Production Environment (`production`)

```
NPM_TOKEN
  Description: npm publish token
  Get: npm token create --read-only=false
  Scopes needed: Publish packages
```

### Example Setup

```bash
# 1. Login to npm
npm login

# 2. Create token
npm token create

# 3. Copy token and add to GitHub secrets
# Settings → Secrets and variables → Actions
# New repository secret
# Name: NPM_TOKEN
# Value: [paste token]
```

---

## Recommended GitHub Features

### 1. **Code Owners** (Optional)

Create `.github/CODEOWNERS`:

```
# TypeScript packages
packages/sdk/                @username
packages/openai/              @username
packages/gemini/              @username

# Configuration
.github/                        @username
```

### 2. **Pull Request Templates**

Create `.github/pull_request_template.md`:

```markdown
## Description

Brief description of changes

## Type of Change

- [ ] Bug fix
- [ ] New feature
- [ ] Breaking change
- [ ] Documentation

## Testing

- [ ] Tests pass locally
- [ ] New tests added
- [ ] All tests pass

## Checklist

- [ ] Code follows style guidelines
- [ ] Documentation updated
- [ ] No breaking changes
```

### 3. **Issue Templates**

Create `.github/ISSUE_TEMPLATE/bug_report.md` and `feature_request.md`

---

## Auto-merge Configuration

Enable auto-merge for bots (optional):

**Settings → General → Pull Requests**

```
☑ Allow auto-merge
☐ Auto-delete head branches
```

---

## Notification Settings

**Settings → Notifications**

```
☑ Send notifications for
  ☑ Failed workflows
  ☑ Completed deployments
```

---

## Workflow Permissions

**Settings → Actions → General → Workflow permissions**

```
☑ Read and write permissions
☑ Allow GitHub Actions to create and approve pull requests
```

---

## Security Settings

**Settings → Code security and analysis**

```
✓ Enable Dependabot version updates
  - Check every Monday
  - Create PR for each update

✓ Enable secret scanning
  - Detect hardcoded secrets

✓ Enable private vulnerability reporting
  - Allow security reports
```

---

## Deployment Environments

For production releases:

**Settings → Environments → New environment**

Name: `production`

```
Deployment branches:
☑ Selected branches
  - refs/heads/main

Required reviewers:
☑ Add required reviewers
  - @maintainers

```

---

## Team Setup

**Settings → Access → Collaborators and teams**

```
Team: Maintainers
  - Maintain: All repositories
  - Can: Merge PRs, manage settings

Team: Contributors
  - Triage: Pull and push
  - Can: Create branches, review PRs
```

---

## Useful Integrations

- **Codecov** - Code coverage tracking
  - Sign up at https://codecov.io
  - Add token to NPM_TOKEN secret

- **Dependabot** - Automated dependency updates
  - Enabled by default in public repos
  - Configure in `.github/dependabot.yml`

- **GitHub Advanced Security** - Additional security scanning
  - Available for public repos
  - Includes SAST scanning

---

## Commands Reference

```bash
# View workflow status
gh workflow list

# Run workflow manually
gh workflow run ci.yml

# View workflow runs
gh run list

# View specific run logs
gh run view <run_id> --log

# List branches
gh repo list --visibility public
```

---

## Troubleshooting

**Workflows not running?**

- Check `.github/workflows/` files are valid YAML
- Ensure branch names match (case-sensitive)
- Check workflow permissions in Settings

**Protected branch rules not applying?**

- Ensure rule is enabled
- Check test names match exactly
- Verify required checks are in workflows

**NPM publish failing?**

- Verify NPM_TOKEN is valid
- Check token permissions
- Ensure version was updated in package.json

---

## References

- [GitHub Settings Documentation](https://docs.github.com/en/repositories/managing-your-repositorys-settings-and-features)
- [Branch Protection Rules](https://docs.github.com/en/repositories/configuring-branches-and-merges-in-your-repository/managing-protected-branches)
- [GitHub Secrets](https://docs.github.com/en/actions/security-guides/encrypted-secrets)
- [Status Checks](https://docs.github.com/en/repositories/configuring-branches-and-merges-in-your-repository/managing-protected-branches/about-protected-branches#about-branch-protection-rules)
