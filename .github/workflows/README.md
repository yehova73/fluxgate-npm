# GitHub Actions Workflows

This directory contains automated workflows for continuous integration, testing, and deployment.

## 📋 Workflows Overview

### 1. **CI** (`.github/workflows/ci.yml`)

Main continuous integration workflow that runs on every push and pull request.

**Triggers:**

- Push to `main` or `develop` branches
- Pull requests against `main` or `develop` branches

**Jobs:**

#### Test

- Runs on Node.js 18.x, 20.x, 22.x
- Installs dependencies
- Runs type checking
- Runs full test suite
- Generates coverage reports
- Uploads coverage to Codecov (Node 20.x only)

#### Build

- Runs after tests pass
- Builds all packages
- Verifies output directories
- Archives build artifacts

#### Lint & Format

- Type checks all packages
- Ensures no uncommitted changes

**Status:** ✅ Ready to use

---

### 2. **Release** (`.github/workflows/release.yml`)

Manual workflow for releasing packages to npm.

**Triggers:**

- Workflow dispatch (manual trigger via GitHub UI)

**Inputs:**

```
package: all | sdk | openai | gemini
version: patch | minor | major
```

**Jobs:**

#### Pre-release Checks

- Runs tests
- Builds packages
- Verifies build outputs

#### Release

- Requires production environment (add secrets)
- Creates release notes
- Publishes packages to npm

**Setup Required:**

```bash
# Add NPM token to repository secrets:
# Settings → Secrets and variables → Actions
# Add NPM_TOKEN with your npm publish token
```

**Status:** ⚠️ Requires NPM_TOKEN setup

---

### 3. **PR Validation** (`.github/workflows/pr-validation.yml`)

Additional validation for pull requests with helpful comments.

**Triggers:**

- Pull requests against `main` or `develop` branches

**Checks:**

- Breaking change detection
- Type checking
- Test execution
- Build verification
- Automatic PR comments with status
- Security audit
- Hardcoded credential detection

**Status:** ✅ Ready to use

---

### 4. **Dependencies** (`.github/workflows/dependencies.yml`)

Scheduled workflow to monitor dependency health.

**Triggers:**

- Scheduled: Mondays at 9 AM UTC
- Manual trigger via workflow dispatch

**Checks:**

- Lists outdated packages
- Audits for vulnerabilities
- Creates GitHub issues for attention

**Status:** ✅ Ready to use

---

## 🚀 Getting Started

### 1. Enable GitHub Actions

GitHub Actions are enabled by default. No setup needed.

### 2. Add Required Secrets

For the Release workflow to publish to npm:

```
Settings → Secrets and variables → Actions → New repository secret

Name: NPM_TOKEN
Value: [Your npm publish token]
```

Get your npm token:

```bash
npm token create
# Or at https://www.npmjs.com/settings/~/tokens
```

### 3. Setup Branch Protection (Optional but Recommended)

Requires CI to pass before merging:

```
Settings → Branches → main/develop → Add rule
Require status checks to pass before merging:
  - test (18.x, 20.x, 22.x)
  - build
  - lint
```

---

## 📊 Workflow Status

View workflow status in the repository:

- **Actions tab** - Real-time workflow runs
- **Commit badges** - Status per commit
- **PR checks** - Status per pull request

---

## 🔧 Customization

### Change Node.js versions

Edit `ci.yml`:

```yaml
strategy:
  matrix:
    node-version: [18.x, 20.x, 22.x] # Change versions here
```

### Change schedule for dependency checks

Edit `dependencies.yml`:

```yaml
schedule:
  - cron: "0 9 * * 1" # Mondays at 9 AM UTC
```

[Cron syntax reference](https://crontab.guru/)

### Add additional checks

Edit any `.yml` file to add steps:

```yaml
- name: Custom check
  run: |
    # Your commands here
```

---

## 🐛 Troubleshooting

### Workflow not triggering

- Check workflow file syntax (validate as YAML)
- Ensure branch names match (case-sensitive)
- Check if workflows are enabled in Settings

### Tests failing in CI but passing locally

- Different Node.js versions may have different behavior
- Check `.npmrc` or `.nvmrc` files
- Verify environment variables are set

### Codecov upload failing

- Codecov integration is optional and won't block CI
- Remove the Codecov step if not needed
- Or sign up at https://codecov.io

### NPM publish failing

- Verify NPM_TOKEN secret is set correctly
- Check token has publish permissions
- Ensure package.json version is updated

---

## 📚 References

- [GitHub Actions Documentation](https://docs.github.com/en/actions)
- [Workflow Syntax](https://docs.github.com/en/actions/using-workflows/workflow-syntax-for-github-actions)
- [Node.js Setup Action](https://github.com/actions/setup-node)
- [Codecov Action](https://github.com/codecov/codecov-action)

---

## 💡 Best Practices

1. **Review workflow logs** - Check Actions tab for any warnings
2. **Pin action versions** - Prevents breaking changes
3. **Keep workflows simple** - Easier to debug and maintain
4. **Test locally first** - Run commands locally before CI
5. **Monitor runs** - Set up notifications for failures

---

## 🔒 Security

All workflows follow security best practices:

- ✅ No hardcoded secrets
- ✅ Minimal permissions required
- ✅ API token validation
- ✅ Automated security audits
- ✅ Read-only on pull requests (for external contributors)

---

Need help? Check the Actions tab for detailed logs of any failed runs.
