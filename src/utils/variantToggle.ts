/**
 * Shared utility for expandable/collapsible variant rows
 * Used by both player profile decks and metagame explorer
 */

interface VariantToggleOptions {
  toggleButtonSelector: string;
  variantRowSelector: string;
  deckRowSelector: string;
  expandableDeckNameSelector: string;
}

/**
 * Setup variant toggle functionality for tables with expandable variant rows
 *
 * @param options - Selectors for the toggle elements
 */
export function setupVariantToggles(options: VariantToggleOptions): void {
  const {
    toggleButtonSelector,
    variantRowSelector,
    deckRowSelector,
    expandableDeckNameSelector,
  } = options;

  const toggleButtons = document.querySelectorAll(toggleButtonSelector);

  toggleButtons.forEach((button) => {
    button.addEventListener('click', () => {
      const deckIndex = button.getAttribute('data-deck-index');
      const variantRows = document.querySelectorAll(
        `${variantRowSelector}[data-deck-index="${deckIndex}"]`
      );
      const isExpanded = button.getAttribute('aria-expanded') === 'true';

      // Toggle visibility
      variantRows.forEach((row) => {
        (row as HTMLElement).style.display = isExpanded ? 'none' : 'table-row';
      });

      // Toggle aria-expanded
      button.setAttribute('aria-expanded', String(!isExpanded));
    });
  });

  // Also allow clicking the deck name to toggle
  const deckRows = document.querySelectorAll(deckRowSelector);
  deckRows.forEach((row) => {
    const deckNameSpan = row.querySelector(expandableDeckNameSelector);
    const toggleButton = row.querySelector(toggleButtonSelector);

    if (deckNameSpan && toggleButton) {
      deckNameSpan.addEventListener('click', () => {
        (toggleButton as HTMLButtonElement).click();
      });
    }
  });
}
