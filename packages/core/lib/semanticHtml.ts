import { syntaxTree } from '@codemirror/language';
import { RangeSetBuilder } from '@codemirror/state';
import {
  Decoration,
  EditorView,
  ViewPlugin,
  type ViewUpdate,
  type DecorationSet,
} from '@codemirror/view';

// Mapping of node names to semantic HTML element tag names
const headingElements: Record<string, string> = {
  ATXHeading1: 'h1',
  ATXHeading2: 'h2',
  ATXHeading3: 'h3',
  ATXHeading4: 'h4',
  ATXHeading5: 'h5',
  ATXHeading6: 'h6',
  SetextHeading1: 'h1',
  SetextHeading2: 'h2',
};

const semanticHtmlDecorations = (view: EditorView) => {
  const builder = new RangeSetBuilder<Decoration>();

  for (const { from, to } of view.visibleRanges) {
    syntaxTree(view.state).iterate({
      from,
      to,
      enter: (node) => {
        // Handle headings (both ATX and Setext) - wrap content in <h1>-<h6>
        const headingElement = headingElements[node.name];
        if (headingElement) {
          const level = headingElement.slice(1);
          // Find the text content (skip header marks)
          const cursor = node.node.cursor();
          let textStart = node.from;
          let textEnd = node.to;
          
          // Skip HeaderMark at the beginning
          if (cursor.firstChild()) {
            do {
              if (cursor.name === 'HeaderMark') {
                if (cursor.from === node.from) {
                  textStart = cursor.to + 1; // +1 to skip the space after #
                }
              }
            } while (cursor.nextSibling());
          }

          // For Setext headings, skip the underline
          if (node.name.startsWith('Setext')) {
            const lines = view.state.doc.sliceString(node.from, node.to).split('\n');
            if (lines.length > 1 && lines[0]) {
              // Text is on first line, underline on second
              textEnd = node.from + lines[0].length;
            }
          }

          if (textStart < textEnd) {
            builder.add(
              textStart,
              textEnd,
              Decoration.mark({
                tagName: headingElement,
                attributes: {
                  'aria-level': level,
                },
              }),
            );
          }
        }
        // Handle paragraphs - wrap in <p>
        else if (node.name === 'Paragraph') {
          builder.add(
            node.from,
            node.to,
            Decoration.mark({
              tagName: 'p',
            }),
          );
        }
        // Handle blockquotes - wrap in <blockquote>
        else if (node.name === 'Blockquote') {
          // Find the quote content (skip QuoteMarks)
          const cursor = node.node.cursor();
          const ranges: { from: number; to: number }[] = [];
          
          cursor.iterate((child) => {
            if (child.name !== 'QuoteMark') {
              ranges.push({ from: child.from, to: child.to });
            }
          });

          // Wrap the entire blockquote content
          if (ranges.length > 0) {
            const firstRange = ranges[0];
            const lastRange = ranges[ranges.length - 1];
            if (firstRange && lastRange) {
              builder.add(
                firstRange.from,
                lastRange.to,
                Decoration.mark({
                  tagName: 'blockquote',
                }),
              );
            }
          }
        }
        // Handle list items - wrap in <li>
        else if (node.name === 'ListItem') {
          // Find content (skip ListMark)
          const cursor = node.node.cursor();
          let contentStart = node.from;
          
          if (cursor.firstChild()) {
            do {
              if (cursor.name === 'ListMark') {
                contentStart = cursor.to + 1; // +1 for space after marker
                break;
              }
            } while (cursor.nextSibling());
          }

          if (contentStart < node.to) {
            builder.add(
              contentStart,
              node.to,
              Decoration.mark({
                tagName: 'li',
              }),
            );
          }
        }
        // Handle unordered lists - wrap in <ul>
        else if (node.name === 'BulletList') {
          builder.add(
            node.from,
            node.to,
            Decoration.mark({
              tagName: 'ul',
            }),
          );
        }
        // Handle ordered lists - wrap in <ol>
        else if (node.name === 'OrderedList') {
          builder.add(
            node.from,
            node.to,
            Decoration.mark({
              tagName: 'ol',
            }),
          );
        }
        // Handle strong emphasis - wrap in <strong>
        else if (node.name === 'StrongEmphasis') {
          const cursor = node.node.cursor();
          let textStart = node.from;
          let textEnd = node.to;
          
          // Skip EmphasisMarks
          if (cursor.firstChild()) {
            do {
              if (cursor.name === 'EmphasisMark') {
                if (cursor.from === node.from) {
                  textStart = cursor.to;
                } else if (cursor.to === node.to) {
                  textEnd = cursor.from;
                }
              }
            } while (cursor.nextSibling());
          }

          if (textStart < textEnd) {
            builder.add(
              textStart,
              textEnd,
              Decoration.mark({
                tagName: 'strong',
              }),
            );
          }
        }
        // Handle emphasis - wrap in <em>
        else if (node.name === 'Emphasis') {
          const cursor = node.node.cursor();
          let textStart = node.from;
          let textEnd = node.to;
          
          // Skip EmphasisMarks
          if (cursor.firstChild()) {
            do {
              if (cursor.name === 'EmphasisMark') {
                if (cursor.from === node.from) {
                  textStart = cursor.to;
                } else if (cursor.to === node.to) {
                  textEnd = cursor.from;
                }
              }
            } while (cursor.nextSibling());
          }

          if (textStart < textEnd) {
            builder.add(
              textStart,
              textEnd,
              Decoration.mark({
                tagName: 'em',
              }),
            );
          }
        }
        // Handle links - wrap in <a>
        else if (node.name === 'Link') {
          const cursor = node.node.cursor();
          let url = '';
          
          if (cursor.firstChild()) {
            do {
              if (cursor.name === 'URL') {
                url = view.state.doc.sliceString(cursor.from, cursor.to);
              }
            } while (cursor.nextSibling());
          }

          // Find the link text (between [ and ])
          const linkText = view.state.doc.sliceString(node.from, node.to);
          const textMatchResult = /\[(.*?)\]/.exec(linkText);
          if (textMatchResult?.[1] && url) {
            const textOffset = linkText.indexOf('[') + 1;
            builder.add(
              node.from + textOffset,
              node.from + textOffset + textMatchResult[1].length,
              Decoration.mark({
                tagName: 'a',
                attributes: {
                  href: url,
                },
              }),
            );
          }
        }
        // Handle inline code - wrap in <code>
        else if (node.name === 'InlineCode') {
          const cursor = node.node.cursor();
          let textStart = node.from;
          let textEnd = node.to;
          
          // Skip CodeMarks (backticks)
          if (cursor.firstChild()) {
            do {
              if (cursor.name === 'CodeMark') {
                if (cursor.from === node.from) {
                  textStart = cursor.to;
                } else if (cursor.to === node.to) {
                  textEnd = cursor.from;
                }
              }
            } while (cursor.nextSibling());
          }

          if (textStart < textEnd) {
            builder.add(
              textStart,
              textEnd,
              Decoration.mark({
                tagName: 'code',
              }),
            );
          }
        }
        // Handle code blocks - wrap in <pre>
        else if (node.name === 'FencedCode') {
          // Find code content (skip marks)
          const cursor = node.node.cursor();
          let codeStart = node.from;
          let codeEnd = node.to;
          
          if (cursor.firstChild()) {
            do {
              if (cursor.name === 'CodeMark') {
                if (cursor.from === node.from) {
                  // Skip first line (opening ```)
                  const firstLine = view.state.doc.lineAt(cursor.from);
                  codeStart = firstLine.to + 1;
                }
                if (cursor.to === node.to) {
                  // Skip last line (closing ```)
                  const lastLine = view.state.doc.lineAt(cursor.to);
                  codeEnd = lastLine.from;
                }
              }
            } while (cursor.nextSibling());
          }

          if (codeStart < codeEnd) {
            builder.add(
              codeStart,
              codeEnd,
              Decoration.mark({
                tagName: 'pre',
              }),
            );
          }
        }
      },
    });
  }

  return builder.finish();
};

export const semanticHtmlExtension = ViewPlugin.fromClass(
  class {
    decorations: DecorationSet;

    constructor(view: EditorView) {
      this.decorations = semanticHtmlDecorations(view);
    }

    update(update: ViewUpdate) {
      if (update.docChanged || update.viewportChanged) {
        this.decorations = semanticHtmlDecorations(update.view);
      }
    }
  },
  {
    decorations: (v) => v.decorations,
  },
);
