// Global variables
let questionsData = [];
let bookmarkedQuestions = JSON.parse(localStorage.getItem('bookmarkedQuestions')) || [];
let currentFilter = 'all';
let searchQuery = '';

// DOM Elements
const questionsList = document.getElementById('questionsList');
const loadingElement = document.querySelector('.loading');
const searchInput = document.getElementById('searchInput');
const searchBtn = document.getElementById('searchBtn');
const themeToggle = document.getElementById('themeToggle');
const filterButtons = document.querySelectorAll('.filter-btn');
const questionModal = document.getElementById('questionModal');
const modalTitle = document.getElementById('modalTitle');
const modalContent = document.getElementById('modalContent');
const closeModal = document.getElementById('closeModal');
const bookmarkBtn = document.getElementById('bookmarkBtn');
const totalQuestionsEl = document.getElementById('totalQuestions');
const categoriesEl = document.getElementById('categories');
const codeExamplesEl = document.getElementById('codeExamples');
const bookmarkedEl = document.getElementById('bookmarked');

// Event Listeners
document.addEventListener('DOMContentLoaded', initializeApp);
searchBtn.addEventListener('click', performSearch);
searchInput.addEventListener('keyup', (e) => {
    if (e.key === 'Enter') performSearch();
});
themeToggle.addEventListener('change', toggleTheme);
filterButtons.forEach(btn => btn.addEventListener('click', filterQuestions));
closeModal.addEventListener('click', () => questionModal.style.display = 'none');
bookmarkBtn.addEventListener('click', toggleBookmark);

// Check for user theme preference
if (localStorage.getItem('theme') === 'dark' || window.matchMedia('(prefers-color-scheme: dark)').matches) {
    document.body.classList.add('dark-theme');
    themeToggle.checked = true;
}

// Initialize the application
async function initializeApp() {
    try {
        await fetchQuestions();
        updateStats();
        renderQuestions();
    } catch (error) {
        console.error('Failed to initialize app:', error);
        loadingElement.innerHTML = `<p>Failed to load questions. Please try refreshing the page.</p>`;
    }
}

// Fetch questions from data.json
async function fetchQuestions() {
    try {
        console.log('Fetching questions...');
        // Try the minimal version first
        try {
            const response = await fetch('data_minimal.json');
            if (!response.ok) {
                throw new Error('Minimal file not found');
            }
            const data = await response.json();
            console.log('Questions loaded successfully from minimal file:', data.length, 'questions found');
            questionsData = data;
            // Add a warning message
            loadingElement.innerHTML = `
                <div class="warning-message">
                    <p>⚠️ Using minimal dataset with only ${data.length} questions. The full dataset could not be loaded.</p>
                    <p>This is a demo version with limited questions.</p>
                </div>
            `;
            setTimeout(() => {
                loadingElement.style.display = 'none';
                questionsList.style.display = 'grid';
            }, 3000);
        } catch (minimalError) {
            console.warn('Could not load minimal file, trying original data.json', minimalError);
            // Fall back to the original file
            const response = await fetch('data.json');
            if (!response.ok) {
                throw new Error('Network response was not ok');
            }
            
            // Read the response as text first
            const text = await response.text();
            
            // Try to parse the JSON
            try {
                const data = JSON.parse(text);
                console.log('Questions loaded successfully from original file:', data.length, 'questions found');
                questionsData = data;
            } catch (parseError) {
                console.error('JSON parse error:', parseError);
                console.log('First 100 characters of response:', text.substring(0, 100));
                console.log('Last 100 characters of response:', text.substring(text.length - 100));
                throw new Error('Failed to parse JSON: ' + parseError.message);
            }
        }
    } catch (error) {
        console.error('Error fetching questions:', error);
        loadingElement.innerHTML = `<p>Failed to load questions. Error: ${error.message}. Please try refreshing the page.</p>`;
        throw error;
    }
}

// Render questions based on current filter and search
function renderQuestions() {
    // Hide loading and show questions
    loadingElement.style.display = 'none';
    questionsList.style.display = 'grid';
    
    // Filter questions based on current criteria
    let filteredQuestions = questionsData.filter(question => {
        // Apply category filter
        if (currentFilter === 'all') return true;
        if (currentFilter === 'bookmarked') return bookmarkedQuestions.includes(question.id);
        if (currentFilter === 'code') return question.answer.includes('```javascript');
        return question.type === currentFilter;
    });
    
    // Apply search filter if needed
    if (searchQuery) {
        filteredQuestions = filteredQuestions.filter(question => 
            question.question.toLowerCase().includes(searchQuery.toLowerCase()) || 
            question.answer.toLowerCase().includes(searchQuery.toLowerCase())
        );
    }
    
    // Render the filtered questions
    if (filteredQuestions.length === 0) {
        questionsList.innerHTML = `<div class="no-results">No questions match your criteria. Try changing the filters or search terms.</div>`;
        return;
    }
    
    questionsList.innerHTML = filteredQuestions.map(question => `
        <div class="question-card" data-id="${question.id}">
            <span class="question-id">#${question.id}</span>
            <h3>${question.question}</h3>
            <div class="question-footer">
                <span class="question-type">${question.type || 'theory'}</span>
                <div class="question-actions">
                    <button class="bookmark-btn" title="Bookmark">
                        <i class="fa${bookmarkedQuestions.includes(question.id) ? 's' : 'r'} fa-bookmark"></i>
                    </button>
                </div>
            </div>
        </div>
    `).join('');
    
    // Add event listeners to cards and bookmark buttons
    document.querySelectorAll('.question-card').forEach(card => {
        card.addEventListener('click', (e) => {
            if (!e.target.closest('.bookmark-btn')) {
                openQuestionModal(parseInt(card.dataset.id));
            }
        });
    });
    
    document.querySelectorAll('.bookmark-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            e.stopPropagation();
            const questionId = parseInt(btn.closest('.question-card').dataset.id);
            toggleBookmarkInList(questionId);
        });
    });
}

