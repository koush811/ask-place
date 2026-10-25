import React, { useState, useEffect } from 'react';
import '../index.css';
import HomeImg1 from "../assets/imgs/image4.jpg"
import HomeImg2 from "../assets/imgs/image5.jpg"

const images = [
    HomeImg1,   
    HomeImg2,
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
   <h1 className="srogan">Welcome to MTE_Fes</h1>
   <div className="srogan">
    
    <label>
     スローガン
     <h2 style={{ margin: "5px 0" }}>愛総高 愛添い中</h2>
    </label>
    <label>
     期間
     <h3 style={{ margin: "5px 0" }}>10/30～10/31</h3>
    </label>
   </div>
  </div>
 );
}
export default ImageSlider;
