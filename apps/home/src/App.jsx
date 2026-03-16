import { useState, useEffect } from 'react';
import { Clock, Github } from 'lucide-react';
import { LoadingScreen } from '@projects/ui'; // Import from your shared package
import './App.css';

function App() {
  const [text, setText] = useState('');
  const [isDeleting, setIsDeleting] = useState(false);
  const [wordIndex, setWordIndex] = useState(0);
  const [delta, setDelta] = useState(150);
  
  // Loading states
  const [isLoading, setIsLoading] = useState(true);
  const [isExiting, setIsExiting] = useState(false);

  const words = ["Projects", "Ideas", "Works"];
  const waitTime = 2000;

  // Handle Initial Load
  useEffect(() => {
    const timer = setTimeout(() => setIsLoading(false), 800);
    return () => clearTimeout(timer);
  }, []);

  // Handle Navigation Bridge
  const handleNavigation = (e, url) => {
    e.preventDefault();
    setIsExiting(true);
    setTimeout(() => {
      window.location.href = url;
    }, 400); // Matches the CSS transition time in your UI package
  };

  useEffect(() => {
    let ticker = setInterval(() => { tick(); }, delta);
    return () => clearInterval(ticker);
  }, [text, delta]);

  const tick = () => {
    let i = wordIndex % words.length;
    let fullWord = words[i];
    let updatedText = isDeleting 
      ? fullWord.substring(0, text.length - 1) 
      : fullWord.substring(0, text.length + 1);

    setText(updatedText);

    if (isDeleting) setDelta(100);
    if (!isDeleting && updatedText === fullWord) {
      setIsDeleting(true);
      setDelta(waitTime);
    } else if (isDeleting && updatedText === '') {
      setIsDeleting(false);
      setWordIndex(wordIndex + 1);
      setDelta(150);
    }
  };

  return (
    <>
      <LoadingScreen isVisible={isLoading || isExiting} />
      
      <div className="home-container">
        <p className="brand-corner">potatogamer.uk</p>

        <div className="container">
          <div className="header-wrapper">
            <div className="sub-header">All of ThePotatoGamers...</div>
            <div className="title-container">
              <h1>
                <span>{text}</span>
                <span className="cursor">|</span>
              </h1>
            </div>
            
            <div className="links">
              {/* Updated link with navigation handler */}
              <a 
                href="/time" 
                className="btn" 
                onClick={(e) => handleNavigation(e, '/time')}
              >
                <Clock size={18} />
                <span>Time App</span>
              </a>
              <a href="https://github.com/thepotatogamer0" target="_blank" rel="noreferrer" className="btn">
                <Github size={18} />
                <span>GitHub</span>
              </a>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}

export default App;