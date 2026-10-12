// src/Stars.jsx
import { createPortal } from 'react-dom';

const stars = [...Array(50)].map(() => ({
    tailLength: (Math.random() * 2.5 + 5).toFixed(2) + 'em',
    topOffset: (Math.random() * 100).toFixed(2) + 'vh',
    fallDuration: (Math.random() * 6 + 6).toFixed(3) + 's',
    fallDelay: (Math.random() * 10).toFixed(3) + 's',
}));

export default function Stars() {

    return createPortal(
        <div className="stars" style={{ display: 'block', zIndex: 0 }}>
            {stars.map((star, i) => (
                <div 
                    key={i} 
                    className="star" 
                    style={{
                        '--star-tail-length': star.tailLength,
                        '--top-offset': star.topOffset,
                        '--fall-duration': star.fallDuration,
                        '--fall-delay': star.fallDelay
                    }}
                ></div>
            ))}
        </div>,
        document.body
    );
}