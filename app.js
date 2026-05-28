// CineMatch Static Client-Side Recommender

document.addEventListener("DOMContentLoaded", () => {
    // State Variables
    let allMovies = [];
    let similarityMatrix = {};
    let currentMovie = null;
    let selectedDropdownIndex = -1;

    // DOM Elements
    const searchInput = document.getElementById("searchInput");
    const autocompleteDropdown = document.getElementById("autocompleteDropdown");
    const clearSearchBtn = document.getElementById("clearSearchBtn");
    const searchWidget = document.getElementById("searchWidget");
    
    const movieHero = document.getElementById("movieHero");
    const heroBackdrop = document.getElementById("heroBackdrop");
    const heroPoster = document.getElementById("heroPoster");
    const heroTitle = document.getElementById("heroTitle");
    const heroTagline = document.getElementById("heroTagline");
    const heroYear = document.getElementById("heroYear");
    const heroRuntime = document.getElementById("heroRuntime");
    const heroRating = document.getElementById("heroRating");
    const ratingRingProgress = document.getElementById("ratingRingProgress");
    const heroGenres = document.getElementById("heroGenres");
    const heroOverview = document.getElementById("heroOverview");
    const heroDirector = document.getElementById("heroDirector");
    const heroCast = document.getElementById("heroCast");
    const trailerBtn = document.getElementById("trailerBtn");
    
    const recsGrid = document.getElementById("recsGrid");
    const reviewsGrid = document.getElementById("reviewsGrid");
    const reviewsSource = document.getElementById("reviewsSource");
    
    // Settings elements
    const settingsBtn = document.getElementById("settingsBtn");
    const settingsModal = document.getElementById("settingsModal");
    const closeSettingsBtn = document.getElementById("closeSettingsBtn");
    const saveSettingsBtn = document.getElementById("saveSettingsBtn");
    const clearSettingsBtn = document.getElementById("clearSettingsBtn");
    const tmdbKeyInput = document.getElementById("tmdbKeyInput");
    const toggleKeyVisibility = document.getElementById("toggleKeyVisibility");
    const serverKeyIndicator = document.getElementById("serverKeyIndicator");

    // Initialize App
    init();

    async function init() {
        setupEventListeners();
        loadStoredSettings();
        
        // Hide server-key indicator for 100% static hosting
        serverKeyIndicator.classList.add("hidden");
        
        movieHero.classList.add("loading-state");
        const loaded = await loadDatasets();
        movieHero.classList.remove("loading-state");
        
        if (loaded && allMovies.length > 0) {
            // Find Avatar or load the first movie
            const defaultMovie = allMovies.find(m => m.title.toLowerCase() === "avatar") || allMovies[0];
            loadMovie(defaultMovie.id);
        }
    }

    // Event Listeners Setup
    function setupEventListeners() {
        // Search & Autocomplete
        searchInput.addEventListener("input", handleSearchInput);
        searchInput.addEventListener("keydown", handleSearchKeydown);
        clearSearchBtn.addEventListener("click", clearSearch);
        
        // Hide dropdown when clicking outside
        document.addEventListener("click", (e) => {
            if (!searchWidget.contains(e.target)) {
                hideDropdown();
            }
        });

        // Settings Modal
        settingsBtn.addEventListener("click", openSettings);
        closeSettingsBtn.addEventListener("click", closeSettings);
        saveSettingsBtn.addEventListener("click", saveSettings);
        clearSettingsBtn.addEventListener("click", clearSettings);
        toggleKeyVisibility.addEventListener("click", togglePasswordVisibility);
        
        settingsModal.addEventListener("click", (e) => {
            if (e.target === settingsModal) closeSettings();
        });
    }

    // Load stored key from browser
    function loadStoredSettings() {
        const storedKey = localStorage.getItem("tmdb_api_key");
        if (storedKey) {
            tmdbKeyInput.value = storedKey;
        }
    }

    // Load precomputed metadata and similarity JSON files
    async function loadDatasets() {
        try {
            console.log("Loading datasets...");
            // Load metadata
            const metaRes = await fetch("movies_metadata.json");
            if (!metaRes.ok) throw new Error("Failed to load movies metadata");
            allMovies = await metaRes.json();
            
            // Load similarity list
            const simRes = await fetch("similarity_top100.json");
            if (!simRes.ok) throw new Error("Failed to load similarity mappings");
            similarityMatrix = await simRes.json();
            
            console.log(`Loaded ${allMovies.length} movies successfully.`);
            return true;
        } catch (err) {
            console.error("Error loading JSON datasets:", err);
            heroTitle.textContent = "Error Loading Data";
            heroOverview.textContent = "Please make sure data/movies_metadata.json and data/similarity_top100.json are uploaded and accessible.";
            return false;
        }
    }

    // Main Movie Details Loader (Pure Client Side)
    async function loadMovie(movieId) {
        movieHero.classList.add("loading-state");
        hideDropdown();
        
        // Find movie in our local array
        const movie = allMovies.find(m => m.id === movieId);
        if (!movie) {
            console.error("Movie not found in list:", movieId);
            movieHero.classList.remove("loading-state");
            return;
        }
        
        currentMovie = movie;
        
        // 1. Render Local Metadata
        renderLocalMetadata(movie);
        
        // 2. Load Recommendations (Locally calculated)
        loadRecommendations(movie);
        
        // 3. Load Poster, Wallpaper, Trailer, Reviews
        await loadVisualData(movie);
        
        movieHero.classList.remove("loading-state");
    }

    // Render local details from dataset
    function renderLocalMetadata(movie) {
        heroTitle.textContent = movie.title;
        heroTagline.textContent = movie.tagline ? `"${movie.tagline}"` : "";
        heroYear.textContent = movie.year;
        heroRuntime.textContent = `${movie.runtime} min`;
        heroOverview.textContent = movie.overview;
        heroDirector.textContent = movie.director || "Unknown";
        heroCast.textContent = movie.cast && movie.cast.length > 0 ? movie.cast.join(", ") : "N/A";
        
        // Rating
        const rating = movie.rating.toFixed(1);
        heroRating.textContent = rating;
        
        // Circle Dash Offset calculation (dasharray is 94)
        const offset = 94 - (movie.rating / 10) * 94;
        ratingRingProgress.style.strokeDashoffset = offset;
        
        // Genres
        heroGenres.innerHTML = "";
        movie.genres.forEach(genre => {
            const span = document.createElement("span");
            span.className = "genre-tag";
            span.textContent = genre;
            heroGenres.appendChild(span);
        });
    }

    // Load recommendations from static index
    async function loadRecommendations(movie) {
        recsGrid.innerHTML = "";
        
        // Retrieve top 100 similar movies from our similarity matrix
        const recList = similarityMatrix[movie.index] || [];
        if (recList.length === 0) {
            recsGrid.innerHTML = `<div class="no-recs">No recommendations available.</div>`;
            return;
        }
        
        recsGrid.scrollLeft = 0;
        
        // Extract top 10
        const topRecs = recList.slice(0, 10).map(([recIdx, score]) => {
            const recMovie = allMovies[recIdx];
            return {
                ...recMovie,
                similarity_match: Math.round(score * 100)
            };
        });
        
        topRecs.forEach(rec => {
            const card = document.createElement("div");
            card.className = "movie-card";
            card.addEventListener("click", () => loadMovie(rec.id));
            
            // Check cache or Unsplash fallback first
            const cachedPoster = localStorage.getItem("poster_cache_" + rec.id);
            let posterUrl = cachedPoster || getFallbackPoster(rec.title, rec.genres[0]);
            
            card.innerHTML = `
                <div class="card-poster-wrapper">
                    <span class="match-badge">${rec.similarity_match}% Match</span>
                    <img class="card-poster" src="${posterUrl}" alt="${rec.title}" data-tmdb-id="${rec.id}">
                    <div class="card-overlay">
                        <h3 class="card-title">${rec.title}</h3>
                        <div class="card-meta">
                            <span>★ ${rec.rating.toFixed(1)}</span>
                            <span>${rec.year}</span>
                        </div>
                    </div>
                </div>
                <div class="card-details-fallback">
                    <h4 class="card-title-fallback">${rec.title}</h4>
                    <span class="card-year-fallback">${rec.year}</span>
                </div>
            `;
            
            recsGrid.appendChild(card);
            
            // Fetch correct poster asynchronously
            loadPosterForElement(rec, card.querySelector(".card-poster"));
        });
    }

    // Load Visual and Review details
    async function loadVisualData(movie) {
        const clientKey = localStorage.getItem("tmdb_api_key");
        
        // Set fallback wallpaper
        let backdropUrl = getFallbackBackdrop(movie.genres[0]);
        heroBackdrop.style.backgroundImage = `url('${backdropUrl}')`;
        heroBackdrop.style.opacity = "0.15";
        trailerBtn.classList.add("hidden");
        
        // Load Poster (cache check first, then IMDbOT search)
        const cachedPoster = localStorage.getItem("poster_cache_" + movie.id);
        if (cachedPoster) {
            heroPoster.src = cachedPoster;
        } else {
            heroPoster.src = getFallbackPoster(movie.title, movie.genres[0]);
            // Fetch dynamically in background
            loadPosterForElement(movie, heroPoster);
        }

        // If client TMDB API Key is configured, enrich with trailers, wallpapers, and real reviews
        if (clientKey) {
            try {
                // Fetch TMDB Details
                const tmdbRes = await fetch(`https://api.themoviedb.org/3/movie/${movie.id}?api_key=${clientKey}`);
                if (tmdbRes.ok) {
                    const tmdbData = await tmdbRes.ok ? await tmdbRes.json() : null;
                    if (tmdbData) {
                        if (tmdbData.poster_path) {
                            const tmdbPoster = `https://image.tmdb.org/t/p/w500${tmdbData.poster_path}`;
                            heroPoster.src = tmdbPoster;
                            localStorage.setItem("poster_cache_" + movie.id, tmdbPoster);
                        }
                        if (tmdbData.backdrop_path) {
                            heroBackdrop.style.backgroundImage = `url('https://image.tmdb.org/t/p/original${tmdbData.backdrop_path}')`;
                            heroBackdrop.style.opacity = "0.35";
                        }
                        if (tmdbData.tagline) {
                            heroTagline.textContent = `"${tmdbData.tagline}"`;
                        }
                    }
                }
                
                // Fetch Trailer
                const videoRes = await fetch(`https://api.themoviedb.org/3/movie/${movie.id}/videos?api_key=${clientKey}`);
                if (videoRes.ok) {
                    const videoData = await videoRes.json();
                    const youtubeTrailer = videoData.results && videoData.results.find(v => v.site === "YouTube" && (v.type === "Trailer" || v.type === "Teaser"));
                    if (youtubeTrailer) {
                        trailerBtn.href = `https://www.youtube.com/watch?v=${youtubeTrailer.key}`;
                        trailerBtn.classList.remove("hidden");
                    }
                }
                
                // Fetch Reviews
                const reviewsRes = await fetch(`https://api.themoviedb.org/3/movie/${movie.id}/reviews?api_key=${clientKey}`);
                if (reviewsRes.ok) {
                    const reviewsData = await reviewsRes.json();
                    if (reviewsData.results && reviewsData.results.length > 0) {
                        renderTMDBReviews(reviewsData.results);
                    } else {
                        renderFallbackReviews(movie);
                    }
                } else {
                    renderFallbackReviews(movie);
                }
            } catch (err) {
                console.error("Error fetching live TMDB details:", err);
                renderFallbackReviews(movie);
            }
        } else {
            // Render Fallback reviews
            renderFallbackReviews(movie);
        }
    }

    // Load poster via IMDbOT search and save to cache
    async function loadPosterForElement(movie, imgElement) {
        const cachedPoster = localStorage.getItem("poster_cache_" + movie.id);
        if (cachedPoster) {
            imgElement.src = cachedPoster;
            return;
        }

        try {
            // Query IMDbOT directly (since CORS is * fully supported!)
            const cleanTitle = movie.title.trim();
            const res = await fetch(`https://imdb.iamidiotareyoutoo.com/search?q=${encodeURIComponent(cleanTitle)}`);
            if (res.ok) {
                const data = await res.json();
                if (data.ok && data.description && data.description.length > 0) {
                    const results = data.description;
                    let bestMatch = null;
                    
                    // 1. Try to match exact title case-insensitive
                    bestMatch = results.find(r => r["#TITLE"].toLowerCase() === cleanTitle.toLowerCase());
                    
                    // 2. Try to match year and substring title
                    if (!bestMatch && movie.year) {
                        bestMatch = results.find(r => r["#YEAR"] === parseInt(movie.year) && r["#TITLE"].toLowerCase().includes(cleanTitle.toLowerCase()));
                    }
                    
                    // 3. Take first result containing poster
                    if (!bestMatch) {
                        bestMatch = results.find(r => r["#IMG_POSTER"]);
                    }
                    
                    if (bestMatch && bestMatch["#IMG_POSTER"]) {
                        let posterUrl = bestMatch["#IMG_POSTER"];
                        
                        // Clean media-amazon URL to load high resolution
                        if (posterUrl.includes("media-amazon.com/images")) {
                            const parts = posterUrl.split("._V1_");
                            if (parts.length > 1) {
                                posterUrl = parts[0] + "._V1_SX400_.jpg";
                            }
                        }
                        
                        imgElement.src = posterUrl;
                        localStorage.setItem("poster_cache_" + movie.id, posterUrl);
                    }
                }
            }
        } catch (err) {
            console.error("Poster fetch failed for " + movie.title + ":", err);
        }
    }

    // Render Real TMDB Reviews
    function renderTMDBReviews(reviews) {
        reviewsSource.textContent = "Official TMDB Reviews";
        reviewsGrid.innerHTML = "";
        
        reviews.slice(0, 3).forEach(review => {
            const rating = review.author_details && review.author_details.rating ? `★ ${review.author_details.rating}` : "N/A";
            const avatarChar = review.author ? review.author.charAt(0).toUpperCase() : "U";
            const cleanContent = review.content.length > 280 ? review.content.substring(0, 280) + "..." : review.content;
            
            const card = document.createElement("div");
            card.className = "review-card";
            card.innerHTML = `
                <div class="review-header">
                    <div class="reviewer-info">
                        <div class="reviewer-avatar">${avatarChar}</div>
                        <div>
                            <div class="reviewer-name">${review.author}</div>
                            <div class="review-meta">${formatReviewDate(review.created_at)}</div>
                        </div>
                    </div>
                    <span class="review-rating-pill">${rating}</span>
                </div>
                <p class="review-content">"${cleanContent}"</p>
            `;
            reviewsGrid.appendChild(card);
        });
    }

    // Generate Movie-specific Procedural Reviews (Fallback)
    function renderFallbackReviews(movie) {
        reviewsSource.textContent = "Generated Audience Reviews (Offline Mode)";
        reviewsGrid.innerHTML = "";
        
        const director = movie.director || "the director";
        const actor = movie.cast && movie.cast.length > 0 ? movie.cast[0] : "the lead cast";
        const genre = movie.genres && movie.genres.length > 0 ? movie.genres[0].toLowerCase() : "movie";
        const title = movie.title;

        const templates = [
            {
                author: "CinematicScribe",
                rating: (movie.rating + (Math.random() - 0.5) * 1.5).toFixed(1),
                date: "3 weeks ago",
                content: `An absolute masterclass in filmmaking. ${director} directs this ${genre} project with immense precision. ${actor} delivers a stunning, highly immersive performance that holds the emotional weight of ${title} beautifully.`
            },
            {
                author: "ReviewRebel",
                rating: (movie.rating + (Math.random() - 0.5) * 1.5).toFixed(1),
                date: "Last month",
                content: `Visually spectacular and intellectually engaging. The pacing in the second act has small hiccups, but the overall vision behind ${title} is outstanding. Highly recommended if you are a fan of ${genre} movies!`
            },
            {
                author: "FilmFocus",
                rating: (movie.rating + (Math.random() - 0.5) * 1.2).toFixed(1),
                date: "2 months ago",
                content: `An unforgettable experience. The narrative depth and character arcs are carefully crafted. It builds tension brilliantly, and the ending leaves you reflecting on the themes long after the credits roll.`
            }
        ];

        templates.forEach(t => {
            let ratingVal = parseFloat(t.rating);
            if (ratingVal > 10.0) ratingVal = 10.0;
            if (ratingVal < 1.0) ratingVal = 1.0;
            
            const avatarChar = t.author.charAt(0);
            
            const card = document.createElement("div");
            card.className = "review-card";
            card.innerHTML = `
                <div class="review-header">
                    <div class="reviewer-info">
                        <div class="reviewer-avatar">${avatarChar}</div>
                        <div>
                            <div class="reviewer-name">${t.author}</div>
                            <div class="review-meta">${t.date}</div>
                        </div>
                    </div>
                    <span class="review-rating-pill">★ ${ratingVal.toFixed(1)}</span>
                </div>
                <p class="review-content">"${t.content}"</p>
            `;
            reviewsGrid.appendChild(card);
        });
    }

    // Unsplash Fallback Poster matching genres
    function getFallbackPoster(title, genre) {
        genre = genre ? genre.toLowerCase() : "";
        let id = "photo-1440404653325-ab127d49abc1"; // Default cinematic theater
        
        if (genre.includes("science") || genre.includes("fiction") || genre.includes("space")) {
            id = "photo-1451187580459-43490279c0fa"; // Nebula space
        } else if (genre.includes("action") || genre.includes("adventure")) {
            id = "photo-1508739773434-c26b3d09e071"; // Adventure mountain
        } else if (genre.includes("horror") || genre.includes("thriller")) {
            id = "photo-1509248961158-e54f6934749c"; // Dark forest/scary
        } else if (genre.includes("comedy")) {
            id = "photo-1517604931442-7e0c8ed2963c"; // Cinema popcorn/laughter
        } else if (genre.includes("romance") || genre.includes("drama")) {
            id = "photo-1518199266791-5375a83190b7"; // Couple/sunset
        } else if (genre.includes("animation") || genre.includes("fantasy")) {
            id = "photo-1607604276583-eef5d076aa5f"; // Fantasy abstract/neon
        }
        
        return `https://images.unsplash.com/${id}?auto=format&fit=crop&w=400&q=80`;
    }

    // Unsplash Fallback Backdrop matching genres
    function getFallbackBackdrop(genre) {
        genre = genre ? genre.toLowerCase() : "";
        let id = "photo-1489599849927-2ee91cede3ba"; // Default cinema background
        
        if (genre.includes("science") || genre.includes("fiction") || genre.includes("space")) {
            id = "photo-1446776811953-b23d57bd21aa"; // Space station/earth
        } else if (genre.includes("action") || genre.includes("adventure")) {
            id = "photo-1533240332313-0db49b439ad3"; // Epic landscape
        } else if (genre.includes("horror") || genre.includes("thriller")) {
            id = "photo-1518709268805-4e9042af9f23"; // Spooky mansion
        } else if (genre.includes("comedy")) {
            id = "photo-1527224857830-43a7acc85260"; // Cheerful/fun
        } else if (genre.includes("romance") || genre.includes("drama")) {
            id = "photo-1494790108377-be9c29b29330"; // Beautiful portraits/sunset
        } else if (genre.includes("animation") || genre.includes("fantasy")) {
            id = "photo-1534447677768-be436bb09401"; // Colorful lights
        }
        
        return `https://images.unsplash.com/${id}?auto=format&fit=crop&w=1200&q=80`;
    }

    // Helper date formatter
    function formatReviewDate(dateStr) {
        if (!dateStr) return "recently";
        try {
            const d = new Date(dateStr);
            return d.toLocaleDateString(undefined, { year: 'numeric', month: 'long', day: 'numeric' });
        } catch (e) {
            return "recently";
        }
    }

    // Search input changes & filter dropdown
    function handleSearchInput() {
        const query = searchInput.value.trim().toLowerCase();
        
        if (query.length === 0) {
            hideDropdown();
            clearSearchBtn.classList.add("hidden");
            return;
        }
        
        clearSearchBtn.classList.remove("hidden");
        
        // Filter autocomplete list
        const matches = allMovies.filter(movie => movie.title.toLowerCase().includes(query)).slice(0, 8);
        renderDropdownMatches(matches);
    }

    // Render search suggestions
    function renderDropdownMatches(matches) {
        autocompleteDropdown.innerHTML = "";
        selectedDropdownIndex = -1;
        
        if (matches.length === 0) {
            autocompleteDropdown.innerHTML = `<div class="autocomplete-item"><span class="autocomplete-title">No movies found</span></div>`;
            autocompleteDropdown.classList.remove("hidden");
            return;
        }
        
        matches.forEach((movie, idx) => {
            const item = document.createElement("div");
            item.className = "autocomplete-item";
            item.setAttribute("data-index", idx);
            item.setAttribute("data-movie-id", movie.id);
            item.addEventListener("click", () => {
                loadMovie(movie.id);
                clearSearch();
            });
            
            item.innerHTML = `
                <span class="autocomplete-title">${movie.title}</span>
                <span class="autocomplete-year">${movie.year}</span>
            `;
            autocompleteDropdown.appendChild(item);
        });
        
        autocompleteDropdown.classList.remove("hidden");
    }

    // Keyboard navigation in search dropdown
    function handleSearchKeydown(e) {
        const items = autocompleteDropdown.querySelectorAll(".autocomplete-item");
        if (items.length === 0 || autocompleteDropdown.classList.contains("hidden")) return;

        if (e.key === "ArrowDown") {
            e.preventDefault();
            selectedDropdownIndex = (selectedDropdownIndex + 1) % items.length;
            highlightDropdownItem(items);
        } else if (e.key === "ArrowUp") {
            e.preventDefault();
            selectedDropdownIndex = (selectedDropdownIndex - 1 + items.length) % items.length;
            highlightDropdownItem(items);
        } else if (e.key === "Enter") {
            e.preventDefault();
            if (selectedDropdownIndex > -1) {
                const selectedItem = items[selectedDropdownIndex];
                const movieId = selectedItem.getAttribute("data-movie-id");
                if (movieId) {
                    loadMovie(parseInt(movieId));
                    clearSearch();
                }
            } else {
                // Load first search match
                const firstItem = items[0];
                const movieId = firstItem.getAttribute("data-movie-id");
                if (movieId) {
                    loadMovie(parseInt(movieId));
                    clearSearch();
                }
            }
        } else if (e.key === "Escape") {
            hideDropdown();
        }
    }

    function highlightDropdownItem(items) {
        items.forEach((item, idx) => {
            if (idx === selectedDropdownIndex) {
                item.classList.add("active");
                item.scrollIntoView({ block: "nearest" });
            } else {
                item.classList.remove("active");
            }
        });
    }

    function clearSearch() {
        searchInput.value = "";
        clearSearchBtn.classList.add("hidden");
        hideDropdown();
    }

    function hideDropdown() {
        autocompleteDropdown.classList.add("hidden");
        selectedDropdownIndex = -1;
    }

    // Settings Modal handlers
    function openSettings() {
        settingsModal.classList.remove("hidden");
        tmdbKeyInput.focus();
    }

    function closeSettings() {
        settingsModal.classList.add("hidden");
    }

    function saveSettings() {
        const key = tmdbKeyInput.value.trim();
        if (key) {
            localStorage.setItem("tmdb_api_key", key);
            alert("API Configuration Saved! Posters and reviews will reload.");
        } else {
            localStorage.removeItem("tmdb_api_key");
        }
        closeSettings();
        
        if (currentMovie) {
            loadMovie(currentMovie.id);
        }
    }

    function clearSettings() {
        localStorage.removeItem("tmdb_api_key");
        tmdbKeyInput.value = "";
        alert("Client-side API Key cleared.");
        closeSettings();
        
        if (currentMovie) {
            loadMovie(currentMovie.id);
        }
    }

    function togglePasswordVisibility() {
        const type = tmdbKeyInput.getAttribute("type") === "password" ? "text" : "password";
        tmdbKeyInput.setAttribute("type", type);
    }
});
