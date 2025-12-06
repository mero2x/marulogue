# Critical Fixes Applied - DO NOT REVERT

## 1. Search Fix (CRITICAL)
**File:** `catalogue.js` - `handleSearch()` function (line ~315)
**Issue:** Search only filtered current page (30 items)
**Fix:** Search now queries `/api/movies?search=...` to search entire database
**DO NOT:** Revert to local `watchedMovies.filter()` - this only searches current page

## 2. Save Changes Button (CRITICAL - DATA LOSS PREVENTION)
**File:** `catalogue.js` - `exportData()` function (line ~774)
**Issue:** Saved only current 30 movies, overwrote entire database
**Fix:** Now fetches ALL movies first, merges changes, then saves complete list
**Steps:**
1. Fetch all movies: `/api/movies?limit=9999`
2. Fetch all TV: `/api/movies?type=tv&limit=9999`
3. Merge with current `watchedMovies`
4. Save complete merged list
**DO NOT:** Send only `watchedMovies` to `/api/save-movies`

## 3. Server-Side Search Support
**Files:** `server.js` (line ~254), `api/movies.js` (line ~22)
**Added:** `searchQuery` parameter support
**Logic:** Filters by title before type filtering
**DO NOT:** Remove search parameter handling

## 4. Red Save Button UI
**Files:** `admin.html` (line ~82), `style.css` (line ~1889)
**Added:** Red "Save Changes" button next to "Watched"
**Styling:** `.save-btn` class with red background

## Current Status
- ✅ Search works globally across all movies
- ✅ Save Changes safely merges with existing data
- ✅ 2021 movies restored from backup
- ⚠️ TV shows: 0 in backup (were already lost)

## Testing Checklist
Before deploying ANY changes to catalogue.js:
1. Test search for a movie on page 10+
2. Add a movie, click Save Changes, verify no data loss
3. Check that `/api/movies?search=query` returns results
4. Verify exportData() fetches ALL movies before saving
