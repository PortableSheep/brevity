# Publishing Brevity to npm

## Step 1: Set up npm credentials

If you don't have an npm account, create one at https://www.npmjs.com/

Then authenticate:

```bash
npm adduser
# or
npm login
```

## Step 2: Configure package names

All packages are scoped to `@<your-npm-username>`. Update the package names:

```bash
# For each package, update package.json name:
# Change @brevity/core → @your-username/brevity-core
# Change @brevity/plugin-cache → @your-username/brevity-plugin-cache
# etc.
```

Or use find-and-replace:

```bash
find packages -name "package.json" -exec sed -i '' 's/"@brevity\/"/"@your-username\/brevity-/g' {} \;
```

Then update imports in examples and tests to match.

## Step 3: Version bump

Update the version in all package.json files:

```bash
npm version minor --workspace @brevity/core
npm version minor --workspace @brevity/plugin-cache
npm version minor --workspace @brevity/plugin-debug
npm version minor --workspace @brevity/plugin-viewer
npm version minor --workspace @brevity/plugin-validation
```

Or manually edit each `packages/*/package.json` and change `"version": "0.1.0"` to `"0.2.0"`.

## Step 4: Build and test

```bash
npm run build
npm test
```

## Step 5: Publish

Publish each package:

```bash
npm publish --workspace @brevity/core --access public
npm publish --workspace @brevity/plugin-cache --access public
npm publish --workspace @brevity/plugin-debug --access public
npm publish --workspace @brevity/plugin-viewer --access public
npm publish --workspace @brevity/plugin-validation --access public
```

Or use the publish script:

```bash
npm run publish:all
```

## Step 6: Update starter template

Update the starter template to use your published packages:

```bash
# In starter/package.json, change:
# "@brevity/core": "^0.2.0"
# etc.
```

Then test the starter:

```bash
cp -r starter /tmp/test-app
cd /tmp/test-app
npm install
npm run dev
```

## Complete Publish Checklist

- [ ] `npm login` / `npm adduser`
- [ ] Update package names to your npm username scope
- [ ] Update imports in examples/ and test/
- [ ] Version bump (0.1.0 → 0.2.0 or higher)
- [ ] `npm run build && npm test` — all green
- [ ] `npm publish --workspace ...` for each package
- [ ] Verify on https://npmjs.com/@your-username
- [ ] Update starter/package.json dependencies
- [ ] Test starter template fresh install

## Publishing Script

Add to root package.json:

```json
{
  "scripts": {
    "publish:all": "npm publish --workspace @brevity/core --access public && npm publish --workspace @brevity/plugin-cache --access public && npm publish --workspace @brevity/plugin-debug --access public && npm publish --workspace @brevity/plugin-viewer --access public && npm publish --workspace @brevity/plugin-validation --access public"
  }
}
```

Then run:

```bash
npm run publish:all
```

---

## Dry Run

Test without publishing:

```bash
npm pack --workspace @brevity/core
npm pack --workspace @brevity/plugin-cache
# etc.

# Check the tarballs contain the right files
tar -tzf brevity-core-0.2.0.tgz | head -20
```

---

## Troubleshooting

**Error: Package name must be scoped when published to npm**
- Use `@your-username/package-name` format
- Verify with `npm ls -a --depth=0` in each package

**Error: You do not have permission to publish this package**
- Check you're logged in: `npm whoami`
- Verify the package name isn't already taken
- Check your npm account has 2FA disabled (or use `npm token`)

**Error: 401 Unauthorized**
- Run `npm login` again
- Check `.npmrc` doesn't have conflicting config
- Try `npm logout && npm login`

---

## Next Steps After Publishing

1. Update docs to point to npm packages
2. Create GitHub releases with version tags
3. Set up CI/CD to auto-publish on git tag
4. Link from README: "Install: `npm install @your-username/brevity-core`"
