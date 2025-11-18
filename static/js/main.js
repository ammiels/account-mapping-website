const state = {
  jobs: [],
  filters: {
    department: "all",
    location: "all",
    seniority: "all",
  },
  charts: {},
  expandedChart: null,
  pagination: {
    currentPage: 1,
    jobsPerPage: 50
  }
};

const elements = {};

document.addEventListener("DOMContentLoaded", () => {
  cacheElements();
  bindInteractions();
  initCharts();
  loadDashboardState();
  renderEmptyState();
});

function cacheElements() {
  elements.form = document.getElementById("job-search-form");
  elements.searchInput = document.getElementById("search-url");
  elements.fetchButton = document.getElementById("fetch-button");
  elements.status = document.getElementById("fetch-status");
  elements.platformIndicator = document.getElementById("platform-indicator");
  elements.toggleSupported = document.getElementById("toggle-supported");
  elements.supportedModal = document.getElementById("supported-modal");
  elements.supportedBackdrop = document.getElementById("supported-backdrop");
  elements.supportedClose = document.getElementById("supported-close");
  elements.supportedOk = document.getElementById("supported-ok");
  elements.tableBody = document.querySelector("#jobs-table tbody");
  elements.emptyState = document.getElementById("table-empty-state");
  elements.filterDepartment = document.getElementById("filter-department");
  elements.filterLocation = document.getElementById("filter-location");
  elements.filterSeniority = document.getElementById("filter-seniority");
  elements.totalRolesValue = document.getElementById("total-roles-value");
  elements.totalRolesCaption = document.getElementById("total-roles-caption");
  elements.departmentsValue = document.getElementById("departments-value");
  elements.departmentsCaption = document.getElementById("departments-caption");
  elements.locationsValue = document.getElementById("locations-value");
  elements.locationsCaption = document.getElementById("locations-caption");
  elements.remoteValue = document.getElementById("remote-value");
  elements.remoteCaption = document.getElementById("remote-caption");
  elements.chartModal = document.getElementById("chart-modal");
  elements.chartBackdrop = document.getElementById("chart-backdrop");
  elements.chartModalClose = document.getElementById("chart-modal-close");
  elements.chartModalTitle = document.getElementById("chart-modal-title");
  elements.expandedChartCanvas = document.getElementById("expanded-chart");
  elements.chartDownloadBtn = document.getElementById("chart-download-btn");
  elements.chartExpandButtons = document.querySelectorAll(".chart-expand-btn");
  elements.summaryTextPanel = document.getElementById("summary-text-panel");
  elements.summaryText = document.getElementById("summary-text");
  elements.summaryLoading = document.getElementById("summary-loading");
  elements.saveAnalysisBtn = document.getElementById("save-analysis-btn");
  elements.saveAnalysisModal = document.getElementById("save-analysis-modal");
  elements.saveAnalysisBackdrop = document.getElementById("save-analysis-backdrop");
  elements.saveAnalysisInput = document.getElementById("analysis-name-input");
  elements.saveAnalysisConfirm = document.getElementById("save-analysis-confirm");
  elements.saveAnalysisCancel = document.getElementById("save-analysis-cancel");
  elements.exportCsvBtn = document.getElementById("export-csv-btn");
  elements.clearButton = document.getElementById("clear-button");
  elements.paginationContainer = document.getElementById("pagination-container");
  elements.paginationInfo = document.getElementById("pagination-info");
  elements.paginationPrev = document.getElementById("pagination-prev");
  elements.paginationNext = document.getElementById("pagination-next");
}

function bindInteractions() {
  elements.form.addEventListener("submit", handleFetchJobs);

  elements.toggleSupported.addEventListener("click", openSupportedModal);
  [elements.supportedClose, elements.supportedOk, elements.supportedBackdrop]
    .filter(Boolean)
    .forEach((trigger) => trigger.addEventListener("click", closeSupportedModal));

  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape") {
      if (!elements.supportedModal.hasAttribute("hidden")) {
        closeSupportedModal();
      }
      if (!elements.chartModal.hasAttribute("hidden")) {
        closeChartModal();
      }
      if (!elements.saveAnalysisModal.hasAttribute("hidden")) {
        closeSaveAnalysisModal();
      }
    }
  });

  elements.chartExpandButtons.forEach((btn) => {
    btn.addEventListener("click", () => {
      const chartType = btn.dataset.chart;
      openChartModal(chartType);
    });
  });

  [elements.chartModalClose, elements.chartBackdrop]
    .filter(Boolean)
    .forEach((trigger) => trigger.addEventListener("click", closeChartModal));

  if (elements.chartDownloadBtn) {
    elements.chartDownloadBtn.addEventListener("click", downloadExpandedChart);
  }

  [
    elements.filterDepartment,
    elements.filterLocation,
    elements.filterSeniority,
  ].forEach((select) => {
    select.addEventListener("change", () => {
      state.filters.department = elements.filterDepartment.value;
      state.filters.location = elements.filterLocation.value;
      state.filters.seniority = elements.filterSeniority.value;
      applyFilters();
    });
  });

  if (elements.saveAnalysisBtn) {
    elements.saveAnalysisBtn.addEventListener("click", openSaveAnalysisModal);
  }

  [elements.saveAnalysisCancel, elements.saveAnalysisBackdrop]
    .filter(Boolean)
    .forEach((trigger) => trigger.addEventListener("click", closeSaveAnalysisModal));

  if (elements.saveAnalysisConfirm) {
    elements.saveAnalysisConfirm.addEventListener("click", confirmSaveAnalysis);
  }

  if (elements.exportCsvBtn) {
    elements.exportCsvBtn.addEventListener("click", exportToCSV);
  }

  if (elements.paginationPrev) {
    elements.paginationPrev.addEventListener("click", () => goToPage(state.pagination.currentPage - 1));
  }

  if (elements.paginationNext) {
    elements.paginationNext.addEventListener("click", () => goToPage(state.pagination.currentPage + 1));
  }

  if (elements.clearButton) {
    elements.clearButton.addEventListener("click", clearSearch);
  }
}

