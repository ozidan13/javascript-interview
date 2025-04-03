// Global Variables
let questionsData = [];
let filteredQuestions = [];
let currentQuestionId = null;
let bookmarkedQuestions = JSON.parse(localStorage.getItem('bookmarkedQuestions')) || [];
let recentlyViewed = JSON.parse(localStorage.getItem('recentlyViewed')) || [];
let currentPage = 1;
const questionsPerPage = 12;
let isLoading = false;

// DOM Elements
const searchInput = document.getElementById('search-input');
const questionsGrid = document.getElementById('questions-grid');
const paginationContainer = document.getElementById('pagination');
const modal = document.getElementById('question-modal');
const modalTitle = document.getElementById('modal-question-title');
const modalAnswer = document.getElementById('modal-answer');
const bookmarkBtn = document.getElementById('bookmark-btn');
const closeModalBtn = document.getElementById('close-modal');
const themeSwitch = document.getElementById('theme-switch');
const navItems = document.querySelectorAll('.nav-item');
const pageContents = document.querySelectorAll('.page-content');
const filterButtons = document.querySelectorAll('.filter-btn');
const sortSelect = document.getElementById('sort-select');
const bookmarksContainer = document.getElementById('bookmarks-container');
const popularList = document.getElementById('popular-list');
const recentList = document.getElementById('recent-list');
const totalQuestionsSpan = document.getElementById('total-questions');
const bookmarkedCountSpan = document.getElementById('bookmarked-count');
const totalQsSpan = document.getElementById('total-qs');
const topicsCountSpan = document.getElementById('topics-count');
const viewedCountSpan = document.getElementById('viewed-count');
const menuToggleBtn = document.getElementById('menu-toggle');
const sidebar = document.querySelector('.sidebar');
const appContainer = document.querySelector('.app-container');

// Initialize the application
document.addEventListener('DOMContentLoaded', async () => {
  // Create loading indicator
  showLoading(true);
  
  // Create menu overlay
  createMenuOverlay();
  
  // Load questions data
  await loadQuestions();
  
  // Initialize UI
  updateStats();
  setupEventListeners();
  initTheme();
  renderPopularQuestions();
  renderRecentlyViewed();
  
  // Initialize Chart
  createTopicsChart();
  
  // Handle missing images
  handleMissingImages();
  
  // Hide loading
  showLoading(false);
});

// Show or hide loading spinner
function showLoading(show) {
  // Remove existing loader if any
  const existingLoader = document.getElementById('app-loader');
  if (existingLoader) {
    existingLoader.remove();
  }
  
  if (show) {
    isLoading = true;
    
    // Create and append loader
    const loader = document.createElement('div');
    loader.id = 'app-loader';
    loader.innerHTML = `
      <div class="loader-content">
        <div class="loader-spinner"></div>
        <p>Loading Q&A data...</p>
      </div>
    `;
    document.body.appendChild(loader);
    
    // Add the active class after a short delay to trigger animation
    setTimeout(() => {
      loader.classList.add('active');
    }, 10);
  } else {
    isLoading = false;
  }
}

// Create menu overlay element for mobile
function createMenuOverlay() {
  const overlay = document.createElement('div');
  overlay.className = 'menu-overlay';
  overlay.id = 'menu-overlay';
  document.body.appendChild(overlay);
  
  // Add event listener to close menu when overlay is clicked
  overlay.addEventListener('click', () => {
    toggleMobileMenu(false);
  });
}

// Toggle mobile menu with animation
function toggleMobileMenu(forceState = null) {
  const overlay = document.getElementById('menu-overlay');
  
  // If forceState is provided, set that state
  // Otherwise toggle the current state
  const shouldOpen = forceState !== null ? forceState : !sidebar.classList.contains('open');
  
  if (shouldOpen) {
    sidebar.classList.add('open');
    overlay.classList.add('active');
    document.body.style.overflow = 'hidden'; // Prevent scrolling when menu is open
    menuToggleBtn.innerHTML = '<i class="fas fa-times"></i>';
  } else {
    sidebar.classList.remove('open');
    overlay.classList.remove('active');
    document.body.style.overflow = ''; // Enable scrolling
    menuToggleBtn.innerHTML = '<i class="fas fa-bars"></i>';
  }
}

