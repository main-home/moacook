const INGREDIENT_CATEGORIES = window.INGREDIENT_CATEGORIES;
const RECIPES = window.RECIPES;

// ==========================================================================
// Application State
// ==========================================================================
const state = {
  selectedIngredients: new Set(),
  searchQuery: ''
};

// ==========================================================================
// DOM Cache
// ==========================================================================
const DOM = {
  categoriesContainer: document.getElementById('categories-container'),
  recipesGrid: document.getElementById('recipes-grid'),
  activeFiltersBar: document.getElementById('active-filters-bar'),
  activeCountBadge: document.getElementById('active-count-badge'),
  activeSummaryText: document.getElementById('active-summary-text'),
  activePillsList: document.getElementById('active-pills-list'),
  ingredientSearchInput: document.getElementById('ingredient-search-input'),
  btnClearAll: document.getElementById('btn-clear-all'),
  recipeCountBadge: document.getElementById('recipe-count-badge'),
  emptyState: document.getElementById('empty-state'),
  partialMatchesSection: document.getElementById('partial-matches-section'),
  partialRecipesGrid: document.getElementById('partial-recipes-grid'),
  recipeModal: document.getElementById('recipe-modal'),
  modalCloseBtn: document.getElementById('modal-close-btn'),
  modalBodyContent: document.getElementById('modal-body-content'),
  // Mobile drawer elements
  ingredientsPanel: document.getElementById('ingredients-panel'),
  btnMobileFilter: document.getElementById('btn-mobile-filter'),
  btnCloseFilterMobile: document.getElementById('btn-close-filter-mobile'),
  filterOverlay: document.getElementById('filter-overlay'),
  mobileFilterCount: document.getElementById('mobile-filter-count')
};

// ==========================================================================
// Event Listeners Initialization
// ==========================================================================
function initEventListeners() {
  // Clear all filters
  DOM.btnClearAll.addEventListener('click', clearAllFilters);

  // Quick ingredient search input
  DOM.ingredientSearchInput.addEventListener('input', (e) => {
    state.searchQuery = e.target.value.trim().toLowerCase();
    renderIngredientBoard();
  });

  // Modal Close interactions
  DOM.modalCloseBtn.addEventListener('click', closeRecipeDetail);
  DOM.recipeModal.addEventListener('click', (e) => {
    if (e.target === DOM.recipeModal) {
      closeRecipeDetail();
    }
  });
  window.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && DOM.recipeModal.classList.contains('open')) {
      closeRecipeDetail();
    }
  });

  // Mobile Filter panel Drawer interactions
  if (DOM.btnMobileFilter && DOM.ingredientsPanel && DOM.filterOverlay) {
    DOM.btnMobileFilter.addEventListener('click', openMobileFilter);
    DOM.btnCloseFilterMobile.addEventListener('click', (e) => {
      e.stopPropagation(); // Stop event bubbling to parent header
      toggleMobileFilter();
    });
    DOM.filterOverlay.addEventListener('click', closeMobileFilter);

    // Bind click event to panel header for easy toggle (ignoring buttons to prevent duplicate toggles)
    const panelHeader = DOM.ingredientsPanel.querySelector('.panel-header');
    if (panelHeader) {
      panelHeader.addEventListener('click', (e) => {
        if (e.target.closest('#btn-clear-all')) return;
        toggleMobileFilter();
      });
    }

    // Bind global ArrowUp / ArrowDown keys (mobile viewports only)
    window.addEventListener('keydown', (e) => {
      const isMobile = window.getComputedStyle(DOM.btnCloseFilterMobile).display !== 'none';
      if (!isMobile) return;

      // Ignore keyboard arrow keys if recipe detail modal is open or user is typing in search input
      if (DOM.recipeModal.classList.contains('open') || document.activeElement === DOM.ingredientSearchInput) {
        return;
      }

      if (e.key === 'ArrowUp') {
        e.preventDefault();
        openMobileFilter();
      } else if (e.key === 'ArrowDown') {
        e.preventDefault();
        closeMobileFilter();
      }
    });
  }
}

