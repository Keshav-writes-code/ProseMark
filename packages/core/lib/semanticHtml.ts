import { syntaxTree } from '@codemirror/language';
import { RangeSetBuilder } from '@codemirror/state';
import {
  Decoration,
  EditorView,
  ViewPlugin,
  type ViewUpdate,
  type DecorationSet,
} from '@codemirror/view';

// Mapping of node names to heading levels
const headingLevels: Record<string, string> = {
  ATXHeading1: '1',
  ATXHeading2: '2',
  ATXHeading3: '3',
  ATXHeading4: '4',
  ATXHeading5: '5',
  ATXHeading6: '6',
  SetextHeading1: '1',
  SetextHeading2: '2',
};

const semanticHtmlDecorations = (view: EditorView) => {
  const builder = new RangeSetBuilder<Decoration>();

  for (const { from, to } of view.visibleRanges) {
    syntaxTree(view.state).iterate({
      from,
      to,
      enter: (node) => {
        const line = view.state.doc.lineAt(node.from);

        // Handle headings (both ATX and Setext)
        const headingLevel = headingLevels[node.name];
        if (headingLevel) {
          builder.add(
            line.from,
            line.from,
            Decoration.line({
              attributes: { role: 'heading', 'aria-level': headingLevel },
            }),
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
