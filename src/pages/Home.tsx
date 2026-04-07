import React from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';

export default function Home() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen flex flex-col items-center justify-center relative overflow-hidden bg-gray-900">
      <div className="absolute inset-0 z-0 group">
        <img
          src="/media/images/uploaded/home/cover.png"
          alt="V-Hook Background"
          className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
        />
        <div className="absolute inset-0 bg-black/20 transition-opacity duration-500" />
      </div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.8, ease: 'easeOut' }}
        className="z-10 text-center max-w-6xl px-6 relative mb-48"
      >
        <h1 className="text-[5rem] md:text-[8rem] lg:text-[10rem] font-serif text-white mb-4 tracking-tight drop-shadow-lg leading-none">
          V-Hook
        </h1>
        <p
          className="text-xl md:text-2xl lg:text-3xl text-white mb-12 font-normal leading-relaxed mx-auto drop-shadow-md whitespace-nowrap"
          style={{ fontFamily: '"Times New Roman", Times, serif' }}
        >
          Encoding Controllable Vibration-Driven Locomotion with 3D-Printed Hook Morphologies
        </p>

        <button
          onClick={() => navigate('/v-hook')}
          className="px-12 py-4 bg-[#3a3a3a]/90 backdrop-blur-sm text-white rounded-full text-2xl font-normal hover:bg-[#4a4a4a] transition-all hover:scale-105 active:scale-95 border border-white/40 shadow-lg mx-auto"
        >
          Start Now
        </button>
      </motion.div>
    </div>
  );
}