async function handleFetchJobs(event) {
  event.preventDefault();

  const searchUrl = elements.searchInput.value.trim();
  if (!searchUrl) {
    showStatus("Enter a job search URL to continue.", "error");
    return;
  }

  setLoading(true);
  showStatus("Fetching jobs…", "info");

  try {
    const response = await fetch("/api/fetch-jobs", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ search_url: searchUrl }),
    });

    const payload = await response.json().catch(() => ({}));

    if (!response.ok) {
      throw new Error(payload.message || "Unable to fetch jobs.");
    }

    if (!payload.supported) {
      updatePlatformIndicator(payload.platform || "Unknown", false);
      clearDashboard();
      showStatus(payload.message || "Unsupported platform.", "error");
      return;
    }

    updatePlatformIndicator(payload.platform || "Unknown", true);
    showStatus(payload.message || "", payload.message ? "info" : "success");

    state.jobs = Array.isArray(payload.jobs) ? payload.jobs : [];
    resetFilters();
    populateFilterOptions(state.jobs);
    renderData(state.jobs);
    
    // Save to localStorage for persistence across pages
    saveDashboardState(searchUrl, payload.platform || "Unknown");
  } catch (error) {
    updatePlatformIndicator("Unknown", false);
    clearDashboard();
    showStatus(error.message || "Unexpected error encountered.", "error");
    console.error(error);
  } finally {
    setLoading(false);
  }
}

function initCharts() {
  // Check if Chart.js is loaded
  if (typeof Chart === 'undefined') {
    console.error('Chart.js is not loaded');
    return;
  }

  const chartDefaults = {
    color: "#e5e7eb",
    grid: "rgba(148, 163, 184, 0.12)",
    dataset: {
      background: "rgba(20, 184, 166, 0.35)",
      border: "#14b8a6",
      hover: "rgba(56, 189, 248, 0.55)",
    },
  };

  const deptCtx = document.getElementById("department-chart");
  const seniorityCtx = document.getElementById("seniority-chart");
  const locationCtx = document.getElementById("location-chart");

  if (deptCtx) {
    try {
      state.charts.department = new Chart(deptCtx, {
      type: "bar",
      data: {
        labels: [],
        datasets: [
          {
            label: "Departments",
            data: [],
            backgroundColor: chartDefaults.dataset.background,
            borderColor: chartDefaults.dataset.border,
            borderWidth: 1.5,
          },
        ],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { display: false },
        },
        scales: {
          x: {
            ticks: { color: chartDefaults.color },
            grid: { color: chartDefaults.grid },
          },
          y: {
            ticks: { color: chartDefaults.color, precision: 0 },
            grid: { color: chartDefaults.grid },
            beginAtZero: true,
          },
        },
      },
    });
    } catch (error) {
      console.error('Error initializing department chart:', error);
    }
  }

  if (seniorityCtx) {
    try {
      state.charts.seniority = new Chart(seniorityCtx, {
      type: "doughnut",
      data: {
        labels: [],
        datasets: [
          {
            data: [],
            backgroundColor: [
              "#14b8a6",
              "#38bdf8",
              "#0ea5e9",
              "#818cf8",
              "#64748b",
            ],
            borderColor: "rgba(15, 23, 42, 0.85)",
            borderWidth: 2,
          },
        ],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: {
            position: "bottom",
            labels: {
              color: chartDefaults.color,
              padding: 16,
            },
          },
        },
      },
    });
    } catch (error) {
      console.error('Error initializing seniority chart:', error);
    }
  }

  if (locationCtx) {
    try {
    state.charts.location = new Chart(locationCtx, {
      type: "bar",
      data: {
        labels: [],
        datasets: [
          {
            label: "Locations",
            data: [],
            backgroundColor: "rgba(56, 189, 248, 0.35)",
            borderColor: "#38bdf8",
            borderWidth: 1.5,
          },
        ],
      },
      options: {
        indexAxis: "y",
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { display: false },
        },
        scales: {
          x: {
            beginAtZero: true,
            ticks: { color: chartDefaults.color },
            grid: { color: chartDefaults.grid },
          },
          y: {
            ticks: { color: chartDefaults.color },
            grid: { color: chartDefaults.grid },
          },
        },
      },
    });
    } catch (error) {
      console.error('Error initializing location chart:', error);
    }
  }
}

function openSupportedModal() {
  if (!elements.supportedModal) return;
  elements.supportedModal.removeAttribute("hidden");
  document.body.style.overflow = "hidden";
  if (elements.supportedClose) {
    elements.supportedClose.focus();
  }
}

