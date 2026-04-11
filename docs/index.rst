Clarity
=======

A clean Sphinx theme with phosphor-green / UV-violet dual-accent color system.

Clarity brings neon aesthetics to technical documentation without the noise --
no scanlines, no VHS effects, just sharp typography, thoughtful color routing,
and a reading experience that adapts to your preference.

.. admonition:: Dual-accent identity

   Dark mode uses **phosphor-green** (``#39ff14``) accents.
   Light mode uses **UV-violet** (``#7b2ff7``) accents.
   Toggle with the button in the header or let it follow your system.

Quick Install
-------------

.. code-block:: bash

   pip install clarity

Then in your ``conf.py``:

.. code-block:: python

   html_theme = "clarity"

That is all you need. The theme defaults to system preference detection
with the Orbitron / Inter / Intel One Mono font stack.

.. toctree::
   :maxdepth: 2
   :caption: User Guide

   getting-started
   configuration
   color-system
   typography
   dark-light-modes

.. toctree::
   :maxdepth: 2
   :caption: Reference

   components
   changelog
