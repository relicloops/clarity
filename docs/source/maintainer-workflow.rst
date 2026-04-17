Maintainer Workflow
===================

This page describes the local documentation workflow and the repository's
current CI and release behavior.

Local Docs Workflow
-------------------

Use the targets in ``docs/Makefile`` instead of calling ``sphinx-build``
directly.

.. list-table::
   :header-rows: 1
   :widths: 22 78

   * - Target
     - Purpose
   * - ``make html``
     - Build the docs using the theme installed in the docs virtualenv.
   * - ``make html-dev``
     - Install the local theme source with ``pip install -e ..`` and build
       against that checkout.
   * - ``make serve``
     - Build and serve ``docs/build/html`` on port ``8537``.
   * - ``make serve-dev``
     - Build against the local theme source and serve on port ``8537``.
   * - ``make open``
     - Build the docs and open the generated ``index.html`` in the default
       browser.
   * - ``make livehtml``
     - Run ``sphinx-autobuild`` on port ``8537``.
   * - ``make livehtml-dev``
     - Install the local theme source, then run ``sphinx-autobuild`` while
       watching both ``docs/source`` and ``../src/clarity``.

When you are editing the theme itself, prefer ``make html-dev`` or
``make livehtml-dev`` so template and static-asset changes are picked up from
the working tree instead of a previously installed wheel.

Editable Install Detail
~~~~~~~~~~~~~~~~~~~~~~~

The development targets rely on:

.. code-block:: bash

   pip install -e ..

That installs the theme package from the repository root into the docs
virtualenv in editable mode, so changes under ``src/clarity`` are reflected
without rebuilding or reinstalling a distribution artifact.

CI Behavior
-----------

The GitHub Actions setup is split across three workflow files so a red
main gate cannot produce a green release:

.. list-table::
   :header-rows: 1
   :widths: 28 72

   * - File
     - Role
   * - ``.github/workflows/main.yml``
     - Runs on every push to ``main`` and every pull request. Calls the
       reusable ``build-and-docs`` workflow. No publishing.
   * - ``.github/workflows/ci.yml``
     - Runs only on tag pushes matching ``v*``. Computes a publish gate
       from the tag diff, then calls the same reusable workflow, and
       publishes to PyPI plus creates the GitHub release only when the
       gate says publish. Keeps the filename ``ci.yml`` because PyPI's
       Trusted Publisher is bound to that exact path.
   * - ``.github/workflows/build-and-docs.yml``
     - Reusable (``workflow_call``). Build matrix on Python ``3.10``,
       ``3.12``, ``3.13``; docs built with ``sphinx-build -W`` on
       Python ``3.12`` (warnings-as-errors).

Because both entry points call the same reusable workflow, a tagged
release runs the exact build + docs checks that ``main`` already has to
pass. If either the ``check`` job or the publish gate says no,
``publish`` is skipped by ``needs:`` / ``if:`` and nothing is released.

Tag Types and Publish Gate
--------------------------

Git tags in this repository are used for two distinct purposes:

1. **Milestones**: a tag marks a point in history even when the theme
   itself is unchanged (docs-only work, audit snapshots, CHANGELOG
   regeneration, Makefile or CI tweaks). These tags must NOT produce a
   new PyPI release because nothing shipped in the wheel actually
   changed.
2. **Wheel releases**: a tag bundles a change in ``src/clarity/``,
   ``pyproject.toml``, ``README.md`` (PyPI long-description), or
   ``LICENSE``. Those tags MUST produce a new PyPI release.

The ``gate`` job inside ``ci.yml`` decides automatically which case
applies. It diffs the tag against the previous ``v*`` tag and publishes
only when at least one of the wheel-relevant paths changed:

