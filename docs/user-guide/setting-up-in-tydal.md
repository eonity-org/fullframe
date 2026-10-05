# Setting up an exhibition in TYDAL

[FullFrame user guide](README.md) › Setting up in TYDAL

*For TYDAL administrators.* Curators can't start an exhibition on their own:
each exhibition needs a **vault** in TYDAL to hold its photographs, and keys that
let FullFrame read and publish it. This page is the administrator's half of the
job. It's done once per organization, then once per exhibition, and takes a
couple of minutes.

The commands run on the TYDAL server. The `tools/clients/fullframe.sh` wrapper in
the TYDAL repository runs them the same way whether TYDAL runs in Docker or
directly on the host. The full reference is in TYDAL's
[CLI Guide](https://github.com/eonity-org/tydal/blob/main/docs/CLI.md#photo-exhibitions-full-frame).

## Once per organization

```bash
tools/clients/fullframe.sh setup --org=atlas --language=en
```

This prepares the organization for photo exhibitions: the *Photo Exhibition*
scheme (title, author, year, technique, dimensions, description), its search
index, and a **Photos** collection. `--language` is the language the
photographs' texts will be written in (`en`, `es`, `ca`…). It's safe to run
again.

## Once per exhibition

```bash
tools/clients/fullframe.sh create --org=atlas --name="Small Wonders" --curator=ana@example.org
```

This creates:

- a **workspace** for the exhibition's photographs;
- a **private gallery vault** that shows that workspace, set up so that
  photographs added from FullFrame land in it;
- a **read key** and a **write key**.

`--curator` (optional) gives that person access to the studio. It creates their
TYDAL account if needed (you're asked for a password) and makes them an
**editor** of the organization. `--role=viewer` gives a read-only studio instead,
and `--role=admin` also lets them administer the organization in TYDAL.

At the end the command prints:

```
Paste into Full Frame → "Connect an exhibition":
  Shared vault URL : https://tydal.example.org/v/atlas/small-wonders
  Read key         : tvk_…
  Write key        : tvk_…
```

**The keys are shown only this once.** Send the three lines to the curator
through a private channel; they paste them in FullFrame (see
[Curating an exhibition](curators.md#1--connect-the-exhibition)). If a key is
lost, mint a new one (below).

## What the keys allow

The write key carries six abilities, in two pairs of three:

| Abilities | Let FullFrame |
|---|---|
| `activate`, `open`, `close` | publish the curator's selection and close the exhibition again |
| `ingest`, `update`, `withdraw` | add photographs, correct their details, and remove them (curator uploads and the open call) |

A key without the second set can still publish, but the studio's *Add
photographs* box and the open call won't work. The studio says which abilities
are missing.

## Doing it by hand

Everything above can also be done in TYDAL's web interface, as a platform
administrator (see TYDAL's user guide,
[Workspaces and vaults](https://github.com/eonity-org/tydal/blob/main/docs/user-guide/06-workspaces-and-vaults.md)):

1. Create a workspace for the exhibition in the organization.
2. In **Platform administration → Vault Sharing**, create a vault with purpose
   **gallery**, state **private**, reading from that workspace.
3. In the vault's **Access keys**, mint a key with *read*, and one with
   *activate, open, close, ingest, update, withdraw*.
4. In the vault's **Capabilities**, set the **ingest target**, where photographs
   added from FullFrame land, to that workspace and the Photos collection.

Give the curator the vault's **human URL** (from *Sharing & reach*) and the two
keys.

## While the exhibition runs

- Don't change the vault's state or workspaces by hand while the exhibition is
  open. FullFrame does it when the curator publishes or closes.
- Photographs a curator removes go to TYDAL's trash, where you can restore them.
- After an exhibition is deleted in FullFrame, its photographs, workspace and
  vault stay in TYDAL. Archive or delete them there if they're no longer needed.

---

← [Being on a jury](jurors.md) · [Contents](README.md)