function closeSupportedModal() {
  if (!elements.supportedModal) return;
  elements.supportedModal.setAttribute("hidden", "hidden");
  document.body.style.overflow = "";
  if (elements.toggleSupported) {
    elements.toggleSupported.focus();
  }
}

function openChartModal(chartType) {
  if (!elements.chartModal || !state.charts[chartType]) return;

  const chartTitles = {
    department: "Roles by Department",
    seniority: "Seniority Mix",
    location: "Top Locations"
  };

  elements.chartModalTitle.textContent = chartTitles[chartType] || "Chart View";
  elements.chartModal.removeAttribute("hidden");
  document.body.style.overflow = "hidden";

  // Destroy existing expanded chart if it exists
  if (state.expandedChart) {
    state.expandedChart.destroy();
  }

  // Get the original chart configuration
  const originalChart = state.charts[chartType];
  const chartConfig = {
    type: originalChart.config.type,
    data: JSON.parse(JSON.stringify(originalChart.config.data)),
    options: JSON.parse(JSON.stringify(originalChart.config.options))
  };

  // Adjust options for larger display
  if (chartConfig.type === 'doughnut') {
    chartConfig.options.plugins.legend.labels.font = { size: 14 };
    chartConfig.options.plugins.legend.labels.padding = 20;
  } else {
    chartConfig.options.scales.x.ticks.font = { size: 13 };
    chartConfig.options.scales.y.ticks.font = { size: 13 };
  }

  // Create the expanded chart
  try {
    state.expandedChart = new Chart(elements.expandedChartCanvas, chartConfig);
  } catch (error) {
    console.error('Error creating expanded chart:', error);
  }
}

function closeChartModal() {
  if (!elements.chartModal) return;
  
  if (state.expandedChart) {
    state.expandedChart.destroy();
    state.expandedChart = null;
  }
  
  elements.chartModal.setAttribute("hidden", "hidden");
  document.body.style.overflow = "";
}

function downloadExpandedChart() {
  if (!elements.expandedChartCanvas) return;
  
  try {
    elements.expandedChartCanvas.toBlob(blob => {
      const link = document.createElement('a');
      const url = URL.createObjectURL(blob);
      const timestamp = new Date().toISOString().split('T')[0];
      const chartTitle = elements.chartModalTitle.textContent.toLowerCase().replace(/\s+/g, '-');
      
      link.setAttribute('href', url);
      link.setAttribute('download', `${chartTitle}-${timestamp}.png`);
      link.style.visibility = 'hidden';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
      
      showStatus('Chart downloaded successfully', 'success');
    }, 'image/png');
  } catch (e) {
    console.error('Failed to download chart:', e);
    showStatus('Failed to download chart', 'error');
  }
}

function setLoading(isLoading) {
  if (!elements.fetchButton) return;
  elements.fetchButton.disabled = isLoading;
  elements.fetchButton.textContent = isLoading ? "Fetching…" : "Fetch Jobs";
}

function showStatus(message, type) {
  if (!elements.status) return;
  elements.status.textContent = message || "";
  elements.status.classList.remove("status--error", "status--success", "status--info");
  if (message) {
    const className = {
      error: "status--error",
      success: "status--success",
      info: "status--info",
    }[type || "info"];
    if (className) {
      elements.status.classList.add(className);
    }
  }
}

function updatePlatformIndicator(platform, supported) {
  if (!elements.platformIndicator) return;
  elements.platformIndicator.textContent = `Detected: ${platform}`;
  elements.platformIndicator.classList.toggle("is-warning", !supported);
  elements.platformIndicator.classList.toggle("is-success", supported);
}

function clearDashboard() {
  state.jobs = [];
  renderData([]);
  populateFilterOptions([]);
}

function saveDashboardState(searchUrl, platform) {
  try {
    const dashboardState = {
      searchUrl: searchUrl,
      platform: platform,
      jobs: state.jobs,
      timestamp: new Date().toISOString()
    };
    localStorage.setItem('dashboardState', JSON.stringify(dashboardState));
  } catch (e) {
    console.error('Failed to save dashboard state:', e);
  }
}

function loadDashboardState() {
  try {
    const saved = localStorage.getItem('dashboardState');
    if (saved) {
      const dashboardState = JSON.parse(saved);
      
      // Check if data is not too old (optional: clear if older than 24 hours)
      const savedTime = new Date(dashboardState.timestamp);
      const now = new Date();
      const hoursDiff = (now - savedTime) / (1000 * 60 * 60);
      
      if (hoursDiff < 24 && dashboardState.jobs && dashboardState.jobs.length > 0) {
        // Restore state
        state.jobs = dashboardState.jobs;
        
        // Restore UI
        if (elements.searchInput) {
          elements.searchInput.value = dashboardState.searchUrl || "";
        }
        updatePlatformIndicator(dashboardState.platform || "Unknown", true);
        
        // Render data
        resetFilters();
        populateFilterOptions(state.jobs);
        renderData(state.jobs);
        
        // Show buttons that should be visible with data
        if (elements.saveAnalysisBtn) {
          elements.saveAnalysisBtn.style.display = "block";
        }
        if (elements.exportCsvBtn) {
          elements.exportCsvBtn.style.display = "block";
        }
        if (elements.clearButton) {
          elements.clearButton.style.display = "inline-flex";
        }
      }
    }
  } catch (e) {
    console.error('Failed to load dashboard state:', e);
  }
}

