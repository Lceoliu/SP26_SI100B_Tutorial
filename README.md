# SP26 SI100B Tutorial

This repository contains the MkDocs site for SI100B Spring 2026 tutorial notes and supplementary materials.

## Stack

- MkDocs
- Material for MkDocs
- MathJax for formulas
- Giscus for comments

## Local preview

If you use the current local environment, activate Conda first:

```powershell
conda activate base
```

Then run:

```powershell
mkdocs serve
```

The site will usually be available at:

```text
http://127.0.0.1:8000/
```

## Build

```powershell
conda activate base
mkdocs build
```

## Deploy

This repository is configured to deploy to GitHub Pages with GitHub Actions.

After pushing to `main`, the workflow in `.github/workflows/deploy.yml` will:

1. install the MkDocs dependencies
2. build the site
3. upload the static artifact
4. deploy it to GitHub Pages

Expected site URL:

```text
https://lceoliu.github.io/SP26_SI100B_Tutorial/
```

GitHub Pages should be configured in the repository settings as:

- `Settings -> Pages -> Source -> GitHub Actions`

## Repository

- GitHub: `git@github.com:Lceoliu/SP26_SI100B_Tutorial.git`

## Notes

- Source files are in `docs/`
- Theme overrides are in `overrides/`
- Generated static files are output to `site/` and should not be committed