// ==========================================================================
// Core Render Functions
// ==========================================================================

/**
 * Render the ingredient board grouping pills by categories.
 * Filters pills dynamically if the user types in the search box.
 */
function renderIngredientBoard() {
  DOM.categoriesContainer.innerHTML = '';
  let visibleCategoriesCount = 0;

  for (const [key, category] of Object.entries(INGREDIENT_CATEGORIES)) {
    // Filter ingredients in this category matching search query
    const filteredItems = category.items.filter(item => 
      item.toLowerCase().includes(state.searchQuery)
    );

    if (filteredItems.length === 0) continue;
    visibleCategoriesCount++;

    const groupDiv = document.createElement('div');
    groupDiv.className = 'category-group';
    groupDiv.innerHTML = `
      <div class="category-title" style="color: ${category.color};">
        ${category.name}
      </div>
      <div class="pills-list"></div>
    `;

    const pillsList = groupDiv.querySelector('.pills-list');

    filteredItems.forEach(item => {
      const isSelected = state.selectedIngredients.has(item);
      const pillButton = document.createElement('button');
      pillButton.type = 'button';
      pillButton.className = `pill ${isSelected ? 'selected' : ''}`;
      pillButton.setAttribute('data-category', key);
      pillButton.setAttribute('data-ingredient', item);
      pillButton.textContent = item;
      
      pillButton.addEventListener('click', () => toggleIngredient(item));
      pillsList.appendChild(pillButton);
    });

    DOM.categoriesContainer.appendChild(groupDiv);
  }

  // If no categories have matching ingredients, show empty query text
  if (visibleCategoriesCount === 0) {
    DOM.categoriesContainer.innerHTML = `
      <div class="empty-query-text" style="color: var(--color-text-muted); font-size: 0.9rem; text-align: center; padding: 20px 0;">
        검색어와 일치하는 재료가 없습니다.
      </div>
    `;
  }
}

/**
 * Updates the visual active filter bar containing selected ingredient tags
 */
function renderActiveFiltersBar() {
  DOM.activePillsList.innerHTML = '';
  const size = state.selectedIngredients.size;
  DOM.activeCountBadge.textContent = size;

  if (size > 0) {
    DOM.activeFiltersBar.classList.add('active');
    DOM.activeSummaryText.innerHTML = `선택한 <strong>${size}개</strong> 재료가 <strong>모두 포함된</strong> 레시피를 검색 중입니다:`;

    state.selectedIngredients.forEach(item => {
      const activePill = document.createElement('span');
      activePill.className = 'active-pill';
      activePill.innerHTML = `
        ${item}
        <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
          <line x1="18" y1="6" x2="6" y2="18"></line>
          <line x1="6" y1="6" x2="18" y2="18"></line>
        </svg>
      `;
      activePill.addEventListener('click', () => toggleIngredient(item));
      DOM.activePillsList.appendChild(activePill);
    });
  } else {
    DOM.activeFiltersBar.classList.remove('active');
    DOM.activeSummaryText.textContent = '선택된 재료가 없습니다. 아래에서 재료를 골라보세요!';
  }

  // Update floating mobile badge count
  if (DOM.mobileFilterCount) {
    DOM.mobileFilterCount.textContent = size;
  }
}

/**
 * Filter and render recipe grid.
 * Applies strict AND condition search on selected ingredients.
 * Handles empty states and generates partial-match recommendations.
 */
