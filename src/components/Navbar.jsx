
import { Link, useNavigate } from 'react-router-dom'
import { signOut } from 'firebase/auth'
import { auth } from '../firebase'
import { useAuth } from './AuthContext'

function Navbar() {
  const { currentUser, loading } = useAuth()
  const navigate = useNavigate()

  const handleLogout = async () => {
    try {
      await signOut(auth)
      navigate('/')
    } catch (error) {
      console.error('Logout failed:', error)
      alert('Unable to log out. Please try again.')
    }
  }

  return (
    <nav>
      <Link to="/" className="logo">DEV@Deakin</Link>

      <input
        type="text"
        placeholder="Search..."
        className="search-input"
      />

      <Link to="/">Home</Link>
      <Link to="/pricing">Pricing</Link>
      <Link to="/browse-posts">Browse Posts</Link>

      {!loading && !currentUser && (
        <>
          <Link to="/login">Login</Link>
          <Link to="/signup">Sign Up</Link>
        </>
      )}

      {!loading && currentUser && (
        <>
          <span>
            {currentUser.displayName || currentUser.email}
          </span>

          <button type="button" onClick={handleLogout}>
            Logout
          </button>
        </>
      )}

      <Link
        to={currentUser ? "/post" : "/login"}
        className="nav-button"
      >
        Post
      </Link>
    </nav>
  )
}

export default Navbar
