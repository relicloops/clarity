# Clarity Documentation Makefile
#
# Usage:
#   make html           - Build HTML documentation (uses venv theme)
#   make html-dev       - Build using local theme source (for development)
#   make serve          - Build and serve on port 8537
#   make serve-dev      - Build with local theme and serve
#   make open           - Build and open in default browser
#   make clean          - Remove build artifacts
#   make livehtml       - Auto-rebuild on changes (uses venv theme)
#   make livehtml-dev   - Auto-rebuild using local theme source

VENV        := .venv/bin
SPHINXBUILD := $(VENV)/sphinx-build
SOURCEDIR   := source
BUILDDIR    := build
PORT        := 8537

# Install local theme in editable mode for dev targets
LOCAL_INSTALL := $(VENV)/pip install -q -e ..

.PHONY: help html html-dev serve serve-dev open clean livehtml livehtml-dev

help:
	@echo "Clarity Documentation"
	@echo ""
	@echo "  make html           Build (venv/PyPI theme)"
	@echo "  make html-dev       Build (local theme source)"
	@echo "  make serve          Build and serve on port $(PORT)"
	@echo "  make serve-dev      Build with local theme and serve"
	@echo "  make open           Build and open in default browser"
	@echo "  make clean          Remove build artifacts"
	@echo "  make livehtml       Auto-rebuild (venv/PyPI theme)"
	@echo "  make livehtml-dev   Auto-rebuild (local theme source)"

html:
	$(SPHINXBUILD) -b html "$(SOURCEDIR)" "$(BUILDDIR)/html"
	@echo ""
	@echo "Build finished: $(BUILDDIR)/html/index.html"

html-dev:
	$(LOCAL_INSTALL)
	$(SPHINXBUILD) -b html "$(SOURCEDIR)" "$(BUILDDIR)/html"
	@echo ""
	@echo "Build finished (local theme): $(BUILDDIR)/html/index.html"

serve: html
	@echo "Serving at http://localhost:$(PORT)"
	$(VENV)/python3 -m http.server $(PORT) --directory "$(BUILDDIR)/html"

serve-dev: html-dev
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

livehtml-dev:
	$(LOCAL_INSTALL)
	$(VENV)/sphinx-autobuild "$(SOURCEDIR)" "$(BUILDDIR)/html" --port $(PORT) --open-browser --watch ../src/clarity
