export function generateXmlViewStyles() {
  return `
          :root {
            color-scheme: light;
            --xml-bg: #ffffff;
            --xml-ink: #101010;
            --xml-body: #1f1f1f;
            --xml-muted: #3f3f3f;
            --xml-quiet: #626262;
            --xml-line: #dedede;
            --xml-line-strong: #bdbdbd;
            --xml-soft: #fafafa;
            --xml-soft-strong: #f2f2f2;
          }

          * {
            box-sizing: border-box;
          }

          html {
            background: var(--xml-bg);
            color: var(--xml-ink);
            font-family: ui-sans-serif, "Helvetica Neue", "Segoe UI", sans-serif;
            text-rendering: optimizeLegibility;
          }

          body {
            min-width: 320px;
            margin: 0;
            background:
              linear-gradient(90deg, transparent 0, transparent calc(100% - 1px), var(--xml-soft) 100%) 0 0 / 24px 24px,
              var(--xml-bg);
            color: var(--xml-body);
          }

          a {
            color: inherit;
            text-decoration: none;
          }

          a:hover {
            color: var(--xml-ink);
          }

          .xml-page {
            width: min(100%, 1120px);
            margin: 0 auto;
            padding: clamp(36px, 6vw, 76px) clamp(18px, 4vw, 44px);
          }

          .xml-header {
            display: grid;
            grid-template-columns: minmax(0, 1fr) auto;
            gap: 24px;
            align-items: end;
            padding-bottom: 24px;
            border-bottom: 1px solid var(--xml-line);
          }

          .xml-kicker {
            margin: 0 0 12px;
            color: var(--xml-quiet);
            font-size: 11px;
            font-weight: 760;
            letter-spacing: 0.16em;
            text-transform: uppercase;
          }

          .xml-title {
            margin: 0;
            color: var(--xml-ink);
            font-size: clamp(40px, 7vw, 84px);
            font-weight: 470;
            letter-spacing: -0.085em;
            line-height: 0.95;
          }

          .xml-lede {
            max-width: 62ch;
            margin: 18px 0 0;
            color: var(--xml-muted);
            font-size: 15px;
            line-height: 1.65;
          }

          .xml-action {
            display: inline-flex;
            align-items: center;
            gap: 8px;
            padding: 0 0 4px;
            border: 0;
            border-bottom: 1px solid var(--xml-line-strong);
            background: transparent;
            color: var(--xml-muted);
            cursor: pointer;
            font: inherit;
            font-size: 12px;
          }

          .xml-action:hover,
          .xml-action.success {
            color: var(--xml-ink);
            border-bottom-color: var(--xml-ink);
          }

          .xml-icon {
            width: 15px;
            height: 15px;
            flex: 0 0 auto;
          }

          .xml-meta {
            display: flex;
            flex-wrap: wrap;
            gap: 10px 18px;
            margin: 18px 0 0;
            color: var(--xml-quiet);
            font-size: 12px;
            font-variant-numeric: tabular-nums;
          }

          .xml-list {
            margin-top: 26px;
          }

          .xml-row {
            display: grid;
            gap: 18px;
            align-items: start;
            padding: 18px 0;
            border-bottom: 1px solid var(--xml-line);
            color: var(--xml-body);
          }

          .xml-row:hover {
            background: linear-gradient(90deg, var(--xml-soft), transparent 76%);
          }

          .xml-row-main {
            min-width: 0;
          }

          .xml-row-meta {
            color: var(--xml-quiet);
            font-size: 12px;
            font-variant-numeric: tabular-nums;
            text-align: right;
            white-space: nowrap;
          }

          .xml-url,
          .xml-row-title {
            display: block;
            min-width: 0;
            overflow-wrap: anywhere;
          }

          .xml-url {
            color: var(--xml-ink);
            font-size: 15px;
            line-height: 1.42;
          }

          .xml-row-title {
            color: var(--xml-ink);
            font-size: clamp(18px, 2vw, 24px);
            font-weight: 520;
            letter-spacing: -0.035em;
            line-height: 1.15;
          }

          .xml-summary {
            display: -webkit-box;
            margin: 8px 0 0;
            overflow: hidden;
            color: var(--xml-muted);
            font-size: 14px;
            line-height: 1.55;
            overflow-wrap: anywhere;
            -webkit-box-orient: vertical;
            -webkit-line-clamp: 2;
          }

          .sitemap-row {
            grid-template-columns: minmax(0, 1fr) 96px;
          }

          .rss-row {
            grid-template-columns: minmax(0, 1fr) 172px;
          }

          .xml-priority {
            color: var(--xml-muted);
            font-size: 13px;
            font-variant-numeric: tabular-nums;
            text-align: right;
          }

          @media (max-width: 720px) {
            .xml-header,
            .sitemap-row,
            .rss-row {
              grid-template-columns: 1fr;
            }

            .xml-row-meta,
            .xml-priority {
              text-align: left;
            }
          }`;
}