// Handle missing images with placeholders
function handleMissingImages() {
  // Create a placeholder image for any broken images
  const placeholderImage = document.createElement('img');
  placeholderImage.src = 'data:image/svg+xml;charset=UTF-8,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20width%3D%22200%22%20height%3D%22100%22%20viewBox%3D%220%200%20200%20100%22%3E%3Crect%20width%3D%22200%22%20height%3D%22100%22%20fill%3D%22%23eee%22%2F%3E%3Ctext%20x%3D%2250%25%22%20y%3D%2250%25%22%20font-family%3D%22sans-serif%22%20font-size%3D%2214%22%20text-anchor%3D%22middle%22%20dominant-baseline%3D%22middle%22%20fill%3D%22%23999%22%3EImage%20not%20found%3C%2Ftext%3E%3C%2Fsvg%3E';
  
  // Listen for image errors
  document.addEventListener('error', (e) => {
    if (e.target.tagName.toLowerCase() === 'img') {
      e.target.src = placeholderImage.src;
    }
  }, true);
  
  // Modify the markdown renderer to fix image paths
  const originalImageRenderer = marked.Renderer.prototype.image;
  marked.Renderer.prototype.image = function(href, title, text) {
    // Fix paths for relative images
    if (href && !href.startsWith('http') && !href.startsWith('data:')) {
      if (!href.startsWith('/')) {
        href = 'images/' + href;
      }
    }
    return originalImageRenderer.call(this, href, title, text);
  };
}

// Load questions from JSON file
async function loadQuestions() {
  try {
    const response = await fetch('datajs.json');
    questionsData = await response.json();
    filteredQuestions = [...questionsData];
    renderQuestions();
  } catch (error) {
    console.error('Error loading questions:', error);
    questionsGrid.innerHTML = '<div class="error-message">Failed to load questions. Please try refreshing the page.</div>';
  }
}

// Setup event listeners
function setupEventListeners() {
  // Navigation
  navItems.forEach(item => {
    item.addEventListener('click', (e) => {
      e.preventDefault();
      const targetPage = item.getAttribute('data-page');
      switchPage(targetPage);
      
      // Close sidebar on mobile after navigation
      if (window.innerWidth <= 768) {
        toggleMobileMenu(false);
      }
    });
  });
  
  // Mobile menu toggle
  menuToggleBtn.addEventListener('click', (e) => {
    e.stopPropagation(); // Prevent event bubbling
    toggleMobileMenu();
  });
  
  // Close sidebar when clicking outside on mobile
  document.addEventListener('click', (e) => {
    if (window.innerWidth <= 768 && 
        sidebar.classList.contains('open') && 
        !e.target.closest('.sidebar') && 
        !e.target.closest('#menu-toggle')) {
      toggleMobileMenu(false);
    }
  });
  
  // Search
  searchInput.addEventListener('input', debounce(() => {
    currentPage = 1;
    filterQuestions();
  }, 300));
  
  // Filter buttons
  filterButtons.forEach(btn => {
    btn.addEventListener('click', () => {
      filterButtons.forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      currentPage = 1;
      filterQuestions();
    });
  });
  
  // Sort dropdown
  sortSelect.addEventListener('change', () => {
    currentPage = 1;
    filterQuestions();
  });
  
  // Modal events
  closeModalBtn.addEventListener('click', closeModal);
  bookmarkBtn.addEventListener('click', toggleBookmark);
  
  // Theme toggle
  themeSwitch.addEventListener('change', toggleTheme);
  
  // Close modal on outside click
  window.addEventListener('click', (e) => {
    if (e.target === modal) {
      closeModal();
    }
  });
  
  // Handle window resize
  window.addEventListener('resize', debounce(() => {
    if (window.innerWidth > 768 && sidebar.classList.contains('open')) {
      toggleMobileMenu(false);
    }
  }, 200));
  
  // Handle escape key to close menu and modal
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      if (modal.classList.contains('show')) {
        closeModal();
      } else if (sidebar.classList.contains('open') && window.innerWidth <= 768) {
        toggleMobileMenu(false);
      }
    }
  });
  
  // Stop scrolling when modal or menu is open on mobile
  modal.addEventListener('touchmove', (e) => {
    if (!e.target.closest('.modal-content')) {
      e.preventDefault();
    }
  }, { passive: false });
}

// Switch between pages
function switchPage(page) {
  navItems.forEach(item => {
    item.classList.remove('active');
    if (item.getAttribute('data-page') === page) {
      item.classList.add('active');
    }
  });
  
  pageContents.forEach(content => {
    content.classList.remove('active');
    if (content.id === `${page}-page`) {
      content.classList.add('active');
    }
  });
  
  if (page === 'bookmarks') {
    renderBookmarks();
  } else if (page === 'all-questions') {
    renderQuestions();
  }
}

