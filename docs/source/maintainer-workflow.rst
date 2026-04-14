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

The GitHub Actions workflow in ``.github/workflows/ci.yml`` currently runs
three jobs:

.. list-table::
   :header-rows: 1
   :widths: 18 82

   * - Job
     - Behavior
   * - ``build``
     - Builds the sdist and wheel and smoke-tests installation on Python
       ``3.10``, ``3.12``, and ``3.13``.
   * - ``docs``
     - Builds the Sphinx docs on Python ``3.12`` with ``sphinx-build -W``, so
       warnings fail the job.
   * - ``publish``
     - Runs only for tags matching ``refs/tags/v*`` after ``build`` and
       ``docs`` succeed.

Release Behavior
----------------

The publish job performs the current release workflow:

1. Download the built distribution artifacts.
2. Publish the package to PyPI.
3. Install ``git-cliff`` and generate release notes from ``cliff.toml``.
4. Create a GitHub release for the current tag.

Tags beginning with ``v0.`` are marked as prereleases. Other ``v*`` tags are
published as regular releases.

Practical Notes
---------------

- Keep documentation warning-free. The CI docs job treats warnings as errors.
- If a change affects templates, CSS, or JavaScript, use the ``-dev`` doc
  targets locally before tagging a release.
- Release notes are generated from conventional commits through ``git-cliff``.
