# Markdown for Word

Open Markdown (.md) files in Microsoft Word on a Mac, edit them as normal Word documents, and save straight back to Markdown.

- Headings, bold, italic, strikethrough, bullet and numbered lists, tables, links and code all come through as real Word formatting.
- Press Cmd+S in Word and your edits are written back to the original .md file.
- YAML front matter is kept exactly as it was.
- If the .md file was changed by something else while you had it open, your edits are saved to a separate `<name> (Word edits).md` file instead of overwriting.
- No Word add-in, no account, no permissions prompt.

## Requirements

- macOS on Apple silicon or Intel
- Microsoft Word for Mac

## Install

Download or clone this repository, then in Terminal:

```
zsh path/to/markdown-for-word/install.sh --set-default
```

This downloads [pandoc](https://pandoc.org) from its official GitHub releases (checksum verified), builds the app into `~/Applications`, and makes it the default app for .md files. Leave off `--set-default` to keep your current default and use Finder's Open With instead. Safe to rerun.

## Use

- Double-click a .md file (or right-click > Open With > Markdown for Word).
- Edit in Word. Cmd+S saves back to the .md.
- Close the document when done. The app quits on its own once no Markdown files are open.

## How it works

The app converts the .md to a .docx with pandoc in `~/Library/Caches/MarkdownForWord`, opens it in Word, and watches for saves. Each save is converted back to GitHub-flavored Markdown and written to the original file. It knows a document is still open by the owner file (`~$...`) Word keeps beside it.

Round trips can change cosmetic Markdown details (table padding, list spacing, indented instead of fenced code blocks). The content and formatting stay the same.

## Uninstall

Delete `~/Applications/Markdown for Word.app` and `~/Library/Caches/MarkdownForWord`.

## License

MIT for this project. pandoc is downloaded at install time and is licensed separately under the GPL; see [pandoc's license](https://github.com/jgm/pandoc/blob/main/COPYRIGHT).