function clearSearch() {
  // Clear input
  if (elements.searchInput) {
    elements.searchInput.value = "";
  }
  
  // Reset platform indicator
  updatePlatformIndicator("None", false);
  
  // Clear status
  showStatus("", "info");
  
  // Clear all data
  clearDashboard();
  
  // Reset pagination
  state.pagination.currentPage = 1;
  
  // Hide clear button
  if (elements.clearButton) {
    elements.clearButton.style.display = "none";
  }
  
  // Clear from localStorage
  localStorage.removeItem('dashboardState');
  
  showStatus("Dashboard cleared", "success");
  setTimeout(() => showStatus("", "info"), 2000);
}

function resetFilters() {
  state.filters.department = "all";
  state.filters.location = "all";
  state.filters.seniority = "all";
  if (elements.filterDepartment) elements.filterDepartment.value = "all";
  if (elements.filterLocation) elements.filterLocation.value = "all";
  if (elements.filterSeniority) elements.filterSeniority.value = "all";
}

function populateFilterOptions(jobs) {
  populateSelect(elements.filterDepartment, uniqueValues(jobs, "department"), "All Departments");
  populateSelect(elements.filterLocation, uniqueValues(jobs, "location"), "All Locations");
  populateSelect(elements.filterSeniority, uniqueValues(jobs, "seniority"), "All Seniority Levels");
}

function populateSelect(select, values, label) {
  if (!select) return;
  const sorted = [...values].sort((a, b) => a.localeCompare(b));
  select.innerHTML = "";

  const defaultOption = document.createElement("option");
  defaultOption.value = "all";
  defaultOption.textContent = label;
  select.appendChild(defaultOption);

  sorted.forEach((value) => {
    const option = document.createElement("option");
    option.value = value;
    option.textContent = value;
    select.appendChild(option);
  });

  select.value = "all";
}

function uniqueValues(jobs, key) {
  const set = new Set();
  jobs.forEach((job) => {
    const value = job[key];
    if (!value) return;
    set.add(value);
  });
  return set;
}

function applyFilters() {
  const filtered = state.jobs.filter((job) => {
    const department = job.department || "Unassigned";
    const location = job.location || "Unspecified";
    const seniority = job.seniority || "Unspecified";

    const departmentMatch =
      state.filters.department === "all" ||
      department === state.filters.department;
    const locationMatch =
      state.filters.location === "all" ||
      location === state.filters.location;
    const seniorityMatch =
      state.filters.seniority === "all" ||
      seniority === state.filters.seniority;

    return departmentMatch && locationMatch && seniorityMatch;
  });

  // Reset to page 1 when filters change
  state.pagination.currentPage = 1;
  renderData(filtered);
}

function renderData(jobs) {
  renderJobsTable(jobs);
  renderSummary(jobs);
  renderCharts(jobs);
  renderHiringSummary(jobs);
  renderEmptyState(jobs);
}

function renderJobsTable(jobs) {
  if (!elements.tableBody) return;

  // Get jobs per page from settings
  const jobsPerPageSetting = typeof getSetting === 'function' ? getSetting('jobsPerPage') : 50;
  state.pagination.jobsPerPage = jobsPerPageSetting === 'all' ? jobs.length : parseInt(jobsPerPageSetting);

  // Calculate pagination
  const totalPages = Math.ceil(jobs.length / state.pagination.jobsPerPage);
  const startIndex = (state.pagination.currentPage - 1) * state.pagination.jobsPerPage;
  const endIndex = startIndex + state.pagination.jobsPerPage;
  const paginatedJobs = jobs.slice(startIndex, endIndex);

  elements.tableBody.innerHTML = "";

  paginatedJobs.forEach((job) => {
    const department = job.department || "Unassigned";
    const location = job.location || "Unspecified";
    const seniority = job.seniority || "Unspecified";
    const employment = formatEmploymentType(job.employment_type);
    const posted = job.posted_date || "Unknown";

    elements.tableBody.insertAdjacentHTML(
      "beforeend",
      `<tr>
        <td>${escapeHtml(job.title)}</td>
        <td>${escapeHtml(department)}</td>
        <td>${escapeHtml(location)}</td>
        <td>${escapeHtml(seniority)}</td>
        <td>${escapeHtml(employment)}</td>
        <td>${escapeHtml(job.source || "")}</td>
        <td>${escapeHtml(posted)}</td>
        <td><a class="table-link" href="${job.url}" target="_blank" rel="noopener">Open</a></td>
      </tr>`
    );
  });

  // Update pagination controls
  updatePaginationControls(jobs.length, totalPages);
}

function updatePaginationControls(totalJobs, totalPages) {
  if (!elements.paginationContainer) return;

  // Show/hide pagination based on whether we need it
  if (totalPages <= 1) {
    elements.paginationContainer.style.display = 'none';
    return;
  }

  elements.paginationContainer.style.display = 'flex';

  // Update info text
  const startIndex = (state.pagination.currentPage - 1) * state.pagination.jobsPerPage + 1;
  const endIndex = Math.min(state.pagination.currentPage * state.pagination.jobsPerPage, totalJobs);
  elements.paginationInfo.textContent = `Showing ${startIndex}-${endIndex} of ${totalJobs} jobs`;

  // Update button states
  elements.paginationPrev.disabled = state.pagination.currentPage === 1;
  elements.paginationNext.disabled = state.pagination.currentPage === totalPages;
}