// Filter questions based on search, filter, and sort
function filterQuestions() {
  const searchTerm = searchInput.value.toLowerCase();
  const activeFilter = document.querySelector('.filter-btn.active').getAttribute('data-filter');
  const sortOption = sortSelect.value;
  
  // Filter by search term and category
  filteredQuestions = questionsData.filter(q => {
    const matchesSearch = q.question.toLowerCase().includes(searchTerm);
    
    // Simple classification based on question content or id
    let category = 'basics';
    if (q.question.toLowerCase().includes('function') || q.question.toLowerCase().includes('callback')) {
      category = 'functions';
    } else if (q.question.toLowerCase().includes('object') || q.question.toLowerCase().includes('json')) {
      category = 'objects';
    } else if (q.question.toLowerCase().includes('array') || q.question.toLowerCase().includes('splice')) {
      category = 'arrays';
    } else if (q.id > 50) {
      category = 'advanced';
    }
    
    return matchesSearch && (activeFilter === 'all' || category === activeFilter);
  });
  
  // Sort the filtered questions
  switch(sortOption) {
    case 'id':
      filteredQuestions.sort((a, b) => a.id - b.id);
      break;
    case 'id-desc':
      filteredQuestions.sort((a, b) => b.id - a.id);
      break;
    case 'alpha':
      filteredQuestions.sort((a, b) => a.question.localeCompare(b.question));
      break;
    case 'alpha-desc':
      filteredQuestions.sort((a, b) => b.question.localeCompare(a.question));
      break;
  }
  
  renderQuestions();
}

// Render questions to the grid
function renderQuestions() {
  const startIndex = (currentPage - 1) * questionsPerPage;
  const endIndex = startIndex + questionsPerPage;
  const currentQuestions = filteredQuestions.slice(startIndex, endIndex);
  
  questionsGrid.innerHTML = '';
  
  if (currentQuestions.length === 0) {
    questionsGrid.innerHTML = '<div class="no-results">No questions found matching your criteria.</div>';
    paginationContainer.innerHTML = '';
    return;
  }
  
  currentQuestions.forEach(question => {
    const isBookmarked = bookmarkedQuestions.some(q => q.id === question.id);
    
    // Create category tags based on question content
    const tags = [];
    if (question.question.toLowerCase().includes('function') || question.question.toLowerCase().includes('callback')) {
      tags.push('functions');
    }
    if (question.question.toLowerCase().includes('object') || question.question.toLowerCase().includes('json')) {
      tags.push('objects');
    }
    if (question.question.toLowerCase().includes('array') || question.question.toLowerCase().includes('splice')) {
      tags.push('arrays');
    }
    if (question.id > 50) {
      tags.push('advanced');
    }
    if (tags.length === 0) {
      tags.push('basics');
    }
    
    const card = document.createElement('div');
    card.classList.add('question-card');
    card.innerHTML = `
      <span class="question-id">#${question.id}</span>
      <h3 class="question-title">${question.question}</h3>
      <div class="question-tags">
        ${tags.map(tag => `<span class="question-tag">${tag}</span>`).join('')}
      </div>
      ${isBookmarked ? '<i class="fas fa-bookmark" style="position: absolute; top: 12px; left: 12px; color: var(--primary-color);"></i>' : ''}
    `;
    
    card.addEventListener('click', () => {
      openQuestionDetails(question);
    });
    
    questionsGrid.appendChild(card);
  });
  
  renderPagination();
}

// Render pagination controls
function renderPagination() {
  const totalPages = Math.ceil(filteredQuestions.length / questionsPerPage);
  
  paginationContainer.innerHTML = '';
  
  if (totalPages <= 1) return;
  
  // Previous button
  if (currentPage > 1) {
    const prevBtn = document.createElement('button');
    prevBtn.classList.add('page-btn');
    prevBtn.innerHTML = '<i class="fas fa-chevron-left"></i>';
    prevBtn.addEventListener('click', () => {
      currentPage--;
      renderQuestions();
    });
    paginationContainer.appendChild(prevBtn);
  }
  
  // Page numbers
  let startPage = Math.max(1, currentPage - 2);
  let endPage = Math.min(totalPages, startPage + 4);
  
  if (endPage - startPage < 4) {
    startPage = Math.max(1, endPage - 4);
  }
  
  for (let i = startPage; i <= endPage; i++) {
    const pageBtn = document.createElement('button');
    pageBtn.classList.add('page-btn');
    if (i === currentPage) pageBtn.classList.add('active');
    pageBtn.textContent = i;
    pageBtn.addEventListener('click', () => {
      currentPage = i;
      renderQuestions();
    });
    paginationContainer.appendChild(pageBtn);
  }
  
  // Next button
  if (currentPage < totalPages) {
    const nextBtn = document.createElement('button');
    nextBtn.classList.add('page-btn');
    nextBtn.innerHTML = '<i class="fas fa-chevron-right"></i>';
    nextBtn.addEventListener('click', () => {
      currentPage++;
      renderQuestions();
    });
    paginationContainer.appendChild(nextBtn);
  }
}

