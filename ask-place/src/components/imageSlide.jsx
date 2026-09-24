import React, { useState, useEffect } from 'react';
import '../index.css';
import HomeImg1 from "../assets/imgs/image1.png"
import HomeImg2 from "../assets/imgs/image2.png"
import HomeImg3 from "../assets/imgs/image3.png"

const images = [
    HomeImg1,   
    HomeImg2,
    HomeImg3,
];
function ImageSlider() {
 const [currentIndex, setCurrentIndex] = useState(0);
 useEffect(() => {
  // setIntervalで3秒ごとに画像を切り替えるタイマーを設定
  const timerId = setInterval(() => {
   setCurrentIndex(prevIndex => (prevIndex + 1) % images.length);
  }, 3000);
  return () => clearInterval(timerId);
 }, []);
 return (
  <div className="imgSlide">
   {images.map((image, index) => (
    <img
     key={index}
     src={image}
     alt={`画像No:${index + 1}`}
     className={`imgSlideItem ${currentIndex === index ? 'isActive' : ''}`}
    />
    
   ))}
   <h1>Welcome to MTE_Fes</h1>
  </div>
 );
}
export default ImageSlider;