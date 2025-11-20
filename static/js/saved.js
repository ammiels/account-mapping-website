const elements = {};
let currentAnalysisId = null;
let allAnalyses = [];
let filteredAnalyses = [];

document.addEventListener("DOMContentLoaded", () => {
  cacheElements();
  bindInteractions();
  loadSavedAnalyses();
});

function cacheElements() {
  elements.savedEmpty = document.getElementById("saved-empty");
  elements.savedGrid = document.getElementById("saved-grid");
  elements.searchBar = document.getElementById("saved-search-bar");
  elements.searchInput = document.getElementById("saved-search-input");
  elements.searchClearBtn = document.getElementById("search-clear-btn");
  elements.filterPlatform = document.getElementById("filter-platform");
  elements.filterSort = document.getElementById("filter-sort");
  elements.viewModal = document.getElementById("view-analysis-modal");
  elements.viewBackdrop = document.getElementById("view-analysis-backdrop");
  elements.viewClose = document.getElementById("analysis-modal-close");
  elements.viewOk = document.getElementById("analysis-modal-ok");
  elements.deleteBtn = document.getElementById("delete-analysis-btn");
  elements.analysisTitle = document.getElementById("analysis-modal-title");
  elements.analysisCompany = document.getElementById("analysis-company");
  elements.analysisDate = document.getElementById("analysis-date");
  elements.analysisTotal = document.getElementById("analysis-total");
  elements.analysisPlatform = document.getElementById("analysis-platform");
  elements.analysisSummary = document.getElementById("analysis-summary-content");
  elements.analysisStatsGrid = document.getElementById("analysis-stats-grid");
  elements.analysisDepartmentsList = document.getElementById("analysis-departments-list");
  elements.analysisLocationsList = document.getElementById("analysis-locations-list");
}

function bindInteractions() {
  [elements.viewClose, elements.viewOk, elements.viewBackdrop]
    .filter(Boolean)
    .forEach((trigger) => trigger.addEventListener("click", closeViewModal));

  elements.deleteBtn.addEventListener("click", deleteCurrentAnalysis);

  // Search and filter listeners
  if (elements.searchInput) {
    elements.searchInput.addEventListener("input", handleSearch);
    elements.searchClearBtn.addEventListener("click", clearSearch);
  }
  if (elements.filterPlatform) {
    elements.filterPlatform.addEventListener("change", applyFilters);
  }
  if (elements.filterSort) {
    elements.filterSort.addEventListener("change", applyFilters);
  }

  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape" && !elements.viewModal.hasAttribute("hidden")) {
      closeViewModal();
    }
  });
}

function loadSavedAnalyses() {
  allAnalyses = getSavedAnalyses();
  
  if (allAnalyses.length === 0) {
    elements.savedEmpty.style.display = "block";
    elements.savedGrid.style.display = "none";
    elements.searchBar.style.display = "none";
  } else {
    elements.savedEmpty.style.display = "none";
    elements.savedGrid.style.display = "grid";
    elements.searchBar.style.display = "flex";
    populatePlatformFilter();
    filteredAnalyses = [...allAnalyses];
    applyFilters();
  }
}

function populatePlatformFilter() {
  const platforms = new Set();
  allAnalyses.forEach(analysis => {
    if (analysis.platform) {
      platforms.add(analysis.platform);
    }
  });
  
  elements.filterPlatform.innerHTML = '<option value="all">All Platforms</option>';
  Array.from(platforms).sort().forEach(platform => {
    const option = document.createElement('option');
    option.value = platform;
    option.textContent = platform;
    elements.filterPlatform.appendChild(option);
  });
}

function handleSearch() {
  const searchTerm = elements.searchInput.value.trim();
  
  if (searchTerm) {
    elements.searchClearBtn.style.display = "block";
  } else {
    elements.searchClearBtn.style.display = "none";
  }
  
  applyFilters();
}

function clearSearch() {
  elements.searchInput.value = "";
  elements.searchClearBtn.style.display = "none";
  applyFilters();
}

function applyFilters() {
  const searchTerm = elements.searchInput.value.toLowerCase().trim();
  const platformFilter = elements.filterPlatform.value;
  const sortOption = elements.filterSort.value;
  
  // Filter by search term
  filteredAnalyses = allAnalyses.filter(analysis => {
    if (searchTerm) {
      const companyName = (analysis.companyName || "").toLowerCase();
      const platform = (analysis.platform || "").toLowerCase();
      const departments = (analysis.topDepartments || []).map(d => d[0].toLowerCase()).join(" ");
      
      return companyName.includes(searchTerm) || 
             platform.includes(searchTerm) || 
             departments.includes(searchTerm);
    }
    return true;
  });
  
  // Filter by platform
  if (platformFilter !== "all") {
    filteredAnalyses = filteredAnalyses.filter(analysis => analysis.platform === platformFilter);
  }
  
  // Sort
  filteredAnalyses.sort((a, b) => {
    switch (sortOption) {
      case "date-desc":
        return new Date(b.savedAt) - new Date(a.savedAt);
      case "date-asc":
        return new Date(a.savedAt) - new Date(b.savedAt);
      case "roles-desc":
        return (b.totalRoles || 0) - (a.totalRoles || 0);
      case "roles-asc":
        return (a.totalRoles || 0) - (b.totalRoles || 0);
      case "name-asc":
        return (a.companyName || "").localeCompare(b.companyName || "");
      case "name-desc":
        return (b.companyName || "").localeCompare(a.companyName || "");
      default:
        return 0;
    }
  });
  
  renderAnalysesGrid(filteredAnalyses);
}