// Open question details in modal
function openQuestionDetails(question) {
  currentQuestionId = question.id;
  
  modalTitle.textContent = question.question;
  
  // Use marked.js to render markdown
  modalAnswer.innerHTML = marked.parse(question.answer);
  
  // Initialize syntax highlighting
  document.querySelectorAll('pre code').forEach((block) => {
    hljs.highlightBlock(block);
  });
  
  // Update bookmark button
  const isBookmarked = bookmarkedQuestions.some(q => q.id === question.id);
  if (isBookmarked) {
    bookmarkBtn.classList.add('active');
    bookmarkBtn.querySelector('i').classList.remove('far');
    bookmarkBtn.querySelector('i').classList.add('fas');
  } else {
    bookmarkBtn.classList.remove('active');
    bookmarkBtn.querySelector('i').classList.remove('fas');
    bookmarkBtn.querySelector('i').classList.add('far');
  }
  
  // Add to recently viewed
  addToRecentlyViewed(question);
  
  // Show modal with animation
  modal.style.display = 'flex';
  setTimeout(() => {
    modal.classList.add('show');
  }, 10);
}

// Close the modal
function closeModal() {
  modal.classList.remove('show');
  setTimeout(() => {
    modal.style.display = 'none';
  }, 300);
}

// Toggle bookmark status
function toggleBookmark() {
  const question = questionsData.find(q => q.id === currentQuestionId);
  if (!question) return;
  
  const isBookmarked = bookmarkedQuestions.some(q => q.id === question.id);
  
  if (isBookmarked) {
    // Remove bookmark
    bookmarkedQuestions = bookmarkedQuestions.filter(q => q.id !== question.id);
    bookmarkBtn.classList.remove('active');
    bookmarkBtn.querySelector('i').classList.remove('fas');
    bookmarkBtn.querySelector('i').classList.add('far');
  } else {
    // Add bookmark
    bookmarkedQuestions.push(question);
    bookmarkBtn.classList.add('active');
    bookmarkBtn.querySelector('i').classList.remove('far');
    bookmarkBtn.querySelector('i').classList.add('fas');
  }
  
  // Save to localStorage
  localStorage.setItem('bookmarkedQuestions', JSON.stringify(bookmarkedQuestions));
  
  // Update UI
  updateStats();
  
  // If on bookmarks page, refresh it
  if (document.getElementById('bookmarks-page').classList.contains('active')) {
    renderBookmarks();
  }
}

// Render bookmarked questions
function renderBookmarks() {
  bookmarksContainer.innerHTML = '';
  
  if (bookmarkedQuestions.length === 0) {
    bookmarksContainer.innerHTML = '<div class="no-results">No bookmarked questions yet. Click the bookmark icon on any question to save it here.</div>';
    return;
  }
  
  bookmarkedQuestions.forEach(question => {
    const card = document.createElement('div');
    card.classList.add('bookmark-card');
    card.innerHTML = `
      <h3>${question.question}</h3>
      <button class="remove-bookmark" data-id="${question.id}">
        <i class="fas fa-times"></i>
      </button>
    `;
    
    card.addEventListener('click', (e) => {
      if (!e.target.closest('.remove-bookmark')) {
        openQuestionDetails(question);
      }
    });
    
    bookmarksContainer.appendChild(card);
  });
  
  // Add event listeners to remove buttons
  document.querySelectorAll('.remove-bookmark').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      const id = parseInt(btn.getAttribute('data-id'));
      bookmarkedQuestions = bookmarkedQuestions.filter(q => q.id !== id);
      localStorage.setItem('bookmarkedQuestions', JSON.stringify(bookmarkedQuestions));
      renderBookmarks();
      updateStats();
    });
  });
}

