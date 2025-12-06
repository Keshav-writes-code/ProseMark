import { syntaxTree } from '@codemirror/language';
import { RangeSetBuilder } from '@codemirror/state';
import {
  Decoration,
  EditorView,
  ViewPlugin,
  type ViewUpdate,
  type DecorationSet,
} from '@codemirror/view';

const semanticHtmlDecorations = (view: EditorView) => {
  const builder = new RangeSetBuilder<Decoration>();

  for (const { from, to } of view.visibleRanges) {
    syntaxTree(view.state).iterate({
      from,
      to,
      enter: (node) => {
        const line = view.state.doc.lineAt(node.from);

        // Handle ATX headings (# Heading)
        if (node.name === 'ATXHeading1') {
          builder.add(
            line.from,
            line.from,
            Decoration.line({ attributes: { role: 'heading', 'aria-level': '1' } }),
          );
        } else if (node.name === 'ATXHeading2') {
          builder.add(
            line.from,
            line.from,
            Decoration.line({ attributes: { role: 'heading', 'aria-level': '2' } }),
          );
        } else if (node.name === 'ATXHeading3') {
          builder.add(
            line.from,
            line.from,
            Decoration.line({ attributes: { role: 'heading', 'aria-level': '3' } }),
          );
        } else if (node.name === 'ATXHeading4') {
          builder.add(
            line.from,
            line.from,
            Decoration.line({ attributes: { role: 'heading', 'aria-level': '4' } }),
          );
        } else if (node.name === 'ATXHeading5') {
          builder.add(
            line.from,
            line.from,
            Decoration.line({ attributes: { role: 'heading', 'aria-level': '5' } }),
          );
        } else if (node.name === 'ATXHeading6') {
          builder.add(
            line.from,
            line.from,
            Decoration.line({ attributes: { role: 'heading', 'aria-level': '6' } }),
          );
        }
        // Handle Setext headings (underlined headings)
        else if (node.name === 'SetextHeading1') {
          builder.add(
            line.from,
            line.from,
            Decoration.line({ attributes: { role: 'heading', 'aria-level': '1' } }),
          );
        } else if (node.name === 'SetextHeading2') {
          builder.add(
            line.from,
            line.from,
            Decoration.line({ attributes: { role: 'heading', 'aria-level': '2' } }),
          );
        }
        // Handle paragraphs
        else if (node.name === 'Paragraph') {
          // Only add paragraph role if line is fully within this paragraph
          if (node.from <= line.from && node.to >= line.to) {
            builder.add(
              line.from,
              line.from,
              Decoration.line({ attributes: { role: 'paragraph' } }),
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