.. code-block:: text

   src/clarity/**
   pyproject.toml
   README.md
   LICENSE

Anything else -- ``docs/**``, ``CHANGELOG.md``, ``cliff.toml``,
``.github/**``, ``Makefile``, ``.prompt/**``, audits, plans -- is
considered documentation or tooling and does not warrant a republish.

Override markers
~~~~~~~~~~~~~~~~

Two optional markers in the **annotated** tag message override the
default diff-based decision:

.. list-table::
   :header-rows: 1
   :widths: 24 76

   * - Marker
     - Behaviour
   * - ``[force-publish]``
     - Publish even if no wheel-relevant paths changed. Use for
       re-pushing an identical wheel after a failed upload.
   * - ``[skip-publish]``
     - Skip publish even if wheel-relevant paths changed. Use to cut
       a code milestone without releasing to PyPI yet.

Markers apply only to annotated tags. Light-weight tags have no
annotation and therefore fall through to the diff-based default, which
also matches the GPG-signing requirement.

Examples:

.. code-block:: bash

   # Docs-only tag: gate skips publish automatically.
   git tag -s v1.4.0-001 -m "docs: clarify skin contract"

   # Code change + explicit skip (maintainer wants to delay release).
   git tag -s v1.5.0-000 -m "feat: granular privacy [skip-publish]"

   # Republish identical wheel after a transient PyPI upload failure.
   git tag -s v1.4.1-000 -m "chore: republish v1.4.1 [force-publish]"

Release Behavior
----------------

When the gate says publish, the ``publish`` job in ``ci.yml`` performs:

1. Download the built distribution artifacts.
2. Publish the package to PyPI via OIDC Trusted Publisher.
3. Install ``git-cliff`` and generate release notes from ``cliff.toml``.
4. Create a GitHub release for the current tag.

When the gate says skip, a small ``skipped`` job writes a summary to
the GitHub Actions run page explaining why. No PyPI upload, no GitHub
release. The tag itself remains as the historical milestone.

Tags beginning with ``v0.`` are marked as prereleases. Other ``v*`` tags
are published as regular releases.

Versioning and Release
----------------------

Git tags follow the ``vMAJOR.MINOR.PATCH-BUILD`` format from the
``version-bumping`` skill (e.g. ``v1.3.0-000``). The ``-BUILD`` suffix
is a zero-padded counter that rolls over into the next ``PATCH`` when
it saturates. PyPI does not accept the hyphen form, so the repo keeps
two versions in lockstep:

.. list-table::
   :header-rows: 1
   :widths: 34 26 40

   * - Location
     - Format
     - Example
   * - Git tag, GitHub release, CHANGELOG header
     - ``vMAJOR.MINOR.PATCH-BUILD``
     - ``v1.3.0-000``
   * - ``docs/source/conf.py`` ``release``
     - Same as the git tag
     - ``"v1.3.0-000"``
   * - ``docs/source/conf.py`` ``version``
     - ``MAJOR.MINOR``
     - ``"1.3"``
   * - ``pyproject.toml`` ``version``
     - PEP 440 4-segment
     - ``"1.3.0.0"``

The reusable ``build-and-docs.yml`` has a "Sync version from tag" step
that only runs when ``github.ref`` starts with ``refs/tags/v``. It
rewrites ``pyproject.toml`` and ``docs/source/conf.py`` to match the
tag before the wheel is built, so:

- Wheel filename: ``sphinx_clarity-1.3.0.0-...whl`` (PyPI accepts this).
- Sidebar shows: ``v1.3.0-000``.
- CHANGELOG header shows: ``## v1.3.0-000 (YYYY-MM-DD)``.

``src/clarity/__init__.py`` reads ``__version__`` from
``importlib.metadata.version("sphinx-clarity")`` rather than hardcoding,
so the installed wheel's version is the source of truth at runtime.

Issue Triage
------------

``.github/ISSUE_TEMPLATE/`` ships **structured YAML issue forms**
instead of the default Markdown templates. Two forms plus a chooser:

.. list-table::
   :header-rows: 1
   :widths: 28 28 44

   * - Form
     - Auto-labels
     - Required fields
   * - ``bug_report.yml``
     - ``bug`` + ``needs-triage``
     - Clarity version, feature area, Python version, Sphinx version,
       reproduction steps, expected vs actual.
   * - ``feature_request.yml``
     - ``type:feature`` + ``needs-triage``
     - Feature area, problem statement, proposed solution.
   * - ``config.yml``
     - n/a
     - ``blank_issues_enabled: false`` + contact links to Discussions,
       the docs tree, and the audit tree.

Both forms share the same **feature area** enum so triage can filter
by category consistently: Theme / Chatbot / Search / Privacy / Update
checker / Text-size / Retro 404 / Docs-CI-packaging / Other. The bug
form additionally collects the active **skin** (Default, Unicorn,
Programmer, Matrix, Rainbow, Darcula, Coder) and an optional
``html_theme_options`` paste block rendered as Python for copy/paste
triage.

Both forms pre-fill the issue title (``[bug] `` or ``[feature] ``) so
the tracker list stays readable at a glance. The chooser disables
blank issues -- readers must pick a form or follow a contact link.

When editing a form, keep the ``id`` values stable. GitHub stores
form submissions as rendered Markdown with hidden ``<!-- ... -->``
comments keyed on the ``id``; renaming an id loses the link between
old and new submissions.

Practical Notes
---------------

- Keep documentation warning-free. The CI docs job treats warnings as errors.
- If a change affects templates, CSS, or JavaScript, use the ``-dev`` doc
  targets locally before tagging a release.
- Release notes are generated from conventional commits through ``git-cliff``.
