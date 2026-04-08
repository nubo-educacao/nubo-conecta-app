'use client';

import { motion } from 'framer-motion';

export default function CloudBackground() {
  return (
    // Strengthened gradient to avoid "white washout" while maintaining brand feel
    <div className="absolute inset-0 z-0 overflow-hidden bg-gradient-to-b from-[#F0F7FF] via-[#E6F4FF] to-[#D6F0FF]">
      
      {/* 
        OPTIMIZATION:
        - Reduced from 7 clouds to 3 key clouds.
        - Added 'will-change-transform' for compositor hints.
        - Slower animations to reduce visual noise and rendering load.
      */}

      {/* Cloud 1 - Primary Soft Main Cloud (Top Left) */}
      <motion.div
        className="absolute top-[-10%] -left-[10%] w-[900px] h-[500px] bg-[#38B1E4] rounded-full blur-[140px] opacity-[0.4]"
        style={{ willChange: 'transform' }}
        animate={{
          x: ['-5%', '5%'],
          y: ['0%', '5%'],
        }}
        transition={{
          duration: 20,
          repeat: Infinity,
          repeatType: "reverse",
          ease: "easeInOut"
        }}
      />

      {/* Cloud 2 - Deep Anchor Cloud (Bottom Right) - Adds contrast */}
      <motion.div
        className="absolute bottom-[-20%] -right-[10%] w-[1000px] h-[600px] bg-[#024F86] rounded-full blur-[160px] opacity-[0.10]"
        style={{ willChange: 'transform' }}
        animate={{
          x: ['5%', '-5%'],
          y: ['5%', '-5%'],
        }}
        transition={{
          duration: 25,
          repeat: Infinity,
          repeatType: "reverse",
          ease: "easeInOut",
          delay: 2
        }}
      />

      {/* Cloud 3 - Drifting Highlight (Middle) - Adds movement */}
      <motion.div
        className="absolute top-[40%] left-[20%] w-[600px] h-[400px] bg-white rounded-full blur-[100px] opacity-60"
        style={{ willChange: 'transform', mixBlendMode: 'overlay' }}
        animate={{
          x: ['-10%', '10%'],
          scale: [1, 1.1, 1],
        }}
        transition={{
          duration: 30,
          repeat: Infinity,
          repeatType: "reverse",
          ease: "easeInOut",
        }}
      />

      {/* Static ambient overlay to smooth things out without animation cost */}
      <div className="absolute inset-0 bg-white/20 pointer-events-none" />
    </div>
  );
}
