# SP26 SI100B Tutorial

This repository contains the MkDocs site for SI100B tutorial notes and supplementary materials.

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

## Repository

- GitHub: `git@github.com:Lceoliu/SP26_SI100B_Tutorial.git`

## Notes

- Source files are in `docs/`
- Theme overrides are in `overrides/`
- Generated static files are output to `site/` and should not be committed