function getSavedAnalyses() {
  const saved = localStorage.getItem("savedAnalyses");
  return saved ? JSON.parse(saved) : [];
}

function renderAnalysesGrid(analyses) {
  elements.savedGrid.innerHTML = "";
  
  if (analyses.length === 0) {
    elements.savedGrid.innerHTML = `
      <div class="saved-empty" style="grid-column: 1 / -1;">
        <div class="saved-empty__icon">
          <i class="fa-solid fa-search"></i>
        </div>
        <h3>No analyses found</h3>
        <p>Try adjusting your search or filters.</p>
      </div>
    `;
    return;
  }

  analyses.forEach((analysis) => {
    const card = createAnalysisCard(analysis);
    elements.savedGrid.appendChild(card);
  });
}

function createAnalysisCard(analysis) {
  const card = document.createElement("div");
  card.className = "saved-card";
  card.dataset.id = analysis.id;
  
  const date = new Date(analysis.savedAt);
  const formattedDate = date.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });

  card.innerHTML = `
    <div class="saved-card__header">
      <h3 class="saved-card__title">${escapeHtml(analysis.companyName || "Untitled Analysis")}</h3>
      <span class="saved-card__date">${formattedDate}</span>
    </div>
    <div class="saved-card__stats">
      <div class="saved-card__stat">
        <span class="saved-card__stat-label">Roles</span>
        <span class="saved-card__stat-value">${analysis.totalRoles || 0}</span>
      </div>
      <div class="saved-card__stat">
        <span class="saved-card__stat-label">Departments</span>
        <span class="saved-card__stat-value">${analysis.totalDepartments || 0}</span>
      </div>
    </div>
    <div>
      <span class="saved-card__platform">${escapeHtml(analysis.platform || "Unknown")}</span>
    </div>
  `;

  card.addEventListener("click", () => openAnalysis(analysis));
  
  return card;
}

function openAnalysis(analysis) {
  currentAnalysisId = analysis.id;
  
  elements.analysisTitle.textContent = analysis.companyName || "Analysis Details";
  elements.analysisCompany.textContent = analysis.companyName || "--";
  elements.analysisDate.textContent = new Date(analysis.savedAt).toLocaleDateString("en-US", {
    month: "long",
    day: "numeric",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit"
  });
  elements.analysisTotal.textContent = analysis.totalRoles || "--";
  elements.analysisPlatform.textContent = analysis.platform || "--";
  
  // Render summary
  elements.analysisSummary.innerHTML = analysis.summary || "<p>No summary available.</p>";
  
  // Render stats
  elements.analysisStatsGrid.innerHTML = `
    <div class="analysis-stat-item">
      <strong>${analysis.totalDepartments || 0}</strong>
      <span>Departments</span>
    </div>
    <div class="analysis-stat-item">
      <strong>${analysis.totalLocations || 0}</strong>
      <span>Locations</span>
    </div>
    <div class="analysis-stat-item">
      <strong>${analysis.remotePercent || 0}%</strong>
      <span>Remote</span>
    </div>
  `;
  
  // Render top departments
  elements.analysisDepartmentsList.innerHTML = "";
  if (analysis.topDepartments && analysis.topDepartments.length > 0) {
    analysis.topDepartments.forEach(([dept, count]) => {
      const item = document.createElement("div");
      item.className = "analysis-list-item";
      item.innerHTML = `<span>${escapeHtml(dept)}</span><span>${count}</span>`;
      elements.analysisDepartmentsList.appendChild(item);
    });
  } else {
    elements.analysisDepartmentsList.innerHTML = "<p>No department data available.</p>";
  }
  
  // Render top locations
  elements.analysisLocationsList.innerHTML = "";
  if (analysis.topLocations && analysis.topLocations.length > 0) {
    analysis.topLocations.forEach(([loc, count]) => {
      const item = document.createElement("div");
      item.className = "analysis-list-item";
      item.innerHTML = `<span>${escapeHtml(loc)}</span><span>${count}</span>`;
      elements.analysisLocationsList.appendChild(item);
    });
  } else {
    elements.analysisLocationsList.innerHTML = "<p>No location data available.</p>";
  }
  
  elements.viewModal.removeAttribute("hidden");
  document.body.style.overflow = "hidden";
}

function closeViewModal() {
  elements.viewModal.setAttribute("hidden", "hidden");
  document.body.style.overflow = "";
  currentAnalysisId = null;
}

function deleteCurrentAnalysis() {
  if (!currentAnalysisId) return;
  
  if (!confirm("Are you sure you want to delete this analysis? This cannot be undone.")) {
    return;
  }
  
  const analyses = getSavedAnalyses();
  const filtered = analyses.filter(a => a.id !== currentAnalysisId);
  localStorage.setItem("savedAnalyses", JSON.stringify(filtered));
  
  closeViewModal();
  loadSavedAnalyses();
}

function escapeHtml(value) {
  return String(value || "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}
