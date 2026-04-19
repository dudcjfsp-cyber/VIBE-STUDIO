# Prompt Web Thin App

This directory is a frozen, minimal validation surface.

Current role:
- low-level engine signal inspection
- minimum renderer output inspection
- fallback manual verification surface only

Non-role:
- product frontend baseline
- new feature development surface
- source-of-truth UX reference

Retirement boundary:
- when `product-web` and scripted verification fully cover its remaining value,
  this directory and `scripts/serve-prompt-web.mjs` can be removed together.