function goToPage(pageNumber) {
  const filtered = state.jobs.filter((job) => {
    const department = job.department || "Unassigned";
    const location = job.location || "Unspecified";
    const seniority = job.seniority || "Unspecified";

    const departmentMatch =
      state.filters.department === "all" ||
      department === state.filters.department;
    const locationMatch =
      state.filters.location === "all" ||
      location === state.filters.location;
    const seniorityMatch =
      state.filters.seniority === "all" ||
      seniority === state.filters.seniority;

    return departmentMatch && locationMatch && seniorityMatch;
  });

  const totalPages = Math.ceil(filtered.length / state.pagination.jobsPerPage);
  
  // Validate page number
  if (pageNumber < 1 || pageNumber > totalPages) return;
  
  state.pagination.currentPage = pageNumber;
  renderJobsTable(filtered);

  // Scroll to top of table
  const tablePanel = document.getElementById('table-panel');
  if (tablePanel) {
    tablePanel.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }
}

function escapeHtml(value) {
  return String(value || "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

function formatEmploymentType(value) {
  if (!value) return "Unspecified";
  const map = {
    full_time: "Full-time",
    part_time: "Part-time",
    contract: "Contract",
    internship: "Internship",
  };
  return map[value] || value;
}

function renderSummary(jobs) {
  const total = jobs.length;
  const byDepartment = aggregateBy(jobs, "department", "Unassigned");
  const byLocation = aggregateBy(jobs, "location", "Unspecified");
  const bySeniority = aggregateBy(jobs, "seniority", "Unspecified");
  const remoteCount = jobs.filter((job) => job.is_remote).length;
  const onsiteCount = total - remoteCount;
  const remotePercentage = total ? Math.round((remoteCount / total) * 100) : 0;

  elements.totalRolesValue.textContent = total.toString();
  elements.totalRolesCaption.textContent = total
    ? `${total} active posting${total === 1 ? "" : "s"}`
    : "Awaiting import";

  const departmentCount = Object.keys(byDepartment).filter(
    (department) => department !== "Unassigned"
  ).length;
  elements.departmentsValue.textContent = departmentCount.toString();
  elements.departmentsCaption.textContent = departmentCount
    ? "Distinct hiring groups"
    : "--";

  const locationCount = Object.keys(byLocation).filter(
    (location) => location !== "Unspecified"
  ).length;
  elements.locationsValue.textContent = locationCount.toString();
  elements.locationsCaption.textContent = locationCount
    ? "Geographical spread"
    : "--";

  elements.remoteValue.textContent = `${remotePercentage}%`;
  elements.remoteCaption.textContent = total
    ? `${remoteCount} remote / ${onsiteCount} onsite`
    : "Remote vs onsite";

  state.summary = {
    byDepartment,
    byLocation,
    bySeniority,
  };
}

function aggregateBy(jobs, key, fallback) {
  return jobs.reduce((acc, job) => {
    const value = job[key] || fallback;
    acc[value] = (acc[value] || 0) + 1;
    return acc;
  }, {});
}

function renderCharts(jobs) {
  const charts = state.charts;
  if (!charts) {
    console.warn('Charts not initialized');
    return;
  }

  const byDepartment = aggregateBy(jobs, "department", "Unassigned");
  const bySeniority = aggregateBy(jobs, "seniority", "Unspecified");
  const byLocation = aggregateBy(jobs, "location", "Unspecified");

  console.log('Chart data:', { byDepartment, bySeniority, byLocation });

  updateChart(charts.department, byDepartment);
  updateChart(charts.seniority, bySeniority);
  updateChart(charts.location, sliceTopEntries(byLocation, 7));
}

function updateChart(chart, entries) {
  if (!chart) {
    console.warn('Chart instance not available');
    return;
  }
  const labels = Object.keys(entries);
  const data = Object.values(entries);
  console.log('Updating chart with:', { labels, data });
  chart.data.labels = labels;
  chart.data.datasets[0].data = data;
  chart.update();
}

function sliceTopEntries(records, limit) {
  return Object.entries(records)
    .sort((a, b) => b[1] - a[1])
    .slice(0, limit)
    .reduce((acc, [key, count]) => {
      acc[key] = count;
      return acc;
    }, {});
}

function renderHiringSummary(jobs) {
  // Check if auto-generate summary is enabled in settings
  const autoGenerateSummary = typeof getSetting === 'function' ? getSetting('autoGenerateSummary') : true;
  
  if (!elements.summaryTextPanel || !jobs.length || !autoGenerateSummary) {
    if (elements.summaryTextPanel) {
      elements.summaryTextPanel.style.display = 'none';
    }
    return;
  }

  elements.summaryTextPanel.style.display = 'block';
  elements.summaryLoading.style.display = 'flex';
  elements.summaryText.innerHTML = '';

  // Analyze the data
  const byDepartment = aggregateBy(jobs, "department", "Unassigned");
  const bySeniority = aggregateBy(jobs, "seniority", "Unspecified");
  const byLocation = aggregateBy(jobs, "location", "Unspecified");
  
  const topDepartments = Object.entries(byDepartment)
    .filter(([dept]) => dept !== 'Unassigned')
    .sort((a, b) => b[1] - a[1])
    .slice(0, 3);
  
  const topLocations = Object.entries(byLocation)
    .filter(([loc]) => loc !== 'Unspecified')
    .sort((a, b) => b[1] - a[1])
    .slice(0, 3);
  
  const seniorityList = Object.entries(bySeniority)
    .filter(([sen]) => sen !== 'Unspecified')
    .sort((a, b) => b[1] - a[1]);

  // Extract common skills/keywords from job titles
  const skillKeywords = extractSkills(jobs);
  
  // Generate summary
  setTimeout(() => {
    let summary = `<p>The company is actively hiring <strong>${jobs.length} role${jobs.length !== 1 ? 's' : ''}</strong>`;
    
    if (topDepartments.length > 0) {
      const deptNames = topDepartments.map(([name, count]) => 
        `${name} (${count} role${count !== 1 ? 's' : ''})`
      );
      summary += ` with primary focus on <strong>${deptNames.join(', ')}</strong>`;
    }
    summary += '.</p>';

    if (seniorityList.length > 0) {
      summary += `<p><strong>Seniority Distribution:</strong> `;
      const seniorityText = seniorityList.map(([level, count]) => {
        const percentage = Math.round((count / jobs.length) * 100);
        return `${level} (${percentage}%)`;
      }).join(', ');
      summary += `${seniorityText}.</p>`;
    }

    if (topLocations.length > 0) {
      summary += `<p><strong>Key Hiring Locations:</strong> ${topLocations.map(([loc]) => loc).join(', ')}`;
      const remoteCount = jobs.filter(job => job.is_remote).length;
      if (remoteCount > 0) {
        const remotePercent = Math.round((remoteCount / jobs.length) * 100);
        summary += `, with ${remotePercent}% offering remote work options`;
      }
      summary += '.</p>';
    }

    if (skillKeywords.length > 0) {
      summary += `<p><strong>In-Demand Skills & Keywords:</strong> ${skillKeywords.join(', ')}.</p>`;
    }

    elements.summaryLoading.style.display = 'none';
    elements.summaryText.innerHTML = summary;
  }, 500);
}

function extractSkills(jobs) {
  const titleWords = {};
  const commonWords = new Set(['the', 'and', 'for', 'with', 'senior', 'junior', 'lead', 'manager', 'engineer', 'developer', 'specialist', 'analyst', 'coordinator', 'assistant', 'associate', 'director', 'head', 'of', 'in', 'at', 'to', 'a', 'an', 'or']);
  
  jobs.forEach(job => {
    if (!job.title) return;
    const words = job.title.toLowerCase()
      .replace(/[^\w\s]/g, ' ')
      .split(/\s+/)
      .filter(word => word.length > 2 && !commonWords.has(word));
    
    words.forEach(word => {
      titleWords[word] = (titleWords[word] || 0) + 1;
    });
  });

  return Object.entries(titleWords)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 8)
    .map(([word]) => word.charAt(0).toUpperCase() + word.slice(1));
}

function renderEmptyState(jobs = []) {
  if (!elements.emptyState) return;
  const hasData = jobs.length > 0;
  elements.emptyState.style.display = hasData ? "none" : "block";
  
  // Show/hide save and export buttons
  if (elements.saveAnalysisBtn) {
    elements.saveAnalysisBtn.style.display = hasData ? "block" : "none";
  }
  if (elements.exportCsvBtn) {
    elements.exportCsvBtn.style.display = hasData ? "block" : "none";
  }
  if (elements.clearButton) {
    elements.clearButton.style.display = hasData ? "inline-flex" : "none";
  }
}

function exportToCSV() {
  if (state.jobs.length === 0) {
    showStatus("No data to export. Please fetch jobs first.", "error");
    return;
  }

  // Get export format from settings (default to CSV if settings.js not loaded)
  const exportFormat = typeof getSetting === 'function' ? getSetting('exportFormat') : 'csv';

  // Export based on selected format
  switch (exportFormat) {
    case 'json':
      exportToJSON();
      break;
    case 'excel':
      exportToExcel();
      break;
    case 'csv':
    default:
      exportToCSVFormat();
      break;
  }
}

function exportToCSVFormat() {
  let csvContent = '';
  
  // Add AI summary if enabled
  const includeAISummary = typeof getSetting === 'function' ? getSetting('includeAISummary') : false;
  if (includeAISummary && elements.summaryText && elements.summaryText.textContent) {
    csvContent += '"HIRING SUMMARY"\n';
    csvContent += `"${elements.summaryText.textContent.replace(/"/g, '""').replace(/\n/g, ' ')}"\n`;
    csvContent += '\n';
  }
  
  // Create CSV header
  const headers = ["Title", "Department", "Location", "Seniority", "Employment Type", "Source", "Posted Date", "URL"];
  
  // Create CSV rows
  const rows = state.jobs.map(job => [
    job.title || "",
    job.department || "Unassigned",
    job.location || "Unspecified",
    job.seniority || "Unspecified",
    formatEmploymentType(job.employment_type),
    job.source || "",
    job.posted_date || "Unknown",
    job.url || ""
  ]);

  // Combine headers and rows
  csvContent += [
    headers.join(","),
    ...rows.map(row => row.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(","))
  ].join("\n");

  // Create blob and download
  const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
  const link = document.createElement("a");
  const url = URL.createObjectURL(blob);
  
  const timestamp = new Date().toISOString().split('T')[0];
  const filename = `job-analysis-${timestamp}.csv`;
  
  link.setAttribute("href", url);
  link.setAttribute("download", filename);
  link.style.visibility = "hidden";
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);

  showStatus(`Exported ${state.jobs.length} jobs to ${filename}`, "success");
}

