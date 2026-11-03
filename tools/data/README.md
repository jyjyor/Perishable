# FoodKeeper source data

`foodkeeper.json` is the USDA FSIS FoodKeeper dataset, English edition,
kept here unmodified as the source record for every shelf-life value in
index.html. The app never loads this file; tools/import-foodkeeper.js
reads it and writes a compact table into index.html.

- Dataset: FSIS - FoodKeeper Data, https://catalog.data.gov/dataset/fsis-foodkeeper-data
- License: CC0 1.0 (public domain), https://creativecommons.org/publicdomain/zero/1.0/
- File URL listed by the catalog: https://www.fsis.usda.gov/shared/data/EN/foodkeeper.json
- Dataset last updated (catalog dateModified): 2025-01-22. The file's own
  Version sheet reads data version 128, modified 09-06-2018
  (fileName FMA-Data-v128.xlsx).
- Downloaded: 2026-11-02.

## How it was obtained

fsis.usda.gov answers automated requests to that URL with 403 Access
Denied, so the file came from the Internet Archive's capture of the
same URL at 2025-07-02 18:23:20 UTC, fetched raw (no archive rewriting):
https://web.archive.org/web/20250702182320id_/https://www.fsis.usda.gov/shared/data/EN/foodkeeper.json

The archive stored the body as served, gzip-encoded. Its SHA-1 (base32
676CHRGJHGCERQXXKMAAPV2QL2MK5WG3) matches the archive's own index entry
for that capture, so the bytes are the server's. The only step taken
here was gunzip, which undoes the transfer encoding:

- foodkeeper.json: 631,800 bytes, sha256
  037df0d301126acd8a48824506f04d49d8be1a1144b81fa69e4170228dc2e91a

Replace it with a direct download from fsis.usda.gov when that becomes
possible, and re-run the importer.
