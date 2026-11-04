
import { useEffect, useState } from 'react';
import { useAuth } from './AuthContext';
import './BrowsePosts.css';

function getPostDate(createdAt) {
  if (!createdAt) return null;

  if (createdAt._seconds) {
    return new Date(createdAt._seconds * 1000);
  }

  if (createdAt.seconds) {
    return new Date(createdAt.seconds * 1000);
  }

  const date = new Date(createdAt);
  return Number.isNaN(date.getTime()) ? null : date;
}

function BrowsePosts() {
  const { currentUser, loading: authLoading } = useAuth();

  const [posts, setPosts] = useState([]);
  const [userPlan, setUserPlan] = useState('Free');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const [typeFilter, setTypeFilter] = useState('All');
  const [planFilter, setPlanFilter] = useState('All');
  const [tagFilter, setTagFilter] = useState('');
  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');

  const [hiddenPosts, setHiddenPosts] = useState([]);
  const [expandedPosts, setExpandedPosts] = useState([]);

  useEffect(() => {
    if (authLoading) return;

    async function loadPosts() {
      try {
        setLoading(true);
        setError('');

        const headers = {};

        if (currentUser) {
          const token = await currentUser.getIdToken();
          headers.Authorization = `Bearer ${token}`;
        }

        const response = await fetch('http://localhost:3000/api/posts', {
          headers
        });

        const data = await response.json();

        if (!response.ok) {
          throw new Error(data.message || 'Unable to load posts.');
        }

        setPosts(data.posts || []);
        setUserPlan(data.userPlan || 'Free');

      } catch (err) {
        console.error('Loading posts error:', err);
        setError(err.message || 'Unable to load posts.');
      } finally {
        setLoading(false);
      }
    }

    loadPosts();
  }, [currentUser, authLoading]);

  function hidePost(postId) {
    setHiddenPosts(previous => [...previous, postId]);
  }

  function toggleExpand(postId) {
    setExpandedPosts(previous =>
      previous.includes(postId)
        ? previous.filter(id => id !== postId)
        : [...previous, postId]
    );
  }

  function resetFilters() {
    setTypeFilter('All');
    setPlanFilter('All');
    setTagFilter('');
    setFromDate('');
    setToDate('');
    setHiddenPosts([]);
    setExpandedPosts([]);
  }

  const visiblePosts = posts.filter(post => {
    if (hiddenPosts.includes(post.id)) return false;

    if (typeFilter !== 'All' && post.postType !== typeFilter) {
      return false;
    }

    if (planFilter !== 'All' && post.postPlan !== planFilter) {
      return false;
    }

    if (
      tagFilter.trim() &&
      !post.tags?.some(tag =>
        tag.toLowerCase().includes(tagFilter.trim().toLowerCase())
      )
    ) {
      return false;
    }

    const postDate = getPostDate(post.createdAt);

    if (fromDate && (!postDate || postDate < new Date(`${fromDate}T00:00:00`))) {
      return false;
    }

    if (toDate && (!postDate || postDate > new Date(`${toDate}T23:59:59`))) {
      return false;
    }

    return true;
  });

  if (authLoading || loading) {
    return <p className="browse-message">Loading posts...</p>;
  }

  return (
    <main className="browse-container">
      <h2>Browse Posts</h2>

      <p className="plan-message">
        Your current plan: <strong>{userPlan}</strong>
      </p>

      <section className="filter-section">
        <h3>Filter Posts</h3>

        <div className="filter-grid">
          <div>
            <label htmlFor="typeFilter">Post Type</label>
            <select
              id="typeFilter"
              value={typeFilter}
              onChange={e => setTypeFilter(e.target.value)}
            >
              <option value="All">All Types</option>
              <option value="Question">Question</option>
              <option value="Article">Article</option>
            </select>
          </div>

          <div>
            <label htmlFor="planFilter">Post Plan</label>
            <select
              id="planFilter"
              value={planFilter}
              onChange={e => setPlanFilter(e.target.value)}
            >
              <option value="All">All Plans</option>
              <option value="Free">Free</option>
              <option value="Paid">Paid</option>
            </select>
          </div>

          <div>
            <label htmlFor="tagFilter">Search by Tag</label>
            <input
              id="tagFilter"
              type="text"
              value={tagFilter}
              onChange={e => setTagFilter(e.target.value)}
              placeholder="Enter a tag"
            />
          </div>

          <div>
            <label htmlFor="fromDate">From Date</label>
            <input
              id="fromDate"
              type="date"
              value={fromDate}
              onChange={e => setFromDate(e.target.value)}
            />
          </div>

          <div>
            <label htmlFor="toDate">To Date</label>
            <input
              id="toDate"
              type="date"
              min={fromDate || undefined}
              value={toDate}
              onChange={e => setToDate(e.target.value)}
            />
          </div>
        </div>

        <button
          type="button"
          className="reset-button"
          onClick={resetFilters}
        >
          Reset Filters
        </button>
      </section>

      <div className="posts-heading">
        <h3>Available Posts</h3>
        <span>{visiblePosts.length} posts found</span>
      </div>

      {error && <p className="error-message">{error}</p>}

      {!error && visiblePosts.length === 0 && (
        <p className="browse-message">No posts found.</p>
      )}

      <div className="posts-list">
        {visiblePosts.map(post => {
          const isExpanded = expandedPosts.includes(post.id);
          const postDate = getPostDate(post.createdAt);

          return (
            <article className="post-card" key={post.id}>
              <div className="post-card-header">
                <span className="post-type-label">{post.postType}</span>
                <span className="post-plan-label">{post.postPlan}</span>
              </div>

              <h3>{post.title}</h3>

              {postDate && (
                <p className="post-date">
                  {postDate.toLocaleString()}
                </p>
              )}

              {post.postType === 'Question' ? (
                <p className="post-content">{post.description}</p>
              ) : (
                <>
                  <h4>Abstract</h4>
                  <p className="post-content">{post.abstract}</p>

                  {isExpanded && (
                    <>
                      <h4>Article Text</h4>
                      <p className="post-content">{post.articleText}</p>
                    </>
                  )}
                </>
              )}

              {post.tags?.length > 0 && (
                <div className="post-tags">
                  {post.tags.map((tag, index) => (
                    <span key={`${post.id}-${index}`}>#{tag}</span>
                  ))}
                </div>
              )}

              <div className="post-actions">
                <button
                  type="button"
                  onClick={() => toggleExpand(post.id)}
                >
                  {isExpanded ? 'Show Less' : 'Expand'}
                </button>

                <button
                  type="button"
                  className="hide-button"
                  onClick={() => hidePost(post.id)}
                >
                  Hide
                </button>
              </div>
            </article>
          );
        })}
      </div>
    </main>
  );
}

export default BrowsePosts;
