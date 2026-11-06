# Market coverage and workflow audit — 2026-11-06

Baseline: b55ad46 (latest remote main at checkout). Raw Amazon history, parent eligibility, quarantined history and the published Mercado source payload are unchanged. Collection date is not rewritten to today when enriching a source title.

## Findings and changes

- `page=overview` previously selected the operations module by design. It now aliases market overview; operations links explicitly retain `module=operations`. Bare legacy `#overview` remains an operations shortcut.
- Mercado used a fixed units sort, despite its research routes sharing different titles. Added price bounds, six sorts, source-title model identification, parameter evidence, up to four comparable columns with model grouping, and comparison CSV. Unknown configuration/version remains unknown. Product CSV includes model and parameter evidence.
- Search/brand/price filters apply to product rows and their CSV; headline snapshot figures and share charts deliberately retain the complete scope. The UI states this distinction. Period inputs only change monthly history, not rolling snapshots.
- Added accessible monthly-point drill through to the source item and month. Missing days prevent automatic growth claims; no historical price or revenue is manufactured.
- Added coverage diagnostics to both platforms, with 168 country/platform/category scope records. Listing counts, title-model groups, project-confirmed model groups and qualified parent-months remain separate. Link coverage does not certify image content. There is no market denominator.
- Source-title models/parameters are explicitly unverified. Missing brands can use an explicit brand word in the same title; source brand is retained in memory. No region, warranty, current price, rating, ranking or sales eligibility is inferred from the model name.
- Reproduced and fixed a DOM re-entrancy error caused by price-input blur during render. Resource hashes were regenerated; the first stale-hash contract failure was corrected, not ignored.

## Brazil floor washers

Public Mercado baseline: 76 Listings, 76 snapshot representatives, 5 source brands, one Listing with monthly history. Source-title parsing identifies 75 titles containing supported model patterns, grouped into 29 provisional title-model groups. These are not 29 independently verified models. Parameter tokens exist in 41 titles. All 76 have a source snapshot price, units and revenue (including genuine source zeroes); only 71 image links pass structural validation. Image content/identity has not been certified for all records.

The local cache contains 2,448 unique Brazil source IDs across the earlier search paths. A targeted floor-cleaner name scan found 135 candidates, many being cleaning solution, rollers, filters, chargers and batteries. Two previously excluded full-machine titles conflict with a source cleaning-chemical taxonomy. Their source main images were reviewed locally and show Tineco floor washers. They are retained only in the loopback private research increment, bringing that research scope to 78; both have source 30-day units of zero. They add catalogue evidence, not market growth, new brands or confirmed independent models. Neither the new payload nor its identifiers, raw responses or private image review is added to this public repository.

No claim is made that 150 qualifying Listings have been found. The proposed target cannot be validated from available cache, and repeating completed searches would not solve model duplication. Further paid calls are paused: the connected tools state that credits are consumed but do not expose a verifiable per-call maximum. Free quota observation returned 1,236 remaining (164 used); business calls and added charges this run: zero. No package purchase.

Added a separate WAP Brazil manufacturer-reference profile for Floor Cleaner Mob FW007123: six manufacturer claims, no current price, no sales, no image borrowed from another product, and no claim of current availability. It is a reference in the official-channel research candidates, not a Mercado Listing. Source: [WAP manufacturer catalogue](https://mais.conteudo.wap.ind.br/wap/paginas_institucionais/catalogo_wap/catalogo_de_produtos/catalogo_de_produtos_digital_abril2025.pdf), Floor Cleaner Mob comparison column. Catalogue 2025; observed 2026-11-06. Source search/extraction was available; direct whole-PDF extraction exceeded the reader size limit. No catalogue facts are presented as live retail observations.

## Coverage boundaries

- Public Mercado stays at 1,082 source IDs and 32 retained histories. Local research may show 78 Brazil washers; public remains 76. Private additions are injected only by an external loopback preview handler, not a public script.
- All seven countries and all configured channels are represented in coverage diagnostics; unsupported Amazon AR/CL/CO or Mercado CA/US are no-data scopes, not inferred from another country's source.
- Snapshot units/revenue are third-party estimates and are not business operating sales. Different currencies and platforms are never summed by this feature.
- All other country/platform/category catalogue counts remain at the source baseline; this release enriches evidence and adds diagnostics, it does not pretend to expand those markets.
- Accurate local versions, independently verified models, full parameter completeness, validated image content, complete marketplace pagination and item-month revenue/prices remain incomplete. Mercado BSR/platform rank was not supplied and is not invented.
- A comparison matrix is now functional but direct-competitor confidence, price-neighbour grouping against a dated local UWANT offer, and functional-substitute layers are not yet certified. Same form is labelled configuration-unverified; no automatic UWANT superiority verdict.
- Amazon and Mercado continue to use different underlying aggregation eligibility rules. This release unifies evidence presentation and coverage terminology, not the incompatible history denominators.

## Next collection priorities

First confirm tool cost bounds and source publication rights. Then search Portuguese complete-machine terms (not broad accessory-heavy brand terms): “lavadora aspiradora piso”, “aspirador lava seca piso”, “Tineco Floor One”, “Dreame H12/H14”, “Roborock F25”, “WAP Floor Cleaner Mob”. Preserve exact query, class, pagination, cap and before/after IDs. Brand and model diversity, valid historical coverage and dated quotes are more useful than repeated offers for the same title-model.

For MX/CA, reuse existing Amazon caches; do not repeat quarantined 3909B, 3860B or ambiguous-parent histories. Prioritise same-form manufacturer evidence and dated local offers. Other countries need brand/model and price-band coverage checks before another broad query. No standing right to spend beyond verified cost bounds is inferred.

## Validation

`tests/coverage-system.cjs`: 14 new checks. Existing Mercado public contract, evidence contract (14), and public release contract pass. Actual browser validation covers 20 Mercado country/category routes, overview alias, explicit operations route and reload, price filter/sort refresh, model-aware comparison and CSV, mobile overflow, and private 78/public 76 separation. First browser render failure and stale resource-hash failure were corrected and rerun. No data test is represented as independent validation of vendor estimates.
