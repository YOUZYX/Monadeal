'use client';

import { useEffect, useState } from 'react';

export default function Home() {
  const [displayText, setDisplayText] = useState('');
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isTyping, setIsTyping] = useState(true);
  const [colorIndex, setColorIndex] = useState(0);
  const [showCursor, setShowCursor] = useState(true);
  
  const fullText = 'Monadeal Coming SOON';
  const colors = ['#FBFAF9', '#836EF9']; // White to Purple
  
  // Cursor blinking effect
  useEffect(() => {
    const cursorInterval = setInterval(() => {
      setShowCursor(prev => !prev);
    }, 500);
    
    return () => clearInterval(cursorInterval);
  }, []);
  
  useEffect(() => {
    if (currentIndex < fullText.length && isTyping) {
      const timeout = setTimeout(() => {
        setDisplayText(prev => prev + fullText[currentIndex]);
        setCurrentIndex(prev => prev + 1);
      }, 150); // Slightly slower typing speed for better readability
      
      return () => clearTimeout(timeout);
    } else if (currentIndex === fullText.length && isTyping) {
      // Finished typing, wait then start erasing
      const timeout = setTimeout(() => {
        setIsTyping(false);
      }, 3000); // Longer wait time to read the full text
      
      return () => clearTimeout(timeout);
    } else if (currentIndex > 0 && !isTyping) {
      // Erasing
      const timeout = setTimeout(() => {
        setDisplayText(prev => prev.slice(0, -1));
        setCurrentIndex(prev => prev - 1);
      }, 75); // Erasing speed
      
      return () => clearTimeout(timeout);
    } else if (currentIndex === 0 && !isTyping) {
      // Finished erasing, switch color and start typing again
      setColorIndex(prev => (prev + 1) % colors.length);
      setIsTyping(true);
    }
  }, [currentIndex, isTyping, fullText.length, colors.length]);

  return (
    <main className="min-h-screen flex items-center justify-center bg-gradient-to-br from-[#12131B] to-[#1a1b2e]">
      <div className="text-center px-4">
        <h1 
          className="text-4xl sm:text-6xl md:text-8xl lg:text-9xl font-bold tracking-wide select-none"
          style={{ 
            color: colors[colorIndex],
            transition: 'color 0.8s ease-in-out',
            textShadow: `0 0 20px ${colors[colorIndex]}40`,
          }}
        >
          {displayText}
          <span 
            className={`${showCursor ? 'opacity-100' : 'opacity-0'} transition-opacity duration-100`}
            style={{ color: colors[colorIndex] }}
          >
            |
          </span>
        </h1>
        <div className="mt-8">
          <div 
            className="w-32 h-1 mx-auto rounded-full"
            style={{ 
              background: `linear-gradient(90deg, ${colors[colorIndex]}40, ${colors[colorIndex]})`,
              transition: 'background 0.8s ease-in-out'
            }}
          />
        </div>
      </div>
    </main>
  );
}
