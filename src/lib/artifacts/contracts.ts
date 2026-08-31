import { UI_DESIGN_INSTRUCTION } from '../ai/design-request'
import type { ArtifactIntent } from './kinds'

export const CHART_ARTIFACT_CONTRACT = `
CHART & ANALYTICS OUTPUT:
- Emit one envelope, JSON only inside:
<wimArtifact type="chart" title="Short title">{"kind":"line","xKey":"month","series":[{"key":"value","label":"Value"}],"data":[{"month":"Jan","value":10}]}</wimArtifact>
- Or for full dashboards with metrics, graphs, funnels and tables:
<wimArtifact type="posthog-analytics" title="Short title">
{
  "title": "Performance Dashboard",
  "metrics": [
    { "label": "Revenue", "value": "$142,500", "change": "+18.4%", "trend": "up" }
  ],
  "graph": {
    "type": "area",
    "xAxisKey": "month",
    "data": [
      { "month": "Jan", "value": 95000 },
      { "month": "Feb", "value": 118000 }
    ]
  },
  "table": {
    "columns": ["Item", "Status"],
    "rows": [["Pro Plan", { "badge": "Active", "variant": "green" }]]
  }
}
</wimArtifact>
- Supports: metrics (BigNumbers), graph (line | area | bar | pie | donut), table (sortable data table), and funnel (conversion steps).
- Visible reply stays outside the envelope. Do not emit raw code or mermaid when analytics/charts are requested.
`.trim()

export const MERMAID_ARTIFACT_CONTRACT = `
MERMAID OUTPUT:
- Emit one envelope. Body is mermaid source only (no fences):
<antArtifact identifier="diagram-1" type="mermaid" title="Short specific title">
flowchart TD
  A[Start] --> B[End]
</antArtifact>
- Do not set %%{init}%% colors. One sentence outside the tag. Not React, not chart JSON.
`.trim()

export const TABLE_ARTIFACT_CONTRACT = `
TABLE OUTPUT:
- Emit one GFM table inside:
<antArtifact identifier="table-1" type="table" title="Short specific title">
| Column | Value |
| --- | --- |
| A | 1 |
</antArtifact>
- No second document wrapping the same table.
`.trim()

export const MARKDOWN_ARTIFACT_CONTRACT = `
DOCUMENT OUTPUT:
- Wrap the document in:
<antArtifact identifier="doc-1" type="markdown" title="Short specific title">...</antArtifact>
- Title is the work's name (2–8 words), never the user prompt.
`.trim()

export const REACT_UI_CONTRACT = UI_DESIGN_INSTRUCTION

export const CODE_ARTIFACT_CONTRACT = `
CODE OUTPUT:
- Emit one fenced block or:
<antArtifact identifier="code-1" type="code" language="ts" title="Short name">...</antArtifact>
- Complete, valid source. No UI sandbox unless they asked for a screen.
`.trim()

/** Only the winning intent's contract is injected. */
export function contractForIntent(intent: ArtifactIntent): string {
    switch (intent) {
        case 'react_ui':
            return REACT_UI_CONTRACT
        case 'mermaid':
            return MERMAID_ARTIFACT_CONTRACT
        case 'chart':
            return CHART_ARTIFACT_CONTRACT
        case 'table':
            return TABLE_ARTIFACT_CONTRACT
        case 'markdown':
            return MARKDOWN_ARTIFACT_CONTRACT
        case 'code':
            return CODE_ARTIFACT_CONTRACT
        default:
            return ''
    }
}
