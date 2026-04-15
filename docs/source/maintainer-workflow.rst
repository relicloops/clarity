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
     - Runs only on tag pushes matching ``v*``. Calls the same reusable
       workflow, then publishes to PyPI and creates the GitHub release.
       Keeps the filename ``ci.yml`` because PyPI's Trusted Publisher is
       bound to that exact path.
   * - ``.github/workflows/build-and-docs.yml``
     - Reusable (``workflow_call``). Build matrix on Python ``3.10``,
       ``3.12``, ``3.13``; docs built with ``sphinx-build -W`` on
       Python ``3.12`` (warnings-as-errors).

Because both entry points call the same reusable workflow, a tagged
release runs the exact build + docs checks that ``main`` already has to
pass. If either fails on the tagged commit, ``publish`` is skipped by
``needs:`` and nothing is released.

Release Behavior
----------------

The publish job in ``ci.yml`` performs:

1. Download the built distribution artifacts.
2. Publish the package to PyPI via OIDC Trusted Publisher.
3. Install ``git-cliff`` and generate release notes from ``cliff.toml``.
4. Create a GitHub release for the current tag.

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

Practical Notes
---------------

- Keep documentation warning-free. The CI docs job treats warnings as errors.
- If a change affects templates, CSS, or JavaScript, use the ``-dev`` doc
  targets locally before tagging a release.
- Release notes are generated from conventional commits through ``git-cliff``.
