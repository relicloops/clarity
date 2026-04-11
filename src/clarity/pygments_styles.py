"""Clarity Pygments styles — phosphor-tinted syntax highlighting.

Dark style:  phosphor-green keywords, cyan strings, orange numbers.
Light style: UV-violet keywords, blue strings, red numbers.
"""

from pygments.style import Style
from pygments.token import (
    Comment,
    Error,
    Generic,
    Keyword,
    Literal,
    Name,
    Number,
    Operator,
    Punctuation,
    String,
    Text,
    Token,
    Whitespace,
)


class ClarityDarkStyle(Style):
    """Phosphor-green tinted dark style."""

    name = "clarity-dark"
    background_color = "#0a0a0f"
    highlight_color = "rgba(57, 255, 20, 0.1)"

    styles = {
        Token:              "#e0e0f0",
        Whitespace:         "",
        Text:               "#e0e0f0",

        Comment:            "italic #606080",
        Comment.Preproc:    "noitalic #606080",
        Comment.Special:    "italic bold #606080",

        Keyword:            "bold #39ff14",
        Keyword.Constant:   "#39ff14",
        Keyword.Type:       "#a855f7",

        Operator:           "#8888a0",
        Operator.Word:      "bold #39ff14",

        Punctuation:        "#7070a0",

        Name:               "#e0e0f0",
        Name.Builtin:       "#c0c0d8",
        Name.Function:      "#a855f7",
        Name.Class:         "bold #e0e0f0",
        Name.Namespace:     "#e0e0f0",
        Name.Exception:     "bold #ff3366",
        Name.Variable:      "#a855f7",
        Name.Decorator:     "#a855f7",
        Name.Tag:           "#39ff14",
        Name.Attribute:     "#00ffff",

        String:             "#00ffff",
        String.Doc:         "italic #00cccc",
        String.Escape:      "bold #00dddd",
        String.Interpol:    "bold #00ffff",
        String.Regex:       "#00ffaa",

        Number:             "#ff6600",

        Literal:            "#e0e0f0",

        Generic.Heading:    "bold #e0e0f0",
        Generic.Subheading: "#8888a0",
        Generic.Deleted:    "#ff3366 bg:#1a0010",
        Generic.Inserted:   "#39ff14 bg:#001a08",
        Generic.Error:      "#ff3366",
        Generic.Emph:       "italic",
        Generic.Strong:     "bold",
        Generic.EmphStrong: "bold italic",
        Generic.Prompt:     "bold #39ff14",
        Generic.Output:     "#8888a0",
        Generic.Traceback:  "#ff3366",

        Error:              "#ff3366",
    }


class ClarityLightStyle(Style):
    """UV-violet tinted light style."""

    name = "clarity-light"
    background_color = "#f0f0f5"
    highlight_color = "rgba(123, 47, 247, 0.08)"

    styles = {
        Token:              "#1a1a2e",
        Whitespace:         "",
        Text:               "#1a1a2e",

        Comment:            "italic #6b7280",
        Comment.Preproc:    "noitalic #6b7280",
        Comment.Special:    "italic bold #6b7280",

        Keyword:            "bold #7b2ff7",
        Keyword.Constant:   "#7b2ff7",
        Keyword.Type:       "#8250df",

        Operator:           "#57606a",
        Operator.Word:      "bold #7b2ff7",

        Punctuation:        "#57606a",

        Name:               "#1a1a2e",
        Name.Builtin:       "#3a3a5e",
        Name.Function:      "#8250df",
        Name.Class:         "bold #1a1a2e",
        Name.Namespace:     "#1a1a2e",
        Name.Exception:     "bold #cf222e",
        Name.Variable:      "#8250df",
        Name.Decorator:     "#8250df",
        Name.Tag:           "#7b2ff7",
        Name.Attribute:     "#0969da",

        String:             "#0969da",
        String.Doc:         "italic #0550ae",
        String.Escape:      "bold #0969da",
        String.Interpol:    "bold #0969da",
        String.Regex:       "#0969da",

        Number:             "#cf222e",

        Literal:            "#1a1a2e",

        Generic.Heading:    "bold #1a1a2e",
        Generic.Subheading: "#57606a",
        Generic.Deleted:    "#cf222e bg:#ffebe9",
        Generic.Inserted:   "#116329 bg:#dafbe1",
        Generic.Error:      "#cf222e",
        Generic.Emph:       "italic",
        Generic.Strong:     "bold",
        Generic.EmphStrong: "bold italic",
        Generic.Prompt:     "bold #7b2ff7",
        Generic.Output:     "#57606a",
        Generic.Traceback:  "#cf222e",

        Error:              "#cf222e",
    }