function renderRecipes() {
  // Clear grids
  DOM.recipesGrid.innerHTML = '';
  DOM.partialRecipesGrid.innerHTML = '';
  DOM.recipesGrid.style.display = 'grid';
  DOM.emptyState.style.display = 'none';

  const selectedArr = Array.from(state.selectedIngredients);

  // Perform strict AND filtering (all selected ingredients must be in recipe)
  const matchedRecipes = RECIPES.filter(recipe => {
    return selectedArr.every(selectedIng => recipe.ingredients.includes(selectedIng));
  });

  DOM.recipeCountBadge.textContent = matchedRecipes.length;

  if (matchedRecipes.length > 0) {
    // Render matching recipes
    matchedRecipes.forEach((recipe, index) => {
      const card = createRecipeCard(recipe, index);
      DOM.recipesGrid.appendChild(card);
    });
  } else {
    // Hide recipe grid, show empty state
    DOM.recipesGrid.style.display = 'none';
    DOM.emptyState.style.display = 'flex';

    if (state.selectedIngredients.size > 0) {
      // Find recommendations: recipes matching AT LEAST ONE selected ingredient (OR condition),
      // sorted by the count of matching ingredients in descending order.
      const partialMatches = RECIPES.map(recipe => {
        const matchCount = selectedArr.filter(ing => recipe.ingredients.includes(ing)).length;
        return { recipe, matchCount };
      })
      .filter(item => item.matchCount > 0)
      .sort((a, b) => b.matchCount - a.matchCount);

      if (partialMatches.length > 0) {
        DOM.partialMatchesSection.style.display = 'block';
        partialMatches.forEach((item, index) => {
          const card = createRecipeCard(item.recipe, index, true, item.matchCount);
          DOM.partialRecipesGrid.appendChild(card);
        });
      } else {
        DOM.partialMatchesSection.style.display = 'none';
      }
    } else {
      // Should not theoretically occur since if 0 filters selected, all 10 recipes match
      DOM.partialMatchesSection.style.display = 'none';
    }
  }
}

/**
 * Creates recipe card DOM element.
 * Highlights ingredients in the recipe that are active in state.
 */
function createRecipeCard(recipe, index, isRecommendation = false, matchCount = 0) {
  const card = document.createElement('article');
  card.className = 'recipe-card fade-in';
  // Stagger entry animations
  card.style.animationDelay = `${index * 0.05}s`;
  
  // Highlight ingredient tags present in current state filters
  const ingredientsHTML = recipe.ingredients.map(ing => {
    const isHighlighted = state.selectedIngredients.has(ing);
    return `<span class="card-ing-tag ${isHighlighted ? 'highlight' : ''}">${ing}</span>`;
  }).join('');

  card.innerHTML = `
    <div class="card-image-wrapper">
      <span class="card-tag">${recipe.category}</span>
      <img src="${recipe.image}" alt="${recipe.name}">
    </div>
    <div class="card-info">
      <div class="card-meta">
        <span class="meta-item">
          <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"></circle><polyline points="12 6 12 12 16 14"></polyline></svg>
          ${recipe.time}
        </span>
        <span class="meta-item">
          <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5"></path></svg>
          난이도: ${recipe.difficulty}
        </span>
        ${isRecommendation ? `
          <span class="meta-item" style="color: var(--color-primary); font-weight: 600;">
            (${matchCount}개 일치)
          </span>
        ` : ''}
      </div>
      <h3 class="card-name">${recipe.name}</h3>
      <p class="card-description">${recipe.description}</p>
      <div class="card-ingredients">
        ${ingredientsHTML}
      </div>
    </div>
  `;

  // Clicking the card opens details modal
  card.addEventListener('click', () => openRecipeDetail(recipe.id));

  return card;
}

// ==========================================================================
// Interaction Handlers
// ==========================================================================

function toggleIngredient(ingredient) {
  if (state.selectedIngredients.has(ingredient)) {
    state.selectedIngredients.delete(ingredient);
  } else {
    state.selectedIngredients.add(ingredient);
  }
  
  renderIngredientBoard();
  renderActiveFiltersBar();
  renderRecipes();
}

function clearAllFilters() {
  state.selectedIngredients.clear();
  state.searchQuery = '';
  DOM.ingredientSearchInput.value = '';
  
  renderIngredientBoard();
  renderActiveFiltersBar();
  renderRecipes();
}

// ==========================================================================
// Modal Operations
// ==========================================================================