function exportToJSON() {
  // Add AI summary if enabled
  const includeAISummary = typeof getSetting === 'function' ? getSetting('includeAISummary') : false;
  
  const exportData = {
    exportDate: new Date().toISOString(),
    totalJobs: state.jobs.length,
    filters: state.filters,
    hiringSummary: includeAISummary && elements.summaryText ? elements.summaryText.textContent : undefined,
    jobs: state.jobs.map(job => ({
      title: job.title || "",
      department: job.department || "Unassigned",
      location: job.location || "Unspecified",
      seniority: job.seniority || "Unspecified",
      employmentType: formatEmploymentType(job.employment_type),
      source: job.source || "",
      postedDate: job.posted_date || "Unknown",
      url: job.url || ""
    }))
  };

  const jsonContent = JSON.stringify(exportData, null, 2);
  const blob = new Blob([jsonContent], { type: "application/json;charset=utf-8;" });
  const link = document.createElement("a");
  const url = URL.createObjectURL(blob);
  
  const timestamp = new Date().toISOString().split('T')[0];
  const filename = `job-analysis-${timestamp}.json`;
  
  link.setAttribute("href", url);
  link.setAttribute("download", filename);
  link.style.visibility = "hidden";
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);

  showStatus(`Exported ${state.jobs.length} jobs to ${filename}`, "success");
}

