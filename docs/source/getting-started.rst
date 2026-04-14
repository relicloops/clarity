Getting Started
===============

Requirements
------------

- Python 3.10+
- Sphinx 7.0+

Installation
------------

Install from PyPI:

.. code-block:: bash

   pip install sphinx-clarity

Minimal Configuration
---------------------

Add the theme to your ``conf.py``:

.. code-block:: python

   html_theme = "clarity"

This gives you:

- System theme preference detection (dark / light / system)
- Orbitron headings, Inter body text, Intel One Mono code
- Sidebar navigation with TOC highlighting
- Keyboard navigation (arrow keys for prev/next, ``/`` for search)
- Back-to-top button
- Responsive layout (desktop, tablet, mobile)

Development Install
-------------------

To work on the theme itself:

.. code-block:: bash

   git clone https://github.com/relicloops/clarity.git
   cd clarity
   pip install -e .

Then build the docs to preview changes:

.. code-block:: bash

   cd docs
   make html-dev

Open ``docs/build/html/index.html`` in your browser.
