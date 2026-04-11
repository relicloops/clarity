# Clarity Documentation Makefile
#
# Usage:
#   make html       - Build HTML documentation
#   make serve      - Build and serve on port 8537
#   make open       - Build and open in default browser
#   make clean      - Remove build artifacts
#   make livehtml   - Auto-rebuild on changes (requires sphinx-autobuild)

VENV        := .venv/bin
SPHINXBUILD := $(VENV)/sphinx-build
SOURCEDIR   := source
BUILDDIR    := build
PORT        := 8537

.PHONY: help html serve open clean livehtml

help:
	@echo "Clarity Documentation"
	@echo ""
	@echo "  make html       Build HTML documentation"
	@echo "  make serve      Build and serve on port $(PORT)"
	@echo "  make open       Build and open in default browser"
	@echo "  make clean      Remove build artifacts"
	@echo "  make livehtml   Auto-rebuild on changes (requires sphinx-autobuild)"

html:
	$(SPHINXBUILD) -b html "$(SOURCEDIR)" "$(BUILDDIR)/html"
	@echo ""
	@echo "Build finished: $(BUILDDIR)/html/index.html"

serve: html
	@echo "Serving at http://localhost:$(PORT)"
	$(VENV)/python3 -m http.server $(PORT) --directory "$(BUILDDIR)/html"

open: html
	@open "$(BUILDDIR)/html/index.html" 2>/dev/null || \
	 xdg-open "$(BUILDDIR)/html/index.html" 2>/dev/null || \
	 echo "Open $(BUILDDIR)/html/index.html in your browser"

clean:
	rm -rf "$(BUILDDIR)"

livehtml:
	$(VENV)/sphinx-autobuild "$(SOURCEDIR)" "$(BUILDDIR)/html" --port $(PORT) --open-browser
