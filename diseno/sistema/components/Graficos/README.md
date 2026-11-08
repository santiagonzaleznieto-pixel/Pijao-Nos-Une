# Graficos

The system's charts: single-series bars, stacked bars by category, progress ring, and the table view. They follow the `dataviz` method.

- **Color by job:**
  - one series (magnitude) → `grafico-1` alone;
  - categories (identity) → `grafico-1`, `-2`, `-3`, `-4`, **always in that order**: green never sits next to orange.

  The order was validated for color blindness in light, dark and sun mode. With more than four categories, group them as «Otros» or split into small charts. Status colors (light, notices) are never used as series.
- **Marks:** thin bars with 4 px rounded tops, anchored to the baseline; 2 px gap between stacked segments; guides and axis in `grafico-guia`, dashed and behind the data.
- **Text:** values and labels in `tinta` and `tinta-suave`, never in the series color. A single series needs no legend (the title names it). Two or more always carry a legend, and up to four also get direct labels.
- **Always interactive:** every bar shows the exact value on hover or tap (`pj-tooltip`); the touch target is the whole bar.
- **Always accessible:**
  - each chart has an `aria-label` with its data and a «Ver como tabla» view;
  - orange and green are under 4.5:1 for text, which is why they never carry text: the labels go outside the mark.
- **One axis per chart.** Two measures of different scale go in two charts.
- Small groups (fewer than 5 people) are shown as «menos de 5», and only complete records count.
- **What the consumer provides:** the data already aggregated (never one per person), the title, the categories in fixed order and the alternative text.