// Add question to recently viewed
function addToRecentlyViewed(question) {
  // Remove if already exists
  recentlyViewed = recentlyViewed.filter(q => q.id !== question.id);
  
  // Add to beginning of array
  recentlyViewed.unshift(question);
  
  // Limit to 5 items
  if (recentlyViewed.length > 5) {
    recentlyViewed = recentlyViewed.slice(0, 5);
  }
  
  // Save to localStorage
  localStorage.setItem('recentlyViewed', JSON.stringify(recentlyViewed));
  
  // Update UI
  renderRecentlyViewed();
  updateStats();
}

// Render recently viewed questions
function renderRecentlyViewed() {
  recentList.innerHTML = '';
  
  if (recentlyViewed.length === 0) {
    recentList.innerHTML = '<li class="no-results">No recently viewed questions.</li>';
    return;
  }
  
  recentlyViewed.forEach(question => {
    const li = document.createElement('li');
    li.textContent = question.question;
    li.addEventListener('click', () => {
      openQuestionDetails(question);
    });
    recentList.appendChild(li);
  });
}

// Render popular questions (based on question ID for simplicity)
function renderPopularQuestions() {
  const popular = [...questionsData]
    .sort((a, b) => a.id - b.id)
    .slice(0, 5);
  
  popularList.innerHTML = '';
  
  popular.forEach(question => {
    const li = document.createElement('li');
    li.textContent = question.question;
    li.addEventListener('click', () => {
      openQuestionDetails(question);
    });
    popularList.appendChild(li);
  });
}

// Create topics chart
function createTopicsChart() {
  // Count questions by category
  const categories = {
    'Basics': 0,
    'Functions': 0,
    'Objects': 0,
    'Arrays': 0,
    'Advanced': 0
  };
  
  questionsData.forEach(q => {
    if (q.question.toLowerCase().includes('function') || q.question.toLowerCase().includes('callback')) {
      categories['Functions']++;
    } else if (q.question.toLowerCase().includes('object') || q.question.toLowerCase().includes('json')) {
      categories['Objects']++;
    } else if (q.question.toLowerCase().includes('array') || q.question.toLowerCase().includes('splice')) {
      categories['Arrays']++;
    } else if (q.id > 50) {
      categories['Advanced']++;
    } else {
      categories['Basics']++;
    }
  });
  
  const ctx = document.getElementById('topics-chart').getContext('2d');
  
  new Chart(ctx, {
    type: 'doughnut',
    data: {
      labels: Object.keys(categories),
      datasets: [{
        data: Object.values(categories),
        backgroundColor: [
          '#4361ee',
          '#3a0ca3',
          '#7209b7',
          '#f72585',
          '#4cc9f0'
        ],
        borderWidth: 0
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      legend: {
        position: 'right',
        labels: {
          fontFamily: "'Poppins', sans-serif",
          fontSize: 12,
          fontColor: getComputedStyle(document.documentElement).getPropertyValue('--text-color')
        }
      },
      animation: {
        animateScale: true,
        animateRotate: true
      },
      tooltips: {
        bodyFontFamily: "'Poppins', sans-serif",
        callbacks: {
          label: function(tooltipItem, data) {
            const dataset = data.datasets[tooltipItem.datasetIndex];
            const total = dataset.data.reduce((acc, cur) => acc + cur, 0);
            const value = dataset.data[tooltipItem.index];
            const percentage = Math.round((value / total) * 100);
            return `${data.labels[tooltipItem.index]}: ${value} (${percentage}%)`;
          }
        }
      }
    }
  });
}

// Update stats
function updateStats() {
  totalQuestionsSpan.textContent = questionsData.length;
  bookmarkedCountSpan.textContent = bookmarkedQuestions.length;
  totalQsSpan.textContent = questionsData.length;
  topicsCountSpan.textContent = '5'; // Fixed value for demo
  viewedCountSpan.textContent = recentlyViewed.length;
}

// Theme toggle
function toggleTheme() {
  if (themeSwitch.checked) {
    document.body.classList.add('dark-theme');
    localStorage.setItem('theme', 'dark');
  } else {
    document.body.classList.remove('dark-theme');
    localStorage.setItem('theme', 'light');
  }
}

// Initialize theme from local storage
function initTheme() {
  const savedTheme = localStorage.getItem('theme');
  if (savedTheme === 'dark') {
    document.body.classList.add('dark-theme');
    themeSwitch.checked = true;
  }
}

// Utility function: Debounce
function debounce(func, delay) {
  let timeout;
  return function() {
    const context = this;
    const args = arguments;
    clearTimeout(timeout);
    timeout = setTimeout(() => func.apply(context, args), delay);
  };
} 