// Open modal with question details
function openQuestionModal(questionId) {
    const question = questionsData.find(q => q.id === questionId);
    if (!question) return;
    
    modalTitle.textContent = question.question;
    bookmarkBtn.innerHTML = `<i class="fa${bookmarkedQuestions.includes(question.id) ? 's' : 'r'} fa-bookmark"></i>`;
    bookmarkBtn.dataset.questionId = question.id;
    
    // Convert markdown to HTML and set content
    modalContent.innerHTML = marked.parse(question.answer);
    
    // Syntax highlighting for code blocks
    document.querySelectorAll('pre code').forEach((block) => {
        hljs.highlightElement(block);
    });
    
    questionModal.style.display = 'block';
}

// Toggle bookmark status
function toggleBookmark() {
    const questionId = parseInt(bookmarkBtn.dataset.questionId);
    toggleBookmarkInList(questionId);
    bookmarkBtn.innerHTML = `<i class="fa${bookmarkedQuestions.includes(questionId) ? 's' : 'r'} fa-bookmark"></i>`;
}

// Toggle bookmark in the bookmark list
function toggleBookmarkInList(questionId) {
    const index = bookmarkedQuestions.indexOf(questionId);
    if (index === -1) {
        bookmarkedQuestions.push(questionId);
    } else {
        bookmarkedQuestions.splice(index, 1);
    }
    localStorage.setItem('bookmarkedQuestions', JSON.stringify(bookmarkedQuestions));
    updateStats();
    if (currentFilter === 'bookmarked') {
        renderQuestions();
    } else {
        // Just update the icon if we're not in bookmarked filter
        const bookmarkIcon = document.querySelector(`.question-card[data-id="${questionId}"] .bookmark-btn i`);
        if (bookmarkIcon) {
            bookmarkIcon.className = bookmarkedQuestions.includes(questionId) ? 'fas fa-bookmark' : 'far fa-bookmark';
        }
    }
}

// Filter questions based on selected category
function filterQuestions(e) {
    filterButtons.forEach(btn => btn.classList.remove('active'));
    e.target.classList.add('active');
    currentFilter = e.target.dataset.filter;
    renderQuestions();
}

// Perform search
function performSearch() {
    searchQuery = searchInput.value.trim();
    renderQuestions();
}

// Toggle between light and dark themes
function toggleTheme() {
    document.body.classList.toggle('dark-theme');
    localStorage.setItem('theme', document.body.classList.contains('dark-theme') ? 'dark' : 'light');
}

// Update statistics
function updateStats() {
    totalQuestionsEl.textContent = questionsData.length;
    
    // Count unique categories (types)
    const uniqueTypes = new Set(questionsData.map(q => q.type || 'theory'));
    categoriesEl.textContent = uniqueTypes.size;
    
    // Count questions with code examples
    const codeExamples = questionsData.filter(q => q.answer.includes('```javascript')).length;
    codeExamplesEl.textContent = codeExamples;
    
    // Update bookmarked count
    bookmarkedEl.textContent = bookmarkedQuestions.length;
    
    // Create or update chart if already loaded
    if (typeof Chart !== 'undefined' && questionsData.length > 0) {
        createStatsChart();
    }
}

// Create stats chart
function createStatsChart() {
    // If a chart exists, destroy it first
    if (window.questionChart) {
        window.questionChart.destroy();
    }

    // Only create chart if the container exists
    const chartContainer = document.querySelector('.chart-container');
    if (!chartContainer) {
        // Create a chart container
        const container = document.createElement('div');
        container.className = 'chart-container';
        container.innerHTML = '<canvas id="questionTypesChart"></canvas>';
        document.querySelector('main .container').appendChild(container);
    }

    // Count questions by type
    const typeCount = {};
    questionsData.forEach(q => {
        const type = q.type || 'theory';
        typeCount[type] = (typeCount[type] || 0) + 1;
    });

    // Prepare data for chart
    const labels = Object.keys(typeCount);
    const data = Object.values(typeCount);
    const backgroundColors = [
        'rgba(90, 103, 216, 0.7)',
        'rgba(52, 211, 153, 0.7)',
        'rgba(251, 146, 60, 0.7)',
        'rgba(239, 68, 68, 0.7)'
    ];

    // Create chart
    const ctx = document.getElementById('questionTypesChart').getContext('2d');
    window.questionChart = new Chart(ctx, {
        type: 'doughnut',
        data: {
            labels: labels,
            datasets: [{
                data: data,
                backgroundColor: backgroundColors.slice(0, labels.length),
                borderWidth: 1
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    position: 'bottom',
                    labels: {
                        font: {
                            family: 'Poppins'
                        },
                        color: getComputedStyle(document.body).getPropertyValue('--text-color')
                    }
                },
                tooltip: {
                    callbacks: {
                        label: function(context) {
                            const label = context.label || '';
                            const value = context.raw || 0;
                            const total = context.dataset.data.reduce((a, b) => a + b, 0);
                            const percentage = Math.round((value / total) * 100);
                            return `${label}: ${value} (${percentage}%)`;
                        }
                    }
                }
            }
        }
    });
} 