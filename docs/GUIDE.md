# Running an exhibition

TYDAL owns the photographs and the vault projection. Full Frame owns the exhibition presentation, jury records and the curator's selection.

## Sign in

Sign into the studio (`/admin`) with your **TYDAL account**. You see the
exhibitions of your TYDAL organizations: as owner, admin or editor you manage
them; as viewer you can look but not change anything. The installation admin
signs in with the Full Frame password and sees every exhibition.

## Connect

In TYDAL, an administrator prepares the exhibition once: `php artisan exhibitions:create --org=… --name="…"` creates its workspace and a private gallery vault (ready for uploads) and prints the shared URL and two keys to paste here — after `php artisan exhibitions:setup --org=…` has prepared the organization once. (By hand: create a gallery vault over the workspace containing the photographs.) In Full Frame's `/admin`, paste the vault's shared URL and choose **Check connection**. Both `/h/{vaultHash}` and `/v/{organization}/{vaultSlug}` are accepted; Full Frame resolves and retains the machine hash.

For a private vault, expand the credential fields and enter its read key. Add a write key with `w:activate`, `w:open` and `w:close` to publish and close from Full Frame; add `w:ingest`, `w:update` and `w:withdraw` to it as well to add and correct photographs from Full Frame. The URL must be a standing vault URL, without an expiring signed grant or a resource suffix. Full Frame currently supports vault keys rather than storing signed grants.

Confirm the discovered vault and create the exhibition. Its public path is generated from the title. Connection settings remain available on Overview. A replacement vault needs a new exhibition so its votes cannot be confused with those of the previous vault.

## Add photographs

While the exhibition is in setup, **Overview** has an **Add photographs** panel, and a new exhibition opens on it. Choose or drop images and give each one its details. Title and author are required: the title's starting text comes from the file name, so correct it, since the title is how visitors and jurors will know the photograph. Technique (e.g. Silver gelatin print), dimensions (e.g. 50 × 70 cm) and description are optional, and a blank one simply doesn't appear in the gallery. They go straight into the vault in TYDAL with those details, exactly as written — TYDAL doesn't rewrite them — and appear once TYDAL has prepared their previews. You don't need a TYDAL account.

Photographs added here are listed under **Added here**, with **Edit** to correct their details (title and author stay required; clearing an optional one removes it) and **Remove**, also only during setup; removed ones go to TYDAL's trash, where an administrator can still recover them. Photographs that reached the vault another way are managed in TYDAL. Once judging starts, the collection and its details are fixed.

This needs two things set up once in TYDAL by an administrator: the vault's **Ingest target** (the workspace and collection new photographs land in, which must be one the vault shows) and a write key with `w:ingest`, `w:update` and `w:withdraw`. Without them the panel says what's missing.

## Prepare the gallery

On **Overview**, edit the title, subtitle, introduction and cover photograph. On **Appearance**, choose a theme for atmosphere and typography, a collection layout, and a palette for accents. White Gallery, Dark Gallery and Editorial all leave photographs uncropped. The five palettes match TYDAL: Blue, William, Plum, Graphite and Copper.

Under **Visitor views**, enable **Mosaic**, **Gallery** and/or **Wall**, keeping at least one available. Choose the **Default view** opened by “Enter the exhibition”. The gallery navigation shows only enabled views, and direct links to disabled views redirect to the default. About remains available.

**Mosaic** is a dedicated Google Photos–style view: compact rows, narrow gaps and titles on hover or keyboard focus; tap a photograph to see its title and larger view. **Gallery** places captions beneath photographs and offers flowing rows or uniform Grid cards. **Wall** shows one photograph at a time. New exhibitions enable all three, with Gallery as the default. The public exhibition directory uses the chosen cover and palette for each poster.

The live preview shows the actual photographs. Choose a preview view or navigate between enabled views while comparing styles. **Apply appearance** saves the choice for visitors; unsaved preview parameters work only in an authenticated curator session. Studio and jury do not inherit public gallery styling.

## Optional jury

Invite jurors by name and copy their personal links. Full Frame does not send invitations. Start judging to enable scores. New exhibitions use one **Overall impression** score from 1 to 5; existing exhibitions retain their criteria and votes.

Jurors see a photograph with its score controls and a private note field. Changes save automatically, with saving and error feedback. The grid and next/previous controls allow review in any order. Personal links return jurors to their saved work. You can revoke a juror or regenerate their link on Overview.

Close judging when ready to select. Votes become read-only. Scores and notes remain in Full Frame even if photographs later stop being projected by the vault; the jury screen can display only photographs currently available through that vault. Vote and scoring exports provide the stored record.

## Select and publish

On **Selection & publish**, choose photographs directly. If a jury took place, mean scores help compare them. A jury is not required. Save the selection, then publish and confirm.

Full Frame verifies every selected hash in the current vault. It calls TYDAL's `activate` method followed by `open`, and marks the exhibition open only after both calls succeed. If activation succeeds but opening fails, the interface explains that the selection reached TYDAL and publishing can be retried. These are two separate requests, not a cross-system transaction.

Visitors can now enter About and the enabled views. Mosaic and Gallery offer text/tag filtering; photograph links open Wall at the selected photograph. When Wall is disabled, a lightbox provides the larger view. Wall offers slideshow and keyboard navigation. The public site reads TYDAL without using the curator's read key.

To revise an open exhibition, close it from this same page. TYDAL makes the vault private and restores its pre-selection workspace projection. Adjust the saved selection and publish again. Photograph records are not deleted from TYDAL or its search index by this workflow.

## Archive and deletion

The admin exposes vote data and the scoring record captured at publication. Reopening captures a new publication record. Back up Full Frame's SQLite database to preserve its local history and credentials.

Deleting a Full Frame exhibition removes its local jurors, scores, notes and settings, leaving TYDAL photographs intact. An open exhibition must first be closed. Deletion requires typing the exhibition path to confirm.