function exportToExcel() {
  // Check if charts should be included
  const includeCharts = typeof getSetting === 'function' ? getSetting('includeChartsInExport') : true;
  
  // Create HTML table structure that Excel can import
  const headers = ["Title", "Department", "Location", "Seniority", "Employment Type", "Source", "Posted Date", "URL"];
  
  let xlsContent = `
    <html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:x="urn:schemas-microsoft-com:office:excel" xmlns="http://www.w3.org/TR/REC-html40">
    <head>
      <meta charset="utf-8">
      <!--[if gte mso 9]><xml><x:ExcelWorkbook><x:ExcelWorksheets><x:ExcelWorksheet>
      <x:Name>Job Analysis</x:Name>
      <x:WorksheetOptions><x:DisplayGridlines/></x:WorksheetOptions></x:ExcelWorksheet>
      </x:ExcelWorksheets></x:ExcelWorkbook></xml><![endif]-->
      <style>
        table { border-collapse: collapse; width: 100%; margin-bottom: 30px; }
        th { background-color: #14b8a6; color: white; font-weight: bold; padding: 8px; border: 1px solid #ddd; }
        td { padding: 8px; border: 1px solid #ddd; }
        tr:nth-child(even) { background-color: #f9fafb; }
        .chart-section { margin: 30px 0; page-break-inside: avoid; }
        .chart-title { font-size: 18px; font-weight: bold; margin-bottom: 10px; color: #0f172a; }
        .chart-image { max-width: 600px; border: 1px solid #e2e8f0; }
        .summary-section { margin-bottom: 30px; padding: 20px; background-color: #f1f5f9; border-left: 4px solid #14b8a6; }
        .summary-title { font-size: 20px; font-weight: bold; margin-bottom: 10px; color: #0f172a; }
      </style>
    </head>
    <body>
      <h1 style="color: #0f172a; margin-bottom: 20px;">Job Analysis Report</h1>
      <p style="color: #64748b; margin-bottom: 30px;">Generated on ${new Date().toLocaleDateString()}</p>
  `;

  // Add AI Summary if enabled
  const includeAISummary = typeof getSetting === 'function' ? getSetting('includeAISummary') : false;
  if (includeAISummary && elements.summaryText && elements.summaryText.innerHTML) {
    xlsContent += `
      <div class="summary-section">
        <div class="summary-title">Hiring Summary</div>
        <div>${elements.summaryText.innerHTML}</div>
      </div>
    `;
  }

  // Add charts if enabled - show text data summary
  if (includeCharts && state.summary) {
      xlsContent += `
        <div style="margin: 30px 0; padding: 20px; background-color: #f8fafc; border: 1px solid #e2e8f0;">
          <h2 style="color: #0f172a; margin-bottom: 15px;">Chart Data Summary</h2>
      `;
      
      // Department breakdown
      if (state.summary.byDepartment) {
        xlsContent += '<div style="margin-bottom: 20px;"><strong>Roles by Department:</strong><br/>';
        const deptEntries = Object.entries(state.summary.byDepartment)
          .sort((a, b) => b[1] - a[1])
          .slice(0, 10);
        deptEntries.forEach(([dept, count]) => {
          const percentage = Math.round((count / state.jobs.length) * 100);
          xlsContent += `${dept}: ${count} roles (${percentage}%)<br/>`;
        });
        xlsContent += '</div>';
      }

      // Seniority breakdown
      if (state.summary.bySeniority) {
        xlsContent += '<div style="margin-bottom: 20px;"><strong>Seniority Mix:</strong><br/>';
        const seniorityEntries = Object.entries(state.summary.bySeniority)
          .sort((a, b) => b[1] - a[1]);
        seniorityEntries.forEach(([level, count]) => {
          const percentage = Math.round((count / state.jobs.length) * 100);
          xlsContent += `${level}: ${count} roles (${percentage}%)<br/>`;
        });
        xlsContent += '</div>';
      }

      // Location breakdown
      if (state.summary.byLocation) {
        xlsContent += '<div style="margin-bottom: 20px;"><strong>Top Locations:</strong><br/>';
        const locationEntries = Object.entries(state.summary.byLocation)
          .sort((a, b) => b[1] - a[1])
          .slice(0, 10);
        locationEntries.forEach(([loc, count]) => {
          const percentage = Math.round((count / state.jobs.length) * 100);
          xlsContent += `${loc}: ${count} roles (${percentage}%)<br/>`;
        });
        xlsContent += '</div>';
      }
      
      xlsContent += '</div>';
    }

  xlsContent += `
      <h2 style="color: #0f172a; margin: 30px 0 20px 0;">Job Listings</h2>
      <table>
        <thead>
          <tr>${headers.map(h => `<th>${h}</th>`).join('')}</tr>
        </thead>
        <tbody>
  `;

  state.jobs.forEach(job => {
    xlsContent += '<tr>';
    xlsContent += `<td>${escapeHtml(job.title || "")}</td>`;
    xlsContent += `<td>${escapeHtml(job.department || "Unassigned")}</td>`;
    xlsContent += `<td>${escapeHtml(job.location || "Unspecified")}</td>`;
    xlsContent += `<td>${escapeHtml(job.seniority || "Unspecified")}</td>`;
    xlsContent += `<td>${escapeHtml(formatEmploymentType(job.employment_type))}</td>`;
    xlsContent += `<td>${escapeHtml(job.source || "")}</td>`;
    xlsContent += `<td>${escapeHtml(job.posted_date || "Unknown")}</td>`;
    xlsContent += `<td>${job.url ? `<a href="${escapeHtml(job.url)}">${escapeHtml(job.url)}</a>` : ""}</td>`;
    xlsContent += '</tr>';
  });

  xlsContent += '</tbody></table></body></html>';

  const blob = new Blob([xlsContent], { type: "application/vnd.ms-excel;charset=utf-8;" });
  const link = document.createElement("a");
  const url = URL.createObjectURL(blob);
  
  const timestamp = new Date().toISOString().split('T')[0];
  const filename = `job-analysis-${timestamp}.xls`;
  
  link.setAttribute("href", url);
  link.setAttribute("download", filename);
  link.style.visibility = "hidden";
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);

  showStatus(`Exported ${state.jobs.length} jobs to ${filename}`, "success");
}