function openRecipeDetail(recipeId) {
  const recipe = RECIPES.find(r => r.id === recipeId);
  if (!recipe) return;

  // Build ingredients list highlighting the ones in filter state (supporting quantities)
  const ingredientsSource = recipe.ingredientsDetail || recipe.ingredients;
  const ingredientsHTML = ingredientsSource.map((ingDetail, idx) => {
    // Map back to raw tag using same index to check if it's currently selected in filter state
    const rawIng = recipe.ingredients[idx] || ingDetail;
    const isHighlighted = state.selectedIngredients.has(rawIng);
    return `<span class="modal-ing-item ${isHighlighted ? 'highlighted' : ''}">${ingDetail}</span>`;
  }).join('');

  // Build steps list
  const stepsHTML = recipe.instructions.map((step, idx) => `
    <div class="step-item">
      <div class="step-num">${idx + 1}</div>
      <p class="step-text">${step}</p>
    </div>
  `).join('');

  DOM.modalBodyContent.innerHTML = `
    <div class="modal-img-header">
      <img src="${recipe.image}" alt="${recipe.name}">
    </div>
    <div class="modal-main-info">
      <div class="modal-title-row">
        <span class="modal-cat">${recipe.category}</span>
        <h2 class="modal-name">${recipe.name}</h2>
      </div>
      <p class="modal-desc">${recipe.description}</p>
      
      <div class="modal-meta-chips">
        <div class="meta-chip">
          <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"></circle><polyline points="12 6 12 12 16 14"></polyline></svg>
          조리 시간: ${recipe.time}
        </div>
        <div class="meta-chip">
          <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5"></path></svg>
          난이도: ${recipe.difficulty}
        </div>
      </div>
      
      <div class="modal-section">
        <h3 class="modal-section-title">주요 재료 (1인분 기준)</h3>
        <div class="modal-ing-list">
          ${ingredientsHTML}
        </div>
      </div>
      
      <div class="modal-section">
        <h3 class="modal-section-title">조리 순서</h3>
        <div class="modal-steps">
          ${stepsHTML}
        </div>
      </div>
    </div>
  `;

  DOM.recipeModal.classList.add('open');
  DOM.recipeModal.setAttribute('aria-hidden', 'false');
  document.body.style.overflow = 'hidden'; // Lock background scrolling
}

function closeRecipeDetail() {
  DOM.recipeModal.classList.remove('open');
  DOM.recipeModal.setAttribute('aria-hidden', 'true');
  document.body.style.overflow = ''; // Unlock background scrolling
}

// Mobile Filter Drawer Toggle Functions
function toggleMobileFilter() {
  const isOpen = DOM.ingredientsPanel.classList.contains('open');
  if (isOpen) {
    closeMobileFilter();
  } else {
    openMobileFilter();
  }
}

function openMobileFilter() {
  DOM.ingredientsPanel.classList.add('open');
  DOM.filterOverlay.classList.add('open');
  DOM.filterOverlay.setAttribute('aria-hidden', 'false');
  document.body.style.overflow = 'hidden'; // Prevent scrolling main background
  
  // Set arrow button icon to down arrow (chevron-down)
  DOM.btnCloseFilterMobile.innerHTML = `
    <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
      <polyline points="6 9 12 15 18 9"></polyline>
    </svg>
  `;
}

function closeMobileFilter() {
  DOM.ingredientsPanel.classList.remove('open');
  DOM.filterOverlay.classList.remove('open');
  DOM.filterOverlay.setAttribute('aria-hidden', 'true');
  document.body.style.overflow = ''; // Restore scrolling
  
  // Set arrow button icon to up arrow (chevron-up)
  DOM.btnCloseFilterMobile.innerHTML = `
    <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
      <polyline points="18 15 12 9 6 15"></polyline>
    </svg>
  `;
}

// ==========================================================================
// App Boostrap
// ==========================================================================
function start() {
  initEventListeners();
  renderIngredientBoard();
  renderActiveFiltersBar();
  renderRecipes();
  
  // Initialize mobile close button with up arrow icon on start
  if (DOM.btnCloseFilterMobile) {
    DOM.btnCloseFilterMobile.innerHTML = `
      <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
        <polyline points="18 15 12 9 6 15"></polyline>
      </svg>
    `;
  }
}

window.addEventListener('DOMContentLoaded', start);
