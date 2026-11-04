
function Footer() {
  return (
    <footer className="site-footer">
      <div className="footer-newsletter">
        <h3>SIGN UP FOR OUR DAILY INSIDER</h3>

        <form
          onSubmit={(event) => {
            event.preventDefault()
            alert("Thank you for subscribing!")
          }}
        >
          <input
            type="email"
            placeholder="Enter your email"
            aria-label="Enter your email"
            required
          />
          <button type="submit">Subscribe</button>
        </form>
      </div>

      <div className="footer-columns">
        <div className="footer-column">
          <h3>Explore</h3>
          <a href="#about">Home</a>
          <a href="#work">Projects</a>
          <a href="#articles">Articles</a>
          <a href="#tutorials">Tutorials</a>
        </div>

        <div className="footer-column">
          <h3>Support</h3>
          <a href="#contact">FAQs</a>
          <a href="#contact">Help</a>
          <a href="#contact">Contact Us</a>
        </div>

        <div className="footer-column">
          <h3>Stay Connected</h3>
          <div className="social-links">
            <a href="https://www.facebook.com/" target="_blank" rel="noreferrer" aria-label="Facebook">f</a>
            <a href="https://www.twitter.com/" target="_blank" rel="noreferrer" aria-label="Twitter">𝕏</a>
            <a href="https://www.instagram.com/" target="_blank" rel="noreferrer" aria-label="Instagram">◎</a>
          </div>
        </div>
      </div>

      <div className="footer-bottom">
        <h3>DEV@Deakin</h3>
        <p>© 2026 Gandharv Sumotra. All rights reserved.</p>

        <div className="footer-legal">
          <a href="#privacy">Privacy Policy</a>
          <a href="#terms">Terms</a>
          <a href="#conduct">Code of Conduct</a>
        </div>
      </div>
    </footer>
  )
}

export default Footer