function openSaveAnalysisModal() {
  if (state.jobs.length === 0) {
    showStatus("No analysis to save. Please fetch jobs first.", "error");
    return;
  }

  elements.saveAnalysisInput.value = "";
  elements.saveAnalysisModal.removeAttribute("hidden");
  document.body.style.overflow = "hidden";
  elements.saveAnalysisInput.focus();
}

function closeSaveAnalysisModal() {
  if (!elements.saveAnalysisModal) return;
  elements.saveAnalysisModal.setAttribute("hidden", "hidden");
  document.body.style.overflow = "";
  elements.saveAnalysisInput.value = "";
}

function confirmSaveAnalysis() {
  const companyName = elements.saveAnalysisInput.value.trim();
  
  if (!companyName) {
    elements.saveAnalysisInput.focus();
    return;
  }

  const byDepartment = aggregateBy(state.jobs, "department", "Unassigned");
  const bySeniority = aggregateBy(state.jobs, "seniority", "Unspecified");
  const byLocation = aggregateBy(state.jobs, "location", "Unspecified");
  
  const topDepartments = Object.entries(byDepartment)
    .filter(([dept]) => dept !== 'Unassigned')
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5);
  
  const topLocations = Object.entries(byLocation)
    .filter(([loc]) => loc !== 'Unspecified')
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5);

  const remoteCount = state.jobs.filter(job => job.is_remote).length;
  const remotePercent = state.jobs.length ? Math.round((remoteCount / state.jobs.length) * 100) : 0;

  const analysis = {
    id: Date.now().toString(),
    companyName: companyName,
    savedAt: new Date().toISOString(),
    platform: elements.platformIndicator ? elements.platformIndicator.textContent.replace('Detected: ', '') : 'Unknown',
    totalRoles: state.jobs.length,
    totalDepartments: Object.keys(byDepartment).filter(d => d !== 'Unassigned').length,
    totalLocations: Object.keys(byLocation).filter(l => l !== 'Unspecified').length,
    remotePercent: remotePercent,
    topDepartments: topDepartments,
    topLocations: topLocations,
    summary: elements.summaryText ? elements.summaryText.innerHTML : '',
    jobs: state.jobs
  };

  const savedAnalyses = JSON.parse(localStorage.getItem("savedAnalyses") || "[]");
  savedAnalyses.push(analysis);
  localStorage.setItem("savedAnalyses", JSON.stringify(savedAnalyses));

  closeSaveAnalysisModal();
  showStatus(`Analysis "${companyName}" saved successfully!`, "success");
}
